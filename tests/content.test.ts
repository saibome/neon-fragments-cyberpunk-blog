import test from 'node:test';
import assert from 'node:assert/strict';
import { postSchema } from '../src/lib/post-schema';
import { mergeAuthor, toBlogPost } from '../src/lib/post-utils';
import { markdownToText, computeReadTime } from '../src/lib/text';
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

test('集合条目保存原始 Markdown 与纯文本，正文交由 render(entry) 渲染', () => {
  const body = '# 标题\n\n正文 <script>alert(1)</script>';
  const post = toBlogPost({
    id: 'entry-id',
    data: postSchema.parse(validFrontmatter),
    body
  });
  assert.equal(post.slug, 'test-post', 'frontmatter.slug 优先于 entry.id');
  assert.equal(post.date, '2026-11-14T00:00:00.000Z');
  assert.equal(post.permalink, '/2026/11/14/test-post');
  assert.deepEqual(post.author, DEFAULT_AUTHOR);
  assert.equal(post.body, body, '数据层保留原文，不在纯函数层产出 HTML');
  assert.equal(post.text, '标题 正文', '摘要用的纯文本不含脚本内容');
  assert.ok(post.readTime.startsWith('约 '));
});

test('作者对象只写一半时与默认档案合并', () => {
  const author = mergeAuthor({ name: 'Agent Mosley', stats: { ram: 12 } });
  assert.equal(author.name, 'Agent Mosley');
  assert.equal(author.stats.ram, 12);
  assert.equal(author.stats.cpu, DEFAULT_AUTHOR.stats.cpu);
  assert.equal(author.handle, DEFAULT_AUTHOR.handle);
});

test('纯文本提取去掉 Markdown 标记与图片，只供摘要 / 阅读时长', () => {
  assert.equal(
    markdownToText('# 标题\n\n**加粗** 和 [链接](https://x.com)\n\n![配图](./images/a.png)\n\n`代码`'),
    '标题 加粗 和 链接 代码'
  );
  assert.equal(markdownToText('```ts\nconst a = 1;\n```'), '');
  assert.equal(markdownToText('<script>alert(1)</script>正文'), '正文');
});

test('阅读时长至少 1 分钟', () => {
  assert.equal(computeReadTime(''), '约 1 分钟');
});
