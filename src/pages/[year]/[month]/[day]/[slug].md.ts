import fs from 'node:fs/promises';
import path from 'node:path';
import { getCollection } from 'astro:content';
import { getPosts } from '../../../../lib/posts';

/**
 * 原始数据端点：把内容集合里每篇文章的 .md 源文件原样发布到
 * /YYYY/MM/DD/slug.md，供文章左侧「传输数据」面板的 .MD 链接使用。
 * 静态构建期读取，站线上没有任何运行时文件访问。
 */
export async function getStaticPaths() {
  const [posts, entries] = await Promise.all([getPosts(), getCollection('posts')]);
  const bySlug = new Map(entries.map(entry => [entry.data.slug || entry.id, entry]));

  return Promise.all(posts.map(async post => {
    const parts = post.permalink.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/);
    if (!parts) throw new Error(`无法解析 permalink：${post.permalink}`);
    const [, year, month, day, slug] = parts;

    const entry = bySlug.get(post.slug);
    let source = entry?.body ?? '';
    if (entry?.filePath) {
      source = await fs.readFile(path.resolve(process.cwd(), entry.filePath), 'utf8');
    }

    return { params: { year, month, day, slug }, props: { source } };
  }));
}

export function GET({ props }: { props: { source: string } }) {
  return new Response(props.source, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
