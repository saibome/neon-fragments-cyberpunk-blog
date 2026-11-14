import { renderSitemap } from '../lib/feeds';
import { getPosts } from '../lib/posts';

export async function GET() {
  return new Response(renderSitemap(await getPosts()), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
