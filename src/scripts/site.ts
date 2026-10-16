/**
 * 全ページ共通のスクリプト
 * - tmux 風ステータスバーの時計と、現在表示中のセクションの表示
 * - キーボードショートカット（0〜6 でセクション移動、/ でターミナルへ、q で記事を閉じる）
 * - パネルが画面に入ったらプロンプトのコマンドをタイプ表示
 * - 開発者ツールを開いた人へのちょっとしたメッセージ
 */
import { FOX } from '../data/ascii';

const html = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- 時計 ---- */

const clock = document.querySelector<HTMLElement>('[data-clock]');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  const tick = () => {
    const now = new Date();
    clock.textContent = `${fmt.format(now)} ${dateFmt.format(now).replace(/ /g, '-')}`;
    clock.setAttribute('datetime', now.toISOString());
  };
  tick();
  window.setInterval(tick, 15_000);
}

/* ---- 現在のセクションをステータスバーに反映 ---- */

const windows = [...document.querySelectorAll<HTMLAnchorElement>('[data-window]')];
const sections = windows
  .map((a) => document.getElementById(a.dataset.window ?? ''))
  .filter((el): el is HTMLElement => el !== null);

if (sections.length > 0 && 'IntersectionObserver' in window) {
  const visible = new Map<string, number>();
  const update = () => {
    let best = '';
    let ratio = 0;
    for (const [id, r] of visible) {
      if (r > ratio) {
        ratio = r;
        best = id;
      }
    }
    if (!best) return;
    for (const a of windows) {
      if (a.dataset.window === best) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
      update();
    },
    { threshold: [0, 0.15, 0.3, 0.5, 0.75, 1], rootMargin: '-10% 0px -35% 0px' },
  );
  for (const s of sections) io.observe(s);
}

/* ---- パネルのタイプ演出 ---- */

const panels = document.querySelectorAll<HTMLElement>('[data-panel]');
if (panels.length > 0) {
  if (reduceMotion || !('IntersectionObserver' in window)) {
    for (const p of panels) p.classList.add('is-visible');
  } else {
    const io = new IntersectionObserver(
      (entries, observer) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('is-visible');
          observer.unobserve(e.target);
        }
      },
      { threshold: 0.2 },
    );
    for (const p of panels) io.observe(p);
  }
}

/* ---- キーボードショートカット ---- */

const terminalInput = document.querySelector<HTMLInputElement>('[data-term-input]');
const terminalScreen = document.querySelector<HTMLElement>('[data-term-screen]');
let terminalVisible = false;
if (terminalScreen && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => {
    terminalVisible = Boolean(e?.isIntersecting);
  }).observe(terminalScreen);
}

const isTyping = (el: Element | null): boolean =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement ||
  (el instanceof HTMLElement && el.isContentEditable);

const focusTerminal = (): boolean => {
  if (!terminalInput || terminalInput.closest('[hidden]') || html.hasAttribute('data-boot')) return false;
  terminalInput.focus({ preventScroll: !terminalVisible });
  if (!terminalVisible) terminalScreen?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  return true;
};

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
  if (isTyping(document.activeElement)) return;

  // 0〜6: ステータスバーの各ウィンドウ（セクション）へ移動
  const win = windows.find((a) => a.dataset.key === e.key);
  if (win) {
    e.preventDefault();
    win.click();
    return;
  }

  // "/" でターミナルにフォーカス
  if (e.key === '/' && focusTerminal()) {
    e.preventDefault();
    return;
  }

  // 記事ページ: q で一覧へ戻る（less 風）
  const back = document.body.dataset.pagerBack;
  if (back && e.key === 'q') {
    window.location.assign(back);
    return;
  }

  // ターミナルが見えている時に英字を打ち始めたら、そのまま入力できるようにする
  if (terminalVisible && /^[a-z]$/i.test(e.key)) focusTerminal();
});

/* ---- ステータスバーのリンク: 同じページ内ならスムーズにスクロール ---- */

for (const a of windows) {
  a.addEventListener('click', (e) => {
    const id = a.dataset.window ?? '';
    const target = document.getElementById(id);
    if (!target) return; // 別ページ（記事ページなど）では通常の遷移
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
    if (id !== 'home') target.focus({ preventScroll: true });
  });
}

/* ---- 404 ページ: 見つからなかったパスを表示（textContent なので HTML として解釈されない） ---- */

const missingPath = document.querySelector('[data-missing-path]');
if (missingPath) {
  try {
    missingPath.textContent = decodeURIComponent(window.location.pathname);
  } catch {
    missingPath.textContent = window.location.pathname;
  }
}

/* ---- 開発者ツールを開いた人へ ---- */

console.log(
  `%c${FOX}\n\n%cHi, curious hacker.%c\nTry "ls -a" in the terminal. There might be a flag...`,
  'color:#b77dff;font-family:monospace;line-height:1.32',
  'color:#e879f9;font-weight:bold;font-size:14px',
  'color:#b9abd9',
);
