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

  function mulai(licenseId) {
    try { token = sessionStorage.getItem('lokamain_verified_token') || ''; } catch (e) { token = ''; }
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
 */
(function initLokaMainLicenseEngine() {
  'use strict';

  const SECRET = 'LOKAMAIN_SECURE_AUTH_KEY_2026_V1';
  const WA_NUMBER = '6287881258019';

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
    fromBase64Url(b64) {
      try {
        let str = b64.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        return decodeURIComponent(Array.prototype.map.call(atob(str), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      } catch (e) {
        let str = b64.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        return atob(str);
      }
    },

    xorCipher(text, key) {
      let res = '';
      for (let i = 0; i < text.length; i++) {
        res += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return res;
    },

    computeHash(text) {
      let h1 = 5381, h2 = 2166136261;
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        h1 = ((h1 << 5) + h1) ^ code;
        h2 = (h2 ^ code) * 16777619;
      }
      return Math.abs(h1).toString(36) + Math.abs(h2).toString(36);
    },

    verifyAndDecodeToken(token) {
      try {
        if (!token || typeof token !== 'string') return null;
        const decrypted = this.xorCipher(this.fromBase64Url(token.trim()), SECRET);
        const parsed = JSON.parse(decrypted);
        if (!parsed || !parsed.l || !parsed.s) return null;
        const expectedSig = this.computeHash(`${parsed.l}|${parsed.n || ''}|${SECRET}`);
        if (parsed.s !== expectedSig) return null;
        return { licenseId: parsed.l, buyerName: parsed.n || 'Pembeli Resmi', timestamp: parsed.t };
      } catch (e) {
        return null;
      }
    }
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
    const cleanTopic = 'lokamain_' + LOKAMAIN_SECURITY.computeHash(licenseKey.toUpperCase().trim());
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

  function ntfyTopic() {
    return 'lokamain_' + LOKAMAIN_SECURITY.computeHash(licenseKey.toUpperCase().trim());
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

  function grantAccess(key, name) {
    licenseKey = (key || '').toUpperCase().trim();
    buyerName = name || 'Pembeli Resmi';

    const gate = document.getElementById('lokamain-gate-modal');
    if (gate) gate.style.display = 'none';

    updateBadge(buyerName, licenseKey);
    try { if (window.__lokamainSinkron) window.__lokamainSinkron(licenseKey); } catch (_) {}
    claimActiveSession();
    listenRemoteSessions();
  }

  function startEvaluation() {
    injectSecurityUI();

    document.getElementById('lokamain-reclaim-btn')?.addEventListener('click', resumeSession);

    const params = new URLSearchParams(window.location.search);
    // Hanya TOKEN resmi (link dari Aplikasi Admin) yang membuka game.
    // Link boleh disalin & dibuka di perangkat mana pun; pemakaian bersamaan dicegah oleh fitur anti-dobel.
    const rawToken = params.get('token') || params.get('auth');

    if (rawToken) {
      const verified = LOKAMAIN_SECURITY.verifyAndDecodeToken(rawToken);
      if (verified) {
        try {
          sessionStorage.setItem('lokamain_verified_token', rawToken);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (_) {}
        grantAccess(verified.licenseId, verified.buyerName);
        return;
      }
    } else {
      let cachedToken = null;
      try { cachedToken = sessionStorage.getItem('lokamain_verified_token'); } catch (_) {}
      if (cachedToken) {
        const verified = LOKAMAIN_SECURITY.verifyAndDecodeToken(cachedToken);
        if (verified) {
          grantAccess(verified.licenseId, verified.buyerName);
          return;
        }
      }
    }

    // Gerbang kunci tetap aktif
    const input = document.getElementById('lokamain-gate-input');
    const btn = document.getElementById('lokamain-gate-btn');
    const err = document.getElementById('lokamain-gate-err');

    const tryUnlock = () => {
      let val = (input?.value || '').trim();
      if (!val) {
        if (err) { err.textContent = '⚠️ Masukkan kode lisensi atau tempel link Anda!'; err.style.display = 'block'; }
        return;
      }
      if (val.includes('token=')) {
        const m = val.match(/token=([a-zA-Z0-9_-]+)/);
        if (m && m[1]) val = m[1];
      }
      const verified = LOKAMAIN_SECURITY.verifyAndDecodeToken(val);
      if (verified) {
        try { sessionStorage.setItem('lokamain_verified_token', val); } catch (_) {}
        grantAccess(verified.licenseId, verified.buyerName);
        return;
      }
      if (err) {
        err.textContent = '⚠️ Link / token tidak valid. Buka game dari link resmi yang dikirim Admin.';
        err.style.display = 'block';
      }
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

