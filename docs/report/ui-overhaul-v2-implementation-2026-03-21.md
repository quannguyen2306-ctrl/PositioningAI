# UI Overhaul v2 — Implementation Report
**Date:** 2026-03-21
**Branch:** `ui-improvement`
**Scope:** 5-phase frontend improvement pass on the React 18 + TypeScript dashboard

---

## Summary

This report documents the implementation of the UI Overhaul v2 plan (`docs/ui-overhaul-v2.md`). All 5 phases were completed across 12 files with zero TypeScript errors. A code review pass was run after all stages, and 2 HIGH bugs were caught and fixed before merge.

---

## Phase 1 — Session History & Persistence

**Goal:** Let users revisit past analyses without re-running the pipeline.

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useSessionStorage.ts` | localStorage wrapper — 7-day TTL, max 10 sessions, auto-prune on load |
| `src/components/dashboard/panels/HistoryPanel.tsx` | Grid of session cards with Restore / Delete / Clear All |

### Modified Files

| File | Change |
|------|--------|
| `src/contexts/AnalysisContext.tsx` | Integrated `useSessionStorage`; auto-saves on `onComplete`; added `restoreSession`, `deleteSession`, `clearAllSessions` to context |
| `src/components/dashboard/Sidebar.tsx` | History toggle button wired; `historyCount` badge added; `NavSection` extended with `'history'` |
| `src/pages/ResultsPage.tsx` | Destructures history state from context; renders `<HistoryPanel>` on `activeSection === 'history'` |

### Behaviour

- Sessions are keyed as `posai_session_<id>` in `localStorage`
- On load, entries older than 7 days are pruned automatically
- Restoring a session aborts any in-flight SSE stream and rehydrates all results state

---

## Phase 2 — CSV Export & Learn More Modal

**Goal:** Give users a one-click way to export results and drill into recommendations.

### New Files

| File | Purpose |
|------|---------|
| `src/utils/reportExporter.ts` | `exportCSV(results, businessUrl)` — builds a multi-section CSV and triggers a browser download via `Blob` + `URL.createObjectURL` |
| `src/components/modals/LearnMoreModal.tsx` | Accessible modal for Fix or ContentPiece details — ESC to close, backdrop click to close, focus on open |

### CSV Sections

1. Business Profile
2. Score Summary (avg score, mention rate, High/Medium/Low breakdown)
3. Products & Services
4. Competitors Analysed
5. Evaluation Results (per-question scores, mention quality, key observation)
6. Executive Summary & Positioning Insight
7. Priority Fixes (title, problem, action, impact, effort)
8. Content to Add
9. Key Topics to Cover

### Modified Files

| File | Change |
|------|--------|
| `src/components/dashboard/panels/OverviewPanel.tsx` | Added `businessUrl: string` prop; wired "Export Report" button to `exportCSV(results, businessUrl)` |
| `src/components/results/RecommendationsList.tsx` | "Learn more →" spans converted to `<button>` elements; `LearnMoreModal` rendered from `useState<ModalContent \| null>` |
| `src/pages/ResultsPage.tsx` | Destructures `analysisRequest` from context; passes `businessUrl={analysisRequest?.url ?? ''}` to `<OverviewPanel>` |

---

## Phase 3 — Recharts Migration (Plotly → Recharts)

**Goal:** Replace the heavy Plotly dependency (~4.7 MB) with the lighter Recharts library.

### Dependency Changes

**Removed:**
- `plotly.js ^2.35.2`
- `react-plotly.js ^2.6.0`
- `@types/react-plotly.js ^2.6.3` (devDependency)

**Added:**
- `recharts ^2.15.0`

### Modified Files

| File | Change |
|------|--------|
| `frontend/package.json` | Dependency swap as above |
| `src/components/results/PCAViz.tsx` | Full rewrite using `ScatterChart` / `Scatter` / `XAxis` / `YAxis` / `CartesianGrid` / `Tooltip` / `Legend` / `ResponsiveContainer` |

### PCAViz — Key Implementation Details

- Custom `StarShape` SVG component renders "Your Business" as a gold 5-point star
- Custom `ScatterTooltip` styled with Tailwind design system tokens
- All `style={{ ... }}` inline objects replaced with Tailwind utility classes
- Lazy `Suspense` loading removed — Recharts is synchronous and tree-shakeable
- Axis selector dropdowns use `className` instead of `selectStyle` / `labelStyle` CSSProperties objects
- Dimension interpretation cards converted from inline-styled `<div>` to `card-raised` utility class

---

## Phase 4 — Accessibility

**Goal:** Screen-reader support and keyboard navigation on all interactive panels.

### Modified Files

| File | Change |
|------|--------|
| `src/components/dashboard/Sidebar.tsx` | `aria-label="Main navigation"` on `<aside>`; `aria-current="page"` on active nav button; `focus-visible:ring-2 focus-visible:ring-accent` on all nav buttons |
| `src/components/dashboard/DashHeader.tsx` | Settings button already had `aria-label`; hamburger button adds `aria-label="Open navigation menu"` |
| `src/components/modals/LearnMoreModal.tsx` | `role="dialog"` + `aria-modal="true"` + `aria-label`; focus placed on close button on mount; ESC key listener |

---

## Phase 5 — Mobile Responsiveness

**Goal:** Make the dashboard usable on small screens where the fixed sidebar breaks layout.

### Approach

Slide-in sidebar overlay pattern:
- On `md+` screens: sidebar is `static`, always visible (unchanged layout)
- On `< md` screens: sidebar is `fixed inset-y-0 left-0 z-50` with `-translate-x-full` default, `translate-x-0` when open
- Semi-transparent backdrop (`z-40`) appears behind the sidebar and dismisses on click
- Smooth `transition-transform duration-200` animation

### Modified Files

| File | Change |
|------|--------|
| `src/components/dashboard/Sidebar.tsx` | Added `mobileOpen?: boolean` and `onMobileClose?: () => void` props; wraps content in Fragment with conditional backdrop |
| `src/components/dashboard/DashHeader.tsx` | Added `onMenuClick?: () => void` prop; hamburger `<Menu>` button visible on `md:hidden` |
| `src/pages/ResultsPage.tsx` | Added `sidebarOpen` state; wires `onMenuClick` → open, `onNavigate` → close, `onMobileClose` → close |

---

## Code Review Findings & Fixes

A `code-reviewer` agent was run across all 9 modified/created files after implementation.

### HIGH — PCAViz array indexing bug (fixed)

**File:** `src/components/results/PCAViz.tsx`

**Problem:** `compData` was calling `pcaMeta.filter(m => m.source !== 'user')` inside the `.map()` callback on every iteration, but the index `i` used to look up the result was the *filtered* array index — not the original. This caused domain labels to misalign with chart points when any user entry appeared between competitors in `pcaMeta`.

**Fix:** Pre-compute `compMeta` once before the map:
```ts
// Before (broken)
const compData = coords.filter(...).map((c, i) => {
  const meta = pcaMeta.filter(m => m.source !== 'user')[i]  // re-filters on every iteration
  ...
})

// After (correct)
const compMeta = pcaMeta.filter(m => m.source !== 'user')
const compData = coords.filter(...).map((c, i) => ({
  label: compMeta[i]?.domain ?? `Competitor ${i + 1}`,
  ...
}))
```

### MEDIUM — Sidebar toggle buttons didn't close mobile sidebar (fixed)

**File:** `src/components/dashboard/Sidebar.tsx`

**Problem:** The "Current Run" and "History" toggle buttons at the top of the sidebar called `onNavigate()` but not `onMobileClose()`. On mobile, tapping either toggle left the sidebar open.

**Fix:** Added `onMobileClose?.()` call to both toggle button `onClick` handlers.

---

## Files Created / Modified

```
frontend/
├── package.json                                        MODIFIED
└── src/
    ├── hooks/
    │   └── useSessionStorage.ts                        NEW
    ├── utils/
    │   └── reportExporter.ts                           NEW
    ├── components/
    │   ├── modals/
    │   │   └── LearnMoreModal.tsx                      NEW
    │   ├── dashboard/
    │   │   ├── DashHeader.tsx                          MODIFIED
    │   │   ├── Sidebar.tsx                             MODIFIED
    │   │   └── panels/
    │   │       ├── HistoryPanel.tsx                    NEW
    │   │       └── OverviewPanel.tsx                   MODIFIED
    │   └── results/
    │       ├── PCAViz.tsx                              MODIFIED (rewrite)
    │       └── RecommendationsList.tsx                 MODIFIED
    ├── contexts/
    │   └── AnalysisContext.tsx                         MODIFIED
    └── pages/
        └── ResultsPage.tsx                             MODIFIED
```

---

## Build Status

```
TypeScript: 0 errors (npx tsc --noEmit)
npm install: clean (recharts added, plotly removed)
```
