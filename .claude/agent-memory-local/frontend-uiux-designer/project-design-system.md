---
name: marketing-report-design-system
description: JSW Steel dashboard design tokens, motifs, and component patterns for the Marketing Report Automation project
metadata:
  type: project
---

# JSW Marketing Report — Design System

**Why:** Capturing for cross-session design consistency on this premium JSW Steel dashboard.

## Token System (index.css)
- `--primary`: oklch(0.40 0.17 264) — deep indigo/navy, primary actions
- `--sidebar-primary`: oklch(0.76 0.14 78) — warm GOLD, premium highlights
- `--sidebar`: oklch(0.22 0.12 264) — deep navy sidebar surface
- `--destructive`: oklch(0.56 0.24 27) — JSW red-orange
- `--background`: oklch(0.98 0.006 264) — near-white with slight blue tint
- `--card`: oklch(1 0 0) — pure white cards (light mode)
- Font: Geist Variable, sans-serif

## Brand Motifs (from BrandPanel + AppSidebar)
- Soft gold glow: `pointer-events-none absolute rounded-full bg-sidebar-primary/10 blur-3xl`
- Blueprint grid: `linear-gradient` + `radial-gradient` mask, `opacity-[0.05]`
- Gold accent rule: `h-px w-8 rounded-full bg-sidebar-primary/70` (or h-1 w-10)
- Gold left-edge active indicator: `w-[3px] rounded-full bg-sidebar-primary`
- Clean white logo chip: `rounded-lg bg-white px-4 py-2.5 shadow-sm ring-1 ring-black/[0.06]`
- Micro-labels: `text-[10px] uppercase tracking-widest text-muted-foreground/60`
- Section dividers: trailing rule `h-px flex-1 bg-border/50` beside label

## Header Pattern (from CustomerCodeManagementPage)
```tsx
<span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
  <Icon className="size-4" />
</span>
<h2 className="text-xl font-semibold tracking-tight">Title</h2>
<p className="mt-0.5 text-sm text-muted-foreground">Subtitle</p>
```

## Settings Page Design (Variant A — "Operations Control Panel")
- Two-pane layout: LEFT form (lg:max-w-2xl) + RIGHT sticky rail (lg:w-72)
- Form split into 3 labeled sections: Source Location / Schedule Window / Notifications
- `SectionLabel` = micro-label + trailing `h-px` rule
- Live path preview: dashed border, gold tint when fields are filled
- Plain-English schedule sentence preview
- `ConfigSummaryRail`: enable hero card with gold glow + power icon + live summary rows
- Status panel: 4 stat tiles (2×2 → 4×1) + timeline-style recent runs list
- Footer action bar: `bg-muted/30 border-t` with right-aligned buttons
- Page constrained to `max-w-5xl mx-auto` (not full-width)

## Data-table / App-UI register (Report page, `components/report/*`)
Dense executive-console register (NOT marketing). Dials: VARIANCE 4 / MOTION 2 / DENSITY 7.
- **Control bar** (toolbar): wrap filters in one surface — `rounded-xl border border-border bg-card p-2 shadow-xs`. All controls unified at `h-9`. Let the search/region field `flex-[1_1_200px]` grow so it pushes the action cluster to the right edge; separate actions with a `hidden sm:block h-6 w-px bg-border` hairline. Generate = default (primary, `px-4`); Export = `outline`.
- **Segmented control** pattern: `inline-flex h-9 items-center rounded-lg border border-border bg-muted/50 p-1`; active segment `bg-primary text-primary-foreground shadow-sm` (brand selector) OR `bg-background text-foreground shadow-sm` (neutral toggle, e.g. drilldown Merged/Unmerged); inactive `text-muted-foreground hover:text-foreground`.
- **Meta strip** (not hero cards): `flex flex-wrap gap-x-5 rounded-lg border bg-muted/30 px-3.5 py-2.5`; each pair = uppercase micro label (`text-[10px] uppercase tracking-wider text-muted-foreground/70`) + `text-xs font-medium text-foreground` value.
- **Table chrome**: sticky header on `bg-muted` with uppercase micro (`text-[11px] font-semibold uppercase tracking-wide text-muted-foreground`); container `rounded-xl border`. Subtotal rows `bg-muted/50 font-medium` + semibold label; grand-total footer `bg-muted font-semibold border-t` with uppercase micro label (opaque bg required for sticky). All numeric/INR cells `text-right tabular-nums`.
- **Tabs**: default shadcn pill variant at `h-9` for section nav (distinct from inner pill toggles by scale).
- **Empty/idle/loading states**: composed panel — `rounded-xl border [border-dashed] bg-muted/20 py-16 text-center` + a `size-11 rounded-full bg-primary/10 text-primary` (or `bg-muted text-muted-foreground`) icon chip + title + muted hint.
- **Status badges** (in-table): subtle pills — Blocked `rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive`; positive `bg-emerald-500/10 text-emerald-600`.

## How to apply:
Use `--sidebar-primary` (gold) for highlights, active states, enabled-state glows.
Use `--primary` (indigo) for primary action buttons, icon chips.
Always use semantic tokens, never raw hex.
Emerald (`text-emerald-600`) for success/ingested states is allowed per existing pages.
