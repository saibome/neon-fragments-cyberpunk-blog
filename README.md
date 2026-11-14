# 霓虹碎片 / Neon Fragments

赛博朋克风格的 SSR 博客。**程序与内容分离**：Markdown 在构建期编译成 JSON，运行时由 Hono 在 Node.js 上服务端渲染，浏览器 hydrate 后接管路由。

## 运行环境

| 项目 | 版本 | 约定位置 |
| :--- | :--- | :--- |
| Node.js | 26 | `.nvmrc`、`package.json#engines`、`Dockerfile`、CI |
| pnpm | 12.18.0 | `package.json#packageManager`、`pnpm-lock.yaml` |

仓库只使用 pnpm，请不要用 `npm ci` / `yarn install`。

```bash
pnpm install
cp .env.example .env.local   # 可选，本地环境变量
pnpm dev                     # http://localhost:3000
```

生产构建与启动：

```bash
pnpm build                   # build:content → build:client → build:server
pnpm start                   # node dist/server/index.js
```

## 架构

```
构建期  _posts/*.md
          │ gray-matter + zod 校验
          │ marked + highlight.js + sanitize-html 消毒
          ▼
        services/posts.json  (含按 UTC 生成的 permalink)
          │
运行期  Hono (Node.js) ── renderToString + Helmet + __INITIAL_DATA__ ──► 首屏 HTML
          │                                                          │
          ├─ /api/posts  /api/posts/:slug  /api/tags                  │ hydrateRoot
          ├─ /rss.xml  /atom.xml  /sitemap.xml  /robots.txt           ▼
          └─ /card/YYYY/MM/DD/slug.png（动态生成 OG 分享图）      客户端 SPA
```

### 几处关键的一致性设计

- **永久链接**：`permalink` 在构建期按 UTC 生成，服务端、浏览器、sitemap、RSS、OG 图都只读 `post.permalink`；日期段不匹配的 URL 会 301 到规范地址，避免重复内容。
- **站点地址**：服务端读运行时 `SITE_URL`，并通过 `__INITIAL_DATA__` 注入浏览器；canonical、RSS、分享链接不再各写一份域名。
- **首屏一致**：`AppRoutes` 的页面组件同步导入，服务端与浏览器渲染同一棵组件树。这里刻意不用 `React.lazy` —— 它会在 hydrate 首帧落到 Suspense fallback，把 SSR 内容替换掉。若将来要恢复按路由拆包，需要同时升级到流式 SSR 与 SSR-aware 预加载。
- **首屏数据**：放在 `<script type="application/json" id="__INITIAL_DATA__">` 中，不注入可执行脚本。
- **HTML 模板**：客户端构建产出的 `index.html` 会被移到 `dist/template/`，既不会覆盖 SSR 首页，也不会被静态服务直接下载；`build:client` 用 Node 脚本搬移，Windows 可用。
- **静态资源**：封面与头像是仓库内的 SVG，不依赖外部图床。

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

frontmatter 由 zod 校验：类型不对（例如把 `tags` 写成字符串）会直接让构建失败，而不是留到线上运行时崩溃。Markdown 产出的 HTML 会经 sanitize-html 白名单消毒，才允许进入 `dangerouslySetInnerHTML`。

```bash
pnpm build:content   # 只重编译内容
```

## 部署

主运行形态是 **Node.js 服务**：服务端依赖 `node:fs`、`@hono/node-server` 与 `resvg-js` 原生模块，不能直接跑在 Cloudflare Workers 之类的边缘运行时上。目标是 EdgeOne Pages 这类「静态 + 函数」平台时，请走下面的构建期预渲染路径，不要直接上传 `dist/server`。

### Docker / 发布包

```bash
docker build -t neon-fragments .
docker run -p 3000:3000 -e SITE_URL=https://your.domain neon-fragments
```

GitHub Actions 会在 push / PR 上以 Node 26 + `pnpm install --frozen-lockfile` 执行 `typecheck → lint → test → build`，并把包含**真实文章数据**的 `dist/` 与 `services/posts.json` 打进 `release.zip`。解压后：

```bash
pnpm install --prod --frozen-lockfile
node dist/server/index.js
```

### 腾讯云 EdgeOne Pages（静态资源 + Cloud Functions）

`pnpm build:edgeone` 复用 Vite 编译好的 SSR bundle（`EDGEONE_PRERENDER=1` 时只渲染、不监听端口），把首页、静态页、文章页、rss/atom/sitemap/robots 和分享卡片 PNG 全部落成静态文件到 `dist/edgeone/`；`cloud-functions/[[default]].js` 只兜底 `/api/*`、错误日期 301 与 404，不依赖 hono、`node:fs` 或原生模块。文章数据构建期固定，因此预渲染与运行时 SSR 等价，但更适合边缘分发。

控制台（国内站 `https://console.cloud.tencent.com/edgeone/pages`）：

1. 开通 Pages → 绑定 GitHub → 授权 EO Pages → 选择本仓库，部署分支 `main`。
2. 在「项目设置 → 构建部署配置」填写：

   | 配置项 | 值 |
   | :--- | :--- |
   | 根目录 | `./` |
   | 安装命令 | `npm i -g pnpm@12.18.0 && pnpm install --frozen-lockfile` |
   | 构建命令 | `pnpm build:edgeone` |
   | 输出目录 | `dist/edgeone` |
   | Node.js 版本 | `26`（`.nvmrc` 会自动下载；该版本不预装包管理器，故安装命令里显式安装 pnpm） |
   | 环境变量 | `SITE_URL=https://your.domain` |

3. 保存并开始部署；之后 push `main` 会自动重部署。`cloud-functions/` 位于仓库根，由 Pages 按 Cloud Functions 约定识别。
4. 选「全球（含中国大陆）」加速区并绑定自定义域名需要 ICP 备案；仅面向海外可选「全球（不含中国大陆）」。

改动 `_posts/` 后请本地执行一次 `pnpm build:edgeone` 并提交更新后的 `cloud-functions/data.js`，确保 API 兜底数据与文章一致（Pages 构建时也会重新生成该文件）。

环境变量：

| 变量 | 用途 | 默认 |
| :--- | :--- | :--- |
| `SITE_URL` | canonical / sitemap / RSS / OG 图的公开地址 | `https://saibo.me` |
| `PORT` | 生产端口（仅 Node 服务） | `3000` |
| `CONTENT_DIR` | 内容源目录（仅构建期） | `_posts` |
| `OG_FONT_DIR` | OG 图字体目录，留空自动探测 | 自动 |

`.env.local` 已被 git 忽略，`.env.example` 是可提交的模板。

## 质量卡口

```bash
pnpm typecheck      # tsc --noEmit
pnpm lint           # oxlint
pnpm test           # node:test：永久链接、内容校验/消毒、列表查询、EdgeOne 函数
pnpm build          # Node 服务完整构建
pnpm build:edgeone  # EdgeOne Pages 预渲染产物
```

## 目录

- `_posts/` — Markdown 原文（入库）
- `scripts/` — 内容编译、消毒校验、模板搬移、EdgeOne 预渲染
- `server/` — Hono 应用、SSR 入口路由、数据加载、动态 OG 图
- `cloud-functions/` — EdgeOne Pages 兜底函数与构建期生成的数据模块
- `components/` `contexts/` — React UI 与共享上下文
- `lib/` — 前后端共用的纯函数（permalink、列表查询）
- `config.ts` `types.ts` — 站点默认配置与共享类型
- `tests/` — 单元测试
- `dist/` — 构建产物：`client/`（静态资源）、`server/`（SSR 服务）、`template/`（HTML 模板）、`edgeone/`（预渲染站点）
