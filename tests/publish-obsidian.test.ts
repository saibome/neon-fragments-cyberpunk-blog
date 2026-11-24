import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  slugFromTitle,
  toSummary,
  splitFrontmatter,
  parseFrontmatter,
  yamlScalar,
  replaceTitle,
  buildPost,
  updatePost,
  convertEmbeds,
  existingImageAlts,
  isHashName,
  readableAlt,
  hasSubstance,
  collectNotes
} from '../scripts/publish-obsidian.mjs';

const scriptPath = fileURLToPath(new URL('../scripts/publish-obsidian.mjs', import.meta.url));
const projectRoot = path.resolve(path.dirname(scriptPath), '..');
const postsDir = path.join(projectRoot, 'src', 'content', 'posts');

function runPublish(args: string[]) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

test('标题里的英文数字 token 生成可读 slug，纯中文退回日期兜底', () => {
  assert.equal(slugFromTitle('智谱 GLM-5.4 模型发布，已上线 Coding Plan', '2026-11-23'), 'glm-5-4-coding-plan');
  assert.equal(slugFromTitle('夜之城随笔', '2026-11-23'), 'post-20261123');
  assert.match(slugFromTitle('Hello, World!', '2026-11-23'), /^[a-z0-9][a-z0-9_-]*$/);
});

test('摘要压成单行且不会过长，保持 OG 卡片与 RSS 简洁', () => {
  assert.equal(toSummary('**加粗** 与 [链接](https://x.com)、`代码`'), '加粗 与 链接、代码');
  assert.equal(toSummary('![[a.png]]\n\n正文第一句。'), '正文第一句。');
  assert.ok(toSummary('很长的内容'.repeat(30)).length <= 35);
  assert.ok(!toSummary('很长的内容'.repeat(30)).includes('\n'));
});

test('frontmatter 解析与 title 替换不丢其它字段', () => {
  const post = buildPost({
    title: '夜之城：随笔',
    slug: 'night-city',
    date: '2026-11-23',
    tags: ['随笔'],
    description: '一段摘要',
    body: '正文'
  });
  const parsed = parseFrontmatter(splitFrontmatter(post).frontmatter);
  assert.equal(parsed.title, '夜之城：随笔');
  assert.equal(parsed.date, '2026-11-23');

  const updated = updatePost(post, { title: '夜之城：修订版', body: '新正文' });
  const after = splitFrontmatter(updated);
  assert.equal(parseFrontmatter(after.frontmatter).title, '夜之城：修订版');
  assert.match(after.frontmatter, /description: 一段摘要/);
  assert.match(after.frontmatter, /date: 2026-11-23/);
  assert.equal(after.body.trim(), '新正文');
});

test('含特殊字符的标题会被引号包裹', () => {
  assert.equal(yamlScalar('普通标题'), '普通标题');
  assert.equal(yamlScalar('a: b'), '"a: b"');
  assert.equal(replaceTitle('slug: x\ndate: 2026-11-23', '新标题'), 'title: 新标题\nslug: x\ndate: 2026-11-23');
});

test('Obsidian wiki 图片转成 Astro 相对资源路径并给出复制清单', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-publish-'));
  try {
    fs.writeFileSync(path.join(dir, 'shot.jpg'), 'fake');
    const result = convertEmbeds('开头 ![[shot.jpg|控制台截图]] 结尾', {
      vaultRoot: dir,
      noteDir: dir,
      slug: 'demo-post'
    });
    assert.equal(result.body, '开头 ![控制台截图](./images/demo-post.jpg) 结尾');
    assert.equal(result.images.length, 1);
    assert.match(result.images[0].dest, /src\/content\/posts\/images\/demo-post\.jpg$/);

    const second = convertEmbeds('![[shot.jpg]] ![[shot.jpg]]', { vaultRoot: dir, noteDir: dir, slug: 'demo' });
    assert.equal(second.images.length, 2);
    assert.match(second.body, /\.\/images\/demo-2\.jpg/);
    assert.throws(() => convertEmbeds('![[missing.png]]', { vaultRoot: dir, noteDir: dir, slug: 'x' }), /找不到 Obsidian 附件/);

    const reused = convertEmbeds('![[shot.jpg]]\n正文紧跟图片。', {
      vaultRoot: dir,
      noteDir: dir,
      slug: 'demo-post',
      altOverrides: { './images/demo-post.jpg': '手工写的描述' }
    });
    assert.equal(reused.body, '![手工写的描述](./images/demo-post.jpg)\n\n正文紧跟图片。');
    assert.deepEqual(existingImageAlts(reused.body), { './images/demo-post.jpg': '手工写的描述' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('hash 文件名换成可读 alt，图片前后自动空行，已有 hash alt 也会被修正', () => {
  const hash = '43a03614-6fce-42b0-9ab9-e4bec986935b';
  assert.equal(isHashName(hash), true);
  assert.equal(isHashName('screenshot'), false);
  assert.equal(readableAlt({ src: `/tmp/${hash}.png`, alias: '', url: './images/a.png', altOverrides: {}, title: '一篇随笔' }), '一篇随笔 配图');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-publish-'));
  try {
    fs.writeFileSync(path.join(dir, `${hash}.png`), 'fake');
    const ctx = { vaultRoot: dir, noteDir: dir, slug: 'demo', title: '纳德拉谈编辑器' };
    const spaced = convertEmbeds('正文第一段。\n![[43a03614-6fce-42b0-9ab9-e4bec986935b.png]]\n## 小标题', ctx);
    assert.equal(spaced.body, '正文第一段。\n\n![纳德拉谈编辑器 配图](./images/demo.png)\n\n## 小标题');
    const fixed = convertEmbeds('![[43a03614-6fce-42b0-9ab9-e4bec986935b.png]]', {
      ...ctx,
      altOverrides: { './images/demo.png': hash }
    });
    assert.match(fixed.body, /\[纳德拉谈编辑器 配图\]/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('收集笔记按修改时间倒序，并跳过空笔记、短笔记与写作项目的空草稿模板', () => {
  assert.equal(hasSubstance(''), false);
  assert.equal(hasSubstance('太短'), false);
  assert.equal(hasSubstance('---\nbinder-status: draft\nword-count: 0\n---\n\n*Write your first blog post here.*'), false);
  assert.equal(hasSubstance('![[shot.jpg]]'), true);
  assert.equal(hasSubstance('这是一篇写完整了的博客文章内容。'), true);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-notes-'));
  try {
    const posts = path.join(dir, 'Writing Projects', 'Demo', 'Posts');
    fs.mkdirSync(posts, { recursive: true });
    fs.mkdirSync(path.join(dir, '.obsidian'));
    fs.writeFileSync(path.join(dir, '.obsidian', 'secret.md'), '不该被收集');
    fs.writeFileSync(path.join(dir, '2026-11-23.md'), '');
    fs.writeFileSync(path.join(posts, 'draft.md'), '---\nbinder-status: draft\nword-count: 0\n---\n\n*Write your first blog post here.*');
    fs.writeFileSync(path.join(dir, 'older.md'), '这是一篇较早写好的文章内容。');
    fs.writeFileSync(path.join(dir, 'newer.md'), '这是刚刚写完的最新一篇文章内容。');
    fs.utimesSync(path.join(dir, 'newer.md'), new Date('2026-11-23T12:00:00Z'), new Date('2026-11-23T12:00:00Z'));
    fs.utimesSync(path.join(dir, 'older.md'), new Date('2026-11-20T12:00:00Z'), new Date('2026-11-20T12:00:00Z'));

    const notes = collectNotes(dir);
    assert.equal(notes[0].rel, 'newer.md');
    assert.deepEqual(notes.map(note => path.basename(note.file)), ['newer.md', 'older.md']);
    assert.ok(!notes.some(note => note.rel.includes('.obsidian')));
    assert.ok(!notes.some(note => note.rel.endsWith('draft.md')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('--all 批量预览：列出全部可发布笔记、跳过空笔记、同批不撞 slug 且不写盘', () => {
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-batch-'));
  try {
    fs.writeFileSync(path.join(vault, '空笔记.md'), '');
    fs.writeFileSync(path.join(vault, '夜之城随笔.md'), '这是第一篇写好了的完整文章内容。');
    fs.writeFileSync(path.join(vault, '第二篇中文笔记.md'), '这是第二篇写好了的完整文章内容。');
    const before = fs.readdirSync(postsDir).filter(file => file.endsWith('.md')).sort();

    const out = runPublish(['--all', '--dry-run', '--vault', vault]);
    assert.match(out, /批量模式：2 篇可发布笔记/);
    assert.match(out, /已跳过 1 篇空白 \/ 未写完/);
    assert.match(out, /夜之城随笔/);
    assert.match(out, /第二篇中文笔记/);
    assert.ok(!out.includes('空笔记.md'), '空笔记不应进入清单');
    assert.match(out, /\[dry-run\] 未写入任何文件/);

    // 两篇纯中文标题都会退回到 post-YYYYMMDD，批量时第二篇必须自动加后缀。
    const slugs = [...out.matchAll(/src\/content\/posts\/([a-z0-9-]+)\.md/g)].map(match => match[1]);
    assert.equal(slugs.length, 2);
    assert.equal(new Set(slugs).size, 2, '同批笔记不能互相覆盖');
    assert.ok(slugs.some(slug => slug.endsWith('-2')), '撞车的 slug 应自动加 -2');

    const after = fs.readdirSync(postsDir).filter(file => file.endsWith('.md')).sort();
    assert.deepEqual(after, before, 'dry-run 不能写入任何文章');
  } finally {
    fs.rmSync(vault, { recursive: true, force: true });
  }
});

test('不带 --all 时仍只处理最新一篇；--all 与单篇参数互斥', () => {
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-batch-single-'));
  try {
    fs.writeFileSync(path.join(vault, 'older.md'), '这是较早写好的一篇文章内容。');
    fs.writeFileSync(path.join(vault, 'newer.md'), '这是刚刚写完的最新一篇文章内容。');
    fs.utimesSync(path.join(vault, 'newer.md'), new Date('2026-11-24T12:00:00Z'), new Date('2026-11-24T12:00:00Z'));
    fs.utimesSync(path.join(vault, 'older.md'), new Date('2026-11-20T12:00:00Z'), new Date('2026-11-20T12:00:00Z'));

    const single = runPublish(['--dry-run', '--vault', vault]);
    assert.ok(!single.includes('批量模式'), '默认模式不应切换成批量');
    assert.match(single, /来源：newer\.md/);
    assert.ok(!single.includes('来源：older.md'), '默认只选最新一篇');

    let stderr = '';
    try {
      runPublish(['--all', '--file', 'newer.md', '--vault', vault]);
    } catch (error) {
      stderr = String((error as { stderr?: Buffer }).stderr ?? error);
    }
    assert.match(stderr, /--all 是批量模式，不能与 --file/);
  } finally {
    fs.rmSync(vault, { recursive: true, force: true });
  }
});
