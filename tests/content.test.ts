import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, mergeAuthor, sanitizeMarkdownHtml, computeReadTime } from '../scripts/content';
import { renderMarkdown } from '../scripts/markdown';
import { DEFAULT_AUTHOR } from '../config';

test('合法 frontmatter 解析成稳定字段', () => {
  const raw = `---
title: 测试文章
slug: test-post
date: 2026-11-14
tags: [随笔, 建站]
---

# 标题

正文内容`;

  const fm = parseFrontmatter(raw, '_posts/test-post.md');
  assert.equal(fm.title, '测试文章');
  assert.equal(fm.slug, 'test-post');
  assert.equal(fm.date, '2026-11-14T00:00:00.000Z');
  assert.deepEqual(fm.tags, ['随笔', '建站']);
  assert.deepEqual(fm.author, DEFAULT_AUTHOR);
  assert.ok(fm.readTime.startsWith('约 '));
});

test('非法 tags / date / slug 会被拒绝，而不是在运行时崩溃', () => {
  assert.throws(
    () => parseFrontmatter('---\ntags: 随笔\n---\n\n正文', 'bad.md'),
    /frontmatter 无效/
  );
  assert.throws(
    () => parseFrontmatter('---\ndate: "不是日期"\n---\n\n正文', 'bad.md'),
    /不是有效日期/
  );
  assert.throws(
    () => parseFrontmatter('---\nslug: "bad slug!"\n---\n\n正文', 'bad.md'),
    /frontmatter 无效/
  );
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
