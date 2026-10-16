/** 演出系の処理（デジタルレイン・グリッチ） */

const GLYPHS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>/{}$#';

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 紫のデジタルレインを全画面に描画する。signal が abort されたら片付けて終了する。
 * 描画は約 20fps に間引き、タブが非表示のあいだは requestAnimationFrame が止まる。
 */
export function matrixRain(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'matrix-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
      resolve();
      return;
    }

    const root = getComputedStyle(document.documentElement);
    const palette = ['--accent', '--accent-2', '--accent-3'].map((v) => root.getPropertyValue(v).trim() || '#b77dff');
    const fade = toRgba(getComputedStyle(document.body).backgroundColor, 0.14);
    const size = 16;
    let columns: number[] = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Array.from({ length: Math.ceil(width / size) }, () => Math.floor(Math.random() * -40));
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 50) return;
      last = t;
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${size}px 'M PLUS 1 Code Variable', 'JetBrains Mono Sub', monospace`;
      columns.forEach((row, i) => {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '0';
        ctx.fillStyle = Math.random() > 0.96 ? '#f3ecff' : (palette[i % palette.length] ?? '#b77dff');
        ctx.fillText(glyph, i * size, row * size);
        columns[i] = row * size > height && Math.random() > 0.97 ? 0 : row + 1;
      });
    };
    raf = requestAnimationFrame(frame);

    signal.addEventListener(
      'abort',
      () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        canvas.classList.add('is-leaving');
        window.setTimeout(() => canvas.remove(), 400);
        resolve();
      },
      { once: true },
    );
  });
}

/** ページ全体を一瞬グリッチさせる（視差効果を減らす設定のときは何もしない） */
export function glitchPage(ms = 700): void {
  if (prefersReducedMotion()) return;
  const html = document.documentElement;
  html.classList.add('is-glitching');
  window.setTimeout(() => html.classList.remove('is-glitching'), ms);
}

function toRgba(color: string, alpha: number): string {
  const m = color.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return `rgba(10, 7, 16, ${alpha})`;
  return `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${alpha})`;
}
