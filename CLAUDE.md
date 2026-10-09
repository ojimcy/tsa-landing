# tsa-landing

Public marketing site for TSA Connect (`tsaconnectworld.com`), plus the legal and
account-deletion pages that the app stores require. Mostly static; the only network call is the
private-sale interest form.

Workspace context: `../CLAUDE.md`.

## Stack

React 19 · TypeScript 5.9 · Vite 7 · Tailwind 4 (`@tailwindcss/vite`, no config file) ·
react-router-dom 7 · lucide-react · a couple of shadcn primitives (`button`, `card`).
No test runner, no state library, no data fetching library.

## Commands

```bash
npm run dev       # vite dev server
npm run build     # tsc -b && vite build — the only type check
npm run lint      # eslint .
npm run preview   # serve dist/
```

## Layout

```
src/
  main.tsx                 router — all routes live here
  app.tsx                  the "/" landing page: composes the sections in order
  components/
    layout/                header, footer
    sections/              hero, features, how-it-works, private-sale, download-cta
    ui/                    button, card (shadcn style)
    reveal.tsx             IntersectionObserver scroll-in wrapper
  data/
    content.ts             ALL copy, links, feature lists, mockup imports
    legal/                 structured Privacy Policy + Terms (see sync note below)
  pages/                   about, privacy, terms, delete-account, legal (shared renderer)
```

Files are kebab-case. Pages default-export; components and data modules use named exports.
Path alias `@/*` → `src/*`.

## Conventions

- **Copy lives in `src/data/content.ts`**, not inline in components — site name, tagline,
  emails, social links, feature lists, screenshot imports. Change wording there.
- **Sections are composed in `app.tsx`** in render order. A new landing section = a file in
  `components/sections/` plus one line in `app.tsx`.
- **Routes are declared in `main.tsx`.** Wrap scroll-in content in `<Reveal>` to match the rest
  of the site's motion.

## Store-critical constraints

- `/privacy`, `/terms`, and `/delete-account` are URLs submitted to Apple and Google.
  **These paths must stay stable and reachable without signing in.** `/delete-account` exists
  specifically for Apple guideline 5.1.1(v).
- `src/data/legal/` is a **byte-for-byte copy of `tsa-dev/tsa-app/constants/legal/`**. The app
  renders the same documents natively and the stores check the in-app policy against the policy
  at the listed URL, so the copies must not drift. When editing, copy the whole directory across
  and bump `version` + `effectiveDate` in both:

  ```bash
  cp ../tsa-dev/tsa-app/constants/legal/*.ts src/data/legal/
  ```

  The repos share no package, which is why this is a copy rather than an import. Read the SYNC
  NOTE at the top of `src/data/legal/index.ts` before touching it.

## Env

`.env`: `VITE_API_URL` — base URL of the Go API. Resolved in one shared place,
`src/lib/api.ts`, used by every fetch-calling module:
`components/sections/private-sale.tsx` (`POST {VITE_API_URL}/private-sale/submit`) and
`src/lib/pay.ts` (`GET {VITE_API_URL}/pay/public/:id`, polled from `/pay/:id`; and
`GET`/`POST {VITE_API_URL}/pay/public/open/:slug[/payments]` from the reusable-link page `/pay/l/:slug`). If unset, it
falls back to `http://localhost:5000/api` (the backend's default dev port) in dev, but to the
real production API (`https://tsa.mcgpchain.com/api`) in a production build — a production
build must never silently fall back to localhost. Add any new fetch call through
`src/lib/api.ts`'s `API_URL` rather than re-reading `import.meta.env.VITE_API_URL` locally.

## Share previews (Netlify edge functions)

Chat apps don't run the SPA, so a shared `/pay/*` link gets its preview on the server:

- `netlify/edge-functions/pay-meta.ts` — for **link-preview crawlers only** (`isLinkPreviewBot`),
  swaps the `<!-- share-meta -->` block in `index.html` for per-link tags. Payers get the static
  page untouched and never wait on the API. `onError: "bypass"`: a failure must never cost a payer
  the checkout page. `noindex` for everyone comes from `public/_headers`.
- `netlify/edge-functions/pay-og.ts` — the 1200×630 card at `/og/pay/:id.png` /
  `/og/pay/l/:slug.png`, always drawn from the API, never from the URL. Only the card's current
  `?v=` URL renders (any other `v` is redirected to it), so every render is cacheable.
- `netlify/edge-functions/receipt-meta.ts` — the same meta swap for a shared receipt (`/r/:code`).
  Its image is `netlify/functions/receipt-og.mts`, a **Node function, not an edge function**: the
  1080×1350 receipt at `/og/r/TSA-XXXXX-XXXXX.png` (also the receipt page's "Save receipt image")
  takes resvg hundreds of ms of CPU, far past an edge function's ~50 ms budget; the CDN caches each
  versioned image. Drawn from the API's public receipt, which answers only for a succeeded LIVE
  payment — any other code is a 404 (CDN-cached 60 s), never a generic image. A refund changes `?v=`.
  Its watermark (~1,100 rotated glyphs, seconds of resvg CPU) is pre-rendered:
  `public/og-assets/receipt-watermark.png`, made by `scripts/og-receipt-watermark.mts` — re-run
  `node --experimental-strip-types scripts/og-receipt-watermark.mts` after changing `receiptWatermark`.
- Shared logic: `src/lib/pay-share.ts` and `src/lib/receipt-share.ts` (tested), which like
  `pay-core.ts` may only use relative `.ts` imports because Deno loads them. The seal is one SVG
  (`src/lib/receipt-seal.ts`) drawn by both the page and the image. Rendering lives in
  `netlify/lib/og-render.ts` (runs under Deno and Node); resvg skips text inside a nested SVG image,
  so an SVG with words (the seal) goes through `raster()` first. `tsconfig.edge.json` type-checks
  `netlify/` in `npm run build`.
- **Import React by default in edge functions** (`import React from "react"`): react and
  react-dom ship CommonJS, and Deno exposes a CommonJS module only as its default export — a
  named import passes `tsc` but fails to bundle.
- **`satori` is pinned below 0.33**: 0.33 added `harfbuzzjs`, which reads `hb.wasm` from disk and
  can't load in an edge bundle. Fonts live in `public/og-assets/`; the resvg wasm is copied there
  from `node_modules` by `npm run build` (`og-wasm`), so it always matches the JS.
- Edge functions read `VITE_API_URL` from the Netlify site env (falling back to production).
  Locally: `npm run build`, put `VITE_API_URL` in `.env`, then
  `npx netlify-cli@latest dev --offline --dir dist`, and curl with `-A WhatsApp/2`.
