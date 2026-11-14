import { execFileSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const load = (relative: string) =>
  import(pathToFileURL(path.join(root, relative)).href);

const config = JSON.parse(read('edgeone.json'));

test('edgeone.json 声明静态产物、pnpm 安装命令与预装 Node 版本', () => {
  assert.equal(config.outputDirectory, 'dist');
  assert.match(config.buildCommand, /pnpm build/);
  assert.match(config.installCommand, /pnpm@12\.18\.0/);
  assert.match(config.installCommand, /--frozen-lockfile/);
  assert.equal(config.nodeVersion, '24.5.0', 'Astro 7 要求 >=22.23.4，22.x 预装版本过低');
  assert.ok(['24.5.0', '24.11.0', '24.18.0'].includes(config.nodeVersion), '必须是平台预装版本');
  assert.ok(config.rewrites.length <= 100);
  assert.ok(config.headers.length <= 30);
});

test('clean URL 兜底规则指向已生成的平铺页面', () => {
  const sources = config.rewrites.map((rule: { source: string }) => rule.source);
  assert.deepEqual(sources.sort(), ['/data', '/gear', '/net']);
  for (const rule of config.rewrites) {
    assert.equal(rule.destination, `${rule.source}.html`);
  }
});

test('根目录不提交 .nvmrc，本地 Node 26 只作为模板提供', () => {
  assert.ok(read('.nvmrc.example').trim().startsWith('26'));
  const tracked = execFileSync('git', ['ls-files', '--', '.nvmrc'], {
    cwd: root,
    encoding: 'utf8'
  }).trim();
  assert.equal(tracked, '', '提交 .nvmrc 会让 EdgeOne 切换非预装版本并直接构建失败');
});

test('package.json 的 engines 允许 EdgeOne 的 Node 24.5.0', () => {
  const pkg = JSON.parse(read('package.json'));
  const engineNode: string = pkg.engines?.node ?? '';
  assert.match(engineNode, /^>=/);
  assert.doesNotMatch(engineNode, /\b2[5-9]\b/, 'engines 不能要求 Node 25+');
  assert.match(engineNode, /22\.23\.4/, 'Astro 7 的最低 Node 要求');
});

test('所有 Cloud Function 入口都导出 onRequest 与 default', async () => {
  const entries = [
    'cloud-functions/[[default]].js',
    'cloud-functions/api/posts.js',
    'cloud-functions/api/tags.js',
    'cloud-functions/api/posts/[slug].js'
  ];
  for (const entry of entries) {
    const mod = await load(entry);
    assert.equal(typeof mod.onRequest, 'function', `${entry} 缺少命名 onRequest`);
    assert.equal(typeof mod.default, 'function', `${entry} 缺少 default 导出`);
  }
});

test('具体 API 路由与 catch-all 返回一致结果', async () => {
  const catchAll = await load('cloud-functions/[[default]].js');
  const tags = await load('cloud-functions/api/tags.js');
  const call = (handler: (ctx: { request: Request }) => Response, url: string) =>
    handler({ request: new Request(`https://example.test${url}`) });

  assert.equal(call(catchAll.onRequest, '/api/tags').status, 200);
  assert.equal(call(tags.onRequest, '/api/tags').status, 200);
  assert.equal(call(tags.onRequest, '/api/nope').status, 404);
});

test('data.js 与文章源数据保持同步', async () => {
  const posts = JSON.parse(read('services/posts.json'));
  const data = await load('cloud-functions/data.js');
  const expected = posts.map((post: { slug: string; permalink: string }) =>
    `${post.slug}|${post.permalink}`).sort();
  const actual = data.posts.map((post: { slug: string; permalink: string }) =>
    `${post.slug}|${post.permalink}`).sort();
  assert.deepEqual(actual, expected, '改动 _posts/ 后需重新 pnpm build 并提交 data.js');
  assert.ok(data.siteUrl.startsWith('https://'));
  assert.ok(Array.isArray(data.tagCounts));
});
