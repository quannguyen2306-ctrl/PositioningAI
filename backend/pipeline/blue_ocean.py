"""
blue_ocean.py
-------------
Blue ocean analysis: archetype classification and unclaimed territory detection.

Archetype classification uses PCA coordinates + eval scores to determine
the user's competitive positioning pattern (5 types).

Blue ocean zone detection scans the 2D PCA space for low-density regions
that no company's content occupies — these are semantic territories ripe
for claiming with new content.
"""

import numpy as np


# ---------------------------------------------------------------------------
# Archetype Classification
# ---------------------------------------------------------------------------

ARCHETYPES = {
    "invisible_center": {
        "name": "Invisible Center",
        "tagline": "Lost in the crowd",
        "description": (
            "Your content is positioned in the heart of the competitive space "
            "but sounds like everyone else's. AI can't distinguish you from competitors."
        ),
        "strategy": (
            "Develop a sharper unique angle. Differentiate your messaging "
            "to claim distinct semantic territory away from the pack."
        ),
        "icon": "🌊",
    },
    "lone_ranger": {
        "name": "Lone Ranger",
        "tagline": "Too unique for the AI to find you",
        "description": (
            "Your content is semantically isolated from the market. "
            "AI can't match you to customer queries because your language "
            "differs too much from what customers actually search for."
        ),
        "strategy": (
            "Bridge the gap. Adopt industry-standard terminology and question "
            "framing while keeping your unique positioning intact."
        ),
        "icon": "🏝️",
    },
    "shadow": {
        "name": "The Shadow",
        "tagline": "Mirroring a dominant competitor",
        "description": (
            "Your content closely mirrors a dominant competitor's. "
            "You're in their semantic shadow, and AI treats you as interchangeable."
        ),
        "strategy": (
            "Carve out distinct territory. Find the angles your competitor doesn't own "
            "and build content there to establish independent authority."
        ),
        "icon": "🐚",
    },
    "pioneer": {
        "name": "Pioneer",
        "tagline": "Charting new waters",
        "description": (
            "You've claimed unique semantic territory with decent visibility. "
            "You're ahead of competitors in an underexplored space — "
            "the risk is others following once they notice."
        ),
        "strategy": (
            "Double down and publish more content in your territory. "
            "Establish authority before others catch up."
        ),
        "icon": "⚓",
    },
    "contender": {
        "name": "Contender",
        "tagline": "In the race, not yet leading",
        "description": (
            "You're competitively positioned with decent scores overall, "
            "but losing on specific question types where competitors have stronger content."
        ),
        "strategy": (
            "Target your gaps precisely. Focus content efforts on the question categories "
            "where competitors currently edge you out."
        ),
        "icon": "🐬",
    },
}


def classify_archetype(
    coords: np.ndarray,
    pca_meta: list[dict],
    eval_results: list[dict],
    user_domain: str = "",
) -> dict:
    """
    Classify the user's competitive positioning into one of 5 archetypes.

    Uses:
    - Distance from user centroid to competitor centroid (relative to competitor spread)
    - Proximity to the closest single competitor domain
    - Average visibility score
    """
    user_mask = np.array([m["source"] == "user" for m in pca_meta])
    comp_mask = ~user_mask

    if not any(user_mask) or not any(comp_mask):
        return {**ARCHETYPES["contender"], "closest_competitor": None}

    user_coords_2d = coords[user_mask, :2]
    comp_coords_2d = coords[comp_mask, :2]

    user_centroid = user_coords_2d.mean(axis=0)
    comp_centroid = comp_coords_2d.mean(axis=0)

    # Spread of the competitor cluster
    comp_spread = float(np.std(comp_coords_2d, axis=0).mean()) + 1e-6

    # Normalized distance: >1.0 = isolated, <0.5 = inside the crowd
    centroid_distance = float(np.linalg.norm(user_centroid - comp_centroid))
    normalized_distance = centroid_distance / comp_spread

    avg_score = (
        float(np.mean([r.get("visibility_score", 0) for r in eval_results]))
        if eval_results else 0.0
    )

    # Find closest competitor domain centroid
    comp_domains_map: dict[str, list[np.ndarray]] = {}
    for meta, i in zip(pca_meta, range(len(pca_meta))):
        if meta["source"] == "competitor":
            d = meta.get("domain") or "unknown"
            comp_domains_map.setdefault(d, []).append(coords[i, :2])

    closest_domain = None
    min_domain_dist = float("inf")
    for domain, dc_list in comp_domains_map.items():
        dc_centroid = np.array(dc_list).mean(axis=0)
        dist = float(np.linalg.norm(user_centroid - dc_centroid))
        if dist < min_domain_dist:
            min_domain_dist = dist
            closest_domain = domain

    # --- Classification logic ---
    shadow_threshold = comp_spread * 0.4

    if normalized_distance < 0.6 and avg_score < 5:
        key = "invisible_center"
    elif normalized_distance > 1.5 and avg_score < 5:
        key = "lone_ranger"
    elif min_domain_dist < shadow_threshold and normalized_distance < 0.8:
        key = "shadow"
    elif normalized_distance > 1.0 and avg_score >= 5:
        key = "pioneer"
    else:
        key = "contender"

    result = dict(ARCHETYPES[key])
    result["closest_competitor"] = closest_domain

    # Personalise shadow description
    if key == "shadow" and closest_domain:
        result["description"] = (
            f"Your content closely mirrors {closest_domain}'s. "
            "You're in their semantic shadow, and AI treats you as interchangeable."
        )

    return result


# ---------------------------------------------------------------------------
# Blue Ocean Zone Detection
# ---------------------------------------------------------------------------

def find_blue_ocean_zones(
    coords: np.ndarray,
    pca_meta: list[dict],
    grid_size: int = 20,
    top_n: int = 5,
) -> list[dict]:
    """
    Scan the 2D PCA space on a grid and identify low-density regions —
    semantic territories unclaimed by any business's content.

    Searches strictly within the convex hull of the data so zones always
    appear inside the visible map area, never in the empty margins.

    Returns up to `top_n` zones, each with {x, y, radius, label}.
    """
    if len(coords) < 5:
        return []

    pts = coords[:, :2]
    x_min, x_max = float(pts[:, 0].min()), float(pts[:, 0].max())
    y_min, y_max = float(pts[:, 1].min()), float(pts[:, 1].max())

    # NO margin expansion — zones must fall inside the actual data range
    x_range = x_max - x_min or 1.0
    y_range = y_max - y_min or 1.0

    # Detection radius: ~1/10 of the data spread so we catch genuine gaps
    detection_radius = min(x_range, y_range) / 10.0

    x_grid = np.linspace(x_min, x_max, grid_size)
    y_grid = np.linspace(y_min, y_max, grid_size)

    # Collect candidate zones sorted by distance to nearest point (most isolated first)
    candidates: list[tuple[float, float, float]] = []  # (min_dist, x, y)

    for x in x_grid:
        for y in y_grid:
            distances = np.sqrt(((pts - np.array([x, y])) ** 2).sum(axis=1))
            min_dist = float(distances.min())
            nearby = int((distances < detection_radius).sum())

            # A blue ocean zone: few neighbours and meaningfully far from any point
            if nearby <= 1 and min_dist > detection_radius * 0.8:
                candidates.append((min_dist, x, y))

    # Sort by most isolated first
    candidates.sort(key=lambda c: -c[0])

    zones: list[dict] = []
    min_zone_separation = detection_radius * 2.5

    for min_dist, x, y in candidates:
        # Ensure zones are spread out (no cluster of unclaimed markers)
        too_close = any(
            np.sqrt((x - z["x"]) ** 2 + (y - z["y"]) ** 2) < min_zone_separation
            for z in zones
        )
        if not too_close:
            zones.append({
                "x": round(x, 4),
                "y": round(y, 4),
                "radius": round(detection_radius, 4),
                "label": "Unclaimed Territory",
            })
        if len(zones) >= top_n:
            break

    return zones
