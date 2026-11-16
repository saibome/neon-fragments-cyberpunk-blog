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
  assert.match(source, /cyber-panel__body/, '外框使用共享类');
});

test('作者卡与传输数据面板共用同一套描边与右下切角', () => {
  const css = read('src/styles/global.css');
  const frame = css.match(/\.cyber-panel \{[^}]*\}/s)?.[0] ?? '';
  assert.match(frame, /padding: 1px/, '外层 1px 露出底色充当描边');
  assert.match(frame, /clip-path: polygon\(0 0, 100% 0, 100% calc\(100% - 22px\), calc\(100% - 22px\) 100%, 0 100%\)/);
  const body = css.match(/\.cyber-panel__body \{[^}]*\}/s)?.[0] ?? '';
  assert.match(body, /background-color: #0b0c0d/);
  assert.match(body, /clip-path: polygon/);
  assert.match(body, /background-size: 20px 20px/);

  const sidebar = read('src/components/ProfileSidebar.astro');
  assert.match(sidebar, /class="cyber-panel"/);
  assert.match(sidebar, /cyber-panel__body/);
  assert.doesNotMatch(sidebar, /clip-corner-tr/, '不再使用右上切角');
  assert.doesNotMatch(sidebar, /border border-cyber-gray\/50/, '不再使用普通边框');
  assert.doesNotMatch(sidebar, /bg-\[linear-gradient/, '网格由共享类提供，避免叠两层');

  const panel = read('src/components/PostDataPanel.astro');
  assert.match(panel, /class:list=\{\['cyber-panel'/);
  assert.match(panel, /cyber-panel__body/);
  assert.doesNotMatch(panel, /\.transmission-panel \{/, '外框定义只在 global.css 里有一份');
});

test('文章页只渲染一份左侧面板，移动端不显示', () => {
  const source = read('src/pages/[year]/[month]/[day]/[slug].astro');
  assert.match(source, /getPosts\(\)/);
  assert.match(source, /tagCount=\{post\.tags\.length\}/);
  assert.match(source, /readTime=\{post\.readTime\}/);
  assert.doesNotMatch(source, /rawUrl/, '不再需要原始数据链接');
  assert.match(source, /slot="rail"/);
  assert.doesNotMatch(source, /class="[^"]*lg:hidden/, '不应再有移动端内联副本');
  const panels = source.match(/<PostDataPanel /g) ?? [];
  assert.equal(panels.length, 1, '只保留桌面左侧栏这一份');
  assert.match(read('src/components/Navbar.astro'), /hidden lg:block/, '左侧栏必须在 lg 以下隐藏');
});

test('布局提供左侧栏插槽，未发布多余的原始数据端点', () => {
  assert.match(read('src/layouts/BaseLayout.astro'), /<slot name="rail" \/>/);
  assert.equal(exists('src/pages/[year]/[month]/[day]/[slug].md.ts'), false);
  assert.doesNotMatch(read('scripts/check-edgeone.mjs'), /`\$\{base\}\.md`/);
  assert.doesNotMatch(read('scripts/dist-pages.mjs'), /slug\.name\.includes\('\.'\)/);
});

test('文章页不再包含分享弹窗、分享按钮及其专用资源', () => {
  const source = read('src/pages/[year]/[month]/[day]/[slug].astro');
  assert.doesNotMatch(source, /ShareModal|data-share-open|分享文章/);
  assert.doesNotMatch(read('src/styles/global.css'), /data-share-dialog/);
  assert.doesNotMatch(read('src/pages/gear.astro'), /分享弹窗/);

  for (const file of [
    'src/components/ShareModal.astro',
    'src/scripts/share-dialog.js',
    'src/components/CyberButton.astro'
  ]) {
    assert.equal(exists(file), false, `${file} 应已删除`);
  }

  const icons = JSON.parse(read('src/data/icons.json')) as Record<string, string>;
  for (const name of ['share-2', 'copy', 'link']) {
    assert.equal(name in icons, false, `图标 ${name} 只服务于分享弹窗`);
  }
});
