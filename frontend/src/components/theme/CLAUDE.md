<!-- dox:child v1 -->
# `frontend/src/components/theme/` — Theme components

Light/dark mode provider and toggle.

## What lives here

Wraps `next-themes` to provide the `ThemeProvider` and exposes a mode toggle button used in the login page and user menu.

## Local conventions

- Use semantic tokens (`--background`, `--foreground`) instead of hard-coded colors.
- Theme class is applied at the document root.

## Key files

| File | Role |
|------|------|
| `theme-provider.tsx` | Application `ThemeProvider`. |
| `mode-toggle.tsx` | Light/dark/system toggle button. |

## Gotchas / fragile spots

- Avoid importing `next-themes` directly in pages — go through `theme-provider`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/STYLING.md`](../../../../frontend_docs/STYLING.md)
