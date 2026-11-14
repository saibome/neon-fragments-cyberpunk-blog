/**
 * Astro 构建后处理：
 * 1. 生成 EdgeOne Cloud Functions 需要的 data.js（纯 ESM，无运行时依赖）
 * 2. 为目录式页面补一份平铺 .html 副本，兼容不同的 clean URL 托管规则
 * 3. 输出 canonical.json，供自托管静态服务做错误日期 301 规范化
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveSiteUrl } from './env.mjs';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const FUNCTIONS_DIR = path.join(ROOT, 'cloud-functions');
const SITE_URL = resolveSiteUrl(ROOT);

const posts = JSON.parse(await fs.readFile(path.join(ROOT, 'services/posts.json'), 'utf8'));

function escapeForScript(serialized) {
  return serialized
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function computeTagCounts(list) {
  const counts = new Map();
  for (const post of list) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

// EdgeOne 兜底函数的数据源
await fs.mkdir(FUNCTIONS_DIR, { recursive: true });
const dataModule = [
  '// 由 pnpm build（scripts/postbuild.mjs）生成，请勿手工编辑',
  `export const siteUrl = ${JSON.stringify(SITE_URL)};`,
  `export const posts = ${escapeForScript(JSON.stringify(posts))};`,
  `export const tagCounts = ${escapeForScript(JSON.stringify(computeTagCounts(posts)))};`,
  ''
].join('\n');
await fs.writeFile(path.join(FUNCTIONS_DIR, 'data.js'), dataModule);

// 目录式 → 平铺式副本
let flattened = 0;
async function flatten(relativeDir, flatFile) {
  const source = path.join(DIST, relativeDir, 'index.html');
  const target = path.join(DIST, flatFile);
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
    flattened += 1;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    console.warn(`[postbuild] 缺少页面产物：${relativeDir}/index.html`);
  }
}

for (const page of ['net', 'data', 'gear']) {
  await flatten(page, `${page}.html`);
}
for (const post of posts) {
  await flatten(post.permalink.slice(1), `${post.permalink.slice(1)}.html`);
}

const canonicalBySlug = Object.fromEntries(posts.map(post => [post.slug, post.permalink]));
await fs.writeFile(
  path.join(DIST, 'canonical.json'),
  `${JSON.stringify({ siteUrl: SITE_URL, canonicalBySlug }, null, 2)}\n`
);

console.log(`[postbuild] ${posts.length} 篇文章、${flattened} 个平铺页面副本、cloud-functions/data.js 已生成`);
