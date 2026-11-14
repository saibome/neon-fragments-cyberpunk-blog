import { renderRobots } from '../lib/feeds';

export function GET() {
  return new Response(renderRobots(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
