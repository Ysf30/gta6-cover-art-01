// Wires the editor: photo tray, layout and grade pickers, caption fields,
// click-to-select and drag-to-pan panels, and PNG export in the post sizes.
// A `?shot=` query hands the page to shots.js for a fixed screenshot scene.

import { renderCover, blankSlot, filledPanelCount } from './cover.js';
import { layoutNames, layoutPolygons, pointInPolygon, polygonBounds, PANEL_LAYOUTS } from './panels.js';
import { gradeNames, makeGrainTile, GRADE_PRESETS } from './grade.js';
import { runShot } from './shots.js';

const EXPORT_SIZES = [
  { label: 'Square · 1080 × 1080', width: 1080, height: 1080 },
  { label: 'Portrait · 1080 × 1350', width: 1080, height: 1350 },
  { label: 'Wide · 1920 × 1080', width: 1920, height: 1080 },
];

const SAMPLE_PHOTOS = [
  { name: 'Pier', file: 'pier.jpg' },
  { name: 'Boulevard', file: 'boulevard.jpg' },
];

const canvas = document.getElementById('coverCanvas');
const statusLine = document.getElementById('statusLine');
const grainTile = makeGrainTile();

const state = {
  layout: 'poster',
  grade: 'sunset',
  title: 'Sunset Heist',
  subline: 'Palm Shores · One Last Score',
  titleStyle: 'sunset',
  exportSize: 0,
  photos: [],
  photoNames: [],
  slots: [],
  selectedPanel: 0,
};

function resetSlots() {
  const count = PANEL_LAYOUTS[state.layout].panels.length;
  state.slots = Array.from({ length: count }, (_, i) =>
    blankSlot(state.photos.length > 0 ? 0 : -1),
  );
  state.selectedPanel = 0;
}

/**
 * Rebuilds the slots to match the current layout's panel count, keeping
 * each panel's photo setup where a panel survives the switch and filling
 * brand-new panels with the first photo (or leaving them empty).
 */
export function syncSlots() {
  const count = PANEL_LAYOUTS[state.layout].panels.length;
  const next = [];
  for (let i = 0; i < count; i++) {
    next.push(state.slots[i] ?? blankSlot(state.photos.length > 0 ? 0 : -1));
  }
  state.slots = next;
  state.selectedPanel = Math.min(state.selectedPanel, count - 1);
}

function currentSize() {
  return EXPORT_SIZES[state.exportSize];
}

function redraw() {
  const size = currentSize();
  renderCover(canvas, state, size.width, size.height, grainTile);
  refreshPanelControls();
  refreshTraySelection();
}

function setStatus(text) {
  statusLine.textContent = text;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

async function addPhoto(image, name) {
  state.photos.push(image);
  state.photoNames.push(name);
  const index = state.photos.length - 1;
  if (state.slots.every((slot) => slot.photo < 0)) {
    state.slots = state.slots.map(() => blankSlot(index));
  }
  buildPhotoTray();
  redraw();
  setStatus(`Photo ${index + 1} loaded — ${filledPanelCount(state)} of ${state.slots.length} panels filled.`);
}

async function loadSample(sample) {
  try {
    const image = await loadImage(`samples/${sample.file}`);
    await addPhoto(image, sample.name);
  } catch {
    setStatus(`Could not load the ${sample.name} sample photo.`);
  }
}

function buildPhotoTray() {
  const tray = document.getElementById('photoTray');
  tray.innerHTML = '';
  state.photos.forEach((photo, index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'tray-thumb';
    thumb.title = `Assign ${state.photoNames[index]} to the selected panel`;
    thumb.setAttribute('aria-label', `Assign photo ${index + 1} to the selected panel`);
    const preview = document.createElement('canvas');
    preview.width = 96;
    preview.height = 96;
    const pctx = preview.getContext('2d');
    const scale = Math.max(96 / photo.naturalWidth, 96 / photo.naturalHeight);
    pctx.drawImage(
      photo,
      (96 - photo.naturalWidth * scale) / 2,
      (96 - photo.naturalHeight * scale) / 2,
      photo.naturalWidth * scale,
      photo.naturalHeight * scale,
    );
    thumb.appendChild(preview);
    const tag = document.createElement('span');
    tag.textContent = state.photoNames[index];
    thumb.appendChild(tag);
    thumb.addEventListener('click', () => {
      state.slots[state.selectedPanel].photo = index;
      redraw();
      setStatus(`Panel ${state.selectedPanel + 1} now shows ${state.photoNames[index]}.`);
    });
    tray.appendChild(thumb);
  });
  if (state.photos.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'tray-hint';
    hint.textContent = 'No photos yet — upload some, or load a sample below.';
    tray.appendChild(hint);
  }
}

function refreshTraySelection() {
  document.querySelectorAll('#photoTray .tray-thumb').forEach((thumb, index) => {
    const used = state.slots.some((slot) => slot.photo === index);
    thumb.classList.toggle('in-use', used);
  });
}

function refreshPanelControls() {
  const slot = state.slots[state.selectedPanel];
  document.getElementById('panelLabel').textContent = `Panel ${state.selectedPanel + 1} of ${state.slots.length}`;
  document.getElementById('zoomSlider').value = slot ? slot.zoom : 1;
  document.getElementById('zoomValue').textContent = `${Math.round((slot ? slot.zoom : 1) * 100)}%`;
  document.getElementById('flipButton').textContent = slot && slot.flip ? 'Unflip photo' : 'Flip photo';
  document.querySelectorAll('#layoutPicker button').forEach((button) => {
    button.classList.toggle('active', button.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradePicker button').forEach((button) => {
    button.classList.toggle('active', button.dataset.grade === state.grade);
  });
  document.querySelectorAll('#sizePicker button').forEach((button, index) => {
    button.classList.toggle('active', index === state.exportSize);
  });
}

function buildPickers() {
  const layoutPicker = document.getElementById('layoutPicker');
  for (const name of layoutNames()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.layout = name;
    button.textContent = PANEL_LAYOUTS[name].label;
    button.addEventListener('click', () => {
      state.layout = name;
      syncSlots();
      redraw();
      setStatus(`${PANEL_LAYOUTS[name].label} layout — click a panel, then a photo, to fill it.`);
    });
    layoutPicker.appendChild(button);
  }
  const gradePicker = document.getElementById('gradePicker');
  for (const name of gradeNames()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.grade = name;
    button.textContent = GRADE_PRESETS[name].label;
    button.addEventListener('click', () => {
      state.grade = name;
      redraw();
      setStatus(`${GRADE_PRESETS[name].label} grade applied.`);
    });
    gradePicker.appendChild(button);
  }
  const sizePicker = document.getElementById('sizePicker');
  EXPORT_SIZES.forEach((size, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = size.label;
    button.addEventListener('click', () => {
      state.exportSize = index;
      redraw();
      setStatus(`Previewing ${size.label}.`);
    });
    sizePicker.appendChild(button);
  });
  const sampleRow = document.getElementById('sampleRow');
  for (const sample of SAMPLE_PHOTOS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Load ${sample.name} sample`;
    button.addEventListener('click', () => loadSample(sample));
    sampleRow.appendChild(button);
  }
}

function wireInputs() {
  document.getElementById('photoInput').addEventListener('change', async (event) => {
    for (const file of event.target.files) {
      try {
        await addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
      } catch {
        setStatus(`Could not read ${file.name} as a photo.`);
      }
    }
    event.target.value = '';
  });
  document.getElementById('titleInput').addEventListener('input', (event) => {
    state.title = event.target.value;
    redraw();
  });
  document.getElementById('sublineInput').addEventListener('input', (event) => {
    state.subline = event.target.value;
    redraw();
  });
  document.getElementById('titleStyle').addEventListener('change', (event) => {
    state.titleStyle = event.target.value;
    redraw();
  });
  document.getElementById('zoomSlider').addEventListener('input', (event) => {
    state.slots[state.selectedPanel].zoom = Number(event.target.value);
    redraw();
  });
  document.getElementById('flipButton').addEventListener('click', () => {
    const slot = state.slots[state.selectedPanel];
    slot.flip = !slot.flip;
    redraw();
  });
  document.getElementById('fillAllButton').addEventListener('click', () => {
    const slot = state.slots[state.selectedPanel];
    if (slot.photo < 0) {
      setStatus('Pick a photo for the selected panel first.');
      return;
    }
    state.slots = state.slots.map((entry) => ({ ...entry, photo: slot.photo }));
    redraw();
    setStatus(`Every panel now shows ${state.photoNames[slot.photo]}.`);
  });
  document.getElementById('resetPanButton').addEventListener('click', () => {
    const slot = state.slots[state.selectedPanel];
    slot.zoom = 1;
    slot.offsetX = 0;
    slot.offsetY = 0;
    slot.flip = false;
    redraw();
  });
  document.getElementById('exportButton').addEventListener('click', () => {
    exportCover(currentSize());
  });
  document.getElementById('exportAllButton').addEventListener('click', async () => {
    for (const size of EXPORT_SIZES) {
      exportCover(size);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  });
  wireCanvasPointer();
}

/** Click a panel to select it; drag inside it to pan its photo. */
function wireCanvasPointer() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const gutter = Math.max(6, Math.round(Math.min(canvas.width, canvas.height) * 0.012));
    const polygons = layoutPolygons(state.layout, canvas.width, canvas.height, gutter);
    const hit = polygons.findIndex((points) => pointInPolygon(x, y, points));
    if (hit >= 0) {
      state.selectedPanel = hit;
      dragging = true;
      lastX = x;
      lastY = y;
      canvas.setPointerCapture(event.pointerId);
      redraw();
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const slot = state.slots[state.selectedPanel];
    const polygons = layoutPolygons(
      state.layout,
      canvas.width,
      canvas.height,
      Math.max(6, Math.round(Math.min(canvas.width, canvas.height) * 0.012)),
    );
    const [, , pw, ph] = polygonBounds(polygons[state.selectedPanel]);
    slot.offsetX += (x - lastX) / pw;
    slot.offsetY += (y - lastY) / ph;
    slot.offsetX = Math.max(-0.6, Math.min(0.6, slot.offsetX));
    slot.offsetY = Math.max(-0.6, Math.min(0.6, slot.offsetY));
    lastX = x;
    lastY = y;
    redraw();
  });
  const stopDrag = () => {
    dragging = false;
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
}

/** Renders the cover at an exact post size and downloads it as a PNG. */
export function exportCover(size) {
  const offscreen = document.createElement('canvas');
  renderCover(offscreen, state, size.width, size.height, grainTile);
  offscreen.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — the browser could not make the PNG.');
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vice-cover-${size.width}x${size.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    setStatus(`Saved vice-cover-${size.width}x${size.height}.png — ${filledPanelCount(state)} panels filled.`);
  }, 'image/png');
}

resetSlots();
buildPickers();
wireInputs();
buildPhotoTray();
redraw();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    state,
    loadSample,
    redraw,
    exportCover,
    loadImage,
    addPhoto,
    syncSlots,
  });
}
