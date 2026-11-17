/* ==========================================================================
   Pendaki Nekat — kuis "berani ambil risiko" mendaki gunung untuk kelas (SMP/SMA).
   2–4 TIM (atau 1 tim melawan Robo Pendaki) berlomba ke puncak gunung api.
     • Giliran: anggota tim bergiliran menjawab soal.
     • Benar = naik 1 langkah, lalu tim MEMILIH:
         🧗 Lanjut Nekat  → jawab soal lagi, naik lebih tinggi (benar ke-2 dst. = +1 bonus)
         ⛺ Berkemah      → langkah sekarang jadi TITIK AMAN, giliran selesai.
     • Salah = merosot ke titik aman terakhir, giliran selesai, lalu SOAL REBUTAN:
       tim lain berebut klik tombol timnya; benar = +1 langkah (belum aman).
     • ⛺ Pos Aman (tiap beberapa langkah) otomatis menyimpan ketinggian.
     • Cuaca tiap ronde: ☀️ cerah, 🌧️ hujan (merosot 1 langkah lebih jauh),
       🌫️ kabut (waktu menjawab lebih singkat), 💨 angin (benar = +1 bonus).
     • Petak spesial: 🪢 tali pintas (+2), 🪨 longsor (−1), 💧 mata air (🎒 bekal anti-merosot).
   Menang: tim pertama di PUNCAK; jika batas ronde/waktu habis → langkah tertinggi
   (seri: titik aman tertinggi). Grafis 100% kode (SVG + CSS). Animasi berulang hanya
   transform/opacity; tanpa loop 60 fps. Mode ringan otomatis (?ringan=1 untuk memaksa).
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const FX = QC.fx; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let TS = 1; // skala waktu (uji otomatis)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * TS));
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };

  const GAME = 'pendaki-nekat';
  const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
  const AVATARS = ['🧗', '🦅', '🐐', '🦊', '🐯', '🐼', '🦁', '🐸'];
  const TEAM_NAMES = ['Tim Merah', 'Tim Biru', 'Tim Hijau', 'Tim Kuning'];
  const BOT_NAME = 'Robo Pendaki';
  QC.init({ gameId: GAME, title: 'Pendaki Nekat', avatars: AVATARS, colors: COLORS });

  // Mode ringan otomatis untuk perangkat lemah (IFP/Android TV/laptop lama). Paksa: ?ringan=1 / ?ringan=0
  const LITE = /[?&]ringan=1/.test(location.search) || (!/[?&]ringan=0/.test(location.search) && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4));
  if (LITE) document.documentElement.classList.add('pn-lite');
  const PN = (n) => (LITE ? Math.ceil(n * 0.45) : n);
  const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ------------------------------ Data gunung ------------------------------ */
  const MOUNTS = {
    pendek: { h: 10, pos: [4, 7], label: 'Pendek • 10 langkah', tiles: { tali: 1, longsor: 1, air: 1 } },
    sedang: { h: 14, pos: [4, 8, 11], label: 'Sedang • 14 langkah', tiles: { tali: 2, longsor: 2, air: 1 } },
    tinggi: { h: 18, pos: [5, 10, 14], label: 'Tinggi • 18 langkah', tiles: { tali: 2, longsor: 3, air: 2 } }
  };
  const AUTO_ROUNDS = { 2: 10, 3: 7, 4: 5 };
  const WEATHER = {
    cerah: { ic: '☀️', name: 'Cerah', short: 'tanpa efek', desc: 'Cuaca bersahabat — mendaki seperti biasa.' },
    hujan: { ic: '🌧️', name: 'Hujan', short: 'salah = merosot 1 lebih jauh', desc: 'Jalur licin! Salah = merosot <b>1 langkah lebih jauh</b> dari titik aman (Pos Aman tetap aman).' },
    kabut: { ic: '🌫️', name: 'Kabut', short: 'waktu menjawab lebih singkat', desc: 'Pandangan terbatas — <b>waktu menjawab lebih singkat</b>.' },
    angin: { ic: '💨', name: 'Angin Baik', short: 'benar = +1 bonus', desc: 'Angin mendorong dari belakang — setiap jawaban benar <b>+1 langkah bonus</b>.' }
  };
  const TILES = {
    tali: { ic: '🪢', name: 'Tali Pintas', desc: 'langsung naik +2 langkah' },
    longsor: { ic: '🪨', name: 'Longsor', desc: 'merosot 1 langkah (tidak melewati titik aman)' },
    air: { ic: '💧', name: 'Mata Air', desc: 'dapat 🎒 Bekal: melindungi 1× dari merosot' }
  };
  let AI_ACC = 0.62;
  const WIN_RULE = 'Tim pertama yang menancapkan bendera di <b>PUNCAK</b> menang. Jika batas ronde/waktu habis: <b>langkah tertinggi</b> menang (seri: titik aman tertinggi).';

  /* ------------------------------ Status ------------------------------ */
  const S = { mount: 'sedang', dur: 'auto', time: 30, weather: 'on', tiles: 'on', rebut: 'on', bonus: 'on', alur: 'on', diskusi: 'on' };
  let P = []; let H = 14; let POSS = []; let tileMap = {}; let PTS = [];
  let turn = 0; let round = 1; let phase = 'idle'; let gameSeq = 0; let tStart = 0;
  let weather = 'cerah'; let runN = 0; let curQ = null; let curAnswerer = null; let rebDecide = null; let decSel = 'kemah';
  let events = []; let askLog = []; let rebutLog = []; let wxHist = []; let lastEnd = ''; let winner = -1; let turnsPlayed = 0;
  let timeWarned = false; let lastRoundWarned = 0; let ck = 1; let vbScale = 1;

  const cur = () => P[turn];
  const maxRounds = () => (S.dur === 'auto' ? AUTO_ROUNDS[clamp(P.length, 2, 4)] : /^r\d+$/.test(S.dur) ? +S.dur.slice(1) : Infinity);
  const timeLimit = () => (/^t\d+$/.test(S.dur) ? +S.dur.slice(1) * 60000 : 0);
  const timeUp = () => !!timeLimit() && tStart > 0 && Date.now() - tStart >= timeLimit();
  const durText = () => (S.dur === 'auto' ? `<b>${maxRounds()} ronde</b> (±15–20 menit)` : /^r/.test(S.dur) ? `<b>${S.dur.slice(1)} ronde</b>` : `<b>${S.dur.slice(1)} menit</b>`);
  const askTime = () => (weather === 'kabut' ? Math.max(10, Math.round(S.time * 2 / 3)) : S.time);
  const gainParts = (n) => ({ bonus: S.bonus === 'on' && n >= 2 ? 1 : 0, wind: weather === 'angin' ? 1 : 0 });
  const nextGain = () => { const g = gainParts(runN + 1); return 1 + g.bonus + g.wind; };
  const slipTarget = (p) => { let to = p.safe; if (weather === 'hujan' && to > 0 && !POSS.includes(to)) to--; return to; };
  function ev(type, data = {}) { events.push({ type, round, ...data }); if (events.length > 500) events.shift(); }

  /* ------------------------------ Suara (WebAudio) ------------------------------ */
  const SND = (() => {
    let a = null; let nbuf = null;
    function ac() {
      if (!a) { try { a = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (a.state === 'suspended') a.resume().catch(() => {});
      return a;
    }
    function nb() { if (!nbuf) { const len = a.sampleRate * 2; nbuf = a.createBuffer(1, len, a.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; } return nbuf; }
    function tone(f, d, type = 'square', v = 0.05, delay = 0, f2 = null) {
      if (QC.muted) return; const c = ac(); if (!c) return;
      const t = c.currentTime + Math.max(0, delay); const o = c.createOscillator(); const g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
    }
    function noise(d, v, delay = 0, ft = 'lowpass', f = 1000, f2 = null, qv = 0.7) {
      if (QC.muted) return; const c = ac(); if (!c) return;
      const t = c.currentTime + Math.max(0, delay); const s = c.createBufferSource(); s.buffer = nb();
      const fl = c.createBiquadFilter(); fl.type = ft; fl.Q.value = qv; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
      const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(fl).connect(g).connect(c.destination); s.start(t, Math.random() * 0.3, d + 0.05);
    }
    const bell = (f, d, v, dl) => { tone(f, d, 'sine', v, dl); tone(f * 2.76, d * 0.5, 'sine', v * 0.25, dl); };
    return {
      ac,
      // panggilan ala yodel untuk awal giliran
      horn() { tone(392, 0.16, 'triangle', 0.06); tone(784, 0.2, 'triangle', 0.05, 0.14); tone(523, 0.16, 'triangle', 0.05, 0.32); tone(1047, 0.3, 'triangle', 0.045, 0.46); },
      step() { noise(0.07, 0.16, 0, 'bandpass', 1400, null, 2.5); tone(170, 0.06, 'sine', 0.08, 0, 110); },
      climb() { [523, 659, 784].forEach((f, i) => tone(f, 0.14, 'triangle', 0.06, i * 0.07)); },
      slip() { tone(1200, 0.75, 'sine', 0.06, 0, 160); noise(0.7, 0.22, 0.05, 'bandpass', 2400, 400, 1.2); tone(300, 0.3, 'sawtooth', 0.04, 0.4, 120); },
      thud() { noise(0.25, 0.4, 0, 'lowpass', 700, 80); tone(90, 0.25, 'sine', 0.3, 0, 45); },
      camp() { [262, 330, 392, 523].forEach((f, i) => bell(f * 2, 0.7, 0.05, i * 0.09)); noise(0.18, 0.12, 0, 'highpass', 4500); },
      rope() { noise(0.35, 0.2, 0, 'bandpass', 900, 3200, 3); [659, 880, 1175].forEach((f, i) => tone(f, 0.12, 'square', 0.035, 0.15 + i * 0.07)); },
      rock() { noise(1.0, 0.5, 0, 'lowpass', 900, 70); for (let i = 0; i < 5; i++) tone(120 + Math.random() * 90, 0.12, 'square', 0.05, 0.1 + i * 0.13, 60); },
      water() { [0, 0.12, 0.24].forEach((d, i) => tone(600 + i * 220, 0.12, 'sine', 0.07, d, 1500 + i * 300)); },
      wind() { noise(1.4, 0.18, 0, 'bandpass', 400, 1600, 1.5); },
      rain() { noise(1.3, 0.16, 0, 'highpass', 3000); noise(0.6, 0.25, 0.4, 'lowpass', 300, 60); },
      fog() { tone(220, 1.0, 'sine', 0.05, 0, 180); tone(330, 1.0, 'sine', 0.03, 0.2, 260); },
      sun() { [784, 988, 1175, 1568].forEach((f, i) => bell(f, 0.5, 0.05, i * 0.08)); },
      flag() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.07, i * 0.12)); noise(0.5, 0.15, 0.9, 'highpass', 3000); },
      rebut() { [880, 1175, 880, 1175].forEach((f, i) => tone(f, 0.08, 'square', 0.04, i * 0.09)); noise(0.2, 0.15, 0, 'bandpass', 2500, null, 3); },
      think() { [0, 0.18, 0.36].forEach((d) => tone(1200, 0.04, 'sine', 0.035, d)); },
      good() { [784, 988, 1175, 1568].forEach((f, i) => bell(f, 0.5, 0.06, i * 0.07)); },
      fail() { tone(392, 0.2, 'triangle', 0.08, 0, 300); tone(311, 0.32, 'triangle', 0.07, 0.17, 200); },
      nekat() { tone(330, 0.12, 'sawtooth', 0.045); tone(494, 0.12, 'sawtooth', 0.045, 0.1); tone(659, 0.25, 'square', 0.05, 0.2); noise(0.2, 0.12, 0.2, 'bandpass', 2000, null, 2); },
      click() { tone(720, 0.04, 'square', 0.03); }
    };
  })();

  /* ------------------------------ Simbol SVG (pendaki, tenda) ------------------------------ */
  const CLIMBER = `<g stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="0" cy="1" rx="21" ry="5" fill="rgba(0,0,0,.28)"/>
    <rect x="-26" y="-58" width="21" height="32" rx="7" fill="#9a6232" stroke="#2b1a0e" stroke-width="3"/>
    <rect x="-24" y="-53" width="17" height="8" rx="3" fill="#7a4a22"/>
    <rect x="-30" y="-30" width="26" height="9" rx="4.5" fill="#fef3c7" stroke="#2b1a0e" stroke-width="2.5"/>
    <path d="M-5 -22 L-11 -5" stroke="#2b1a0e" stroke-width="11"/><path d="M-5 -22 L-11 -5" stroke="#475569" stroke-width="6.5"/>
    <path d="M6 -22 L12 -6" stroke="#2b1a0e" stroke-width="11"/><path d="M6 -22 L12 -6" stroke="#475569" stroke-width="6.5"/>
    <rect x="-19" y="-8" width="14" height="8" rx="3.5" fill="#3b2414"/><rect x="7" y="-9" width="15" height="8" rx="3.5" fill="#3b2414"/>
    <rect x="-14" y="-55" width="29" height="37" rx="11" fill="currentColor" stroke="#2b1a0e" stroke-width="3"/>
    <path d="M-12 -30 H13" stroke="rgba(0,0,0,.25)" stroke-width="4"/>
    <path d="M2 -52 V-32" stroke="rgba(255,255,255,.5)" stroke-width="2"/>
    <path d="M-10 -53 L-4 -34" stroke="#7a4a22" stroke-width="3.5"/>
    <path d="M25 -52 L20 -2" stroke="#64748b" stroke-width="3"/>
    <path d="M9 -46 L22 -36" stroke="#2b1a0e" stroke-width="10"/><path d="M9 -46 L22 -36" stroke="currentColor" stroke-width="6"/>
    <circle cx="23" cy="-36" r="4.6" fill="#f1c29b" stroke="#2b1a0e" stroke-width="2"/>
    <circle cx="3" cy="-67" r="14" fill="#f1c29b" stroke="#2b1a0e" stroke-width="3"/>
    <path d="M-12 -67 A15 15 0 0 1 18 -67 Z" fill="currentColor" stroke="#2b1a0e" stroke-width="3"/>
    <path d="M-14 -67 H21" stroke="#2b1a0e" stroke-width="3.5"/>
    <path d="M-5 -78 Q2 -82 9 -79" stroke="rgba(255,255,255,.6)" stroke-width="2.5" fill="none"/>
    <rect x="12" y="-74" width="8" height="6" rx="2" fill="#fde047" stroke="#2b1a0e" stroke-width="2"/>
    <circle cx="8" cy="-61" r="2.1" fill="#2b1a0e"/><circle cx="14.5" cy="-61" r="2.1" fill="#2b1a0e"/>
    <path d="M7 -55 Q11 -51.5 15 -55" stroke="#2b1a0e" stroke-width="2" fill="none"/>
    <circle cx="3.5" cy="-57" r="2.6" fill="#fb7185" opacity=".55"/></g>`;
  const TENT = `<path d="M-38 0 L0 -40 L38 0 Z" fill="currentColor" stroke="#3b2414" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M-38 0 L0 -40 L-15 0 Z" fill="rgba(255,255,255,.22)"/><path d="M0 -40 L-9 0 H9 Z" fill="#3b2414" opacity=".85"/>
    <path d="M0 -40 V-49" stroke="#3b2414" stroke-width="3" stroke-linecap="round"/><path d="M-43 0 H43" stroke="#3b2414" stroke-width="3.5" stroke-linecap="round"/>`;
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <symbol id="pn-climber" viewBox="-40 -92 80 96" overflow="visible">${CLIMBER}</symbol>
    <symbol id="pn-tent" viewBox="-46 -52 92 56" overflow="visible">${TENT}</symbol></defs></svg>`);
  const climberSVG = (col, vb = '-40 -92 80 96') => `<svg viewBox="${vb}" aria-hidden="true"><use href="#pn-climber" x="-40" y="-92" width="80" height="96" style="color:${col}"/></svg>`;

  /* ------------------------------ Geometri jalur ------------------------------ */
  const NS = 'http://www.w3.org/2000/svg';
  const WP = [[330, 868], [1150, 772], [610, 640], [1110, 510], [760, 392], [960, 298], [860, 206], [890, 116]];
  function samplePts(n) {
    const seg = []; let tot = 0;
    for (let i = 0; i < WP.length - 1; i++) { const l = Math.hypot(WP[i + 1][0] - WP[i][0], WP[i + 1][1] - WP[i][1]); seg.push(l); tot += l; }
    const out = [];
    for (let k = 0; k <= n; k++) {
      let d = (tot * k) / n; let i = 0;
      while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
      const t = Math.min(1, d / seg[i]);
      out.push({ x: WP[i][0] + (WP[i + 1][0] - WP[i][0]) * t, y: WP[i][1] + (WP[i + 1][1] - WP[i][1]) * t });
    }
    return out;
  }
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // kontur gunung (untuk menaruh pohon di dalam lereng)
  const bez = (p0, p1, p2, p3, n) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; });
  const LEFT = [...bez([-40, 912], [200, 900], [420, 760], [560, 560], 24), [835, 122]];
  const RIGHT = [[945, 122], ...bez([1190, 520], [1320, 740], [1500, 880], [1660, 912], 24)];
  function edgeX(poly, y) { for (let i = 0; i < poly.length - 1; i++) { const a = poly[i]; const b = poly[i + 1]; if ((y - a[1]) * (y - b[1]) <= 0 && a[1] !== b[1]) return a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]); } return null; }
  function inside(x, y, m = 0) { const l = edgeX(LEFT, y); const r = edgeX(RIGHT, y); return l != null && r != null && x > l + m && x < r - m; }
  function nearTrail(x, y, d) {
    for (let i = 0; i < WP.length - 1; i++) {
      const [ax, ay] = WP[i]; const [bx, by] = WP[i + 1]; const dx = bx - ax; const dy = by - ay;
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
      if (Math.hypot(ax + dx * t - x, ay + dy * t - y) < d) return true;
    }
    return false;
  }

  /* ------------------------------ Lukisan gunung (SVG) ------------------------------ */
  const svg = $('mtn');
  function tree(x, y, s, R) {
    const g = ['#1f7a3a', '#2a8f44', '#237a3f', '#3a9a4a', '#18692f'];
    if (y < 650 && R() < 0.6) { // cemara di lereng atas
      const c = g[(R() * 5) | 0];
      return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})"><rect x="-3" y="-12" width="6" height="14" fill="#5b3a1e"/><path d="M0 -62 L18 -26 H10 L22 -8 H-22 L-10 -26 H-18 Z" fill="${c}" stroke="#123d20" stroke-width="2.5" stroke-linejoin="round"/></g>`;
    }
    const c1 = g[(R() * 5) | 0]; const c2 = g[(R() * 5) | 0];
    return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})"><path d="M-3 0 Q-2 -22 0 -30 Q2 -22 3 0 Z" fill="#6b4423" stroke="#3b2414" stroke-width="2"/>` +
      `<circle cx="-13" cy="-36" r="15" fill="${c1}" stroke="#123d20" stroke-width="2.5"/><circle cx="13" cy="-38" r="15" fill="${c2}" stroke="#123d20" stroke-width="2.5"/><circle cx="0" cy="-50" r="17" fill="${c1}" stroke="#123d20" stroke-width="2.5"/>` +
      `<circle cx="-5" cy="-55" r="5" fill="rgba(255,255,255,.18)"/></g>`;
  }
  function scenerySVG() {
    const R = rng(11); let trees = ''; const pts = [];
    for (let i = 0; i < 900 && pts.length < 60; i++) {
      const y = 440 + R() * 470; const x = -60 + R() * 1740;
      if (!inside(x, y - 6, 16) || nearTrail(x, y, 64) || nearTrail(x, y - 45, 50)) continue;
      if (pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 38)) continue;
      pts.push([x, y]);
    }
    pts.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => (trees += tree(x, y, 0.5 + ((y - 440) / 470) * 0.75, R)));
    // semak di kaki gunung (latar depan)
    let bush = ''; const R2 = rng(5);
    for (let x = -900; x < 2600; x += 70 + R2() * 60) { if (Math.abs(x - 330) < 120) continue; const s = 0.7 + R2() * 0.6; bush += `<g transform="translate(${x.toFixed(0)} 918) scale(${s.toFixed(2)})"><circle cx="-14" cy="-10" r="16" fill="#2d8a3e"/><circle cx="10" cy="-14" r="19" fill="#36a04a"/><circle cx="30" cy="-6" r="13" fill="#2a7f39"/></g>`; }
    return `<defs>
        <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a7560"/><stop offset=".26" stop-color="#7b6a52"/><stop offset=".44" stop-color="#5f7d43"/><stop offset=".62" stop-color="#3f8a3c"/><stop offset="1" stop-color="#2f7a33"/></linearGradient>
        <linearGradient id="gFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb9c9"/><stop offset="1" stop-color="#a9cfc4"/></linearGradient>
        <linearGradient id="gMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f9f7c"/><stop offset="1" stop-color="#6fae86"/></linearGradient>
        <radialGradient id="gCr" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fb923c"/><stop offset=".55" stop-color="#9a3412"/><stop offset="1" stop-color="#3b2a20"/></radialGradient>
        <clipPath id="clipM"><path d="M-40 912 C200 900 420 760 560 560 L835 122 Q890 108 945 122 L1190 520 C1320 740 1500 880 1660 912 Z"/></clipPath>
      </defs>
      <g class="far">
        <path d="M-1700 915 L-1700 610 C-1300 540 -1000 580 -700 530 C-400 480 -200 600 120 560 C400 525 520 600 700 590 C1000 570 1250 470 1450 430 C1560 410 1640 440 1720 470 C1900 540 2100 560 2400 520 C2700 490 3000 560 3300 540 L3300 915 Z" fill="url(#gFar)"/>
        <path d="M1380 470 L1520 300 Q1545 290 1570 300 L1720 480 Z" fill="#9cc2cf"/>
        <path d="M-1700 915 L-1700 720 C-1300 660 -900 700 -500 670 C-200 650 0 720 250 700 C500 680 700 740 900 730 C1200 715 1400 650 1700 680 C2000 710 2400 660 3300 700 L3300 915 Z" fill="url(#gMid)" opacity=".95"/>
      </g>
      <path class="mbody" d="M-40 912 C200 900 420 760 560 560 L835 122 Q890 108 945 122 L1190 520 C1320 740 1500 880 1660 912 Z" fill="url(#gM)" stroke="#3b3024" stroke-width="5" stroke-linejoin="round"/>
      <g clip-path="url(#clipM)">
        <path d="M-60 930 L-60 640 Q120 600 300 640 Q420 560 520 600 Q620 540 720 590 Q820 530 940 575 Q1060 520 1160 590 Q1260 560 1360 640 Q1500 600 1700 650 L1700 930 Z" fill="#3c8c3d" opacity=".9"/>
        <path d="M-60 930 L-60 760 Q200 720 420 770 Q640 700 860 760 Q1080 700 1300 770 Q1500 730 1700 770 L1700 930 Z" fill="#2f7d35" opacity=".85"/>
        <path d="M945 122 L1190 520 C1320 740 1500 880 1660 912 L1180 912 C1060 700 990 420 945 122 Z" fill="rgba(0,0,0,.13)"/>
        <path d="M640 430 Q690 390 720 330 M700 480 Q760 430 790 360 M1010 300 Q1040 360 1090 410 M1060 430 Q1100 470 1150 500 M800 250 Q830 200 850 160" stroke="rgba(255,255,255,.14)" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M655 470 Q700 420 735 360 M1035 330 Q1070 390 1120 440" stroke="rgba(0,0,0,.12)" stroke-width="6" fill="none" stroke-linecap="round"/>
      </g>
      <ellipse cx="890" cy="124" rx="50" ry="9" fill="url(#gCr)" stroke="#2b1f17" stroke-width="3"/>
      <g class="smoke"><circle class="sm s1" cx="880" cy="96" r="16"/><circle class="sm s2" cx="905" cy="90" r="20"/><circle class="sm s3" cx="890" cy="78" r="13"/></g>
      <g class="trees">${trees}</g>
      <rect x="-2000" y="905" width="5600" height="200" fill="#2f7a33"/>
      <g class="bushes">${bush}</g>`;
  }
  function buildMountain() {
    PTS = samplePts(H);
    const trail = `<path d="M${WP.map((p) => p.join(' ')).join(' L')}" fill="none" stroke="#6b5233" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>` +
      `<path d="M${WP.map((p) => p.join(' ')).join(' L')}" fill="none" stroke="#e7cf9c" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>` +
      `<path d="M${WP.map((p) => p.join(' ')).join(' L')}" fill="none" stroke="#fff6dc" stroke-width="3" stroke-dasharray="3 16" stroke-linecap="round" opacity=".8"/>`;
    // tali pintas digambar di belakang langkah
    let ropes = '';
    Object.keys(tileMap).forEach((k) => {
      if (tileMap[k] !== 'tali') return; const s = +k; const a = PTS[s]; const b = PTS[Math.min(H, s + 2)];
      const mx = (a.x + b.x) / 2 + (a.x < b.x ? -30 : 30); const my = (a.y + b.y) / 2 - 10;
      ropes += `<g class="rope"><path d="M${a.x} ${a.y - 6} Q${mx} ${my} ${b.x} ${b.y - 6}" fill="none" stroke="#5b3a12" stroke-width="8" stroke-linecap="round"/><path d="M${a.x} ${a.y - 6} Q${mx} ${my} ${b.x} ${b.y - 6}" fill="none" stroke="#e0b25a" stroke-width="4.5" stroke-dasharray="9 5" stroke-linecap="round"/>` +
        `<circle cx="${b.x}" cy="${b.y - 6}" r="6" fill="#94a3b8" stroke="#334155" stroke-width="2.5"/></g>`;
    });
    let steps = '';
    PTS.forEach((pt, k) => {
      const x = pt.x.toFixed(1); const y = pt.y.toFixed(1); const isPos = POSS.includes(k); const tk = tileMap[k];
      let s = '';
      if (k === 0) {
        s += `<g transform="translate(${pt.x - 112} ${pt.y + 4})"><rect x="-34" y="-46" width="68" height="46" fill="#a0622d" stroke="#3b2414" stroke-width="3.5"/><path d="M-44 -44 L0 -78 L44 -44 Z" fill="#c2410c" stroke="#3b2414" stroke-width="3.5" stroke-linejoin="round"/><rect x="-10" y="-28" width="20" height="28" fill="#5b3a1e"/><rect x="14" y="-36" width="14" height="12" fill="#fde68a" stroke="#3b2414" stroke-width="2"/>` +
          `<g transform="translate(-58 0)"><rect x="-3" y="-44" width="6" height="44" fill="#5b3a1e"/><rect x="-38" y="-58" width="76" height="22" rx="5" fill="#fef3c7" stroke="#5b3a1e" stroke-width="3"/><text x="0" y="-41.5" class="sign">BASECAMP</text></g></g>`;
      }
      if (k === H) {
        s += `<g transform="translate(${pt.x + 62} ${pt.y + 8})"><rect x="-3" y="-60" width="6" height="60" fill="#5b3a1e"/><rect x="-42" y="-74" width="84" height="24" rx="6" fill="#fde047" stroke="#7a4a12" stroke-width="3"/><text x="0" y="-56.5" class="sign">PUNCAK</text></g>`;
      }
      if (isPos) {
        const n = POSS.indexOf(k) + 1;
        s += `<g transform="translate(${pt.x + 58} ${pt.y - 2})"><use href="#pn-tent" x="-46" y="-52" width="92" height="56" style="color:#f97316"/></g>` +
          `<g transform="translate(${pt.x + 58} ${pt.y - 52})"><rect x="-30" y="-24" width="60" height="22" rx="5" fill="#bbf7d0" stroke="#166534" stroke-width="3"/><text x="0" y="-7.5" class="sign pos">POS ${n}</text></g>`;
      }
      if (tk === 'longsor') s += `<g transform="translate(${pt.x + 4} ${pt.y - 40})" class="boulders"><ellipse cx="-16" cy="0" rx="14" ry="11" fill="#78716c" stroke="#292524" stroke-width="3"/><ellipse cx="10" cy="-6" rx="17" ry="13" fill="#a8a29e" stroke="#292524" stroke-width="3"/><ellipse cx="2" cy="10" rx="9" ry="7" fill="#57534e" stroke="#292524" stroke-width="2.5"/><path d="M-30 18 L-18 12 L-24 4" stroke="#292524" stroke-width="2.5" fill="none"/></g>`;
      if (tk === 'air') s += `<g transform="translate(${pt.x + 44} ${pt.y + 2})"><ellipse cx="0" cy="0" rx="26" ry="8" fill="#38bdf8" stroke="#0c4a6e" stroke-width="3"/><ellipse cx="-6" cy="-2" rx="10" ry="2.5" fill="#e0f2fe" opacity=".85"/></g>`;
      s += `<ellipse cx="${x}" cy="${(pt.y + 5).toFixed(1)}" rx="40" ry="12" fill="#57483a"/><ellipse cx="${x}" cy="${y}" rx="38" ry="10" fill="${isPos ? '#bde3a5' : k === 0 || k === H ? '#f3dfb0' : '#c9b48f'}" stroke="#4a3b2c" stroke-width="2.5"/>`;
      const lbl = k === 0 ? '' : k === H ? '🚩' : String(k);
      if (lbl) s += `<g class="num${isPos ? ' pos' : ''}"><circle cx="${(pt.x - 18).toFixed(1)}" cy="${(pt.y + 26).toFixed(1)}" r="14"/><text x="${(pt.x - 18).toFixed(1)}" y="${(pt.y + 31.5).toFixed(1)}">${lbl}</text></g>`;
      if (tk) s += `<g class="tile t-${tk}"><circle cx="${(pt.x + 16).toFixed(1)}" cy="${(pt.y + 26).toFixed(1)}" r="15"/><text x="${(pt.x + 16).toFixed(1)}" y="${(pt.y + 32.5).toFixed(1)}">${TILES[tk].ic}</text></g>`;
      steps += `<g class="step" data-k="${k}">${s}</g>`;
    });
    const top = PTS[H];
    svg.innerHTML = scenerySVG() + `<g class="trail">${trail}</g>${ropes}<g class="steps">${steps}</g><g id="camps"></g>` +
      `<g id="winFlag" class="winflag" transform="translate(${top.x} ${top.y + 2})" opacity="0"><g class="wf-in"><rect x="-4" y="-104" width="8" height="104" rx="3" fill="#e5e7eb" stroke="#334155" stroke-width="2.5"/><circle cx="0" cy="-106" r="7" fill="#fde047" stroke="#7a4a12" stroke-width="2.5"/>` +
      `<path class="wf-cloth" d="M4 -100 Q40 -112 76 -98 Q60 -80 76 -60 Q40 -72 4 -60 Z" fill="#ef4444" stroke="#1f2937" stroke-width="3" stroke-linejoin="round"/><text class="wf-txt" x="40" y="-73">★</text></g></g>` +
      `<g id="climbers">${P.map((p) => `<g class="climber" id="cl${p.id}" data-t="${p.id}"><g class="cl-sc"><ellipse class="cl-glow" cx="0" cy="2" rx="30" ry="9" fill="${p.color}"/><g class="cl-spin"><g class="cl-flip"><use href="#pn-climber" x="-40" y="-92" width="80" height="96" style="color:${p.color}"/></g>` +
        `<g class="cl-tag"><circle cx="0" cy="-104" r="13" fill="${p.color}" stroke="#fff" stroke-width="3"/><text x="0" y="-98.5">${p.ai ? '🤖' : p.id + 1}</text></g><text class="cl-bekal" x="-24" y="-74">🎒</text></g></g></g>`).join('')}</g>`;
    P.forEach((p) => (p.face = 1));
    layout();
  }

  /* ------------------------------ Posisi pendaki ------------------------------ */
  function cpos(p, step) { const pt = PTS[step] || PTS[0]; const n = P.length; return { x: pt.x + (p.id - (n - 1) / 2) * 31 * ck, y: pt.y + (p.id % 2 ? 4 : 0) }; }
  const tf = (o) => `translate(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px)`;
  function setFace(p, dx) {
    if (Math.abs(dx) < 1) return; const f = dx < 0 ? -1 : 1; if (p.face === f) return; p.face = f;
    const el = $('cl' + p.id); const fl = el && el.querySelector('.cl-flip'); if (fl) fl.setAttribute('transform', f < 0 ? 'scale(-1 1)' : '');
  }
  function faceFor(p) { const a = PTS[p.pos]; const b = PTS[Math.min(H, p.pos + 1)]; const c = PTS[Math.max(0, p.pos - 1)]; setFace(p, b && b !== a ? b.x - a.x : a.x - c.x); }
  function renderClimbers() {
    const inPlay = !['idle', 'brief', 'over'].includes(phase);
    P.forEach((p) => {
      const el = $('cl' + p.id); if (!el) return;
      if (!p.anim) { el.style.transform = tf(cpos(p, p.pos)); faceFor(p); }
      el.classList.toggle('on', inPlay && p.id === turn);
      el.classList.toggle('bekal', !!p.bekal);
      el.classList.toggle('win', phase === 'over' && p.id === winner);
    });
    // pendaki aktif digambar paling depan
    const box = $('climbers'); const a = $('cl' + turn); if (box && a && box.lastElementChild !== a && inPlay) box.appendChild(a);
  }
  function renderCamps() {
    const box = $('camps'); if (!box) return;
    box.innerHTML = P.map((p) => {
      if (!(p.safe > 0) || p.safe >= H) return '';
      const pt = PTS[p.safe]; const x = pt.x - 52 - p.id * 13; const y = pt.y - 4 - (p.id % 2) * 3;
      return `<g class="camp" id="cp${p.id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(.5)"><use href="#pn-tent" x="-46" y="-52" width="92" height="56" style="color:${p.color}"/><path d="M0 -49 V-74" stroke="#3b2414" stroke-width="4"/><path d="M0 -74 L26 -66 L0 -58 Z" fill="${p.color}" stroke="#1f2937" stroke-width="3"/></g>`;
    }).join('');
  }
  function scr(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }
  function climberPt(p) { const el = $('cl' + p.id); const u = el && el.querySelector('use'); return u ? scr(u) : { x: innerWidth / 2, y: innerHeight / 2, w: 40, h: 60 }; }

  async function climbTo(p, to, opt = {}) {
    const gid = gameSeq; const el = $('cl' + p.id); const from = p.pos; if (!el || to === from) return;
    const dir = to > from ? 1 : -1; p.anim = true;
    for (let s = from; s !== to; s += dir) {
      const a = cpos(p, s); const b = cpos(p, s + dir); setFace(p, b.x - a.x);
      const hop = opt.rope ? 4 : 30; const dur = opt.rope ? 240 : 400;
      if (!RM()) el.animate([{ transform: tf(a) }, { transform: `translate(${((a.x + b.x) / 2).toFixed(1)}px, ${(Math.min(a.y, b.y) - hop).toFixed(1)}px)`, offset: 0.55 }, { transform: tf(b) }], { duration: Math.max(16, dur * TS), easing: 'ease-in-out' });
      el.style.transform = tf(b);
      await sleep(dur);
      if (gid !== gameSeq) { p.anim = false; return; }
      p.pos = s + dir; p.maxPos = Math.max(p.maxPos, p.pos); SND.step(); renderTeams();
    }
    p.anim = false; renderClimbers();
  }
  async function slideTo(p, to, opt = {}) {
    const gid = gameSeq; const el = $('cl' + p.id); const from = p.pos; if (!el || to >= from) return;
    const spin = el.querySelector('.cl-spin'); const pts = []; for (let s = from; s >= to; s--) pts.push(cpos(p, s));
    const dur = 260 * (pts.length - 1) + 120; p.anim = true;
    SND.slip(); const c0 = climberPt(p);
    FX.floatText(c0.x, c0.y - c0.h * 0.6, opt.rock ? 'AWAS BATU!' : 'WAAA!', '#ffffff', clamp(c0.h * 0.45, 22, 40));
    FX.burst(c0.x, c0.y, { emojis: opt.rock ? ['🪨', '💨', '💥'] : ['💨', '💥', '💦'], count: PN(9), spread: 70, size: 24 });
    FX.shake($('scene'), 7, 420);
    if (!RM()) {
      el.animate(pts.map((o, i) => ({ transform: tf(o), offset: i / (pts.length - 1) })), { duration: Math.max(16, dur * TS), easing: 'cubic-bezier(.45,0,.75,1)' });
      const turns = Math.max(1, Math.round((pts.length - 1) / 2));
      spin.animate([{ transform: 'translate(0px,-44px) rotate(0deg) translate(0px,44px)' }, { transform: `translate(0px,-44px) rotate(${-360 * turns}deg) translate(0px,44px)` }], { duration: Math.max(16, dur * TS), easing: 'ease-in' });
    }
    el.style.transform = tf(pts[pts.length - 1]);
    await sleep(dur);
    if (gid !== gameSeq) { p.anim = false; return; }
    p.pos = to; p.anim = false; renderAll(); SND.thud();
    const c1 = climberPt(p); FX.burst(c1.x, c1.y + c1.h * 0.3, { emojis: ['💨', '💫', '⭐'], count: PN(10), spread: 70, size: 22, gravity: -20 });
    if (!RM()) spin.animate([{ transform: 'translateY(0px)' }, { transform: 'translateY(-12px) rotate(-8deg)' }, { transform: 'translateY(0px) rotate(4deg)' }, { transform: 'translateY(0px)' }], { duration: Math.max(16, 420 * TS) });
    await sleep(480);
  }

  /* ------------------------------ Tata letak responsif ------------------------------ */
  const scene = $('scene'); const stage = $('stage');
  function layout() {
    const W = scene.clientWidth; const Hh = scene.clientHeight; if (!W || !Hh) return;
    const a = W / Hh; const top = 4; const bot = 916; const bh = bot - top; const bw = 1010; const a0 = bw / bh;
    let vx; let vy; let vw; let vh;
    if (a >= a0) { vh = bh; vw = vh * a; vx = 745 - vw / 2; vy = top; } else { vw = bw; vh = vw / a; vx = 240; vy = bot - vh; }
    svg.setAttribute('viewBox', `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);
    vbScale = W / vw;
    ck = clamp(48 / (96 * vbScale), 1, 1.9);
    svg.querySelectorAll('.cl-sc').forEach((g) => g.setAttribute('transform', `scale(${ck.toFixed(3)})`));
    stage.classList.toggle('phone', innerWidth < 700);
    renderClimbers(); placeDecide();
  }
  let relayoutQ = false;
  function queueRelayout() { if (!relayoutQ) { relayoutQ = true; requestAnimationFrame(() => { relayoutQ = false; layout(); }); } }
  addEventListener('resize', queueRelayout);
  if (window.ResizeObserver) new ResizeObserver(queueRelayout).observe(scene);

  /* ------------------------------ Tim & anggota ------------------------------ */
  function parseMembers(txt) {
    const s = String(txt || '').trim(); if (!s) return [];
    if (/^\d{1,2}$/.test(s)) { const n = clamp(+s, 1, 12); return Array.from({ length: n }, (_, i) => `Anggota ${i + 1}`); }
    return s.split(/[,;\n]+/).map((x) => x.trim().slice(0, 18)).filter(Boolean).slice(0, 12);
  }
  const peekAnswerer = (p) => (p && p.members && p.members.length ? p.members[p.mi % p.members.length] : null);
  function takeAnswerer(p) { const m = peekAnswerer(p); if (m) p.mi = (p.mi + 1) % p.members.length; return m; }

  /* ------------------------------ HUD ------------------------------ */
  function setText(el, v) { v = String(v); if (el && el.textContent !== v) el.textContent = v; }
  function setHTML(el, v) { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } }
  const clock = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const nm = (p) => `<b style="color:${p.color}">${esc(p.name)}</b>`;
  function buildTeams() {
    $('teams').innerHTML = P.map((p, i) => `<div class="tcard" id="tc${i}" style="--pc:${p.color}">
      <div class="tc-head"><span class="tc-av">${p.ai ? '🤖' : p.avatar}</span><b class="tc-name">${esc(p.name)}</b><kbd>${i + 1}</kbd></div>
      <div class="tc-alt"><span class="tc-num"><b id="tp${i}">0</b><small>/${H}</small></span><span class="tc-chips" id="tx${i}"></span></div>
      <div class="tc-bar"><i class="cur" id="tbc${i}"></i><i class="safe" id="tbs${i}"></i>${POSS.map((s) => `<u style="left:${((s / H) * 100).toFixed(1)}%"></u>`).join('')}</div>
      <div class="tc-sub" id="ts${i}"></div></div>`).join('');
    $('teams').dataset.n = P.length;
  }
  function renderTeams() {
    const inPlay = !['idle', 'brief', 'over'].includes(phase);
    P.forEach((p, i) => {
      const c = $('tc' + i); if (!c) return;
      c.classList.toggle('turn', inPlay && i === turn);
      c.classList.toggle('win', phase === 'over' && i === winner);
      setText($('tp' + i), p.pos);
      $('tbc' + i).style.transform = `scaleX(${(p.pos / H).toFixed(3)})`;
      $('tbs' + i).style.transform = `scaleX(${(p.safe / H).toFixed(3)})`;
      const chips = (p.bekal ? '<span class="chip bk" title="Bekal: melindungi 1× dari merosot">🎒</span>' : '') +
        (inPlay && i === turn && runN > 0 ? `<span class="chip run" title="Benar beruntun di giliran ini">🔥${runN}</span>` : '') +
        (p.steals ? `<span class="chip st" title="Rebutan berhasil">⚡${p.steals}</span>` : '');
      setHTML($('tx' + i), chips);
      const ans = inPlay && i === turn && !p.ai ? curAnswerer || (peekAnswerer(p) && peekAnswerer(p).name) : null;
      setHTML($('ts' + i), `<span class="sv" title="Titik aman (kemah terakhir)">⛺ aman ${p.safe}</span>${ans ? `<span class="an">🙋 ${esc(ans)}</span>` : p.ai ? '<span class="an ai">🤖 komputer</span>' : ''}`);
    });
  }
  function renderInfo() {
    const cap = maxRounds();
    setText($('roundNo'), cap === Infinity ? round : Math.min(round, cap)); setText($('roundMax'), cap === Infinity ? '' : '/' + cap);
    const lim = timeLimit(); const el = tStart && !['idle', 'brief'].includes(phase) ? Date.now() - tStart : 0;
    setText($('clockLbl'), lim ? 'SISA WAKTU' : 'WAKTU'); setText($('clockNo'), lim ? clock(lim - el) : clock(el));
    $('clockNo').parentElement.classList.toggle('warn', !!lim && lim - el < 60000 && tStart > 0 && phase !== 'over');
    $('roundNo').parentElement.parentElement.classList.toggle('warn', cap !== Infinity && round >= cap && !['idle', 'brief', 'over'].includes(phase));
    const w = WEATHER[weather]; setHTML($('wxNo'), `${w.ic}<i>${w.name}</i>`);
  }
  function hintText() {
    const p = cur(); if (!p) return '';
    switch (phase) {
      case 'brief': return '🏕️ Baca panduan singkat, lalu klik <b>MULAI MENDAKI</b> (Spasi).';
      case 'turn': return p.ai ? `🤖 ${esc(p.name)} bersiap…` : `${nm(p)} bersiap menjawab${peekAnswerer(p) ? ` — penjawab: <b>${esc(peekAnswerer(p).name)}</b>` : ''}. Klik <b>JAWAB SOAL</b> / Spasi.`;
      case 'quiz': return `❓ ${nm(p)} sedang menjawab… <span class="kb">benar = naik ${nextGain()} langkah</span>`;
      case 'climb': return '🧗 Mendaki…';
      case 'camp': return '⛺ Mendirikan kemah…';
      case 'decide': return `${nm(p)}: <b>🧗 Lanjut Nekat</b> atau <b>⛺ Berkemah</b>? <span class="kb">(L / K, panah + Enter)</span>`;
      case 'slip': return '💥 Merosot!';
      case 'rebut': return '⚡ Soal Rebutan! Tim lain cepat klik tombol timnya.';
      case 'ai': return `🤖 ${esc(p.name)} sedang berpikir…`;
      case 'over': return '🏁 Pendakian selesai!';
      default: return '';
    }
  }
  const B_ = (act, cls, ic, label, key) => `<button class="cbtn ${cls}" data-act="${act}"><span class="ic">${ic}</span><span class="lb">${label}</span>${key ? `<small>${key}</small>` : ''}</button>`;
  function renderHud() {
    const p = cur();
    setHTML($('turnChip'), p && phase !== 'idle' ? `<span class="tc" style="--pc:${p.color}"><span class="tc-av2">${p.ai ? '🤖' : p.avatar}</span><span><small>${phase === 'over' ? 'SELESAI' : 'GILIRAN'}</small><b>${esc(p.name)}</b></span></span>` : '');
    setHTML($('hint'), hintText());
    let acts = '';
    if (phase === 'turn' && p && !p.ai) acts = B_('ask', 'main', '❓', 'JAWAB SOAL', 'SPASI');
    else if (phase === 'over') acts = B_('again', 'main', '🔁', 'MAIN LAGI', '');
    setHTML($('acts'), acts);
    $('acts').querySelectorAll('[data-act]').forEach((b) => (b.onclick = (e) => { e.currentTarget.blur(); if (b.dataset.act === 'ask') askQuestion(); else newGame(); }));
    renderInfo();
  }
  function renderAll() { renderTeams(); renderClimbers(); renderHud(); }

  /* ------------------------------ Kartu keputusan ------------------------------ */
  function showDecide(p) {
    phase = 'decide'; decSel = 'kemah';
    const risk = p.bekal ? p.pos : slipTarget(p); const g = nextGain(); const gp = gainParts(runN + 1);
    const why = [gp.bonus ? '🔥 bonus nekat' : '', gp.wind ? '💨 angin' : ''].filter(Boolean).join(' + ');
    const safeNow = p.pos === p.safe;
    $('decide').innerHTML = `<div class="dc-card" style="--pc:${p.color}">
      <div class="dc-top"><span class="dc-ok">✅ BENAR!</span><span>${nm(p)} di langkah <b class="big">${p.pos}</b><small>/${H}</small></span></div>
      <div class="dc-info">
        <div class="dc-risk ${safeNow ? 'ok' : ''}">${safeNow ? '🛡️ Langkah ini sudah <b>aman</b> (Pos Aman) — tidak ada yang hilang jika salah' : p.bekal ? `🎒 Bekal melindungimu: jika salah tetap di langkah <b>${p.pos}</b>` : `⚠️ Jika salah: merosot ke langkah <b>${risk}</b>${weather === 'hujan' && risk < p.safe ? ' (🌧️ licin!)' : ''}`}</div>
        <div class="dc-gain">🧗 Soal berikutnya: naik <b>+${g}</b>${why ? ` <small>(${why})</small>` : ''}</div>
      </div>
      <div class="dc-btns">
        <button class="dc-btn go" data-d="lanjut"><span class="ic">🧗</span><b>LANJUT NEKAT!</b><em>jawab soal lagi</em><kbd>L</kbd></button>
        <button class="dc-btn camp" data-d="kemah"><span class="ic">⛺</span><b>BERKEMAH</b><em>simpan langkah ${p.pos}</em><kbd>K</kbd></button>
      </div></div>`;
    $('decide').hidden = false;
    $('decide').querySelectorAll('[data-d]').forEach((b) => (b.onclick = (e) => { e.currentTarget.blur(); decide(b.dataset.d); }));
    markSel(); placeDecide(); renderAll();
  }
  function markSel() { $('decide').querySelectorAll('[data-d]').forEach((b) => b.classList.toggle('sel', b.dataset.d === decSel)); }
  function placeDecide() {
    const d = $('decide'); if (d.hidden || !P[turn]) return;
    const sc = scene.getBoundingClientRect(); const c = climberPt(P[turn]); const narrow = innerWidth < 700;
    d.classList.toggle('right', !narrow && c.x < sc.left + sc.width / 2);
    d.classList.toggle('top', narrow && c.y > sc.top + sc.height * 0.45);
  }
  function hideDecide() { $('decide').hidden = true; }
  async function decide(c) {
    if (phase !== 'decide' || QC.isBusy()) return false; const p = cur(); if (!p || p.ai) return false;
    const gid = gameSeq; hideDecide();
    if (c === 'lanjut') {
      p.nekat++; ev('lanjut', { team: p.id, pos: p.pos }); SND.nekat();
      const cp = climberPt(p); FX.floatText(cp.x, cp.y - cp.h * 0.7, 'NEKAT! 🔥', '#fde047', clamp(cp.h * 0.4, 22, 38));
      phase = 'turn'; renderAll(); await sleep(450);
      if (gid === gameSeq && phase === 'turn') askQuestion();
    } else {
      await bankCamp(p, gid); if (gid === gameSeq && phase !== 'over') endTurn();
    }
    return true;
  }
  async function bankCamp(p, gid) {
    phase = 'camp'; p.safe = p.pos; p.camps++; ev('camp', { team: p.id, pos: p.pos }); renderCamps(); renderAll(); SND.camp();
    const cp = climberPt(p); FX.floatText(cp.x, cp.y - cp.h * 0.7, '⛺ AMAN!', '#bbf7d0', clamp(cp.h * 0.4, 22, 38));
    FX.burst(cp.x, cp.y, { emojis: ['⛺', '✨', '⭐'], count: PN(8), spread: 70, size: 22 });
    const t = $('cp' + p.id); if (t && !RM()) t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
    await sleep(900);
  }

  /* ------------------------------ Soal & Rebutan ------------------------------ */
  const rebutCands = (p) => (S.rebut === 'on' ? P.filter((o) => o !== p && !o.ai) : []);
  function decorateAsk(p, m, rebutable) {
    const o = [...document.querySelectorAll('.qc-overlay.qc-ask')].pop(); if (!o) return;
    if (rebutable) o.classList.add('pn-rebutable');
    const head = o.querySelector('.qc-ask-head'); if (!head) return;
    const el = document.createElement('div'); el.className = 'pn-answerer'; el.style.setProperty('--pc', p.color);
    const w = weather !== 'cerah' ? `<span class="wx">${WEATHER[weather].ic} ${WEATHER[weather].name}: ${WEATHER[weather].short}</span>` : '';
    el.innerHTML = (m ? `<span class="who">🙋 Penjawab: <b>${esc(m.name)}</b></span><span class="dis">${S.diskusi === 'off' ? '🤫 Jawab sendiri — tanpa diskusi' : '💬 Boleh diskusi dulu dengan tim'}</span>`
      : `<span class="who">👥 Dijawab bersama <b>${esc(p.name)}</b></span><span class="dis">${S.diskusi === 'off' ? '🤫 Tanpa diskusi' : '💬 Boleh berdiskusi'}</span>`) + w;
    head.insertAdjacentElement('afterend', el);
  }
  async function quiz(p) {
    const q = QC.nextQuestion(); curQ = q;
    const m = takeAnswerer(p); curAnswerer = m ? m.name : null; renderTeams();
    const g = nextGain();
    const pr = QC.ask(q, { player: { name: p.name, avatar: p.avatar, color: p.color }, time: askTime(), badge: `🧗 Benar = naik ${g} langkah` });
    decorateAsk(p, m, rebutCands(p).length > 0);
    const r = await pr; curQ = null; curAnswerer = null; const ok = !!r.correct;
    p.asked++; if (ok) p.correct++; if (m) { m.asked++; if (ok) m.correct++; }
    askLog.push({ team: p.id, member: m ? m.name : null, ok, w: weather, t: askTime() }); if (askLog.length > 500) askLog.shift();
    return { ok, q };
  }
  async function rebutan(active, q, gid) {
    const cands = rebutCands(active); if (!q || phase === 'over') return null;
    if (!cands.length) { QC.toast(`💡 Jawaban benar: <b>${q.correct}. ${esc(q['option' + q.correct])}</b>`); return null; }
    phase = 'rebut'; renderHud(); SND.rebut();
    const waitMs = Math.max(150, 8000 * TS);
    const pick = await QC.modal({
      cls: 'pn-rebut', icon: '⚡', title: 'REBUTAN! Siapa paling cepat?',
      html: `<p class="qc-muted">${esc(active.name)} belum tepat. Tim lain: <b>cepat klik tombol tim kalian!</b> Tim yang paling dulu mengklik berhak menjawab.<br><small>Keyboard: tekan nomor tim.</small></p>
        <div class="rb-q">❓ ${esc(q.question)}</div>
        <div class="rb-grid">${cands.map((o) => `<button class="rb-btn" data-t="${o.id}" style="--pc:${o.color}"><kbd>${o.id + 1}</kbd><span class="av">${o.avatar}</span><b>${esc(o.name)}</b><small>benar = 🧗 +1 langkah</small></button>`).join('')}</div>
        <div class="rb-bar" style="--rbt:${(waitMs / 1000).toFixed(2)}s"><i></i></div>`,
      buttons: [{ label: '⏭️ Lewati', value: null }],
      onOpen(o, done) {
        rebDecide = (v) => done(v);
        o.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { QC.sfx.click(); done(+b.dataset.t); }));
        o._onKey = (e) => { const n = parseInt(e.key, 10); const hit = cands.find((c) => c.id === n - 1); if (hit) done(hit.id); else if (e.key === 'Escape') done(null); };
        const tm = setTimeout(() => done(null), waitMs); o._cleanup = () => clearTimeout(tm);
      }
    });
    rebDecide = null;
    if (gid !== gameSeq) return null;
    if (pick == null || !P[pick]) {
      rebutLog.push({ by: null, ok: null, round });
      QC.toast(`💡 Jawaban benar: <b>${q.correct}. ${esc(q['option' + q.correct])}</b>`);
      return null;
    }
    const o = P[pick]; const m = takeAnswerer(o); curAnswerer = m ? m.name : null; curQ = q; renderTeams();
    const pr = QC.ask(q, { player: { name: o.name, avatar: o.avatar, color: o.color }, time: askTime(), badge: '⚡ Soal Rebutan • benar = 🧗 +1 langkah' });
    decorateAsk(o, m, false);
    const r = await pr; curQ = null; curAnswerer = null; const ok = !!r.correct;
    o.asked++; if (ok) o.correct++; if (m) { m.asked++; if (ok) m.correct++; }
    askLog.push({ team: o.id, member: m ? m.name : null, ok, rebut: true }); rebutLog.push({ by: o.id, ok, round });
    if (gid !== gameSeq) return null;
    if (!ok) return null;
    o.steals++; SND.good();
    FX.announce('⚡ REBUTAN BERHASIL!', { color: o.color, sub: `${esc(o.name)} merebut soal — naik 1 langkah!`, dur: Math.max(300, 1200 * TS) });
    await sleep(600);
    return o.id;
  }

  /* ------------------------------ Alur giliran ------------------------------ */
  async function startTurn() {
    if (phase === 'over') return; const gid = gameSeq;
    const p = cur(); runN = 0; phase = 'turn'; turnsPlayed++; hideDecide();
    renderAll(); SND.horn();
    const m = peekAnswerer(p);
    FX.announce(`${p.ai ? '🤖' : p.avatar} ${esc(p.name)}`, { color: p.color, sub: p.ai ? 'Komputer mulai mendaki' : m ? `🙋 Penjawab: ${esc(m.name)}` : 'Giliran mendaki!', dur: Math.max(300, 1150 * TS) });
    if (p.ai) { await sleep(950); if (gid === gameSeq && phase === 'turn') aiTurn(gid); return; }
    if (S.alur === 'on') { await sleep(1150); if (gid === gameSeq && phase === 'turn' && !QC.isBusy()) askQuestion(); }
  }
  async function askQuestion() {
    if (phase !== 'turn' || QC.isBusy()) return false;
    const p = cur(); if (!p || p.ai) return false;
    if (!QC.questions.length) { QC.toast('⚠️ Bank soal kosong. Tambahkan soal di Mode Guru.', 'bad'); return false; }
    const gid = gameSeq; phase = 'quiz'; renderHud();
    const r = await quiz(p);
    if (gid !== gameSeq || phase === 'over') return true;
    if (r.ok) { const res = await climbCorrect(p, gid); if (res === 'ok' && gid === gameSeq) showDecide(p); }
    else await wrongFlow(p, r.q, gid);
    return true;
  }
  async function climbCorrect(p, gid) {
    runN++; p.bestRun = Math.max(p.bestRun, runN);
    const gp = gainParts(runN); const from = p.pos; const to = Math.min(H, p.pos + 1 + gp.bonus + gp.wind);
    phase = 'climb'; renderAll(); SND.climb();
    const cp = climberPt(p);
    if (gp.bonus) FX.announce('🔥 BONUS NEKAT!', { color: '#c2410c', sub: `Benar ${runN}× beruntun — naik +${1 + gp.bonus + gp.wind}!`, dur: Math.max(300, 1100 * TS) });
    if (gp.wind) FX.burst(cp.x - cp.w, cp.y - cp.h * 0.3, { emojis: ['💨', '🍃'], count: PN(6), spread: 80, size: 24, gravity: -10 });
    await climbTo(p, to);
    if (gid !== gameSeq) return 'stop';
    if (!gp.bonus) { const c2 = climberPt(p); FX.floatText(c2.x, c2.y - c2.h * 0.75, `+${to - from} 🧗`, '#fde047', clamp(c2.h * 0.42, 22, 40)); }
    ev('climb', { team: p.id, from, to, bonus: gp.bonus, wind: gp.wind, run: runN });
    await afterLand(p, gid); if (gid !== gameSeq) return 'stop';
    if (p.pos >= H) { await winSummit(p, gid); return 'stop'; }
    return 'ok';
  }
  async function afterLand(p, gid) {
    const k = S.tiles === 'on' ? tileMap[p.pos] : null;
    if (k && p.pos < H) {
      const at = p.pos; p.tiles++; ev('tile', { team: p.id, kind: k, step: at });
      const cp = climberPt(p);
      if (k === 'tali') {
        SND.rope(); FX.announce('🪢 TALI PINTAS!', { color: '#a16207', sub: `${esc(p.name)} memanjat tali — naik +2 langkah!`, dur: Math.max(300, 1200 * TS) });
        await sleep(500); if (gid !== gameSeq) return;
        await climbTo(p, Math.min(H, p.pos + 2), { rope: true }); if (gid !== gameSeq) return;
      } else if (k === 'longsor') {
        SND.rock(); FX.announce('🪨 LONGSOR!', { color: '#57534e', sub: 'Batu berjatuhan — merosot 1 langkah!', dur: Math.max(300, 1200 * TS) });
        FX.burst(cp.x, cp.y - cp.h, { emojis: ['🪨', '🪨', '💨'], count: PN(9), spread: 60, size: 26, gravity: 160 });
        await sleep(600); if (gid !== gameSeq) return;
        const to = Math.max(p.safe, p.pos - 1);
        if (to < p.pos) { await slideTo(p, to, { rock: true }); if (gid !== gameSeq) return; }
        else { FX.floatText(cp.x, cp.y - cp.h * 0.7, '🛡️ Bertahan!', '#e0f2fe', 28); await sleep(500); }
      } else if (k === 'air') {
        SND.water();
        if (!p.bekal) { p.bekal = 1; FX.announce('💧 MATA AIR!', { color: '#0369a1', sub: `${esc(p.name)} dapat 🎒 Bekal — terlindung 1× dari merosot`, dur: Math.max(300, 1300 * TS) }); }
        else FX.floatText(cp.x, cp.y - cp.h * 0.7, '💧 Segar!', '#bae6fd', 30);
        FX.burst(cp.x, cp.y, { emojis: ['💧', '💦', '✨'], count: PN(9), spread: 70, size: 22 });
        renderAll(); await sleep(900); if (gid !== gameSeq) return;
      }
    }
    if (POSS.includes(p.pos) && p.pos > p.safe) {
      p.safe = p.pos; ev('pos', { team: p.id, pos: p.pos }); renderCamps(); renderAll(); SND.camp();
      FX.announce('⛺ POS AMAN!', { color: '#15803d', sub: `${esc(p.name)} tiba di Pos ${POSS.indexOf(p.pos) + 1} — ketinggian otomatis tersimpan`, dur: Math.max(300, 1200 * TS) });
      await sleep(900);
    }
    renderAll();
  }
  async function wrongFlow(p, q, gid) {
    phase = 'slip'; hideDecide(); renderAll(); p.slips++; runN = 0;
    if (p.bekal) {
      p.bekal = 0; ev('bekal', { team: p.id, pos: p.pos }); SND.water();
      FX.announce('🎒 BEKAL MENYELAMATKAN!', { color: '#0369a1', sub: `${esc(p.name)} tidak merosot — tetap di langkah ${p.pos}`, dur: Math.max(300, 1300 * TS) });
      renderAll(); await sleep(1100);
    } else {
      const from = p.pos; const to = slipTarget(p); const extra = to < p.safe ? 1 : 0;
      if (to < p.safe) p.safe = to;
      ev('slip', { team: p.id, from, to, extra, w: weather });
      if (to < from) {
        if (extra) QC.toast('🌧️ Jalur licin! Merosot 1 langkah lebih jauh.', 'bad');
        await slideTo(p, to);
      } else { const cp = climberPt(p); FX.floatText(cp.x, cp.y - cp.h * 0.7, '⛺ Tetap aman', '#e2e8f0', 28); await sleep(700); }
      renderCamps();
    }
    if (gid !== gameSeq || phase === 'over') return;
    const steal = q ? await rebutan(p, q, gid) : null;
    if (gid !== gameSeq || phase === 'over') return;
    if (steal != null) {
      const o = P[steal]; const from = o.pos; phase = 'climb'; renderAll(); SND.climb();
      await climbTo(o, Math.min(H, o.pos + 1)); if (gid !== gameSeq) return;
      ev('steal', { team: o.id, from, to: o.pos });
      await afterLand(o, gid); if (gid !== gameSeq) return;
      if (o.pos >= H) { await winSummit(o, gid); return; }
    }
    endTurn();
  }
  async function endTurn() {
    if (phase === 'over') return; const gid = gameSeq; hideDecide();
    if (timeUp()) { endGame('waktu'); return; }
    let i = turn + 1; let wrapped = false; if (i >= P.length) { i = 0; wrapped = true; }
    turn = i; phase = 'next'; renderAll();
    if (wrapped) {
      round++;
      if (round > maxRounds()) { round = maxRounds(); endGame('ronde'); return; }
      await sleep(250); if (gid !== gameSeq) return;
      await newWeather(gid); if (gid !== gameSeq) return;
      if (maxRounds() !== Infinity && round === maxRounds() && lastRoundWarned !== round) { lastRoundWarned = round; QC.toast('⏳ <b>Ronde terakhir!</b> Saatnya nekat?', 'bad'); }
    }
    await sleep(300); if (gid === gameSeq && phase === 'next') startTurn();
  }
  function pickWeather() {
    if (S.weather !== 'on' || round <= 1) return 'cerah';
    const r = Math.random(); return r < 0.34 ? 'cerah' : r < 0.56 ? 'hujan' : r < 0.78 ? 'kabut' : 'angin';
  }
  function setWeather(w) {
    weather = WEATHER[w] ? w : 'cerah';
    const app = $('app'); Object.keys(WEATHER).forEach((k) => app.classList.toggle('w-' + k, k === weather));
    renderInfo();
  }
  async function newWeather(gid) {
    const prev = weather; setWeather(pickWeather()); wxHist.push({ round, w: weather }); ev('weather', { w: weather });
    if (S.weather !== 'on') return;
    const w = WEATHER[weather];
    ({ cerah: SND.sun, hujan: SND.rain, kabut: SND.fog, angin: SND.wind })[weather]();
    FX.announce(`${w.ic} RONDE ${round}: ${w.name.toUpperCase()}`, { color: { cerah: '#d97706', hujan: '#1d4ed8', kabut: '#64748b', angin: '#0f766e' }[weather], sub: w.desc.replace(/<[^>]+>/g, ''), dur: Math.max(300, 1700 * TS) });
    if (prev !== weather || weather !== 'cerah') await sleep(1500); else await sleep(900);
  }

  /* ------------------------------ Robo Pendaki (1 tim) ------------------------------ */
  async function aiTurn(gid) {
    const p = cur(); const pop = $('cpop');
    for (let guard = 0; guard < 40; guard++) {
      phase = 'ai'; renderHud();
      const q = QC.nextQuestion(); const reb = rebutCands(p).length > 0;
      pop.innerHTML = `<div class="think" style="--pc:${p.color}"><div class="who">🤖 ${esc(p.name)} sedang berpikir</div><div class="q">${q ? esc(q.question) : ''}</div><div class="dots"><span>•</span><span>•</span><span>•</span></div></div>`;
      pop.hidden = false; SND.think();
      await sleep(1400); if (gid !== gameSeq) { pop.hidden = true; return; }
      const ok = Math.random() < AI_ACC - (weather === 'kabut' ? 0.05 : 0); const d = pop.querySelector('.dots');
      if (d) d.outerHTML = `<div class="res ${ok ? 'ok' : 'no'}">${ok ? '✔ BENAR!' : '✘ SALAH'}</div>${q ? (ok || !reb ? `<div class="q">Jawaban: <b>${q.correct}. ${esc(q['option' + q.correct])}</b></div>` : '<div class="q">⚡ Jawaban dirahasiakan — <b>REBUTAN</b>!</div>') : ''}`;
      ok ? SND.good() : SND.fail();
      await sleep(1000); pop.hidden = true; if (gid !== gameSeq) return;
      p.asked++; if (ok) p.correct++; askLog.push({ team: p.id, member: null, ok, ai: true });
      if (!ok) { await wrongFlow(p, q, gid); return; }
      const res = await climbCorrect(p, gid); if (res !== 'ok' || gid !== gameSeq) return;
      const unb = p.pos - p.safe; const lan = H - p.pos <= 2 || unb < 2;
      phase = 'ai'; renderHud();
      pop.innerHTML = `<div class="think" style="--pc:${p.color}"><div class="who">🤖 ${esc(p.name)} memutuskan…</div><div class="res ${lan ? 'go' : 'ok'}">${lan ? '🧗 LANJUT NEKAT!' : '⛺ BERKEMAH'}</div></div>`; pop.hidden = false;
      lan ? SND.nekat() : SND.click();
      await sleep(1000); pop.hidden = true; if (gid !== gameSeq) return;
      if (!lan) { await bankCamp(p, gid); if (gid === gameSeq && phase !== 'over') endTurn(); return; }
      p.nekat++; ev('lanjut', { team: p.id, pos: p.pos, ai: true });
    }
    if (gid === gameSeq) endTurn();
  }

  /* ------------------------------ Akhir permainan ------------------------------ */
  function rankingOrder() { return [...P].sort((a, b) => (b.pos >= H) - (a.pos >= H) || b.pos - a.pos || b.safe - a.safe || b.correct - a.correct); }
  async function winSummit(p, gid) {
    phase = 'over'; winner = p.id; lastEnd = 'puncak'; hideDecide(); $('cpop').hidden = true;
    ev('win', { team: p.id, reason: 'puncak' }); renderAll(); SND.flag();
    const wf = $('winFlag');
    if (wf) {
      wf.querySelector('.wf-cloth').setAttribute('fill', p.color); wf.setAttribute('opacity', '1'); wf.classList.add('up');
      const inn = wf.querySelector('.wf-in'); if (!RM()) inn.animate([{ transform: 'translate(0px, 60px) scale(1, 0.1)', opacity: 0 }, { transform: 'translate(0px, -6px) scale(1, 1.05)', opacity: 1, offset: 0.7 }, { transform: 'translate(0px, 0px) scale(1, 1)', opacity: 1 }], { duration: Math.max(60, 900 * TS), easing: 'cubic-bezier(.2,.8,.3,1.2)' });
    }
    const cp = climberPt(p); FX.ring(cp.x, cp.y, p.color, 320); FX.burst(cp.x, cp.y - cp.h, { emojis: ['🚩', '🎉', '⭐', '✨'], count: PN(18), spread: 160 });
    FX.announce('🚩 PUNCAK!', { color: p.color, sub: `${esc(p.name)} menancapkan bendera di puncak gunung!`, dur: Math.max(400, 2000 * TS) });
    FX.fireworks(PN(10), 240);
    await sleep(2300); if (gid !== gameSeq) return;
    showResults('puncak');
  }
  function endGame(reason) {
    if (phase === 'over') return; phase = 'over'; lastEnd = reason; hideDecide(); $('cpop').hidden = true;
    const order = rankingOrder(); winner = order[0].id; ev('win', { team: winner, reason });
    renderAll();
    FX.announce(reason === 'ronde' ? '🏁 BATAS RONDE!' : '⏰ WAKTU HABIS!', { color: '#7c2d12', sub: 'Pendaki tertinggi menang!', dur: Math.max(300, 1500 * TS) });
    const gid = gameSeq; setTimeout(() => { if (gid === gameSeq) showResults(reason); }, 1300 * TS);
  }
  function memberDetail(rows) {
    return '<h4>🙋 Jawaban benar tiap anggota</h4>' + rows.map((p) => `<div class="wd" style="--pc:${p.color}"><b>${esc(p.name)}</b><span>${p.members && p.members.length
      ? p.members.map((m) => `<i>${esc(m.name)} <em>✔${m.correct}</em><small>/${m.asked}</small></i>`).join('') : `<i>✔ ${p.correct} dari ${p.asked} soal</i>`}</span></div>`).join('');
  }
  function showResults(reason) {
    if (document.querySelector('.qc-winner')) return;
    const order = rankingOrder(); const w = order[0];
    const tie = reason !== 'puncak' && order[1] && order[1].pos === w.pos && order[1].safe === w.safe && order[1].correct === w.correct;
    const why = reason === 'puncak' ? `<b>${esc(w.name)}</b> paling dulu menancapkan bendera di puncak (langkah ${H})` : reason === 'ronde' ? `Batas ${maxRounds()} ronde tercapai — pendaki tertinggi menang (seri: titik aman tertinggi)` : `Waktu ${timeLimit() / 60000} menit habis — pendaki tertinggi menang`;
    const title = tie ? 'SERI!' : reason === 'puncak' ? `${esc(w.name)} — RAJA PUNCAK!` : `${esc(w.name)} MENANG!`;
    const ranking = order.map((p) => ({
      player: { name: p.name, avatar: p.ai ? '🤖' : p.avatar, color: p.color },
      value: `${p.pos >= H ? '🚩 PUNCAK' : `⛰️ ${p.pos}/${H}`}<small>⛺ aman ${p.safe} • ✔ ${p.correct}/${p.asked} • 🧗 nekat ${p.nekat}${p.steals ? ` • ⚡${p.steals}` : ''}</small>`
    }));
    QC.showWinner({ title, ranking, unit: '', note: why + '.' }).then((v) => (v === 'setup' ? openSetup() : newGame()));
    const ov = [...document.querySelectorAll('.qc-winner')].pop(); const body = ov && ov.querySelector('.qc-modal-body');
    if (ov) { ov.classList.add('pn-win'); const ic = ov.querySelector('.qc-modal-icon'); if (ic) ic.textContent = reason === 'puncak' ? '🚩' : '🏆'; }
    if (body) { const d = document.createElement('div'); d.className = 'win-detail'; d.innerHTML = memberDetail(order); body.appendChild(d); }
    if (ov) { const b = [...ov.querySelectorAll('.qc-actions button')].find((x) => /Ubah/.test(x.textContent)); if (b) b.textContent = '⚙️ Ubah Tim'; }
  }

  /* ------------------------------ Pengaturan & mulai ------------------------------ */
  const KEY_TIM = 'lokamain_pendaki-nekat_tim';
  const RULES_SHORT = `<ul>
    <li>❓ Tim bergiliran menjawab soal. <b>Benar = naik 1 langkah</b>.</li>
    <li>🧗 <b>Lanjut Nekat</b> (jawab lagi, naik 2!) atau ⛺ <b>Berkemah</b> (simpan ketinggian).</li>
    <li>💥 Salah = merosot ke kemah terakhir + <b>Soal Rebutan</b>.</li>
    <li>🚩 Tim pertama di puncak menang!</li></ul>`;
  const RULES = () => `
    <h4>🎯 Tujuan</h4><ul><li>${WIN_RULE}</li><li>Gunung ${MOUNTS[S.mount].label} • ⛺ Pos Aman di langkah ${MOUNTS[S.mount].pos.join(', ')}.</li></ul>
    <h4>🔁 Giliran</h4><ul>
      <li>❓ Anggota tim <b>bergiliran</b> menjawab soal (nama penjawab tampil di layar). ${S.diskusi === 'off' ? 'Tanpa diskusi.' : 'Boleh diskusi, penjawab yang memilih.'}</li>
      <li>✅ Benar = <b>naik 1 langkah</b>, lalu pilih:<br>🧗 <b>LANJUT NEKAT</b> (L) — jawab soal lagi untuk naik lebih tinggi${S.bonus === 'on' ? ' (benar ke-2 dst. di giliran yang sama = <b>+1 bonus</b>, jadi naik 2)' : ''}.<br>⛺ <b>BERKEMAH</b> (K) — langkah sekarang menjadi <b>titik aman</b> & giliran selesai.</li>
      <li>❌ Salah / waktu habis = <b>merosot</b> ke titik aman terakhir & giliran selesai.</li>
      <li>⛺ Tiba di <b>Pos Aman</b> = ketinggian otomatis tersimpan (tanpa mengakhiri giliran).</li>
      ${S.rebut === 'on' ? '<li>⚡ Setelah jawaban salah: <b>Soal Rebutan</b> — tim lain berebut klik tombol timnya (keyboard: nomor tim). Benar = <b>+1 langkah</b> (belum aman).</li>' : ''}</ul>
    ${S.weather === 'on' ? `<h4>🌦️ Cuaca (berganti tiap ronde)</h4><ul>${Object.values(WEATHER).map((w) => `<li>${w.ic} <b>${w.name}</b>: ${w.desc}</li>`).join('')}</ul>` : ''}
    ${S.tiles === 'on' ? `<h4>🗺️ Petak spesial (berlaku jika berhenti tepat di petak itu)</h4><ul>${Object.values(TILES).map((t) => `<li>${t.ic} <b>${t.name}</b>: ${t.desc}.</li>`).join('')}</ul>` : ''}
    <h4>⌨️ Keyboard</h4><ul><li>Spasi = mulai / jawab soal • L = Lanjut Nekat • K = Berkemah • 1–4 = tombol tim saat Rebutan.</li></ul>`;
  function customizeSetup(o, st) {
    o.classList.add('pn-setup');
    const panel = o.querySelector('.qc-panel'); const h3 = panel && panel.querySelector('h3');
    if (h3) h3.textContent = '👥 Jumlah Tim';
    o.querySelectorAll('.qc-seg button').forEach((b) => (b.textContent = +b.dataset.n === 1 ? '1 Tim vs 🤖' : `${b.dataset.n} Tim`));
    const tip = o.querySelector('.qc-players + .qc-muted');
    if (tip) tip.textContent = 'Klik ikon untuk ganti lambang • Tulis nama anggota supaya semua murid bergiliran menjawab • 1 tim = melawan Robo Pendaki';
    const setBox = o.querySelector('.qc-settings'); const h3b = o.querySelectorAll('.qc-panel h3')[1];
    if (h3b) h3b.textContent = '🏕️ Siap Mendaki';
    if (setBox) {
      const adv = document.createElement('details'); adv.className = 'pn-adv';
      adv.innerHTML = '<summary>⚙️ Pengaturan lanjutan <small>(opsional — bawaan sudah pas, langsung klik Mulai saja)</small></summary>';
      setBox.insertAdjacentElement('beforebegin', adv); adv.appendChild(setBox);
      const ok = document.createElement('div'); ok.className = 'pn-ready';
      ok.innerHTML = `<div class="pr-pic">${climberSVG('#ef4444')}${climberSVG('#3b82f6')}</div><p>✅ Pengaturan bawaan sudah pas: gunung <b>14 langkah</b>, cuaca acak, ±15–20 menit. Isi nama tim & anggota, lalu klik <b>▶ MULAI MAIN</b>.</p>`;
      adv.insertAdjacentElement('beforebegin', ok);
    }
    const deco = () => {
      o.querySelectorAll('.qc-prow').forEach((row) => {
        const ni = row.querySelector('[data-name]'); if (!ni) return; const i = +ni.dataset.name;
        const v = ni.value.trim(); if (!v || /^Pemain \d$/.test(v)) { ni.value = TEAM_NAMES[i]; ni.dispatchEvent(new Event('input')); }
        if (!row.querySelector('.pn-mem')) {
          const m = document.createElement('textarea'); m.className = 'qc-input pn-mem'; m.rows = 1; m.maxLength = 300; m.placeholder = '👤 Anggota: Andi, Sari, Budi… (koma/baris baru, atau jumlah mis. 5)';
          m.value = st.members[i] || ''; const fit = () => { m.style.height = 'auto'; m.style.height = Math.min(110, m.scrollHeight + 2) + 'px'; };
          m.oninput = () => { st.members[i] = m.value; fit(); }; requestAnimationFrame(fit); m.onkeydown = (e) => e.stopPropagation(); row.appendChild(m);
        }
      });
    };
    const pl = o.querySelector('.qc-players'); if (pl && window.MutationObserver) new MutationObserver(deco).observe(pl, { childList: true });
    deco();
  }
  async function openSetup() {
    gameSeq++; phase = 'idle'; rebDecide = null; $('brief').hidden = true; $('cpop').hidden = true; hideDecide();
    const saved = store(KEY_TIM) || {};
    const st = { members: Array.isArray(saved.members) ? saved.members.slice(0, 4) : [] };
    const pr = QC.setup({
      logo: '⛰️', subtitle: 'Jawab benar untuk mendaki. Berani lanjut nekat atau berkemah dulu? Tim pertama yang menancapkan bendera di puncak menang!',
      min: 1, max: 4, defaultCount: 2, defaultNames: TEAM_NAMES, soloLabel: '1 Tim vs 🤖',
      settings: [
        { key: 'gunung', label: '⛰️ Tinggi gunung', value: 'sedang', options: [['pendek', 'Pendek • 10 langkah'], ['sedang', 'Sedang • 14 langkah'], ['tinggi', 'Tinggi • 18 langkah']] },
        { key: 'batas', label: '🏁 Batas permainan', value: 'auto', options: [['auto', 'Otomatis (±15–20 menit)'], ['r5', '5 ronde'], ['r6', '6 ronde'], ['r8', '8 ronde'], ['r10', '10 ronde'], ['r12', '12 ronde'], ['r15', '15 ronde'], ['t10', '⏰ 10 menit'], ['t15', '⏰ 15 menit'], ['t20', '⏰ 20 menit'], ['t25', '⏰ 25 menit']] },
        { key: 'waktu', label: '⏱️ Waktu menjawab', value: 30, options: [[15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [45, '45 detik'], [60, '60 detik']] },
        { key: 'cuaca', label: '🌦️ Cuaca acak', value: 'on', options: [['on', 'Nyala (☀️ 🌧️ 🌫️ 💨)'], ['off', 'Mati (selalu cerah)']] },
        { key: 'petak', label: '🗺️ Petak spesial', value: 'on', options: [['on', 'Nyala (🪢 🪨 💧)'], ['off', 'Mati']] },
        { key: 'bonus', label: '🔥 Bonus nekat', value: 'on', options: [['on', 'Nyala (benar ke-2 dst. = naik 2)'], ['off', 'Mati']] },
        { key: 'rebut', label: '⚡ Soal Rebutan', value: 'on', options: [['on', 'Nyala'], ['off', 'Mati']] },
        { key: 'alur', label: '⚡ Soal muncul otomatis', value: 'on', options: [['on', 'Nyala'], ['off', 'Mati (guru klik Jawab Soal)']] },
        { key: 'diskusi', label: '💬 Diskusi tim', value: 'on', options: [['on', 'Boleh'], ['off', 'Tidak boleh']] }
      ],
      rulesHtml: RULES_SHORT
    });
    const o = [...document.querySelectorAll('.qc-setup')].pop();
    if (o) { const sm = o.querySelector('details.qc-rules'); if (sm) { sm.removeAttribute('open'); const s2 = sm.querySelector('summary'); if (s2) s2.textContent = '📜 Cara Main Singkat'; } customizeSetup(o, st); }
    renderHud();
    const r = await pr; const set = r.settings;
    store(KEY_TIM, { members: st.members });
    S.mount = MOUNTS[set.gunung] ? set.gunung : 'sedang';
    S.dur = /^(auto|r\d+|t\d+)$/.test(String(set.batas)) ? String(set.batas) : 'auto';
    S.time = +set.waktu || 30; S.weather = set.cuaca === 'off' ? 'off' : 'on'; S.tiles = set.petak === 'off' ? 'off' : 'on'; S.bonus = set.bonus === 'off' ? 'off' : 'on';
    S.rebut = set.rebut === 'off' ? 'off' : 'on'; S.alur = set.alur === 'off' ? 'off' : 'on'; S.diskusi = set.diskusi === 'off' ? 'off' : 'on';
    P = r.players.map((pl, i) => ({ id: i, name: pl.name, avatar: pl.avatar, color: pl.color || COLORS[i], ai: false, members: parseMembers(st.members[i]).map((n) => ({ name: n, asked: 0, correct: 0 })) }));
    if (P.length === 1) { P.push({ id: 1, name: BOT_NAME, avatar: '🤖', color: COLORS[1] === P[0].color ? COLORS[0] : COLORS[1], ai: true, members: [] }); QC.toast('🤖 Main 1 tim: berlomba dengan Robo Pendaki', 'good'); }
    newGame();
  }
  function placeTiles() {
    tileMap = {}; if (S.tiles !== 'on') return;
    const cfg = MOUNTS[S.mount].tiles; const free = [];
    for (let s = 2; s <= H - 2; s++) if (!POSS.includes(s)) free.push(s);
    const sh = QC.shuffle(free); const take = (ok) => { const i = sh.findIndex(ok); return i < 0 ? null : sh.splice(i, 1)[0]; };
    for (let n = 0; n < cfg.tali; n++) { const s = take((x) => x <= H - 4 && !POSS.includes(x + 2) && !tileMap[x + 2] && !tileMap[x - 2]); if (s != null) tileMap[s] = 'tali'; }
    for (let n = 0; n < cfg.longsor; n++) { const s = take((x) => x >= 3 && !POSS.includes(x - 1)); if (s != null) tileMap[s] = 'longsor'; }
    for (let n = 0; n < cfg.air; n++) { const s = take(() => true); if (s != null) tileMap[s] = 'air'; }
  }
  function resetTeam(p) {
    Object.assign(p, { pos: 0, safe: 0, bekal: 0, anim: false, face: 1, asked: 0, correct: 0, slips: 0, camps: 0, nekat: 0, steals: 0, tiles: 0, bestRun: 0, maxPos: 0, mi: 0 });
    (p.members || []).forEach((m) => { m.asked = 0; m.correct = 0; });
  }
  function newGame() {
    gameSeq++; const M = MOUNTS[S.mount]; H = M.h; POSS = M.pos.slice();
    P.forEach((p, i) => { p.id = i; resetTeam(p); });
    placeTiles();
    turn = 0; round = 1; runN = 0; curQ = null; curAnswerer = null; rebDecide = null; winner = -1;
    events = []; askLog = []; rebutLog = []; wxHist = [{ round: 1, w: 'cerah' }]; lastEnd = ''; timeWarned = false; lastRoundWarned = 0; tStart = 0; turnsPlayed = 0; phase = 'brief';
    setWeather('cerah'); $('cpop').hidden = true; hideDecide();
    buildTeams(); buildMountain(); renderCamps(); renderAll(); showBrief();
  }
  function showBrief() {
    const solo = P.some((p) => p.ai); const M = MOUNTS[S.mount];
    const mode = solo ? '🤖 1 TIM vs ROBO PENDAKI' : P.length === 2 ? '⚔️ DUEL 2 TIM' : `⛰️ ${P.length} TIM BERLOMBA`;
    const reb = S.rebut === 'on' && P.filter((p) => !p.ai).length > 1;
    $('brief').innerHTML = `<div class="brief-card"><span class="stampx">${mode}</span><h2>PENDAKI NEKAT</h2>
      <div class="brief-teams">${P.map((p, i) => `<span class="bt-g">${i ? '<b class="vs">VS</b>' : ''}<span class="brief-team" style="--pc:${p.color}"><span>${p.ai ? '🤖' : p.avatar}</span>${esc(p.name)}${p.members && p.members.length ? `<small>👥 ${p.members.length}</small>` : ''}</span></span>`).join('')}</div>
      <div class="bf-steps">
        <div class="bf-st" style="--d:0s"><div class="pic"><span class="big">❓</span><span class="mini">🙋</span></div><b>1. Jawab soal</b><span>Anggota tim <em>bergiliran</em> menjawab</span></div>
        <div class="bf-st" style="--d:.1s"><div class="pic stairs"><i></i><i></i><i></i><span class="cl">${climberSVG('#ef4444')}</span><span class="up">⬆</span></div><b>2. Benar = naik!</b><span>Naik <em>1 langkah</em> ke arah puncak</span></div>
        <div class="bf-st hot" style="--d:.2s"><div class="pic duo"><span class="ch go">🧗</span><span class="or">atau</span><span class="ch camp">⛺</span></div><b>3. Nekat atau kemah?</b><span><em>Lanjut Nekat</em> = jawab lagi${S.bonus === 'on' ? ', naik 2!' : ''} • <em>Berkemah</em> = simpan tinggimu</span></div>
        <div class="bf-st" style="--d:.3s"><div class="pic slip"><span class="big">💥</span><span class="mini">⬇️⛺</span></div><b>4. Salah = merosot!</b><span>Kembali ke <em>kemah terakhir</em>${reb ? ' • tim lain boleh <em>Rebutan</em>' : ''}</span></div>
        ${S.weather === 'on' || S.tiles === 'on' ? `<div class="bf-st" style="--d:.4s"><div class="pic row"><span>${S.weather === 'on' ? '🌧️🌫️💨' : ''}</span><span>${S.tiles === 'on' ? '🪢🪨💧' : ''}</span></div><b>5. Cuaca & petak</b><span>${S.weather === 'on' ? 'Cuaca berganti tiap ronde' : ''}${S.weather === 'on' && S.tiles === 'on' ? ' • ' : ''}${S.tiles === 'on' ? '<em>tali</em> +2, <em>longsor</em> −1, <em>mata air</em> = bekal' : ''}</span></div>` : ''}
      </div>
      <p class="bf-line">🚩 ${WIN_RULE}<br>⛰️ ${M.h} langkah • ⛺ Pos Aman otomatis di langkah ${POSS.join(', ')} • 🏁 Batas: ${durText()} • ⏱️ ${S.time} detik per soal</p>
      <button class="go-btn" id="btnGo">🧗 MULAI MENDAKI!<small>SPASI</small></button></div>`;
    $('brief').hidden = false; $('btnGo').onclick = (e) => { e.currentTarget.blur(); startMatch(); };
  }
  function startMatch() { if (phase !== 'brief') return false; SND.ac(); QC.sfx.click(); $('brief').hidden = true; tStart = Date.now(); startTurn(); return true; }
  setInterval(() => {
    if (['idle', 'over', 'brief'].includes(phase)) return; renderInfo();
    if (!timeWarned && timeUp()) { timeWarned = true; QC.toast('⏰ Waktu habis! Pendakian berakhir setelah giliran ini.', 'bad'); }
  }, 1000);

  /* ------------------------------ Masukan ------------------------------ */
  QC.onKey = (e) => {
    const key = e.key; const up = key.length === 1 ? key.toUpperCase() : key;
    if (phase === 'decide') {
      if (up === 'L') { decide('lanjut'); return; }
      if (up === 'K') { decide('kemah'); return; }
      if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown' || key === 'Tab') { e.preventDefault(); decSel = decSel === 'kemah' ? 'lanjut' : 'kemah'; markSel(); SND.click(); return; }
      if (key === ' ' || key === 'Enter') { e.preventDefault(); decide(decSel); return; }
      return;
    }
    if (key === ' ' || key === 'Enter') {
      e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (phase === 'brief') startMatch();
      else if (phase === 'turn') askQuestion();
    }
  };
  $('btnRules').onclick = (e) => { e.currentTarget.blur(); QC.modal({ icon: '📜', title: 'Peraturan Pendaki Nekat', html: `<div class="rules-pop">${RULES()}</div>`, cls: 'pn-rules', dismissable: true }); };
  $('wxBtn').onclick = (e) => {
    e.currentTarget.blur(); const w = WEATHER[weather];
    QC.modal({ icon: w.ic, title: `Cuaca: ${w.name}`, cls: 'pn-rules', dismissable: true, html: `<div class="rules-pop"><p>${w.desc}</p>${S.weather === 'on' ? `<h4>Cuaca lain (berganti tiap ronde)</h4><ul>${Object.values(WEATHER).filter((x) => x !== w).map((x) => `<li>${x.ic} <b>${x.name}</b>: ${x.desc}</li>`).join('')}</ul>` : '<p>Cuaca acak dimatikan di pengaturan.</p>'}</div>` });
  };
  $('btnSetup').onclick = async (e) => {
    e.currentTarget.blur();
    if (document.querySelector('.qc-setup.show')) return;
    if (!['idle', 'over', 'brief'].includes(phase)) {
      const ok = await QC.modal({ icon: '⚙️', title: 'Kembali ke pengaturan?', html: '<p class="qc-muted">Pendakian yang sedang berjalan akan dihentikan.</p>', buttons: [{ label: 'Batal', value: false }, { label: 'Ya, ke Pengaturan', value: true, primary: true }] });
      if (!ok) return;
    }
    openSetup();
  };
  document.addEventListener('pointerdown', () => SND.ac(), { once: true });

  /* ------------------------------ Kait pengujian ------------------------------ */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__PN = {
    get phase() { return phase; },
    state: () => ({
      phase, turn, round, maxRounds: maxRounds() === Infinity ? null : maxRounds(), timeLimit: timeLimit(), dur: S.dur, settings: { ...S }, H, poss: POSS.slice(), tiles: { ...tileMap },
      weather, wxHist: wxHist.slice(), runN, nextGain: nextGain(), askTime: askTime(), lite: LITE, turnsPlayed, winner, lastEnd, ck,
      rebutOpen: !!rebDecide, decideOpen: !$('decide').hidden, question: curQ ? curQ.question : null, answerer: curAnswerer,
      askLog: askLog.slice(-120), rebutLog: rebutLog.slice(-40), events: events.slice(-200), questions: askLog.length,
      teams: P.map((p) => ({ name: p.name, ai: !!p.ai, color: p.color, pos: p.pos, safe: p.safe, bekal: p.bekal, asked: p.asked, correct: p.correct, slips: p.slips, camps: p.camps, nekat: p.nekat, steals: p.steals, tiles: p.tiles, bestRun: p.bestRun, members: (p.members || []).map((m) => ({ ...m })), nextAnswerer: peekAnswerer(p) ? peekAnswerer(p).name : null }))
    }),
    start: () => startMatch(),
    ask: () => askQuestion(),
    async answer(correct) {
      let o = null;
      for (let i = 0; i < 200; i++) { o = [...document.querySelectorAll('.qc-overlay.qc-ask.show')].find((x) => x.querySelector('.qc-opt:not(:disabled)')); if (o && curQ) break; await wait(40); }
      if (!o || !curQ) return false;
      const keys = QC.optionsOf(curQ); const k = correct ? curQ.correct : keys.find((x) => x !== curQ.correct);
      o.querySelector(`.qc-opt[data-k="${k}"]`).click(); await wait(80);
      const nb = o.querySelector('[data-next]'); if (nb) nb.click(); await wait(60);
      return true;
    },
    decide: (c) => decide(c),
    rebut: (i) => { if (!rebDecide) return false; rebDecide(i == null || i === 'skip' ? null : +i); return true; },
    key: (k, shift) => QC.onKey({ key: k, shiftKey: !!shift, preventDefault() {} }),
    async waitPhase(ph, ms = 8000) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if ((Array.isArray(ph) ? ph : [ph]).includes(phase) && !QC.isBusy()) return true; await wait(30); } return false; },
    async waitAsk(ms = 8000) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (curQ && document.querySelector('.qc-overlay.qc-ask.show .qc-opt:not(:disabled)')) return true; await wait(30); } return false; },
    async waitRebut(ms = 8000) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (rebDecide) return true; if (['turn', 'over', 'decide', 'ai'].includes(phase) && !QC.isBusy() && phase !== 'rebut') return false; await wait(30); } return false; },
    fast(on) { TS = on ? 0.06 : 1; return TS; },
    setWeather(w) { setWeather(w); return weather; },
    setPos(i, pos, safe) { const p = P[i]; p.pos = clamp(pos, 0, H); p.safe = clamp(safe == null ? p.pos : safe, 0, p.pos); renderCamps(); renderAll(); return { pos: p.pos, safe: p.safe }; },
    setTile(step, kind) { if (kind) tileMap[step] = kind; else delete tileMap[step]; const keep = P.map((p) => p.pos); buildMountain(); P.forEach((p, i) => (p.pos = keep[i])); renderCamps(); renderAll(); return { ...tileMap }; },
    clearTiles() { tileMap = {}; buildMountain(); renderCamps(); renderAll(); return true; },
    giveBekal(i, v = 1) { P[i].bekal = v; renderAll(); return v; },
    setTurn(i) { turn = i; renderAll(); return i; },
    setRound(n) { round = n; renderInfo(); return n; },
    warp(ms) { tStart -= ms; renderInfo(); return Date.now() - tStart; },
    aiAcc(v) { AI_ACC = v; return v; },
    climberBox(i) { const el = $('cl' + i); const u = el && el.querySelector('use'); if (!u) return null; const r = u.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; },
    stepPt(k) { const pt = PTS[k]; const m = svg.getScreenCTM(); return pt && m ? { x: pt.x * m.a + m.e, y: pt.y * m.d + m.f } : null; }
  };

  openSetup();
})();
