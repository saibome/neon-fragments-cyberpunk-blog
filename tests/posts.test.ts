import test from 'node:test';
import assert from 'node:assert/strict';
import { listPosts, queryKeyFor } from '../lib/postList';
import { DEFAULT_AUTHOR } from '../config';
import type { BlogPost } from '../types';

function makePost(overrides: Partial<BlogPost>): BlogPost {
  return {
    id: 'id',
    title: '标题',
    slug: 'slug',
    permalink: '/2026/11/14/slug',
    content: '<p>正文</p>',
    date: '2026-11-14T00:00:00.000Z',
    author: DEFAULT_AUTHOR,
    tags: [],
    readTime: '约 1 分钟',
    likes: 0,
    ...overrides
  };
}

const posts: BlogPost[] = [
  makePost({ id: '1', slug: 'a', title: 'Alpha', tags: ['tech'] }),
  makePost({ id: '2', slug: 'b', title: 'Beta', tags: ['tech', 'design'] }),
  makePost({ id: '3', slug: 'c', title: 'Gamma', tags: ['life'] }),
  makePost({ id: '4', slug: 'd', title: 'Delta', tags: [] })
];

test('分页返回摘要，正文不会进入列表响应', () => {
  const result = listPosts(posts, new URLSearchParams('page=1&limit=2'));
  assert.equal(result.posts.length, 2);
  assert.equal(result.total, 4);
  assert.equal(result.totalPages, 2);
  assert.equal(result.queryKey, '1|2||');
  assert.equal(result.posts[0].content, '');
  assert.ok(result.posts[0].description);
});

test('搜索与标签过滤生效', () => {
  assert.equal(listPosts(posts, new URLSearchParams('search=alpha')).total, 1);
  assert.equal(listPosts(posts, new URLSearchParams('tag=tech')).total, 2);
  assert.equal(listPosts(posts, new URLSearchParams('tags=design')).total, 1);
});

test('queryKey 包含 limit，避免不同分页大小命中同一份缓存', () => {
  assert.notEqual(queryKeyFor(1, 10, '', ''), queryKeyFor(1, 20, '', ''));
  assert.equal(queryKeyFor(1, 10, 'a', 'b'), '1|10|a|b');
});

test('空结果仍返回至少一页', () => {
  const result = listPosts(posts, new URLSearchParams('search=不存在'));
  assert.equal(result.total, 0);
  assert.equal(result.totalPages, 1);
});
