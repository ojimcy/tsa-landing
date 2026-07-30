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

`.env`: `VITE_API_URL` — base URL of the Go API, used only by
`components/sections/private-sale.tsx` (`POST {VITE_API_URL}/private-sale/submit`). Falls back to
`http://localhost:5000/api`, which is the backend's default dev port.
