import type { Line, Seg } from './types';

/** 出力行数の上限（古いものから削除してメモリ使用量を抑える） */
const MAX_NODES = 600;

/** リンクとして許可する URL（http/https と同一サイト内の相対パスのみ。javascript: 等は拒否） */
const SAFE_HREF = /^(https?:\/\/|\/|#)/i;

/**
 * ターミナルの出力先。DOM は textContent / createElement だけで組み立て、
 * innerHTML は使わない（データ由来の文字列が HTML として解釈されないようにする）。
 */
export class Output {
  constructor(
    private readonly root: HTMLElement,
    private readonly onAppend: () => void,
  ) {}

  line(line: Line = '', cls = ''): HTMLElement {
    const el = document.createElement('div');
    el.className = cls ? `ln ${cls}` : 'ln';
    for (const seg of Array.isArray(line) ? line : [line]) el.append(renderSeg(seg));
    return this.append(el);
  }

  lines(lines: Line[], cls = ''): void {
    for (const l of lines) this.line(l, cls);
  }

  /** 桁揃えが必要なアスキーアート用（ASCII と罫線/ブロック文字のみを想定） */
  pre(text: string, cls = '', label?: string): HTMLPreElement {
    const el = document.createElement('pre');
    el.className = `art ${cls}`.trim();
    el.textContent = text;
    if (label) {
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', label);
    } else {
      el.setAttribute('aria-hidden', 'true');
    }
    return this.append(el);
  }

  append<T extends HTMLElement>(el: T): T {
    this.root.append(el);
    while (this.root.childElementCount > MAX_NODES) this.root.firstElementChild?.remove();
    this.onAppend();
    return el;
  }

  clear(): void {
    this.root.replaceChildren();
  }
}

export function renderSeg(seg: Seg): Node {
  if (typeof seg === 'string') return document.createTextNode(seg);

  if (seg.href !== undefined && SAFE_HREF.test(seg.href)) {
    const a = document.createElement('a');
    a.href = seg.href;
    a.textContent = seg.text;
    if (seg.cls) a.className = seg.cls;
    if (/^https?:/i.test(seg.href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    return a;
  }

  if (seg.run !== undefined) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `run ${seg.cls ?? ''}`.trim();
    button.dataset.run = seg.run;
    button.textContent = seg.text;
    return button;
  }

  const span = document.createElement('span');
  if (seg.cls) span.className = seg.cls;
  span.textContent = seg.text;
  return span;
}

/* ---- 出力組み立て用の小さなヘルパー ---- */

export const c = (cls: string, text: string): Seg => ({ text, cls });
export const link = (text: string, href: string, cls?: string): Seg => ({ text, href, cls });
export const run = (text: string, cmd: string = text): Seg => ({ text, run: cmd });

/** ASCII 文字列を指定幅まで右側に空白で埋める */
export const pad = (s: string, n: number): string => s + ' '.repeat(Math.max(0, n - s.length));
