import { renderRss } from '../lib/feeds';

export function GET() {
  return new Response(renderRss(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
