/* =========================================================================
   Modul Ajar Digital — inti aplikasi: navigasi, Mode Guru, mode ringan,
   isian dokumen, cetak, dan gambar planet (SVG) bersama.
   ========================================================================= */
(function () {
  'use strict';
  const D = window.MODUL_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const STORE = 'modulTataSurya.v1.';
  const PIN = '1234';
  const SECTIONS = ['beranda', 'modul', 'materi', 'kuis', 'game', 'lampiran'];

  const store = {
    get(k, d) { try { const v = localStorage.getItem(STORE + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(STORE + k, v); } catch (e) { /* abaikan */ } }
  };
  const sstore = {
    get(k) { try { return sessionStorage.getItem(STORE + k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(STORE + k, v); } catch (e) { /* abaikan */ } }
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------------------------------------------ toast */
  let toastT = 0;
  function toast(msg, ms = 2200) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
  }

  /* -------------------------------------------------------- gambar planet */
  let gid = 0;
  function planetArt(id, size = 100, opts = {}) {
    const p = D.PLANETS.find((x) => x.id === id);
    const n = 'pg' + (++gid);
    const c = size / 2;
    if (id === 'matahari') {
      return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><defs><radialGradient id="${n}" cx=".4" cy=".38"><stop offset="0" stop-color="#fff6d0"/><stop offset=".55" stop-color="#ffc23d"/><stop offset="1" stop-color="#ef6a12"/></radialGradient></defs><circle cx="${c}" cy="${c}" r="${size * 0.42}" fill="url(#${n})"/></svg>`;
    }
    if (id === 'pluto') {
      return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><defs><radialGradient id="${n}" cx=".38" cy=".35"><stop offset="0" stop-color="#f1e4d4"/><stop offset="1" stop-color="#8a6f5a"/></radialGradient></defs><circle cx="${c}" cy="${c}" r="${size * 0.3}" fill="url(#${n})"/><ellipse cx="${c + size * 0.06}" cy="${c + size * 0.07}" rx="${size * 0.11}" ry="${size * 0.09}" fill="#fbf3e8" opacity=".75"/></svg>`;
    }
    const [l, d] = p.warna;
    const r = size * (opts.full ? 0.42 : (id === 'saturnus' ? 0.27 : id === 'uranus' ? 0.3 : 0.4));
    let extra = '';
    let back = '';
    if (id === 'jupiter') {
      extra = `<g clip-path="url(#${n}c)" opacity=".55"><rect x="0" y="${c - r * 0.55}" width="${size}" height="${r * 0.16}" fill="#9a6440"/><rect x="0" y="${c - r * 0.15}" width="${size}" height="${r * 0.22}" fill="#c58f62"/><rect x="0" y="${c + r * 0.28}" width="${size}" height="${r * 0.14}" fill="#9a6440"/><ellipse cx="${c + r * 0.35}" cy="${c + r * 0.38}" rx="${r * 0.2}" ry="${r * 0.11}" fill="#c1442b"/></g>`;
    } else if (id === 'saturnus') {
      extra = `<g clip-path="url(#${n}c)" opacity=".4"><rect x="0" y="${c - r * 0.4}" width="${size}" height="${r * 0.18}" fill="#a07a3c"/><rect x="0" y="${c + r * 0.15}" width="${size}" height="${r * 0.16}" fill="#a07a3c"/></g>`;
      back = `<path d="M ${c - r * 1.75} ${c} A ${r * 1.75} ${r * 0.5} 0 0 1 ${c + r * 1.75} ${c}" fill="none" stroke="#d9c38c" stroke-width="${r * 0.22}" opacity=".85" transform="rotate(-14 ${c} ${c})"/>`;
      extra += `<path d="M ${c - r * 1.75} ${c} A ${r * 1.75} ${r * 0.5} 0 0 0 ${c + r * 1.75} ${c}" fill="none" stroke="#e9d6a2" stroke-width="${r * 0.22}" transform="rotate(-14 ${c} ${c})"/>`;
    } else if (id === 'uranus') {
      // cincin hampir tegak karena kemiringan sumbu ± 98°
      back = `<ellipse cx="${c}" cy="${c}" rx="${r * 0.42}" ry="${r * 1.55}" fill="none" stroke="#9fd8e0" stroke-width="${r * 0.06}" opacity=".7" transform="rotate(8 ${c} ${c})"/>`;
    } else if (id === 'bumi') {
      extra = `<g clip-path="url(#${n}c)" fill="#3fae5a" opacity=".85"><path d="M ${c - r * 0.6} ${c - r * 0.5} q ${r * 0.4} ${-r * 0.3} ${r * 0.7} 0 q ${r * 0.1} ${r * 0.35} ${-r * 0.25} ${r * 0.55} q ${-r * 0.35} ${r * 0.05} ${-r * 0.45} ${-r * 0.55}z"/><path d="M ${c + r * 0.15} ${c + r * 0.05} q ${r * 0.45} ${-r * 0.1} ${r * 0.6} ${r * 0.3} q ${-r * 0.1} ${r * 0.45} ${-r * 0.45} ${r * 0.4} q ${-r * 0.2} ${-r * 0.35} ${-r * 0.15} ${-r * 0.7}z"/></g><ellipse cx="${c}" cy="${c - r * 0.93}" rx="${r * 0.35}" ry="${r * 0.1}" fill="#f4fbff" opacity=".9"/>`;
    } else if (id === 'mars') {
      extra = `<g clip-path="url(#${n}c)" opacity=".35" fill="#6e2410"><ellipse cx="${c - r * 0.2}" cy="${c + r * 0.1}" rx="${r * 0.45}" ry="${r * 0.18}"/><ellipse cx="${c + r * 0.35}" cy="${c - r * 0.35}" rx="${r * 0.2}" ry="${r * 0.12}"/></g><ellipse cx="${c}" cy="${c - r * 0.92}" rx="${r * 0.28}" ry="${r * 0.09}" fill="#fff" opacity=".85"/>`;
    } else if (id === 'neptunus') {
      extra = `<ellipse cx="${c - r * 0.25}" cy="${c - r * 0.2}" rx="${r * 0.2}" ry="${r * 0.1}" fill="#1b2a7a" opacity=".6"/>`;
    }
    return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><defs><radialGradient id="${n}" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="${l}"/><stop offset="1" stop-color="${d}"/></radialGradient><clipPath id="${n}c"><circle cx="${c}" cy="${c}" r="${r}"/></clipPath></defs>${back}<circle cx="${c}" cy="${c}" r="${r}" fill="url(#${n})"/>${extra}</svg>`;
  }

  /* ------------------------------------------------------------ navigasi */
  const subInit = {};
  const listeners = [];
  let current = '';
  function go(sec, sub, push = true) {
    if (!SECTIONS.includes(sec)) sec = 'beranda';
    current = sec;
    $$('.sec').forEach((s) => s.classList.toggle('on', s.dataset.sec === sec));
    $$('[data-go]').forEach((b) => b.closest('.nav') && b.classList.toggle('on', b.dataset.go === sec));
    const nb = $(`.nav [data-go="${sec}"]`); if (nb && nb.scrollIntoView) { try { nb.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* lama */ } }
    if (subInit[sec]) subInit[sec](sub);
    listeners.forEach((f) => f(sec, sub));
    if (push) {
      const h = '#' + sec + (sub ? '/' + sub : '');
      if (location.hash !== h) history.replaceState(null, '', h);
    }
    window.scrollTo(0, 0);
  }
  function fromHash() {
    const [s, sub] = (location.hash || '#beranda').slice(1).split('/');
    go(s, sub, false);
  }

  /* ------------------------------------------------------------ Mode Guru */
  function setGuru(on) {
    document.body.classList.toggle('guru', !!on);
    const b = $('#btnGuru'); b.classList.toggle('on', !!on);
    b.querySelector('span').textContent = on ? '🔓' : '🔒';
    b.querySelector('em').textContent = on ? 'Guru aktif' : 'Mode Guru';
    sstore.set('guru', on ? '1' : '0');
    document.dispatchEvent(new CustomEvent('guru', { detail: !!on }));
  }
  const isGuru = () => document.body.classList.contains('guru');
  function openPin() {
    const m = $('#pinModal'); m.hidden = false; $('#pinInput').value = ''; $('#pinErr').textContent = '';
    setTimeout(() => $('#pinInput').focus(), 50);
  }
  function tryPin(v) {
    if (String(v) === PIN) { setGuru(true); $('#pinModal').hidden = true; toast('🔓 Mode Guru aktif — kunci jawaban & rubrik ditampilkan'); return true; }
    $('#pinErr').textContent = 'PIN salah. Coba lagi.'; $('#pinInput').value = ''; return false;
  }

  /* ------------------------------------------------- animasi & mode ringan */
  const qs = new URLSearchParams(location.search);
  const lowSpec = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const ringan = qs.get('ringan') === '1' || (qs.get('ringan') !== '0' && !!lowSpec);
  function setAnim(on) {
    document.body.classList.toggle('noanim', !on);
    $('#btnAnim').setAttribute('aria-pressed', on ? 'true' : 'false');
    store.set('anim', on ? '1' : '0');
    document.dispatchEvent(new CustomEvent('anim', { detail: !!on }));
  }
  const animOn = () => !document.body.classList.contains('noanim');

  /* ------------------------------------------------------ isian dokumen */
  function initFields() {
    $$('.fill[data-key]').forEach((el) => {
      const k = el.dataset.key;
      el.textContent = store.get('f.' + k, '');
      el.addEventListener('input', () => { store.set('f.' + k, el.textContent.trim()); mirror(); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
      el.addEventListener('blur', () => { if (!el.textContent.trim()) el.textContent = ''; });
    });
    mirror();
  }
  function mirror() {
    $$('[data-mirror]').forEach((m) => { const src = $(`.fill[data-key="${m.dataset.mirror}"]`); m.textContent = src ? src.textContent.trim() : ''; });
  }

  /* ------------------------------------------------- isi dokumen dinamis */
  function buildDocs() {
    // kunci kuis (Mode Guru)
    const L = 'ABCD';
    let h = '<table class="tbl small"><thead><tr><th style="width:6%">No</th><th style="width:9%">Level</th><th>Indikator soal</th><th style="width:10%">Kunci</th><th style="width:9%">TP</th></tr></thead><tbody>';
    const TP = [1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 6, 6, 6, 2, 5, 4];
    const tpOf = (i) => 'TP ' + (TP[i] || '-');
    D.KUIS.forEach((q, i) => {
      h += `<tr><td>${i + 1}</td><td>${q.lv}</td><td>${esc(q.q)}</td><td><b>${L[q.a]}</b></td><td>${tpOf(i)}</td></tr>`;
    });
    h += '</tbody></table><p class="note">C1 = mengingat, C2 = memahami, C3 = menerapkan, C4 = menganalisis, C5 = mengevaluasi. Soal C4–C5 tergolong HOTS. Skor = jumlah benar × 5.</p>';
    $('#kunciKuis').innerHTML = h;

    // tabel LKPD kegiatan 1
    const scale = { merkurius: '3,9', venus: '7,2', bumi: '10', mars: '15,2', jupiter: '52', saturnus: '95,7', uranus: '192', neptunus: '302' };
    $('#lkpdTbl').innerHTML = D.PLANETS.map((p) => `<tr><td><b>${p.nama}</b></td><td>${p.sa}</td><td></td><td class="guru-only">${scale[p.id]}</td></tr>`).join('');

    // tabel fase LKPD
    const fase = ['Bulan baru', 'Sabit awal', 'Kuartal pertama', 'Cembung awal', 'Purnama', 'Cembung akhir', 'Kuartal ketiga', 'Sabit akhir'];
    $('#lkpdFase').innerHTML = fase.map((f, i) => `<tr><td>${i + 1}${i === 0 ? '<br><small>(menghadap lampu)</small>' : ''}</td><td></td><td></td><td class="guru-only">${f}</td></tr>`).join('');

    // tabel data planet di bahan bacaan
    $('#tblPlanetDoc').innerHTML = '<thead><tr><th>Planet</th><th>Jarak rata-rata</th><th>Diameter (km)</th><th>Revolusi</th><th>Rotasi</th><th>Satelit</th><th>Cincin</th></tr></thead><tbody>' +
      D.PLANETS.map((p) => `<tr><td><b>${p.nama}</b></td><td>${p.sa} SA<br>(${p.jt} juta km)</td><td>${p.diameter}</td><td>${p.rev}</td><td>${p.rot}</td><td>${p.satelit}</td><td>${p.cincin.split(',')[0]}</td></tr>`).join('') + '</tbody>';

    // glosarium
    $('#glosList').innerHTML = D.GLOSARIUM.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('');
  }

  /* --------------------------------------------------------------- cetak */
  function doPrint(kind) {
    document.body.classList.remove('print-modul', 'print-lkpd');
    document.body.classList.add(kind === 'lkpd' ? 'print-lkpd' : 'print-modul');
    if (kind !== 'lkpd' && !isGuru()) toast('Catatan: rubrik & kunci hanya ikut tercetak bila Mode Guru aktif', 3500);
    setTimeout(() => window.print(), kind !== 'lkpd' && !isGuru() ? 300 : 30);
  }
  window.addEventListener('afterprint', () => document.body.classList.remove('print-modul', 'print-lkpd'));

  /* ------------------------------------------------------------- layar penuh */
  function toggleFull() {
    const d = document;
    try {
      if (!d.fullscreenElement && !d.webkitFullscreenElement) {
        const el = d.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      } else { (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
    } catch (e) { toast('Layar penuh tidak didukung di perangkat ini'); }
  }

  /* --------------------------------------------------------------- init */
  function init() {
    if (ringan) document.body.classList.add('ringan');
    const a = store.get('anim', null);
    setAnim(a === null ? !ringan : a === '1');
    if (sstore.get('guru') === '1') setGuru(true);

    buildDocs();
    initFields();

    document.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]');
      if (g) { e.preventDefault(); go(g.dataset.go); }
    });
    $('#btnAnim').addEventListener('click', () => { setAnim(!animOn()); toast(animOn() ? '✨ Animasi dinyalakan' : '⏸ Animasi dimatikan (hemat daya)'); });
    $('#btnFull').addEventListener('click', toggleFull);
    const guruBtn = () => { if (isGuru()) { setGuru(false); toast('🔒 Mode Guru dinonaktifkan'); } else openPin(); };
    $('#btnGuru').addEventListener('click', guruBtn);
    $('#homeGuru').addEventListener('click', guruBtn);
    $('#btnPrint').addEventListener('click', () => doPrint('modul'));
    $('#btnPrint2').addEventListener('click', () => doPrint('modul'));
    $('#btnPrintLkpd').addEventListener('click', () => doPrint('lkpd'));
    $('#btnPrintLkpd2').addEventListener('click', () => doPrint('lkpd'));

    // PIN pad
    const pad = $('#pinPad');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].forEach((k) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = k; b.dataset.k = k; pad.appendChild(b);
    });
    pad.addEventListener('click', (e) => {
      const k = e.target.closest('button'); if (!k) return;
      const inp = $('#pinInput');
      if (k.dataset.k === '⌫') inp.value = inp.value.slice(0, -1);
      else if (k.dataset.k === 'OK') tryPin(inp.value);
      else if (inp.value.length < 8) { inp.value += k.dataset.k; $('#pinErr').textContent = ''; }
    });
    $('#pinForm').addEventListener('submit', (e) => { e.preventDefault(); tryPin($('#pinInput').value); });

    // tutup modal
    document.addEventListener('click', (e) => { const c = e.target.closest('[data-close]'); if (c) c.closest('.modal').hidden = true; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.modal').forEach((m) => { m.hidden = true; }); });

    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  window.MOD = {
    D, $, $$, esc, toast, store, planetArt, go, isGuru, setGuru, animOn,
    onSection(sec, fn) { subInit[sec] = fn; },
    onNav(fn) { listeners.push(fn); },
    get current() { return current; }, ringan
  };
  // hook uji otomatis (diperluas oleh modul lain)
  window.__MOD = {
    go: (s, sub) => go(s, sub),
    guru: (pin) => { if (pin === undefined) return isGuru(); openPin(); return tryPin(pin); },
    guruOff: () => setGuru(false),
    print: (k) => { document.body.classList.remove('print-modul', 'print-lkpd'); document.body.classList.add(k === 'lkpd' ? 'print-lkpd' : 'print-modul'); },
    get ringan() { return ringan; },
    get anim() { return animOn(); },
    setAnim,
    get section() { return current; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
