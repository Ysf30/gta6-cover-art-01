// Bold poster lettering, drawn on canvas with system fonts only: a huge
// outlined title with a gradient fill and a hard offset shadow, a tracked
// subline beneath it, and a small studio tag for the cover's corner.

const TITLE_STACK = '"Arial Black", "Archivo Black", "Helvetica Neue", Arial, sans-serif';
const SUBLINE_STACK = '"Helvetica Neue", Arial, sans-serif';

/** Largest font size (px) whose text fits `maxWidth` on `ctx`. */
export function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px ${TITLE_STACK}`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px ${TITLE_STACK}`;
  }
  return size;
}

/**
 * Draws the title block in the cover's lower-left: a dark scrim so the
 * letters pop, then the title (tilted a touch) and the tracked subline.
 * `style` picks the title fill: 'white', 'sunset' or 'neon'.
 */
export function drawTitleBlock(ctx, w, h, title, subline, style) {
  const margin = w * 0.045;
  const bandTop = h * 0.66;
  const scrim = ctx.createLinearGradient(0, bandTop, 0, h);
  scrim.addColorStop(0, 'rgba(16, 4, 26, 0)');
  scrim.addColorStop(0.55, 'rgba(16, 4, 26, 0.55)');
  scrim.addColorStop(1, 'rgba(16, 4, 26, 0.82)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandTop, w, h - bandTop);

  const words = (title || 'SUNSET HEIST').trim().toUpperCase();
  const maxWidth = w - margin * 2;
  const size = fitTitleSize(ctx, words, maxWidth, h * 0.115);
  const baseline = h - h * 0.085;

  ctx.save();
  ctx.translate(margin, baseline);
  ctx.rotate(-0.028);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${size}px ${TITLE_STACK}`;
  ctx.lineJoin = 'round';
  // Hard offset shadow, then a thick dark outline, then the fill.
  ctx.fillStyle = style === 'neon' ? 'rgba(255, 0, 140, 0.85)' : 'rgba(255, 90, 40, 0.85)';
  ctx.fillText(words, size * 0.045, size * 0.05);
  ctx.strokeStyle = '#16041f';
  ctx.lineWidth = Math.max(4, size * 0.14);
  ctx.strokeText(words, 0, 0);
  ctx.fillStyle = titleFill(ctx, 0, -size, maxWidth, size, style);
  ctx.fillText(words, 0, 0);
  ctx.restore();

  const tag = (subline || '').trim().toUpperCase();
  if (tag) drawTrackedSubline(ctx, tag, margin, baseline + h * 0.045, w, h);
}

/** Gradient (or plain white) fill for the title, in the title's own box. */
export function titleFill(ctx, x, y, width, height, style) {
  if (style === 'sunset') {
    const g = ctx.createLinearGradient(x, y, x + width, y);
    g.addColorStop(0, '#fff7d6');
    g.addColorStop(0.5, '#ffb347');
    g.addColorStop(1, '#ff4e8a');
    return g;
  }
  if (style === 'neon') {
    const g = ctx.createLinearGradient(x, y, x, y + height);
    g.addColorStop(0, '#eafcff');
    g.addColorStop(0.55, '#ffffff');
    g.addColorStop(1, '#ff7ad9');
    return g;
  }
  return '#ffffff';
}

/** Draws `text` as widely tracked small capitals with a dark pill behind. */
export function drawTrackedSubline(ctx, text, x, y, w, h) {
  const size = Math.max(12, h * 0.028);
  ctx.font = `700 ${size}px ${SUBLINE_STACK}`;
  const tracking = size * 0.32;
  const textWidth = [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width + tracking, -tracking);
  const padX = size * 0.7;
  const padY = size * 0.55;
  ctx.fillStyle = 'rgba(16, 4, 31, 0.78)';
  roundRect(ctx, x - padX, y - size - padY * 0.4, textWidth + padX * 2, size + padY, size * 0.5);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
}

/** Small studio tag in the cover's top-left corner, our own mark. */
export function drawCornerTag(ctx, w, h, label) {
  const size = Math.max(11, h * 0.02);
  ctx.font = `800 ${size}px ${SUBLINE_STACK}`;
  const padX = size * 0.8;
  const padY = size * 0.5;
  const textWidth = ctx.measureText(label).width;
  const x = w * 0.035;
  const y = h * 0.035;
  ctx.fillStyle = 'rgba(16, 4, 31, 0.72)';
  roundRect(ctx, x, y, textWidth + padX * 2, size + padY * 2, size * 0.45);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + padX, y + (size + padY * 2) / 2);
}

/** Path for a rounded rectangle, filled by the caller. */
export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
