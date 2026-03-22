# LLM Visibility — UI Renovation Guide
> Based on: SnowUI Dashboard Visual Analysis
> Applies to: All 5 screens — Landing, Overview, AI Visibility Tests, Recommendations, Positioning Map

---

## The Core Problem (Honest Diagnosis)

Your current website is already dark-themed and uses purple accents — you're not starting from zero. But there are **5 structural issues** making it feel unpolished compared to SnowUI:

| Issue | Current State | Target State |
|---|---|---|
| **Surface depth** | Near-pure black everywhere (`#0D0D0D`-ish) — flat, suffocating | 4 distinct dark surface layers, none pure black |
| **Card differentiation** | Cards barely visible against the background — same tone | Cards sit ~10–12 lightness points above the canvas |
| **Sidebar is too narrow** | ~130px — icons and text feel cramped, no breathing room | ~200–220px with proper padding and section grouping |
| **Top stat bar is borderless** | 4 stat panels bleed into each other with no spatial separation | Each stat is its own isolated card with internal padding |
| **Purple is overused** | Purple appears on badges, tags, buttons, borders, glow borders — everywhere | Purple is reserved for 1–2 primary actions and active state only |

---

## 1. New Color System

Replace all current color values with these tokens. Apply them globally via CSS variables.

```css
:root {
  /* ─── Surfaces ─── */
  --bg-canvas:       #17191D;   /* page background — replaces your ~#0D0D0F */
  --bg-sidebar:      #1E2126;   /* left nav surface */
  --bg-card:         #252830;   /* all card containers */
  --bg-card-hover:   #2C2F38;   /* card on hover or elevated state */
  --bg-elevated:     #32353E;   /* dropdowns, tooltips, active nav item */

  /* ─── Borders ─── */
  --border-ghost:    rgba(255, 255, 255, 0.05);  /* barely-there card edges */
  --border-subtle:   rgba(255, 255, 255, 0.09);  /* slightly more visible */
  --border-medium:   rgba(255, 255, 255, 0.14);  /* inputs, dividers */

  /* ─── Text ─── */
  --text-primary:    rgba(255, 255, 255, 0.92);  /* headings, stat numbers */
  --text-secondary:  rgba(255, 255, 255, 0.60);  /* body, nav items */
  --text-muted:      rgba(255, 255, 255, 0.38);  /* labels, timestamps */
  --text-ghost:      rgba(255, 255, 255, 0.20);  /* placeholders, disabled */

  /* ─── Accent (use sparingly — max 10% of visible area) ─── */
  --accent:          #7C5CFC;   /* primary purple — CTA buttons, active nav */
  --accent-bright:   #9B80FF;   /* active nav text/icon color */
  --accent-bg:       rgba(124, 92, 252, 0.12);  /* active nav background wash */
  --accent-border:   rgba(124, 92, 252, 0.35);  /* subtle accent borders */
  --accent-glow:     rgba(124, 92, 252, 0.15);  /* page-level glow effect */

  /* ─── Semantic / Score colors ─── */
  --score-high:      #4ECDC4;   /* high visibility — replaces your green */
  --score-mid:       #F5A623;   /* medium / warning — replaces your orange */
  --score-low:       #E05252;   /* low / critical — replaces your red */
  --score-neutral:   #74B3F0;   /* neutral blue */

  /* ─── Priority badge colors ─── */
  --priority-high-bg:   rgba(224, 82, 82, 0.15);
  --priority-high-text: #E05252;
  --priority-quick-bg:  rgba(245, 166, 35, 0.15);
  --priority-quick-text:#F5A623;
  --priority-faq-bg:    rgba(78, 205, 196, 0.15);
  --priority-faq-text:  #4ECDC4;

  /* ─── Radius ─── */
  --radius-xs:  4px;
  --radius-sm:  8px;
  --radius-md:  12px;
  --radius-lg:  16px;
  --radius-pill:20px;

  /* ─── Shadows ─── */
  --shadow-card:  0 1px 3px rgba(0, 0, 0, 0.35);
  --shadow-float: 0 4px 16px rgba(0, 0, 0, 0.5);
  --shadow-glow:  0 0 0 1px rgba(124, 92, 252, 0.4),
                  0 0 28px rgba(124, 92, 252, 0.10);
}
```

> **Critical rule:** Your current design uses pure/near-black (`#0D0D0D`) as the canvas. This creates a void that cards disappear into. The new `--bg-canvas` of `#17191D` is just 8 points lighter but makes every card surface immediately visible and legible.

---

## 2. Typography Overhaul

### Current Problems
- Stat numbers and labels feel the same weight — poor hierarchy
- Section labels ("PRODUCTS & SERVICES", "COMPETITORS ANALYSED") are all-caps but styled the same as body text
- No consistent size scale

### New Type Scale

```css
/* Import — use a clean geometric sans, avoid Inter's overuse */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
/* Or: Plus Jakarta Sans, Outfit — all work well for dashboard data */

body { font-family: 'DM Sans', sans-serif; }

/* Scale */
--text-display:  32px / weight 600   → stat numbers (6.8, 90%, 7, 9)
--text-title:    15px / weight 600   → card titles, section headers
--text-body:     13px / weight 400   → body content, nav items
--text-label:    11px / weight 500   → section group labels (all-caps, letter-spacing: 0.08em)
--text-micro:    11px / weight 400   → timestamps, muted metadata
--text-badge:    11px / weight 600   → pill badges (HIGH PRIORITY etc.)
```

### Text Color Application

| Element | Color Token |
|---|---|
| Large stat numbers (6.8, 90%) | `--text-primary` |
| Card/section titles | `--text-primary` |
| Active nav item | `--accent-bright` |
| Inactive nav items | `--text-secondary` |
| Body text in cards | `--text-secondary` |
| Section group labels ("PAGES", "DASHBOARDS") | `--text-muted` + `letter-spacing: 0.08em` + all-caps |
| Timestamps, metadata | `--text-muted` |
| Placeholder text in inputs | `--text-ghost` |
| Chart axis labels | `--text-muted` |

---

## 3. Layout Restructure

### 3.1 Master Layout

Your current layout has a narrow left nav and no right panel. The SnowUI approach structures it as:

```
┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR (full width, ~48px)                                     │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                    │
│  LEFT NAV  │          MAIN CONTENT AREA                        │
│  220px     │          fluid, padding: 20px 24px               │
│  fixed     │                                                    │
│            │                                                    │
└────────────┴────────────────────────────────────────────────────┘
```

> Note: Your site does not have a right panel in the current design. Do **not** force one in. The SnowUI right panel is used for global notifications/contacts — your site's context doesn't need it. Keep it two-column.

### 3.2 Sidebar Expansion

Expand sidebar from `~130px` → `220px`. This gives room for:
- Proper icon + label spacing
- Section group labels
- Active state background pills that don't feel clipped

```
[●] LLM Visibility          ← logo + brand name, 14px semibold

Current Run   History        ← small tab switcher, 11px, muted

─────────────────────────
NAVIGATION                   ← 10px, all-caps, --text-muted, letter-spacing

  [icon] Overview
  [icon] AI Visibility Tests  [10] ← badge
  [icon] Positioning Map
  [icon] Recommendations
  [icon] Settings

─────────────────────────

● Keys active                ← bottom status indicator
```

Active nav item treatment:
```css
.nav-item.active {
  background: var(--accent-bg);           /* faint purple wash */
  color: var(--accent-bright);            /* brighter purple text */
  border-radius: var(--radius-md);
  padding: 8px 12px;
}
.nav-item:hover {
  background: rgba(255,255,255,0.05);
  border-radius: var(--radius-md);
}
```

### 3.3 Topbar Redesign

Currently: "LLM Visibility" logo sits in the sidebar top. Topbar only spans the main content area.

**Recommended:** Keep the current topbar structure but refine it:

```
[Topbar — spans main content + any right area]
  Left:   Breadcrumb (e.g., "Dashboards / Default") — muted text
  Center: "Anthropic ▾" org selector — pill dropdown, border: var(--border-medium)
  Right:  [⚙ settings icon]  [+ New Analysis button]
```

New Analysis button:
```css
.btn-primary {
  background: var(--accent);
  color: white;
  border-radius: var(--radius-pill);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 0 12px rgba(124, 92, 252, 0.3);
  border: none;
}
.btn-primary:hover {
  background: #8B6FFF;
  box-shadow: 0 0 18px rgba(124, 92, 252, 0.45);
}
```

---

## 4. Stat Bar (Top 4-Panel Row) — Screen-by-Screen Fix

### Current Problem
The 4 stat panels (Overall Score, Test Coverage, High Visibility, Competitors) currently sit in a borderless area that bleeds into the dark background. They feel like a band of text, not interactive cards.

### Fix: Isolate Each Stat as Its Own Card

Each stat becomes a distinct `--bg-card` surface:

```
┌─────────────────┐ ┌─────────────────────┐ ┌──────────────┐ ┌──────────────┐
│  OVERALL SCORE  │ │  TEST COVERAGE      │ │ HIGH VISIB.  │ │ COMPETITORS  │
│                 │ │                     │ │              │ │              │
│     [donut]     │ │  90%                │ │  7           │ │  9           │
│      6.8        │ │  [progress bar]     │ │  ▲ 7 ques.  │ │  9 analysed  │
│   out of 10     │ │                     │ │              │ │              │
└─────────────────┘ └─────────────────────┘ └──────────────┘ └──────────────┘
```

Card CSS:
```css
.stat-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-ghost);
  padding: 20px;
  box-shadow: var(--shadow-card);
}
```

Label treatment inside stat cards:
```css
.stat-label {    /* "OVERALL SCORE" */
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.stat-number {   /* "6.8", "90%", "7", "9" */
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
}
.stat-sub {      /* "out of 10", "9 analysed" */
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}
```

### Progress Bar (Test Coverage card)
```css
.progress-track {
  background: var(--border-subtle);
  border-radius: var(--radius-pill);
  height: 4px;
  margin-top: 12px;
}
.progress-fill {
  background: var(--accent);
  border-radius: var(--radius-pill);
  height: 4px;
  /* width: 90% for 90% */
}
```

### Donut Chart (Overall Score card)
- Keep the circular gauge, but change the arc color to `var(--accent)` (`#7C5CFC`)
- Track color: `var(--border-subtle)`
- Center number: `--text-primary`, 28px, weight 600
- "out of 10": `--text-muted`, 11px

### Badge ("▲ 7 questions")
```css
.badge-positive {
  background: rgba(78, 205, 196, 0.15);
  color: var(--score-high);            /* #4ECDC4 teal */
  border-radius: var(--radius-xs);
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
}
```

---

## 5. Page-by-Page Renovation

---

### 5.1 Landing Page (Input Form)

**Current:** Centered form on pure black background. Purple "Analyze →" button. Plain dark input fields. Feels barebones.

#### Background
Replace the flat `#0D0D0D` with `var(--bg-canvas)` (`#17191D`). Add an extremely subtle radial gradient behind the form to create visual focus:
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(
    ellipse 60% 50% at 50% 40%,
    rgba(124, 92, 252, 0.07) 0%,
    transparent 70%
  );
  pointer-events: none;
}
```

#### Form Container
Wrap the entire form in a card:
```css
.form-container {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: var(--shadow-glow);   /* the purple outer glow — used here as a focal point */
  max-width: 400px;
  width: 100%;
}
```

#### Icon
The eye icon at the top — give it a dedicated circle background:
```css
.brand-icon {
  width: 48px;
  height: 48px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}
.brand-icon svg { color: var(--accent-bright); }
```

#### Input Fields
```css
.input-field {
  background: var(--bg-elevated);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
  padding: 10px 14px;
  width: 100%;
}
.input-field::placeholder { color: var(--text-ghost); }
.input-field:focus {
  border-color: var(--accent-border);
  outline: none;
  box-shadow: 0 0 0 3px rgba(124, 92, 252, 0.12);
}
```

#### Input Labels
```css
.input-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  margin-bottom: 6px;
}
```

#### Analyze Button — keep it as is, just refine:
```css
.btn-analyze {
  width: 100%;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-sm);
  padding: 12px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  box-shadow: 0 4px 16px rgba(124, 92, 252, 0.35);
  transition: all 0.2s ease;
}
.btn-analyze:hover {
  background: #8B70FF;
  box-shadow: 0 4px 24px rgba(124, 92, 252, 0.5);
  transform: translateY(-1px);
}
```

---

### 5.2 Overview Page

**Current:** Black background, 4 floating stat values at top, then a large card with company info, 3 numbered metrics, tag pills, and a "Top Recommendations" side card.

#### Background Surface
- Page canvas: `var(--bg-canvas)` 
- The area above the stat cards is currently the same tone as everywhere else — lift the stat cards by using `var(--bg-card)` only for them

#### The 3 Numbered Metrics Row (7, 2, 1)

Currently these three large numbers (green, orange, red) sit in dark containers with a colored bottom border. This is the right idea but needs refinement:

```css
.metric-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-ghost);
  padding: 20px;
  position: relative;
  overflow: hidden;
}
/* Colored bottom accent line — keep this pattern, it's good */
.metric-card::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;   /* thinner — currently too thick */
}
.metric-card.high::after   { background: var(--score-high); }
.metric-card.mid::after    { background: var(--score-mid); }
.metric-card.low::after    { background: var(--score-low); }

.metric-number {
  font-size: 40px;
  font-weight: 600;
  color: var(--text-primary);   /* ← CHANGE: make the number white, not colored */
  /* The colored meaning comes from the bottom border, not the number itself */
}
```

> Currently the numbers themselves are green/orange/red. SnowUI pattern says: use color for the indicator, not the data. Making the numbers white with a small colored bar below is cleaner and more readable.

#### Company Info Section
The section with "Anthropic / Artificial Intelligence" currently has a left border accent. This is good — refine it:
```css
.company-header-block {
  border-left: 2px solid var(--accent);
  padding-left: 16px;
  margin-bottom: 20px;
}
.company-name { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.company-sub  { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
```

#### Tag Pills (Products & Competitors)
```css
.tag-pill {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 12px;
  display: inline-block;
}
/* Remove colored border variants on tags — they add noise */
```

#### Section Labels Above Tags
```css
.section-label {  /* "PRODUCTS & SERVICES", "COMPETITORS ANALYSED" */
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 8px;
}
```

#### Top Recommendations Card (right side)
This card currently has a strong purple background — it's too heavy. Replace with the standard card + a subtle accent border:
```css
.recommendations-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 20px;
}
/* Or use the glow border for this card specifically as a focus element */
.recommendations-card.featured {
  border: 1px solid var(--accent-border);
  box-shadow: var(--shadow-glow);
}
```

Recommendation items inside:
- Diamond bullet `◆` → replace with a small `4px` circle in `--accent-bright`
- Title: 13px, weight 600, `--text-primary`
- Body: 12px, `--text-muted`
- 12px gap between items

"View All Recommendations" button:
```css
.btn-outline-accent {
  width: 100%;
  background: transparent;
  border: 1px solid var(--accent-border);
  color: var(--accent-bright);
  border-radius: var(--radius-sm);
  padding: 10px;
  font-size: 13px;
  text-align: center;
}
.btn-outline-accent:hover {
  background: var(--accent-bg);
}
```

---

### 5.3 AI Visibility Tests Page

**Current:** A list of questions with score badges on the left and a segmented bar on the right. Filter tabs at the top. Looks functional but visually flat.

#### Filter Tabs ("All 10 / High 7 / Medium 1 / Low 1")
```css
.filter-tab-group {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
}
.filter-tab {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  padding: 5px 14px;
}
.filter-tab.active {
  background: var(--accent-bg);
  border-color: var(--accent-border);
  color: var(--accent-bright);
}
```

#### Question Row Items
Each row is currently a bare list item. Wrap each in a subtle card:
```css
.question-row {
  background: var(--bg-card);
  border: 1px solid var(--border-ghost);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;   /* tight stacking — not 8px, keep it dense */
  transition: background 0.15s ease;
}
.question-row:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-subtle);
}
```

#### Score Badge (8.0, 5.0, 1.0 etc.)
Currently styled as small colored squares. Refine:
```css
.score-badge {
  width: 36px;
  height: 24px;
  border-radius: var(--radius-xs);
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
/* Color based on score value */
.score-badge.high   { background: rgba(78,205,196,0.15); color: var(--score-high); }
.score-badge.mid    { background: rgba(245,166,35,0.15); color: var(--score-mid); }
.score-badge.low    { background: rgba(224,82,82,0.15);  color: var(--score-low); }
```

#### Segmented Progress Bar (right side of each row)
The colored block bars on the right are a unique touch. Keep this pattern:
```css
.visibility-bar {
  display: flex;
  gap: 2px;
  align-items: center;
}
.visibility-segment {
  width: 6px;
  height: 12px;
  border-radius: 2px;
  background: var(--bg-elevated);  /* empty segments */
}
.visibility-segment.filled.high { background: var(--score-high); }
.visibility-segment.filled.mid  { background: var(--score-mid); }
.visibility-segment.filled.low  { background: var(--score-low); }
```

#### Competitor Domain Tags Section
```css
.competitor-tag {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 4px 10px;
}
```

---

### 5.4 Recommendations Page

**Current:** Executive summary text, Positioning Insight text, then a grid of recommendation cards with priority badges. Good structure, needs surface and typography refinement.

#### Executive Summary Block
Currently a plain text section. Elevate it:
```css
.executive-summary {
  background: var(--bg-card);
  border-left: 2px solid var(--accent);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: 16px 20px;
  margin-bottom: 24px;
}
.exec-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.exec-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}
```

#### Recommendation Cards
Each recommendation card (Enhance AI Safety Resource Content, etc.) is already in its own box. Refine:
```css
.rec-card {
  background: var(--bg-card);
  border: 1px solid var(--border-ghost);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-card);
  transition: border-color 0.2s;
}
.rec-card:hover {
  border-color: var(--border-subtle);
}
```

#### Priority Badges (HIGH PRIORITY, QUICK WIN, FAQ, PAGE)
```css
.priority-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-radius: var(--radius-xs);
  padding: 3px 8px;
  margin-bottom: 10px;
}
.priority-badge.high  {
  background: var(--priority-high-bg);
  color: var(--priority-high-text);
}
.priority-badge.quick {
  background: var(--priority-quick-bg);
  color: var(--priority-quick-text);
}
.priority-badge.faq {
  background: var(--priority-faq-bg);
  color: var(--priority-faq-text);
}
```

#### Card Internal Typography
```css
.rec-title    { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.rec-subtitle { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; }
.rec-action-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.rec-action-text { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
.rec-effort {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 12px;
}
.rec-learn-more {
  font-size: 12px;
  color: var(--accent-bright);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  float: right;
}
```

#### Section Headers ("PRIORITY FIXES", "CONTENT TO ADD")
```css
.section-header {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin: 24px 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-ghost);
}
```

---

### 5.5 Positioning Map Page

**Current:** A scatter plot on a very dark background with orange dot markers and axis labels. Controls for X/Y axis selectors. Info cards below. Looks functional but the chart area is near-invisible.

#### Chart Container Card
```css
.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border-ghost);
  border-radius: var(--radius-lg);
  padding: 20px;
}
```

#### Scatter Plot Styling
- Plot background: `var(--bg-canvas)` — slightly darker than the card, creates a "screen" effect
- Grid lines: `rgba(255,255,255,0.05)` — barely visible
- Axis lines: `rgba(255,255,255,0.12)`
- Axis labels: 11px, `--text-muted`

Dot styling:
```css
/* Competitor dots */
.scatter-dot.competitor {
  fill: var(--score-mid);          /* #F5A623 amber */
  r: 5;
  opacity: 0.75;
}
/* Your business star */
.scatter-dot.your-business {
  fill: var(--accent-bright);      /* #9B80FF purple */
  filter: drop-shadow(0 0 6px rgba(155, 128, 255, 0.6));
}
```

> Currently both competitors and your business use the same orange dot. The "your business" marker should be visually distinct — use the accent purple with a glow.

#### Axis Selector Dropdowns
```css
.axis-selector {
  background: var(--bg-elevated);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 12px;
  padding: 6px 12px;
}
.axis-label-pill {  /* "X AXIS", "Y AXIS" labels */
  background: var(--bg-elevated);
  border-radius: var(--radius-xs);
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 3px 8px;
}
```

#### Dropdown Menu
```css
.dropdown-menu {
  background: var(--bg-elevated);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-float);
  padding: 4px;
  min-width: 240px;
}
.dropdown-item {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
}
.dropdown-item:hover   { background: var(--bg-card-hover); }
.dropdown-item.active  {
  background: var(--accent-bg);
  color: var(--accent-bright);
}
```

#### Axis Info Cards (bottom of Positioning Map)
The two description cards below the chart:
```css
.axis-info-card {
  background: var(--bg-card);
  border: 1px solid var(--border-ghost);
  border-radius: var(--radius-md);
  padding: 16px;
}
.axis-info-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.axis-info-var   { font-size: 11px; color: var(--text-muted); float: right; }
.axis-info-desc  { font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-top: 8px; }
.axis-poles {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}
.axis-pole {
  font-size: 11px;
  color: var(--accent-bright);
  text-decoration: none;
}
```

---

## 6. Component Library Quick Reference

### Buttons
```css
/* Primary CTA */
.btn-primary   { background: var(--accent); color: white; border-radius: var(--radius-pill); }

/* Secondary / outline */
.btn-secondary { background: transparent; border: 1px solid var(--border-medium);
                 color: var(--text-secondary); border-radius: var(--radius-pill); }
.btn-secondary:hover { border-color: var(--accent-border); color: var(--accent-bright); }

/* Ghost text button */
.btn-ghost     { background: transparent; border: none; color: var(--accent-bright); }
```

### Dividers
```css
hr, .divider {
  border: none;
  border-top: 1px solid var(--border-ghost);
  margin: 16px 0;
}
```

### Tooltips
```css
.tooltip {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-float);
  color: var(--text-primary);
  font-size: 12px;
  padding: 8px 12px;
}
```

### Empty States
```css
.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--text-muted);
}
.empty-state-icon { opacity: 0.3; margin-bottom: 12px; }
.empty-state-text { font-size: 13px; }
```

---

## 7. Specific "Stop Doing This" List

These patterns from your current design should be removed:

| Current Pattern | Why It's a Problem | Replace With |
|---|---|---|
| Pure/near-black `#0D0D0F` canvas | Cards invisible — no depth, claustrophobic | `--bg-canvas: #17191D` |
| Strong solid purple background on recommendations card | Too heavy — feels like a banner ad | `--bg-card` + `box-shadow: var(--shadow-glow)` |
| Colored number text (green 7, orange 2, red 1) | Numbers should be white — color carries meaning, not the data itself | White numbers + 2px colored bottom border on card |
| All-caps section labels in the same size/weight as body text | Labels look like headings, body loses hierarchy | 10–11px, letter-spacing, `--text-muted` for labels only |
| Purple on filter tabs, tags, badges, buttons, active items, AND borders all at once | Color dilution — nothing reads as special | Purple only on: active nav, primary CTA button, featured card border |
| Sidebar too narrow to breathe | Icon+label cramped, active state clips | Expand to 220px |
| No card separation from background | Entire page is one flat tone | `--bg-card` cards on `--bg-canvas` background |
| Competitor domain tags with colored borders per domain | Noisy, arbitrary color use | All tags same neutral style: `--bg-elevated` + `--border-subtle` |

---

## 8. Implementation Priority Order

Apply these changes in this order for maximum visible improvement per unit of effort:

1. **CSS Variables first** — implement all tokens from Section 1. This alone fixes 60% of the depth issue.
2. **Canvas + sidebar background** — change from near-black to `--bg-canvas` / `--bg-sidebar`
3. **Stat cards** — wrap each in `--bg-card` containers with `--radius-lg`
4. **Sidebar width + nav active state** — expand to 220px, add the faint purple wash for active item
5. **Card surfaces throughout** — every content block gets `--bg-card` + `--border-ghost`
6. **Typography pass** — apply the text hierarchy (labels → muted, numbers → primary)
7. **Badge + tag cleanup** — neutralize all tags, fix priority badge colors
8. **Landing page** — add the `--shadow-glow` to the form container, fix inputs
9. **Scatter plot** — differentiate "your business" dot from competitors

---

*This renovation preserves 100% of the existing information architecture and functionality. It is purely a visual layer replacement — no content, routes, or data flows need to change.*
