import rawPosts from '../../services/posts.json';
import { DEFAULT_AUTHOR } from '../../config';
import { makePermalink } from '../../lib/permalink';
import type { BlogPost, PostRef, UserProfile } from '../../types';

/** 构建期内容产物由 scripts/build-content.ts 生成，模块加载时统一做兼容与排序 */
function defaultAuthor(): UserProfile {
  return { ...DEFAULT_AUTHOR, stats: { ...DEFAULT_AUTHOR.stats } };
}

/** 兼容旧格式产物：缺失字段补齐，缺少 permalink 时按 UTC 补算 */
export function normalizePost(value: unknown): BlogPost | null {
  if (!value || typeof value !== 'object') return null;
  const post = value as Partial<BlogPost>;
  if (!post.slug || !post.date) return null;

  const author = defaultAuthor();
  return {
    id: post.id || post.slug,
    title: post.title || '未命名文章',
    slug: post.slug,
    permalink: post.permalink || makePermalink(post.date, post.slug),
    content: post.content || '',
    description: post.description,
    image: post.image,
    date: post.date,
    author: post.author
      ? {
          ...author,
          ...post.author,
          stats: post.author.stats ? { ...author.stats, ...post.author.stats } : author.stats
        }
      : author,
    tags: Array.isArray(post.tags) ? post.tags : [],
    readTime: post.readTime || '约 1 分钟',
    isGlitch: post.isGlitch ?? false,
    previous: post.previous,
    next: post.next
  };
}

export function sortPosts(list: BlogPost[]): BlogPost[] {
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const posts: BlogPost[] = sortPosts(
  (rawPosts as unknown[]).map(normalizePost).filter((post): post is BlogPost => post !== null)
);

export function toPostRef(post: BlogPost): PostRef {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    permalink: post.permalink
  };
}

export function plainText(html: string): string {
  return (html || '').replace(/<[^>]*>?/gm, '');
}

export function postDescription(post: BlogPost): string {
  if (post.description) return post.description;
  if (post.content) return `${plainText(post.content).substring(0, 200)}……`;
  return '';
}

export function getTagCounts(list: BlogPost[] = posts): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of list) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function getPostDetail(
  slug: string,
  list: BlogPost[] = posts
): (BlogPost & { next?: PostRef; previous?: PostRef }) | undefined {
  const index = list.findIndex(post => post.slug === slug);
  if (index === -1) return undefined;
  return {
    ...list[index],
    next: index > 0 ? toPostRef(list[index - 1]) : undefined,
    previous: index < list.length - 1 ? toPostRef(list[index + 1]) : undefined
  };
}
