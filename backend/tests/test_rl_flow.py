"""
tests/test_rl_flow.py
---------------------
End-to-end test for the RL content positioning system.

Usage:
  cd backend
  python tests/test_rl_flow.py

Set your API keys via environment variables or edit the constants below.
"""

import os
import json
import time
import requests

# ---------------------------------------------------------------------------
# Config — edit these or set as env vars
# ---------------------------------------------------------------------------
BASE_URL     = "http://localhost:8000"
BUSINESS_URL = os.getenv("TEST_URL", "https://stripe.com")   # any real business URL
OPENAI_KEY   = os.getenv("OPENAI_API_KEY", "")
SERPER_KEY   = os.getenv("SERPER_API_KEY", "")

# RL target: where on the map to move (you'll see real coords after analysis)
# These are placeholder values — replace with actual coords from the PCA map
TARGET_X = 0.5
TARGET_Y = 0.5


# ---------------------------------------------------------------------------
# Step 1: Run a full analysis and capture session_id
# ---------------------------------------------------------------------------

def run_analysis() -> str:
    """Stream the analysis pipeline and return the session_id."""
    print("\n=== Step 1: Running full analysis ===")
    print(f"URL: {BUSINESS_URL}")

    resp = requests.post(
        f"{BASE_URL}/analyse/stream",
        json={
            "url": BUSINESS_URL,
            "openai_key": OPENAI_KEY,
            "serper_key": SERPER_KEY,
            "n_competitors": 5,
            "n_questions": 5,     # fewer for faster test
            "custom_questions": "",
        },
        stream=True,
        timeout=300,
    )
    resp.raise_for_status()

    session_id = None
    for line in resp.iter_lines():
        if not line:
            continue
        line_str = line.decode("utf-8") if isinstance(line, bytes) else line
        if not line_str.startswith("data: "):
            continue
        try:
            payload = json.loads(line_str[6:])
        except json.JSONDecodeError:
            continue

        event = payload.get("event")
        if event == "progress":
            print(f"  [{payload.get('pct', 0)}%] {payload.get('step', '')}")
        elif event == "profile":
            print(f"  Business: {payload['data'].get('business_name', '?')}")
        elif event == "session_id":
            session_id = payload["session_id"]
            print(f"  session_id: {session_id}")
        elif event == "complete":
            print("  Analysis complete.")
            break
        elif event == "error":
            print(f"  ERROR: {payload.get('message')}")
            break

    if not session_id:
        raise RuntimeError("No session_id received — analysis may have failed.")
    return session_id


# ---------------------------------------------------------------------------
# Step 2: Start an RL episode
# ---------------------------------------------------------------------------

def start_rl_episode(session_id: str) -> str:
    """Start the RL episode and return the episode_id."""
    print(f"\n=== Step 2: Starting RL episode ===")
    print(f"Target position: ({TARGET_X}, {TARGET_Y})")

    resp = requests.post(
        f"{BASE_URL}/api/rl/start",
        json={
            "session_id": session_id,
            "target_x": TARGET_X,
            "target_y": TARGET_Y,
            "openai_key": OPENAI_KEY,
            "max_steps": 3,          # keep short for testing
            "proximity_threshold": 0.3,
        },
    )
    resp.raise_for_status()
    data = resp.json()
    episode_id = data["episode_id"]
    print(f"  episode_id: {episode_id}")
    print(f"  stream_url: {data['stream_url']}")
    return episode_id


# ---------------------------------------------------------------------------
# Step 3: Stream RL step events
# ---------------------------------------------------------------------------

def stream_rl_episode(episode_id: str, session_id: str):
    """Stream the RL episode and print each step."""
    print(f"\n=== Step 3: Streaming RL episode ===")

    resp = requests.get(
        f"{BASE_URL}/api/rl/{episode_id}/stream",
        params={"session_id": session_id},
        stream=True,
        timeout=600,
    )
    resp.raise_for_status()

    for line in resp.iter_lines():
        if not line:
            continue
        line_str = line.decode("utf-8") if isinstance(line, bytes) else line
        if not line_str.startswith("data: "):
            continue
        try:
            payload = json.loads(line_str[6:])
        except json.JSONDecodeError:
            continue

        event = payload.get("event")

        if event == "rl_start":
            print(f"  Episode started")
            print(f"  Initial pos: {payload.get('initial_pos')}")
            print(f"  Target pos:  {payload.get('target_pos')}")
            print(f"  Few-shot examples from past episodes: {payload.get('few_shot_count', 0)}")

        elif event == "rl_step":
            step = payload.get("step")
            reward = payload.get("reward", 0)
            vis = payload.get("vis_score", 0)
            direction = "✓ toward target" if payload.get("moved_toward_target") else "✗ away from target"
            print(f"\n  --- Step {step} ---")
            print(f"  Reward:    {reward:.4f}  ({direction})")
            print(f"  Cos sim:   {payload.get('cos_sim', 0):.4f}")
            print(f"  Magnitude: {payload.get('magnitude', 0):.4f}")
            print(f"  Vis score: {vis:.1f}/10  (delta: {payload.get('vis_delta', 0):+.1f})")
            print(f"  Position:  {payload.get('pos')}")
            print(f"  Critique:  {payload.get('critique', '')}")
            print(f"  Draft preview: {payload.get('draft_preview', '')[:120]}...")

        elif event == "rl_complete":
            print(f"\n  === Episode complete ===")
            print(f"  Stop reason:  {payload.get('stop_reason')}")
            print(f"  Steps taken:  {payload.get('steps_taken')}")
            print(f"  Best reward:  {payload.get('best_reward', 0):.4f}")
            print(f"  Total reward: {payload.get('total_reward', 0):.4f}")
            print(f"  Final pos:    {payload.get('final_pos')}")
            print(f"\n  Best draft:\n  {payload.get('best_draft', '')[:400]}...")
            break

        elif event == "rl_error":
            print(f"  ERROR: {payload.get('message')}")
            break

        elif event == "rl_step_error":
            print(f"  Step {payload.get('step')} error: {payload.get('message')}")


# ---------------------------------------------------------------------------
# Step 4: Check the episode store stats
# ---------------------------------------------------------------------------

def check_episode_store():
    print(f"\n=== Step 4: Episode store stats ===")
    resp = requests.get(f"{BASE_URL}/api/rl/episode-store/stats")
    resp.raise_for_status()
    stats = resp.json()
    print(f"  Total stored episodes: {stats.get('total', 0)}")
    print(f"  Avg best reward: {stats.get('avg_best_reward', 0)}")
    print(f"  Industries covered: {stats.get('industries', [])}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if not OPENAI_KEY:
        print("ERROR: Set OPENAI_API_KEY env var (or edit the script)")
        exit(1)
    if not SERPER_KEY:
        print("ERROR: Set SERPER_API_KEY env var (or edit the script)")
        exit(1)

    try:
        session_id = run_analysis()
        episode_id = start_rl_episode(session_id)
        stream_rl_episode(episode_id, session_id)
        check_episode_store()
    except requests.exceptions.ConnectionError:
        print("\nERROR: Could not connect to backend. Is it running?")
        print("  Start it with: cd backend && python app.py")
    except Exception as e:
        print(f"\nERROR: {e}")
        raise
