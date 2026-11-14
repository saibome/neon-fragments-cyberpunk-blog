/**
 * EdgeOne Pages 部署前自检。
 *
 * 在 pnpm build 之后运行，验证：项目配置符合平台约束、dist/ 产物完整、
 * Cloud Functions 的 data.js 与文章数据同步、函数入口可被平台识别。
 * 任何一项失败都以非零退出码结束，便于 CI 卡住有问题的构建。
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const problems = [];
const notes = [];

const fail = message => problems.push(message);
const exists = relative => fs.existsSync(path.join(DIST, relative));
const load = async relative =>
  import(pathToFileURL(path.join(ROOT, relative)).href);

// 1. edgeone.json：平台只支持预装 Node 版本，26 必须靠 .nvmrc 自动下载
let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(ROOT, 'edgeone.json'), 'utf8'));
} catch (error) {
  fail(`edgeone.json 无法解析：${error.message}`);
}

if (config) {
  if (config.outputDirectory !== 'dist') fail('edgeone.json 的 outputDirectory 必须是 dist');
  if (typeof config.buildCommand !== 'string' || !config.buildCommand.includes('build')) {
    fail('edgeone.json 缺少有效的 buildCommand');
  }
  if (!config.installCommand?.includes('pnpm')) {
    fail('installCommand 必须显式安装 pnpm（.nvmrc 下载的 Node 26 不带包管理器）');
  }
  if ('nodeVersion' in config) {
    fail('edgeone.json 不要写 nodeVersion：平台只支持预装版本，Node 26 由 .nvmrc 自动下载');
  }
  if (config.rewrites?.length > 100) fail('rewrites 超过平台上限 100 条');
  if (config.headers?.length > 30) fail('headers 超过平台上限 30 条');

  for (const rule of config.rewrites ?? []) {
    const target = String(rule.destination ?? '').replace(/^\/+/, '');
    if (!target) {
      fail(`rewrite 缺少 destination：${rule.source}`);
    } else if (!exists(target)) {
      fail(`rewrite 目标不存在：${rule.source} → ${rule.destination}`);
    }
  }
}

const nvmrc = path.join(ROOT, '.nvmrc');
if (!fs.existsSync(nvmrc) || !fs.readFileSync(nvmrc, 'utf8').trim().startsWith('26')) {
  fail('.nvmrc 缺失或未指向 Node 26');
}

// 2. 静态产物
const required = [
  'index.html', '404.html', 'canonical.json',
  'rss.xml', 'atom.xml', 'sitemap.xml', 'robots.txt',
  'api/posts.json', 'api/tags.json', 'net.html', 'data.html', 'gear.html',
  'cover.svg', 'avatar.svg'
];
for (const file of required) {
  if (!exists(file)) fail(`dist/ 缺少必需产物：${file}`);
}

let posts = [];
try {
  posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'services/posts.json'), 'utf8'));
} catch (error) {
  fail(`services/posts.json 无法解析：${error.message}`);
}

if (!Array.isArray(posts) || posts.length === 0) {
  fail('文章数据为空，部署后会是空博客');
}

for (const post of posts) {
  const base = post.permalink?.replace(/^\/+/, '');
  if (!base) {
    fail(`文章 ${post.slug} 缺少 permalink`);
    continue;
  }
  for (const file of [`${base}/index.html`, `${base}.html`, `card/${base}.png`]) {
    if (!exists(file)) fail(`文章 ${post.slug} 缺少产物：${file}`);
  }
  if (exists(`api/posts/${post.slug}.json`) === false) {
    fail(`文章 ${post.slug} 缺少静态详情 JSON`);
  }
}

// 3. Cloud Functions 数据与入口
let data;
try {
  data = await load('cloud-functions/data.js');
} catch (error) {
  fail(`cloud-functions/data.js 无法加载：${error.message}`);
}

if (data) {
  const expected = posts.map(post => `${post.slug}|${post.permalink}`).sort();
  const actual = (data.posts ?? []).map(post => `${post.slug}|${post.permalink}`).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    fail('cloud-functions/data.js 与 services/posts.json 不一致，请重新执行 pnpm build');
  }
  if (!Array.isArray(data.tagCounts)) fail('cloud-functions/data.js 缺少 tagCounts');

  try {
    const canonical = JSON.parse(fs.readFileSync(path.join(DIST, 'canonical.json'), 'utf8'));
    if (data.siteUrl !== canonical.siteUrl) {
      fail('Cloud Function 的 siteUrl 与 dist/canonical.json 不一致（SITE_URL 是否在两次构建间变化？）');
    }
  } catch (error) {
    fail(`dist/canonical.json 无法解析：${error.message}`);
  }
  notes.push(`站点地址：${data.siteUrl}`);
}

const entryPoints = [
  'cloud-functions/[[default]].js',
  'cloud-functions/api/posts.js',
  'cloud-functions/api/tags.js',
  'cloud-functions/api/posts/[slug].js'
];
for (const entry of entryPoints) {
  try {
    const mod = await load(entry);
    if (typeof mod.onRequest !== 'function' || typeof mod.default !== 'function') {
      fail(`${entry} 必须同时导出 onRequest 与 default`);
    }
  } catch (error) {
    fail(`${entry} 无法加载：${error.message}`);
  }
}
notes.push(`函数入口：${entryPoints.length} 个（catch-all + 3 条明确路由）`);
notes.push(`文章：${posts.length} 篇`);

if (problems.length) {
  console.error('[edgeone] 部署前自检未通过：');
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exitCode = 1;
} else {
  console.log('[edgeone] 部署前自检通过');
  for (const note of notes) console.log(`  · ${note}`);
  console.log('  · 输出目录 dist，Cloud Functions 位于仓库根 cloud-functions/');
}
