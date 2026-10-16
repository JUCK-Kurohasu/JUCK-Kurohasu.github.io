import { getCollection, type CollectionEntry } from 'astro:content';
import { url } from './url';

export type Memo = CollectionEntry<'memos'>;

/** 公開対象のメモを新しい順に返す（開発中は下書きも表示） */
export async function getMemos(): Promise<Memo[]> {
  const entries = await getCollection('memos', ({ data }) => import.meta.env.DEV || !data.draft);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const memoUrl = (entry: Memo) => url(`memos/${entry.id}/`);

/** YYYY-MM-DD 形式（タイムゾーンのずれを避けるため UTC で整形） */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
