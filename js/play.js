(() => {
  const { loadStore, normalizePhone, buildBuyerWhatsAppUrl } = window.LokaStore;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const safe = (s) => {
    const v = String(s || '').trim();
    return /^(javascript|vbscript):/i.test(v) || (/^data:/i.test(v) && !/^data:(image|video)\//i.test(v)) ? '' : v;
  };
  const isVideo = (s) => /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(s || '') || String(s || '').startsWith('data:video/');

  // Soal contoh untuk game yang bank soalnya tidak berupa questions-default.js
  const BANKS = {
    'LM-UT': [
      { q: 'Secara geografis, kepulauan Indonesia berada di antara dua benua, yaitu...', opts: ['Benua Asia dan Benua Australia', 'Benua Eropa dan Benua Afrika'], ans: 0 },
      { q: 'Indonesia beriklim tropis karena dilalui garis khatulistiwa. Dua musim di Indonesia adalah musim...', opts: ['Panas dan Musim Dingin Berbatu', 'Kemarau dan Penghujan'], ans: 1 },
      { q: 'Garis khayal yang memisahkan persebaran fauna Asiatis (barat) dengan fauna Peralihan (tengah) adalah...', opts: ['Garis Wallace', 'Garis Weber'], ans: 0 }
    ],
    'LM-EK': [
      { q: 'Benua terbesar di dunia adalah...', opts: ['Asia', 'Afrika', 'Eropa'], ans: 0 },
      { q: 'Samudra terluas di permukaan bumi adalah...', opts: ['Samudra Pasifik', 'Samudra Atlantik', 'Samudra Hindia'], ans: 0 },
      { q: 'Selat yang memisahkan Pulau Jawa dan Pulau Sumatra adalah...', opts: ['Selat Sunda', 'Selat Malaka', 'Selat Bali'], ans: 0 }
    ],
    'LM-MTS': [
      { q: 'Planet yang paling dekat dengan Matahari adalah...', opts: ['Merkurius', 'Venus', 'Bumi', 'Mars'], ans: 0 },
      { q: 'Planet yang dijuluki "planet merah" adalah...', opts: ['Jupiter', 'Mars', 'Saturnus', 'Neptunus'], ans: 1 },
      { q: 'Planet terbesar di tata surya adalah...', opts: ['Bumi', 'Saturnus', 'Jupiter', 'Uranus'], ans: 2 },
      { q: 'Satelit alami yang mengelilingi Bumi adalah...', opts: ['Matahari', 'Bulan', 'Mars', 'Komet'], ans: 1 }
    ]
  };

  const store = loadStore();
  const settings = store.settings;
  const id = new URLSearchParams(location.search).get('id');
  const game = store.games.find((g) => g.id === id) || (id ? null : store.games[0]);

  // Footer & WA umum
  const phone = normalizePhone(settings.whatsappNumber);
  const hello = `Halo ${settings.sellerName || 'Admin'}, saya ingin bertanya tentang game edukasi di ${settings.storeName || 'rnalt_Digital'}.`;
  const askUrl = (phone ? `https://wa.me/${phone}` : 'https://wa.me/') + '?text=' + encodeURIComponent(hello);
  $('footer-wa').href = askUrl;
  if (phone) $('footer-wa-info').textContent = `Pesan & bantuan via WhatsApp: +${phone}`;
  const logo = safe(settings.logoImage);
  if (logo) $('site-logo-img').src = logo;

  if (!game) {
    $('play-root').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Game tidak ditemukan</h3><p>Game ini mungkin sudah tidak tersedia.</p><a class="btn btn-primary" href="index.html#katalog">Lihat semua game</a></div>`;
    document.title = 'Game tidak ditemukan – rnalt_Digital';
    return;
  }

  document.title = `${game.title} – rnalt_Digital`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && game.shortDesc) metaDesc.content = game.shortDesc.slice(0, 160);
  $('crumb-title').textContent = game.title;
  $('play-title').textContent = game.title;
  $('play-desc').textContent = game.shortDesc || '';

  const LV = { PAUD: 'PAUD / TK', SD: 'SD', SMP: 'SMP', SMA: 'SMA / SMK' };
  const lv = Array.isArray(game.levels) ? game.levels.filter((k) => LV[k]).map((k) => LV[k]).join(' • ') : '';
  const tags = [lv && `Jenjang: ${lv}`, game.category, game.grade, game.duration, game.device].filter(Boolean);
  $('play-tags').innerHTML = tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('');

  const media = safe(game.image), cover = safe(game.coverImage);
  const box = $('play-media');
  if (cover) {
    // halaman detail: GAMBAR sampul resolusi tinggi (<nama>-hd.jpg, 1600px) — layar kecil otomatis pakai versi 960px.
    // Jika versi HD belum ada (mis. game baru dari admin), pakai gambar sampul biasa.
    // versi HD: dari admin (coverHd) atau pola nama <cover>-hd.jpg
    const hd = safe(game.coverHd) && game.coverHd !== cover ? safe(game.coverHd)
      : (/^assets\/games\/[^/?#]+\.jpe?g(\?.*)?$/i.test(cover) && !/-hd\.jpe?g/i.test(cover) ? cover.replace(/\.(jpe?g)(\?.*)?$/i, '-hd.$1$2') : '');
    box.innerHTML = `<img src="${esc(hd || cover)}"${hd ? ` srcset="${esc(cover)} 960w, ${esc(hd)} 1600w" sizes="(max-width: 980px) 100vw, 640px"` : ''} width="1600" height="1000" alt="${esc(game.title)}" fetchpriority="high" decoding="async">`;
    if (hd) { const im = box.querySelector('img'); im.addEventListener('error', () => { im.removeAttribute('srcset'); im.src = cover; }, { once: true }); }
  } else if (isVideo(media)) {
    box.innerHTML = `<video src="${esc(media)}" autoplay loop muted playsinline controls></video>`;
  } else if (media) {
    box.innerHTML = `<img src="${esc(cover || media)}" width="800" height="500" alt="${esc(game.title)}">`;
  } else {
    box.hidden = true;
  }

  // Video testimoni / hasil uji coba yang terkait game ini (dari Aplikasi Admin)
  const testi = (Array.isArray(store.testimonials) ? store.testimonials : []).filter((t) => t && t.visible !== false && t.gameId === game.id && safe(t.video));
  const tBox = $('play-testi');
  if (tBox && testi.length) {
    tBox.innerHTML = `<h2>${testi.some((t) => t.type === 'uji-coba') ? 'Video uji coba &amp; testimoni' : 'Video testimoni'}</h2><div class="testi-grid">` + testi.map((t) => `
      <article class="testi-card">
        <div class="testi-media"><video src="${esc(safe(t.video))}"${t.poster ? ` poster="${esc(safe(t.poster))}"` : ''} controls playsinline preload="none" aria-label="${esc(t.title || 'Video testimoni')}"></video></div>
        <div class="testi-body">
          <div class="testi-tags"><span class="testi-kind${t.type === 'uji-coba' ? ' is-uji' : ''}">${t.type === 'uji-coba' ? 'Hasil Uji Coba' : 'Testimoni'}</span></div>
          ${t.title ? `<h3>${esc(t.title)}</h3>` : ''}
          ${t.caption ? `<p class="testi-quote">${esc(t.caption)}</p>` : ''}
          ${t.name ? `<p class="testi-name">— ${esc(t.name)}</p>` : ''}
        </div>
      </article>`).join('') + '</div>';
    tBox.hidden = false;
    const vids = tBox.querySelectorAll('video');
    vids.forEach((v) => v.addEventListener('play', () => vids.forEach((o) => { if (o !== v) o.pause(); })));
  }

  $('play-ask-wa').href = buildBuyerWhatsAppUrl(game, settings);
  $('play-order').addEventListener('click', () => {
    location.href = `index.html?pesan=${encodeURIComponent(game.id)}#katalog`;
  });
  // Tombol "Coba Main Gratis": membuka GAME ASLI dalam Mode Coba (dibatasi oleh games/lokamain-license.js).
  // Muncul otomatis untuk game di folder games/ yang memakai mesin kuis (quiz-core), kecuali dimatikan di Aplikasi Admin.
  const COBA_TIDAK_DUKUNG = ['ular-tangga', 'ekspedisi-kapal', 'modul-tata-surya'];
  const direct = $('play-launch-direct');
  const gu = safe(game.gameUrl);
  const slugM = String(gu || '').match(/^(?:\.?\/)?games\/([a-z0-9-]+)\/?(?:index\.html)?$/i);
  const isModul = game.kind === 'modul' || /^modul ajar/i.test(String(game.category || ''));
  if (slugM && game.trial !== false && !isModul && !COBA_TIDAK_DUKUNG.includes(slugM[1].toLowerCase())) {
    direct.href = `games/${slugM[1].toLowerCase()}/?coba=1`;
    direct.innerHTML = '🎮 Coba Main Gratis';
    direct.className = 'btn btn-coba';
    direct.title = 'Main game aslinya: 5 soal contoh, tanpa daftar';
    direct.hidden = false;
  } else {
    direct.hidden = true;
  }

  /* ================= Coba main dulu: ilustrasi mini + soal asli game ================= */
  const N_MAX = 4;
  const LETTERS = ['A', 'B', 'C', 'D'];
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  let EMO_ONLY = null;
  try { EMO_ONLY = new RegExp('^[\\s\\p{Extended_Pictographic}\\u200d\\ufe0f\\u{1F3FB}-\\u{1F3FF}]+$', 'u'); } catch (_) { /* browser lama */ }
  const isEmo = (s) => !!(EMO_ONLY && String(s || '').trim() && EMO_ONLY.test(String(s)));

  // {question, optionA..D, correct, explanation} -> {q, opts, ans, exp}
  function fromBank(q) {
    if (!q || !q.question) return null;
    const opts = LETTERS.map((k) => ({ k, t: q['option' + k] })).filter((o) => o.t != null && String(o.t).trim());
    if (opts.length < 2) return null;
    const ck = String(q.correct || 'A').trim().toUpperCase().charAt(0);
    return { q: String(q.question), opts: opts.map((o) => String(o.t)), ans: Math.max(0, opts.findIndex((o) => o.k === ck)), exp: String(q.explanation || '') };
  }
  function mix(item) {
    const order = shuffle(item.opts.map((_, i) => i));
    return { q: item.q, exp: item.exp || '', opts: order.map((i) => item.opts[i]), ans: order.indexOf(item.ans) };
  }
  function sampleBank() {
    return [{ q: game.sampleQuestion || `Pertanyaan contoh untuk ${game.title}`, opts: game.sampleOptions || ['Pilihan A', 'Pilihan B', 'Pilihan C'], ans: Number(game.sampleAnswer || 0), exp: '' }];
  }
  // Bank soal bawaan game (file publik games/<nama>/questions-default.js), dimuat tanpa membuka game-nya.
  function loadBank() {
    if (BANKS[game.id]) return Promise.resolve(BANKS[game.id]);
    const m = String(game.gameUrl || '').match(/games\/([a-z0-9-]+)\//i);
    if (!m) return Promise.resolve([]);
    return new Promise((resolve) => {
      const prev = window.DEFAULT_QUESTIONS; let done = false;
      window.DEFAULT_QUESTIONS = undefined;
      const fin = (list) => { if (done) return; done = true; window.DEFAULT_QUESTIONS = prev; resolve(Array.isArray(list) ? list.map(fromBank).filter(Boolean) : []); };
      const s = document.createElement('script');
      s.src = `games/${m[1]}/questions-default.js?v=20261120a`;
      s.onload = () => fin(window.DEFAULT_QUESTIONS);
      s.onerror = () => fin(null);
      setTimeout(() => fin(null), 8000);
      document.head.appendChild(s);
    });
  }

  const panel = $('quiz-panel');
  const Demo = window.GameDemo;
  const info = Demo ? Demo.info(game.id) : { how: 'Jawab soal contoh untuk mencoba.', yay: 'Benar!', solo: true };
  let pool = []; let stage = null; let list = []; let qi = 0; let score = 0; let answered = false;

  function startDemo() {
    list = shuffle(pool.length ? pool : sampleBank()).slice(0, N_MAX).map(mix);
    qi = 0; score = 0; answered = false;
    if (stage) { stage.destroy(); stage = null; }
    panel.innerHTML = `
      <div class="demo-head">
        <p class="quiz-kicker">🎮 Coba main dulu, versi mini</p>
        <p class="demo-how">${esc(info.how)}</p>
      </div>
      <div class="demo-stage"><canvas id="demo-cv" aria-hidden="true"></canvas></div>
      <div class="demo-body" id="demo-body">
        <div class="quiz-top-bar">
          <span class="quiz-progress-text" id="quiz-progress"></span>
          <span class="quiz-score-text" id="quiz-score">Benar: 0</span>
        </div>
        <h2 class="quiz-question-text" id="quiz-question"></h2>
        <div id="quiz-options" class="quiz-options-wrap"></div>
        <p class="demo-exp" id="demo-exp" hidden></p>
        <div class="quiz-bottom-bar">
          <span class="quiz-feedback-text" id="quiz-feedback" aria-live="polite"></span>
          <button type="button" class="btn btn-primary btn-sm" id="quiz-next-btn" disabled>Berikutnya</button>
        </div>
      </div>`;
    try { if (Demo) stage = Demo.create($('demo-cv'), game.id, list.length); } catch (e) { stage = null; }
    if (!stage) { const st = panel.querySelector('.demo-stage'); if (st) st.hidden = true; }
    $('quiz-next-btn').addEventListener('click', () => {
      if (!answered) return;
      if (qi >= list.length - 1) finish(); else { qi++; render(); }
    });
    render();
  }

  function render() {
    answered = false;
    const item = list[qi];
    $('quiz-progress').textContent = `Soal ${qi + 1} dari ${list.length}`;
    $('quiz-score').textContent = `Benar: ${score}`;
    $('quiz-question').textContent = item.q;
    $('quiz-feedback').textContent = 'Pilih salah satu jawaban.';
    $('demo-exp').hidden = true;
    const next = $('quiz-next-btn');
    next.disabled = true;
    next.textContent = qi < list.length - 1 ? 'Berikutnya' : 'Lihat hasil';
    const wrap = $('quiz-options');
    const grid = item.opts.length > 2 && item.opts.every((o) => String(o).length <= 16);
    wrap.className = 'quiz-options-wrap' + (grid ? ' is-grid' : '');
    wrap.innerHTML = item.opts.map((o, i) => `<button type="button" class="quiz-opt-btn${isEmo(o) ? ' is-emo' : ''}" data-opt="${i}">${esc(o)}</button>`).join('');
    wrap.querySelectorAll('[data-opt]').forEach((btn) => btn.addEventListener('click', () => pick(btn, item)));
  }

  async function pick(btn, item) {
    if (answered) return;
    answered = true;
    const ok = Number(btn.dataset.opt) === item.ans;
    $('quiz-options').querySelectorAll('[data-opt]').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.opt) === item.ans) b.classList.add('is-correct');
    });
    if (ok) score++; else btn.classList.add('is-wrong');
    $('quiz-score').textContent = `Benar: ${score}`;
    $('quiz-feedback').textContent = ok ? `Benar! ${info.yay}` : 'Belum tepat. Jawaban benar ditandai hijau.';
    if (item.exp) { const ex = $('demo-exp'); ex.textContent = `💡 ${item.exp}`; ex.hidden = false; }
    const next = $('quiz-next-btn');
    if (stage) { next.textContent = '…'; await stage.answer(ok); next.textContent = qi < list.length - 1 ? 'Berikutnya' : 'Lihat hasil'; }
    next.disabled = false;
  }

  function finish() {
    const res = stage ? stage.finish() : { solo: true, you: score, total: list.length, win: score >= Math.max(1, list.length - 1) };
    let title; let big; let msg;
    if (res.solo) {
      title = res.win ? 'Hebat sekali! 🎉' : 'Ayo coba lagi! 💪';
      big = `⭐ ${res.you} / ${res.total}`;
      msg = `Benar ${res.you} dari ${res.total} soal.`;
    } else if (res.tie) {
      title = 'Seri! 🤝'; big = `${res.you} : ${res.foe}`;
      msg = 'Skornya sama. Satu jawaban lagi bisa menentukan pemenangnya!';
    } else if (res.win) {
      title = 'Kamu menang! 🏆'; big = `${res.you} : ${res.foe}`;
      msg = 'Bayangkan serunya kalau dimainkan bersama-sama!';
    } else {
      title = 'Lawan menang! 😅'; big = `${res.you} : ${res.foe}`;
      msg = 'Coba lagi, soalnya diacak setiap main.';
    }
    const note = game.editableQuestions === false
      ? 'Ini versi mini. Modul lengkapnya berisi materi interaktif, kuis 20 soal, game, dan LKPD.'
      : 'Ini versi mini untuk mencoba. Game lengkapnya punya lebih banyak soal dan animasi, dan soalnya bisa Anda ganti sendiri.';
    $('demo-body').innerHTML = `
      <div class="quiz-done">
        <h3>${title}</h3>
        <p class="quiz-done-score">${big}</p>
        <p>${msg}</p>
        <p class="demo-note">${note}</p>
        <div class="quiz-done-actions">
          <button type="button" class="btn btn-ghost-detail" id="quiz-retry">Main lagi</button>
          <button type="button" class="btn btn-primary" id="quiz-order">Pesan game ini</button>
        </div>
      </div>`;
    $('quiz-retry').onclick = () => startDemo();
    $('quiz-order').onclick = () => $('play-order').click();
  }

  loadBank().then((qs) => { pool = qs || []; startDemo(); }, () => { pool = []; startDemo(); });
})();
