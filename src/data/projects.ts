/**
 * 制作物の一覧（projects セクション / `projects` コマンド）
 * 公開リポジトリの README・説明文をもとに記述しています。
 */

export interface Project {
  /** リポジトリ名（`open <name>` で開ける） */
  name: string;
  /** 主な言語・種別 */
  lang: string;
  /** 一言の説明（ターミナル表示用） */
  summary: string;
  /** 詳しい説明（カード表示用） */
  description: string;
  tags: string[];
  url: string;
  /** true のものはカードを大きく表示します */
  featured?: boolean;
}

const GH = 'https://github.com/JUCK-Kurohasu';

export const projects: Project[] = [
  {
    name: 'pwntool.NET',
    lang: 'F#',
    summary: 'pwntools の .NET（F#）実装',
    description:
      'Python の pwntools を F# で実装した CTF / エクスプロイト開発用ライブラリ。Tubes・Packing・ELF 解析・フォーマットストリング攻撃・ROP チェーン構築などを外部依存なしで提供し、C# や VB.NET からも利用できます。',
    tags: ['pwn', 'ctf', '.NET'],
    url: `${GH}/pwntool.NET`,
    featured: true,
  },
  {
    name: 'Shinogi',
    lang: 'F#',
    summary: 'F# 製の CTF 競技プラットフォーム',
    description:
      'F# + ASP.NET Core + PostgreSQL で構築した CTF 競技プラットフォーム。Razor MVC の Web UI と JWT 認証の REST API を備え、AI エージェントのチーム参加にも対応しています。',
    tags: ['ctf', 'platform', 'ASP.NET Core', 'PostgreSQL'],
    url: `${GH}/Shinogi`,
    featured: true,
  },
  {
    name: 'SECCON_Beginner_CTF_2025_Reversing_Workshop',
    lang: 'C',
    summary: 'SECCON Beginners Reversing ワークショップの講義資料',
    description:
      'SECCON Beginners の Reversing ワークショップ向け講義資料（スライド）と演習問題 12 問。strings・XOR・関数チェーンなど、リバースエンジニアリングの基礎を段階的に学べる構成です。',
    tags: ['reversing', 'workshop', 'education'],
    url: `${GH}/SECCON_Beginner_CTF_2025_Reversing_Workshop`,
  },
  {
    name: 'kyoto-mode',
    lang: 'Skill',
    summary: 'Claude の応答を京言葉に変換するスキル',
    description:
      'Claude の応答を、はんなりとした祇園言葉（京都弁）に変換するスキル。口調は柔らかく、情報の正確さは通常モードと同等に保つ設計です。',
    tags: ['claude', 'skill', 'AI'],
    url: `${GH}/kyoto-mode`,
  },
  {
    name: 'something-about-F-Sharp',
    lang: 'F#',
    summary: 'F# のコード置き場',
    description: 'F# で書いたコードの置き場。F# についてのまとめは GitBook の F# Wiki でも公開しています。',
    tags: ['fsharp'],
    url: `${GH}/something-about-F-Sharp`,
  },
];
