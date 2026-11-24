#!/usr/bin/env node
/**
 * 把 Obsidian 里的笔记发布 / 更新到本站。
 *
 *   bun run publish                    自动选最新一篇，构建 + 提交 + 推送
 *   bun run publish --all              批量：全部可发布笔记，一次构建 + 一次提交 + 一次推送
 *   bun run publish --dry-run          只预览，不写任何文件
 *   bun run publish --no-push          本地提交但不推送
 *   bun run publish --file "笔记.md"    指定 vault 内的笔记
 *   bun run publish --slug my-slug     覆盖 slug（也可用于强制更新已有文章）
 *   bun run publish --full             额外跑 typecheck / lint / test / check:edgeone
 *
 * 更新语义：同一篇笔记重复发布会沿用原 slug 与 date（永久链接不变），
 * 只替换标题、正文，以及笔记里明确写过的 tags；
 * frontmatter 里手工调过的 description / image 等仍保留。
 * 笔记 tags 支持 Obsidian Properties 的块序列、行内数组、逗号分隔与 # 前缀。
 * 新建时还读取笔记的 slug / date 属性并规范化（见 normalizeSlug / normalizeDate）。
 * 来源关系记录在 scripts/obsidian-publish-map.json，随仓库提交。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { resolveSiteUrl } from './env.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
// 配图与文章同目录，正文用相对路径引用，交给 Astro 的 Markdown 图片管线优化
const IMAGES_DIR = path.join(POSTS_DIR, 'images');
const MAP_FILE = path.join(HERE, 'obsidian-publish-map.json');
const DEFAULT_VAULT = path.join(os.homedir(), 'Documents', 'Obsidian Vault');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif']);
const WIKI_EMBED_RE = /!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g;

/* ---------- 可单测的纯函数 ---------- */

/** 从标题里取英文/数字 token 生成可读 slug；纯中文标题退回日期兜底。 */
export function slugFromTitle(title, date) {
  const tokens = (title.match(/[A-Za-z0-9][A-Za-z0-9._-]*/g) ?? [])
    .map(token => token.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean);
  const joined = tokens.join('-').slice(0, 60).replace(/-+$/, '');
  return joined || `post-${date.replace(/-/g, '')}`;
}

/** 与 src/lib/post-schema.ts 的 SLUG_RE 一致：字母数字开头，只允许字母数字、-、_。 */
const SLUG_MAX = 60;

/**
 * 把笔记里的 slug 属性规范化成内容集合接受的合法 slug：
 * 空格 / 中文 / 破折号等统一转连字符，超长在词边界截断。
 * 纯中文或纯符号等无法生成时返回 ''，由调用方回退到标题生成。
 */
export function normalizeSlug(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
  if (slug.length > SLUG_MAX) {
    const cut = slug.slice(0, SLUG_MAX);
    slug = cut.includes('-') ? cut.slice(0, cut.lastIndexOf('-')) : cut;
  }
  slug = slug.replace(/[-_]+$/g, '');
  return /^[a-z0-9][a-z0-9_-]*$/.test(slug) ? slug : '';
}

/**
 * 把笔记里的 date 属性规范化成 UTC 的 YYYY-MM-DD。
 * 接受 YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD 及后附时间；无效日期返回 '' 由调用方回退。
 */
export function normalizeDate(value) {
  const match = String(value ?? '').trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[T\s].*$)/);
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return '';
  return `${match[1]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** 生成单行短摘要，让 OG 卡片与 RSS 描述保持简洁（卡片裁切已在布局层修复）。 */
export function toSummary(body, limit = 34) {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[\[[^\]]*\]\]/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const stop = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('，'), cut.lastIndexOf('；'), cut.lastIndexOf(' '));
  const base = stop > limit * 0.6 ? cut.slice(0, stop + 1) : cut;
  return base.replace(/[，；、\s]+$/, '') + '…';
}

export function splitFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return match ? { frontmatter: match[1], body: match[2] } : { frontmatter: '', body: text };
}

/** 去掉 frontmatter 标量外层的成对引号。 */
function unquote(value) {
  return (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
    ? value.slice(1, -1) : value;
}

/**
 * 解析 Obsidian 笔记属性：既支持 key: value，也支持 Properties 面板常用的块序列
 * （tags:\n  - AI\n  - 随笔）。列表字段返回 string[]，其余返回 string。
 * 不引入 YAML 依赖，只覆盖笔记属性会出现的写法。
 * @returns {Record<string, string | string[]>}
 */
export function parseFrontmatter(frontmatter) {
  const out = {};
  const lines = frontmatter.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].trim();
    if (value) {
      out[key] = unquote(value);
      continue;
    }
    // 空值后跟缩进行：Obsidian Properties 的列表型属性（tags / aliases 等）。
    const items = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const item = lines[j].match(/^\s+-\s+(.*)$/);
      if (!item) break;
      const text = unquote(item[1].trim());
      if (text) items.push(text);
      i = j;
    }
    out[key] = items.length ? items : '';
  }
  return out;
}

/** 把 tags 的一段值切成标签：行内数组 / 逗号按逗号切，单个标签允许含空格（如 Coding Plan）。 */
function splitTagValue(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const inline = /^\[.*\]$/s.test(trimmed);
  const body = inline ? trimmed.slice(1, -1) : trimmed;
  if (inline || /[,，]/.test(body)) return body.split(/[,，]/);
  if (body.startsWith('#')) return body.split(/\s+(?=#)/); // tags: #AI #随笔
  return [body];
}

/**
 * 读取 Obsidian 的 tags 属性，统一成标签数组。
 * 支持 Properties 块序列、行内数组、逗号分隔、# 前缀、引号与 tag 别名；
 * 没写或写了空值返回 []，由调用方决定保留默认 / 已有标签。
 * @returns {string[]}
 */
export function parseTags(frontmatter) {
  const meta = parseFrontmatter(frontmatter);
  const raw = meta.tags ?? meta.tag;
  if (raw === undefined || raw === '') return [];
  const parts = (Array.isArray(raw) ? raw : [raw]).flatMap(splitTagValue);
  const tags = parts.map(part => unquote(part.trim()).replace(/^#+/, '').trim()).filter(Boolean);
  return [...new Set(tags)];
}

/** YAML 标量：只在必要时加引号，保持生成的文件可读。 */
export function yamlScalar(value) {
  const text = String(value);
  return /[:"'#[\]{},]|^\s|\s$|\n/.test(text) ? JSON.stringify(text) : text;
}

/** 更新模式只替换 title，其余 frontmatter 原样保留（包括手工调整过的字段）。 */
export function replaceTitle(frontmatter, title) {
  const line = `title: ${yamlScalar(title)}`;
  if (/^title:[^\n]*$/m.test(frontmatter)) return frontmatter.replace(/^title:[^\n]*$/m, line);
  return frontmatter ? `${line}\n${frontmatter}` : line;
}

/** 同步 tags：替换已有的 tags 行（含 Obsidian 块序列写法），没有则追加。 */
export function replaceTags(frontmatter, tags) {
  const line = `tags: [${tags.map(tag => yamlScalar(tag)).join(', ')}]`;
  const block = /^tags:[^\n]*(?:\n[ \t]+-[^\n]*)*/m;
  if (block.test(frontmatter)) return frontmatter.replace(block, line);
  return frontmatter ? `${frontmatter}\n${line}` : line;
}

/**
 * 把 Obsidian 的 ![[附件]] 转成标准 Markdown，并给出需要复制的图片清单。
 * 第一张图命名为 <slug>.<ext>，其余 <slug>-2.<ext>，重复发布不会堆积文件。
 * 图片放在 src/content/posts/images/，正文写 ./images/xxx —— 相对 .md 文件，
 * 这样 render(entry) 会走 Astro 图片优化（转 webp、加尺寸、lazy）。
 */
/** 判断附件名是不是 Obsidian 自动生成的 hash / uuid，这种名字不适合当 alt。 */
export function isHashName(name) {
  return /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(name) || /^[0-9a-f]{24,}$/i.test(name);
}

/** 选一个可读的 alt：显式别名 > 已发布文章里手工写过的 alt > 文件名 > 标题兜底。 */
export function readableAlt({ src, alias, url, altOverrides, title }) {
  const fallback = path.basename(src, path.extname(src));
  const candidates = [(alias || '').trim(), altOverrides[url] || '', fallback];
  const usable = candidates.find(candidate => candidate && !isHashName(candidate));
  return usable || (title ? `${title} 配图` : '文章配图');
}

export function convertEmbeds(body, { vaultRoot, noteDir, slug, title = '', altOverrides = {} }) {
  const images = [];
  const replaced = body.replace(WIKI_EMBED_RE, (_match, target, alias) => {
    const name = target.trim();
    const src = findAttachment(vaultRoot, noteDir, name);
    if (!src) throw new Error(`找不到 Obsidian 附件：${name}`);
    const ext = path.extname(src).toLowerCase();
    const file = images.length === 0 ? `${slug}${ext}` : `${slug}-${images.length + 1}${ext}`;
    const url = `./images/${file}`;
    images.push({ src, dest: path.join(IMAGES_DIR, file), url });
    const alt = readableAlt({ src, alias, url, altOverrides, title });
    return `![${alt}](${url})`;
  });
  // 让独占一行的图片自成段落：后面紧跟正文、或前面紧跟正文时都补空行；
  // 更新时复用已有 alt，手工写过的描述性文字不会被机器文件名覆盖。
  const spaced = replaced
    .replace(/^(!\[[^\]]*\]\(\.\/images\/[^)]+\))\n(?=[^\n])/gm, '$1\n\n')
    .replace(/([^\n])\n(!\[[^\]]*\]\(\.\/images\/[^)]+\)$)/gm, '$1\n\n$2');
  return { body: spaced, images };
}

/** 从已发布文章里取出 ./images/xxx → alt，供更新模式复用。
 * @returns {Record<string, string>}
 */
export function existingImageAlts(text) {
  const alts = {};
  const re = /!\[([^\]]*)\]\((\.\/images\/[^)]+)\)/g;
  let match;
  while ((match = re.exec(text))) alts[match[2]] = match[1];
  return alts;
}

export function buildPost({ title, slug, date, tags, description, body }) {
  const frontmatter = [
    `title: ${yamlScalar(title)}`,
    `slug: ${slug}`,
    `date: ${date}`,
    `tags: [${tags.map(tag => yamlScalar(tag)).join(', ')}]`
  ];
  if (description) frontmatter.push(`description: ${yamlScalar(description)}`);
  return ['---', ...frontmatter, '---', '', body.trim(), ''].join('\n');
}

/**
 * 更新只换标题与正文；传了 tags 才同步标签，否则保留文章里手工调过的值。
 * @param {string} existing
 * @param {{ title: string, body: string, tags?: string[] }} options
 */
export function updatePost(existing, { title, body, tags }) {
  const { frontmatter } = splitFrontmatter(existing);
  if (!frontmatter) throw new Error('已有文章没有 frontmatter，无法安全更新');
  let meta = replaceTitle(frontmatter, title);
  if (tags && tags.length) meta = replaceTags(meta, tags);
  return `---\n${meta}\n---\n\n${body.trim()}\n`;
}

/* ---------- 文件系统辅助 ---------- */

function walk(dir, visit) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      walk(full, visit);
    } else if (entry.isFile()) {
      visit(full);
    }
  }
}

function findAttachment(vaultRoot, noteDir, name) {
  for (const candidate of [path.join(noteDir, name), path.join(vaultRoot, name)]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  const base = path.basename(name).toLowerCase();
  let found = '';
  walk(vaultRoot, file => {
    if (!found && path.basename(file).toLowerCase() === base) found = file;
  });
  return found;
}

/** 判断笔记是否有实质内容：空白文件、刚建的每日笔记、0 字草稿模板都算未写完。 */
export function hasSubstance(text) {
  const { body, frontmatter } = splitFrontmatter(text);
  const meta = parseFrontmatter(frontmatter);
  if (meta['binder-status'] === 'draft' && meta['word-count'] === '0') return false;
  const hasImage = /!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/.test(body);
  const plainLength = body
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .length;
  return hasImage || plainLength >= 12;
}

/** 收集可发布笔记，按修改时间倒序；跳过 .obsidian、空笔记与写作项目的空模板。 */
export function collectNotes(vaultRoot, includeEmpty = false) {
  const list = [];
  walk(vaultRoot, file => {
    if (!file.toLowerCase().endsWith('.md')) return;
    const text = fs.readFileSync(file, 'utf8');
    if (!includeEmpty && !hasSubstance(text)) return;
    list.push({
      file,
      rel: path.relative(vaultRoot, file),
      mtime: fs.statSync(file).mtimeMs,
      text,
      meta: parseFrontmatter(splitFrontmatter(text).frontmatter)
    });
  });
  return list.sort((a, b) => b.mtime - a.mtime);
}

function readMap() {
  try {
    return JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
  } catch {
    return { version: 1, posts: {} };
  }
}

function today() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/* ---------- CLI ---------- */

function parseArgs(argv) {
  const args = {
    dryRun: false, noPush: false, full: false, all: false, help: false,
    file: '', slug: '', tags: '', summary: '', title: '', vault: ''
  };
  const valued = new Set(['file', 'slug', 'tags', 'summary', 'title', 'vault']);
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--help' || flag === '-h') args.help = true;
    else if (flag === '--dry-run') args.dryRun = true;
    else if (flag === '--no-push') args.noPush = true;
    else if (flag === '--full') args.full = true;
    else if (flag === '--all') args.all = true;
    else if (flag.startsWith('--') && valued.has(flag.slice(2))) {
      args[flag.slice(2)] = argv[++i] ?? '';
    } else {
      throw new Error(`未知参数：${flag}（用 --help 查看用法）`);
    }
  }
  return args;
}

function printUsage() {
  console.log(`用法：bun run publish [选项]

  （默认）        选 Obsidian 库里最新的一篇笔记，构建 + 提交 + 推送 github/main
  --all           批量：发布库里全部有实质内容的笔记（已发布的走更新），
                  一次 build + 一次 commit + 一次 push；空笔记自动跳过
  --file <路径>   指定笔记（vault 内相对路径或绝对路径）
  --slug <slug>   覆盖 slug；更新已发布文章时可用它指定目标
  --title <标题>  覆盖标题
  --tags <a,b>    覆盖标签（优先于笔记 tags 属性）；不传则读笔记 tags，缺省「随笔」
  --summary <文本> 覆盖新建文章的摘要；批量时作用于所有新建文章
  --vault <路径>  覆盖 Obsidian 库路径，也可设环境变量 OBSIDIAN_VAULT
  --dry-run       只预览，不写文件 / 不构建 / 不提交；批量时列出整批清单
  --no-push       本地提交但不推送
  --full          额外跑 typecheck / lint / test / check:edgeone
  --help          显示本说明

--all 不能与 --file / --slug / --title 同用（这些只作用于单篇）。
笔记的 slug / date 属性会规范化（非法字符转连字符、日期统一 YYYY-MM-DD）后用于新建文章；
更新已发布文章时沿用原 slug / date，永久链接不变。
默认 vault：${DEFAULT_VAULT}`);
}

function run(script) {
  console.log(`\n▶ bun run ${script}`);
  execFileSync(process.execPath, ['run', script], { cwd: ROOT, stdio: 'inherit' });
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

/**
 * 为一篇笔记算出完整的发布计划（只读，不落盘）。
 * usedSlugs 让批量模式下同批笔记不会互相覆盖（含纯中文标题的 post-YYYYMMDD 撞车）。
 * @returns {{
 *   note: object, title: string, slug: string, postPath: string, url: string,
 *   isUpdate: boolean, adopt: boolean, registered: object|undefined,
 *   existingText: string, content: string, unchanged: boolean, images: object[]
 * }}
 */
function planNote(note, { args, vaultRoot, date, map, usedSlugs }) {
  const noteMeta = note.meta;
  // 笔记的 slug / date 属性先规范化，只在新建文章时使用；
  // 更新已有文章时以文章原本的 slug / date 为准，永久链接不变。
  const noteSlug = normalizeSlug(noteMeta.slug);
  const noteDate = normalizeDate(noteMeta.date);
  const newPostDate = noteDate || date;
  const title = args.title || noteMeta.title || path.basename(note.file, '.md');
  const registered = map.posts[note.rel];
  let slug = args.slug || registered?.slug || noteSlug || slugFromTitle(title, newPostDate);

  let postPath = path.join(POSTS_DIR, `${slug}.md`);
  let adopt = false;
  const onDisk = fs.existsSync(postPath);
  // 同名文章已存在但没登记来源时：标题一致就接管为更新，否则换一个 slug 避免误覆盖。
  if (!registered && !args.slug && (usedSlugs.has(slug) || onDisk)) {
    const existingOnDisk = onDisk ? fs.readFileSync(postPath, 'utf8') : '';
    const existingTitle = existingOnDisk
      ? parseFrontmatter(splitFrontmatter(existingOnDisk).frontmatter).title
      : '';
    if (onDisk && existingTitle === title) adopt = true;
    else {
      let n = 2;
      while (usedSlugs.has(`${slug}-${n}`) || fs.existsSync(path.join(POSTS_DIR, `${slug}-${n}.md`))) n += 1;
      slug = `${slug}-${n}`;
      postPath = path.join(POSTS_DIR, `${slug}.md`);
    }
  }
  usedSlugs.add(slug);

  const isUpdate = Boolean(registered || adopt) || fs.existsSync(postPath);
  const existingText = isUpdate && fs.existsSync(postPath) ? fs.readFileSync(postPath, 'utf8') : '';
  const existingDate = existingText ? parseFrontmatter(splitFrontmatter(existingText).frontmatter).date : '';
  const postDate = /^\d{4}-\d{2}-\d{2}$/.test(existingDate || '') ? existingDate : newPostDate;

  const { body: rawBody } = splitFrontmatter(note.text);
  const converted = convertEmbeds(rawBody, {
    vaultRoot,
    noteDir: path.dirname(note.file),
    slug,
    title,
    altOverrides: existingImageAlts(existingText)
  });

  // CLI 的 --tags 优先级最高；否则读笔记的 tags 属性（Obsidian Properties 常用块序列）。
  // 笔记没写 tags 时返回空数组：新建退回默认「随笔」，更新保留文章里手工调过的标签。
  const cliTags = args.tags
    ? args.tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean)
    : [];
  const noteTags = parseTags(splitFrontmatter(note.text).frontmatter);
  const resolvedTags = cliTags.length ? cliTags : noteTags;

  let content;
  if (existingText) {
    content = updatePost(existingText, {
      title,
      body: converted.body,
      tags: resolvedTags.length ? resolvedTags : undefined
    });
  } else {
    const summary = args.summary || noteMeta.description || toSummary(rawBody);
    const tags = resolvedTags.length ? resolvedTags : ['随笔'];
    content = buildPost({ title, slug, date: postDate, tags, description: summary, body: converted.body });
  }

  const url = `${resolveSiteUrl(ROOT)}/${postDate.replace(/-/g, '/')}/${slug}/`;

  return {
    note, title, slug, postPath, url, noteSlug, noteDate, postDate,
    isUpdate, adopt, registered, existingText, content,
    unchanged: fs.existsSync(postPath) && fs.readFileSync(postPath, 'utf8') === content,
    images: converted.images
  };
}

function planContrast(plan) {
  if (plan.unchanged) return '与已发布文章一致，无需更新';
  return plan.existingText ? '内容有变化，将同步标题 / 正文 / tags，其余 frontmatter 保留' : '新文章';
}

function printPlan(plan, { dryRun, compact }) {
  if (compact) {
    console.log(`  [${plan.isUpdate ? '更新' : '新建'}] ${plan.title}  →  src/content/posts/${plan.slug}.md${dryRun ? `  (${planContrast(plan)})` : ''}`);
    console.log(`        来源：${plan.note.rel}`);
    console.log(`        链接：${plan.url}   配图：${plan.images.length ? plan.images.map(item => item.url).join('、') : '无'}`);
  } else {
    console.log(`\nObsidian 来源：${plan.note.rel}`);
    console.log(`模式：${plan.isUpdate ? '更新已有文章' : '新建文章'}${plan.adopt ? '（同名文章已登记接管）' : ''}`);
    console.log(`标题：${plan.title}`);
    console.log(`目标：src/content/posts/${plan.slug}.md`);
    if (plan.noteSlug || plan.noteDate) {
      console.log(`笔记属性：slug ${plan.noteSlug || '未设置'} · date ${plan.noteDate || '未设置'}${plan.isUpdate ? '（更新沿用原值，链接不变）' : ''}`);
    }
    console.log(`链接：${plan.url}`);
    console.log(`配图：${plan.images.length ? plan.images.map(item => item.url).join('、') : '无'}`);
  }
  if (!hasSubstance(plan.note.text)) console.log('注意：这篇笔记内容为空或极短，请确认是否要发布。');
  if (!compact && dryRun) console.log(`对比：${planContrast(plan)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printUsage();
  if (args.all && (args.file || args.slug || args.title)) {
    throw new Error('--all 是批量模式，不能与 --file / --slug / --title 同用（这些参数只作用于单篇）');
  }

  const vaultRoot = args.vault || process.env.OBSIDIAN_VAULT || DEFAULT_VAULT;
  if (!fs.existsSync(vaultRoot)) {
    throw new Error(`找不到 Obsidian 库：${vaultRoot}（用 --vault 或 OBSIDIAN_VAULT 指定）`);
  }
  const notes = collectNotes(vaultRoot);
  if (!notes.length && !args.file) {
    const all = collectNotes(vaultRoot, true);
    const hint = all.slice(0, 5).map(item => `  - ${item.rel}`).join('\n') || '  （库里没有 .md 笔记）';
    throw new Error(`Obsidian 库里没有可发布的笔记（空白 / 未写完的已跳过）。最近的 .md：\n${hint}\n用 --file 指定笔记，或检查 OBSIDIAN_VAULT：${vaultRoot}`);
  }

  let selected;
  if (args.file) {
    const abs = path.isAbsolute(args.file) ? args.file : path.join(vaultRoot, args.file);
    if (!fs.existsSync(abs)) throw new Error(`找不到笔记：${abs}`);
    const found = notes.find(item => path.resolve(item.file) === path.resolve(abs));
    const text = found ? found.text : fs.readFileSync(abs, 'utf8');
    const note = found || {
      file: abs,
      rel: path.relative(vaultRoot, abs) || path.basename(abs),
      mtime: fs.statSync(abs).mtimeMs,
      text,
      meta: parseFrontmatter(splitFrontmatter(text).frontmatter)
    };
    selected = [note];
  } else if (args.all) {
    selected = notes;
  } else {
    selected = [notes[0]];
  }

  const date = today();
  const map = readMap();
  const usedSlugs = new Set(
    fs.existsSync(POSTS_DIR)
      ? fs.readdirSync(POSTS_DIR).filter(file => file.endsWith('.md')).map(file => file.slice(0, -3))
      : []
  );
  const plans = selected.map(note => planNote(note, { args, vaultRoot, date, map, usedSlugs }));

  if (args.all) {
    const skipped = collectNotes(vaultRoot, true).length - notes.length;
    console.log(`\n批量模式：${plans.length} 篇可发布笔记（已跳过 ${skipped} 篇空白 / 未写完）`);
  }
  for (const plan of plans) printPlan(plan, { dryRun: args.dryRun, compact: args.all });

  if (args.dryRun) {
    if (!args.all) {
      console.log('\n--- 预览（前 20 行）---');
      console.log(plans[0].content.split('\n').slice(0, 20).join('\n'));
    }
    console.log('\n[dry-run] 未写入任何文件，未构建，未提交。');
    return;
  }

  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  for (const plan of plans) {
    for (const image of plan.images) {
      if (!IMAGE_EXT.has(path.extname(image.src).toLowerCase())) {
        throw new Error(`不支持的图片格式：${image.src}`);
      }
      fs.copyFileSync(image.src, image.dest);
    }
    fs.writeFileSync(plan.postPath, plan.content, 'utf8');
    map.posts[plan.note.rel] = { slug: plan.slug, published: plan.registered?.published || date };
  }
  fs.writeFileSync(MAP_FILE, `${JSON.stringify(map, null, 2)}\n`, 'utf8');

  // 批量只跑一次构建 / 一次提交 / 一次推送。
  for (const script of args.full ? ['typecheck', 'lint', 'test', 'build', 'check:edgeone'] : ['build']) {
    run(script);
  }

  const files = [...new Set([
    path.relative(ROOT, MAP_FILE),
    ...plans.flatMap(plan => [
      path.relative(ROOT, plan.postPath),
      ...plan.images.map(image => path.relative(ROOT, image.dest))
    ])
  ])];
  let committed = false;
  if (!git(['status', '--porcelain', '--', ...files])) {
    console.log('\n内容无变化，跳过提交。');
  } else {
    const changed = plans.filter(plan => !plan.unchanged);
    const message = args.all
      ? `feat: 批量发布 ${changed.length} 篇 Obsidian 笔记（新建 ${changed.filter(plan => !plan.isUpdate).length}、更新 ${changed.filter(plan => plan.isUpdate).length}）`
      : `feat: ${plans[0].isUpdate ? '更新' : '发布'}《${plans[0].title}》`;
    git(['add', '--', ...files]);
    execFileSync('git', ['commit', '-m', message], { cwd: ROOT, stdio: 'inherit' });
    committed = true;
    if (args.noPush) console.log('\n[no-push] 已本地提交，未推送。');
    else {
      execFileSync('git', ['push', 'github', 'main'], { cwd: ROOT, stdio: 'inherit' });
      console.log('\n已推送 github/main，EdgeOne 自动部署约 30 秒后生效。');
    }
  }
  const batchSummary = `${plans.length} 篇笔记（一次构建${committed ? '、一次提交' : '，内容无变化未提交'}）`;
  console.log(`\n完成：${args.all ? batchSummary : plans[0].url}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch(error => {
    console.error(`\n发布失败：${error.message}`);
    process.exitCode = 1;
  });
}
