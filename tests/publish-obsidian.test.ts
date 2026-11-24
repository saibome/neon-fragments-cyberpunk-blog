import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  slugFromTitle,
  normalizeSlug,
  normalizeDate,
  toSummary,
  splitFrontmatter,
  parseFrontmatter,
  parseTags,
  yamlScalar,
  replaceTitle,
  replaceTags,
  buildPost,
  updatePost,
  convertEmbeds,
  existingImageAlts,
  isHashName,
  readableAlt,
  hasSubstance,
  collectNotes
} from '../scripts/publish-obsidian.mjs';
import { postSchema } from '../src/lib/post-schema';

const scriptPath = fileURLToPath(new URL('../scripts/publish-obsidian.mjs', import.meta.url));
const projectRoot = path.resolve(path.dirname(scriptPath), '..');
const postsDir = path.join(projectRoot, 'src', 'content', 'posts');

// bun 内置 YAML 解析与 Astro 读取 frontmatter 的行为一致，用来验证生成结果真能被内容集合识别。
const yaml = (globalThis as typeof globalThis & {
  Bun?: { YAML?: { parse: (text: string) => Record<string, unknown> } };
}).Bun?.YAML;

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

test('Obsidian Properties 的块序列 tags 能被解析，多种写法统一成标签数组', () => {
  const block = 'title: 站在火星看地球\ndate: 2026-11-25\ntags:\n  - AI\n  - 随笔\ndescription: 一段摘要';
  const meta = parseFrontmatter(block);
  assert.deepEqual(meta.tags, ['AI', '随笔'], '块序列属性不能再被当成空值丢掉');
  assert.equal(meta.title, '站在火星看地球');
  assert.equal(meta.date, '2026-11-25');
  assert.equal(meta.description, '一段摘要');

  assert.deepEqual(parseTags(block), ['AI', '随笔']);
  assert.deepEqual(parseTags('tags: [AI, GLM, Coding Plan]'), ['AI', 'GLM', 'Coding Plan']);
  assert.deepEqual(parseTags('tags: AI, 随笔'), ['AI', '随笔']);
  assert.deepEqual(parseTags('tags:\n  - #AI\n  - "随笔"'), ['AI', '随笔']);
  assert.deepEqual(parseTags('tag: #AI #随笔'), ['AI', '随笔']);
  assert.deepEqual(parseTags('tags: AI, AI'), ['AI'], '重复标签去重');
  assert.deepEqual(parseTags('tags:'), []);
  assert.deepEqual(parseTags('title: 无标签'), []);
  assert.deepEqual(parseTags(''), []);
});

test('生成的 tags 是合法 YAML 数组，且能被 Astro 内容集合 schema 接受', () => {
  assert.ok(yaml, '需要 bun 内置 YAML 解析来做真实校验');
  const post = buildPost({
    title: '站在火星看地球',
    slug: 'mars',
    date: '2026-11-25',
    tags: ['AI', 'Coding Plan', 'a: b'],
    description: '一段摘要',
    body: '正文'
  });
  const frontmatter = splitFrontmatter(post).frontmatter;
  assert.match(frontmatter, /tags: \[AI, Coding Plan, "a: b"\]/, '含特殊字符的标签必须转义');
  const parsed = yaml.parse(frontmatter);
  assert.deepEqual(parsed.tags, ['AI', 'Coding Plan', 'a: b']);
  const result = postSchema.safeParse(parsed);
  assert.equal(result.success, true, 'Astro schema 必须识别生成的 tags');
  assert.deepEqual(result.success ? result.data.tags : [], ['AI', 'Coding Plan', 'a: b']);
});

test('更新时同步笔记 tags；笔记没写 tags 则保留文章里手工调过的标签', () => {
  assert.ok(yaml, '需要 bun 内置 YAML 解析来做真实校验');
  const existing = buildPost({
    title: '旧标题', slug: 'x', date: '2026-11-25', tags: ['随笔'], description: '手工摘要', body: '旧正文'
  });

  const synced = updatePost(existing, { title: '新标题', body: '新正文', tags: ['AI', '随笔'] });
  const syncedFm = splitFrontmatter(synced).frontmatter;
  assert.match(syncedFm, /tags: \[AI, 随笔\]/);
  assert.match(syncedFm, /description: 手工摘要/, '其它手工字段不能被覆盖');
  assert.deepEqual(yaml.parse(syncedFm).tags, ['AI', '随笔']);

  const kept = updatePost(existing, { title: '新标题', body: '新正文' });
  assert.match(splitFrontmatter(kept).frontmatter, /tags: \[随笔\]/);

  // 已有文章把 tags 写成 Obsidian 块序列时，替换后不能留下旧的 - 列表行。
  const blockPost = '---\ntitle: 旧标题\nslug: x\ndate: 2026-11-25\ntags:\n  - 随笔\ndescription: 手工摘要\n---\n\n旧正文\n';
  assert.equal(replaceTags('tags:\n  - 随笔\ndescription: 手工摘要', ['AI']), 'tags: [AI]\ndescription: 手工摘要');
  const replaced = updatePost(blockPost, { title: '新标题', body: '新正文', tags: ['AI'] });
  const replacedFm = splitFrontmatter(replaced).frontmatter;
  assert.ok(!replacedFm.includes('  - 随笔'), '旧块序列应被整块替换');
  assert.deepEqual(yaml.parse(replacedFm).tags, ['AI']);
});

test('dry-run 把笔记块序列 tags 带进文章；--tags 显式指定时优先', () => {
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-note-tags-'));
  try {
    fs.writeFileSync(
      path.join(vault, '火星笔记.md'),
      '---\ntitle: 站在火星看地球\nslug: mars\ntags:\n  - AI\n  - 随笔\n---\n\n这是一篇写好了的完整文章内容，用来验证笔记属性能被识别。'
    );
    const fromNote = runPublish(['--dry-run', '--vault', vault]);
    assert.match(fromNote, /tags: \[AI, 随笔\]/, '笔记属性必须进入生成的 frontmatter');
    assert.match(fromNote, /\[dry-run\] 未写入任何文件/);

    const fromCli = runPublish(['--dry-run', '--vault', vault, '--tags', 'CLI,标签']);
    assert.match(fromCli, /tags: \[CLI, 标签\]/, 'CLI 显式参数优先级最高');
  } finally {
    fs.rmSync(vault, { recursive: true, force: true });
  }
});

test('笔记 slug 按合法形式规范化：空格 / 破折号 / 中文 / 超长都安全处理', () => {
  const long = normalizeSlug('Viewing Earth from Mars—A Planetary-Scale Civilization Is Being Born');
  assert.match(long, /^[a-z0-9][a-z0-9_-]*$/);
  assert.ok(long.length <= 60, '超长 slug 应截断');
  assert.ok(!long.endsWith('-'), '超长应在词边界截断，不留尾随连字符');
  assert.ok(long.startsWith('viewing-earth-from-mars'));

  assert.equal(normalizeSlug('  Hello—World!! '), 'hello-world');
  assert.equal(normalizeSlug('My_Post'), 'my_post');
  assert.equal(normalizeSlug('GLM-5.4 Coding Plan'), 'glm-5-4-coding-plan');
  assert.equal(normalizeSlug('纯中文标题'), '', '纯中文无法生成合法 slug，交给调用方回退');
  assert.equal(normalizeSlug('———'), '');
  assert.equal(normalizeSlug(''), '');
  assert.equal(normalizeSlug(undefined), '');
});

test('笔记 date 规范化成 UTC 的 YYYY-MM-DD，无效日期安全回退', () => {
  assert.equal(normalizeDate('2026-11-25'), '2026-11-25');
  assert.equal(normalizeDate('2026/11/5'), '2026-11-05');
  assert.equal(normalizeDate('2026.2.3'), '2026-02-03');
  assert.equal(normalizeDate('2026-11-25T10:30:00'), '2026-11-25');
  assert.equal(normalizeDate('2026-11-25 10:30'), '2026-11-25');
  assert.equal(normalizeDate('2026-02-30'), '', '不存在的日期不能被 Date 自动滚动');
  assert.equal(normalizeDate('2026-13-01'), '');
  assert.equal(normalizeDate('November 25, 2026'), '');
  assert.equal(normalizeDate('2026-11-25abc'), '');
  assert.equal(normalizeDate(''), '');
  assert.equal(normalizeDate(undefined), '');
});

test('dry-run：笔记 slug / date 规范化后进入新建文章，且 Astro schema 能识别', () => {
  assert.ok(yaml, '需要 bun 内置 YAML 解析来做真实校验');
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-note-meta-'));
  try {
    fs.writeFileSync(
      path.join(vault, '火星笔记.md'),
      '---\ntitle: 站在火星看地球\nslug: Viewing Earth from Mars—A Planetary-Scale Civilization Is Being Born\ndate: 2026/11/20\ntags:\n  - AI\n---\n\n这是一篇写好了的完整文章内容，用来验证笔记属性会被规范化。'
    );
    const out = runPublish(['--dry-run', '--vault', vault]);
    const slug = out.match(/目标：src\/content\/posts\/([a-z0-9_-]+)\.md/)?.[1] ?? '';
    assert.match(slug, /^[a-z0-9][a-z0-9_-]*$/);
    assert.match(out, new RegExp(`slug: ${slug}`));
    assert.match(out, /date: 2026-11-20/);
    assert.match(out, /\/2026\/11\/20\//, 'URL 的日期段也应来自笔记 date');
    assert.match(out, /笔记属性：slug/, '预览里要显示识别到的笔记属性');
    assert.match(out, /tags: \[AI\]/);

    const frontmatter = out.match(/--- 预览（前 20 行）---\n---\n([\s\S]*?)\n---/)?.[1] ?? '';
    assert.ok(frontmatter, '预览应包含完整 frontmatter');
    const parsed = yaml.parse(frontmatter);
    assert.equal(parsed.slug, slug);
    assert.equal(parsed.date, '2026-11-20');
    assert.deepEqual(parsed.tags, ['AI']);
    const result = postSchema.safeParse(parsed);
    assert.equal(result.success, true, 'Astro schema 必须接受规范化后的 slug / date / tags');
  } finally {
    fs.rmSync(vault, { recursive: true, force: true });
  }
});

test('批量时规范化后的笔记 slug 撞车仍会自动加 -2', () => {
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'nf-note-slug-clash-'));
  try {
    const note = '---\nslug: Same Post Name\ndate: 2026-11-20\n---\n\n';
    fs.writeFileSync(path.join(vault, 'a.md'), `${note}第一篇写好了的完整文章内容。`);
    fs.writeFileSync(path.join(vault, 'b.md'), `${note}第二篇写好了的完整文章内容。`);
    const out = runPublish(['--all', '--dry-run', '--vault', vault]);
    const slugs = [...out.matchAll(/src\/content\/posts\/([a-z0-9-]+)\.md/g)].map(match => match[1]);
    assert.equal(slugs.length, 2);
    assert.ok(slugs.includes('same-post-name'));
    assert.ok(slugs.includes('same-post-name-2'), '撞车的 slug 应自动加 -2');
  } finally {
    fs.rmSync(vault, { recursive: true, force: true });
  }
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
