import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import fg from 'fast-glob';
import { DEFAULT_AUTHOR } from '../constants';
import { UserProfile } from '../types';

const CONTENT_DIR = process.env.CONTENT_DIR || '_posts';
const OUTPUT_FILE = path.join(process.cwd(), 'services', 'posts.json');

// Configure marked with syntax highlighting
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string; // HTML content
  description?: string;
  image?: string;
  excerpt?: string;
  date: string;
  author: UserProfile;
  tags: string[];
  readTime: string;
  likes: number;
  isGlitch?: boolean;
}

async function buildContent() {
  console.log(`Scanning for markdown files in ${CONTENT_DIR}...`);

  // Check if content dir exists
  try {
    await fs.access(CONTENT_DIR);
  } catch {
    console.warn(`Content directory ${CONTENT_DIR} not found. Creating empty posts.json.`);
    await fs.writeFile(OUTPUT_FILE, JSON.stringify([], null, 2));
    return;
  }

  const files = await fg(`${CONTENT_DIR}/**/*.md`);
  const posts: BlogPost[] = [];
  const slugs = new Set<string>();

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf-8');
    const { data, content } = matter(raw);

    // Generate slug from filename if not provided
    const filename = path.basename(file, '.md');
    const slug = String(data.slug || filename).trim();
    if (!slug || !/^[a-zA-Z0-9][a-zA-Z0-9-_]*$/.test(slug)) {
      throw new Error(`${file} 的 slug 无效，只能包含字母、数字、连字符和下划线。`);
    }
    if (slugs.has(slug)) {
      throw new Error(`发现重复 slug：${slug}（${file}）`);
    }
    slugs.add(slug);
    if (data.title !== undefined && (typeof data.title !== 'string' || !data.title.trim())) {
      throw new Error(`${file} 的 title 必须是非空字符串。`);
    }
    const date = data.date ? new Date(data.date) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new Error(`${file} 的 date 不是有效日期。`);
    }

    // 中文按字符、英文按单词估算阅读时长
    const chineseCharacters = content.match(/[\u3400-\u9fff]/g)?.length || 0;
    const englishWords = content.replace(/[\u3400-\u9fff]/g, ' ').match(/[a-zA-Z0-9]+/g)?.length || 0;
    const readTime = `约 ${Math.max(1, Math.ceil(chineseCharacters / 400 + englishWords / 200))} 分钟`;

    const htmlContent = await marked(content);

    let author: UserProfile = DEFAULT_AUTHOR;
    if (data.author) {
      if (typeof data.author === 'string') {
        author = { ...DEFAULT_AUTHOR, name: data.author };
      } else if (typeof data.author === 'object') {
        author = data.author as UserProfile;
      }
    }

    posts.push({
      id: data.id || slug,
      title: data.title || '未命名文章',
      slug: slug,
      content: htmlContent,
      description: data.description,
      image: data.image,
      date: date.toISOString(),
      author: author,
      tags: data.tags || [],
      readTime: data.readTime || readTime,
      likes: data.likes || 0,
      isGlitch: data.isGlitch || false
    });
  }

  // Sort by date desc
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(posts, null, 2));
  console.log(`Generated ${posts.length} posts to ${OUTPUT_FILE}`);
}

buildContent().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
