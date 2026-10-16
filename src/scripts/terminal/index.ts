/**
 * 対話型ターミナル（トップページのヒーロー部分）
 *
 * - 入力は <form> + <input> で受け取る（モバイルのソフトキーボード・日本語 IME に対応）
 * - 出力は DOM API だけで組み立てる（innerHTML 不使用）
 * - JS が無効でも静的な内容（バナー・MOTD・各セクション）は読めるようにしている
 */
import { profile, promptId } from '../../data/profile';
import { createCommands, SECTIONS, suggest, unixDate, type Command, type Env } from './commands';
import { prefersReducedMotion } from './effects';
import { c, Output, run } from './io';
import type { PostSummary, Seg } from './types';

const KEY = {
  history: 'juck:history',
  theme: 'juck:theme',
  crt: 'juck:crt',
  booted: 'juck:booted',
  lastLogin: 'juck:last-login',
} as const;

const DEFAULT_THEME = 'violet';
const MAX_HISTORY = 100;

/** 起動ログ（systemd 風） */
const BOOT_LOG: [kind: 'ok' | 'info' | 'warn', text: string][] = [
  ['info', 'Booting KurohasuOS 6.6.6-purple ...'],
  ['ok', 'Started Journal Service.'],
  ['ok', `Mounted /home/${profile.user}.`],
  ['ok', 'Started Network Manager.'],
  ['ok', 'Reached target Network is Online.'],
  ['ok', 'Started nftables firewall (policy: drop).'],
  ['ok', 'Started Content Security Policy enforcer.'],
  ['warn', 'fox.ko: module verification failed - tainting kernel (purple).'],
  ['ok', 'Started Purple Haze Display Manager.'],
  ['ok', 'Reached target Graphical Interface.'],
  ['info', 'Starting jsh - the JUCK shell ...'],
];

/* ---------------------------------------------------------
 * ユーティリティ
 * --------------------------------------------------------- */

/** localStorage / sessionStorage は無効化されている環境もあるので必ず try/catch で包む */
const store = {
  get(area: 'local' | 'session', key: string): string | null {
    try {
      return (area === 'local' ? localStorage : sessionStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(area: 'local' | 'session', key: string, value: string | null): void {
    try {
      const s = area === 'local' ? localStorage : sessionStorage;
      if (value === null) s.removeItem(key);
      else s.setItem(key, value);
    } catch {
      /* 保存できなくても動作は継続する */
    }
  },
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError';

/** シェル風の引数分割（"..." と '...' のクォートに対応） */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: string | null = null;
  let started = false;
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (started) tokens.push(current);
      current = '';
      started = false;
      continue;
    }
    current += ch;
    started = true;
  }
  if (started) tokens.push(current);
  return tokens;
}

function commonPrefix(words: string[]): string {
  if (words.length === 0) return '';
  let prefix = words[0] ?? '';
  for (const w of words) {
    while (!w.toLowerCase().startsWith(prefix.toLowerCase())) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

function parsePosts(raw: string | undefined): PostSummary[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? (value as PostSummary[]) : [];
  } catch {
    return [];
  }
}

function loadHistory(): string[] {
  try {
    const value: unknown = JSON.parse(store.get('local', KEY.history) ?? '[]');
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(-MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

/* ---------------------------------------------------------
 * 本体
 * --------------------------------------------------------- */

/** ターミナルを構成する要素をまとめて取得する（1 つでも欠けていれば null） */
function queryParts(root: HTMLElement) {
  const screen = root.querySelector<HTMLElement>('[data-term-screen]');
  const outEl = root.querySelector<HTMLElement>('[data-term-output]');
  const bootEl = root.querySelector<HTMLElement>('[data-term-boot]');
  const staticEl = root.querySelector<HTMLElement>('[data-term-static]');
  const form = root.querySelector<HTMLFormElement>('[data-term-form]');
  const input = root.querySelector<HTMLInputElement>('[data-term-input]');
  if (!screen || !outEl || !bootEl || !staticEl || !form || !input) return null;
  return { screen, outEl, bootEl, staticEl, form, input };
}

function setup(root: HTMLElement): void {
  const parts = queryParts(root);
  if (!parts) return;
  const { screen, outEl, bootEl, staticEl, form, input } = parts;

  const html = document.documentElement;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const history = loadHistory();
  let historyIndex = history.length;
  let draft = '';
  let running: { controller: AbortController; stopOnInput: boolean } | null = null;
  let loggedOut = false;

  const scrollToBottom = () => {
    screen.scrollTop = screen.scrollHeight;
  };
  const out = new Output(outEl, scrollToBottom);

  const env: Env = {
    out,
    posts: parsePosts(root.dataset.posts),
    history,
    startedAt: Date.now(),
    sleep: (ms, signal) => sleep(prefersReducedMotion() ? Math.min(ms, 60) : ms, signal),
    scrollToSection(id) {
      if (!(SECTIONS as readonly string[]).includes(id)) return false;
      const el = document.getElementById(id);
      if (!el) return false;
      el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${id}`);
      if (id !== 'home') el.focus({ preventScroll: true });
      return true;
    },
    navigate(href) {
      window.location.assign(href);
    },
    openExternal(url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    getTheme: () => html.getAttribute('data-theme') ?? DEFAULT_THEME,
    setTheme(name) {
      if (name === DEFAULT_THEME) html.removeAttribute('data-theme');
      else html.setAttribute('data-theme', name);
      store.set('local', KEY.theme, name === DEFAULT_THEME ? null : name);
    },
    isCrtOn: () => html.getAttribute('data-crt') !== 'off',
    setCrt(on) {
      if (on) html.removeAttribute('data-crt');
      else html.setAttribute('data-crt', 'off');
      store.set('local', KEY.crt, on ? null : 'off');
    },
    clearScreen() {
      out.clear();
      staticEl.hidden = true;
    },
    reboot: () => boot(true),
    logout,
  };

  const commands = createCommands();
  const table = new Map<string, Command>();
  for (const cmd of commands) {
    table.set(cmd.name, cmd);
    for (const alias of cmd.aliases ?? []) table.set(alias, cmd);
  }
  const visibleNames = commands
    .filter((cmd) => cmd.desc)
    .map((cmd) => cmd.name)
    .sort();

  /* ---- 出力 ---- */

  function echoPrompt(text: string, suffix: Seg[] = []): void {
    out.line([c('p-user', promptId), c('p-sep', ':'), c('p-path', '~'), c('p-sym', '$ '), text, ...suffix], 'ln-cmd');
  }

  function pushHistory(cmd: string): void {
    if (history[history.length - 1] !== cmd) history.push(cmd);
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    historyIndex = history.length;
    draft = '';
    store.set('local', KEY.history, JSON.stringify(history));
  }

  /* ---- 実行 ---- */

  async function execute(line: string): Promise<void> {
    const trimmed = line.trim();
    echoPrompt(line);
    if (!trimmed) return;
    pushHistory(trimmed);

    const [name = '', ...args] = tokenize(trimmed);
    const cmd = table.get(name) ?? table.get(name.toLowerCase());
    if (!cmd) {
      out.line(c('c-err', `jsh: command not found: ${name}`));
      const guess = suggest(name.toLowerCase(), [...table.keys()]);
      if (guess) out.line([c('c-dim', 'もしかして: '), run(guess), c('c-dim', ' ?')]);
      else out.line([c('c-dim', 'コマンドの一覧は '), run('help'), c('c-dim', ' で確認できます。')]);
      return;
    }

    const controller = new AbortController();
    const wasFocused = document.activeElement === input;
    let result: void | Promise<void>;
    try {
      result = cmd.run({ args, env, signal: controller.signal });
    } catch (e) {
      report(name, e);
      return;
    }
    if (!(result instanceof Promise)) return;

    // 非同期コマンドの実行中は入力欄を隠し、Ctrl+C（matrix は任意のキー）で中断できるようにする
    running = { controller, stopOnInput: Boolean(cmd.stopOnInput) };
    form.hidden = true;
    try {
      await result;
    } catch (e) {
      if (isAbort(e)) out.line(c('c-dim', '^C'));
      else report(name, e);
    } finally {
      running = null;
      if (!loggedOut) {
        form.hidden = false;
        if (wasFocused) input.focus({ preventScroll: true });
      }
      scrollToBottom();
    }
  }

  function report(name: string, e: unknown): void {
    out.line(c('c-err', `jsh: ${name}: 実行中にエラーが発生しました`));
    console.error(e);
  }

  /* ---- 補完・履歴 ---- */

  function complete(): void {
    const value = input.value;
    const tokens = tokenize(value);
    const trailingSpace = /\s$/.test(value);
    let current: string;
    let candidates: string[];

    if (tokens.length <= 1 && !trailingSpace) {
      current = tokens[0] ?? '';
      candidates = visibleNames;
    } else {
      const cmd = table.get(tokens[0] ?? '');
      if (!cmd?.complete) return;
      const args = tokens.slice(1);
      current = trailingSpace ? '' : (args.pop() ?? '');
      candidates = cmd.complete(args, env);
    }

    const matches = [...new Set(candidates)].filter((x) => x.toLowerCase().startsWith(current.toLowerCase()));
    if (matches.length === 0) return;
    const head = value.slice(0, value.length - current.length);
    if (matches.length === 1) {
      const only = matches[0] ?? '';
      input.value = `${head}${only}${only.endsWith('/') ? '' : ' '}`;
      return;
    }
    const common = commonPrefix(matches);
    if (common.length > current.length) {
      input.value = `${head}${common}`;
      return;
    }
    echoPrompt(value);
    out.line(matches.flatMap((m, i): Seg[] => (i < matches.length - 1 ? [c('c-info', m), '  '] : [c('c-info', m)])));
  }

  function moveHistory(step: -1 | 1): void {
    if (history.length === 0) return;
    if (historyIndex === history.length) draft = input.value;
    historyIndex = Math.min(history.length, Math.max(0, historyIndex + step));
    input.value = historyIndex === history.length ? draft : (history[historyIndex] ?? '');
    const end = input.value.length;
    requestAnimationFrame(() => input.setSelectionRange(end, end));
  }

  /* ---- 起動演出・ログアウト ---- */

  function bootLine(kind: 'ok' | 'info' | 'warn', text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ln';
    const tag = document.createElement('span');
    tag.className = kind === 'ok' ? 'c-ok' : kind === 'warn' ? 'c-warn' : 'c-info';
    tag.textContent = kind === 'ok' ? '  OK  ' : kind === 'warn' ? ' WARN ' : ' INFO ';
    el.append('[', tag, '] ', text);
    return el;
  }

  function glitchBanner(): void {
    if (prefersReducedMotion()) return;
    const banner = staticEl.querySelector('.banner');
    banner?.classList.add('is-glitching');
    window.setTimeout(() => banner?.classList.remove('is-glitching'), 900);
  }

  async function boot(isReboot = false): Promise<void> {
    if (isReboot) {
      out.clear();
      loggedOut = false;
      staticEl.hidden = false;
    }
    if (prefersReducedMotion()) {
      html.removeAttribute('data-boot');
      store.set('session', KEY.booted, '1');
      return;
    }
    html.setAttribute('data-boot', '');
    bootEl.replaceChildren();
    bootEl.hidden = false;
    screen.scrollTop = 0;

    // 何かキーを押すかタップすると演出をスキップ
    const skip = new AbortController();
    const onSkip = (e: Event) => {
      if (e instanceof KeyboardEvent && ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
      skip.abort();
    };
    window.addEventListener('keydown', onSkip);
    window.addEventListener('pointerdown', onSkip);
    try {
      for (const [kind, text] of BOOT_LOG) {
        await sleep(40 + Math.random() * 80, skip.signal);
        bootEl.append(bootLine(kind, text));
      }
      await sleep(380, skip.signal);
    } catch {
      /* スキップされた */
    } finally {
      window.removeEventListener('keydown', onSkip);
      window.removeEventListener('pointerdown', onSkip);
    }
    bootEl.replaceChildren();
    bootEl.hidden = true;
    html.removeAttribute('data-boot');
    store.set('session', KEY.booted, '1');
    glitchBanner();
  }

  function logout(): void {
    loggedOut = true;
    out.line('logout');
    out.line(c('c-dim', `Connection to ${profile.host} closed.`));
    out.line(run('[ 再接続する ]', 'reboot'));
    form.hidden = true;
  }

  /* ---- イベント ---- */

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (running || loggedOut) return;
    const value = input.value;
    input.value = '';
    void execute(value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.isComposing) return; // 日本語 IME の変換中は何もしない
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveHistory(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveHistory(1);
    } else if (e.key === 'Tab' && input.value.trim() !== '' && !e.shiftKey) {
      // 空欄のときは通常どおりフォーカス移動（キーボード操作で閉じ込めないため）
      e.preventDefault();
      complete();
    } else if (e.key === 'Escape') {
      input.blur();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      env.clearScreen();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c' && input.selectionStart === input.selectionEnd) {
      e.preventDefault();
      echoPrompt(input.value, [c('c-dim', '^C')]);
      input.value = '';
      historyIndex = history.length;
    }
  });

  // 実行中のコマンドの中断
  document.addEventListener('keydown', (e) => {
    if (!running) return;
    const interrupt = (e.ctrlKey && e.key.toLowerCase() === 'c') || e.key === 'Escape' || e.key === 'q';
    const modifierOnly = ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key);
    if (interrupt || (running.stopOnInput && !modifierOnly)) {
      e.preventDefault();
      running.controller.abort();
    }
  });
  document.addEventListener('pointerdown', () => {
    if (running?.stopOnInput) running.controller.abort();
  });

  // [data-run] を持つ要素のクリックでコマンドを実行（MOTD・ヘルプ・チップなど）
  root.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    const trigger = target.closest<HTMLElement>('[data-run]');
    if (trigger) {
      e.preventDefault();
      const cmd = trigger.dataset.run ?? '';
      if (running || (loggedOut && cmd !== 'reboot')) return;
      void execute(cmd);
      return;
    }
    // マウス操作では、端末内の何もない所をクリックすると入力欄にフォーカス
    if (!finePointer || target.closest('a, button, input')) return;
    if (window.getSelection()?.toString()) return;
    if (screen.contains(target) && !form.hidden) input.focus({ preventScroll: true });
  });

  /* ---- 初期化 ---- */

  const lastLogin = root.querySelector('[data-last-login]');
  if (lastLogin) {
    const prev = Number(store.get('local', KEY.lastLogin));
    lastLogin.textContent = prev
      ? `Last login: ${unixDate(new Date(prev))} from 127.0.0.1`
      : 'Last login: never — はじめまして、ようこそ！';
    store.set('local', KEY.lastLogin, String(Date.now()));
  }

  const sizeEl = root.querySelector('[data-term-size]');
  if (sizeEl && 'ResizeObserver' in window) {
    new ResizeObserver(([entry]) => {
      if (!entry) return;
      const fontSize = parseFloat(getComputedStyle(screen).fontSize) || 15;
      const cols = Math.floor(entry.contentRect.width / (fontSize * 0.6));
      const rows = Math.floor(entry.contentRect.height / (fontSize * 1.7));
      sizeEl.textContent = `${cols}×${rows}`;
    }).observe(screen);
  }

  root.classList.add('is-ready');
  if (html.hasAttribute('data-boot')) void boot();
}

const terminalRoot = document.querySelector<HTMLElement>('[data-terminal]');
if (terminalRoot) setup(terminalRoot);
