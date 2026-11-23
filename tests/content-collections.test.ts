import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative: string) => fs.existsSync(path.join(root, relative));

test('内容集合配置位于 src/content.config.ts，使用 glob loader 与共享 schema', () => {
  const source = read('src/content.config.ts');
  assert.match(source, /from 'astro:content'/);
  assert.match(source, /from 'astro\/loaders'/);
  assert.match(source, /defineCollection\(/);
  assert.match(source, /glob\(\{/);
  assert.match(source, /base: '\.\/src\/content\/posts'/);
  assert.match(source, /postSchema/);
  assert.match(source, /export const collections = \{ posts \}/);
});

test('文章原文只放在 src/content/posts，schema 可被测试独立引用', () => {
  const files = fs.readdirSync(path.join(root, 'src/content/posts')).filter(name => name.endsWith('.md'));
  assert.ok(files.length > 0, '内容集合至少要有一篇文章');
  for (const file of files) {
    assert.match(read(`src/content/posts/${file}`), /^---\n/, `${file} 需要 frontmatter`);
  }
  assert.ok(exists('src/content/posts/hello-night-city.md'));
  assert.ok(exists('src/lib/post-schema.ts'));
  assert.doesNotMatch(read('src/lib/post-schema.ts'), /gray-matter/);
});

test('页面与端点统一通过内容集合读取文章，文章页用官方 render(entry)', () => {
  for (const page of [
    'src/pages/index.astro',
    'src/pages/net.astro',
    'src/pages/rss.xml.ts',
    'src/pages/sitemap.xml.ts'
  ]) {
    assert.match(read(page), /getPosts\(\)/, `${page} 必须读取内容集合`);
  }
  const article = read('src/pages/[year]/[month]/[day]/[slug].astro');
  assert.match(article, /getPostEntries\(\)/);
  assert.match(article, /render\(entry\)/);
  assert.match(article, /<Content \/>/);
  assert.doesNotMatch(article, /set:html=\{post\.content\}/, '正文不应再由自建 HTML 字符串注入');
  assert.match(read('src/lib/posts.ts'), /getCollection\('posts'\)/);
  assert.doesNotMatch(read('src/lib/posts.ts'), /services\/posts\.json/);
});

test('Markdown 交给 Astro 官方处理器：消毒白名单 + 图片相对路径', () => {
  const config = read('astro.config.mjs');
  assert.match(config, /processor: unified\(/);
  assert.match(config, /rehypeSanitize/);
  assert.match(config, /sanitizeSchema/);
  assert.ok(exists('scripts/markdown-config.mjs'));
  assert.ok(!exists('src/lib/markdown.ts'), '自建 marked / sanitize-html 管线已移除');
  assert.ok(exists('src/lib/text.ts'), '纯文本工具与渲染解耦');
  for (const post of ['glm-5-4-coding-plan.md', 'ceo-claude-code-vs-code.md']) {
    assert.match(read(`src/content/posts/${post}`), /\]\(\.\/images\//, `${post} 的配图必须用相对路径`);
  }
  assert.ok(!exists('public/images'), '文章配图不再放 public/ 原样复制');
});

test('旧的自建内容编译链路与根目录散落源码已清理', () => {
  const legacy = [
    '_posts', 'config.ts', 'constants.ts', 'types.ts', 'metadata.json',
    'lib/permalink.ts', 'services/posts.json',
    'scripts/build-content.ts', 'scripts/content.ts', 'scripts/markdown.ts',
    'assets/og-fonts'
  ];
  for (const item of legacy) {
    assert.equal(exists(item), false, `不应存在 ${item}`);
  }
  for (const source of [
    'src/consts.ts', 'src/types.ts', 'src/lib/permalink.ts',
    'src/lib/text.ts', 'src/lib/post-utils.ts', 'src/assets/og-fonts'
  ]) {
    assert.ok(exists(source), `缺少 ${source}`);
  }
  assert.equal(exists('src/lib/markdown.ts'), false, '不应存在自建 Markdown 渲染器');
});

test('package.json 不再依赖自建 Markdown 渲染 / 消毒库', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies['gray-matter'], undefined);
  assert.equal(pkg.dependencies['fast-glob'], undefined);
  for (const legacy of ['marked', 'marked-highlight', 'highlight.js', 'sanitize-html']) {
    assert.equal(pkg.dependencies[legacy], undefined, `已移除 ${legacy}`);
  }
  assert.ok(pkg.dependencies['@astrojs/markdown-remark'], '官方 Unified 处理器');
  assert.ok(pkg.dependencies['rehype-sanitize'], '官方消毒插件');
  assert.equal(pkg.devDependencies, undefined, '按 Astro 官方建议，构建期依赖统一放 dependencies');
});

test('构建后处理直接扫描 dist，不再依赖中间 JSON 清单', () => {
  const postbuild = read('scripts/postbuild.mjs');
  assert.match(postbuild, /findPostDirs/);
  assert.doesNotMatch(postbuild, /posts\.json/);
  assert.match(read('scripts/dist-pages.mjs'), /YYYY\/MM\/DD\/slug/);
});
