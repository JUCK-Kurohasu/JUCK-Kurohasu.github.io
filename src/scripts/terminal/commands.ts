import { activities } from '../../data/activity';
import { FOX } from '../../data/ascii';
import { profile, promptId } from '../../data/profile';
import { projects } from '../../data/projects';
import { flattenTree, skillTree } from '../../data/skills';
import { glitchPage, matrixRain, prefersReducedMotion } from './effects';
import { c, link, pad, run, Output } from './io';
import type { Line, PostSummary, Seg } from './types';

/* =========================================================
 * 型定義
 * ========================================================= */

export interface Env {
  out: Output;
  posts: PostSummary[];
  history: string[];
  startedAt: number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
  scrollToSection(id: string): boolean;
  navigate(href: string): void;
  openExternal(url: string): void;
  getTheme(): string;
  setTheme(name: string): void;
  isCrtOn(): boolean;
  setCrt(on: boolean): void;
  clearScreen(): void;
  reboot(): Promise<void>;
  logout(): void;
}

export interface Ctx {
  args: string[];
  env: Env;
  signal: AbortSignal;
}

export type Group = 'profile' | 'shell' | 'extras';

export interface Command {
  name: string;
  /** help に表示する説明（未指定なら隠しコマンド） */
  desc?: string;
  usage?: string;
  group?: Group;
  aliases?: string[];
  /** 実行中に何かキーを押すかクリックすると中断する（matrix など） */
  stopOnInput?: boolean;
  complete?(args: string[], env: Env): string[];
  run(ctx: Ctx): void | Promise<void>;
}

/* =========================================================
 * 定数・ヘルパー
 * ========================================================= */

export const SECTIONS = ['home', 'about', 'skills', 'projects', 'activity', 'memos', 'contact'] as const;

export const THEMES: Record<string, string> = {
  violet: '既定の紫',
  neon: 'ネオンパープル（彩度高め）',
  lavender: 'ラベンダー（やわらかめ）',
  ultraviolet: 'ウルトラバイオレット（深め）',
};

/** 隠しフラグ（base64）。デコードすると JUCK{...} になる */
const FLAG_B64 = 'SlVDS3t5MHVfZjB1bmRfdGgzX2gxZGQzbl9mbDRnfQ==';

const HOME = `/home/${profile.user}`;
const VARS: Record<string, string> = {
  USER: profile.user,
  HOME,
  SHELL: '/bin/jsh',
  HOSTNAME: profile.host,
  PWD: HOME,
  LANG: 'ja_JP.UTF-8',
  EDITOR: 'none',
  TERM: 'xterm-256color',
};

const ok = (text: string): Line => [c('c-ok', '[  OK  ] '), text];
const err = (text: string): Line => c('c-err', text);
const dim = (text: string): Line => c('c-dim', text);
const hint = (text: string, cmd: string): Line => [c('c-dim', `${text} `), run(cmd)];

/** 現在時刻を Unix の date 形式で返す（例: Fri Oct 16 18:42:07 GMT+9 2026） */
export function unixDate(d = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('weekday')} ${get('month')} ${get('day').padStart(2, ' ')} ${hour}:${get('minute')}:${get('second')} ${get('timeZoneName')} ${get('year')}`;
}

function uptime(startedAt: number): string {
  const sec = Math.floor((Date.now() - startedAt) / 1000);
  if (sec < 60) return `${sec} secs`;
  const min = Math.floor(sec / 60);
  return min < 60 ? `${min} min${min > 1 ? 's' : ''}` : `${Math.floor(min / 60)}h ${min % 60}m`;
}

function decodeBase64(text: string): string | null {
  try {
    const bin = atob(text.trim());
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
  } catch {
    return null;
  }
}

function encodeBase64(text: string): string {
  let bin = '';
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
  return btoa(bin);
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0] ?? 0;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j] ?? 0;
      dp[j] = Math.min((dp[j] ?? 0) + 1, (dp[j - 1] ?? 0) + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length] ?? 0;
}

/** タイプミスしたコマンドに近い候補を返す */
export function suggest(name: string, candidates: string[]): string | undefined {
  let best: string | undefined;
  let bestScore = 3;
  for (const cand of candidates) {
    const score = levenshtein(name, cand);
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  return best;
}

/** "~/projects/" や "./about" などを正規化する */
function normalizePath(p: string): string {
  return p.replace(/^~\/?/, '').replace(/^\.\//, '').replace(/\/+$/, '');
}

/* =========================================================
 * 仮想ファイルシステム（ls / cat 用）
 * ========================================================= */

interface FsEntry {
  name: string;
  kind: 'dir' | 'file' | 'exec';
  hidden?: boolean;
  size: number;
}

function homeEntries(env: Env): FsEntry[] {
  const entries: FsEntry[] = [
    { name: 'about.md', kind: 'file', size: 612 },
    { name: 'activity.log', kind: 'file', size: 128 * activities.length },
    { name: 'contact.sh', kind: 'exec', size: 233 },
    { name: 'projects', kind: 'dir', size: 4096 },
    { name: 'skills.txt', kind: 'file', size: 731 },
    { name: 'memos', kind: 'dir', size: 4096 },
    { name: '.flag', kind: 'file', hidden: true, size: FLAG_B64.length + 1 },
    { name: '.jshrc', kind: 'file', hidden: true, size: 96 },
  ];
  return entries.filter((e) => e.name !== 'memos' || env.posts.length > 0);
}

function entrySeg(e: FsEntry): Seg {
  if (e.kind === 'dir') return c('c-info c-b', `${e.name}/`);
  if (e.kind === 'exec') return c('c-ok c-b', `${e.name}*`);
  return e.hidden ? c('c-dim', e.name) : e.name;
}

/** 区切り文字を挟んで 1 行に並べる */
function joinSegs(segs: Seg[], sep = '  '): Seg[] {
  return segs.flatMap((s, i) => (i < segs.length - 1 ? [s, sep] : [s]));
}

/* =========================================================
 * 各セクションの出力
 * ========================================================= */

function aboutLines(): Line[] {
  const [fav = 'F#', ...langs] = profile.languages;
  return [
    [c('c-acc c-b c-glow', `# ${profile.handle}`), c('c-dim', ` (${profile.alias})`)],
    c('c-acc2', profile.tagline),
    [c('c-dim', '@ '), profile.university, c('c-dim', ` — ${profile.faculty}`)],
    '',
    ...profile.bio,
    '',
    c('c-dim', '## communities'),
    ...profile.communities.map((cm): Line => [c('c-ok', `[${cm.role}] `), link(cm.name, cm.url), c('c-dim', `  ${cm.description}`)]),
    '',
    [c('c-acc', pad('university', 12)), profile.university],
    [c('c-acc', pad('high school', 12)), profile.highSchool],
    [c('c-acc', pad('birthday', 12)), profile.birthday],
    [c('c-acc', pad('ctf', 12)), profile.ctfGenres.join(' / ')],
    [c('c-acc', pad('languages', 12)), c('c-acc2 c-b', fav), ` <3, ${langs.join(', ')}`],
    [c('c-acc', pad('interests', 12)), profile.interests.join(', ')],
    [c('c-acc', pad('location', 12)), profile.location],
  ];
}

function skillsLines(): Line[] {
  const rows = flattenTree(skillTree);
  const width = Math.max(...rows.map((r) => r.prefix.length + r.node.name.length)) + 2;
  return [
    c('c-info c-b', '~/skills'),
    ...rows.map(({ prefix, node }): Line => {
      const isDir = node.name.endsWith('/');
      const cls = node.fav ? 'c-acc2 c-b' : isDir ? 'c-info c-b' : '';
      const segs: Seg[] = [c('c-dim', prefix), cls ? c(cls, node.name) : node.name];
      if (node.note) segs.push(' '.repeat(width - prefix.length - node.name.length), c('c-dim', `# ${node.note}`));
      return segs;
    }),
  ];
}

function projectLines(): Line[] {
  const lines: Line[] = [];
  for (const p of projects) {
    lines.push([c('c-dim', 'drwxr-xr-x  '), link(`${p.name}/`, p.url, 'c-info c-b'), c('c-acc2', `  [${p.lang}]`)]);
    lines.push([c('c-dim', '            '), p.summary]);
  }
  lines.push('', hint('リポジトリを開くには:', 'open pwntool.NET'));
  return lines;
}

function activityLines(): Line[] {
  return activities.map((a): Line => {
    const text: Seg = a.url ? link(a.text, a.url) : a.text;
    return [c('c-dim', pad(a.date, 12)), c('c-acc', pad(`[${a.kind}]`, 11)), text];
  });
}

function contactLines(): Line[] {
  const width = Math.max(...profile.links.map((l) => l.label.length)) + 2;
  return [
    ...profile.links.map((l): Line => [c('c-ok', '[+] '), c('c-acc', pad(l.label, width)), link(l.text, l.url)]),
    '',
    profile.contactNote,
  ];
}

function contactScript(): Line[] {
  return [
    c('c-dim', '#!/bin/sh'),
    c('c-dim', '# contact.sh — 連絡先を表示する'),
    ...profile.links.map((l): Line => [c('c-acc2', 'echo'), ` "${pad(l.label, 8)}: ${l.url}"`]),
  ];
}

function memoLines(env: Env): Line[] {
  if (env.posts.length === 0) return [dim('（まだメモはありません）')];
  return env.posts.map((p): Line => [
    c('c-dim', `${p.date}  `),
    link(p.title, p.url),
    c('c-dim', p.tags.length ? `  ${p.tags.map((t) => `#${t}`).join(' ')}` : ''),
  ]);
}

/** Writeup は Zenn で公開している旨の案内 */
function writeupNotice(): Line[] {
  return [
    [c('c-acc2 c-b', '[i] '), 'CTF の Writeup は Zenn で公開しています。ぜひご覧ください。'],
    ['    → ', link(profile.writeupsUrl.replace('https://', ''), profile.writeupsUrl)],
  ];
}

/* =========================================================
 * neofetch / nmap
 * ========================================================= */

function neofetch(env: Env): void {
  const info: Line[] = [
    [c('c-acc c-b', profile.user), '@', c('c-acc c-b', profile.host)],
    c('c-dim', '-'.repeat(promptId.length)),
    [c('c-acc c-b', 'OS'), ': KurohasuOS 6.6.6-purple x86_64'],
    [c('c-acc c-b', 'Host'), ': github.com/JUCK-Kurohasu'],
    [c('c-acc c-b', 'Kernel'), ': 6.6.6-ethical-hack'],
    [c('c-acc c-b', 'Uptime'), `: ${uptime(env.startedAt)}`],
    [c('c-acc c-b', 'Shell'), ': jsh 1.0'],
    [c('c-acc c-b', 'Theme'), `: ${env.getTheme()} [purple]`],
    [c('c-acc c-b', 'University'), `: ${profile.university}`],
    [c('c-acc c-b', 'Birthday'), `: ${profile.birthday}`],
    [c('c-acc c-b', 'CTF'), `: ${profile.ctfGenres.join(' / ')}`],
    [c('c-acc c-b', 'Community'), `: ${profile.communities.map((cm) => cm.name).join(', ')}`],
    [c('c-acc c-b', 'Interests'), `: ${profile.interests.join(', ')}`],
    [c('c-acc c-b', 'Languages'), ': ', c('c-acc2 c-b', profile.languages[0] ?? 'F#'), ` <3, ${profile.languages.slice(1).join(', ')}`],
    [c('c-acc c-b', 'Font'), ': JetBrains Mono + M PLUS 1 Code'],
    '',
    ['c-p0', 'c-p1', 'c-p2', 'c-p3', 'c-p4', 'c-p5', 'c-p6', 'c-p7'].map((cls) => c(cls, '███')),
  ];
  const wrap = document.createElement('div');
  wrap.className = 'nf';
  const art = document.createElement('pre');
  art.className = 'art nf-logo';
  art.setAttribute('aria-hidden', 'true');
  art.textContent = FOX;
  const right = document.createElement('div');
  right.className = 'nf-info';
  wrap.append(art, right);
  new Output(right, () => {}).lines(info);
  env.out.append(wrap);
}

const NMAP_PORTS: [port: string, service: string, section: string][] = [
  ['22/tcp', 'ssh', 'contact'],
  ['80/tcp', 'http', 'projects'],
  ['443/tcp', 'https', 'memos'],
  ['1337/tcp', 'waste', 'activity'],
  ['8080/tcp', 'http-proxy', 'skills'],
];

async function nmap({ args, env, signal }: Ctx): Promise<void> {
  const { out } = env;
  const target = args.find((a) => !a.startsWith('-'));
  const local = ['localhost', '127.0.0.1', profile.host, profile.user, '::1'];
  if (target && !local.includes(target.toLowerCase())) {
    out.line(c('c-warn', `nmap: ${target} はスキャンしません。許可のないスキャンはダメ、ゼッタイ。`));
    out.line(dim('代わりに localhost をスキャンします。'));
  }
  const now = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())} ${two(now.getHours())}:${two(now.getMinutes())}`;
  out.line(`Starting Nmap 7.95 ( https://nmap.org ) at ${stamp}`);
  await env.sleep(500, signal);
  out.line(c('c-dim', 'Stats: 0:00:01 elapsed; SYN Stealth Scan Timing: About 41.20% done'));
  await env.sleep(600, signal);
  out.line(`Nmap scan report for ${profile.host} (127.0.0.1)`);
  out.line('Host is up (0.00042s latency).');
  out.line('Not shown: 994 closed tcp ports (reset)');
  out.line(c('c-b', `${pad('PORT', 11)}${pad('STATE', 7)}${pad('SERVICE', 12)}SECTION`));
  for (const [port, service, section] of NMAP_PORTS) {
    await env.sleep(140, signal);
    out.line([pad(port, 11), c('c-ok', pad('open', 7)), pad(service, 12), run(`cd ${section}`)]);
  }
  await env.sleep(140, signal);
  out.line([pad('31337/tcp', 11), c('c-warn', pad('open', 7)), pad('Elite', 12), c('c-dim', '??? (hint: ls -a)')]);
  await env.sleep(300, signal);
  out.line('Nmap done: 1 IP address (1 host up) scanned in 1.37 seconds');
  out.line(dim('※ 演出です。実際のスキャンや外部への通信は一切行っていません。'));
}

/* =========================================================
 * コマンド定義
 * ========================================================= */

export function createCommands(): Command[] {
  const commands: Command[] = [
    /* ---- profile ---- */
    {
      name: 'whoami',
      desc: 'ユーザー名を表示',
      group: 'profile',
      run: ({ env }) => {
        env.out.line(c('c-acc c-b', profile.user));
        env.out.line(hint('# 詳しくは', 'about'));
      },
    },
    {
      name: 'about',
      desc: '自己紹介',
      group: 'profile',
      run: ({ env }) => {
        env.out.lines(aboutLines());
        env.out.line('');
        env.out.line(hint('→ セクションへ移動:', 'cd about'));
      },
    },
    {
      name: 'neofetch',
      desc: 'システム情報風のプロフィール',
      group: 'profile',
      aliases: ['fastfetch', 'screenfetch'],
      run: ({ env }) => neofetch(env),
    },
    {
      name: 'skills',
      desc: 'スキルツリー',
      group: 'profile',
      run: ({ env }) => env.out.lines(skillsLines()),
    },
    {
      name: 'projects',
      desc: '制作物の一覧',
      group: 'profile',
      run: ({ env }) => env.out.lines(projectLines()),
    },
    {
      name: 'activity',
      desc: '活動ログ',
      group: 'profile',
      aliases: ['log'],
      run: ({ env }) => env.out.lines(activityLines()),
    },
    {
      name: 'memos',
      desc: '技術メモの一覧',
      group: 'profile',
      aliases: ['memo', 'blog', 'posts', 'notes'],
      run: ({ env }) => {
        env.out.lines(memoLines(env));
        env.out.line('');
        env.out.lines(writeupNotice());
      },
    },
    {
      name: 'writeups',
      desc: 'CTF の Writeup（Zenn で公開）',
      group: 'profile',
      aliases: ['writeup', 'zenn'],
      run: ({ env }) => env.out.lines(writeupNotice()),
    },
    {
      name: 'contact',
      desc: '連絡先・SNS',
      group: 'profile',
      aliases: ['social', './contact.sh'],
      run: ({ env }) => env.out.lines(contactLines()),
    },
    {
      name: 'sh',
      aliases: ['bash', 'zsh'],
      run: ({ args, env }) => {
        if (normalizePath(args[0] ?? '') === 'contact.sh') {
          env.out.lines(contactLines());
          return;
        }
        env.out.line(dim('# すでにシェル（jsh）の中にいます'));
      },
    },

    /* ---- shell ---- */
    {
      name: 'help',
      desc: 'このヘルプを表示',
      group: 'shell',
      run: ({ env }) => {
        const { out } = env;
        out.line([c('c-acc c-b', 'jsh'), ', version 1.0 — 使えるコマンドの一覧']);
        for (const group of ['profile', 'shell', 'extras'] as const) {
          out.line('');
          out.line(c('c-dim', `[ ${group} ]`));
          for (const cmd of commands.filter((x) => x.group === group && x.desc)) {
            const usage = cmd.usage ?? cmd.name;
            out.line([
              '  ',
              run(cmd.name),
              c('c-dim', pad(usage.slice(cmd.name.length), 16 - cmd.name.length)),
              '  ',
              cmd.desc ?? '',
            ]);
          }
        }
        out.line('');
        out.line(dim('Tab: 補完 / ↑↓: 履歴 / Ctrl+L: 画面クリア / Ctrl+C: 中断 / Esc: 入力欄から離れる'));
        out.line(dim('ページ上で 0〜6 キーを押すと各セクションへ移動します。'));
      },
    },
    {
      name: 'ls',
      desc: 'ファイル一覧',
      usage: 'ls [-la] [dir]',
      group: 'shell',
      aliases: ['ll', 'dir'],
      complete: () => ['projects/', 'memos/', '-la'],
      run: ({ args, env }) => {
        const flags = args.filter((a) => a.startsWith('-')).join('');
        const all = flags.includes('a');
        const long = flags.includes('l');
        const target = normalizePath(args.find((a) => !a.startsWith('-')) ?? '');
        const { out } = env;
        if (target === 'projects') {
          out.line(joinSegs(projects.map((p) => link(`${p.name}/`, p.url, 'c-info c-b'))));
          return;
        }
        if (target === 'memos') {
          if (env.posts.length > 0) out.line(joinSegs(env.posts.map((p) => link(`${p.id}.md`, p.url))));
          return;
        }
        if (target && target !== '.' && target !== HOME) {
          out.line(err(`ls: cannot access '${target}': No such file or directory`));
          return;
        }
        const entries = homeEntries(env).filter((e) => all || !e.hidden);
        if (long) {
          const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date());
          out.line(`total ${entries.length * 4}`);
          for (const e of entries) {
            const mode = e.kind === 'dir' ? 'drwxr-xr-x' : e.kind === 'exec' ? '-rwxr-xr-x' : '-rw-r--r--';
            const meta = `${mode} 1 ${profile.user} ${profile.user} ${String(e.size).padStart(5, ' ')} ${date} 13:37 `;
            out.line([c('c-dim', meta), entrySeg(e)]);
          }
          return;
        }
        const names: Seg[] = entries.map(entrySeg);
        if (all) names.unshift(c('c-info c-b', './'), c('c-info c-b', '../'));
        out.line(joinSegs(names));
      },
    },
    {
      name: 'cat',
      desc: 'ファイルを表示',
      usage: 'cat <file>',
      group: 'shell',
      aliases: ['less', 'more', 'bat'],
      complete: (_args, env) => [
        ...homeEntries(env)
          .filter((e) => e.kind !== 'dir')
          .map((e) => e.name),
        ...env.posts.map((p) => `memos/${p.id}.md`),
      ],
      run: ({ args, env }) => {
        const { out } = env;
        if (args.length === 0) {
          out.line(err('cat: ファイル名を指定してください（例: cat about.md）'));
          return;
        }
        for (const raw of args) {
          const name = normalizePath(raw);
          switch (name) {
            case 'about.md':
              out.lines(aboutLines());
              break;
            case 'skills.txt':
              out.lines(skillsLines());
              break;
            case 'activity.log':
              out.lines(activityLines());
              break;
            case 'contact.sh':
              out.lines(contactScript());
              break;
            case '.flag':
              out.line(FLAG_B64);
              out.line(dim('# hint: base64 -d .flag'));
              break;
            case '.jshrc':
              out.lines([dim('# ~/.jshrc'), "alias ll='ls -la'", 'export EDITOR=none', `export PS1='${promptId}:~$ '`]);
              break;
            case '/etc/passwd':
              out.line('root:x:0:0:root:/root:/bin/sh');
              out.line(`${profile.user}:x:1337:1337:Ethical Hacker,,,:${HOME}:/usr/bin/fsi`);
              break;
            case '/etc/shadow':
              out.line(err('cat: /etc/shadow: Permission denied'));
              out.line(dim('# さすがにそれは見せられません'));
              break;
            default: {
              const post = env.posts.find((p) => name === `memos/${p.id}.md` || name === `memos/${p.id}`);
              if (post) {
                out.line(c('c-acc c-b', `# ${post.title}`));
                out.line([c('c-dim', `${post.date}  `), link('→ 記事を開く', post.url)]);
              } else if (name === 'projects' || name === 'memos' || name.startsWith('projects/')) {
                out.line(err(`cat: ${raw}: Is a directory`));
              } else {
                out.line(err(`cat: ${raw}: No such file or directory`));
              }
            }
          }
        }
      },
    },
    {
      name: 'cd',
      desc: 'セクションへ移動',
      usage: 'cd <section>',
      group: 'shell',
      complete: () => [...SECTIONS],
      run: ({ args, env }) => {
        const raw = args[0] ?? '~';
        const target = normalizePath(raw);
        if (raw === '~' || target === '' || target === 'home' || target === HOME) {
          env.scrollToSection('home');
          return;
        }
        if (target === '..' || target.startsWith('/')) {
          env.out.line(err(`jsh: cd: ${raw}: Permission denied`));
          env.out.line(dim('# このシェルは chroot されています'));
          return;
        }
        if (!env.scrollToSection(target)) {
          env.out.line(err(`jsh: cd: ${raw}: No such file or directory`));
          env.out.line(dim(`# 移動できる場所: ${SECTIONS.join(' ')}`));
        }
      },
    },
    {
      name: 'open',
      desc: 'リンクを開く',
      usage: 'open <name>',
      group: 'shell',
      complete: (_args, env) => [
        ...profile.links.map((l) => l.id),
        ...projects.map((p) => p.name),
        ...env.posts.map((p) => p.id),
      ],
      run: ({ args, env }) => {
        const name = (args[0] ?? '').toLowerCase();
        const social = profile.links.find((l) => l.id === name);
        const project = projects.find((p) => p.name.toLowerCase() === name);
        const post = env.posts.find((p) => p.id.toLowerCase() === name);
        const href = social?.url ?? project?.url;
        if (href) {
          env.out.line([c('c-dim', 'opening '), link(href, href)]);
          env.openExternal(href);
          return;
        }
        if (post) {
          env.navigate(post.url);
          return;
        }
        env.out.line(err(name ? `open: ${args[0]}: 見つかりません` : 'open: 開く対象を指定してください'));
        env.out.line([
          c('c-dim', '候補: '),
          ...joinSegs([
            ...profile.links.map((l) => run(l.id, `open ${l.id}`)),
            ...projects.slice(0, 3).map((p) => run(p.name, `open ${p.name}`)),
          ]),
        ]);
      },
    },
    {
      name: 'history',
      desc: 'コマンド履歴',
      group: 'shell',
      run: ({ env }) => {
        env.history.forEach((h, i) => env.out.line([c('c-dim', `${String(i + 1).padStart(4, ' ')}  `), h]));
      },
    },
    {
      name: 'clear',
      desc: '画面をクリア',
      group: 'shell',
      aliases: ['cls'],
      run: ({ env }) => env.clearScreen(),
    },
    {
      name: 'echo',
      desc: '文字列を表示',
      usage: 'echo <text>',
      group: 'shell',
      run: ({ args, env }) => {
        env.out.line(args.map((a) => a.replace(/\$([A-Z_]+)/g, (_m, v: string) => VARS[v] ?? '')).join(' '));
      },
    },
    {
      name: 'date',
      desc: '現在時刻',
      group: 'shell',
      run: ({ env }) => env.out.line(unixDate()),
    },
    {
      name: 'uname',
      desc: 'システム情報',
      usage: 'uname [-a]',
      group: 'shell',
      run: ({ args, env }) => {
        env.out.line(
          args.includes('-a')
            ? `KurohasuOS ${profile.host} 6.6.6-purple #1337 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`
            : 'KurohasuOS',
        );
      },
    },
    {
      name: 'exit',
      desc: 'セッションを終了',
      group: 'shell',
      aliases: ['logout', 'quit'],
      run: ({ env }) => env.logout(),
    },

    /* ---- extras ---- */
    {
      name: 'nmap',
      desc: 'ポートスキャン（のふり）',
      usage: 'nmap [host]',
      group: 'extras',
      run: (ctx) => nmap(ctx),
    },
    {
      name: 'matrix',
      desc: 'デジタルレイン',
      group: 'extras',
      aliases: ['cmatrix'],
      stopOnInput: true,
      run: async ({ env, signal }) => {
        if (prefersReducedMotion()) {
          env.out.line(dim('「視差効果を減らす」設定が有効なため、アニメーションは省略しました。'));
          return;
        }
        env.out.line(c('c-acc2', `Wake up, ${profile.user}...`));
        env.out.line(dim('（何かキーを押すかクリックで終了）'));
        await matrixRain(signal);
      },
    },
    {
      name: 'theme',
      desc: '配色を切り替え',
      usage: 'theme [name]',
      group: 'extras',
      complete: () => Object.keys(THEMES),
      run: ({ args, env }) => {
        const name = args[0];
        if (!name) {
          const current = env.getTheme();
          for (const [key, label] of Object.entries(THEMES)) {
            env.out.line([
              key === current ? c('c-acc2 c-b', '* ') : '  ',
              c(`sw-${key}`, '███ '),
              run(key, `theme ${key}`),
              ' '.repeat(13 - key.length),
              c('c-dim', label),
            ]);
          }
          return;
        }
        if (!(name in THEMES)) {
          env.out.line(err(`theme: ${name}: そのテーマはありません`));
          return;
        }
        env.setTheme(name);
        env.out.line(ok(`theme: ${name} に切り替えました`));
      },
    },
    {
      name: 'crt',
      desc: '走査線エフェクトの切替',
      usage: 'crt [on|off]',
      group: 'extras',
      complete: () => ['on', 'off'],
      run: ({ args, env }) => {
        const next = args[0] === 'on' ? true : args[0] === 'off' ? false : !env.isCrtOn();
        env.setCrt(next);
        env.out.line(ok(`crt: 走査線エフェクトを ${next ? 'ON' : 'OFF'} にしました`));
      },
    },

    /* ---- ここから隠しコマンド（help には出ない） ---- */
    { name: 'pwd', run: ({ env }) => env.out.line(HOME) },
    { name: 'hostname', run: ({ env }) => env.out.line(profile.host) },
    {
      name: 'id',
      run: ({ env }) => env.out.line(`uid=1337(${profile.user}) gid=1337(ctf) groups=1337(ctf),100(fsharp),31337(purple)`),
    },
    { name: 'reboot', run: ({ env }) => env.reboot() },
    {
      name: 'sudo',
      run: async ({ args, env, signal }) => {
        if (args.length === 0) {
          env.out.line('usage: sudo command');
          return;
        }
        env.out.line(`[sudo] password for ${profile.user}: `);
        await env.sleep(1200, signal);
        env.out.line(`${profile.user} is not in the sudoers file.  This incident will be reported.`);
        env.out.line(dim('# 管理者に報告しておきますね'));
      },
    },
    {
      name: 'su',
      run: async ({ env, signal }) => {
        env.out.line('Password: ');
        await env.sleep(900, signal);
        env.out.line(err('su: Authentication failure'));
      },
    },
    {
      name: 'rm',
      run: ({ args, env }) => {
        const targets = args.filter((a) => !a.startsWith('-'));
        const recursive = args.some((a) => /^-[a-zA-Z]*[rR]/.test(a));
        if (targets.length === 0) {
          env.out.line(err('rm: missing operand'));
          return;
        }
        if (recursive && targets.includes('/')) {
          if (args.includes('--no-preserve-root')) {
            glitchPage();
            env.out.line(c('c-warn', 'Nice try. このサイトは静的ファイルなので消せません :)'));
            return;
          }
          env.out.line(err("rm: it is dangerous to operate recursively on '/'"));
          env.out.line(err('rm: use --no-preserve-root to override this failsafe'));
          return;
        }
        for (const t of targets) env.out.line(err(`rm: cannot remove '${t}': Read-only file system`));
      },
    },
    {
      name: 'vim',
      aliases: ['vi', 'nvim', 'nano', 'emacs', 'code'],
      run: ({ env }) => {
        env.out.line('このターミナルにエディタはありません。');
        env.out.line(dim('# vim から抜けられなくなる心配もありません :q!'));
      },
    },
    {
      name: 'fsi',
      aliases: ['dotnet'],
      run: async ({ env, signal }) => {
        const { out } = env;
        out.line(c('c-acc2 c-b', 'F# Interactive (jsh edition)'));
        out.line(dim('For help type #help;;'));
        out.line('');
        out.line([c('c-dim', '> '), 'printfn "Love F#!!!!";;']);
        await env.sleep(400, signal);
        out.line(c('c-acc2 c-b', 'Love F#!!!!'));
        out.line(c('c-dim', 'val it: unit = ()'));
        out.line('');
        out.line([c('c-dim', '> '), '#quit;;']);
      },
    },
    {
      name: 'base64',
      run: ({ args, env }) => {
        const decode = args.includes('-d') || args.includes('--decode');
        const input = args.filter((a) => a !== '-d' && a !== '--decode').join(' ');
        if (!input) {
          env.out.line(err('base64: 入力を指定してください（例: base64 -d .flag）'));
          return;
        }
        if (!decode) {
          env.out.line(encodeBase64(input));
          return;
        }
        const decoded = decodeBase64(normalizePath(input) === '.flag' ? FLAG_B64 : input);
        if (decoded === null) {
          env.out.line(err('base64: invalid input'));
          return;
        }
        if (decoded.startsWith('JUCK{')) {
          env.out.line(c('c-ok c-b c-glow', decoded));
          env.out.line(c('c-acc2', 'Congrats! 隠しフラグを見つけました。'));
          env.out.line(dim('# なお、このフラグに配点はありません'));
          return;
        }
        env.out.line(decoded);
      },
    },
    {
      name: 'flag',
      run: ({ env }) => env.out.line(dim('flag はそう簡単には手に入りません。まずは ls -a から。')),
    },
    {
      name: 'ping',
      run: async ({ args, env, signal }) => {
        const target = args.find((a) => !a.startsWith('-'));
        if (target && !['localhost', '127.0.0.1', profile.host].includes(target)) {
          env.out.line(c('c-warn', `ping: ${target} には送信しません（このサイトは外部と通信しません）`));
        }
        env.out.line(`PING ${profile.host} (127.0.0.1) 56(84) bytes of data.`);
        for (let i = 1; i <= 4; i++) {
          await env.sleep(450, signal);
          const ms = (0.03 + Math.random() * 0.06).toFixed(3);
          env.out.line(`64 bytes from 127.0.0.1: icmp_seq=${i} ttl=64 time=${ms} ms`);
        }
        env.out.line('');
        env.out.line(`--- ${profile.host} ping statistics ---`);
        env.out.line('4 packets transmitted, 4 received, 0% packet loss, time 3004ms');
      },
    },
    {
      name: 'curl',
      aliases: ['wget', 'nc', 'telnet'],
      run: ({ env }) => {
        env.out.line(err('curl: (7) Failed to connect: このサイトは CSP で外部への通信を禁止しています'));
        env.out.line(dim("# connect-src 'self'"));
      },
    },
    {
      name: 'ssh',
      run: ({ env }) => {
        env.out.line(err(`ssh: connect to host ${profile.host} port 22: Connection refused`));
        env.out.line(hint('# 連絡は', 'contact'));
      },
    },
    {
      name: 'man',
      run: ({ args, env }) => {
        const name = args[0];
        if (!name) {
          env.out.line('What manual page do you want?');
          return;
        }
        const cmd = commands.find((x) => x.name === name || x.aliases?.includes(name));
        if (!cmd?.desc) {
          env.out.line(err(`No manual entry for ${name}`));
          return;
        }
        env.out.lines([
          c('c-b', 'NAME'),
          `       ${cmd.name} - ${cmd.desc}`,
          '',
          c('c-b', 'SYNOPSIS'),
          `       ${cmd.usage ?? cmd.name}`,
        ]);
      },
    },
  ];
  return commands;
}
