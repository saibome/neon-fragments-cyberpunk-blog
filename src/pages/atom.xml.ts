import { renderAtom } from '../lib/feeds';

export function GET() {
  return new Response(renderAtom(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
