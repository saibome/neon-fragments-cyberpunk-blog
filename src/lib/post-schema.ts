import { z } from 'zod';

/**
 * 内容集合的 frontmatter schema。
 * 单独放在 src/lib 下，让 src/content.config.ts 与 bun test 都能直接引用同一个 zod 4 schema。
 * 注意：date 必填——文章永久链接 /YYYY/MM/DD/slug 依赖它，缺省会让每次构建产生不同 URL。
 */
export const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

export const profileSchema = z.object({
  name: z.string().optional(),
  handle: z.string().optional(),
  handle_link: z.string().optional(),
  role: z.string().optional(),
  level: z.number().optional(),
  bio: z.string().optional(),
  stats: z.object({
    ram: z.number().optional(),
    cpu: z.number().optional(),
    network: z.number().optional()
  }).optional()
});

export const postSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1),
  slug: z.string().trim().regex(SLUG_RE).optional(),
  date: z.union([z.string(), z.date()]),
  description: z.string().optional(),
  image: z.string().optional(),
  readTime: z.string().optional(),
  isGlitch: z.boolean().optional(),
  tags: z.array(z.string()).default([]),
  author: z.union([z.string(), profileSchema]).optional()
});

export type PostFrontmatter = z.infer<typeof postSchema>;
