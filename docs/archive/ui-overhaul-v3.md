# LLM Visibility — UI Overhaul v2
### A Direct SnowUI Design System Transplant

> Every decision in this document traces back to a specific rule from the SnowUI visual analysis.
> The goal is not "inspired by" SnowUI — it is "built with the same system as" SnowUI.
> All content, data, and functionality stay 100% identical. Only the visual layer changes.

---

## Foundational Principle

SnowUI's core thesis: **depth through tonal layering, not decoration.**

Your current site has the right instincts — dark theme, purple accent, card-based layout. But it violates the single most important SnowUI rule: **surfaces must be visually distinct from each other.** Right now your canvas, sidebar, and cards are all near-identical dark tones. Everything collapses into one flat plane. Every fix in this document is a consequence of fixing that one problem first.

---

## Part 1 — Design Tokens

These are the exact values derived from the SnowUI analysis. Define these as CSS custom properties on `:root` and use nothing else. No hardcoded colors anywhere in the codebase.

```css
:root {

  /* ── SURFACES (4-layer system — the foundation of everything) ── */
  --surface-canvas:   #1B1D21;   /* page background — the lowest layer */
  --surface-sidebar:  #232629;   /* left nav + right panel */
  --surface-card:     #2A2D32;   /* all cards, chart containers, stat panels */
  --surface-elevated: #32353B;   /* dropdowns, tooltips, active/hover states */

  /* ── BORDERS (tonal, not structural — almost invisible by design) ── */
  --border-ghost:     rgba(255, 255, 255, 0.06);   /* card edges — barely there */
  --border-subtle:    rgba(255, 255, 255, 0.10);   /* inputs, dividers */
  --border-medium:    rgba(255, 255, 255, 0.14);   /* focused inputs, visible separators */

  /* ── TEXT (opacity-based hierarchy — no color variation, only opacity) ── */
  --text-primary:     rgba(255, 255, 255, 0.92);   /* stat numbers, titles, active nav */
  --text-secondary:   rgba(255, 255, 255, 0.60);   /* body copy, inactive nav, subtitles */
  --text-muted:       rgba(255, 255, 255, 0.38);   /* section labels, timestamps, axis ticks */
  --text-ghost:       rgba(255, 255, 255, 0.20);   /* placeholders, breadcrumb separators */

  /* ── ACCENT PURPLE (budget: <10% of visible surface area — guard this) ── */
  --accent:           #8B6FFF;                     /* primary CTA, active nav icon/text */
  --accent-dim:       #7B5EEE;                     /* pressed/active button state */
  --accent-wash:      rgba(139, 111, 255, 0.12);   /* active nav item background */
  --accent-border:    rgba(139, 111, 255, 0.45);   /* page-level glow ring, form focus */
  --accent-glow:      rgba(139, 111, 255, 0.12);   /* outer bloom on glow ring */

  /* ── DATA COLORS (charts and score indicators ONLY — never UI chrome) ── */
  --data-teal:        #4ECDC4;   /* high score / positive state */
  --data-blue:        #74B3F0;   /* secondary data series, neutral */
  --data-lavender:    #B8A9FF;   /* tertiary data series */
  --data-green:       #6FDFB0;   /* additional series, "quick win" */
  --data-amber:       #F5C97A;   /* medium / warning state */
  --data-red:         #E07B7B;   /* low / critical state */

  /* ── SPACING (strict 8pt grid — no arbitrary values) ── */
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  32px;

  /* ── BORDER RADIUS ── */
  --radius-sm:    8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-pill: 20px;

  /* ── SHADOWS (used extremely sparingly) ── */
  --shadow-card:    0 1px 4px rgba(0, 0, 0, 0.25);
  --shadow-float:   0 4px 16px rgba(0, 0, 0, 0.45);   /* dropdowns, tooltips */
  --shadow-glow:    0 0 0 1px rgba(139, 111, 255, 0.45),
                    0 0 24px rgba(139, 111, 255, 0.12); /* page-level frame, special use only */

  /* ── LAYOUT DIMENSIONS ── */
  --sidebar-width:    200px;
  --topbar-height:     48px;
  --nav-item-height:   36px;
  --card-padding:      20px;
}
```

---

## Part 2 — Typography

SnowUI uses a **clean geometric sans-serif**. The font is unremarkable by design — the data speaks, not the type.

```css
/* Use Inter — matches SnowUI's exact aesthetic */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

* { font-family: 'Inter', sans-serif; }
```

### The Full Type Scale

Map every text element to one of these — no exceptions.

| Token | Size | Weight | Color Token | Use Case |
|---|---|---|---|---|
| `--t-stat` | 28–32px | 600 | `--text-primary` | The big numbers: 6.8, 90%, 7, 9 |
| `--t-title` | 14–15px | 600 | `--text-primary` at 90% | Card headers, section titles |
| `--t-nav-active` | 13px | 500 | `--accent` | Active sidebar item |
| `--t-nav` | 13px | 400 | `--text-secondary` | Inactive sidebar items |
| `--t-body` | 13px | 400 | `--text-secondary` | Body copy, descriptions, list rows |
| `--t-label` | 11px | 500 | `--text-muted` | Section group labels — ALL CAPS, letter-spacing: 0.08em |
| `--t-meta` | 11px | 400 | `--text-muted` | Timestamps, "out of 10", "9 analysed" |
| `--t-badge` | 11px | 600 | varies | Priority badges, score chips |
| `--t-axis` | 11px | 400 | `--text-muted` | Chart axis ticks, chart legends |
| `--t-ghost` | 13px | 400 | `--text-ghost` | Input placeholders, breadcrumb separators |

### Stat Card Anatomy (SnowUI Rule — Apply Everywhere)

Every metric display follows this exact three-line pattern:

```
OVERALL SCORE           ← --t-label (11px, 500, --text-muted, ALL CAPS)

6.8                     ← --t-stat  (30px, 600, --text-primary)

out of 10               ← --t-meta  (11px, 400, --text-muted)
```

For the Test Coverage card:
```
TEST COVERAGE           ← --t-label

90%                     ← --t-stat

████████████░░░         ← 4px progress bar (--accent fill, --border-ghost track)
```

For badge-style sub-labels (like "▲ 7 questions"):
```
HIGH VISIBILITY         ← --t-label

7                       ← --t-stat

▲ 7 questions           ← small pill badge (data-teal background wash, --data-teal text)
```

> **SnowUI rule applied:** Positive indicators use an upward arrow and `--data-teal`. They are small, calm, and subordinate to the number — not competing with it.

---

## Part 3 — Global Layout

### 3.1 Shell Structure

SnowUI uses a strict three-zone shell. Adapt it for LLM Visibility:

```
┌──────────────────────────────────────────────────────────────────────┐
│  TOPBAR — spans main + right zone, 48px, --surface-canvas            │
├───────────────┬──────────────────────────────────┬───────────────────┤
│               │                                  │                   │
│  LEFT SIDEBAR │       MAIN CONTENT               │   RIGHT PANEL     │
│  200px fixed  │       fluid, padding: 20px 24px  │   220px fixed     │
│  --surface-   │       --surface-canvas bg        │   --surface-      │
│   sidebar     │                                  │    sidebar        │
│               │                                  │                   │
└───────────────┴──────────────────────────────────┴───────────────────┘
```

**Right panel — what to put there for LLM Visibility:**
Your site has no right panel currently. Add one. It does not need borders — tonal difference from the canvas is enough (just like SnowUI). Use it for:
- **Top Recommendations** (2–3 items, raw list, no inner card)
- **Recent Runs** (list of past analyses with timestamps)
- **Quick Stats** (a few key numbers raw on the surface)

This mirrors SnowUI exactly: right panel = ambient context, no cards, content directly on `--surface-sidebar`.

### 3.2 Topbar

Sits above the main content and right panel only. The sidebar has its own header zone.

```
[  ≡  ★  Dashboards / Default  ]    [ Anthropic ▾ ]    [ ⚙  +New Analysis ]
  breadcrumb (--text-ghost)           org selector        action icons + CTA
  left-aligned                        center              right-aligned
```

```css
.topbar {
  height: var(--topbar-height);              /* 48px */
  background: var(--surface-canvas);         /* blends into page — no shadow */
  border-bottom: 1px solid var(--border-ghost);
  display: flex;
  align-items: center;
  padding: 0 var(--space-md);
  gap: var(--space-sm);
}
```

**Org selector pill** ("Anthropic ▾"):
```css
.org-selector {
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 14px;
  cursor: pointer;
}
.org-selector:hover { background: var(--surface-elevated); }
```

**"+ New Analysis" CTA:**
```css
.btn-cta {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 500;
  padding: 7px 16px;
  cursor: pointer;
  /* No glow here — save the glow for the page-level frame only */
}
.btn-cta:hover { background: var(--accent-dim); }
```

**Topbar icon buttons** (⚙, etc.):
```css
.topbar-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
}
.topbar-icon:hover {
  background: var(--surface-elevated);
  color: var(--text-primary);
}
```

---

## Part 4 — Left Sidebar

### 4.1 Structure

Expand from current ~130px to **200px**. This is non-negotiable — at 130px the active state background clips, section labels truncate, and indented sub-items feel suffocating.

```css
.sidebar {
  width: var(--sidebar-width);   /* 200px */
  background: var(--surface-sidebar);
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: var(--space-md);
  gap: 0;
  /* No right border — tonal difference does the separation */
}
```

### 4.2 Sidebar Header Zone

```
[● icon]  LLM Visibility      ← 14px, weight 600, --text-primary
                               Logo icon uses --accent color

Current Run    History         ← 12px, weight 400, --text-secondary
                                 Active tab: --text-primary
                                 Small text tabs, no pill border
```

### 4.3 Nav Section Labels

```css
.nav-section-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: var(--space-sm) var(--space-sm) var(--space-xs);
  margin-top: var(--space-md);
}
```

### 4.4 Nav Items — The Exact SnowUI Pattern

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: var(--nav-item-height);   /* 36px */
  padding: 0 var(--space-sm);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 400;
  color: var(--text-secondary);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

/* ACTIVE STATE — the signature SnowUI treatment */
.nav-item.active {
  background: var(--accent-wash);    /* rgba(139,111,255,0.12) — a ghost of purple */
  color: var(--accent);              /* #8B6FFF — the one place purple text is used */
  font-weight: 500;
}

/* HOVER STATE */
.nav-item:hover:not(.active) {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}
```

**Icon treatment on nav items:**
```css
.nav-item svg {
  width: 16px;
  height: 16px;
  stroke-width: 1.5;               /* thin outline — not filled, not bold */
  opacity: 0.6;                    /* matches text opacity */
  flex-shrink: 0;
}
.nav-item.active svg {
  opacity: 1;
  color: var(--accent);
}
```

**Badge on "AI Visibility Tests"** (the "10" count):
```css
.nav-badge {
  margin-left: auto;
  background: var(--accent-wash);
  color: var(--accent);
  border-radius: var(--radius-pill);
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  min-width: 20px;
  text-align: center;
}
```

### 4.5 Full Sidebar Nav Layout

```
─────────────────────
[●] LLM Visibility

Current Run   History
─────────────────────

NAVIGATION              ← section label

  [□] Overview
  [▤] AI Visibility Tests  [10]
  [⊙] Positioning Map
  [✦] Recommendations
  [⚙] Settings

─────────────────────
                        ← spacer pushes status to bottom
● Keys active           ← 11px, --data-teal dot, --text-muted text
```

> **SnowUI rule:** The bottom status indicator ("Keys active") sits directly on the sidebar surface. No card around it. Same as SnowUI's "snowUI" branding at the bottom of its sidebar.

---

## Part 5 — Card System

This is the atomic unit of every page. Every rule here applies globally.

### 5.1 The Standard Card

```css
.card {
  background: var(--surface-card);         /* #2A2D32 — visibly lighter than canvas */
  border-radius: var(--radius-lg);         /* 16px — soft, rounded */
  border: 1px solid var(--border-ghost);   /* rgba(255,255,255,0.06) — near invisible */
  padding: var(--card-padding);            /* 20px all sides */
  box-shadow: var(--shadow-card);          /* 0 1px 4px rgba(0,0,0,0.25) — barely there */
}
```

### 5.2 Card Header Row

```css
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.card-action {           /* small controls in top-right of card */
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
}
```

### 5.3 Featured / Highlighted Card (SnowUI Variant B)

Used for the single most important card per page view. Slightly elevated surface — no border change, just a brighter background:

```css
.card.featured {
  background: var(--surface-elevated);  /* one step above --surface-card */
}
```

### 5.4 The Purple Glow Frame (SnowUI — used once per page, max)

SnowUI applies this to the eCommerce page as a whole-page frame — signaling the "active" context. For LLM Visibility, apply this to the **currently active run's page wrapper**, not to individual cards:

```css
.run-frame.active {
  box-shadow: var(--shadow-glow);
  /* = 0 0 0 1px rgba(139,111,255,0.45), 0 0 24px rgba(139,111,255,0.12) */
  border-radius: var(--radius-lg);
}
```

> This should appear on the main content wrapper when "Current Run" is selected. It's the only place this glow appears in the entire app.

### 5.5 Which Elements Get Their Own Card (LLM Visibility Mapping)

| Element | Card? | Notes |
|---|---|---|
| Overall Score | ✅ Yes — individual card | Donut gauge + label |
| Test Coverage | ✅ Yes — individual card | Large % + progress bar |
| High Visibility count | ✅ Yes — individual card | Large number + teal badge |
| Competitors count | ✅ Yes — individual card | Large number + meta text |
| Each question row (AI Visibility Tests) | ✅ Yes — card per row | Tight stacked cards |
| Filter tab group | ❌ No card — bare on canvas | Floats above the list |
| Each recommendation card | ✅ Yes — individual card | Title + description + action |
| Executive summary block | ✅ Yes — card with left accent border | Featured variant |
| Positioning Map scatter chart | ✅ Yes | Full-width card |
| Axis info panels (below scatter) | ✅ Yes — two side-by-side cards | |
| Right panel content (recommendations, recent runs) | ❌ No card — raw list on sidebar surface | SnowUI rule: right panel has no cards |
| Sidebar nav items | ❌ No card — directly on sidebar surface | |
| Landing form | ✅ Yes — centered card | + shadow-glow treatment |

---

## Part 6 — Stat Bar (The Top 4 Panels)

Currently these float as unseparated text on a black background. Apply the SnowUI stat card pattern exactly.

### Layout
```css
.stat-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}
```

### Each Stat Card Internal Structure

```
OVERALL SCORE                       ← --t-label (11px, 500, --text-muted, uppercase)

  [donut 56px]    6.8               ← donut left-floated, number 30px 600 --text-primary

  out of 10                         ← --t-meta (11px, --text-muted)
```

```
TEST COVERAGE                       ← --t-label

  90%                               ← --t-stat (30px, 600, --text-primary)

  ████████████████░░░               ← progress bar: 4px, --accent fill, --border-ghost track
                                       border-radius: --radius-pill
```

```
HIGH VISIBILITY                     ← --t-label

  7                                 ← --t-stat

  ▲ 7 questions                     ← pill badge: bg rgba(78,205,196,0.12), text --data-teal
                                       11px, 500 weight, border-radius: --radius-sm
```

```
COMPETITORS                         ← --t-label

  9                                 ← --t-stat

  9 analysed                        ← --t-meta, no badge
```

**Donut gauge (Overall Score):**
```css
/* SVG circle */
.donut-track  { stroke: var(--border-subtle); stroke-width: 6; fill: none; }
.donut-fill   { stroke: var(--accent);        stroke-width: 6; fill: none;
                stroke-linecap: round;
                /* animate stroke-dashoffset on mount */ }
.donut-label  { font-size: 18px; font-weight: 600; fill: var(--text-primary); }
```

---

## Part 7 — Screen-by-Screen Specifications

---

### 7.1 Landing Page

The entry form. In SnowUI terms: a single centered card on the canvas, with the `--shadow-glow` treatment to make it the focal point. No other decoration.

**Background:**
```css
body {
  background: var(--surface-canvas);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

No radial gradients. No noise textures. The SnowUI principle is flat surfaces only. The glow on the card provides enough focus.

**Form card:**
```css
.landing-card {
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-ghost);
  padding: 40px;
  width: 400px;
  box-shadow: var(--shadow-glow);          /* this IS the purple glow frame — used here */
}
```

**Brand icon (eye):**
```css
.brand-icon-wrap {
  width: 44px;
  height: 44px;
  background: var(--accent-wash);
  border: 1px solid rgba(139, 111, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-lg);
}
.brand-icon-wrap svg {
  width: 20px;
  height: 20px;
  color: var(--accent);
  stroke-width: 1.5;                       /* thin outline — SnowUI icon rule */
}
```

**Title:**
```css
.landing-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: var(--space-xs);
}
.landing-sub {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: var(--space-xl);
}
```

**Input labels:**
```css
.input-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: var(--space-xs);
  display: block;
}
```

**Input fields:**
```css
.input {
  width: 100%;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
  padding: 10px 14px;
  outline: none;
  transition: border-color 0.15s ease;
}
.input::placeholder { color: var(--text-ghost); }
.input:focus {
  border-color: var(--accent-border);      /* rgba(139,111,255,0.45) */
  box-shadow: 0 0 0 3px var(--accent-wash); /* rgba(139,111,255,0.12) */
}
```

**Advanced Settings accordion:**
```css
.accordion-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: var(--space-md) 0;
  border-top: 1px solid var(--border-ghost);
  cursor: pointer;
}
```

**Primary button:**
```css
.btn-primary {
  width: 100%;
  background: var(--accent);
  color: rgba(255,255,255,0.95);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  padding: 11px;
  cursor: pointer;
  transition: background 0.15s ease;
  margin-top: var(--space-md);
}
.btn-primary:hover  { background: var(--accent-dim); }
.btn-primary:active { background: #6B52DD; }
```

**Disclaimer text:**
```css
.landing-disclaimer {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  margin-top: var(--space-lg);
  line-height: 1.6;
}
```

---

### 7.2 Overview Page

**Page-level glow:** This is the "Current Run" view — apply the SnowUI purple frame here:
```css
.main-content-wrapper {
  box-shadow: var(--shadow-glow);
  border-radius: var(--radius-lg);
}
```

**Stat bar:** See Part 6. 4 cards, equal width grid.

**Main content area — two-column split:**
```css
.overview-body {
  display: grid;
  grid-template-columns: 1fr 300px;   /* ~70% content / ~30% recommendations */
  gap: var(--space-md);
  margin-top: var(--space-md);
}
```

**Company header card (left column, top):**
```css
.company-card {
  /* standard .card */
  border-left: 2px solid var(--accent);      /* the one structural accent use */
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
}
.company-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}
.company-meta {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}
.company-description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.65;
  margin-top: var(--space-md);
}
```

**The three metric numbers (7 / 2 / 1):**

These currently have colored numbers (green, orange, red). SnowUI rule: **numbers are always `--text-primary` white. Color belongs on indicators, not data.** Move the color to a 2px bottom strip:

```css
.metric-trio {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  margin-top: var(--space-md);
}
.metric-card {
  /* standard .card + */
  padding-bottom: 18px;     /* room for the bottom strip */
  position: relative;
  overflow: hidden;
}
.metric-card::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
}
.metric-card.high  ::after { background: var(--data-teal); }
.metric-card.mid   ::after { background: var(--data-amber); }
.metric-card.low   ::after { background: var(--data-red); }

.metric-number {
  font-size: 40px;
  font-weight: 600;
  color: var(--text-primary);      /* WHITE — not green/orange/red */
}
```

**Tag pills (Products & Services, Competitors Analysed):**
```css
.tag-section-label {
  /* --t-label style */
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: var(--space-sm);
  margin-top: var(--space-md);
}
.tag-pill {
  display: inline-block;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 12px;
  margin: 0 4px 4px 0;
}
/* All tags same neutral style — no colored variants */
```

**Top Recommendations card (right column):**

This is the one place to use the `.card.featured` variant — it's the most important card on the page. Give it an accent border instead of a heavy purple background:

```css
.recommendations-card {
  background: var(--surface-card);
  border: 1px solid rgba(139, 111, 255, 0.30);   /* faint accent border */
  border-radius: var(--radius-lg);
  padding: var(--card-padding);
  height: fit-content;
}
.recommendations-card .card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}
```

Recommendation list items (raw list, no inner card wrappers):
```css
.rec-item {
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border-ghost);
  display: flex;
  gap: var(--space-sm);
  align-items: flex-start;
}
.rec-item:last-of-type { border-bottom: none; }

.rec-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  margin-top: 5px;
  flex-shrink: 0;
}
.rec-item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}
.rec-item-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.5;
}
```

"View All Recommendations" button:
```css
.btn-outline {
  width: 100%;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  padding: 9px;
  text-align: center;
  margin-top: var(--space-md);
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-outline:hover {
  border-color: rgba(139,111,255,0.35);
  color: var(--accent);
  background: var(--accent-wash);
}
```

---

### 7.3 AI Visibility Tests Page

**Filter tabs:**
```css
.filter-tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}
.filter-tab {
  padding: 5px 14px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
}
.filter-tab.active {
  background: var(--accent-wash);
  border-color: rgba(139,111,255,0.30);
  color: var(--accent);
  font-weight: 500;
}
/* Count inside tab — e.g., "All 10" */
.filter-tab-count {
  color: var(--text-muted);
  font-weight: 400;
}
```

**Question row cards (tight stacked list):**

Each question is its own card. SnowUI stacks them tightly — 4px gap, not 16px. This creates a dense, scannable list rather than a spaced card grid.

```css
.question-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.question-row {
  background: var(--surface-card);
  border: 1px solid var(--border-ghost);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: var(--space-md);
  transition: background 0.12s ease, border-color 0.12s ease;
}
.question-row:hover {
  background: var(--surface-elevated);
  border-color: var(--border-subtle);
}
```

**Score badge (left column):**
```css
.score-chip {
  width: 36px;
  height: 22px;
  border-radius: var(--radius-xs);
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* Map score to data colors */
.score-chip[data-tier="high"] {
  background: rgba(78, 205, 196, 0.14);
  color: var(--data-teal);
}
.score-chip[data-tier="mid"] {
  background: rgba(245, 201, 122, 0.14);
  color: var(--data-amber);
}
.score-chip[data-tier="low"] {
  background: rgba(224, 123, 123, 0.14);
  color: var(--data-red);
}
```

**Question text (middle column):**
```css
.question-text {
  font-size: 13px;
  color: var(--text-secondary);
}
.question-row:hover .question-text { color: var(--text-primary); }
```

**Segmented visibility bar (right column):**

The block-segment bars on the right are a distinctive element of your UI. Keep them — style them in SnowUI's data color system:
```css
.vis-bar {
  display: flex;
  gap: 2px;
  align-items: center;
}
.vis-segment {
  width: 7px;
  height: 14px;
  border-radius: 2px;
  background: var(--surface-elevated);    /* empty segments */
}
.vis-segment.filled[data-tier="high"] { background: var(--data-teal); }
.vis-segment.filled[data-tier="mid"]  { background: var(--data-amber); }
.vis-segment.filled[data-tier="low"]  { background: var(--data-red); }
```

**"TOP COMPETITOR DOMAINS" section:**
```css
/* Uses the --t-label style for the section header */
/* Tags use standard .tag-pill — same as Overview page */
```

---

### 7.4 Recommendations Page

**Executive Summary block:**
```css
.exec-summary {
  background: var(--surface-card);
  border-left: 2px solid var(--accent);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: 16px 20px;
  margin-bottom: var(--space-sm);
}
/* Two variants — Executive Summary and Positioning Insight */
.exec-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: var(--space-xs);
}
.exec-body {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.65;
}
```

**Section dividers ("PRIORITY FIXES", "CONTENT TO ADD"):**
```css
.content-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  color: var(--text-muted);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border-ghost);
  margin: var(--space-xl) 0 var(--space-md);
}
```

**Recommendation cards — 2-column grid:**
```css
.rec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}
.rec-card {
  background: var(--surface-card);
  border: 1px solid var(--border-ghost);
  border-radius: var(--radius-lg);
  padding: var(--card-padding);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s ease;
}
.rec-card:hover {
  border-color: var(--border-subtle);
}
```

**Priority badges — mapped to SnowUI data colors:**
```css
.priority-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-radius: var(--radius-xs);
  padding: 3px 9px;
  margin-bottom: var(--space-sm);
  width: fit-content;
}
.priority-badge.high-priority {
  background: rgba(224, 123, 123, 0.14);
  color: var(--data-red);
}
.priority-badge.quick-win {
  background: rgba(245, 201, 122, 0.14);
  color: var(--data-amber);
}
.priority-badge.faq {
  background: rgba(78, 205, 196, 0.14);
  color: var(--data-teal);
}
.priority-badge.page {
  background: rgba(116, 179, 240, 0.14);
  color: var(--data-blue);
}
```

**Card internal copy hierarchy:**
```css
.rec-title    { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.rec-problem  { font-size: 12px; color: var(--text-muted); margin-bottom: var(--space-md); }

.rec-action-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.rec-action-body { font-size: 12px; color: var(--text-secondary); line-height: 1.55; }

.rec-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: var(--space-md);
}
.rec-effort { font-size: 11px; color: var(--text-muted); }
.rec-learn-more {
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
}
.rec-learn-more:hover { color: var(--accent-dim); }
```

---

### 7.5 Positioning Map Page

**Chart card (full width):**
```css
.chart-card {
  /* standard .card */
  padding-bottom: var(--space-xl);
}
.chart-controls {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}
```

**Axis selector controls:**
```css
.axis-control-label {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  background: var(--surface-elevated);
  border-radius: var(--radius-xs);
  padding: 3px 8px;
}
.axis-select {
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 400;
  padding: 5px 10px;
  outline: none;
  cursor: pointer;
}
.axis-select:focus { border-color: var(--accent-border); }
```

**Dropdown menu (axis selection overlay):**
```css
.select-dropdown {
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-float);
  padding: 4px;
  min-width: 260px;
  position: absolute;
  z-index: 100;
}
.select-option {
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
.select-option:hover    { background: var(--surface-card); color: var(--text-primary); }
.select-option.selected {
  background: var(--accent-wash);
  color: var(--accent);
}
.select-option.selected::before {
  content: '✓';
  font-size: 11px;
  color: var(--accent);
}
```

**Scatter plot styling (SVG/Canvas):**

```
Chart area background:    var(--surface-canvas)      ← slightly darker than the card, creates depth
Grid lines:               rgba(255, 255, 255, 0.04)  ← near invisible
Axis lines:               rgba(255, 255, 255, 0.10)
Axis labels:              var(--text-muted), 11px
```

```css
/* Competitor dots */
.scatter-competitor {
  fill: var(--data-amber);          /* #F5C97A amber — warm, calm */
  r: 5;
  opacity: 0.70;
}
/* Your business marker — visually distinct */
.scatter-yours {
  fill: var(--accent);              /* #8B6FFF purple */
  r: 7;
  filter: drop-shadow(0 0 6px rgba(139, 111, 255, 0.55));
  /* Star shape ★ via SVG path, not circle */
}
```

**Legend (top-right of chart area):**
```css
.chart-legend {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 11px;
  color: var(--text-muted);
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
```

**Axis info cards below the chart:**
```css
.axis-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  margin-top: var(--space-md);
}
.axis-info-card {
  background: var(--surface-card);
  border: 1px solid var(--border-ghost);
  border-radius: var(--radius-md);
  padding: 16px;
}
.axis-info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-sm);
}
.axis-info-title   { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.axis-info-variance{ font-size: 11px; color: var(--text-muted); }
.axis-info-desc    { font-size: 12px; color: var(--text-secondary); line-height: 1.55; }
.axis-poles {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-ghost);
}
.axis-pole {
  font-size: 11px;
  color: var(--accent);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 3px;
}
.axis-pole:hover { color: var(--accent-dim); }
```

---

## Part 8 — Right Panel (New Addition)

Add a right panel to the shell (see Part 3.1). It uses `--surface-sidebar` and renders content directly on the surface — no card wrappers. This directly mirrors SnowUI's right panel behavior.

```css
.right-panel {
  width: 220px;
  background: var(--surface-sidebar);
  padding: var(--space-md);
  overflow-y: auto;
  /* No border — tonal difference from canvas is the separator */
}
```

**Panel section label:**
```css
.panel-section-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: var(--space-sm);
  margin-top: var(--space-lg);
}
.panel-section-label:first-child { margin-top: 0; }
```

**Panel list items (Top Recommendations, Recent Runs):**
```css
.panel-item {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--border-ghost);
  align-items: flex-start;
}
.panel-item:last-child { border-bottom: none; }

.panel-item-icon {
  width: 28px;
  height: 28px;
  background: var(--surface-elevated);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.panel-item-icon svg { width: 14px; height: 14px; color: var(--text-secondary); stroke-width: 1.5; }

.panel-item-title { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.panel-item-sub   { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
```

---

## Part 9 — Iconography Rules

SnowUI is strict about icons. Apply these rules everywhere:

| Rule | SnowUI Spec | Action |
|---|---|---|
| Style | Outline only — no filled icons | Use Lucide React or Phosphor (outline variant) |
| Stroke width | 1.5px | `stroke-width: 1.5` on all SVGs |
| Size — nav | 16×16px | Fixed |
| Size — topbar | 16×16px | Fixed |
| Size — in-card actions | 14×14px | |
| Color — resting | Same opacity as its text context | `currentColor` + inherited opacity |
| Color — active nav | `var(--accent)` | |
| No icon backgrounds | Except notification-type icons | Small `--surface-elevated` squares |
| Never bold/filled | Including hover states | |

---

## Part 10 — The Anti-Patterns to Remove

These are specific things in your current design that directly contradict SnowUI rules. Remove them all.

| Current Pattern | SnowUI Rule Violated | Correct Replacement |
|---|---|---|
| Near-pure black `#0D0D0F` canvas | Surfaces must be layered, never pure black | `--surface-canvas: #1B1D21` |
| Cards invisible against background | Cards must be visibly lighter than canvas (~10 lightness points) | `--surface-card: #2A2D32` on `--surface-canvas: #1B1D21` |
| Green `7`, orange `2`, red `1` colored numbers | Data numbers are always `--text-primary` white | White numbers + 2px color strip at card bottom |
| Heavy solid purple card background (Recommendations) | Bold accent colors on large surfaces — forbidden | `--surface-card` + `1px solid rgba(139,111,255,0.30)` border |
| Colored tag pill borders per domain | Tags are neutral chrome elements, not data | All tags: `--surface-elevated` bg, `--border-subtle` border, `--text-secondary` text |
| Sidebar ~130px wide | 200px minimum for breathing room | Expand to 200px |
| Purple on badges + tags + buttons + card bg simultaneously | Accent budget is <10% surface area | Purple only: active nav, primary CTA, form glow, page frame |
| Missing section group labels in sidebar | SnowUI uses tiny muted all-caps section labels as dividers | Add `NAVIGATION` section label above nav items |
| Competitors dot = same style as "your business" | Important marker must be visually distinct | Amber circles for competitors, purple star with drop-shadow glow for yours |
| No right panel | SnowUI's three-zone shell provides ambient context on the right | Add 220px right panel for Top Recommendations + Recent Runs |

---

## Part 11 — Implementation Sequence

Apply in this order. Each step is independently visible and gives a confidence checkpoint.

```
Step 1 — CSS variables             [~30 min]  Define all tokens. Nothing visible yet.
Step 2 — Surface layers            [~30 min]  Change canvas/sidebar/card backgrounds.
                                              LARGEST visible improvement of any single step.
Step 3 — Sidebar expansion         [~45 min]  Widen to 200px, add section label, fix active state.
Step 4 — Stat bar cards            [~45 min]  Wrap each metric in its own .card.
Step 5 — Typography pass           [~1 hr]    Apply type scale everywhere.
                                              Section labels → --t-label, numbers → --t-stat.
Step 6 — Metric numbers            [~20 min]  Make 7/2/1 white, move color to bottom strip.
Step 7 — Tag pill cleanup          [~20 min]  Neutralize all tags — no colored borders.
Step 8 — Priority badges           [~20 min]  Apply data-color-based badge system.
Step 9 — Right panel               [~1 hr]    Add sidebar, populate with recommendations + runs.
Step 10 — Scatter plot markers     [~30 min]  Amber competitors, purple star for yours.
Step 11 — Landing form             [~30 min]  Wrap in card, add --shadow-glow, fix inputs.
Step 12 — Icons                    [~1 hr]    Replace all icons with Lucide outline, 1.5px stroke.
Step 13 — Page glow frame          [~15 min]  Add --shadow-glow to Current Run wrapper.
```

---

*This document is a direct transplant of the SnowUI design system onto LLM Visibility. Every token, spacing value, layer depth, and interaction pattern is sourced from the SnowUI visual analysis. No new design decisions have been introduced — only SnowUI decisions applied to new contexts.*
