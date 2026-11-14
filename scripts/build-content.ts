import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { parseFrontmatter } from './content';
import { renderMarkdown } from './markdown';
import { makePermalink } from '../lib/permalink';
import type { BlogPost } from '../types';

const CONTENT_DIR = process.env.CONTENT_DIR || '_posts';
const OUTPUT_FILE = path.join(process.cwd(), 'services', 'posts.json');

async function buildContent(): Promise<void> {
  console.log(`扫描 ${CONTENT_DIR} 中的 Markdown……`);

  let files: string[] = [];
  try {
    await fs.access(CONTENT_DIR);
    files = (await fg(`${CONTENT_DIR}/**/*.md`)).sort();
  } catch {
    console.warn(`内容目录 ${CONTENT_DIR} 不存在，生成空列表。`);
  }

  const slugs = new Set<string>();
  const permalinks = new Set<string>();
  const posts: BlogPost[] = [];

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf-8');
    const fm = parseFrontmatter(raw, file);

    if (slugs.has(fm.slug)) {
      throw new Error(`发现重复 slug：${fm.slug}（${file}）`);
    }
    slugs.add(fm.slug);

    const permalink = makePermalink(fm.date, fm.slug);
    if (permalinks.has(permalink)) {
      throw new Error(`发现重复永久链接：${permalink}（${file}）`);
    }
    permalinks.add(permalink);

    posts.push({
      id: fm.id,
      title: fm.title,
      slug: fm.slug,
      permalink,
      content: renderMarkdown(fm.markdown),
      description: fm.description,
      image: fm.image,
      date: fm.date,
      author: fm.author,
      tags: fm.tags,
      readTime: fm.readTime,
      likes: fm.likes,
      isGlitch: fm.isGlitch
    });
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(posts, null, 2)}\n`);
  console.log(`已生成 ${posts.length} 篇文章 → ${OUTPUT_FILE}`);
}

buildContent().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
