# Blue Ocean — Visual Overhaul Plan

> **Scope:** Aesthetic redesign only. All existing features, routes, and data flows are preserved.
> **Target palette:** Blue-theme (Realtime Colors export)
> **Design system:** UI Visual Design Guidelines — Depth, OKLCH, Proximity

---

## 1. New Color Token System

Replace every hardcoded color reference with CSS custom properties using the **OKLCH color space** for perceptual consistency across all UI layers.

```css
:root {
  /* ── Base palette (from blue-theme-codes.txt) ── */
  --color-text:       #e4f0f6;   /* oklch(0.93 0.02 210) */
  --color-bg:         #13181d;   /* oklch(0.10 0.02 210) */
  --color-primary:    #5282af;   /* oklch(0.52 0.07 230) */
  --color-secondary:  #adccef;   /* oklch(0.81 0.05 225) */
  --color-accent:     #2c7890;   /* oklch(0.47 0.07 210) */

  /* ── Depth layer backgrounds (OKLCH lightness ladder) ── */
  --bg-bottom:  oklch(0.10 0.02 210);   /* Level 0 — page canvas */
  --bg-mid:     oklch(0.14 0.02 210);   /* Level 1 — cards, sidebars */
  --bg-top:     oklch(0.18 0.02 210);   /* Level 2 — hovered cards, inputs */
  --bg-overlay: oklch(0.22 0.02 210);   /* Level 3 — modals, dropdowns */

  /* ── Depth shadows ── */
  --shadow-1:
    inset 0 1px 2px oklch(1 0 0 / 0.10),   /* top highlight */
    0 1px 3px oklch(0 0 0 / 0.30),
    0 2px 6px oklch(0 0 0 / 0.15);

  --shadow-2:
    inset 0 1px 2px oklch(1 0 0 / 0.12),
    0 4px 12px oklch(0 0 0 / 0.35),
    0 2px 4px  oklch(0 0 0 / 0.20);

  --shadow-3:
    inset 0 1px 3px oklch(1 0 0 / 0.14),
    0 8px 24px oklch(0 0 0 / 0.40),
    0 4px 8px  oklch(0 0 0 / 0.25);

  /* ── Text scale ── */
  --text-primary:   var(--color-text);               /* #e4f0f6 */
  --text-secondary: oklch(0.70 0.02 210);            /* muted */
  --text-accent:    var(--color-secondary);          /* #adccef */

  /* ── Accent glow (for active states, CTAs) ── */
  --glow-primary:  0 0 16px oklch(0.52 0.07 230 / 0.45);
  --glow-accent:   0 0 12px oklch(0.47 0.07 210 / 0.40);
}
```

---

## 2. Global Foundation Changes

### 2.1 Page Background
| Before | After |
|--------|-------|
| Deep teal-black with radial ocean gradient | `var(--bg-bottom)` — `#13181d` flat dark navy; subtle radial `var(--color-accent)` glow at 5% opacity centered off-screen top-left |

```css
body {
  background-color: var(--bg-bottom);
  background-image: radial-gradient(
    ellipse 120% 60% at 10% -10%,
    oklch(0.47 0.07 210 / 0.06) 0%,
    transparent 70%
  );
  color: var(--text-primary);
  font-size: 18px; /* medium/laptop base */
}
```

### 2.2 Typography
- **Font:** Keep existing font stack; ensure headings use `var(--color-secondary)` (`#adccef`) for the gradient shimmer effect.
- **Heading gradient:**
  ```css
  .hero-title {
    background: linear-gradient(135deg, var(--color-secondary), var(--color-primary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  ```
- **Muted text:** `color: var(--text-secondary)` → oklch(0.70) — used for labels, sub-descriptions, timestamps.

---

## 3. Landing Page (`/`)

### 3.1 Hero Section
- **Wave emoji icon** — keep as-is; add a soft `--glow-accent` drop-shadow underneath.
- **"Blue Ocean" title** — apply the heading gradient (secondary → primary).
- **Subtitle & tagline** — `var(--text-secondary)` for low-contrast muted feel.

### 3.2 Input Card (Main Form)
The central form card is the most important Level-2 surface on the page.

```css
.form-card {
  background: var(--bg-mid);
  border: 1px solid oklch(0.52 0.07 230 / 0.18);  /* subtle primary tint border */
  border-radius: 16px;
  box-shadow: var(--shadow-2);
  padding: 32px;
}
.form-card:focus-within {
  box-shadow: var(--shadow-3), var(--glow-primary);
  border-color: oklch(0.52 0.07 230 / 0.35);
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}
```

**YOUR WEBSITE label + input:**
```css
.input-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.input-field {
  background: var(--bg-top);
  border: 1px solid oklch(0.52 0.07 230 / 0.20);
  border-radius: 8px;
  color: var(--text-primary);
  box-shadow: var(--shadow-1);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input-field:focus {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-1), var(--glow-primary);
  outline: none;
}
```

**API key inputs (OPENAI / SERPER):**
- Same `input-field` style.
- Visibility toggle icon: `var(--text-secondary)` at rest → `var(--color-primary)` on hover.

**ADVANCED SETTINGS accordion:**
- Label: `var(--text-secondary)`, arrow `var(--color-accent)`.
- Border-top: `1px solid oklch(0.52 0.07 230 / 0.12)`.

### 3.3 CTA Button — "Dive into the Ocean →"
```css
.cta-button {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: var(--color-text);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  box-shadow: var(--shadow-2), var(--glow-primary);
  transition: box-shadow 0.2s, transform 0.15s;
}
.cta-button:hover {
  box-shadow: var(--shadow-3), var(--glow-primary);
  transform: translateY(-1px);
}
.cta-button:active {
  transform: translateY(0);
  box-shadow: var(--shadow-1);
}
.cta-button:disabled {
  opacity: 0.45;
  pointer-events: none;
}
```

### 3.4 Recent Dives List
```css
.dive-row {
  background: var(--bg-mid);
  border: 1px solid oklch(0.52 0.07 230 / 0.12);
  border-radius: 10px;
  box-shadow: var(--shadow-1);
  padding: 12px 16px;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.dive-row:hover {
  box-shadow: var(--shadow-2);
  border-color: oklch(0.52 0.07 230 / 0.28);
}
/* Score color-coding — keep existing red/orange/green logic but replace with: */
.score-high   { color: var(--color-secondary); }   /* #adccef — calm blue */
.score-mid    { color: var(--color-primary);   }   /* #5282af — steel blue */
.score-low    { color: var(--color-accent);    }   /* #2c7890 — teal */
```

### 3.5 Footer Note
`color: var(--text-secondary)` — "API keys stored locally · never sent to our servers".

---

## 4. Dashboard / Map View

### 4.1 Top Navigation Bar
```css
.top-nav {
  background: var(--bg-mid);
  border-bottom: 1px solid oklch(0.52 0.07 230 / 0.12);
  box-shadow: 0 2px 8px oklch(0 0 0 / 0.25);
}
```

- **Logo + company name:** White text, subtext `var(--text-secondary)`.
- **Stats (VISIBILITY / COVERAGE / BLUE OCEANS):**
  - Label: `var(--text-secondary)`, 10px uppercase.
  - Value: `var(--color-secondary)` for the large number, `var(--text-secondary)` for unit suffix.
- **Nav tabs (Map / Eval / Recs):**
  ```css
  .nav-tab { color: var(--text-secondary); }
  .nav-tab.active {
    background: var(--bg-top);
    color: var(--color-secondary);
    border: 1px solid oklch(0.52 0.07 230 / 0.25);
    border-radius: 6px;
    box-shadow: var(--shadow-1);
  }
  ```

### 4.2 Left Sidebar
```css
.sidebar {
  background: var(--bg-mid);
  border-right: 1px solid oklch(0.52 0.07 230 / 0.10);
  box-shadow: var(--shadow-1);
}
```

**Archetype card (YOUR ARCHETYPE):**
```css
.archetype-card {
  background: var(--bg-top);
  border: 1px solid oklch(0.52 0.07 230 / 0.18);
  border-radius: 10px;
  box-shadow: var(--shadow-2);
}
.archetype-title { color: var(--color-secondary); font-weight: 700; }
.archetype-sub   { color: var(--color-accent);    font-style: italic; }
```

**Strategy block:**
```css
.strategy-block {
  background: oklch(0.14 0.03 210 / 0.7);
  border-left: 3px solid var(--color-primary);
  border-radius: 6px;
  padding: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}
.strategy-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--color-primary);
  text-transform: uppercase;
}
```

**OCEAN TERRITORY competitor list:**
```css
.competitor-row {
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s;
}
.competitor-row:hover    { background: var(--bg-top); }
.competitor-row.selected {
  background: var(--bg-top);
  border: 1px solid oklch(0.52 0.07 230 / 0.25);
  box-shadow: var(--shadow-1);
}
.competitor-row .top-label {
  font-size: 10px;
  color: var(--color-accent);
  font-weight: 600;
}
```

**SCORE BREAKDOWN section:**
- Section label: `var(--text-secondary)` uppercase.
- Progress bar track: `var(--bg-top)`; fill: `linear-gradient(90deg, var(--color-primary), var(--color-accent))`.

### 4.3 Map / Canvas Area
The ocean map visualization is the centerpiece — preserve the teal-purple biome aesthetic but anchor it to the new palette:

| Element | Before | After |
|---------|--------|-------|
| Canvas background | Dark teal ocean | Radial gradient: `var(--bg-bottom)` center → `oklch(0.12 0.03 195)` at edges |
| Unclaimed zones (circles) | Purple-tinted rings | `var(--color-primary)` ring at 30% opacity, dashed border |
| Your position node | Aqua glow dot | `var(--color-accent)` dot + `var(--glow-accent)` |
| Competitor nodes | Colored dots | Retain per-competitor color; apply 2px border `var(--bg-top)` |
| Axis labels | Muted teal text | `var(--text-secondary)` |
| Region labels ("UNCLAIMED 1") | White faint | `oklch(0.70 0.02 210)` |

### 4.4 Right Panel (Rec Lab / Content Lab)
```css
.right-panel {
  background: var(--bg-mid);
  border-left: 1px solid oklch(0.52 0.07 230 / 0.10);
  box-shadow: -2px 0 8px oklch(0 0 0 / 0.20);
}

/* Tab bar */
.panel-tab.active {
  border-bottom: 2px solid var(--color-primary);
  color: var(--color-secondary);
}
.panel-tab {
  color: var(--text-secondary);
}

/* Recommendation Lab row */
.rec-lab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid oklch(0.52 0.07 230 / 0.10);
}

/* ON/OFF toggle */
.toggle-off {
  background: var(--bg-top);
  border: 1px solid oklch(0.52 0.07 230 / 0.20);
  color: var(--text-secondary);
  border-radius: 4px;
}
.toggle-on {
  background: var(--color-primary);
  color: var(--color-text);
  box-shadow: var(--glow-primary);
}
```

---

## 5. Component Design Tokens Summary

| Component | Background | Border | Shadow | Text |
|-----------|-----------|--------|--------|------|
| Page canvas | `--bg-bottom` | — | — | `--text-primary` |
| Sidebar / nav | `--bg-mid` | primary/10% | `--shadow-1` | `--text-primary` |
| Cards (rest) | `--bg-mid` | primary/12% | `--shadow-1` | `--text-primary` |
| Cards (hover) | `--bg-top` | primary/28% | `--shadow-2` | `--text-primary` |
| Inputs (rest) | `--bg-top` | primary/20% | `--shadow-1` | `--text-primary` |
| Inputs (focus) | `--bg-top` | `--color-primary` | `--shadow-1` + glow | `--text-primary` |
| CTA button | gradient primary→accent | none | `--shadow-2` + glow | `--color-text` |
| Active tab | `--bg-top` | primary/25% | `--shadow-1` | `--color-secondary` |
| Muted labels | transparent | — | — | `--text-secondary` |
| Accent callouts | accent/10% | left: `--color-primary` | — | `--text-secondary` |

---

## 6. Interaction & Motion

### Elevation Transitions
All cards and interactive elements animate between depth levels on state change:
```css
/* Applied globally */
* {
  transition-property: box-shadow, border-color, background-color, transform;
  transition-duration: 0.2s;
  transition-timing-function: ease;
}
```

| Interaction | Before state | After state |
|------------|-------------|-------------|
| Card hover | Level 1 (`--shadow-1`) | Level 2 (`--shadow-2`) |
| Button hover | Level 2 | Level 3 + glow |
| Input focus | Level 1 | Level 1 + primary glow |
| Modal open | — | Level 3 (`--shadow-3`) |

### Competitor Row Hover
Smooth `background` transition from transparent → `--bg-top` (0.15s ease).

### CTA Button Micro-interaction
`translateY(-1px)` on hover, back to `0` on active — gives a subtle "lift" feel without being distracting.

---

## 7. Spacing & Proximity Audit

Apply the proximity rule to tighten relationships within each functional block:

| Context | Spacing to use |
|---------|---------------|
| Label → input value | `4px` |
| Section title → first item | `8px` |
| Competitor rows (list internal) | `4px` gap |
| Sidebar section → section | `24px` gap |
| Form field → form field | `16px` gap |
| Card internal padding | `16px – 20px` |
| Page section → section | `32px` |

---

## 8. Scroll & Status Bar (Bottom of Map)

```css
.status-bar {
  background: var(--bg-mid);
  border-top: 1px solid oklch(0.52 0.07 230 / 0.10);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 6px 16px;
}
```

Bottom icons (circles at footer of landing page): apply `var(--color-primary)` at 25% opacity as ghost icon color.

---

## 9. Implementation Checklist

- [ ] Add all CSS variables from Section 1 to `:root` in global stylesheet
- [ ] Replace all hardcoded hex colors with token references
- [ ] Apply depth shadow system to every card, panel, and input
- [ ] Update form card with `--shadow-2` and focus-within glow
- [ ] Restyle CTA button with gradient + glow
- [ ] Apply heading gradient to "Blue Ocean" hero title
- [ ] Update competitor list rows with hover states
- [ ] Restyle active nav tabs with `--shadow-1`
- [ ] Apply map canvas background radial gradient
- [ ] Update unclaimed zone circles to use `--color-primary` rings
- [ ] Add global transition property for elevation animations
- [ ] Audit all spacing against proximity table (Section 7)
- [ ] Verify contrast ratios: `--text-primary` on `--bg-mid` ≥ 4.5:1
- [ ] Verify contrast ratios: `--text-secondary` on `--bg-mid` ≥ 3:1 (large text)
- [ ] Test all interactive states: hover, focus, active, disabled

---

*Generated from: blue-theme-codes.txt + ui-visual-design-guidelines.md + screenshot analysis*
