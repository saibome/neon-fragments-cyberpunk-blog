import { renderSitemap } from '../lib/feeds';

export function GET() {
  return new Response(renderSitemap(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
