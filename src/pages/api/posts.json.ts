import { posts, summarizePost } from '../../lib/posts';

/** 全站文章摘要（不含正文），供外部系统消费；站点前端本身不依赖该接口 */
export function GET() {
  return new Response(JSON.stringify(posts.map(summarizePost)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
