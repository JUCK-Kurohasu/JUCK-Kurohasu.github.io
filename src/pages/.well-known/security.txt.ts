import type { APIContext } from 'astro';
import { profile } from '../../data/profile';
import { url } from '../../lib/url';

/**
 * security.txt（RFC 9116）。脆弱性を見つけた人向けの連絡先。
 * Expires は必須項目のため、ビルド日から 180 日後を自動で設定する（定期的に再デプロイすれば更新される）。
 * ※ RFC 上はドメイン直下の /.well-known/ に置く必要があるため、ユーザーサイト・独自ドメイン運用時に有効です。
 */
export function GET(context: APIContext) {
  const expires = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
  expires.setUTCHours(0, 0, 0, 0);
  const contacts = profile.links.filter((l) => l.id === 'x' || l.id === 'github').map((l) => `Contact: ${l.url}`);
  const body = [
    ...contacts,
    `Expires: ${expires.toISOString()}`,
    'Preferred-Languages: ja, en',
    `Canonical: ${new URL(url('.well-known/security.txt'), context.site).href}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
