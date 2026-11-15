/**
 * EdgeOne Pages 部署前自检。
 *
 * 在 bun run build 之后运行，验证：项目配置符合平台约束、bun 工具链完整、
 * 目录符合 Astro 规范且文章走内容集合、dist/ 静态产物完整、
 * 已移除的运行时功能没有回退、构建期字体未进入产物。
 * 任何一项失败都以非零退出码结束，便于 CI 卡住有问题的构建。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { resolveSiteUrl } from './env.mjs';
import { findPostDirs } from './dist-pages.mjs';

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
const inRoot = relative => fs.existsSync(path.join(ROOT, relative));

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
  if (config.cloudFunctions !== undefined) {
    fail('站点为纯静态部署，edgeone.json 不应包含 cloudFunctions');
  }
  if (config.rewrites?.length > 100) fail('rewrites 超过平台上限 100 条');
  if (config.headers?.length > 30) fail('headers 超过平台上限 30 条');
  if (config.redirects?.length > 100) fail('redirects 超过平台上限 100 条');

  // www → 裸域名的 301 永久重定向：只保留一个方向，避免两个域名互跳成环。
  const wwwToApex = (config.redirects ?? []).filter(
    rule => rule.source === '$wwwhost' && rule.destination === '$host' && rule.statusCode === 301
  );
  if (wwwToApex.length !== 1) {
    fail('edgeone.json 必须保留且只保留一条 $wwwhost → $host 的 301 重定向（www 归一化到主域名）');
  }
  if ((config.redirects ?? []).some(rule => rule.source === '$host' && rule.destination === '$wwwhost')) {
    fail('不能同时配置 $host → $wwwhost，否则与主域名归一化规则形成重定向循环');
  }

  for (const rule of config.rewrites ?? []) {
    const target = String(rule.destination ?? '').replace(/^\/+/, '');
    if (!target) {
      fail(`rewrite 缺少 destination：${rule.source}`);
    } else if (!exists(target)) {
      fail(`rewrite 目标不存在：${rule.source} → ${rule.destination}`);
    }
    if (['/data', '/api'].includes(rule.source)) {
      fail(`rewrite 指向已移除的路由：${rule.source}`);
    }
  }
  notes.push(`云端构建：bun 1.4.4（平台预装 Node ${config.nodeVersion} 仅用于安装 bun）`);
  notes.push('域名规范化：www → 主域名，301 永久重定向（仅对自定义域名生效）');
}

// 2. package.json / 锁文件：必须保持 bun 技术栈，且 engines 不挡住云端 Node
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const minNode = String(pkg.engines?.node ?? '').match(/^>=\s*(\d+(?:\.\d+){0,2})/)?.[1];
  if (!minNode || !atMost(minNode, EDGEONE_NODE_VERSION)) {
    fail('package.json#engines.node 必须允许 EdgeOne 的 Node 24.5.0');
  }
  if (pkg.packageManager !== 'bun@1.4.4') {
    fail('package.json#packageManager 必须是 bun@1.4.4');
  }
  if (pkg.scripts?.start || pkg.scripts?.preview) {
    fail('自托管静态服务已移除，package.json 不应再声明 start / preview');
  }
  if (pkg.scripts?.['build:content'] || /build-content/.test(String(pkg.scripts?.build ?? ''))) {
    fail('自建内容编译脚本已由 Astro 内容集合取代，不应再有 build:content');
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
  // 非 Git 工作区没有索引，跳过跟踪检查
}
if (trackedNvmrc) {
  fail('.nvmrc 不能提交：EdgeOne 会按它切换非预装的 Node 版本并在安装依赖前失败');
}

// 3. Astro 目录规范 + 内容集合是文章的唯一数据源
const collectionConfigPath = path.join(ROOT, 'src/content.config.ts');
if (!inRoot('src/content.config.ts')) {
  fail('缺少 src/content.config.ts（Astro 内容集合配置）');
} else {
  const source = fs.readFileSync(collectionConfigPath, 'utf8');
  for (const token of ['defineCollection', 'glob(', './src/content/posts', 'postSchema', 'export const collections = { posts }']) {
    if (!source.includes(token)) fail(`src/content.config.ts 缺少内容集合声明：${token}`);
  }
}

let contentFiles = [];
try {
  contentFiles = (await fsp.readdir(path.join(ROOT, 'src/content/posts')))
    .filter(name => name.endsWith('.md'));
} catch (error) {
  fail(`src/content/posts 无法读取：${error.message}`);
}
if (contentFiles.length === 0) fail('src/content/posts/ 中没有文章，部署后会是空博客');

const requiredSources = [
  'src/consts.ts', 'src/types.ts', 'src/lib/permalink.ts',
  'src/lib/post-schema.ts', 'src/lib/post-utils.ts', 'src/lib/posts.ts',
  'src/lib/markdown.ts', 'src/content/posts'
];
for (const source of requiredSources) {
  if (!inRoot(source)) fail(`Astro 规范目录缺少：${source}`);
}

const removed = [
  'cloud-functions', 'scripts/serve.mjs', 'Dockerfile', '.dockerignore',
  'lib/postList.ts', 'src/pages/api', 'src/pages/atom.xml.ts',
  'src/pages/data.astro', 'src/scripts/brain-wave.js',
  '_posts', 'services/posts.json', 'metadata.json',
  'scripts/build-content.ts', 'scripts/content.ts', 'scripts/markdown.ts',
  'config.ts', 'constants.ts', 'types.ts', 'lib/permalink.ts', 'assets/og-fonts'
];
for (const item of removed) {
  if (inRoot(item)) fail(`旧目录结构或已移除的功能不应回退：${item}`);
}

// 4. 静态产物
const required = [
  'index.html', '404.html', 'rss.xml', 'sitemap.xml', 'robots.txt',
  'net.html', 'gear.html', 'cover.svg', 'avatar.svg'
];
for (const file of required) {
  if (!exists(file)) fail(`dist/ 缺少必需产物：${file}`);
}
for (const file of ['atom.xml', 'canonical.json', 'data.html', 'api/posts.json', 'api/tags.json']) {
  if (exists(file)) fail(`dist/ 不应包含已移除的产物：${file}`);
}

const postDirs = await findPostDirs(DIST);
if (postDirs.length !== contentFiles.length) {
  fail(`内容集合文章数（${contentFiles.length}）与 dist 文章页（${postDirs.length}）不一致`);
}
for (const base of postDirs) {
  for (const file of [`${base}/index.html`, `${base}.html`, `card/${base}.png`]) {
    if (!exists(file)) fail(`文章 ${base} 缺少产物：${file}`);
  }
}

// 5. 字体：浏览器字体随产物部署，OG 图专用的大字体只留在 src/assets
for (const font of ['rajdhani-700.ttf', 'share-tech-mono-400.ttf']) {
  if (!exists(`fonts/${font}`)) fail(`dist/fonts 缺少浏览器字体：${font}`);
}
for (const font of ['noto-sans-sc-400.ttf', 'noto-sans-sc-700.ttf']) {
  if (exists(`fonts/${font}`)) fail(`构建期字体 ${font} 不应进入 dist/fonts（约 20MB）`);
  if (!inRoot(`src/assets/og-fonts/${font}`)) fail(`缺少 OG 图字体：src/assets/og-fonts/${font}`);
}

// 6. SITE_URL 在构建期固化进 canonical
const siteUrl = resolveSiteUrl(ROOT);
try {
  const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const canonical = indexHtml.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0] ?? '';
  if (!canonical.includes(siteUrl)) fail(`首页 canonical 未注入 SITE_URL（${siteUrl}）`);
} catch (error) {
  fail(`dist/index.html 无法读取：${error.message}`);
}
notes.push(`站点地址：${siteUrl}`);
notes.push(`文章：${contentFiles.length} 篇（内容集合 src/content/posts）`);

if (problems.length) {
  console.error('[edgeone] 部署前自检未通过：');
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exitCode = 1;
} else {
  console.log('[edgeone] 部署前自检通过');
  for (const note of notes) console.log(`  · ${note}`);
  console.log('  · 输出目录 dist，纯静态部署，无 Cloud Functions');
}
