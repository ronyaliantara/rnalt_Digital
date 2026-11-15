/* ==========================================================================
   Pertempuran Laut — kuis strategi armada untuk kelas (SMP/SMA).
   2–4 TIM (atau 1 tim melawan Armada Robo). Setiap tim punya laut petak
   (bawaan 8×8) berisi armada kapal Nusantara yang disebar ACAK & dirahasiakan.
     • Giliran: anggota tim bergiliran menjawab soal.
     • Benar = 1 tembakan ke laut lawan (ketuk petak / panah + Enter).
       Pengaturan lanjutan "🎯 Jawaban benar" bisa diubah ke 2 tembakan (S.shots).
     • Kena = tembak lagi (maks. 2 tembakan bonus per giliran).
     • Benar beruntun = senjata spesial: 🔭 Radar (hitung petak kapal di area 3×3),
       💣 Meriam Ganda (+1 tembakan), 🛡️ Perisai (menangkis 1 tembakan kena).
     • Salah = SOAL REBUTAN: tim lain berebut klik tombol timnya; benar = 1 tembakan.
       Tim yang armadanya tenggelam tetap ikut Rebutan dari 🗼 Benteng Pantai.
   Menang: tim terakhir yang masih punya kapal, atau saat ronde/waktu habis:
   POIN terbanyak (poin = sisa petak kapal + petak lawan yang kena + 3 per kapal lawan tenggelam).
   Grafis 100% kode (DOM + SVG + CSS). Animasi berulang hanya transform/opacity;
   tanpa loop 60 fps saat diam. Mode ringan otomatis (?ringan=1 untuk memaksa).
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const FX = QC.fx; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let TS = 1; // skala waktu (uji otomatis)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * TS));
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };

  const GAME = 'pertempuran-laut';
  const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
  const AVATARS = ['⛵', '🚢', '🛶', '⚓', '🐬', '🐢', '🦀', '🐙'];
  const TEAM_NAMES = ['Tim Merah', 'Tim Biru', 'Tim Hijau', 'Tim Kuning'];
  const BOT_NAME = 'Armada Robo';
  QC.init({ gameId: GAME, title: 'Pertempuran Laut', avatars: AVATARS, colors: COLORS });

  // Mode ringan otomatis untuk perangkat lemah (IFP/Android TV/laptop lama). Paksa: ?ringan=1 / ?ringan=0
  const LITE = /[?&]ringan=1/.test(location.search) || (!/[?&]ringan=0/.test(location.search) && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4));
  if (LITE) document.documentElement.classList.add('pl-lite');
  const PN = (n) => (LITE ? Math.ceil(n * 0.45) : n);

  /* ------------------------------ Data armada ------------------------------ */
  const SHIPS = {
    jung: { name: 'Jung Jawa', len: 5 },
    pinisi: { name: 'Kapal Pinisi', len: 4 },
    lancang: { name: 'Kapal Lancang', len: 3 },
    patroli: { name: 'Kapal Patroli', len: 3 },
    sandeq: { name: 'Perahu Sandeq', len: 2 },
    jukung: { name: 'Jukung', len: 2 }
  };
  const FLEETS = {
    kecil: { g: 6, label: '6×6', ships: ['lancang', 'patroli', 'sandeq', 'jukung'] },
    sedang: { g: 8, label: '8×8', ships: ['pinisi', 'lancang', 'patroli', 'sandeq', 'jukung'] },
    besar: { g: 10, label: '10×10', ships: ['jung', 'pinisi', 'lancang', 'patroli', 'sandeq'] }
  };
  const COLS = 'ABCDEFGHIJ';
  const cellName = (r, c) => COLS[c] + (r + 1);
  const WEAPONS = {
    radar: { ic: '🔭', name: 'Radar', key: 'R', desc: 'pindai area 3×3: berapa petak kapal tersembunyi di sana' },
    ganda: { ic: '💣', name: 'Meriam Ganda', key: 'G', desc: '+1 tembakan di giliran ini' },
    perisai: { ic: '🛡️', name: 'Perisai', key: 'P', desc: 'menangkis 1 tembakan yang kena armadamu' }
  };
  const REWARD_ORDER = ['radar', 'ganda', 'perisai']; // benar beruntun ke-2, ke-3, ke-4, lalu berulang
  const MAX_CHAIN = 2;
  let AI_ACC = 0.62;
  const AUTO_ROUNDS = { 2: 16, 3: 11, 4: 9 };
  const WIN_RULE = 'Tim terakhir yang kapalnya masih berlayar menang. Jika ronde/waktu habis: <b>poin</b> terbanyak menang.';
  const SCORE_RULE = '🏅 Poin = sisa petak kapalmu + petak lawan yang kamu kena + 3 per kapal lawan yang kamu tenggelamkan';

  /* ------------------------------ Status ------------------------------ */
  const S = { size: 'sedang', dur: 'auto', shots: 1, time: 30, rebut: 'on', weapons: 'on', chain: 'on', alur: 'on', diskusi: 'on' };
  let P = []; let G = 8; let turn = 0; let round = 1; let phase = 'idle'; let gameSeq = 0; let tStart = 0;
  let shooter = -1; let shots = 0; let chainN = 0; let radarMode = false; let target = -1; let cursor = { r: 3, c: 3 }; let view = 0;
  let compact = false; let elimLog = []; let outSeq = 0; let curQ = null; let curAnswerer = null; let rebDecide = null;
  let lastShot = null; let shotLog = []; let rebutLog = []; let askLog = []; let logList = []; let lastEnd = ''; let timeWarned = false; let lastRoundWarned = 0;
  let cellsEl = []; let turnsPlayed = 0;

  const alive = () => P.filter((p) => !p.out);
  const cur = () => P[turn];
  const cellsLeft = (p) => p.ships.reduce((s, x) => s + (x.len - x.hits), 0);
  const shipsLeft = (p) => p.ships.filter((x) => !x.sunk).length;
  const score = (p) => cellsLeft(p) + p.hitsDealt + 3 * p.sunkDealt;
  const maxRounds = () => (S.dur === 'auto' ? AUTO_ROUNDS[clamp(P.length, 2, 4)] : /^r\d+$/.test(S.dur) ? +S.dur.slice(1) : Infinity);
  const timeLimit = () => (/^t\d+$/.test(S.dur) ? +S.dur.slice(1) * 60000 : 0);
  const timeUp = () => !!timeLimit() && tStart > 0 && Date.now() - tStart >= timeLimit();
  const enemiesOf = (i) => P.filter((p) => p.id !== i && !p.out);
  const durText = () => (S.dur === 'auto' ? `<b>${maxRounds()} ronde</b> (±20 menit)` : /^r/.test(S.dur) ? `<b>${S.dur.slice(1)} ronde</b>` : `<b>${S.dur.slice(1)} menit</b>`);

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
      horn() { tone(147, 0.55, 'sawtooth', 0.05); tone(220, 0.55, 'sawtooth', 0.035, 0.02); tone(294, 0.4, 'triangle', 0.04, 0.45); },
      cannon() { noise(0.45, 0.5, 0, 'lowpass', 1400, 90); tone(90, 0.4, 'sine', 0.32, 0, 38); noise(0.08, 0.3, 0, 'highpass', 2500); },
      whistle(d) { tone(1500, Math.max(0.1, d), 'sine', 0.025, 0.05, 520); },
      splash() { noise(0.55, 0.32, 0, 'bandpass', 2600, 500, 0.9); noise(0.3, 0.18, 0.08, 'highpass', 3500); tone(420, 0.12, 'sine', 0.05, 0.05, 900); },
      boom() { noise(0.9, 0.55, 0, 'lowpass', 1800, 60); tone(70, 0.7, 'sine', 0.35, 0, 30); noise(0.25, 0.25, 0.05, 'bandpass', 900, null, 1.2); },
      sink() { [392, 349, 311, 262, 196].forEach((f, i) => tone(f, 0.34, 'triangle', 0.06, 0.1 + i * 0.15)); for (let i = 0; i < 6; i++) tone(500 + Math.random() * 500, 0.06, 'sine', 0.05, 0.6 + i * 0.12, 1300); noise(1.1, 0.25, 0, 'lowpass', 700, 90); },
      sonar() { [0, 0.45].forEach((d, i) => { tone(1180, 0.5, 'sine', i ? 0.03 : 0.07, d); tone(2360, 0.25, 'sine', i ? 0.01 : 0.02, d); }); },
      shield() { tone(1568, 0.5, 'triangle', 0.06, 0, 1180); tone(2093, 0.4, 'sine', 0.045, 0.06); noise(0.25, 0.1, 0, 'highpass', 5200); tone(523, 0.35, 'sine', 0.06, 0.02); },
      reward() { [784, 988, 1175, 1568, 1976].forEach((f, i) => bell(f, 0.6, 0.07, i * 0.07)); },
      load() { noise(0.12, 0.3, 0, 'bandpass', 900, null, 3); tone(300, 0.08, 'square', 0.05, 0.12); noise(0.12, 0.3, 0.2, 'bandpass', 1300, null, 3); },
      rebut() { [880, 1175, 880, 1175].forEach((f, i) => tone(f, 0.08, 'square', 0.04, i * 0.09)); noise(0.2, 0.15, 0, 'bandpass', 2500, null, 3); },
      think() { [0, 0.18, 0.36].forEach((d) => tone(1200, 0.04, 'sine', 0.035, d)); },
      fail() { tone(392, 0.2, 'triangle', 0.08, 0, 300); tone(311, 0.32, 'triangle', 0.07, 0.17, 200); },
      eliminated() { noise(0.8, 0.45, 0, 'lowpass', 900, 70); tone(98, 0.9, 'sawtooth', 0.07, 0, 40); [523, 415, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.07, 0.15 + i * 0.14)); bell(73, 2, 0.22, 0.9); },
      aim() { tone(660, 0.05, 'square', 0.025); },
      click() { tone(720, 0.04, 'square', 0.03); }
    };
  })();

  /* ------------------------------ Gambar kapal (SVG, tampak atas) ------------------------------ */
  const hull = (x0, x1, hw) => { const L = x1 - x0; return `M${x0} ${50 - hw * 0.78}L${x0 + L * 0.6} ${50 - hw}Q${x1 - L * 0.07} ${50 - hw * 0.72} ${x1} 50Q${x1 - L * 0.07} ${50 + hw * 0.72} ${x0 + L * 0.6} ${50 + hw}L${x0} ${50 + hw * 0.78}Q${x0 - 7} 50 ${x0} ${50 - hw * 0.78}Z`; };
  const sailC = (x, hw, col, w = 14) => `<path d="M${x - 6} ${50 - hw - 13}Q${x + w + 8} 50 ${x - 6} ${50 + hw + 13}L${x - 14} ${50 + hw + 9}Q${x + w - 6} 50 ${x - 14} ${50 - hw - 9}Z" fill="${col}" stroke="#3b2a1a" stroke-width="2.5" stroke-linejoin="round"/>`;
  function shipBody(type, col, W) {
    const base = (hw, wood, deck, x0 = 12, x1 = W - 4) => `<path d="${hull(x0, x1, hw)}" fill="#1b1209" stroke="#1b1209" stroke-width="9" stroke-linejoin="round"/><path d="${hull(x0, x1, hw)}" fill="${wood}" stroke="${col}" stroke-width="4.5" stroke-linejoin="round"/><path d="${hull(x0 + 9, x1 - 14, hw * 0.66)}" fill="${deck}"/>` +
      `<path d="M${x0 + 12} ${50 - hw * 0.28}H${x1 - 24}M${x0 + 12} ${50 + hw * 0.28}H${x1 - 24}" stroke="rgba(60,30,10,.28)" stroke-width="2"/>`;
    const mast = (x) => `<circle cx="${x}" cy="50" r="6" fill="#5b3412" stroke="#1b1209" stroke-width="2"/>`;
    switch (type) {
      case 'jung': return base(34, '#7c3a1a', '#b9763f') + `<rect x="20" y="30" width="60" height="40" rx="6" fill="#8b4513" stroke="#1b1209" stroke-width="3"/>` +
        [150, 265, 380].map((x) => `<rect x="${x - 12}" y="6" width="24" height="88" rx="5" fill="${col}" stroke="#2a1508" stroke-width="3"/>` + [20, 35, 50, 65, 80].map((y) => `<line x1="${x - 12}" y1="${y}" x2="${x + 12}" y2="${y}" stroke="rgba(0,0,0,.35)" stroke-width="2.5"/>`).join('') + mast(x)).join('');
      case 'pinisi': return base(30, '#a0612f', '#d99c5e') + `<rect x="22" y="36" width="46" height="28" rx="5" fill="${col}" stroke="#1b1209" stroke-width="3"/><path d="M${W - 6} 50L${W - 60} 50" stroke="#5b3412" stroke-width="3"/>` +
        sailC(155, 30, '#fff7e0', 22) + sailC(255, 30, '#fff7e0', 22) + `<path d="M${W - 70} 30Q${W - 30} 50 ${W - 70} 70Z" fill="#fff7e0" stroke="#3b2a1a" stroke-width="2.5"/>` + mast(160) + mast(260);
      case 'lancang': return base(28, '#9a5a2c', '#d6995a') + `<rect x="24" y="38" width="40" height="24" rx="5" fill="#7a3f17" stroke="#1b1209" stroke-width="3"/>` +
        `<rect x="150" y="10" width="26" height="80" rx="6" fill="${col}" stroke="#2a1508" stroke-width="3"/><rect x="150" y="42" width="26" height="16" fill="#fff" opacity=".85"/>` + mast(163);
      case 'patroli': return `<path d="${hull(12, W - 4, 27)}" fill="#1e293b" stroke="#1e293b" stroke-width="9" stroke-linejoin="round"/><path d="${hull(12, W - 4, 27)}" fill="#d6dde6" stroke="${col}" stroke-width="4.5"/>` +
        `<path d="${hull(22, W - 18, 18)}" fill="#eef2f6"/><path d="M60 24L90 76" stroke="${col}" stroke-width="7"/><rect x="95" y="32" width="90" height="36" rx="6" fill="#94a3b8" stroke="#334155" stroke-width="3"/>` +
        `<rect x="160" y="38" width="16" height="24" rx="3" fill="#0f172a"/><circle cx="125" cy="50" r="10" fill="#f8fafc" stroke="#334155" stroke-width="3"/><circle cx="235" cy="50" r="11" fill="#64748b" stroke="#1e293b" stroke-width="3"/><path d="M240 50H280" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>`;
      case 'sandeq': return `<path d="M70 50V88M135 50V88" stroke="#5b3412" stroke-width="5"/><ellipse cx="102" cy="88" rx="66" ry="6" fill="#e2e8f0" stroke="#1b1209" stroke-width="3"/>` +
        base(15, '#f8fafc', '#e5e7eb') + sailC(100, 18, col, 18) + mast(104);
      case 'jukung': return `<path d="M70 12V88M130 12V88" stroke="#5b3412" stroke-width="5"/><ellipse cx="100" cy="12" rx="60" ry="5" fill="#fde68a" stroke="#1b1209" stroke-width="3"/><ellipse cx="100" cy="88" rx="60" ry="5" fill="#fde68a" stroke="#1b1209" stroke-width="3"/>` +
        base(14, col, '#fef3c7') + sailC(100, 16, '#fff7e0', 14) + mast(104);
      default: return base(26, '#a0612f', '#d99c5e');
    }
  }
  const svgCache = new Map();
  function shipSVG(type, col, vertical = false) {
    const k = type + col + vertical; if (svgCache.has(k)) return svgCache.get(k);
    const W = SHIPS[type].len * 100; const body = shipBody(type, col, W);
    const s = `<svg viewBox="0 0 ${vertical ? 100 : W} ${vertical ? W : 100}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${vertical ? `<g transform="rotate(90 50 50)">${body}</g>` : body}</svg>`;
    svgCache.set(k, s); return s;
  }

  /* ------------------------------ Penempatan armada acak ------------------------------ */
  function placeFleet(g, types, rng = Math.random) {
    const lens = types.map((t) => SHIPS[t].len);
    const order = types.map((_, i) => i).sort((a, b) => lens[b] - lens[a]);
    for (let attempt = 0; attempt < 600; attempt++) {
      const noTouch = attempt < 450; // kapal tidak bersentuhan (lebih adil & seru); cadangan: boleh bersentuhan
      const occ = new Int16Array(g * g).fill(-1); const ships = []; let ok = true;
      for (const i of order) {
        const L = lens[i]; const cand = [];
        for (let d = 0; d < 2; d++) for (let r = 0; r < g; r++) for (let c = 0; c < g; c++) {
          const cells = []; let fit = true;
          for (let k = 0; k < L && fit; k++) {
            const rr = r + (d ? k : 0); const cc = c + (d ? 0 : k);
            if (rr >= g || cc >= g || occ[rr * g + cc] >= 0) { fit = false; break; }
            if (noTouch) for (let dr = -1; dr <= 1 && fit; dr++) for (let dc = -1; dc <= 1; dc++) { const a = rr + dr; const b = cc + dc; if (a >= 0 && b >= 0 && a < g && b < g && occ[a * g + b] >= 0) { fit = false; break; } }
            cells.push([rr, cc]);
          }
          if (fit) cand.push({ r, c, d, cells });
        }
        if (!cand.length) { ok = false; break; }
        const pk = cand[Math.floor(rng() * cand.length)];
        pk.cells.forEach(([rr, cc]) => (occ[rr * g + cc] = i));
        ships[i] = { type: types[i], name: SHIPS[types[i]].name, len: L, r: pk.r, c: pk.c, dir: pk.d ? 'v' : 'h', cells: pk.cells, hits: 0, sunk: false };
      }
      if (ok) return { ships, occ };
    }
    return null;
  }
  function validFleet(f, g, types) {
    if (!f) return 'kosong';
    const seen = new Set();
    for (let i = 0; i < types.length; i++) {
      const s = f.ships[i]; if (!s || s.len !== SHIPS[types[i]].len || s.cells.length !== s.len) return 'panjang';
      for (let k = 0; k < s.len; k++) {
        const [r, c] = s.cells[k]; if (r < 0 || c < 0 || r >= g || c >= g) return 'keluar';
        const key = r * g + c; if (seen.has(key)) return 'tumpang'; seen.add(key);
        if (f.occ[key] !== i) return 'occ';
        if (k && (s.dir === 'h' ? r !== s.cells[0][0] || c !== s.cells[0][1] + k : c !== s.cells[0][1] || r !== s.cells[0][0] + k)) return 'garis';
      }
    }
    for (let k = 0; k < g * g; k++) if (f.occ[k] >= 0 && !seen.has(k)) return 'sisa';
    return '';
  }

  /* ------------------------------ Tim & anggota ------------------------------ */
  function parseMembers(txt) {
    const s = String(txt || '').trim(); if (!s) return [];
    if (/^\d{1,2}$/.test(s)) { const n = clamp(+s, 1, 12); return Array.from({ length: n }, (_, i) => `Anggota ${i + 1}`); }
    return s.split(/[,;\n]+/).map((x) => x.trim().slice(0, 18)).filter(Boolean).slice(0, 12);
  }
  const peekAnswerer = (p) => (p && p.members && p.members.length ? p.members[p.mi % p.members.length] : null);
  function takeAnswerer(p) { const m = peekAnswerer(p); if (m) p.mi = (p.mi + 1) % p.members.length; return m; }

  /* ------------------------------ Papan (DOM) ------------------------------ */
  const boardsEl = $('boards'); const stage = $('stage');
  function buildBoards() {
    const colsH = Array.from({ length: G }, (_, c) => `<span>${COLS[c]}</span>`).join('');
    const rowsH = Array.from({ length: G }, (_, r) => `<span>${r + 1}</span>`).join('');
    boardsEl.innerHTML = P.map((p, i) => `<section class="board" id="bd${i}" data-t="${i}" style="--pc:${p.color}">
      <header class="bh"><span class="bh-av">${p.ai ? '🤖' : p.avatar}</span>
        <div class="bh-main"><div class="bh-name"><b>${esc(p.name)}</b><kbd>${i + 1}</kbd><span class="bh-turn">▶ GILIRAN</span></div>
          <div class="bh-sub"><span class="bh-fleet" id="fl${i}"></span><span class="bh-ans" id="an${i}"></span></div></div>
        <div class="bh-wpn" id="wp${i}"></div></header>
      <div class="gw"><div class="cx top">${colsH}</div><div class="cx left">${rowsH}</div>
        <div class="grid" id="gr${i}">${Array.from({ length: G * G }, (_, k) => `<button class="cell" data-k="${k}" aria-label="${cellName((k / G) | 0, k % G)}" tabindex="-1"></button>`).join('')}
          <div class="ships" id="sh${i}"></div><div class="sweep"></div><div class="shieldfx"></div></div></div>
      <div class="bstamp"><b>🌊 ARMADA TENGGELAM</b><small>🗼 tetap ikut Soal Rebutan</small></div>
    </section>`).join('');
    boardsEl.style.setProperty('--g', G);
    cellsEl = P.map((_, i) => [...$('gr' + i).querySelectorAll('.cell')]);
    boardsEl.querySelectorAll('.shieldfx').forEach((sf) => sf.addEventListener('animationend', (e) => { if (e.animationName === 'shieldPop') sf.classList.remove('pop'); }));
    renderTabs(true);
  }
  function renderCell(t, k) {
    const p = P[t]; const el = cellsEl[t] && cellsEl[t][k]; if (!el) return;
    const st = p.grid[k];
    let cls = 'cell ' + (st === 0 ? 'u' : st === 1 ? 'miss' : st === 2 ? 'hit' : 'sunk');
    if (st === 0 && p.deflect.has(k)) cls += ' deflect';
    if (phase === 'aim' && t === target && cursor.r * G + cursor.c === k) cls += ' cur';
    if (el.className !== cls) el.className = cls;
  }
  function renderGrid(t) { for (let k = 0; k < G * G; k++) renderCell(t, k); }
  function addShipSprite(t, si, cls) {
    const p = P[t]; const s = p.ships[si]; const box = $('sh' + t); if (!box) return null;
    const old = box.querySelector(`.ship[data-s="${si}"]`); if (old) old.remove();
    const el = document.createElement('div'); el.className = 'ship ' + cls; el.dataset.s = si;
    const v = s.dir === 'v'; el.style.gridArea = `${s.r + 1} / ${s.c + 1} / ${s.r + 1 + (v ? s.len : 1)} / ${s.c + 1 + (v ? 1 : s.len)}`;
    el.innerHTML = shipSVG(s.type, p.color, v); box.appendChild(el); return el;
  }
  function renderRadar(t) {
    const box = $('sh' + t); if (!box) return;
    box.querySelectorAll('.rdr').forEach((x) => x.remove());
    P[t].radar.forEach((z) => { const el = document.createElement('div'); el.className = 'rdr' + (z.n ? '' : ' zero'); el.style.gridArea = `${z.r + 1} / ${z.c + 1}`; el.innerHTML = `<b>${z.n}</b>`; el.title = `Radar: ${z.n} petak kapal di sekitar ${cellName(z.r, z.c)}`; box.appendChild(el); });
  }
  const pipsHTML = (p) => `<span class="pips">${p.ships.map((s) => `<i class="${s.sunk ? 'x' : ''}" title="${esc(s.name)} (${s.len} petak)${s.sunk ? ' — tenggelam' : ''}">${'<u></u>'.repeat(s.len)}</i>`).join('')}</span><b>${shipsLeft(p)}/${p.ships.length}</b><span class="pts" title="Poin: sisa petak kapal + petak lawan yang kena + 3 per kapal lawan tenggelam">🏅${score(p)}</span>`;
  function wpnHTML(p) {
    if (S.weapons !== 'on' && !p.shield) return '';
    const w = Object.keys(WEAPONS).filter((k) => p.weapons[k] > 0).map((k) => `<span class="wb" title="${WEAPONS[k].name} ×${p.weapons[k]}">${WEAPONS[k].ic}${p.weapons[k] > 1 ? `<i>${p.weapons[k]}</i>` : ''}</span>`).join('');
    return (p.shield ? '<span class="wb on" title="Perisai aktif: menangkis 1 tembakan kena">🛡️<em>AKTIF</em></span>' : '') + w + (p.streak >= 1 && !p.out ? `<span class="wb st" title="Jawaban benar beruntun">🔥${p.streak}</span>` : '') + (p.stars ? `<span class="wb star" title="Rebutan berhasil dari Benteng Pantai">⭐${p.stars}</span>` : '');
  }
  function renderBoards() {
    const inPlay = !['idle', 'brief', 'over'].includes(phase);
    const aiming = phase === 'aim' || phase === 'firing';
    P.forEach((p, i) => {
      const b = $('bd' + i); if (!b) return;
      const tg = aiming && i !== shooter && !p.out;
      b.classList.toggle('turn', inPlay && i === turn && !p.out);
      b.classList.toggle('shooter', aiming && i === shooter);
      b.classList.toggle('tgt', tg);
      b.classList.toggle('focus', aiming && i === target && tg);
      b.classList.toggle('own', aiming && i === shooter);
      b.classList.toggle('out', !!p.out);
      b.classList.toggle('shield', !!p.shield);
      b.classList.toggle('radar', phase === 'aim' && radarMode && tg);
      b.classList.toggle('hide', compact && i !== view);
      setHTML($('fl' + i), pipsHTML(p));
      setHTML($('wp' + i), wpnHTML(p));
      const ans = inPlay && i === turn && !p.ai && !p.out ? (curAnswerer || (peekAnswerer(p) && peekAnswerer(p).name)) : null;
      setHTML($('an' + i), ans ? `🙋 ${esc(ans)}` : p.out ? '🗼 Benteng Pantai' : '');
      renderGrid(i);
    });
    boardsEl.classList.toggle('aiming', phase === 'aim');
    renderTabs();
  }
  function renderTabs(force) {
    const tabs = $('tabs'); tabs.hidden = !compact; if (!compact) return;
    const aiming = phase === 'aim' || phase === 'firing';
    const sig = P.map((p) => p.name + p.color).join('|');
    if (force || tabs._sig !== sig) {
      tabs._sig = sig;
      tabs.innerHTML = P.map((p, i) => `<button class="tab" data-v="${i}" style="--pc:${p.color}"><span>${p.ai ? '🤖' : p.avatar}</span><b>${esc(p.name)}</b><small></small></button>`).join('');
      tabs.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { SND.click(); setView(+b.dataset.v); }));
    }
    tabs.querySelectorAll('[data-v]').forEach((b) => {
      const i = +b.dataset.v; const p = P[i]; if (!p) return;
      b.classList.toggle('on', i === view); b.classList.toggle('out', !!p.out);
      b.classList.toggle('tg', aiming && i !== shooter && !p.out); b.classList.toggle('me', aiming && i === shooter);
      setText(b.querySelector('small'), p.out ? '🌊' : aiming && i === shooter ? 'lautmu' : `🚢${shipsLeft(p)}`);
    });
  }
  function setView(i) {
    if (!P[i]) return; view = i;
    if ((phase === 'aim') && i !== shooter && !P[i].out) target = i;
    renderBoards(); renderHud();
  }

  /* ------------------------------ HUD ------------------------------ */
  function setText(el, v) { v = String(v); if (el && el.textContent !== v) el.textContent = v; }
  function setHTML(el, v) { if (el && el._h !== v) { el._h = v; el.innerHTML = v; } }
  const clock = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  function renderInfo() {
    const cap = maxRounds();
    setText($('roundNo'), cap === Infinity ? round : Math.min(round, cap)); setText($('roundMax'), cap === Infinity ? '' : '/' + cap);
    const lim = timeLimit(); const el = tStart && !['idle', 'brief'].includes(phase) ? Date.now() - tStart : 0;
    setText($('clockLbl'), lim ? 'SISA WAKTU' : 'WAKTU'); setText($('clockNo'), lim ? clock(lim - el) : clock(el));
    $('clockNo').parentElement.classList.toggle('warn', !!lim && lim - el < 60000 && tStart > 0 && phase !== 'over');
    setText($('aliveNo'), P.length ? `${alive().length}/${P.length}` : '0');
    $('roundNo').parentElement.parentElement.classList.toggle('warn', cap !== Infinity && round >= cap && !['idle', 'brief', 'over'].includes(phase));
  }
  const nm = (p) => `<b style="color:${p.color}">${esc(p.name)}</b>`;
  function addLog(html) { logList.unshift(html); if (logList.length > 60) logList.pop(); }
  function hintText() {
    const p = cur(); if (!p) return '';
    const sh = P[shooter];
    switch (phase) {
      case 'brief': return '⚓ Baca panduan, lalu klik <b>MULAI PERTEMPURAN</b> (Spasi).';
      case 'turn': return p.ai ? `🤖 ${esc(p.name)} bersiap…` : `${nm(p)} bersiap menjawab soal${peekAnswerer(p) ? ` — penjawab: <b>${esc(peekAnswerer(p).name)}</b>` : ''}. Klik <b>JAWAB SOAL</b> / Spasi.`;
      case 'quiz': return `❓ ${nm(p)} sedang menjawab…`;
      case 'rebut': return '⚡ Soal Rebutan! Tim lain cepat klik tombol timnya.';
      case 'ai': return `🤖 ${esc(p.name)} sedang berpikir…`;
      case 'aim':
        if (!sh) return '';
        if (sh.ai) return `🤖 ${esc(sh.name)} sedang membidik…`;
        if (radarMode) return `🔭 <b>Radar:</b> ketuk titik tengah area 3×3 di laut lawan untuk dipindai.`;
        return `🎯 ${nm(sh)}: ketuk petak di laut ${enemiesOf(shooter).length > 1 ? 'tim lawan mana pun' : esc(enemiesOf(shooter)[0] ? enemiesOf(shooter)[0].name : 'lawan')} untuk menembak! <span class="kb">(panah + Enter${enemiesOf(shooter).length > 1 ? ', Tab = ganti laut' : ''})</span>`;
      case 'firing': return '💥 Tembak!';
      case 'over': return '🏁 Pertempuran selesai!';
      default: return '';
    }
  }
  let hintTimer = 0;
  function hintBad(msg) { const h = $('hint'); h._h = null; h.innerHTML = '✖ ' + esc(msg); h.classList.remove('bad'); void h.offsetWidth; h.classList.add('bad'); clearTimeout(hintTimer); hintTimer = setTimeout(() => { hintTimer = 0; h.classList.remove('bad'); renderHud(); }, 2200); SND.fail(); }
  const B_ = (act, cls, ic, label, key, dis, extra = '') => `<button class="cbtn ${cls}" data-act="${act}" ${dis ? 'disabled' : ''}><span class="ic">${ic}</span><span class="lb">${label}${extra}</span>${key ? `<small>${key}</small>` : ''}</button>`;
  function renderHud() {
    const p = cur(); const tc = $('turnChip');
    const who = (phase === 'aim' || phase === 'firing') && P[shooter] ? P[shooter] : p;
    setHTML(tc, who && !['idle'].includes(phase) ? `<span class="tc" style="--pc:${who.color}"><span class="tc-av">${who.ai ? '🤖' : who.avatar}</span><span><small>${(phase === 'aim' || phase === 'firing') ? (shooter !== turn ? (who.out ? '🗼 BENTENG PANTAI' : '⚡ PEREBUT') : 'MENEMBAK') : 'GILIRAN'}</small><b>${esc(who.name)}</b></span></span>` : '');
    if (!hintTimer) setHTML($('hint'), hintText());
    let acts = '';
    if (phase === 'turn' && p && !p.ai) acts = B_('ask', 'main', '❓', 'JAWAB SOAL', 'SPASI', false);
    else if ((phase === 'aim' || phase === 'firing') && P[shooter] && !P[shooter].ai) {
      const sh = P[shooter]; const busy = phase !== 'aim';
      acts = `<span class="shots" title="Sisa tembakan"><span>🎯</span><b>${shots}</b><small>TEMBAKAN</small></span>`;
      if (S.weapons === 'on') acts += Object.keys(WEAPONS).map((k) => B_('w:' + k, 'wpn' + (k === 'radar' && radarMode ? ' on' : '') + (sh.weapons[k] ? ' has' : ''), WEAPONS[k].ic, WEAPONS[k].name, WEAPONS[k].key, busy || (!sh.weapons[k] && !(k === 'radar' && radarMode)) || (k === 'perisai' && sh.shield) || sh.out && k === 'perisai', `<i>×${sh.weapons[k]}</i>`)).join('');
    } else if (phase === 'over') acts = B_('again', 'main', '🔁', 'MAIN LAGI', '', false);
    setHTML($('acts'), acts);
    $('acts').querySelectorAll('[data-act]').forEach((b) => (b.onclick = (e) => { e.currentTarget.blur(); doAct(b.dataset.act); }));
    renderInfo();
  }
  function doAct(a) {
    if (a === 'ask') askQuestion();
    else if (a === 'again') newGame();
    else if (a.startsWith('w:')) useWeapon(a.slice(2));
  }
  function renderAll() { renderBoards(); renderHud(); }

  /* ------------------------------ Tata letak responsif ------------------------------ */
  function layout() {
    const W = stage.clientWidth; const H = stage.clientHeight; const N = P.length || 2; if (!W || !H) return;
    const phone = W < 640; const hb = phone ? 44 : W > 1700 ? 62 : 54; const pad = phone ? 12 : 20; const gap = phone ? 8 : 14; const k = G + 0.5;
    let best = { cell: 0, cols: 1 };
    for (let cols = 1; cols <= N; cols++) {
      const rows = Math.ceil(N / cols);
      const cw = ((W - gap * (cols + 1)) / cols - pad) / k; const ch = ((H - gap * (rows + 1)) / rows - hb - pad) / k;
      const cell = Math.min(cw, ch); if (cell > best.cell + 0.5) best = { cell, cols };
    }
    const wasCompact = compact;
    // terlalu kecil untuk disentuh -> satu laut besar + tombol pilih laut (tab)
    compact = phone || best.cell < 24 || (N >= 3 && best.cell < 26);
    let cell = best.cell; let cols = best.cols;
    if (compact) { cols = 1; cell = Math.min((W - gap * 2 - pad) / k, (H - 54 - gap * 2 - hb - pad) / k); }
    cell = Math.floor(clamp(cell, 14, 84));
    stage.style.setProperty('--cell', cell + 'px'); stage.style.setProperty('--hb', hb + 'px');
    boardsEl.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    stage.classList.toggle('compact', compact); stage.classList.toggle('phone', phone);
    if (compact !== wasCompact || compact) { if (!P[view]) view = 0; }
    renderTabs(true); renderBoards();
  }
  let relayoutQ = false;
  function queueRelayout() { if (!relayoutQ) { relayoutQ = true; requestAnimationFrame(() => { relayoutQ = false; layout(); }); } }
  addEventListener('resize', queueRelayout);
  if (window.ResizeObserver) new ResizeObserver(queueRelayout).observe(stage);

  /* ------------------------------ Hiasan laut ------------------------------ */
  $('deco').innerHTML = `<svg class="isle i1" viewBox="0 0 220 120"><ellipse cx="110" cy="92" rx="100" ry="24" fill="#f3d9a0"/><path d="M28 92Q60 40 110 46Q160 40 192 92Z" fill="#2f9e5b"/><path d="M60 80Q92 52 120 58" stroke="#237a45" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M150 60V22" stroke="#7a4a1e" stroke-width="5"/><path d="M150 24Q130 14 118 26M150 24Q170 12 184 26M150 24Q138 30 132 44M150 24Q164 32 168 46" stroke="#22a35a" stroke-width="7" fill="none" stroke-linecap="round"/></svg>` +
    `<svg class="isle i2" viewBox="0 0 160 90"><ellipse cx="80" cy="70" rx="74" ry="16" fill="#f3d9a0"/><path d="M18 70Q52 26 96 34Q130 38 144 70Z" fill="#3aa865"/></svg>` +
    `<div class="lighthouse"><div class="beam"></div><svg viewBox="0 0 120 220"><ellipse cx="60" cy="204" rx="56" ry="14" fill="#6b7280"/><path d="M40 200L48 70H72L80 200Z" fill="#f8fafc" stroke="#1f2937" stroke-width="3"/><path d="M42 170L78 170L80 196L40 196Z M45 120L75 120L76 146L44 146Z M47 82L73 82L74 100L46 100Z" fill="#dc2626"/><rect x="44" y="52" width="32" height="20" rx="3" fill="#fde047" stroke="#1f2937" stroke-width="3"/><path d="M38 52L60 30L82 52Z" fill="#b91c1c" stroke="#1f2937" stroke-width="3"/><rect x="34" y="70" width="52" height="6" fill="#1f2937"/></svg></div>` +
    `<svg class="boat b1" viewBox="0 0 80 60"><path d="M8 40H72L62 52H18Z" fill="#7a4a1e"/><path d="M40 6V40M40 8L64 36H40ZM40 12L20 36H40Z" fill="#fff7e0" stroke="#5b3412" stroke-width="2"/></svg>`;

  /* ------------------------------ Efek visual ------------------------------ */
  const fxL = $('fx');
  const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
  const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && el.closest('.board:not(.hide)') !== null; };
  function fxEl(cls, x, y, size) { const e = document.createElement('div'); e.className = cls; e.style.left = x + 'px'; e.style.top = y + 'px'; if (size) e.style.setProperty('--s', size + 'px'); fxL.appendChild(e); return e; }
  function shotOrigin(from) {
    const av = $('bd' + from) && $('bd' + from).querySelector('.bh-av');
    if (visible(av)) return center(av);
    const r = stage.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom - 6 };
  }
  function shotAnim(from, t, k) {
    return new Promise((res) => {
      const tgt = cellsEl[t][k]; if (!tgt) { res(); return; }
      const B = center(tgt); const A = shotOrigin(from);
      SND.cannon();
      FX.burst(A.x, A.y, { emojis: ['💨', '💥'], count: PN(5), spread: 46, size: 22, dur: 600, gravity: -30 });
      const ball = fxEl('pl-ball', A.x, A.y);
      const dx = B.x - A.x; const dy = B.y - A.y; const h = clamp(Math.hypot(dx, dy) * 0.45, 70, 300);
      const frames = []; const N = 16;
      for (let i = 0; i <= N; i++) { const q = i / N; const s = 1 + 0.9 * 4 * q * (1 - q); frames.push({ transform: `translate(-50%,-50%) translate(${(dx * q).toFixed(1)}px,${(dy * q - 4 * h * q * (1 - q)).toFixed(1)}px) scale(${s.toFixed(2)})` }); }
      const dur = Math.max(60, 760 * TS);
      SND.whistle(dur / 1000);
      if (!LITE && TS >= 1) for (let i = 1; i < 6; i++) setTimeout(() => { const q = i / 6; const pf = fxEl('pl-puff', A.x + dx * q, A.y + dy * q - 4 * h * q * (1 - q)); pf.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0.8 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], { duration: 600, easing: 'ease-out' }).onfinish = () => pf.remove(); }, (dur * i) / 6);
      ball.animate(frames, { duration: dur, easing: 'cubic-bezier(.3,.1,.7,1)' }).onfinish = () => { ball.remove(); res(); };
    });
  }
  function missFx(t, k) {
    const c = center(cellsEl[t][k]); SND.splash();
    const s = fxEl('pl-splash', c.x, c.y, c.w * 2.2);
    s.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 0.9, offset: 0.5 }, { transform: 'translate(-50%,-50%) scale(1.4)', opacity: 0 }], { duration: 750 * Math.max(TS, 0.2), easing: 'ease-out' }).onfinish = () => s.remove();
    FX.burst(c.x, c.y, { emojis: ['💧', '💦'], count: PN(7), spread: c.w * 1.2, size: 18, dur: 700, gravity: 40 });
    FX.floatText(c.x, c.y - 10, 'MELESET', '#e0f2fe', clamp(c.w * 0.45, 16, 30));
  }
  function hitFx(t, k) {
    const c = center(cellsEl[t][k]); SND.boom();
    const b = fxEl('pl-boom', c.x, c.y, c.w * 2.6);
    b.animate([{ transform: 'translate(-50%,-50%) scale(.15)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.35 }, { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }], { duration: 650 * Math.max(TS, 0.2), easing: 'ease-out' }).onfinish = () => b.remove();
    FX.burst(c.x, c.y, { emojis: ['💥', '🔥', '✨'], count: PN(14), spread: c.w * 2, size: 24, dur: 900, gravity: 60 });
    FX.ring(c.x, c.y, '#fb923c', c.w * 3.2);
    FX.floatText(c.x, c.y - 12, 'KENA!', '#fde047', clamp(c.w * 0.6, 20, 40));
    FX.shake($('bd' + t), 8, 380);
  }
  function shieldFx(t, k) {
    const c = center(cellsEl[t][k]); SND.shield();
    const sf = $('bd' + t).querySelector('.shieldfx'); sf.classList.remove('pop'); void sf.offsetWidth; sf.classList.add('pop');
    FX.ring(c.x, c.y, '#67e8f9', c.w * 4); FX.burst(c.x, c.y, { emojis: ['🛡️', '✨'], count: PN(8), spread: c.w * 1.5, size: 22 });
    FX.floatText(c.x, c.y - 12, 'DITANGKIS!', '#a5f3fc', clamp(c.w * 0.5, 18, 36));
  }
  async function sinkFx(t, si) {
    const p = P[t]; const s = p.ships[si]; SND.sink();
    const el = addShipSprite(t, si, 'sinking');
    await sleep(80);
    if (el) {
      const c = center(el);
      FX.burst(c.x, c.y, { emojis: ['🫧', '💨', '🔥'], count: PN(12), spread: Math.max(c.w, c.h) * 0.8, size: 22, dur: 1100, gravity: -60 });
    }
    FX.announce('💥 KAPAL TENGGELAM!', { color: '#b91c1c', sub: `${esc(s.name)} milik ${esc(p.name)} karam!`, dur: Math.max(400, 1500 * TS) });
    await sleep(1150);
    if (el) el.className = 'ship sunk';
  }
  function scanFx(t, r, c) {
    SND.sonar();
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const a = r + dr; const b = c + dc; if (a < 0 || b < 0 || a >= G || b >= G) continue;
      const el = cellsEl[t][a * G + b]; el.classList.remove('scan'); void el.offsetWidth; el.classList.add('scan'); setTimeout(() => el.classList.remove('scan'), 1300);
    }
    const ce = center(cellsEl[t][r * G + c]); FX.ring(ce.x, ce.y, '#4ade80', ce.w * 4.5); setTimeout(() => FX.ring(ce.x, ce.y, '#4ade80', ce.w * 3), 350 * TS);
  }

  /* ------------------------------ Soal & Rebutan ------------------------------ */
  const rebutCands = (p) => (S.rebut === 'on' ? P.filter((o) => o !== p && !o.ai) : []);
  function decorateAsk(p, m, rebutable) {
    const o = [...document.querySelectorAll('.qc-overlay.qc-ask')].pop(); if (!o) return;
    if (rebutable) o.classList.add('pl-rebutable');
    const head = o.querySelector('.qc-ask-head'); if (!head) return;
    const el = document.createElement('div'); el.className = 'pl-answerer'; el.style.setProperty('--pc', p.color);
    el.innerHTML = m ? `<span class="who">🙋 Penjawab: <b>${esc(m.name)}</b></span><span class="dis">${S.diskusi === 'off' ? '🤫 Jawab sendiri — tanpa diskusi' : '💬 Boleh diskusi dulu dengan tim'}</span>`
      : `<span class="who">👥 Dijawab bersama <b>${esc(p.name)}</b></span><span class="dis">${S.diskusi === 'off' ? '🤫 Tanpa diskusi' : '💬 Boleh berdiskusi'}</span>`;
    head.insertAdjacentElement('afterend', el);
  }
  function nextReward(p) { return p.streak + 1 >= 2 && S.weapons === 'on' ? REWARD_ORDER[(p.streak + 1 - 2) % 3] : null; }
  async function quiz(p, gid) {
    const q = QC.nextQuestion(); curQ = q;
    const m = takeAnswerer(p); curAnswerer = m ? m.name : null; renderBoards();
    const nr = nextReward(p);
    const badge = `🎯 Benar = tembak${nr ? ` + ${WEAPONS[nr].ic} ${WEAPONS[nr].name}` : ''}`;
    const pr = QC.ask(q, { player: { name: p.name, avatar: p.avatar, color: p.color }, time: S.time, badge });
    decorateAsk(p, m, rebutCands(p).length > 0);
    const r = await pr; curQ = null; curAnswerer = null; const ok = !!r.correct;
    p.asked++; if (ok) p.correct++; if (m) { m.asked++; if (ok) m.correct++; }
    askLog.push({ team: p.id, member: m ? m.name : null, ok }); if (askLog.length > 400) askLog.shift();
    p.streak = ok ? p.streak + 1 : 0;
    if (ok || gid !== gameSeq) return { ok, steal: null, q };
    const steal = await rebutan(p, q, gid);
    return { ok: false, steal, q };
  }
  async function rebutan(active, q, gid) {
    const cands = rebutCands(active); if (!q || phase === 'over') return null;
    if (!cands.length) { QC.toast(`💡 Jawaban benar: <b>${q.correct}. ${esc(q['option' + q.correct])}</b>`); return null; }
    phase = 'rebut'; renderHud(); SND.rebut();
    const waitMs = Math.max(150, 8000 * TS);
    const pick = await QC.modal({
      cls: 'pl-rebut', icon: '⚡', title: 'REBUTAN! Siapa paling cepat?',
      html: `<p class="qc-muted">${esc(active.name)} belum tepat. Tim lain: <b>cepat klik tombol tim kalian!</b> Tim yang paling dulu mengklik berhak menjawab.<br><small>Keyboard: tekan nomor tim.</small></p>
        <div class="rb-q">❓ ${esc(q.question)}</div>
        <div class="rb-grid">${cands.map((o) => `<button class="rb-btn ${o.out ? 'out' : ''}" data-t="${o.id}" style="--pc:${o.color}"><kbd>${o.id + 1}</kbd><span class="av">${o.avatar}</span><b>${esc(o.name)}</b><small>${o.out ? `🗼 Benteng Pantai: benar = ${S.shots} tembakan` : `benar = 🎯 ${S.shots} tembakan`}</small></button>`).join('')}</div>
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
      QC.toast(`💡 Jawaban benar: <b>${q.correct}. ${esc(q['option' + q.correct])}</b>`); addLog('⚡ Rebutan dilewati');
      return null;
    }
    const o = P[pick]; const m = takeAnswerer(o); curAnswerer = m ? m.name : null; curQ = q; renderBoards();
    const pr = QC.ask(q, { player: { name: o.name, avatar: o.avatar, color: o.color }, time: S.time, badge: `⚡ Soal Rebutan • ${o.out ? '🗼 Benteng Pantai' : `benar = 🎯 ${S.shots} tembakan`}` });
    decorateAsk(o, m, false);
    const r = await pr; curQ = null; curAnswerer = null; const ok = !!r.correct;
    o.asked++; if (ok) o.correct++; if (m) { m.asked++; if (ok) m.correct++; }
    askLog.push({ team: o.id, member: m ? m.name : null, ok, rebut: true }); rebutLog.push({ by: o.id, out: !!o.out, ok, round });
    if (gid !== gameSeq) return null;
    if (!ok) { addLog(`${nm(o)} gagal merebut soal`); return null; }
    if (o.out) o.stars = (o.stars || 0) + 1;
    SND.reward();
    FX.announce(o.out ? '🗼 TEMBAKAN BENTENG PANTAI!' : '⚡ REBUTAN BERHASIL!', { color: o.color, sub: `${esc(o.name)} merebut soal — dapat ${S.shots} tembakan!`, dur: Math.max(300, 1200 * TS) });
    addLog(`⚡ ${nm(o)} merebut soal`);
    await sleep(500);
    return o.id;
  }

  /* ------------------------------ Alur giliran ------------------------------ */
  async function startTurn() {
    if (phase === 'over') return; const gid = gameSeq;
    if (alive().length <= 1) { endGame('last'); return; }
    const p = cur(); shooter = -1; shots = 0; chainN = 0; radarMode = false; phase = 'turn'; turnsPlayed++;
    if (compact) view = turn;
    renderAll(); SND.horn();
    const m = peekAnswerer(p);
    FX.announce(`${p.ai ? '🤖' : p.avatar} ${esc(p.name)}`, { color: p.color, sub: p.ai ? 'Komputer bersiap menembak' : m ? `🙋 Penjawab: ${esc(m.name)}` : 'Giliran menjawab soal', dur: Math.max(300, 1150 * TS) });
    if (p.ai) { await sleep(950); if (gid === gameSeq && phase === 'turn') aiTurn(gid); return; }
    if (S.alur === 'on') { await sleep(1150); if (gid === gameSeq && phase === 'turn' && !QC.isBusy()) askQuestion(); }
  }
  async function askQuestion() {
    if (phase !== 'turn' || QC.isBusy()) return false;
    const p = cur(); if (!p || p.ai) return false;
    if (!QC.questions.length) { QC.toast('⚠️ Bank soal kosong. Tambahkan soal di Mode Guru.', 'bad'); return false; }
    const gid = gameSeq; phase = 'quiz'; renderHud();
    const r = await quiz(p, gid);
    if (gid !== gameSeq || phase === 'over') return true;
    if (r.ok) { grantReward(p); beginAim(p.id, S.shots); }
    else if (r.steal != null) beginAim(r.steal, S.shots);
    else endTurn();
    return true;
  }
  function grantReward(p) {
    if (S.weapons !== 'on' || p.streak < 2) return;
    const k = REWARD_ORDER[(p.streak - 2) % 3]; p.weapons[k] = Math.min(3, p.weapons[k] + 1);
    SND.reward(); addLog(`🔥 ${nm(p)} benar ${p.streak}× beruntun: dapat ${WEAPONS[k].ic} ${WEAPONS[k].name}`);
    FX.announce(`${WEAPONS[k].ic} ${WEAPONS[k].name.toUpperCase()}!`, { color: '#0e7490', sub: `🔥 ${p.streak}× benar beruntun — ${WEAPONS[k].desc}`, dur: Math.max(300, 1500 * TS) });
    const b = $('wp' + p.id); if (b) FX.burstAt(b, { emojis: [WEAPONS[k].ic, '✨', '⭐'], count: PN(12), spread: 110 });
  }
  function ensureTarget() {
    const en = enemiesOf(shooter);
    if (!en.length) { target = -1; return; }
    if (!P[target] || P[target].out || target === shooter) {
      // bawaan: lawan berikutnya setelah penembak (urutan meja)
      let i = shooter; for (let k = 0; k < P.length; k++) { i = (i + 1) % P.length; if (i !== shooter && !P[i].out) break; } target = i;
    }
    cursor.r = clamp(cursor.r, 0, G - 1); cursor.c = clamp(cursor.c, 0, G - 1);
    if (compact) view = target;
  }
  function beginAim(sid, n) {
    if (phase === 'over') return;
    shooter = sid; shots = n; chainN = 0; radarMode = false; phase = 'aim';
    ensureTarget(); renderAll(); SND.aim();
    if (P[sid].ai) aiAim(gameSeq);
  }
  async function fire(t, r, c) {
    if (phase !== 'aim') return { ok: false, why: 'phase' };
    t = +t; r = +r; c = +c;
    if (radarMode) return doRadar(t, r, c);
    const T = P[t]; if (!T || T.out || t === shooter) { if (T && t === shooter) hintBad('Itu laut timmu sendiri — tembak laut lawan!'); return { ok: false, why: 'target' }; }
    if (!(r >= 0 && c >= 0 && r < G && c < G)) return { ok: false, why: 'range' };
    const k = r * G + c;
    if (T.grid[k] !== 0) { hintBad('Petak itu sudah ditembak — pilih petak lain'); return { ok: false, why: 'used' }; }
    const gid = gameSeq; const sh = P[shooter];
    phase = 'firing'; shots--; target = t; cursor = { r, c }; if (compact) view = t; renderAll();
    sh.shotsFired++;
    await shotAnim(shooter, t, k);
    if (gid !== gameSeq) return { ok: false, why: 'reset' };
    let res; const si = T.occ[k];
    if (si < 0) { T.grid[k] = 1; res = 'miss'; missFx(t, k); }
    else if (T.shield) { T.shield = false; T.deflect.add(k); res = 'blocked'; shieldFx(t, k); addLog(`🛡️ Perisai ${nm(T)} menangkis tembakan ${nm(sh)}`); }
    else {
      T.deflect.delete(k); T.grid[k] = 2; const ship = T.ships[si]; ship.hits++; sh.hitsDealt++; res = 'hit'; hitFx(t, k);
      renderBoards();
      if (ship.hits >= ship.len) {
        ship.sunk = true; ship.cells.forEach(([a, b]) => (T.grid[a * G + b] = 3)); sh.sunkDealt++; res = 'sunk';
        addLog(`💥 ${nm(sh)} menenggelamkan ${esc(ship.name)} milik ${nm(T)}`);
        await sinkFx(t, si); if (gid !== gameSeq) return { ok: true, res };
      } else addLog(`🔥 ${nm(sh)} mengenai kapal ${nm(T)} di ${cellName(r, c)}`);
    }
    if (res === 'miss') addLog(`💧 ${nm(sh)} meleset di ${cellName(r, c)} (${esc(T.name)})`);
    lastShot = { by: shooter, t, r, c, res }; shotLog.push(lastShot); if (shotLog.length > 600) shotLog.shift();
    renderAll();
    if (!T.out && T.ships.every((s) => s.sunk)) { await eliminate(T, gid); if (gid !== gameSeq) return { ok: true, res }; }
    if (alive().length <= 1) { endGame('last'); return { ok: true, res }; }
    if ((res === 'hit' || res === 'sunk') && S.chain === 'on' && chainN < MAX_CHAIN && enemiesOf(shooter).length) {
      chainN++; shots++;
      FX.announce('💥 KENA! TEMBAK LAGI!', { color: '#c2410c', sub: `Tembakan bonus ${chainN}/${MAX_CHAIN}`, dur: Math.max(300, 1000 * TS) });
    }
    await sleep(res === 'miss' ? 420 : 650);
    if (gid !== gameSeq || phase === 'over') return { ok: true, res };
    if (shots > 0 && enemiesOf(shooter).length) { phase = 'aim'; ensureTarget(); renderAll(); if (P[shooter].ai) aiAim(gid); }
    else endTurn();
    return { ok: true, res };
  }
  async function eliminate(T, gid) {
    T.out = true; outSeq++; T.outOrder = outSeq; T.outRound = round; T.shield = false;
    const place = alive().length + 1; T.place = place;
    elimLog.push({ id: T.id, name: T.name, round, place });
    addLog(`🌊 Armada ${nm(T)} tenggelam seluruhnya (#${place})`);
    SND.eliminated(); renderAll();
    const st = $('stamp');
    st.innerHTML = `<div class="st" style="--pc:${T.color}">🌊 ARMADA TENGGELAM!</div><div class="sub"><b>${esc(T.name)}</b> kehilangan semua kapal — tetap ikut <b>Soal Rebutan</b> dari 🗼 Benteng Pantai.</div>`;
    st.hidden = false; st.classList.remove('show'); void st.offsetWidth; st.classList.add('show');
    await sleep(1900); st.hidden = true;
    if (gid !== gameSeq) return;
    const al = alive();
    if (al.length === 2 && P.length > 2) { FX.announce('⚔️ DUEL TERAKHIR!', { color: '#7c2d12', sub: `${esc(al[0].name)} vs ${esc(al[1].name)}`, dur: Math.max(300, 1500 * TS) }); await sleep(800); }
  }
  function endTurn() {
    if (phase === 'over') return; const gid = gameSeq;
    shooter = -1; shots = 0; radarMode = false;
    if (alive().length <= 1) { endGame('last'); return; }
    if (timeUp()) { endGame('waktu'); return; }
    let i = turn; let wrapped = false;
    for (let k = 0; k < P.length; k++) { i++; if (i >= P.length) { i = 0; wrapped = true; } if (!P[i].out) break; }
    if (wrapped) { round++; if (round > maxRounds()) { round = maxRounds(); endGame('ronde'); return; } }
    turn = i; phase = 'next'; renderAll();
    if (maxRounds() !== Infinity && round === maxRounds() && lastRoundWarned !== round) { lastRoundWarned = round; QC.toast('⏳ <b>Ronde terakhir!</b> Manfaatkan setiap tembakan.', 'bad'); }
    setTimeout(() => { if (gid === gameSeq && phase === 'next') startTurn(); }, 300 * TS);
  }

  /* ------------------------------ Senjata spesial ------------------------------ */
  function useWeapon(kind, t, r, c) {
    if (phase !== 'aim' || S.weapons !== 'on' || !WEAPONS[kind]) return false;
    const p = P[shooter]; if (!p) return false;
    if (kind === 'radar') {
      if (radarMode) { radarMode = false; renderAll(); return true; }
      if (!p.weapons.radar) { hintBad('Belum punya Radar — jawab benar 2× beruntun untuk mendapatkannya'); return false; }
      radarMode = true; renderAll(); SND.aim();
      if (t != null) return doRadar(+t, +r, +c);
      return true;
    }
    if (!p.weapons[kind]) { hintBad(`Belum punya ${WEAPONS[kind].name} — jawab benar beruntun untuk mendapatkannya`); return false; }
    if (kind === 'ganda') {
      p.weapons.ganda--; shots++; SND.load();
      FX.announce('💣 MERIAM GANDA!', { color: '#b45309', sub: '+1 tembakan di giliran ini', dur: Math.max(300, 1100 * TS) });
      addLog(`💣 ${nm(p)} memakai Meriam Ganda`);
    } else if (kind === 'perisai') {
      if (p.shield || p.out) { hintBad(p.out ? 'Armada sudah tenggelam' : 'Perisai sudah aktif'); return false; }
      p.weapons.perisai--; p.shield = true; SND.shield();
      FX.announce('🛡️ PERISAI AKTIF!', { color: '#0e7490', sub: `${esc(p.name)} menangkis 1 tembakan kena berikutnya`, dur: Math.max(300, 1100 * TS) });
      const sf = $('bd' + p.id).querySelector('.shieldfx'); sf.classList.remove('pop'); void sf.offsetWidth; sf.classList.add('pop');
      addLog(`🛡️ ${nm(p)} mengaktifkan Perisai`);
    }
    renderAll(); return true;
  }
  function doRadar(t, r, c) {
    const T = P[t]; const p = P[shooter];
    if (!T || T.out || t === shooter) { hintBad('Pindai laut lawan, bukan laut sendiri'); return { ok: false, why: 'target' }; }
    if (!(r >= 0 && c >= 0 && r < G && c < G) || !p.weapons.radar) return { ok: false, why: 'range' };
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const a = r + dr; const b = c + dc; if (a < 0 || b < 0 || a >= G || b >= G) continue; const k = a * G + b; if (T.occ[k] >= 0 && T.grid[k] === 0) n++; }
    p.weapons.radar--; radarMode = false; target = t; cursor = { r, c };
    T.radar = T.radar.filter((z) => z.r !== r || z.c !== c); T.radar.push({ r, c, n }); renderRadar(t);
    scanFx(t, r, c);
    FX.announce(`🔭 RADAR: ${n} PETAK KAPAL`, { color: '#166534', sub: `di area 3×3 sekitar ${cellName(r, c)} (laut ${esc(T.name)})`, dur: Math.max(300, 1500 * TS) });
    addLog(`🔭 ${nm(p)} memindai ${cellName(r, c)} di laut ${nm(T)}: ${n} petak kapal`);
    renderAll();
    return { ok: true, res: 'radar', n };
  }

  /* ------------------------------ Armada Robo (1 tim) ------------------------------ */
  async function aiTurn(gid) {
    const p = cur(); phase = 'ai'; renderHud();
    const q = QC.nextQuestion(); const pop = $('cpop'); const reb = rebutCands(p).length > 0;
    pop.innerHTML = `<div class="think" style="--pc:${p.color}"><div class="who">🤖 ${esc(p.name)} sedang berpikir</div><div class="q">${q ? esc(q.question) : ''}</div><div class="dots"><span>•</span><span>•</span><span>•</span></div></div>`;
    pop.hidden = false; SND.think();
    await sleep(1400); if (gid !== gameSeq) { pop.hidden = true; return; }
    const ok = Math.random() < AI_ACC; const d = pop.querySelector('.dots');
    if (d) d.outerHTML = `<div class="res ${ok ? 'ok' : 'no'}">${ok ? '✔ BENAR!' : '✘ SALAH'}</div>${q ? (ok || !reb ? `<div class="q">Jawaban: <b>${q.correct}. ${esc(q['option' + q.correct])}</b></div>` : '<div class="q">⚡ Jawaban dirahasiakan — <b>REBUTAN</b>!</div>') : ''}`;
    ok ? SND.reward() : SND.fail();
    await sleep(1000); pop.hidden = true; if (gid !== gameSeq) return;
    p.asked++; if (ok) p.correct++; p.streak = ok ? p.streak + 1 : 0; askLog.push({ team: p.id, member: null, ok });
    if (ok) {
      grantReward(p);
      let n = S.shots;
      if (S.weapons === 'on' && p.weapons.perisai && !p.shield) { p.weapons.perisai--; p.shield = true; SND.shield(); addLog(`🛡️ ${nm(p)} mengaktifkan Perisai`); }
      if (S.weapons === 'on' && p.weapons.ganda) { p.weapons.ganda--; n++; addLog(`💣 ${nm(p)} memakai Meriam Ganda`); }
      beginAim(p.id, n);
    } else {
      const steal = q ? await rebutan(p, q, gid) : null;
      if (gid !== gameSeq) return;
      if (steal != null) beginAim(steal, S.shots); else endTurn();
    }
  }
  function aiPick(sid) {
    const en = enemiesOf(sid); if (!en.length) return null;
    const T = en.reduce((a, b) => (cellsLeft(a) <= cellsLeft(b) ? a : b)); // incar armada paling lemah
    const unknown = (r, c) => r >= 0 && c >= 0 && r < G && c < G && T.grid[r * G + c] === 0;
    const hits = []; for (let k = 0; k < G * G; k++) if (T.grid[k] === 2) hits.push([(k / G) | 0, k % G]);
    const def = [...T.deflect].map((k) => [(k / G) | 0, k % G]).filter(([r, c]) => unknown(r, c));
    if (def.length) return { t: T.id, r: def[0][0], c: def[0][1] };
    if (hits.length) {
      const cand = [];
      for (const [r, c] of hits) {
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          if (!unknown(r + dr, c + dc)) continue;
          const line = hits.some(([a, b]) => a === r - dr && b === c - dc) ? 3 : 1; // perpanjang garis tembakan kena
          cand.push({ r: r + dr, c: c + dc, w: line });
        }
      }
      if (cand.length) { const top = Math.max(...cand.map((x) => x.w)); const best = cand.filter((x) => x.w === top); const pk = best[(Math.random() * best.length) | 0]; return { t: T.id, r: pk.r, c: pk.c }; }
    }
    const all = []; const par = [];
    for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) if (unknown(r, c)) { all.push([r, c]); if ((r + c) % 2 === 0) par.push([r, c]); }
    const pool = par.length ? par : all; if (!pool.length) return null;
    const pk = pool[(Math.random() * pool.length) | 0]; return { t: T.id, r: pk[0], c: pk[1] };
  }
  async function aiAim(gid) {
    await sleep(800); if (gid !== gameSeq || phase !== 'aim' || !P[shooter] || !P[shooter].ai) return;
    const pk = aiPick(shooter); if (!pk) { endTurn(); return; }
    target = pk.t; cursor = { r: pk.r, c: pk.c }; renderBoards(); await sleep(450);
    if (gid !== gameSeq || phase !== 'aim') return;
    fire(pk.t, pk.r, pk.c);
  }

  /* ------------------------------ Akhir permainan ------------------------------ */
  function rankingOrder() {
    const surv = alive().sort((a, b) => score(b) - score(a) || cellsLeft(b) - cellsLeft(a) || b.hitsDealt - a.hitsDealt || b.correct - a.correct);
    const outs = P.filter((p) => p.out).sort((a, b) => b.outOrder - a.outOrder);
    return { surv, order: [...surv, ...outs] };
  }
  function memberDetail(rows) {
    return '<h4>🙋 Jawaban benar tiap anggota</h4>' + rows.map((p) => `<div class="wd" style="--pc:${p.color}"><b>${esc(p.name)}${p.stars ? ` <span class="wstar">⭐${p.stars}</span>` : ''}</b><span>${p.members && p.members.length
      ? p.members.map((m) => `<i>${esc(m.name)} <em>✔${m.correct}</em><small>/${m.asked}</small></i>`).join('') : `<i>✔ ${p.correct} dari ${p.asked} soal</i>`}</span></div>`).join('');
  }
  function endGame(reason) {
    if (phase === 'over') return; phase = 'over'; lastEnd = reason; radarMode = false; shooter = -1;
    $('cpop').hidden = true; $('stamp').hidden = true;
    // ungkap posisi kapal yang masih tersembunyi
    P.forEach((p, t) => p.ships.forEach((s, si) => { if (!s.sunk) addShipSprite(t, si, 'reveal'); }));
    renderAll();
    const { surv, order } = rankingOrder(); const winner = order[0];
    const tie = reason !== 'last' && surv.length > 1 && score(surv[1]) === score(winner) && cellsLeft(surv[1]) === cellsLeft(winner) && surv[1].hitsDealt === winner.hitsDealt && surv[1].correct === winner.correct;
    const why = reason === 'last' ? `Hanya armada <b>${esc(winner.name)}</b> yang masih berlayar` : reason === 'ronde' ? `Batas ${maxRounds()} ronde tercapai — ${surv.length} armada bertahan` : `Waktu ${timeLimit() / 60000} menit habis — ${surv.length} armada bertahan`;
    const title = tie ? 'SERI!' : reason === 'last' ? `${esc(winner.name)} — PENGUASA LAUTAN!` : `${esc(winner.name)} MENANG!`;
    const ranking = order.map((p) => ({
      player: { name: p.name, avatar: p.ai ? '🤖' : p.avatar, color: p.color },
      value: p.out ? `🌊 Tenggelam R${p.outRound}<small>💥 ${p.hitsDealt} kena • ✔ ${p.correct}/${p.asked}${p.stars ? ` • ⭐${p.stars}` : ''}</small>`
        : `🏅 ${score(p)} poin<small>🚢 ${cellsLeft(p)} petak • 💥 ${p.hitsDealt} kena • ⚓ ${p.sunkDealt} karam • ✔ ${p.correct}/${p.asked}${p.stars ? ` • ⭐${p.stars}` : ''}</small>`
    }));
    const note = `${why}. ${reason === 'last' ? '' : `Pemenang = poin terbanyak. ${SCORE_RULE}.`}`;
    addLog(`🏁 Pertempuran selesai. Juara: ${nm(winner)}`);
    QC.showWinner({ title, ranking, unit: '', note }).then((v) => (v === 'setup' ? openSetup() : newGame()));
    const ov = [...document.querySelectorAll('.qc-winner')].pop(); const body = ov && ov.querySelector('.qc-modal-body');
    if (ov) ov.classList.add('pl-win');
    if (body) {
      const d = document.createElement('div'); d.className = 'win-detail';
      d.innerHTML = (elimLog.length ? `<h4>🌊 Urutan tenggelam</h4><div class="win-elim">${[...elimLog].map((e) => `<span style="--pc:${P[e.id].color}"><b>${esc(e.name)}</b> ronde ${e.round} <em>#${e.place}</em></span>`).join('')}</div>` : '') + memberDetail(order);
      body.appendChild(d);
    }
    if (ov) { const b = [...ov.querySelectorAll('.qc-actions button')].find((x) => /Ubah/.test(x.textContent)); if (b) b.textContent = '⚙️ Ubah Tim'; }
  }

  /* ------------------------------ Pengaturan & mulai ------------------------------ */
  const KEY_TIM = 'lokamain_pertempuran-laut_tim';
  const RULES_SHORT = `<ul>
    <li>❓ Tim bergiliran menjawab soal. <b>Benar = tembak</b> laut lawan.</li>
    <li>💥 Kena = tembak lagi. Tenggelamkan semua kapal lawan!</li>
    <li>🔥 Benar beruntun = senjata: 🔭 Radar • 💣 Meriam Ganda • 🛡️ Perisai.</li>
    <li>⚡ Salah = <b>Soal Rebutan</b> untuk tim lain.</li></ul>`;
  const RULES = () => `
    <h4>🎯 Tujuan</h4><ul><li>${WIN_RULE}</li><li>${SCORE_RULE}. Seri: sisa petak kapal terbanyak.</li><li>Armada tiap tim disebar <b>acak</b> dan dirahasiakan — semua laut tampil di satu layar, hanya bekas tembakan yang terlihat.</li></ul>
    <h4>🔁 Giliran</h4><ul>
      <li>❓ Anggota tim <b>bergiliran</b> menjawab soal (nama penjawab tampil di layar). ${S.diskusi === 'off' ? 'Tanpa diskusi.' : 'Boleh diskusi, penjawab yang memilih.'}</li>
      <li>✅ Benar = <b>${S.shots} tembakan</b>: ketuk petak di laut lawan (keyboard: panah + Enter; 3–4 tim: Tab / nomor tim untuk ganti laut).</li>
      <li>💥 <b>KENA</b> = api menyala & ${S.chain === 'on' ? `<b>tembak lagi</b> (maks. ${MAX_CHAIN} tembakan bonus per giliran)` : 'giliran selesai'}. 💧 <b>MELESET</b> = percikan air. Semua petak sebuah kapal kena = <b>KAPAL TENGGELAM!</b></li>
      <li>⚡ Salah = <b>Soal Rebutan</b>: tim lain berebut klik tombol timnya (keyboard: nomor tim). Benar = ${S.shots} tembakan untuk perebut.</li></ul>
    ${S.weapons === 'on' ? `<h4>🔥 Senjata spesial (benar beruntun di giliran sendiri)</h4><ul>
      <li>2× beruntun = 🔭 <b>Radar</b> (R): pindai area 3×3, muncul angka jumlah petak kapal yang belum kena.</li>
      <li>3× beruntun = 💣 <b>Meriam Ganda</b> (G): +1 tembakan.</li>
      <li>4× beruntun = 🛡️ <b>Perisai</b> (P): menangkis 1 tembakan yang kena armadamu. Lalu berulang (5× = Radar, dst.).</li>
      <li>Senjata dipakai saat membidik (setelah menjawab benar).</li></ul>` : ''}
    <h4>🗼 Armada tenggelam</h4><ul><li>Tim yang semua kapalnya tenggelam tidak mendapat giliran lagi, tetapi <b>tetap ikut Soal Rebutan</b> dari Benteng Pantai: benar = ${S.shots} tembakan + ⭐.</li></ul>
    <h4>🚢 Armada (${FLEETS[S.size].label})</h4><ul><li>${FLEETS[S.size].ships.map((t) => `${SHIPS[t].name} (${SHIPS[t].len} petak)`).join(' • ')}. Kapal tidak saling bersentuhan.</li></ul>`;
  function customizeSetup(o, st) {
    o.classList.add('pl-setup');
    const panel = o.querySelector('.qc-panel'); const h3 = panel && panel.querySelector('h3');
    if (h3) h3.textContent = '👥 Jumlah Tim';
    o.querySelectorAll('.qc-seg button').forEach((b) => (b.textContent = +b.dataset.n === 1 ? '1 Tim vs 🤖' : `${b.dataset.n} Tim`));
    const tip = o.querySelector('.qc-players + .qc-muted');
    if (tip) tip.textContent = 'Klik ikon untuk ganti lambang • Tulis nama anggota supaya semua murid bergiliran menjawab • 1 tim = melawan Armada Robo';
    const setBox = o.querySelector('.qc-settings'); const h3b = o.querySelectorAll('.qc-panel h3')[1];
    if (h3b) h3b.textContent = '🧭 Siap Berlayar';
    if (setBox) {
      const adv = document.createElement('details'); adv.className = 'pl-adv';
      adv.innerHTML = '<summary>⚙️ Pengaturan lanjutan <small>(opsional — bawaan sudah pas, langsung klik Mulai saja)</small></summary>';
      setBox.insertAdjacentElement('beforebegin', adv); adv.appendChild(setBox);
      const ok = document.createElement('div'); ok.className = 'pl-ready';
      ok.innerHTML = `<div class="pr-pic">${shipSVG('pinisi', '#f5b942')}</div><p>✅ Pengaturan bawaan sudah pas: laut <b>8×8</b>, 5 kapal per tim, ±20 menit. Isi nama tim & anggota, lalu klik <b>▶ MULAI MAIN</b>.</p>`;
      adv.insertAdjacentElement('beforebegin', ok);
    }
    const deco = () => {
      o.querySelectorAll('.qc-prow').forEach((row) => {
        const ni = row.querySelector('[data-name]'); if (!ni) return; const i = +ni.dataset.name;
        const v = ni.value.trim(); if (!v || /^Pemain \d$/.test(v)) { ni.value = TEAM_NAMES[i]; ni.dispatchEvent(new Event('input')); }
        if (!row.querySelector('.pl-mem')) {
          const m = document.createElement('textarea'); m.className = 'qc-input pl-mem'; m.rows = 1; m.maxLength = 300; m.placeholder = '👤 Anggota: Andi, Sari, Budi… (koma/baris baru, atau jumlah mis. 5)';
          m.value = st.members[i] || ''; const fit = () => { m.style.height = 'auto'; m.style.height = Math.min(110, m.scrollHeight + 2) + 'px'; };
          m.oninput = () => { st.members[i] = m.value; fit(); }; requestAnimationFrame(fit); m.onkeydown = (e) => e.stopPropagation(); row.appendChild(m);
        }
      });
    };
    const pl = o.querySelector('.qc-players'); if (pl && window.MutationObserver) new MutationObserver(deco).observe(pl, { childList: true });
    deco();
  }
  async function openSetup() {
    gameSeq++; phase = 'idle'; rebDecide = null; $('brief').hidden = true; $('cpop').hidden = true; $('stamp').hidden = true;
    const saved = store(KEY_TIM) || {};
    const st = { members: Array.isArray(saved.members) ? saved.members.slice(0, 4) : [] };
    const pr = QC.setup({
      logo: '⚓', subtitle: 'Armada tiap tim tersembunyi di lautan. Jawab soal dengan benar untuk menembak — tenggelamkan semua kapal lawan!',
      min: 1, max: 4, defaultCount: 2, defaultNames: TEAM_NAMES, soloLabel: '1 Tim vs 🤖',
      settings: [
        { key: 'laut', label: '🗺️ Ukuran laut', value: 'sedang', options: [['kecil', '6×6 • 4 kapal'], ['sedang', '8×8 • 5 kapal'], ['besar', '10×10 • 5 kapal']] },
        { key: 'batas', label: '🏁 Batas permainan', value: 'auto', options: [['auto', 'Otomatis (±20 menit)'], ['r8', '8 ronde'], ['r10', '10 ronde'], ['r12', '12 ronde'], ['r15', '15 ronde'], ['r20', '20 ronde'], ['t15', '⏰ 15 menit'], ['t20', '⏰ 20 menit'], ['t25', '⏰ 25 menit']] },
        { key: 'tembak', label: '🎯 Jawaban benar', value: 2, options: [[2, '= 2 tembakan (disarankan)'], [1, '= 1 tembakan (lebih lama)']] },
        { key: 'waktu', label: '⏱️ Waktu menjawab', value: 30, options: [[15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [45, '45 detik'], [60, '60 detik']] },
        { key: 'rebut', label: '⚡ Soal Rebutan', value: 'on', options: [['on', 'Nyala'], ['off', 'Mati']] },
        { key: 'senjata', label: '🔥 Senjata spesial', value: 'on', options: [['on', 'Nyala (🔭 💣 🛡️)'], ['off', 'Mati']] },
        { key: 'kena', label: '💥 Kena = tembak lagi', value: 'on', options: [['on', `Nyala (maks. +${MAX_CHAIN})`], ['off', 'Mati']] },
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
    S.size = FLEETS[set.laut] ? set.laut : 'sedang';
    S.dur = /^(auto|r\d+|t\d+)$/.test(String(set.batas)) ? String(set.batas) : 'auto';
    S.shots = +set.tembak === 2 ? 2 : 1; S.time = +set.waktu || 30; S.rebut = set.rebut === 'off' ? 'off' : 'on'; S.weapons = set.senjata === 'off' ? 'off' : 'on';
    S.chain = set.kena === 'off' ? 'off' : 'on'; S.alur = set.alur === 'off' ? 'off' : 'on'; S.diskusi = set.diskusi === 'off' ? 'off' : 'on';
    P = r.players.map((pl, i) => ({ id: i, name: pl.name, avatar: pl.avatar, color: pl.color || COLORS[i], ai: false, members: parseMembers(st.members[i]).map((n) => ({ name: n, asked: 0, correct: 0 })) }));
    if (P.length === 1) { P.push({ id: 1, name: BOT_NAME, avatar: '🤖', color: COLORS[1] === P[0].color ? COLORS[0] : COLORS[1], ai: true, members: [] }); QC.toast('🤖 Main 1 tim: melawan Armada Robo', 'good'); }
    newGame();
  }
  function resetTeam(p) {
    const f = FLEETS[S.size]; const fl = placeFleet(G, f.ships);
    Object.assign(p, { ships: fl.ships, occ: fl.occ, grid: new Uint8Array(G * G), deflect: new Set(), radar: [], out: false, outOrder: 0, outRound: 0, place: 0, streak: 0, weapons: { radar: 0, ganda: 0, perisai: 0 }, shield: false, asked: 0, correct: 0, hitsDealt: 0, sunkDealt: 0, shotsFired: 0, stars: 0, mi: 0 });
    (p.members || []).forEach((m) => { m.asked = 0; m.correct = 0; });
  }
  function newGame() {
    gameSeq++; G = FLEETS[S.size].g;
    P.forEach((p, i) => { p.id = i; resetTeam(p); });
    turn = 0; round = 1; shooter = -1; shots = 0; chainN = 0; radarMode = false; target = -1; cursor = { r: (G / 2) | 0, c: (G / 2) | 0 }; view = 0;
    elimLog = []; outSeq = 0; curQ = null; curAnswerer = null; rebDecide = null; lastShot = null; shotLog = []; rebutLog = []; askLog = []; logList = [];
    lastEnd = ''; timeWarned = false; lastRoundWarned = 0; tStart = 0; turnsPlayed = 0; phase = 'brief';
    $('cpop').hidden = true; $('stamp').hidden = true;
    buildBoards(); layout(); renderAll(); showBrief();
    addLog('⚓ Armada siap tempur!');
  }
  function miniGrid(marks) { return `<span class="mg">${Array.from({ length: 9 }, (_, i) => `<i class="${marks[i] || ''}"></i>`).join('')}</span>`; }
  function showBrief() {
    const f = FLEETS[S.size]; const solo = P.some((p) => p.ai);
    const mode = solo ? '🤖 1 TIM vs ARMADA ROBO' : P.length === 2 ? '⚔️ DUEL 2 TIM' : `🌊 ${P.length} TIM — SEMUA LAWAN SEMUA`;
    $('brief').innerHTML = `<div class="brief-card"><span class="stampx">${mode}</span><h2>PERTEMPURAN LAUT</h2>
      <p class="brief-sub">Armada setiap tim sudah <b>disebar acak & dirahasiakan</b>. ${WIN_RULE}</p>
      <div class="brief-teams">${P.map((p, i) => `<span class="bt-g">${i ? '<b class="vs">VS</b>' : ''}<span class="brief-team" style="--pc:${p.color}"><span>${p.ai ? '🤖' : p.avatar}</span>${esc(p.name)}${p.members && p.members.length ? `<small>👥 ${p.members.length}</small>` : ''}</span></span>`).join('')}</div>
      <div class="bf-steps">
        <div class="bf-st" style="--d:0s"><div class="pic"><span class="big">❓</span><span class="mini">🙋</span></div><b>1. Jawab soal</b><span>Anggota tim <em>bergiliran</em> menjawab</span></div>
        <div class="bf-st" style="--d:.1s"><div class="pic">${miniGrid(['', '', '', '', 'aim', '', '', '', ''])}</div><b>2. Benar = tembak!</b><span>Ketuk ${S.shots} petak di <em>laut lawan</em></span></div>
        <div class="bf-st" style="--d:.2s"><div class="pic">${miniGrid(['miss', '', '', '', 'hit', 'hit', '', 'miss', ''])}</div><b>3. Kena = tembak lagi</b><span>💧 meleset • 🔥 kena • kena semua = <em>tenggelam</em></span></div>
        ${S.weapons === 'on' ? '<div class="bf-st" style="--d:.3s"><div class="pic"><span class="row3">🔭💣🛡️</span></div><b>4. Benar beruntun</b><span>= senjata: <em>Radar, Meriam Ganda, Perisai</em></span></div>' : ''}
        ${S.rebut === 'on' && P.filter((p) => !p.ai).length > 1 ? `<div class="bf-st hot" style="--d:.4s"><div class="pic"><span class="chips">${P.filter((p) => !p.ai).map((p) => `<i style="--pc:${p.color}"></i>`).join('')}</span></div><b>⚡ Salah? Rebutan!</b><span>Tim lain <em>cepat klik tombol timnya</em></span></div>` : ''}
      </div>
      <div class="bf-fleet"><b>🚢 Armada tiap tim (laut ${f.label}):</b>${f.ships.map((t) => `<span class="fl"><span class="ms" style="--n:${SHIPS[t].len}">${shipSVG(t, '#94a3b8')}</span>${SHIPS[t].name}<em>${SHIPS[t].len}</em></span>`).join('')}</div>
      <p class="bf-line">${SCORE_RULE}.<br>🏁 Batas: ${durText()} • ⏱️ ${S.time} detik per soal • 🎯 benar = ${S.shots} tembakan${S.chain === 'on' ? ' • 💥 kena = tembak lagi' : ''}</p>
      <button class="go-btn" id="btnGo">⚓ MULAI PERTEMPURAN!<small>SPASI</small></button></div>`;
    $('brief').hidden = false; $('btnGo').onclick = (e) => { e.currentTarget.blur(); startMatch(); };
  }
  function startMatch() { if (phase !== 'brief') return false; SND.ac(); QC.sfx.click(); $('brief').hidden = true; tStart = Date.now(); startTurn(); return true; }
  setInterval(() => {
    if (['idle', 'over', 'brief'].includes(phase)) return; renderInfo();
    if (!timeWarned && timeUp()) { timeWarned = true; QC.toast('⏰ Waktu habis! Pertempuran berakhir setelah giliran ini.', 'bad'); }
  }, 1000);

  /* ------------------------------ Masukan ------------------------------ */
  boardsEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell'); const bd = e.target.closest('.board'); if (!bd) return;
    const t = +bd.dataset.t; SND.ac();
    if (phase !== 'aim' || QC.isBusy() || !P[shooter] || P[shooter].ai) { if (compact && P[t]) setView(t); return; }
    if (t === shooter) { if (cell) hintBad('Itu laut timmu sendiri — tembak laut lawan!'); return; }
    if (P[t].out) return;
    if (!cell) { target = t; renderAll(); return; }
    const k = +cell.dataset.k; target = t; fire(t, (k / G) | 0, k % G);
  });
  boardsEl.addEventListener('pointerover', (e) => {
    if (phase !== 'aim' || e.pointerType === 'touch') return;
    const cell = e.target.closest('.cell'); const bd = e.target.closest('.board.tgt'); if (!cell || !bd) return;
    const t = +bd.dataset.t; const k = +cell.dataset.k; const pt = target; const pk = cursor.r * G + cursor.c;
    target = t; cursor = { r: (k / G) | 0, c: k % G };
    if (pt !== t) renderBoards(); else { if (P[pt]) renderCell(pt, pk); renderCell(t, k); }
  });
  function cycleTarget(dir = 1) {
    const en = enemiesOf(shooter); if (!en.length) return;
    let i = target; for (let k = 0; k < P.length; k++) { i = (i + dir + P.length) % P.length; if (i !== shooter && !P[i].out) break; }
    target = i; if (compact) view = i; SND.aim(); renderAll();
  }
  QC.onKey = (e) => {
    const key = e.key; const up = key.length === 1 ? key.toUpperCase() : key;
    if (key === ' ' || key === 'Enter') {
      e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (phase === 'brief') startMatch();
      else if (phase === 'turn') askQuestion();
      else if (phase === 'aim' && P[shooter] && !P[shooter].ai) fire(target, cursor.r, cursor.c);
      return;
    }
    if (phase === 'aim' && P[shooter] && !P[shooter].ai) {
      const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[key];
      if (mv) { e.preventDefault(); const pk = cursor.r * G + cursor.c; cursor = { r: clamp(cursor.r + mv[0], 0, G - 1), c: clamp(cursor.c + mv[1], 0, G - 1) }; renderCell(target, pk); renderCell(target, cursor.r * G + cursor.c); SND.aim(); return; }
      if (key === 'Tab' || key === ']') { e.preventDefault(); cycleTarget(e.shiftKey ? -1 : 1); return; }
      if (key === '[') { cycleTarget(-1); return; }
      const n = parseInt(key, 10); if (n >= 1 && n <= P.length && n - 1 !== shooter && !P[n - 1].out) { target = n - 1; if (compact) view = target; renderAll(); return; }
      if (up === 'R') { useWeapon('radar'); return; } if (up === 'G') { useWeapon('ganda'); return; } if (up === 'P') { useWeapon('perisai'); return; }
      if (key === 'Escape' && radarMode) { radarMode = false; renderAll(); return; }
    }
    if (compact) { const n = parseInt(key, 10); if (n >= 1 && n <= P.length) setView(n - 1); }
  };
  $('btnRules').onclick = (e) => { e.currentTarget.blur(); QC.modal({ icon: '📜', title: 'Peraturan Pertempuran Laut', html: `<div class="rules-pop">${RULES()}</div>`, cls: 'pl-rules', dismissable: true }); };
  $('btnSetup').onclick = async (e) => {
    e.currentTarget.blur();
    if (document.querySelector('.qc-setup.show')) return;
    if (!['idle', 'over', 'brief'].includes(phase)) {
      const ok = await QC.modal({ icon: '⚙️', title: 'Kembali ke pengaturan?', html: '<p class="qc-muted">Pertempuran yang sedang berjalan akan dihentikan.</p>', buttons: [{ label: 'Batal', value: false }, { label: 'Ya, ke Pengaturan', value: true, primary: true }] });
      if (!ok) return;
    }
    openSetup();
  };
  document.addEventListener('pointerdown', () => SND.ac(), { once: true });

  /* ------------------------------ Kait pengujian ------------------------------ */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__PL = {
    get phase() { return phase; },
    state: () => ({
      phase, turn, round, maxRounds: maxRounds() === Infinity ? null : maxRounds(), timeLimit: timeLimit(), dur: S.dur, size: S.size, g: G, settings: { ...S },
      shooter, shots, chainN, radarMode, target, cursor: { ...cursor }, view, compact, lite: LITE, turnsPlayed,
      alive: alive().length, elimLog: elimLog.map((e) => ({ ...e })), lastEnd, lastShot, rebutOpen: !!rebDecide, rebutLog: rebutLog.slice(-40),
      question: curQ ? curQ.question : null, answerer: curAnswerer, askLog: askLog.slice(-80), shotCount: shotLog.length,
      teams: P.map((p) => ({
        name: p.name, ai: !!p.ai, color: p.color, out: !!p.out, outRound: p.outRound, place: p.place, streak: p.streak, weapons: { ...p.weapons }, shield: !!p.shield,
        asked: p.asked, correct: p.correct, hitsDealt: p.hitsDealt, sunkDealt: p.sunkDealt, shotsFired: p.shotsFired, stars: p.stars || 0,
        score: score(p), cellsLeft: cellsLeft(p), shipsLeft: shipsLeft(p), grid: Array.from(p.grid), deflect: [...p.deflect], radar: p.radar.map((z) => ({ ...z })),
        ships: p.ships.map((s) => ({ type: s.type, name: s.name, len: s.len, dir: s.dir, cells: s.cells.map((x) => [...x]), hits: s.hits, sunk: s.sunk })),
        members: (p.members || []).map((m) => ({ ...m })), nextAnswerer: peekAnswerer(p) ? peekAnswerer(p).name : null
      })),
      log: logList.slice(0, 12).map((h) => h.replace(/<[^>]+>/g, ''))
    }),
    start: () => startMatch(),
    ask: () => askQuestion(),
    async answer(correct) {
      let o = null;
      for (let i = 0; i < 160; i++) { o = [...document.querySelectorAll('.qc-overlay.qc-ask.show')].find((x) => x.querySelector('.qc-opt:not(:disabled)')); if (o && curQ) break; await wait(50); }
      if (!o || !curQ) return false;
      const keys = QC.optionsOf(curQ); const k = correct ? curQ.correct : keys.find((x) => x !== curQ.correct);
      o.querySelector(`.qc-opt[data-k="${k}"]`).click(); await wait(80);
      const nb = o.querySelector('[data-next]'); if (nb) nb.click(); await wait(60);
      return true;
    },
    fire: (t, r, c) => fire(t, r, c),
    useWeapon: (k, t, r, c) => useWeapon(k, t, r, c),
    rebut: (i) => { if (!rebDecide) return false; rebDecide(i == null || i === 'skip' ? null : +i); return true; },
    key: (k, shift) => QC.onKey({ key: k, shiftKey: !!shift, preventDefault() {} }),
    async waitPhase(ph, ms = 8000) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if ((Array.isArray(ph) ? ph : [ph]).includes(phase) && !QC.isBusy()) return true; await wait(40); } return false; },
    fast(on) { TS = on ? 0.08 : 1; return TS; },
    setStreak(i, n) { P[i].streak = n; renderAll(); return n; },
    giveWeapon(i, k, n = 1) { P[i].weapons[k] = n; renderAll(); return n; },
    setShield(i, on) { P[i].shield = !!on; renderAll(); return on; },
    setTurn(i) { turn = i; renderAll(); return i; },
    setRound(n) { round = n; renderInfo(); return n; },
    warp(ms) { tStart -= ms; renderInfo(); return Date.now() - tStart; },
    aiAcc(v) { AI_ACC = v; return v; },
    // posisi kapal tim t (hanya untuk uji)
    shipCells: (t) => P[t].ships.map((s) => s.cells.map((x) => [...x])),
    // tenggelamkan semua kapal tim t kecuali `keep` kapal terkecil (hanya untuk uji)
    sinkAllBut(t, keep = 1) {
      const p = P[t]; const order = p.ships.map((s, si) => si).filter((si) => !p.ships[si].sunk).sort((a, b) => p.ships[a].len - p.ships[b].len);
      order.slice(keep).forEach((si) => { const s = p.ships[si]; s.cells.forEach(([a, b]) => (p.grid[a * G + b] = 3)); s.hits = s.len; s.sunk = true; addShipSprite(t, si, 'sunk'); });
      renderAll(); return cellsLeft(p);
    },
    placementTest(n = 200) {
      const out = {}; for (const key of Object.keys(FLEETS)) { const f = FLEETS[key]; let bad = 0; let touch = 0; const t0 = performance.now();
        for (let i = 0; i < n; i++) { const fl = placeFleet(f.g, f.ships); const v = validFleet(fl, f.g, f.ships); if (v) bad++;
          else { for (let a = 0; a < f.g * f.g && fl; a++) { const s = fl.occ[a]; if (s < 0) continue; const r = (a / f.g) | 0; const c = a % f.g; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr; const cc = c + dc; if (rr >= 0 && cc >= 0 && rr < f.g && cc < f.g && fl.occ[rr * f.g + cc] >= 0 && fl.occ[rr * f.g + cc] !== s) touch++; } } } }
        out[key] = { n, bad, touching: touch, ms: +(performance.now() - t0).toFixed(1) }; }
      return out;
    },
    validateCurrent: () => P.map((p) => validFleet(p, G, FLEETS[S.size].ships)),
    cellPoint(t, r, c) { const el = cellsEl[t] && cellsEl[t][r * G + c]; if (!el) return null; const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, w: q.width, h: q.height }; },
    lite: () => LITE,
    relayout: () => layout()
  };

  // laut pratinjau di belakang layar pengaturan
  P = [0, 1].map((i) => ({ id: i, name: TEAM_NAMES[i], avatar: AVATARS[i], color: COLORS[i], ai: false, members: [] }));
  G = FLEETS[S.size].g; P.forEach(resetTeam); buildBoards(); layout();
  openSetup();
})();
