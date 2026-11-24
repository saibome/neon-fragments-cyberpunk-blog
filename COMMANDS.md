# 命令速查（完整清单）

> 霓虹碎片 / Neon Fragments —— Astro 7 + bun 纯静态博客。
> **记不住就记三条**：`bun run dev`（本地预览）、`bun run publish`（发布 / 更新 Obsidian 最新一篇）、`bun run publish --all`（一次发布多篇）。部署只有 `git push github main`，脚本已内置，不用手动执行。
> 设计说明、目录结构与取舍见 [README.md](./README.md)；本文只收命令，全部在项目根目录执行。

---

## 0. 环境准备（一次性）

```bash
bun --version                        # 期望 1.4.4
bun install --frozen-lockfile        # 按 bun.lock 安装（CI / 云端同款命令）
cp .env.example .env.local           # 可选：自定义 SITE_URL / OG_FONT_DIR
```

只用 bun，不要 `npm install` / pnpm / yarn，不要引入其它锁文件，也不要提交 `.nvmrc`。

| 环境变量 | 作用 | 默认 | 生效阶段 |
| :--- | :--- | :--- | :--- |
| `SITE_URL` | canonical / sitemap / RSS / OG 图的公开地址，也可写进 `.env.local` | `https://saibo.me` | 构建期 |
| `OG_FONT_DIR` | OG 图字体目录，留空则自动探测 | 留空 | 构建期 |
| `OBSIDIAN_VAULT` | Obsidian 库路径，等价于 `publish --vault` | `~/Documents/Obsidian Vault` | 发布脚本 |

```bash
SITE_URL=https://saibo.me bun run build                       # 临时覆盖站点地址
OBSIDIAN_VAULT="$HOME/Documents/My Vault" bun run publish --dry-run   # 临时换库
```

---

## 1. 本地开发

```bash
bun run dev        # http://localhost:3000；新增 / 修改 .md 后内容集合自动热更新
bun run build      # astro build + postbuild：页面 / RSS / sitemap / OG 图 → dist/
```

仓库没有 `preview` / `start` 脚本，也不需要 `build:content`：文章是内容集合，构建期直接读 `src/content/posts/*.md`。产物是纯静态文件 `dist/`。

---

## 2. 发布 Obsidian 文章（核心）

`bun run publish` 是 `bun scripts/publish-obsidian.mjs` 的别名，参数为透传，可任意组合。

### 2.1 全部命令

```bash
bun run publish --help                                  # -h 亦可：打印内置用法与默认 vault
bun run publish                                         # 发布 / 更新最新一篇：build + commit + push github/main
bun run publish --dry-run                               # 只预览（含正文前 20 行），不写盘 / 不构建 / 不提交
bun run publish --no-push                               # 写盘 + build + 本地 commit，但不推送
bun run publish --full                                  # 发布时额外跑全套质量卡口
bun run publish --all                                   # 批量：库里全部可发布笔记，一次 build + 一次 commit + 一次 push
bun run publish --all --dry-run                         # 批量预览：列出整批「新建 / 更新 / 无变化」清单
bun run publish --all --no-push                         # 批量写盘 + 一次 build + 本地 commit，不推送
bun run publish --all --tags "AI,随笔" --summary "摘要"   # 批量统一覆盖标签与摘要
bun run publish --tags "AI,随笔" --dry-run               # 显式覆盖标签（优先于笔记 tags 属性）
bun run publish --file "随笔/某篇.md"                    # 指定笔记（vault 内相对路径或绝对路径）
bun run publish --slug my-custom-slug --dry-run          # 自定义 slug；配合 --file 可指回已发布文章做强制更新
bun run publish --title "标题" --tags "AI,随笔" --summary "一句话摘要"   # 覆盖标题 / 标签 / 摘要
bun run publish --file "新名字.md" --slug 原-slug         # 笔记改名后，更新回原来那篇文章
bun run publish --vault "/path/to/vault"                # 换 Obsidian 库（等价 OBSIDIAN_VAULT）
bun run publish --dry-run --vault "/path/to/vault"       # 换库后先预览
bun run publish --full --no-push                        # 全套卡口 + 本地提交，确认后再手动推送
```

### 2.2 参数表

| 参数 | 取值 | 默认 | 说明 |
| :--- | :--- | :--- | :--- |
| （无参数） | — | — | 取修改时间最新的一篇；已发布过的笔记走更新，永久链接不变 |
| `--all` | 标志 | 关 | 批量处理库里全部有实质内容的笔记；空白 / 未写完的自动跳过；同批 slug 撞车自动加 `-2` |
| `--file <路径>` | 字符串 | — | 指定单篇笔记；**空白 / 极短笔记只有用它才能强制发布** |
| `--slug <slug>` | 字符串 | 标题生成 | 覆盖 slug；更新已发布文章时用来指定目标 |
| `--title <标题>` | 字符串 | 笔记 frontmatter 或文件名 | 覆盖标题 |
| `--tags <a,b>` | 中英文逗号分隔 | 笔记 `tags` 属性 | 显式覆盖标签，优先级最高；`--all` 时作用于整批；不传则读笔记 tags，笔记没写时新建默认「随笔」、更新保留原标签 |
| `--summary <文本>` | 字符串 | 正文压成的一行短句 | 覆盖**新建**文章的摘要；`--all` 时作用于所有新建文章 |
| `--vault <路径>` | 路径 | `~/Documents/Obsidian Vault` | 覆盖库路径；也可用 `OBSIDIAN_VAULT` |
| `--dry-run` | 标志 | 关 | 只预览，不写任何文件、不构建、不提交；批量时列整批清单 |
| `--no-push` | 标志 | 关 | 本地提交但不推送，之后用 `git push github main` 补推 |
| `--full` | 标志 | 关 | 发布流程里额外跑 `typecheck / lint / test / check:edgeone` |
| `--help` / `-h` | 标志 | — | 打印脚本内置用法 |

**互斥规则**：`--all` 不能与 `--file` / `--slug` / `--title` 同用（这三个只作用于单篇），同时传入会直接报错。`--tags` / `--summary` / `--dry-run` / `--no-push` / `--full` / `--vault` 都可以和 `--all` 组合。

**笔记属性怎么被识别**：脚本读笔记的 `title` / `description` / `tags` 三个属性。`tags` 支持 Obsidian Properties 面板的标准块序列，统一转成 Astro 内容集合能识别的 `tags: [AI, 随笔]` 数组：

```yaml
tags:
  - AI
  - 随笔
```

也认 `tags: [AI, 随笔]`（行内数组）、`tags: AI,随笔`（逗号分隔）、`tags: #AI #随笔`（`#` 前缀）与 `tag:` 别名，重复标签自动去重。优先级：`--tags` > 笔记 tags > 新建默认「随笔」；更新已发布文章时，笔记写了 tags 就同步过来，没写则保留文章里手工调过的标签。笔记的 `slug` / `date` 属性暂不参与（slug 由标题生成、date 取发布当天），避免含空格的自定义 slug 或旧日期改变永久链接。

### 2.3 按场景查命令

| 想做的事 | 命令 |
| :--- | :--- |
| 日常发布 / 同步最新一篇 | `bun run publish` |
| 发之前看一眼会生成什么（含笔记 tags 是否生效） | `bun run publish --dry-run` |
| 在 Obsidian 里改了 tags，想同步到站点 | 直接再跑 `bun run publish`（笔记写了 tags 就会覆盖） |
| 不用笔记 tags，临时统一指定标签 | `bun run publish --tags "AI,随笔"` |
| 一次写好了多篇 | `bun run publish --all --dry-run` → 确认后 `bun run publish --all` |
| 只发指定的某一篇 | `bun run publish --file "随笔/某篇.md"` |
| 笔记改名后仍更新原链接 | `bun run publish --file "新名字.md" --slug <原slug>` |
| 换了一台机器 / 换了库 | `OBSIDIAN_VAULT=/path/to/vault bun run publish`（或 `--vault`） |
| 只本地提交，稍后自己部署 | `bun run publish --no-push` → `git push github main` |
| 改了站点代码或依赖后发布 | `bun run publish --full`（或先跑第 3 节全套卡口） |
| 库里只剩空笔记，脚本停下 | 用 `--file` 指定，或先补完笔记内容 |
| 忘了参数 | `bun run publish --help` |

### 2.4 脚本内部到底跑了什么

| 阶段 | 默认 | `--full` |
| :--- | :--- | :--- |
| 内容校验 | `bun run build`（含内容集合 schema 校验、页面 / RSS / sitemap / OG 图生成，约 2 秒） | 依次 `bun run typecheck` → `lint` → `test` → `build` → `check:edgeone` |
| Git | `git add -- <本次文章 / 配图 / 映射表>` → `git commit -m "feat: ..."` → `git push github main` | 同左 |
| 无变化时 | 跳过提交与推送，提示「内容无变化」 | 同左 |

`--all` 会先为每篇算好发布计划，再统一写盘，**整批只跑一次 build、一次 commit、一次 push**，N 篇文章也只触发一次云端部署。更新已有文章时保留原 `date` / `slug` / `description` / `image` 与图片 alt，只替换标题、正文与笔记里明确写过的 `tags`（笔记没写 tags 时文章原有标签也保留）；`scripts/obsidian-publish-map.json` 记录「笔记 → slug」，不要手工删它。

---

## 3. 质量卡口

**改了站点代码、依赖或配置才需要跑全套；只发文章不需要**（`publish` 默认已跑 build）。

```bash
bun run typecheck && bun run lint && bun run test && bun run build && bun run check:edgeone
```

单独执行：

```bash
bun run typecheck       # astro check：.astro / .ts / 内容集合类型
bun run lint            # oxlint（忽略 .astro 生成的类型缓存）
bun run test            # bun test tests：schema、正文纯文本、目录规范、OG 边界、发布脚本等
bun run build           # 完整静态构建
bun run check:edgeone   # 部署前自检：产物完整性、edgeone.json 约束、旧结构没有回退
bun run build:edgeone   # = bun run build && bun run check:edgeone
```

### `bun run <name>` 展开成什么

| 命令 | `package.json` 中的实际执行 |
| :--- | :--- |
| `bun run dev` | `bun run --bun astro dev --port 3000 --host 0.0.0.0` |
| `bun run build` | `bun run --bun astro build && bun scripts/postbuild.mjs` |
| `bun run build:edgeone` | `bun run build && bun run check:edgeone` |
| `bun run check:edgeone` | `bun scripts/check-edgeone.mjs` |
| `bun run typecheck` | `bun run --bun astro check` |
| `bun run lint` | `oxlint . --ignore-pattern=.astro` |
| `bun run test` | `bun test tests` |
| `bun run publish` | `bun scripts/publish-obsidian.mjs` |

`bun run --bun` 是必须的前缀：Astro CLI 的 shebang 会落到系统 Node，强制走 bun 运行时才满足 Astro 7 的 Node 版本要求。

---

## 4. 部署

```bash
git push github main    # 唯一部署通道；publish 默认已包含，--no-push 后手动补这一条
```

push 后 EdgeOne Pages 按仓库根 `edgeone.json` 自动构建，约 30 秒生效。云端执行的是下面两条（**不用手敲**，仅供对照日志）：

```bash
npm i -g bun@1.4.4 && bun install --frozen-lockfile
bun run build
```

**不要直传 `dist/`**、不要另建 Upload 项目、不要手动改平台构建命令；控制台改了 `SITE_URL` 后需要 push 或点「重新部署」才生效。

---

## 5. 线上核验

```bash
# 单个 URL 的状态码
curl -s -o /dev/null -w '%{http_code}\n' https://saibo.me/

# 批量核验（把 DAY / SLUG 换成要检查的文章；示例为线上已有文章）
BASE=https://saibo.me
DAY=2026/11/23
SLUG=glm-5-4-coding-plan
for u in "$BASE/" "$BASE/$DAY/$SLUG/" "$BASE/card/$DAY/$SLUG.png" "$BASE/rss.xml" "$BASE/sitemap.xml"; do
  printf '%-72s ' "$u"
  curl -s -o /dev/null -w '%{http_code}\n' "$u"
done

# 文章配图是否被 Astro 优化成 /_astro/*.webp
curl -s "$BASE/$DAY/$SLUG/" | grep -o '/_astro/[^" ]*\.webp' | head -3

# www → 主域名 301：期望 301 且 Location 为 https://saibo.me/...（保留路径与查询参数）
curl -I 'https://www.saibo.me/2026/11/14/hello-night-city/?ref=test'
```

文章页、配图、OG PNG 应为 `200`；未知页为 `404`。EdgeOne 偶发 `000` / `502` 多为网络抖动，重试一次再判断。

---

## 6. 几条不要踩的线

- 不要给 `publish` 默认加 `--all`：不带参数就是「只发最新一篇」，批量要显式写 `--all`。
- 不要把 `--all` 和 `--file` / `--slug` / `--title` 混用。
- 不要手动修改已发布文章的 `date`：永久链接 `/YYYY/MM/DD/slug/` 依赖它。
- 不要把文章配图放回 `public/images/`：正文必须写 `./images/<slug>.<ext>`，交给 Astro 优化成 webp。
- 只发文章时不要跑全套 typecheck / lint / test —— 默认 build 已是内容校验卡口；改了依赖才需要全套。
- 不要引入 `pnpm` / `npm` / `yarn` 锁文件、`.nvmrc`，也不要把 `dist/` 直传到 EdgeOne。
