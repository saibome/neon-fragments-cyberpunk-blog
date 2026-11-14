import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { generateOgImage } from './og-image';
import { BASE_URL } from '../constants';
import type { BlogPost, PostListResult } from '../types';

const postsPath = path.resolve(process.cwd(), 'services', 'posts.json');
let posts: BlogPost[] = [];

try {
  const data = fs.readFileSync(postsPath, 'utf-8');
  posts = JSON.parse(data);
} catch (error) {
  console.warn('Failed to load posts from services/posts.json', error);
  posts = [];
}

const app = new Hono();
const ogImageCache = new Map<string, Awaited<ReturnType<typeof generateOgImage>>>();

const SITE_TITLE = '霓虹碎片：赛博朋克博客';
const SITE_DESCRIPTION = '记录代码、设计、装备与夜之城灵感的沉浸式赛博朋克博客。';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function getPostDescription(post: typeof posts[0]): string {
  if (post.description) return post.description;
  if (post.content) {
    const text = post.content.replace(/<[^>]*>?/gm, '');
    return text.substring(0, 200) + '……';
  }
  return '';
}

function getPostUrl(post: typeof posts[0]): string {
  const d = new Date(post.date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${BASE_URL}/${y}/${m}/${day}/${post.slug}`;
}

app.get('/rss.xml', (c) => {
  const feedPosts = posts.slice(0, 50);
  const lastBuildDate = feedPosts.length > 0 ? new Date(feedPosts[0].date).toUTCString() : new Date().toUTCString();

  const items = feedPosts.map(post => {
    const link = getPostUrl(post);
    return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(getPostDescription(post))}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid>${link}</guid>
    </item>`;
  }).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${BASE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <language>zh-CN</language>
    ${items}
  </channel>
</rss>`;

  return c.body(rss, 200, {
    'Content-Type': 'application/xml',
  });
});

app.get('/atom.xml', (c) => {
  const feedPosts = posts.slice(0, 50);
  const updated = feedPosts.length > 0 ? new Date(feedPosts[0].date).toISOString() : new Date().toISOString();

  const entries = feedPosts.map(post => {
    const link = getPostUrl(post);
    return `
    <entry>
      <title>${escapeXml(post.title)}</title>
      <link href="${link}"/>
      <id>${link}</id>
      <updated>${new Date(post.date).toISOString()}</updated>
      <summary>${escapeXml(getPostDescription(post))}</summary>
      <author>
        <name>${escapeXml(post.author.name)}</name>
      </author>
    </entry>`;
  }).join('');

  const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(SITE_TITLE)}</title>
  <link href="${BASE_URL}/atom.xml" rel="self"/>
  <link href="${BASE_URL}"/>
  <updated>${updated}</updated>
  <id>${BASE_URL}/</id>
  <author>
    <name>文博</name>
  </author>
  ${entries}
</feed>`;

  return c.body(atom, 200, {
    'Content-Type': 'application/xml',
  });
});

app.get('/sitemap.xml', (c) => {
  const staticPages = ['/', '/net', '/data', '/gear'];
  const latestPostDate = posts[0] ? new Date(posts[0].date).toISOString() : new Date().toISOString();
  const urls = [
    ...staticPages.map(page => `
  <url>
    <loc>${BASE_URL}${page}</loc>
    <lastmod>${latestPostDate}</lastmod>
  </url>`),
    ...posts.map(post => `
  <url>
    <loc>${getPostUrl(post)}</loc>
    <lastmod>${new Date(post.date).toISOString()}</lastmod>
  </url>`)
  ].join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
  return c.body(sitemap, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
  });
});

app.get('/card/:year/:month/:day/:slug', async (c) => {
  const { year, month, day, slug: rawSlug } = c.req.param();
  const slug = rawSlug.endsWith('.png') ? rawSlug.slice(0, -4) : rawSlug;

  // We can verify the date if needed, but slug is usually unique enough or we just find by slug
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    return c.text('文章不存在', 404);
  }

  try {
    const cachedImage = ogImageCache.get(post.slug);
    const imageBuffer = cachedImage || await generateOgImage(post);
    if (!cachedImage) ogImageCache.set(post.slug, imageBuffer);
    return c.body(imageBuffer as unknown as ArrayBuffer, 200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    });
  } catch (e) {
    console.error(e);
    return c.text('分享图片生成失败', 500);
  }
});

app.get('/api/tags', (c) => {
  const tagCounts: Record<string, number> = {};
  posts.forEach(post => {
    post.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const tags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
  return c.json(tags);
});

export function getPostList(searchParams: URLSearchParams): PostListResult {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));
  const search = searchParams.get('search') || '';
  const tag = searchParams.get('tags') || searchParams.get('tag') || '';

  let filteredPosts = posts;
  if (tag) {
    filteredPosts = filteredPosts.filter(post => post.tags.includes(tag));
  }
  if (search) {
    const lowerSearch = search.toLowerCase();
    filteredPosts = filteredPosts.filter(post =>
      post.title.toLowerCase().includes(lowerSearch) ||
      post.tags.some(postTag => postTag.toLowerCase().includes(lowerSearch))
    );
  }

  const summaries = filteredPosts.map((post) => {
    const { content, ...rest } = post;
    const description = rest.description || content.replace(/<[^>]*>?/gm, '').substring(0, 200) + '……';
    return { ...rest, content: '', description };
  });
  const startIndex = (page - 1) * limit;

  return {
    posts: summaries.slice(startIndex, startIndex + limit),
    total: summaries.length,
    page,
    limit,
    totalPages: Math.ceil(summaries.length / limit),
    queryKey: `${page}|${search}|${tag}`
  };
}

app.get('/api/posts', (c) => {
  return c.json(getPostList(new URL(c.req.url).searchParams));
});

app.get('/api/posts/:slug', (c) => {
  const slug = c.req.param('slug');
  const index = posts.findIndex((p) => p.slug === slug);

  if (index === -1) {
    return c.json({ error: '文章不存在' }, 404);
  }

  const post = posts[index];
  const newerPost = index > 0 ? posts[index - 1] : null;
  const olderPost = index < posts.length - 1 ? posts[index + 1] : null;

  const response = {
    ...post,
    next: newerPost ? { slug: newerPost.slug, title: newerPost.title, date: newerPost.date } : undefined,
    previous: olderPost ? { slug: olderPost.slug, title: olderPost.title, date: olderPost.date } : undefined
  };

  return c.json(response);
});

export default app;
