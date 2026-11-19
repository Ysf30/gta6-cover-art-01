// Fixed scenes for screenshots, driven by `?shot=`:
//   shot=cover  — the finished cover alone, full-bleed, at the window's size
//   shot=editor — the editor with a sample photo loaded
//   shot=export — renders one post size and writes its PNG data URL into the
//                 page, so a headless run can save the exact exported file
// Query knobs: photo (pier|boulevard), caption, subline, layout, grade,
// titleStyle, size (for export: 1080x1080, 1080x1350 or 1920x1080).
// window.__shotReady is set once the scene has painted.

import { renderCover } from './cover.js';
import { makeGrainTile } from './grade.js';

const EXPORT_WIDTHS = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export async function runShot(shot, query, api) {
  const { state } = api;
  state.title = query.get('caption') ?? state.title;
  state.subline = query.get('subline') ?? state.subline;
  if (query.get('layout')) {
    state.layout = query.get('layout');
    api.syncSlots();
  }
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('titleStyle')) state.titleStyle = query.get('titleStyle');

  const photoName = query.get('photo') ?? 'pier';
  await api.loadSample({ name: photoName, file: `${photoName}.jpg` });
  const secondPhoto = query.get('photo2');
  if (secondPhoto) {
    await api.loadSample({ name: secondPhoto, file: `${secondPhoto}.jpg` });
    // Second photo goes to the last panel so the cover shows two photos.
    const last = state.slots.length - 1;
    if (last > 0) state.slots[last].photo = 1;
  }
  api.redraw();

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    api.redraw();
  } else if (shot === 'export') {
    const [w, h] = EXPORT_WIDTHS[query.get('size')] ?? [1080, 1080];
    const offscreen = document.createElement('canvas');
    renderCover(offscreen, state, w, h, makeGrainTile());
    const dataUrl = offscreen.toDataURL('image/png');
    const holder = document.createElement('pre');
    holder.id = 'shot-export';
    holder.textContent = dataUrl;
    document.body.appendChild(holder);
  }
  markShotReady();
}

/** Flags the scene painted, after two frames, for headless screenshots. */
export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
