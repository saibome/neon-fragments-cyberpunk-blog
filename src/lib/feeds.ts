import { SITE_DESCRIPTION, SITE_TITLE, STATIC_PAGES } from '../consts';
import { SITE_URL } from './site';
import { postDescription } from './post-utils';
import { absoluteUrl } from './permalink';
import type { BlogPost } from '../types';

export function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, char => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return char;
    }
  });
}

export function renderRss(posts: BlogPost[]): string {
  const feedPosts = posts.slice(0, 50);
  const lastBuildDate = feedPosts.length > 0
    ? new Date(feedPosts[0].date).toUTCString()
    : new Date().toUTCString();

  const items = feedPosts.map(post => {
    const link = absoluteUrl(SITE_URL, post.permalink);
    return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <description>${escapeXml(postDescription(post))}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
    </item>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" ?>
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
}

export function renderSitemap(posts: BlogPost[]): string {
  const latestPostDate = posts[0] ? new Date(posts[0].date).toISOString() : new Date().toISOString();
  const urls = [
    ...STATIC_PAGES.map(page => `
  <url>
    <loc>${escapeXml(absoluteUrl(SITE_URL, page))}</loc>
    <lastmod>${latestPostDate}</lastmod>
  </url>`),
    ...posts.map(post => `
  <url>
    <loc>${escapeXml(absoluteUrl(SITE_URL, post.permalink))}</loc>
    <lastmod>${new Date(post.date).toISOString()}</lastmod>
  </url>`)
  ].join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
}

export function renderRobots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}
