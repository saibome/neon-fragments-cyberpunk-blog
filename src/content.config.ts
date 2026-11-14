import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { postSchema } from './lib/post-schema';

/**
 * Astro 内容集合（Content Layer）是文章的唯一数据源。
 * 新增文章只需在 src/content/posts/ 放一个 .md，Astro 会在构建期校验
 * frontmatter、生成条目、缓存渲染结果；页面通过 getCollection('posts') 读取。
 */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: postSchema
});

export const collections = { posts };
