import { createHash } from 'node:crypto';

/**
 * <head> の先頭で同期実行する小さなインラインスクリプト。
 * - JS 有効時に html.js を付与（JS 前提のスタイルの切り替え）
 * - 保存済みテーマの復元（ちらつき防止）
 * - 起動演出（ブートログ）を表示するかの判定
 *
 * CSP ではこの文字列の SHA-256 ハッシュだけを許可する。内容を変えるとハッシュも自動で変わる。
 */
export const HEAD_SCRIPT =
  "(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem('juck:theme');if(t)d.setAttribute('data-theme',t);if(localStorage.getItem('juck:crt')==='off')d.setAttribute('data-crt','off');if(!sessionStorage.getItem('juck:booted')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)d.setAttribute('data-boot','')}catch(e){}})();";

const sha256 = (source: string) => `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`;

/**
 * <meta http-equiv="Content-Security-Policy"> に入れるポリシーを組み立てる。
 * GitHub Pages ではレスポンスヘッダーを設定できないため meta で指定する
 * （meta では frame-ancestors / report-uri / sandbox は無効なので入れない）。
 *
 * - script-src: 同一オリジンの JS + 上記インラインスクリプトのハッシュのみ
 * - style-src: Shiki（コードハイライト）が style 属性を使うため 'unsafe-inline' を許可
 * - 外部オリジンへの通信は一切許可しない
 */
export function buildCsp(): string {
  const directives: [string, string[]][] = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", sha256(HEAD_SCRIPT)]],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:']],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'"]],
    ['manifest-src', ["'self'"]],
    ['media-src', ["'none'"]],
    ['object-src', ["'none'"]],
    ['frame-src', ["'none'"]],
    ['worker-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'none'"]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(' ')}`).join('; ');
}
