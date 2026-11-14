import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const load = (relative: string) => import(pathToFileURL(path.join(root, relative)).href);

type Handler = (context: { request: Request }) => Response | Promise<Response>;
type FunctionData = {
  siteUrl: string;
  tagCounts: { tag: string; count: number }[];
  posts: { slug: string; permalink: string }[];
};

const handler = (await load('cloud-functions/[[default]].js')).default as Handler;
const data = await load('cloud-functions/data.js') as FunctionData;

const call = (pathWithQuery: string) =>
  handler({ request: new Request(`https://example.test${pathWithQuery}`) });

test('未知 API 返回 JSON 404', async () => {
  const response = await call('/api/nope');
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(await response.json(), { error: '接口不存在' });
});

test('标签与列表接口返回构建期数据', async () => {
  const tags = await call('/api/tags');
  assert.equal(tags.status, 200);
  assert.deepEqual(await tags.json(), data.tagCounts);

  const list = await call('/api/posts?limit=1');
  assert.equal(list.status, 200);
  const body = await list.json() as { limit: number; posts: unknown[]; total: number };
  assert.equal(body.limit, 1);
  assert.ok(body.posts.length <= 1);
  assert.equal(body.total, data.posts.length);
});

test('文章详情与错误日期 301 使用固定 permalink', { skip: data.posts.length === 0 }, async () => {
  const post = data.posts[0];
  const detail = await call(`/api/posts/${post.slug}`);
  assert.equal(detail.status, 200);
  assert.equal((await detail.json() as { slug: string }).slug, post.slug);

  const wrongDate = await call(`/2099/01/01/${post.slug}`);
  assert.equal(wrongDate.status, 301);
  assert.equal(wrongDate.headers.get('location'), post.permalink);

  const wrongCard = await call(`/card/2099/01/01/${post.slug}.png`);
  assert.equal(wrongCard.status, 301);
  assert.equal(wrongCard.headers.get('location'), `/card${post.permalink}.png`);
});

test('未知页面返回 HTML 404', async () => {
  const response = await call('/no-such-page');
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  assert.match(await response.text(), /404/);
});
