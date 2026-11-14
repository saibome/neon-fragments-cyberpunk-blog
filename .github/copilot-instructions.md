# Copilot Instructions

- This is an **Astro 7 static site** built with **bun 1.4.4** (bun's runtime reports Node 26.3.0, satisfying Astro's >=22.23.4 requirement). There is no React, Hono, SSR runtime, client-side router, or hydration runtime. Do not introduce `react-router`, `react-helmet-async`, or JSX.
- Routing is file-based under `src/pages/`. Use plain `<a href>` for internal links; dynamic article routes come from `getStaticPaths()` and must use `post.permalink` (generated once at build time in UTC).
- All head tags live in `src/layouts/BaseLayout.astro`; `SITE_URL` is resolved at build time by `scripts/env.mjs` and shared by `astro.config.mjs` and pages.
- Content is compiled by `bun scripts/build-content.ts` (also `bun run build:content`) into `services/posts.json` (zod frontmatter validation, marked + highlight.js, sanitize-html). Never hand-edit generated files.
- Browser interactions belong in `src/scripts/*.js` as plain JavaScript and are imported from `<script>` tags in `.astro` components. Keep them framework-free. Search, tag filtering and pagination operate directly on pre-rendered DOM nodes; they never call an API.
- Fonts: browser-loaded fonts live in `public/fonts/` and are deployed; the ~20MB Chinese fonts used only to render OG images live in `assets/og-fonts/` and must never be moved into `public/`.
- The site is deployed to EdgeOne Pages as **pure static files** (`edgeone.json`). There is no `/api/*`, Cloud Functions, Docker image, standalone static server, or Atom feed. Do not reintroduce them without an explicit request.
- Use `bun install --frozen-lockfile`; the lockfile is `bun.lock`. Never introduce pnpm/npm/yarn lockfiles or `.nvmrc` (EdgeOne Pages would try to switch to a non-preinstalled Node version).
- `@astrojs/check@0.9.12` supports TypeScript 5/6 only, so TypeScript stays on 6.0.3 even though 7.x exists. Do not bump it without replacing the Astro type checker.
- Run `bun run typecheck && bun run lint && bun run test && bun run build && bun run check:edgeone` before proposing changes.
