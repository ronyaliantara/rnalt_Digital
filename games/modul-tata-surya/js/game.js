/* =========================================================================
   Modul Ajar Digital — GAME KELAS
   1) Susun Tata Surya  — seret/ketuk planet ke orbit yang benar
   2) Tebak Benda Langit — 2–4 tim menebak dari petunjuk bertahap
   ========================================================================= */
(function () {
  'use strict';
  const M = window.MOD; const D = M.D; const $ = M.$; const $$ = M.$$; const esc = M.esc;
  const menu = $('#gameMenu'), gS = $('#gameSusun'), gT = $('#gameTebak');
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let current = 'menu';

  function show(which) {
    current = which;
    menu.hidden = which !== 'menu'; gS.hidden = which !== 'susun'; gT.hidden = which !== 'tebak';
    if (which !== 'susun') stopTimer();
    if (which === 'susun') susunStart();
    if (which === 'tebak') tebakSetup();
    window.scrollTo(0, 0);
  }
  menu.addEventListener('click', (e) => { const c = e.target.closest('[data-game]'); if (c) show(c.dataset.game); });
  M.onSection('game', () => { if (current === 'menu') show('menu'); });
  M.onNav((sec) => { if (sec !== 'game') stopTimer(); else if (current === 'susun' && SS.playing) startTimer(); });

  /* ================================================== SUSUN TATA SURYA */
  const SS = { placed: [], mistakes: 0, t0: 0, elapsed: 0, playing: false, sel: null, timer: 0 };
  function startTimer() {
    stopTimer(); SS.t0 = Date.now() - SS.elapsed * 1000;
    SS.timer = setInterval(() => { SS.elapsed = (Date.now() - SS.t0) / 1000; const t = $('#gsTime'); if (t) t.textContent = mmss(SS.elapsed); }, 500);
  }
  function stopTimer() { if (SS.timer) { clearInterval(SS.timer); SS.timer = 0; } }

  function susunStart() {
    SS.placed = Array(8).fill(null); SS.mistakes = 0; SS.elapsed = 0; SS.playing = true; SS.sel = null;
    const best = M.store.get('susunBest', '');
    gS.innerHTML = `<div class="g-top"><h2>🪐 Susun Tata Surya</h2>
        <span class="g-stat">⏱ <b id="gsTime">00:00</b></span>
        <span class="g-stat">❌ Salah: <b id="gsMiss">0</b></span>
        ${best ? `<span class="g-stat">🏆 Terbaik: <b>${mmss(+best)}</b></span>` : ''}
        <button class="btn small" id="gsRestart">↺ Ulang</button><button class="btn small ghost" id="gsMenu">← Menu game</button></div>
      <div id="gsPlay">
        <div class="gs-board"><div class="gs-sun">MATAHARI</div>
          <div class="gs-slots">${Array.from({ length: 8 }, (_, i) => `<div class="gs-slot" data-slot="${i}" role="button" tabindex="0" aria-label="Orbit ke-${i + 1}"><span class="sn">${i + 1}</span></div>`).join('')}</div>
        </div>
        <div class="gs-tray" id="gsTray">${shuffle(D.PLANETS).map((p) => `<button class="tok" data-id="${p.id}">${M.planetArt(p.id, 80)}<span>${p.nama}</span></button>`).join('')}</div>
        <p class="g-msg" id="gsMsg">Ketuk sebuah planet, lalu ketuk orbitnya (1 = terdekat dengan Matahari). Bisa juga diseret.</p>
      </div>`;
    $('#gsRestart').addEventListener('click', susunStart);
    $('#gsMenu').addEventListener('click', () => show('menu'));
    bindDrag();
    startTimer();
  }
  function selectTok(tok) {
    $$('#gsTray .tok').forEach((t) => t.classList.toggle('sel', t === tok && SS.sel !== tok.dataset.id));
    SS.sel = tok && SS.sel !== tok.dataset.id ? tok.dataset.id : null;
    $$('.gs-slot').forEach((s) => s.classList.toggle('ready', !!SS.sel && SS.placed[+s.dataset.slot] === null));
  }
  function place(id, slot) {
    if (!SS.playing || SS.placed[slot] !== null) return false;
    const p = D.PLANETS.find((x) => x.id === id); const el = $(`.gs-slot[data-slot="${slot}"]`);
    if (p.urut - 1 === slot) {
      SS.placed[slot] = id;
      el.classList.remove('ready'); el.classList.add('ok');
      el.innerHTML = `<span class="sn">${slot + 1}</span>${M.planetArt(id, 80)}<b>${p.nama}</b>`;
      const tok = $(`#gsTray .tok[data-id="${id}"]`); if (tok) tok.remove();
      SS.sel = null; $$('.gs-slot').forEach((s) => s.classList.remove('ready'));
      $('#gsMsg').textContent = `✅ Tepat! ${p.nama} adalah planet ke-${p.urut} (${p.grup === 'dalam' ? 'planet dalam' : 'planet luar'}).`;
      if (SS.placed.every(Boolean)) win();
      return true;
    }
    SS.mistakes++; $('#gsMiss').textContent = SS.mistakes;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
    const hint = slot < 4 ? 'Orbit 1–4 milik planet dalam yang berbatu.' : 'Orbit 5–8 milik planet luar (raksasa gas dan raksasa es).';
    $('#gsMsg').textContent = `❌ Belum tepat. ${p.nama} bukan planet ke-${slot + 1}. ${hint}`;
    return false;
  }
  function win() {
    SS.playing = false; stopTimer();
    SS.elapsed = (Date.now() - SS.t0) / 1000;
    const t = Math.round(SS.elapsed);
    const tt = $('#gsTime'); if (tt) tt.textContent = mmss(t);
    const stars = SS.mistakes === 0 && t <= 60 ? 3 : SS.mistakes <= 2 && t <= 120 ? 2 : 1;
    const best = +M.store.get('susunBest', 0);
    const rec = !best || t < best; if (rec) M.store.set('susunBest', String(t));
    $('#gsPlay').innerHTML = `<div class="g-win" id="gsWin">
      <div class="win-stars" aria-label="${stars} bintang">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <h3>Tata surya tersusun! 🎉</h3>
      <p>Waktu <b>${mmss(t)}</b> · Salah <b>${SS.mistakes}</b> kali${rec ? ' · 🏆 Rekor baru!' : ''}</p>
      <p>Urutan: <b>Merkurius – Venus – Bumi – Mars</b> | sabuk asteroid | <b>Jupiter – Saturnus – Uranus – Neptunus</b></p>
      <p class="muted">⭐⭐⭐ = tanpa salah dan ≤ 1 menit · ⭐⭐ = salah ≤ 2 dan ≤ 2 menit</p>
      <div class="row"><button class="btn primary" id="gsAgain">🔁 Main lagi</button><button class="btn ghost" id="gsBack">← Menu game</button></div></div>`;
    $('#gsAgain').addEventListener('click', susunStart);
    $('#gsBack').addEventListener('click', () => show('menu'));
    SS.stars = stars;
  }
  function bindDrag() {
    const tray = $('#gsTray'); const slots = $('.gs-slots');
    let drag = null; let suppressUntil = 0;
    tray.addEventListener('pointerdown', (e) => {
      const tok = e.target.closest('.tok'); if (!tok || !SS.playing) return;
      drag = { tok, id: tok.dataset.id, x: e.clientX, y: e.clientY, moved: false, clone: null, pid: e.pointerId };
      try { tok.setPointerCapture(e.pointerId); } catch (er) { /* abaikan */ }
    });
    tray.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.pid) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10) {
        drag.moved = true; drag.clone = drag.tok.cloneNode(true); drag.clone.classList.add('drag'); document.body.appendChild(drag.clone); drag.tok.classList.add('ghost');
      }
      if (drag.moved) {
        drag.clone.style.left = e.clientX + 'px'; drag.clone.style.top = e.clientY + 'px';
        const over = document.elementFromPoint(e.clientX, e.clientY); const sl = over && over.closest('.gs-slot');
        $$('.gs-slot').forEach((s) => s.classList.toggle('over', s === sl));
      }
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.pid) return;
      const d = drag; drag = null;
      $$('.gs-slot').forEach((s) => s.classList.remove('over'));
      if (d.clone) d.clone.remove(); d.tok.classList.remove('ghost');
      if (!d.moved) return; // ketukan biasa ditangani oleh event click
      suppressUntil = Date.now() + 400;
      const over = document.elementFromPoint(e.clientX, e.clientY); const sl = over && over.closest('.gs-slot');
      if (sl) place(d.id, +sl.dataset.slot);
    };
    tray.addEventListener('pointerup', end);
    tray.addEventListener('pointercancel', (e) => { if (drag && drag.clone) drag.clone.remove(); if (drag) drag.tok.classList.remove('ghost'); drag = null; });
    slots.addEventListener('click', (e) => { const sl = e.target.closest('.gs-slot'); if (sl && SS.sel) place(SS.sel, +sl.dataset.slot); });
    slots.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && SS.sel) { const sl = e.target.closest('.gs-slot'); if (sl) { e.preventDefault(); place(SS.sel, +sl.dataset.slot); } } });
    tray.addEventListener('click', (e) => { const tok = e.target.closest('.tok'); if (tok && SS.playing && Date.now() > suppressUntil) selectTok(tok); });
  }

  /* ================================================== TEBAK BENDA LANGIT */
  const OPTS = D.PLANETS.map((p) => ({ id: p.id, nama: p.nama })).concat([{ id: 'pluto', nama: 'Pluto' }]);
  const nameOf = (id) => OPTS.find((o) => o.id === id).nama;
  const TB = { teams: [], nTeams: 2, rounds: [], r: 0, c: 0, turn: 0, starter: 0, done: false, tried: [] };
  function tebakSetup() {
    const saved = (M.store.get('tebakNames', '') || '').split('|');
    const def = ['Tim Merkurius', 'Tim Venus', 'Tim Bumi', 'Tim Mars'];
    gT.innerHTML = `<div class="g-top"><h2>🕵️ Tebak Benda Langit</h2><button class="btn small ghost" id="tbMenu">← Menu game</button></div>
      <div class="tb-setup">
        <p style="font-size:1.08rem">Setiap ronde berisi 4 petunjuk dari yang umum ke yang khusus. Tim yang mendapat giliran menebak: benar pada petunjuk ke-1 bernilai <b>4 poin</b>, ke-2 <b>3 poin</b>, ke-3 <b>2 poin</b>, ke-4 <b>1 poin</b>. Jika salah, petunjuk berikutnya dibuka dan giliran pindah ke tim lain.</p>
        <h3>Jumlah tim</h3>
        <div class="seg big" id="tbN">${[2, 3, 4].map((n) => `<button data-n="${n}" class="${n === TB.nTeams ? 'on' : ''}">${n} tim</button>`).join('')}</div>
        <div class="tb-teams" id="tbNames">${def.map((d, i) => `<input type="text" maxlength="20" data-i="${i}" value="${esc(saved[i] || d)}" aria-label="Nama tim ${i + 1}" ${i >= TB.nTeams ? 'hidden' : ''}>`).join('')}</div>
        <button class="btn primary big" id="tbGo">▶ Mulai (9 ronde)</button>
      </div>`;
    $('#tbMenu').addEventListener('click', () => show('menu'));
    $('#tbN').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return; TB.nTeams = +b.dataset.n;
      $$('#tbN button').forEach((x) => x.classList.toggle('on', x === b));
      $$('#tbNames input').forEach((inp, i) => { inp.hidden = i >= TB.nTeams; });
    });
    $('#tbGo').addEventListener('click', () => tebakStart());
  }
  function tebakStart(n) {
    if (n) TB.nTeams = n;
    const inputs = $$('#tbNames input');
    const names = inputs.length ? inputs.map((i) => i.value.trim() || i.defaultValue) : ['Tim Merkurius', 'Tim Venus', 'Tim Bumi', 'Tim Mars'];
    M.store.set('tebakNames', names.join('|'));
    TB.teams = names.slice(0, TB.nTeams).map((nm) => ({ nama: nm, skor: 0 }));
    TB.rounds = shuffle(D.TEBAK); TB.r = 0; TB.starter = 0; TB.done = false;
    tebakRound();
  }
  function tebakRound() {
    TB.c = 0; TB.turn = TB.starter % TB.teams.length; TB.tried = []; TB.roundOver = false;
    renderTebak();
  }
  function renderTebak(fb) {
    const R = TB.rounds[TB.r];
    const clues = R.p.map((t, i) => (i <= TB.c || TB.roundOver
      ? `<div class="tb-clue"><i>Petunjuk ${i + 1}</i>${esc(t)}</div>`
      : `<div class="tb-clue locked"><i>Petunjuk ${i + 1}</i>🔒 masih tertutup</div>`)).join('');
    gT.innerHTML = `<div class="g-top"><h2>🕵️ Tebak Benda Langit</h2><span class="g-stat">Ronde <b>${TB.r + 1}</b> / ${TB.rounds.length}</span><button class="btn small ghost" id="tbMenu">← Menu game</button></div>
      <div class="tb-scores">${TB.teams.map((t, i) => `<div class="tb-team ${i === TB.turn && !TB.roundOver ? 'turn' : ''}"><span>${esc(t.nama)}</span><b>${t.skor}</b></div>`).join('')}</div>
      <div class="tb-main">
        <div>
          <div class="tb-info"><span>${TB.roundOver ? 'Ronde selesai' : `Giliran: <span style="color:var(--acc)">${esc(TB.teams[TB.turn].nama)}</span>`}</span>${TB.roundOver ? '' : `<span>Nilai tebakan: <span class="val">${4 - TB.c} poin</span></span>`}</div>
          <div class="tb-clues">${clues}</div>
          ${fb || ''}
          <div class="qz-actions">${TB.roundOver
            ? `<span></span><button class="btn primary" id="tbNext">${TB.r + 1 < TB.rounds.length ? 'Ronde berikutnya ▶' : 'Lihat juara 🏆'}</button>`
            : `<button class="btn small" id="tbSkip">${TB.c < 3 ? '🔓 Buka petunjuk berikutnya (giliran pindah)' : '🏳️ Menyerah, tampilkan jawaban'}</button><span></span>`}</div>
        </div>
        <div class="tb-opts" id="tbOpts">${OPTS.map((o) => {
          const cls = TB.roundOver && o.id === R.id ? 'right' : TB.tried.includes(o.id) ? 'wrong' : '';
          return `<button class="tb-opt ${cls}" data-id="${o.id}" ${TB.roundOver || TB.tried.includes(o.id) ? 'disabled' : ''}>${M.planetArt(o.id, 64)}<span>${o.nama}</span></button>`;
        }).join('')}</div>
      </div>`;
    $('#tbMenu').addEventListener('click', () => show('menu'));
    $('#tbOpts').addEventListener('click', (e) => { const b = e.target.closest('.tb-opt'); if (b && !b.disabled) guess(b.dataset.id); });
    const nx = $('#tbNext'); if (nx) nx.addEventListener('click', nextRound);
    const sk = $('#tbSkip'); if (sk) sk.addEventListener('click', skip);
  }
  function guess(id) {
    if (TB.roundOver || TB.done) return false;
    const R = TB.rounds[TB.r]; const team = TB.teams[TB.turn];
    if (id === R.id) {
      const pts = 4 - TB.c; team.skor += pts; TB.roundOver = true;
      renderTebak(`<div class="tb-fb ok">✅ Benar, jawabannya <b>${nameOf(R.id)}</b>! ${esc(team.nama)} mendapat <b>+${pts} poin</b>.</div>`);
      return true;
    }
    TB.tried.push(id);
    if (TB.c < 3) {
      TB.c++; TB.turn = (TB.turn + 1) % TB.teams.length;
      renderTebak(`<div class="tb-fb no">❌ Bukan ${nameOf(id)}. Petunjuk ke-${TB.c + 1} dibuka — giliran ${esc(TB.teams[TB.turn].nama)}.</div>`);
    } else {
      TB.roundOver = true;
      renderTebak(`<div class="tb-fb no">❌ Bukan ${nameOf(id)}. Semua petunjuk sudah dibuka. Jawabannya: <b>${nameOf(R.id)}</b>.</div>`);
    }
    return false;
  }
  function skip() {
    if (TB.roundOver) return;
    const R = TB.rounds[TB.r];
    if (TB.c < 3) { TB.c++; TB.turn = (TB.turn + 1) % TB.teams.length; renderTebak(`<div class="tb-fb no">Petunjuk ke-${TB.c + 1} dibuka — giliran ${esc(TB.teams[TB.turn].nama)}.</div>`); } else { TB.roundOver = true; renderTebak(`<div class="tb-fb no">Jawabannya: <b>${nameOf(R.id)}</b>.</div>`); }
  }
  function nextRound() {
    if (TB.r + 1 < TB.rounds.length) { TB.r++; TB.starter++; tebakRound(); window.scrollTo(0, 0); return; }
    TB.done = true;
    const rank = TB.teams.slice().sort((a, b) => b.skor - a.skor);
    const top = rank[0].skor; const winners = rank.filter((t) => t.skor === top);
    gT.innerHTML = `<div class="g-top"><h2>🕵️ Tebak Benda Langit</h2><button class="btn small ghost" id="tbMenu">← Menu game</button></div>
      <div class="g-win" id="tbWin"><div class="win-stars">🏆</div>
      <h3>${winners.length > 1 ? 'Hasil seri!' : `Juara: ${esc(winners[0].nama)}`}</h3>
      <div class="tb-rank">${rank.map((t, i) => `<div><span>${i + 1}. ${esc(t.nama)}</span><span>${t.skor} poin</span></div>`).join('')}</div>
      <div class="row"><button class="btn primary" id="tbAgain">🔁 Main lagi</button><button class="btn ghost" id="tbBack">← Menu game</button></div></div>`;
    $('#tbMenu').addEventListener('click', () => show('menu'));
    $('#tbBack').addEventListener('click', () => show('menu'));
    $('#tbAgain').addEventListener('click', tebakSetup);
  }

  window.__MOD.game = {
    open: (g) => { M.go('game'); show(g); return current; },
    susun: {
      state: () => ({ placed: SS.placed.filter(Boolean).length, mistakes: SS.mistakes, playing: SS.playing, won: !!$('#gsWin'), stars: SS.stars || 0 }),
      place: (id, slot) => place(id, slot),
      tapPlace: (id, slot) => { const t = $(`#gsTray .tok[data-id="${id}"]`); t.click(); return !!t; },
      solve: () => D.PLANETS.map((p) => place(p.id, p.urut - 1)).every(Boolean)
    },
    tebak: {
      start: (n = 2) => { show('tebak'); TB.nTeams = n; tebakStart(n); return TB.teams.length; },
      answer: () => TB.rounds[TB.r].id,
      guess: (id) => guess(id),
      guessWrong: () => { const R = TB.rounds[TB.r]; const w = OPTS.find((o) => o.id !== R.id && !TB.tried.includes(o.id)); return guess(w.id); },
      next: () => nextRound(),
      state: () => ({ r: TB.r, c: TB.c, turn: TB.turn, roundOver: !!TB.roundOver, done: TB.done, scores: TB.teams.map((t) => t.skor) })
    }
  };
})();
