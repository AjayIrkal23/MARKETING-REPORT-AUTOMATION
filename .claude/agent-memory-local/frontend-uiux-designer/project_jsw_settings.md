---
name: jsw-settings-redesign
description: Settings page premium redesign — variant B decisions, component split, gold accent pattern
metadata:
  type: project
---

Settings page redesign (Variant B) delivered 2026-05-31.

**Why:** User reported the card was "full-width, huge, bad" — inputs stretched to 1500px, heavy toggle, bland status grid, no grouping.

**Decisions made:**
- `max-w-3xl` card, not full-width. Centered via page flex layout.
- Hero header strip with gold radial glow (`bg-sidebar-primary/15 blur-3xl`) when enabled; status pill (emerald when active).
- Gold accent bar `h-px w-8 rounded-full bg-sidebar-primary/70` mirrors BrandPanel/AppSidebar motif.
- Blueprint grid motif in hero header (same opacity-0.04, radial mask as BrandPanel).
- Three sections: Source (2-col), Schedule (3-col: start/end/interval), Notifications.
- `PathPreviewChip` — live resolved path with today's sample date, FolderOpen icon, "Preview" badge.
- Status redesigned as 4-tile `StatusStatTiles` + `RecentRunsList` (timeline with dot + vertical line).
- `emerald-500` for ingested success (consistent with existing admin pages).

**Component split:**
- `JswStockConfigCard.tsx` — main card, ≤250 lines (253 w/ comment header)
- `ConfigHeroHeader.tsx` — hero strip, enable Switch, gold glow, status pill
- `PathPreviewChip.tsx` — live path preview
- `JswStockConfigStatus.tsx` — status panel orchestrator
- `StatusStatTiles.tsx` — 4-tile stat row
- `RecentRunsList.tsx` — timeline recent runs

**How to apply:** When touching settings UI again, follow this component split. The `SectionLabel` helper (icon + micro-label + h-px divider) is defined locally in JswStockConfigCard — reuse this pattern for any new sections.
