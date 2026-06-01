---
name: jsw-design-tokens
description: JSW Steel dashboard design tokens, motifs, and component patterns for Marketing Report Automation
metadata:
  type: project
---

Gold accent = `--sidebar-primary` (oklch warm gold hue 78). Used for: thin accent bars `h-px w-8 bg-sidebar-primary/70`, active glints, enabled-state borders/backgrounds, status dots.

Primary = `--primary` (oklch indigo hue 264). Used for icon chips `bg-primary/10 text-primary`, primary buttons, rings.

Premium motifs from BrandPanel + AppSidebar:
- Soft glow: `pointer-events-none absolute rounded-full bg-sidebar-primary/10 blur-3xl`
- Blueprint grid: `linear-gradient` lines at opacity 0.05–0.07 with radial mask
- Logo chip: `rounded-md bg-white px-4 py-2.5 shadow-sm ring-1 ring-black/[0.06]`
- Micro-labels: `text-[10px] uppercase tracking-widest text-muted-foreground`
- Gold accent bar: `h-px w-8 rounded-full bg-sidebar-primary/70`

Page header pattern (customer-codes/regions): icon chip `flex h-9 w-9 rounded-lg bg-primary/10 text-primary` + title `text-xl font-semibold tracking-tight` + subtitle `text-sm text-muted-foreground mt-0.5`.

Settings page (Direction C): `max-w-3xl` column of sectioned Cards (Activation · Source & File · Schedule · Recipients · Status). SectionCard has micro-label header + icon chip. Sticky action bar with gold gradient top edge. Activation card uses gold border/bg when enabled.

Status tiles: 3-col grid of StatTile components with intent-colored chips (emerald success, sidebar-primary warning, destructive error). Recent runs: timeline dots with status-tinted colors.

File 250-line limit enforced. Sub-components: SectionCard, SourceFileSection, ScheduleSection, JswStockConfigStatus. Logic in settings-utils.ts (module-level constants, validate, buildPathPreview, buildScheduleSummary).

**Why:** User screenshot feedback — original card was full-width stretched, too tall, bland flat status list.
**How to apply:** Always constrain settings/config forms to max-w-3xl; use sectioned cards with icon micro-labels; never stretch inputs edge-to-edge on wide viewports.
