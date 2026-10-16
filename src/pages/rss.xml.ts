import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { profile } from '../data/profile';
import { getMemos, memoUrl } from '../lib/memos';

/** メモの RSS フィード（/rss.xml） */
export async function GET(context: APIContext) {
  const memos = await getMemos();
  return rss({
    title: `${profile.handle} memos`,
    description: profile.description,
    site: context.site ?? 'http://localhost:4321',
    items: memos.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: memoUrl(post),
      categories: post.data.tags,
    })),
    customData: '<language>ja</language>',
  });
}
