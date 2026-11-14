/**
 * EdgeOne Pages 构建期预渲染。
 *
 * 站点内容来自构建期生成的 services/posts.json，运行时没有动态数据源，
 * 因此把 SSR 从常驻 Node 服务移到构建期：直接复用 Vite 编译好的
 * dist/server 渲染 bundle（以 EDGEONE_PRERENDER=1 关闭端口监听），
 * 把页面 / feed / 分享卡片落成静态文件。原有 Node 服务产物不受影响。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeSiteUrl } from '../config';
import type { BlogPost } from '../types';

process.env.EDGEONE_PRERENDER = '1';

const ROOT = process.cwd();
const OUTPUT_DIR = path.resolve(ROOT, 'dist/edgeone');
const CLIENT_DIR = path.resolve(ROOT, 'dist/client');
const FUNCTIONS_DIR = path.resolve(ROOT, 'cloud-functions');

const STATIC_PAGES = ['/net', '/data', '/gear'];
const FEEDS = ['/rss.xml', '/atom.xml', '/sitemap.xml', '/robots.txt'];

/** 输入必须是已序列化的 JSON 字符串，只做脚本上下文里的安全转义 */
function escapeForScript(serialized: string): string {
  return serialized
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function computeTagCounts(posts: BlogPost[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

async function main(): Promise<void> {
  const serverBundle = path.resolve(ROOT, 'dist/server/index.js');
  const { default: server } = await import(pathToFileURL(serverBundle).href);

  const posts = JSON.parse(
    await fs.readFile(path.resolve(ROOT, 'services/posts.json'), 'utf-8')
  ) as BlogPost[];
  const siteUrl = normalizeSiteUrl(process.env.SITE_URL);

  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.cp(CLIENT_DIR, OUTPUT_DIR, { recursive: true });

  async function write(relativePath: string, content: string | Uint8Array): Promise<void> {
    const target = path.join(OUTPUT_DIR, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }

  async function fetchPath(urlPath: string, expectedStatus = 200): Promise<Response> {
    const response = await server.request(`http://prerender.local${urlPath}`);
    if (response.status !== expectedStatus) {
      throw new Error(`${urlPath} 期望 ${expectedStatus}，实际 ${response.status}`);
    }
    return response;
  }

  await write('index.html', await (await fetchPath('/')).text());

  // 目录式 + .html 平铺式双写，兼容不同静态托管的 clean URL 规则
  for (const pagePath of STATIC_PAGES) {
    const html = await (await fetchPath(pagePath)).text();
    const segment = pagePath.slice(1);
    await write(`${segment}/index.html`, html);
    await write(`${segment}.html`, html);
  }

  let cards = 0;
  for (const post of posts) {
    const relative = post.permalink.slice(1);
    const html = await (await fetchPath(post.permalink)).text();
    await write(`${relative}/index.html`, html);
    await write(`${relative}.html`, html);

    const cardPath = `/card${post.permalink}.png`;
    const card = await fetchPath(cardPath);
    await write(cardPath.slice(1), new Uint8Array(await card.arrayBuffer()));
    cards += 1;
  }

  for (const feedPath of FEEDS) {
    await write(feedPath.slice(1), await (await fetchPath(feedPath)).text());
  }

  await write('404.html', await (await fetchPath('/__not_found__', 404)).text());

  // Cloud Function 数据：纯 ESM 模块，函数运行时不依赖 node:fs 或构建产物路径
  await fs.mkdir(FUNCTIONS_DIR, { recursive: true });
  const dataModule = [
    '// 由 pnpm build:edgeone 生成，请勿手工编辑',
    `export const siteUrl = ${JSON.stringify(siteUrl)};`,
    `export const posts = ${escapeForScript(JSON.stringify(posts))};`,
    `export const tagCounts = ${escapeForScript(JSON.stringify(computeTagCounts(posts)))};`,
    ''
  ].join('\n');
  await fs.writeFile(path.join(FUNCTIONS_DIR, 'data.js'), dataModule);

  console.log(`[prerender] ${posts.length} 篇文章、${cards} 张分享卡片、${FEEDS.length} 个 feed → ${OUTPUT_DIR}`);
}

main().catch(error => {
  console.error('[prerender] 构建失败', error);
  process.exitCode = 1;
});
