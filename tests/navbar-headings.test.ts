import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

test('正文二级标题为黄色带方块，三级标题为青色', () => {
  const css = read('src/styles/global.css');
  const h2 = css.match(/\.cyber-markdown h2 \{[^}]*\}/)?.[0] ?? '';
  assert.match(h2, /color: var\(--color-cyber-yellow\)/);
  assert.match(h2, /font-weight: 700/);
  assert.doesNotMatch(h2, /border-left/);
  assert.match(css, /\.cyber-markdown h2::before \{[^}]*background: currentColor/s);
  const h3 = css.match(/\.cyber-markdown h3 \{[^}]*\}/)?.[0] ?? '';
  assert.match(h3, /color: var\(--color-cyber-cyan\)/);
  assert.match(h3, /font-weight: 700/);
});

test('logo 每 7 秒静止后播放 1 秒 glitch（8s 周期）', () => {
  const css = read('src/styles/global.css');
  assert.match(css, /@keyframes site-logo-glitch/);
  assert.match(css, /0%, 87\.49%/);
  assert.match(css, /87\.5% \{/);
  assert.match(css, /animation: site-logo-glitch 8s infinite/);
  assert.match(css, /text-shadow: 2px 0 var\(--color-cyber-red\)/);
});

test('手机端顶栏只显示 SAIBO.ME，并用黄色开口线框包住搜索与菜单', () => {
  const nav = read('src/components/Navbar.astro');
  assert.match(nav, /SAIBO<span class="text-white">\.<\/span>ME/);
  assert.doesNotMatch(nav, />NC</);
  assert.match(nav, /site-logo-glitch/);
  assert.match(nav, /font-display font-bold italic tracking-tighter/);
  assert.match(nav, /data-nav-search/);
  assert.match(nav, /data-profile-toggle/);
  assert.match(nav, /M26 1H111V43H1V13/);
  assert.match(nav, /md:hidden relative flex items-center h-11 w-28/);
  assert.match(nav, /hidden md:flex items-center/, '在线状态只在桌面显示');
  assert.match(nav, /bg-cyber-yellow\/50 md:hidden/, '手机端底部黄线');
});

test('顶栏搜索按钮聚焦首页搜索框，不是死按钮', () => {
  const js = read('src/scripts/site.js');
  assert.match(js, /data-nav-search/);
  assert.match(js, /data-post-search/);
  assert.match(js, /#search/);
});
