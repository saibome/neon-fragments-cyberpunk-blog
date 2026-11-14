import test from 'node:test';
import assert from 'node:assert/strict';
import { postSchema } from '../src/lib/post-schema';
import { mergeAuthor, toBlogPost } from '../src/lib/post-utils';
import { sanitizeMarkdownHtml, renderMarkdown, computeReadTime } from '../src/lib/markdown';
import { DEFAULT_AUTHOR } from '../src/consts';

const validFrontmatter = {
  title: ' 测试文章 ',
  slug: 'test-post',
  date: '2026-11-14',
  tags: ['随笔', '建站']
};

test('内容集合 schema 校验并归一化 frontmatter', () => {
  const data = postSchema.parse(validFrontmatter);
  assert.equal(data.title, '测试文章');
  assert.equal(data.slug, 'test-post');
  assert.deepEqual(data.tags, ['随笔', '建站']);
  assert.deepEqual(postSchema.parse({ title: 'x', date: '2026-11-14' }).tags, []);
  assert.ok(postSchema.parse({ title: 'x', date: new Date('2026-11-14') }).date instanceof Date);
});

test('缺少 title / date 或类型错误的字段会被集合 schema 拒绝', () => {
  assert.equal(postSchema.safeParse({ date: '2026-11-14' }).success, false);
  assert.equal(postSchema.safeParse({ title: 'x' }).success, false);
  assert.equal(postSchema.safeParse({ ...validFrontmatter, tags: '随笔' }).success, false);
  assert.equal(postSchema.safeParse({ ...validFrontmatter, slug: 'bad slug!' }).success, false);
});

test('无效日期与非法 slug 在条目归一化阶段报错', () => {
  assert.throws(
    () => toBlogPost({
      id: 'x',
      data: postSchema.parse({ ...validFrontmatter, date: '不是日期' }),
      body: ''
    }),
    /不是有效日期/
  );
  assert.throws(
    () => toBlogPost({
      id: 'bad slug!',
      data: postSchema.parse({ title: 'x', date: '2026-11-14' }),
      body: ''
    }),
    /slug 无效/
  );
});

test('集合条目生成 UTC permalink、默认档案与消毒后的正文', () => {
  const post = toBlogPost({
    id: 'entry-id',
    data: postSchema.parse(validFrontmatter),
    body: '# 标题\n\n正文 <script>alert(1)</script>'
  });
  assert.equal(post.slug, 'test-post', 'frontmatter.slug 优先于 entry.id');
  assert.equal(post.date, '2026-11-14T00:00:00.000Z');
  assert.equal(post.permalink, '/2026/11/14/test-post');
  assert.deepEqual(post.author, DEFAULT_AUTHOR);
  assert.ok(post.content.includes('<h1>标题</h1>'));
  assert.ok(!post.content.includes('<script'));
  assert.ok(post.readTime.startsWith('约 '));
});

test('作者对象只写一半时与默认档案合并', () => {
  const author = mergeAuthor({ name: 'Agent Mosley', stats: { ram: 12 } });
  assert.equal(author.name, 'Agent Mosley');
  assert.equal(author.stats.ram, 12);
  assert.equal(author.stats.cpu, DEFAULT_AUTHOR.stats.cpu);
  assert.equal(author.handle, DEFAULT_AUTHOR.handle);
});

test('正文消毒会移除脚本与事件属性，但保留代码高亮 class', () => {
  const clean = sanitizeMarkdownHtml(
    '<p onclick="alert(1)">你好<script>alert(2)</script>' +
    '<code class="hljs language-ts evil">const x = 1;</code></p>' +
    '<img src="javascript:alert(3)">'
  );

  assert.ok(!clean.includes('<script'));
  assert.ok(!clean.includes('onclick'));
  assert.ok(!clean.includes('evil'));
  assert.ok(!clean.includes('javascript:'));
  assert.ok(clean.includes('hljs'));
  assert.ok(clean.includes('language-ts'));
});

test('Markdown 渲染产出高亮代码且不保留脚本', () => {
  const html = renderMarkdown('```ts\nconst signal = 1;\n```\n\n<script>alert(1)</script>');
  assert.ok(html.includes('language-ts'));
  assert.ok(html.includes('hljs-keyword'));
  assert.ok(!html.includes('<script'));
});

test('阅读时长至少 1 分钟', () => {
  assert.equal(computeReadTime(''), '约 1 分钟');
});
