# 霓虹碎片 / Neon Fragments

赛博朋克风格的**纯静态博客**，基于 **Astro 7 内容集合 + bun**。没有 React、Hono、SSR 运行时、客户端路由，也没有对外 API 或 Serverless 函数：文章放在 `src/content/posts/`，由 Astro Content Layer 在构建期校验、缓存并交给页面、RSS、sitemap 与 OG 分享图预渲染到 `dist/`；浏览器里的搜索、标签筛选与分页由原生 JavaScript 直接操作预渲染的 DOM。

## 运行环境

| 项目 | 版本 | 约定位置 |
| :--- | :--- | :--- |
| bun | 1.4.4 | `package.json#packageManager`、`bun.lock`、CI `setup-bun` |
| bun 运行时兼容的 Node | 26.3.0 | bun 1.4.4 内置；满足 Astro 7 的 `>=22.23.4` |
| EdgeOne Pages 云端 Node | 24.5.0 | `edgeone.json#nodeVersion`（平台预装，仅为安装 bun 提供 npm） |
| Astro | 7.4.12 | `astro.config.mjs` |
| TypeScript | 6.0.3 | `@astrojs/check` 的 peer 只允许 5/6，7.x 暂不能升 |

仓库只使用 bun：包管理、TypeScript 执行、测试（`bun test`）与 CI 全部由 bun 提供，`bun.lock` 是唯一锁文件。Astro CLI 通过 `bun run --bun` 强制在 bun 运行时执行（否则 `#!/usr/bin/env node` 会落到系统 Node；bun 模拟 Node 26.3.0，满足 Astro 7）。按 Astro 官方建议，构建期依赖统一放在 `package.json#dependencies`，不再拆分 `devDependencies`。不要再引入 pnpm / npm / yarn 的锁文件。

**依赖基线（2026-11-15）**：全部依赖已对齐到 registry 最新版（astro 7.4.12、vite 8.3.8、tailwindcss 4.3.5、marked 18.2.0、zod 4.6.7、satori 0.63.2、oxlint 1.93.0、@types/node 26.6.6 等）。唯一例外是 TypeScript 停留在 6.x 最新的 6.0.3：`@astrojs/check@0.9.12` 的 peer 是 `^5 || ^6`，升级到 7.0.2 会让 `astro check` 失效。

EdgeOne Pages 只提供预装 Node（官方清单含 `24.5.0`），因此根目录**不提交 `.nvmrc`**：平台会优先按它切换版本，写非预装版本会在安装依赖前报 `Failed to switch to Node.js x`。云端仍保留 `nodeVersion: 24.5.0`，只用于 `npm i -g bun@1.4.4`；实际构建由 bun 运行时完成，不依赖平台 Node 版本。

```bash
bun install
cp .env.example .env.local   # 可选：设置 SITE_URL
bun run dev                  # http://localhost:3000，内容集合自动热更新
bun run build                # astro build → postbuild（无需单独编译内容）
```

## 目录结构（Astro 官方规范）

只有 `src/pages/` 是 Astro 的保留目录，其余按官方推荐约定组织；所有项目源码都收进 `src/`，仓库根目录只留配置与构建工具脚本。

```
├── astro.config.mjs          # Astro 配置（静态输出、Tailwind 插件、站点地址）
├── edgeone.json              # EdgeOne Pages 构建 / 缓存头 / 域名 301 / clean URL 配置
├── package.json  bun.lock  tsconfig.json
├── public/                   # 不参与构建、原样复制的静态资源
│   ├── avatar.svg  cover.svg
│   └── fonts/                # 浏览器实际加载的拉丁字体（约 1.1MB）
├── src/
│   ├── assets/og-fonts/      # 仅构建期给 OG 图用的中文字体（约 20MB，不进 dist）
│   ├── components/           # 可复用 .astro 组件
│   ├── content/posts/*.md    # 内容集合的文章原文
│   ├── content.config.ts     # 内容集合定义（glob loader + zod schema）
│   ├── consts.ts             # 站点常量、默认作者、导航项
│   ├── data/icons.json       # 从 lucide（ISC）提取的静态 SVG
│   ├── layouts/              # BaseLayout.astro，统一 head / 元信息
│   ├── lib/                  # 构建期纯逻辑
│   │   ├── feeds.ts  markdown.ts  ogImage.ts  permalink.ts
│   │   ├── post-schema.ts  post-utils.ts  posts.ts  site.ts
│   ├── pages/                # 文件路由与静态端点
│   ├── scripts/              # 浏览器端原生 JavaScript
│   ├── styles/global.css     # Tailwind 4 主题与赛博朋克样式
│   └── types.ts              # 共享类型
├── scripts/                  # 非 Astro 源码的构建工具（Node/bun 脚本）
│   ├── check-edgeone.mjs  dist-pages.mjs  env.mjs  postbuild.mjs
├── tests/                    # bun test 单元测试（直接执行 TypeScript）
└── .github/                  # CI 与协作说明
```

`tsconfig.json` 提供 `@/*` → `src/*` 别名。之前的 `_posts/`、`services/posts.json`、根目录 `config.ts` / `constants.ts` / `types.ts` / `lib/` 已全部并入 `src/`，不再保留。

## 写文章（内容集合）

**在 `src/content/posts/` 新建一个 `.md` 文件即可，不需要注册路由、不需要手动编译 JSON。** `src/content.config.ts` 用 `glob()` loader 扫描该目录，`postSchema` 校验 frontmatter，Astro 在构建期把条目写进 Content Layer 的 data store；所有页面通过 `src/lib/posts.ts` 的 `getPosts()`（`getCollection('posts')`）读取。

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
| `title` | `string` | 标题，**必填**（去掉首尾空白后不能为空） | — |
| `date` | `string \| Date` | 发布日期，**必填**；按 UTC 生成 `/YYYY/MM/DD/slug` | — |
| `slug` | `string` | URL slug，只允许字母、数字、`-`、`_`，全站唯一 | 集合条目 id（文件名） |
| `description` | `string` | 列表摘要与 SEO 描述 | 正文前 200 字 |
| `author` | `string \| object` | 作者名或档案对象；对象会与默认档案合并 | 站点默认作者 |
| `tags` | `string[]` | 标签数组 | `[]` |
| `image` | `string` | 封面地址 | `/cover.svg` |
| `readTime` | `string` | 阅读时长 | 按中文字数/英文词数估算 |
| `isGlitch` | `boolean` | 文章卡片的故障特效 | `false` |
| `id` | `string` | 唯一标识 | slug |

`date` 设为必填是因为永久链接依赖它：缺省值用「构建时间」会让每次构建产出不同 URL。`getPosts()` 会检查重复 slug / permalink 并让构建直接失败。

```bash
bun run dev       # 新增/修改 .md 后集合自动同步
bun run build     # 生成页面、订阅源、sitemap 与分享图
```

## 从 Obsidian 一键发布

`bun run publish` 把「挑笔记 → 转换 → 构建 → 提交 → 推送」收成一条命令，实现在 `scripts/publish-obsidian.mjs`。默认库是 `~/Documents/Obsidian Vault`（可用 `OBSIDIAN_VAULT` 或 `--vault` 改），每次自动取修改时间最新的 `.md`。

```bash
bun run publish                     # 发布 / 更新最新一篇：构建 + commit + push github/main
bun run publish --dry-run           # 只预览会生成什么，不落盘、不构建、不提交
bun run publish --no-push           # 本地提交，先不推送
bun run publish --file "笔记.md"     # 指定 vault 内的笔记（相对路径或绝对路径）
bun run publish --slug my-post      # 指定 slug，也可用来强制更新某篇
bun run publish --tags AI,随笔      # 覆盖新建文章的标签（默认「随笔」）
bun run publish --full              # 额外跑 typecheck / lint / test / check:edgeone
```

| 环节 | 行为 |
| :--- | :--- |
| 选文章 | 全库 `.md` 按修改时间倒序，跳过 `.obsidian`、空白 / 未写完的笔记与写作项目里 `binder-status: draft` + `word-count: 0` 的空模板；想强制发布某篇用 `--file` |
| frontmatter | 新建时生成 `title / slug / date / tags / description`；标题取笔记 frontmatter 或文件名，slug 取标题里的英文数字 token（纯中文退回 `post-YYYYMMDD`），摘要从正文压成一行短句，避免 OG 卡片裁字 |
| 配图 | `![[附件]]` 转成 `![alt](/images/...)` 并复制到 `public/images/`，第一张命名为 `<slug>.<ext>`，重复发布不会堆积文件 |
| 更新 | `scripts/obsidian-publish-map.json` 记录「笔记 → slug」；同一篇再跑会沿用原 `slug` 与 `date`，**永久链接不变**，且只替换标题与正文，手工调过的 `description` / `tags` / `image` 全部保留 |
| 校验 | 默认只跑 `bun run build`（内容集合 schema 校验 + 页面 / RSS / sitemap / OG 图），约 2 秒；`--full` 才跑全套质量卡口 |
| 发布 | 内容无变化直接跳过提交；否则只 `git add` 本次相关文件、commit、push `github/main` 触发 EdgeOne 自动部署 |

笔记改了想同步，直接再跑一次 `bun run publish` 即可；想调整摘要、标签、封面，直接编辑 `src/content/posts/` 里生成的 `.md`，脚本更新时不会覆盖这些字段。换了 Obsidian 库就设 `OBSIDIAN_VAULT=/path/to/vault`（或 `--vault`），笔记改了名用 `--slug <原 slug>` 指回已发布的文章；库里只剩空笔记时脚本会列出候选并停下，不会误发。云端构建约 30 秒生效，这段是 GitHub → EdgeOne 的固有耗时，本地流程已压到一条命令。

## 架构

```
构建期  src/content/posts/*.md
          │ src/content.config.ts：glob() loader + zod frontmatter 校验
          ▼
        Astro Content Layer（data store：类型安全、校验、缓存）
          │ getPosts() → getCollection('posts') → BlogPost[]
          │   ├─ src/lib/markdown.ts：marked + highlight.js + sanitize-html
          │   └─ src/lib/permalink.ts：UTC 固定链接
          ├── 页面 getStaticPaths() ─► 首页、/net、/gear、文章页、404
          ├── 静态端点 ────────────► rss.xml / sitemap.xml / robots.txt
          │                          card/YYYY/MM/DD/slug.png（satori + resvg）
          └── scripts/postbuild.mjs ► 平铺 .html 副本（clean URL 兜底）
运行期  EdgeOne Pages 静态托管（纯文件，无函数、无常驻服务）
          └─ 浏览器：原生 JS 负责搜索、标签、分页、代码块工具栏
```

### 几处关键设计

- **内容集合是唯一数据源**：文章不再先编译成 `services/posts.json`，构建脚本也不维护中间清单。`scripts/postbuild.mjs` 与部署自检通过 `scripts/dist-pages.mjs` 直接扫描 `dist/YYYY/MM/DD/slug/index.html`。
- **正文渲染仍走自建管线**：集合负责内容组织、frontmatter 校验、类型与缓存；`entry.body` 交给 `src/lib/markdown.ts` 渲染，以保留 sanitize-html 的标签/属性白名单消毒和现有 highlight.js 视觉。若改用 Astro 的 `render(entry)`，需要另接 `rehype-sanitize` 并重做代码高亮样式。
- **永久链接**：`permalink` 在构建期按 UTC 生成一次，页面、sitemap、RSS、OG 图与 canonical 全部只读 `post.permalink`。日期段写错的链接不再有 301 兜底，静态托管会直接返回 404。
- **站点地址**：`scripts/env.mjs` 统一解析 `SITE_URL`（shell 环境变量优先，其次 `.env.local`），Astro 配置与页面渲染共用；换域名需要重新构建。
- **文章左侧「传输数据」**：`src/components/PostDataPanel.astro` 展示发布日期、阅读时间、标签数与 `.MD` 格式标识，数值全部来自内容集合；只渲染一份，挂在 `BaseLayout` 的 `rail` 插槽（站点左侧栏），该侧栏是 `hidden lg:block`，所以移动端不显示此模块。`.MD` 只是纯文本状态显示，不是链接，站点也不发布额外的原始 Markdown 产物。它与作者卡共用 `global.css` 的 `.cyber-panel` / `.cyber-panel__body`：同一套 1px 灰描边、右下切角与极淡网格底，外框只定义一份。
- **内容安全**：frontmatter 由 zod 校验，类型不对直接让构建失败；Markdown 产出的 HTML 经白名单消毒后才用 `set:html` 注入页面。
- **零框架交互**：搜索 / 标签 / 分页直接对预渲染的卡片做显隐，**不发起任何网络请求**，无 JS 时全部文章可见；代码块工具栏是原生 JS。图标是构建期提取的静态 SVG，不引入图标库。
- **OG 分享图**：satori 接受 `{ type, props }` 形状的节点对象，因此用 `src/lib/ogImage.ts` 的 `h()` 构造节点树，**不需要 JSX 或 React**；resvg 输出 PNG。
- **移动端顶栏与正文标题**：`md` 以下只显示 `SAIBO.ME`（Rajdhani 斜体粗体不变）与黄色开口线框（搜索 / 竖线 / 菜单），导航链接和在线状态留在桌面端；搜索按钮聚焦首页 `[data-post-search]`，在文章页则跳 `/#search`。logo 用 8s CSS 周期实现「静止 7s + glitch 1s」，`prefers-reduced-motion` 下自动禁用。正文 `h2` 为黄色粗体带小方块（28px）、`h3` 为青色粗体（24px），样式集中在 `global.css`；文章大标题手机端 36px、桌面 48px，保证任何视口都大于二级标题。
- **字体分目录**：浏览器字体与构建期字体分开存放，避免 20MB 中文字体被当成静态资源发布。

| 目录 | 内容 | 是否进入 `dist/` |
| :--- | :--- | :--- |
| `public/fonts/` | Rajdhani 500/600/700、Share Tech Mono 400（约 1.1MB） | 是 |
| `src/assets/og-fonts/` | Noto Sans SC 400/700（约 20MB，仅生成 OG 图时用） | **否** |

`src/lib/ogImage.ts` 会依次在 `src/assets/og-fonts`、`public/fonts` 中查找字体；设置 `OG_FONT_DIR` 时改为只从该目录读取，此时该目录需包含全部 4 个字体文件。

## 部署

产物是纯静态站点 `dist/`，**唯一部署通道是腾讯云 EdgeOne Pages 的 GitHub 绑定项目自动构建**（`git push github main` 即触发部署）：没有 Docker 镜像、没有自托管静态服务、没有 Cloud Functions，也不需要 `release.zip`。

仓库已提交 `edgeone.json`，构建参数不需要在控制台手填。`bun run build` 会额外生成平铺 `.html` 副本（兼容平台不自动展开目录索引的情况）。

> **只保留一个部署项目，不要直传 `dist/`。** 正式站的判定标准是：项目来源为 `Github`、绑定 `saibo.me` / `www.saibo.me`、读取仓库根 `edgeone.json`（缓存头、clean URL、`www → 主域名` 301 都由它生效）。用连接器或 CLI 把 `dist/` 直接上传成 Upload 项目时，同名项目因来源为 GitHub 不支持直传，只能另起新项目；结果会多出一份不随 push 更新、不含任何项目配置、只有带 `eo_token` 且会过期的 `*.edgeone.cool` 预览域名的静态副本。调试期遗留的 `neon-fragments-static` 直传项目已删除，之后不再重新创建。

控制台（国内站 `https://console.cloud.tencent.com/edgeone/pages`）：

1. 开通 Pages → 绑定 GitHub → 授权 EO Pages → 选择 `saibome/neon-fragments-cyberpunk-blog`，部署分支 `main`。
2. 在「项目设置 → Node.js 版本」选 `24.5.0`（若之前手动选过 26 务必改掉；`edgeone.json#nodeVersion` 会覆盖同名设置）。再添加环境变量 `SITE_URL=https://your.domain`（构建期固化到 canonical / feed / 分享图）。保存后**需要 push `main` 或点「重新部署」才会生效**；之后 push `main` 自动重部署。
3. 选「全球（含中国大陆）」加速区并绑定自定义域名需要 ICP 备案；仅面向海外可选「全球（不含中国大陆）」。
4. **两个域名必须绑定到同一个 Pages 项目**：`saibo.me`（主域名）和 `www.saibo.me`。`SITE_URL` 固定为 `https://saibo.me`，canonical / sitemap / RSS / OG 图都只输出主域名地址。

`edgeone.json` 覆盖的配置（优先级高于控制台里的同名设置）：

| 配置项 | 值 | 说明 |
| :--- | :--- | :--- |
| 根目录 | `./`（默认） | 仓库根 |
| 安装命令 | `npm i -g bun@1.4.4 && bun install --frozen-lockfile` | 平台预装 Node 24.5.0 自带 npm；固定 bun 版本后按 `bun.lock` 安装 |
| 构建命令 | `bun run build` | `bun run build:edgeone` 是「构建 + 自检」别名 |
| 输出目录 | `dist` | Astro 静态产物 |
| Node.js 版本 | `nodeVersion: 24.5.0` | 平台只支持预装版本（14.21.3 / 16.20.2 / 18.20.4 / 20.18.0 / 22.x / 24.5.0 等）。该版本仅为安装 bun 提供 npm；根目录**不提交 `.nvmrc`** |
| 缓存 / 安全头 | `/_astro/*`、`/fonts/*` 长缓存；全局 nosniff、Referrer-Policy | HTML 不设长缓存，避免更新后读到旧页 |
| 域名归一化 | `redirects: $wwwhost → $host`, `statusCode: 301` | 把 `www.saibo.me` 永久重定向到 `saibo.me`（保留路径与查询参数）；仅对自定义域名生效，`*.edgeone.cool` 预览链接不受影响。不要同时加 `$host → $wwwhost`，否则两个域名互跳成环 |
| clean URL 兜底 | `/net`、`/gear` → 同名 `.html` | 兼容平台不自动展开目录索引的情况 |

若云端 `npm i -g` 被网络策略拦截，可在控制台把安装命令临时改为 `bun install --frozen-lockfile`，直接使用平台预装的 bun（需确认其版本能读取文本格式的 `bun.lock`）。

部署前可本地验证：

```bash
bun run build:edgeone   # 构建并执行 scripts/check-edgeone.mjs
bun run check:edgeone   # 只自检：内容集合、产物完整性、配置约束、旧结构没有回退
```

`check:edgeone` 会卡住易复发的问题：`nodeVersion` 不是预装版本、`engines` 挡住 24.5.0、误提交 `.nvmrc`、`bun.lock` 缺失或安装/构建命令回退到 pnpm、`www → 主域名` 的 301 规则缺失或被写成互跳、`src/content.config.ts` 缺失或写错、文章数与 dist 文章页不一致、旧目录（`_posts/`、`services/posts.json`、根目录散落源码）回退、20MB 构建期字体重新进入 `dist/fonts`。CI 也会在每次 push 后执行它。

> 重新部署后若日志仍出现 `Failed to switch to Node.js x`：确认推送后的仓库根目录已无 `.nvmrc`，把「项目设置 → Node.js 版本」确认为 `24.5.0`，并关闭「使用构建缓存」做一次无缓存部署（旧缓存可能残留上一版的 `.nvmrc`）。配置改动只在下一次部署生效，保存设置本身不会触发构建。

首次部署后建议逐项核验：首页 `/`、文章页 `/YYYY/MM/DD/slug`、静态页 `/net` 与 `/gear`、`/rss.xml`、`/sitemap.xml`、`/card/YYYY/MM/DD/slug.png`（PNG）、未知页（404）。若文章页 404，检查平台是否自动展开 `目录/index.html`（仓库同时提供了 `/YYYY/MM/DD/slug.html` 平铺副本），必要时在 `edgeone.json` 的 `rewrites` 中补对应规则。

域名归一化用 `curl -I 'https://www.saibo.me/2026/11/14/hello-night-city/?ref=test'` 核验：应返回 `301` 且 `Location` 为 `https://saibo.me/2026/11/14/hello-night-city/?ref=test`；`https://saibo.me/` 必须仍是 `200`。规则改动随下一次部署生效，配置本身不会立刻触发构建。

环境变量：

| 变量 | 用途 | 默认 | 生效阶段 |
| :--- | :--- | :--- | :--- |
| `SITE_URL` | canonical / sitemap / RSS / OG 图的公开地址 | `https://saibo.me` | 构建期 |
| `OG_FONT_DIR` | OG 图字体目录，留空按上表自动探测 | 留空 | 构建期 |

`.env.local` 已被 git 忽略，`.env.example` 是可提交的模板。

## 质量卡口

```bash
bun run typecheck       # astro check（bun 运行时）：检查 .astro / .ts / 内容集合类型
bun run lint            # oxlint（忽略 .astro 生成的类型缓存）
bun run test            # bun test：集合 schema、文章归一化、消毒、目录规范、EdgeOne 配置
bun run build           # 完整静态构建
bun run check:edgeone   # EdgeOne 部署前自检（CI 亦会执行）
```

## 贡献者

| 贡献者 | 说明 |
| :--- | :--- |
| [@saibome](https://github.com/saibome) | 仓库所有者；Astro / bun 迁移、内容集合改造、站点精简与 EdgeOne 部署 |
| [@ShinChven](https://github.com/ShinChven) | 原始项目与早期模板作者 |

早期提交用了未关联 GitHub 的本机占位邮箱，`.mailmap` 已把它们统一映射到 `saibome`，让 `git log` / `git shortlog` / `git blame` 显示正确归属。GitHub 的贡献者统计只认提交里的作者邮箱（不读取 `.mailmap`），因此本仓库的 git 身份固定为 `saibome <1995915+saibome@users.noreply.github.com>`，后续提交会自动计入仓库所有者账号。

## 取舍

- 首页把所有文章卡片预渲染进 HTML（利于 SEO），搜索 / 分页 / 标签在客户端完成；文章特别多时可改为静态分页路由。
- 站点没有运行时 SSR，`SITE_URL` 在构建期固化；跨域名复用同一份构建产物不适用。
- 内容集合负责内容组织与校验，但正文仍由 `src/lib/markdown.ts` 渲染，以保留白名单消毒与既有高亮样式；未使用 Astro 的 `render(entry)`。
- 没有对外 API、动态查询、Cloud Functions 与错误日期 301：站点前端从不请求接口，静态托管足够；需要这些能力时应作为独立服务接入，而不是重新塞回仓库。
- 只保留 RSS 一种订阅格式；Atom 与 `/data`、`/api`、`/serve.mjs`、Docker 打包等模板遗留功能已移除。
- Astro CLI 的 shebang 会落到系统 Node，因此用 `bun run --bun` 强制走 bun 运行时；TypeScript 必须停留在 6.x，`@astrojs/check` 尚未适配 7.x。
