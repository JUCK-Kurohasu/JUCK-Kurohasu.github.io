---
title: "Hello, World — このサイトの仕組み"
description: "CLI 風ポートフォリオを Astro で静的ビルドし、GitHub Pages で公開するまでの構成メモ。"
date: 2026-10-16
tags: ["meta", "astro", "csp"]
category: "note"
---

このサイトは、ターミナルを模したポートフォリオです。トップページのターミナルには実際にコマンドを入力できます。まずは `help` を試してみてください。

## 構成

- **Astro** による静的サイト生成（SSG）。ビルド成果物は HTML / CSS / JS だけです
- 対話型ターミナルはフレームワークを使わない素の TypeScript
- アスキーアートの桁を揃えるため、罫線・ブロック文字を含む **JetBrains Mono** をサブセット化して同梱
- 日本語は **M PLUS 1 Code** を自己ホスト（必要な文字の分だけ読み込み）

```sh
$ npm ci
$ npm run build   # astro build + CSP の検証
$ npm run preview
```

## セキュリティ面の工夫

GitHub Pages ではレスポンスヘッダーを設定できないため、CSP は `<meta>` で指定しています。

| 項目 | 内容 |
| --- | --- |
| script-src | 同一オリジンの JS と、ハッシュで許可した 1 つのインラインスクリプトのみ |
| 外部通信 | なし（フォントも自己ホスト。Cookie・トラッカーも不使用） |
| 外部リンク | `rel="noopener noreferrer"` を付与 |
| CI | GitHub Actions はコミット SHA で固定し、権限を最小化 |

ビルド後には `scripts/verify-csp.mjs` が全ページを走査し、インラインスクリプトのハッシュが CSP に含まれているかを検証します。検証に失敗するとビルドも失敗します。

```ts
// ビルド時にインラインスクリプトの SHA-256 を計算して CSP に入れる
const sha256 = (src: string) =>
  `'sha256-${createHash('sha256').update(src, 'utf8').digest('base64')}'`;
```

## F# への愛

```fsharp
let greet name = printfn "Hello, %s! Love F#!!!!" name

[ "JUCK"; "world" ] |> List.iter greet
```

> ターミナルで `ls -a` を実行すると、何か見つかるかもしれません。
