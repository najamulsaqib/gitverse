---
name: frontend
description: Work on GitVerse's React/TypeScript frontend (src/) - components, Zustand stores, Tauri invoke hooks, dark-mode Tailwind styling. Use when implementing or modifying anything under src/.
---

# GitVerse Frontend (React / TypeScript / Tailwind)

Minimal-change rules from the global skill still apply: touch only what the
task needs, match existing style, no opportunistic refactors. This skill adds
the project-specific conventions for `src/`.

## Architecture

- `src/components/<Feature>/` — one folder per feature (Sidebar, RepoView,
  ProfileSetup, StashPanel, LogGraph, SetupGate). Shared primitives (Button,
  Modal, Badge) live in `src/components/shared/`.
- `src/store/` — Zustand slices (`profiles.ts`, `repos.ts`, `ui.ts`)
- `src/hooks/` — typed wrappers around Tauri's `invoke()` (`useProfile.ts`,
  `useRepo.ts`, `useTauri.ts`)
- `src/types/` — TS types mirroring the Rust models in `src-tauri/src/models.rs`

When adding a new major view/page (Feature): create a new component in its own
folder, a Zustand slice if it needs shared state, and a hook if it talks to the
backend. For generic UI elements, add them to `src/components/shared/`. Don't
restructure existing components/slices while you're in there.

## Conventions

- **Thin frontend — push processing to the backend.** Treat each component as a
  "page" that renders data and forwards user intent. Data shaping, derivation,
  and business logic belong in Rust commands (`src-tauri/`), not in components,
  hooks, or stores. The frontend should receive data already in the shape it
  renders. Concretely, the backend should return ready-to-render view models
  (labels, counts, formatted strings, resolved relationships, sort/filter
  results) rather than the frontend computing them from raw data. Acceptable FE
  processing is limited to: trivial presentational glue (conditional classNames,
  `key`s), wiring event handlers, and view-only local UI state (open/closed,
  hover). If you catch yourself writing loops, `find`/`filter`/`reduce` over
  domain data, multi-branch label/icon resolution, formatting, or joining
  records by id inside a component/hook/store, stop and move it into the
  relevant Tauri command (see the backend skill). When the data isn't yet
  exposed that way, add/extend the command to return the derived shape instead
  of computing it on the client.
- **Imports use the `@/` alias, never relative paths.**
  `import { Button } from "@/components/shared/Button"`, not `../../shared/...`.
  The alias maps to `src/` via `tsconfig.json` `paths` and `vite.config.ts`
  `resolve.alias` — both already configured.
- **Backend calls go through hooks, never raw `invoke()` in components.**
  Add/extend a hook in `src/hooks/` that calls `invoke<T>('command_name', args)`
  with the matching TS type from `src/types/`. Wrap these calls in
  `try/catch` blocks and expose error states from the hook.
- **State:** local component state (`useState`) for view-only UI; Zustand
  (`src/store/`) for anything shared across components (active profile,
  selected repo/branch, pinned repos).
- **Prefer HTML/CSS over `useEffect`.** If a behavior can be expressed
  declaratively with an HTML attribute or CSS, do that instead of reaching for
  `useEffect` + DOM manipulation. E.g. disable autocorrect via
  `autocorrect`/`autocapitalize`/`spellcheck` attributes (set once on `<body>`
  in `index.html` since they inherit) rather than a focus listener; use `:focus`,
  `:hover`, `scroll-behavior`, etc. in CSS rather than effects. Reserve
  `useEffect` for things genuinely outside React's render (subscriptions,
  timers, imperative APIs).
- **Dark mode only — no `dark:` variants, no light theme, ever.**
  `color-scheme: dark` is already set globally in `src/App.css`. Use the
  palette defined via `@theme` in `src/App.css` (sampled from
  `public/icon.svg`): `bg` (#0f0e1a) and `surface` for backgrounds, `border`
  for borders/dividers, `indigo` / `indigo-light` and `teal` / `teal-light`
  for accents — e.g. `bg-bg`, `text-teal`. Reuse these rather than
  introducing new colors per component.
- **Styling:** Tailwind utility classes inline on elements. No CSS modules, no
  styled-components, no new global stylesheets beyond `App.css`.
- **Use Tailwind's canonical spacing scale, not arbitrary px values.**
  Tailwind v4's scale is in 0.25rem (4px) steps, so e.g. `h-[38px]` →
  `h-9.5`, `gap-[9px]` → `gap-2.25`, `px-[18px]` → `px-4.5`. Reach for
  `[Npx]` only when the value truly isn't a multiple of 4px (e.g. `1px`
  borders, odd radii like `rounded-[7px]`/`rounded-[10px]`). Same idea for
  opacity shorthand: `bg-amber/[0.12]` → `bg-amber/12`. When porting pixel
  values from the design handoff, convert to the scale up front instead of
  leaving arbitrary values for the linter to rewrite later.
- **Render large lists progressively, never all at once.** Any list that can
  grow unbounded (diff lines, commit history, file lists, search results) must
  paint an initial chunk and append more as the user scrolls — dumping thousands
  of rows into the DOM freezes the app (e.g. a 15k-line diff). The canonical
  pattern is `useProgressiveCount` in
  [src/components/RepoView/DiffView.tsx](../../../src/components/RepoView/DiffView.tsx):
  hold a `count` in state (start at one `CHUNK`), render `items.slice(0, count)`,
  and bump `count` by `CHUNK` via an `IntersectionObserver` on a bottom sentinel,
  resetting `count` when the source data changes. Reuse this approach (or true
  windowing like the absolutely-positioned virtualised rows in `LogGraph/`) for
  every new long list rather than mapping the full array.
- **Types:** keep `src/types/index.ts` in sync with `src-tauri/src/models.rs`
  (camelCase fields on both sides via `serde(rename_all = "camelCase")`). If a
  task changes one, update the other in the same change.
- **Testing:** use Vitest and React Testing Library. Place `.test.ts` / `.test.tsx`
  files alongside the component or hook they cover.

## Verify

```bash
npm run build      # tsc + vite build — catches type errors
npm run tauri dev   # run the app to check the UI for real
```
