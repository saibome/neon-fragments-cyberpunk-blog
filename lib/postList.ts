import type { BlogPost, PostListResult } from '../types';

export function queryKeyFor(page: number, limit: number, search: string, tag: string): string {
  return `${page}|${limit}|${search}|${tag}`;
}

function toPlainText(html: string): string {
  return (html || '').replace(/<[^>]*>?/gm, '');
}

export function listPosts(allPosts: BlogPost[], searchParams: URLSearchParams): PostListResult {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));
  const search = searchParams.get('search') || '';
  const tag = searchParams.get('tags') || searchParams.get('tag') || '';

  let filtered = allPosts;
  if (tag) {
    filtered = filtered.filter(post => post.tags.includes(tag));
  }
  if (search) {
    const lower = search.toLowerCase();
    filtered = filtered.filter(post =>
      post.title.toLowerCase().includes(lower) ||
      post.tags.some(postTag => postTag.toLowerCase().includes(lower))
    );
  }

  const summaries = filtered.map(({ content, ...rest }) => ({
    ...rest,
    content: '',
    description: rest.description || `${toPlainText(content).substring(0, 200)}……`
  }));
  const start = (page - 1) * limit;

  return {
    posts: summaries.slice(start, start + limit),
    total: summaries.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(summaries.length / limit)),
    queryKey: queryKeyFor(page, limit, search, tag)
  };
}
