/* ==========================================================================
   rnalt_Digital — "Coba main dulu": ilustrasi mini tiap game di halaman detail.
   Satu kanvas, semua digambar dengan kode (tanpa file gambar/suara).
   - Game tim: jawaban benar = "Kamu" beraksi, salah = "Lawan" beraksi.
   - Game anak (PAUD/SD), jinak bom & modul: jawaban benar = bintang + aksi.
   API: GameDemo.info(id) -> { how, yay, boo }
        GameDemo.create(canvas, id, jumlahSoal) -> { answer(benar) -> Promise, finish() -> hasil, destroy() }
   ========================================================================== */
(() => {
  'use strict';
  const W = 640, H = 300, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const eo = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const EF = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const TF = 'Poppins, system-ui, sans-serif';
  const INK = '#0d1b2e', YOU = '#2f5fe8', FOE = '#ef4444', GOLD = '#ffae1f';
  const rng = (seed) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  /* ------------------------------ Konfigurasi tiap game ------------------------------ */
  const CFG = {
    'LM-PJ': { type: 'race', theme: 'river', you: { draw: 'jalur' }, goal: '🏁', wake: 'water', yay: 'Perahumu melaju!', boo: 'Disalip lawan!', how: 'Jawab benar, perahumu melaju. Salah, perahu lawan menyalip!' },
    'LM-BR': { type: 'race', theme: 'space', you: { draw: 'rocket' }, goal: '🌕', yay: 'Roketmu melesat!', boo: 'Disusul lawan!', how: 'Jawab benar, roketmu melesat. Salah, roket lawan menyusul!' },
    'LM-LP': { type: 'race', theme: 'track', you: { e: '🏃', flip: true }, foe: { e: '🏃‍♀️', flip: true }, goal: '🏁', wake: 'dust', yay: 'Kamu ngebut!', boo: 'Disusul lawan!', how: 'Jawab benar, kamu berlari lebih cepat. Salah, lawan menyusul!' },
    'LM-EK': { type: 'race', theme: 'sea', you: { e: '⛵' }, goal: '🏝️', wake: 'water', yay: 'Kapalmu berlayar!', boo: 'Didahului lawan!', how: 'Jawab benar, kapalmu berlayar maju. Salah, kapal lawan mendahului!' },
    'LM-SKS': { type: 'race', theme: 'under', you: { draw: 'sub' }, goal: '💎', wake: 'bubble', yay: 'Kapal selammu melaju!', boo: 'Didahului lawan!', how: 'Jawab benar, kapal selammu melaju. Salah, lawan mendahului!' },
    'LM-PC': { type: 'race', theme: 'skyfly', you: { draw: 'plane' }, goal: '🏁', wake: 'cloud', yay: 'Pesawatmu melaju!', boo: 'Disalip lawan!', how: 'Jawab benar, pesawatmu melaju. Salah, pesawat lawan menyalip!' },
    'LM-PN': { type: 'climb', theme: 'mountain', you: { e: '🧗' }, foe: { e: '🧗‍♀️' }, yay: 'Naik lebih tinggi!', boo: 'Disusul lawan!', how: 'Jawab benar, kamu mendaki lebih tinggi. Salah, lawan menyusul!' },
    'LM-SPK': { type: 'climb', theme: 'palm', you: { e: '🧒' }, foe: { e: '👧' }, yay: 'Naik lebih tinggi!', boo: 'Disusul lawan!', how: 'Jawab benar, kamu memanjat lebih tinggi. Salah, lawan menyusul!' },
    'LM-TT': { type: 'tug', theme: 'field', you: { e: '🔥' }, foe: { e: '🌊' }, yay: 'Tarik!', boo: 'Lawan menarik!', how: 'Jawab benar, tali tertarik ke arahmu. Salah, lawan yang menarik!' },
    'LM-BN': { type: 'battle', theme: 'castle', you: { e: '🏰', size: 66 }, foe: { e: '👹', size: 56 }, shot: '🏹', foeShot: '🔥', yay: 'Monster kena!', boo: 'Monster menyerang!', how: 'Jawab benar, bentengmu menembak monster. Salah, monster menyerang!' },
    'LM-LK': { type: 'battle', theme: 'garden', you: { e: '🌻', size: 58 }, foe: { e: '🐛', size: 50, flip: true }, shot: '💧', foeShot: '🍂', yay: 'Hama kabur!', boo: 'Kebun diserang!', how: 'Jawab benar, kebunmu mengusir hama. Salah, hama menyerang kebun!' },
    'LM-PL': { type: 'battle', theme: 'seabattle', you: { e: '🚢', size: 60 }, foe: { e: '🚢', size: 60, flip: true, badge: '🏴‍☠️' }, shot: '💣', foeShot: '💣', spin: true, yay: 'Tepat sasaran!', boo: 'Kapalmu kena!', how: 'Jawab benar, kapalmu menembak. Salah, kapal bajak laut membalas!' },
    'LM-RW': { type: 'territory', theme: 'map', yay: 'Pulau direbut!', boo: 'Direbut lawan!', how: 'Jawab benar, kamu merebut pulau. Salah, lawan yang merebutnya!' },
    'LM-JB': { type: 'bomb', theme: 'lab', yay: 'Kabel aman!', boo: '−10 detik!', how: 'Jawab benar, satu kabel dipotong. Salah, waktu berkurang 10 detik!' },
    'LM-HK': { type: 'collect', theme: 'island', prop: '❌', items: ['💰', '💎', '👑', '🪙'], flair: 'dig', yay: 'Harta ditemukan!', boo: 'Diambil lawan!', how: 'Jawab benar, harta masuk petimu. Salah, lawan yang mendapatkannya!' },
    'LM-SN': { type: 'collect', theme: 'market', prop: '⚖️', items: ['🪙', '🌶️', '☕', '🧂'], flair: 'bang', yay: 'Dagangan laku!', boo: 'Lawan untung!', how: 'Jawab benar, daganganmu laku. Salah, pedagang lawan yang untung!' },
    'LM-LJ': { type: 'collect', theme: 'auction', prop: '🔨', items: ['🏺', '💎', '🖼️', '👑'], flair: 'bang', yay: 'Terjual untukmu!', boo: 'Lawan menang lelang!', how: 'Jawab benar, barang lelang jadi milikmu. Salah, lawan yang menang lelang!' },
    'LM-PK': { type: 'collect', theme: 'stage', prop: '🎤', items: ['⭐', '🏆', '🎖️', '💯'], flair: 'flash', yay: '+100 poin!', boo: 'Poin untuk lawan!', how: 'Jawab benar, skormu bertambah. Salah, lawan mendapat poin!' },
    'LM-DK': { type: 'collect', theme: 'detective', prop: '🔍', items: ['👣', '🧤', '🔑', '📜'], flair: 'scan', yay: 'Petunjuk ditemukan!', boo: 'Lawan lebih dulu!', how: 'Jawab benar, kamu menemukan petunjuk. Salah, lawan lebih dulu!' },
    'LM-UT': { type: 'board', theme: 'board', yay: 'Bidakmu maju!', boo: 'Lawan maju!', how: 'Jawab benar, bidakmu maju. Salah, bidak lawan yang maju!' },
    'LM-MTS': { type: 'planets', theme: 'solar', yay: 'Planet muncul!', boo: 'Meleset!', how: 'Jawab benar, satu planet muncul di orbitnya!' },
    'LM-PAK': { type: 'kid', fx: 'fly', theme: 'aqua', src: ['🐠', '🐟', '🐡', '🐬'], dst: '🪣', yay: 'Ikan tertangkap!', how: 'Jawab benar, satu ikan tertangkap!' },
    'LM-PKB': { type: 'kid', fx: 'fly', theme: 'orchard', src: ['🍎', '🍊', '🍐', '🍎'], dst: '🧺', yay: 'Buah dipetik!', how: 'Jawab benar, satu buah dipetik!' },
    'LM-PHH': { type: 'kid', fx: 'fly', theme: 'farm', src: ['🐄', '🐔', '🐑', '🐷'], dst: '🏡', yay: 'Masuk kandang!', how: 'Jawab benar, satu hewan masuk kandang!' },
    'LM-PBH': { type: 'kid', fx: 'pop', theme: 'kidsky', letters: ['A', 'B', 'C', 'D'], yay: 'Balon meletus!', how: 'Jawab benar, satu balon huruf meletus!' },
    'LM-PKW': { type: 'kid', fx: 'wagon', theme: 'rail', yay: 'Gerbong baru!', how: 'Jawab benar, kereta dapat gerbong baru!' },
    'LM-SKA': { type: 'kid', fx: 'firework', theme: 'night', yay: 'Duar!', how: 'Jawab benar, kembang api meledak di langit!' },
    'LM-STD': { type: 'kid', fx: 'hatch', theme: 'jungle', hatch: ['🦕', '🦖', '🐣', '🦕'], yay: 'Telur menetas!', how: 'Jawab benar, satu telur menetas!' },
    'LM-SBJ': { type: 'kid', fx: 'hoop', theme: 'court', yay: 'Masuk ring!', how: 'Jawab benar, bola masuk ring!' }
  };
  const FALLBACK = { type: 'collect', theme: 'stage', prop: '🎮', items: ['⭐', '🏆', '🎖️', '💯'], flair: 'flash', yay: 'Dapat poin!', boo: 'Poin untuk lawan!', how: 'Jawab benar, kamu dapat poin. Salah, lawan yang dapat!' };

  /* ------------------------------ Tema latar ------------------------------ */
  const THEMES = {
    river: { sky: ['#7dd3fc', '#e0f2fe'], horizon: 112, bank: '#65a30d', water: ['#0e7490', '#155e75'], ground: 'ripples', decor: [['🌴', 30, 92, 26], ['🌳', 150, 92, 22], ['🏠', 470, 92, 20], ['🌴', 610, 92, 26]] },
    space: { sky: ['#0b1026', '#312e81'], skyFx: 'stars', decor: [['🪐', 590, 52, 34], ['🌙', 60, 46, 26]] },
    track: { sky: ['#93c5fd', '#e0f2fe'], horizon: 112, bank: '#16a34a', land: '#c2410c', ground: 'lanes', decor: [['🌳', 40, 90, 22], ['🏟️', 320, 88, 26], ['🌳', 600, 90, 22]] },
    sea: { sky: ['#7dd3fc', '#e0f2fe'], skyFx: 'clouds', horizon: 112, water: ['#0284c7', '#075985'], ground: 'waves' },
    under: { sky: ['#0ea5e9', '#0c4a6e'], ground: 'bubbles', decor: [['🌿', 24, 282, 26], ['🪸', 210, 286, 22], ['🌿', 420, 282, 26], ['🐚', 600, 288, 18], ['🐠', 300, 52, 16], ['🐟', 520, 82, 14]] },
    skyfly: { sky: ['#38bdf8', '#e0f2fe'], skyFx: 'clouds' },
    mountain: { sky: ['#bae6fd', '#f0f9ff'], skyFx: 'clouds' },
    palm: { sky: ['#fde68a', '#bae6fd'], horizon: 266, land: '#fcd34d', decor: [['🐚', 70, 284, 16], ['🦀', 570, 284, 18]] },
    field: { sky: ['#bae6fd', '#f0f9ff'], skyFx: 'clouds', horizon: 150, land: '#4ade80', decor: [['🌳', 40, 138, 26], ['🌳', 600, 138, 26]] },
    castle: { sky: ['#fb923c', '#6d28d9'], horizon: 236, land: '#3f6212', decor: [['🌙', 560, 44, 24], ['🌲', 290, 226, 24], ['🌲', 350, 228, 20]] },
    garden: { sky: ['#bae6fd', '#ecfeff'], skyFx: 'clouds', horizon: 200, land: '#65a30d', ground: 'fence', decor: [['🌷', 250, 262, 18], ['🌼', 320, 270, 16], ['🌷', 390, 262, 18]] },
    seabattle: { sky: ['#fda4af', '#7dd3fc'], horizon: 150, water: ['#0369a1', '#0c4a6e'], ground: 'waves' },
    island: { sky: ['#38bdf8', '#e0f2fe'], horizon: 150, water: ['#06b6d4', '#0e7490'], ground: 'waves', pedestal: 'island' },
    market: { sky: ['#fed7aa', '#ffedd5'], skyFx: 'awning', horizon: 222, land: '#b45309', pedestal: 'table' },
    auction: { sky: ['#7f1d1d', '#450a0a'], skyFx: 'curtain', horizon: 236, land: '#78350f', pedestal: 'podium' },
    stage: { sky: ['#312e81', '#1e1b4b'], skyFx: 'spots', horizon: 236, land: '#4c1d95', pedestal: 'podium' },
    detective: { sky: ['#b45309', '#78350f'], skyFx: 'cork', pedestal: 'paper' },
    map: { sky: ['#0ea5e9', '#0369a1'], horizon: 0, water: ['#0ea5e9', '#0369a1'], ground: 'waves' },
    lab: { sky: ['#1f2937', '#0b1220'], skyFx: 'grid', horizon: 270, land: '#111827', ground: 'stripes' },
    board: { sky: ['#fef3c7', '#fde68a'] },
    solar: { sky: ['#020617', '#1e1b4b'], skyFx: 'stars' },
    aqua: { sky: ['#bae6fd', '#e0f2fe'], horizon: 120, water: ['#22d3ee', '#0e7490'], ground: 'ripples' },
    orchard: { sky: ['#bae6fd', '#f0fdf4'], skyFx: 'clouds', horizon: 252, land: '#86efac' },
    farm: { sky: ['#bae6fd', '#fefce8'], skyFx: 'clouds', horizon: 196, land: '#86efac', ground: 'fence' },
    kidsky: { sky: ['#7dd3fc', '#fdf2f8'], skyFx: 'clouds', horizon: 270, land: '#86efac' },
    rail: { sky: ['#bae6fd', '#fef9c3'], skyFx: 'clouds', horizon: 214, land: '#86efac', ground: 'rails', decor: [['🌳', 40, 196, 24], ['⛰️', 560, 186, 36]] },
    night: { sky: ['#0f172a', '#312e81'], skyFx: 'stars', horizon: 274, land: '#1e293b', decor: [['🏠', 40, 262, 20], ['🏠', 600, 262, 20]] },
    jungle: { sky: ['#bbf7d0', '#fef9c3'], horizon: 232, land: '#65a30d', decor: [['🌴', 40, 190, 40], ['🌿', 606, 214, 30], ['🌋', 560, 110, 44]] },
    court: { sky: ['#fde68a', '#fed7aa'], horizon: 244, land: '#c2410c', ground: 'court' }
  };

  /* ------------------------------ Alat gambar ------------------------------ */
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function emo(c, e, x, y, size, o) {
    o = o || {};
    c.save(); c.translate(x, y);
    if (o.rot) c.rotate(o.rot);
    if (o.flip) c.scale(-1, 1);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    c.font = `${Math.round(size)}px ${EF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(e, 0, 0); c.restore();
  }
  function chip(c, txt, x, y, col) {
    c.font = `700 12px ${TF}`; const w = c.measureText(txt).width + 16;
    x = clamp(x, w / 2 + 4, W - w / 2 - 4);
    c.fillStyle = col; rr(c, x - w / 2, y - 10, w, 20, 10); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x, y + 1);
  }
  function cloud(c, x, y, s) { c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(x, y, 14 * s, 0, TAU); c.arc(x + 16 * s, y - 7 * s, 18 * s, 0, TAU); c.arc(x + 34 * s, y, 14 * s, 0, TAU); c.fill(); c.fillRect(x, y - 2 * s, 34 * s, 14 * s); }
  function flag(c, x, y, col) { c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 30); c.stroke(); c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 30); c.lineTo(x + 20, y - 24); c.lineTo(x, y - 17); c.closePath(); c.fill(); c.stroke(); }

  /* ------------------------------ Efek latar ------------------------------ */
  const FX = {
    stars(c, S) {
      if (!S._stars) { const r = rng(7); S._stars = Array.from({ length: 46 }, () => ({ x: r() * W, y: r() * H * 0.92, s: 0.8 + r() * 1.6, p: r() * 6 })); }
      c.fillStyle = '#fff';
      S._stars.forEach((s) => { c.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(S.t * 1.4 + s.p)); c.fillRect(s.x, s.y, s.s, s.s); });
      c.globalAlpha = 1;
    },
    clouds(c, S) { for (let i = 0; i < 4; i++) { const x = ((i * 190 + S.t * (7 + i * 3)) % (W + 160)) - 80; cloud(c, x, 30 + (i % 2) * 26, 0.7 + (i % 3) * 0.18); } },
    spots(c, S) { [130, 320, 510].forEach((x, i) => { const sw = Math.sin(S.t * 0.8 + i * 2) * 50; c.fillStyle = 'rgba(255,255,210,.11)'; c.beginPath(); c.moveTo(x, -4); c.lineTo(x + sw - 70, H); c.lineTo(x + sw + 70, H); c.closePath(); c.fill(); }); },
    curtain(c) {
      for (let x = 0; x < 90; x += 18) { c.fillStyle = (x / 18) % 2 ? '#991b1b' : '#b91c1c'; c.fillRect(x, 0, 18, H); c.fillRect(W - x - 18, 0, 18, H); }
      c.fillStyle = '#7f1d1d'; c.fillRect(0, 0, W, 22); c.fillStyle = GOLD; c.fillRect(0, 20, W, 4);
    },
    cork(c, S) {
      if (!S._cork) { const r = rng(5); S._cork = Array.from({ length: 160 }, () => ({ x: r() * W, y: r() * H, s: 1 + r() * 2 })); }
      c.fillStyle = 'rgba(69,26,3,.35)'; S._cork.forEach((d) => c.fillRect(d.x, d.y, d.s, d.s));
      c.strokeStyle = '#dc2626'; c.lineWidth = 2; c.beginPath(); c.moveTo(70, 60); c.lineTo(250, 90); c.lineTo(420, 54); c.lineTo(580, 96); c.stroke();
    },
    grid(c) { c.strokeStyle = 'rgba(148,163,184,.12)'; c.lineWidth = 1; for (let x = 0; x <= W; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y <= H; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } },
    awning(c) {
      for (let x = 0, i = 0; x < W; x += 40, i++) { c.fillStyle = i % 2 ? '#fff' : '#dc2626'; c.fillRect(x, 0, 40, 30); c.beginPath(); c.arc(x + 20, 30, 20, 0, Math.PI); c.fill(); }
    },
    ripples(c, S) {
      const top = S.th.horizon; c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2;
      for (let y = top + 16; y < H; y += 22) { const off = (S.t * 24 + y * 3) % 70; c.beginPath(); for (let x = -off; x < W; x += 70) { c.moveTo(x, y); c.quadraticCurveTo(x + 12, y - 4, x + 24, y); } c.stroke(); }
    },
    waves(c, S) {
      const top = S.th.horizon || 0; c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 2;
      for (let y = top + 18, r = 0; y < H; y += 26, r++) { c.beginPath(); for (let x = 0; x <= W; x += 8) { const yy = y + Math.sin(x / 26 + S.t * 1.6 + r) * 3; if (x) c.lineTo(x, yy); else c.moveTo(x, yy); } c.stroke(); }
    },
    bubbles(c, S) {
      if (!S._bub) { const r = rng(3); S._bub = Array.from({ length: 16 }, () => ({ x: r() * W, p: r(), s: 2 + r() * 4, v: 14 + r() * 20 })); }
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.5;
      S._bub.forEach((b) => { const y = H - ((S.t * b.v + b.p * H) % (H + 20)); c.beginPath(); c.arc(b.x + Math.sin(S.t + b.p * 6) * 4, y, b.s, 0, TAU); c.stroke(); });
    },
    fence(c, S) { const y = S.th.horizon; c.fillStyle = '#b45309'; for (let x = 6; x < W; x += 34) c.fillRect(x, y - 30, 7, 34); c.fillRect(0, y - 24, W, 5); c.fillRect(0, y - 12, W, 5); },
    lanes(c, S) {
      if (!S.lanes) return; const top = S.th.horizon; c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2;
      [top + 3, (S.lanes.foe + S.lanes.you) / 2 + 6, H - 3].forEach((y) => { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); });
    },
    stripes(c, S) { const y = S.th.horizon; c.fillStyle = '#facc15'; for (let x = -40; x < W + 40; x += 28) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 14, y); c.lineTo(x - 2, H); c.lineTo(x - 16, H); c.closePath(); c.fill(); } },
    rails(c) { const y = 262; c.fillStyle = '#78350f'; for (let x = 0; x < W; x += 22) c.fillRect(x, y - 3, 12, 14); c.fillStyle = '#64748b'; c.fillRect(0, y - 2, W, 4); c.fillRect(0, y + 8, W, 4); },
    court(c, S) { const y = S.th.horizon; c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, y + 16); c.lineTo(W, y + 16); c.stroke(); c.beginPath(); c.arc(560, y + 16, 90, Math.PI, TAU); c.stroke(); }
  };

  function bg(c, S) {
    const th = S.th;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (th.skyFx && FX[th.skyFx]) FX[th.skyFx](c, S);
    const hz = th.horizon;
    if (hz != null) {
      if (th.bank) { c.fillStyle = th.bank; c.fillRect(0, hz - 16, W, 16); }
      if (th.water) { const w = c.createLinearGradient(0, hz, 0, H); w.addColorStop(0, th.water[0]); w.addColorStop(1, th.water[1]); c.fillStyle = w; c.fillRect(0, hz, W, H - hz); }
      else if (th.land) { c.fillStyle = th.land; c.fillRect(0, hz, W, H - hz); }
    }
    if (th.ground && FX[th.ground]) FX[th.ground](c, S);
    (th.decor || []).forEach((d, i) => emo(c, d[0], d[1], d[2] + Math.sin(S.t * 1.2 + i) * 1.2, d[3]));
  }

  /* ------------------------------ Kendaraan buatan sendiri ------------------------------ */
  const DRAW = {
    jalur(c, x, y, col, S, moving) {
      const L = 150, h = 12, st = x - L;
      const n = 7, gap = (L - 52) / (n - 1), ph = moving ? S.t * 10 : S.t * 2;
      for (let k = 0; k < n; k++) {
        const px = st + 20 + k * gap, py = y - h * 0.2;
        c.fillStyle = col; c.fillRect(px - 3.5, py - 11, 7, 10);
        c.fillStyle = '#e0a872'; c.beginPath(); c.arc(px, py - 15, 4.5, 0, TAU); c.fill();
        c.fillStyle = INK; c.fillRect(px - 4.5, py - 20, 9, 3);
        const a = Math.PI / 2 + Math.sin(ph) * 0.65;
        c.strokeStyle = '#78350f'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, py - 8); c.lineTo(px + Math.cos(a) * 22, py - 8 + Math.sin(a) * 22); c.stroke();
      }
      c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(st, y - h * 0.2); c.lineTo(x - 10, y - h * 0.2);
      c.quadraticCurveTo(x + 4, y - h * 0.4, x + 6, y - h * 1.7); c.lineTo(x + 1, y - h * 1.6);
      c.quadraticCurveTo(x - 2, y + h * 0.6, x - 20, y + h * 0.7);
      c.quadraticCurveTo(x - L / 2, y + h, st + 8, y + h * 0.6);
      c.quadraticCurveTo(st - 4, y + h * 0.2, st - 5, y - h * 0.8);
      c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = GOLD; c.lineWidth = 3; c.beginPath(); c.moveTo(st + 6, y + 2); c.lineTo(x - 18, y + 2); c.stroke();
      // penari haluan
      const sw = Math.sin(S.t * (moving ? 10 : 3)) * (moving ? 0.25 : 0.06);
      c.save(); c.translate(x - 14, y - h * 0.2); c.rotate(sw);
      c.fillStyle = '#111827'; c.fillRect(-4, -18, 8, 14);
      c.fillStyle = '#e0a872'; c.beginPath(); c.arc(0, -22, 5, 0, TAU); c.fill();
      c.fillStyle = INK; c.fillRect(-5, -28, 10, 3); c.fillRect(-4, -23.5, 8, 2);
      c.strokeStyle = '#e0a872'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-3, -15); c.lineTo(-10, -22 - sw * 20); c.moveTo(3, -15); c.lineTo(10, -22 + sw * 20); c.stroke();
      c.restore();
    },
    rocket(c, x, y, col, S, moving) {
      c.save(); c.translate(x - 40, y);
      const f = 12 + Math.sin(S.t * 40) * 4 + (moving ? 16 : 0);
      c.fillStyle = '#f97316'; c.beginPath(); c.moveTo(-26, -7); c.lineTo(-26 - f, 0); c.lineTo(-26, 7); c.fill();
      c.fillStyle = '#fde047'; c.beginPath(); c.moveTo(-26, -4); c.lineTo(-26 - f * 0.6, 0); c.lineTo(-26, 4); c.fill();
      c.fillStyle = '#f8fafc'; c.strokeStyle = INK; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-26, -11); c.lineTo(14, -11); c.quadraticCurveTo(34, -8, 40, 0); c.quadraticCurveTo(34, 8, 14, 11); c.lineTo(-26, 11); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = col;
      c.beginPath(); c.moveTo(-22, -11); c.lineTo(-30, -23); c.lineTo(-12, -11); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-22, 11); c.lineTo(-30, 23); c.lineTo(-12, 11); c.closePath(); c.fill(); c.stroke();
      c.fillRect(-8, -10, 6, 20);
      c.fillStyle = '#7dd3fc'; c.beginPath(); c.arc(12, 0, 5.5, 0, TAU); c.fill(); c.stroke();
      c.restore();
    },
    sub(c, x, y, col, S, moving) {
      c.save(); c.translate(x - 42, y);
      c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 2.5;
      c.fillRect(-8, -28, 24, 14); c.strokeRect(-8, -28, 24, 14);
      c.beginPath(); c.moveTo(10, -28); c.lineTo(10, -38); c.lineTo(18, -38); c.stroke();
      c.beginPath(); c.ellipse(0, 0, 42, 17, 0, 0, TAU); c.fill(); c.stroke();
      [-18, -2, 14].forEach((px) => { c.fillStyle = '#bae6fd'; c.beginPath(); c.arc(px, -1, 4.5, 0, TAU); c.fill(); c.stroke(); });
      const a = S.t * (moving ? 30 : 6);
      c.fillStyle = INK; c.beginPath(); c.ellipse(-46, Math.sin(a) * 6, 3, 9 * Math.abs(Math.cos(a)) + 2, 0, 0, TAU); c.fill();
      c.restore();
    },
    plane(c, x, y, col, S) {
      c.save(); c.translate(x - 38, y + Math.sin(S.t * 3 + y) * 2);
      c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-4, 2); c.lineTo(10, 2); c.lineTo(-2, 22); c.lineTo(-12, 22); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-34, -4); c.lineTo(20, -7); c.quadraticCurveTo(36, -4, 38, 2); c.quadraticCurveTo(30, 8, 18, 8); c.lineTo(-30, 5); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-2, -5); c.lineTo(8, -5); c.lineTo(-2, -18); c.lineTo(-10, -18); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-30, -3); c.lineTo(-36, -18); c.lineTo(-26, -18); c.lineTo(-20, -4); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#bae6fd'; c.beginPath(); c.ellipse(20, -4, 8, 4, 0, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = INK; c.lineWidth = 2; const a = S.t * 40; c.beginPath(); c.moveTo(39, 2 + Math.sin(a) * 12); c.lineTo(39, 2 - Math.sin(a) * 12); c.stroke();
      c.restore();
    }
  };
  function actor(c, spec, x, y, col, S, moving, size) {
    if (spec.draw && DRAW[spec.draw]) { DRAW[spec.draw](c, x, y, col, S, moving); return; }
    size = spec.size || size || 44;
    const bob = moving ? -Math.abs(Math.sin(S.t * 14)) * 5 : Math.sin(S.t * 3 + x * 0.05) * 1.5;
    emo(c, spec.e, x - size * 0.45, y - size * 0.32 + bob, size, { flip: spec.flip });
  }

  /* ------------------------------ Partikel, teks, animasi ------------------------------ */
  function anim(S, ms, update, done) { S.anims.push({ t0: S.t, dur: Math.max(0.001, ms / 1000), update, done }); }
  function burst(S, x, y, o) {
    o = o || {}; const n = reduced ? Math.min(6, o.n || 14) : (o.n || 14);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = (o.speed || 160) * (0.4 + Math.random() * 0.8);
      S.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up == null ? 60 : o.up), g: o.g == null ? 320 : o.g, life: o.life || 0.8, max: o.life || 0.8, size: o.size || (3 + Math.random() * 3), color: o.colors ? o.colors[(Math.random() * o.colors.length) | 0] : '#fff', e: o.emojis ? o.emojis[(Math.random() * o.emojis.length) | 0] : null });
    }
  }
  function say(S, x, y, txt, col, size) { if (txt) S.texts.push({ x: clamp(x, 80, W - 80), y: clamp(y, 30, H - 20), txt, col: col || '#fff', size: size || 18, life: 1.3, max: 1.3 }); }
  function confetti(S) { burst(S, W / 2, 30, { n: 70, colors: ['#f43f5e', '#ffae1f', '#16d9c0', '#2f5fe8', '#a855f7', '#fff'], speed: 280, up: 30, g: 240, life: 2, size: 5 }); }
  function wake(S, x, y, kind) {
    if (reduced || !kind) return;
    if (kind === 'bubble') { S.parts.push({ x, y: y - 4, vx: -20, vy: -30, g: -20, life: 0.8, max: 0.8, size: 4, color: 'rgba(255,255,255,.8)' }); return; }
    const col = kind === 'dust' ? '#e7c08f' : kind === 'cloud' ? '#ffffff' : '#e0f2fe';
    for (let i = 0; i < 2; i++) S.parts.push({ x: x + Math.random() * 6, y: y - 2 + Math.random() * 6, vx: -40 - Math.random() * 40, vy: -20 - Math.random() * 30, g: 90, life: 0.5, max: 0.5, size: 3 + Math.random() * 3, color: col });
  }

  /* ============================== Jenis adegan ============================== */
  const T = {};

  /* ---------- Balapan ---------- */
  T.race = {
    init(S) {
      const top = S.th.horizon || 64;
      S.lanes = { foe: top + (H - top) * 0.40, you: top + (H - top) * 0.82 };
      S.x0 = 24; S.x1 = W - 46;
      S.len = { jalur: 156, rocket: 78, sub: 88, plane: 78 }[S.cfg.you.draw] || 46;
    },
    front(S, prog) { return S.x0 + S.len + clamp(prog / S.N, 0, 1) * (S.x1 - S.x0 - S.len); },
    anchor(S, who) { return { x: this.front(S, who === 'you' ? S.pv : S.rv) - S.len / 2, y: S.lanes[who] - 52 }; },
    draw(c, S) {
      const top = S.th.horizon || 64;
      for (let y = top + 4, i = 0; y < H; y += 9, i++) { c.fillStyle = i % 2 ? '#fff' : INK; c.fillRect(S.x1, y, 7, 9); c.fillStyle = i % 2 ? INK : '#fff'; c.fillRect(S.x1 + 7, y, 7, 9); }
      emo(c, S.cfg.goal || '🏁', S.x1 + 7, top - 14 + Math.sin(S.t * 2) * 2, 26);
      ['foe', 'you'].forEach((who) => {
        const prog = who === 'you' ? S.pv : S.rv, target = who === 'you' ? S.p : S.r;
        const x = this.front(S, prog), y = S.lanes[who], moving = target - prog > 0.02;
        const spec = who === 'you' ? S.cfg.you : (S.cfg.foe || S.cfg.you), col = who === 'you' ? YOU : FOE;
        if (moving && S.t - (S['_w' + who] || 0) > 0.05) { S['_w' + who] = S.t; wake(S, x - S.len, y, S.cfg.wake); }
        actor(c, spec, x, y, col, S, moving, 46);
        chip(c, who === 'you' ? 'Kamu' : 'Lawan', x - S.len / 2, y - (spec.draw ? 44 : 54), col);
      });
    },
    event(S, ok) { const a = this.anchor(S, ok ? 'you' : 'foe'); say(S, a.x + 40, a.y - 10, ok ? S.cfg.yay : S.cfg.boo, ok ? '#fde047' : '#fecaca'); return 1000; }
  };

  /* ---------- Memanjat ---------- */
  T.climb = {
    init(S) { S.cols = { you: W * 0.35, foe: W * 0.65 }; S.yb = H - 30; S.yt = 84; },
    pos(S, who) { const prog = who === 'you' ? S.pv : S.rv; return { x: S.cols[who], y: S.yb - clamp(prog / S.N, 0, 1) * (S.yb - S.yt) }; },
    anchor(S, who) { const p = this.pos(S, who); return { x: p.x, y: p.y - 44 }; },
    draw(c, S) {
      if (S.cfg.theme === 'mountain') {
        c.fillStyle = '#94a3b8'; c.beginPath(); c.moveTo(-30, H); c.lineTo(W / 2, 44); c.lineTo(W + 30, H); c.closePath(); c.fill();
        c.fillStyle = '#64748b'; c.beginPath(); c.moveTo(W / 2, 44); c.lineTo(W / 2 + 120, H); c.lineTo(W / 2 + 40, H); c.closePath(); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(W / 2, 44); c.lineTo(W / 2 + 46, 96); c.lineTo(W / 2 + 24, 88); c.lineTo(W / 2 + 6, 104); c.lineTo(W / 2 - 14, 88); c.lineTo(W / 2 - 40, 98); c.closePath(); c.fill();
        c.strokeStyle = '#92400e'; c.lineWidth = 2; c.setLineDash([6, 5]);
        ['you', 'foe'].forEach((w) => { c.beginPath(); c.moveTo(S.cols[w], S.yb + 10); c.lineTo(S.cols[w], S.yt - 6); c.stroke(); });
        c.setLineDash([]);
        emo(c, '🚩', W / 2 + 8, 30, 28);
      } else {
        ['you', 'foe'].forEach((w) => {
          const x = S.cols[w];
          c.strokeStyle = '#92400e'; c.lineWidth = 16; c.lineCap = 'round';
          c.beginPath(); c.moveTo(x - 6, H + 4); c.quadraticCurveTo(x + 12, (H + S.yt) / 2, x, S.yt - 8); c.stroke();
          c.strokeStyle = '#78350f'; c.lineWidth = 2;
          for (let y = S.yt + 6; y < H; y += 16) { c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 10, y + 2); c.stroke(); }
          c.strokeStyle = '#16a34a'; c.lineWidth = 7;
          for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.55 + Math.sin(S.t * 1.5 + i) * 0.04; c.beginPath(); c.moveTo(x, S.yt - 10); c.quadraticCurveTo(x + Math.cos(a) * 34, S.yt - 10 + Math.sin(a) * 34 - 6, x + Math.cos(a) * 58, S.yt - 2 + Math.sin(a) * 30 + 14); c.stroke(); }
          emo(c, '🥥', x - 9, S.yt - 2, 18); emo(c, '🥥', x + 9, S.yt, 18);
          c.lineCap = 'butt';
        });
      }
      ['foe', 'you'].forEach((who) => {
        const p = this.pos(S, who), target = who === 'you' ? S.p : S.r, prog = who === 'you' ? S.pv : S.rv, moving = target - prog > 0.02;
        const spec = who === 'you' ? S.cfg.you : (S.cfg.foe || S.cfg.you);
        emo(c, spec.e, p.x + (moving ? Math.sin(S.t * 20) * 3 : 0), p.y - 18, 36);
        chip(c, who === 'you' ? 'Kamu' : 'Lawan', p.x + (who === 'you' ? -52 : 52), p.y - 18, who === 'you' ? YOU : FOE);
      });
    },
    event(S, ok) { const a = this.anchor(S, ok ? 'you' : 'foe'); say(S, a.x, a.y - 30, ok ? S.cfg.yay : S.cfg.boo, ok ? '#fde047' : '#fecaca'); return 1000; }
  };

  /* ---------- Tarik tambang ---------- */
  T.tug = {
    init() {},
    shift(S) { return -((S.pv - S.rv) / S.N) * 150; },
    anchor(S, who) { const s = this.shift(S); return who === 'you' ? { x: 120 + s, y: 118 } : { x: W - 120 + s, y: 118 }; },
    draw(c, S) {
      const s = this.shift(S), ry = 200;
      c.fillStyle = '#78350f'; c.beginPath(); c.ellipse(W / 2, 250, 80, 18, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.ellipse(W / 2 - 22, 246, 22, 4, 0, 0, TAU); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([8, 6]);
      [W / 2 - 150, W / 2 + 150].forEach((x) => { c.beginPath(); c.moveTo(x, 214); c.lineTo(x, 294); c.stroke(); });
      c.setLineDash([]);
      c.strokeStyle = '#a16207'; c.lineWidth = 7; c.beginPath(); c.moveTo(20 + s, ry); c.quadraticCurveTo(W / 2 + s, ry + 10, W - 20 + s, ry); c.stroke();
      const px = W / 2 + s; c.fillStyle = '#dc2626'; c.strokeStyle = INK; c.lineWidth = 2;
      c.beginPath(); c.moveTo(px, ry + 4); c.lineTo(px - 10, ry + 30); c.lineTo(px + 10, ry + 30); c.closePath(); c.fill(); c.stroke();
      const pull = (S.p - S.pv) > 0.02 ? -0.32 : (S.r - S.rv) > 0.02 ? 0.12 : -0.12;
      const pullF = (S.r - S.rv) > 0.02 ? 0.32 : (S.p - S.pv) > 0.02 ? -0.12 : 0.12;
      for (let i = 0; i < 3; i++) {
        this.person(c, 64 + i * 50 + s, ry, YOU, S.cfg.you.e, pull);
        this.person(c, W - 64 - i * 50 + s, ry, FOE, S.cfg.foe.e, pullF);
      }
      chip(c, 'Kamu', 114 + s, 118, YOU); chip(c, 'Lawan', W - 114 + s, 118, FOE);
    },
    person(c, x, ry, col, e, lean) {
      c.save(); c.translate(x, ry + 34); c.rotate(lean);
      c.fillStyle = col; rr(c, -11, -46, 22, 34, 8); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
      c.fillStyle = INK; c.fillRect(-9, -12, 7, 14); c.fillRect(2, -12, 7, 14);
      c.restore();
      emo(c, e, x + Math.sin(lean) * 40, ry - 22, 26);
    },
    event(S, ok) { const a = this.anchor(S, ok ? 'you' : 'foe'); burst(S, W / 2 + this.shift(S), 248, { n: 10, colors: ['#78350f', '#92400e', '#a16207'], speed: 120, up: 120 }); say(S, a.x, a.y - 22, ok ? S.cfg.yay : S.cfg.boo, ok ? '#fde047' : '#fecaca'); return 1000; }
  };

  /* ---------- Perang (benteng, kebun, kapal) ---------- */
  T.battle = {
    init(S) {
      const gy = S.th.horizon ? Math.min(S.th.horizon + 46, H - 30) : 220;
      S.pos = { you: { x: 112, y: gy }, foe: { x: W - 112, y: gy } };
      S.hp = { you: 1, foe: 1 }; S.hpv = { you: 1, foe: 1 }; S.shk = { you: 0, foe: 0 }; S.shots = []; S.dead = null;
    },
    anchor(S, who) { const p = S.pos[who]; return { x: p.x, y: p.y - 92 }; },
    update(S, dt) { ['you', 'foe'].forEach((w) => { S.hpv[w] += (S.hp[w] - S.hpv[w]) * (1 - Math.exp(-dt * 6)); S.shk[w] = Math.max(0, S.shk[w] - dt * 2.5); }); },
    draw(c, S) {
      ['you', 'foe'].forEach((who, i) => {
        const p = S.pos[who], spec = who === 'you' ? S.cfg.you : S.cfg.foe, size = spec.size || 56;
        const sx = Math.sin(S.t * 60) * S.shk[who] * 6, bob = S.cfg.theme === 'seabattle' ? Math.sin(S.t * 2 + i) * 3 : 0;
        const dead = S.dead === who;
        emo(c, spec.e, p.x + sx, p.y - size * 0.42 + bob + (dead ? 8 : 0), size, { flip: spec.flip, rot: dead ? (who === 'you' ? -0.4 : 0.4) : 0, alpha: dead ? 0.55 : 1 });
        if (spec.badge) emo(c, spec.badge, p.x + 4, p.y - size - 6 + bob, 20);
        const bw = 92, bx = p.x - bw / 2, by = p.y - size - 30;
        c.fillStyle = 'rgba(13,27,46,.55)'; rr(c, bx, by, bw, 10, 5); c.fill();
        c.fillStyle = S.hpv[who] > 0.5 ? '#22c55e' : S.hpv[who] > 0.25 ? '#f59e0b' : '#ef4444';
        if (S.hpv[who] > 0.01) { rr(c, bx, by, Math.max(10, bw * S.hpv[who]), 10, 5); c.fill(); }
        c.strokeStyle = INK; c.lineWidth = 1.5; rr(c, bx, by, bw, 10, 5); c.stroke();
        chip(c, who === 'you' ? 'Kamu' : 'Lawan', p.x, by - 14, who === 'you' ? YOU : FOE);
      });
      S.shots.forEach((s) => {
        const k = clamp((S.t - s.t0) / s.dur, 0, 1);
        const x = lerp(s.fx, s.tx, k), y = lerp(s.fy, s.ty, k) - Math.sin(k * Math.PI) * 70;
        emo(c, s.e, x, y, 26, { rot: s.spin ? S.t * 12 : 0, flip: s.flip });
      });
    },
    event(S, ok) {
      const from = ok ? 'you' : 'foe', to = ok ? 'foe' : 'you', fp = S.pos[from], tp = S.pos[to];
      const shot = { t0: S.t, dur: 0.6, fx: fp.x + (ok ? 34 : -34), fy: fp.y - 40, tx: tp.x, ty: tp.y - 28, e: ok ? S.cfg.shot : S.cfg.foeShot, spin: S.cfg.spin, flip: !ok };
      S.shots.push(shot);
      anim(S, 600, null, () => {
        S.shots.splice(S.shots.indexOf(shot), 1);
        burst(S, tp.x, tp.y - 28, { n: 16, colors: ['#f97316', '#facc15', '#ef4444', '#fff'], speed: 170 });
        S.shk[to] = 1; S.hp[to] = 1 - (to === 'foe' ? S.p : S.r) / S.N;
        say(S, tp.x, tp.y - 120, ok ? S.cfg.yay : S.cfg.boo, ok ? '#fde047' : '#fecaca');
      });
      return 1050;
    },
    end(S, res) { if (res.tie) return; const loser = res.win ? 'foe' : 'you'; S.dead = loser; const p = S.pos[loser]; burst(S, p.x, p.y - 30, { n: 20, emojis: ['💥', '💨'], speed: 140, size: 22 }); }
  };

  /* ---------- Rebut pulau ---------- */
  T.territory = {
    init(S) { S.tiles = Array(8).fill(0); S.tA = Array(8).fill(0); S.order = { you: [0, 4, 1, 5, 2, 6, 3, 7], foe: [3, 7, 2, 6, 1, 5, 0, 4] }; S.per = Math.ceil(8 / S.N); },
    rect(i) { const cw = 128, ch = 90, gx = 16, gy = 16, ox = (W - (4 * cw + 3 * gx)) / 2, oy = 92; const col = i % 4, row = (i / 4) | 0; return { x: ox + col * (cw + gx), y: oy + row * (ch + gy), w: cw, h: ch }; },
    anchor(S, who) { const v = who === 'you' ? 1 : 2; const i = S.tiles.indexOf(v); const r = this.rect(i >= 0 ? i : (who === 'you' ? 0 : 3)); return { x: r.x + r.w / 2, y: r.y - 6 }; },
    draw(c, S) {
      const isl = ['🌴', '⛰️', '🌳', '🏝️', '🌋', '🌲', '🏕️', '🌾'];
      S.tiles.forEach((v, i) => {
        const r = this.rect(i), a = S.tA[i];
        c.fillStyle = '#fde68a'; rr(c, r.x, r.y, r.w, r.h, 20); c.fill();
        c.fillStyle = '#4ade80'; c.beginPath(); c.ellipse(r.x + r.w / 2, r.y + r.h / 2 + 4, r.w * 0.36, r.h * 0.3, 0, 0, TAU); c.fill();
        emo(c, isl[i], r.x + r.w / 2, r.y + r.h / 2, 28);
        if (v > 0) {
          const col = v === 1 ? YOU : FOE;
          c.save(); c.globalAlpha = 0.5 * eo(a); c.fillStyle = col; rr(c, r.x, r.y, r.w, r.h, 20); c.fill(); c.restore();
          c.lineWidth = 3.5; c.strokeStyle = col; rr(c, r.x, r.y, r.w, r.h, 20); c.stroke();
          flag(c, r.x + r.w - 30, r.y + r.h - 12 - (1 - eo(a)) * 40, col);
        } else { c.lineWidth = 2; c.strokeStyle = 'rgba(13,27,46,.3)'; rr(c, r.x, r.y, r.w, r.h, 20); c.stroke(); }
      });
      c.font = `700 13px ${TF}`; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(`Pulaumu: ${S.tiles.filter((v) => v === 1).length}   •   Pulau lawan: ${S.tiles.filter((v) => v === 2).length}`, W / 2, 70);
    },
    event(S, ok) {
      const who = ok ? 'you' : 'foe', v = ok ? 1 : 2; let n = 0;
      S.order[who].forEach((i) => {
        if (n >= S.per || S.tiles[i]) return;
        const delay = 150 + n * 230; n++;
        S.tiles[i] = -1; // dipesan
        anim(S, delay, null, () => { S.tiles[i] = v; S.tA[i] = 0; anim(S, 500, (k) => { S.tA[i] = k; }); const r = this.rect(i); burst(S, r.x + r.w / 2, r.y + r.h / 2, { n: 10, colors: [ok ? YOU : FOE, '#fff', GOLD], speed: 120 }); });
      });
      const a = this.anchor(S, who);
      anim(S, 300, null, () => say(S, a.x, a.y, ok ? S.cfg.yay : S.cfg.boo, ok ? '#fde047' : '#fecaca'));
      return 200 + n * 230 + 600;
    }
  };

  /* ---------- Jinak bom ---------- */
  function bez(p0, p1, p2, p3, t) { const u = 1 - t; return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y }; }
  T.bomb = {
    solo: true,
    init(S) { S.wires = ['#ef4444', '#3b82f6', '#facc15', '#22c55e'].slice(0, Math.max(1, Math.min(4, S.N))).map((col, i) => ({ col, cut: 0, i })); S.timer = 40; S.timerV = 40; S.flash = 0; S.state = 'armed'; S.boomK = 0; },
    pts(S, w) { const bx = 200, by = 170, n = S.wires.length; const y1 = by - 26 + w.i * (60 / Math.max(1, n - 1 || 1)), y2 = 118 + w.i * 30; return [{ x: bx + 54, y: y1 }, { x: bx + 110, y: y1 }, { x: 330, y: y2 }, { x: 392, y: y2 }]; },
    anchor() { return { x: 200, y: 92 }; },
    update(S, dt) {
      S.timerV += (S.timer - S.timerV) * (1 - Math.exp(-dt * 5)); S.flash = Math.max(0, S.flash - dt * 2);
      if (S.state === 'armed' && !reduced && Math.random() < dt * 22) S.parts.push({ x: 238 + Math.random() * 4, y: 64, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 60, g: 200, life: 0.4, max: 0.4, size: 2.5, color: Math.random() < 0.5 ? '#fde047' : '#f97316' });
    },
    draw(c, S) {
      const bx = 200, by = 170;
      S.wires.forEach((w) => {
        const P = this.pts(S, w); c.strokeStyle = w.col; c.lineWidth = 6; c.lineCap = 'round';
        const seg = (a, b) => { c.beginPath(); for (let k = 0; k <= 14; k++) { const q = bez(P[0], P[1], P[2], P[3], lerp(a, b, k / 14)); if (k) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); } c.stroke(); };
        if (w.cut <= 0) seg(0, 1);
        else { const g = 0.08 * eo(w.cut); seg(0, 0.5 - g); seg(0.5 + g, 1); const m = bez(P[0], P[1], P[2], P[3], 0.5); emo(c, '✅', m.x, m.y - 14 * eo(w.cut), 18 * eo(w.cut)); }
        c.lineCap = 'butt';
      });
      const safe = S.state === 'safe';
      const g = c.createRadialGradient(bx - 20, by - 24, 8, bx, by, 66); g.addColorStop(0, safe ? '#4ade80' : '#4b5563'); g.addColorStop(1, safe ? '#166534' : '#111827');
      c.fillStyle = g; c.beginPath(); c.arc(bx, by, 62, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(bx - 24, by - 28, 14, 8, -0.6, 0, TAU); c.fill();
      c.fillStyle = '#374151'; c.fillRect(bx + 16, by - 74, 24, 16); c.strokeRect(bx + 16, by - 74, 24, 16);
      c.strokeStyle = '#a16207'; c.lineWidth = 4; c.beginPath(); c.moveTo(bx + 28, by - 74); c.quadraticCurveTo(bx + 32, by - 98, bx + 40, by - 106); c.stroke();
      const px = 392, py = 96;
      c.fillStyle = '#0b1220'; rr(c, px, py, 214, 138, 14); c.fill(); c.strokeStyle = '#475569'; c.lineWidth = 3; c.stroke();
      c.fillStyle = safe ? '#4ade80' : (S.flash > 0 && Math.sin(S.t * 30) > 0 ? '#fecaca' : '#ef4444');
      c.font = '700 46px ui-monospace, Consolas, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(`00:${String(Math.max(0, Math.round(S.timerV))).padStart(2, '0')}`, px + 107, py + 54);
      c.font = `700 12px ${TF}`; c.fillStyle = '#94a3b8';
      c.fillText(safe ? 'BOM AMAN ✓' : S.state === 'boom' ? 'MELEDAK!' : 'POTONG KABEL', px + 107, py + 104);
      if (S.flash > 0) { c.fillStyle = `rgba(239,68,68,${(S.flash * 0.22).toFixed(3)})`; c.fillRect(0, 0, W, H); }
      if (S.state === 'boom') { const k = eo(S.boomK); c.fillStyle = `rgba(255,237,213,${(0.8 * (1 - k)).toFixed(3)})`; c.fillRect(0, 0, W, H); emo(c, '💥', bx, by, 60 + 110 * k, { alpha: 1 - k * 0.3 }); }
    },
    event(S, ok) {
      if (ok) {
        const w = S.wires.find((x) => !x.cut);
        if (w) { anim(S, 500, (k) => { w.cut = Math.max(0.001, k); }); const P = this.pts(S, w), m = bez(P[0], P[1], P[2], P[3], 0.5); burst(S, m.x, m.y, { n: 10, colors: ['#fde047', '#fff'], speed: 120 }); say(S, m.x, m.y - 36, S.cfg.yay, '#bbf7d0'); }
      } else {
        S.timer = Math.max(5, S.timer - 10); S.flash = 1;
        burst(S, 240, 64, { n: 14, colors: ['#fde047', '#f97316'], speed: 150 });
        say(S, 499, 82, S.cfg.boo, '#fecaca', 20);
      }
      return 900;
    },
    end(S, res) {
      if (res.win) { S.state = 'safe'; say(S, 200, 70, 'Bom berhasil dijinakkan!', '#bbf7d0', 20); }
      else { S.state = 'boom'; anim(S, 900, (k) => { S.boomK = k; }); burst(S, 200, 170, { n: 26, emojis: ['💥', '💨', '🔥'], speed: 220, size: 26 }); }
    }
  };

  /* ---------- Kumpulkan (harta, dagang, lelang, panggung, detektif) ---------- */
  T.collect = {
    init(S) { S.boxes = { you: [], foe: [] }; S.prop = { x: W / 2, y: 128, rot: 0 }; S.flying = []; S.popB = { you: 0, foe: 0 }; S.flashW = 0; },
    box(who) { return who === 'you' ? { x: 24, y: 184, w: 182, h: 100 } : { x: W - 206, y: 184, w: 182, h: 100 }; },
    anchor(S, who) { const r = this.box(who); return { x: r.x + r.w / 2, y: r.y - 20 }; },
    update(S, dt) { S.popB.you = Math.max(0, S.popB.you - dt * 3); S.popB.foe = Math.max(0, S.popB.foe - dt * 3); S.prop.rot *= Math.exp(-dt * 8); S.flashW = Math.max(0, S.flashW - dt * 2.2); },
    draw(c, S) {
      const k = S.th.pedestal, x = W / 2, y = 168;
      if (k === 'island') { c.fillStyle = '#fde68a'; c.beginPath(); c.ellipse(x, y + 8, 112, 30, 0, 0, TAU); c.fill(); c.fillStyle = '#86efac'; c.beginPath(); c.ellipse(x - 26, y + 2, 56, 14, 0, 0, TAU); c.fill(); emo(c, '🌴', x - 76, y - 26, 40); }
      else if (k === 'table') { c.fillStyle = '#92400e'; c.fillRect(x - 96, y, 192, 14); c.fillRect(x - 84, y + 14, 10, 44); c.fillRect(x + 74, y + 14, 10, 44); emo(c, '🍍', x - 64, y - 14, 26); emo(c, '🥥', x + 66, y - 12, 24); }
      else if (k === 'podium') { c.fillStyle = '#a16207'; rr(c, x - 62, y - 2, 124, 64, 8); c.fill(); c.strokeStyle = '#fde047'; c.lineWidth = 3; c.stroke(); }
      else if (k === 'paper') { c.save(); c.translate(x, y - 42); c.rotate(-0.04); c.fillStyle = '#fef3c7'; c.fillRect(-96, -56, 192, 126); c.strokeStyle = 'rgba(13,27,46,.25)'; c.lineWidth = 1; for (let ly = -30; ly < 60; ly += 14) { c.beginPath(); c.moveTo(-80, ly); c.lineTo(80, ly); c.stroke(); } c.restore(); emo(c, '📌', x - 84, y - 96, 18); emo(c, '📌', x + 84, y - 96, 18); }
      if (S.flashW > 0) { const g = c.createRadialGradient(x, S.prop.y, 4, x, S.prop.y, 120); g.addColorStop(0, `rgba(255,255,255,${(0.8 * S.flashW).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x - 130, S.prop.y - 130, 260, 260); }
      const scan = S.cfg.flair === 'scan' ? Math.cos(S.t * 2) * 22 : 0;
      emo(c, S.cfg.prop, x + scan, S.prop.y + Math.sin(S.t * 2) * 3, 58, { rot: S.prop.rot });
      ['you', 'foe'].forEach((who) => {
        const r = this.box(who), col = who === 'you' ? YOU : FOE, s = 1 + S.popB[who] * 0.08, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
        c.fillStyle = 'rgba(255,255,255,.94)'; rr(c, r.x, r.y, r.w, r.h, 16); c.fill(); c.lineWidth = 3; c.strokeStyle = col; c.stroke();
        c.fillStyle = col; rr(c, r.x, r.y, r.w, 26, 13); c.fill();
        c.fillStyle = '#fff'; c.font = `700 13px ${TF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(`${who === 'you' ? 'Kamu' : 'Lawan'}: ${S.boxes[who].length}`, cx, r.y + 14);
        S.boxes[who].forEach((e, i) => emo(c, e, r.x + 30 + (i % 4) * 41, r.y + 52 + ((i / 4) | 0) * 30, 28));
        c.restore();
      });
      S.flying.forEach((f) => { const q = eo((S.t - f.t0) / f.dur); emo(c, f.e, lerp(f.x0, f.x1, q), lerp(f.y0, f.y1, q) - Math.sin(q * Math.PI) * 70, 32 + Math.sin(q * Math.PI) * 10); });
    },
    event(S, ok) {
      const who = ok ? 'you' : 'foe', items = S.cfg.items, e = items[(S.p + S.r - 1) % items.length];
      if (S.cfg.flair === 'bang') anim(S, 320, (k) => { S.prop.rot = -0.7 * Math.sin(k * Math.PI); });
      if (S.cfg.flair === 'dig') burst(S, S.prop.x, S.prop.y + 30, { n: 14, colors: ['#fcd34d', '#d97706', '#fde68a'], speed: 140, up: 120 });
      if (S.cfg.flair === 'flash') S.flashW = 1;
      const r = this.box(who), len = S.boxes[who].length;
      const f = { e, t0: 0, dur: 0.65, x0: S.prop.x, y0: S.prop.y, x1: r.x + 30 + (len % 4) * 41, y1: r.y + 52 + ((len / 4) | 0) * 30 };
      anim(S, 220, null, () => { f.t0 = S.t; S.flying.push(f); });
      anim(S, 900, null, () => {
        S.flying.splice(S.flying.indexOf(f), 1); S.boxes[who].push(e); S.popB[who] = 1;
        burst(S, f.x1, f.y1, { n: 10, colors: ['#fde047', '#fff'], speed: 100 });
        say(S, r.x + r.w / 2, r.y - 22, ok ? S.cfg.yay : S.cfg.boo, ok ? '#fde047' : '#fecaca');
      });
      return 1150;
    }
  };

  /* ---------- Ular tangga ---------- */
  T.board = {
    init(S) { S.ox = 140; S.oy = 36; S.cw = 64; S.ch = 56; S.sq = { you: 1, foe: 1 }; S.hop = { you: 0, foe: 0 }; S.dice = { v: 1, roll: false }; },
    xy(S, n) { n = clamp(n, 1, 20); const row = ((n - 1) / 5) | 0, ci = (n - 1) % 5, col = row % 2 ? 4 - ci : ci; return { x: S.ox + col * S.cw + S.cw / 2, y: S.oy + (3 - row) * S.ch + S.ch / 2 }; },
    anchor(S, who) { const p = this.xy(S, S.sq[who]); return { x: p.x, y: p.y - 34 }; },
    update(S, dt) { S.hop.you = Math.max(0, S.hop.you - dt * 7); S.hop.foe = Math.max(0, S.hop.foe - dt * 7); },
    ladder(c, a, b) { const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), nx = -dy / L * 8, ny = dx / L * 8; c.strokeStyle = '#92400e'; c.lineWidth = 3.5; [1, -1].forEach((s) => { c.beginPath(); c.moveTo(a.x + nx * s, a.y + ny * s); c.lineTo(b.x + nx * s, b.y + ny * s); c.stroke(); }); for (let k = 0.12; k < 1; k += 0.16) { c.beginPath(); c.moveTo(a.x + dx * k + nx, a.y + dy * k + ny); c.lineTo(a.x + dx * k - nx, a.y + dy * k - ny); c.stroke(); } },
    snake(c, a, b, S) { c.strokeStyle = '#16a34a'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); for (let k = 0; k <= 20; k++) { const t = k / 20, x = lerp(a.x, b.x, t) + Math.sin(t * Math.PI * 3 + S.t * 2) * 10, y = lerp(a.y, b.y, t); if (k) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); c.lineCap = 'butt'; c.fillStyle = '#15803d'; c.beginPath(); c.arc(a.x, a.y, 8, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.fillRect(a.x - 4, a.y - 3, 2.5, 2.5); c.fillRect(a.x + 2, a.y - 3, 2.5, 2.5); },
    draw(c, S) {
      for (let n = 1; n <= 20; n++) { const p = this.xy(S, n); c.fillStyle = n === 20 ? '#bbf7d0' : n % 2 ? '#fef3c7' : '#fcd34d'; c.fillRect(p.x - S.cw / 2, p.y - S.ch / 2, S.cw, S.ch); c.fillStyle = 'rgba(13,27,46,.55)'; c.font = `700 11px ${TF}`; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(String(n), p.x - S.cw / 2 + 4, p.y - S.ch / 2 + 3); }
      c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(S.ox, S.oy, S.cw * 5, S.ch * 4);
      const fin = this.xy(S, 20); emo(c, '🏁', fin.x + 8, fin.y + 6, 22);
      this.ladder(c, this.xy(S, 3), this.xy(S, 9)); this.ladder(c, this.xy(S, 11), this.xy(S, 17));
      this.snake(c, this.xy(S, 16), this.xy(S, 7), S); this.snake(c, this.xy(S, 19), this.xy(S, 13), S);
      ['foe', 'you'].forEach((who) => {
        const p = this.xy(S, S.sq[who]), col = who === 'you' ? YOU : FOE, off = S.sq.you === S.sq.foe ? (who === 'you' ? -11 : 11) : 0, hy = -Math.sin(S.hop[who] * Math.PI) * 14;
        c.fillStyle = col; c.beginPath(); c.arc(p.x + off, p.y + 6 + hy, 13, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 2.5; c.stroke();
        c.fillStyle = '#fff'; c.font = `700 12px ${TF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(who === 'you' ? 'K' : 'L', p.x + off, p.y + 7 + hy);
      });
      const dx = 522, dy = 108, ds = 64;
      c.fillStyle = '#fff'; rr(c, dx, dy, ds, ds, 14); c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
      const v = S.dice.v, pips = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[v];
      c.fillStyle = INK;
      if (pips) pips.forEach(([a, b]) => { c.beginPath(); c.arc(dx + ds / 2 + a * 17, dy + ds / 2 + b * 17, 5.5, 0, TAU); c.fill(); });
      else { c.font = `700 28px ${TF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(v), dx + ds / 2, dy + ds / 2 + 2); }
      c.font = `700 12px ${TF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = INK; c.fillText('Dadu', dx + ds / 2, dy + ds + 16);
      chip(c, 'K = Kamu', 70, 120, YOU); chip(c, 'L = Lawan', 70, 150, FOE);
    },
    event(S, ok) {
      const who = ok ? 'you' : 'foe', count = ok ? S.p : S.r, target = 1 + Math.round((count / S.N) * 19), from = S.sq[who], steps = Math.max(0, target - from);
      S.dice.roll = true; anim(S, 420, () => { S.dice.v = 1 + ((Math.random() * 6) | 0); }, () => { S.dice.roll = false; S.dice.v = Math.max(1, steps); });
      for (let i = 1; i <= steps; i++) { const n = from + i; anim(S, 420 + i * 150, null, () => { S.sq[who] = n; S.hop[who] = 1; }); }
      const end = 420 + steps * 150;
      anim(S, end + 40, null, () => { const a = this.anchor(S, who); say(S, a.x, a.y - 8, ok ? S.cfg.yay : S.cfg.boo, ok ? '#1d4ed8' : '#b91c1c'); if (S.sq[who] >= 20) burst(S, a.x, a.y + 30, { n: 16, colors: [GOLD, '#fff', YOU], speed: 140 }); });
      return end + 450;
    }
  };

  /* ---------- Tata surya (modul ajar) ---------- */
  T.planets = {
    solo: true,
    init(S) {
      S.sun = { x: 52, y: 160 };
      S.pl = [
        { n: 'Merkurius', r: 96, s: 7, c: '#a8a29e', sp: 1.0, a: 0.3 },
        { n: 'Venus', r: 156, s: 11, c: '#fbbf24', sp: 0.78, a: -0.45 },
        { n: 'Bumi', r: 220, s: 12, c: '#3b82f6', sp: 0.62, a: 0.55, e: '🌍' },
        { n: 'Mars', r: 284, s: 10, c: '#dc2626', sp: 0.5, a: -0.25 },
        { n: 'Jupiter', r: 350, s: 20, c: '#d6a36b', sp: 0.38, a: 0.2 }
      ].map((p) => Object.assign(p, { show: 0 }));
      S.comet = null;
    },
    ppos(S, p) { const a = p.a + Math.sin(S.t * p.sp * 0.4) * 0.5; return { x: S.sun.x + Math.cos(a) * p.r, y: S.sun.y + Math.sin(a) * p.r * 0.42 }; },
    anchor() { return { x: 330, y: 64 }; },
    draw(c, S) {
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1.5;
      S.pl.forEach((p) => { c.beginPath(); c.ellipse(S.sun.x, S.sun.y, p.r, p.r * 0.42, 0, 0, TAU); c.stroke(); });
      const g = c.createRadialGradient(S.sun.x, S.sun.y, 10, S.sun.x, S.sun.y, 90); g.addColorStop(0, '#fff7ae'); g.addColorStop(0.35, '#fbbf24'); g.addColorStop(1, 'rgba(251,191,36,0)');
      c.fillStyle = g; c.beginPath(); c.arc(S.sun.x, S.sun.y, 90, 0, TAU); c.fill();
      c.fillStyle = '#f59e0b'; c.beginPath(); c.arc(S.sun.x, S.sun.y, 40, 0, TAU); c.fill();
      S.pl.forEach((p) => {
        if (!p.show) return; const q = this.ppos(S, p), s = p.s * eo(p.show);
        if (p.e) emo(c, p.e, q.x, q.y, s * 2.3);
        else { c.fillStyle = p.c; c.beginPath(); c.arc(q.x, q.y, s, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.stroke(); }
        c.fillStyle = '#e0e7ff'; c.font = `700 12px ${TF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.n, q.x, q.y - s - 12);
      });
      if (S.comet) {
        const k = (S.t - S.comet.t0) / 0.9;
        if (k > 1) S.comet = null;
        else { const x = lerp(W + 30, 120, k), y = lerp(30, 230, k); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 60, y - 30); c.stroke(); emo(c, '☄️', x, y, 30); }
      }
    },
    event(S, ok) {
      if (ok) {
        const p = S.pl.find((x) => !x.show);
        if (p) { anim(S, 600, (k) => { p.show = Math.max(0.001, k); }); anim(S, 80, null, () => { const q = this.ppos(S, p); burst(S, q.x, q.y, { n: 14, colors: ['#fff', '#fde047', '#93c5fd'], speed: 120, g: 0 }); say(S, q.x, q.y - 34, `${p.n}!`, '#fde047'); }); }
      } else { S.comet = { t0: S.t }; say(S, 340, 90, S.cfg.boo, '#fecaca'); }
      return 900;
    }
  };

  /* ---------- Game anak (PAUD/SD) ---------- */
  const BALLOON = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7'];
  const WAGON = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];
  T.kid = {
    solo: true,
    init(S) {
      S.items = Array.from({ length: S.N }, (_, i) => ({ i, state: 0, k: 0, wig: 0, hk: 0 }));
      S.got = 0; S.gotPop = 0; S.fw = []; S.ball = null; S.wagons = 0; S.slide = 1;
      const th = S.cfg.theme;
      S.dst = th === 'aqua' ? { x: 566, y: 84, size: 50 } : th === 'orchard' ? { x: 530, y: 238, size: 66 } : { x: 534, y: 150, size: 100 };
    },
    spread(S, i, a, b) { return S.N > 1 ? lerp(a, b, i / (S.N - 1)) : (a + b) / 2; },
    src(S, it) {
      const th = S.cfg.theme, i = it.i;
      if (th === 'aqua') return { x: this.spread(S, i, 80, 430) + Math.sin(S.t * 0.9 + i * 1.7) * 24, y: 176 + (i % 2) * 54 + Math.sin(S.t * 2 + i) * 4 };
      if (th === 'orchard') { const P = [[150, 98], [236, 86], [186, 142], [262, 136]]; const p = P[i % 4]; return { x: p[0], y: p[1] + Math.sin(S.t * 2 + i) * 2 }; }
      const P = [[80, 236], [168, 258], [256, 238], [344, 260]]; const p = P[i % 4]; return { x: p[0], y: p[1] - Math.abs(Math.sin(S.t * 3 + i)) * 4 };
    },
    anchor() { return { x: W / 2, y: 72 }; },
    update(S, dt) { S.gotPop = Math.max(0, S.gotPop - dt * 3); S.items.forEach((it) => { it.wig = Math.max(0, it.wig - dt * 2.5); }); },
    draw(c, S) {
      const fx = S.cfg.fx;
      if (fx === 'fly') {
        if (S.cfg.theme === 'orchard') { c.fillStyle = '#92400e'; c.fillRect(192, 150, 20, 104); c.fillStyle = '#22c55e'; [[202, 112, 66], [150, 132, 46], [256, 128, 48], [204, 76, 46]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }); }
        if (S.cfg.theme === 'aqua') { c.fillStyle = '#92400e'; c.fillRect(492, 108, 148, 12); c.fillRect(510, 120, 8, 40); c.fillRect(600, 120, 8, 40); emo(c, '🎣', 612, 70, 34); }
        emo(c, S.cfg.dst, S.dst.x, S.dst.y, S.dst.size * (1 + S.gotPop * 0.12));
        if (S.got) { c.fillStyle = GOLD; c.beginPath(); c.arc(S.dst.x + S.dst.size * 0.4, S.dst.y - S.dst.size * 0.38, 13, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); c.fillStyle = INK; c.font = `700 13px ${TF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(S.got), S.dst.x + S.dst.size * 0.4, S.dst.y - S.dst.size * 0.38 + 1); }
        S.items.forEach((it) => {
          if (it.state === 2) return;
          let p = this.src(S, it);
          if (it.state === 1) { const q = eo(it.k); p = { x: lerp(it.x0, S.dst.x, q), y: lerp(it.y0, S.dst.y - 8, q) - Math.sin(q * Math.PI) * 80 }; }
          const wig = it.wig ? Math.sin(S.t * 40) * 6 * it.wig : 0;
          emo(c, S.cfg.src[it.i % S.cfg.src.length], p.x + wig, p.y, S.cfg.theme === 'farm' ? 44 : 36, { flip: S.cfg.theme === 'aqua' && it.state === 0 && Math.cos(S.t * 0.9 + it.i * 1.7) > 0 });
        });
      }
      if (fx === 'pop') {
        S.items.forEach((it) => {
          if (it.state === 2) return;
          const x = this.spread(S, it.i, 120, 520) + (it.wig ? Math.sin(S.t * 40) * 5 * it.wig : 0), y = 140 + Math.sin(S.t * 1.5 + it.i) * 8;
          c.strokeStyle = 'rgba(13,27,46,.45)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y + 38); c.quadraticCurveTo(x + 8, y + 80, x - 2, 266); c.stroke();
          c.fillStyle = BALLOON[it.i % 4]; c.beginPath(); c.ellipse(x, y, 30, 37, 0, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
          c.beginPath(); c.moveTo(x - 5, y + 40); c.lineTo(x + 5, y + 40); c.lineTo(x, y + 34); c.closePath(); c.fill();
          c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(x - 10, y - 14, 7, 11, -0.4, 0, TAU); c.fill();
          c.fillStyle = '#fff'; c.font = `700 30px ${TF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText((S.cfg.letters || [])[it.i % 4] || '★', x, y + 2);
        });
      }
      if (fx === 'wagon') {
        const fx0 = 600, base = 254;
        for (let k = 0; k < S.wagons; k++) {
          const isNew = k === S.wagons - 1, off = isNew ? (1 - eo(S.slide)) * -520 : 0, xr = fx0 - 140 - k * 100 + off;
          c.fillStyle = WAGON[k % 4]; rr(c, xr - 88, base - 46, 88, 36, 6); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
          c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(xr - 76, base - 40, 26, 14); c.fillRect(xr - 40, base - 40, 26, 14);
          c.fillStyle = INK; c.fillRect(xr, base - 26, 12, 4);
          [xr - 70, xr - 18].forEach((wx) => { c.beginPath(); c.arc(wx, base - 6, 9, 0, TAU); c.fill(); });
        }
        const lx = fx0, by = base, bob = Math.sin(S.t * 8) * 0.8;
        c.fillStyle = '#dc2626'; rr(c, lx - 116, by - 48 + bob, 86, 38, 8); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#2563eb'; rr(c, lx - 136, by - 72 + bob, 44, 62, 6); c.fill(); c.stroke();
        c.fillStyle = '#bae6fd'; c.fillRect(lx - 128, by - 64 + bob, 26, 18);
        c.fillStyle = '#111827'; c.fillRect(lx - 56, by - 70 + bob, 14, 24);
        c.fillStyle = GOLD; c.beginPath(); c.moveTo(lx - 30, by - 30); c.lineTo(lx - 6, by - 8); c.lineTo(lx - 30, by - 8); c.closePath(); c.fill();
        c.fillStyle = INK; [lx - 120, lx - 88, lx - 52].forEach((wx) => { c.beginPath(); c.arc(wx, by - 6, 11, 0, TAU); c.fill(); });
        if (!reduced && Math.random() < 0.08) S.parts.push({ x: lx - 49, y: by - 72, vx: -20, vy: -40, g: -10, life: 1, max: 1, size: 9, color: 'rgba(226,232,240,.8)' });
      }
      if (fx === 'firework') {
        S.items.forEach((it) => { const x = this.spread(S, it.i, 130, 510); c.fillStyle = '#7c3aed'; c.fillRect(x - 7, 254, 14, 20); c.fillStyle = '#fde047'; c.fillRect(x - 7, 252, 14, 4); });
        S.fw.forEach((f) => { const k = clamp((S.t - f.t0) / 0.6, 0, 1); if (k >= 1) return; const y = lerp(250, f.y1, eo(k)); c.strokeStyle = 'rgba(253,224,71,.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(f.x, y + 22); c.lineTo(f.x, y); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(f.x, y, 3, 0, TAU); c.fill(); });
      }
      if (fx === 'hatch') {
        c.fillStyle = '#a16207'; c.beginPath(); c.ellipse(W / 2, 262, 230, 26, 0, 0, TAU); c.fill();
        c.strokeStyle = '#ca8a04'; c.lineWidth = 2; for (let x = W / 2 - 210; x < W / 2 + 210; x += 16) { c.beginPath(); c.moveTo(x, 252); c.lineTo(x + 18, 270); c.stroke(); }
        S.items.forEach((it) => {
          const x = W / 2 + (it.i - (S.N - 1) / 2) * 104, y = 226;
          if (it.state < 2) {
            const sh = it.state === 1 ? Math.sin(S.t * 50) * 0.18 * (1 - it.k) : it.wig ? Math.sin(S.t * 40) * 0.12 * it.wig : 0;
            c.save(); c.translate(x, y + 18); c.rotate(sh); c.fillStyle = '#fef9c3'; c.beginPath(); c.ellipse(0, -18, 26, 33, 0, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
            c.fillStyle = '#a3e635'; [[-9, -30, 5], [8, -16, 6], [-6, -4, 4]].forEach(([a, b, r]) => { c.beginPath(); c.arc(a, b, r, 0, TAU); c.fill(); });
            c.restore();
          } else {
            const k = eo(it.hk);
            c.fillStyle = '#fef9c3'; c.strokeStyle = INK; c.lineWidth = 2;
            c.beginPath(); c.ellipse(x, y + 18, 26, 16, 0, 0, Math.PI); c.closePath(); c.fill(); c.stroke();
            c.save(); c.translate(x + 26 * k, y - 18 - 14 * k); c.rotate(0.9 * k); c.beginPath(); c.ellipse(0, 0, 22, 14, 0, Math.PI, TAU); c.closePath(); c.fill(); c.stroke(); c.restore();
            emo(c, (S.cfg.hatch || ['🐣'])[it.i % (S.cfg.hatch || ['🐣']).length], x, y - 4 - 12 * k, 20 + 26 * k);
          }
        });
      }
      if (fx === 'hoop') {
        const hx = 540, hy = 128;
        c.fillStyle = '#64748b'; c.fillRect(584, hy - 6, 8, H - hy);
        c.fillStyle = '#fff'; c.fillRect(566, hy - 58, 14, 76); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(566, hy - 58, 14, 76);
        c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.5;
        for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(hx + k * 11, hy + 2); c.lineTo(hx + k * 6, hy + 36); c.stroke(); }
        c.beginPath(); c.moveTo(hx - 22, hy + 14); c.lineTo(hx + 22, hy + 14); c.moveTo(hx - 16, hy + 26); c.lineTo(hx + 16, hy + 26); c.stroke();
        c.strokeStyle = '#dc2626'; c.lineWidth = 4; c.beginPath(); c.ellipse(hx, hy, 26, 6, 0, 0, TAU); c.stroke();
        emo(c, '🧒', 104, 214, 52);
        if (S.ball) {
          const k = clamp((S.t - S.ball.t0) / 0.9, 0, 1); let x, y;
          if (S.ball.ok) { if (k < 0.8) { const q = k / 0.8; x = lerp(140, hx, q); y = lerp(196, hy - 4, q) - Math.sin(q * Math.PI) * 120; } else { const q = (k - 0.8) / 0.2; x = hx; y = lerp(hy - 4, hy + 44, q); } }
          else { if (k < 0.65) { const q = k / 0.65; x = lerp(140, hx - 26, q); y = lerp(196, hy - 6, q) - Math.sin(q * Math.PI) * 110; } else { const q = (k - 0.65) / 0.35; x = lerp(hx - 26, hx - 140, q); y = lerp(hy - 6, 250, q) - Math.sin(q * Math.PI) * 40; } }
          emo(c, '🏀', x, y, 28, { rot: S.t * 8 });
        } else emo(c, '🏀', 140, 196, 28);
      }
    },
    event(S, ok) {
      const fx = S.cfg.fx, it = S.items.find((x) => x.state === 0);
      if (!ok) {
        if (it) it.wig = 1;
        if (fx === 'hoop') S.ball = { t0: S.t, ok: false };
        if (fx === 'firework') burst(S, this.spread(S, it ? it.i : 0, 130, 510), 230, { n: 8, colors: ['#94a3b8'], speed: 60, up: 20 });
        say(S, W / 2, 72, 'Coba lagi, ya!', '#fecaca', 20);
        return 900;
      }
      if (!it) return 300;
      const yay = () => { S.got++; S.gotPop = 1; };
      if (fx === 'fly') {
        const p = this.src(S, it); it.state = 1; it.x0 = p.x; it.y0 = p.y;
        anim(S, 700, (k) => { it.k = k; }, () => { it.state = 2; yay(); burst(S, S.dst.x, S.dst.y - 20, { n: 12, colors: [GOLD, '#fff'], speed: 120 }); say(S, S.dst.x, S.dst.y - S.dst.size * 0.7, S.cfg.yay, '#fde047'); });
        return 1000;
      }
      if (fx === 'pop') {
        const x = this.spread(S, it.i, 120, 520), y = 140;
        it.state = 1;
        anim(S, 160, null, () => { it.state = 2; yay(); burst(S, x, y, { n: 22, colors: [BALLOON[it.i % 4], '#fff', GOLD], speed: 220 }); burst(S, x, y, { n: 1, emojis: ['💥'], speed: 10, size: 40, g: 0, life: 0.5 }); say(S, x, y - 50, S.cfg.yay, '#fde047'); });
        return 800;
      }
      if (fx === 'wagon') {
        it.state = 2; S.wagons++; S.slide = 0;
        anim(S, 750, (k) => { S.slide = k; }, () => { yay(); burst(S, 548, 180, { n: 8, colors: ['rgba(226,232,240,.9)'], speed: 70, g: -30, size: 10, life: 1 }); say(S, 420, 150, S.cfg.yay, '#fde047'); });
        return 1000;
      }
      if (fx === 'firework') {
        const x = this.spread(S, it.i, 130, 510), y1 = 70 + Math.random() * 50; it.state = 2;
        const f = { x, y1, t0: S.t }; S.fw.push(f);
        anim(S, 600, null, () => { S.fw.splice(S.fw.indexOf(f), 1); yay(); const cols = [['#f43f5e', '#fde047'], ['#22d3ee', '#a855f7'], ['#4ade80', '#fde047'], ['#fb923c', '#fff']][it.i % 4]; burst(S, x, y1, { n: 46, colors: cols.concat('#fff'), speed: 170, up: 0, g: 40, life: 1.4, size: 3.5 }); say(S, x, y1 - 30, S.cfg.yay, '#fde047'); });
        return 1100;
      }
      if (fx === 'hatch') {
        it.state = 1;
        anim(S, 500, (k) => { it.k = k; }, () => { it.state = 2; it.hk = 0; anim(S, 500, (k) => { it.hk = k; }); yay(); const x = W / 2 + (it.i - (S.N - 1) / 2) * 104; burst(S, x, 200, { n: 10, emojis: ['💛', '✨'], speed: 90, size: 16 }); say(S, x, 150, S.cfg.yay, '#15803d'); });
        return 1100;
      }
      if (fx === 'hoop') {
        S.ball = { t0: S.t, ok: true }; it.state = 2;
        anim(S, 900, null, () => { S.ball = null; yay(); burst(S, 540, 160, { n: 12, colors: [GOLD, '#fff'], speed: 120 }); say(S, 470, 90, S.cfg.yay, '#fff'); });
        return 1050;
      }
      return 600;
    },
    end(S, res) { say(S, W / 2, 110, res.win ? 'Hebat sekali!' : 'Ayo coba lagi!', res.win ? '#fde047' : '#fff', 24); }
  };

  /* ------------------------------ Mesin utama ------------------------------ */
  function hud(c, S) {
    if (S.solo) {
      const n = S.N, gap = 30, w = (n - 1) * gap + 46, x0 = W / 2 - w / 2;
      c.fillStyle = 'rgba(255,255,255,.9)'; rr(c, x0, 8, w, 34, 17); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
      for (let i = 0; i < n; i++) {
        const x = x0 + 23 + i * gap;
        if (i < S.stars) emo(c, '⭐', x, 26, 22);
        else { c.fillStyle = '#cbd5e1'; c.font = `22px ${TF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('★', x, 27); }
      }
      return;
    }
    const pill = (txt, x, col, right) => { c.font = `700 13px ${TF}`; const w = c.measureText(txt).width + 22; const px = right ? x - w : x; c.fillStyle = col; rr(c, px, 8, w, 26, 13); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, px + w / 2, 22); };
    pill(`Kamu ${S.ps}`, 8, YOU, false); pill(`Lawan ${S.rs}`, W - 8, FOE, true);
  }
  function drawParts(c, S) {
    S.parts.forEach((p) => { c.globalAlpha = clamp(p.life / p.max, 0, 1); if (p.e) emo(c, p.e, p.x, p.y, p.size); else { c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); } });
    c.globalAlpha = 1;
  }
  function drawTexts(c, S) {
    S.texts.forEach((t) => {
      const k = 1 - t.life / t.max; c.globalAlpha = clamp(t.life / (t.max * 0.35), 0, 1);
      c.font = `700 ${t.size}px ${TF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      const y = t.y - k * 24; c.lineWidth = 5; c.strokeStyle = INK; c.strokeText(t.txt, t.x, y); c.fillStyle = t.col; c.fillText(t.txt, t.x, y);
    });
    c.globalAlpha = 1;
  }
  function endFx(c, S, type) {
    const res = S.end.res; if (res.solo || !type.anchor) return;
    const bounce = Math.abs(Math.sin((S.t - S.end.t0) * 4)) * 6;
    if (res.tie) { emo(c, '🤝', W / 2, 70 - bounce, 40); return; }
    const a = type.anchor(S, res.win ? 'you' : 'foe');
    emo(c, '🏆', a.x, a.y - 20 - bounce, 36);
  }

  function create(canvas, id, n) {
    const cfg = Object.assign({}, CFG[id] || FALLBACK);
    const type = T[cfg.type] || T.collect;
    const S = { cfg, th: THEMES[cfg.theme] || THEMES.stage, N: Math.max(1, n | 0), p: 0, r: 0, pv: 0, rv: 0, ps: 0, rs: 0, stars: 0, t: 0, anims: [], parts: [], texts: [], solo: !!type.solo, end: null };
    type.init(S);
    const c = canvas.getContext('2d');
    let scale = 1, raf = 0, last = 0, visible = true, alive = true;
    function fit() {
      const w = canvas.clientWidth || 600, dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round((w * dpr * H) / W)); scale = canvas.width / W;
    }
    fit();
    const ro = window.ResizeObserver ? new ResizeObserver(fit) : null; if (ro) ro.observe(canvas);
    const io = window.IntersectionObserver ? new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; }) : null; if (io) io.observe(canvas);
    function step(dt) {
      S.t += dt;
      const rate = 1 - Math.exp(-dt * (reduced ? 14 : 3.2));
      S.pv += (S.p - S.pv) * rate; S.rv += (S.r - S.rv) * rate;
      S.anims.slice().forEach((a) => { const k = (S.t - a.t0) / a.dur; if (a.update) a.update(clamp(k, 0, 1)); if (k >= 1) { const i = S.anims.indexOf(a); if (i >= 0) S.anims.splice(i, 1); if (a.done) a.done(); } });
      for (let i = S.parts.length - 1; i >= 0; i--) { const p = S.parts[i]; p.life -= dt; if (p.life <= 0) { S.parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      for (let i = S.texts.length - 1; i >= 0; i--) { S.texts[i].life -= dt; if (S.texts[i].life <= 0) S.texts.splice(i, 1); }
      if (type.update) type.update(S, dt);
    }
    function render() {
      c.setTransform(scale, 0, 0, scale, 0, 0); c.clearRect(0, 0, W, H);
      bg(c, S); type.draw(c, S); drawParts(c, S); drawTexts(c, S); hud(c, S);
      if (S.end) endFx(c, S, type);
    }
    function frame(ts) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const now = ts / 1000, dt = Math.min(0.05, last ? now - last : 0.016); last = now;
      if (!visible) return;
      step(dt); render();
    }
    render();
    raf = requestAnimationFrame(frame);
    return {
      answer(ok) {
        if (S.end) return Promise.resolve();
        if (ok) S.p++; else S.r++;
        const ms = type.event(S, ok) || 900;
        anim(S, Math.min(ms, 750), null, () => { S.ps = S.p; S.rs = S.r; S.stars = S.p; });
        return new Promise((res) => setTimeout(res, reduced ? Math.min(ms, 450) : ms));
      },
      finish() {
        const p = S.p, r = S.r, total = S.N;
        S.ps = p; S.rs = r; S.stars = p;
        const res = S.solo ? { solo: true, you: p, total, win: p >= (total >= 3 ? total - 1 : total), tie: false } : { solo: false, you: p, foe: r, total, win: p > r, tie: p === r };
        S.end = { res, t0: S.t };
        if (type.end) type.end(S, res);
        if (res.win) confetti(S);
        return res;
      },
      destroy() { alive = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (io) io.disconnect(); }
    };
  }

  function info(id) { const c = CFG[id] || FALLBACK; return { how: c.how, yay: c.yay, boo: c.boo, solo: !!(T[c.type] && T[c.type].solo) }; }

  window.GameDemo = { create, info };
})();
