# LLM Visibility Diagnostic — Visual Design Overhaul Guidelines (v2)
> Inspired by the Stakent crypto dashboard aesthetic. Updated to reflect the refactored two-state app architecture: **Landing Page → Results Dashboard**.

---

## 0. App State Architecture (Critical Context)

The app now has two distinct, full-page states. The design system must serve both without contradiction:

```
┌─────────────────────────┐        ┌──────────────────────────────────────┐
│                         │        │                                      │
│   STATE 1: LANDING      │──────▶ │   STATE 2: RESULTS DASHBOARD         │
│   (Input form, centered)│  run   │   (Sidebar nav + content panels)     │
│                         │        │                                      │
└─────────────────────────┘        └──────────────────────────────────────┘
```

- **State 1** exists before any analysis runs. It collects the URL, API keys, sliders, and optional custom questions.
- **State 2** appears after "Analyse →" is clicked and results are loaded. It is the full dashboard.
- The **page background, color palette, and typography carry across both states** for visual continuity.
- The **transition between states** is a key design moment (see §10).

---

## 1. Design Philosophy

The Stakent dashboard succeeds because it treats **data as architecture** — every number has spatial weight, every card has a job, and chrome never competes with content. The overhaul applies this philosophy across both states:

- **Landing:** Should feel like the entry console of a serious diagnostic tool — confident, not a generic SaaS form. The centered layout is correct; the execution needs elevation.
- **Results:** Should feel like a **command center for AI visibility intelligence** — data-dense but organized, with clear hierarchy so users know exactly where to look first.

---

## 2. Color Palette (Shared Across Both States)

| Role | Value | Usage |
|---|---|---|
| **Base / Page Background** | `#0d0d10` | Full-page canvas — both states |
| **Surface / Card** | `#161619` | Cards, sidebar, form container |
| **Surface Raised** | `#1e1e23` | Input fields, hovered cards, inner panels |
| **Border Subtle** | `#2a2a32` | Card outlines, dividers, input borders |
| **Primary Accent** | `#7c5cfc` | CTA buttons, active nav, score ring, slider thumb |
| **Accent Glow** | `rgba(124, 92, 252, 0.15)` | Glow behind CTA, featured panel bg tint |
| **Text Primary** | `#f0f0f4` | Headlines, big numbers, nav labels |
| **Text Secondary** | `#6e6e80` | Sublabels, placeholders, helper text |
| **Positive / High** | `#22c55e` | High visibility scores (8–10) |
| **Warning / Medium** | `#f59e0b` | Medium visibility scores (5–7) |
| **Negative / Low** | `#ef4444` | Low visibility scores (0–4) |
| **Featured Panel Bg** | Gradient `#2a1f5c → #1a1040` | Highlight panel in dashboard Overview |

---

## 3. Typography System (Shared Across Both States)

| Role | Font | Weight | Size |
|---|---|---|---|
| **App Title / H1** | `"Syne"` | 800 | 36–40px |
| **Section Headlines** | `"Syne"` | 700 | 18–22px |
| **Nav Labels / Form Labels** | `"Syne"` | 600 | 12–13px, uppercase, letter-spacing 0.08em |
| **Big Metric Numbers** | `"DM Mono"` | 300 | 40–56px |
| **Card Values / Scores** | `"DM Mono"` | 400 | 24–32px |
| **Body / Descriptions** | `"DM Sans"` | 400 | 13–14px |
| **Tags / Badges** | `"DM Sans"` | 500 | 11px, uppercase, letter-spacing 0.06em |
| **Input text / Placeholder** | `"DM Sans"` | 400 | 14px |

> **Key change from current:** The existing title uses a generic system font at heavy weight. Replace with Syne 800 — same visual dominance, far more character. Form labels currently use uppercase without a refined font; switching to Syne 600 with tighter letter-spacing elevates the form from "settings panel" to "diagnostic console."

---

## 4. Card & Surface System (Shared)

| Layer | Background | Border | Radius |
|---|---|---|---|
| Page | `#0d0d10` | — | — |
| Card / Panel / Form Container | `#161619` | `1px solid #2a2a32` | `16px` |
| Nested / Inner Surface | `#1e1e23` | `1px solid #2a2a32` | `10px` |
| Input fields | `#1e1e23` | `1px solid #2a2a32` | `10px` |
| Active / Focused input | same bg | `1px solid #7c5cfc` | same |
| Hovered card | `#1c1c21` | `1px solid #3a3a46` | same |

All elevated surfaces: `box-shadow: 0 1px 3px rgba(0,0,0,0.5)`.

---

---

# STATE 1: LANDING PAGE

---

## 5. Landing Page — Layout

The centered layout is **correct and should be kept**. Changes are purely visual — no structural rearrangement needed here.

```
┌──────────────────────────────────────────────────────┐
│                    [page bg: #0d0d10]                │
│                                                      │
│              ┌──────────────────────┐                │
│              │   Logo + Title area  │                │
│              │   Subtitle           │                │
│              ├──────────────────────┤                │
│              │                      │                │
│              │   Form Card          │  ← single      │
│              │   (all inputs)       │    card        │
│              │                      │    container   │
│              ├──────────────────────┤                │
│              │   Analyse CTA button │                │
│              ├──────────────────────┤                │
│              │   Footer disclaimer  │                │
│              └──────────────────────┘                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Max content width:** `480px`, centered with `margin: 0 auto`.

---

## 6. Landing Page — Logo & Title Area

**Current:** A magnifying glass emoji + plain bold title.

**Overhaul:**
- Replace emoji with a proper SVG icon: a stylized eye or signal-wave mark, rendered in `#7c5cfc` at 32px — same visual role, far more polished
- Title `"LLM Visibility Diagnostic"` — Syne 800, 36px, `color: #f0f0f4`, no text-shadow
- Subtitle `"See how AI sees your business — and what to fix."` — DM Sans 400, 14px, `color: #6e6e80`
- Vertical spacing: `gap: 8px` between icon+title, `gap: 6px` between title+subtitle
- Add a very subtle radial glow behind the icon: `radial-gradient(circle at center, rgba(124,92,252,0.12) 0%, transparent 70%)` as a pseudo-element — barely visible, adds depth

---

## 7. Landing Page — Form Card

**Current:** Inputs float directly on the page background with no container. This makes the form feel spaceless and unanchored.

**Overhaul:** Wrap all inputs in a **single card container**:
- `background: #161619`, `border: 1px solid #2a2a32`, `border-radius: 16px`
- `padding: 28px 28px`
- All form fields sit inside this container — visually groups them as "one form unit"

### 7.1 — Section Grouping Inside the Card

Divide the form into two visual sections with a subtle `border-top: 1px solid #2a2a32` divider between them:

**Section A — Target:**
- `YOUR WEBSITE URL` input

**Section B — Configuration (collapsible by default):**
- `OPENAI API KEY`
- `SERPER API KEY` (with the "Free at Serper.dev" link preserved, restyled as a small accent-colored text link)
- `COMPETITORS` slider
- `QUESTIONS` slider
- `CUSTOM QUESTIONS` textarea

> **Why collapsible:** On first visit, collapsing Section B behind a `▾ Advanced Settings` toggle reduces visual clutter. The URL is the only truly required field to start. Returning users who've pre-filled keys won't need to see them every time. The toggle opens with a smooth `max-height` CSS animation.

### 7.2 — Input Field Styling

**Current:** Fields have a dark background with a barely-visible border and small label text.

**Overhaul:**
- Labels: Syne 600, 11px, uppercase, `letter-spacing: 0.08em`, `color: #6e6e80` — positioned above field with `margin-bottom: 6px`
- Input fields: `background: #1e1e23`, `border: 1px solid #2a2a32`, `border-radius: 10px`, `padding: 10px 14px`
- Focus state: `border-color: #7c5cfc`, `box-shadow: 0 0 0 3px rgba(124,92,252,0.12)`
- Placeholder text: `color: #3a3a46` (darker than current — should nearly disappear, not compete with real content)
- Password/key fields: Add a show/hide eye icon (Lucide, 16px) right-aligned inside the input, `color: #6e6e80`

### 7.3 — Slider Styling

**Current:** Sliders use the browser default blue fill, which clashes with everything.

**Overhaul:**
- Render as a two-column row: `[Label + Value]` on left, `[Slider track]` on right taking remaining width
- The current numeric value renders as `DM Mono 20px #f0f0f4` to the right of the label — large, prominent
- Custom slider track: `background: #2a2a32`, height `4px`, `border-radius: 2px`
- Fill (left of thumb): `background: #7c5cfc`
- Thumb: `width: 16px; height: 16px; background: white; border-radius: 50%; border: 2px solid #7c5cfc`
- Range hint text (`5 - 20`) stays below the slider in `DM Sans 11px #6e6e80`

### 7.4 — Custom Questions Textarea

- Same styling as input fields
- Resize handle: `resize: vertical` only
- Min-height: `80px`
- No changes to functionality

---

## 8. Landing Page — Analyse CTA Button

**Current:** A gray-toned button that reads `Analyse →`. Does not visually signal that this is the primary action.

**Overhaul:**
- `background: #7c5cfc`, `color: white`, `border-radius: 10px`
- `width: 100%` (spans full card width)
- `padding: 13px`, `font: Syne 600 15px`
- Hover state: `background: #6b4ef0`, `transform: translateY(-1px)`, `box-shadow: 0 4px 16px rgba(124,92,252,0.35)`
- Active/click state: `transform: translateY(0)`, shadow removed
- Loading state (while analysis runs): Replace text with a spinner + `"Analysing..."` — spinner is a simple rotating `border-top` ring in white, 16px

---

## 9. Landing Page — Footer Disclaimer

**Current:** Two lines of small centered text. Fine in concept; needs minor polish.

**Overhaul:**
- `DM Sans 12px`, `color: #3a3a46` (very subtle — this is tertiary content)
- `margin-top: 20px` from the CTA button
- No border or box needed

---

---

# TRANSITION: LANDING → DASHBOARD

---

## 10. Page Transition Animation

This is the highest-impact motion moment in the app. When "Analyse →" is clicked and results arrive:

1. **Loading state:** The form card stays visible. A subtle scanning animation plays inside the card — a thin `#7c5cfc` progress bar sweeps horizontally across the bottom edge of the form card, looping, at 1.5s. The button shows the spinner state.

2. **Transition out:** On results ready, the form card fades out + scales down slightly (`opacity: 0; transform: scale(0.97)`) over `250ms ease-in`.

3. **Dashboard fade in:** The full dashboard layout fades in + slides up from `translateY(12px)` to natural position over `300ms ease-out`, delayed by `50ms` after the form exits.

This makes the product feel responsive and alive rather than abruptly replacing the page.

---

---

# STATE 2: RESULTS DASHBOARD

---

## 11. Dashboard Layout Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Top Header Bar (full width, 56px)                              │
├──────────────┬──────────────────────────────────────────────────┤
│              │  Hero Metrics Strip (4 KPI cards, ~120px tall)   │
│  Navigation  ├──────────────────────────────────────────────────┤
│  Sidebar     │                                                  │
│  220px fixed │  Primary Content Panel (swaps per nav section)  │
│              │                                                  │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

The current tab-based layout buries navigation in the middle of the page. The sidebar + fixed header model mirrors Stakent exactly and surfaces all sections as equal first-class destinations.

---

## 12. Dashboard — Top Header Bar

**Height:** 56px, `background: #161619`, `border-bottom: 1px solid #2a2a32`

**Left zone:** Same logo icon + "LLM Visibility Diagnostic" wordmark from the landing page — provides visual continuity across both states.

**Center zone:** A **business URL pill** — shows the analysed URL (e.g. `aieo.com ▾`). Styled as a small dark pill with a domain icon. Clicking returns the user to the landing page to run a new analysis. This replaces the need for a separate "Run New Diagnostic" screen.
- `background: #1e1e23`, `border: 1px solid #2a2a32`, `border-radius: 999px`
- `padding: 6px 14px`, `DM Sans 13px #f0f0f4`
- Dropdown arrow `#6e6e80` on the right

**Right zone:**
- **"New Analysis"** pill button — `background: #7c5cfc`, `border-radius: 999px`, `padding: 7px 16px`, Syne 600 13px — mirrors Stakent's "Deposit" button
- Settings icon (Lucide `Settings`, 18px, `#6e6e80`) — opens a right-side drawer with the API key fields and slider settings, allowing adjustments without going back to landing

---

## 13. Dashboard — Navigation Sidebar

**Width:** 220px fixed, `background: #161619`, `border-right: 1px solid #2a2a32`, full viewport height

**Top toggle** (mirrors Stakent's Staking/Stablecoin switch):
```
  [ Current Run ]  [ History ]
```
Two pill buttons inside a `#1e1e23` pill tray. Active pill: `background: #2a2a32`, `color: #f0f0f4`.

**Navigation items:**
```
  □  Overview
  ◈  AI Visibility Tests        [badge: 10]
  ⬡  Positioning Map
  ✦  Recommendations
  ⚙  Settings
```
- Syne 600 13px labels
- Default: `color: #6e6e80`, no background
- Active: `background: rgba(124,92,252,0.12)`, `color: #f0f0f4`, `border-left: 3px solid #7c5cfc`, `border-radius: 0 8px 8px 0`
- Hover: background tint `rgba(255,255,255,0.03)`
- Test count badge: `background: #7c5cfc`, `color: white`, `border-radius: 999px`, `font-size: 10px`, inline right-aligned

**Sidebar bottom:** Persistent API status indicator — a small pill showing key validity status. Green dot + "Keys valid" or red dot + "Check keys". Styled like Stakent's "Activate Super" block.

---

## 14. Dashboard — Hero Metrics Strip

Four cards in a horizontal row spanning the full content area. Each card mirrors Stakent's asset reward-rate cards.

**Shared card anatomy:**
- `background: #161619`, `border: 1px solid #2a2a32`, `border-radius: 14px`, `padding: 20px`
- Top: Micro-label — DM Sans 11px uppercase `#6e6e80`
- Middle: Large number — DM Mono 40px weight-300 `#f0f0f4`
- Bottom: A colored delta badge or proportion indicator

**The four cards:**

| Card | Label | Value display | Bottom element |
|---|---|---|---|
| **Overall Score** (~30% width) | `OVERALL SCORE` | `4.5/10` — `/10` at 50% opacity | Thin SVG arc ring around the number, filled proportionally in `#7c5cfc`. Animates from 0 on load. |
| **Test Coverage** | `TEST COVERAGE` | `60.0%` | Small horizontal bar: filled portion `#7c5cfc`, empty `#2a2a32` |
| **High Visibility** | `HIGH VISIBILITY` | `3` | Green badge below: `▲ 3 questions` |
| **Competitors Found** | `COMPETITORS` | `10` | Neutral gray badge: `10 analysed` |

**Load animation:** Each card fades up from `translateY(8px), opacity:0` with staggered delays — 0ms, 80ms, 160ms, 240ms.

---

## 15. Dashboard — Content Panels per Section

### 15.1 — Overview Panel

Two-column layout:

**Left column (~62%):**
- **Score summary callout card** — the existing "A score of X/10 indicates..." text, styled with a `border-left: 3px solid #7c5cfc`, `background: #161619`, `border-radius: 12px`, `padding: 16px 20px`
- **High / Medium / Low row** — three small horizontal stat cards in a row, each showing a bold count number, a color-coded label, and a thin proportion bar
- **Competitor chips strip** — each competitor domain rendered as a pill badge (`background: #1e1e23`, `border-radius: 999px`, `padding: 3px 10px`, DM Sans 12px) instead of the current dot-separated plain text

**Right column (~38%):**
- A **featured callout panel** styled like Stakent's "Liquid Staking Portfolio" panel
- `background: linear-gradient(135deg, #2a1f5c, #1a1040)`, `border-radius: 16px`, `padding: 24px`
- Contains: "Top Recommendations" heading + 2 quick-win bullet items + two buttons: `"View All Recommendations"` (solid accent) and `"Export Report"` (outlined, `border: 1px solid rgba(124,92,252,0.4)`)

### 15.2 — AI Visibility Tests Panel

**Filter pill strip at top** (new, mirrors Stakent's `24H / Proof of Stake / Desc` pills):
```
[ All ]  [ ✅ Passed (6) ]  [ ❌ Failed (4) ]  [ Medium ]
```
- `background: #1e1e23`, `border: 1px solid #2a2a32`, `border-radius: 999px`, `padding: 5px 12px`
- Active filter: `background: #7c5cfc`, `color: white`, border removed

**Question accordion list:**
- Each row: full-width card with `border-radius: 12px`, `background: #161619`, `border: 1px solid #2a2a32`
- Left side: **Score badge pill** (replaces emoji) — `0/10`, `9/10` etc., color-coded per the badge system in §17
- Center: Question text in DM Sans 14px primary color
- Right side: Thin horizontal score bar (10 segments, filled to score) + chevron icon
- **Expanded inner panel:** `background: #1e1e23`, `border-radius: 8px`, `padding: 14px 16px`, contains the AI response text in DM Sans 13px secondary color
- Chevron rotates `180deg` on expand with `transition: transform 0.2s ease`

### 15.3 — Positioning Map Panel

**Panel header row:** "AI Semantic Space" title left-aligned; **2D / 3D toggle** right-aligned using the same pill-tray toggle as the sidebar top.

**Chart container:**
- `background: #0d0d10` (one shade darker than cards — makes chart "sink" into the page)
- `border-radius: 16px`, `border: 1px solid #2a2a32`, `padding: 8px`
- Chart fills this container edge-to-edge
- Axes labels: DM Mono 11px, `color: #6e6e80`

**Legend:** Moved out of the chart into a right-side panel card — each entry is a small row with colored dot + domain name in DM Sans 12px. "Your Business" entry uses a gold `♦` instead of a dot.

**Your Business marker:** Gold diamond `♦`, `font-size: 14px`, with pulsing glow:
```css
@keyframes pulse {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(251,191,36,0.6)); }
  50%       { filter: drop-shadow(0 0 12px rgba(251,191,36,0.9)); }
}
animation: pulse 2s ease-in-out infinite;
```

### 15.4 — Recommendations Panel

Two-column card grid.

Each card:
- `border-radius: 12px`, `background: #161619`, `border: 1px solid #2a2a32`
- Top: Priority badge pill (`High Priority` / `Quick Win` / `Long Term`)
- Headline: Syne 16px, `color: #f0f0f4`
- Body: DM Sans 13px, `color: #6e6e80`
- Bottom row: `"Learn more →"` text link in `#7c5cfc`, no full button

### 15.5 — Settings Panel (replaces old Business Profile)

> **Note:** The `Business Profile` tab in the old design held API keys and sliders — these now live on the **Landing Page** at analysis time. The Settings nav item in the dashboard provides access to them post-analysis.

**Layout:** Single-column stack of setting cards.

- **Analysis Target card:** Shows the analysed URL with a pencil icon that, on click, reveals an inline edit input. "Re-run Analysis" button at the bottom.
- **API Keys card:** Two masked input fields (same styling as landing), each with show/hide toggle and a valid/invalid status dot
- **Analysis Settings card:** Competitors and Questions sliders, styled identically to the landing page versions (§7.3)

---

## 16. Interactive States & Motion (Dashboard)

**Hover effects:**
- Cards: `border-color → #3a3a46`, background lifts one layer, `transition: 0.15s ease`
- Nav items: background tint fades in, left border slides from 0→3px
- Accordion rows: background lifts to `#1e1e23`
- CTA buttons: slight upward translate + glow shadow

**All transitions:** `transition: all 0.15s ease` — fast and crisp.

**Score ring animation:** SVG `stroke-dashoffset` animates from full (empty) to score-proportional over `0.8s cubic-bezier(0.4, 0, 0.2, 1)` on mount.

**Metric card stagger:** Each of the 4 hero cards animates in with `opacity: 0 → 1` + `translateY(8px → 0)`, delays at 0ms / 80ms / 160ms / 240ms.

**Section panel swap:** When switching nav items, content area does a fast `opacity: 0 → 1` crossfade over `120ms` — no sliding, just a clean dissolve.

---

## 17. Badges, Tags & Pills

| Type | Style |
|---|---|
| **Score badge — High (≥8)** | `bg: rgba(34,197,94,0.12)` · `color: #22c55e` · `border: 1px solid rgba(34,197,94,0.25)` · `border-radius: 6px` · `padding: 2px 8px` |
| **Score badge — Medium (5–7)** | Same with amber `#f59e0b` |
| **Score badge — Low (≤4)** | Same with red `#ef4444` |
| **Filter pills (inactive)** | `bg: #1e1e23` · `border: 1px solid #2a2a32` · `color: #6e6e80` · `border-radius: 999px` |
| **Filter pills (active)** | `bg: #7c5cfc` · `color: white` · no border |
| **Nav count badge** | `bg: #7c5cfc` · `color: white` · `border-radius: 999px` · 10px · `padding: 1px 6px` |
| **Competitor domain chip** | `bg: #1e1e23` · `border: 1px solid #2a2a32` · `border-radius: 999px` · `padding: 3px 10px` · DM Sans 12px |
| **Priority badge** | Color-coded pill: High = red tint, Quick Win = green tint, Long Term = blue tint |

---

## 18. Iconography

- **Library:** Lucide Icons throughout (matches Stakent's clean geometric aesthetic)
- **Sizes:** 16px inline/nav · 20px card headers · 24px empty states
- **Default color:** `#6e6e80` → lifts to `#f0f0f4` on active/hover
- **Stroke width:** 1.5px (Lucide default) — do not increase

---

## 19. Responsive Breakpoints

| Breakpoint | Behaviour |
|---|---|
| `> 1280px` | Full two-column dashboard as described |
| `1024–1280px` | Sidebar collapses to icon-only (48px wide), labels appear as tooltips on hover |
| `768–1024px` | Sidebar becomes a top nav strip; metric cards wrap to 2×2 grid |
| `< 768px` | Single column; metric strip scrolls horizontally; bottom tab navigation |

---

## 20. What Does NOT Change

- All diagnostic data, scores, questions, AI responses, and competitor information — content is unchanged
- The Positioning Map scatter plot logic, axes, and data — only the container and legend are restyled
- The two-slider settings (competitors count, questions count) remain functional on both landing and settings panel
- The "Free at Serper.dev" link is preserved — just restyled as an accent-colored inline text link
- Custom questions textarea remains optional and fully functional
- The 2D / 3D toggle on the Positioning Map is preserved
