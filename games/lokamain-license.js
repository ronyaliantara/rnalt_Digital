/* rnalt_Digital: kompatibilitas browser lama (IFP / Smart TV) — roundRect & aspect-ratio. Aktif hanya bila browser belum mendukung. */
(function lokamainCompat() {
  try {
    var rr = function (x, y, w, h, r) { var q = Array.isArray(r) ? (+r[0] || 0) : (+r || 0); q = Math.max(0, Math.min(q, Math.abs(w) / 2, Math.abs(h) / 2)); this.moveTo(x + q, y); this.arcTo(x + w, y, x + w, y + h, q); this.arcTo(x + w, y + h, x, y + h, q); this.arcTo(x, y + h, x, y, q); this.arcTo(x, y, x + w, y, q); this.closePath(); return this; };
    [window.CanvasRenderingContext2D, window.OffscreenCanvasRenderingContext2D, window.Path2D].forEach(function (C) { if (C && C.prototype && !C.prototype.roundRect) C.prototype.roundRect = rr; });
  } catch (e) { /* abaikan */ }
  var force = /[?&]compat=1/.test(location.search);
  var hasAR = !!(window.CSS && CSS.supports && CSS.supports('aspect-ratio', '1 / 1'));
  if (hasAR && !force) return;
  // [selector, rasio lebar/tinggi, 'w' = tinggi dari lebar | 'h' = lebar dari tinggi, media query opsional]
  var MAP = {
    'balap-roket': [['.joy', 1, 'w']],
    'benteng-nusantara': [['.mapwrap', 1200 / 860, 'w', '(max-width: 820px)']],
    'pendaki-nekat': [['.sun', 1, 'w']],
    'tarik-tambang': [['.pull .pl-beat', 1, 'w']],
    'panggung-kuis': [['.clock', 1, 'w']],
    'detektif-kelas': [['.photo', 120 / 140, 'w'], ['.bs .mug, .cc-clear .mini .mug, .ch-btn .mug, .dk-wrong .wr-face .mug, .nt-face .mug', 120 / 140, 'w']],
    'modul-tata-surya': [['.ss-stage', 1, 'w']],
    'saudagar-nusantara': [['.kc-rays', 1, 'w']],
    'pertempuran-laut': [['.rdr b', 1, 'w'], ['.sweep', 1, 'w']],
    'ekspedisi-kapal': [['.stage', 900 / 560, 'w'], ['.cambox', 4 / 3, 'w'], ['body.fs .cambox', 16 / 9, 'w']],
    'harta-karun': [['.palm', 40 / 48, 'h'], ['.compass', 1, 'h'], ['.sailship', 64 / 56, 'h'], ['.kraken-fx', 56 / 52, 'w']]
  };
  var m = location.pathname.match(/\/games\/([^\/]+)\//) || location.pathname.match(/\/([^\/]+)\/(?:index\.html)?$/);
  var rules = m && MAP[m[1]]; if (!rules) return;
  var queued = false;
  function apply() {
    queued = false;
    rules.forEach(function (r) {
      var on = !r[3] || window.matchMedia(r[3]).matches;
      Array.prototype.forEach.call(document.querySelectorAll(r[0]), function (el) {
        if (!on) { if (el.dataset.lmAr) { el.style.height = ''; el.style.width = ''; delete el.dataset.lmAr; } return; }
        el.dataset.lmAr = '1';
        if (r[2] === 'w') { el.style.height = ''; var w = el.getBoundingClientRect().width; if (w > 0) el.style.height = (w / r[1]).toFixed(2) + 'px'; }
        else { el.style.width = ''; var h = el.getBoundingClientRect().height; if (h > 0) el.style.width = (h * r[1]).toFixed(2) + 'px'; }
      });
    });
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(apply); } }
  window.addEventListener('resize', queue); window.addEventListener('load', queue);
  document.addEventListener('DOMContentLoaded', queue); queue();
  try { new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); } catch (e) { /* abaikan */ }
  setInterval(queue, 1500);
  window.__lokamainCompat = { aspectRatio: true, rules: rules.length };
})();
/* rnalt_Digital: Sinkron soal per link lisensi (Google Sheets).
   - Game TIDAK menunggu cloud: soal di perangkat / soal bawaan langsung dipakai.
   - Cloud dicek di latar belakang; bila ada soal lebih baru, soal diperbarui otomatis.
   - Soal yang diubah guru disimpan di perangkat dulu, lalu dikirim ke cloud (dicoba ulang bila gagal). */
(function lokamainSinkronSoal() {
  var URL_CLOUD = 'https://script.google.com/macros/s/AKfycbwXIE8HIoUHpw7rs-aTlNgEavzsyHtyhaxWlsyOAaQNDZKPswDnPC-bmeo0DvLbycMQ/exec';
  var LS; try { LS = window.localStorage; } catch (e) { return; }
  if (!LS || !window.fetch || !window.Storage) return;
  var m = location.pathname.match(/\/games\/([^\/]+)\//) || location.pathname.match(/\/([^\/]+)\/(?:index\.html)?$/);
  var slug = m ? m[1].toLowerCase() : '';
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return;
  var KHUSUS = { 'ular-tangga': 'ips_smp_questions_50_v3', 'ekspedisi-kapal': 'ips_ekspedisi_soal_v2' };
  var st = { status: 'mati', lisensi: '', kunci: '', terakhir: '' };
  window.__lokamainSync = st;
  var token = '', lic = '', tPush = null, tUlang = null, sedangKirim = false;
  var asliSet = Storage.prototype.setItem;

  function kunci() {
    if (KHUSUS[slug]) return KHUSUS[slug];
    var Q = window.QuizCore; var id = Q && Q.cfg && Q.cfg.gameId;
    return id ? 'lokamain_' + id + '_soal_v1' : '';
  }
  function baca(k) { try { return LS.getItem(k); } catch (e) { return null; } }
  function tulis(k, v) { try { asliSet.call(LS, k, v); } catch (e) { /* penuh / diblokir */ } }
  function meta(k, v) {
    var mk = 'lokamain_sync_' + k;
    if (v === undefined) { try { return JSON.parse(baca(mk)) || null; } catch (e) { return null; } }
    tulis(mk, JSON.stringify(v));
  }

  // Pantau penyimpanan soal oleh game (tanpa mengubah kode game)
  Storage.prototype.setItem = function (k, v) {
    asliSet.call(this, k, v);
    try { if (this === LS && token && k === st.kunci) diubah(); } catch (e) { /* abaikan */ }
  };

  function toast(teks, lama) {
    try {
      var el = document.getElementById('lokamain-sync-toast');
      if (!el) {
        el = document.createElement('div'); el.id = 'lokamain-sync-toast';
        el.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483000;max-width:92vw;background:rgba(15,23,42,.92);color:#fff;font:600 14px/1.4 system-ui,sans-serif;padding:10px 16px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.3);text-align:center;transition:opacity .3s;pointer-events:none';
        document.body.appendChild(el);
      }
      el.textContent = teks; el.style.opacity = '1';
      clearTimeout(el._t); el._t = setTimeout(function () { el.style.opacity = '0'; }, lama || 4000);
    } catch (e) { /* abaikan */ }
  }

  function minta(opsi, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 15000);
    return fetch(URL_CLOUD, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(opsi), signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.json(); }).then(function (j) { clearTimeout(t); return j; }, function (e) { clearTimeout(t); throw e; });
  }

  // Muat ulang soal di game yang sedang terbuka
  function segarkanGame() {
    try {
      var Q = window.QuizCore;
      if (slug === 'ular-tangga' && window.game && window.game.loadQuestions) { window.game.questions = window.game.loadQuestions(); return; }
      if (slug === 'ekspedisi-kapal') { /* eslint-disable-next-line no-undef */ if (typeof game !== 'undefined' && game && typeof loadQuestions === 'function') game.questions = loadQuestions(); return; }
      if (Q && Q.reloadQuestions) Q.reloadQuestions();
    } catch (e) { /* abaikan */ }
  }

  function diubah() {
    if (st.status === 'awal') return; // penulisan bawaan saat game baru dibuka, bukan ubahan guru
    var mt = meta(st.kunci) || {}; mt.kotor = true; mt.lic = lic; meta(st.kunci, mt);
    clearTimeout(tPush); tPush = setTimeout(kirim, 2500);
  }

  function kirim() {
    if (sedangKirim) { clearTimeout(tPush); tPush = setTimeout(kirim, 1500); return; }
    var k = st.kunci, data = baca(k), mt = meta(k) || {};
    if (!k || data == null || !mt.kotor) return;
    sedangKirim = true;
    minta({ aksi: 'simpan', token: token, game: slug, kunci: k, data: data, basisRev: mt.rev || 0, paksa: true }).then(function (j) {
      sedangKirim = false;
      if (j && j.ok) {
        var masihSama = baca(k) === data;
        meta(k, { rev: j.rev, lic: lic, kotor: !masihSama });
        st.status = 'tersinkron'; st.terakhir = 'simpan';
        if (masihSama) toast('☁️ Soal tersimpan di cloud — otomatis ikut di laptop / IFP lain'); else kirim();
      } else if (j && j.terlaluBesar) {
        st.status = 'lokal'; toast('📱 Bank soal terlalu besar untuk cloud. Soal tetap tersimpan di perangkat ini.', 6000);
      } else gagal();
    }, function () { sedangKirim = false; gagal(); });
  }

  function gagal() {
    st.status = 'lokal';
    toast('📱 Soal tersimpan di perangkat ini. Akan disinkronkan otomatis saat internet tersedia.', 5000);
    jadwalUlang();
  }
  function jadwalUlang() { clearTimeout(tUlang); tUlang = setTimeout(tarik, 30000); }

  // Ambil soal dari cloud lalu cocokkan dengan perangkat
  function tarik() {
    var k = st.kunci;
    return minta({ aksi: 'ambil', token: token, game: slug }, 12000).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'gagal');
      var awan = j.item && j.item[k], lokal = baca(k), mt = meta(k);
      if (mt && mt.kotor && lokal != null && mt.lic === lic) { st.status = 'tersinkron'; kirim(); return; }
      if (awan && awan.data != null) {
        if (mt && mt.lic === lic && mt.rev === awan.rev && lokal === awan.data) { st.status = 'tersinkron'; return; }
        if (lokal !== awan.data) {
          if (lokal != null) tulis('lokamain_sync_cadangan_' + k, lokal);
          tulis(k, awan.data); segarkanGame();
          toast('☁️ Soal terbaru dimuat dari cloud');
        }
        meta(k, { rev: awan.rev, lic: lic, kotor: false }); st.status = 'tersinkron'; st.terakhir = 'muat';
        return;
      }
      // belum ada di cloud: unggah soal perangkat ini bila memang milik lisensi ini (atau belum pernah disinkronkan)
      if (lokal != null && (!mt || mt.lic === lic)) { meta(k, { rev: 0, lic: lic, kotor: true }); st.status = 'tersinkron'; kirim(); return; }
      st.status = 'tersinkron';
    }).catch(function () {
      st.status = 'lokal'; jadwalUlang();
    });
  }

  // cloudToken = token link bertanda tangan ECDSA; cloud (Apps Script) memeriksa tanda tangan & nama game
  function mulai(licenseId, cloudToken) {
    token = String(cloudToken || '');
    lic = String(licenseId || '').toUpperCase().trim();
    if (!token || !lic) return;
    st.lisensi = lic; st.status = 'awal';
    var n = 0;
    (function tunggu() { // tunggu mesin game siap (nama kunci soal diketahui)
      st.kunci = kunci();
      if (!st.kunci) { if (++n < 40) return setTimeout(tunggu, 250); st.status = 'mati'; return; }
      tarik();
    })();
  }
  window.__lokamainSinkron = mulai;
  window.addEventListener('online', function () {
    if (!token || !st.kunci) return;
    var mt = meta(st.kunci);
    if (mt && mt.kotor) kirim(); else if (st.status === 'lokal') tarik();
  });
})();
/**
 * rnalt_Digital - Engine Pengaman Lisensi & Anti-Pembajakan Otomatis
 * Pasang di game apa pun dengan menambahkan 1 baris sebelum </body>:
 * <script src="../lokamain-license.js"></script>
 *
 * Link versi baru: token = base64url("KODE|Nama|nama-folder-game") + "." + tanda tangan ECDSA P-256.
 * - Tanda tangan dibuat dengan kunci PRIVAT yang hanya ada di laptop admin, jadi tidak bisa dipalsukan.
 * - Nama folder game ikut ditandatangani: link hanya membuka game yang dibeli.
 * Link versi lama (tanpa titik) sudah TIDAK diterima lagi (kuncinya dulu tertulis di kode publik).
 * Sinkron soal ke cloud memakai token baru yang sama; cloud memeriksa tanda tangannya sendiri.
 */
(function initLokaMainLicenseEngine() {
  'use strict';

  const WA_NUMBER = '6287881258019';
  const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
  const GAME_SLUG = (() => {
    const m = location.pathname.match(/\/games\/([^\/]+)\//) || location.pathname.match(/\/([^\/]+)\/(?:index\.html)?$/);
    return m ? decodeURIComponent(m[1]).toLowerCase() : '';
  })();

  function detectDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    if (/smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast|viera|webos|tizen|android tv/i.test(ua)) {
      return 'Smart TV';
    }
    if (/mobile|android|iphone|ipod/i.test(ua)) return 'Smartphone';
    if (/ipad|tablet/i.test(ua)) return 'Tablet';
    return 'Komputer / Laptop';
  }

  const LOKAMAIN_SECURITY = {
    computeHash(text) {
      let h1 = 5381, h2 = 2166136261;
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        h1 = ((h1 << 5) + h1) ^ code;
        h2 = (h2 ^ code) * 16777619;
      }
      return Math.abs(h1).toString(36) + Math.abs(h2).toString(36);
    }
  };

  // ---------------- Link versi baru (ECDSA) ----------------
  function b64urlToBytes(s) {
    let str = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  const PUBKEY_CACHE = 'lokamain_lisensi_publik_v1';
  function loadPublicJwk() {
    const cached = () => { try { return JSON.parse(localStorage.getItem(PUBKEY_CACHE)) || null; } catch (_) { return null; } };
    let url = '';
    try { url = new URL('lisensi-publik.json', SCRIPT_SRC || location.href.replace(/[^\/]*$/, '../')).href; } catch (_) { return Promise.resolve(cached()); }
    return fetch(url, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((jwk) => {
        if (jwk && jwk.x && jwk.y) {
          try { localStorage.setItem(PUBKEY_CACHE, JSON.stringify(jwk)); } catch (_) {}
          return jwk;
        }
        return cached();
      })
      .catch(() => cached());
  }

  // Hasil: { licenseId, buyerName, cloudToken } atau { error: 'pesan' }
  async function verifyNewToken(token) {
    const parts = String(token).trim().split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return { error: 'invalid' };
    let fields;
    try {
      fields = new TextDecoder().decode(b64urlToBytes(parts[0])).split('|');
    } catch (_) { return { error: 'invalid' }; }
    if (fields.length !== 3 || !fields[0]) return { error: 'invalid' };
    const [licenseId, name, game] = fields;

    const subtle = window.crypto && window.crypto.subtle;
    if (subtle && window.TextEncoder) {
      const jwk = await loadPublicJwk();
      if (!jwk) return { error: 'nokey' };
      try {
        const key = await subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
        const ok = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64urlToBytes(parts[1]), new TextEncoder().encode(parts[0]));
        if (!ok) return { error: 'invalid' };
      } catch (_) {
        return { error: 'invalid' };
      }
    }
    // Browser sangat lama tanpa WebCrypto (sebagian IFP/Smart TV lama): tanda tangan tidak bisa diperiksa,
    // tetapi aturan "satu link = satu game" tetap berlaku.

    if (!GAME_SLUG || game !== GAME_SLUG) return { error: 'beda-game' };
    const buyerName = name || 'Pembeli Resmi';
    // Token yang sama dipakai untuk cloud; cloud memeriksa tanda tangan ECDSA-nya sendiri.
    return { licenseId, buyerName, cloudToken: String(token).trim() };
  }

  async function verifyAnyToken(token) {
    const t = String(token || '').trim();
    if (!t) return { error: 'invalid' };
    if (t.includes('.')) return verifyNewToken(t);
    // Link versi lama (tanpa titik) tidak diterima lagi.
    return { error: 'lama' };
  }

  const ERR_TEXT = {
    invalid: '⚠️ Link / token tidak valid. Buka game dari link resmi yang dikirim Admin.',
    'beda-game': '⚠️ Link ini untuk game lain. Buka game dari link yang dikirim Admin untuk game ini.',
    lama: '⚠️ Link versi lama sudah tidak berlaku. Minta link baru ke Admin via WhatsApp (gratis).',
    nokey: '⚠️ Tidak bisa memeriksa lisensi. Periksa koneksi internet lalu muat ulang halaman.'
  };

  let licenseKey = '';
  let buyerName = '';
  let currentSessionId = 'SES_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  let sessionStartTime = Date.now();
  let isSessionKicked = false;
  let sseConnection = null;
  let pollingInterval = null;

  // Injeksi UI Gerbang Kunci & Badge Lisensi
  function injectSecurityUI() {
    if (document.getElementById('lokamain-gate-modal')) return;

    const style = document.createElement('style');
    style.id = 'lokamain-license-styles';
    style.textContent = `
      #lokamain-license-badge {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 99980;
        background: #e0e7ff;
        border: 1.5px solid #4338ca;
        color: #3730a3;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 99px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.12);
        display: flex;
        align-items: center;
        gap: 6px;
        pointer-events: auto;
      }
      #lokamain-license-badge.is-verified {
        background: #dcfce7;
        border-color: #15803d;
        color: #166534;
      }
      #lokamain-gate-modal, #lokamain-kicked-modal {
        position: fixed;
        top: 0; right: 0; bottom: 0; left: 0;
        z-index: 99999;
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 14px;
        font-family: system-ui, -apple-system, sans-serif;
        box-sizing: border-box;
      }
      .lokamain-card {
        background: #ffffff;
        color: #0f172a;
        max-width: 440px;
        width: 100%;
        border-radius: 18px;
        padding: 24px;
        text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        box-sizing: border-box;
      }
      .lokamain-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 16px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        border: none;
        text-decoration: none;
        transition: transform 0.1s, background-color 0.15s;
        box-sizing: border-box;
      }
      .lokamain-btn:active { transform: scale(0.98); }
      .lokamain-btn-green { background: #16a34a; color: #ffffff; }
      .lokamain-btn-green:hover { background: #15803d; }
      .lokamain-btn-wa { background: #0b535c; color: #ffffff; width: 100%; padding: 12px; font-size: 14px; }
      .lokamain-btn-wa:hover { background: #083e45; }
    `;
    document.head.appendChild(style);

    const badge = document.createElement('div');
    badge.id = 'lokamain-license-badge';
    badge.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:currentColor;"></span><span id="lokamain-badge-text">Lisensi: Memverifikasi…</span>';
    document.body.appendChild(badge);

    const gate = document.createElement('div');
    gate.id = 'lokamain-gate-modal';
    gate.innerHTML = `
      <div class="lokamain-card">
        <div style="font-size: 44px; margin-bottom: 6px;">🔒</div>
        <h2 style="margin: 0 0 4px; font-size: 21px; font-weight: 800;">Akses Game Terkunci</h2>
        <p style="font-size: 13px; color: #64748b; margin: 0 0 16px;">Game Edukasi Berlisensi Resmi rnalt_Digital</p>
        <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 12px; text-align: left; margin-bottom: 16px; font-size: 12px; line-height: 1.5; color: #334155;">
          <p style="margin: 0 0 4px; font-weight: 800; color: #0f172a;">🛡️ Lisensi Pembeli Resmi</p>
          <p style="margin: 0;">Game ini hanya dapat dimainkan melalui <strong>Link Khusus Pembeli</strong> yang dikirimkan Admin ke nomor WhatsApp Anda.</p>
        </div>
        <div style="text-align: left; margin-bottom: 16px;">
          <label style="display: block; font-size: 11.5px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Punya link dari Admin?</label>
          <div style="display: flex; gap: 8px;">
            <input id="lokamain-gate-input" type="text" placeholder="Tempel link lengkap dari Admin..." style="flex: 1; padding: 8px 10px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 12.5px; font-family: monospace;">
            <button id="lokamain-gate-btn" type="button" class="lokamain-btn lokamain-btn-green">🔓 Buka</button>
          </div>
          <div id="lokamain-gate-err" style="display: none; color: #dc2626; font-size: 12px; font-weight: 700; margin-top: 6px;">
            ⚠️ Kode Lisensi / Token tidak valid atau salah!
          </div>
        </div>
        <div style="border-top: 1px dashed #cbd5e1; padding-top: 14px;">
          <a href="https://wa.me/${WA_NUMBER}?text=Halo%20Admin%20rnalt,%20saya%20ingin%20memesan%20lisensi%20resmi%20game%20ini" target="_blank" class="lokamain-btn lokamain-btn-wa">
            💬 Pesan Lisensi Resmi via WhatsApp
          </a>
        </div>
        <p style="font-size: 11px; color: #94a3b8; margin: 12px 0 0;">rnalt_Digital © 2026 • Hak Cipta Dilindungi</p>
      </div>
    `;
    document.body.appendChild(gate);

    const kicked = document.createElement('div');
    kicked.id = 'lokamain-kicked-modal';
    kicked.style.display = 'none';
    kicked.innerHTML = `
      <div class="lokamain-card">
        <div style="font-size: 44px; margin-bottom: 6px;">⚠️</div>
        <h2 style="margin: 0 0 4px; font-size: 20px; font-weight: 800;">Akses Dialihkan ke Layar Lain</h2>
        <p style="font-size: 13px; color: #64748b; margin: 0 0 14px;">Game dengan lisensi Anda baru saja dibuka di <strong id="lokamain-kicked-device" style="color: #ea580c;">perangkat lain</strong>.</p>
        <div style="background: #fef2f2; border: 1.5px solid #f87171; border-radius: 10px; padding: 10px; text-align: left; font-size: 12px; margin-bottom: 14px; color: #991b1b;">
          Demi keamanan lisensi resmi Anda, game tidak dapat dimainkan secara bersamaan di 2 layar sekaligus.
        </div>
        <button id="lokamain-reclaim-btn" type="button" class="lokamain-btn lokamain-btn-wa">🔄 Gunakan Kembali di Layar Ini</button>
      </div>
    `;
    document.body.appendChild(kicked);
  }

  function updateBadge(name, key) {
    const badge = document.getElementById('lokamain-license-badge');
    const txt = document.getElementById('lokamain-badge-text');
    if (!badge || !txt) return;
    const display = name || key || 'Resmi';
    txt.textContent = `Lisensi: ${display}`;
    badge.classList.add('is-verified');
    badge.title = `Lisensi Resmi Terverifikasi\nPembeli: ${name || '-'}\nID: ${key || '-'}\nStatus: Sesi Aktif`;
  }

  // Penentuan "siapa yang paling baru" memakai jam SERVER ntfy (bukan jam perangkat),
  // supaya Smart TV/HP dengan jam yang meleset tetap diurutkan dengan benar.
  let myClaimServerTime = 0;   // detik, dari jawaban ntfy saat kita mengklaim
  let myClaimId = '';
  const seenClaimIds = new Set();

  function claimActiveSession() {
    if (!licenseKey) return;
    const cleanTopic = ntfyTopic();
    const payload = JSON.stringify({
      session: currentSessionId,
      device: detectDeviceType(),
      buyer: buyerName || 'Pembeli Resmi',
      time: Date.now()
    });

    try {
      sessionStorage.setItem('lokamain_active_key', licenseKey);
      sessionStorage.setItem('lokamain_active_buyer', buyerName);
    } catch (_) {}

    myClaimServerTime = Number.MAX_SAFE_INTEGER; // sementara abaikan klaim lain sampai jam server diketahui
    myClaimId = '';
    fetch(`https://ntfy.sh/${cleanTopic}`, {
      method: 'POST',
      body: payload,
      headers: { 'Title': 'ActiveClaim' }
    })
      .then(res => res.json())
      .then(info => {
        if (info && info.time) { myClaimServerTime = info.time; myClaimId = info.id || ''; }
        if (info && info.id) seenClaimIds.add(info.id);
        setTimeout(pollOnce, 800); // periksa klaim lain yang masuk selama menunggu
      })
      .catch(() => { myClaimServerTime = Math.floor(Date.now() / 1000); });
  }

  function handleIncomingClaim(dataStr) {
    try {
      if (!dataStr || isSessionKicked) return;
      const data = JSON.parse(dataStr);
      if (data.event && data.event !== 'message') return;
      if (myClaimServerTime === Number.MAX_SAFE_INTEGER) return; // jam server kita belum diketahui; diperiksa ulang setelah klaim terkonfirmasi
      if (data.id) {
        if (seenClaimIds.has(data.id)) return;
        seenClaimIds.add(data.id);
      }
      let msg = null;
      if (data.message) {
        try {
          msg = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
        } catch (_) {
          msg = { session: data.message };
        }
      }
      if (!msg || !msg.session) return;
      if (msg.session === currentSessionId) return;

      // Klaim lain lebih baru dari klaim kita? (waktu server; jika sama persis, urut id agar konsisten di kedua layar)
      const theirs = Number(data.time) || 0;
      const newer = theirs > myClaimServerTime ||
        (theirs === myClaimServerTime && myClaimId && data.id && data.id > myClaimId);
      if (!newer) return;

      onKicked(msg.device || 'Perangkat Lain');
    } catch (_) {}
  }

  // Jalur utama = koneksi langsung (SSE) yang menghemat permintaan ke ntfy.sh.
  // Cadangan = cek ringan tiap 30 detik dan setiap layar kembali dilihat/difokuskan.
  // Klaim yang sudah pernah diproses dibuang (seenClaimIds), jadi cek berulang aman.
  let lastEventAt = 0;
  let listenersBound = false;

  // Nama topik diturunkan dari tanda tangan link (rahasia milik pembeli), bukan dari kode lisensi
  // yang mudah ditebak, agar orang lain tidak bisa "menendang" sesi pembeli.
  let topicSeed = '';
  function ntfyTopic() {
    return 'lokamain_' + LOKAMAIN_SECURITY.computeHash(topicSeed || licenseKey.toUpperCase().trim());
  }

  function connectSse() {
    if (!licenseKey) return;
    if (sseConnection) { try { sseConnection.close(); } catch (_) {} }
    try {
      // 10 menit terakhir diputar ulang saat tersambung; klaim yang sudah diproses dibuang lewat seenClaimIds.
      sseConnection = new EventSource(`https://ntfy.sh/${ntfyTopic()}/sse?since=10m`);
      const touch = () => { lastEventAt = Date.now(); };
      sseConnection.addEventListener('open', touch);
      sseConnection.addEventListener('keepalive', touch);
      sseConnection.onmessage = (event) => { touch(); handleIncomingClaim(event.data); };
    } catch (_) {}
  }

  function pollOnce() {
    if (isSessionKicked || !licenseKey || document.hidden) return;
    fetch(`https://ntfy.sh/${ntfyTopic()}/json?poll=1&since=10m`, { cache: 'no-store' })
      .then(res => res.ok ? res.text() : '')
      .then(text => {
        if (!text) return;
        text.trim().split('\n').forEach(line => { if (line.trim()) handleIncomingClaim(line); });
      })
      .catch(() => {});
  }

  function listenRemoteSessions() {
    if (!licenseKey) return;
    lastEventAt = Date.now();
    connectSse();

    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
      // Penjaga: bila koneksi langsung sepi >100 dtk (tertidur/terputus), sambungkan ulang.
      if (Date.now() - lastEventAt > 100000) { lastEventAt = Date.now(); connectSse(); }
      pollOnce();
    }, 30000);

    if (!listenersBound) {
      listenersBound = true;
      const wake = () => { if (!document.hidden) { connectSse(); pollOnce(); } };
      document.addEventListener('visibilitychange', wake);
      window.addEventListener('focus', wake);
      window.addEventListener('pageshow', wake);
      window.addEventListener('online', wake);
    }
  }

  function onKicked(device) {
    isSessionKicked = true;
    const devEl = document.getElementById('lokamain-kicked-device');
    const kickModal = document.getElementById('lokamain-kicked-modal');
    if (devEl) devEl.textContent = device;
    if (kickModal) kickModal.style.display = 'flex';
  }

  function resumeSession() {
    isSessionKicked = false;
    currentSessionId = 'SES_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    sessionStartTime = Date.now();
    const kickModal = document.getElementById('lokamain-kicked-modal');
    if (kickModal) kickModal.style.display = 'none';
    claimActiveSession();
  }

  // ---------------- MODE COBA (uji coba gratis dari halaman detail game) ----------------
  // Game ASLI dibuka tanpa link pembeli, tetapi dibatasi:
  // - hanya soal bawaan (soal milik pembeli di perangkat ini tidak dibaca/diubah),
  // - maksimal COBA_SOAL soal atau COBA_MENIT menit (mana yang lebih dulu),
  // - Mode Guru terkunci, tidak ada sinkron cloud,
  // - 1x per perangkat per game (disimpan di browser; bisa diulang bila data browser dihapus).
  // Berlaku otomatis untuk semua game yang memakai quiz-core.js (QuizCore.nextQuestion).
  const COBA_SOAL = 5;
  const COBA_MENIT = 10;
  const COBA_KEY = 'lokamain_coba_v1_' + GAME_SLUG;

  function cobaBaca() { try { return JSON.parse(localStorage.getItem(COBA_KEY)) || {}; } catch (_) { return {}; } }
  function cobaTulis(v) { try { localStorage.setItem(COBA_KEY, JSON.stringify(v)); } catch (_) {} }

  function cobaInfoGame() {
    let url = '';
    try { url = new URL('../data/games.json', SCRIPT_SRC || location.href).href; } catch (_) { return Promise.resolve(null); }
    return fetch(url, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      const games = (d && Array.isArray(d.games)) ? d.games : [];
      const g = games.find((x) => x && new RegExp('(^|/)games/' + GAME_SLUG + '/?($|[?#])').test(String(x.gameUrl || '')));
      return { game: g || null, wa: (d && d.settings && d.settings.whatsappNumber) || WA_NUMBER };
    }).catch(() => null);
  }

  function cobaLinkWeb(path) {
    try { return new URL('../' + path, SCRIPT_SRC || location.href).href; } catch (_) { return '/' + path; }
  }

  // Jendela Mode Coba (selesai / tidak tersedia / Mode Guru terkunci)
  function cobaModal(jenis, info, bisaTutup) {
    const lama = document.getElementById('lokamain-coba-modal');
    if (lama) lama.remove();
    const g = info && info.game;
    const judul = g && g.title ? g.title : 'game ini';
    const pesan = g && g.id ? cobaLinkWeb('index.html?pesan=' + encodeURIComponent(g.id) + '#katalog') : cobaLinkWeb('index.html#katalog');
    const detail = g && g.id ? cobaLinkWeb('play.html?id=' + encodeURIComponent(g.id)) : cobaLinkWeb('index.html#katalog');
    const wa = String((info && info.wa) || WA_NUMBER).replace(/\D+/g, '');
    const waUrl = 'https://wa.me/' + wa + '?text=' + encodeURIComponent('Halo Admin, saya sudah mencoba game "' + judul + '" dan ingin bertanya.');
    const TEKS = {
      selesai: ['🎉', 'Uji coba selesai!', 'Anda sudah mencoba <b>' + judul.replace(/[<>&"]/g, '') + '</b>. Suka? Versi lengkap bisa langsung dipakai di kelas atau di rumah.'],
      terpakai: ['⏳', 'Uji coba sudah dipakai', 'Uji coba gratis untuk game ini sudah dipakai di perangkat ini. Pesan versi lengkap untuk bermain tanpa batas.'],
      tidakada: ['🎮', 'Uji coba belum tersedia', 'Game ini belum punya mode coba. Lihat video dan soal contohnya di halaman detail, atau tanya Admin lewat WhatsApp.'],
      guru: ['🔐', 'Mode Guru ada di versi lengkap', 'Di versi lengkap Anda bisa <b>mengganti soal sendiri</b> (tempel dari Word/WhatsApp, buat dengan AI, atau Excel), dan soal ikut ke semua perangkat.']
    };
    const t = TEKS[jenis] || TEKS.selesai;
    const m = document.createElement('div');
    m.id = 'lokamain-coba-modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:rgba(15,23,42,.9);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif';
    m.innerHTML = '<div class="lokamain-card" style="max-width:420px">' +
      '<div style="font-size:46px;margin-bottom:6px">' + t[0] + '</div>' +
      '<h2 style="margin:0 0 8px;font-size:21px;font-weight:800">' + t[1] + '</h2>' +
      '<p style="font-size:14px;color:#475569;margin:0 0 14px;line-height:1.5">' + t[2] + '</p>' +
      (jenis === 'tidakada' ? '' : '<ul style="text-align:left;font-size:13px;color:#334155;margin:0 0 16px;padding-left:20px;line-height:1.6"><li>Soal tanpa batas & bisa diganti sendiri</li><li>Main di Smart TV, IFP, HP, laptop</li><li>Link dikirim lewat WhatsApp setelah bayar</li></ul>') +
      '<a href="' + (jenis === 'tidakada' ? detail : pesan) + '" target="_top" class="lokamain-btn lokamain-btn-green" style="width:100%;padding:13px;font-size:15px;margin-bottom:8px">' + (jenis === 'tidakada' ? '📄 Lihat Detail Game' : '🛒 Pesan Versi Lengkap') + '</a>' +
      '<a href="' + waUrl + '" target="_blank" rel="noopener" class="lokamain-btn lokamain-btn-wa" style="margin-bottom:8px">💬 Tanya via WhatsApp</a>' +
      (bisaTutup ? '<button type="button" id="lokamain-coba-tutup" class="lokamain-btn" style="width:100%;background:#e2e8f0;color:#0f172a">Lanjut mencoba</button>'
        : '<a href="' + detail + '" target="_top" style="display:inline-block;margin-top:6px;font-size:13px;color:#64748b">← Kembali ke halaman game</a>') +
      '</div>';
    document.body.appendChild(m);
    const tutup = document.getElementById('lokamain-coba-tutup');
    if (tutup) tutup.addEventListener('click', () => m.remove());
  }

  function startTrial() {
    const gate = document.getElementById('lokamain-gate-modal');
    const infoP = cobaInfoGame();
    const kunci = (alasan) => {
      if (gate) gate.style.display = 'none';
      infoP.then((info) => cobaModal(alasan, info, false));
    };

    const Q = window.QuizCore;
    if (!Q || typeof Q.nextQuestion !== 'function') { kunci('tidakada'); return; }

    const st = cobaBaca();
    if (st.selesai) { kunci('terpakai'); return; }

    // Pastikan admin tidak mematikan uji coba untuk game ini
    infoP.then((info) => { if (info && info.game && info.game.trial === false) selesai('tidakada'); });

    let berakhir = false;
    function selesai(alasan) {
      if (berakhir) return;
      berakhir = true;
      if (alasan !== 'tidakada') { st.selesai = true; cobaTulis(st); }
      try { Q.muted = true; } catch (_) {}
      infoP.then((info) => cobaModal(alasan || 'selesai', info, false));
    }

    // Blok keyboard & klik ke game setelah uji coba berakhir
    window.addEventListener('keydown', (e) => { if (berakhir) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

    // Hanya soal bawaan: soal milik pembeli di perangkat ini tidak dibaca dan tidak ditimpa.
    // (pola nama bank soal: lokamain_<gameId>_soal_v1; gameId bisa saja baru diisi game setelah ini)
    const isBankSoal = (k) => /^lokamain_[a-z0-9-]+_soal_v1$/.test(String(k));
    const asliGet = Storage.prototype.getItem, asliSet2 = Storage.prototype.setItem;
    Storage.prototype.getItem = function (k) { if (this === window.localStorage && isBankSoal(k)) return null; return asliGet.call(this, k); };
    Storage.prototype.setItem = function (k, v) { if (this === window.localStorage && isBankSoal(k)) return; return asliSet2.call(this, k, v); };
    try { if (typeof Q.reloadQuestions === 'function') Q.reloadQuestions(); } catch (_) {}

    // Mode Guru terkunci
    Q.openTeacher = function () { infoP.then((info) => cobaModal('guru', info, true)); return Promise.resolve(); };

    // Hitung soal yang dimainkan (tersimpan, jadi muat ulang halaman tidak mengulang dari nol)
    st.n = Number(st.n) || 0;
    st.mulai = Number(st.mulai) || Date.now();
    cobaTulis(st);
    const asliNext = Q.nextQuestion;
    Q.nextQuestion = function () {
      if (berakhir) return null;
      if (st.n >= COBA_SOAL) { selesai('selesai'); return null; }
      st.n += 1; cobaTulis(st);
      perbaruiLabel();
      return asliNext.apply(this, arguments);
    };

    // Batas waktu (cadangan untuk game yang tidak memakai nextQuestion)
    const sisaMs = st.mulai + COBA_MENIT * 60000 - Date.now();
    if (sisaMs <= 0) { selesai('selesai'); } else { setTimeout(() => selesai('selesai'), sisaMs); }

    if (gate) gate.style.display = 'none';
    const badge = document.getElementById('lokamain-license-badge');
    function perbaruiLabel() {
      const txt = document.getElementById('lokamain-badge-text');
      if (txt) txt.textContent = `MODE COBA · soal ${Math.min(st.n, COBA_SOAL)}/${COBA_SOAL}`;
    }
    if (badge) {
      badge.style.background = '#fff7ed'; badge.style.borderColor = '#ea580c'; badge.style.color = '#9a3412';
      badge.title = 'Uji coba gratis: ' + COBA_SOAL + ' soal bawaan, Mode Guru terkunci. Pesan versi lengkap untuk bermain tanpa batas.';
      badge.style.cursor = 'pointer';
      badge.addEventListener('click', () => infoP.then((info) => cobaModal('guru', info, true)));
    }
    perbaruiLabel();
  }

  function grantAccess(key, name, cloudToken) {
    licenseKey = (key || '').toUpperCase().trim();
    buyerName = name || 'Pembeli Resmi';
    topicSeed = String(cloudToken || '').split('.')[1] || '';

    const gate = document.getElementById('lokamain-gate-modal');
    if (gate) gate.style.display = 'none';

    updateBadge(buyerName, licenseKey);
    try { if (window.__lokamainSinkron) window.__lokamainSinkron(licenseKey, cloudToken); } catch (_) {}
    claimActiveSession();
    listenRemoteSessions();
  }

  async function startEvaluation() {
    injectSecurityUI();

    document.getElementById('lokamain-reclaim-btn')?.addEventListener('click', resumeSession);

    const input = document.getElementById('lokamain-gate-input');
    const btn = document.getElementById('lokamain-gate-btn');
    const err = document.getElementById('lokamain-gate-err');
    const showErr = (code) => {
      if (!err) return;
      err.textContent = ERR_TEXT[code] || ERR_TEXT.invalid;
      err.style.display = 'block';
    };
    // Token disimpan per game, jadi token game A tidak ikut terpakai saat membuka game B di tab yang sama.
    const CACHE_KEY = 'lokamain_verified_token_' + GAME_SLUG;

    const params = new URLSearchParams(window.location.search);
    // Hanya TOKEN resmi (link dari Aplikasi Admin) yang membuka game.
    // Link boleh disalin & dibuka di perangkat mana pun; pemakaian bersamaan dicegah oleh fitur anti-dobel.
    const rawToken = params.get('token') || params.get('auth');
    let cachedToken = null;
    try { cachedToken = sessionStorage.getItem(CACHE_KEY); } catch (_) {}
    const firstToken = rawToken || cachedToken;

    // Mode Coba dari halaman detail game (?coba=1): game asli, dibatasi.
    if (!rawToken && params.get('coba') === '1') {
      startTrial();
      return;
    }

    if (firstToken) {
      const res = await verifyAnyToken(firstToken);
      if (!res.error) {
        try {
          sessionStorage.setItem(CACHE_KEY, firstToken);
          if (rawToken) window.history.replaceState({}, document.title, window.location.pathname);
        } catch (_) {}
        grantAccess(res.licenseId, res.buyerName, res.cloudToken);
        return;
      }
      try { if (!rawToken) sessionStorage.removeItem(CACHE_KEY); } catch (_) {}
      if (rawToken) showErr(res.error);
    }

    // Gerbang kunci tetap aktif
    let busy = false;
    const tryUnlock = async () => {
      if (busy) return;
      let val = (input?.value || '').trim();
      if (!val) {
        if (err) { err.textContent = '⚠️ Masukkan kode lisensi atau tempel link Anda!'; err.style.display = 'block'; }
        return;
      }
      if (val.includes('token=')) {
        const m = val.match(/token=([a-zA-Z0-9_.-]+)/);
        if (m && m[1]) val = m[1];
      }
      busy = true;
      const res = await verifyAnyToken(val);
      busy = false;
      if (!res.error) {
        try { sessionStorage.setItem(CACHE_KEY, val); } catch (_) {}
        grantAccess(res.licenseId, res.buyerName, res.cloudToken);
        return;
      }
      showErr(res.error);
    };

    btn?.addEventListener('click', tryUnlock);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startEvaluation);
  } else {
    startEvaluation();
  }
})();

