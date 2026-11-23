import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { BlogPost } from '../types';
import { toBlogPost, sortPosts } from './post-utils';

export * from './post-utils';

export interface PostEntry {
  /** 原始内容集合条目，交给官方 render(entry) 渲染正文 */
  entry: CollectionEntry<'posts'>;
  /** 归一化后的数据，供页面、feed、OG 图与静态端点复用 */
  post: BlogPost;
}

/**
 * 内容集合是文章的唯一数据源。每次调用都从 Astro 的 data store 读取，
 * 校验 frontmatter 后统一生成 UTC permalink 并按时间倒序返回。
 */
export async function getPostEntries(): Promise<PostEntry[]> {
  const entries = await getCollection('posts');
  const pairs = entries.map(entry => ({
    entry,
    post: toBlogPost({
      id: entry.id,
      data: entry.data,
      body: entry.body,
      filePath: entry.filePath
    })
  }));

  const sorted = sortPosts(pairs.map(pair => pair.post));
  const slugs = new Set<string>();
  const permalinks = new Set<string>();
  for (const post of sorted) {
    if (slugs.has(post.slug)) throw new Error(`发现重复 slug：${post.slug}`);
    slugs.add(post.slug);
    if (permalinks.has(post.permalink)) {
      throw new Error(`发现重复永久链接：${post.permalink}`);
    }
    permalinks.add(post.permalink);
  }

  const bySlug = new Map(pairs.map(pair => [pair.post.slug, pair]));
  return sorted.map(post => bySlug.get(post.slug)!);
}

export async function getPosts(): Promise<BlogPost[]> {
  return (await getPostEntries()).map(pair => pair.post);
}
