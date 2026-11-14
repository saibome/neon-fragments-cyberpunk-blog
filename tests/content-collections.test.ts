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

test('页面与端点统一通过 getPosts() 读取内容集合', () => {
  for (const page of [
    'src/pages/index.astro',
    'src/pages/net.astro',
    'src/pages/rss.xml.ts',
    'src/pages/sitemap.xml.ts',
    'src/pages/[year]/[month]/[day]/[slug].astro'
  ]) {
    assert.match(read(page), /getPosts\(\)/, `${page} 必须读取内容集合`);
  }
  assert.match(read('src/lib/posts.ts'), /getCollection\('posts'\)/);
  assert.doesNotMatch(read('src/lib/posts.ts'), /services\/posts\.json/);
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
    'src/lib/markdown.ts', 'src/lib/post-utils.ts', 'src/assets/og-fonts'
  ]) {
    assert.ok(exists(source), `缺少 ${source}`);
  }
});

test('package.json 不再调用自建内容编译脚本，依赖统一放 dependencies', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['build:content'], undefined);
  assert.doesNotMatch(pkg.scripts.build, /build-content/);
  assert.equal(pkg.dependencies['gray-matter'], undefined);
  assert.equal(pkg.dependencies['fast-glob'], undefined);
  assert.equal(pkg.devDependencies, undefined, '按 Astro 官方建议，构建期依赖统一放 dependencies');
});

test('构建后处理直接扫描 dist，不再依赖中间 JSON 清单', () => {
  const postbuild = read('scripts/postbuild.mjs');
  assert.match(postbuild, /findPostDirs/);
  assert.doesNotMatch(postbuild, /posts\.json/);
  assert.match(read('scripts/dist-pages.mjs'), /YYYY\/MM\/DD\/slug/);
});
