/* ==========================================================================
   Lelang Juara — kuis LELANG untuk kelas, 2–4 tim.
   Setiap ronde satu "lot" (barang lelang) berisi soal: tingkat soal
   (Mudah / Sedang / Sulit / ⚡ Kilat) dan pengali hadiah ditampilkan.
   Tim menawar dengan papan tawar (+50 / +100 / +200) sebelum hitung mundur
   habis ("Satu… dua… TERJUAL!"). Penawar tertinggi membayar tawarannya lalu
   menjawab soal: benar = tawaran × pengali, salah = tawaran masuk Jackpot dan
   tim lain boleh merebut soal (Soal Rebutan). Tanpa penawar = Lelang Diam.
   Lot spesial: 🎁 Kotak Misteri, 🛡️ Kartu Asuransi, ✖️2 Kartu Ganda, 💰 Jackpot.
   Babak akhir "Taruhan Terakhir": taruhan & jawaban rahasia, lalu dibuka.
   Grafis 100% HTML/CSS; tidak ada loop animasi saat diam.
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const FX = QC.fx; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let TS = 1; // skala waktu animasi (uji otomatis)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * TS));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  const fmt = (n) => Math.round(n).toLocaleString('id-ID');
  const multTxt = (m) => '×' + String(m).replace('.', ',');

  // Mode ringan otomatis untuk perangkat lemah. Paksa: ?ringan=1 / ?ringan=0
  const LITE = /[?&]ringan=1/.test(location.search) || (!/[?&]ringan=0/.test(location.search) && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4));
  if (LITE) document.documentElement.classList.add('lj-lite');
  const PN = (n) => (LITE ? Math.max(3, Math.ceil(n / 3)) : n);
  const burst = (el, o = {}) => FX.burstAt(el, { ...o, count: PN(o.count || 14) });

  /* ------------------------------ Data ------------------------------ */
  const COLORS = ['#e11d48', '#2563eb', '#059669', '#d97706'];
  const AVATARS = ['👑', '💎', '🏺', '🎩', '🗝️', '🦚', '⚜️', '🎻'];
  const TEAM_NAMES = ['Tim Rubi', 'Tim Safir', 'Tim Zamrud', 'Tim Topaz'];
  const KEYS = [['1', '2', '3', '4'], ['Q', 'W', 'E', 'R'], ['A', 'S', 'D', 'F'], ['Z', 'X', 'C', 'V']];
  const STEPS = [50, 100, 200];
  const STAKES = [0.25, 0.5, 0.75, 1];
  const DIFF = {
    mudah: { lbl: 'Mudah', ic: '🟢', mult: 1.5, note: 'Satu pilihan salah dibuang' },
    sedang: { lbl: 'Sedang', ic: '🟡', mult: 2, note: 'Soal biasa' },
    sulit: { lbl: 'Sulit', ic: '🔴', mult: 3, note: 'Soal lebih menantang' },
    kilat: { lbl: '⚡ Kilat', ic: '⚡', mult: 2.5, note: 'Hanya 10 detik menjawab!' }
  };
  const SPECIAL = {
    misteri: { ic: '🎁', name: 'Kotak Misteri', mult: 2, desc: 'Isinya acak — bisa untung besar, bisa zonk!' },
    asuransi: { ic: '🛡️', name: 'Kartu Asuransi', mult: 1, desc: 'Benar = tawaran kembali + kartu pelindung (1× kalah tidak rugi)' },
    ganda: { ic: '✖️2', name: 'Kartu Ganda', mult: 1, desc: 'Benar = tawaran kembali + hadiah berikutnya dikali 2' },
    jackpot: { ic: '💰', name: 'Lot Jackpot', mult: 2, desc: 'Benar = hadiah ×2 + SELURUH isi Jackpot!' }
  };
  const MYST = [
    { id: 'x3', w: 3, ic: '💎', t: 'Hadiah naik jadi ×3!' },
    { id: 'bonus', w: 2, ic: '🪙', t: 'Bonus +150 poin langsung!' },
    { id: 'aman', w: 2, ic: '☂️', t: 'Bebas risiko — salah pun tawaran kembali' },
    { id: 'mudah', w: 2, ic: '🎯', t: 'Soal dipermudah: tinggal 2 pilihan!' },
    { id: 'curi', w: 2, ic: '🦝', t: 'Benar = hadiah ×1,5 + curi 150 poin dari tim terkaya' },
    { id: 'zonk', w: 2, ic: '🙈', t: 'ZONK! Hadiah hanya ×1' }
  ];
  const ITEMS = [['🏺', 'Guci Antik'], ['⏱️', 'Jam Saku Emas'], ['🖼️', 'Lukisan Kuno'], ['🗺️', 'Peta Harta'], ['👑', 'Mahkota Perak'], ['🔭', 'Teropong Kapten'], ['🧭', 'Kompas Tua'],
    ['📯', 'Terompet Kuningan'], ['🗡️', 'Keris Pusaka'], ['🎭', 'Topeng Kayu'], ['📷', 'Kamera Klasik'], ['📻', 'Radio Tabung'], ['💍', 'Cincin Zamrud'], ['🕰️', 'Jam Meja Antik'],
    ['🪔', 'Lampu Minyak'], ['🎻', 'Biola Tua'], ['📜', 'Naskah Kuno'], ['🪭', 'Kipas Cendana'], ['🛶', 'Miniatur Pinisi'], ['🐚', 'Kerang Mutiara']];
  const BANTUAN = 150; const BANTUAN_LINE = 100; const JP_SEED = 200; const KILAT_TIME = 10; const MYST_BONUS = 150; const CURI = 150;

  QC.init({ gameId: 'lelang-juara', title: 'Lelang Juara', avatars: AVATARS, colors: COLORS });

  /* ------------------------------ Suara (WebAudio, tanpa file) ------------------------------ */
  const SND = (() => {
    let a = null; let nbuf = null;
    function ac() { if (!a) { try { a = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (a.state === 'suspended') a.resume(); return a; }
    function tone(f, d, type = 'sine', v = 0.07, delay = 0, f2 = null) {
      if (QC.muted) return; const c = ac(); if (!c) return; const t = c.currentTime + delay;
      const o = c.createOscillator(); const g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
    }
    function noise(d, v, delay = 0, ft = 'bandpass', f = 1000, q = 1) {
      if (QC.muted) return; const c = ac(); if (!c) return; const t = c.currentTime + delay;
      if (!nbuf) { const len = c.sampleRate; nbuf = c.createBuffer(1, len, c.sampleRate); const ch = nbuf.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1; }
      const s = c.createBufferSource(); s.buffer = nbuf; const fl = c.createBiquadFilter(); fl.type = ft; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain();
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(fl).connect(g).connect(c.destination); s.start(t); s.stop(t + d + 0.05);
    }
    const knock = (delay = 0, v = 1) => { noise(0.07, 0.55 * v, delay, 'bandpass', 950, 3); tone(190, 0.14, 'sine', 0.3 * v, delay, 70); tone(620, 0.05, 'triangle', 0.08 * v, delay); };
    return {
      ac,
      bid: (t) => { const b = [523, 587, 659, 784][t] || 600; tone(b, 0.07, 'square', 0.045); tone(b * 1.5, 0.13, 'triangle', 0.06, 0.05); },
      allin: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'sawtooth', 0.035, i * 0.045)); },
      nope: () => tone(220, 0.12, 'square', 0.04, 0, 160),
      tick: () => tone(1450, 0.035, 'square', 0.025),
      call: (n) => { tone(n === 2 ? 440 : 392, 0.3, 'triangle', 0.09); tone(n === 2 ? 880 : 784, 0.25, 'sine', 0.03, 0.02); },
      knock,
      sold: () => { knock(0, 1); knock(0.16, 0.7); knock(0.32, 1.1); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, 0.45 + i * 0.09)); },
      quiet: () => { knock(0, 0.5); tone(330, 0.4, 'sine', 0.06, 0.1, 220); },
      coin: () => { tone(988, 0.07, 'square', 0.045); tone(1319, 0.2, 'square', 0.045, 0.07); },
      lose: () => { tone(330, 0.25, 'sawtooth', 0.05, 0, 160); tone(220, 0.35, 'sawtooth', 0.045, 0.18, 90); },
      lock: () => { tone(880, 0.05, 'square', 0.05); noise(0.05, 0.3, 0.04, 'highpass', 3000, 1); tone(440, 0.08, 'square', 0.04, 0.07); },
      open: () => { tone(300, 0.6, 'sawtooth', 0.03, 0, 900); },
      drum: (dur = 1.4) => { const n = Math.round(dur / 0.055); for (let i = 0; i < n; i++) noise(0.06, 0.12 + 0.18 * (i / n), i * 0.055, 'bandpass', 220, 0.8); },
      boom: () => { noise(0.5, 0.4, 0, 'lowpass', 600, 0.7); tone(110, 0.5, 'sine', 0.25, 0, 45); },
      magic: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.2, 'sine', 0.07, i * 0.06)),
      jackpot: () => [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.18, 'square', 0.045, i * 0.08)),
      chime: () => { tone(1047, 0.3, 'sine', 0.07); tone(1568, 0.4, 'sine', 0.05, 0.1); },
      rebut: () => { [660, 880, 660, 880].forEach((f, i) => tone(f, 0.08, 'square', 0.05, i * 0.09)); }
    };
  })();
  document.addEventListener('pointerdown', () => SND.ac(), { once: true });

  /* ------------------------------ Status ------------------------------ */
  const S = { lots: 12, modal: 1000, time: 20, lelang: 9, rebut: 'on', spesial: 'on', final: 'on', diskusi: 'on' };
  let T = []; let phase = 'idle'; let gameSeq = 0; let tStart = 0; let tEnd = 0;
  let LOTS = []; let lotIdx = 0; let lot = null;
  let price = 0; let leader = -1; let bidCount = 0; let bidLog = [];
  let tLeft = 0; let tMax = 0; let aucIv = null; let lastTick = 0; let callStage = 0; let lastSec = -1;
  let jackpot = 0; let curQ = null; let curAnswerer = null; let curTeam = -1; let rebDecide = null; let rebutOpen = false;
  let nextTimer = null; let held = false; let fin = null; let finIv = null;
  let forceNext = null; let forceMyst = null; let lastEnd = ''; let autoNext = true;
  const logList = []; const audit = { neg: 0, over: 0, bids: 0, maxBid: 0 }; const history = [];
  let qPool = []; let qSrc = null;
  const lotTimes = [];

  const pad = (t) => $('pad' + t); const ptsEl = (t) => $('pts' + t);
  const teamMode = () => T.some((t) => t.members && t.members.length);
  const addLog = (html) => { logList.unshift(html); if (logList.length > 80) logList.pop(); };
  function chk() { T.forEach((t) => { if (t.points < 0) { audit.neg++; t.points = 0; } }); if (jackpot < 0) { audit.neg++; jackpot = 0; } }

  /* ------------------------------ Tim & anggota ------------------------------ */
  function parseMembers(txt) {
    const s = String(txt || '').trim(); if (!s) return [];
    if (/^\d{1,2}$/.test(s)) { const n = clamp(+s, 1, 12); return Array.from({ length: n }, (_, i) => `Anggota ${i + 1}`); }
    return s.split(/[,;\n]+/).map((x) => x.trim().slice(0, 18)).filter(Boolean).slice(0, 12);
  }
  const peekAnswerer = (tm) => (tm && tm.members && tm.members.length ? tm.members[tm.mi % tm.members.length] : null);
  function takeAnswerer(tm) { const m = peekAnswerer(tm); if (m) tm.mi = (tm.mi + 1) % tm.members.length; return m; }

  /* ------------------------------ Bank soal & tingkat ------------------------------ */
  function qScore(q) { const ks = QC.optionsOf(q); return String(q.question).length + ks.reduce((s, k) => s + String(q['option' + k]).length, 0) * 0.7 + (/\d/.test(q.question) ? 20 : 0); }
  function pickQ(diff) {
    const qs = QC.questions || []; if (!qs.length) return null;
    if (qSrc !== qs || qPool.some((i) => i >= qs.length)) { qSrc = qs; qPool = []; }
    if (!qPool.length) qPool = QC.shuffle(qs.map((_, i) => i));
    const cand = qPool.slice(-Math.min(qPool.length, 5)); let pick = cand[cand.length - 1];
    if (diff === 'mudah' || diff === 'kilat') pick = cand.reduce((a, b) => (qScore(qs[b]) < qScore(qs[a]) ? b : a));
    else if (diff === 'sulit') pick = cand.reduce((a, b) => (qScore(qs[b]) > qScore(qs[a]) ? b : a));
    qPool.splice(qPool.lastIndexOf(pick), 1);
    return qs[pick];
  }
  // salinan soal: kategori disembunyikan, pilihan salah bisa dibuang (Mudah / 50:50)
  function shapeQ(q, keep = 4) {
    if (!q) return null;
    const keys = QC.optionsOf(q); const o = { ...q, category: 'Lot Lelang' };
    if (keys.length <= keep) return o;
    const wrong = QC.shuffle(keys.filter((k) => k !== q.correct)).slice(0, keep - 1);
    const chosen = keys.filter((k) => k === q.correct || wrong.includes(k));
    ['A', 'B', 'C', 'D'].forEach((L) => (o['option' + L] = ''));
    chosen.forEach((k, i) => { const L = 'ABCD'[i]; o['option' + L] = q['option' + k]; if (k === q.correct) o.correct = L; });
    return o;
  }

  /* ------------------------------ Jadwal lot ------------------------------ */
  function buildLots(n, special) {
    const nK = Math.max(1, Math.round(n / 6)); const nS = Math.max(1, Math.round(n / 4)); const nM = Math.max(1, Math.round(n / 4)) - 1;
    const bag = []; for (let i = 0; i < nK; i++) bag.push('kilat'); for (let i = 0; i < nS; i++) bag.push('sulit'); for (let i = 0; i < nM; i++) bag.push('mudah');
    while (bag.length < n - 1) bag.push('sedang');
    const keyed = bag.map((d) => ({ d, k: Math.random() + (d === 'sulit' ? 0.7 : d === 'mudah' ? -0.7 : 0) })).sort((a, b) => a.k - b.k);
    const items = QC.shuffle(ITEMS);
    const L = [{ diff: 'mudah' }, ...keyed.map((x) => ({ diff: x.d }))].map((x, i) => ({ n: i + 1, diff: x.diff, sp: null, item: items[i % items.length], open: 100 }));
    if (L[1] && L[1].diff === 'kilat') { const j = L.findIndex((x, i) => i > 2 && x.diff === 'sedang'); if (j > 0) { L[j].diff = 'kilat'; L[1].diff = 'sedang'; } }
    if (special && n >= 6) {
      const last = L[n - 1]; last.sp = 'jackpot'; last.diff = 'sedang'; last.open = 150;
      const sps = ['asuransi', 'misteri', 'ganda']; if (n >= 10) sps.push('misteri');
      // slot spesial diambil dari lot Sedang/Mudah dulu supaya lot Kilat & Sulit tetap ada; asuransi paling awal
      const cand = QC.shuffle(Array.from({ length: Math.max(0, n - 3) }, (_, i) => i + 2)).sort((a, b) => (['kilat', 'sulit'].includes(L[a].diff) ? 1 : 0) - (['kilat', 'sulit'].includes(L[b].diff) ? 1 : 0));
      const slots = cand.slice(0, sps.length).sort((a, b) => a - b);
      slots.forEach((s, i) => { L[s].sp = sps[i]; L[s].diff = 'sedang'; });
    }
    return L;
  }
  function lotMult(l = lot) {
    if (!l) return 1;
    if (l.myst === 'x3') return 3; if (l.myst === 'zonk') return 1; if (l.myst === 'curi') return 1.5;
    return l.sp ? SPECIAL[l.sp].mult : DIFF[l.diff].mult;
  }
  const keepFor = (l) => (l.myst === 'mudah' ? 2 : l.diff === 'mudah' ? 3 : 4);
  const timeFor = (l) => (l.diff === 'kilat' ? Math.min(KILAT_TIME, S.time) : S.time);

  /* ------------------------------ Tampilan ------------------------------ */
  const clock = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  let jpShown = 0;
  function renderTop() {
    const fl = ['finalIntro', 'fstake', 'fanswer', 'freveal'].includes(phase) || (phase === 'over' && lastEnd === 'final');
    $('lotLbl').textContent = fl ? 'BABAK' : 'LOT';
    $('lotNo').textContent = fl ? 'FINAL' : String(Math.max(1, Math.min(lotIdx || 1, LOTS.length || S.lots)));
    $('lotMax').textContent = fl ? '' : '/' + (LOTS.length || S.lots);
    if (jpShown !== jackpot) { FX.countUp($('jpNo'), jpShown, jackpot, 700, fmt); const b = $('jpBox'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); jpShown = jackpot; }
    else $('jpNo').textContent = fmt(jackpot);
  }
  function renderClock() { $('clockNo').textContent = clock(tStart ? (tEnd || Date.now()) - tStart : 0); }
  setInterval(() => { if (tStart && !tEnd) renderClock(); }, 1000);

  function tagHTML(l) {
    if (!l) return `<div class="tag-in idle"><span class="hole"></span><div class="t-lot">LOT <b>—</b></div><div class="t-ic">🔨</div><div class="t-name">Balai Lelang Juara</div><div class="t-desc">Siapkan papan tawar kalian!</div></div>`;
    const sp = l.sp ? SPECIAL[l.sp] : null; const d = DIFF[l.diff]; const m = lotMult(l);
    const myst = l.myst ? MYST.find((x) => x.id === l.myst) : null;
    return `<div class="tag-in ${sp ? 'sp sp-' + l.sp : 'd-' + l.diff}"><span class="hole"></span>
      <div class="t-lot">LOT <b>${String(l.n).padStart(2, '0')}</b><small>/${LOTS.length}</small></div>
      <div class="t-ic">${sp ? sp.ic : l.item[0]}</div>
      <div class="t-name">${sp ? sp.name : esc(l.item[1])}</div>
      <div class="t-row"><span class="t-diff d-${l.diff}">${d.ic === '⚡' ? '' : d.ic + ' '}${d.lbl}</span><span class="t-mult">Hadiah <b>${multTxt(m)}</b></span></div>
      <div class="t-open">Harga buka <b>${fmt(l.open)}</b></div>
      <div class="t-desc">${myst ? `${myst.ic} ${myst.t}` : sp ? sp.desc + (l.sp === 'jackpot' ? ` <b class="jpv">💰 ${fmt(jackpot)}</b>` : '') : d.note}</div></div>`;
  }
  function renderTag(anim) {
    const el = $('tag'); el.innerHTML = tagHTML(lot);
    if (anim) { const w = $('tagWrap'); w.classList.remove('swing'); void w.offsetWidth; w.classList.add('swing'); }
  }
  function setCall(txt, cls = '') { const c = $('call'); c.innerHTML = `<span>${txt}</span>`; c.className = 'call ' + cls; void c.offsetWidth; c.classList.add('pop'); }
  function renderBid() {
    const box = $('bidBox'); const no = $('bidNo'); const who = $('bidWho'); const lbl = $('bidLbl');
    box.classList.toggle('has', leader >= 0);
    if (phase === 'auction' || phase === 'lotIntro') {
      lbl.textContent = leader >= 0 ? 'TAWARAN TERTINGGI' : 'HARGA BUKA';
      no.textContent = fmt(leader >= 0 ? price : lot ? lot.open : 0);
      who.innerHTML = leader >= 0 ? QC.chip(T[leader]) : '<span class="nobody">belum ada penawar</span>';
    } else if (['sold', 'question', 'rebut', 'result'].includes(phase) && lot) {
      lbl.textContent = leader >= 0 ? 'TERJUAL SEHARGA' : 'LELANG DIAM';
      no.textContent = leader >= 0 ? fmt(price) : '🤫';
      who.innerHTML = leader >= 0 ? QC.chip(T[leader]) : '<span class="nobody">soal untuk semua tim</span>';
    } else { lbl.textContent = 'TAWARAN TERTINGGI'; no.textContent = '—'; who.innerHTML = ''; }
  }
  function renderCd() {
    const on = phase === 'auction'; const bar = $('cdBar'); bar.classList.toggle('on', on);
    if (!on) { $('cdNum').textContent = ''; $('cdFill').style.transform = 'scaleX(0)'; return; }
    const k = clamp(tLeft / tMax, 0, 1); $('cdFill').style.transform = `scaleX(${k.toFixed(3)})`;
    bar.classList.toggle('hurry', tLeft <= 3); $('cdNum').textContent = Math.max(0, Math.ceil(tLeft)) + ' dtk';
  }
  function renderHammer() {
    const b = $('btnHammer'); const l = $('hammerLbl'); let txt = ''; let en = true;
    if (phase === 'auction') txt = '🔨 Ketuk Palu <kbd>Spasi</kbd>';
    else if (phase === 'result') txt = `▶ Lot berikutnya <kbd>Spasi</kbd>${nextTimer ? '<i class="autobar" style="--ad:' + (3.6 * TS).toFixed(2) + 's"></i>' : ''}`;
    else if (phase === 'fstake') { txt = '▶ Lanjut ke soal <kbd>Spasi</kbd>'; }
    else if (phase === 'fanswer') { txt = '🔓 Buka jawaban <kbd>Spasi</kbd>'; }
    else if (phase === 'brief') txt = '🔨 Buka lelang <kbd>Spasi</kbd>';
    else { txt = '🔨 Palu lelang'; en = false; }
    if (l._h !== txt) { l._h = txt; l.innerHTML = txt; }
    b.disabled = !en; b.classList.toggle('ready', en);
    $('btnHold').hidden = !(phase === 'result' && nextTimer);
  }

  function padsHTML() {
    return T.map((t) => `<div class="pad" id="pad${t.id}" style="--pc:${t.color}">
      <span class="pad-flag" id="pflag${t.id}"></span>
      <div class="pad-top"><span class="pad-av">${t.avatar}</span>
        <div class="pad-id"><b class="pad-name">${esc(t.name)}</b><span class="pad-sub" id="psub${t.id}"></span></div>
        <div class="pad-pts"><b id="pts${t.id}">${fmt(t.points)}</b><small>poin</small></div></div>
      <div class="pad-act" id="pact${t.id}"></div></div>`).join('');
  }
  function buildPads() { const p = $('pads'); p.style.setProperty('--n', T.length); p.dataset.n = T.length; p.innerHTML = padsHTML(); T.forEach((t) => { t.shown = t.points; t._mode = null; }); }
  function padMode(t) {
    if (phase === 'fstake') return fin.stake[t.id] == null ? 'stake' : 'lock';
    if (phase === 'fanswer') return fin.ans[t.id] == null ? 'ans' : 'lock';
    if (phase === 'freveal' || (phase === 'over' && fin && fin.done)) return fin.shown[t.id] ? 'rev' : 'lock';
    if (phase === 'finalIntro') return 'wait';
    return 'bid';
  }
  function actHTML(t, mode) {
    const ks = KEYS[t.id];
    if (mode === 'bid') return STEPS.map((a, i) => `<button class="pb" data-act="bid" data-a="${a}"><b>+${a}</b><small class="ai">ALL-IN</small><kbd>${ks[i]}</kbd></button>`).join('');
    if (mode === 'stake') return STAKES.map((p, i) => { const v = stakeVal(t, p); return `<button class="pb st${p === 1 ? ' all' : ''}" data-act="stake" data-i="${i}"><b>${p === 1 ? '💥 SEMUA' : Math.round(p * 100) + '%'}</b><small>${fmt(v)}</small><kbd>${ks[i]}</kbd></button>`; }).join('');
    if (mode === 'ans') return QC.optionsOf(fin.q).map((k, i) => `<button class="pb an k-${k}" data-act="ans" data-k="${k}"><b>${k}</b><kbd>${ks[i]}</kbd></button>`).join('');
    if (mode === 'lock') return `<div class="pad-lock"><span>🔒</span><b>terkunci</b><small>${phase === 'fstake' ? 'taruhan rahasia' : 'rahasia sampai dibuka'}</small></div>`;
    if (mode === 'wait') return '<div class="pad-lock wait"><span>🏁</span><b>bersiap…</b><small>Taruhan Terakhir</small></div>';
    if (mode === 'rev') { const r = fin.res[t.id]; return `<div class="pad-rev ${r.ok ? 'ok' : 'no'}"><b>${r.ans || '—'}</b><span>${r.ok ? '✔ BENAR' : r.ans ? '✘ SALAH' : '✘ KOSONG'}</span><em>${r.delta >= 0 ? '+' : '−'}${fmt(Math.abs(r.delta))}</em></div>`; }
    return '';
  }
  const canBid = (t) => phase === 'auction' && lot && leader !== t.id && t.points > price && t.points >= lot.open;
  function renderPads() {
    T.forEach((t) => {
      const el = pad(t.id); if (!el) return;
      const mode = padMode(t); const act = $('pact' + t.id);
      const key = mode + (mode === 'ans' ? QC.optionsOf(fin.q).length : '') + (mode === 'stake' ? t.points : '');
      if (t._mode !== key) { t._mode = key; act.innerHTML = actHTML(t, mode); act.dataset.mode = mode; }
      if (mode === 'bid') {
        const ok = canBid(t);
        act.querySelectorAll('.pb').forEach((b) => { b.disabled = !ok; const a = +b.dataset.a; b.classList.toggle('allin', ok && Math.max(price + a, lot.open) > t.points); });
      }
      const lead = phase === 'auction' && leader === t.id; const answering = curTeam === t.id && ['question', 'sold'].includes(phase);
      el.classList.toggle('lead', lead); el.classList.toggle('answering', answering);
      el.classList.toggle('broke', phase === 'auction' && !lead && !canBid(t));
      el.classList.toggle('locked', mode === 'lock');
      const flag = lead ? '👑 TERTINGGI' : answering ? (curAnswerer ? `🙋 ${esc(curAnswerer)} menjawab` : '🙋 MENJAWAB') : (phase === 'auction' && !canBid(t) && t.points < (lot ? Math.max(lot.open, price + 1) : 0)) ? 'poin kurang' : '';
      const f = $('pflag' + t.id); if (f._h !== flag) { f._h = flag; f.innerHTML = flag; f.classList.toggle('on', !!flag); }
      const cards = (t.cards.asuransi ? `<span class="bdg" title="Kartu Asuransi">🛡️${t.cards.asuransi > 1 ? '<i>' + t.cards.asuransi + '</i>' : ''}</span>` : '') + (t.cards.ganda ? `<span class="bdg" title="Kartu Ganda">✖️2${t.cards.ganda > 1 ? '<i>' + t.cards.ganda + '</i>' : ''}</span>` : '');
      const nx = peekAnswerer(t); const sub = cards + (nx && !['fstake', 'fanswer', 'freveal', 'finalIntro'].includes(phase) ? `<span class="nx">🙋 ${esc(nx.name)}</span>` : '') + (!cards && !nx ? `<span class="nx">${fin && phase !== 'over' && phase !== 'brief' && !lot ? '🏁 Taruhan Terakhir' : t.won ? '🔨 ' + t.won + ' lot' : 'siap menawar'}</span>` : '');
      const ps = $('psub' + t.id); if (ps._h !== sub) { ps._h = sub; ps.innerHTML = sub; }
      if (t.shown !== t.points) { FX.countUp(ptsEl(t.id), t.shown, t.points, 650, fmt); t.shown = t.points; }
    });
  }
  function renderAll() {
    renderTop(); renderPads(); renderBid(); renderCd(); renderHammer();
    $('stage').classList.toggle('fin', ['finalIntro', 'fstake', 'fanswer', 'freveal'].includes(phase) || (phase === 'over' && !!fin && fin.done));
  }

  /* ------------------------------ Efek ------------------------------ */
  function strike(big = true) {
    const g = $('gavel'); const b = $('block'); g.classList.remove('hit'); b.classList.remove('hit'); void g.offsetWidth; g.classList.add('hit'); b.classList.add('hit');
    setTimeout(() => {
      if (big) { FX.ringAt(b, '#f2c14e', 200); burst(b, { emojis: ['✨', '💥', '⭐'], count: 12, spread: 110, size: 22 }); FX.shake($('stage'), 7, 380); }
    }, 170);
  }
  function stamp(main, sub = '', cls = '') {
    const s = $('stamp'); s.className = 'stamp ' + cls; s.innerHTML = `<div class="st">${main}</div>${sub ? `<div class="sub">${sub}</div>` : ''}`; s.hidden = false;
  }
  const hideStamp = () => { $('stamp').hidden = true; };
  function float(el, txt, color, size = 30) { FX.floatTextAt(el, txt, color, size); }
  function gain(tm, n, fromEl, why) {
    if (n <= 0) return; tm.points += n; chk(); addLog(`${esc(tm.name)} ${why} +${fmt(n)}`);
    FX.fly(fromEl || $('tag'), ptsEl(tm.id), '🪙', Math.min(8, 3 + ((n / 200) | 0)), 700);
    setTimeout(() => float(ptsEl(tm.id), '+' + fmt(n), '#4ade80', 30), 380 * TS + 100);
    SND.coin(); renderPads();
  }
  function lose(tm, n, toEl, why) {
    n = Math.min(n, tm.points); if (n <= 0) return 0; tm.points -= n; chk(); addLog(`${esc(tm.name)} ${why} −${fmt(n)}`);
    FX.fly(ptsEl(tm.id), toEl || $('tag'), '🪙', Math.min(7, 2 + ((n / 200) | 0)), 650);
    float(ptsEl(tm.id), '−' + fmt(n), '#fca5a5', 28); renderPads(); return n;
  }
  function toJackpot(n, fromTm) {
    if (n <= 0) return; jackpot += n;
    if (fromTm) FX.fly(ptsEl(fromTm.id), $('jpBox'), '🪙', 5, 750);
    setTimeout(() => renderTop(), 650 * TS);
  }

  /* ------------------------------ Bantuan (tim tidak menganggur) ------------------------------ */
  function giveBantuan() {
    const poor = T.filter((t) => t.points < BANTUAN_LINE);
    poor.forEach((t) => { t.points += BANTUAN; t.bantuan++; float(ptsEl(t.id), '🤝 +' + BANTUAN, '#fde68a', 26); addLog(`🤝 ${esc(t.name)} menerima dana bantuan +${BANTUAN}`); });
    if (poor.length) { SND.chime(); QC.toast(`🤝 Dana bantuan Balai Lelang: ${poor.map((t) => `<b>${esc(t.name)}</b>`).join(', ')} mendapat +${BANTUAN} poin supaya bisa ikut menawar!`, 'good'); renderPads(); }
    return poor.length;
  }

  /* ------------------------------ Alur lot ------------------------------ */
  function clearNext() { if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; } }
  function stopAuction() { if (aucIv) { clearInterval(aucIv); aucIv = null; } }
  async function startLot() {
    if (!['brief', 'result'].includes(phase)) return false;
    clearNext(); held = false; const gid = gameSeq;
    if (lotIdx >= LOTS.length) { finishGame(); return true; }
    lotIdx++; lot = LOTS[lotIdx - 1];
    if (forceNext) { Object.assign(lot, forceNext); if (forceNext.sp === 'jackpot') lot.open = 150; else if (forceNext.sp !== undefined && !forceNext.open) lot.open = 100; forceNext = null; }
    delete lot.myst; lot.t0 = Date.now();
    price = 0; leader = -1; bidCount = 0; bidLog = []; curTeam = -1; curAnswerer = null;
    phase = 'lotIntro'; hideStamp(); $('mystery').hidden = true;
    giveBantuan();
    renderTag(true); renderAll();
    const sp = lot.sp ? SPECIAL[lot.sp] : null;
    setCall(sp ? `Lot ${lot.n}: <b>${sp.ic} ${sp.name}</b>! Harga buka <b>${fmt(lot.open)}</b>` : `Lot ${lot.n}: <b>${esc(lot.item[1])}</b> — soal <b>${DIFF[lot.diff].lbl}</b>, hadiah <b>${multTxt(lotMult())}</b>`, 'intro');
    if (sp) { SND.magic(); burst($('tag'), { emojis: [sp.ic.slice(0, 2), '✨', '⭐'], count: 12, spread: 130 }); } else SND.call(1);
    addLog(`🔨 Lot ${lot.n} dibuka (${sp ? sp.name : DIFF[lot.diff].lbl})`);
    await sleep(1700); if (gid !== gameSeq) return false;
    beginAuction();
    return true;
  }
  function beginAuction() {
    phase = 'auction'; tMax = S.lelang; tLeft = tMax; callStage = 0; lastSec = -1; lastTick = performance.now();
    setCall(`Silakan menawar! Siapa berani <b>${fmt(lot.open)}</b>?`, 'go');
    stopAuction(); aucIv = setInterval(aucTick, 100); renderAll();
  }
  function aucTick() {
    if (phase !== 'auction') { stopAuction(); return; }
    const now = performance.now(); const dt = (now - lastTick) / 1000 / TS; lastTick = now;
    if (QC.isBusy() || held) return; // jeda saat pop-up (mis. Mode Guru) terbuka
    tLeft -= dt;
    const s = Math.ceil(tLeft); if (s !== lastSec) { lastSec = s; if (s <= 3 && s > 0) SND.tick(); }
    if (leader >= 0) {
      if (tLeft <= 3 && callStage < 1) { callStage = 1; setCall(`<b>${fmt(price)}</b> dari ${esc(T[leader].name)}… <big>Satu…</big>`, 'count'); SND.call(1); }
      if (tLeft <= 1.5 && callStage < 2) { callStage = 2; setCall(`<b>${fmt(price)}</b>… <big>Dua…</big>`, 'count'); SND.call(2); }
    } else if (tLeft <= 3 && callStage < 1) { callStage = 1; setCall('Tidak ada yang menawar? <big>Satu… dua…</big>', 'count'); }
    renderCd();
    if (tLeft <= 0) hammerDown();
  }
  function nudge(t, msg) {
    const el = pad(t); if (el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); }
    SND.nope(); const f = $('pflag' + t); if (f && msg) { f.innerHTML = msg; f._h = msg; f.classList.add('on'); }
  }
  function placeBid(t, inc) {
    const tm = T[t]; if (!tm) return { ok: false, why: 'tim' };
    if (phase !== 'auction' || QC.isBusy()) return { ok: false, why: 'fase' };
    if (!STEPS.includes(inc)) inc = clamp(Math.round(inc / 50) * 50, 50, 10000);
    if (leader === t) { nudge(t, '👑 kalian sudah tertinggi'); return { ok: false, why: 'tertinggi' }; }
    let nb = Math.max(price + inc, lot.open); let allin = false;
    if (nb > tm.points) {
      if (tm.points > price && tm.points >= lot.open) { nb = tm.points; allin = true; } else { nudge(t, 'poin tidak cukup'); return { ok: false, why: 'poin' }; }
    } else if (nb === tm.points) allin = true;
    if (nb > tm.points) { audit.over++; return { ok: false, why: 'over' }; }
    const prev = leader; price = nb; leader = t; bidCount++; audit.bids++; audit.maxBid = Math.max(audit.maxBid, nb);
    bidLog.push({ t, bid: nb, pts: tm.points }); history.push({ lot: lot.n, t, bid: nb, pts: tm.points });
    tLeft = Math.min(tMax, Math.max(tLeft + 2, 4)); callStage = 0; lastSec = -1;
    const name = esc(tm.name);
    setCall(allin ? `💥 <b>ALL-IN!</b> ${name} mempertaruhkan <b>${fmt(nb)}</b>!` : QC.pick([`<b>${fmt(nb)}</b> dari ${name}!`, `${name} menawar <b>${fmt(nb)}</b>!`, `<b>${fmt(nb)}</b>! Ada yang lebih tinggi?`]), allin ? 'allin' : 'bid');
    allin ? SND.allin() : SND.bid(t);
    const no = $('bidNo'); no.classList.remove('pump'); void no.offsetWidth; no.classList.add('pump');
    float(pad(t).querySelector('.pad-act'), allin ? '💥 ALL-IN' : '+' + inc, '#fde68a', 26);
    if (allin) burst(pad(t), { emojis: ['💥', '🔥', '✨'], count: 12, spread: 120 });
    if (prev >= 0 && prev !== t) { const pf = pad(prev); if (pf) { pf.classList.remove('outbid'); void pf.offsetWidth; pf.classList.add('outbid'); } }
    renderPads(); renderBid(); renderCd();
    return { ok: true, bid: nb, allin };
  }
  async function hammerDown() {
    if (phase !== 'auction') return false;
    stopAuction(); phase = 'sold'; const gid = gameSeq; renderAll();
    if (leader < 0) {
      strike(false); SND.quiet(); setCall('Tidak ada penawar… <b>LELANG DIAM!</b> Soal untuk semua tim.', 'quiet');
      stamp('🤫 LELANG DIAM', 'Tidak ada yang menawar — siapa cepat, dia dapat!', 'quiet'); addLog(`🤫 Lot ${lot.n}: lelang diam`);
      await sleep(1700); if (gid !== gameSeq) return false; hideStamp();
      await silentAuction(gid); return true;
    }
    const tm = T[leader]; const bid = price; curTeam = tm.id;
    strike(true); SND.sold(); setCall(`Satu… dua… <b>TERJUAL!</b> ${esc(tm.name)} — <b>${fmt(bid)}</b>`, 'sold');
    stamp('TERJUAL!', `${QC.chip(tm)} <b>${fmt(bid)} poin</b>`, 'sold');
    if (bid > tm.points) audit.over++;
    lose(tm, bid, $('tag'), `membeli Lot ${lot.n}`); tm.won++; tm.spent += bid;
    addLog(`🔨 Lot ${lot.n} terjual ke ${esc(tm.name)} seharga ${fmt(bid)}`);
    setTimeout(() => burst($('stamp'), { emojis: ['🪙', '✨', '🎉'], count: 14, spread: 170 }), 250 * TS);
    renderPads();
    await sleep(1800); if (gid !== gameSeq) return false; hideStamp();
    if (lot.sp === 'misteri') { await openMystery(tm, gid); if (gid !== gameSeq) return false; }
    await answerLot(tm, bid, gid);
    return true;
  }
  function weighted(list) { const tot = list.reduce((s, x) => s + x.w, 0); let r = Math.random() * tot; for (const x of list) { r -= x.w; if (r <= 0) return x; } return list[0]; }
  async function openMystery(tm, gid) {
    const e = (forceMyst && MYST.find((x) => x.id === forceMyst)) || weighted(MYST); forceMyst = null; lot.myst = e.id;
    const el = $('mystery'); el.className = 'mystery'; el.innerHTML = `<div class="mx-box"><span class="lid">🎀</span><span class="bx">🎁</span></div><div class="mx-card"><i>${e.ic}</i><b>${e.t}</b><small>Kotak Misteri • ${esc(tm.name)}</small></div>`; el.hidden = false;
    setCall(`🎁 ${esc(tm.name)} membuka <b>Kotak Misteri</b>…`, 'intro'); SND.drum(0.9);
    await sleep(1000); if (gid !== gameSeq) return;
    el.classList.add('open'); SND.magic(); burst(el.querySelector('.mx-card'), { emojis: ['✨', '🎉', e.ic], count: 16, spread: 160 });
    setCall(`🎁 Isinya: <b>${e.t}</b>`, e.id === 'zonk' ? 'quiet' : 'go'); addLog(`🎁 Kotak Misteri ${esc(tm.name)}: ${e.t}`);
    renderTag(false);
    if (e.id === 'bonus') gain(tm, MYST_BONUS, el.querySelector('.mx-card'), 'bonus Kotak Misteri');
    await sleep(2100); el.hidden = true; el.classList.remove('open');
  }
  function decorateAsk(tm, m, rebutable, extra) {
    const o = [...document.querySelectorAll('.qc-overlay.qc-ask')].pop(); if (!o) return;
    o.classList.add('lj-ask'); if (rebutable) o.classList.add('lj-rebutable');
    const head = o.querySelector('.qc-ask-head'); if (!head) return;
    const el = document.createElement('div'); el.className = 'lj-answerer'; el.style.setProperty('--pc', tm.color);
    const dis = S.diskusi === 'off' ? '🤫 Jawab sendiri — tanpa diskusi' : '💬 Boleh diskusi dulu dengan tim';
    el.innerHTML = (m ? `<span class="who">🙋 Penjawab: <b>${esc(m.name)}</b></span>` : `<span class="who">👥 Dijawab oleh <b>${esc(tm.name)}</b></span>`) + `<span class="dis">${[extra, teamMode() ? dis : ''].filter(Boolean).join(' • ')}</span>`;
    head.insertAdjacentElement('afterend', el);
  }
  async function askTeam(tm, q, time, badge, rebutable, extra) {
    const m = teamMode() ? takeAnswerer(tm) : null; curQ = q; curAnswerer = m ? m.name : null; curTeam = tm.id; renderPads();
    const pr = QC.ask(q, { player: { name: tm.name, avatar: tm.avatar, color: tm.color }, time, badge });
    decorateAsk(tm, m, rebutable, extra);
    const r = await pr; curQ = null; curAnswerer = null; const ok = !!r.correct;
    tm.asked++; if (ok) tm.correct++; if (m) { m.asked++; if (ok) m.correct++; }
    renderPads(); return ok;
  }
  const stealPrize = (bid) => Math.max(50, Math.round(bid / 2 / 50) * 50);
  const rebutCands = (exclude) => (S.rebut === 'on' ? T.filter((t) => !exclude.includes(t.id)) : []);
  async function answerLot(tm, bid, gid) {
    phase = 'question'; renderAll();
    const q = shapeQ(pickQ(lot.diff), keepFor(lot)); const mult = lotMult(); const time = timeFor(lot);
    const sp = lot.sp ? SPECIAL[lot.sp] : null;
    const badge = `🔨 Lot ${lot.n} • ${sp ? sp.ic + ' ' + sp.name : DIFF[lot.diff].lbl} • ${multTxt(mult)} • tawaran ${fmt(bid)}`;
    const extra = lot.diff === 'kilat' ? '⚡ Kilat: 10 detik!' : lot.diff === 'mudah' || lot.myst === 'mudah' ? '🎯 Pilihan sudah dikurangi' : '';
    setCall(`${esc(tm.name)} menjawab soal <b>${DIFF[lot.diff].lbl}</b>… benar = <b>${fmt(Math.round(bid * mult))}</b>`, 'go');
    const ok = await askTeam(tm, q, time, badge, rebutCands([tm.id]).length > 0, extra);
    if (gid !== gameSeq) return;
    phase = 'result'; curTeam = -1;
    if (ok) {
      let pay = Math.round(bid * mult); let note = '';
      if (tm.cards.ganda > 0 && pay > 0) { tm.cards.ganda--; pay *= 2; note = ' ✖️2 Kartu Ganda!'; }
      tm.earned += pay;
      gain(tm, pay, $('tag'), `menjawab benar Lot ${lot.n}${note}`);
      let sub = `${esc(tm.name)} mendapat <b>+${fmt(pay)}</b> (${fmt(bid)} ${multTxt(mult)}${note ? ' ×2' : ''})`;
      if (lot.sp === 'asuransi') { tm.cards.asuransi++; sub += ' + 🛡️ Kartu Asuransi'; SND.chime(); }
      if (lot.sp === 'ganda') { tm.cards.ganda++; sub += ' + ✖️2 Kartu Ganda'; SND.chime(); }
      if (lot.sp === 'jackpot' && jackpot > 0) {
        const jp = jackpot; jackpot = 0; renderTop(); tm.points += jp; chk(); tm.earned += jp; SND.jackpot();
        FX.fly($('jpBox'), ptsEl(tm.id), '💰', 8, 900); setTimeout(() => float(ptsEl(tm.id), '💰 +' + fmt(jp), '#fde047', 34), 700 * TS);
        FX.fireworks(LITE ? 2 : 5, 220); sub += ` + 💰 JACKPOT ${fmt(jp)}!`; addLog(`💰 ${esc(tm.name)} memenangkan Jackpot ${fmt(jp)}`);
      }
      if (lot.myst === 'curi') {
        const v = T.filter((x) => x !== tm && x.points > 0).sort((a, b) => b.points - a.points)[0];
        if (v) { const amt = Math.min(CURI, v.points); v.points -= amt; tm.points += amt; chk(); FX.fly(ptsEl(v.id), ptsEl(tm.id), '🦝', 4, 800); float(ptsEl(v.id), '−' + fmt(amt), '#fca5a5', 26); sub += ` + curi ${fmt(amt)} dari ${esc(v.name)}`; }
      }
      FX.announce(lot.sp === 'jackpot' ? '💰 JACKPOT!' : '✅ BENAR!', { color: tm.color, sub, dur: 1500 });
      setCall(`✅ ${sub}`, 'win'); renderPads();
    } else {
      let sub;
      if (lot.myst === 'aman') { gain(tm, bid, $('tag'), 'tawaran kembali (bebas risiko)'); sub = `☂️ Bebas risiko — tawaran ${fmt(bid)} kembali`; }
      else if (tm.cards.asuransi > 0) { tm.cards.asuransi--; tm.saved++; gain(tm, bid, $('tag'), 'dilindungi Kartu Asuransi'); SND.chime(); sub = `🛡️ Kartu Asuransi melindungi ${esc(tm.name)} — tawaran ${fmt(bid)} kembali!`; burst(pad(tm.id), { emojis: ['🛡️', '✨'], count: 10, spread: 110 }); }
      else { toJackpot(bid, tm); SND.lose(); sub = `Tawaran ${fmt(bid)} masuk 💰 Jackpot`; tm.lost += bid; }
      FX.announce('❌ BELUM TEPAT', { color: '#7f1d1d', sub, dur: 1400 }); setCall(`❌ ${esc(tm.name)} belum tepat. ${sub}`, 'lose'); renderPads();
      await sleep(1100); if (gid !== gameSeq) return;
      if (S.rebut === 'on') await rebutan(q, [tm.id], stealPrize(bid), gid, time, { title: '⚡ REBUTAN! Siapa paling cepat?', who: tm });
      if (gid !== gameSeq) return;
    }
    finishLot(gid);
  }
  async function silentAuction(gid) {
    phase = 'rebut'; renderAll();
    const q = shapeQ(pickQ(lot.diff), keepFor(lot)); const time = timeFor(lot);
    const card = lot.sp === 'asuransi' || lot.sp === 'ganda' ? lot.sp : null;
    const prize = card ? 0 : Math.round(lot.open * lotMult());
    const r = await rebutan(q, [], prize, gid, time, { title: '🤫 LELANG DIAM — siapa cepat?', silent: true, card });
    if (gid !== gameSeq) return;
    finishLot(gid, r);
  }
  // Soal Rebutan: tim tercepat menjawab. Salah -> tim yang tersisa boleh mencoba lagi.
  async function rebutan(q, exclude, prize, gid, time, opt = {}) {
    if (!q) return null; const tried = [...exclude];
    while (gid === gameSeq) {
      const cands = T.filter((t) => !tried.includes(t.id)); if (!cands.length) break;
      phase = 'rebut'; renderAll(); SND.rebut(); const waitMs = Math.max(3000, 9000 * TS);
      const reward = opt.card ? `${SPECIAL[opt.card].ic} ${SPECIAL[opt.card].name}` : `+${fmt(prize)}`;
      const intro = opt.silent ? (tried.length ? 'Belum tepat! Tim lain masih boleh merebut.' : 'Tidak ada yang menawar, jadi soal ini <b>untuk semua tim</b>. Cepat klik tombol tim kalian!')
        : `${esc((opt.who || {}).name || '')}${tried.length > 1 ? ' dan tim lain' : ''} belum tepat. Tim lain: <b>cepat klik tombol tim kalian!</b>`;
      rebutOpen = true;
      const pick = await QC.modal({
        cls: 'lj-rebut', icon: opt.silent ? '🤫' : '⚡', title: tried.length && opt.silent ? '⚡ REBUTAN LAGI!' : opt.title,
        html: `<p class="qc-muted">${intro}<br><small>Keyboard: tekan nomor tim (1–${T.length}).</small></p>
          <div class="rb-q">❓ ${esc(q.question)}</div>
          <div class="rb-grid">${cands.map((t) => `<button class="rb-btn" data-t="${t.id}" style="--pc:${t.color}"><kbd>${t.id + 1}</kbd><span class="av">${t.avatar}</span><b>${esc(t.name)}</b><small>benar = ${reward}</small></button>`).join('')}</div>
          <div class="rb-bar" style="--rbt:${(waitMs / 1000).toFixed(2)}s"><i></i></div>`,
        buttons: [{ label: '⏭️ Lewati', value: null }],
        onOpen(o, done) {
          rebDecide = (v) => done(v);
          o.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); QC.sfx.click(); done(+b.dataset.t); }));
          o.querySelectorAll('[data-t]').forEach((b) => (b.onclick = (e) => { if (e.detail === 0) done(+b.dataset.t); }));
          o._onKey = (e) => {
            const up = e.key.length === 1 ? e.key.toUpperCase() : e.key; const n = parseInt(e.key, 10);
            let hit = cands.find((c) => c.id === n - 1); if (!hit && isNaN(n)) hit = cands.find((c) => KEYS[c.id].includes(up));
            if (hit) done(hit.id); else if (e.key === 'Escape') done(null);
          };
          const tm = setTimeout(() => done(null), waitMs); o._cleanup = () => clearTimeout(tm);
        }
      });
      rebDecide = null; rebutOpen = false;
      if (gid !== gameSeq) return null;
      if (pick == null || !T[pick] || tried.includes(pick)) { QC.toast(`💡 Jawaban benar: <b>${q.correct}. ${esc(q['option' + q.correct])}</b>`); addLog('⚡ Rebutan dilewati'); break; }
      tried.push(pick); const tm = T[pick];
      const more = T.some((t) => !tried.includes(t.id));
      const ok = await askTeam(tm, q, time, `${opt.silent ? '🤫 Lelang Diam' : '⚡ Soal Rebutan'} • benar = ${reward}`, more, '');
      if (gid !== gameSeq) return null;
      if (ok) {
        tm.rebut++;
        if (opt.card) { tm.cards[opt.card]++; SND.chime(); burst(pad(tm.id), { emojis: [SPECIAL[opt.card].ic.slice(0, 2), '✨'], count: 10, spread: 110 }); renderPads(); }
        else gain(tm, prize, $('stage'), opt.silent ? 'menang Lelang Diam' : 'merebut soal');
        FX.announce(opt.silent ? '🤫 LELANG DIAM!' : '⚡ REBUTAN BERHASIL!', { color: tm.color, sub: `${esc(tm.name)} mendapat ${reward}`, dur: 1300 });
        setCall(`⚡ ${esc(tm.name)} merebut soal: <b>${reward}</b>`, 'win');
        await sleep(600); return pick;
      }
      setCall(`${esc(tm.name)} juga belum tepat…`, 'lose');
      await sleep(400);
    }
    return null;
  }
  function finishLot(gid) {
    if (gid !== gameSeq) return;
    phase = 'result'; curTeam = -1; lotTimes.push(Date.now() - (lot.t0 || Date.now()));
    renderAll();
    if (lotIdx >= LOTS.length) {
      setCall(S.final === 'on' ? 'Semua lot terjual! Bersiaplah untuk… <b>TARUHAN TERAKHIR!</b>' : 'Semua lot terjual! Saatnya menghitung poin…', 'go');
      if (autoNext) nextTimer = setTimeout(() => { nextTimer = null; finishGame(); }, 2200 * TS);
      renderHammer(); return;
    }
    if (autoNext) nextTimer = setTimeout(() => { nextTimer = null; if (phase === 'result' && !QC.isBusy()) startLot(); else if (phase === 'result') waitIdleThen(startLot); }, 3600 * TS);
    renderHammer();
  }
  function waitIdleThen(fn) { const g = gameSeq; const iv = setInterval(() => { if (g !== gameSeq || phase !== 'result') { clearInterval(iv); return; } if (!QC.isBusy() && !held) { clearInterval(iv); fn(); } }, 400); }
  function holdNext() { clearNext(); held = true; renderHammer(); setCall('⏸ Ditahan. Klik <b>▶ Lot berikutnya</b> bila sudah siap.', ''); }
  function finishGame() {
    clearNext();
    if (phase === 'over' || ['finalIntro', 'fstake', 'fanswer', 'freveal'].includes(phase)) return;
    if (S.final === 'on' && T.length) startFinal(); else endGame('lot');
  }

  /* ------------------------------ Taruhan Terakhir ------------------------------ */
  const stakeVal = (t, p) => (p >= 1 ? t.points : Math.round((t.points * p) / 10) * 10);
  async function startFinal() {
    phase = 'finalIntro'; const gid = gameSeq; clearNext(); lot = null; curTeam = -1;
    giveBantuan();
    const q = shapeQ(pickQ('sulit'), 4);
    if (!q) { endGame('lot'); return; }
    fin = { q, stake: T.map(() => null), ans: T.map(() => null), shown: T.map(() => false), res: T.map(() => null), tLeft: 0, tMax: S.time + 10, done: false };
    renderTag(false); renderAll(); hideStamp();
    SND.boom(); FX.flash('rgba(242,193,78,.35)', 500);
    stamp('🏁 TARUHAN TERAKHIR', 'Taruhan rahasia • jawaban rahasia • dibuka bersama!', 'final');
    setCall('Babak penentuan: <b>TARUHAN TERAKHIR!</b>', 'go');
    await sleep(2300); if (gid !== gameSeq) return; hideStamp();
    phase = 'fstake'; showFinalPanel(); renderAll(); SND.call(2);
    setCall('Setiap tim memilih <b>taruhan rahasia</b> di papannya. Soal muncul setelah semua terkunci.', 'go');
  }
  function showFinalPanel() {
    const el = $('finalQ'); el.hidden = false; el.className = 'finalq ph-' + phase;
    if (phase === 'fstake') {
      const n = fin.stake.filter((v) => v != null).length;
      el.innerHTML = `<div class="fq-card"><div class="fq-title">🏁 TARUHAN TERAKHIR</div>
        <div class="fq-steps"><span><i>1</i>Pilih taruhan <b>rahasia</b></span><span><i>2</i>Kunci jawaban <b>rahasia</b></span><span><i>3</i>Dibuka bersama!</span></div>
        <p class="fq-rule">✅ Benar = poin <b>+ taruhan</b> &nbsp; ❌ Salah = poin <b>− taruhan</b>${jackpot > 0 ? ` &nbsp; 💰 Sisa Jackpot <b>${fmt(jackpot)}</b> dibagi rata untuk tim yang benar` : ''}</p>
        <div class="fq-hint">Soal final tingkat <b>🔴 Sulit</b> • boleh 💥 SEMUA poin</div>
        <div class="fq-lockc" id="fqLockS">🔒 <b>${n}</b> / ${T.length} tim sudah mengunci taruhan</div>
        <button class="fq-go" id="fqGo"><span>▶ Lanjut ke soal <kbd>Spasi</kbd></span><small>tim yang belum memilih = taruhan 0</small></button></div>`;
    } else {
      const q = fin.q; const ks = QC.optionsOf(q); const n = fin.ans.filter((v) => v != null).length;
      el.innerHTML = `<div class="fq-card"><div class="fq-head"><span class="fq-title sm">🏁 SOAL FINAL</span><span class="fq-time" id="fqTime">${Math.ceil(fin.tLeft) || fin.tMax}</span></div>
        <div class="fq-q">${esc(q.question)}</div>
        <div class="fq-opts n${ks.length}">${ks.map((k) => `<div class="fq-o k-${k}" data-k="${k}"><b>${k}</b><span>${esc(q['option' + k])}</span></div>`).join('')}</div>
        <div class="fq-lockc" id="fqLock">${phase === 'freveal' ? '🥁 Membuka jawaban…' : `🔒 <b>${n}</b> / ${T.length} tim sudah mengunci jawaban — tekan huruf di papan tim`}</div>
        ${q.explanation ? `<div class="fq-exp" hidden>💡 ${esc(q.explanation)}</div>` : ''}
        ${phase === 'fanswer' ? '<button class="fq-go" id="fqGo"><span>🔓 Buka jawaban <kbd>Spasi</kbd></span><small>tim yang belum mengunci = dianggap salah</small></button>' : ''}</div>`;
    }
    const go = $('fqGo'); if (go) go.onclick = (e) => { e.currentTarget.blur(); SND.ac(); mainAction(); };
  }
  function setStake(t, amount) {
    const tm = T[t]; if (!tm || phase !== 'fstake' || fin.stake[t] != null) return false;
    const v = clamp(Math.round(+amount || 0), 0, tm.points); if (v > tm.points) audit.over++;
    fin.stake[t] = v; SND.lock(); burst(pad(t), { emojis: ['🔒', '✨'], count: 6, spread: 70 });
    renderPads(); const lc = $('fqLockS'); if (lc) lc.innerHTML = `🔒 <b>${fin.stake.filter((x) => x != null).length}</b> / ${T.length} tim sudah mengunci taruhan`;
    if (fin.stake.every((x) => x != null)) { const g = gameSeq; setTimeout(() => { if (g === gameSeq && phase === 'fstake') beginFinalAnswer(); }, 700 * TS); }
    return true;
  }
  function beginFinalAnswer() {
    if (phase !== 'fstake') return false;
    fin.stake = fin.stake.map((v) => (v == null ? 0 : v));
    phase = 'fanswer'; fin.tLeft = fin.tMax; let last = performance.now(); let lastS = -1;
    showFinalPanel(); renderAll(); SND.open(); setCall('Baca soalnya, diskusikan, lalu <b>kunci jawaban</b> di papan tim. Rahasia!', 'go');
    clearInterval(finIv);
    finIv = setInterval(() => {
      const now = performance.now(); const dt = (now - last) / 1000 / TS; last = now;
      if (phase !== 'fanswer') { clearInterval(finIv); return; }
      if (QC.isBusy()) return;
      fin.tLeft -= dt; const s = Math.max(0, Math.ceil(fin.tLeft)); const te = $('fqTime');
      if (s !== lastS) { lastS = s; if (te) { te.textContent = s; te.classList.toggle('hurry', s <= 5); } if (s <= 5 && s > 0) SND.tick(); }
      if (fin.tLeft <= 0) { clearInterval(finIv); revealFinal(); }
    }, 200);
    return true;
  }
  function lockAnswer(t, key) {
    const tm = T[t]; if (!tm || phase !== 'fanswer' || fin.ans[t] != null) return false;
    key = String(key || '').toUpperCase(); if (!QC.optionsOf(fin.q).includes(key)) return false;
    fin.ans[t] = key; SND.lock(); burst(pad(t), { emojis: ['🔒', '✨'], count: 6, spread: 70 });
    renderPads(); const lc = $('fqLock'); const n = fin.ans.filter((v) => v != null).length;
    if (lc) lc.innerHTML = `🔒 <b>${n}</b> / ${T.length} tim sudah mengunci jawaban — tekan huruf di papan tim`;
    if (fin.ans.every((x) => x != null)) { const g = gameSeq; setTimeout(() => { if (g === gameSeq && phase === 'fanswer') revealFinal(); }, 600 * TS); }
    return true;
  }
  async function revealFinal() {
    if (phase !== 'fanswer') return false;
    clearInterval(finIv); phase = 'freveal'; const gid = gameSeq; showFinalPanel(); renderAll();
    setCall('🥁 Semua jawaban terkunci… <b>buka!</b>', 'count'); SND.drum(1.5);
    await sleep(1700); if (gid !== gameSeq) return false;
    const q = fin.q; const el = $('finalQ');
    el.querySelectorAll('.fq-o').forEach((o) => o.classList.add(o.dataset.k === q.correct ? 'right' : 'dim'));
    const ex = el.querySelector('.fq-exp'); if (ex) ex.hidden = false;
    const lc = $('fqLock'); if (lc) lc.innerHTML = `✅ Jawaban benar: <b>${q.correct}. ${esc(q['option' + q.correct])}</b>`;
    SND.chime(); setCall(`Jawaban benar: <b>${q.correct}</b>! Sekarang kita buka papan setiap tim…`, 'go');
    await sleep(1300); if (gid !== gameSeq) return false;
    const order = [...T].sort((a, b) => a.points - b.points || b.id - a.id);
    for (const tm of order) {
      const ans = fin.ans[tm.id]; const ok = ans === q.correct; const st = Math.min(fin.stake[tm.id] || 0, tm.points);
      tm.asked++; if (ok) tm.correct++;
      const delta = ok ? st : -st; fin.res[tm.id] = { ans, ok, stake: st, delta }; fin.shown[tm.id] = true;
      if (ok) { tm.points += st; SND.coin(); burst(pad(tm.id), { emojis: ['🎉', '🪙', '✨'], count: 14, spread: 140 }); }
      else { tm.points -= st; SND.lose(); FX.shake(pad(tm.id), 8, 380); }
      chk(); renderPads();
      float(ptsEl(tm.id), (delta >= 0 ? '+' : '−') + fmt(Math.abs(delta)), ok ? '#4ade80' : '#fca5a5', 32);
      setCall(`${esc(tm.name)}: jawaban <b>${ans || '—'}</b> ${ok ? '✔' : '✘'} • taruhan <b>${fmt(st)}</b>`, ok ? 'win' : 'lose');
      await sleep(1250); if (gid !== gameSeq) return false;
    }
    const winners = T.filter((t) => fin.res[t.id].ok);
    if (jackpot > 0 && winners.length) {
      const share = Math.floor(jackpot / winners.length); const jp = jackpot; jackpot = 0; renderTop(); SND.jackpot();
      winners.forEach((t) => { t.points += share; FX.fly($('jpBox'), ptsEl(t.id), '💰', 5, 850); setTimeout(() => float(ptsEl(t.id), '💰 +' + fmt(share), '#fde047', 28), 700 * TS); });
      chk(); renderPads(); setCall(`💰 Sisa Jackpot <b>${fmt(jp)}</b> dibagi untuk ${winners.length} tim yang benar!`, 'win');
      await sleep(1500); if (gid !== gameSeq) return false;
    }
    fin.done = true; await sleep(700); if (gid !== gameSeq) return false;
    endGame('final');
    return true;
  }

  /* ------------------------------ Akhir permainan ------------------------------ */
  function memberDetail(rows) {
    return `<h4>${teamMode() ? '🙋 Jawaban benar tiap anggota' : '🙋 Jawaban benar'}</h4>` + rows.map((t) => `<div class="wd" style="--pc:${t.color}"><b>${esc(t.name)}</b><span>${t.members && t.members.length
      ? t.members.map((m) => `<i>${esc(m.name)} <em>✔${m.correct}</em><small>/${m.asked}</small></i>`).join('') : `<i>✔ ${t.correct} dari ${t.asked} soal</i>`}</span></div>`).join('');
  }
  function endGame(reason) {
    if (phase === 'over') return; stopAuction(); clearNext(); clearInterval(finIv);
    phase = 'over'; lastEnd = reason; tEnd = Date.now(); renderClock(); renderAll();
    const rows = [...T].sort((a, b) => b.points - a.points || b.correct - a.correct || a.id - b.id);
    const w = rows[0]; const tie = rows[1] && rows[1].points === w.points && rows[1].correct === w.correct;
    setCall(tie ? 'Hasil akhir: <b>SERI!</b>' : `🏆 <b>${esc(w.name)}</b> menjadi JUARA LELANG!`, 'win');
    addLog(`🏁 Selesai. Juara: ${esc(w.name)}`);
    QC.showWinner({
      title: tie ? 'SERI!' : `${esc(w.name)} — JUARA LELANG!`,
      ranking: rows.map((t) => ({ player: { name: t.name, avatar: t.avatar, color: t.color }, value: `⭐ ${fmt(t.points)}<small>✔ ${t.correct}/${t.asked} • 🔨 ${t.won} lot${t.bantuan ? ' • 🤝 ' + t.bantuan : ''}</small>` })),
      unit: '', note: `${reason === 'final' ? 'Setelah Taruhan Terakhir' : `${LOTS.length} lot selesai`} • Poin terbanyak menjadi juara • Lama bermain ${clock(tEnd - tStart)}`
    }).then((v) => (v === 'setup' ? openSetup() : newGame()));
    const ov = [...document.querySelectorAll('.qc-winner')].pop(); const body = ov && ov.querySelector('.qc-modal-body');
    if (body) { const d = document.createElement('div'); d.className = 'win-detail'; d.innerHTML = memberDetail(rows); body.appendChild(d); }
    if (ov) { const b = [...ov.querySelectorAll('.qc-actions button')].find((x) => /Ubah/.test(x.textContent)); if (b) b.textContent = '⚙️ Ubah Tim'; }
  }

  /* ------------------------------ Aturan ------------------------------ */
  const RULES_SHORT = `<ul>
    <li>🏷️ Setiap ronde satu <b>lot</b> dilelang: lihat <b>tingkat soal</b> & <b>pengali hadiah</b>.</li>
    <li>✋ Tawar dengan tombol <b>+50 / +100 / +200</b> di papan tim. Batasnya = poin tim.</li>
    <li>🔨 Waktu habis → <b>TERJUAL!</b> Penawar tertinggi membayar lalu menjawab.</li>
    <li>✅ Benar = tawaran × hadiah. ❌ Salah = tawaran masuk 💰 Jackpot, tim lain boleh ⚡ rebutan.</li>
    <li>🏁 Akhir: <b>Taruhan Terakhir</b> — taruhan & jawaban rahasia. Poin terbanyak juara!</li></ul>`;
  function RULES() {
    return `<h4>🔨 Jalannya lelang</h4><ul>
      <li>Setiap tim mulai dengan <b>${fmt(S.modal)} poin</b>. Ada <b>${S.lots} lot</b>, lalu babak <b>🏁 Taruhan Terakhir</b>${S.final === 'on' ? '' : ' (dimatikan)'}.</li>
      <li>Setiap lot menunjukkan tingkat soal: <b>🟢 Mudah</b> (×1,5 • satu pilihan salah dibuang), <b>🟡 Sedang</b> (×2), <b>🔴 Sulit</b> (×3), <b>⚡ Kilat</b> (×2,5 • hanya ${KILAT_TIME} detik).</li>
      <li>Tekan <b>+50 / +100 / +200</b> di papan tim untuk menaikkan tawaran (tawaran pertama minimal harga buka). Tawaran tidak boleh melebihi poin tim — bila kurang, tombol menjadi <b>ALL-IN</b>.</li>
      <li>Hitung mundur ±${S.lelang} detik, bertambah sedikit setiap ada tawaran baru. <i>"Satu… dua… TERJUAL!"</i> Guru boleh menekan <b>🔨 Ketuk Palu</b> (Spasi) kapan saja.</li>
      <li>Penawar tertinggi <b>membayar</b> tawarannya lalu menjawab (anggota tim bergiliran). <b>Benar</b> = mendapat tawaran × pengali. <b>Salah</b> = tawaran hangus ke <b>💰 Jackpot</b>, lalu tim lain boleh <b>⚡ merebut</b> soal (hadiah ½ tawaran).</li>
      <li>Tidak ada yang menawar? <b>🤫 Lelang Diam</b>: soal untuk semua tim, siapa cepat dia dapat.</li>
      <li>Poin di bawah ${BANTUAN_LINE}? Tim mendapat <b>🤝 dana bantuan +${BANTUAN}</b> supaya tetap bisa ikut.</li></ul>
      <h4>🎁 Lot spesial</h4><ul>
      <li><b>🎁 Kotak Misteri</b> — efek acak setelah terjual: hadiah ×3, bonus +150, bebas risiko, 2 pilihan saja, curi poin… atau <b>zonk</b>!</li>
      <li><b>🛡️ Kartu Asuransi</b> — benar = tawaran kembali + kartu. Kartu otomatis melindungi 1× jawaban salah (tawaran kembali).</li>
      <li><b>✖️2 Kartu Ganda</b> — benar = tawaran kembali + kartu. Hadiah lot berikutnya yang dijawab benar dikali 2.</li>
      <li><b>💰 Lot Jackpot</b> — benar = hadiah ×2 + seluruh isi Jackpot.</li></ul>
      <h4>🏁 Taruhan Terakhir</h4><ul>
      <li>Setiap tim memilih taruhan rahasia (25% / 50% / 75% / 💥 SEMUA), lalu soal muncul dan tim mengunci jawaban secara rahasia (papan hanya menampilkan 🔒 terkunci).</li>
      <li>Dibuka bersama: benar = poin + taruhan, salah = poin − taruhan. Sisa Jackpot dibagi rata untuk tim yang benar. <b>Poin terbanyak menjadi Juara Lelang!</b></li></ul>
      <h4>⌨️ Tombol keyboard</h4><ul>
      <li>${T.length ? T.map((t) => `${esc(t.name)}: <b>${KEYS[t.id].slice(0, 3).join(' ')}</b>`).join(' • ') : 'Tim 1: 1 2 3 • Tim 2: Q W E • Tim 3: A S D • Tim 4: Z X C'} (Taruhan Terakhir: 4 tombol, termasuk ${KEYS.map((k) => k[3]).join('/')}).</li>
      <li>Guru: <b>Spasi / Enter</b> = ketuk palu / lot berikutnya. Rebutan: tekan nomor tim.</li></ul>`;
  }

  /* ------------------------------ Pengaturan & mulai ------------------------------ */
  const KEY_TIM = 'lokamain_lelang-juara_tim';
  const LOT_OPTS = [[8, '8 lot (±10–14 menit)'], [10, '10 lot (±12–17 menit)'], [12, '12 lot (±15–20 menit)'], [15, '15 lot (±18–25 menit)']];
  function customizeSetup(o, st) {
    o.classList.add('lj-setup');
    const panel = o.querySelector('.qc-panel'); const h3 = panel && panel.querySelector('h3'); if (!h3) return;
    h3.textContent = '👥 Jumlah Tim';
    const tip = o.querySelector('.qc-players + .qc-muted'); if (tip) tip.textContent = 'Klik lambang untuk menggantinya • Tulis nama anggota supaya semua murid bergiliran menjawab';
    const setBox = o.querySelector('.qc-settings');
    const ready = document.createElement('p'); ready.className = 'lj-ready';
    const syncReady = () => { const s = o.querySelector('[data-set="lot"]'); const v = s ? +s.value : 12; const lbl = (LOT_OPTS.find((x) => x[0] === v) || LOT_OPTS[2])[1].replace(/^\d+ lot /, ''); ready.innerHTML = `✅ Pengaturan bawaan sudah pas: <b>${v} lot + Taruhan Terakhir</b> ${lbl}. Isi nama tim, lalu langsung klik <b>▶ MULAI MAIN</b>.`; };
    if (setBox) {
      const adv = document.createElement('details'); adv.className = 'lj-adv';
      adv.innerHTML = '<summary>⚙️ Pengaturan lanjutan <small>(opsional — bawaan sudah pas, langsung klik Mulai saja)</small></summary>';
      setBox.insertAdjacentElement('beforebegin', adv); adv.appendChild(setBox); adv.insertAdjacentElement('beforebegin', ready);
      const ls = o.querySelector('[data-set="lot"]'); if (ls) ls.addEventListener('change', syncReady); syncReady();
    }
    const sm = o.querySelector('details.qc-rules'); if (sm) { sm.removeAttribute('open'); const s2 = sm.querySelector('summary'); if (s2) s2.textContent = '📜 Cara Main Singkat'; }
    const deco = () => {
      o.querySelectorAll('.qc-seg button').forEach((b) => (b.textContent = `${b.dataset.n} Tim`));
      o.querySelectorAll('.qc-prow').forEach((row) => {
        const ni = row.querySelector('[data-name]'); if (!ni) return; const i = +ni.dataset.name;
        if (/^Pemain \d$/.test(ni.value.trim())) { ni.value = TEAM_NAMES[i]; ni.dispatchEvent(new Event('input')); }
        const pn = row.querySelector('.qc-pnum'); if (pn) pn.textContent = 'T' + (i + 1);
        let m = row.querySelector('.lj-mem');
        if (!m) {
          m = document.createElement('textarea'); m.className = 'qc-input lj-mem'; m.rows = 1; m.maxLength = 300; m.placeholder = '👤 Anggota (boleh kosong): Andi, Sari, Budi…';
          m.value = st.members[i] || ''; const fit = () => { m.style.height = 'auto'; m.style.height = Math.min(96, m.scrollHeight + 2) + 'px'; };
          m.oninput = () => { st.members[i] = m.value; fit(); }; requestAnimationFrame(fit); m.onkeydown = (e) => e.stopPropagation(); row.appendChild(m);
        }
      });
    };
    const pl = o.querySelector('.qc-players'); if (pl && window.MutationObserver) new MutationObserver(deco).observe(pl, { childList: true });
    deco();
  }
  async function openSetup() {
    gameSeq++; stopAll(); phase = 'idle'; lot = null; tStart = 0; tEnd = 0;
    $('brief').hidden = true; hideStamp(); $('finalQ').hidden = true; $('mystery').hidden = true;
    const saved = store(KEY_TIM) || {}; const st = { members: Array.isArray(saved.members) ? saved.members.slice(0, 4) : [] };
    const pr = QC.setup({
      logo: '🔨', subtitle: 'Tawar soalnya, ketuk palunya, jawab dengan benar! Tim dengan poin terbanyak menjadi <b>Juara Lelang</b>.',
      min: 2, max: 4, defaultCount: 4, defaultNames: TEAM_NAMES, avatars: AVATARS, colors: COLORS,
      settings: [
        { key: 'lot', label: '🔨 Jumlah lot', value: 12, options: LOT_OPTS },
        { key: 'modal', label: '🪙 Poin awal', value: 1000, options: [[1000, '1.000 poin'], [1500, '1.500 poin'], [2000, '2.000 poin']] },
        { key: 'waktu', label: '⏱️ Waktu menjawab', value: 20, options: [[15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [45, '45 detik']] },
        { key: 'lelang', label: '⏳ Waktu lelang', value: 9, options: [[7, '7 detik (cepat)'], [9, '9 detik'], [12, '12 detik (santai)']] },
        { key: 'rebut', label: '⚡ Soal Rebutan', value: 'on', options: [['on', 'Nyala'], ['off', 'Mati']] },
        { key: 'spesial', label: '🎁 Lot spesial', value: 'on', options: [['on', 'Nyala'], ['off', 'Mati']] },
        { key: 'final', label: '🏁 Taruhan Terakhir', value: 'on', options: [['on', 'Nyala'], ['off', 'Mati']] },
        { key: 'diskusi', label: '💬 Diskusi tim', value: 'on', options: [['on', 'Boleh'], ['off', 'Tidak boleh']] }
      ],
      rulesHtml: RULES_SHORT
    });
    const o = [...document.querySelectorAll('.qc-setup')].pop(); if (o) customizeSetup(o, st);
    renderTag(false); renderAll();
    const r = await pr; const set = r.settings;
    S.lots = LOT_OPTS.some((x) => x[0] === +set.lot) ? +set.lot : 12; S.modal = clamp(+set.modal || 1000, 500, 5000);
    S.time = clamp(+set.waktu || 20, 10, 60); S.lelang = clamp(+set.lelang || 9, 5, 15);
    S.rebut = set.rebut === 'off' ? 'off' : 'on'; S.spesial = set.spesial === 'off' ? 'off' : 'on'; S.final = set.final === 'off' ? 'off' : 'on'; S.diskusi = set.diskusi === 'off' ? 'off' : 'on';
    store(KEY_TIM, { members: st.members });
    T = r.players.map((p, i) => ({ id: i, name: p.name, avatar: p.avatar, color: p.color || COLORS[i], members: parseMembers(st.members[i]).map((n) => ({ name: n, asked: 0, correct: 0 })) }));
    newGame();
  }
  function stopAll() { stopAuction(); clearNext(); clearInterval(finIv); rebDecide = null; rebutOpen = false; held = false; }
  function newGame() {
    gameSeq++; stopAll();
    T.forEach((t, i) => Object.assign(t, { id: i, points: S.modal, shown: S.modal, mi: 0, asked: 0, correct: 0, won: 0, spent: 0, earned: 0, lost: 0, saved: 0, rebut: 0, bantuan: 0, cards: { asuransi: 0, ganda: 0 }, _mode: null }));
    T.forEach((t) => t.members.forEach((m) => { m.asked = 0; m.correct = 0; }));
    LOTS = buildLots(S.lots, S.spesial === 'on'); lotIdx = 0; lot = null; jackpot = JP_SEED; jpShown = JP_SEED;
    price = 0; leader = -1; curTeam = -1; curQ = null; fin = null; tStart = 0; tEnd = 0; lastEnd = ''; logList.length = 0; history.length = 0; lotTimes.length = 0;
    Object.assign(audit, { neg: 0, over: 0, bids: 0, maxBid: 0 });
    phase = 'brief'; hideStamp(); $('finalQ').hidden = true; $('mystery').hidden = true;
    buildPads(); renderTag(false); renderAll(); renderClock(); showBrief();
    setCall('Selamat datang di <b>Balai Lelang Juara</b>!', '');
  }
  function showBrief() {
    const tim = teamMode(); const spc = S.spesial === 'on';
    $('brief').innerHTML = `<div class="brief-card"><span class="stampx">🔨 BALAI LELANG KUIS</span><h2>LELANG JUARA</h2>
      <p class="brief-sub">Tawar soalnya, jawab dengan benar, kumpulkan poin terbanyak!</p>
      <div class="brief-teams">${T.map((t, i) => `<span class="bt-g">${i ? '<b class="vs">VS</b>' : ''}<span class="brief-team" style="--pc:${t.color}">${t.avatar} ${esc(t.name)}${tim && t.members.length ? `<small>👥 ${t.members.length}</small>` : ''}</span></span>`).join('')}</div>
      <div class="bf-steps">
        <div class="bf-st" style="--d:0s"><i>🏷️</i><b>1. Lihat lot</b><span>Tingkat soal <em>Mudah / Sedang / Sulit / ⚡ Kilat</em> & hadiah <em>×</em></span></div>
        <div class="bf-st" style="--d:.1s"><i>✋</i><b>2. Tawar!</b><span>Tekan <em>+50 / +100 / +200</em> di papan timmu. Batasnya = poinmu</span></div>
        <div class="bf-st" style="--d:.2s"><i>🔨</i><b>3. TERJUAL!</b><span>Penawar tertinggi <em>membayar</em> lalu menjawab soal</span></div>
        <div class="bf-st" style="--d:.3s"><i>✅</i><b>4. Benar = untung</b><span>Tawaran × hadiah. Salah? Tawaran masuk <em>💰 Jackpot</em>${S.rebut === 'on' ? ', tim lain boleh ⚡ rebutan' : ''}</span></div>
        ${S.final === 'on' ? '<div class="bf-st hot" style="--d:.4s"><i>🏁</i><b>5. Taruhan Terakhir</b><span>Taruhan & jawaban <em>rahasia</em>. Poin terbanyak juara!</span></div>' : ''}
      </div>
      <div class="bf-keys">⌨️ ${T.map((t) => `<span style="--pc:${t.color}">${esc(t.name)}: <kbd>${KEYS[t.id][0]}</kbd><kbd>${KEYS[t.id][1]}</kbd><kbd>${KEYS[t.id][2]}</kbd></span>`).join('')}<span class="g">Guru: <kbd>Spasi</kbd> ketuk palu</span></div>
      <details class="bf-more"><summary>📜 Aturan lengkap ${spc ? '& lot spesial 🎁🛡️✖️2💰' : ''}</summary><div class="rules-pop">${RULES()}</div></details>
      <p class="bf-meta">🔨 ${S.lots} lot${S.final === 'on' ? ' + 🏁 Taruhan Terakhir' : ''} • 🪙 ${fmt(S.modal)} poin per tim • ⏱️ ${S.time} detik per soal${tim ? ' • 🙋 anggota menjawab bergiliran' : ''}</p>
      <button class="go-btn" id="btnGo">🔨 BUKA LELANG!<small>SPASI</small></button></div>`;
    $('brief').hidden = false; $('btnGo').onclick = (e) => { e.currentTarget.blur(); startMatch(); };
  }
  function startMatch() { if (phase !== 'brief') return false; SND.ac(); QC.sfx.click(); $('brief').hidden = true; tStart = Date.now(); tEnd = 0; renderClock(); startLot(); return true; }

  /* ------------------------------ Masukan ------------------------------ */
  function mainAction() {
    if (QC.isBusy()) return false;
    if (phase === 'brief') return startMatch();
    if (phase === 'auction') { hammerDown(); return true; }
    if (phase === 'result') { if (lotIdx >= LOTS.length) { finishGame(); return true; } startLot(); return true; }
    if (phase === 'fstake') { beginFinalAnswer(); return true; }
    if (phase === 'fanswer') { revealFinal(); return true; }
    return false;
  }
  function padAction(t, act, val) {
    if (!T[t] || QC.isBusy()) return false;
    if (act === 'bid') return placeBid(t, +val).ok;
    if (act === 'stake') return setStake(t, stakeVal(T[t], STAKES[+val]));
    if (act === 'ans') return lockAnswer(t, val);
    return false;
  }
  function padKey(t, i) {
    if (phase === 'auction' && i < 3) return padAction(t, 'bid', STEPS[i]);
    if (phase === 'fstake') return padAction(t, 'stake', i);
    if (phase === 'fanswer') { const ks = QC.optionsOf(fin.q); if (ks[i]) return padAction(t, 'ans', ks[i]); }
    return false;
  }
  const padsEl = $('pads');
  const fromBtn = (e) => { const b = e.target.closest('button.pb'); if (!b || b.disabled) return null; const p = b.closest('.pad'); return p ? { b, t: +p.id.slice(3) } : null; };
  padsEl.addEventListener('pointerdown', (e) => {
    const h = fromBtn(e); if (!h) return; e.preventDefault(); SND.ac();
    const { b, t } = h; b.classList.remove('press'); void b.offsetWidth; b.classList.add('press');
    padAction(t, b.dataset.act, b.dataset.act === 'bid' ? b.dataset.a : b.dataset.act === 'stake' ? b.dataset.i : b.dataset.k);
  });
  padsEl.addEventListener('click', (e) => { if (e.detail !== 0) return; const h = fromBtn(e); if (h) padAction(h.t, h.b.dataset.act, h.b.dataset.act === 'bid' ? h.b.dataset.a : h.b.dataset.act === 'stake' ? h.b.dataset.i : h.b.dataset.k); });
  QC.onKey = (e) => {
    const k = e.key; const up = k.length === 1 ? k.toUpperCase() : k;
    if (k === ' ' || k === 'Enter') { e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); if (!e.repeat) mainAction(); return; }
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    for (const t of T) { const i = KEYS[t.id].indexOf(up); if (i >= 0) { e.preventDefault(); padKey(t.id, i); return; } }
  };
  $('btnHammer').onclick = (e) => { e.currentTarget.blur(); SND.ac(); mainAction(); };
  (() => { const b = document.createElement('button'); b.className = 'hold-btn'; b.id = 'btnHold'; b.hidden = true; b.innerHTML = '⏸ Tahan'; b.onclick = (e) => { e.currentTarget.blur(); holdNext(); }; $('auctioneer').querySelector('.gavelzone').appendChild(b); })();
  $('btnRules').onclick = (e) => { e.currentTarget.blur(); QC.modal({ icon: '📜', title: 'Peraturan Lelang Juara', html: `<div class="rules-pop">${RULES()}</div>`, cls: 'lj-rules', dismissable: true }); };
  $('btnSetup').onclick = async (e) => {
    e.currentTarget.blur(); if (document.querySelector('.qc-setup.show')) return;
    if (!['idle', 'over', 'brief'].includes(phase)) {
      const ok = await QC.modal({ icon: '⚙️', title: 'Kembali ke pengaturan?', html: '<p class="qc-muted">Permainan yang sedang berjalan akan dihentikan.</p>', buttons: [{ label: 'Batal', value: false }, { label: 'Ya, ke Pengaturan', value: true, primary: true }] });
      if (!ok) return;
    }
    openSetup();
  };

  /* ------------------------------ Kait pengujian ------------------------------ */
  window.__LJ = {
    get phase() { return phase; },
    state: () => ({
      phase, lot: lotIdx, lots: LOTS.length, settings: { ...S }, lite: LITE,
      cur: lot ? { n: lot.n, diff: lot.diff, sp: lot.sp, myst: lot.myst || null, open: lot.open, mult: lotMult(lot) } : null,
      schedule: LOTS.map((l) => ({ diff: l.diff, sp: l.sp })),
      price, leader, bidCount, tLeft: Math.max(0, +tLeft.toFixed(2)), tMax, jackpot, answerer: curAnswerer, answeringTeam: curTeam, question: curQ ? curQ.question : null, rebutOpen,
      teams: T.map((t) => ({ name: t.name, points: t.points, cards: { ...t.cards }, asked: t.asked, correct: t.correct, won: t.won, bantuan: t.bantuan, rebut: t.rebut, saved: t.saved, members: t.members.map((m) => ({ ...m })), nextAnswerer: peekAnswerer(t) ? peekAnswerer(t).name : null, padMode: t._mode })),
      final: fin ? { stakeLocked: fin.stake.map((v) => v != null), ansLocked: fin.ans.map((v) => v != null), tLeft: +fin.tLeft.toFixed(1), res: fin.res, done: fin.done, options: QC.optionsOf(fin.q) } : null,
      audit: { ...audit }, bidLog: bidLog.slice(-20), lotTimes: lotTimes.slice(), nextPending: !!nextTimer, held, started: tStart, ended: tEnd, lastEnd,
      log: logList.slice(0, 12).map((l) => l.replace(/<[^>]+>/g, ''))
    }),
    start: () => startMatch(),
    bid: (t, a = 100) => placeBid(t, a),
    hammer: () => { if (phase !== 'auction') return false; hammerDown(); return true; },
    async answer(correct) {
      let o = null;
      for (let i = 0; i < 160; i++) { o = [...document.querySelectorAll('.qc-overlay.qc-ask.show')].find((x) => x.querySelector('.qc-opt:not(:disabled)')); if (o && curQ) break; await wait(50); }
      if (!o || !curQ) return false;
      const keys = QC.optionsOf(curQ); const k = correct ? curQ.correct : keys.find((x) => x !== curQ.correct);
      o.querySelector(`.qc-opt[data-k="${k}"]`).click(); await wait(80);
      const nb = o.querySelector('[data-next]'); if (nb) nb.click(); await wait(60);
      return true;
    },
    rebut: (i) => { if (!rebDecide) return false; rebDecide(i == null || i === 'skip' ? null : +i); return true; },
    finalStake: (t, n) => setStake(t, n),
    finalStakePct: (t, i) => padAction(t, 'stake', i),
    finalLock: (t, key) => lockAnswer(t, key),
    finalCorrect: () => (fin ? fin.q.correct : null),
    toAnswer: () => beginFinalAnswer(),
    reveal: () => revealFinal(),
    next: () => { if (phase !== 'result' || QC.isBusy()) return false; mainAction(); return true; },
    hold: () => holdNext(),
    autoNext(on) { autoNext = !!on; return autoNext; },
    key: (k) => QC.onKey({ key: k, preventDefault() {} }),
    main: () => mainAction(),
    fast(on) { TS = on ? 0.12 : 1; return TS; },
    setPoints(i, n) { T[i].points = Math.max(0, n); T[i].shown = T[i].points; ptsEl(i).textContent = fmt(T[i].points); renderPads(); return T[i].points; },
    setJackpot(n) { jackpot = n; renderTop(); return n; },
    setCard(i, k, n) { T[i].cards[k] = n; renderPads(); return n; },
    forceLot(o) { forceNext = o; return true; },
    forceMyst(id) { forceMyst = id; return true; },
    setLotIndex(n) { lotIdx = clamp(n, 0, LOTS.length); renderTop(); return lotIdx; },
    setMembers(i, list) { T[i].members = parseMembers(list).map((n) => ({ name: n, asked: 0, correct: 0 })); T[i].mi = 0; renderPads(); return T[i].members.length; },
    warp(ms) { tStart -= ms; renderClock(); return Date.now() - tStart; },
    async waitPhase(ph, ms = 8000) { const t0 = performance.now(); const L = Array.isArray(ph) ? ph : [ph]; while (performance.now() - t0 < ms) { if (L.includes(phase) && !QC.isBusy()) return true; await wait(40); } return false; },
    lite: () => LITE
  };

  renderTag(false); renderAll();
  openSetup();
})();
