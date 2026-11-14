import { posts, tagCounts, siteUrl } from './data.js';

/**
 * EdgeOne Pages Cloud Function 兜底入口。
 * 页面、feed 与分享卡片已由 scripts/prerender.ts 在构建期落成静态文件，
 * 静态资源优先命中；这里只处理 API、规范链接 301 与未知路径 404。
 * 刻意保持零依赖（不使用 hono、node:fs 或原生模块）。
 */

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}

function redirect(location) {
  return new Response(null, {
    status: 301,
    headers: { Location: location, 'Cache-Control': 'public, max-age=3600' }
  });
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

  let filtered = posts;
  if (tag) filtered = filtered.filter(post => post.tags.includes(tag));
  if (search) {
    const keyword = search.toLowerCase();
    filtered = filtered.filter(post =>
      post.title.toLowerCase().includes(keyword) ||
      post.tags.some(item => item.toLowerCase().includes(keyword))
    );
  }

  const summaries = filtered.map(summarize);
  const start = (page - 1) * limit;
  return {
    posts: summaries.slice(start, start + limit),
    total: summaries.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(summaries.length / limit)),
    queryKey: `${page}|${limit}|${search}|${tag}`
  };
}

function toRef(post) {
  return { slug: post.slug, title: post.title, date: post.date, permalink: post.permalink };
}

function postDetail(slug) {
  const index = posts.findIndex(post => post.slug === slug);
  if (index === -1) return undefined;
  return {
    ...posts[index],
    next: index > 0 ? toRef(posts[index - 1]) : undefined,
    previous: index < posts.length - 1 ? toRef(posts[index + 1]) : undefined
  };
}

function notFound() {
  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>页面不存在 · 霓虹碎片</title></head>
<body style="background:#050505;color:#fcee0a;font-family:monospace;padding:4rem;text-align:center">
<h1>404 // 信号丢失</h1><p style="color:#888">该路径没有对应的数据片段。</p>
<p><a href="${siteUrl}/" style="color:#00f0ff">返回首页</a></p></body></html>`;
  return new Response(html, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

export default function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/api/tags') return json(tagCounts);
  if (pathname === '/api/posts') return json(listPosts(url.searchParams));
  if (pathname.startsWith('/api/posts/')) {
    const slug = decodeURIComponent(pathname.slice('/api/posts/'.length));
    const detail = postDetail(slug);
    return detail ? json(detail) : json({ error: '文章不存在' }, 404);
  }
  if (pathname.startsWith('/api/')) return json({ error: '接口不存在' }, 404);

  // 日期段错误但 slug 正确的文章链接，301 到构建期生成的规范 permalink
  const postMatch = pathname.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/);
  if (postMatch) {
    const found = posts.find(post => post.slug === postMatch[4]);
    if (found && found.permalink !== pathname) {
      return redirect(`${found.permalink}${url.search}`);
    }
  }

  const cardMatch = pathname.match(/^\/card\/\d{4}\/\d{2}\/\d{2}\/([^/]+)\.png$/);
  if (cardMatch) {
    const found = posts.find(post => post.slug === cardMatch[1]);
    if (found) {
      const canonical = `/card${found.permalink}.png`;
      if (canonical !== pathname) return redirect(canonical);
    }
  }

  return notFound();
}
