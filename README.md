# 霓虹碎片 / Neon Fragments

赛博朋克风格的静态博客，基于 **Astro 7 + bun**。**没有 React、没有 Hono、没有 SSR 运行时**：Markdown 在构建期编译成 JSON，Astro 把页面、订阅源、API JSON 与分享图全部预渲染到 `dist/`；浏览器里的少量交互由原生 JavaScript 完成。

## 运行环境

| 项目 | 版本 | 约定位置 |
| :--- | :--- | :--- |
| bun | 1.4.4 | `package.json#packageManager`、`bun.lock`、CI `setup-bun`、Dockerfile |
| bun 运行时兼容的 Node | 26.3.0 | bun 1.4.4 内置；满足 Astro 7 的 `>=22.23.4` |
| EdgeOne Pages 云端 Node | 24.5.0 | `edgeone.json#nodeVersion`（平台预装，仅为安装 bun 提供 npm） |
| Astro | 7.4.12 | `astro.config.mjs` |
| TypeScript | 6.0.3 | `@astrojs/check` 的 peer 只允许 5/6，7.x 暂不能升 |

仓库只使用 bun：包管理、TypeScript 执行（`bun scripts/*.ts`）、测试（`bun test`）、CI 与 Docker 运行时全部由 bun 提供，`bun.lock` 是唯一锁文件。Astro CLI 通过 `bun run --bun` 强制在 bun 运行时执行（否则 `#!/usr/bin/env node` 会落到系统 Node；bun 模拟 Node 26.3.0，满足 Astro 7）。不要再引入 pnpm / npm / yarn 的锁文件。

**依赖基线（2026-11-15）**：全部依赖已对齐到 registry 最新版（astro 7.4.12、vite 8.3.8、tailwindcss 4.3.5、marked 18.2.0、zod 4.6.7、satori 0.63.2、oxlint 1.93.0、@types/node 26.6.6 等）。唯一例外是 TypeScript 停留在 6.x 最新的 6.0.3：`@astrojs/check@0.9.12` 的 peer 是 `^5 || ^6`，升级到 7.0.2 会让 `astro check` 失效。`tsx` 已移除，bun 原生执行 TypeScript。

EdgeOne Pages 只提供预装 Node（官方清单含 `24.5.0`），因此根目录**不提交 `.nvmrc`**：平台会优先按它切换版本，写非预装版本会在安装依赖前报 `Failed to switch to Node.js x`。云端仍保留 `nodeVersion: 24.5.0`，只用于 `npm i -g bun@1.4.4`；实际构建由 bun 运行时完成，不依赖平台 Node 版本。

```bash
bun install
cp .env.example .env.local   # 可选：设置 SITE_URL
bun run dev                  # http://localhost:3000，启动前自动编译内容
bun run build                # build:content → astro build → postbuild
bun run start                # 用零依赖静态服务托管 dist/
```

## 架构

```
构建期  _posts/*.md
          │ gray-matter + zod 校验
          │ marked + highlight.js + sanitize-html 消毒
          ▼
        services/posts.json（含按 UTC 生成的 permalink）
          │
          ├── Astro 页面/布局/组件 ──► dist/index.html、/net/、/gear/、/2026/…/
          ├── Astro 端点 ──────────► rss.xml / atom.xml / sitemap.xml / robots.txt
          │                            api/*.json
          │                            card/YYYY/MM/DD/slug.png（satori + resvg）
          └── scripts/postbuild.mjs ► 平铺 .html 副本、canonical.json、
                                     cloud-functions/data.js
运行期  静态托管 / node:http 服务 / EdgeOne Pages + Cloud Functions
          └─ 浏览器：原生 JS 负责搜索、分页、标签、分享弹窗、代码块工具栏
```

### 几处关键设计

- **永久链接**：`permalink` 在构建期按 UTC 生成一次，页面、sitemap、RSS、OG 图、canonical 全部只读 `post.permalink`；日期段不符的 URL 由 Cloud Functions / `scripts/serve.mjs` 301 到规范地址。
- **站点地址**：`scripts/env.mjs` 统一解析 `SITE_URL`（shell 环境变量优先，其次 `.env.local`），Astro 配置、页面渲染与 postbuild 共用；静态站点的域名在构建期固化，换域名需要重新构建。
- **内容安全**：frontmatter 由 zod 校验，类型不对直接让构建失败；Markdown 产出的 HTML 经 sanitize-html 白名单消毒后才用 `set:html` 注入页面。
- **零框架交互**：搜索/标签/分页直接对预渲染的卡片做显隐（不请求接口，无 JS 时全部文章可见）；侧栏、脑波图、分享弹窗（原生 `<dialog>`）、代码块工具栏都是原生 JS。图标是构建期提取的静态 SVG，不引入 React 图标库。
- **OG 分享图**：satori 接受 `{ type, props }` 形状的节点对象，因此用 `src/lib/ogImage.ts` 的 `h()` 构造节点树，**不需要 JSX 或 React**；resvg 输出 PNG。
- **API 语义**：静态端点产出 `api/*.json` 供外部消费；动态查询由 Cloud Functions 或 `serve.mjs` 提供，未知 `/api/*` 返回 JSON 404 而不是一整页 HTML。

## 写文章

在 `_posts/` 新建 `.md`（该目录已纳入版本库，`services/posts.json` 是构建产物、不入库）：

```yaml
---
title: "Neural Link Protocols"
slug: "neural-link-protocols"
date: "2077-09-15"
description: "神经网络直连协议的一次深潜。"
tags: ["tech", "neural-link"]
isGlitch: true
---

正文支持 Markdown 与围栏代码块。
```

| 字段 | 类型 | 说明 | 默认 |
| :--- | :--- | :--- | :--- |
| `title` | `string` | 标题 | `未命名文章` |
| `slug` | `string` | URL slug，只允许字母、数字、`-`、`_`，全站唯一 | 文件名 |
| `date` | `string \| Date` | 发布日期，按 UTC 生成 `/YYYY/MM/DD/slug` | 构建时间 |
| `description` | `string` | 列表摘要与 SEO 描述 | 正文前 200 字 |
| `author` | `string \| object` | 作者名或档案对象；对象会与默认档案合并 | 站点默认作者 |
| `tags` | `string[]` | 标签数组 | `[]` |
| `image` | `string` | 封面地址 | `/cover.svg` |
| `readTime` | `string` | 阅读时长 | 按中文字数/英文词数估算 |
| `likes` | `number` | 初始点赞数 | `0` |
| `isGlitch` | `boolean` | 文章卡片的故障特效 | `false` |
| `id` | `string` | 唯一标识 | slug |

```bash
bun run build:content   # 只重编译内容
bun run build           # 重新生成页面与分享图
```

## 部署

产物是纯静态站点 `dist/`，没有必须常驻的 Node 服务。

### 自托管 / Docker

`scripts/serve.mjs` 是一个零依赖的 `node:http` 静态服务（bun 兼容该 API）：分发 `dist/`、处理 `/api/*` 动态查询、错误日期 301 与 404 兜底。

```bash
bun run build
SITE_URL=https://your.domain bun run build   # 用正式域名重建
PORT=3000 bun run start

docker build --build-arg SITE_URL=https://your.domain -t neon-fragments .
docker run -p 3000:3000 neon-fragments
```

Docker 两个阶段都用 `oven/bun:1.4.4-slim`，不需要 Node 镜像。GitHub Actions 在 push / PR 上以 bun 1.4.4 + `bun install --frozen-lockfile` 执行 `build:content → typecheck → lint → test → build`，并把 `dist/`、`scripts/serve.mjs` 与**真实文章数据**打进 `release.zip`。解压后无需安装依赖：

```bash
bun scripts/serve.mjs   # 或 node scripts/serve.mjs，服务本身零依赖
```

### 腾讯云 EdgeOne Pages（静态资源 + Cloud Functions）

仓库已提交 `edgeone.json`，构建参数不需要在控制台手填。Astro 产出完整静态站点，`bun run build` 同时生成 `cloud-functions/data.js`（函数数据源）与平铺 `.html` 副本（clean URL 兜底）。

控制台（国内站 `https://console.cloud.tencent.com/edgeone/pages`）：

1. 开通 Pages → 绑定 GitHub → 授权 EO Pages → 选择 `saibome/neon-fragments-cyberpunk-blog`，部署分支 `main`。
2. 在「项目设置 → Node.js 版本」选 `24.5.0`（若之前手动选过 26 务必改掉；`edgeone.json#nodeVersion` 会覆盖同名设置）。再添加环境变量 `SITE_URL=https://your.domain`（构建期固化到 canonical / feed / 分享图）。保存后**需要 push `main` 或点「重新部署」才会生效**；之后 push `main` 自动重部署。
3. 选「全球（含中国大陆）」加速区并绑定自定义域名需要 ICP 备案；仅面向海外可选「全球（不含中国大陆）」。

`edgeone.json` 覆盖的配置（优先级高于控制台里的同名设置）：

| 配置项 | 值 | 说明 |
| :--- | :--- | :--- |
| 根目录 | `./`（默认） | 仓库根 |
| 安装命令 | `npm i -g bun@1.4.4 && bun install --frozen-lockfile` | 平台预装 Node 24.5.0 自带 npm；固定 bun 版本后按 `bun.lock` 安装，避免平台预装 bun 版本过旧 |
| 构建命令 | `bun run build` | `bun run build:edgeone` 是「构建 + 自检」别名 |
| 输出目录 | `dist` | Astro 静态产物 |
| Node.js 版本 | `nodeVersion: 24.5.0` | 平台只支持预装版本（14.21.3 / 16.20.2 / 18.20.4 / 20.18.0 / 22.x / 24.5.0 等）。该版本仅为安装 bun 提供 npm，实际构建由 bun 运行时（模拟 Node 26.3.0）完成；根目录**不提交 `.nvmrc`** |
| 缓存 / 安全头 | `/_astro/*`、`/fonts/*` 长缓存；全局 nosniff、Referrer-Policy | HTML 不设长缓存，避免更新后读到旧页 |
| clean URL 兜底 | `/net`、`/data`、`/gear` → 同名 `.html` | 兼容平台不自动展开目录索引的情况 |
| 函数时长 | `cloudFunctions.maxDuration: 10` | 函数只做 JSON 查询；已按平台提示从弃用的 `cloudFunctions.nodejs.maxDuration` 迁移 |

若云端 `npm i -g` 被网络策略拦截，可在控制台把安装命令临时改为 `bun install --frozen-lockfile`，直接使用平台预装的 bun（需确认其版本能读取文本格式的 `bun.lock`）。

函数入口在仓库根 `cloud-functions/`：`[[default]].js` 是 catch-all（动态 `/api/*`、错误日期 301、404 兜底），另加 `api/posts.js`、`api/tags.js`、`api/posts/[slug].js` 三条明确路由，避免平台未识别 catch-all 时核心接口失效。所有入口都导出 `onRequest` 与 `default`，逻辑集中在 `_lib/handler.js`；函数运行时为平台 Node 20，代码只用 Web 标准 API，不依赖 Node 内置模块或 npm 包。**静态资源优先于函数**，因此页面、feed、图片都直接命中 `dist/`。

部署前可本地验证：

```bash
bun run build:edgeone   # 构建并执行 scripts/check-edgeone.mjs
bun run check:edgeone   # 只自检：产物完整性、data.js 与文章同步、函数入口、bun 工具链配置
```

`check:edgeone` 会卡住易复发的云端问题：`nodeVersion` 不是预装版本、`engines` 挡住 24.5.0、误提交 `.nvmrc`、`bun.lock` 缺失或安装/构建命令回退到 pnpm、`cloudFunctions` 使用弃用字段。

CI 也会在每次 push 后执行 `bun run check:edgeone`。改动 `_posts/` 后请本地跑一次 `bun run build` 并提交更新后的 `cloud-functions/data.js`。

> 重新部署后若日志仍出现 `Failed to switch to Node.js x`：确认推送后的仓库根目录已无 `.nvmrc`，把「项目设置 → Node.js 版本」确认为 `24.5.0`，并关闭「使用构建缓存」做一次无缓存部署（旧缓存可能残留上一版的 `.nvmrc`）。配置改动只在下一次部署生效，保存设置本身不会触发构建。

首次部署后建议逐项核验：首页 `/`、文章页 `/YYYY/MM/DD/slug`、静态页 `/net`、`/api/posts?limit=1`（JSON）、`/api/tags`、`/rss.xml`、`/card/YYYY/MM/DD/slug.png`（PNG）、错误日期 `/2099/01/01/<slug>`（301 到规范链接）、未知页（404）。若文章页 404，检查平台是否自动展开 `目录/index.html`（仓库同时提供了 `/YYYY/MM/DD/slug.html` 平铺副本），必要时在 `edgeone.json` 的 `rewrites` 中补对应规则；若 `/api/*` 返回 HTML 404，说明函数目录未被识别，请查看构建日志中的 Cloud Functions 编译结果。

环境变量：

| 变量 | 用途 | 默认 | 生效阶段 |
| :--- | :--- | :--- | :--- |
| `SITE_URL` | canonical / sitemap / RSS / OG 图的公开地址 | `https://saibo.me` | 构建期 |
| `PORT` | 静态服务监听端口 | `3000` | 运行期（仅 `serve.mjs`） |
| `CONTENT_DIR` | 内容源目录 | `_posts` | 构建期 |
| `OG_FONT_DIR` | OG 图字体目录，留空自动探测 | `public/fonts` | 构建期 |

`.env.local` 已被 git 忽略，`.env.example` 是可提交的模板。

## 质量卡口

```bash
bun run typecheck       # astro check（bun 运行时）：检查 .astro / .ts / .tsx
bun run lint            # oxlint（忽略 .astro 生成的类型缓存）
bun run test            # bun test：永久链接、内容校验、列表查询、Cloud Function、EdgeOne 配置
bun run build           # 完整静态构建
bun run check:edgeone   # EdgeOne 部署前自检（CI 亦会执行）
```

## 目录

- `_posts/` — Markdown 原文（入库）
- `src/pages/` — Astro 页面与静态端点
- `src/layouts/` `src/components/` — Astro 布局与 UI 组件
- `src/scripts/` — 浏览器端原生 JavaScript
- `src/lib/` — 文章数据、站点地址、订阅源、OG 图（构建期）
- `src/data/icons.json` — 从 lucide（ISC License）提取的静态 SVG 图标，运行时不加载图标库
- `src/styles/global.css` — Tailwind 4 主题与赛博朋克样式
- `scripts/` — bun 脚本：内容编译、环境变量、静态服务、构建后处理、EdgeOne 部署自检
- `cloud-functions/` — EdgeOne Pages 函数入口、`_lib/handler.js` 与生成的数据模块
- `edgeone.json` — EdgeOne Pages 项目配置（构建命令、输出目录、缓存头、clean URL 规则）
- `bun.lock` — 唯一锁文件，CI / Docker / EdgeOne 均按 frozen 模式安装
- `lib/` `config.ts` `types.ts` — 前后端共用的纯函数与类型
- `tests/` — 单元测试（bun test 直接执行 TypeScript）
- `dist/` — 静态站点产物

## 取舍

- 首页把所有文章卡片预渲染进 HTML（利于 SEO），搜索/分页在客户端完成；文章特别多时可改为静态分页路由。
- 站点不再有运行时 SSR，`SITE_URL` 在构建期固化；跨域名复用同一份构建产物不适用。
- `/api/posts` 的带参数查询只在 Cloud Functions 或 `serve.mjs` 下可用；纯静态托管请使用 `api/*.json` 静态数据。
- Astro 官方不支持把 bun 作为 CLI 运行时，`bun run --bun` 是绕过 shebang 的官方 workaround；TypeScript 因此必须停留在 6.x，`@astrojs/check` 尚未适配 7.x。
