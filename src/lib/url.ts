/**
 * base パス（GitHub Pages のプロジェクトサイトでは "/<repo>/"）を付けた URL を返す。
 * 例: url('memos/') → "/site-JUCK/memos/"
 */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${path.replace(/^\/+/, '')}`;
}

/** 外部サイトへのリンクかどうか */
export function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
