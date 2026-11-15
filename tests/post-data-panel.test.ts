import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative: string) => fs.existsSync(path.join(root, relative));

test('传输数据面板展示截图中的四项数据，.MD 只是纯文本标识', () => {
  const source = read('src/components/PostDataPanel.astro');
  assert.match(source, /传输数据/);
  for (const label of ['已发布', '阅读时间', '标签', '原始数据']) {
    assert.match(source, new RegExp(`<dt>${label}</dt>`));
  }
  assert.match(source, /<dd class="transmission-panel__accent">\.MD<\/dd>/);
  assert.doesNotMatch(source, /<a\b/, '.MD 不应是超链接');
  assert.doesNotMatch(source, /href=/, '面板内不应出现链接');
  assert.match(source, /transmission-panel__accent/);
  assert.match(source, /clip-path: polygon/);
});

test('文章页把内容集合的日期、阅读时间、标签数传给左侧面板', () => {
  const source = read('src/pages/[year]/[month]/[day]/[slug].astro');
  assert.match(source, /getPosts\(\)/);
  assert.match(source, /tagCount=\{post\.tags\.length\}/);
  assert.match(source, /readTime=\{post\.readTime\}/);
  assert.doesNotMatch(source, /rawUrl/, '不再需要原始数据链接');
  assert.match(source, /slot="rail"/);
  assert.match(source, /lg:hidden/);
  const panels = source.match(/<PostDataPanel /g) ?? [];
  assert.equal(panels.length, 2, '桌面左侧栏与移动端内联各一份');
});

test('布局提供左侧栏插槽，未发布多余的原始数据端点', () => {
  assert.match(read('src/layouts/BaseLayout.astro'), /<slot name="rail" \/>/);
  assert.equal(exists('src/pages/[year]/[month]/[day]/[slug].md.ts'), false);
  assert.doesNotMatch(read('scripts/check-edgeone.mjs'), /`\$\{base\}\.md`/);
  assert.doesNotMatch(read('scripts/dist-pages.mjs'), /slug\.name\.includes\('\.'\)/);
});
