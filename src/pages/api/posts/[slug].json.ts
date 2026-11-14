import { posts, getPostDetail } from '../../../lib/posts';

export function getStaticPaths() {
  return posts.map(post => ({ params: { slug: post.slug } }));
}

export function GET({ params }: { params: { slug: string } }) {
  const detail = getPostDetail(params.slug);
  if (!detail) {
    return new Response(JSON.stringify({ error: '文章不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  return new Response(JSON.stringify(detail), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
