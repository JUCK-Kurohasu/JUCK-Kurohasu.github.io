import type { APIContext } from 'astro';
import { url } from '../lib/url';

/** robots.txt（サイトマップの URL は site / base から組み立てる） */
export function GET(context: APIContext) {
  const sitemap = new URL(url('sitemap-index.xml'), context.site).href;
  return new Response(['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemap}`, ''].join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
