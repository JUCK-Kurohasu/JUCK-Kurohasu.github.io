# site-JUCK

```
     ██╗██╗   ██╗ ██████╗██╗  ██╗
     ██║██║   ██║██╔════╝██║ ██╔╝
     ██║██║   ██║██║     █████╔╝
██   ██║██║   ██║██║     ██╔═██╗
╚█████╔╝╚██████╔╝╚██████╗██║  ██╗
 ╚════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝
```

JUCK（Kurohasu）のポートフォリオサイト。紫 × サイバーセキュリティ × CLI / アスキーアートがテーマです。
[Astro](https://astro.build/) で静的ビルドし、GitHub Pages で公開します。

## 特徴

- **対話型ターミナル** — トップページで実際にコマンドを入力できます（`help` / `neofetch` / `nmap` / `matrix` / `theme` など）
  - Tab 補完・↑↓ で履歴・Ctrl+L でクリア・Ctrl+C で中断・タイプミスの候補表示
  - 隠しコマンドや隠しフラグもあります（ヒント: `ls -a`）
- **アスキーアート** — figlet のバナーと、GitHub アバター（狐）を四分割ブロック文字に変換したアート
- **btop 風パネル + tmux 風ステータスバー** — `0`〜`6` キーでセクション移動、`/` でターミナルへ
- **memos（技術メモ）** — `src/content/memos/` に Markdown を置くだけ（コードは紫基調でハイライト、RSS あり）
  - CTF の Writeup は [Zenn](https://zenn.dev/juck28) で公開する方針のため、サイト上では Zenn への案内を表示します（`writeups` コマンドも同様）
- **4 種類の紫テーマ**（`theme neon` など）と CRT 風エフェクト（`crt off` で無効化）
- **JS 無効でも全内容を閲覧可能**、`prefers-reduced-motion` ではアニメーションを抑制、モバイル対応

### セキュリティ面の配慮

| 項目 | 内容 |
| --- | --- |
| CSP | `<meta>` で `script-src 'self'` + インラインスクリプト 1 つのハッシュのみ許可（GitHub Pages はヘッダーを設定できないため） |
| CSP の検証 | `npm run build` の最後に `scripts/verify-csp.mjs` が出力 HTML を走査し、ハッシュ漏れ・外部スクリプト・`on*=` 属性などがあればビルドを失敗させる |
| 外部通信 | なし。フォントも自己ホストで、Cookie・トラッカー・CDN を使わない |
| DOM 生成 | ターミナルの出力は `textContent` / `createElement` のみ（`innerHTML` 不使用）、リンクは http(s) と相対パスのみ許可 |
| 依存関係 | `.npmrc` で `ignore-scripts=true`（install スクリプトを実行しない）、バージョン固定 |
| CI | GitHub Actions はコミット SHA で固定、ジョブごとに最小権限、`persist-credentials: false` |
| 更新 | Dependabot で週 1 回、公開から 7 日経った版のみ提案 |
| その他 | `/.well-known/security.txt`（RFC 9116）を自動生成 |

## 必要なもの

- Node.js 22.22 以上（`.node-version` 参照）
- npm

## 開発

```sh
npm ci            # 依存関係のインストール
npm run dev       # 開発サーバー http://localhost:4321
npm run check     # 型チェック
npm run build     # 本番ビルド（dist/）+ CSP 検証
npm run preview   # ビルド結果の確認
```

> **注意: Box などの同期フォルダ上での開発について**
> `node_modules` は数万ファイルあり、Box Drive 上では `npm install` が非常に遅く（10 分以上）、
> 展開エラー（`TAR_ENTRY_ERROR`）で一部のファイルが欠けることがありました。
> GitHub に push した後は、同期対象外のフォルダ（例: `C:\dev\`）に clone して開発するのがおすすめです。

## 内容の編集

サイトの文章はすべて `src/data/` と `src/content/` にまとまっています。

| ファイル | 内容 |
| --- | --- |
| `src/data/profile.ts` | 名前・肩書き・自己紹介・SNS リンク・連絡先の案内 |
| `src/data/projects.ts` | 制作物（カード / `projects` コマンド） |
| `src/data/activity.ts` | 活動ログ（CTF 実績・登壇などを追記） |
| `src/data/skills.ts` | スキルツリー |
| `src/data/ascii.ts` | バナー・狐・404 のアスキーアート |
| `src/content/memos/*.md` | 技術メモ（`_template.md` をコピーして作成） |
| `public/og.png` | SNS でシェアされたときの画像（1200×630） |

### メモを書く

```sh
cp src/content/memos/_template.md src/content/memos/my-memo.md
```

frontmatter の `draft: true` を外すと公開されます（開発サーバーでは下書きも表示されます）。

### アスキーアートを作り直す

```sh
# バナー（figlet）。出力を src/data/ascii.ts に貼り付ける
npm run gen:banner -- JUCK
npm run gen:banner -- 404

# 画像 → ブロック文字（Python + Pillow）
python scripts/image-to-blocks.py avatar.png --cols 34
```

アスキーアートには ASCII と罫線・ブロック文字だけを使ってください（全角文字は幅が違うため桁がずれます）。
罫線・ブロック文字を含む JetBrains Mono のサブセット（`src/assets/fonts/`）で表示しています。

## GitHub Pages で公開する

1. GitHub にリポジトリを作成して push する
   ```sh
   git add -A
   git commit -m "Initial commit"
   git remote add origin https://github.com/JUCK-Kurohasu/<リポジトリ名>.git
   git push -u origin main
   ```
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に変更する
3. `main` に push するたびに `.github/workflows/deploy.yml` がビルド・CSP 検証・デプロイを行います

公開 URL は `astro.config.mjs` がリポジトリ名から自動で決めます。

| リポジトリ名 | 公開 URL |
| --- | --- |
| `JUCK-Kurohasu.github.io` | `https://juck-kurohasu.github.io/` |
| それ以外（例: `site-JUCK`） | `https://juck-kurohasu.github.io/site-JUCK/` |

独自ドメインを使う場合は `public/CNAME` にドメイン名を 1 行で書くと、自動で `base = /` になります
（`SITE_URL` / `BASE_PATH` 環境変数で明示的に指定することもできます）。

> `security.txt` や `robots.txt` は RFC 上ドメイン直下に置く必要があるため、
> ユーザーサイト（`<user>.github.io`）か独自ドメインで公開したときに意味を持ちます。

## 構成

```
.
├── .github/
│   ├── workflows/deploy.yml   # GitHub Pages へのデプロイ
│   └── dependabot.yml
├── public/                    # favicon・OGP 画像
├── scripts/
│   ├── verify-csp.mjs         # ビルド後の CSP 検証
│   ├── gen-banner.mjs         # figlet でバナー生成
│   └── image-to-blocks.py     # 画像 → ブロック文字
├── src/
│   ├── assets/fonts/          # JetBrains Mono（サブセット）+ ライセンス
│   ├── components/            # ターミナル・パネル・ステータスバーなど
│   ├── content/memos/         # Markdown のメモ
│   ├── data/                  # プロフィール等のデータ
│   ├── layouts/BaseLayout.astro
│   ├── lib/                   # CSP・URL・Shiki テーマなど
│   ├── pages/                 # ルーティング（/, /memos/, 404, rss.xml, security.txt…）
│   ├── scripts/               # クライアント側の TypeScript（ターミナル本体など）
│   └── styles/
├── astro.config.mjs
└── package.json
```

## ライセンス

- フォント: [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono)・[M PLUS 1 Code](https://github.com/coz-m/MPLUS_FONTS)（いずれも SIL Open Font License 1.1）
