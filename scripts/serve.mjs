/**
 * 零依赖的静态站点服务器（node:http + node:fs）。
 * Astro 已经把页面、feed、API 数据与分享图全部预渲染到 dist/，
 * 这里只负责静态分发、API 动态查询、规范链接 301 与 404 兜底。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function readJson(relativePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIST, relativePath), 'utf8'));
  } catch {
    return fallback;
  }
}

const summaries = readJson('api/posts.json', []);
const tagCounts = readJson('api/tags.json', []);
const canonicalBySlug = readJson('canonical.json', { canonicalBySlug: {} }).canonicalBySlug || {};

function send(res, status, body, contentType, extraHeaders = {}) {
  const headers = {
    'Content-Type': contentType,
    ...extraHeaders
  };
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, value, status = 200) {
  send(res, status, JSON.stringify(value), 'application/json; charset=utf-8', {
    'Cache-Control': 'public, max-age=300'
  });
}

function redirect(res, location) {
  res.writeHead(301, { Location: location, 'Cache-Control': 'public, max-age=3600' });
  res.end();
}

function summarize(post) {
  const { content, ...rest } = post;
  return {
    ...rest,
    content: '',
    description: rest.description || `${(content || '').replace(/<[^>]*>?/gm, '').substring(0, 200)}……`
  };
}

function listPosts(searchParams) {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));
  const search = searchParams.get('search') || '';
  const tag = searchParams.get('tags') || searchParams.get('tag') || '';

  let filtered = summaries.map(summarize);
  if (tag) filtered = filtered.filter(post => post.tags.includes(tag));
  if (search) {
    const keyword = search.toLowerCase();
    filtered = filtered.filter(post =>
      post.title.toLowerCase().includes(keyword) ||
      post.tags.some(item => item.toLowerCase().includes(keyword))
    );
  }

  const start = (page - 1) * limit;
  return {
    posts: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    queryKey: `${page}|${limit}|${search}|${tag}`
  };
}

function handleApi(pathname, searchParams, res) {
  if (pathname === '/api/tags') return sendJson(res, tagCounts);
  if (pathname === '/api/posts') return sendJson(res, listPosts(searchParams));

  if (pathname.startsWith('/api/posts/')) {
    const slug = decodeURIComponent(pathname.slice('/api/posts/'.length));
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return sendJson(res, { error: '文章不存在' }, 404);
    const detail = readJson(`api/posts/${slug}.json`);
    return detail
      ? sendJson(res, detail)
      : sendJson(res, { error: '文章不存在' }, 404);
  }

  return sendJson(res, { error: '接口不存在' }, 404);
}

function resolveStaticFile(pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, '');
  const relative = clean === '' ? 'index.html' : clean.replace(/\/+$/, '');
  const candidates = path.extname(relative)
    ? [relative]
    : [`${relative}/index.html`, `${relative}.html`, relative];

  for (const candidate of candidates) {
    const file = path.resolve(DIST, candidate);
    if (file !== DIST && !file.startsWith(DIST + path.sep)) continue;
    try {
      if (fs.statSync(file).isFile()) return { file, relative: candidate };
    } catch {
      // 继续尝试下一个候选路径
    }
  }
  return null;
}

function serveFile(res, file, relative, method) {
  const ext = path.extname(file).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  const cache = relative.startsWith('assets/') || relative.startsWith('fonts/')
    ? 'public, max-age=31536000, immutable'
    : ext === '.html'
      ? 'public, max-age=0, must-revalidate'
      : 'public, max-age=3600';

  res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': cache });
  if (method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    return send(res, 405, '方法不允许', 'text/plain; charset=utf-8', { Allow: 'GET, HEAD' });
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/index.html') return redirect(res, `/${url.search}`);
  if (pathname.startsWith('/api/')) return handleApi(pathname, url.searchParams, res);

  // 日期段错误但 slug 存在时，301 到构建期生成的规范链接
  const postMatch = pathname.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/);
  if (postMatch) {
    const canonical = canonicalBySlug[decodeURIComponent(postMatch[4])];
    if (canonical && canonical !== pathname) return redirect(res, `${canonical}${url.search}`);
  }

  const cardMatch = pathname.match(/^\/card\/\d{4}\/\d{2}\/\d{2}\/([^/]+)\.png$/);
  if (cardMatch) {
    const canonical = canonicalBySlug[decodeURIComponent(cardMatch[1])];
    if (canonical) {
      const canonicalCard = `/card${canonical}.png`;
      if (canonicalCard !== pathname) return redirect(res, canonicalCard);
    }
  }

  const found = resolveStaticFile(pathname);
  if (found) return serveFile(res, found.file, found.relative, method);

  const notFound = path.join(DIST, '404.html');
  if (fs.existsSync(notFound)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    if (method === 'HEAD') return res.end();
    return fs.createReadStream(notFound).pipe(res);
  }
  send(res, 404, '404 // 信号丢失', 'text/plain; charset=utf-8');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Neon Fragments 静态服务已启动：http://localhost:${PORT}（${DIST}）`);
});
