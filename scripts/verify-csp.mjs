#!/usr/bin/env node
/**
 * ビルド成果物（dist/）の CSP を検証する。`npm run build` の最後に自動で実行される。
 *
 * チェック内容（1 つでも違反があれば終了コード 1 でビルドを失敗させる）:
 *   - すべての HTML に CSP の <meta> がちょうど 1 つあり、スクリプト・スタイルより前にある
 *   - インラインスクリプトの SHA-256 ハッシュが script-src に含まれている
 *     （ソース上の値ではなく、出力された HTML の実際のバイト列から計算する）
 *   - 外部スクリプトは同一オリジン（相対/ルート相対パス）のみ
 *   - インラインのイベントハンドラ属性（onclick= など）や javascript: URL がない
 *   - meta では無効なディレクティブ（frame-ancestors / report-uri / sandbox）を含まない
 *   - unsafe-inline / unsafe-eval を script-src に含まない
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const META_INVALID = ['frame-ancestors', 'report-uri', 'sandbox'];
const EXECUTABLE_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript']);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

const decode = (s) =>
  s
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decode(m[1] ?? m[2] ?? m[3] ?? '') : null;
};

function parsePolicy(policy) {
  const map = new Map();
  for (const part of policy.split(';')) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) map.set(name.toLowerCase(), values);
  }
  return map;
}

const problems = [];
let pages = 0;
let inlineScripts = 0;

for await (const file of walk(distDir)) {
  pages++;
  const rel = relative(distDir, file);
  const html = await readFile(file, 'utf8');

  const metas = [...html.matchAll(/<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi)];
  if (metas.length !== 1) {
    problems.push(`${rel}: CSP の <meta> が ${metas.length} 個あります（1 個である必要があります）`);
    continue;
  }
  const meta = metas[0];
  const firstResource = html.search(/<(script|style|link)\b/i);
  if (firstResource !== -1 && firstResource < meta.index) {
    problems.push(`${rel}: CSP の <meta> より前にスクリプト/スタイルがあります`);
  }

  const directives = parsePolicy(attr(meta[0], 'content') ?? '');
  const scriptSrc = directives.get('script-src') ?? directives.get('default-src') ?? [];
  for (const name of META_INVALID) {
    if (directives.has(name)) problems.push(`${rel}: ${name} は <meta> では無効です`);
  }
  for (const bad of ["'unsafe-inline'", "'unsafe-eval'"]) {
    if (scriptSrc.includes(bad)) problems.push(`${rel}: script-src に ${bad} が含まれています`);
  }

  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const tag = `<script${m[1]}>`;
    const src = attr(tag, 'src');
    if (src !== null) {
      if (/^(https?:)?\/\//i.test(src)) problems.push(`${rel}: 外部オリジンのスクリプト ${src}`);
      continue;
    }
    const type = (attr(tag, 'type') ?? '').toLowerCase();
    if (!EXECUTABLE_TYPES.has(type)) continue; // application/json などのデータブロックは実行されない
    inlineScripts++;
    const hash = `'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`;
    if (!scriptSrc.includes(hash)) {
      problems.push(`${rel}: インラインスクリプトのハッシュ ${hash} が script-src にありません`);
    }
  }

  for (const m of html.matchAll(/<(?:link|img|iframe|source|audio|video)\b[^>]*>/gi)) {
    const tag = m[0];
    const rel_ = (attr(tag, 'rel') ?? '').toLowerCase();
    const target = attr(tag, 'src') ?? (/(stylesheet|preload|modulepreload|icon)/.test(rel_) ? attr(tag, 'href') : null);
    if (target && /^(https?:)?\/\//i.test(target)) problems.push(`${rel}: 外部オリジンのリソース ${target}`);
  }

  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html)) problems.push(`${rel}: インラインのイベントハンドラ属性があります`);
  if (/(?:href|src|action)\s*=\s*["']?\s*javascript:/i.test(html)) problems.push(`${rel}: javascript: URL があります`);
}

if (pages === 0) {
  console.error('[verify-csp] dist/ に HTML がありません。先に astro build を実行してください。');
  process.exit(1);
}

if (problems.length > 0) {
  console.error(`[verify-csp] ${problems.length} 件の問題が見つかりました:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`[verify-csp] OK: ${pages} ページ / インラインスクリプト ${inlineScripts} 個すべてが CSP で許可されています`);
