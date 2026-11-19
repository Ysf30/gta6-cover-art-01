// Colour grades: sunset and neon washes plus a soft vignette and a
// procedural film grain, all drawn on canvas so the app needs no assets.

export const GRADE_PRESETS = {
  sunset: {
    label: 'Vice Sunset',
    // Warm wash: transparent sky, hot orange low, magenta at the foot.
    wash: [
      [0, 'rgba(255, 190, 90, 0.00)'],
      [0.45, 'rgba(255, 120, 60, 0.14)'],
      [0.8, 'rgba(230, 60, 110, 0.28)'],
      [1, 'rgba(150, 20, 120, 0.36)'],
    ],
    warmTint: 'rgba(255, 140, 60, 0.10)',
    vignette: 0.32,
  },
  neon: {
    label: 'Neon Nights',
    // Cool cyan up top, hot magenta down low: the night-strip look.
    wash: [
      [0, 'rgba(0, 225, 255, 0.22)'],
      [0.4, 'rgba(120, 80, 255, 0.12)'],
      [0.75, 'rgba(255, 0, 140, 0.26)'],
      [1, 'rgba(255, 0, 110, 0.36)'],
    ],
    warmTint: 'rgba(0, 200, 255, 0.06)',
    vignette: 0.42,
  },
  heat: {
    label: 'Leonida Heat',
    // Golden-hour heat: honeyed highlights, deep amber shadows.
    wash: [
      [0, 'rgba(255, 220, 130, 0.08)'],
      [0.5, 'rgba(255, 160, 50, 0.12)'],
      [1, 'rgba(190, 70, 20, 0.26)'],
    ],
    warmTint: 'rgba(255, 170, 60, 0.12)',
    vignette: 0.28,
  },
};

/** Names of the grades in the order the editor offers them. */
export function gradeNames() {
  return Object.keys(GRADE_PRESETS);
}

/**
 * Paints one grade over the rectangle (x, y, w, h) of `ctx`. The caller
 * clips to a panel first when the wash must stay inside that panel.
 */
export function paintGrade(ctx, gradeId, x, y, w, h) {
  const preset = GRADE_PRESETS[gradeId] ?? GRADE_PRESETS.sunset;
  const wash = ctx.createLinearGradient(x, y, x, y + h);
  for (const [at, color] of preset.wash) wash.addColorStop(at, color);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = preset.warmTint;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'source-over';
  paintVignette(ctx, x, y, w, h, preset.vignette);
}

/** Darkens the corners and edges of a rectangle, keeping the middle bright. */
export function paintVignette(ctx, x, y, w, h, strength) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const radius = Math.hypot(w, h) / 2;
  const shade = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
  shade.addColorStop(0, 'rgba(10, 2, 20, 0)');
  shade.addColorStop(1, `rgba(10, 2, 20, ${strength})`);
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
}

/**
 * Builds a small tile of random grey speckle once; the cover stamps it as
 * a repeating pattern at low opacity for a printed-poster grain.
 */
export function makeGrainTile(size = 140) {
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  const image = tctx.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = Math.floor(Math.random() * 255);
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 28;
  }
  tctx.putImageData(image, 0, 0);
  return tile;
}

/** Stamps the grain tile across the whole cover at a whisper of opacity. */
export function paintGrain(ctx, w, h, tile) {
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
