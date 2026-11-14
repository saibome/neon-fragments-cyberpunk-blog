import { getCollection } from 'astro:content';
import type { BlogPost } from '../types';
import { toBlogPost, sortPosts } from './post-utils';

export * from './post-utils';

/**
 * 内容集合是文章的唯一数据源。每次调用都从 Astro 的 data store 读取，
 * 校验 frontmatter 后统一生成 UTC permalink、消毒正文并按时间倒序返回。
 */
export async function getPosts(): Promise<BlogPost[]> {
  const entries = await getCollection('posts');
  const posts = sortPosts(
    entries.map(entry =>
      toBlogPost({
        id: entry.id,
        data: entry.data,
        body: entry.body,
        filePath: entry.filePath
      })
    )
  );

  const slugs = new Set<string>();
  const permalinks = new Set<string>();
  for (const post of posts) {
    if (slugs.has(post.slug)) throw new Error(`发现重复 slug：${post.slug}`);
    slugs.add(post.slug);
    if (permalinks.has(post.permalink)) {
      throw new Error(`发现重复永久链接：${post.permalink}`);
    }
    permalinks.add(post.permalink);
  }

  return posts;
}
