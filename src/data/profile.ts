/**
 * プロフィール情報（サイト全体で参照する単一の情報源）
 *
 * X（@JUCK_28）・Zenn（juck28）・GitHub（JUCK-Kurohasu）の公開プロフィールと記事をもとにしています。
 * 誤りや追記があればここを編集してください。
 */

export interface SocialLink {
  /** `open <id>` コマンドなどで使う識別子（英小文字） */
  id: string;
  label: string;
  url: string;
  /** 表示用テキスト（ハンドル名など） */
  text: string;
}

export interface Community {
  name: string;
  role: string;
  description: string;
  url: string;
  /** X のハンドルなど */
  handle: string;
}

export interface Profile {
  /** バナーやタイトルに使うハンドル名 */
  handle: string;
  /** 別名（GitHub の名前などに含まれるもの） */
  alias: string;
  /** プロンプトに表示するユーザー名・ホスト名（juck@kurohasu:~$） */
  user: string;
  host: string;
  /** ヒーロー部分に表示する肩書き */
  tagline: string;
  /** meta description に使う説明文 */
  description: string;
  /** 所属大学 */
  university: string;
  /** 所属の補足（学部など） */
  faculty: string;
  /** 出身高校 */
  highSchool: string;
  /** 誕生日（YYYY-MM-DD） */
  birthday: string;
  location: string;
  /** CTF で主に担当するジャンル */
  ctfGenres: string[];
  /** 使う言語（先頭がいちばん好きな言語） */
  languages: string[];
  interests: string[];
  /** 自己紹介（段落ごと） */
  bio: string[];
  /** 所属コミュニティ */
  communities: Community[];
  /** CTF の Writeup の公開先（memos セクションと `writeups` コマンドで案内） */
  writeupsUrl: string;
  /** 連絡方法の案内文（contact セクションに表示） */
  contactNote: string;
  links: SocialLink[];
  /** このサイトのソースコードの URL（設定するとフッターにリンクが出ます） */
  sourceUrl: string;
}

export const profile: Profile = {
  handle: 'JUCK',
  alias: 'Kurohasu',
  user: 'juck',
  host: 'kurohasu',
  tagline: 'F#er / CTFer (Rev, Forensics, Pwn) / baby security researcher',
  description:
    'JUCK（Kurohasu）のポートフォリオ。東京電機大学の F#er / CTFer。Reversing を中心に CTF の作問・ワークショップ講師・学生コミュニティ運営をしています。',
  university: '東京電機大学',
  faculty: '情報メディア系の学部',
  highSchool: '都立産業高校',
  birthday: '2007-02-28',
  location: 'Tokyo, Japan',
  ctfGenres: ['Reversing', 'Forensics', 'Pwn'],
  languages: ['F#', 'C', 'C#', 'Python', 'Q#'],
  interests: ['Ethical Hacking', 'AI', 'Web3.0'],
  bio: [
    '東京電機大学で情報メディアを学んでいる F#er / CTFer です。CTF では Reversing を中心に、Forensics・Pwn にも取り組んでいます。',
    'SECCON Beginners CTF 2025 と Full Weak Engineer CTF 2025 で作問し、SECCON Beginners 2026（東京・大阪）ではアセンブリと解析のワークショップを担当しました。',
    '学生 CTF コミュニティ G1FT3D と東京電機大学学生 CSIRT 委員会の admin をしているほか、ソフトウェア研究部にも所属しています。いちばん好きな言語は F#。Love F#!!!!',
  ],
  communities: [
    {
      name: 'G1FT3D',
      role: 'Admin',
      description: '学生のための CTF / PPC / 数学コミュニティ',
      url: 'https://x.com/g1ft3d_ctf',
      handle: '@g1ft3d_ctf',
    },
    {
      name: '東京電機大学学生CSIRT委員会',
      role: 'Admin',
      description: '東京電機大学の学生 CSIRT（Computer Security Incident Response Team）',
      url: 'https://x.com/tdugakuseicsirt',
      handle: '@tdugakuseicsirt',
    },
    {
      name: 'SECCON Beginners',
      role: 'Author / Lecturer',
      description: 'SECCON CTF の初心者向け勉強会。CTF 2025 で Reversing を作問、2026 東京・大阪でワークショップ講師',
      url: 'https://x.com/ctf4b',
      handle: '@ctf4b',
    },
    {
      name: 'ソフトウェア研究部',
      role: 'Member',
      description: '東京電機大学のソフトウェア研究部（ゲーム・DTM・イラスト・3D・競プロ・Web 開発など）',
      url: 'https://tdu-src.com/',
      handle: 'tdu-src.com',
    },
  ],
  writeupsUrl: 'https://zenn.dev/juck28',
  contactNote: 'ご連絡は X（DM）または GitHub からどうぞ。',
  links: [
    { id: 'github', label: 'GitHub', url: 'https://github.com/JUCK-Kurohasu', text: '@JUCK-Kurohasu' },
    { id: 'x', label: 'X', url: 'https://x.com/JUCK_28', text: '@JUCK_28' },
    { id: 'zenn', label: 'Zenn', url: 'https://zenn.dev/juck28', text: '@juck28' },
  ],
  // TODO: GitHub に push したら、このサイトのリポジトリ URL を設定してください
  sourceUrl: '',
};

/** プロンプト文字列（例: juck@kurohasu） */
export const promptId = `${profile.user}@${profile.host}`;
