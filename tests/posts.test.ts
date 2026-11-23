import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toBlogPost,
  sortPosts,
  getTagCounts,
  getPostDetail,
  postDescription
} from '../src/lib/post-utils';
import { markdownToText } from '../src/lib/text';
import { postSchema } from '../src/lib/post-schema';
import { DEFAULT_AUTHOR } from '../src/consts';
import type { BlogPost } from '../src/types';

function makePost(overrides: Partial<BlogPost>): BlogPost {
  return {
    id: 'id',
    title: '标题',
    slug: 'slug',
    permalink: '/2026/11/14/slug',
    body: '正文',
    text: '正文',
    date: '2026-11-14T00:00:00.000Z',
    author: DEFAULT_AUTHOR,
    tags: [],
    readTime: '约 1 分钟',
    ...overrides
  };
}

const posts: BlogPost[] = [
  makePost({ id: '1', slug: 'a', title: 'Alpha', tags: ['tech'], date: '2026-11-11T00:00:00.000Z' }),
  makePost({ id: '2', slug: 'b', title: 'Beta', tags: ['tech', 'design'], date: '2026-11-12T00:00:00.000Z' }),
  makePost({ id: '3', slug: 'c', title: 'Gamma', tags: ['life'], date: '2026-11-13T00:00:00.000Z' })
];

test('内容集合条目补齐默认字段，并按 UTC 生成 permalink', () => {
  const post = toBlogPost({
    id: 'hello',
    data: postSchema.parse({ title: 'Hello', date: '2077-09-15T08:30:00.000Z' }),
    body: '正文'
  });
  assert.equal(post.slug, 'hello', '未写 slug 时取集合条目 id');
  assert.equal(post.permalink, '/2077/09/15/hello');
  assert.deepEqual(post.author, DEFAULT_AUTHOR);
  assert.deepEqual(post.tags, []);
  assert.equal(post.isGlitch, false);
});

test('sortPosts 按日期倒序且不修改原数组', () => {
  const sorted = sortPosts(posts);
  assert.deepEqual(sorted.map(post => post.slug), ['c', 'b', 'a']);
  assert.deepEqual(posts.map(post => post.slug), ['a', 'b', 'c']);
});

test('getTagCounts 按出现次数降序、同次数按名称排序', () => {
  assert.deepEqual(getTagCounts(posts), [
    { tag: 'tech', count: 2 },
    { tag: 'design', count: 1 },
    { tag: 'life', count: 1 }
  ]);
  assert.deepEqual(getTagCounts([]), []);
});

test('getPostDetail 返回上一篇 / 下一篇引用', () => {
  const sorted = sortPosts(posts);
  const middle = getPostDetail('b', sorted);
  assert.ok(middle);
  assert.equal(middle.next?.slug, 'c', '列表按时间倒序，next 是更新的文章');
  assert.equal(middle.previous?.slug, 'a');

  const newest = getPostDetail('c', sorted);
  assert.equal(newest?.next, undefined);
  assert.equal(getPostDetail('不存在', sorted), undefined);
});

test('postDescription 优先用摘要，否则从正文纯文本截取', () => {
  assert.equal(postDescription(makePost({ description: '自定义摘要' })), '自定义摘要');
  const fallback = postDescription(makePost({ text: '你好 夜之城' }));
  assert.equal(fallback, '你好 夜之城……');
  assert.equal(markdownToText('<p>abc</p>'), 'abc');
});
