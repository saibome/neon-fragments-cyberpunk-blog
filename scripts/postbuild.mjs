/**
 * Astro 构建后处理：为目录式页面补一份平铺 .html 副本，
 * 兼容 EdgeOne Pages 不自动展开目录索引的托管规则。
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const posts = JSON.parse(await fs.readFile(path.join(ROOT, 'services/posts.json'), 'utf8'));

const STATIC_PAGES = ['net', 'gear'];

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

for (const page of STATIC_PAGES) {
  await flatten(page, `${page}.html`);
}
for (const post of posts) {
  await flatten(post.permalink.slice(1), `${post.permalink.slice(1)}.html`);
}

console.log(`[postbuild] ${posts.length} 篇文章、${flattened} 个平铺页面副本已生成`);
