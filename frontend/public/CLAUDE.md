<!-- dox:child v1 -->
# `frontend/public/` — Static assets

Static files copied verbatim into the Vite build output.

## What lives here

Files placed here are served at the site root and copied to `dist/` during `npm run build`. Only long-lived static assets belong here; dynamic domain files (Excel uploads/downloads) are handled by the backend.

## Local conventions

- Assets must be referenced from the root path (e.g. `/logo.png`).
- Do not put build artifacts or source files here.

## Key files

| File | Role |
|------|------|
| `favicon.svg` | Browser tab icon. |
| `icons.svg` | SVG icon sprite. |
| `logo.png` | JSW logo used by the login brand panel. |

## Gotchas / fragile spots

- Files here are not processed by the module graph; large assets bloat the deploy.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../frontend_docs/README.md`](../../frontend_docs/README.md)
