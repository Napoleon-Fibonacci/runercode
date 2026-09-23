'use strict';

// ===== HTML Runer — pure utils (tanpa DOM, bisa dites via node) =====

// Cegah isi CSS/JS menutup tag <style>/<script> lebih awal.
function escapeForTag(code, tagName) {
  const re = new RegExp('</' + tagName, 'gi');
  return code.replace(re, (m) => '<\\/' + m.slice(2));
}

// Script kecil yang diinjeksi ke iframe untuk meneruskan console.log/error
// dari kode user ke panel Console lewat postMessage.
const CONSOLE_HOOK = `<script>(function () {
  function fmt(a) {
    try {
      if (a instanceof Error) return a.stack || String(a);
      if (typeof a === 'object' && a !== null) {
        return JSON.stringify(a, function (k, v) {
          return typeof v === 'function' ? '[Function]' : v;
        }, 1);
      }
      return String(a);
    } catch (e) { return String(a); }
  }
  function send(level, args) {
    try {
      parent.postMessage({
        source: 'html-runer-console',
        level: level,
        args: Array.prototype.map.call(args, fmt)
      }, '*');
    } catch (e) {}
  }
  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (m) {
    var orig = console[m];
    console[m] = function () { send(m, arguments); if (orig) orig.apply(console, arguments); };
  });
  window.addEventListener('error', function (e) {
    send('error', [e.message + ' (' + (e.filename || 'inline') + ':' + e.lineno + ':' + e.colno + ')']);
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    send('error', ['Unhandled promise rejection: ' + ((r && (r.stack || r.message)) || r)]);
  });
})();<\/script>`;

// Gabungkan {html, css, js} jadi satu dokumen HTML.
// withHook=true: sisipkan console hook (untuk preview iframe).
// withHook=false: dokumen bersih (untuk download / mode gabung).
// Jika hanya html terisi: kembalikan html apa adanya (trim).
function buildDocument(state, withHook) {
  let doc = (state.html || '').trim();
  const headBits = [];
  if (withHook !== false) headBits.push(CONSOLE_HOOK);
  if (state.css && state.css.trim()) {
    headBits.push('<style>\n' + escapeForTag(state.css, 'style') + '\n</style>');
  }
  const bodyBits = [];
  if (state.js && state.js.trim()) {
    bodyBits.push('<script>\n' + escapeForTag(state.js, 'script') + '\n</' + 'script>');
  }
  const head = headBits.join('\n');
  if (head) {
    if (/<\/head\s*>/i.test(doc)) {
      doc = doc.replace(/<\/head\s*>/i, (m) => head + '\n' + m);
    } else if (/<head[^>]*>/i.test(doc)) {
      doc = doc.replace(/<head[^>]*>/i, (m) => m + '\n' + head);
    } else {
      doc = head + '\n' + doc;
    }
  }
  if (bodyBits.length) {
    const body = bodyBits.join('\n');
    if (/<\/body\s*>/i.test(doc)) {
      doc = doc.replace(/<\/body\s*>/i, (m) => body + '\n' + m);
    } else {
      doc = doc + '\n' + body;
    }
  }
  return doc;
}

// Mode terpisah → gabung: bungkus css/js ke dokumen tunggal (tanpa hook).
function mergeIntoSingleDoc(state) {
  return buildDocument(state, false);
}

// Mode gabung → terpisah: ekstrak blok <style> dan <script> inline (tanpa src)
// dari dokumen HTML. Kembalikan {html, css, js} atau null jika blok sejenis
// lebih dari satu (ambigu, jangan pecah).
function extractInlineBlocks(html) {
  const src = html || '';
  const removals = [];
  let css = '';
  let js = '';

  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m = styleRe.exec(src);
  if (m) {
    css = m[1].trim();
    removals.push({ start: m.index, end: m.index + m[0].length });
  }
  if (styleRe.exec(src) !== null) return null; // >1 blok style

  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let first = true;
  while ((m = scriptRe.exec(src)) !== null) {
    if (/\bsrc\s*=/i.test(m[1] || '')) continue; // script external: biarkan
    if (!first) return null; // >1 script inline
    js = m[2].trim();
    removals.push({ start: m.index, end: m.index + m[0].length });
    first = false;
  }

  let doc = src;
  removals.sort((a, b) => b.start - a.start);
  for (const r of removals) {
    doc = doc.slice(0, r.start) + doc.slice(r.end);
  }
  return { html: doc.trim(), css: css, js: js };
}

// Base64 UTF-8-safe (URL-safe) untuk share link.
function encodeState(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeState(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeForTag: escapeForTag,
    buildDocument: buildDocument,
    mergeIntoSingleDoc: mergeIntoSingleDoc,
    extractInlineBlocks: extractInlineBlocks,
    encodeState: encodeState,
    decodeState: decodeState,
    CONSOLE_HOOK: CONSOLE_HOOK
  };
}
