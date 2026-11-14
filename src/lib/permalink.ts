/**
 * 文章永久链接只在构建期按 UTC 生成一次，之后所有端（页面、sitemap、RSS、
 * 分享卡片）都直接读取 post.permalink，避免本地时区差异导致同一篇文章出现不同 URL。
 */
export function makePermalink(dateIso: string, slug: string): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`无法从 ${dateIso} 生成文章链接`);
  }
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `/${year}/${month}/${day}/${slug}`;
}

export function cardUrl(permalink: string): string {
  return `/card${permalink}.png`;
}

export function absoluteUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/+$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
