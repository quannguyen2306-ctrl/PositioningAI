# One Piece UI Overhaul Plan

## Requirements

1. **Geist font** — Replace Syne/DM Mono/DM Sans with Geist (and Geist Mono for code) via npm package `geist`, applied globally
2. **Lucide icons everywhere** — Replace emoji-based icons (👁/○ password toggle, any non-Lucide icon usage) with Lucide React icons
3. **Floating bubbles animation** — Enhance/rework the existing 18 bubbles on the login page to feel organic, underwater-style (varied opacity, realistic physics, gentle wobble)
4. **Fix black sides on login page** — The area outside the center card on HomePage is pure black; needs to be filled with the ocean-themed gradient background
5. **Rename to "One Piece"** — Replace all "Blue Ocean" / "LLM Visibility Diagnostic" branding with "One Piece"

---

## Files Affected

| File | Changes |
|------|---------|
| `frontend/index.html` | Remove Google Fonts links, set `<title>One Piece</title>` |
| `frontend/package.json` | Add `geist` npm package |
| `frontend/tailwind.config.js` | Add Geist to font family config |
| `frontend/src/index.css` | Apply `font-family: 'Geist'` globally, update bubble keyframes |
| `frontend/src/pages/HomePage.tsx` | Bubbles rework, full-page background fix, rename branding, replace emoji icons with Lucide |
| `frontend/src/components/dashboard/DashHeader.tsx` | Rename "Blue Ocean" → "One Piece" |
| `frontend/src/components/ocean/BlueOceanPanel.tsx` | Rename panel title if it reads "Blue Ocean" |

---

## Implementation Phases

### Phase 1 — Geist Font
- Install `geist` package via npm (`npm install geist`)
- Remove Google Fonts `<link>` tags from `index.html`
- In `index.css`: set `--font-display: 'Geist', sans-serif` and `--font-mono: 'Geist Mono', monospace`
- In `tailwind.config.js`: update `fontFamily.sans` and `fontFamily.mono`
- The Geist npm package provides CSS via `geist/font` imports

### Phase 2 — Lucide Icons Everywhere
- `HomePage.tsx`: Replace 👁/○ password visibility toggle emojis with `Eye` / `EyeOff` from `lucide-react`
- `HomePage.tsx`: Replace `→` arrow text in button with `ArrowRight` icon
- `HomePage.tsx`: Replace 🌊 hero emoji with `Waves` icon (Lucide v0.577.0 compatible)
- Scan all other components for any remaining non-Lucide icon patterns

### Phase 3 — Floating Bubbles Animation Rework
- Current: 18 bubbles, basic `bubble-rise` keyframe, simple circle divs
- New: Add subtle horizontal wobble (`translateX` oscillation), varied border-radius for organic feel, semi-transparent with backdrop-blur, gentle scale variation as they rise
- Update `@keyframes bubble-rise` in `index.css` to include wobble path
- Keep bubbles scoped to `HomePage` with `position: fixed, pointer-events: none, z-index: 0`

### Phase 4 — Fix Login Page Background
- Current issue: `body` background is `--bg-bottom` (near-black `oklch(0.10 0.02 210)`) — sides of page appear pure black
- Fix: Add a full-page radial gradient to `HomePage` root div for seamless ocean-depth feel
- Use: `background: radial-gradient(ellipse at center, var(--bg-overlay) 0%, var(--bg-mid) 40%, var(--bg-bottom) 100%)`

### Phase 5 — Rename to "One Piece"
- `index.html`: `<title>One Piece</title>`
- `HomePage.tsx`: Hero heading "Blue Ocean" → "One Piece"; subtitle/tagline stays ocean-themed
- `DashHeader.tsx`: Any "Blue Ocean" references
- `BlueOceanPanel.tsx`: Keep "Blue Ocean Territories" as a feature name (or rename to "Uncharted Waters")

---

## Risks

- **Geist font loading**: The npm package approach requires a CSS import — Vite handles this fine. Low risk.
- **`Waves` icon**: Lucide has `Waves` icon in v0.577.0. If missing, fall back to `Wind` or keep emoji.
- **Bubble z-index**: Bubbles must stay behind the form card. Needs `z-index: 0` on bubbles, `z-index: 1` on form.
- **"One Piece" thematic text**: Taglines like "Dive into the Ocean" still work; "Blue Ocean Territories" becomes ambiguous — rename strategically.

---

## Complexity: LOW-MEDIUM

- Phase 1 (fonts): ~15 min
- Phase 2 (icons): ~20 min
- Phase 3 (bubbles): ~25 min
- Phase 4 (background fix): ~10 min
- Phase 5 (rename): ~10 min
