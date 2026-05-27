"""
api/routes/rl.py
----------------
HTTP interface for the RL content positioning episode lifecycle.

Endpoints:
  POST /api/rl/start              — start an episode, returns episode_id
  GET  /api/rl/{episode_id}/stream — SSE stream of step events
  GET  /api/rl/{episode_id}/status — polling fallback
  POST /api/rl/{episode_id}/cancel — signal the episode to stop
"""

import asyncio
import json
import uuid
import logging
from pathlib import Path

import numpy as np
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from schemas.rl_schemas import RLStartRequest, RLStatusResponse, RLStepDetail
from cache.session_store import store
from cache.episode_store import episode_store
from pipeline.nn_policy import NNPolicy
from pipeline.rl_orchestrator import RLOrchestrator, RLConfig

_NN_POLICY_PATH = Path(__file__).parent.parent.parent / "cache" / "nn_policy.npz"


def _load_nn_policy(path: Path = _NN_POLICY_PATH) -> NNPolicy:
    """Load existing weights or create a fresh policy if none saved yet."""
    if path.exists():
        try:
            policy = NNPolicy.load(path)
            print(
                f"[nn_policy] Loaded weights from {path} "
                f"(episodes trained: {policy.episodes_trained})"
            )
            return policy
        except Exception as e:
            print(f"[nn_policy] Failed to load weights ({e}) — starting fresh.")
    else:
        print("[nn_policy] No saved weights found — starting fresh.")
    return NNPolicy()


def _save_nn_policy(policy: NNPolicy, path: Path = _NN_POLICY_PATH) -> None:
    """Persist policy weights to disk."""
    policy.save(path)
    print(
        f"[nn_policy] Saved weights to {path} "
        f"(episodes trained: {policy.episodes_trained})"
    )

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/rl/start")
async def rl_start(req: RLStartRequest):
    """
    Start an RL episode for a completed analysis session.
    Launches the episode loop in a background thread.
    Returns episode_id immediately — stream events via /api/rl/{id}/stream.
    """
    session = store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    pipeline_data = store.get_pipeline_data(req.session_id)
    if not pipeline_data:
        raise HTTPException(
            status_code=400,
            detail="Pipeline data not available. Run a full analysis first.",
        )

    episode_id = str(uuid.uuid4())
    target_pos = np.array([req.target_x, req.target_y])

    # Initialise RL state in the session
    store.set_rl_state(req.session_id, {
        "episode_id": episode_id,
        "status": "running",
        "step": 0,
        "max_steps": req.max_steps,
        "current_pos": pipeline_data.get("initial_pos", [0.0, 0.0]),
        "target_pos": [req.target_x, req.target_y],
        "best_draft": "",
        "best_reward": 0.0,
        "steps_detail": [],
        "stop_reason": None,
        "few_shot_count": 0,
        "queue": asyncio.Queue(),   # internal — not serialised to client
    })

    loop = asyncio.get_running_loop()

    def run():
        from openai import OpenAI
        try:
            client = OpenAI(api_key=req.openai_key)
            config = RLConfig(
                max_steps=req.max_steps,
                proximity_threshold=req.proximity_threshold,
            )

            # Load NN policy if requested
            nn_policy = _load_nn_policy() if req.use_nn_agent else None

            orchestrator = RLOrchestrator(
                pipeline_data=pipeline_data,
                openai_client=client,
                episode_id=episode_id,
                config=config,
                nn_policy=nn_policy,
            )

            def emit(event: dict):
                rl_state = store.get_rl_state(req.session_id)
                if rl_state:
                    q = rl_state.get("queue")
                    if q:
                        loop.call_soon_threadsafe(q.put_nowait, event)
                    # Update persisted state for polling endpoint
                    _update_rl_state_from_event(req.session_id, event)

            orchestrator.run_episode(target_pos=target_pos, event_callback=emit)

            # Save updated NN weights after episode
            if nn_policy is not None:
                _save_nn_policy(nn_policy)

        except Exception as exc:
            logger.error("RL episode error: %s", exc, exc_info=True)
            rl_state = store.get_rl_state(req.session_id)
            if rl_state:
                q = rl_state.get("queue")
                if q:
                    loop.call_soon_threadsafe(q.put_nowait, {
                        "event": "rl_error",
                        "episode_id": episode_id,
                        "message": str(exc),
                    })
            store.update_rl_status(req.session_id, "failed")
        finally:
            rl_state = store.get_rl_state(req.session_id)
            if rl_state:
                q = rl_state.get("queue")
                if q:
                    loop.call_soon_threadsafe(q.put_nowait, None)  # sentinel

    loop.run_in_executor(None, run)

    return {
        "episode_id": episode_id,
        "session_id": req.session_id,
        "status": "running",
        "stream_url": f"/api/rl/{episode_id}/stream",
    }


@router.get("/api/rl/{episode_id}/stream")
async def rl_stream(episode_id: str, session_id: str):
    """
    SSE stream — emits one event per RL step as it completes.
    Pass session_id as a query parameter.
    """
    rl_state = store.get_rl_state(session_id)
    if not rl_state or rl_state.get("episode_id") != episode_id:
        raise HTTPException(status_code=404, detail="Episode not found.")

    q: asyncio.Queue = rl_state["queue"]

    async def generate():
        while True:
            item = await q.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/api/rl/{episode_id}/status", response_model=RLStatusResponse)
async def rl_status(episode_id: str, session_id: str):
    """Polling fallback — returns the current episode state snapshot."""
    rl_state = store.get_rl_state(session_id)
    if not rl_state or rl_state.get("episode_id") != episode_id:
        raise HTTPException(status_code=404, detail="Episode not found.")

    return RLStatusResponse(
        episode_id=episode_id,
        session_id=session_id,
        status=rl_state.get("status", "running"),
        step=rl_state.get("step", 0),
        max_steps=rl_state.get("max_steps", 8),
        current_pos=rl_state.get("current_pos", [0.0, 0.0]),
        target_pos=rl_state.get("target_pos", [0.0, 0.0]),
        best_draft=rl_state.get("best_draft", ""),
        best_reward=rl_state.get("best_reward", 0.0),
        steps_detail=[RLStepDetail(**s) for s in rl_state.get("steps_detail", [])],
        stop_reason=rl_state.get("stop_reason"),
        few_shot_count=rl_state.get("few_shot_count", 0),
    )


@router.post("/api/rl/{episode_id}/cancel")
async def rl_cancel(episode_id: str, session_id: str):
    """Signal the episode to stop after the current step completes."""
    rl_state = store.get_rl_state(session_id)
    if not rl_state or rl_state.get("episode_id") != episode_id:
        raise HTTPException(status_code=404, detail="Episode not found.")
    store.update_rl_status(session_id, "cancelled")
    return {"cancelled": True}


@router.get("/api/rl/episode-store/stats")
async def episode_store_stats():
    """Debug endpoint — summary of stored past episodes for few-shot retrieval."""
    return episode_store.stats()


# ---------------------------------------------------------------------------
# Helper: update persisted RL state from emitted events
# ---------------------------------------------------------------------------

def _update_rl_state_from_event(session_id: str, event: dict) -> None:
    """Sync the session's rl_state dict from emitted episode events."""
    event_type = event.get("event")
    rl_state = store.get_rl_state(session_id)
    if not rl_state:
        return

    if event_type == "rl_start":
        rl_state["few_shot_count"] = event.get("few_shot_count", 0)
        rl_state["current_pos"] = event.get("initial_pos", [0.0, 0.0])

    elif event_type == "rl_step":
        rl_state["step"] = event.get("step", 0)
        rl_state["current_pos"] = event.get("pos", rl_state["current_pos"])
        if event.get("reward", -999) > rl_state.get("best_reward", -999):
            rl_state["best_reward"] = event["reward"]
        rl_state["steps_detail"].append({
            "step": event.get("step"),
            "reward": event.get("reward"),
            "pos_before": event.get("pos", [0.0, 0.0]),
            "pos_after": event.get("pos", [0.0, 0.0]),
            "vis_before": event.get("vis_score", 0.0),
            "vis_after": event.get("vis_score", 0.0),
            "critique": event.get("critique", ""),
            "draft_preview": event.get("draft_preview", ""),
            "moved_toward_target": event.get("moved_toward_target", False),
        })

    elif event_type == "rl_complete":
        rl_state["status"] = "completed"
        rl_state["best_draft"] = event.get("best_draft", "")
        rl_state["best_reward"] = event.get("best_reward", 0.0)
        rl_state["stop_reason"] = event.get("stop_reason")

    store.set_rl_state(session_id, rl_state)
