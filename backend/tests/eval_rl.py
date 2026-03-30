"""
tests/eval_rl.py
----------------
RL agent performance evaluator with plots.

Runs a full pipeline → RL episode via the live backend, collects every
step metric, and saves a multi-panel figure to  eval_rl_output.png.

Usage:
  cd backend
  python tests/eval_rl.py

Optional env vars:
  TEST_URL        business website to analyse  (default: https://stripe.com)
  OPENAI_API_KEY  OpenAI key
  SERPER_API_KEY  Serper key
  RL_TARGET_X     target PCA x coord  (default: auto — uses blue-ocean centroid)
  RL_TARGET_Y     target PCA y coord
  RL_MAX_STEPS    number of RL steps   (default: 10)

If you've already run an analysis and know the session_id, set:
  EXISTING_SESSION_ID   skip the analysis step
  RL_TARGET_X / Y       set target manually
"""

import os
import sys
import json
import time
import math
from pathlib import Path
import requests
import numpy as np

# Load backend/.env so keys don't need to be exported manually
_env_file = Path(__file__).parent.parent / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

# ── matplotlib (soft dep — skip plots if not installed) ─────────────────────
try:
    import matplotlib
    matplotlib.use("Agg")          # headless — no display needed
    import matplotlib.pyplot as plt
    import matplotlib.gridspec as gridspec
    HAS_MPL = True
except ImportError:
    HAS_MPL = False
    print("[warn] matplotlib not installed — no plots will be saved.")
    print("       pip install matplotlib")

# ── config ───────────────────────────────────────────────────────────────────
BASE_URL     = os.getenv("BACKEND_URL", "http://localhost:8000")
BUSINESS_URL = os.getenv("TEST_URL", "https://stripe.com")
OPENAI_KEY   = os.getenv("OPENAI_API_KEY", "")
SERPER_KEY   = os.getenv("SERPER_API_KEY", "")
MAX_STEPS    = int(os.getenv("RL_MAX_STEPS", "10"))
TARGET_X     = float(os.getenv("RL_TARGET_X", "nan"))
TARGET_Y     = float(os.getenv("RL_TARGET_Y", "nan"))
EXISTING_SID = os.getenv("EXISTING_SESSION_ID", "")
USE_NN       = os.getenv("RL_USE_NN", "0") == "1"
OUTPUT_FILE  = "eval_rl_output.png"


# ── helpers ──────────────────────────────────────────────────────────────────

def _sse_events(resp):
    """Yield parsed SSE payload dicts from a streaming response."""
    for raw in resp.iter_lines():
        if not raw:
            continue
        line = raw.decode("utf-8") if isinstance(raw, bytes) else raw
        if not line.startswith("data: "):
            continue
        try:
            yield json.loads(line[6:])
        except json.JSONDecodeError:
            continue


# ── Stage 1: analysis ────────────────────────────────────────────────────────

def run_analysis() -> tuple[str, dict]:
    """
    Run the full pipeline.
    Returns (session_id, analysis_meta) where analysis_meta has:
      initial_pos, blue_ocean_zones, user_centroid
    """
    print(f"\n{'='*60}")
    print(f"  STAGE 1 — Analysis: {BUSINESS_URL}")
    print(f"{'='*60}")

    resp = requests.get(
        f"{BASE_URL}/analyse/stream",
        params={
            "url": BUSINESS_URL,
            "openai_key": OPENAI_KEY,
            "serper_key": SERPER_KEY,
            "n_competitors": 5,
            "n_questions": 5,
            "custom_questions": "",
        },
        stream=True,
        timeout=600,
    )
    resp.raise_for_status()

    session_id = None
    meta = {"pca_points": [], "blue_ocean_zones": [], "user_centroid": None}

    for ev in _sse_events(resp):
        event = ev.get("event")
        if event == "progress":
            pct = ev.get("pct", 0)
            bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
            print(f"  [{bar}] {pct}%  {ev.get('step', '')}", end="\r")
        elif event == "profile":
            print(f"\n  Business : {ev['data'].get('business_name','?')}")
            print(f"  Industry : {ev['data'].get('industry','?')}")
        elif event == "session_id":
            session_id = ev["session_id"]
            print(f"  session_id: {session_id}")
        elif event == "pca":
            meta["pca_points"] = ev.get("points", [])
        elif event == "blue_ocean":
            meta["blue_ocean_zones"] = ev.get("zones", [])
        elif event == "complete":
            print("\n  Analysis complete.")
            break
        elif event == "error":
            raise RuntimeError(f"Analysis error: {ev.get('message')}")

    if not session_id:
        raise RuntimeError("No session_id — analysis may have failed.")

    # Compute user centroid from pca_points
    user_pts = [p for p in meta["pca_points"] if p.get("source") == "user"]
    if user_pts:
        xs = [p["components"][0] for p in user_pts]
        ys = [p["components"][1] for p in user_pts]
        meta["user_centroid"] = (sum(xs) / len(xs), sum(ys) / len(ys))
    return session_id, meta



# How far along the line from user centroid → blue ocean zone to place the
# interim target. 0.3 = 30% of the way, reachable in fewer steps.
_TARGET_INTERPOLATION = float(os.getenv("RL_TARGET_INTERP", "0.3"))


def pick_target(meta: dict) -> tuple[float, float]:
    """
    Auto-pick a target that is _TARGET_INTERPOLATION of the way from the
    user centroid toward the nearest blue-ocean zone.

    Using the zone directly puts the target ~24 PCA units away — too far
    for short episodes. At 30% interpolation the target is ~7 units away,
    which the agent can meaningfully close in 10-20 steps.

    Override with RL_TARGET_X / RL_TARGET_Y env vars for manual control,
    or RL_TARGET_INTERP (0.0-1.0) to adjust how far along the line.
    """
    if not math.isnan(TARGET_X) and not math.isnan(TARGET_Y):
        return TARGET_X, TARGET_Y

    cx, cy = meta.get("user_centroid") or (0.0, 0.0)
    zones = meta.get("blue_ocean_zones", [])

    if zones:
        zx, zy = float(zones[0]["x"]), float(zones[0]["y"])
        t = _TARGET_INTERPOLATION
        tx = cx + t * (zx - cx)
        ty = cy + t * (zy - cy)
        full_dist = math.dist([cx, cy], [zx, zy])
        step_dist = math.dist([cx, cy], [tx, ty])
        print(f"  Blue ocean zone: ({zx:.3f}, {zy:.3f})  dist={full_dist:.2f}")
        print(f"  Auto-target ({int(t*100)}% interp): ({tx:.3f}, {ty:.3f})  dist={step_dist:.2f}")
        return tx, ty

    # Last resort: opposite corner from user centroid
    tx, ty = -cx * 0.5, -cy * 0.5
    print(f"  Auto-target (fallback): ({tx:.3f}, {ty:.3f})")
    return tx, ty


# ── Stage 2: RL episode ──────────────────────────────────────────────────────

def run_rl_episode(session_id: str, target_x: float, target_y: float) -> dict:
    """
    Start and stream the RL episode.
    Returns a result dict with all step-level metrics.
    """
    print(f"\n{'='*60}")
    print(f"  STAGE 2 — RL Episode  (max_steps={MAX_STEPS})")
    print(f"  Target: ({target_x:.4f}, {target_y:.4f})")
    print(f"{'='*60}")

    # Start episode
    if USE_NN:
        print("  NN policy agent: ENABLED")
    start_resp = requests.post(
        f"{BASE_URL}/api/rl/start",
        json={
            "session_id": session_id,
            "target_x": target_x,
            "target_y": target_y,
            "openai_key": OPENAI_KEY,
            "max_steps": MAX_STEPS,
            "use_nn_agent": USE_NN,
        },
        timeout=30,
    )
    start_resp.raise_for_status()
    episode_id = start_resp.json()["episode_id"]
    print(f"  episode_id: {episode_id}")

    # Stream
    stream_resp = requests.get(
        f"{BASE_URL}/api/rl/{episode_id}/stream",
        params={"session_id": session_id},
        stream=True,
        timeout=MAX_STEPS * 60 + 60,
    )
    stream_resp.raise_for_status()

    result = {
        "episode_id": episode_id,
        "target": [target_x, target_y],
        "initial_pos": None,
        "steps": [],          # list of per-step metric dicts
        "best_reward": None,
        "total_reward": None,
        "stop_reason": None,
        "steps_taken": None,
        "best_draft": "",
        "few_shot_count": 0,
    }

    for ev in _sse_events(stream_resp):
        event = ev.get("event")

        if event == "rl_start":
            result["initial_pos"] = ev.get("initial_pos")
            result["few_shot_count"] = ev.get("few_shot_count", 0)
            print(f"  Initial pos : {ev.get('initial_pos')}")
            print(f"  Few-shot    : {ev.get('few_shot_count', 0)} past episodes")

        elif event == "rl_step":
            step = ev.get("step")
            reward = ev.get("reward", 0.0)
            toward = "✓" if ev.get("moved_toward_target") else "✗"
            pos = ev.get("pos", [0, 0])
            dist = math.dist(pos[:2], [target_x, target_y])
            result["steps"].append({
                "step": step,
                "reward": reward,
                "cos_sim": ev.get("cos_sim", 0.0),
                "magnitude": ev.get("magnitude", 0.0),
                "vis_score": ev.get("vis_score", 0.0),
                "vis_delta": ev.get("vis_delta", 0.0),
                "pos": pos,
                "dist_to_target": dist,
                "moved_toward_target": ev.get("moved_toward_target", False),
                "critique": ev.get("critique", ""),
            })
            print(
                f"  step {step:>3}  reward={reward:+.4f} {toward}  "
                f"vis={ev.get('vis_score', 0):.1f}  "
                f"dist={dist:.4f}  "
                f"{ev.get('critique','')[:60]}"
            )

        elif event == "nn_update":
            result["nn_policy_loss"] = ev.get("policy_loss")
            result["nn_episodes_trained"] = ev.get("episodes_trained")
            result["nn_strategy_win_rates"] = ev.get("strategy_win_rates", {})

        elif event == "rl_complete":
            result["best_reward"]  = ev.get("best_reward")
            result["total_reward"] = ev.get("total_reward")
            result["stop_reason"]  = ev.get("stop_reason")
            result["steps_taken"]  = ev.get("steps_taken")
            result["best_draft"]   = ev.get("best_draft", "")
            break

        elif event in ("rl_error", "rl_step_error"):
            print(f"  [error] {ev.get('message', '')}")

    return result


# ── Stage 3: plots ───────────────────────────────────────────────────────────

def plot_results(result: dict, output_path: str):
    if not HAS_MPL:
        return

    steps_data = result["steps"]
    if not steps_data:
        print("[warn] No step data — nothing to plot.")
        return

    xs       = [s["step"] for s in steps_data]
    rewards  = [s["reward"] for s in steps_data]
    cum_r    = list(np.cumsum(rewards))
    vis      = [s["vis_score"] for s in steps_data]
    dists    = [s["dist_to_target"] for s in steps_data]
    cos_sims = [s["cos_sim"] for s in steps_data]
    mags     = [s["magnitude"] for s in steps_data]
    pos_x    = [s["pos"][0] for s in steps_data]
    pos_y    = [s["pos"][1] for s in steps_data]
    toward   = [s["moved_toward_target"] for s in steps_data]

    target_x, target_y = result["target"]
    initial_pos = result["initial_pos"] or [0, 0]

    fig = plt.figure(figsize=(16, 12), facecolor="#0d1117")
    fig.suptitle(
        f"RL Agent Evaluation — {BUSINESS_URL}\n"
        f"stop={result.get('stop_reason','?')}  "
        f"steps={result.get('steps_taken','?')}  "
        f"best_reward={result.get('best_reward', 0):.4f}  "
        f"few-shot={result.get('few_shot_count', 0)}",
        color="white", fontsize=12, y=0.98,
    )

    gs = gridspec.GridSpec(3, 3, figure=fig, hspace=0.45, wspace=0.35)

    DARK  = "#0d1117"
    MID   = "#161b22"
    GRID  = "#21262d"
    BLUE  = "#58a6ff"
    GREEN = "#3fb950"
    RED   = "#f85149"
    AMBER = "#e3b341"
    MUTED = "#8b949e"

    def _ax(pos, title):
        ax = fig.add_subplot(pos)
        ax.set_facecolor(MID)
        ax.set_title(title, color=MUTED, fontsize=10)
        ax.tick_params(colors=MUTED, labelsize=8)
        for spine in ax.spines.values():
            spine.set_edgecolor(GRID)
        ax.grid(color=GRID, linewidth=0.5)
        return ax

    # 1. Reward per step
    ax1 = _ax(gs[0, 0], "Reward per step")
    colors = [GREEN if t else RED for t in toward]
    ax1.bar(xs, rewards, color=colors, alpha=0.85)
    ax1.axhline(0, color=MUTED, linewidth=0.8, linestyle="--")
    ax1.set_xlabel("step", color=MUTED, fontsize=8)
    ax1.set_ylabel("reward", color=MUTED, fontsize=8)

    # 2. Cumulative reward
    ax2 = _ax(gs[0, 1], "Cumulative reward")
    ax2.plot(xs, cum_r, color=BLUE, linewidth=2, marker="o", markersize=4)
    ax2.axhline(0, color=MUTED, linewidth=0.8, linestyle="--")
    ax2.set_xlabel("step", color=MUTED, fontsize=8)

    # 3. Distance to target
    ax3 = _ax(gs[0, 2], "Distance to target")
    ax3.plot(xs, dists, color=AMBER, linewidth=2, marker="o", markersize=4)
    if result["initial_pos"]:
        init_dist = math.dist(initial_pos[:2], [target_x, target_y])
        ax3.axhline(init_dist, color=MUTED, linewidth=0.8, linestyle="--",
                    label=f"initial ({init_dist:.3f})")
        ax3.legend(fontsize=7, labelcolor=MUTED, facecolor=MID, edgecolor=GRID)
    ax3.set_xlabel("step", color=MUTED, fontsize=8)
    ax3.set_ylabel("L2 distance", color=MUTED, fontsize=8)

    # 4. Visibility score
    ax4 = _ax(gs[1, 0], "Visibility score (RAG eval)")
    ax4.plot(xs, vis, color=GREEN, linewidth=2, marker="s", markersize=4)
    ax4.set_ylim(0, 10)
    ax4.set_xlabel("step", color=MUTED, fontsize=8)
    ax4.set_ylabel("score / 10", color=MUTED, fontsize=8)

    # 5. Cosine similarity to target
    ax5 = _ax(gs[1, 1], "Cosine similarity (direction)")
    ax5.plot(xs, cos_sims, color=BLUE, linewidth=2, marker="o", markersize=4)
    ax5.axhline(0, color=MUTED, linewidth=0.8, linestyle="--")
    ax5.set_xlabel("step", color=MUTED, fontsize=8)
    ax5.set_ylabel("cos_sim", color=MUTED, fontsize=8)

    # 6. Magnitude bonus
    ax6 = _ax(gs[1, 2], "Magnitude bonus (step size)")
    ax6.bar(xs, mags, color=AMBER, alpha=0.8)
    ax6.set_xlabel("step", color=MUTED, fontsize=8)
    ax6.set_ylabel("magnitude bonus", color=MUTED, fontsize=8)

    # 7. PCA trajectory (spans bottom two columns)
    ax7 = fig.add_subplot(gs[2, :2])
    ax7.set_facecolor(MID)
    ax7.set_title("PCA trajectory (2D)", color=MUTED, fontsize=10)
    ax7.tick_params(colors=MUTED, labelsize=8)
    for spine in ax7.spines.values():
        spine.set_edgecolor(GRID)
    ax7.grid(color=GRID, linewidth=0.5)

    # Draw path
    all_x = [initial_pos[0]] + pos_x
    all_y = [initial_pos[1]] + pos_y
    for i in range(len(all_x) - 1):
        c = GREEN if (i < len(toward) and toward[i]) else RED
        ax7.annotate(
            "", xy=(all_x[i+1], all_y[i+1]), xytext=(all_x[i], all_y[i]),
            arrowprops=dict(arrowstyle="->", color=c, lw=1.2),
        )

    # Scatter steps
    sc = ax7.scatter(pos_x, pos_y, c=rewards, cmap="RdYlGn",
                     s=60, zorder=5, edgecolors=MUTED, linewidths=0.5)
    plt.colorbar(sc, ax=ax7, label="reward").ax.yaxis.label.set_color(MUTED)

    # Labels
    for i, (px, py) in enumerate(zip(pos_x, pos_y)):
        ax7.text(px, py, f" {i+1}", fontsize=7, color=MUTED, va="center")

    ax7.plot(*initial_pos[:2], "s", color=BLUE, markersize=9,
             label="start", zorder=6)
    ax7.plot(target_x, target_y, "*", color=AMBER, markersize=14,
             label="target", zorder=6)
    ax7.legend(fontsize=8, labelcolor=MUTED, facecolor=MID, edgecolor=GRID)
    ax7.set_xlabel("PCA dim 1", color=MUTED, fontsize=8)
    ax7.set_ylabel("PCA dim 2", color=MUTED, fontsize=8)

    # 8. Reward histogram
    ax8 = _ax(gs[2, 2], "Reward distribution")
    pos_r = [r for r in rewards if r > 0]
    neg_r = [r for r in rewards if r <= 0]
    if pos_r:
        ax8.hist(pos_r, bins=min(10, len(pos_r)), color=GREEN,
                 alpha=0.7, label=f"positive ({len(pos_r)})")
    if neg_r:
        ax8.hist(neg_r, bins=min(10, len(neg_r)), color=RED,
                 alpha=0.7, label=f"negative ({len(neg_r)})")
    ax8.legend(fontsize=7, labelcolor=MUTED, facecolor=MID, edgecolor=GRID)
    ax8.set_xlabel("reward", color=MUTED, fontsize=8)
    ax8.set_ylabel("count", color=MUTED, fontsize=8)

    fig.savefig(output_path, dpi=150, bbox_inches="tight",
                facecolor=DARK, edgecolor="none")
    print(f"\n  Plots saved → {output_path}")
    plt.close(fig)


# ── Stage 4: text summary ────────────────────────────────────────────────────

def print_summary(result: dict):
    steps = result["steps"]
    if not steps:
        return

    rewards   = [s["reward"] for s in steps]
    toward    = [s["moved_toward_target"] for s in steps]
    dists     = [s["dist_to_target"] for s in steps]
    vis_list  = [s["vis_score"] for s in steps]

    hit_rate    = sum(toward) / len(toward) * 100
    best_step   = max(steps, key=lambda s: s["reward"])
    worst_step  = min(steps, key=lambda s: s["reward"])
    dist_change = dists[-1] - dists[0] if len(dists) > 1 else 0

    print(f"\n{'='*60}")
    print(f"  SUMMARY")
    print(f"{'='*60}")
    print(f"  Stop reason     : {result.get('stop_reason','?')}")
    print(f"  Steps taken     : {result.get('steps_taken','?')} / {MAX_STEPS}")
    print(f"  Few-shot used   : {result.get('few_shot_count', 0)}")
    print(f"  Best reward     : {result.get('best_reward', 0):.4f}  (step {best_step['step']})")
    print(f"  Worst reward    : {worst_step['reward']:.4f}  (step {worst_step['step']})")
    print(f"  Total reward    : {result.get('total_reward', 0):.4f}")
    print(f"  Hit rate        : {hit_rate:.0f}%  ({sum(toward)}/{len(toward)} steps moved toward target)")
    print(f"  Distance change : {dist_change:+.4f}  ({'closer' if dist_change < 0 else 'further'})")
    print(f"  Vis score avg   : {sum(vis_list)/len(vis_list):.2f}/10")
    print(f"  Vis score range : {min(vis_list):.1f} – {max(vis_list):.1f}")
    print(f"\n  Best draft preview:")
    print(f"  {result.get('best_draft','')[:300]}...")

    print(f"\n  Step-by-step critiques:")
    for s in steps:
        marker = "✓" if s["moved_toward_target"] else "✗"
        print(f"  {marker} step {s['step']:>2}  r={s['reward']:+.4f}  {s['critique']}")

    if result.get("nn_strategy_win_rates"):
        print(f"\n  NN policy — episodes trained: {result.get('nn_episodes_trained', '?')}")
        print(f"  NN policy loss: {result.get('nn_policy_loss', '?')}")
        print(f"  Strategy win rates:")
        for strategy, rate in sorted(
            result["nn_strategy_win_rates"].items(),
            key=lambda x: -x[1],
        ):
            bar = "█" * int(rate * 20)
            print(f"    {strategy:<22} {rate:.1%}  {bar}")


# ── main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not OPENAI_KEY:
        print("ERROR: set OPENAI_API_KEY env var")
        sys.exit(1)
    if not SERPER_KEY:
        print("ERROR: set SERPER_API_KEY env var")
        sys.exit(1)

    try:
        # Analysis (skip if session already exists)
        if EXISTING_SID:
            session_id = EXISTING_SID
            meta = {"pca_points": [], "blue_ocean_zones": [], "user_centroid": None}
            print(f"Using existing session: {session_id}")
        else:
            session_id, meta = run_analysis()

        tx, ty = pick_target(meta)
        result = run_rl_episode(session_id, tx, ty)

        print_summary(result)
        plot_results(result, OUTPUT_FILE)

        # Persist raw data next to script for further analysis
        out_json = OUTPUT_FILE.replace(".png", ".json")
        with open(out_json, "w") as f:
            json.dump(result, f, indent=2, default=str)
        print(f"  Raw data saved → {out_json}")

    except requests.exceptions.ConnectionError:
        print("\nERROR: backend not reachable. Start it with:")
        print("  cd backend && python app.py")
        sys.exit(1)
    except Exception as exc:
        print(f"\nERROR: {exc}")
        raise
