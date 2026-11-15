import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

test('传输数据面板展示截图中的四项数据，并提供 .MD 原始链接', () => {
  const source = read('src/components/PostDataPanel.astro');
  assert.match(source, /传输数据/);
  for (const label of ['已发布', '阅读时间', '标签', '原始数据']) {
    assert.match(source, new RegExp(`<dt>${label}</dt>`));
  }
  assert.match(source, /href=\{rawUrl\}/);
  assert.match(source, /aria-label="查看文章原始 Markdown 数据"/);
  assert.match(source, /transmission-panel__accent/);
  assert.match(source, /clip-path: polygon/);
});

test('文章页把内容集合的日期、阅读时间、标签数传给左侧面板', () => {
  const source = read('src/pages/[year]/[month]/[day]/[slug].astro');
  assert.match(source, /getPosts\(\)/);
  assert.match(source, /tagCount=\{post\.tags\.length\}/);
  assert.match(source, /readTime=\{post\.readTime\}/);
  assert.match(source, /rawUrl=\{rawUrl\}/);
  assert.match(source, /const rawUrl = `\$\{post\.permalink\}\.md`/);
  assert.match(source, /slot="rail"/);
  assert.match(source, /lg:hidden/);
  const panels = source.match(/<PostDataPanel /g) ?? [];
  assert.equal(panels.length, 2, '桌面左侧栏与移动端内联各一份');
});

test('布局提供左侧栏插槽，原始数据端点发布每篇 .md', () => {
  assert.match(read('src/layouts/BaseLayout.astro'), /<slot name="rail" \/>/);
  const endpoint = read('src/pages/[year]/[month]/[day]/[slug].md.ts');
  assert.match(endpoint, /getCollection\('posts'\)/);
  assert.match(endpoint, /getPosts\(\)/);
  assert.match(endpoint, /'Content-Type': 'text\/markdown; charset=utf-8'/);
  assert.match(read('scripts/check-edgeone.mjs'), /`\$\{base\}\.md`/);
  assert.match(read('scripts/dist-pages.mjs'), /slug\.name\.includes\('\.'\)/);
});
