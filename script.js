'use strict';

// ===== Referensi elemen =====
const $id = (id) => document.getElementById(id);
const els = {
  single: $id('editor-single'),
  html: $id('editor-html'),
  css: $id('editor-css'),
  js: $id('editor-js'),
  paneSingle: $id('pane-single'),
  paneMulti: $id('pane-multi'),
  segGabung: $id('mode-gabung'),
  segTerpisah: $id('mode-terpisah'),
  run: $id('btn-run'),
  upload: $id('file-input'),
  share: $id('btn-share'),
  download: $id('btn-download'),
  reset: $id('btn-reset'),
  theme: $id('btn-theme'),
  toast: $id('toast'),
};

const STORAGE_KEY = '***';
const MODE_KEY = '***';
const THEME_KEY = '***';

// Kode contoh bawaan — user bisa langsung klik Run saat pertama buka.
const DEFAULT_COMBINED = [
  '<!DOCTYPE html>',
  '<html>',
  '<head>',
  '  <style>',
  '    body {',
  '      margin: 0;',
  '      min-height: 100vh;',
  '      display: grid;',
  '      place-items: center;',
  '      font-family: system-ui, sans-serif;',
  '      background: #f0f3f8;',
  '    }',
  '    .kartu {',
  '      text-align: center;',
  '      padding: 32px 40px;',
  '      border-radius: 12px;',
  '      background: #fbfdff;',
  '      border: 1px solid rgba(14, 28, 46, 0.15);',
  '      box-shadow: 0 10px 30px rgba(14, 28, 46, 0.08);',
  '    }',
  '    h1 { color: #1a56b0; }',
  '    button {',
  '      padding: 10px 20px;',
  '      border: 0;',
  '      border-radius: 8px;',
  '      background: #1a56b0;',
  '      color: #fff;',
  '      font-size: 15px;',
  '      cursor: pointer;',
  '    }',
  '  </style>',
  '</head>',
  '<body>',
  '  <div class="kartu">',
  '    <h1>Halo, HTML Runer! 👋</h1>',
  '    <p>Edit kode di editor, lalu klik <strong>Run ▸ Tab Baru</strong>.</p>',
  '    <button id="tombol">Klik aku</button>',
  '  </div>',
  '  <script>',
  '    const tombol = document.getElementById("tombol");',
  '    let jumlah = 0;',
  '    tombol.addEventListener("click", () => {',
  '      jumlah++;',
  '      tombol.textContent = "Diklik " + jumlah + "x";',
  '      console.log("Klik ke-", jumlah);',
  '    });',
  '    console.log("Script siap!");',
  '  <\/script>',
  '</body>',
  '</html>'
].join('\n');

const DEFAULT_SEPARATED = {
  html: [
    '<div class="kartu">',
    '  <h1>Halo, HTML Runer! 👋</h1>',
    '  <p>Edit kode di editor, lalu klik <strong>Run ▸ Tab Baru</strong>.</p>',
    '  <button id="tombol">Klik aku</button>',
    '</div>'
  ].join('\n'),
  css: [
    'body {',
    '  margin: 0;',
    '  min-height: 100vh;',
    '  display: grid;',
    '  place-items: center;',
    '  font-family: system-ui, sans-serif;',
    '  background: #f0f3f8;',
    '}',
    '.kartu {',
    '  text-align: center;',
    '  padding: 32px 40px;',
    '  border-radius: 12px;',
    '  background: #fbfdff;',
    '  border: 1px solid rgba(14, 28, 46, 0.15);',
    '}',
    'h1 { color: #1a56b0; }',
    'button {',
    '  padding: 10px 20px;',
    '  border: 0;',
    '  border-radius: 8px;',
    '  background: #1a56b0;',
    '  color: #fff;',
    '  font-size: 15px;',
    '  cursor: pointer;',
    '}'
  ].join('\n'),
  js: [
    'const tombol = document.getElementById("tombol");',
    'let jumlah = 0;',
    'tombol.addEventListener("click", () => {',
    '  jumlah++;',
    '  tombol.textContent = "Diklik " + jumlah + "x";',
    '  console.log("Klik ke-", jumlah);',
    '});',
    'console.log("Script siap!");'
  ].join('\n')
};

// ===== State =====
let mode = 'gabung'; // 'gabung' | 'terpisah'

function getState() {
  if (mode === 'gabung') {
    return { html: els.single.value, css: '', js: '' };
  }
  return { html: els.html.value, css: els.css.value, js: els.js.value };
}

function setState(s) {
  els.single.value = s.html || '';
  els.html.value = s.html || '';
  els.css.value = s.css || '';
  els.js.value = s.js || '';
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getState()));
  } catch (e) { /* penyimpanan penuh / diblokir: abaikan */ }
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 600);
}

// ===== Mode =====
function applyMode(next, opts) {
  opts = opts || {};
  mode = next;
  const gabung = mode === 'gabung';
  els.paneSingle.hidden = !gabung;
  els.paneMulti.hidden = gabung;
  els.segGabung.classList.toggle('active', gabung);
  els.segTerpisah.classList.toggle('active', !gabung);
  els.segGabung.setAttribute('aria-selected', String(gabung));
  els.segTerpisah.setAttribute('aria-selected', String(!gabung));
  if (!opts.noFade) {
    const shown = gabung ? els.paneSingle : els.paneMulti;
    shown.classList.remove('pane-fade');
    void shown.offsetWidth; // restart animasi
    shown.classList.add('pane-fade');
  }
  try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
  if (!opts.silent) saveState();
}

function toSeparate() {
  if (mode === 'terpisah') return;
  const doc = els.single.value;
  const ex = extractInlineBlocks(doc);
  if (ex) {
    setState(ex);
    if (ex.css || ex.js) {
      toast('Blok style/script dipindah ke panel CSS/JS.');
    }
  } else {
    // Dokumen ambigu (>1 blok): HTML tetap utuh, css/js kosong.
    setState({ html: doc, css: '', js: '' });
    toast('Dokumen punya beberapa blok — tetap utuh di panel HTML.');
  }
  applyMode('terpisah');
}

function toCombined() {
  if (mode === 'gabung') return;
  const merged = mergeIntoSingleDoc(getState());
  setState({ html: merged, css: '', js: '' });
  applyMode('gabung');
  toast('Kode digabung ke satu panel.');
}

// ===== Util UI =====
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.add('hidden'), 2400);
}

// ===== Aksi utama =====

// Run: buka hasil di TAB BARU via blob URL (tanpa split preview).
function runInNewTab() {
  const doc = buildDocument(getState(), false);
  const blob = new Blob([doc], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    // Revoke nanti; blob sudah dikonsumsi tab baru saat load.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    toast('Popup diblokir browser. Izinkan popup untuk halaman ini.');
    URL.revokeObjectURL(url);
  }
}

function copyShareLink() {
  const base = location.href.replace(location.search, '').replace(location.hash, '');
  const url = base + '?code=' + encodeState(getState());
  const fallbackCopy = () => {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    toast(ok ? 'Link disalin!' : 'Gagal menyalin link.');
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => toast('Link disalin!'), fallbackCopy);
  } else {
    fallbackCopy();
  }
}

function downloadHtml() {
  const blob = new Blob([buildDocument(getState(), false)], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'runer.html';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('File diunduh sebagai runer.html');
}

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  els.theme.textContent = t === 'light' ? '🌙' : '☀️';
  try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
}

function initFromUrlOrStorage() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (code) {
    try {
      const s = decodeState(code);
      setState(s);
      applyMode(s.css || s.js ? 'terpisah' : 'gabung', { silent: true, noFade: true });
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* file:// */ }
      toast('Kode dimuat dari share link!');
      return;
    } catch (e) {
      toast('Share link tidak valid.');
    }
  }
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  if (saved) {
    try {
      const s = JSON.parse(saved);
      setState(s);
      let m = null;
      try { m = localStorage.getItem(MODE_KEY); } catch (e) {}
      if (m === 'gabung' || m === 'terpisah') {
        applyMode(m, { silent: true, noFade: true });
      } else {
        applyMode(s.css || s.js ? 'terpisah' : 'gabung', { silent: true, noFade: true });
      }
      return;
    } catch (e) { /* data rusak: pakai default */ }
  }
  // User baru: default gabung dengan contoh.
  setState({ html: DEFAULT_COMBINED, css: '', js: '' });
  applyMode('gabung', { silent: true, noFade: true });
}

// ===== Event =====
els.run.addEventListener('click', runInNewTab);
els.share.addEventListener('click', copyShareLink);
els.download.addEventListener('click', downloadHtml);

els.segGabung.addEventListener('click', toCombined);
els.segTerpisah.addEventListener('click', toSeparate);

els.reset.addEventListener('click', () => {
  if (confirm('Kembalikan editor ke kode contoh? Isi sekarang akan hilang.')) {
    if (mode === 'gabung') {
      setState({ html: DEFAULT_COMBINED, css: '', js: '' });
    } else {
      setState(DEFAULT_SEPARATED);
    }
    saveState();
  }
});

els.upload.addEventListener('change', () => {
  const file = els.upload.files && els.upload.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result);
    if (mode === 'gabung') {
      els.single.value = text;
    } else {
      els.html.value = text;
    }
    toast('File dimuat. Klik Run untuk membuka hasil di tab baru.');
    scheduleSave();
  };
  reader.readAsText(file);
  els.upload.value = '';
});

els.theme.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(next);
});

window.addEventListener('beforeunload', saveState);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runInNewTab();
  }
});

// Tab = 2 spasi di editor.
[els.single, els.html, els.css, els.js].forEach((ta) => {
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const s = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = s + 2;
    }
  });
  ta.addEventListener('input', scheduleSave);
});

// ===== Init =====
let savedTheme = 'light';
try { savedTheme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
applyTheme(savedTheme);
initFromUrlOrStorage();

// Overlay intro: fallback CSS sudah menyembunyikannya; hapus dari DOM biar bersih.
setTimeout(() => {
  const intro = document.getElementById('intro');
  if (intro) intro.remove();
}, 2600);
