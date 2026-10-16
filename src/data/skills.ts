/**
 * スキルツリー（skills セクション / `skills` コマンド）
 * X のプロフィール・Zenn の Writeup・GitHub の公開リポジトリをもとにしています。
 * note を付けると、ツリーの右側に `# ...` のコメントとして表示されます（現在は未使用）。
 */

export interface SkillNode {
  name: string;
  /** 補足（ツリー表示で `# ...` のコメントとして出ます） */
  note?: string;
  /** お気に入り（強調表示） */
  fav?: boolean;
  children?: SkillNode[];
}

export const skillTree: SkillNode[] = [
  {
    name: 'ctf/',
    children: [
      { name: 'reversing', fav: true },
      { name: 'forensics' },
      { name: 'pwn' },
      { name: 'osint' },
      { name: 'crypto' },
      { name: 'pentest' },
      { name: 'malware' },
    ],
  },
  {
    name: 'author/',
    children: [{ name: 'challenges' }, { name: 'workshops' }],
  },
  {
    name: 'tools/',
    children: [
      { name: 'Ghidra' },
      { name: 'GDB + pwndbg' },
      { name: 'dnSpy' },
      { name: 'objdump / readelf' },
      { name: 'Kali Linux' },
    ],
  },
  {
    name: 'languages/',
    children: [
      { name: 'F#', fav: true },
      { name: 'C' },
      { name: 'C#' },
      { name: 'Python' },
      { name: 'x86-64 asm' },
      { name: 'Prolog' },
      { name: 'Q#' },
    ],
  },
  {
    name: 'license/',
    children: [{ name: '応用情報技術者' }, { name: '第二種電気工事士' }],
  },
  {
    name: 'backend/',
    children: [{ name: 'ASP.NET Core' }, { name: 'PostgreSQL' }, { name: 'Docker' }, { name: 'JWT' }],
  },
  {
    name: 'ai/',
    children: [{ name: 'agents' }, { name: 'MCP' }],
  },
  {
    name: 'goals-2026/',
    children: [{ name: 'F# GitBook' }, { name: 'TypeScript / Carbon' }, { name: '情報処理安全確保支援士' }],
  },
];

/** ツリー表示用の 1 行 */
export interface TreeLine {
  /** 罫線部分（例: "│   ├── "） */
  prefix: string;
  node: SkillNode;
  depth: number;
}

/** ツリーを 1 行ずつの表示用データに平坦化する */
export function flattenTree(nodes: SkillNode[], prefix = '', depth = 0): TreeLine[] {
  return nodes.flatMap((node, i) => {
    const last = i === nodes.length - 1;
    const line: TreeLine = { prefix: `${prefix}${last ? '└── ' : '├── '}`, node, depth };
    const children = node.children
      ? flattenTree(node.children, `${prefix}${last ? '    ' : '│   '}`, depth + 1)
      : [];
    return [line, ...children];
  });
}
