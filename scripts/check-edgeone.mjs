/**
 * EdgeOne Pages 部署前自检。
 *
 * 在 bun run build 之后运行，验证：项目配置符合平台约束、bun 工具链完整、
 * dist/ 产物完整、Cloud Functions 的 data.js 与文章数据同步、函数入口可被平台识别。
 * 任何一项失败都以非零退出码结束，便于 CI 卡住有问题的构建。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const problems = [];
const notes = [];

// EdgeOne Pages 只提供预装 Node；.nvmrc 里的非预装版本会在安装依赖前
// 直接报 "Failed to switch to Node.js x"。云端保留 24.5.0 是为了给
// npm i -g bun 提供 npm，实际构建由 bun 运行时（模拟 Node 26.3.0）完成。
const PREINSTALLED_NODE_VERSIONS = [
  '14.21.3', '16.20.2', '18.20.4', '20.18.0',
  '22.11.0', '22.17.1', '22.21.1',
  '24.5.0', '24.11.0', '24.18.0'
];
const EDGEONE_NODE_VERSION = '24.5.0';
const atMost = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const left = pa[i] ?? 0;
    const right = pb[i] ?? 0;
    if (left !== right) return left < right;
  }
  return true;
};

const fail = message => problems.push(message);
const exists = relative => fs.existsSync(path.join(DIST, relative));
const load = async relative =>
  import(pathToFileURL(path.join(ROOT, relative)).href);

// 1. edgeone.json：云端 Node 必须是平台预装版本，构建命令锁定 bun
let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(ROOT, 'edgeone.json'), 'utf8'));
} catch (error) {
  fail(`edgeone.json 无法解析：${error.message}`);
}

if (config) {
  if (config.outputDirectory !== 'dist') fail('edgeone.json 的 outputDirectory 必须是 dist');
  if (!String(config.buildCommand ?? '').startsWith('bun run build')) {
    fail('edgeone.json 的 buildCommand 必须是 bun run build');
  }
  if (!config.installCommand?.includes('bun@1.4.4') ||
      !config.installCommand.includes('bun install --frozen-lockfile')) {
    fail('installCommand 必须固定安装 bun 1.4.4 并执行 bun install --frozen-lockfile');
  }
  if (!PREINSTALLED_NODE_VERSIONS.includes(config.nodeVersion)) {
    fail('edgeone.json 的 nodeVersion 必须是平台预装的 Node 版本');
  } else if (config.nodeVersion !== EDGEONE_NODE_VERSION) {
    fail(`edgeone.json 的 nodeVersion 应为 ${EDGEONE_NODE_VERSION}（用于安装 bun 的 npm 环境）`);
  }
  if (config.cloudFunctions?.maxDuration === undefined) {
    fail('cloudFunctions.maxDuration 缺失（平台已弃用 cloudFunctions.nodejs.maxDuration）');
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
  notes.push(`云端构建：bun 1.4.4（平台预装 Node ${config.nodeVersion} 仅用于安装 bun）`);
}

// package.json / 锁文件：必须保持 bun 技术栈，且 engines 不挡住云端 Node
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const minNode = String(pkg.engines?.node ?? '').match(/^>=\s*(\d+(?:\.\d+){0,2})/)?.[1];
  if (!minNode || !atMost(minNode, EDGEONE_NODE_VERSION)) {
    fail('package.json#engines.node 必须允许 EdgeOne 的 Node 24.5.0');
  }
  if (pkg.packageManager !== 'bun@1.4.4') {
    fail('package.json#packageManager 必须是 bun@1.4.4');
  }
  if (!fs.existsSync(path.join(ROOT, 'bun.lock'))) fail('缺少 bun.lock（请先执行 bun install）');
  for (const legacy of ['pnpm-lock.yaml', 'pnpm-workspace.yaml', 'package-lock.json', 'yarn.lock']) {
    if (fs.existsSync(path.join(ROOT, legacy))) fail(`发现旧包管理器文件：${legacy}`);
  }
} catch (error) {
  fail(`package.json 无法解析：${error.message}`);
}

// 根目录 .nvmrc 一旦提交，EdgeOne 会优先按它切换版本，非预装版本直接构建失败。
let trackedNvmrc = '';
try {
  trackedNvmrc = execFileSync('git', ['ls-files', '--', '.nvmrc'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
} catch {
  // 非 Git 工作区（例如 release.zip）没有索引，跳过跟踪检查
}
if (trackedNvmrc) {
  fail('.nvmrc 不能提交：EdgeOne 会按它切换非预装的 Node 版本并在安装依赖前失败');
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
    fail('cloud-functions/data.js 与 services/posts.json 不一致，请重新执行 bun run build');
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
