# Spelling-Pronun

A React 18 + Vite progressive web app for two Grade 5 learners: the original Alberta-curriculum spelling games plus a language-learning engine (lessons, repeatable assessment, delayed review, and a sourced historical mystery) under development.

## Commands

```bash
npm ci
npm run dev      # Vite dev server
npm test         # Node test runner (no browser or Firebase needed)
npm run build    # Production build to dist/
npm run preview  # Serve the production build
```

## Where to look

- `docs/MASTER_PLAN.md` — the authoritative requirements, content inventory, and release gates.
- `docs/IMPLEMENTATION_STATUS.md` — the evidence ledger: what is verified, how, and what remains blocked.
- `docs/CLAUDE_IMPLEMENTATION_HANDOFF.md` — implementation handoff and rules that must not be weakened.
- `CLAUDE.md` — architecture map for the codebase.

## Status

The learning engine and the C0 pilot content are integrated but not released: pilot content still needs reviewed human audio, specialist review, learner testing, a real-iPad check, and a family pilot before any of it can count toward mastery. Progress data for the existing spelling games is preserved and additive.

Deployment to GitHub Pages happens on pushes to `main` via GitHub Actions; the site is served at `/Spelling-Pronun/`.
