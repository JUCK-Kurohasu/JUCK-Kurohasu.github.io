// @ts-check
import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { juckTheme } from './src/lib/shiki-theme.mjs';

/**
 * GitHub Pages 向けに `site` と `base` を自動決定する。
 *
 * 優先順位:
 *   1. 環境変数 SITE_URL / BASE_PATH（独自ドメインや手動指定用）
 *   2. public/CNAME があれば独自ドメインとみなす（base = "/"）
 *   3. GitHub Actions 上では GITHUB_REPOSITORY（"owner/repo"）から判定
 *      - repo 名が "<owner>.github.io" → ユーザーサイト（base = "/"）
 *      - それ以外 → プロジェクトサイト（base = "/<repo>"）
 *   4. ローカル: http://localhost:4321 / base = "/"（BASE_PATH で上書き可能）
 */
function resolveDeployTarget() {
  const env = process.env;

  if (env.SITE_URL) {
    return { site: env.SITE_URL, base: env.BASE_PATH || '/' };
  }

  const cnamePath = new URL('./public/CNAME', import.meta.url);
  if (existsSync(cnamePath)) {
    const domain = readFileSync(cnamePath, 'utf8').trim();
    if (domain) return { site: `https://${domain}`, base: env.BASE_PATH || '/' };
  }

  const [owner = '', repo = ''] = (env.GITHUB_REPOSITORY ?? '').split('/');
  if (owner && repo) {
    const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
    return {
      site: `https://${owner.toLowerCase()}.github.io`,
      base: env.BASE_PATH || (isUserSite ? '/' : `/${repo}`),
    };
  }

  return { site: 'http://localhost:4321', base: env.BASE_PATH || '/' };
}

const { site, base } = resolveDeployTarget();

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site,
  base,
  // GitHub Pages はディレクトリ + index.html 形式で配信するため、末尾スラッシュに統一する
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  // v7 既定の 'jsx' はインライン要素間の空白を削るため、従来の（ロスレスな）圧縮方式を使う
  compressHTML: true,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: juckTheme,
      wrap: false,
    },
  },
  devToolbar: {
    enabled: false,
  },
});
