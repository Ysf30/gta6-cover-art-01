/* Vice Cover Studio — offline multi-panel cover maker.
   Everything is drawn on one canvas: panels, lettering, grade, grain.
   No network at runtime; the only images are the user's uploads and the
   two bundled samples. */
'use strict';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const statusEl = $('status');
const stripEl = $('strip');
const panelLabel = $('panel-label');
const zoomEl = $('zoom');
const zoomVal = $('zoom-val');

const LAYOUTS = {
  poster: {
    label: '3-panel poster',
    rects: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ],
  },
  collage: {
    label: '5-panel collage',
    rects: [
      { x: 0, y: 0, w: 0.55, h: 1 },
      { x: 0.55, y: 0, w: 0.225, h: 0.5 },
      { x: 0.775, y: 0, w: 0.225, h: 0.5 },
      { x: 0.55, y: 0.5, w: 0.225, h: 0.5 },
      { x: 0.775, y: 0.5, w: 0.225, h: 0.5 },
    ],
  },
  solo: {
    label: '1-panel solo',
    rects: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
};

const GRADES = {
  sunset: { label: 'Vice Sunset', filter: 'saturate(1.15) contrast(1.06)' },
  neon: { label: 'Neon Nights', filter: 'saturate(1.5) contrast(1.1) hue-rotate(-8deg)' },
  heat: { label: 'Leonida Heat', filter: 'saturate(1.3) contrast(1.12) sepia(0.28)' },
};

const state = {
  layout: 'poster',
  grade: 'sunset',
  title: 'LEONIDA NIGHTS',
  subline: 'SUNSET, NEON AND SALT AIR',
  gradientTitle: true,
  photos: [], // {id, name, img}
  slots: {}, // "layout:index" -> {photo, zoom, ox, oy, flip}
  selected: 0,
  activePhoto: null,
  shot: null,
};

let photoSeq = 0;

function slotKey(layout, i) { return layout + ':' + i; }

function slot(i) {
  const key = slotKey(state.layout, i);
  if (!state.slots[key]) state.slots[key] = { photo: null, zoom: 1, ox: 0, oy: 0, flip: false };
  return state.slots[key];
}

function photoById(id) { return state.photos.find((p) => p.id === id) || null; }

/* ---------- procedural grain tile (offscreen, made once) ---------- */
const grainTile = (() => {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 160;
  const g = c.getContext('2d');
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
})();

/* ---------- cover painting ---------- */
function drawPhotoInto(c, px, py, pw, ph, photo, s) {
  const iw = photo.img.naturalWidth, ih = photo.img.naturalHeight;
  const portrait = ih > iw * 1.15;
  // Face-biased framing: a tall portrait in a wide panel reads from near
  // the top of the photo, not from its middle.
  const focusY = portrait && pw > ph ? 0.30 : 0.5;
  const focusX = 0.5 + s.ox * 0.4;
  const base = Math.max(pw / iw, ph / ih) * s.zoom;
  const dw = iw * base, dh = ih * base;
  let dx = px + pw / 2 - dw * focusX + s.ox * pw * 0.25;
  let dy = py + ph / 2 - dh * focusY + s.oy * ph * 0.25;
  // Clamp so the panel never shows empty space at the edges.
  dx = Math.min(px, Math.max(px + pw - dw, dx));
  dy = Math.min(py, Math.max(py + ph - dh, dy));
  c.save();
  if (s.flip) { c.translate(px + pw / 2, 0); c.scale(-1, 1); c.translate(-(px + pw / 2), 0); }
  c.drawImage(photo.img, dx, dy, dw, dh);
  c.restore();
}

function panelPath(c, x, y, w, h, slant, leftSlant, rightSlant) {
  c.beginPath();
  c.moveTo(x + (leftSlant ? slant : 0), y);
  c.lineTo(x + w, y);
  c.lineTo(x + w - (rightSlant ? slant : 0), y + h);
  c.lineTo(x, y + h);
  c.closePath();
}

function drawCover(c, W, H) {
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#f3ecdb';
  c.fillRect(0, 0, W, H);
  const rects = LAYOUTS[state.layout].rects;
  const gutter = Math.max(4, Math.round(W * 0.006));
  const slant = Math.round(W * 0.01);
  c.filter = GRADES[state.grade].filter;

  rects.forEach((r, i) => {
    const x = r.x * W, y = r.y * H, w = r.w * W, h = r.h * H;
    const ix = x + gutter / 2, iy = y + gutter / 2, iw = w - gutter, ih = h - gutter;
    const leftSlant = r.x > 0, rightSlant = r.x + r.w < 1;
    c.save();
    panelPath(c, ix, iy, iw, ih, slant, leftSlant, rightSlant);
    c.clip();
    const s = slot(i);
    const photo = s.photo ? photoById(s.photo) : null;
    if (photo) {
      drawPhotoInto(c, ix, iy, iw, ih, photo, s);
    } else {
      const g = c.createLinearGradient(ix, iy, ix + iw, iy + ih);
      g.addColorStop(0, '#3a2b3d'); g.addColorStop(1, '#191423');
      c.fillStyle = g; c.fillRect(ix, iy, iw, ih);
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.font = `700 ${Math.max(13, Math.round(W * 0.016))}px "Arial Narrow", Arial, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('PANEL ' + (i + 1) + ' — DROP A PHOTO', ix + iw / 2, iy + ih / 2);
    }
    c.restore();
    if (i === state.selected && !state.shot) {
      c.save();
      panelPath(c, ix, iy, iw, ih, slant, leftSlant, rightSlant);
      c.strokeStyle = '#ffd166'; c.lineWidth = Math.max(3, W * 0.004);
      c.stroke(); c.restore();
    }
  });
  c.filter = 'none';

  drawLettering(c, W, H);
  drawGrade(c, W, H);
}

function drawLettering(c, W, H) {
  const title = (state.title || '').toUpperCase();
  const sub = (state.subline || '').toUpperCase();
  if (!title && !sub) return;
  const padX = W * 0.045, baseY = H * 0.83;
  c.save();
  c.translate(padX, baseY);
  c.rotate(-0.035);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  if (title) {
    const size = Math.round(W * 0.082);
    c.font = `900 ${size}px "Arial Narrow", "Helvetica Neue", Impact, sans-serif`;
    try { c.letterSpacing = '1px'; } catch (e) { /* older canvas: ignore */ }
    c.lineJoin = 'round';
    // Offset drop shadow, drawn first as a solid dark copy.
    c.fillStyle = 'rgba(20,8,16,0.85)';
    c.fillText(title, size * 0.06, size * 0.07);
    // Thick dark outline.
    c.strokeStyle = '#160a12';
    c.lineWidth = Math.max(4, size * 0.11);
    c.strokeText(title, 0, 0);
    // White fill, or a warm gradient fill.
    if (state.gradientTitle) {
      const g = c.createLinearGradient(0, -size, 0, size * 0.25);
      g.addColorStop(0, '#fff7e8'); g.addColorStop(0.55, '#ffffff'); g.addColorStop(1, '#ffb35c');
      c.fillStyle = g;
    } else {
      c.fillStyle = '#ffffff';
    }
    c.fillText(title, 0, 0);
  }
  if (sub) {
    const size = Math.round(W * 0.026);
    c.font = `700 ${size}px "Arial Narrow", Arial, sans-serif`;
    try { c.letterSpacing = '3px'; } catch (e) { /* ignore */ }
    c.fillStyle = 'rgba(20,8,16,0.85)';
    c.fillText(sub, size * 0.12, size * 1.75);
    c.fillStyle = '#ffe9b0';
    c.fillText(sub, 0, size * 1.6);
  }
  c.restore();
}

function drawGrade(c, W, H) {
  const g = state.grade;
  c.save();
  if (g === 'sunset') {
    const warm = c.createLinearGradient(0, 0, W, H);
    warm.addColorStop(0, 'rgba(255,122,24,0.30)');
    warm.addColorStop(0.6, 'rgba(255,46,136,0.16)');
    warm.addColorStop(1, 'rgba(120,20,90,0.22)');
    c.globalCompositeOperation = 'soft-light';
    c.fillStyle = warm; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(255,110,30,0.07)'; c.fillRect(0, 0, W, H);
  } else if (g === 'neon') {
    const cyan = c.createLinearGradient(0, 0, W, H);
    cyan.addColorStop(0, 'rgba(0,229,255,0.34)'); cyan.addColorStop(1, 'rgba(0,229,255,0.02)');
    const mag = c.createLinearGradient(W, H, 0, 0);
    mag.addColorStop(0, 'rgba(255,0,170,0.32)'); mag.addColorStop(1, 'rgba(255,0,170,0.02)');
    c.globalCompositeOperation = 'overlay';
    c.fillStyle = cyan; c.fillRect(0, 0, W, H);
    c.fillStyle = mag; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  } else { // heat
    const heat = c.createLinearGradient(0, 0, 0, H);
    heat.addColorStop(0, 'rgba(255,190,60,0.26)');
    heat.addColorStop(0.55, 'rgba(255,120,20,0.18)');
    heat.addColorStop(1, 'rgba(140,40,0,0.26)');
    c.globalCompositeOperation = 'soft-light';
    c.fillStyle = heat; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(255,140,40,0.08)'; c.fillRect(0, 0, W, H);
  }
  // Vignette.
  const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,4,10,0.42)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  // Subtle procedural film grain.
  const pat = c.createPattern(grainTile, 'repeat');
  c.globalAlpha = 0.055;
  c.globalCompositeOperation = 'overlay';
  c.fillStyle = pat; c.fillRect(0, 0, W, H);
  c.restore();
}

/* ---------- preview ---------- */
function render() {
  if (state.shot === 'cover') {
    canvas.width = Math.min(window.innerWidth, 1600);
    canvas.height = Math.round(canvas.width * 9 / 16);
  } else {
    canvas.width = 1200; canvas.height = 675;
  }
  drawCover(ctx, canvas.width, canvas.height);
  syncPanelControls();
}

function syncPanelControls() {
  const s = slot(state.selected);
  panelLabel.textContent = 'Panel ' + (state.selected + 1) + ' of ' + LAYOUTS[state.layout].rects.length +
    ' — ' + LAYOUTS[state.layout].label;
  zoomEl.value = String(s.zoom);
  zoomVal.textContent = s.zoom.toFixed(2) + '×';
  $('flip').textContent = s.flip ? 'Flipped ✓' : 'Flip';
}

/* ---------- photos ---------- */
function addPhoto(img, name) {
  const p = { id: ++photoSeq, name, img };
  state.photos.push(p);
  if (state.photos.length > 4) state.photos.shift();
  state.activePhoto = p.id;
  renderStrip();
  return p;
}

function loadSample(name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(addPhoto(img, name + '.jpg'));
    img.onerror = () => reject(new Error('sample ' + name + ' failed to load'));
    img.src = 'samples/' + name + '.jpg';
  });
}

function loadFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(addPhoto(img, file.name));
      img.onerror = () => reject(new Error('could not read ' + file.name));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('could not read ' + file.name));
    reader.readAsDataURL(file);
  });
}

function renderStrip() {
  stripEl.innerHTML = '';
  state.photos.forEach((p) => {
    const d = document.createElement('div');
    d.className = 'thumb' + (p.id === state.activePhoto ? ' active' : '');
    const im = document.createElement('img');
    im.src = p.img.src; im.alt = p.name;
    const cap = document.createElement('span');
    cap.textContent = p.name.length > 18 ? p.name.slice(0, 17) + '…' : p.name;
    const b1 = document.createElement('button');
    b1.textContent = 'Use in panel ' + (state.selected + 1);
    b1.addEventListener('click', () => {
      slot(state.selected).photo = p.id; state.activePhoto = p.id;
      setStatus('Photo assigned to panel ' + (state.selected + 1) + '.'); render();
    });
    const b2 = document.createElement('button');
    b2.textContent = 'Fill every panel';
    b2.addEventListener('click', () => {
      LAYOUTS[state.layout].rects.forEach((_, i) => { slot(i).photo = p.id; });
      state.activePhoto = p.id;
      setStatus('Every panel filled with ' + p.name + '.'); render();
    });
    d.append(im, cap, b1, b2);
    d.addEventListener('click', (e) => { if (e.target === d || e.target === im) { state.activePhoto = p.id; renderStrip(); } });
    stripEl.appendChild(d);
  });
  if (!state.photos.length) stripEl.innerHTML = '<p class="hint">No photos yet — upload up to 4, or load a sample.</p>';
}

function setStatus(msg) { statusEl.textContent = msg; }

/* ---------- export ---------- */
function renderExport(w, h) {
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  drawCover(off.getContext('2d'), w, h);
  return off;
}

function downloadCanvas(c, filename) {
  return new Promise((resolve, reject) => {
    c.toBlob((blob) => {
      if (!blob) return reject(new Error('PNG encode failed'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(blob.size);
    }, 'image/png');
  });
}

async function exportOne(w, h) {
  const c = renderExport(w, h);
  const name = 'vice-cover-' + w + 'x' + h + '.png';
  const bytes = await downloadCanvas(c, name);
  setStatus('Exported ' + name + ' (' + w + '×' + h + ', ' + Math.round(bytes / 1024) + ' KiB).');
  return { w, h, bytes };
}

async function exportAll() {
  const sizes = [[1080, 1080], [1080, 1350], [1920, 1080]];
  const done = [];
  for (const [w, h] of sizes) {
    done.push(await exportOne(w, h));
    await new Promise((r) => setTimeout(r, 350));
  }
  setStatus('Exported all three sizes: 1080×1080, 1080×1350, 1920×1080.');
  return done;
}

// Headless / test hook: export without a download click.
window.__exportPNG = (w, h) => new Promise((resolve, reject) => {
  renderExport(w, h).toBlob((b) => {
    if (!b) return reject(new Error('encode failed'));
    const r = new FileReader();
    r.onload = () => resolve({ w, h, bytes: b.size, dataUrl: String(r.result) });
    r.onerror = () => reject(new Error('read failed'));
    r.readAsDataURL(b);
  }, 'image/png');
});
window.__vice = { state, render, exportAll };

/* ---------- pointer: click selects, drag pans ---------- */
let drag = null;
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = (clientX - r.left) / r.width, y = (clientY - r.top) / r.height;
  const rects = LAYOUTS[state.layout].rects;
  for (let i = rects.length - 1; i >= 0; i--) {
    const p = rects[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return 0;
}
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  drag = { i, x: e.clientX, y: e.clientY, moved: false, ox: slot(i).ox, oy: slot(i).oy };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const dx = (e.clientX - drag.x) / r.width, dy = (e.clientY - drag.y) / r.height;
  if (Math.abs(dx) + Math.abs(dy) > 0.004) drag.moved = true;
  if (drag.moved) {
    const s = slot(drag.i);
    s.ox = Math.max(-0.6, Math.min(0.6, drag.ox + dx * 1.4));
    s.oy = Math.max(-0.6, Math.min(0.6, drag.oy + dy * 1.4));
    render();
  }
});
canvas.addEventListener('pointerup', () => {
  if (drag && !drag.moved) { state.selected = drag.i; render(); }
  drag = null;
});

/* ---------- controls ---------- */
document.querySelectorAll('[data-layout]').forEach((b) => {
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    state.selected = 0;
    document.querySelectorAll('[data-layout]').forEach((x) => x.classList.toggle('on', x === b));
    setStatus('Layout: ' + LAYOUTS[state.layout].label + '.');
    render();
  });
});
document.querySelectorAll('[data-grade]').forEach((b) => {
  b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('on', x === b));
    setStatus('Grade: ' + GRADES[state.grade].label + '.');
    render();
  });
});
$('title').addEventListener('input', (e) => { state.title = e.target.value; render(); });
$('subline').addEventListener('input', (e) => { state.subline = e.target.value; render(); });
$('grad-title').addEventListener('change', (e) => { state.gradientTitle = e.target.checked; render(); });
zoomEl.addEventListener('input', () => { slot(state.selected).zoom = Number(zoomEl.value); render(); });
$('flip').addEventListener('click', () => { const s = slot(state.selected); s.flip = !s.flip; render(); });
$('fill-all').addEventListener('click', () => {
  const p = photoById(state.activePhoto) || state.photos[0];
  if (!p) { setStatus('Load a sample or upload a photo first.'); return; }
  LAYOUTS[state.layout].rects.forEach((_, i) => { slot(i).photo = p.id; });
  setStatus('Every panel filled with ' + p.name + '.'); render();
});
$('upload').addEventListener('change', async (e) => {
  for (const f of e.target.files) {
    try { await loadFile(f); } catch (err) { setStatus(String(err.message)); }
  }
  render();
});
$('sample-pier').addEventListener('click', async () => {
  try { const p = await loadSample('pier'); LAYOUTS[state.layout].rects.forEach((_, i) => { if (!slot(i).photo) slot(i).photo = p.id; }); setStatus('Sample pier loaded.'); } catch (err) { setStatus(String(err.message)); }
  render();
});
$('sample-boulevard').addEventListener('click', async () => {
  try { const p = await loadSample('boulevard'); LAYOUTS[state.layout].rects.forEach((_, i) => { if (!slot(i).photo) slot(i).photo = p.id; }); setStatus('Sample boulevard loaded.'); } catch (err) { setStatus(String(err.message)); }
  render();
});
const drop = $('drop');
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', async (e) => {
  for (const f of e.dataTransfer.files) {
    if (!f.type.startsWith('image/')) continue;
    try { await loadFile(f); } catch (err) { setStatus(String(err.message)); }
  }
  render();
});
$('export-1080').addEventListener('click', () => exportOne(1080, 1080).catch((e) => setStatus(String(e.message))));
$('export-1350').addEventListener('click', () => exportOne(1080, 1350).catch((e) => setStatus(String(e.message))));
$('export-1920').addEventListener('click', () => exportOne(1920, 1080).catch((e) => setStatus(String(e.message))));
$('export-all').addEventListener('click', () => exportAll().catch((e) => setStatus(String(e.message))));

/* ---------- boot / shot scenes ---------- */
async function boot() {
  const q = new URLSearchParams(location.search);
  state.shot = q.get('shot');
  const caption = q.get('caption');
  if (caption) { state.title = caption; $('title').value = caption; }
  const photo = q.get('photo');
  if (state.shot === 'cover') {
    document.body.classList.add('shot-cover');
    try { const p = await loadSample(photo === 'boulevard' ? 'boulevard' : 'pier'); LAYOUTS[state.layout].rects.forEach((_, i) => { slot(i).photo = p.id; }); } catch (e) { /* empty cover still paints */ }
    render();
  } else if (state.shot === 'editor') {
    try { const p = await loadSample(photo === 'boulevard' ? 'boulevard' : 'pier'); LAYOUTS[state.layout].rects.forEach((_, i) => { slot(i).photo = p.id; }); } catch (e) { /* editor still paints */ }
    render();
  } else {
    render();
  }
  requestAnimationFrame(() => setTimeout(() => { window.__shotReady = true; }, 120));
}
boot();
