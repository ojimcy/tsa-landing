# tsa-landing

Marketing site for TSA Connect, a P2P crypto marketplace with escrow, merchant payments and bill payments. It also hosts the legal and account-deletion pages that the app stores require.

## Stack
React 19 · TypeScript · Vite 7 · Tailwind 4 · react-router-dom 7 · lucide-react · shadcn-style UI primitives. Deployed on Netlify.

## What's in it
- A single-page landing site composed from sections (hero, features, how it works, private-sale interest form, download call to action).
- Privacy policy, terms and an account-deletion page rendered from structured data in `src/data/legal`.
- Netlify edge functions that generate link previews (Open Graph metadata and images) for payment-request and receipt links, so shared links show the right amount and status.
- All copy, links and feature lists live in `src/data/content.ts`, so wording changes don't touch components.

## Develop
```bash
npm install
npm run dev       # dev server
npm run build     # type-check and production build
npm run lint
npm run preview   # serve the build
```

## Layout
```
src/app.tsx          landing page, sections in render order
src/main.tsx         routes
src/components/      layout, sections, ui
src/data/            content and legal text
netlify/             edge functions and functions for link previews
```
