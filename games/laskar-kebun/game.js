/* ==========================================================================
   Laskar Kebun Nusantara — kuis pertahanan lajur sawah untuk kelas (SMP/SMA).
   1–4 TIM (atau 1 tim + Robo Tani). Setiap tim MENJAGA 2 LAJUR sawah sendiri
   di satu medan bersama (2 tim = 4 lajur, 3 = 6, 4 = 8).
     • Fase JAWAB & TANAM (pertempuran berhenti): tim bergiliran menjawab soal
       (anggota bergantian). Benar = +poin, salah = −poin (tidak pernah < 0),
       lalu SOAL REBUTAN untuk tim lain. Poin dibelanjakan untuk PENJAGA KEBUN
       yang hanya boleh ditanam di 2 lajur milik sendiri (9 petak per lajur).
     • Fase SERBUAN (waktu nyata): Pasukan Hama Kabut datang dari kanan.
       Hama yang sampai di joglo = nyawa kebun pemilik lajur berkurang.
     • Gelombang terakhir: Raja Kabut Hama menyerang setiap kebun.
   Menang bersama jika semua gelombang tertahan; kalah jika semua nyawa habis.
   Peringkat pribadi: jawaban benar, rebutan, hama dibasmi, nyawa tersisa.
   Grafis 100% kode (Canvas 2D, sprite di-cache). Loop gambar hanya berjalan
   saat serbuan/efek aktif, berhenti saat soal terbuka. Mode ringan otomatis.
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const FX = QC.fx; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;
  let TS = 1; // skala jeda (uji otomatis)
  let SIMF = 1; // pengali kecepatan simulasi (uji otomatis)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * TS));
  const now = () => performance.now();
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };

  const GAME = 'laskar-kebun';
  const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#a855f7'];
  const AVATARS = ['🦚', '🐓', '🦜', '🐒', '🐅', '🐘', '🦌', '🐢'];
  const TEAM_NAMES = ['Laskar Merah', 'Laskar Biru', 'Laskar Kuning', 'Laskar Ungu'];
  const BOT_NAME = 'Robo Tani';
  QC.init({ gameId: GAME, title: 'Laskar Kebun Nusantara', avatars: AVATARS, colors: COLORS });

  // Mode ringan otomatis untuk perangkat lemah (IFP / laptop lama). Paksa: ?ringan=1 / ?ringan=0
  const LITE = /[?&]ringan=1/.test(location.search) || (!/[?&]ringan=0/.test(location.search) && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4));
  if (LITE) document.documentElement.classList.add('lk-lite');
  const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const PCAP = LITE ? 45 : 140; // batas partikel
  const FPS = LITE ? 30 : 60;

  /* ------------------------------ Data penjaga & hama ------------------------------ */
  const COLS = 9;
  const DEF = {
    cabai: { key: 'Q', name: 'Cabai Penembak', short: 'Cabai', cost: 50, hp: 120, rate: 1.5, dmg: 22, cd: 2, unlock: 1, role: 'Penembak', desc: 'Menembakkan biji cabai pedas lurus ke kanan. Murah & andal.' },
    jagung: { key: 'W', name: 'Jagung Berondong', short: 'Jagung', cost: 90, hp: 120, rate: 1.6, dmg: 16, shots: 2, cd: 4, unlock: 2, role: 'Penembak ganda', desc: 'Menembak 2 butir jagung sekaligus — serangan dua kali lipat.' },
    tebu: { key: 'E', name: 'Tombak Tebu', short: 'Tebu', cost: 100, hp: 120, rate: 2.4, dmg: 30, pierce: true, cd: 5, unlock: 3, role: 'Penembus', desc: 'Tombak tebu menembus SEMUA hama sebaris & menembus cangkang baja.' },
    meriam: { key: 'R', name: 'Meriam Bambu', short: 'Meriam', cost: 125, hp: 140, rate: 3.2, dmg: 70, splash: 0.95, cd: 6, unlock: 3, role: 'Ledakan', desc: 'Dentuman bambu: peluru melambung & meledak mengenai beberapa hama.' },
    kendi: { key: 'T', name: 'Kendi Embun', short: 'Kendi', cost: 75, hp: 120, rate: 1.8, dmg: 12, slow: 0.5, slowT: 3, cd: 4, unlock: 2, role: 'Pembeku', desc: 'Percikan embun dingin: hama melambat 50% selama 3 detik.' },
    kelapa: { key: 'Y', name: 'Tembok Kelapa', short: 'Kelapa', cost: 50, hp: 1000, cd: 8, unlock: 1, role: 'Tembok', desc: 'Tembok sabut kelapa yang sangat kuat menahan hama.' },
    durian: { key: 'U', name: 'Bom Durian', short: 'Durian', cost: 100, hp: 200, dmg: 320, radius: 1.5, arm: 0.8, cd: 10, unlock: 2, role: 'Bom sekali', desc: 'Meledak saat hama mendekat: 1½ petak ke segala arah, juga lajur sebelah.' },
    lumbung: { key: 'I', name: 'Lumbung Padi', short: 'Lumbung', cost: 50, hp: 150, income: 20, cd: 6, unlock: 1, role: 'Penghasil poin', desc: 'Tiap gelombang selesai: +20 poin untuk pemiliknya.' }
  };
  const ORDER = ['cabai', 'jagung', 'tebu', 'meriam', 'kendi', 'kelapa', 'durian', 'lumbung'];
  const SHOOTERS = ['cabai', 'jagung', 'tebu', 'meriam', 'kendi'];
  const EN = {
    kumbang: { name: 'Kumbang Kabut', hp: 110, spd: 0.32, bite: 25, cost: 110, desc: 'Hama dasar berbaju kabut.' },
    belalang: { name: 'Belalang Lompat', hp: 80, spd: 0.6, bite: 18, jump: true, cost: 95, desc: 'Cepat & MELOMPATI penjaga pertama yang dihadangnya.' },
    gumpal: { name: 'Gumpal Kabut', hp: 170, spd: 0.27, bite: 22, split: 2, cost: 210, desc: 'Saat dibasmi PECAH menjadi 2 Kabut Kecil.' },
    siput: { name: 'Siput Baja', hp: 300, spd: 0.19, bite: 35, armor: 0.5, cost: 280, desc: 'Cangkang baja: kebal ½ serangan biasa (Tebu & ledakan tetap penuh).' },
    kecil: { name: 'Kabut Kecil', hp: 45, spd: 0.5, bite: 12, cost: 0, desc: 'Pecahan Gumpal Kabut, kecil tapi gesit.' },
    raja: { name: 'Raja Kabut Hama', hp: 2400, spd: 0.13, bite: 80, armor: 0.25, boss: true, cost: 0, desc: 'Bos terakhir! Sangat kuat, memanggil Kumbang Kabut. Sampai di joglo = 3 nyawa hilang.' }
  };
  const DIFF = { mudah: { m: 1, label: 'Mudah' }, sedang: { m: 1.35, label: 'Sedang' }, sulit: { m: 1.7, label: 'Sulit' } };
  const POIN = { std: { ok: 50, no: 25 }, lembut: { ok: 50, no: 10 }, tegas: { ok: 50, no: 35 } };
  const START_PTS = 120; const STEAL_PTS = 35; const PANEN = 10;
  const AUTO_WAVES = { 1: 9, 2: 8, 3: 6, 4: 5 };
  let AI_ACC = 0.65;

  /* ------------------------------ Status ------------------------------ */
  const S = { gel: 'auto', time: 30, hearts: 3, diff: 'sedang', poin: 'std', rebut: 'on', alur: 'on', diskusi: 'on', speed: 'normal' };
  let P = []; let L = 4; let W = 8; let wave = 1;
  let phase = 'idle'; let gameSeq = 0; let tStart = 0; let paused = false;
  let order = []; let oi = 0; let turnPid = 0; let owner = 0; let sel = null; let cursor = null; let hover = null;
  let curQ = null; let curAnswerer = null; let rebDecide = null; let lastEnd = ''; let pendingEnd = null;
  let grid = []; let enemies = []; let shots = []; let parts = []; let rings = []; let kerbaus = []; let spawnQ = []; let waveList = [];
  let battleT = 0; let capT = Infinity; let testHold = false; let laneFlash = []; let laneMinX = []; let warned = {}; let uid = 1;
  let askLog = []; let rebutLog = []; let events = []; let waveLog = []; let simTime = 0;
  const nhuman = () => P.filter((p) => !p.ai).length;
  const ownerOf = (lane) => lane >> 1;
  const lanesOf = (pid) => [pid * 2, pid * 2 + 1];
  const PT = () => POIN[S.poin] || POIN.std;
  const isFinal = () => wave >= W;
  const unlocked = (t) => DEF[t].unlock <= wave;
  function ev(type, data = {}) { events.push({ type, wave, ...data }); if (events.length > 600) events.shift(); }

  /* ------------------------------ Suara (WebAudio) ------------------------------ */
  const SND = (() => {
    let a = null; let nbuf = null; const last = {};
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
    const th = (k, ms) => { const t = now(); if (t - (last[k] || 0) < ms) return false; last[k] = t; return true; };
    const block = (f, dl) => { tone(f, 0.09, 'triangle', 0.09, dl); tone(f * 1.52, 0.05, 'sine', 0.04, dl); noise(0.04, 0.08, dl, 'bandpass', f * 1.2, null, 4); };
    const bell = (f, d, v, dl) => { tone(f, d, 'sine', v, dl); tone(f * 2.76, d * 0.4, 'sine', v * 0.22, dl); };
    return {
      ac,
      shoot() { if (th('sh', 85)) { tone(560, 0.06, 'triangle', 0.035, 0, 900); } },
      corn() { if (th('co', 110)) { tone(900, 0.04, 'square', 0.022); tone(1100, 0.04, 'square', 0.02, 0.06); } },
      spear() { if (th('sp', 120)) noise(0.16, 0.12, 0, 'bandpass', 900, 3200, 2); },
      cannon() { if (th('ca', 140)) { noise(0.3, 0.32, 0, 'lowpass', 600, 80); tone(120, 0.25, 'sine', 0.18, 0, 45); } },
      dew() { if (th('dw', 120)) tone(1200, 0.12, 'sine', 0.05, 0, 420); },
      hit() { if (th('hi', 70)) noise(0.05, 0.08, 0, 'highpass', 2200); },
      kill() { if (th('ki', 90)) { tone(420, 0.1, 'triangle', 0.06, 0, 880); noise(0.08, 0.08, 0, 'bandpass', 1800, null, 2); } },
      chomp() { if (th('ch', 320)) { noise(0.07, 0.14, 0, 'bandpass', 700, null, 3); noise(0.06, 0.1, 0.12, 'bandpass', 600, null, 3); } },
      plant() { noise(0.12, 0.18, 0, 'lowpass', 900, 200); [523, 659, 784].forEach((f, i) => tone(f, 0.1, 'triangle', 0.05, 0.06 + i * 0.06)); },
      sell() { tone(700, 0.12, 'triangle', 0.05, 0, 300); noise(0.1, 0.12, 0, 'lowpass', 800); },
      boom() { noise(0.9, 0.5, 0, 'lowpass', 1400, 60); tone(90, 0.6, 'sine', 0.3, 0, 30); },
      breach() { [880, 660, 880, 660].forEach((f, i) => tone(f, 0.13, 'square', 0.05, i * 0.14)); noise(0.3, 0.2, 0, 'lowpass', 500, 80); },
      kentongan() { [0, 0.17, 0.34, 0.62, 0.79].forEach((d, i) => block(i < 3 ? 1150 : 820, d)); },
      boss() { tone(80, 1.2, 'sawtooth', 0.09, 0, 45); tone(62, 1.2, 'sawtooth', 0.07, 0.15, 40); noise(1.2, 0.2, 0, 'lowpass', 300, 60); },
      moo() { tone(210, 0.55, 'sawtooth', 0.07, 0, 140); tone(160, 0.5, 'sawtooth', 0.05, 0.3, 120); noise(1.0, 0.25, 0.2, 'lowpass', 400, 60); },
      clear() { [523, 587, 659, 784, 880, 1047].forEach((f, i) => bell(f, 0.6, 0.06, i * 0.1)); },
      coin() { tone(988, 0.07, 'square', 0.04); tone(1319, 0.16, 'square', 0.04, 0.07); },
      unlock() { [784, 988, 1175, 1568].forEach((f, i) => bell(f, 0.4, 0.05, i * 0.07)); },
      turn() { tone(392, 0.14, 'triangle', 0.06); tone(523, 0.14, 'triangle', 0.06, 0.12); tone(659, 0.24, 'triangle', 0.06, 0.24); },
      rebut() { [880, 1175, 880, 1175].forEach((f, i) => tone(f, 0.08, 'square', 0.04, i * 0.09)); },
      think() { [0, 0.18, 0.36].forEach((d) => tone(1200, 0.04, 'sine', 0.035, d)); },
      good() { [784, 988, 1175, 1568].forEach((f, i) => bell(f, 0.5, 0.06, i * 0.07)); },
      fail() { tone(392, 0.2, 'triangle', 0.08, 0, 300); tone(311, 0.32, 'triangle', 0.07, 0.17, 200); },
      lose() { [523, 466, 415, 349, 262].forEach((f, i) => tone(f, 0.35, 'triangle', 0.07, i * 0.2)); },
      click() { tone(720, 0.04, 'square', 0.03); },
      nope() { tone(220, 0.12, 'square', 0.04); }
    };
  })();

  /* ------------------------------ Sprite (kanvas, satuan = 1 petak) ------------------------------ */
  const INK = '#2a1608';
  function E(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); }
  function Ci(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.abs(r), 0, TAU); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function lg(c, x0, y0, x1, y1, st) { const g = c.createLinearGradient(x0, y0, x1, y1); st.forEach((s, i) => g.addColorStop(i / (st.length - 1), s)); return g; }
  function rg(c, x, y, r0, r1, st) { const g = c.createRadialGradient(x, y, r0, x, y, r1); st.forEach((s, i) => g.addColorStop(i / (st.length - 1), s)); return g; }
  function ink(c, w = 0.035, col = INK) { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; }
  function fs(c, fill) { c.fillStyle = fill; c.fill(); c.stroke(); }
  function shadowU(c, w = 0.3, y = 0.43) { c.fillStyle = 'rgba(0,0,0,.24)'; E(c, 0, y, w, 0.065); c.fill(); }
  function eye(c, x, y, r, px = 0.3, py = 0, iris = '#1c1008') {
    ink(c, 0.016); c.fillStyle = '#fff'; Ci(c, x, y, r); c.fill(); c.stroke();
    c.fillStyle = iris; Ci(c, x + r * px, y + r * py, r * 0.56); c.fill();
    c.fillStyle = '#fff'; Ci(c, x + r * px + r * 0.18, y + r * py - r * 0.24, r * 0.2); c.fill();
  }
  function leaf(c, x, y, rx, ry, rot, col = '#58a832') { E(c, x, y, rx, ry, rot); fs(c, col); }
  function pot(c, glaze = '#fde68a') {
    shadowU(c, 0.27); ink(c);
    c.beginPath(); c.moveTo(-0.23, 0.12); c.lineTo(0.23, 0.12); c.lineTo(0.17, 0.42); c.lineTo(-0.17, 0.42); c.closePath();
    fs(c, lg(c, -0.2, 0, 0.2, 0, ['#e48c4e', '#c2622a', '#9a4518']));
    rr(c, -0.27, 0.06, 0.54, 0.1, 0.04); fs(c, '#eda066');
    c.strokeStyle = glaze; c.lineWidth = 0.022; c.beginPath();
    for (let i = 0; i <= 6; i++) { const x = -0.17 + i * 0.057; if (i) c.lineTo(x, i % 2 ? 0.23 : 0.3); else c.moveTo(x, 0.3); }
    c.stroke();
  }
  const DRAW = {
    cabai(c) {
      pot(c);
      ink(c, 0.045, '#2f6d1f'); c.beginPath(); c.moveTo(0, 0.08); c.quadraticCurveTo(-0.07, -0.06, -0.05, -0.2); c.stroke();
      ink(c); leaf(c, -0.16, -0.05, 0.12, 0.05, -0.5); leaf(c, 0.13, 0.0, 0.11, 0.045, 0.45);
      c.beginPath(); c.moveTo(-0.1, -0.12); c.bezierCurveTo(-0.22, -0.1, -0.31, 0.0, -0.31, 0.12); c.bezierCurveTo(-0.24, 0.03, -0.16, -0.03, -0.07, -0.05); c.closePath(); fs(c, '#b91c1c');
      c.beginPath(); c.moveTo(-0.13, -0.3); c.bezierCurveTo(0.08, -0.45, 0.37, -0.3, 0.43, -0.03); c.bezierCurveTo(0.3, -0.14, 0.12, -0.16, -0.09, -0.14); c.closePath();
      fs(c, lg(c, 0, -0.42, 0, -0.1, ['#fb7185', '#e11d48', '#9f1239']));
      c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 0.03; c.beginPath(); c.moveTo(-0.04, -0.33); c.quadraticCurveTo(0.12, -0.37, 0.25, -0.27); c.stroke();
      ink(c); c.beginPath(); c.moveTo(-0.2, -0.31); c.lineTo(-0.07, -0.35); c.lineTo(-0.1, -0.25); c.lineTo(-0.02, -0.19); c.lineTo(-0.15, -0.18); c.closePath(); fs(c, '#4d8f2a');
      eye(c, 0.07, -0.27, 0.047, 0.45); eye(c, 0.17, -0.245, 0.04, 0.45);
      ink(c, 0.024); c.beginPath(); c.moveTo(0.02, -0.335); c.lineTo(0.11, -0.315); c.moveTo(0.14, -0.3); c.lineTo(0.21, -0.29); c.stroke();
    },
    jagung(c) {
      pot(c, '#bbf7d0');
      ink(c); c.beginPath(); c.moveTo(-0.04, 0.08); c.bezierCurveTo(-0.3, -0.02, -0.3, -0.3, -0.18, -0.36); c.bezierCurveTo(-0.16, -0.2, -0.1, -0.05, 0.02, 0.08); c.closePath(); fs(c, '#65a30d');
      E(c, 0.02, -0.14, 0.15, 0.27); fs(c, lg(c, -0.1, -0.4, 0.1, 0.1, ['#fef08a', '#facc15', '#ca8a04']));
      c.strokeStyle = 'rgba(146,64,14,.55)'; c.lineWidth = 0.014;
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.ellipse(0.02, -0.14 + i * 0.065, 0.14 - Math.abs(i) * 0.012, 0.025, 0, 0, Math.PI); c.stroke(); }
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(0.02 + i * 0.06, -0.38); c.quadraticCurveTo(0.02 + i * 0.075, -0.14, 0.02 + i * 0.06, 0.1); c.stroke(); }
      ink(c); c.beginPath(); c.moveTo(0.08, 0.08); c.bezierCurveTo(0.32, -0.0, 0.3, -0.24, 0.24, -0.3); c.bezierCurveTo(0.2, -0.16, 0.14, -0.04, 0.0, 0.08); c.closePath(); fs(c, '#4d7c0f');
      ink(c, 0.02, '#92400e'); c.beginPath(); c.moveTo(0.02, -0.41); c.lineTo(-0.04, -0.49); c.moveTo(0.02, -0.41); c.lineTo(0.03, -0.5); c.moveTo(0.02, -0.41); c.lineTo(0.09, -0.48); c.stroke();
      eye(c, -0.03, -0.2, 0.045, 0.5); eye(c, 0.07, -0.2, 0.045, 0.5);
      ink(c); c.fillStyle = '#7c2d12'; E(c, 0.1, -0.08, 0.04, 0.03); c.fill(); c.stroke();
    },
    tebu(c) {
      pot(c, '#e9d5ff');
      const stalk = (x, top, col) => {
        ink(c); rr(c, x - 0.035, top, 0.07, 0.12 - top, 0.03); fs(c, col);
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 0.016;
        for (let y = top + 0.09; y < 0.08; y += 0.1) { c.beginPath(); c.moveTo(x - 0.035, y); c.lineTo(x + 0.035, y); c.stroke(); }
      };
      stalk(-0.12, -0.3, '#7e3f6e'); stalk(0.12, -0.26, '#8b4a7c'); stalk(0, -0.42, '#6b2d5c');
      ink(c); leaf(c, -0.2, -0.36, 0.13, 0.035, 0.7, '#4ade80'); leaf(c, 0.2, -0.34, 0.13, 0.035, -0.7, '#22c55e'); leaf(c, 0.02, -0.47, 0.1, 0.03, -1.3, '#4ade80');
      c.save(); c.translate(0.02, -0.16); c.rotate(-0.12);
      ink(c); rr(c, -0.05, -0.03, 0.34, 0.06, 0.03); fs(c, lg(c, 0, -0.03, 0, 0.03, ['#fde68a', '#d97706']));
      c.beginPath(); c.moveTo(0.29, -0.045); c.lineTo(0.43, 0); c.lineTo(0.29, 0.045); c.closePath(); fs(c, '#e5e7eb');
      c.restore();
      eye(c, -0.01, -0.3, 0.035, 0.5); eye(c, 0.06, -0.29, 0.032, 0.5);
    },
    meriam(c) {
      shadowU(c, 0.36);
      ink(c); c.fillStyle = '#7c4a1a';
      c.beginPath(); c.moveTo(-0.22, 0.42); c.lineTo(0.06, 0.0); c.lineTo(0.12, 0.03); c.lineTo(-0.14, 0.42); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(0.2, 0.42); c.lineTo(-0.06, 0.0); c.lineTo(-0.12, 0.03); c.lineTo(0.12, 0.42); c.closePath(); c.fill(); c.stroke();
      rr(c, -0.3, 0.36, 0.6, 0.07, 0.03); fs(c, '#a16207');
      c.save(); c.translate(0, -0.06); c.rotate(-0.13);
      rr(c, -0.4, -0.12, 0.76, 0.24, 0.1); fs(c, lg(c, 0, -0.12, 0, 0.12, ['#86efac', '#22c55e', '#166534']));
      c.strokeStyle = '#14532d'; c.lineWidth = 0.035; [-0.18, 0.08].forEach((x) => { c.beginPath(); c.moveTo(x, -0.12); c.lineTo(x, 0.12); c.stroke(); });
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 0.025; c.beginPath(); c.moveTo(-0.33, -0.07); c.lineTo(0.28, -0.07); c.stroke();
      ink(c); E(c, 0.36, 0, 0.055, 0.115); fs(c, '#15803d'); c.fillStyle = '#0b2e14'; E(c, 0.37, 0, 0.032, 0.075); c.fill();
      ink(c); Ci(c, -0.42, -0.02, 0.06); fs(c, '#7c4a1a');
      ink(c, 0.02, '#78350f'); c.beginPath(); c.moveTo(-0.46, -0.06); c.quadraticCurveTo(-0.52, -0.16, -0.46, -0.2); c.stroke();
      c.fillStyle = '#f59e0b'; Ci(c, -0.46, -0.21, 0.03); c.fill();
      c.restore();
      eye(c, -0.12, -0.12, 0.045, 0.5); eye(c, -0.01, -0.135, 0.045, 0.5);
    },
    kendi(c) {
      shadowU(c, 0.28);
      ink(c); c.beginPath(); c.moveTo(0.14, 0.0); c.quadraticCurveTo(0.3, -0.06, 0.38, -0.2); c.lineTo(0.42, -0.17); c.quadraticCurveTo(0.36, 0.02, 0.17, 0.1); c.closePath(); fs(c, '#c2410c');
      c.fillStyle = '#7dd3fc'; Ci(c, 0.45, -0.21, 0.035); c.fill();
      rr(c, -0.08, -0.32, 0.16, 0.18, 0.04); fs(c, '#b45309');
      E(c, 0, -0.32, 0.11, 0.035); fs(c, '#d97706');
      Ci(c, 0, 0.13, 0.26); fs(c, rg(c, -0.08, 0.04, 0.02, 0.3, ['#f59e57', '#c2410c', '#7c2d12']));
      c.save(); Ci(c, 0, 0.13, 0.255); c.clip();
      c.fillStyle = '#0ea5e9'; c.beginPath(); c.moveTo(-0.3, 0.16);
      for (let i = 0; i <= 12; i++) c.lineTo(-0.3 + i * 0.05, 0.16 + (i % 2 ? -0.03 : 0.0));
      c.lineTo(0.3, 0.23); c.lineTo(-0.3, 0.23); c.closePath(); c.fill(); c.restore();
      ink(c); Ci(c, 0, 0.13, 0.26); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.35)'; E(c, -0.1, 0.02, 0.06, 0.1, -0.5); c.fill();
      eye(c, -0.07, 0.06, 0.045, 0.45); eye(c, 0.05, 0.06, 0.045, 0.45);
    },
    kelapa(c) {
      shadowU(c, 0.3);
      const nut = (y, r) => {
        ink(c); Ci(c, 0, y, r); fs(c, rg(c, -r * 0.3, y - r * 0.3, r * 0.1, r * 1.1, ['#b07a43', '#8b5a2b', '#5b3a1e']));
        c.strokeStyle = 'rgba(232,193,134,.55)'; c.lineWidth = 0.014;
        for (let i = 0; i < 9; i++) { const a = i * 0.7 + y; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35); c.lineTo(Math.cos(a + 0.2) * r * 0.9, y + Math.sin(a + 0.2) * r * 0.9); c.stroke(); }
      };
      nut(0.17, 0.26); nut(-0.16, 0.23);
      ink(c); c.beginPath(); c.moveTo(-0.27, 0.0); c.quadraticCurveTo(0, 0.07, 0.27, 0.0); c.lineTo(0.27, 0.06); c.quadraticCurveTo(0, 0.13, -0.27, 0.06); c.closePath(); fs(c, '#e7c48a');
      rr(c, -0.05, -0.01, 0.1, 0.1, 0.03); fs(c, '#d4a24c');
      c.fillStyle = '#2b1a0e'; [[-0.07, -0.2], [0.07, -0.2], [0, -0.09]].forEach(([x, y]) => { Ci(c, x, y, 0.028); c.fill(); });
      ink(c); leaf(c, -0.07, -0.42, 0.08, 0.03, -0.6, '#4ade80'); leaf(c, 0.06, -0.43, 0.08, 0.03, 0.6, '#22c55e');
    },
    kelapa_cr(c) {
      DRAW.kelapa(c); ink(c, 0.025, '#1c0f05');
      c.beginPath(); c.moveTo(-0.12, -0.33); c.lineTo(-0.04, -0.24); c.lineTo(-0.1, -0.15); c.lineTo(-0.02, -0.06);
      c.moveTo(0.14, 0.02); c.lineTo(0.06, 0.12); c.lineTo(0.13, 0.2); c.lineTo(0.05, 0.3); c.stroke();
    },
    durian(c) {
      shadowU(c, 0.26);
      ink(c, 0.022);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU; const r0 = 0.24; const r1 = 0.33;
        c.beginPath(); c.moveTo(Math.cos(a - 0.17) * r0, 0.06 + Math.sin(a - 0.17) * r0); c.lineTo(Math.cos(a) * r1, 0.06 + Math.sin(a) * r1); c.lineTo(Math.cos(a + 0.17) * r0, 0.06 + Math.sin(a + 0.17) * r0); c.closePath(); fs(c, '#6b8e23');
      }
      ink(c); Ci(c, 0, 0.06, 0.26); fs(c, rg(c, -0.08, -0.04, 0.02, 0.3, ['#d9f99d', '#a3c14a', '#4d6b14']));
      c.strokeStyle = '#3f6212'; c.lineWidth = 0.018;
      for (let i = 0; i < 18; i++) { const a = i * 2.4; const x = Math.cos(a) * 0.17 * ((i % 3) / 2 + 0.3); const y = 0.06 + Math.sin(a) * 0.17 * ((i % 3) / 2 + 0.3); c.beginPath(); c.moveTo(x - 0.025, y + 0.02); c.lineTo(x, y - 0.02); c.lineTo(x + 0.025, y + 0.02); c.stroke(); }
      ink(c, 0.03, '#fde047'); c.beginPath(); c.moveTo(-0.02, -0.15); c.lineTo(0.03, -0.02); c.lineTo(-0.03, 0.08); c.stroke();
      ink(c); rr(c, -0.025, -0.3, 0.05, 0.1, 0.02); fs(c, '#78350f');
      ink(c, 0.02, '#57534e'); c.beginPath(); c.moveTo(0.0, -0.3); c.quadraticCurveTo(0.1, -0.38, 0.06, -0.44); c.stroke();
      eye(c, -0.09, 0.04, 0.04, 0.6, 0.2); eye(c, 0.06, 0.04, 0.04, 0.6, 0.2);
      ink(c, 0.024); c.beginPath(); c.moveTo(-0.14, -0.03); c.lineTo(-0.05, 0.0); c.moveTo(0.11, -0.03); c.lineTo(0.02, 0.0); c.stroke();
    },
    lumbung(c) {
      shadowU(c, 0.32);
      ink(c); c.fillStyle = '#6b4423';
      [-0.2, -0.07, 0.07, 0.2].forEach((x) => { rr(c, x - 0.025, 0.1, 0.05, 0.33, 0.01); c.fill(); c.stroke(); });
      rr(c, -0.28, 0.09, 0.56, 0.05, 0.02); fs(c, '#4a2f17');
      rr(c, -0.24, -0.14, 0.48, 0.25, 0.03); fs(c, lg(c, 0, -0.14, 0, 0.11, ['#c88a4a', '#9c6430']));
      c.strokeStyle = 'rgba(60,30,10,.5)'; c.lineWidth = 0.014; for (let x = -0.18; x < 0.24; x += 0.07) { c.beginPath(); c.moveTo(x, -0.13); c.lineTo(x, 0.1); c.stroke(); }
      ink(c); rr(c, -0.07, -0.08, 0.14, 0.19, 0.02); fs(c, '#3b2414');
      c.fillStyle = '#facc15'; for (let i = 0; i < 5; i++) { E(c, -0.04 + i * 0.02, -0.02 + (i % 2) * 0.03, 0.012, 0.03, 0.3); c.fill(); }
      ink(c); c.beginPath(); c.moveTo(-0.36, -0.09); c.quadraticCurveTo(-0.3, -0.5, 0, -0.5); c.quadraticCurveTo(0.3, -0.5, 0.36, -0.09); c.quadraticCurveTo(0, -0.16, -0.36, -0.09); c.closePath();
      fs(c, lg(c, 0, -0.5, 0, -0.1, ['#f3c969', '#d4a24c', '#a87830']));
      c.strokeStyle = 'rgba(120,70,20,.6)'; c.lineWidth = 0.016;
      for (let i = 0; i < 7; i++) { const x = -0.27 + i * 0.09; c.beginPath(); c.moveTo(x * 0.6, -0.44); c.lineTo(x, -0.13); c.stroke(); }
      ink(c, 0.03, '#78350f'); c.beginPath(); c.moveTo(-0.06, -0.5); c.lineTo(0.06, -0.5); c.stroke();
    },
    kumbang(c, crown) {
      shadowU(c, 0.3);
      ink(c, 0.03, '#140a24');
      [[-0.14, 0.12, -0.24, 0.4], [0.02, 0.15, -0.04, 0.42], [0.17, 0.13, 0.24, 0.4]].forEach(([x, y, x2, y2]) => { c.beginPath(); c.moveTo(x, y); c.lineTo((x + x2) / 2 - 0.04, y + 0.12); c.lineTo(x2, y2); c.stroke(); });
      ink(c, 0.035, '#1a0533'); E(c, 0.06, 0.02, 0.3, 0.22); fs(c, rg(c, 0.0, -0.1, 0.02, 0.36, crown ? ['#f472b6', '#9d174d', '#3b0718'] : ['#a78bfa', '#6d28d9', '#2e1065']));
      c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 0.02; c.beginPath(); c.moveTo(-0.16, -0.05); c.quadraticCurveTo(0.1, -0.02, 0.34, 0.06); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.3)'; E(c, 0.0, -0.1, 0.12, 0.05, -0.2); c.fill();
      c.fillStyle = 'rgba(241,245,249,.62)'; [[0.12, -0.22, 0.07], [0.22, -0.16, 0.06], [0.02, -0.24, 0.05]].forEach(([x, y, r]) => { Ci(c, x, y, r); c.fill(); });
      ink(c, 0.035, '#1a0533'); Ci(c, -0.27, 0.06, 0.13); fs(c, crown ? '#4c0519' : '#2e1065');
      ink(c, 0.02, '#1a0533'); c.beginPath(); c.moveTo(-0.33, -0.03); c.quadraticCurveTo(-0.42, -0.18, -0.36, -0.26); c.moveTo(-0.27, -0.05); c.quadraticCurveTo(-0.3, -0.2, -0.22, -0.28); c.stroke();
      c.fillStyle = '#c4b5fd'; Ci(c, -0.36, -0.27, 0.025); c.fill(); Ci(c, -0.22, -0.29, 0.025); c.fill();
      c.fillStyle = crown ? '#f87171' : '#fde047'; Ci(c, -0.33, 0.03, 0.045); c.fill(); Ci(c, -0.23, 0.02, 0.04); c.fill();
      c.fillStyle = '#fff'; Ci(c, -0.34, 0.015, 0.014); c.fill(); Ci(c, -0.24, 0.005, 0.012); c.fill();
      ink(c, 0.026, '#1a0533'); c.beginPath(); c.moveTo(-0.36, 0.12); c.quadraticCurveTo(-0.45, 0.12, -0.44, 0.18); c.moveTo(-0.3, 0.15); c.quadraticCurveTo(-0.38, 0.19, -0.35, 0.24); c.stroke();
    },
    belalang(c) {
      shadowU(c, 0.32);
      ink(c, 0.03, '#1f3a32');
      c.beginPath(); c.moveTo(-0.2, 0.08); c.lineTo(-0.26, 0.4); c.moveTo(-0.08, 0.1); c.lineTo(-0.1, 0.41); c.stroke();
      E(c, 0.04, 0.0, 0.32, 0.12, 0.08); fs(c, lg(c, 0, -0.12, 0, 0.12, ['#a7c4b5', '#6b8f80', '#3f5f55']));
      c.strokeStyle = 'rgba(20,40,30,.5)'; c.lineWidth = 0.016; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0.08 + i * 0.06, -0.09); c.lineTo(0.06 + i * 0.06, 0.1); c.stroke(); }
      ink(c, 0.02, '#334155'); E(c, 0.12, -0.11, 0.27, 0.075, -0.1); fs(c, 'rgba(226,232,240,.6)');
      ink(c, 0.06, '#2f4f45'); c.beginPath(); c.moveTo(0.08, 0.04); c.lineTo(0.3, -0.24); c.lineTo(0.4, 0.4); c.stroke();
      ink(c, 0.035, '#5f8a7a'); c.beginPath(); c.moveTo(0.08, 0.04); c.lineTo(0.3, -0.24); c.lineTo(0.4, 0.4); c.stroke();
      ink(c, 0.03, '#1f3a32'); Ci(c, -0.3, -0.03, 0.11); fs(c, '#6b8f80');
      c.fillStyle = '#ef4444'; E(c, -0.33, -0.06, 0.05, 0.06); c.fill(); c.fillStyle = '#fff'; Ci(c, -0.345, -0.08, 0.016); c.fill();
      ink(c, 0.018, '#1f3a32'); c.beginPath(); c.moveTo(-0.36, -0.12); c.quadraticCurveTo(-0.48, -0.3, -0.38, -0.44); c.moveTo(-0.3, -0.13); c.quadraticCurveTo(-0.34, -0.32, -0.24, -0.44); c.stroke();
    },
    siput(c) {
      shadowU(c, 0.38);
      ink(c); c.beginPath(); c.moveTo(-0.44, 0.38); c.quadraticCurveTo(-0.46, 0.18, -0.3, 0.16); c.lineTo(0.3, 0.24); c.quadraticCurveTo(0.44, 0.3, 0.42, 0.4); c.closePath(); fs(c, lg(c, 0, 0.16, 0, 0.4, ['#c9d6b8', '#94a77f']));
      ink(c, 0.03); c.beginPath(); c.moveTo(-0.36, 0.2); c.lineTo(-0.42, -0.04); c.moveTo(-0.3, 0.19); c.lineTo(-0.3, -0.06); c.stroke();
      c.fillStyle = '#1f2937'; Ci(c, -0.42, -0.06, 0.035); c.fill(); Ci(c, -0.3, -0.08, 0.035); c.fill();
      c.fillStyle = '#f87171'; Ci(c, -0.43, -0.07, 0.012); c.fill(); Ci(c, -0.31, -0.09, 0.012); c.fill();
      ink(c, 0.04, '#0f172a'); Ci(c, 0.08, 0.0, 0.29); fs(c, rg(c, -0.04, -0.12, 0.02, 0.34, ['#f8fafc', '#94a3b8', '#334155']));
      c.strokeStyle = '#1e293b'; c.lineWidth = 0.03; c.beginPath();
      for (let i = 0; i < 40; i++) { const a = i * 0.36; const r = 0.24 - i * 0.0055; const x = 0.08 + Math.cos(a) * r; const y = Math.sin(a) * r; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
      c.fillStyle = '#e2e8f0'; for (let i = 0; i < 8; i++) { const a = i * (TAU / 8); Ci(c, 0.08 + Math.cos(a) * 0.255, Math.sin(a) * 0.255, 0.02); c.fill(); }
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.03; c.beginPath(); c.arc(0.08, 0, 0.22, -2.6, -1.6); c.stroke();
    },
    gumpal(c, small) {
      c.fillStyle = 'rgba(30,20,60,.18)'; E(c, 0, 0.42, 0.3, 0.06); c.fill();
      const blobs = [[0, 0.04, 0.28], [-0.17, 0.15, 0.18], [0.17, 0.15, 0.18], [-0.08, -0.17, 0.16], [0.13, -0.13, 0.15], [0.0, 0.25, 0.17]];
      c.fillStyle = small ? 'rgba(221,214,254,.95)' : 'rgba(196,181,253,.94)';
      ink(c, 0.03, '#5b21b6');
      blobs.forEach(([x, y, r]) => { Ci(c, x, y, r + 0.015); c.stroke(); });
      blobs.forEach(([x, y, r]) => { Ci(c, x, y, r); c.fill(); });
      c.fillStyle = 'rgba(255,255,255,.55)'; Ci(c, -0.1, -0.16, 0.06); c.fill(); Ci(c, 0.04, -0.22, 0.03); c.fill();
      eye(c, -0.13, 0.0, 0.06, -0.4, 0.2, '#4c1d95'); eye(c, 0.04, 0.0, 0.06, -0.4, 0.2, '#4c1d95');
      ink(c, 0.028, '#3b0764'); c.beginPath(); c.moveTo(-0.22, -0.09); c.lineTo(-0.1, -0.05); c.moveTo(0.11, -0.09); c.lineTo(0.0, -0.05); c.stroke();
      c.beginPath(); c.moveTo(-0.14, 0.13); c.quadraticCurveTo(-0.09, 0.09, -0.05, 0.13); c.quadraticCurveTo(-0.01, 0.17, 0.03, 0.13); c.stroke();
    },
    kecil(c) { c.save(); c.scale(0.62, 0.62); c.translate(0, 0.26); DRAW.gumpal(c, true); c.restore(); },
    raja(c) {
      c.fillStyle = rg(c, 0, 0, 0.05, 0.52, ['rgba(88,28,135,.45)', 'rgba(88,28,135,.18)', 'rgba(88,28,135,0)']); Ci(c, 0, 0, 0.52); c.fill();
      DRAW.kumbang(c, true);
      ink(c, 0.035, '#3b0718'); c.beginPath(); c.moveTo(-0.33, -0.02); c.quadraticCurveTo(-0.5, -0.1, -0.48, -0.3); c.quadraticCurveTo(-0.4, -0.16, -0.27, -0.08); c.closePath(); fs(c, '#701a3a');
      ink(c, 0.025, '#713f12'); c.beginPath(); c.moveTo(-0.37, -0.09); c.lineTo(-0.37, -0.2); c.lineTo(-0.32, -0.14); c.lineTo(-0.27, -0.24); c.lineTo(-0.22, -0.14); c.lineTo(-0.17, -0.2); c.lineTo(-0.17, -0.07); c.closePath();
      fs(c, lg(c, 0, -0.24, 0, -0.07, ['#fef08a', '#f59e0b']));
      c.fillStyle = '#ef4444'; Ci(c, -0.27, -0.12, 0.02); c.fill();
    }
  };
  const ENEMY_SZ = { kumbang: 0.95, belalang: 0.95, gumpal: 0.95, siput: 1.0, kecil: 0.95, raja: 1.55 };
  function renderSprite(fn, u, dpr, box = 1.4, arg) {
    const D = Math.max(4, Math.ceil(u * box * dpr)); const c = document.createElement('canvas'); c.width = D; c.height = D;
    const x = c.getContext('2d'); x.translate(D / 2, D / 2); x.scale(u * dpr, u * dpr); fn(x, arg); return { c, w: D / dpr };
  }
  function variant(base, fill) {
    const c = document.createElement('canvas'); c.width = base.c.width; c.height = base.c.height; const x = c.getContext('2d');
    x.drawImage(base.c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = fill; x.fillRect(0, 0, c.width, c.height); return { c, w: base.w };
  }
  const SPR = {}; let sprKey = '';
  function buildSprites(s, dpr) {
    const k = s.toFixed(1) + '@' + dpr; if (k === sprKey) return; sprKey = k;
    ORDER.forEach((t) => { SPR[t] = renderSprite(DRAW[t], s, dpr); SPR[t + '_f'] = variant(SPR[t], 'rgba(255,255,255,.55)'); });
    SPR.kelapa_cr = renderSprite(DRAW.kelapa_cr, s, dpr);
    Object.keys(EN).forEach((t) => {
      const u = s * ENEMY_SZ[t]; SPR[t] = renderSprite(DRAW[t], u, dpr, 1.45);
      SPR[t + '_f'] = variant(SPR[t], 'rgba(255,255,255,.6)'); SPR[t + '_c'] = variant(SPR[t], 'rgba(125,211,252,.42)');
    });
    SPR.kerbau = emojiSprite('🐃', s * 1.1, dpr, true);
  }
  function emojiSprite(ch, u, dpr, flip) {
    const D = Math.ceil(u * 1.3 * dpr); const c = document.createElement('canvas'); c.width = D; c.height = D; const x = c.getContext('2d');
    x.translate(D / 2, D / 2); if (flip) x.scale(-1, 1); x.font = `${Math.round(u * dpr)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 0, u * dpr * 0.05);
    return { c, w: D / dpr };
  }
  const ICON = {};
  function iconsInit() {
    [...ORDER, ...Object.keys(EN)].forEach((t) => { try { ICON[t] = renderSprite(DRAW[t], 64, 1, t === 'raja' ? 1.25 : 1.15).c.toDataURL(); } catch (e) { ICON[t] = ''; } });
  }
  const img = (t, cls = '') => `<img class="spr ${cls}" src="${ICON[t]}" alt="" draggable="false">`;

  /* ------------------------------ Geometri medan ------------------------------ */
  const field = $('field'); const cv = $('cv'); const ctx = cv.getContext('2d');
  // lapisan latar statis (digambar sekali) di bawah kanvas dinamis → tiap frame cukup clearRect
  const cvBg = document.createElement('canvas'); cvBg.id = 'cvbg'; cvBg.setAttribute('aria-hidden', 'true'); field.insertBefore(cvBg, cv);
  const G = { W: 0, H: 0, cw: 0, ch: 0, ox: 0, s: 0, dpr: 1, hz: 1.25, sz: 0.7 };
  let bg = null;
  function layout() {
    const r = field.getBoundingClientRect(); const w = Math.max(120, Math.floor(r.width)); const h = Math.max(80, Math.floor(r.height));
    const dpr = LITE ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    const phone = innerWidth < 700; G.hz = phone ? 0.85 : 1.25; G.sz = phone ? 0.45 : 0.7;
    if (w === G.W && h === G.H && dpr === G.dpr && bg) { requestDraw(); return; }
    G.W = w; G.H = h; G.dpr = dpr; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const lanes = Math.max(2, L); G.cw = w / (COLS + G.hz + G.sz); G.ch = h / lanes; G.ox = G.hz * G.cw; G.s = Math.min(G.cw * 1.0, G.ch * 1.06) * 0.92;
    buildSprites(G.s, dpr); buildBg(); requestDraw();
    $('stage').classList.toggle('phone', phone);
  }
  let relayoutQ = false;
  function queueRelayout() { if (!relayoutQ) { relayoutQ = true; requestAnimationFrame(() => { relayoutQ = false; layout(); }); } }
  addEventListener('resize', queueRelayout);
  if (window.ResizeObserver) new ResizeObserver(queueRelayout).observe(field);
  const cx = (x) => G.ox + x * G.cw; const cy = (lane) => (lane + 0.5) * G.ch;

  function seeded(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function buildBg() {
    const w = G.W; const h = G.H; const d = G.dpr; const c = cvBg; c.width = Math.round(w * d); c.height = Math.round(h * d); c.style.width = w + 'px'; c.style.height = h + 'px';
    const x = c.getContext('2d'); x.scale(d, d); const R = seeded(7); const lanes = Math.max(2, L); const cw = G.cw; const ch = G.ch; const ox = G.ox;
    // halaman (tanah) di kiri
    x.fillStyle = lg(x, 0, 0, ox, 0, ['#c79a5b', '#d9b47a']); x.fillRect(0, 0, ox + 2, h);
    // sawah
    for (let l = 0; l < lanes; l++) {
      for (let col = 0; col < COLS; col++) {
        const odd = (l + col) % 2; const base = l % 2 ? (odd ? '#5aa83c' : '#63b545') : (odd ? '#55a238' : '#5eae41');
        x.fillStyle = base; x.fillRect(ox + col * cw, l * ch, cw + 1, ch + 1);
        x.strokeStyle = 'rgba(34,90,24,.55)'; x.lineWidth = Math.max(1, cw * 0.025);
        const n = 4; for (let i = 0; i < n; i++) {
          const tx = ox + col * cw + cw * (0.14 + 0.72 * R()); const ty = l * ch + ch * (0.2 + 0.65 * R()); const th = ch * 0.1;
          x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx - th * 0.35, ty - th); x.moveTo(tx, ty); x.lineTo(tx, ty - th * 1.15); x.moveTo(tx, ty); x.lineTo(tx + th * 0.35, ty - th); x.stroke();
        }
        if (R() < 0.18) { x.fillStyle = 'rgba(186,230,253,.28)'; E(x, ox + col * cw + cw * (0.3 + R() * 0.4), l * ch + ch * (0.3 + R() * 0.5), cw * 0.18, ch * 0.05); x.fill(); }
      }
    }
    // garis kolom samar
    x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 1;
    for (let col = 1; col < COLS; col++) { x.beginPath(); x.moveTo(ox + col * cw, 0); x.lineTo(ox + col * cw, h); x.stroke(); }
    // pematang antar lajur & batas antar pemilik
    for (let l = 1; l < lanes; l++) {
      const y = l * ch; const pair = l % 2 === 0;
      x.fillStyle = '#8b5e34'; x.fillRect(ox, y - (pair ? 3 : 1.5), w - ox, pair ? 6 : 3);
      x.fillStyle = 'rgba(255,230,180,.35)'; x.fillRect(ox, y - (pair ? 3 : 1.5), w - ox, 1);
    }
    // tanda pemilik: pita warna di tepi kiri sawah + rona tipis
    for (let p = 0; p < lanes / 2; p++) {
      const col = (P[p] && P[p].color) || COLORS[p]; const y0 = p * 2 * ch;
      x.fillStyle = col; x.globalAlpha = 0.07; x.fillRect(ox, y0, COLS * cw, ch * 2); x.globalAlpha = 1;
      x.fillStyle = col; x.fillRect(ox - 2, y0 + 3, 6, ch * 2 - 6);
      x.globalAlpha = 0.22; x.fillRect(0, y0, ox, ch * 2); x.globalAlpha = 1;
      drawJoglo(x, ox, y0, ch * 2, col);
    }
    // pagar bambu
    const postW = Math.max(3, cw * 0.06);
    for (let y = 2; y < h; y += Math.max(10, ch * 0.22)) {
      x.fillStyle = '#c9a04a'; x.fillRect(ox - postW * 1.6, y, postW, Math.max(8, ch * 0.18));
      x.fillStyle = '#8a6a26'; x.fillRect(ox - postW * 1.6, y + Math.max(8, ch * 0.18) * 0.45, postW, 1.5);
    }
    x.fillStyle = '#b8902f'; x.fillRect(ox - postW * 2.2, 0, postW * 0.5, h); x.fillRect(ox - postW * 0.4, 0, postW * 0.5, h);
    // kabut di kanan (tempat munculnya hama)
    const fx0 = ox + COLS * cw - cw * 0.4;
    x.fillStyle = lg(x, fx0, 0, w, 0, ['rgba(226,232,240,0)', 'rgba(216,206,240,.7)', 'rgba(200,188,232,.95)']); x.fillRect(fx0, 0, w - fx0, h);
    x.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < lanes * 2; i++) { Ci(x, fx0 + cw * (0.4 + R() * 1.1), R() * h, ch * (0.18 + R() * 0.25)); x.fill(); }
    bg = c;
  }
  function drawJoglo(x, ox, y0, hh, col) {
    const cxx = ox * 0.5; const k = Math.min(ox * 0.9, hh * 0.85); const by = y0 + hh * 0.62 + k * 0.18;
    x.save(); x.translate(cxx, by); x.scale(k, k); x.lineJoin = 'round';
    x.fillStyle = 'rgba(0,0,0,.2)'; E(x, 0, 0.05, 0.46, 0.06); x.fill();
    x.lineWidth = 0.025; x.strokeStyle = '#3b2414';
    rr(x, -0.42, -0.02, 0.84, 0.07, 0.02); x.fillStyle = '#a8a29e'; x.fill(); x.stroke();
    x.fillStyle = '#7c4a1a'; [-0.34, -0.12, 0.12, 0.34].forEach((px) => { x.fillRect(px - 0.025, -0.3, 0.05, 0.29); x.strokeRect(px - 0.025, -0.3, 0.05, 0.29); });
    rr(x, -0.28, -0.26, 0.56, 0.25, 0.01); x.fillStyle = '#c08a4d'; x.fill(); x.stroke();
    x.fillStyle = '#3b2414'; x.fillRect(-0.07, -0.2, 0.14, 0.19);
    x.fillStyle = '#fde68a'; x.fillRect(-0.22, -0.2, 0.09, 0.07); x.fillRect(0.13, -0.2, 0.09, 0.07);
    x.beginPath(); x.moveTo(-0.5, -0.26); x.lineTo(0.5, -0.26); x.lineTo(0.3, -0.45); x.lineTo(-0.3, -0.45); x.closePath(); x.fillStyle = '#7c2d12'; x.fill(); x.stroke();
    x.beginPath(); x.moveTo(-0.3, -0.45); x.lineTo(0.3, -0.45); x.lineTo(0.13, -0.7); x.lineTo(-0.13, -0.7); x.closePath(); x.fillStyle = '#9a3412'; x.fill(); x.stroke();
    x.strokeStyle = 'rgba(255,220,180,.35)'; x.lineWidth = 0.012; for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(-0.5 + i * 0.04, -0.26 - i * 0.04); x.lineTo(0.5 - i * 0.04, -0.26 - i * 0.04); x.stroke(); }
    x.strokeStyle = '#3b2414'; x.lineWidth = 0.035; x.beginPath(); x.moveTo(-0.17, -0.7); x.lineTo(0.17, -0.7); x.stroke();
    x.lineWidth = 0.02; x.beginPath(); x.moveTo(0.12, -0.7); x.lineTo(0.12, -0.92); x.stroke();
    x.fillStyle = col; x.beginPath(); x.moveTo(0.12, -0.92); x.lineTo(0.32, -0.86); x.lineTo(0.12, -0.8); x.closePath(); x.fill(); x.stroke();
    x.restore();
  }

  /* ------------------------------ Simulasi pertempuran ------------------------------ */
  function mkDef(type, pid, lane, col) { const D = DEF[type]; return { id: uid++, type, owner: pid, lane, col, hp: D.hp, max: D.hp, cd: 0.4 + Math.random() * 0.4, t: Math.random() * 6, recoil: 0, flash: 0, arm: D.arm || 0 }; }
  function mkEnemy(type, lane, x) {
    const D = EN[type]; const m = DIFF[S.diff].m; const hpM = type === 'raja' ? m * (700 + 180 * W) / D.hp : (1 + 0.05 * (wave - 1));
    const hp = Math.round(D.hp * hpM);
    return { id: uid++, type, lane, x, hp, max: hp, spd: D.spd * (S.speed === 'santai' ? 0.8 : 1), bite: D.bite, armor: D.armor || 0, jump: !!D.jump, jz: 0, slowT: 0, flash: 0, t: Math.random() * 6, eating: false, boss: !!D.boss, sumT: 6, dead: false };
  }
  function enemyCountByLane(l) { let n = 0; for (const e of enemies) if (e.lane === l) n++; return n; }
  function blocker(e) {
    const fx = e.x - 0.38; const c = Math.floor(fx); if (c < 0 || c >= COLS) return null;
    const d = grid[e.lane][c]; if (d && d.type !== 'durian' && fx < c + 0.9) return d; return null;
  }
  function addPart(px, py, vx, vy, life, col, r) { if (parts.length >= PCAP) parts.shift(); parts.push({ x: px, y: py, vx, vy, life, max: life, col, r }); }
  function burst(px, py, col, n, sp = 1, r = 3) { n = LITE ? Math.ceil(n * 0.45) : n; if (RM()) n = Math.min(n, 3); for (let i = 0; i < n; i++) { const a = Math.random() * TAU; const v = (40 + Math.random() * 120) * sp; addPart(px, py, Math.cos(a) * v, Math.sin(a) * v - 40 * sp, 0.35 + Math.random() * 0.4, Array.isArray(col) ? col[i % col.length] : col, r * (0.6 + Math.random() * 0.8)); } }
  function ring(px, py, col, r1, life = 0.45) { if (rings.length > 16) rings.shift(); rings.push({ x: px, y: py, col, r1, life, max: life }); }

  function damage(e, amt, src) {
    if (e.dead) return;
    let a = amt; if (e.armor && !src.pierce && !src.blast) a *= 1 - e.armor;
    e.hp -= a; if (!(e.fcd > 0)) { e.flash = 0.07; e.fcd = 0.24; }
    if (src.slow) e.slowT = Math.max(e.slowT, src.slowT || 3);
    if (e.hp <= 0) killEnemy(e, src.owner);
  }
  function killEnemy(e, by) {
    if (e.dead) return; e.dead = true;
    const p = by != null && P[by] ? P[by] : null; if (p) { p.kills++; if (e.boss) p.bossKills++; }
    const px = cx(e.x); const py = cy(e.lane);
    if (e.type === 'gumpal') { for (let i = 0; i < EN.gumpal.split; i++) { const k = mkEnemy('kecil', e.lane, e.x + (i ? 0.28 : -0.05)); enemies.push(k); } }
    if (e.boss) {
      burst(px, py, ['#f472b6', '#a855f7', '#fde047', '#fff'], 30, 2, 5); ring(px, py, '#fde047', G.s * 2.4, 0.8); SND.boom();
      ev('bosskill', { lane: e.lane, by });
      FX.announce('👑 RAJA KABUT HAMA TUMBANG!', { color: '#7e22ce', sub: p ? `Dikalahkan oleh ${esc(p.name)}!` : 'Kebun selamat dari Raja!', dur: Math.max(300, 1500 * TS) });
    } else { burst(px, py, ['#ddd6fe', '#f1f5f9', '#a78bfa'], 7, 0.8, 3); SND.kill(); }
  }
  function destroyDef(d, how = 'eaten') {
    if (grid[d.lane][d.col] !== d) return; grid[d.lane][d.col] = null;
    const px = cx(d.col + 0.5); const py = cy(d.lane);
    if (how === 'eaten') { burst(px, py, ['#a16207', '#65a30d', '#fde68a'], 8, 0.7, 3); P[d.owner] && P[d.owner].lostDefs++; }
    renderShop();
  }
  let lastBreachToast = 0;
  function breach(e) {
    if (e.dead) return; e.dead = true; const pid = ownerOf(e.lane); const p = P[pid]; if (!p) return;
    const loss = Math.min(p.hearts, e.boss ? 3 : 1); p.breaches++; p.laneBreach[e.lane - pid * 2]++;
    laneFlash[e.lane] = 1.2; SND.breach();
    burst(G.ox * 0.5, cy(e.lane), ['#ef4444', '#fca5a5', '#fff'], 12, 1.2, 4);
    const wasAlive = p.hearts > 0; p.hearts -= loss;
    ev('breach', { lane: e.lane, pid, loss, boss: e.boss });
    if (wasAlive && p.hearts <= 0) { p.fell++; ev('fall', { pid }); FX.announce(`🌫️ KEBUN ${esc(p.name).toUpperCase()} JATUH!`, { color: '#4c1d95', sub: 'Jawab soal dengan BENAR untuk membangkitkan kebun (+1 ❤️)!', dur: Math.max(300, 1500 * TS) }); }
    const card = $('ow' + pid); if (card) { card.classList.remove('hit'); void card.offsetWidth; card.classList.add('hit'); }
    FX.shake(field, 8, 380);
    if (now() - lastBreachToast > 1100 * TS) lastBreachToast = now(); else { renderOwners(); if (P.reduce((s, o) => s + o.hearts, 0) <= 0) pendingEnd = 'lose'; return; }
    QC.toast(`💔 Kebun <b>${esc(p.name)}</b> kebobolan${e.boss ? ' oleh RAJA' : ''}!${loss ? ` −${loss} ❤️` : ' (kebun sudah jatuh)'}`, 'bad');
    renderOwners();
    if (P.reduce((s, o) => s + o.hearts, 0) <= 0) pendingEnd = 'lose';
  }
  function fire(d) {
    const D = DEF[d.type]; const px = d.col + 0.78; d.recoil = 0.14;
    if (d.type === 'meriam') {
      let tgt = null; for (const e of enemies) if (!e.dead && e.lane === d.lane && e.x > d.col + 0.3 && e.x < COLS + 0.35 && (!tgt || e.x < tgt.x)) tgt = e;
      if (!tgt) return;
      const tx = Math.max(d.col + 0.8, tgt.x - tgt.spd * 0.45); shots.push({ kind: 'meriam', lane: d.lane, x: px, x0: px, tx, spd: 5.2, dmg: D.dmg, owner: d.owner, splash: D.splash, wait: 0 });
      SND.cannon(); burst(cx(px + 0.1), cy(d.lane) - G.s * 0.1, ['#e5e7eb', '#cbd5e1'], 4, 0.4, 4);
      return;
    }
    const n = D.shots || 1;
    for (let i = 0; i < n; i++) shots.push({ kind: d.type, lane: d.lane, x: px, spd: d.type === 'tebu' ? 6.5 : 7, dmg: D.dmg, owner: d.owner, pierce: !!D.pierce, slow: D.slow ? D.slow : 0, slowT: D.slowT, hit: D.pierce ? new Set() : null, wait: i * 0.13, yo: n > 1 ? (i ? 0.06 : -0.06) : 0 });
    ({ cabai: SND.shoot, jagung: SND.corn, tebu: SND.spear, kendi: SND.dew })[d.type]();
  }
  function explodeDurian(d) {
    const x0 = d.col + 0.5; const D = DEF.durian; destroyDef(d, 'boom');
    for (const e of enemies) if (!e.dead && Math.abs(e.lane - d.lane) <= 1 && Math.abs(e.x - x0) <= D.radius) damage(e, D.dmg, { owner: d.owner, blast: true });
    const px = cx(x0); const py = cy(d.lane);
    ring(px, py, '#fde047', G.cw * D.radius * 1.4, 0.55); ring(px, py, '#84cc16', G.cw * D.radius, 0.4);
    burst(px, py, ['#a3e635', '#fde047', '#65a30d', '#fff'], 22, 1.8, 5); SND.boom(); FX.shake(field, 6, 300);
    ev('durian', { lane: d.lane, col: d.col });
  }
  function canBattle() { return phase === 'battle' && !paused; }
  function step(dt) {
    simTime += dt;
    const battle = canBattle();
    if (battle) {
      battleT += dt;
      // munculkan hama
      while (spawnQ.length && spawnQ[0].t <= battleT) {
        const s = spawnQ.shift(); const e = mkEnemy(s.type, s.lane, COLS + 0.45); enemies.push(e);
        if (e.boss) { SND.boss(); ring(cx(e.x), cy(e.lane), '#a855f7', G.s * 2, 0.8); }
      }
      // penjaga
      for (let l = 0; l < L; l++) {
        let ahead = -1; for (const e of enemies) if (!e.dead && e.lane === l && e.x < COLS + 0.35 && e.x > ahead) ahead = e.x;
        for (let col = 0; col < COLS; col++) {
          const d = grid[l][col]; if (!d) continue; d.t += dt; if (d.recoil > 0) d.recoil -= dt; if (d.flash > 0) d.flash -= dt;
          const D = DEF[d.type];
          if (D.rate) { d.cd -= dt; if (d.cd <= 0 && ahead > col + 0.3) { fire(d); d.cd = D.rate * (0.95 + Math.random() * 0.1); } }
          else if (d.type === 'durian') {
            if (d.arm > 0) d.arm -= dt;
            else { for (const e of enemies) if (!e.dead && e.lane === l && Math.abs(e.x - (col + 0.5)) < 0.75) { explodeDurian(d); break; } }
          }
        }
      }
      // hama
      for (const e of enemies) {
        if (e.dead) continue; e.t += dt; if (e.flash > 0) e.flash -= dt; if (e.fcd > 0) e.fcd -= dt;
        const slowF = e.slowT > 0 ? 0.5 : 1; if (e.slowT > 0) e.slowT -= dt;
        if (e.jz > 0) { e.jz += dt / 0.6; e.x -= dt * 1.9; if (e.jz >= 1) e.jz = 0; e.eating = false; }
        else {
          const d = blocker(e);
          if (d) {
            if (e.jump) { e.jump = false; e.jz = 0.001; }
            else {
              e.eating = true; d.hp -= e.bite * slowF * dt; e.biteT = (e.biteT || 0) + dt;
              if (e.biteT > 0.4) { e.biteT = 0; d.flash = 0.08; SND.chomp(); if (Math.random() < 0.6) addPart(cx(d.col + 0.75), cy(d.lane) - G.s * 0.1, 30 + Math.random() * 40, -60, 0.4, d.type === 'kelapa' ? '#c08a4d' : '#86efac', 3); }
              if (d.hp <= 0) destroyDef(d, 'eaten');
            }
          } else { e.eating = false; e.x -= e.spd * slowF * dt; }
        }
        if (e.boss) {
          e.sumT -= dt;
          if (e.sumT <= 0) { e.sumT = 8; if ((e.summons = (e.summons || 0) + 1) <= 4 && enemyCountByLane(e.lane) < 7) { const k = mkEnemy('kumbang', e.lane, Math.min(COLS + 0.3, e.x + 0.7)); enemies.push(k); burst(cx(e.x), cy(e.lane), ['#c4b5fd', '#fff'], 6, 0.6, 3); } }
        }
        if (e.x < -0.12) breach(e);
      }
      // peluru
      for (const s of shots) {
        if (s.dead) continue;
        if (s.wait > 0) { s.wait -= dt; continue; }
        s.x += s.spd * dt;
        if (s.kind === 'meriam') {
          if (s.x >= s.tx) {
            s.dead = true; const px = cx(s.tx); const py = cy(s.lane);
            for (const e of enemies) if (!e.dead && e.lane === s.lane && Math.abs(e.x - s.tx) <= s.splash) damage(e, s.dmg, { owner: s.owner, blast: true });
            ring(px, py, '#fb923c', G.cw * 0.9, 0.35); burst(px, py, ['#fdba74', '#78350f', '#fde68a'], 9, 1, 4); SND.hit();
          }
          continue;
        }
        let best = null;
        for (const e of enemies) {
          if (e.dead || e.lane !== s.lane || e.jz > 0.15 && e.jz < 0.85) continue;
          if (Math.abs(e.x - s.x) < 0.26) { if (s.pierce) { if (!s.hit.has(e.id)) { s.hit.add(e.id); damage(e, s.dmg, s); SND.hit(); } } else if (!best || e.x < best.x) best = e; }
        }
        if (best) { s.dead = true; damage(best, s.dmg, s); SND.hit(); burst(cx(s.x), cy(s.lane) - G.s * 0.08, s.kind === 'kendi' ? ['#bae6fd', '#fff'] : s.kind === 'jagung' ? ['#fde047', '#fff'] : ['#fca5a5', '#fde68a'], 3, 0.5, 2.5); }
        if (s.x > COLS + 0.7) s.dead = true;
      }
      if (shots.length > 40 || shots.some((s) => s.dead)) shots = shots.filter((s) => !s.dead);
    }
    // kerbau sakti (berjalan di semua fase non-soal)
    for (const k of kerbaus) {
      k.x += 7.5 * dt;
      for (const e of enemies) if (!e.dead && e.lane === k.lane && !k.hit.has(e.id) && e.x <= k.x + 0.35) { k.hit.add(e.id); damage(e, 650, { owner: k.owner, blast: true }); if (!e.dead) e.x = Math.min(COLS + 0.4, e.x + 0.5); }
      if (Math.random() < 0.5) addPart(cx(k.x - 0.4), cy(k.lane) + G.s * 0.3, -40 - Math.random() * 40, -20 - Math.random() * 30, 0.4, '#d6b37a', 4);
      if (k.x > COLS + 1) k.done = true;
    }
    if (kerbaus.length) kerbaus = kerbaus.filter((k) => !k.done);
    if (enemies.some((e) => e.dead)) enemies = enemies.filter((e) => !e.dead);
    // partikel
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; }
    if (parts.length) parts = parts.filter((p) => p.life > 0);
    for (const r of rings) r.life -= dt; if (rings.length) rings = rings.filter((r) => r.life > 0);
    for (let l = 0; l < L; l++) if (laneFlash[l] > 0) laneFlash[l] -= dt;
    if (battle && !pendingEnd) {
      if (!spawnQ.length && !enemies.length && !testHold) pendingEnd = 'clear';
      else if (battleT > capT) pendingEnd = 'cap';
    }
  }

  /* ------------------------------ Gambar ------------------------------ */
  let rafId = 0; let drawQ = 0; let lastT = 0; let perf = { frames: [], gaps: [], dr: [], lastTs: 0 };
  function needLoop() {
    if (QC.isBusy() || document.hidden || !bg) return false;
    if (canBattle()) return true;
    return kerbaus.length > 0 || parts.length > 0 || rings.length > 0 || laneFlash.some((v) => v > 0);
  }
  function frame(ts) {
    rafId = 0;
    if (!needLoop()) { lastT = 0; draw(); return; }
    rafId = requestAnimationFrame(frame);
    const minGap = 1000 / FPS - 3;
    if (lastT && ts - lastT < minGap) return;
    let dt = lastT ? (ts - lastT) / 1000 : 1 / FPS; lastT = ts; dt = Math.min(dt, 0.1);
    const t0 = now();
    let left = dt * SIMF; while (left > 0.002) { const h = left < 0.045 ? left : Math.min(left, 1 / 30); step(h); left -= h; }
    const t1 = now(); draw(); perf.dr.push(now() - t1); if (perf.dr.length > 600) perf.dr.shift();
    const ft = now() - t0; perf.frames.push(ft); if (perf.frames.length > 600) perf.frames.shift();
    if (perf.lastTs) { perf.gaps.push(ts - perf.lastTs); if (perf.gaps.length > 600) perf.gaps.shift(); } perf.lastTs = ts;
    if (pendingEnd) { const k = pendingEnd; pendingEnd = null; handleEnd(k); }
    if (++hudTick % (LITE ? 8 : 15) === 0) hudLive();
  }
  let hudTick = 0;
  function wake() { if (!rafId && needLoop()) { lastT = 0; perf.lastTs = 0; rafId = requestAnimationFrame(frame); } }
  function requestDraw() { if (rafId || drawQ) return; drawQ = requestAnimationFrame(() => { drawQ = 0; if (!rafId) draw(); }); }
  setInterval(() => { if (needLoop()) wake(); }, 400);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  function drawSpr(sp, x, y, sx = 1, sy = 1, rot = 0) {
    if (!sp) return;
    if (sx === 1 && sy === 1 && !rot) { ctx.drawImage(sp.c, x - sp.w / 2, y - sp.w / 2, sp.w, sp.w); return; }
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sx, sy); ctx.drawImage(sp.c, -sp.w / 2, -sp.w / 2, sp.w, sp.w); ctx.restore();
  }
  function draw() {
    if (!bg) return;
    if (grid.length !== L) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); return; }
    const d = G.dpr; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(d, 0, 0, d, 0, 0);
    const live = canBattle(); const tt = simTime;
    // bahaya & kebobolan
    for (let l = 0; l < L; l++) {
      const mx = laneMinX[l]; const fl = laneFlash[l] > 0 ? laneFlash[l] : 0;
      if ((mx != null && mx < 2.6) || fl > 0) {
        const a = fl > 0 ? Math.min(0.75, fl * 0.6) : (0.22 + (live && !LITE ? 0.12 * Math.sin(tt * 6) : 0)) * (1 - mx / 2.6) + 0.12;
        ctx.fillStyle = `rgba(239,68,68,${a.toFixed(3)})`; ctx.fillRect(0, l * G.ch + 2, G.ox + G.cw * 1.4, G.ch - 4);
      }
    }
    // kebun jatuh: rona kabut ungu
    for (const p of P) if (p.hearts <= 0 && grid.length === L) { ctx.fillStyle = 'rgba(76,29,149,.42)'; ctx.fillRect(0, p.id * 2 * G.ch, G.ox, G.ch * 2); ctx.fillStyle = 'rgba(167,139,250,.14)'; ctx.fillRect(G.ox, p.id * 2 * G.ch, COLS * G.cw, G.ch * 2); }
    // petak sasaran (saat kartu dipilih)
    const own = P[owner];
    if (sel && own && !own.ai && interactive()) {
      const valid = sel === 'kerbau' ? null : (l, c) => (sel === 'cabut' ? !!grid[l][c] : !grid[l][c]);
      for (const l of lanesOf(owner)) {
        if (sel === 'kerbau') { ctx.fillStyle = 'rgba(253,224,71,.16)'; ctx.fillRect(G.ox, l * G.ch + 3, COLS * G.cw, G.ch - 6); continue; }
        for (let c = 0; c < COLS; c++) if (valid(l, c)) { ctx.fillStyle = sel === 'cabut' ? 'rgba(248,113,113,.22)' : 'rgba(255,255,255,.13)'; ctx.fillRect(G.ox + c * G.cw + 3, l * G.ch + 3, G.cw - 6, G.ch - 6); }
      }
    }
    const tgt = hover || cursor;
    if (tgt && own && interactive() && ownerOf(tgt.lane) === owner) {
      const x0 = G.ox + tgt.col * G.cw; const y0 = tgt.lane * G.ch;
      ctx.lineWidth = 3; ctx.strokeStyle = sel === 'cabut' ? '#f87171' : '#fde047'; ctx.strokeRect(x0 + 2, y0 + 2, G.cw - 4, G.ch - 4);
      if (sel && DEF[sel] && !grid[tgt.lane][tgt.col]) { ctx.globalAlpha = 0.55; drawSpr(SPR[sel], x0 + G.cw / 2, y0 + G.ch / 2); ctx.globalAlpha = 1; }
    }
    // penjaga
    for (let l = 0; l < L; l++) {
      const y = cy(l) - G.ch * 0.02;
      for (let c = 0; c < COLS; c++) {
        const df = grid[l][c]; if (!df) continue; const x = cx(c + 0.5);
        let sp = df.flash > 0 ? SPR[df.type + '_f'] : df.type === 'kelapa' && df.hp < df.max * 0.5 ? SPR.kelapa_cr : SPR[df.type];
        let sx = 1; let sy = 1;
        if (live && !LITE) { sy = 1 + Math.sin(df.t * 2.2 + c) * 0.025; }
        if (df.recoil > 0) { sx = 1 - df.recoil * 0.9; sy = 1 + df.recoil * 0.6; }
        if (df.type === 'durian' && df.arm <= 0 && live) sx = sy = 1 + Math.sin(tt * 12 + c) * 0.04;
        drawSpr(sp, x, y, sx, sy);
        if (df.type === 'durian') { ctx.fillStyle = df.arm > 0 ? '#94a3b8' : (Math.floor(tt * 4) % 2 ? '#ef4444' : '#fde047'); ctx.beginPath(); ctx.arc(x + G.s * 0.06, y - G.s * 0.44, Math.max(2, G.s * 0.035), 0, TAU); ctx.fill(); }
        if (df.hp < df.max) { const w = G.cw * 0.6; const bx = x - w / 2; const by = l * G.ch + G.ch * 0.1; ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(bx, by, w, 4); ctx.fillStyle = df.hp / df.max > 0.5 ? '#4ade80' : df.hp / df.max > 0.25 ? '#facc15' : '#ef4444'; ctx.fillRect(bx, by, w * Math.max(0, df.hp / df.max), 4); }
      }
    }
    // hama
    for (const e of enemies) {
      const x = cx(e.x); let y = cy(e.lane) - G.ch * 0.02; let rot = 0; let sx = 1; let sy = 1;
      if (live && !LITE) { if (e.eating) { rot = Math.sin(e.t * 14) * 0.08; } else { y += Math.sin(e.t * 9) * G.s * 0.025; rot = Math.sin(e.t * 9) * 0.035; } }
      else if (live && e.eating) rot = Math.sin(e.t * 14) * 0.08;
      if (e.jz > 0) { y -= Math.sin(e.jz * Math.PI) * G.ch * 0.55; rot = -0.25; }
      if (e.type === 'gumpal' || e.type === 'kecil') { sx = 1 + Math.sin(e.t * 5) * 0.04; sy = 1 - Math.sin(e.t * 5) * 0.04; }
      const sp = e.flash > 0 ? SPR[e.type + '_f'] : e.slowT > 0 ? SPR[e.type + '_c'] : SPR[e.type];
      drawSpr(sp, x, y, sx, sy, rot);
      if (e.slowT > 0) { ctx.fillStyle = 'rgba(224,242,254,.85)'; const r = Math.max(2, G.s * 0.04); ctx.fillRect(x - G.s * 0.2, y - G.s * 0.3, r, r); ctx.fillRect(x + G.s * 0.15, y - G.s * 0.22, r, r); }
      if (e.hp < e.max) {
        const w = e.boss ? G.cw * 1.4 : G.cw * 0.55; const bx = x - w / 2; const by = y - (e.boss ? G.s * 0.85 : G.s * 0.5); const hgt = e.boss ? 7 : 4;
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(bx - 1, by - 1, w + 2, hgt + 2); ctx.fillStyle = e.boss ? '#e879f9' : '#f87171'; ctx.fillRect(bx, by, w * Math.max(0, e.hp / e.max), hgt);
      }
    }
    // peluru
    for (const s of shots) {
      if (s.dead || s.wait > 0) continue; const x = cx(s.x); const y = cy(s.lane) - G.s * 0.16 + (s.yo || 0) * G.s;
      if (s.kind === 'cabai') { ctx.fillStyle = 'rgba(251,146,60,.45)'; E(ctx, x - G.s * 0.1, y, G.s * 0.1, G.s * 0.035); ctx.fill(); ctx.fillStyle = '#dc2626'; E(ctx, x, y, G.s * 0.11, G.s * 0.06); ctx.fill(); ctx.fillStyle = '#fde047'; E(ctx, x + G.s * 0.04, y - G.s * 0.015, G.s * 0.04, G.s * 0.02); ctx.fill(); }
      else if (s.kind === 'jagung') { ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(x, y, G.s * 0.065, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff7cc'; ctx.fillRect(x - G.s * 0.02, y - G.s * 0.035, G.s * 0.03, G.s * 0.03); }
      else if (s.kind === 'kendi') { ctx.fillStyle = 'rgba(186,230,253,.5)'; E(ctx, x - G.s * 0.08, y, G.s * 0.09, G.s * 0.04); ctx.fill(); ctx.fillStyle = 'rgba(56,189,248,.95)'; ctx.beginPath(); ctx.arc(x, y, G.s * 0.075, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x - G.s * 0.035, y - G.s * 0.035, G.s * 0.03, G.s * 0.03); }
      else if (s.kind === 'tebu') { ctx.strokeStyle = '#b45309'; ctx.lineWidth = Math.max(2, G.s * 0.05); ctx.beginPath(); ctx.moveTo(x - G.s * 0.22, y); ctx.lineTo(x + G.s * 0.12, y); ctx.stroke(); ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(x + G.s * 0.1, y - G.s * 0.05); ctx.lineTo(x + G.s * 0.24, y); ctx.lineTo(x + G.s * 0.1, y + G.s * 0.05); ctx.fill(); }
      else if (s.kind === 'meriam') { const k = clamp((s.x - s.x0) / Math.max(0.01, s.tx - s.x0), 0, 1); const yy = y - Math.sin(k * Math.PI) * G.ch * 0.55; ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(x, yy, G.s * 0.075, 0, TAU); ctx.fill(); ctx.fillStyle = '#9ca3af'; ctx.fillRect(x - G.s * 0.03, yy - G.s * 0.04, G.s * 0.025, G.s * 0.025); }
    }
    // kerbau
    for (const k of kerbaus) drawSpr(SPR.kerbau, cx(k.x), cy(k.lane) - G.ch * 0.04, 1, 1, Math.sin(k.x * 6) * 0.05);
    // efek
    for (const r of rings) { const k = 1 - r.life / r.max; ctx.globalAlpha = Math.max(0, 1 - k); ctx.strokeStyle = r.col; ctx.lineWidth = Math.max(2, 8 * (1 - k)); ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(1, r.r1 * k), 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const p of parts) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col; ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); }
    ctx.globalAlpha = 1;
  }

  /* ------------------------------ Gelombang ------------------------------ */
  const waveBudget = (w) => DIFF[S.diff].m * (180 + 165 * (w - 1) + 20 * (w - 1) * (w - 1));
  function availEnemies(w) {
    const a = ['kumbang']; if (w >= 2) a.push('belalang');
    if (w >= Math.min(3, Math.ceil(W * 0.45))) a.push('gumpal'); if (w >= Math.min(4, Math.ceil(W * 0.6))) a.push('siput'); return a;
  }
  function buildWave(w) {
    const final = w >= W; const avail = availEnemies(w); let budget = waveBudget(w) * (final ? 0.45 : 1);
    const wt = { kumbang: 4, belalang: 2.5, gumpal: 2, siput: 1.6 }; const list = [];
    avail.slice(1).forEach((t) => { if (budget >= EN[t].cost * 0.8 && !list.includes(t) && (w === 2 && t === 'belalang' || w >= 3)) { list.push(t); budget -= EN[t].cost; } });
    let guard = 0;
    while (budget > 60 && guard++ < 80) {
      const ok = avail.filter((t) => EN[t].cost <= budget + 40); if (!ok.length) break;
      const tot = ok.reduce((s, t) => s + wt[t], 0); let r = Math.random() * tot; let pick = ok[0];
      for (const t of ok) { r -= wt[t]; if (r <= 0) { pick = t; break; } }
      list.push(pick); budget -= EN[pick].cost;
    }
    const items = QC.shuffle(list); const n = items.length; const span = clamp(4 + n * 2.1, 5, 24);
    const times = items.map((_, i) => (i === 0 ? 0.6 : 0.6 + Math.random() * span)).sort((a, b) => a - b);
    let flip = Math.random() < 0.5 ? 1 : 0; const lanesIdx = items.map((_, i) => { if (Math.random() < 0.3) flip ^= 1; return (i + flip) % 2; });
    const out = []; const pairs = P.length;
    for (let p = 0; p < pairs; p++) {
      const swap = Math.random() < 0.5 ? 1 : 0;
      items.forEach((t, i) => out.push({ t: times[i] + Math.random() * 0.5, lane: p * 2 + (lanesIdx[i] ^ swap), type: t }));
      if (final) out.push({ t: span * 0.3 + Math.random() * 0.6, lane: p * 2 + (Math.random() < 0.5 ? 0 : 1), type: 'raja' });
    }
    out.sort((a, b) => a.t - b.t);
    return { list: out, perKebun: items.slice(), span, final };
  }
  function intelHTML() {
    if (!waveList || !waveList.perKebun) return '';
    const cnt = {}; waveList.perKebun.forEach((t) => (cnt[t] = (cnt[t] || 0) + 1)); if (waveList.final) cnt.raja = 1;
    return Object.keys(cnt).map((t) => `<span class="intel" title="${EN[t].name}">${img(t)}×${cnt[t]}</span>`).join('');
  }

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
  const hearts = (p) => { const max = Math.max(S.hearts, p.hearts); let h = ''; for (let i = 0; i < max; i++) h += `<i class="${i < p.hearts ? 'on' : ''}">${i < p.hearts ? '❤️' : '🖤'}</i>`; return h; };
  function interactive() { return ['turn', 'plant', 'battle', 'prep'].includes(phase) && !QC.isBusy(); }
  function buildOwners() {
    $('owners').innerHTML = P.map((p, i) => `<div class="ow" id="ow${i}" style="--pc:${p.color}" data-pid="${i}">
      <div class="ow-top"><span class="ow-av">${p.ai ? '🤖' : p.avatar}</span><b class="ow-name">${esc(p.name).replace(/^(Laskar|Tim|Kelompok|Regu)\s+(?=\S)/i, (m) => `<span class="ow-pre">${m}</span>`)}</b>${p.ai ? '' : `<kbd>${i + 1}</kbd>`}</div>
      <div class="ow-mid"><span class="ow-pts"><b id="op${i}">0</b><small>poin</small></span><span class="ow-hearts" id="oh${i}"></span></div>
      <div class="ow-sub" id="os${i}"></div><span class="ow-warn">⚠️ BAHAYA!</span></div>`).join('');
    $('owners').dataset.n = P.length;
    $('owners').querySelectorAll('.ow').forEach((el) => (el.onclick = () => { const i = +el.dataset.pid; if (P[i] && !P[i].ai) { setOwner(i); SND.click(); } }));
  }
  function renderOwners() {
    const inPlay = !['idle', 'brief', 'over'].includes(phase);
    P.forEach((p, i) => {
      const c = $('ow' + i); if (!c) return;
      c.classList.toggle('turn', inPlay && i === turnPid && ['turn', 'quiz', 'plant', 'rebut', 'ai'].includes(phase));
      c.classList.toggle('buyer', inPlay && i === owner && !p.ai);
      c.classList.toggle('dead', p.hearts <= 0);
      setText($('op' + i), p.pts);
      setHTML($('oh' + i), hearts(p));
      const ans = inPlay && i === turnPid && !p.ai && ['turn', 'quiz', 'plant'].includes(phase) ? curAnswerer || (peekAnswerer(p) && peekAnswerer(p).name) : null;
      setHTML($('os' + i), `<span class="kb-k" title="Kerbau Sakti">${p.kerbau ? '🐃' : '<s>🐃</s>'}</span><span title="Hama dibasmi">🪲${p.kills}</span>${ans ? `<span class="an">🙋 ${esc(ans)}</span>` : p.ai ? '<span class="an ai">🤖 komputer</span>' : ''}`);
    });
  }
  function hudLive() {
    // bahaya per lajur, jumlah hama, jam
    for (let l = 0; l < L; l++) laneMinX[l] = null;
    for (const e of enemies) if (e.x < COLS + 0.3 && (laneMinX[e.lane] == null || e.x < laneMinX[e.lane])) laneMinX[e.lane] = e.x;
    P.forEach((p, i) => {
      const dz = lanesOf(i).some((l) => laneMinX[l] != null && laneMinX[l] < 2.4);
      const c = $('ow' + i); if (c && c.classList.contains('danger') !== dz) c.classList.toggle('danger', dz);
      if (dz && phase === 'battle') { const k = wave + ':' + i; if (!warned[k]) { warned[k] = 1; ev('danger', { pid: i }); } }
    });
    renderInfo();
  }
  function renderInfo() {
    setText($('waveNo'), Math.min(wave, W)); setText($('waveMax'), '/' + W);
    const ph = { idle: 'Siap', brief: 'Siap', prep: 'Jawab & Tanam', turn: 'Jawab & Tanam', quiz: 'Menjawab', rebut: 'Rebutan', plant: 'Tanam', ai: 'Robo Tani', battle: paused ? 'Jeda' : 'SERBUAN!', waveEnd: 'Panen', over: 'Selesai' }[phase] || '';
    setText($('phaseNo'), ph); $('phaseBox').classList.toggle('war', phase === 'battle' && !paused);
    setText($('foeNo'), enemies.length + spawnQ.length);
    setText($('clockNo'), clock(tStart && phase !== 'brief' ? (phase === 'over' ? endAt : Date.now()) - tStart : 0));
  }
  let endAt = 0;
  function hintText() {
    const p = P[turnPid] || P[owner]; const o = P[owner]; if (!p) return '';
    switch (phase) {
      case 'brief': return '🌾 Baca panduan singkat, lalu klik <b>MULAI BERJAGA</b> (Spasi).';
      case 'prep': return `🌾 Gelombang ${wave} segera datang: ${intelHTML()} <span class="kb">per kebun</span>`;
      case 'turn': return p.ai ? `🤖 ${esc(p.name)} bersiap…` : `${nm(p)} bersiap menjawab${peekAnswerer(p) ? ` — penjawab: <b>${esc(peekAnswerer(p).name)}</b>` : ''}. Klik <b>JAWAB SOAL</b> / Spasi. <span class="kb">Gelombang ${wave}: ${intelHTML()}</span>`;
      case 'quiz': return `❓ ${nm(p)} sedang menjawab… <span class="kb">benar +${PT().ok} • salah −${PT().no}</span>`;
      case 'plant': return o && !o.ai ? `🌱 ${nm(o)} (${o.pts} poin): pilih kartu penjaga <span class="kb">(Q–I)</span>, lalu ketuk petak di <b>2 lajurmu</b>. Selesai = <b>Spasi</b>.` : '🌱 Menanam…';
      case 'battle': return paused ? '⏸️ Jeda. Tekan <b>P</b> / tombol LANJUT.' : `⚔️ SERBUAN! Tetap bisa menanam (ketuk lajurmu). <span class="kb">🐃 K = Kerbau Sakti • P = jeda • 1–4 = ganti tim</span>`;
      case 'rebut': return '⚡ Soal Rebutan! Tim lain cepat klik tombol timnya.';
      case 'ai': return `🤖 ${esc(p.name)} sedang berpikir…`;
      case 'waveEnd': return '🌾 Gelombang selesai — panen poin!';
      case 'over': return '🏁 Permainan selesai!';
      default: return '';
    }
  }
  function canAfford(p, t) { return p.pts >= DEF[t].cost && unlocked(t); }
  // jeda beli hanya berlaku saat SERBUAN (waktu nyata); saat fase tanam bebas menanam
  function cdLeft(p, t) { return phase === 'battle' ? Math.max(0, (p.cdUntil[t] || 0) - now()) : 0; }
  function renderShop() {
    const o = P[owner]; const box = $('shCards');
    setHTML($('shOwner'), o ? `<button class="own-chip" id="ownChip" style="--pc:${o.color}" title="Ganti tim (1–4)"><span class="av">${o.ai ? '🤖' : o.avatar}</span><span class="tx"><small>TOKO</small><b>${esc(o.name)}</b></span><span class="pts"><b>${o.pts}</b><small>poin</small></span></button>` : '');
    const ch = $('ownChip'); if (ch) ch.onclick = (e) => { e.currentTarget.blur(); cycleOwner(); };
    if (!box._built) {
      box._built = true;
      box.innerHTML = ORDER.map((t) => `<button class="card" data-t="${t}" title="${DEF[t].name}: ${DEF[t].desc}">${img(t)}<span class="nm">${DEF[t].short}</span><span class="cost">${DEF[t].cost}</span><kbd>${DEF[t].key}</kbd><i class="cdv"></i><span class="lock"></span></button>`).join('');
      box.querySelectorAll('.card').forEach((b) => (b.onclick = (e) => { e.currentTarget.blur(); pick(b.dataset.t); }));
      $('shTools').innerHTML = `<button class="tool" data-t="cabut" title="Cabut penjaga (kembali 50% poin)"><span class="ic">🧹</span><span class="nm">Cabut</span><kbd>X</kbd></button><button class="tool kerbau" data-t="kerbau" title="Kerbau Sakti: menyapu 1 lajur (sekali per tim)"><span class="ic">🐃</span><span class="nm">Kerbau</span><kbd>K</kbd></button>`;
      $('shTools').querySelectorAll('.tool').forEach((b) => (b.onclick = (e) => { e.currentTarget.blur(); pick(b.dataset.t); }));
    }
    const act = interactive() && o && !o.ai;
    box.querySelectorAll('.card').forEach((b) => {
      const t = b.dataset.t; const lock = !unlocked(t); const cd = o ? cdLeft(o, t) : 0;
      b.classList.toggle('locked', lock); b.classList.toggle('poor', !!o && !lock && o.pts < DEF[t].cost); b.classList.toggle('sel', sel === t);
      b.classList.toggle('cool', cd > 0); b.style.setProperty('--cd', o && cd > 0 ? (cd / (DEF[t].cd * 1000 * cdScale())).toFixed(3) : 0);
      b.disabled = !act; setText(b.querySelector('.lock'), lock ? `🔒 Gel. ${DEF[t].unlock}` : '');
    });
    $('shTools').querySelectorAll('.tool').forEach((b) => {
      const t = b.dataset.t; b.classList.toggle('sel', sel === t); b.disabled = !act || (t === 'kerbau' && !(o && o.kerbau));
      b.classList.toggle('used', t === 'kerbau' && !!o && !o.kerbau);
    });
    renderActs();
  }
  const cdScale = () => (TS < 1 ? 0.1 : 1);
  setInterval(() => { const o = P[owner]; if (o && ORDER.some((t) => (o.cdUntil[t] || 0) > now() - 400)) renderShop(); }, 250);
  const B_ = (act, cls, ic, label, key) => `<button class="cbtn ${cls}" data-act="${act}"><span class="ic">${ic}</span><span class="lb">${label}</span>${key ? `<small>${key}</small>` : ''}</button>`;
  function renderActs() {
    const p = P[turnPid]; let a = '';
    if (phase === 'turn' && p && !p.ai) a = B_('ask', 'main', '❓', 'JAWAB SOAL', 'SPASI');
    else if (phase === 'plant' && p && !p.ai) a = B_('done', 'main go', '✅', 'SELESAI TANAM', 'SPASI');
    else if (phase === 'battle') a = paused ? B_('pause', 'main', '▶️', 'LANJUT', 'P') : B_('pause', 'pause', '⏸️', 'JEDA', 'P');
    else if (phase === 'over') a = B_('again', 'main', '🔁', 'MAIN LAGI', '');
    setHTML($('shActs'), a);
    $('shActs').querySelectorAll('[data-act]').forEach((b) => (b.onclick = (e) => { e.currentTarget.blur(); mainAction(b.dataset.act); }));
    setHTML($('hint'), hintText());
  }
  function renderAll() { renderOwners(); renderShop(); renderInfo(); requestDraw(); }

  /* ------------------------------ Pilih & tanam ------------------------------ */
  function setOwner(i) {
    if (!P[i] || P[i].ai) return false;
    if (owner !== i) { owner = i; if (cursor && ownerOf(cursor.lane) !== i) cursor = null; }
    renderAll(); return true;
  }
  function cycleOwner() { const hs = P.filter((p) => !p.ai); if (!hs.length) return; const k = hs.findIndex((p) => p.id === owner); setOwner(hs[(k + 1) % hs.length].id); SND.click(); }
  function pick(t) {
    if (!interactive()) return;
    const o = P[owner]; if (!o || o.ai) return;
    if (sel === t) { sel = null; renderShop(); requestDraw(); return; }
    if (DEF[t] && !unlocked(t)) { SND.nope(); QC.toast(`🔒 ${DEF[t].name} terbuka di gelombang ${DEF[t].unlock}.`); return; }
    if (t === 'kerbau' && !o.kerbau) { SND.nope(); QC.toast('🐃 Kerbau Sakti tim ini sudah dipakai.'); return; }
    sel = t; SND.click();
    if (!cursor || ownerOf(cursor.lane) !== owner) cursor = null;
    renderShop(); requestDraw();
  }
  function placeAllowed() { return ['turn', 'plant', 'battle', 'prep'].includes(phase); }
  function place(pid, lane, col, type, opt = {}) {
    const p = P[pid]; const D = DEF[type];
    if (!p || !D) return { ok: false, why: 'data' };
    if (!placeAllowed() && !opt.force) return { ok: false, why: 'fase' };
    if (lane < 0 || lane >= L || col < 0 || col >= COLS) return { ok: false, why: 'petak' };
    if (ownerOf(lane) !== pid) return { ok: false, why: 'bukan-lajur' };
    if (grid[lane][col]) return { ok: false, why: 'terisi' };
    if (!unlocked(type)) return { ok: false, why: 'terkunci' };
    if (p.pts < D.cost) return { ok: false, why: 'poin' };
    if (cdLeft(p, type) > 0 && !opt.force) return { ok: false, why: 'jeda' };
    p.pts -= D.cost; p.spent += D.cost; p.placed++; p.types[type] = (p.types[type] || 0) + 1;
    grid[lane][col] = mkDef(type, pid, lane, col); if (phase === 'battle') p.cdUntil[type] = now() + D.cd * 1000 * cdScale();
    ev('place', { pid, lane, col, type });
    const x = cx(col + 0.5); const y = cy(lane); burst(x, y + G.s * 0.3, ['#a16207', '#d6b37a', '#86efac'], 8, 0.6, 3); ring(x, y, '#fde047', G.s * 0.8, 0.35);
    SND.plant(); renderOwners(); renderShop(); requestDraw(); wake();
    return { ok: true };
  }
  function removeDef(pid, lane, col) {
    const d = grid[lane] && grid[lane][col]; const p = P[pid];
    if (!d || !p || d.owner !== pid || !placeAllowed()) return { ok: false };
    const back = Math.floor(DEF[d.type].cost / 2 * (d.hp / d.max)); grid[lane][col] = null; p.pts += back; ev('cabut', { pid, lane, col, type: d.type });
    burst(cx(col + 0.5), cy(lane), ['#a16207', '#d6b37a'], 6, 0.5, 3); SND.sell(); FX.floatText(...screenPt(lane, col), `+${back}`, '#fde68a', 24);
    renderOwners(); renderShop(); requestDraw(); wake();
    return { ok: true, back };
  }
  function useKerbau(pid, lane) {
    const p = P[pid]; if (!p || !p.kerbau || ownerOf(lane) !== pid || !placeAllowed()) return { ok: false };
    p.kerbau = 0; p.kerbauUsed = wave; kerbaus.push({ lane, x: -0.6, owner: pid, hit: new Set() }); SND.moo(); ev('kerbau', { pid, lane });
    FX.announce('🐃 KERBAU SAKTI!', { color: p.color, sub: `${esc(p.name)} menyapu lajurnya!`, dur: Math.max(300, 1100 * TS) });
    if (sel === 'kerbau') sel = null;
    renderOwners(); renderShop(); wake(); return { ok: true };
  }
  function screenPt(lane, col) { const r = cv.getBoundingClientRect(); return [r.left + cx(col + 0.5), r.top + cy(lane)]; }
  function cellAt(ev2) {
    const r = cv.getBoundingClientRect(); const x = ev2.clientX - r.left; const y = ev2.clientY - r.top;
    const lane = Math.floor(y / G.ch); const col = Math.floor((x - G.ox) / G.cw);
    if (lane < 0 || lane >= L) return null; return { lane, col, inGrid: col >= 0 && col < COLS, x, y };
  }
  function actAt(lane, col) {
    if (!interactive()) return;
    const o = ownerOf(lane); const op = P[o]; if (!op) return;
    if (o !== owner) {
      if (op.ai) { SND.nope(); QC.toast(`🤖 Lajur ini dijaga ${esc(op.name)}.`); return; }
      setOwner(o); SND.click(); QC.toast(`🛒 Toko pindah ke <b>${esc(op.name)}</b> — ketuk lagi untuk menanam.`); return;
    }
    if (op.ai) return;
    cursor = { lane, col };
    if (sel === 'kerbau') { useKerbau(o, lane); return; }
    if (col < 0 || col >= COLS) return;
    if (sel === 'cabut') { if (grid[lane][col]) { removeDef(o, lane, col); } else SND.nope(); return; }
    if (sel && DEF[sel]) {
      const r = place(o, lane, col, sel);
      if (!r.ok) {
        SND.nope();
        const msg = { poin: `💰 Poin ${esc(op.name)} belum cukup (${op.pts}/${DEF[sel].cost}).`, terisi: '🌱 Petak ini sudah ditanami.', jeda: `⏳ ${DEF[sel].name} masih disiapkan (${Math.ceil(cdLeft(op, sel) / 1000)} detik).`, fase: '⏳ Tunggu sampai soal selesai.' }[r.why];
        if (msg) QC.toast(msg);
      } else if (op.pts < DEF[sel].cost) { sel = null; renderShop(); }
      return;
    }
    const d = grid[lane][col];
    if (d) QC.toast(`${DEF[d.type].name}: ❤ ${Math.ceil(d.hp)}/${d.max} • ${DEF[d.type].desc}`);
    requestDraw();
  }
  cv.addEventListener('pointerdown', (e) => { SND.ac(); const c = cellAt(e); if (!c) return; e.preventDefault(); actAt(c.lane, c.inGrid ? c.col : -1); });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return; const c = cellAt(e); const nh = c && c.inGrid ? { lane: c.lane, col: c.col } : null;
    if ((nh && hover && nh.lane === hover.lane && nh.col === hover.col) || (!nh && !hover)) return; hover = nh; if (sel || nh) requestDraw();
  });
  cv.addEventListener('pointerleave', () => { if (hover) { hover = null; requestDraw(); } });

  /* ------------------------------ Bot (Robo Tani) & tanam otomatis ------------------------------ */
  function laneState(l) {
    let power = 0; let wall = 0; let lumb = 0;
    for (let c = 0; c < COLS; c++) { const d = grid[l][c]; if (!d) continue; const D = DEF[d.type]; if (D.rate) power += (D.dmg * (D.shots || 1)) / D.rate; if (d.type === 'kelapa') wall++; if (d.type === 'lumbung') lumb++; }
    let threat = 0; for (const e of enemies) if (e.lane === l) threat += e.hp * (e.boss ? 1.5 : 1) / Math.max(0.6, e.x);
    return { power, wall, lumb, threat };
  }
  function autoPlantOnce(pid) {
    const p = P[pid]; if (!p) return null;
    const ls = lanesOf(pid).map((l) => ({ l, ...laneState(l) }));
    const minCost = Math.min(...ORDER.filter(unlocked).map((t) => DEF[t].cost)); if (p.pts < minCost) return null;
    const lumbTot = ls.reduce((s, x) => s + x.lumb, 0);
    const free = (l, cols) => cols.find((c) => !grid[l][c]);
    const target = 14 + wave * 7;
    ls.sort((a, b) => (a.power - a.threat * 0.02) - (b.power - b.threat * 0.02));
    const weak = ls[0];
    if (lumbTot < 1 && wave <= Math.ceil(W / 2) && p.pts >= 50 && weak.power >= 12 && unlocked('lumbung')) { const c = free(weak.l, [0, 1]); if (c != null) return { lane: weak.l, col: c, type: 'lumbung' }; }
    if (weak.power < target) {
      const opts = ['meriam', 'tebu', 'jagung', 'kendi', 'cabai'].filter((t) => canAfford(p, t) && !cdLeft(p, t));
      let t = opts.find((x) => x === 'meriam' && Math.random() < 0.4) || opts.find((x) => x === 'tebu' && Math.random() < 0.5) || opts.find((x) => x === 'jagung' && Math.random() < 0.6) || opts.find((x) => x === 'kendi' && Math.random() < 0.3) || opts[opts.length - 1];
      if (t) { const c = free(weak.l, [1, 2, 0, 3, 4, 5]); if (c != null) return { lane: weak.l, col: c, type: t }; }
    }
    const nw = ls.find((x) => x.wall < 1 && x.power >= 12);
    if (nw && canAfford(p, 'kelapa') && !cdLeft(p, 'kelapa')) { const c = free(nw.l, [6, 7, 5]); if (c != null) return { lane: nw.l, col: c, type: 'kelapa' }; }
    const hot = ls.slice().sort((a, b) => b.threat - a.threat)[0];
    if (hot.threat > 150 && canAfford(p, 'durian') && !cdLeft(p, 'durian')) { let mx = 9; for (const e of enemies) if (e.lane === hot.l && e.x < mx) mx = e.x; const c = clamp(Math.floor(mx) - 1, 2, 7); if (!grid[hot.l][c]) return { lane: hot.l, col: c, type: 'durian' }; }
    const t = ['cabai', 'jagung', 'kendi'].filter((x) => canAfford(p, x) && !cdLeft(p, x)).pop();
    if (t) for (const x of ls) { const c = free(x.l, [2, 3, 4, 5, 0, 1]); if (c != null) return { lane: x.l, col: c, type: t }; }
    return null;
  }
  function autoPlant(pid, max = 4, strict = false) {
    let n = 0; for (let i = 0; i < max; i++) { const m = autoPlantOnce(pid); if (!m) break; const r = place(pid, m.lane, m.col, m.type, { force: !strict }); if (!r.ok) break; n++; }
    // darurat: kerbau bila bos/ancaman besar dekat joglo
    const p = P[pid];
    if (p && p.kerbau) for (const l of lanesOf(pid)) { let hp = 0; let near = false; for (const e of enemies) if (e.lane === l) { hp += e.hp; if (e.x < 3) near = true; } if (near && hp > 300) { useKerbau(pid, l); break; } }
    return n;
  }

  /* ------------------------------ Soal & Rebutan ------------------------------ */
  const rebutCands = (p) => (S.rebut === 'on' ? P.filter((o) => o !== p && !o.ai) : []);
  function decorateAsk(p, m, rebutable) {
    const o = [...document.querySelectorAll('.qc-overlay.qc-ask')].pop(); if (!o) return;
    o.classList.add('lk-ask'); if (rebutable) o.classList.add('lk-rebutable');
    const head = o.querySelector('.qc-ask-head'); if (!head) return;
    const el = document.createElement('div'); el.className = 'lk-answerer'; el.style.setProperty('--pc', p.color);
    el.innerHTML = (m ? `<span class="who">🙋 Penjawab: <b>${esc(m.name)}</b></span><span class="dis">${S.diskusi === 'off' ? '🤫 Jawab sendiri — tanpa diskusi' : '💬 Boleh diskusi dulu dengan tim'}</span>`
      : `<span class="who">👥 Dijawab bersama <b>${esc(p.name)}</b></span><span class="dis">${S.diskusi === 'off' ? '🤫 Tanpa diskusi' : '💬 Boleh berdiskusi'}</span>`) + `<span class="pt">💰 ${p.pts} poin</span>`;
    head.insertAdjacentElement('afterend', el);
  }
  async function quiz(p) {
    const q = QC.nextQuestion(); curQ = q;
    const m = takeAnswerer(p); curAnswerer = m ? m.name : null; renderOwners();
    const pr = QC.ask(q, { player: { name: p.name, avatar: p.avatar, color: p.color }, time: S.time, badge: `🌱 Benar +${PT().ok} poin • Salah −${PT().no}` });
    decorateAsk(p, m, rebutCands(p).length > 0);
    const r = await pr; curQ = null; curAnswerer = null; const ok = !!r.correct;
    p.asked++; if (ok) p.correct++; if (m) { m.asked++; if (ok) m.correct++; }
    askLog.push({ pid: p.id, member: m ? m.name : null, ok, wave }); if (askLog.length > 500) askLog.shift();
    return { ok, q };
  }
  function addPts(p, d, why) {
    const before = p.pts; p.pts = Math.max(0, p.pts + d); const real = p.pts - before;
    if (real > 0) p.earned += real; else p.lost += -real;
    ev('pts', { pid: p.id, d, real, why });
    const el = $('op' + p.id);
    if (el && (real !== 0 || d < 0)) { FX.floatTextAt(el, `${real >= 0 ? '+' : '−'}${Math.abs(real)}`, real >= 0 ? '#fde047' : '#fca5a5', 30); el.textContent = String(p.pts); const c = $('ow' + p.id); if (c && !RM()) c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 380 }); }
    if (real > 0) SND.coin();
    renderShop(); return real;
  }
  async function rebutan(active, q, gid) {
    const cands = rebutCands(active); if (!q || phase === 'over') return null;
    if (!cands.length) { QC.toast(`💡 Jawaban benar: <b>${q.correct}. ${esc(q['option' + q.correct])}</b>`); return null; }
    phase = 'rebut'; renderAll(); SND.rebut();
    const waitMs = Math.max(150, 8000 * TS);
    const pick2 = await QC.modal({
      cls: 'lk-rebut', icon: '⚡', title: 'REBUTAN! Siapa paling cepat?',
      html: `<p class="qc-muted">${esc(active.name)} belum tepat. Tim lain: <b>cepat klik tombol tim kalian!</b> Tim yang paling dulu mengklik berhak menjawab.<br><small>Keyboard: tekan nomor tim.</small></p>
        <div class="rb-q">❓ ${esc(q.question)}</div>
        <div class="rb-grid">${cands.map((o) => `<button class="rb-btn" data-t="${o.id}" style="--pc:${o.color}"><kbd>${o.id + 1}</kbd><span class="av">${o.avatar}</span><b>${esc(o.name)}</b><small>benar = 💰 +${STEAL_PTS} poin</small></button>`).join('')}</div>
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
    if (pick2 == null || !P[pick2]) { rebutLog.push({ by: null, ok: null, wave }); QC.toast(`💡 Jawaban benar: <b>${q.correct}. ${esc(q['option' + q.correct])}</b>`); return null; }
    const o = P[pick2]; const m = takeAnswerer(o); curAnswerer = m ? m.name : null; curQ = q; renderOwners();
    const pr = QC.ask(q, { player: { name: o.name, avatar: o.avatar, color: o.color }, time: S.time, badge: `⚡ Soal Rebutan • benar = +${STEAL_PTS} poin` });
    decorateAsk(o, m, false);
    const r = await pr; curQ = null; curAnswerer = null; const ok = !!r.correct;
    o.asked++; if (ok) o.correct++; if (m) { m.asked++; if (ok) m.correct++; }
    askLog.push({ pid: o.id, member: m ? m.name : null, ok, rebut: true, wave }); rebutLog.push({ by: o.id, ok, wave });
    if (gid !== gameSeq) return null;
    if (!ok) return null;
    o.steals++; addPts(o, STEAL_PTS, 'rebut'); SND.good();
    FX.announce('⚡ REBUTAN BERHASIL!', { color: o.color, sub: `${esc(o.name)} mendapat +${STEAL_PTS} poin — boleh langsung menanam!`, dur: Math.max(300, 1200 * TS) });
    await sleep(500);
    return o.id;
  }

  /* ------------------------------ Alur permainan ------------------------------ */
  async function beginPrep() {
    if (phase === 'over') return; const gid = gameSeq;
    phase = 'prep'; paused = false; waveList = buildWave(wave); warned = {};
    order = P.map((p) => p.id); const r0 = (wave - 1) % P.length; order = order.slice(r0).concat(order.slice(0, r0)); oi = 0;
    renderAll();
    const news = ORDER.filter((t) => DEF[t].unlock === wave && wave > 1);
    FX.announce(`🌾 GELOMBANG ${wave}${isFinal() ? ' — TERAKHIR!' : ''}`, { color: isFinal() ? '#7e22ce' : '#15803d', sub: isFinal() ? 'Raja Kabut Hama akan datang! Siapkan kebun sebaik mungkin.' : 'Jawab soal, kumpulkan poin, tanam penjaga!', dur: Math.max(300, 1500 * TS) });
    await sleep(1300); if (gid !== gameSeq) return;
    if (news.length) {
      SND.unlock();
      QC.toast(`🎁 Penjaga baru: ${news.map((t) => `${img(t, 'mini')} <b>${DEF[t].name}</b>`).join(' • ')}`, 'good');
      await sleep(600); if (gid !== gameSeq) return;
    }
    startTurn();
  }
  async function startTurn() {
    if (phase === 'over') return; const gid = gameSeq;
    const p = P[order[oi]]; turnPid = p.id; if (!p.ai) { owner = p.id; } sel = null; cursor = null;
    phase = 'turn'; renderAll(); SND.turn();
    const m = peekAnswerer(p);
    FX.announce(`${p.ai ? '🤖' : p.avatar} ${esc(p.name)}`, { color: p.color, sub: p.ai ? 'Robo Tani menjawab & menanam' : m ? `🙋 Penjawab: ${esc(m.name)}` : 'Giliran menjawab!', dur: Math.max(300, 1100 * TS) });
    if (p.ai) { await sleep(900); if (gid === gameSeq && phase === 'turn') aiTurn(gid); return; }
    if (S.alur === 'on') { await sleep(1150); if (gid === gameSeq && phase === 'turn' && !QC.isBusy()) askQuestion(); }
  }
  async function askQuestion() {
    if (phase !== 'turn' || QC.isBusy()) return false;
    const p = P[turnPid]; if (!p || p.ai) return false;
    if (!QC.questions.length) { QC.toast('⚠️ Bank soal kosong. Tambahkan soal di Mode Guru.', 'bad'); return false; }
    const gid = gameSeq; phase = 'quiz'; sel = null; renderAll();
    const r = await quiz(p);
    if (gid !== gameSeq || phase === 'over') return true;
    if (r.ok) { addPts(p, PT().ok, 'benar'); if (!revive(p)) FX.announce('✅ BENAR!', { color: '#15803d', sub: `${esc(p.name)} +${PT().ok} poin — ayo tanam penjaga!`, dur: Math.max(300, 1000 * TS) }); }
    else {
      const lost = addPts(p, -PT().no, 'salah'); if (lost === 0) QC.toast(`💡 Poin ${esc(p.name)} sudah 0 — tidak berkurang lagi.`);
      await sleep(250); if (gid !== gameSeq) return true;
      await rebutan(p, r.q, gid);
      if (gid !== gameSeq || phase === 'over') return true;
    }
    enterPlant(p);
    return true;
  }
  function revive(p) {
    if (p.hearts > 0 || phase === 'over') return false;
    p.hearts = 1; p.revived++; ev('revive', { pid: p.id }); SND.unlock(); renderOwners(); requestDraw();
    FX.announce('🌱 KEBUN BANGKIT!', { color: p.color, sub: `${esc(p.name)} menjawab benar — kebun hidup lagi (+1 ❤️)!`, dur: Math.max(300, 1300 * TS) });
    return true;
  }
  function anyBuy(p) { return ORDER.some((t) => canAfford(p, t)); }
  async function enterPlant(p) {
    const gid = gameSeq; phase = 'plant'; turnPid = p.id; owner = p.id; renderAll(); wake();
    if (!P.some((o) => !o.ai && anyBuy(o))) {
      QC.toast('💰 Poin belum cukup untuk menanam — lanjut.');
      await sleep(1500); if (gid === gameSeq && phase === 'plant' && turnPid === p.id) finishPlant();
    }
  }
  function finishPlant() {
    if (phase !== 'plant' || QC.isBusy()) return false;
    sel = null; cursor = null; oi++;
    if (oi < order.length) startTurn(); else startBattle();
    return true;
  }
  async function startBattle() {
    if (phase === 'over') return; const gid = gameSeq;
    phase = 'battle'; paused = false; battleT = 0; pendingEnd = null; turnPid = -1;
    spawnQ = waveList.list.slice(); capT = isFinal() ? Infinity : waveList.span + 42;
    const hs = P.filter((p) => !p.ai); if (hs.length && (!P[owner] || P[owner].ai)) owner = hs[0].id;
    renderAll(); SND.kentongan();
    FX.announce(`⚔️ GELOMBANG ${wave} MENYERBU!`, { color: isFinal() ? '#7e22ce' : '#b91c1c', sub: isFinal() ? '👑 Raja Kabut Hama memecah diri menyerang SETIAP kebun!' : 'Pasukan Hama Kabut datang dari kanan — jaga lajurmu!', dur: Math.max(300, 1500 * TS) });
    ev('battle', { wave });
    await sleep(300); if (gid !== gameSeq) return;
    wake();
  }
  async function handleEnd(kind) {
    if (phase === 'over') return;
    if (kind === 'lose') { endGame('lose'); return; }
    if (phase !== 'battle') return;
    const gid = gameSeq; phase = 'waveEnd'; shots = []; paused = false;
    waveLog.push({ wave, kind, t: +battleT.toFixed(1), left: enemies.length });
    ev('waveEnd', { kind, t: battleT });
    renderAll();
    if (kind === 'clear' && isFinal()) { endGame('win'); return; }
    // panen
    SND.clear();
    P.forEach((p) => {
      let lumb = 0; for (const l of lanesOf(p.id)) for (let c = 0; c < COLS; c++) if (grid[l][c] && grid[l][c].type === 'lumbung') lumb++;
      const inc = PANEN + lumb * DEF.lumbung.income; addPts(p, inc, 'panen'); p.harvest += inc;
      if (lumb) for (const l of lanesOf(p.id)) for (let c = 0; c < COLS; c++) if (grid[l][c] && grid[l][c].type === 'lumbung') { const [x, y] = screenPt(l, c); FX.floatText(x, y - G.s * 0.4, `+${DEF.lumbung.income}`, '#fde047', 22); }
    });
    FX.announce(kind === 'clear' ? `🌾 GELOMBANG ${wave} TERTAHAN!` : `⏸️ HAMA BERHENTI SEJENAK`, { color: '#a16207', sub: kind === 'clear' ? `Panen: +${PANEN} poin tiap tim${P.some((p) => p.types.lumbung) ? ' (+20 per Lumbung Padi)' : ''}` : `Sisa hama menunggu di sawah. Panen +${PANEN} poin — saatnya menjawab!`, dur: Math.max(300, 1800 * TS) });
    await sleep(1900); if (gid !== gameSeq || phase === 'over') return;
    wave++; beginPrep();
  }
  function togglePause() { if (phase !== 'battle') return; paused = !paused; $('fmsg').hidden = !paused; if (paused) $('fmsg').innerHTML = '<div>⏸️ JEDA<small>Tekan P / LANJUT</small></div>'; renderAll(); if (!paused) wake(); }

  /* ------------------------------ Robo Tani ------------------------------ */
  async function aiTurn(gid) {
    const p = P[turnPid]; const pop = $('cpop');
    phase = 'ai'; renderAll();
    const q = QC.nextQuestion(); const reb = rebutCands(p).length > 0;
    pop.innerHTML = `<div class="think" style="--pc:${p.color}"><div class="who">🤖 ${esc(p.name)} sedang berpikir</div><div class="q">${q ? esc(q.question) : ''}</div><div class="dots"><span>•</span><span>•</span><span>•</span></div></div>`;
    pop.hidden = false; SND.think();
    await sleep(1400); if (gid !== gameSeq) { pop.hidden = true; return; }
    const ok = Math.random() < AI_ACC; const d = pop.querySelector('.dots');
    if (d) d.outerHTML = `<div class="res ${ok ? 'ok' : 'no'}">${ok ? '✔ BENAR!' : '✘ SALAH'}</div>${q ? (ok || !reb ? `<div class="q">Jawaban: <b>${q.correct}. ${esc(q['option' + q.correct])}</b></div>` : '<div class="q">⚡ Jawaban dirahasiakan — <b>REBUTAN</b>!</div>') : ''}`;
    ok ? SND.good() : SND.fail();
    await sleep(1000); pop.hidden = true; if (gid !== gameSeq) return;
    p.asked++; if (ok) p.correct++; askLog.push({ pid: p.id, member: null, ok, ai: true, wave });
    if (ok) { addPts(p, PT().ok, 'benar'); revive(p); } else { addPts(p, -PT().no, 'salah'); await rebutan(p, q, gid); if (gid !== gameSeq || phase === 'over') return; }
    phase = 'plant'; turnPid = p.id; renderAll();
    for (let i = 0; i < 4; i++) { const m = autoPlantOnce(p.id); if (!m) break; place(p.id, m.lane, m.col, m.type, { force: true }); await sleep(380); if (gid !== gameSeq) return; }
    await sleep(400); if (gid !== gameSeq) return;
    oi++; if (oi < order.length) startTurn(); else startBattle();
  }

  /* ------------------------------ Akhir permainan ------------------------------ */
  const scoreOf = (p) => p.correct * 20 + p.steals * 15 + p.kills * 2 + p.hearts * 25;
  const lanesHeld = (p) => p.laneBreach.filter((n) => n === 0).length;
  function rankingOrder() { return [...P].sort((a, b) => scoreOf(b) - scoreOf(a) || b.correct - a.correct || b.kills - a.kills); }
  function endGame(reason) {
    if (phase === 'over') return; phase = 'over'; lastEnd = reason; paused = false; $('fmsg').hidden = true; $('cpop').hidden = true; endAt = Date.now();
    spawnQ = []; sel = null; ev('end', { reason });
    renderAll(); requestDraw();
    if (reason === 'win') { SND.clear(); FX.announce('🏆 KEBUN NUSANTARA SELAMAT!', { color: '#15803d', sub: 'Semua gelombang Hama Kabut berhasil ditahan bersama!', dur: Math.max(400, 2000 * TS) }); FX.fireworks(LITE ? 4 : 9, 240); }
    else { SND.lose(); FX.announce('🌫️ KEBUN DIKUASAI KABUT…', { color: '#4c1d95', sub: 'Semua nyawa kebun habis. Coba lagi — kalian pasti bisa!', dur: Math.max(400, 2000 * TS) }); }
    const gid = gameSeq; setTimeout(() => { if (gid === gameSeq) showResults(reason); }, 1700 * TS);
  }
  function memberDetail(rows) {
    return '<h4>🙋 Jawaban benar tiap anggota</h4>' + rows.map((p) => `<div class="wd" style="--pc:${p.color}"><b>${esc(p.name)}</b><span>${p.members && p.members.length
      ? p.members.map((m) => `<i>${esc(m.name)} <em>✔${m.correct}</em><small>/${m.asked}</small></i>`).join('') : `<i>✔ ${p.correct} dari ${p.asked} soal</i>`}</span></div>`).join('');
  }
  function showResults(reason) {
    if (document.querySelector('.qc-winner')) return;
    const order2 = rankingOrder(); const w = order2[0];
    const alive = P.filter((p) => p.hearts > 0).length;
    const note = (reason === 'win' ? `🌾 Kemenangan bersama! ${W} gelombang tertahan — ${alive === P.length ? 'SEMUA kebun selamat!' : `kebun bertahan: ${alive} dari ${P.length}.`}` : `🌫️ Semua kebun jatuh di gelombang ${wave} dari ${W}.`) + ' Peringkat pribadi: skor = benar×20 + rebutan×15 + hama×2 + ❤️×25.';
    const ranking = order2.map((p) => ({
      player: { name: p.name, avatar: p.ai ? '🤖' : p.avatar, color: p.color },
      value: `⭐ ${scoreOf(p)}<small>✔ ${p.correct}/${p.asked} • ⚡${p.steals} • 🪲 ${p.kills} hama • ❤️ ${p.hearts} • 🛡️ lajur aman ${lanesHeld(p)}/2</small>`
    }));
    QC.showWinner({ title: reason === 'win' ? `KEBUN SELAMAT! ${esc(w.name)} TERBAIK` : `${esc(w.name)} PALING GIGIH`, ranking, unit: '', note }).then((v) => (v === 'setup' ? openSetup() : newGame()));
    const ov = [...document.querySelectorAll('.qc-winner')].pop(); const body = ov && ov.querySelector('.qc-modal-body');
    if (ov) { ov.classList.add('lk-win'); if (reason !== 'win') ov.classList.add('lk-lose'); const ic = ov.querySelector('.qc-modal-icon'); if (ic) ic.textContent = reason === 'win' ? '🏆' : '🌫️'; }
    if (body) { const d = document.createElement('div'); d.className = 'win-detail'; d.innerHTML = memberDetail(order2); body.appendChild(d); }
    if (ov) { const b = [...ov.querySelectorAll('.qc-actions button')].find((x) => /Ubah/.test(x.textContent)); if (b) b.textContent = '⚙️ Ubah Tim'; }
  }

  /* ------------------------------ Pengaturan & mulai ------------------------------ */
  const KEY_TIM = 'lokamain_laskar-kebun_tim';
  const RULES_SHORT = `<ul>
    <li>❓ Tim bergiliran menjawab soal. <b>Benar = +poin</b>, salah = −poin.</li>
    <li>🌱 Poin untuk menanam penjaga di <b>2 lajur milik tim sendiri</b>.</li>
    <li>⚔️ Hama Kabut menyerbu dari kanan. Sampai di joglo = nyawa kebun berkurang.</li>
    <li>🏆 Tahan semua gelombang bersama — termasuk Raja Kabut Hama!</li></ul>`;
  function defRows() { return ORDER.map((t) => `<li class="dr">${img(t)}<span><b>${DEF[t].name}</b> <em>${DEF[t].role} • 💰${DEF[t].cost}${DEF[t].unlock > 1 ? ` • 🔒 gel. ${DEF[t].unlock}` : ''} • <kbd>${DEF[t].key}</kbd></em><br>${DEF[t].desc}</span></li>`).join(''); }
  function enRows() { return ['kumbang', 'belalang', 'gumpal', 'siput', 'raja'].map((t) => `<li class="dr">${img(t)}<span><b>${EN[t].name}</b><br>${EN[t].desc}</span></li>`).join(''); }
  const RULES = () => `
    <h4>🎯 Tujuan</h4><ul><li>Bersama-sama menahan <b>${W} gelombang</b> Pasukan Hama Kabut. Gelombang terakhir: <b>Raja Kabut Hama</b> menyerang setiap kebun.</li>
      <li>Setiap tim menjaga <b>2 lajur sawah</b> (ditandai warna & nama tim di kiri). Penjaga hanya boleh ditanam di lajur sendiri.</li>
      <li>Hama sampai di joglo = <b>−1 ❤️</b> kebun pemilik lajur (Raja = −3). Nyawa habis = kebun <b>JATUH</b> — jawab soal dengan benar untuk <b>bangkit (+1 ❤️)</b>. Semua kebun jatuh = kalah bersama.</li></ul>
    <h4>🔁 Satu gelombang</h4><ul>
      <li>❓ <b>Jawab & Tanam</b> (pertempuran berhenti): tiap tim menjawab 1 soal — anggota bergiliran. Benar <b>+${PT().ok}</b> poin, salah <b>−${PT().no}</b> (poin tidak pernah di bawah 0). Lalu tanam penjaga, klik <b>SELESAI TANAM</b>.</li>
      ${S.rebut === 'on' ? `<li>⚡ Jawaban salah → <b>Soal Rebutan</b>: tim lain berebut klik tombol timnya (keyboard: nomor tim). Benar = <b>+${STEAL_PTS} poin</b>.</li>` : ''}
      <li>⚔️ <b>Serbuan</b> (waktu nyata): hama datang dari kanan. Kalian tetap boleh menanam. Gelombang selesai = panen <b>+${PANEN} poin</b> tiap tim (+20 per Lumbung Padi).</li>
      <li>🐃 <b>Kerbau Sakti</b>: sekali per tim, menyapu habis satu lajur sendiri — simpan untuk keadaan darurat!</li></ul>
    <h4>🌱 Penjaga Kebun</h4><ul class="dlist">${defRows()}</ul>
    <h4>🪲 Pasukan Hama Kabut</h4><ul class="dlist">${enRows()}</ul>
    <h4>🏅 Peringkat pribadi</h4><ul><li>Skor = jawaban benar×20 + rebutan×15 + hama dibasmi×2 + ❤️ tersisa×25.</li></ul>
    <h4>⌨️ Keyboard</h4><ul><li>Spasi = mulai / jawab soal / selesai tanam • 1–4 = pilih toko tim • Q W E R T Y U I = kartu penjaga • X = cabut • K = kerbau • panah + Enter = tanam di petak • Esc = batal • P = jeda.</li></ul>`;
  function customizeSetup(o, st) {
    o.classList.add('lk-setup');
    const panel = o.querySelector('.qc-panel'); const h3 = panel && panel.querySelector('h3');
    if (h3) h3.textContent = '👥 Jumlah Tim (tiap tim jaga 2 lajur)';
    o.querySelectorAll('.qc-seg button').forEach((b) => (b.textContent = +b.dataset.n === 1 ? '1 Tim + 🤖' : `${b.dataset.n} Tim`));
    const tip = o.querySelector('.qc-players + .qc-muted');
    if (tip) tip.textContent = 'Klik ikon untuk ganti lambang • Tulis nama anggota supaya semua murid bergiliran menjawab • 1 tim = dibantu Robo Tani';
    const setBox = o.querySelector('.qc-settings'); const h3b = o.querySelectorAll('.qc-panel h3')[1];
    if (h3b) h3b.textContent = '🌾 Siap Berjaga';
    if (setBox) {
      const adv = document.createElement('details'); adv.className = 'lk-adv';
      adv.innerHTML = '<summary>⚙️ Pengaturan lanjutan <small>(opsional — bawaan sudah pas, langsung klik Mulai saja)</small></summary>';
      setBox.insertAdjacentElement('beforebegin', adv); adv.appendChild(setBox);
      const ok = document.createElement('div'); ok.className = 'lk-ready';
      ok.innerHTML = `<div class="pr-pic">${img('cabai')}${img('kelapa')}${img('kumbang')}</div><p>✅ Bawaan sudah pas: gelombang otomatis (±15–20 menit), 3 ❤️ tiap kebun, hama tingkat sedang. Isi nama tim & anggota, lalu klik <b>▶ MULAI MAIN</b>.</p>`;
      adv.insertAdjacentElement('beforebegin', ok);
    }
    const deco = () => {
      o.querySelectorAll('.qc-prow').forEach((row) => {
        const ni = row.querySelector('[data-name]'); if (!ni) return; const i = +ni.dataset.name;
        const v = ni.value.trim(); if (!v || /^Pemain \d$/.test(v)) { ni.value = TEAM_NAMES[i]; ni.dispatchEvent(new Event('input')); }
        if (!row.querySelector('.lk-mem')) {
          const m = document.createElement('textarea'); m.className = 'qc-input lk-mem'; m.rows = 1; m.maxLength = 300; m.placeholder = '👤 Anggota: Andi, Sari, Budi… (koma/baris baru, atau jumlah mis. 5)';
          m.value = st.members[i] || ''; const fit = () => { m.style.height = 'auto'; m.style.height = Math.min(110, m.scrollHeight + 2) + 'px'; };
          m.oninput = () => { st.members[i] = m.value; fit(); }; requestAnimationFrame(fit); m.onkeydown = (e) => e.stopPropagation(); row.appendChild(m);
        }
      });
    };
    const pl = o.querySelector('.qc-players'); if (pl && window.MutationObserver) new MutationObserver(deco).observe(pl, { childList: true });
    deco();
  }
  async function openSetup() {
    gameSeq++; phase = 'idle'; rebDecide = null; paused = false; $('brief').hidden = true; $('cpop').hidden = true; $('fmsg').hidden = true;
    const saved = store(KEY_TIM) || {};
    const st = { members: Array.isArray(saved.members) ? saved.members.slice(0, 4) : [] };
    const pr = QC.setup({
      logo: '🌶️', subtitle: 'Jawab soal, kumpulkan poin, tanam penjaga kebun di lajur tim sendiri. Tahan serbuan Pasukan Hama Kabut bersama-sama!',
      min: 1, max: 4, defaultCount: 2, defaultNames: TEAM_NAMES, soloLabel: '1 Tim + 🤖',
      settings: [
        { key: 'gel', label: '🌊 Jumlah gelombang', value: 'auto', options: [['auto', 'Otomatis (±15–20 menit)'], ['4', '4 gelombang (singkat)'], ['6', '6 gelombang'], ['8', '8 gelombang'], ['10', '10 gelombang'], ['12', '12 gelombang (panjang)']] },
        { key: 'waktu', label: '⏱️ Waktu menjawab', value: 30, options: [[20, '20 detik'], [30, '30 detik'], [45, '45 detik'], [60, '60 detik']] },
        { key: 'nyawa', label: '❤️ Nyawa kebun per tim', value: 3, options: [[2, '2 nyawa'], [3, '3 nyawa'], [5, '5 nyawa']] },
        { key: 'hama', label: '🪲 Kekuatan hama', value: 'sedang', options: [['mudah', 'Mudah'], ['sedang', 'Sedang'], ['sulit', 'Sulit']] },
        { key: 'laju', label: '🐢 Kecepatan serbuan', value: 'normal', options: [['normal', 'Normal'], ['santai', 'Santai (lebih lambat)']] },
        { key: 'poin', label: '💰 Poin jawaban', value: 'std', options: [['std', 'Benar +50 • Salah −25'], ['lembut', 'Benar +50 • Salah −10'], ['tegas', 'Benar +50 • Salah −35']] },
        { key: 'rebut', label: '⚡ Soal Rebutan', value: 'on', options: [['on', 'Nyala'], ['off', 'Mati']] },
        { key: 'alur', label: '⚡ Soal muncul otomatis', value: 'on', options: [['on', 'Nyala'], ['off', 'Mati (guru klik Jawab Soal)']] },
        { key: 'diskusi', label: '💬 Diskusi tim', value: 'on', options: [['on', 'Boleh'], ['off', 'Tidak boleh']] }
      ],
      rulesHtml: RULES_SHORT
    });
    const o = [...document.querySelectorAll('.qc-setup')].pop();
    if (o) { const sm = o.querySelector('details.qc-rules'); if (sm) { sm.removeAttribute('open'); const s2 = sm.querySelector('summary'); if (s2) s2.textContent = '📜 Cara Main Singkat'; } customizeSetup(o, st); }
    renderAll();
    const r = await pr; const set = r.settings;
    store(KEY_TIM, { members: st.members });
    S.gel = /^(auto|\d+)$/.test(String(set.gel)) ? String(set.gel) : 'auto';
    S.time = +set.waktu || 30; S.hearts = [2, 3, 5].includes(+set.nyawa) ? +set.nyawa : 3; S.diff = DIFF[set.hama] ? set.hama : 'sedang';
    S.speed = set.laju === 'santai' ? 'santai' : 'normal'; S.poin = POIN[set.poin] ? set.poin : 'std';
    S.rebut = set.rebut === 'off' ? 'off' : 'on'; S.alur = set.alur === 'off' ? 'off' : 'on'; S.diskusi = set.diskusi === 'off' ? 'off' : 'on';
    P = r.players.map((pl, i) => ({ id: i, name: pl.name, avatar: pl.avatar, color: pl.color || COLORS[i], ai: false, members: parseMembers(st.members[i]).map((n) => ({ name: n, asked: 0, correct: 0 })) }));
    if (P.length === 1) { P.push({ id: 1, name: BOT_NAME, avatar: '🤖', color: COLORS[1] === P[0].color ? COLORS[0] : COLORS[1], ai: true, members: [] }); QC.toast('🤖 Main 1 tim: Robo Tani ikut menjaga 2 lajur', 'good'); }
    newGame();
  }
  function resetTeam(p) {
    Object.assign(p, { pts: START_PTS, hearts: S.hearts, kerbau: 1, kerbauUsed: 0, asked: 0, correct: 0, steals: 0, kills: 0, bossKills: 0, breaches: 0, laneBreach: [0, 0], fell: 0, revived: 0, earned: 0, lost: 0, spent: 0, harvest: 0, placed: 0, lostDefs: 0, types: {}, cdUntil: {}, mi: 0 });
    (p.members || []).forEach((m) => { m.asked = 0; m.correct = 0; });
  }
  function newGame() {
    gameSeq++;
    W = S.gel === 'auto' ? AUTO_WAVES[clamp(nhuman(), 1, 4)] : clamp(+S.gel, 2, 20);
    L = P.length * 2; wave = 1;
    P.forEach((p, i) => { p.id = i; resetTeam(p); });
    grid = Array.from({ length: L }, () => Array(COLS).fill(null)); enemies = []; shots = []; parts = []; rings = []; kerbaus = []; spawnQ = []; laneFlash = Array(L).fill(0); laneMinX = Array(L).fill(null);
    turnPid = 0; owner = P.find((p) => !p.ai) ? P.find((p) => !p.ai).id : 0; sel = null; cursor = null; hover = null; curQ = null; curAnswerer = null; rebDecide = null; pendingEnd = null; paused = false;
    askLog = []; rebutLog = []; events = []; waveLog = []; lastEnd = ''; tStart = 0; endAt = 0; battleT = 0; simTime = 0; warned = {}; phase = 'brief';
    $('cpop').hidden = true; $('fmsg').hidden = true;
    buildOwners(); G.W = 0; layout(); renderAll(); showBrief();
  }
  function showBrief() {
    const solo = P.some((p) => p.ai); const reb = S.rebut === 'on' && nhuman() > 1;
    const mode = solo ? '🤖 1 TIM + ROBO TANI' : `🌾 ${P.length} TIM • ${L} LAJUR SAWAH`;
    $('brief').innerHTML = `<div class="brief-card"><span class="stampx">${mode}</span><h2>LASKAR KEBUN NUSANTARA</h2>
      <div class="brief-teams">${P.map((p) => `<span class="brief-team" style="--pc:${p.color}"><span>${p.ai ? '🤖' : p.avatar}</span>${esc(p.name)}${p.members && p.members.length ? `<small>👥 ${p.members.length}</small>` : ''}</span>`).join('')}</div>
      <div class="bf-steps">
        <div class="bf-st" style="--d:0s"><div class="pic"><span class="big">❓</span><span class="pm"><b class="plus">+${PT().ok}</b><b class="minus">−${PT().no}</b></span></div><b>1. Jawab soal</b><span>Anggota <em>bergiliran</em>. Benar = <em>+poin</em>, salah = −poin${reb ? ' • tim lain bisa <em>Rebutan</em>' : ''}</span></div>
        <div class="bf-st hot" style="--d:.1s"><div class="pic lanes"><i class="ln a"></i><i class="ln b"></i>${img('cabai', 'p1')}${img('kelapa', 'p2')}<span class="tap">👆</span></div><b>2. Tanam di lajurmu</b><span>Pilih kartu penjaga, ketuk petak di <em>2 lajur tim sendiri</em></span></div>
        <div class="bf-st" style="--d:.2s"><div class="pic war">${img('cabai', 'q1')}<i class="seed"></i>${img('kumbang', 'q2')}${img('belalang', 'q3')}</div><b>3. Serbuan hama!</b><span>Hama datang dari <em>kanan</em>. Penjaga menembak otomatis</span></div>
        <div class="bf-st" style="--d:.3s"><div class="pic home"><span class="big">🛖</span><span class="mini">❤️❤️🖤</span><span class="kb2">🐃</span></div><b>4. Jaga nyawa kebun</b><span>Hama sampai joglo = <em>−1 ❤️</em> • 🐃 <em>Kerbau Sakti</em> sekali untuk darurat</span></div>
        <div class="bf-st" style="--d:.4s"><div class="pic boss">${img('raja', 'r1')}</div><b>5. Kalahkan Raja!</b><span>Bertahan <em>${W} gelombang</em> bersama — Raja Kabut Hama di akhir</span></div>
      </div>
      <p class="bf-line">🌾 ${L} lajur sawah • tiap tim 2 lajur • ${S.hearts} ❤️ tiap kebun • ${W} gelombang (±15–20 menit) • ⏱️ ${S.time} detik per soal • mulai dengan ${START_PTS} poin</p>
      <button class="go-btn" id="btnGo">🌾 MULAI BERJAGA!<small>SPASI</small></button></div>`;
    $('brief').hidden = false; $('btnGo').onclick = (e) => { e.currentTarget.blur(); startMatch(); };
  }
  function startMatch() { if (phase !== 'brief') return false; SND.ac(); QC.sfx.click(); $('brief').hidden = true; tStart = Date.now(); beginPrep(); return true; }
  setInterval(() => { if (!['idle', 'brief'].includes(phase) && P.length) renderInfo(); if (phase !== 'battle' && P.length && !['idle', 'brief', 'over'].includes(phase)) hudLive(); }, 1000);

  /* ------------------------------ Masukan ------------------------------ */
  function mainAction(a) {
    if (a === 'ask') return askQuestion();
    if (a === 'done') return finishPlant();
    if (a === 'pause') return togglePause();
    if (a === 'again') return newGame();
  }
  function moveCursor(dl, dc) {
    const o = P[owner]; if (!o || o.ai) return;
    const ls = lanesOf(owner);
    if (!cursor || ownerOf(cursor.lane) !== owner) cursor = { lane: ls[0], col: 0 };
    else { cursor = { lane: clamp(cursor.lane + dl, ls[0], ls[1]), col: clamp(cursor.col + dc, 0, COLS - 1) }; }
    requestDraw();
  }
  QC.onKey = (e) => {
    const key = e.key; const up = key.length === 1 ? key.toUpperCase() : key;
    if (key === ' ' || (key === 'Enter' && !(sel && cursor))) {
      e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (phase === 'brief') startMatch(); else if (phase === 'turn') askQuestion(); else if (phase === 'plant') finishPlant(); else if (phase === 'battle' && paused) togglePause();
      return;
    }
    if (key === 'Enter' && sel && cursor) { e.preventDefault(); actAt(cursor.lane, cursor.col); return; }
    if (up === 'P') { togglePause(); return; }
    if (/^[1-4]$/.test(key)) { if (interactive()) { setOwner(+key - 1); SND.click(); } return; }
    if (!interactive()) return;
    const t = ORDER.find((x) => DEF[x].key === up); if (t) { pick(t); return; }
    if (up === 'X') { pick('cabut'); return; }
    if (up === 'K') {
      const o = P[owner]; if (!o || !o.kerbau) { pick('kerbau'); return; }
      if (sel === 'kerbau') { const ls = lanesOf(owner).map((l) => ({ l, s: laneState(l).threat })).sort((a, b) => b.s - a.s); useKerbau(owner, cursor && ownerOf(cursor.lane) === owner ? cursor.lane : ls[0].l); }
      else pick('kerbau');
      return;
    }
    if (key === 'Escape') { sel = null; cursor = null; renderShop(); requestDraw(); return; }
    if (key === 'ArrowUp') { e.preventDefault(); moveCursor(-1, 0); } else if (key === 'ArrowDown') { e.preventDefault(); moveCursor(1, 0); }
    else if (key === 'ArrowLeft') { e.preventDefault(); moveCursor(0, -1); } else if (key === 'ArrowRight') { e.preventDefault(); moveCursor(0, 1); }
  };
  $('btnRules').onclick = (e) => { e.currentTarget.blur(); QC.modal({ icon: '📜', title: 'Peraturan Laskar Kebun', html: `<div class="rules-pop">${RULES()}</div>`, cls: 'lk-rules', dismissable: true }); };
  $('btnSetup').onclick = async (e) => {
    e.currentTarget.blur();
    if (document.querySelector('.qc-setup.show')) return;
    if (!['idle', 'over', 'brief'].includes(phase)) {
      const ok = await QC.modal({ icon: '⚙️', title: 'Kembali ke pengaturan?', html: '<p class="qc-muted">Permainan yang sedang berjalan akan dihentikan.</p>', buttons: [{ label: 'Batal', value: false }, { label: 'Ya, ke Pengaturan', value: true, primary: true }] });
      if (!ok) return;
    }
    openSetup();
  };
  document.addEventListener('pointerdown', () => SND.ac(), { once: true });

  /* ------------------------------ Kait pengujian ------------------------------ */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__LK = {
    get phase() { return phase; },
    state: () => ({
      phase, wave, W, L, paused, turnPid, owner, sel, order: order.slice(), oi, lite: LITE, settings: { ...S }, battleT: +battleT.toFixed(2), capT, simTime: +simTime.toFixed(1), lastEnd,
      rebutOpen: !!rebDecide, question: curQ ? curQ.question : null, answerer: curAnswerer, enemies: enemies.length, spawnLeft: spawnQ.length, shots: shots.length, parts: parts.length,
      enemyList: enemies.map((e) => ({ type: e.type, lane: e.lane, x: +e.x.toFixed(2), hp: Math.round(e.hp) })), waveLog: waveLog.slice(), intel: waveList && waveList.perKebun ? waveList.perKebun.slice() : [],
      grid: grid.map((row) => row.map((d) => (d ? d.type[0] + d.owner : '.')).join('')),
      defs: grid.flat().filter(Boolean).map((d) => ({ type: d.type, owner: d.owner, lane: d.lane, col: d.col })),
      askLog: askLog.slice(-120), rebutLog: rebutLog.slice(-40), events: events.slice(-200),
      teams: P.map((p) => ({ name: p.name, ai: !!p.ai, pts: p.pts, hearts: p.hearts, kerbau: p.kerbau, asked: p.asked, correct: p.correct, steals: p.steals, kills: p.kills, breaches: p.breaches, fell: p.fell, revived: p.revived, placed: p.placed, earned: p.earned, lost: p.lost, harvest: p.harvest, types: { ...p.types }, score: scoreOf(p), members: (p.members || []).map((m) => ({ ...m })), nextAnswerer: peekAnswerer(p) ? peekAnswerer(p).name : null }))
    }),
    start: () => startMatch(),
    ask: () => askQuestion(),
    done: () => finishPlant(),
    async answer(correct) {
      let o = null;
      for (let i = 0; i < 200; i++) { o = [...document.querySelectorAll('.qc-overlay.qc-ask.show')].find((x) => x.querySelector('.qc-opt:not(:disabled)')); if (o && curQ) break; await wait(40); }
      if (!o || !curQ) return false;
      const keys = QC.optionsOf(curQ); const k = correct ? curQ.correct : keys.find((x) => x !== curQ.correct);
      o.querySelector(`.qc-opt[data-k="${k}"]`).click(); await wait(80);
      const nb = o.querySelector('[data-next]'); if (nb) nb.click(); await wait(60);
      return true;
    },
    rebut: (i) => { if (!rebDecide) return false; rebDecide(i == null || i === 'skip' ? null : +i); return true; },
    place: (pid, lane, col, type) => place(pid, lane, col, type),
    remove: (pid, lane, col) => removeDef(pid, lane, col),
    kerbau: (pid, lane) => useKerbau(pid, lane),
    select: (pid) => setOwner(pid),
    pick: (t) => { pick(t); return sel; },
    tap: (lane, col) => { actAt(lane, col); return { owner, sel }; },
    autoPlant: (pid, max, strict) => autoPlant(pid, max, strict),
    key: (k, shift) => QC.onKey({ key: k, shiftKey: !!shift, preventDefault() {} }),
    fast(on, simf) { TS = on ? 0.06 : 1; SIMF = on ? (simf || 6) : 1; return { TS, SIMF }; },
    simSpeed(v) { SIMF = v; return SIMF; },
    skipWave() { if (phase !== 'battle') return false; spawnQ = []; enemies.forEach((e) => (e.dead = true)); enemies = []; pendingEnd = 'clear'; wake(); return true; },
    endBattleCap() { if (phase !== 'battle') return false; battleT = capT + 1; wake(); return true; },
    spawn(type, lane, x = COLS + 0.4) { const e = mkEnemy(type, lane, x); enemies.push(e); requestDraw(); wake(); return e.id; },
    hold(on) { testHold = !!on; return testHold; },
    clearEnemies() { enemies = []; spawnQ = []; requestDraw(); return true; },
    setPoints(i, v) { P[i].pts = Math.max(0, v); renderAll(); return P[i].pts; },
    setHearts(i, v) { P[i].hearts = v; renderAll(); return v; },
    setWave(n) { wave = clamp(n, 1, W); if (!['battle', 'waveEnd'].includes(phase)) waveList = buildWave(wave); renderAll(); return wave; },
    noCooldown() { P.forEach((p) => (p.cdUntil = {})); renderShop(); return true; },
    aiAcc(v) { AI_ACC = v; return v; },
    togglePause: () => togglePause(),
    cellPt: (lane, col) => { const [x, y] = screenPt(lane, col); return { x, y }; },
    geom: () => ({ ...G, canvasW: cv.width, canvasH: cv.height }),
    perf() { const f = perf.frames.slice(); const g = perf.gaps.slice(); const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0); return { n: f.length, avg: +avg(f).toFixed(2), max: +Math.max(0, ...f).toFixed(2), p95: f.length ? +f.slice().sort((a, b) => a - b)[Math.floor(f.length * 0.95)].toFixed(2) : 0, gapAvg: +avg(g).toFixed(2), gapMax: +Math.max(0, ...g).toFixed(2), drawAvg: +avg(perf.dr).toFixed(2) }; },
    resetPerf() { perf.frames = []; perf.gaps = []; perf.dr = []; perf.lastTs = 0; return true; },
    rafOn: () => !!rafId,
    async waitPhase(ph, ms = 8000) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if ((Array.isArray(ph) ? ph : [ph]).includes(phase) && !QC.isBusy()) return true; await wait(30); } return false; },
    async waitAsk(ms = 8000) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (curQ && document.querySelector('.qc-overlay.qc-ask.show .qc-opt:not(:disabled)')) return true; await wait(30); } return false; },
    async waitRebut(ms = 8000) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (rebDecide) return true; if (['turn', 'plant', 'over', 'battle'].includes(phase) && !QC.isBusy()) return false; await wait(30); } return false; }
  };

  iconsInit();
  openSetup();
})();
