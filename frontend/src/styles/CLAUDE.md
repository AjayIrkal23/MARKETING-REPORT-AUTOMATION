<!-- dox:child v1 -->
# `frontend/src/styles/` — Global styles

Additional global CSS beyond Tailwind and `src/index.css`.

## What lives here

Currently a landing zone for any project-wide CSS that does not fit in the Tailwind layer or the root `index.css`. Most theming uses shadcn semantic tokens defined in `src/index.css`.

## Local conventions

- Prefer Tailwind utilities and CSS variables over new global CSS files.
- Name files descriptively and import them in `main.tsx` or `App.tsx`.

## Key files

| File | Role |
|------|------|


## Gotchas / fragile spots

- Empty today; avoid adding large stylesheets here — use Tailwind v4 tokens instead.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../frontend_docs/STYLING.md`](../../../frontend_docs/STYLING.md)
