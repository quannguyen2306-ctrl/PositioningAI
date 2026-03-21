"""
pca_visualizer.py
-----------------
Fits PCA on the full embedding space (user + competitors),
asks an LLM to semantically label each principal component axis,
then builds Plotly 2D and 3D scatter charts with:
  - Competitor clusters (colored by domain)
  - User business highlighted as a star
  - Human-readable axis labels
"""

import json
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import plotly.graph_objects as go
import plotly.express as px
from openai import OpenAI


# ---------------------------------------------------------------------------
# PCA fitting
# ---------------------------------------------------------------------------

def fit_pca(
    embeddings: np.ndarray,
    n_components: int = 3,
) -> tuple[PCA, StandardScaler, np.ndarray]:
    """
    Standardise embeddings then run PCA.
    Returns: (fitted PCA, fitted scaler, projected coordinates).
    """
    scaler = StandardScaler()
    scaled = scaler.fit_transform(embeddings)

    # Guard: can't have more components than min(samples, features)
    n_components = min(n_components, scaled.shape[0], scaled.shape[1])
    pca = PCA(n_components=n_components, random_state=42)
    coords = pca.fit_transform(scaled)

    return pca, scaler, coords


# ---------------------------------------------------------------------------
# Semantic interpretation of PCA axes
# ---------------------------------------------------------------------------

INTERP_PROMPT = """You are interpreting a dimension of AI semantic space.

Text chunks with HIGH values on this dimension (one end of the axis):
{positive_texts}

Text chunks with LOW values on this dimension (other end of the axis):
{negative_texts}

What single concept or spectrum separates these two groups?
Think: what quality, tone, or topic is HIGH in the first group and LOW in the second?

Return ONLY a JSON object:
{{
  "dimension_name": "3-4 word label for this axis",
  "positive_end": "2-3 word label for the high end",
  "negative_end": "2-3 word label for the low end",
  "explanation": "one sentence: what does this dimension capture?"
}}"""


def interpret_dimensions(
    pca: PCA,
    metadata: list[dict],
    coords: np.ndarray,
    client: OpenAI,
    n_samples: int = 5,
) -> list[dict]:
    """
    For each PCA component, send representative text samples to an LLM
    and ask it to name the semantic axis.

    Returns list of interpretation dicts (one per component), each with:
      dimension_name, positive_end, negative_end, explanation, variance_explained
    """
    interpretations: list[dict] = []

    for dim_idx in range(pca.n_components_):
        dim_scores = coords[:, dim_idx]

        top_pos_idx = np.argsort(dim_scores)[-n_samples:][::-1]
        top_neg_idx = np.argsort(dim_scores)[:n_samples]

        positive_texts = "\n".join(
            f"- {metadata[i]['text'][:180]}..." for i in top_pos_idx
        )
        negative_texts = "\n".join(
            f"- {metadata[i]['text'][:180]}..." for i in top_neg_idx
        )

        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": INTERP_PROMPT.format(
                        positive_texts=positive_texts,
                        negative_texts=negative_texts,
                    ),
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        interp = json.loads(resp.choices[0].message.content)
        interp["variance_explained"] = round(
            pca.explained_variance_ratio_[dim_idx] * 100, 1
        )
        interpretations.append(interp)

    return interpretations


# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

COMPETITOR_PALETTE = px.colors.qualitative.Plotly  # 10 distinct colours


def _domain_color_map(domains: list[str]) -> dict[str, str]:
    unique = list(dict.fromkeys(domains))  # preserve order, deduplicate
    return {d: COMPETITOR_PALETTE[i % len(COMPETITOR_PALETTE)] for i, d in enumerate(unique)}


# ---------------------------------------------------------------------------
# 2-D Plotly chart
# ---------------------------------------------------------------------------

def plot_2d(
    coords: np.ndarray,
    metadata: list[dict],
    interpretations: list[dict],
    business_name: str,
) -> go.Figure:
    """Return a Plotly Figure with competitor clusters + user star (2-D)."""

    user_mask = np.array([m["source"] == "user" for m in metadata])
    comp_mask = ~user_mask

    user_coords = coords[user_mask]
    comp_coords = coords[comp_mask]
    comp_meta = [m for m, c in zip(metadata, comp_mask) if c]

    comp_domains = [m["domain"] or m["url"][:30] for m in comp_meta]
    color_map = _domain_color_map(comp_domains)
    unique_domains = list(color_map.keys())

    fig = go.Figure()

    # --- Competitor traces (one trace per domain for legend) ---
    for domain in unique_domains:
        dm_mask = [d == domain for d in comp_domains]
        dm_coords = comp_coords[dm_mask]
        hover_texts = [
            f"<b>{domain}</b><br>PC1: {x:.2f}  PC2: {y:.2f}"
            for x, y in zip(dm_coords[:, 0], dm_coords[:, 1])
        ]
        fig.add_trace(
            go.Scatter(
                x=dm_coords[:, 0],
                y=dm_coords[:, 1],
                mode="markers",
                name=domain,
                marker=dict(size=7, color=color_map[domain], opacity=0.55),
                hovertext=hover_texts,
                hoverinfo="text",
                showlegend=True,
            )
        )

    # --- Competitor centroid ---
    if len(comp_coords):
        cx, cy = comp_coords[:, 0].mean(), comp_coords[:, 1].mean()
        fig.add_trace(
            go.Scatter(
                x=[cx],
                y=[cy],
                mode="markers",
                name="Competitor centroid",
                marker=dict(
                    size=20,
                    color="rgba(180,180,180,0.35)",
                    symbol="circle",
                    line=dict(width=2, color="#aaaaaa"),
                ),
                hovertext="Average position of all competitors",
                hoverinfo="text",
                showlegend=True,
            )
        )

    # --- User chunks ---
    if len(user_coords):
        fig.add_trace(
            go.Scatter(
                x=user_coords[:, 0],
                y=user_coords[:, 1],
                mode="markers",
                name=f"{business_name} (your content)",
                marker=dict(
                    size=12,
                    color="#FFD700",
                    symbol="star",
                    opacity=0.75,
                    line=dict(width=1, color="#8B6914"),
                ),
                hovertext=[
                    f"<b>{business_name}</b><br>PC1: {x:.2f}  PC2: {y:.2f}"
                    for x, y in zip(user_coords[:, 0], user_coords[:, 1])
                ],
                hoverinfo="text",
                showlegend=True,
            )
        )

        # User centroid (big star)
        ux, uy = user_coords[:, 0].mean(), user_coords[:, 1].mean()
        fig.add_trace(
            go.Scatter(
                x=[ux],
                y=[uy],
                mode="markers+text",
                name=f"{business_name} center",
                text=["  ← You"],
                textposition="middle right",
                textfont=dict(color="#FFD700", size=12),
                marker=dict(
                    size=24,
                    color="#FFD700",
                    symbol="star",
                    line=dict(width=2, color="#8B6914"),
                ),
                hovertext=f"Your center position in semantic space",
                hoverinfo="text",
                showlegend=True,
            )
        )

    # Axis labels
    def axis_label(idx: int, default: str) -> str:
        if idx < len(interpretations):
            i = interpretations[idx]
            pct = i.get("variance_explained", "")
            return f"{i['positive_end']} ← → {i['negative_end']}  ({pct}% var)"
        return default

    fig.update_layout(
        title=dict(
            text="Your Business in AI Semantic Space — 2D",
            font=dict(size=17),
        ),
        xaxis_title=axis_label(0, "PC1"),
        yaxis_title=axis_label(1, "PC2"),
        template="plotly_dark",
        height=560,
        hovermode="closest",
        legend=dict(orientation="v", x=1.02, y=1, font=dict(size=11)),
        margin=dict(l=60, r=200, t=60, b=60),
        plot_bgcolor="rgba(18,18,28,1)",
        paper_bgcolor="rgba(0,0,0,0)",
    )

    return fig


# ---------------------------------------------------------------------------
# 3-D Plotly chart
# ---------------------------------------------------------------------------

def plot_3d(
    coords: np.ndarray,
    metadata: list[dict],
    interpretations: list[dict],
    business_name: str,
) -> go.Figure:
    """Return a rotatable Plotly Figure (3-D) — same data as 2-D but with PC3."""

    has_3d = coords.shape[1] >= 3

    user_mask = np.array([m["source"] == "user" for m in metadata])
    comp_mask = ~user_mask

    user_coords = coords[user_mask]
    comp_coords = coords[comp_mask]
    comp_meta = [m for m, c in zip(metadata, comp_mask) if c]

    comp_domains = [m["domain"] or m["url"][:30] for m in comp_meta]
    color_map = _domain_color_map(comp_domains)
    unique_domains = list(color_map.keys())

    def z(arr: np.ndarray) -> np.ndarray:
        return arr[:, 2] if has_3d else np.zeros(len(arr))

    fig = go.Figure()

    for domain in unique_domains:
        dm_mask_arr = np.array([d == domain for d in comp_domains])
        dm_coords = comp_coords[dm_mask_arr]
        fig.add_trace(
            go.Scatter3d(
                x=dm_coords[:, 0],
                y=dm_coords[:, 1],
                z=z(dm_coords),
                mode="markers",
                name=domain,
                marker=dict(size=4, color=color_map[domain], opacity=0.5),
                hovertext=[domain] * len(dm_coords),
                hoverinfo="text+name",
            )
        )

    if len(user_coords):
        fig.add_trace(
            go.Scatter3d(
                x=user_coords[:, 0],
                y=user_coords[:, 1],
                z=z(user_coords),
                mode="markers",
                name=f"{business_name}",
                marker=dict(
                    size=7,
                    color="#FFD700",
                    symbol="diamond",
                    opacity=0.95,
                    line=dict(width=1, color="#8B6914"),
                ),
                hovertext=[business_name] * len(user_coords),
                hoverinfo="text+name",
            )
        )

    def axis_label_3d(idx: int, default: str) -> str:
        if idx < len(interpretations):
            i = interpretations[idx]
            return f"{i['dimension_name']} ({i.get('variance_explained', '')}%)"
        return default

    fig.update_layout(
        title="Your Business in AI Semantic Space — 3D (drag to rotate)",
        scene=dict(
            xaxis_title=axis_label_3d(0, "PC1"),
            yaxis_title=axis_label_3d(1, "PC2"),
            zaxis_title=axis_label_3d(2, "PC3"),
            bgcolor="rgba(18,18,28,1)",
            xaxis=dict(gridcolor="#333344"),
            yaxis=dict(gridcolor="#333344"),
            zaxis=dict(gridcolor="#333344"),
        ),
        template="plotly_dark",
        height=620,
        legend=dict(font=dict(size=11)),
        paper_bgcolor="rgba(0,0,0,0)",
    )

    return fig
