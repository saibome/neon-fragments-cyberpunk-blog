import { Hono } from 'hono';
import { SITE_URL } from './site';
import { posts, findPostBySlug, getPostDetail, getTagCounts } from './posts';
import { listPosts } from '../lib/postList';
import { absoluteUrl, cardUrl } from '../lib/permalink';
import { generateOgImage } from './og-image';
import type { BlogPost } from '../types';

const app = new Hono();
const ogImageCache = new Map<string, Promise<Buffer>>();

const SITE_TITLE = '霓虹碎片：赛博朋克博客';
const SITE_DESCRIPTION = '记录代码、设计、装备与夜之城灵感的沉浸式赛博朋克博客。';
const STATIC_PAGES = ['/', '/net', '/data', '/gear'];

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return char;
    }
  });
}

function getPostDescription(post: BlogPost): string {
  if (post.description) return post.description;
  if (post.content) {
    return `${post.content.replace(/<[^>]*>?/gm, '').substring(0, 200)}……`;
  }
  return '';
}

function getPostUrl(post: BlogPost): string {
  return absoluteUrl(SITE_URL, post.permalink);
}

app.get('/robots.txt', (c) => {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  return c.body(body, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
  });
});

app.get('/rss.xml', (c) => {
  const feedPosts = posts.slice(0, 50);
  const lastBuildDate = feedPosts.length > 0
    ? new Date(feedPosts[0].date).toUTCString()
    : new Date().toUTCString();

  const items = feedPosts.map(post => {
    const link = getPostUrl(post);
    return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <description>${escapeXml(getPostDescription(post))}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
    </item>`;
  }).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <language>zh-CN</language>
    ${items}
  </channel>
</rss>`;

  return c.body(rss, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
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
      <link href="${escapeXml(link)}"/>
      <id>${escapeXml(link)}</id>
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
  <link href="${escapeXml(`${SITE_URL}/atom.xml`)}" rel="self"/>
  <link href="${escapeXml(SITE_URL)}"/>
  <updated>${updated}</updated>
  <id>${escapeXml(`${SITE_URL}/`)}</id>
  <author>
    <name>${escapeXml(SITE_TITLE)}</name>
  </author>
  ${entries}
</feed>`;

  return c.body(atom, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
  });
});

app.get('/sitemap.xml', (c) => {
  const latestPostDate = posts[0] ? new Date(posts[0].date).toISOString() : new Date().toISOString();
  const urls = [
    ...STATIC_PAGES.map(page => `
  <url>
    <loc>${escapeXml(absoluteUrl(SITE_URL, page))}</loc>
    <lastmod>${latestPostDate}</lastmod>
  </url>`),
    ...posts.map(post => `
  <url>
    <loc>${escapeXml(getPostUrl(post))}</loc>
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
  const post = findPostBySlug(slug);

  if (!post) {
    return c.text('文章不存在', 404);
  }

  // 日期段必须与构建期生成的规范链接一致，否则 301 到唯一 URL，避免重复内容
  const requested = `/card/${year}/${month}/${day}/${slug}.png`;
  const canonical = cardUrl(post.permalink);
  if (requested !== canonical) {
    return c.redirect(canonical, 301);
  }

  try {
    // 缓存 Promise 本身，同一篇文章并发请求只生成一次
    let task = ogImageCache.get(slug);
    if (!task) {
      task = generateOgImage(post).catch(error => {
        ogImageCache.delete(slug);
        throw error;
      });
      ogImageCache.set(slug, task);
    }
    const buffer = await task;
    return c.body(new Uint8Array(buffer) as unknown as ArrayBuffer, 200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400'
    });
  } catch (error) {
    console.error('[og-image] 生成失败', error);
    return c.text('分享图片生成失败', 500);
  }
});

app.get('/api/tags', (c) => {
  c.header('Cache-Control', 'public, max-age=300');
  return c.json(getTagCounts());
});

app.get('/api/posts', (c) => {
  return c.json(listPosts(posts, new URL(c.req.url).searchParams));
});

app.get('/api/posts/:slug', (c) => {
  const detail = getPostDetail(c.req.param('slug'));
  if (!detail) {
    return c.json({ error: '文章不存在' }, 404);
  }
  return c.json(detail);
});

export default app;
