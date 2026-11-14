import { getTagCounts } from '../../lib/posts';

export function GET() {
  return new Response(JSON.stringify(getTagCounts()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
