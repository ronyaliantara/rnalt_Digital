/* ==========================================================================
   PACU JALUR — kuis dayung berirama untuk 2–4 tim
   Terinspirasi lomba perahu tradisional Kuantan Singingi, Riau.
   Karakter, grafis & aturan orisinal; semua digambar dengan kode (tanpa file gambar/suara).

   Alur tiap ronde:
   1. SOAL   — semua tim menjawab SERENTAK di pad masing-masing (sekali, terkunci).
               Benar = +2 pendayung (+3 bila cepat). Salah = 1 pendayung turun.
   2. DAYUNG — gendang berbunyi. Tim mengetuk DAYUNG tepat pada ketukan gendang.
               PAS! = dorongan penuh, Bagus = setengah, di luar irama = OLENG (perahu melambat).
               Kekuatan dorongan dikali jumlah pendayung.
               4× PAS beruntun = AURA! Penari haluan menari & dorongan ×1.3 selama irama terjaga.
   3. Perahu pertama yang melewati garis FINIS menang. Soal habis = perahu terdepan menang.
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const FX = QC.fx; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const now = () => performance.now() / 1000;
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const LETTERS = ['A', 'B', 'C', 'D'];
  const SHAPE = { A: '▲', B: '◆', C: '●', D: '■' };
  const OC = { A: '#8b5cf6', B: '#f59e0b', C: '#10b981', D: '#ec4899' };
  const TEAMC = [
    { color: '#ef4444', dark: '#b91c1c', hull: '#7f1d1d', name: 'Tim Merah' },
    { color: '#3b82f6', dark: '#1d4ed8', hull: '#1e3a8a', name: 'Tim Biru' },
    { color: '#10b981', dark: '#047857', hull: '#064e3b', name: 'Tim Hijau' },
    { color: '#a855f7', dark: '#7e22ce', hull: '#4c1d95', name: 'Tim Ungu' }
  ];
  // Tombol keyboard per tim (jawaban A–D; tombol yang sama untuk DAYUNG)
  const KEYS = [['1', '2', '3', '4'], ['7', '8', '9', '0'], ['q', 'w', 'e', 'r'], ['u', 'i', 'o', 'p']];
  const KEYMAP = {}; KEYS.forEach((ks, t) => ks.forEach((k, j) => (KEYMAP[k] = [t, j])));

  const RIVER = { short: 250, medium: 350, long: 500 };       // panjang lintasan (meter)
  const MIN_ROW = 4; const MAX_ROW = 16;                         // jumlah pendayung
  const DRAG = 1.4;                                              // hambatan air
  const WIN_PAS = 0.085; const WIN_OK = 0.17;                    // jendela ketukan (detik)
  const AURA_AT = 4; const AURA_MUL = 1.3;
  const SKINS = ['#f6cfa0', '#e0a872', '#c68652', '#a9693e', '#f3c08f'];
  const INK = '#062a33';

  const LOGO = `<svg class="logo" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#0e7490" stroke="#062a33" stroke-width="4"/><path d="M6 37 Q32 48 56 33 L52 31 Q32 41 10 34 Z" fill="#f59e0b" stroke="#062a33" stroke-width="2.5" stroke-linejoin="round"/><path d="M56 33 q5 -10 -2 -15" stroke="#f59e0b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M18 22 l6 17 M30 20 l6 19 M42 20 l5 15" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="52" cy="17" r="3.5" fill="#fff" stroke="#062a33" stroke-width="2"/></svg>`;
  const RULES = `<ul>
    <li><b>2–4 tim</b> beradu di sungai. Tiap tim punya <b>pad</b> sendiri di bawah layar.</li>
    <li><b>SOAL</b>: semua tim menjawab <b>bersamaan</b> (A–D). Hanya <b>1 kali</b>, langsung terkunci.</li>
    <li><b>Benar</b> = <b>+2 pendayung</b> 🚣 (jawab cepat = <b>+3</b>). <b>Salah</b> = 1 pendayung turun. Makin banyak pendayung, makin kuat dorongan perahu.</li>
    <li><b>DAYUNG</b>: gendang berbunyi. Ketuk tombol <b>DAYUNG</b> tepat saat lingkaran mengecil ke tombol (pas bunyi gendang).</li>
    <li><b>PAS!</b> = dorongan penuh. <b>Bagus</b> = setengah. Ketuk <b>di luar irama</b> atau berkali-kali = perahu <b>OLENG</b> dan melambat.</li>
    <li><b>4× PAS beruntun</b> = <b>✨ AURA!</b> Penari haluan beraksi dan dorongan <b>×1.3</b> selama irama terjaga.</li>
    <li>Perahu pertama yang melewati garis <b>FINIS</b> menang. Jika soal habis, perahu <b>terdepan</b> menang.</li>
    <li>Keyboard: Tim 1 <kbd>1</kbd>–<kbd>4</kbd>, Tim 2 <kbd>7</kbd>–<kbd>0</kbd>, Tim 3 <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd><kbd>R</kbd>, Tim 4 <kbd>U</kbd><kbd>I</kbd><kbd>O</kbd><kbd>P</kbd>. Tombol yang sama untuk DAYUNG. <kbd>Spasi</kbd> = mulai / lanjut.</li></ul>`;

  QC.init({ gameId: 'uji-upload-game-admin', title: 'Pacu Jalur', avatars: ['🐊', '🦅', '🐯', '🐉', '🦈', '🐘', '🦁', '🐍', '🌊', '⚡'], colors: TEAMC.map((c) => c.color) });

  /* ------------------------------ Audio gendang ------------------------------ */
  const AU = (() => {
    let ac = null;
    function get() {
      if (QC.muted) return null;
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function tone(f, d, type, v, f2) {
      const a = get(); if (!a) return; const t = a.currentTime;
      const o = a.createOscillator(); const g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.02);
    }
    function noise(d, v, type, freq) {
      const a = get(); if (!a) return; const t = a.currentTime;
      const len = Math.floor(a.sampleRate * d); const buf = a.createBuffer(1, len, a.sampleRate); const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const s = a.createBufferSource(); s.buffer = buf; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq;
      const g = a.createGain(); g.gain.value = v; s.connect(f).connect(g).connect(a.destination); s.start(t);
    }
    return {
      unlock: get,
      dum: (accent) => { tone(accent ? 120 : 95, 0.32, 'sine', accent ? 0.5 : 0.38, 45); noise(0.06, 0.12, 'lowpass', 400); },
      tak: () => noise(0.05, 0.2, 'highpass', 2200),
      count: () => { tone(330, 0.18, 'triangle', 0.18); noise(0.05, 0.1, 'highpass', 1800); },
      go: () => { tone(220, 0.4, 'sawtooth', 0.12, 440); tone(660, 0.3, 'triangle', 0.12); },
      pas: () => { tone(880, 0.05, 'square', 0.06); noise(0.12, 0.12, 'bandpass', 1300); },
      ok: () => noise(0.1, 0.1, 'bandpass', 900),
      oleng: () => { noise(0.35, 0.25, 'lowpass', 700); tone(180, 0.25, 'sawtooth', 0.06, 90); },
      aura: () => [659, 784, 988, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.1), i * 60))
    };
  })();
  ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, () => AU.unlock(), { once: true, capture: true }));

  /* ------------------------------ Status ------------------------------ */
  let S = { rounds: 8, answerT: 15, rowT: 8, tempo: 100, river: 'medium' };
  let L = RIVER.medium;
  let T = [];                 // tim
  let phase = 'idle';         // idle | intro | ask | reveal | count | row | after | win
  let round = 0; let q = null; let qKeys = []; let askStart = 0; let lastSec = -1;
  let P = 0.6; let rowStart = 0; let nBeats = 0; let lastBeatPlayed = -99; let rowEndAt = 0;
  let winner = -1; let winAt = 0; let timers = [];
  const parts = []; const texts = [];
  const G = { W: 0, H: 0, dpr: 1, hudB: 70, padT: 600, rTop: 160, rBot: 560, laneH: 100, start: 0, finish: 0, bl: 200, crowd: [], trees: [], t: 0 };

  function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function mkTeam(p, i) {
    const c = TEAMC[i];
    return {
      i, name: p.name, avatar: p.avatar, color: c.color, dark: c.dark, hull: c.hull,
      rowers: MIN_ROW, pos: 0, v: 0, correct: 0, pas: 0, streak: 0, aura: false,
      answered: null, ansT: 0, lastBeat: -99, strokeT: 9, wobble: 0, finishT: 0,
      skins: Array.from({ length: MAX_ROW + 1 }, (_, k) => SKINS[(i * 3 + k * 2) % SKINS.length])
    };
  }

  /* ------------------------------ Tata letak ------------------------------ */
  const cv = $('cv'); const ctx = cv.getContext('2d');
  function layout() {
    const r = $('game').getBoundingClientRect();
    G.dpr = Math.min(2, window.devicePixelRatio || 1);
    G.W = r.width; G.H = r.height;
    cv.width = Math.round(G.W * G.dpr); cv.height = Math.round(G.H * G.dpr);
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    G.hudB = $('teams').getBoundingClientRect().bottom - r.top;
    G.padT = $('pads').getBoundingClientRect().top - r.top;
    const avail = Math.max(120, G.padT - G.hudB);
    const bank = clamp(avail * 0.2, 56, 130);
    G.rTop = G.hudB + bank; G.rBot = G.padT - clamp(avail * 0.04, 6, 26);
    const n = Math.max(1, T.length || 2);
    G.laneH = (G.rBot - G.rTop) / n;
    G.bl = clamp(G.W * 0.17, 150, 330);
    G.start = clamp(G.W * 0.03, 14, 40) + G.bl;
    G.finish = G.W - clamp(G.W * 0.06, 30, 90);
    const drum = $('drum'); const ds = clamp(bank - 10, 54, 120);
    drum.style.setProperty('--ds', ds + 'px'); drum.style.top = (G.hudB + 4) + 'px';
    // penonton & pohon di tepi atas
    G.crowd = []; G.trees = [];
    for (let x = 10; x < G.W; x += rnd(26, 40)) G.trees.push({ x, r: rnd(16, 30), h: rnd(0.2, 0.6) });
    for (let x = 6; x < G.W; x += rnd(13, 19)) G.crowd.push({ x, c: TEAMC[(Math.random() * 4) | 0].color, s: SKINS[(Math.random() * 5) | 0], ph: rnd(0, 6) });
  }
  new ResizeObserver(() => layout()).observe($('game'));
  addEventListener('resize', layout);

  /* ------------------------------ HUD ------------------------------ */
  function renderTeams() {
    const box = $('teams'); box.style.setProperty('--n', T.length);
    box.innerHTML = T.map((t) => `<div class="tcard" id="tc${t.i}" style="--tc:${t.color}"><span class="tav">${t.avatar}</span><div class="tinfo"><b>${esc(t.name)}</b><small id="tst${t.i}"></small></div><span class="trow" id="trw${t.i}">🚣 ${t.rowers}</span></div>`).join('');
    const pads = $('pads'); pads.style.setProperty('--n', T.length);
    pads.innerHTML = T.map((t) => `<div class="pad" id="pad${t.i}" style="--tc:${t.color};--tcd:${t.dark}"><div class="pad-head"><span class="pav">${t.avatar}</span><b>${esc(t.name)}</b><span class="pkeys">${KEYS[t.i].join(' ').toUpperCase()}</span></div><div class="pad-body" id="pb${t.i}"></div></div>`).join('');
    pads.querySelectorAll('.pad-body').forEach((b, i) => b.addEventListener('pointerdown', (e) => onPad(i, e)));
    updHud(); layout();
  }
  function updHud() {
    const lead = T.length ? T.reduce((a, b) => (b.pos > a.pos ? b : a)) : null;
    T.forEach((t) => {
      const st = $('tst' + t.i); if (st) st.textContent = `${Math.round(t.pos)} / ${L} m • ${t.correct} benar`;
      const rw = $('trw' + t.i); if (rw && rw.textContent !== `🚣 ${t.rowers}`) { rw.textContent = `🚣 ${t.rowers}`; rw.classList.remove('bump'); void rw.offsetWidth; rw.classList.add('bump'); }
      const c = $('tc' + t.i); if (c) c.classList.toggle('lead', !!lead && lead === t && t.pos > 1);
    });
    $('round').textContent = `RONDE ${round}/${S.rounds}`;
  }

  /* ------------------------------ Pad ------------------------------ */
  function padAsk(i) {
    $('pb' + i).innerHTML = `<div class="pad-ans">${LETTERS.map((k, j) => qKeys.includes(k) ? `<button class="ans" data-k="${k}" style="--oc:${OC[k]}">${SHAPE[k]} ${k}<small>${KEYS[i][j].toUpperCase()}</small></button>` : '').join('')}</div>`;
  }
  function padMsg(i, html) { $('pb' + i).innerHTML = `<div class="pad-msg">${html}</div>`; }
  function padRow(i) {
    $('pb' + i).innerHTML = `<button class="row-btn" id="rb${i}"><i class="rb-ring" id="rr${i}"></i><span>🚣 DAYUNG!</span><span class="rb-sub" id="rs${i}">ketuk pas bunyi gendang</span></button>`;
  }
  function popPad(i, txt, col) {
    const b = $('pb' + i); if (!b) return;
    const s = document.createElement('span'); s.className = 'hit-pop'; s.textContent = txt; s.style.color = col; b.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }
  function flashPad(i, cls) { const p = $('pad' + i); if (!p) return; p.classList.remove(cls); void p.offsetWidth; p.classList.add(cls); }

  function onPad(i, e) {
    if (phase === 'ask') {
      const b = e.target.closest('.ans'); if (!b) return;
      e.preventDefault(); answer(i, b.dataset.k);
    } else if (phase === 'row' || phase === 'count') {
      if (!e.target.closest('.row-btn')) return;
      e.preventDefault(); stroke(i);
    }
  }

  /* ------------------------------ Kartu tengah ------------------------------ */
  let cardAction = null;
  function showCard(title, html, btn, bare) {
    const m = $('msg'); m.hidden = false; m.classList.toggle('bare', !!bare);
    $('msgTitle').textContent = title; $('msgSub').innerHTML = html || '';
    const go = $('btnGo'); go.hidden = !btn; if (btn) go.innerHTML = `${btn} <small>Spasi</small>`;
  }
  function hideCard() { $('msg').hidden = true; cardAction = null; }
  $('btnGo').onclick = () => { QC.sfx.click(); if (cardAction) { const f = cardAction; cardAction = null; f(); } };

  /* ------------------------------ Pengaturan ------------------------------ */
  async function openSetup() {
    clearTimers(); phase = 'idle'; hideCard(); $('board').hidden = true; $('drum').hidden = true;
    const pr = QC.setup({
      logo: LOGO,
      subtitle: 'Jawab soal untuk menambah pendayung, lalu dayung serempak mengikuti irama gendang. Perahu pertama di garis finis jadi juara!',
      min: 2, max: 4, defaultCount: 2, defaultNames: TEAMC.map((c) => c.name),
      settings: [
        { key: 'rounds', label: '🔢 Jumlah soal / ronde', value: 8, options: [[5, '5 soal'], [8, '8 soal'], [10, '10 soal'], [12, '12 soal'], [15, '15 soal']] },
        { key: 'answerT', label: '⏱️ Waktu menjawab', value: 15, options: [[10, '10 detik'], [15, '15 detik'], [20, '20 detik'], [30, '30 detik']] },
        { key: 'rowT', label: '🚣 Lama babak dayung', value: 8, options: [[5, '5 detik'], [8, '8 detik'], [10, '10 detik'], [12, '12 detik']] },
        { key: 'tempo', label: '🥁 Irama gendang', value: 100, options: [[80, 'Pelan (mudah)'], [100, 'Sedang'], [120, 'Cepat (sulit)']] },
        { key: 'river', label: '🏁 Panjang sungai', value: 'medium', options: [['short', 'Pendek (250 m)'], ['medium', 'Sedang (350 m)'], ['long', 'Panjang (500 m)']] }
      ],
      rulesHtml: RULES
    });
    const o = document.querySelector('.qc-setup');
    if (o) {
      const h3 = o.querySelector('.qc-panel h3'); if (h3) h3.textContent = '👥 Jumlah Tim';
      o.querySelectorAll('.qc-seg button').forEach((b) => (b.textContent = `${b.dataset.n} Tim`));
      const sm = o.querySelector('.qc-panel .qc-muted.small'); if (sm) sm.textContent = 'Klik ikon untuk ganti maskot tim • Nama tim bisa diubah';
    }
    const r = await pr;
    S = { ...S, ...r.settings }; L = RIVER[S.river] || RIVER.medium; P = 60 / (Number(S.tempo) || 100);
    T = r.players.slice(0, 4).map((p, i) => mkTeam(p, i));
    renderTeams(); newGame();
  }

  function newGame() {
    clearTimers();
    T.forEach((t, i) => Object.assign(t, mkTeam(t, i)));
    round = 0; winner = -1; parts.length = 0; texts.length = 0;
    $('board').hidden = true; $('drum').hidden = true;
    T.forEach((t) => padMsg(t.i, `<span><span class="big">${t.avatar}</span>Siap berlomba!</span>`));
    updHud(); phase = 'intro';
    showCard('PACU JALUR!', `Sungai ${L} m • ${S.rounds} ronde • gendang ${S.tempo} ketuk/menit<ul><li>Jawab benar = tambah pendayung 🚣</li><li>Dayung <b>pas</b> bunyi gendang = perahu melaju</li><li>4× PAS beruntun = ✨ AURA!</li></ul>`, 'MULAI');
    cardAction = () => { hideCard(); nextRound(); };
  }

  /* ------------------------------ Babak soal ------------------------------ */
  function nextRound() {
    if (round >= S.rounds) { finalDecision(); return; }
    q = QC.nextQuestion();
    if (!q) { QC.toast('⚠️ Bank soal kosong! Buka Mode Guru untuk menambah soal.', 'bad'); openSetup(); return; }
    round++; qKeys = QC.optionsOf(q);
    T.forEach((t) => { t.answered = null; t.ansT = 0; padAsk(t.i); });
    const b = $('board'); b.hidden = false; b.classList.remove('in'); void b.offsetWidth; b.classList.add('in');
    $('bNo').textContent = `SOAL ${round}`; $('bCat').textContent = q.category ? '📚 ' + q.category : '';
    $('bQ').textContent = q.question;
    $('bOpts').innerHTML = qKeys.map((k) => `<div class="b-opt" data-k="${k}" style="--oc:${OC[k]}"><b>${SHAPE[k]}</b><span>${esc(q['option' + k])}</span></div>`).join('');
    $('bRes').hidden = true; $('bTime').classList.remove('hurry');
    updStatus(); updHud();
    askStart = now(); lastSec = -1; phase = 'ask'; QC.sfx.pop();
  }
  function updStatus() {
    $('bSt').innerHTML = T.map((t) => {
      let cls = t.answered ? 'done' : ''; let txt = t.answered ? '🔒 terkunci' : '…menjawab';
      if (phase === 'reveal') {
        if (!t.answered) { cls = 'bad'; txt = 'tidak menjawab'; }
        else if (t.answered === q.correct) { cls = 'good'; txt = `✔ ${t.answered} • +${t.gain} 🚣`; }
        else { cls = 'bad'; txt = `✘ ${t.answered}${t.gain < 0 ? ' • −1 🚣' : ''}`; }
      }
      return `<span class="b-chip ${cls}" style="--tc:${t.color}">${t.avatar} ${esc(t.name)}: ${txt}</span>`;
    }).join('');
  }
  function answer(i, k) {
    const t = T[i]; if (!t || phase !== 'ask' || t.answered || !qKeys.includes(k)) return;
    t.answered = k; t.ansT = now() - askStart; QC.sfx.click();
    padMsg(i, `<span><span class="big">🔒</span>Jawaban terkunci<br><small>tunggu tim lain…</small></span>`);
    updStatus();
    if (T.every((x) => x.answered)) later(reveal, 350);
  }
  function reveal() {
    if (phase !== 'ask') return;
    phase = 'reveal';
    $('bOpts').querySelectorAll('.b-opt').forEach((o) => o.classList.add(o.dataset.k === q.correct ? 'right' : 'dim'));
    let anyGood = false;
    T.forEach((t) => {
      t.gain = 0;
      if (t.answered === q.correct) {
        anyGood = true; t.correct++;
        const fast = t.ansT <= S.answerT * 0.4;
        const before = t.rowers; t.rowers = Math.min(MAX_ROW, t.rowers + (fast ? 3 : 2)); t.gain = t.rowers - before;
        padMsg(t.i, `<span><span class="big">✔ BENAR!</span>+${t.gain} pendayung${fast ? ' (cepat!)' : ''} → 🚣 ${t.rowers}</span>`);
        flashPad(t.i, 'flash-good');
      } else {
        if (t.answered && t.rowers > MIN_ROW) { t.rowers--; t.gain = -1; }
        padMsg(t.i, `<span><span class="big">${t.answered ? '✘ SALAH' : '⏰ HABIS'}</span>${t.gain < 0 ? '1 pendayung turun' : 'pendayung tetap'} → 🚣 ${t.rowers}</span>`);
        flashPad(t.i, 'flash-bad');
      }
    });
    anyGood ? QC.sfx.correct() : QC.sfx.wrong();
    const res = $('bRes'); res.hidden = false;
    res.innerHTML = `Jawaban benar: ${q.correct}. ${esc(q['option' + q.correct])}${q.explanation ? `<span class="exp">💡 ${esc(q.explanation)}</span>` : ''}`;
    updStatus(); updHud();
    later(() => { if (phase === 'reveal') { showCard('Babak DAYUNG!', 'Ketuk <b>DAYUNG</b> tepat saat gendang berbunyi', 'SIAP', false); cardAction = () => { hideCard(); startRow(); }; } }, q.explanation ? 3600 : 2400);
  }

  /* ------------------------------ Babak dayung ------------------------------ */
  function startRow() {
    $('board').hidden = true;
    const d = $('drum'); d.hidden = false;
    T.forEach((t) => { padRow(t.i); t.lastBeat = -99; t.streak = 0; t.aura = false; });
    P = 60 / (Number(S.tempo) || 100);
    rowStart = now() + 0.35 + 3 * P;              // 3 ketukan hitung mundur
    nBeats = Math.max(4, Math.round(S.rowT / P));
    rowEndAt = rowStart + (nBeats - 1) * P + 0.55;
    lastBeatPlayed = -99; phase = 'count';
    $('drumLabel').textContent = 'SIAP…';
  }
  function beatIndex(t) { return Math.round((t - rowStart) / P); }
  function stroke(i) {
    const t = T[i]; if (!t) return;
    const tm = now();
    if (phase === 'count') { oleng(t, 'Belum mulai!'); return; }
    if (phase !== 'row') return;
    const k = beatIndex(tm); const d = Math.abs(tm - (rowStart + k * P));
    if (k < 0 || k >= nBeats) { oleng(t, 'Di luar irama!'); return; }
    if (t.lastBeat === k) { oleng(t, 'Terlalu banyak!'); return; }
    let qual = 0; let label = '';
    if (d <= WIN_PAS) { qual = 1; label = 'PAS!'; t.streak++; t.pas++; }
    else if (d <= WIN_OK) { qual = 0.55; label = 'Bagus'; }
    else { oleng(t, 'Oleng!'); return; }
    t.lastBeat = k;
    if (!t.aura && t.streak >= AURA_AT) {
      t.aura = true; AU.aura(); popPad(i, '✨ AURA!', '#fde047');
      const bx = boatBow(t); say(bx - G.bl * 0.1, laneY(t) - G.laneH * 0.42, '✨ AURA!', '#fde047', 26);
      const rb = $('rb' + i); if (rb) rb.classList.add('aura');
    } else popPad(i, label, qual === 1 ? '#fde047' : '#bbf7d0');
    const power = (1.8 + t.rowers * 0.45) * qual * (t.aura ? AURA_MUL : 1) * (P / 0.6);
    t.v += power; t.strokeT = 0;
    qual === 1 ? AU.pas() : AU.ok();
    splash(t, qual === 1 ? 7 : 4);
  }
  function oleng(t, txt) {
    t.v *= 0.55; t.streak = 0; t.wobble = 1;
    if (t.aura) { t.aura = false; const rb = $('rb' + t.i); if (rb) rb.classList.remove('aura'); }
    AU.oleng(); popPad(t.i, '💦 ' + txt, '#fecaca'); flashPad(t.i, 'flash-bad');
    say(boatBow(t) - G.bl * 0.5, laneY(t) - G.laneH * 0.35, 'OLENG!', '#fecaca', 20);
  }
  function endRow() {
    phase = 'after'; $('drum').hidden = true;
    T.forEach((t) => {
      if (t.aura) { t.aura = false; }
      padMsg(t.i, `<span><span class="big">${Math.round(t.pos)} m</span>${t.streak >= AURA_AT ? '✨ irama terjaga!' : 'Siap soal berikutnya'}</span>`);
    });
    updHud();
    later(() => { if (phase === 'after') nextRound(); }, 1900);
  }

  /* ------------------------------ Akhir lomba ------------------------------ */
  function startWin(i) {
    if (winner >= 0) return;
    winner = i; phase = 'win'; winAt = now(); clearTimers();
    $('drum').hidden = true; $('board').hidden = true;
    T.forEach((x) => { x.aura = false; });
    const t = T[i]; QC.sfx.win(); QC.confetti(180);
    big(`${t.avatar} ${t.name} FINIS!`, t.color);
    T.forEach((x) => padMsg(x.i, x === t ? `<span><span class="big">🏆 JUARA!</span>${Math.round(x.pos)} m</span>` : `<span><span class="big">${Math.round(x.pos)} m</span>lomba selesai</span>`));
    later(endGame, 2300);
  }
  function finalDecision() {
    const best = T.reduce((a, b) => (b.pos > a.pos ? b : a));
    startWin(best.i);
  }
  async function endGame() {
    const ranking = [...T].sort((a, b) => (a.i === winner ? -1 : b.i === winner ? 1 : b.pos - a.pos))
      .map((t) => ({ player: { name: t.name, avatar: t.avatar, color: t.color }, value: Math.round(t.pos) }));
    const w = T[winner];
    const note = w.pos >= L ? `${w.name} pertama melewati garis finis ${L} m!` : `Soal habis. ${w.name} paling jauh mendayung.`;
    const r = await QC.showWinner({ title: `${w.name} JUARA!`, ranking, unit: 'm', note });
    if (r === 'setup') openSetup(); else newGame();
  }

  /* ------------------------------ Tombol & keyboard ------------------------------ */
  $('btnRules').onclick = () => QC.modal({ icon: '📜', title: 'Peraturan Pacu Jalur', html: RULES, cls: 'pj-rules', dismissable: true });
  $('btnSetup').onclick = async () => {
    if (phase === 'idle') return openSetup();
    const v = await QC.modal({ icon: '⚙️', title: 'Kembali ke pengaturan?', html: '<p class="qc-muted">Lomba yang sedang berjalan akan dihentikan.</p>', buttons: [{ label: 'Batal', value: false }, { label: 'Ya, ke Pengaturan', value: true, primary: true }], dismissable: true });
    if (v === true) openSetup();
  };
  QC.onKey = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      if (!$('msg').hidden && !$('btnGo').hidden) { e.preventDefault(); $('btnGo').click(); }
      return;
    }
    const m = KEYMAP[String(e.key).toLowerCase()]; if (!m) return;
    const [ti, j] = m; if (ti >= T.length) return;
    if (phase === 'ask') { e.preventDefault(); answer(ti, LETTERS[j]); }
    else if ((phase === 'row' || phase === 'count') && !e.repeat) { e.preventDefault(); stroke(ti); }
  };

  /* ------------------------------ Efek ------------------------------ */
  function say(x, y, txt, col, size = 22, life = 1.1) { texts.push({ k: 'float', x, y, txt, col, size, life, max: life }); }
  function big(txt, col, life = 2.2) { texts.push({ k: 'big', x: G.W / 2, y: (G.rTop + G.rBot) / 2, txt, col, size: clamp(G.W * 0.05, 30, 72), life, max: life }); }
  function splash(t, n) {
    const y = laneY(t); const x0 = boatBow(t) - G.bl; const nRow = t.rowers;
    for (let k = 0; k < n; k++) {
      const x = x0 + G.bl * (0.2 + 0.65 * Math.random());
      if (parts.length < 400) parts.push({ x, y: y + G.laneH * 0.12, vx: rnd(-60, -10), vy: rnd(-120, -50), r: rnd(1.5, 3.5) * (1 + nRow / 20), life: rnd(0.4, 0.7), max: 0.7 });
    }
  }

  /* ------------------------------ Gambar ------------------------------ */
  function laneY(t) { return G.rTop + G.laneH * (t.i + 0.62); }
  function boatBow(t) { return G.start + clamp(t.pos / L, 0, 1.04) * (G.finish - G.start); }

  function drawBank() {
    // langit & tepi atas
    const sky = ctx.createLinearGradient(0, 0, 0, G.rTop);
    sky.addColorStop(0, '#7dd3fc'); sky.addColorStop(1, '#bae6fd');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, G.W, G.rTop);
    const bankY = G.rTop - Math.min(60, (G.rTop - G.hudB) * 0.75);
    ctx.fillStyle = '#4d7c0f';
    G.trees.forEach((tr) => { ctx.beginPath(); ctx.arc(tr.x, bankY + 8, tr.r, Math.PI, 0); ctx.fill(); });
    ctx.fillStyle = '#65a30d'; ctx.fillRect(0, bankY + 6, G.W, G.rTop - bankY);
    // penonton
    const cheer = phase === 'row' || phase === 'win';
    G.crowd.forEach((c) => {
      const jump = cheer ? Math.max(0, Math.sin(G.t * 9 + c.ph)) * 5 : Math.sin(G.t * 2 + c.ph);
      const y = G.rTop - 10 - jump;
      ctx.fillStyle = c.c; ctx.fillRect(c.x - 5, y - 2, 10, 12);
      ctx.fillStyle = c.s; ctx.beginPath(); ctx.arc(c.x, y - 6, 5, 0, 7); ctx.fill();
      if (cheer && Math.sin(G.t * 9 + c.ph) > 0.6) { ctx.strokeStyle = c.s; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x - 4, y); ctx.lineTo(c.x - 7, y - 12); ctx.moveTo(c.x + 4, y); ctx.lineTo(c.x + 7, y - 12); ctx.stroke(); }
    });
    ctx.fillStyle = '#a16207'; ctx.fillRect(0, G.rTop - 4, G.W, 5);
  }
  function drawRiver() {
    const g = ctx.createLinearGradient(0, G.rTop, 0, G.padT);
    g.addColorStop(0, '#0e7490'); g.addColorStop(1, '#155e75');
    ctx.fillStyle = g; ctx.fillRect(0, G.rTop, G.W, G.padT - G.rTop + 20);
    // riak air bergerak
    ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 2;
    for (let y = G.rTop + 14; y < G.rBot; y += 22) {
      const off = (G.t * 26 + y * 3) % 80;
      ctx.beginPath();
      for (let x = -off; x < G.W; x += 80) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 15, y - 4, x + 30, y); }
      ctx.stroke();
    }
    // pembatas lintasan (pelampung)
    for (let i = 1; i < T.length; i++) {
      const y = G.rTop + G.laneH * i;
      for (let x = 8; x < G.W; x += 26) { ctx.fillStyle = (x / 26) % 2 < 1 ? '#fbbf24' : '#fff'; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); }
    }
    // tanda jarak
    ctx.font = `800 ${clamp(G.laneH * 0.13, 10, 14)}px Nunito, sans-serif`; ctx.textAlign = 'center';
    [0.25, 0.5, 0.75].forEach((f) => {
      const x = G.start + f * (G.finish - G.start);
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(x, G.rTop); ctx.lineTo(x, G.rBot); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(`${Math.round(L * f)} m`, x, G.rTop + 14);
    });
    // garis start
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(G.start, G.rTop); ctx.lineTo(G.start, G.rBot); ctx.stroke();
    // gerbang finis
    const fx = G.finish; const sq = 8;
    for (let y = G.rTop; y < G.rBot; y += sq) { ctx.fillStyle = ((y - G.rTop) / sq) % 2 < 1 ? '#fff' : INK; ctx.fillRect(fx - sq / 2, y, sq, sq); }
    ctx.fillStyle = '#7c2d12'; ctx.fillRect(fx - 3, G.rTop - 46, 6, 46);
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(fx + 3, G.rTop - 46); ctx.lineTo(fx + 30 + Math.sin(G.t * 4) * 3, G.rTop - 38); ctx.lineTo(fx + 3, G.rTop - 30); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `400 ${clamp(G.laneH * 0.16, 12, 18)}px "Titan One", sans-serif`; ctx.textAlign = 'right';
    ctx.fillText('FINIS', fx - 8, G.rTop - 16);
  }

  function drawBoat(t) {
    const y = laneY(t); const bow = boatBow(t); const bl = G.bl; const stern = bow - bl;
    const h = clamp(G.laneH * 0.2, 9, 26);
    const wob = t.wobble * Math.sin(G.t * 28) * 0.07;
    ctx.save(); ctx.translate((bow + stern) / 2, y); ctx.rotate(wob); ctx.translate(-(bow + stern) / 2, -y);
    // ombak di belakang perahu
    if (t.v > 0.5) {
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
      for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(stern - k * 14, y + h * 0.3 - k * 3); ctx.lineTo(stern - k * 14 - Math.min(40, t.v * 5), y + h * 0.3); ctx.lineTo(stern - k * 14, y + h * 0.3 + k * 3); ctx.stroke(); }
    }
    // bayangan
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse((bow + stern) / 2, y + h * 0.7, bl * 0.5, h * 0.35, 0, 0, 7); ctx.fill();
    // pendayung (digambar sebelum lambung agar tubuh bawah tertutup)
    const n = t.rowers; const x0 = stern + bl * 0.16; const x1 = bow - bl * 0.2; const gap = (x1 - x0) / Math.max(1, n - 1);
    const s = t.strokeT; const sw = s < 0.28 ? lerp(-0.55, 0.75, easeOut(s / 0.28)) : lerp(0.75, -0.55, easeOut((s - 0.28) / Math.max(0.2, P - 0.28)));
    const hr = clamp(h * 0.38, 3.2, 7.5);
    for (let k = 0; k < n; k++) {
      const x = x0 + gap * k; const by = y - h * 0.15 - (s < 0.28 ? 1.5 : 0);
      ctx.fillStyle = t.color; ctx.fillRect(x - hr * 0.8, by - hr * 2.2, hr * 1.6, hr * 2.2);
      ctx.fillStyle = t.skins[k]; ctx.beginPath(); ctx.arc(x, by - hr * 2.9, hr, 0, 7); ctx.fill();
      ctx.fillStyle = INK; ctx.fillRect(x - hr, by - hr * 3.6, hr * 2, hr * 0.7); // ikat kepala
      // dayung
      const a = Math.PI / 2 + sw; const len = h * 2.6;
      const px = x + Math.cos(a) * len * 0.15; const py = by - hr * 1.6;
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = Math.max(1.6, hr * 0.42); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px - Math.cos(a) * len * 0.35, py - Math.sin(a) * len * 0.35); ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); ctx.stroke();
      ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.ellipse(px + Math.cos(a) * len, py + Math.sin(a) * len, hr * 0.55, hr * 1.2, a, 0, 7); ctx.fill();
    }
    // lambung jalur (panjang & ramping, ujung depan melengkung naik)
    ctx.beginPath();
    ctx.moveTo(stern, y - h * 0.15);
    ctx.lineTo(bow - bl * 0.06, y - h * 0.15);
    ctx.quadraticCurveTo(bow + bl * 0.02, y - h * 0.3, bow + bl * 0.03, y - h * 1.5);
    ctx.lineTo(bow - bl * 0.01, y - h * 1.45);
    ctx.quadraticCurveTo(bow - bl * 0.02, y + h * 0.45, bow - bl * 0.12, y + h * 0.55);
    ctx.quadraticCurveTo((bow + stern) / 2, y + h * 0.75, stern + bl * 0.05, y + h * 0.45);
    ctx.quadraticCurveTo(stern - bl * 0.02, y + h * 0.2, stern - bl * 0.03, y - h * 0.7);
    ctx.lineTo(stern, y - h * 0.15);
    ctx.closePath();
    ctx.fillStyle = t.hull; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    // hiasan: pita emas & warna tim
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = Math.max(2, h * 0.16); ctx.beginPath(); ctx.moveTo(stern + bl * 0.03, y + h * 0.1); ctx.lineTo(bow - bl * 0.1, y + h * 0.1); ctx.stroke();
    ctx.strokeStyle = t.color; ctx.lineWidth = Math.max(1.5, h * 0.12); ctx.beginPath(); ctx.moveTo(stern + bl * 0.05, y + h * 0.32); ctx.lineTo(bow - bl * 0.13, y + h * 0.32); ctx.stroke();
    // kepala jalur (ukiran di haluan) + selendang berkibar
    const hx = bow + bl * 0.03; const hy = y - h * 1.5;
    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(hx, hy, Math.max(3, h * 0.28), 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = t.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(hx - 12, hy - 6 + Math.sin(G.t * 7 + t.i) * 4, hx - 24, hy + Math.sin(G.t * 7 + t.i + 1) * 5); ctx.stroke();
    // penari haluan
    drawDancer(t, bow - bl * 0.1, y - h * 0.15, hr);
    // bendera tim di buritan
    const fx = stern + bl * 0.02; const fy = y - h * 0.7;
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - h * 2.2); ctx.stroke();
    ctx.fillStyle = t.color; ctx.beginPath(); ctx.moveTo(fx, fy - h * 2.2); ctx.lineTo(fx - h * 1.6, fy - h * 1.9 + Math.sin(G.t * 6 + t.i) * 2); ctx.lineTo(fx, fy - h * 1.5); ctx.fill();
    ctx.font = `${Math.round(h * 1.2)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t.avatar, stern - h * 1.1, y - h * 0.2);
    ctx.textBaseline = 'alphabetic';
    if (t.aura) {
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(G.t * 10);
      ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.ellipse((bow + stern) / 2, y - h * 0.4, bl * 0.58, h * 2.2, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function drawDancer(t, x, y, hr) {
    // Penari haluan: bergoyang santai; saat AURA atau menang, tangannya menari mengikuti irama
    const dance = t.aura || (phase === 'win' && winner === t.i);
    const beatPh = phase === 'row' ? ((now() - rowStart) / P) % 1 : (G.t * 1.5) % 1;
    const sway = dance ? Math.sin(beatPh * Math.PI * 2) * 0.35 : Math.sin(G.t * 2 + t.i) * 0.08;
    const s = hr * 1.25;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sway * 0.4);
    ctx.fillStyle = '#111827'; ctx.fillRect(-s * 0.7, -s * 3.2, s * 1.4, s * 2.6);         // baju hitam
    ctx.fillStyle = t.skins[MAX_ROW]; ctx.beginPath(); ctx.arc(0, -s * 4, s * 0.85, 0, 7); ctx.fill();
    ctx.fillStyle = INK; ctx.fillRect(-s * 0.9, -s * 4.9, s * 1.8, s * 0.55);              // tanjak
    ctx.fillStyle = '#111827'; ctx.fillRect(-s * 0.95, -s * 4.95, s * 0.7, s * 0.25);       // kacamata hitam
    ctx.fillRect(s * 0.15, -s * 4.95, s * 0.7, s * 0.25);
    ctx.strokeStyle = t.skins[MAX_ROW]; ctx.lineWidth = Math.max(2, s * 0.35); ctx.lineCap = 'round';
    const arm = dance ? Math.sin(beatPh * Math.PI * 2) : 0.2;
    ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 2.8); ctx.lineTo(-s * 1.6, -s * (2.6 + arm * 1.4)); ctx.lineTo(-s * 2.2, -s * (3.2 + arm * 1.2));
    ctx.moveTo(s * 0.6, -s * 2.8); ctx.lineTo(s * 1.6, -s * (2.6 - arm * 1.4)); ctx.lineTo(s * 2.2, -s * (3.2 - arm * 1.2)); ctx.stroke();
    ctx.restore();
  }
  function drawFx(dt) {
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k]; p.life -= dt; if (p.life <= 0) { parts.splice(k, 1); continue; }
      p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'center';
    for (let k = texts.length - 1; k >= 0; k--) {
      const tx = texts[k]; tx.life -= dt; if (tx.life <= 0) { texts.splice(k, 1); continue; }
      const f = 1 - tx.life / tx.max;
      ctx.globalAlpha = clamp(tx.life / (tx.max * 0.4), 0, 1);
      const sc = tx.k === 'big' ? 0.7 + 0.3 * easeOut(f * 4) : 1;
      ctx.font = `400 ${Math.round(tx.size * sc)}px "Titan One", sans-serif`;
      const y = tx.k === 'big' ? tx.y : tx.y - f * 30;
      ctx.lineWidth = Math.max(3, tx.size * 0.16); ctx.strokeStyle = INK; ctx.strokeText(tx.txt, tx.x, y);
      ctx.fillStyle = tx.col; ctx.fillText(tx.txt, tx.x, y);
    }
    ctx.globalAlpha = 1;
  }

  /* ------------------------------ Putaran utama ------------------------------ */
  let lastT = 0;
  function tick(dt) {
    const tm = now();
    // timer soal
    if (phase === 'ask') {
      const left = Math.max(0, S.answerT - (tm - askStart));
      $('bBar').style.width = (left / S.answerT) * 100 + '%';
      const s = Math.ceil(left);
      if (s !== lastSec) { lastSec = s; $('bTime').textContent = s; const hurry = s <= 5 && s > 0; $('bTime').classList.toggle('hurry', hurry); if (hurry) QC.sfx.tick(); }
      if (left <= 0) reveal();
    }
    // gendang: hitung mundur, lalu irama dayung
    if (phase === 'count' || phase === 'row') {
      const k = Math.floor((tm - rowStart) / P + 1e-6);
      if (k !== lastBeatPlayed && k >= -3) {
        lastBeatPlayed = k;
        const face = $('drumFace'); face.classList.remove('hit'); void face.offsetWidth; face.classList.add('hit');
        if (k < 0) { AU.count(); $('drumLabel').textContent = String(-k); }
        else if (k === 0) { phase = 'row'; AU.go(); AU.dum(true); $('drumLabel').textContent = 'DAYUNG!'; }
        else if (k < nBeats) { AU.dum(k % 4 === 0); if (k % 2) AU.tak(); $('drumLabel').textContent = `${nBeats - k} ketukan lagi`; }
      }
      const u = (((tm - rowStart) / P) % 1 + 1) % 1;               // 0 = tepat ketukan
      const sc = 2 - u;                                            // lingkaran mengecil ke ketukan berikutnya
      $('drumRing').style.transform = `scale(${sc.toFixed(3)})`;
      $('drumRing').style.opacity = (0.35 + 0.65 * u).toFixed(2);
      T.forEach((t) => {
        const r = $('rr' + t.i); if (r) { r.style.transform = `translate(-50%, -50%) scale(${(0.6 + 0.9 * (1 - u)).toFixed(3)})`; r.style.opacity = (0.3 + 0.7 * u).toFixed(2); }
        const sub = $('rs' + t.i); if (sub && phase === 'row') sub.textContent = t.aura ? `✨ AURA ×${AURA_MUL} • ${t.streak} PAS beruntun` : `PAS beruntun: ${t.streak}/${AURA_AT}`;
      });
      if (phase === 'row' && tm >= rowEndAt) endRow();
    }
    // fisika perahu
    T.forEach((t) => {
      t.pos += t.v * dt; t.v *= Math.exp(-DRAG * dt);
      if (t.v < 0.02) t.v = 0;
      t.strokeT += dt; t.wobble = Math.max(0, t.wobble - dt * 1.6);
      if ((phase === 'row' || phase === 'after') && t.pos >= L && winner < 0) startWin(t.i);
    });
    if (phase === 'row' || phase === 'after' || phase === 'win') updHudLite();
  }
  let hudAcc = 0;
  function updHudLite() { hudAcc++; if (hudAcc % 6 === 0) updHud(); }

  function frame(ts) {
    const t = ts / 1000; const dt = Math.min(0.05, t - (lastT || t)); lastT = t; G.t = t;
    if (!G.W) layout();
    tick(dt);
    ctx.clearRect(0, 0, G.W, G.H);
    drawBank(); drawRiver();
    T.forEach(drawBoat);
    drawFx(dt);
    requestAnimationFrame(frame);
  }

  /* ------------------------------ Mulai ------------------------------ */
  // Tampilan awal (sebelum pengaturan): dua perahu contoh di sungai
  T = [mkTeam({ name: TEAMC[0].name, avatar: '🐊' }, 0), mkTeam({ name: TEAMC[1].name, avatar: '🦅' }, 1)];
  renderTeams();
  requestAnimationFrame(frame);
  openSetup();
})();
