import { renderRss } from '../lib/feeds';
import { getPosts } from '../lib/posts';

export async function GET() {
  return new Response(renderRss(await getPosts()), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
