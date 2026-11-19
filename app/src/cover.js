// Renders one finished cover onto a canvas at any size: light gutters,
// each panel's photo cropped and positioned by its slot, the chosen grade,
// film grain, then the bold title block and corner tag.

import { layoutPolygons, polygonPath, polygonBounds } from './panels.js';
import { paintGrade, paintGrain } from './grade.js';
import { drawTitleBlock, drawCornerTag } from './lettering.js';

export const GUTTER_COLOR = '#fff6ea';
export const STUDIO_TAG = 'VICE COVER STUDIO';

/**
 * A slot is one panel's photo setup: which photo it shows (an index into
 * the photos array, or -1 for empty), its zoom, pan offsets and flip.
 */
export function blankSlot(photoIndex = -1) {
  return { photo: photoIndex, zoom: 1, offsetX: 0, offsetY: 0, flip: false, focusX: 0.5, focusY: 0.18 };
}

/**
 * Draws the whole cover. `state` holds layout, grade, title, subline,
 * titleStyle, photos (HTMLImageElements) and slots (one per panel).
 * `grainTile` is the reusable speckle tile from grade.js.
 */
export function renderCover(canvas, state, width, height, grainTile) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = GUTTER_COLOR;
  ctx.fillRect(0, 0, width, height);

  const gutter = Math.max(6, Math.round(Math.min(width, height) * 0.012));
  const polygons = layoutPolygons(state.layout, width, height, gutter);
  polygons.forEach((points, index) => {
    const slot = state.slots[index] ?? blankSlot();
    drawPanelPhoto(ctx, points, state.photos[slot.photo] ?? null, slot);
    ctx.save();
    ctx.clip(polygonPath(points));
    const [x, y, pw, ph] = polygonBounds(points);
    paintGrade(ctx, state.grade, x, y, pw, ph);
    ctx.restore();
  });

  if (grainTile) paintGrain(ctx, width, height, grainTile);
  drawTitleBlock(ctx, width, height, state.title, state.subline, state.titleStyle);
  drawCornerTag(ctx, width, height, STUDIO_TAG);
  return canvas;
}

/**
 * Paints one panel: the photo clipped to the polygon, cover-fitted and
 * then zoomed, panned and optionally flipped by its slot. The crop window
 * is biased toward the upper third of the photo (where faces usually are),
 * so a tall portrait photo still shows its subject in a wide panel instead
 * of a headless torso. An empty slot gets a dusky gradient with a thin
 * frame instead of a photo.
 */
export function drawPanelPhoto(ctx, points, photo, slot) {
  const path = polygonPath(points);
  ctx.save();
  ctx.clip(path);
  const [x, y, pw, ph] = polygonBounds(points);
  if (!photo) {
    const empty = ctx.createLinearGradient(x, y, x + pw, y + ph);
    empty.addColorStop(0, '#3a2144');
    empty.addColorStop(1, '#160a24');
    ctx.fillStyle = empty;
    ctx.fillRect(x, y, pw, ph);
    ctx.strokeStyle = 'rgba(255, 246, 234, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 8, y + 8, pw - 16, ph - 16);
    ctx.restore();
    return;
  }
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const base = Math.max(pw / iw, ph / ih);
  const scale = base * (slot.zoom || 1);
  // The slice of the photo the panel shows, in photo pixels.
  const visibleW = Math.min(iw, pw / scale);
  const visibleH = Math.min(ih, ph / scale);
  const focusX = slot.focusX ?? 0.5;
  const focusY = slot.focusY ?? 0.18;
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const sx = clamp((iw - visibleW) * focusX + (slot.offsetX || 0) * visibleW, 0, iw - visibleW);
  const sy = clamp((ih - visibleH) * focusY + (slot.offsetY || 0) * visibleH, 0, ih - visibleH);
  if (slot.flip) {
    ctx.translate(x + pw / 2, y + ph / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(photo, sx, sy, visibleW, visibleH, -pw / 2, -ph / 2, pw, ph);
  } else {
    ctx.drawImage(photo, sx, sy, visibleW, visibleH, x, y, pw, ph);
  }
  ctx.restore();
}

/** Counts how many panels currently show a photo. */
export function filledPanelCount(state) {
  return state.slots.filter((slot) => slot.photo >= 0 && state.photos[slot.photo]).length;
}
