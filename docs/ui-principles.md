# UI Visual Design Guidelines: Modern Depth & Accessibility

This guideline outlines the core principles for recreating a high-quality UI aesthetic, focusing on the **Depth** system, color management, and component architecture.

---

## 1. The Depth System (Layering & Elevation)

The UI uses a structured **Level** system to create visual hierarchy through shadows and highlights rather than just color changes.

### Core Implementation

| Level | Shadow | Use Case |
|---|---|---|
| **Level 0** | None (flat) | Primary canvas / base background |
| **Level 1** | Small shadow | Standard interactive elements |
| **Level 2** | Medium shadow | Hovered states, cards that need to pop |
| **Level 3** | Large shadow | Modals, dropdowns, primary CTAs |

### CSS Strategy: Inset Highlights

To achieve a **glassmorphism** or premium feel, combine standard box shadows with an inset white highlight on the top edge.

```css
/* Example: Depth Level 1 Card */
.card-level-1 {
  background: var(--bg-light);
  box-shadow:
    inset 0 1px 2px #ffffff30, /* Top highlight  */
    0 1px 2px #00000030,       /* Dark shadow    */
    0 2px 4px #00000015;       /* Soft outer shadow */
}
```

---

## 2. Advanced Color Management (OKLCH)

Use the **OKLCH color space** over HSL or RGB. OKLCH is more intuitive for creating consistent perceived lightness across different hues, preventing "muddy" colors in dark mode.

### Lightness Calibration

| Layer | Lightness Value |
|---|---|
| Top layers | `0.3` |
| Middle layers | `0.2` |
| Bottom layers | `0.1` |

### Implementation Tip

Define colors as CSS variables using `oklch()` so that when you swap themes, perceived brightness remains consistent.

```css
:root {
  --bg-top:    oklch(0.3 0.02 264);
  --bg-mid:    oklch(0.2 0.02 264);
  --bg-bottom: oklch(0.1 0.02 264);
  --text-muted: oklch(0.7 0 264);
}
```

---

## 3. Component Architecture & Spacing

### The Proximity Rule

Use spacing to define relationships between elements. Elements that belong together should be significantly closer to each other than to neighboring groups.

| Spacing Type | Value | Use Case |
|---|---|---|
| Close proximity | `4px – 8px` | Internal element relationships (label + value) |
| Group spacing | `16px – 24px` | Separating distinct functional blocks |

### Interactive Components

- **Search Bars** — Use rounded pill shapes (`border-radius: 999px`) for a modern, friendly look.
- **Switches / Toggles** — Reserve high-contrast accent colors (e.g. vibrant purple/blue) only for the **active** state to draw the eye without cluttering the UI.
- **Cards** — Avoid hard borders. Use a very subtle border or the shadow-based Depth system instead.

---

## 4. Visual Analysis Tips

### Empty States
Use subtly muted gray text for secondary information to keep the user focused on primary data.

```css
.text-muted {
  color: oklch(0.7 0 264);
}
```

### Typography Scale

| Breakpoint | Base Font Size |
|---|---|
| Small (Mobile) | `16px` |
| Medium (Laptop) | `18px` |
| Large (Desktop) | `20px` |
| Extreme (4K) | `24px` |

### Active States
Always provide visual hover/active feedback. For example, transition a card from **Level 1 → Level 2** on hover.

```css
.card {
  box-shadow: var(--shadow-level-1);
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-level-2);
}
```
