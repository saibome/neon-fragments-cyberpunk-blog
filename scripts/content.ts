import path from 'node:path';
import matter from 'gray-matter';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import { DEFAULT_AUTHOR } from '../config';
import type { UserProfile } from '../types';

const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9-_]*$/;
const KEEP_CLASS_RE = /^(hljs|hljs-[\w-]+|language-[\w+#-]+)$/;

const profileSchema = z.object({
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

const frontmatterSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).optional(),
  slug: z.string().trim().regex(SLUG_RE).optional(),
  date: z.union([z.string(), z.date()]).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  readTime: z.string().optional(),
  likes: z.number().int().min(0).optional(),
  isGlitch: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  author: z.union([z.string(), profileSchema]).optional()
});

type AuthorInput = z.infer<typeof profileSchema> | string | undefined;

function cloneDefaultAuthor(): UserProfile {
  return { ...DEFAULT_AUTHOR, stats: { ...DEFAULT_AUTHOR.stats } };
}

/** 作者信息始终与默认档案合并，避免 frontmatter 里写半个对象导致运行时崩溃 */
export function mergeAuthor(input: AuthorInput): UserProfile {
  const base = cloneDefaultAuthor();
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

/** 中文按字、英文按词估算阅读时长 */
export function computeReadTime(markdown: string): string {
  const chinese = markdown.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const words = markdown.replace(/[\u3400-\u9fff]/g, ' ').match(/[a-zA-Z0-9]+/g)?.length ?? 0;
  return `约 ${Math.max(1, Math.ceil(chinese / 400 + words / 200))} 分钟`;
}

/** 构建期统一消毒：只保留 Markdown / highlight.js 会产出的标签与属性 */
export function sanitizeMarkdownHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
      'strong', 'em', 'del', 's', 'blockquote', 'sup', 'sub',
      'ul', 'ol', 'li', 'pre', 'code', 'span', 'a', 'img',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      code: ['class'],
      span: ['class'],
      th: ['align'],
      td: ['align']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript', 'iframe', 'object'],
    transformTags: {
      '*': (tagName, attribs) => {
        if (attribs.class) {
          const kept = attribs.class.split(/\s+/).filter(name => KEEP_CLASS_RE.test(name)).join(' ');
          if (kept) attribs.class = kept;
          else delete attribs.class;
        }
        return { tagName, attribs };
      }
    }
  });
}

export interface ParsedFrontmatter {
  id: string;
  title: string;
  slug: string;
  date: string;
  description?: string;
  image?: string;
  readTime: string;
  likes: number;
  isGlitch: boolean;
  tags: string[];
  author: UserProfile;
  markdown: string;
}

export function parseFrontmatter(raw: string, filename: string): ParsedFrontmatter {
  const { data, content } = matter(raw);
  const result = frontmatterSchema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues
      .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`${filename} 的 frontmatter 无效 → ${details}`);
  }

  const fm = result.data;
  const slug = fm.slug || path.basename(filename, '.md');
  if (!SLUG_RE.test(slug)) {
    throw new Error(`${filename} 的 slug 无效，只能包含字母、数字、连字符和下划线。`);
  }

  const dateValue = fm.date instanceof Date ? fm.date : new Date(fm.date ?? Date.now());
  if (Number.isNaN(dateValue.getTime())) {
    throw new Error(`${filename} 的 date 不是有效日期。`);
  }

  return {
    id: fm.id || slug,
    title: fm.title || '未命名文章',
    slug,
    date: dateValue.toISOString(),
    description: fm.description,
    image: fm.image,
    readTime: fm.readTime || computeReadTime(content),
    likes: fm.likes ?? 0,
    isGlitch: fm.isGlitch ?? false,
    tags: fm.tags ?? [],
    author: mergeAuthor(fm.author),
    markdown: content
  };
}
