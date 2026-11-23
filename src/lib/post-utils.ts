import { DEFAULT_AUTHOR } from '../consts';
import { makePermalink } from './permalink';
import { SLUG_RE } from './post-schema';
import type { PostFrontmatter } from './post-schema';
import { computeReadTime, markdownToText } from './text';
import type { BlogPost, PostRef, UserProfile } from '../types';

/** 与 astro:content 解耦的纯函数层：bun test 可以直接 import，页面通过 posts.ts 读取集合 */
export interface CollectionPostInput {
  id: string;
  data: PostFrontmatter;
  body?: string;
  filePath?: string;
}

type AuthorInput = NonNullable<PostFrontmatter['author']>;

/** 作者信息始终与默认档案合并，避免 frontmatter 里写半个对象导致运行时崩溃 */
export function mergeAuthor(input: AuthorInput | undefined): UserProfile {
  const base: UserProfile = { ...DEFAULT_AUTHOR, stats: { ...DEFAULT_AUTHOR.stats } };
  if (!input) return base;
  if (typeof input === 'string') {
    return { ...base, name: input.trim() || base.name };
  }
  return {
    name: input.name?.trim() || base.name,
    handle: input.handle || base.handle,
    handle_link: input.handle_link ?? base.handle_link,
    role: input.role || base.role,
    level: input.level ?? base.level,
    bio: input.bio || base.bio,
    stats: input.stats ? { ...base.stats, ...input.stats } : base.stats
  };
}

/** 把内容集合条目归一化成页面 / feed / OG 图共用的 BlogPost */
export function toBlogPost(entry: CollectionPostInput): BlogPost {
  const data = entry.data;
  const body = entry.body ?? '';
  const source = entry.filePath ?? entry.id;
  const slug = data.slug || entry.id;

  if (!SLUG_RE.test(slug)) {
    throw new Error(`${source} 的 slug 无效，只能包含字母、数字、连字符和下划线。`);
  }
  const parsed = new Date(data.date);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${source} 的 date 不是有效日期。`);
  }

  const date = parsed.toISOString();
  const text = markdownToText(body);
  return {
    id: data.id || slug,
    title: data.title,
    slug,
    permalink: makePermalink(date, slug),
    body,
    text,
    description: data.description,
    image: data.image,
    date,
    author: mergeAuthor(data.author),
    tags: data.tags,
    readTime: data.readTime || computeReadTime(text),
    isGlitch: data.isGlitch ?? false
  };
}

export function sortPosts(list: BlogPost[]): BlogPost[] {
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function toPostRef(post: BlogPost): PostRef {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    permalink: post.permalink
  };
}

export function postDescription(post: BlogPost): string {
  if (post.description) return post.description;
  if (post.text) return `${post.text.substring(0, 200)}……`;
  return '';
}

export function getTagCounts(list: BlogPost[] = []): { tag: string; count: number }[] {
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
  list: BlogPost[] = []
): (BlogPost & { next?: PostRef; previous?: PostRef }) | undefined {
  const index = list.findIndex(post => post.slug === slug);
  if (index === -1) return undefined;
  return {
    ...list[index],
    next: index > 0 ? toPostRef(list[index - 1]) : undefined,
    previous: index < list.length - 1 ? toPostRef(list[index + 1]) : undefined
  };
}
