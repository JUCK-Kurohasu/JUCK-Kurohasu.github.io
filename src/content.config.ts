import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * メモ（技術メモ・イベント参加記など）のコレクション。
 * src/content/memos/ に Markdown を置くと /memos/<ファイル名>/ として公開されます。
 * ファイル名が "_" で始まるもの（テンプレートなど）は読み込みません。
 * ※ CTF の Writeup は Zenn（https://zenn.dev/juck28）で公開しています。
 */
const memos = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/memos' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** note: 技術メモ / event: イベント参加記など */
    category: z.enum(['note', 'event']).default('note'),
    /** true にすると本番ビルドに含めない */
    draft: z.boolean().default(false),
  }),
});

export const collections = { memos };
