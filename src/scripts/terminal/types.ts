/** 出力の 1 区間。文字列はそのまま表示する */
export type Seg =
  | string
  | {
      text: string;
      /** CSS クラス（c-acc / c-dim / c-ok / c-err など） */
      cls?: string;
      /** リンク先（http(s) は新しいタブで開く） */
      href?: string;
      /** クリックで実行するコマンド */
      run?: string;
    };

/** 1 行分の出力 */
export type Line = Seg | Seg[];

/** ビルド時に埋め込まれる記事の要約 */
export interface PostSummary {
  id: string;
  title: string;
  date: string;
  url: string;
  tags: string[];
  category: string;
}
