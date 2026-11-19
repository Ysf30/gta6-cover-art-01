// Panel layouts for the cover: each layout is a set of polygons in unit
// coordinates (0..1 across the cover). Gutters stay light so the panels read
// like a comic-book poster, and a few edges slant for the GTA poster feel.

export const PANEL_LAYOUTS = {
  poster: {
    label: 'Poster · 3 panels',
    panels: [
      // Hero strip across the top, its lower edge slanting up to the right.
      [[0, 0], [1, 0], [1, 0.575], [0, 0.615]],
      // Lower-left panel, its right edge slanting out toward the bottom.
      [[0, 0.63], [0.485, 0.6], [0.52, 1], [0, 1]],
      // Lower-right panel, mirroring the slant.
      [[0.5, 0.6], [1, 0.575], [1, 1], [0.535, 1]],
    ],
  },
  collage: {
    label: 'Collage · 5 panels',
    panels: [
      // One tall panel on the left, its right edge slanting inward.
      [[0, 0], [0.565, 0], [0.535, 1], [0, 1]],
      // Four small panels filling the right side, two over two.
      [[0.58, 0], [0.785, 0], [0.785, 0.49], [0.58, 0.49]],
      [[0.795, 0], [1, 0], [1, 0.49], [0.795, 0.49]],
      [[0.565, 0.51], [0.785, 0.51], [0.785, 1], [0.55, 1]],
      [[0.795, 0.51], [1, 0.51], [1, 1], [0.795, 1]],
    ],
  },
  solo: {
    label: 'Solo · 1 panel',
    panels: [
      [[0, 0], [1, 0], [1, 1], [0, 1]],
    ],
  },
};

/** Names of the layouts in the order the editor offers them. */
export function layoutNames() {
  return Object.keys(PANEL_LAYOUTS);
}

/**
 * Turns a layout's unit polygons into pixel polygons for a cover of
 * width `w` and height `h`, shrinking each one slightly toward its own
 * centre so a light gutter shows between neighbouring panels.
 */
export function layoutPolygons(layoutId, w, h, gutterPx) {
  const layout = PANEL_LAYOUTS[layoutId] ?? PANEL_LAYOUTS.poster;
  return layout.panels.map((unit) => {
    const pts = unit.map(([fx, fy]) => [fx * w, fy * h]);
    return shrinkPolygon(pts, gutterPx / 2);
  });
}

/** Moves every corner of a polygon toward its centroid by `px` pixels. */
export function shrinkPolygon(points, px) {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  return points.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const pull = Math.min(px, dist * 0.4);
    return [x - (dx / dist) * pull, y - (dy / dist) * pull];
  });
}

/** Builds a Path2D from pixel points so a panel can be clipped and stroked. */
export function polygonPath(points) {
  const path = new Path2D();
  path.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) path.lineTo(points[i][0], points[i][1]);
  path.closePath();
  return path;
}

/** True when pixel (x, y) lies inside the polygon, for click-to-select. */
export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Bounding box of a pixel polygon, as [x, y, width, height]. */
export function polygonBounds(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return [x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0];
}
