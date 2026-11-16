/* =========================================================================
   Modul Ajar Digital — KUIS FORMATIF (20 soal, umpan balik langsung)
   ========================================================================= */
(function () {
  'use strict';
  const M = window.MOD; const D = M.D; const $ = M.$; const esc = M.esc;
  const L = 'ABCD';
  const root = $('#quiz');
  const S = { order: [], i: 0, ans: [], shuffle: true, showKey: false, phase: 'start', subset: null };

  const shuffleArr = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const hots = (lv) => lv === 'C4' || lv === 'C5' || lv === 'C6';

  function renderStart() {
    S.phase = 'start';
    const best = M.store.get('quizBest', '');
    root.innerHTML = `<div class="qz-panel qz-start">
      <div style="font-size:3rem" aria-hidden="true">📝</div>
      <h2>Kuis Formatif: Sistem Tata Surya</h2>
      <p>20 soal pilihan ganda dari tingkat mengingat sampai mengevaluasi (C1–C5). Setiap jawaban langsung diberi umpan balik dan pembahasan.</p>
      <div class="qz-meta"><span>20 soal</span><span>Skor maksimum 100</span><span>Soal HOTS ditandai merah</span>${best ? `<span>🏆 Skor terbaik: ${best}</span>` : ''}</div>
      <p style="margin-bottom:1rem"><label class="chk"><input type="checkbox" id="qzShuffle" ${S.shuffle ? 'checked' : ''}> Acak urutan soal</label></p>
      <button class="btn primary big" id="qzStart">▶ Mulai Kuis</button>
    </div>`;
    $('#qzShuffle').addEventListener('change', (e) => { S.shuffle = e.target.checked; });
    $('#qzStart').addEventListener('click', () => start());
  }

  function start(subset) {
    const base = subset || D.KUIS.map((_, i) => i);
    S.subset = subset || null;
    S.order = S.shuffle ? shuffleArr(base) : base.slice();
    S.i = 0; S.ans = []; S.phase = 'q';
    renderQ();
  }

  function renderQ() {
    const qi = S.order[S.i]; const q = D.KUIS[qi];
    const score = S.ans.filter((a) => a.ok).length;
    root.innerHTML = `<div class="qz-panel">
      <div class="qz-head">
        <span class="qz-count">Soal ${S.i + 1} / ${S.order.length}</span>
        <div class="qz-prog" aria-hidden="true"><i style="width:${(S.i / S.order.length) * 100}%"></i></div>
        <span class="qz-score">✔ ${score} benar</span>
        <label class="chk guru-only"><input type="checkbox" id="qzKey" ${S.showKey ? 'checked' : ''}> Tampilkan kunci</label>
      </div>
      <span class="qz-lv ${hots(q.lv) ? 'hots' : ''}">${q.lv}${hots(q.lv) ? ' · HOTS' : ''}</span>
      <p class="qz-q">${esc(q.q)}</p>
      <div class="qz-opts">${q.o.map((o, k) => `<button class="qz-opt ${S.showKey && M.isGuru() && k === q.a ? 'key' : ''}" data-k="${k}"><span class="lt">${L[k]}</span><span>${esc(o)}</span></button>`).join('')}</div>
      <div id="qzFb"></div>
      <div class="qz-actions"><button class="btn ghost small" id="qzQuit">✕ Akhiri</button><button class="btn primary" id="qzNext" hidden>${S.i + 1 < S.order.length ? 'Berikutnya ▶' : 'Lihat Hasil 🏁'}</button></div>
    </div>`;
    root.querySelector('.qz-opts').addEventListener('click', (e) => { const b = e.target.closest('.qz-opt'); if (b && !b.disabled) answer(+b.dataset.k); });
    $('#qzNext').addEventListener('click', next);
    $('#qzQuit').addEventListener('click', () => { if (S.ans.length) finish(); else renderStart(); });
    const kk = $('#qzKey'); if (kk) kk.addEventListener('change', (e) => { S.showKey = e.target.checked; markKey(); });
  }
  function markKey() {
    const q = D.KUIS[S.order[S.i]];
    root.querySelectorAll('.qz-opt').forEach((b) => b.classList.toggle('key', S.showKey && M.isGuru() && +b.dataset.k === q.a));
  }

  function answer(k) {
    if (S.phase !== 'q' || S.ans.length > S.i) return false;
    const qi = S.order[S.i]; const q = D.KUIS[qi]; const ok = k === q.a;
    S.ans.push({ qi, k, ok });
    root.querySelectorAll('.qz-opt').forEach((b) => {
      const kk = +b.dataset.k; b.disabled = true;
      if (kk === q.a) b.classList.add('right'); else if (kk === k) b.classList.add('wrong'); else b.classList.add('dim');
    });
    $('#qzFb').innerHTML = `<div class="qz-fb ${ok ? 'ok' : 'no'}"><b>${ok ? '✅ Tepat sekali!' : `❌ Belum tepat. Jawaban yang benar: ${L[q.a]}.`}</b><br>${esc(q.e)}</div>`;
    root.querySelector('.qz-score').textContent = `✔ ${S.ans.filter((a) => a.ok).length} benar`;
    root.querySelector('.qz-prog i').style.width = `${((S.i + 1) / S.order.length) * 100}%`;
    const n = $('#qzNext'); n.hidden = false; n.focus({ preventScroll: true });
    return ok;
  }
  function next() {
    if (S.ans.length <= S.i) return;
    if (S.i + 1 < S.order.length) { S.i++; renderQ(); window.scrollTo(0, 0); } else finish();
  }

  function finish() {
    S.phase = 'done';
    const n = S.ans.length; const benar = S.ans.filter((a) => a.ok).length;
    const total = S.order.length;
    const nilai = Math.round((benar / total) * 100);
    if (!S.subset) { const best = +M.store.get('quizBest', 0); if (nilai > best) M.store.set('quizBest', String(nilai)); }
    const stars = nilai >= 85 ? 3 : nilai >= 70 ? 2 : nilai >= 50 ? 1 : 0;
    const msg = nilai >= 85 ? 'Luar biasa! Pemahamanmu tentang tata surya sangat baik.' : nilai >= 70 ? 'Bagus! Pelajari lagi pembahasan soal yang belum tepat.' : nilai >= 50 ? 'Cukup baik. Ulangi materi interaktif lalu coba lagi.' : 'Jangan menyerah! Pelajari kembali materi bersama guru, lalu ulangi kuis.';
    const wrong = S.ans.filter((a) => !a.ok).map((a) => a.qi);
    const unanswered = S.order.slice(n);
    root.innerHTML = `<div class="qz-panel qz-sum">
      <p class="eyebrow">Hasil Kuis${S.subset ? ' (ulangan soal yang salah)' : ''}</p>
      <div class="qz-stars" aria-label="${stars} bintang">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <p class="qz-big" id="qzNilai">${nilai}</p>
      <p style="font-size:1.15rem;margin:.2rem 0"><b>${benar}</b> benar dari <b>${total}</b> soal${unanswered.length ? ` (${unanswered.length} tidak dijawab)` : ''}</p>
      <p class="muted">${msg}</p>
      <div class="qz-rev">${S.ans.map((a, i) => { const q = D.KUIS[a.qi]; return `<div><span class="ic">${a.ok ? '✅' : '❌'}</span><span><b>${i + 1}.</b> ${esc(q.q)}<small>Jawaban benar: ${L[q.a]}. ${esc(q.o[q.a])}${a.ok ? '' : ` · jawabanmu: ${L[a.k]}`}</small></span></div>`; }).join('')}</div>
      <div class="g-win"><div class="row">
        <button class="btn primary" id="qzAgain">🔁 Ulangi kuis</button>
        ${wrong.length ? `<button class="btn" id="qzWrong">🎯 Ulangi ${wrong.length} soal yang salah</button>` : ''}
        <button class="btn ghost" data-go="materi">🪐 Kembali ke Materi</button>
      </div></div>
    </div>`;
    $('#qzAgain').addEventListener('click', () => start());
    const w = $('#qzWrong'); if (w) w.addEventListener('click', () => start(wrong));
    window.scrollTo(0, 0);
  }

  document.addEventListener('guru', () => { if (S.phase === 'q') { if (!M.isGuru()) S.showKey = false; markKey(); } });
  M.onSection('kuis', () => { if (S.phase === 'start' || !root.innerHTML) renderStart(); });

  window.__MOD.quiz = {
    start: (shuffle = false) => { M.go('kuis'); S.shuffle = shuffle; start(); return S.order.length; },
    answer: (k) => answer(k),
    answerCorrect: () => answer(D.KUIS[S.order[S.i]].a),
    answerWrong: () => answer((D.KUIS[S.order[S.i]].a + 1) % 4),
    next: () => next(),
    retryWrong: () => { const b = $('#qzWrong'); if (b) { b.click(); return S.order.length; } return 0; },
    state: () => ({ phase: S.phase, i: S.i, total: S.order.length, correct: S.ans.filter((a) => a.ok).length, answered: S.ans.length, nilai: S.phase === 'done' ? +$('#qzNilai').textContent : null }),
    setKey: (v) => { S.showKey = !!v; markKey(); return root.querySelectorAll('.qz-opt.key').length; },
    count: D.KUIS.length
  };
})();
