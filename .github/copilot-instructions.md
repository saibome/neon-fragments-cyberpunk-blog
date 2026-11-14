# Copilot Instructions

- This is an **Astro 7 static site** (Node 26 + pnpm 12). There is no React, Hono, Vite SSR config, client-side router, or hydration runtime. Do not introduce `react-router`, `react-helmet-async`, or JSX.
- Routing is file-based under `src/pages/`. Use plain `<a href>` for internal links; dynamic article routes come from `getStaticPaths()` and must use `post.permalink` (generated once at build time in UTC).
- All head tags live in `src/layouts/BaseLayout.astro`; `SITE_URL` is resolved at build time by `scripts/env.mjs` and shared by `astro.config.mjs`, pages and `scripts/postbuild.mjs`.
- Content is compiled by `pnpm build:content` into `services/posts.json` (zod frontmatter validation, marked + highlight.js, sanitize-html). Never hand-edit generated files, including `cloud-functions/data.js`.
- Browser interactions belong in `src/scripts/*.js` as plain JavaScript and are imported from `<script>` tags in `.astro` components. Keep them framework-free.
- Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` before proposing changes.
