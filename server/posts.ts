import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_AUTHOR } from '../config';
import { makePermalink } from '../lib/permalink';
import type { BlogPost, PostRef, UserProfile } from '../types';

const postsPath = path.resolve(process.cwd(), 'services', 'posts.json');

function defaultAuthor(): UserProfile {
  return { ...DEFAULT_AUTHOR, stats: { ...DEFAULT_AUTHOR.stats } };
}

/** 兼容旧格式产物：缺失字段补齐，缺少 permalink 时按 UTC 补算 */
function normalizePost(value: unknown): BlogPost | null {
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
    author: post.author ? {
      ...author,
      ...post.author,
      stats: post.author.stats ? { ...author.stats, ...post.author.stats } : author.stats
    } : author,
    tags: Array.isArray(post.tags) ? post.tags : [],
    readTime: post.readTime || '约 1 分钟',
    likes: post.likes ?? 0,
    isGlitch: post.isGlitch ?? false,
    previous: post.previous,
    next: post.next
  };
}

function loadPosts(): BlogPost[] {
  let raw: string;
  try {
    raw = fs.readFileSync(postsPath, 'utf-8');
  } catch (error) {
    console.warn('[posts] 无法读取 services/posts.json，站点将以空内容启动', error);
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('posts.json 顶层不是数组');
    return parsed
      .map(normalizePost)
      .filter((post): post is BlogPost => post !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('[posts] posts.json 解析失败', error);
    return [];
  }
}

/** 全站文章在进程启动时加载一次，服务端所有路由共享 */
export const posts: BlogPost[] = loadPosts();

export function toPostRef(post: BlogPost): PostRef {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    permalink: post.permalink
  };
}

export function findPostBySlug(slug: string): BlogPost | undefined {
  return posts.find(post => post.slug === slug);
}

export function getPostDetail(slug: string): (BlogPost & { next?: PostRef; previous?: PostRef }) | undefined {
  const index = posts.findIndex(post => post.slug === slug);
  if (index === -1) return undefined;

  return {
    ...posts[index],
    next: index > 0 ? toPostRef(posts[index - 1]) : undefined,
    previous: index < posts.length - 1 ? toPostRef(posts[index + 1]) : undefined
  };
}

export function getTagCounts(): { tag: string; count: number }[] {
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
