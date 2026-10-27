/**
 * 活動ログ（activity セクション / `activity` コマンド）
 *
 * Zenn の Writeup・X のプロフィール・GitHub の公開リポジトリをもとにしています。
 * 日付はイベントの開催月（Writeup の投稿日から推定）またはリポジトリの作成日です。新しい順に並べます。
 */

export type ActivityKind = 'author' | 'ctf' | 'workshop' | 'event' | 'release' | 'dev' | 'init';

export interface Activity {
  /** YYYY-MM-DD / YYYY-MM / YYYY のいずれか */
  date: string;
  kind: ActivityKind;
  text: string;
  url?: string;
}

const GH = 'https://github.com/JUCK-Kurohasu';
const ZENN = 'https://zenn.dev/juck28/articles';

export const activities: Activity[] = [
  {
    date: '2026-10',
    kind: 'ctf',
    text: 'FFRI × NFLabs. Cybersecurity Challenge 2026 — 2100pt / 26th',
    url: `${ZENN}/74c43f18838188`,
  },
  {
    date: '2026-09',
    kind: 'ctf',
    text: 'Flare-On 13 — 9pt / 95th（ソロ）',
  },
  {
    date: '2026-08',
    kind: 'workshop',
    text: 'SECCON Beginners 2026 東京・大阪 — ワークショップ「アセンブリと解析をそれとなく理解する巻」を担当',
    url: `${ZENN}/091c07869aba28`,
  },
  {
    date: '2026-05-18',
    kind: 'release',
    text: 'kyoto-mode — Claude を京言葉にするスキルを公開',
    url: `${GH}/kyoto-mode`,
  },
  {
    date: '2026-03',
    kind: 'ctf',
    text: 'picoCTF 2026 — 3950pt / 52nd（ソロ）',
    url: `${ZENN}/d206bef05496d8`,
  },
  {
    date: '2026-03-21',
    kind: 'release',
    text: 'pwntool.NET — pwntools の .NET（F#）実装を公開',
    url: `${GH}/pwntool.NET`,
  },
  {
    date: '2026-02-23',
    kind: 'workshop',
    text: 'SECCON Beginners Reversing ワークショップの講義資料・演習問題を公開',
    url: `${GH}/SECCON_Beginner_CTF_2025_Reversing_Workshop`,
  },
  {
    date: '2026-02-09',
    kind: 'dev',
    text: 'Shinogi — F# 製 CTF 競技プラットフォームの開発を開始',
    url: `${GH}/Shinogi`,
  },
  {
    date: '2025-12',
    kind: 'event',
    text: 'C107 — G1FT3D の合同誌を頒布（中高生が執筆した合同誌）',
    url: `${ZENN}/1ec0d994db1b37`,
  },
  {
    date: '2025-10',
    kind: 'ctf',
    text: 'E4syCTF に参加',
    url: `${ZENN}/0f1970bbdd025c`,
  },
  {
    date: '2025-08',
    kind: 'author',
    text: 'Full Weak Engineer CTF 2025 — Reversing 2 問・Misc 1 問を作問',
    url: `${ZENN}/a82cfdec0c136f`,
  },
  {
    date: '2025-07',
    kind: 'author',
    text: 'SECCON Beginners CTF 2025 — Reversing 4 問を作問',
    url: `${ZENN}/64c6bdca67376e`,
  },
  {
    date: '2025-06',
    kind: 'ctf',
    text: 'DIVER OSINT CTF 2025 — 746pt / 318th（ソロ）',
    url: `${ZENN}/b050ece3b7bb28`,
  },
  {
    date: '2025-03',
    kind: 'ctf',
    text: 'picoCTF 2025 — JP Students TOP50 入り（チーム）',
    url: `${ZENN}/2241d47dde60d7`,
  },
  {
    date: '2023-06-19',
    kind: 'init',
    text: 'GitHub をはじめる（F# / Q#）',
    url: GH,
  },
];
