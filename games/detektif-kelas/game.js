/* ==========================================================================
   Detektif Kelas — kuis misteri untuk 2–4 TIM (atau 1 tim melawan komputer).
   Setiap KASUS dibuat acak: cerita sekolah bernuansa Nusantara, 6 tersangka
   (digambar dengan SVG, ciri acak: topi, kacamata, tas, warna baju, tinggi,
   syal/dasi), satu pelaku acak, dan amplop petunjuk yang selalu konsisten
   dengan pelaku sehingga kasus PASTI bisa dipecahkan.
   Alur giliran: jawab soal (anggota tim bergiliran) → benar = buka amplop
   petunjuk (tersangka dicoret untuk semua) → boleh MENUDUH pelaku.
   Tuduhan benar = kasus terpecahkan (poin lebih besar bila petunjuk sedikit);
   tuduhan salah = poin dikurangi & tim tidak boleh menuduh di kesempatan berikutnya.
   Jawaban salah = SOAL REBUTAN: tim lain berlomba mengklik tombol timnya.
   Ringan: tanpa loop animasi terus-menerus; animasi CSS hanya transform/opacity.
   ========================================================================== */
(function () {
  'use strict';
  const QC = window.QuizCore; const FX = QC.fx; const esc = QC.esc;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let TS = 1; // skala waktu animasi (untuk uji otomatis)
  const wait = (ms) => new Promise((r) => setTimeout(r, ms * TS));
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  const pick = (a, rng = Math.random) => a[(rng() * a.length) | 0];
  const shuffle = (arr, rng = Math.random) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ------------------------------ Tim ------------------------------ */
  const AVATARS = ['🦅', '🦌', '🦎', '🦚', '🦉', '🐯', '🐼', '🦊'];
  const COLORS = ['#e11d48', '#2563eb', '#059669', '#9333ea'];
  const TEAM_NAMES = ['Tim Elang', 'Tim Kancil', 'Tim Komodo', 'Tim Merak'];
  const BOTS = ['Detektif Robo', 'Inspektur Bit', 'Agen Chip'];
  const AI_ACC = 0.62;
  const PTS_Q = 10; // jawaban benar / rebutan benar
  QC.init({ gameId: 'detektif-kelas', title: 'Detektif Kelas', avatars: AVATARS, colors: COLORS });

  // Mode ringan otomatis untuk perangkat lemah. Paksa: ?ringan=1 / ?ringan=0
  const LITE = /[?&]ringan=1/.test(location.search) || (!/[?&]ringan=0/.test(location.search) && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4));
  if (LITE) document.documentElement.classList.add('dk-lite');

  /* ------------------------------ Suara (WebAudio) ------------------------------ */
  const SND = (() => {
    let a = null; let nbuf = null;
    const ac = () => { if (!a) { try { a = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (a.state === 'suspended') a.resume(); return a; };
    const nb = () => { if (!nbuf) { const len = a.sampleRate; nbuf = a.createBuffer(1, len, a.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; } return nbuf; };
    function tone(f, d, type = 'sine', v = 0.08, delay = 0, f2 = null) {
      if (QC.muted || !ac()) return; const t = a.currentTime + delay; const o = a.createOscillator(); const g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.03);
    }
    function noise(d, v, delay = 0, ft = 'lowpass', f = 900) {
      if (QC.muted || !ac()) return; const t = a.currentTime + delay; const s = a.createBufferSource(); s.buffer = nb();
      const fl = a.createBiquadFilter(); fl.type = ft; fl.frequency.value = f; const g = a.createGain();
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(fl).connect(g).connect(a.destination); s.start(t); s.stop(t + d + 0.02);
    }
    return {
      ac,
      paper: () => { noise(0.16, 0.18, 0, 'highpass', 2500); noise(0.12, 0.12, 0.09, 'highpass', 3200); },
      type: (n = 6) => { for (let i = 0; i < n; i++) { noise(0.03, 0.16, i * 0.07, 'bandpass', 2200); tone(1800, 0.02, 'square', 0.015, i * 0.07); } },
      stamp: () => { noise(0.18, 0.45, 0, 'lowpass', 500); tone(110, 0.18, 'sine', 0.22, 0, 55); },
      sting: () => [392, 370, 311, 233].forEach((f, i) => tone(f, 0.42, 'triangle', 0.08, i * 0.16)),
      clue: () => [523, 659, 784].forEach((f, i) => tone(f, 0.2, 'sine', 0.08, i * 0.07)),
      drum: () => { for (let i = 0; i < 14; i++) noise(0.06, 0.08 + i * 0.012, i * 0.075, 'lowpass', 700); },
      buzz: () => { tone(160, 0.45, 'sawtooth', 0.08, 0, 90); tone(120, 0.5, 'square', 0.04, 0.05, 70); },
      solve: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.26, 'triangle', 0.11, i * 0.12)); noise(0.5, 0.15, 0.85, 'highpass', 4000); },
      rebut: () => [880, 1175, 880, 1175].forEach((f, i) => tone(f, 0.08, 'square', 0.05, i * 0.09)),
      think: () => [660, 740].forEach((f, i) => tone(f, 0.09, 'sine', 0.05, i * 0.12))
    };
  })();

  /* ------------------------------ Data kasus (cerita asli) ------------------------------ */
  const STORIES = [
    { id: 'piala', icon: '🏆', title: 'Hilangnya Piala Lomba', item: 'Piala Juara Lomba Cerdas Cermat', place: 'lemari kaca aula',
      story: 'Sehari sebelum upacara, piala juara lomba cerdas cermat lenyap dari lemari kaca aula! Kuncinya tidak rusak, dan hanya enam orang yang lewat aula sore itu.',
      motive: 'ternyata membawa piala itu pulang untuk digosok sampai berkilau sebagai kejutan upacara — tapi lupa bilang ke siapa pun!' },
    { id: 'kue', icon: '🎂', title: 'Misteri Kue Ulang Tahun Kepala Sekolah', item: 'Kue tart ulang tahun Kepala Sekolah', place: 'kulkas ruang guru',
      story: 'Kue tart cokelat untuk ulang tahun Kepala Sekolah hilang dari kulkas ruang guru, tepat satu jam sebelum pesta kejutan. Yang tertinggal hanya remah-remah dan jejak krim!',
      motive: 'tidak tahan mencicipi sedikit krimnya, lalu panik dan menyembunyikan kue di lemari UKS. Kuenya selamat… hanya kurang satu colekan!' },
    { id: 'peta', icon: '🗺️', title: 'Rahasia Peta Harta di Perpustakaan', item: 'Peta tua koleksi perpustakaan', place: 'rak buku langka',
      story: 'Sebuah peta tua bergambar tanda silang merah raib dari rak buku langka perpustakaan. Kabarnya peta itu menunjukkan "harta" tersembunyi di lingkungan sekolah!',
      motive: 'meminjam peta itu diam-diam untuk berburu harta — yang ternyata kapsul waktu berisi surat para alumni di bawah pohon beringin!' },
    { id: 'kendang', icon: '🥁', title: 'Kendang yang Membisu', item: 'Kendang untuk pentas tari daerah', place: 'gudang perlengkapan',
      story: 'Besok ada pentas tari daerah, tapi kendang kesayangan sanggar sekolah hilang dari gudang perlengkapan. Tanpa kendang, para penari bisa kehilangan irama!',
      motive: 'membawa kendang ke rumah untuk berlatih diam-diam setiap malam, supaya tabuhannya sempurna saat pentas!' },
    { id: 'bendera', icon: '🇮🇩', title: 'Bendera Kelas yang Raib', item: 'Bendera merah putih untuk lomba 17 Agustus', place: 'lemari kelas',
      story: 'Menjelang lomba 17 Agustus, bendera merah putih yang akan dipakai untuk lomba hias kelas menghilang dari lemari. Panitia lomba sudah menunggu!',
      motive: 'mencuci bendera itu supaya bersih dan cemerlang, lalu menjemurnya di atap kantin… dan lupa mengambilnya kembali!' },
    { id: 'soto', icon: '🍲', title: 'Resep Rahasia Soto Kantin', item: 'Buku resep soto legendaris kantin', place: 'laci dapur kantin',
      story: 'Buku resep soto legendaris kantin — yang katanya diwariskan tiga generasi — hilang dari laci dapur. Antrean soto siang ini terancam batal!',
      motive: 'menyalin resep itu untuk memasakkan soto yang sama bagi neneknya yang sedang berulang tahun. Bukunya dikembalikan dengan bonus semangkuk soto!' },
    { id: 'topeng', icon: '🎭', title: 'Topeng Panji yang Menghilang', item: 'Topeng kayu Panji untuk pentas budaya', place: 'ruang sanggar',
      story: 'Topeng kayu Panji berwarna putih yang akan dipakai pada pentas budaya tiba-tiba lenyap dari ruang sanggar. Penarinya sudah berlatih berminggu-minggu!',
      motive: 'mengecat ulang topeng itu diam-diam karena warnanya mulai kusam. Kini topengnya tampak seperti baru!' },
    { id: 'kamera', icon: '📸', title: 'Kamera Dokumentasi yang Raib', item: 'Kamera dokumentasi OSIS', place: 'meja panitia',
      story: 'Di tengah keramaian bazar sekolah, kamera dokumentasi OSIS hilang dari meja panitia. Padahal semua foto kegiatan ada di dalamnya!',
      motive: 'meminjam kamera untuk memotret burung cendrawasih kecil di pohon belakang sekolah — dan lupa waktu karena terlalu asyik!' },
    { id: 'lonceng', icon: '🔔', title: 'Lonceng Sekolah Membisu', item: 'Pemukul lonceng sekolah', place: 'tiang lonceng',
      story: 'Pagi ini lonceng sekolah tidak berbunyi: pemukulnya hilang dari tiang lonceng! Semua kelas bingung kapan harus masuk dan kapan istirahat.',
      motive: 'mengambil pemukul lonceng untuk diberi pita dan ukiran baru sebagai hadiah hari jadi sekolah!' }
  ];

  // Tokoh asli (ciri tetap: kulit, rambut). Ciri petunjuk diacak tiap kasus.
  const POOL = [
    { name: 'Pak Darto', role: 'Penjaga Sekolah', skin: '#c68a5a', hair: 'bald', hc: '#3b2a1f', stache: 1, alibi: 'sedang mengunci gerbang belakang — terekam CCTV gerbang.' },
    { name: 'Bu Sumi', role: 'Ibu Kantin', skin: '#d9a273', hair: 'hijab', hc: '#c4b5fd', alibi: 'sibuk melayani antrean nasi uduk, disaksikan puluhan siswa.' },
    { name: 'Kak Raka', role: 'Ketua OSIS', skin: '#e0b088', hair: 'short', hc: '#1f1a17', alibi: 'sedang memimpin rapat OSIS, ada daftar hadirnya.' },
    { name: 'Bu Laras', role: 'Pustakawan', skin: '#eac09a', hair: 'bun', hc: '#4a2f22', alibi: 'sedang mendata buku baru bersama tiga petugas perpustakaan.' },
    { name: 'Pak Yosef', role: 'Pelatih Pramuka', skin: '#8d5a3b', hair: 'curly', hc: '#15110e', alibi: 'sedang melatih tali-temali di lapangan, banyak saksinya.' },
    { name: 'Nyoman', role: 'Siswa Pindahan', skin: '#c99266', hair: 'spiky', hc: '#20180f', alibi: 'sedang diantar berkeliling sekolah oleh wali kelasnya.' },
    { name: 'Dewi', role: 'Ketua Kelas', skin: '#efc6a0', hair: 'long', hc: '#2b1d14', alibi: 'sedang mengumpulkan uang kas kelas — tercatat di buku kas.' },
    { name: 'Pak Ujang', role: 'Tukang Kebun', skin: '#b97a4c', hair: 'short', hc: '#2a211b', stache: 1, alibi: 'sedang menyiram taman depan, sepatunya masih basah kuyup.' },
    { name: 'Mbak Tika', role: 'Petugas UKS', skin: '#e3b48c', hair: 'hijab', hc: '#fbcfe8', alibi: 'sedang merawat siswa yang pusing di UKS, ada buku kunjungannya.' },
    { name: 'Butet', role: 'Fotografer Sekolah', skin: '#cf9a6e', hair: 'curlylong', hc: '#1c1410', alibi: 'sedang memotret lomba di lapangan — fotonya berstempel waktu.' },
    { name: 'Pak Rahmat', role: 'Satpam Sekolah', skin: '#a8714a', hair: 'short', hc: '#121212', alibi: 'sedang berjaga di pos depan bersama dua tamu sekolah.' },
    { name: 'Ucok', role: 'Kapten Tim Basket', skin: '#d39d72', hair: 'spiky', hc: '#191512', alibi: 'sedang latihan basket di lapangan, ditonton banyak orang.' },
    { name: 'Mama Yuli', role: 'Penjaga Koperasi', skin: '#7a4a2e', hair: 'curlylong', hc: '#0f0c0a', alibi: 'sedang menghitung stok buku tulis di koperasi bersama pengurus.' }
  ];
  const SHIRTS = { merah: '#dc2626', biru: '#2563eb', hijau: '#16a34a', kuning: '#eab308' };
  const SHIRT_KEYS = Object.keys(SHIRTS);
  const ACCS = ['syal', 'dasi', 'tanpa'];
  const LEN = { singkat: 3, normal: 4, panjang: 5 };

  /* ------------------------------ Generator kasus ------------------------------ */
  function rollSuspects(rng) {
    for (let tries = 0; tries < 400; tries++) {
      const chars = shuffle(POOL, rng).slice(0, 6);
      const S = chars.map((c, i) => ({ id: i, ...c, hat: c.hair === 'hijab' ? false : rng() < 0.5, glasses: rng() < 0.45, bag: rng() < 0.5, shirt: pick(SHIRT_KEYS, rng), tall: rng() < 0.5, acc: pick(ACCS, rng) }));
      const cnt = (k) => S.filter((s) => s[k]).length;
      if (!['hat', 'glasses', 'bag', 'tall'].every((k) => cnt(k) >= 2 && cnt(k) <= 4)) continue;
      const most = (k) => Math.max(...Object.values(S.reduce((m, s) => ((m[s[k]] = (m[s[k]] || 0) + 1), m), {})));
      if (most('shirt') > 2 || most('acc') > 3 || new Set(S.map((s) => s.acc)).size < 2) continue; // warna baju beragam (maks. 2 per warna)
      const sig = new Set(S.map(sigOf)); if (sig.size < 6) continue;
      return S;
    }
    return null;
  }
  const sigOf = (s) => [s.hat, s.glasses, s.bag, s.shirt, s.tall, s.acc].join('|');
  function holds(p, s) { return p.op === 'eq' ? s[p.k] === p.v : p.op === 'ne' ? s[p.k] !== p.v : s[p.k] === p.v; }
  function predsFor(c) {
    const P = ['hat', 'glasses', 'bag', 'tall'].map((k) => ({ k, v: c[k] }));
    P.push({ k: 'shirt', op: 'eq', v: c.shirt }); SHIRT_KEYS.filter((x) => x !== c.shirt).forEach((x) => P.push({ k: 'shirt', op: 'ne', v: x }));
    P.push({ k: 'acc', op: 'eq', v: c.acc }); ACCS.filter((x) => x !== c.acc).forEach((x) => P.push({ k: 'acc', op: 'ne', v: x }));
    return P;
  }
  function buildClues(S, cid, target, rng) {
    const c = S[cid]; const all = predsFor(c); let remaining = S.filter((s) => s.id !== cid).map((s) => s.id);
    const clues = []; const usedK = new Set();
    while (remaining.length) {
      const need = target - clues.length; if (need <= 0) return null;
      const cand = all.filter((p) => !usedK.has(p.k)).map((p) => ({ p, el: remaining.filter((id) => !holds(p, S[id])) }))
        .filter((x) => x.el.length && (need === 1 ? x.el.length === remaining.length : x.el.length <= remaining.length - (need - 1)));
      if (!cand.length) return null;
      const ideal = remaining.length / need; const best = Math.min(...cand.map((x) => Math.abs(x.el.length - ideal)));
      const ch = pick(cand.filter((x) => Math.abs(x.el.length - ideal) <= best + 0.5), rng);
      clues.push({ ...ch.p, clears: S.filter((s) => !holds(ch.p, s)).map((s) => s.id) }); usedK.add(ch.p.k);
      remaining = remaining.filter((id) => !ch.el.includes(id));
    }
    return clues.length === target ? clues : null;
  }
  let lastStory = '';
  function generateCase(target = 4, rng = Math.random, storyId = null) {
    for (let t = 0; t < 300; t++) {
      const S = rollSuspects(rng); if (!S) continue;
      const cid = (rng() * 6) | 0; const clues = buildClues(S, cid, target, rng); if (!clues) continue;
      let pool = STORIES.filter((s) => s.id !== lastStory); const st = (storyId && STORIES.find((s) => s.id === storyId)) || pick(pool, rng);
      return { story: st, suspects: S, culprit: cid, clues: clues.map((cl, i) => ({ ...cl, ...clueText(cl, i, rng) })) };
    }
    throw new Error('Gagal membuat kasus');
  }
  function validateCase(K) { // dipakai uji: pelaku cocok semua petunjuk & hanya pelaku yang tersisa
    const ok1 = K.clues.every((p) => holds(p, K.suspects[K.culprit]));
    const left = K.suspects.filter((s) => K.clues.every((p) => holds(p, s)));
    let rem = K.suspects.filter((s) => s.id !== K.culprit).map((s) => s.id); let each = true;
    K.clues.forEach((p) => { const n = rem.filter((id) => !holds(p, K.suspects[id])); if (!n.length) each = false; rem = rem.filter((id) => holds(p, K.suspects[id])); });
    return { consistent: ok1, solvable: left.length === 1 && left[0].id === K.culprit, eachNarrows: each, clues: K.clues.length, distinct: new Set(K.suspects.map(sigOf)).size === 6 };
  }

  /* ------------------------------ Teks petunjuk ------------------------------ */
  const SRC = {
    hat: [['📹', 'Rekaman CCTV'], ['👀', 'Saksi mata'], ['🪟', 'Bayangan di jendela']],
    glasses: [['👀', 'Saksi mata'], ['🔍', 'Jejak di lokasi'], ['📱', 'Foto HP siswa']],
    bag: [['📹', 'Rekaman CCTV'], ['👣', 'Jejak di lantai'], ['📝', 'Catatan penjaga']],
    shirt: [['🧵', 'Benang tersangkut'], ['📱', 'Foto HP siswa'], ['👀', 'Saksi mata']],
    tall: [['📏', 'Bekas tangan di rak'], ['👣', 'Jejak sepatu'], ['🪟', 'Bayangan di jendela']],
    acc: [['🧶', 'Serat kain di lokasi'], ['📹', 'Rekaman CCTV'], ['👀', 'Saksi mata']]
  };
  function clueText(p, i, rng) {
    const [ic, src] = pick(SRC[p.k], rng); let txt; let short; let tic;
    const C = (w) => `<b>${w}</b>`;
    switch (p.k) {
      case 'hat': tic = '🧢'; txt = p.v ? `Pelaku terlihat ${C('MEMAKAI TOPI')} saat kabur.` : `Rambut pelaku terlihat jelas — pelaku ${C('TIDAK memakai topi')}.`; short = p.v ? 'Memakai topi' : 'Tanpa topi'; break;
      case 'glasses': tic = '👓'; txt = p.v ? `Ada kilau lensa di wajahnya — pelaku ${C('MEMAKAI KACAMATA')}.` : `Pelaku membaca tulisan kecil dari jauh — ia ${C('TIDAK berkacamata')}.`; short = p.v ? 'Berkacamata' : 'Tanpa kacamata'; break;
      case 'bag': tic = '🎒'; txt = p.v ? `Barang itu pasti disembunyikan — pelaku ${C('MEMBAWA TAS')}.` : `Tangan pelaku tampak kosong — pelaku ${C('TIDAK membawa tas')}.`; short = p.v ? 'Membawa tas' : 'Tanpa tas'; break;
      case 'tall': tic = '📏'; txt = p.v ? `Rak paling atas tersentuh — pelaku bertubuh ${C('TINGGI')}.` : `Rak atas tak tersentuh & jejaknya kecil — pelaku bertubuh ${C('PENDEK')}.`; short = p.v ? 'Bertubuh tinggi' : 'Bertubuh pendek'; break;
      case 'shirt': tic = '👕'; txt = p.op === 'eq' ? `Pelaku memakai baju berwarna ${C(p.v.toUpperCase())}.` : `Pelaku ${C('TIDAK')} memakai baju berwarna ${C(p.v.toUpperCase())}.`; short = (p.op === 'eq' ? 'Baju ' : 'Bukan baju ') + p.v; break;
      default: tic = p.v === 'syal' ? '🧣' : p.v === 'dasi' ? '👔' : '🧣';
        if (p.op === 'eq') { txt = p.v === 'tanpa' ? `Leher pelaku polos — ${C('TANPA syal maupun dasi')}.` : `Pelaku memakai ${C(p.v.toUpperCase())}.`; short = p.v === 'tanpa' ? 'Tanpa syal & dasi' : 'Memakai ' + p.v; }
        else { txt = p.v === 'tanpa' ? `Pelaku memakai ${C('SYAL atau DASI')} di lehernya.` : `Pelaku ${C('TIDAK memakai ' + p.v.toUpperCase())}.`; short = p.v === 'tanpa' ? 'Pakai syal/dasi' : 'Tanpa ' + p.v; }
    }
    return { no: i + 1, icon: ic, src, html: txt, short, tic, swatch: p.k === 'shirt' ? SHIRTS[p.v] : null };
  }
  const plainClue = (cl) => cl.html.replace(/<[^>]+>/g, '');

  /* ------------------------------ Gambar tersangka (SVG) ------------------------------ */
  function faceSVG(s) {
    const dy = s.tall ? 0 : 27; const sh = SHIRTS[s.shirt]; const sk = s.skin; const hc = s.hc;
    let lines = ''; for (let i = 0; i < 6; i++) { const y = 18 + i * 22; lines += `<line x1="0" y1="${y}" x2="120" y2="${y}" stroke="#9fb0ba" stroke-width="1"/><text x="3" y="${y - 3}" font-size="7" fill="#7b8d98" font-family="monospace">${180 - i * 20}</text>`; }
    let back = ''; let front = '';
    const hair = s.hair;
    if (hair === 'long') back = `<path d="M38 48 Q36 20 60 20 Q84 20 82 48 L86 92 L34 92 Z" fill="${hc}"/>`;
    if (hair === 'curlylong') back = `<g fill="${hc}"><circle cx="40" cy="58" r="11"/><circle cx="80" cy="58" r="11"/><circle cx="38" cy="76" r="10"/><circle cx="82" cy="76" r="10"/><circle cx="42" cy="38" r="12"/><circle cx="78" cy="38" r="12"/><circle cx="60" cy="27" r="14"/></g>`;
    if (hair === 'hijab') back = `<path d="M33 52 Q33 18 60 18 Q87 18 87 52 Q88 74 98 96 L22 96 Q32 74 33 52 Z" fill="${hc}"/>`;
    // badan & baju
    let body = `<path d="M18 160 L18 108 Q20 86 44 81 L76 81 Q100 86 102 108 L102 160 Z" fill="${sh}"/>`;
    body += `<path d="M44 81 L60 98 L76 81 Z" fill="rgba(255,255,255,.9)"/><path d="M60 98 L60 160" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>`;
    if (hair !== 'hijab') body += `<rect x="53" y="64" width="14" height="19" rx="5" fill="${sk}"/>`;
    // aksesori leher
    if (s.acc === 'dasi') body += `<path d="M56 82 L64 82 L62 88 L58 88 Z" fill="#1e293b"/><path d="M58 88 L62 88 L66 118 L60 125 L54 118 Z" fill="#1e293b"/><path d="M57 96 L64 100 M56 106 L65 110" stroke="#94a3b8" stroke-width="1.6"/>`;
    if (s.acc === 'syal') body += `<rect x="40" y="74" width="40" height="12" rx="6" fill="#f97316"/><path d="M44 77 L76 77 M44 82 L76 82" stroke="#fff7ed" stroke-width="2" stroke-dasharray="4 4"/><path d="M64 82 L74 112 L64 114 L58 86 Z" fill="#f97316"/><path d="M66 92 L72 92 M68 101 L74 101" stroke="#fff7ed" stroke-width="2"/>`;
    if (s.bag) body += `<path d="M42 82 L92 136" stroke="#7c4a1e" stroke-width="5" stroke-linecap="round"/><rect x="80" y="122" width="28" height="24" rx="5" fill="#92582a"/><path d="M80 129 L108 129" stroke="#5b3410" stroke-width="2.5"/><circle cx="94" cy="134" r="2.4" fill="#fde68a"/>`;
    // kepala
    let head = hair === 'hijab' ? `<ellipse cx="60" cy="48" rx="15" ry="18" fill="${sk}"/>` : `<ellipse cx="60" cy="46" rx="18" ry="20" fill="${sk}"/><ellipse cx="42" cy="48" rx="3.5" ry="5" fill="${sk}"/><ellipse cx="78" cy="48" rx="3.5" ry="5" fill="${sk}"/>`;
    if (hair === 'short') front = `<path d="M41 44 Q40 22 60 22 Q81 22 79 44 Q76 32 60 31 Q46 31 41 44 Z" fill="${hc}"/>`;
    if (hair === 'spiky') front = `<path d="M40 42 L42 26 L48 31 L52 20 L58 28 L63 18 L68 28 L74 21 L76 31 L81 27 L80 42 Q76 32 60 31 Q45 31 40 42 Z" fill="${hc}"/>`;
    if (hair === 'long') front = `<path d="M41 46 Q42 24 60 24 Q80 24 79 46 Q72 33 58 33 Q48 34 41 46 Z" fill="${hc}"/>`;
    if (hair === 'bun') front = `<circle cx="60" cy="21" r="9" fill="${hc}"/><path d="M41 44 Q40 24 60 24 Q80 24 79 44 Q73 32 60 32 Q47 32 41 44 Z" fill="${hc}"/>`;
    if (hair === 'curly') front = `<g fill="${hc}"><circle cx="46" cy="32" r="8"/><circle cx="56" cy="27" r="8"/><circle cx="66" cy="27" r="8"/><circle cx="75" cy="33" r="8"/><circle cx="42" cy="40" r="5"/><circle cx="78" cy="41" r="5"/></g>`;
    if (hair === 'curlylong') front = `<g fill="${hc}"><circle cx="48" cy="31" r="8"/><circle cx="60" cy="27" r="8"/><circle cx="72" cy="31" r="8"/></g>`;
    if (hair === 'bald') front = `<path d="M42 44 Q43 36 47 34 M78 44 Q77 36 73 34" stroke="${hc}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    if (hair === 'hijab') front = `<path d="M45 34 Q60 26 75 34" stroke="rgba(0,0,0,.12)" stroke-width="2" fill="none"/>`;
    // wajah
    let face = `<circle cx="53" cy="48" r="2.3" fill="#1f1611"/><circle cx="67" cy="48" r="2.3" fill="#1f1611"/><path d="M49 42 L56 41 M64 41 L71 42" stroke="#3b2a1f" stroke-width="1.8" stroke-linecap="round"/>`;
    face += `<path d="M60 50 Q58 55 61 55" stroke="rgba(0,0,0,.25)" stroke-width="1.4" fill="none"/><circle cx="48" cy="55" r="3.2" fill="#f87171" opacity=".3"/><circle cx="72" cy="55" r="3.2" fill="#f87171" opacity=".3"/>`;
    face += s.stache ? `<path d="M52 59 Q56 56 60 58 Q64 56 68 59 Q64 61 60 60 Q56 61 52 59 Z" fill="${hc}"/><path d="M55 63 Q60 65 65 63" stroke="#7f1d1d" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : `<path d="M54 59 Q60 64 66 59" stroke="#7f1d1d" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    if (s.glasses) face += `<g stroke="#111827" stroke-width="2.2" fill="rgba(186,230,253,.35)"><circle cx="53" cy="48" r="6.2"/><circle cx="67" cy="48" r="6.2"/></g><path d="M59 48 L61 48 M46.8 47 L42 45 M73.2 47 L78 45" stroke="#111827" stroke-width="2"/>`;
    let hat = '';
    if (s.hat) hat = `<path d="M39 38 Q39 15 60 15 Q81 15 81 38 Z" fill="#334155"/><path d="M60 36 L96 38 Q95 43 60 41 Z" fill="#1e293b"/><circle cx="60" cy="15.5" r="2.6" fill="#1e293b"/><path d="M47 22 Q60 17 73 22" stroke="#facc15" stroke-width="2.4" fill="none"/>`;
    return `<svg viewBox="0 0 120 140" class="mug" aria-hidden="true"><rect width="120" height="140" fill="#dfe6ea"/>${lines}<g transform="${s.tall ? 'translate(0 0)' : `translate(4.8 ${dy}) scale(.92)`}">${back}${body}${head}${front}${face}${hat}</g></svg>`;
  }
  function traitsHTML(s) {
    const t = (on, ic, tip) => `<i class="${on ? 'on' : ''}" title="${tip}">${ic}</i>`;
    return t(s.hat, '🧢', s.hat ? 'Memakai topi' : 'Tanpa topi') + t(s.glasses, '👓', s.glasses ? 'Berkacamata' : 'Tanpa kacamata') + t(s.bag, '🎒', s.bag ? 'Membawa tas' : 'Tanpa tas') +
      t(s.acc !== 'tanpa', s.acc === 'dasi' ? '👔' : '🧣', s.acc === 'tanpa' ? 'Tanpa syal/dasi' : 'Memakai ' + s.acc) +
      `<i class="on sw" style="--sw:${SHIRTS[s.shirt]}" title="Baju ${s.shirt}"></i><i class="on ht" title="${s.tall ? 'Tinggi' : 'Pendek'}">${s.tall ? '⬆T' : '⬇P'}</i>`;
  }
  const traitWords = (s) => [s.hat ? 'bertopi' : 'tanpa topi', s.glasses ? 'berkacamata' : 'tanpa kacamata', s.bag ? 'membawa tas' : 'tanpa tas', 'baju ' + s.shirt, s.tall ? 'tinggi' : 'pendek', s.acc === 'tanpa' ? 'tanpa syal/dasi' : 'memakai ' + s.acc].join(' • ');

  /* ------------------------------ Status permainan ------------------------------ */
  let T = []; // tim
  const S = { cases: 3, time: 20, rebut: 'on', bots: 0, len: 'normal', diskusi: 'on', pen: 20 };
  let phase = 'idle'; let turn = 0; let caseNo = 1; let K = null; let opened = 0; let cleared = {}; let gameSeq = 0;
  let tStart = 0; let curQ = null; let curAnswerer = null; let pickResolve = null; let rebDecide = null; let accuseLog = []; let caseLog = []; let solver = null;
  let logList = []; const askLog = []; let lastReveal = null;
  const cur = () => T[turn];
  const remainingIds = () => (K ? K.suspects.filter((s) => !cleared[s.id]).map((s) => s.id) : []);
  const prizeNow = () => Math.max(40, 100 - 15 * Math.max(0, opened - 1));
  const teamMode = () => true;
  const nm = (t) => `<b style="color:${t.color}">${esc(t.name)}</b>`;

  function parseMembers(txt) {
    const s = String(txt || '').trim(); if (!s) return [];
    if (/^\d{1,2}$/.test(s)) { const n = clamp(+s, 1, 12); return Array.from({ length: n }, (_, i) => `Anggota ${i + 1}`); }
    return s.split(/[,;\n]+/).map((x) => x.trim().slice(0, 18)).filter(Boolean).slice(0, 12);
  }
  const peekAnswerer = (t) => (t && t.members && t.members.length ? t.members[t.mi % t.members.length] : null);
  function takeAnswerer(t) { const m = peekAnswerer(t); if (m) t.mi = (t.mi + 1) % t.members.length; return m; }

  /* ------------------------------ Tampilan ------------------------------ */
  function setText(el, v) { v = String(v); if (el && el.textContent !== v) el.textContent = v; }
  const clock = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  function renderHud() {
    setText($('caseNo'), Math.min(caseNo, S.cases)); setText($('caseMax'), '/' + S.cases); setText($('caseTabNo'), caseNo);
    setText($('clueNo'), opened); setText($('clueMax'), '/' + (K ? K.clues.length : LEN[S.len]));
    setText($('susNo'), K ? remainingIds().length : 6); setText($('prizeNo'), prizeNow());
    setText($('clockNo'), clock(tStart && !['idle', 'guide'].includes(phase) ? Date.now() - tStart : 0));
  }
  function renderCase() {
    if (!K) return;
    $('caseIcon').textContent = K.story.icon; setText($('caseTitle'), K.story.title); setText($('caseStory'), K.story.story);
    $('lineup').innerHTML = K.suspects.map((s, i) => `<div class="pol" id="pol${i}" data-id="${i}" style="--r:${[-2.5, 1.8, -1.2, 2.4, -1.8, 1.2][i]}deg;--d:${i * 70}ms">
      <span class="pin" aria-hidden="true"></span><span class="num">${i + 1}</span>
      <div class="photo">${faceSVG(s)}<span class="cross" aria-hidden="true"></span><span class="stamp st-bebas">BEBAS</span><span class="stamp st-pelaku">PELAKU!</span><span class="tag">TERSANGKA</span></div>
      <div class="cap"><b>${esc(s.name)}</b><small>${esc(s.role)}</small></div>
      <div class="traits">${traitsHTML(s)}</div></div>`).join('');
    renderEnvs(); renderBoardState(false);
  }
  function renderEnvs() {
    if (!K) return; const picking = phase === 'pick';
    $('envs').innerHTML = K.clues.map((cl, i) => i < opened
      ? `<div class="env open" style="--d:${i * 60}ms"><span class="e-no">#${cl.no}</span><i>${cl.tic}</i><span class="e-txt">${esc(cl.short)}</span>${cl.swatch ? `<em class="e-sw" style="--sw:${cl.swatch}"></em>` : ''}</div>`
      : `<button class="env shut${picking ? ' pickable' : ''}" data-env="${i}" ${picking ? '' : 'disabled'} title="Amplop petunjuk"><span class="seal">?</span><span class="e-lbl">AMPLOP ${i + 1}</span></button>`).join('');
    $('envs').querySelectorAll('[data-env]').forEach((b) => (b.onclick = () => { if (phase === 'pick' && pickResolve && !cur().ai) pickResolve(+b.dataset.env); }));
    setText($('clueHelp'), opened >= K.clues.length ? 'Semua petunjuk sudah terbuka — siapa pelakunya?' : phase === 'pick' ? '👉 Pilih satu amplop!' : 'Jawab soal dengan benar untuk membuka amplop');
  }
  function renderBoardState(animate, fresh = []) {
    if (!K) return;
    K.suspects.forEach((s) => {
      const el = $('pol' + s.id); if (!el) return; const was = el.classList.contains('cleared'); const now = !!cleared[s.id];
      el.classList.toggle('cleared', now); if (now && !was && animate && fresh.includes(s.id)) { el.classList.remove('anim'); void el.offsetWidth; el.classList.add('anim'); }
      el.classList.toggle('culprit', phase === 'solved' && s.id === K.culprit);
    });
  }
  function renderTeams() {
    const el = $('teams'); const inPlay = !['idle', 'guide', 'brief', 'over'].includes(phase);
    const sig = T.map((t) => t.name + t.color).join('|');
    if (el._sig !== sig) {
      el._sig = sig;
      el.innerHTML = T.map((t, i) => `<div class="tm" id="tm${i}" style="--pc:${t.color}"><span class="tm-badge">▶ GILIRAN</span><span class="tm-av">${t.ai ? '🤖' : t.avatar}</span>
        <div class="tm-name"><span>${esc(t.name)}</span><span class="tm-flags"></span></div><div class="tm-pts"><b id="pts${i}">0</b><small>POIN</small></div><div class="tm-ans"></div></div>`).join('');
      T.forEach((t) => (t.shown = t.pts));
    }
    T.forEach((t, i) => {
      const c = $('tm' + i); if (!c) return;
      c.classList.toggle('active', inPlay && i === turn);
      const fl = (t.skip ? '<span class="bdg bad" title="Salah tuduh: tidak boleh menuduh di kesempatan berikutnya">🚫 skors tuduh</span>' : '') + (t.solved ? `<span class="bdg" title="Kasus terpecahkan">🕵️×${t.solved}</span>` : '');
      const f = c.querySelector('.tm-flags'); if (f._h !== fl) { f._h = fl; f.innerHTML = fl; }
      const ans = inPlay && i === turn && !t.ai ? (curAnswerer || (peekAnswerer(t) && peekAnswerer(t).name)) : null;
      const a = c.querySelector('.tm-ans'); setText(a, ans ? `🙋 Penjawab: ${ans}` : t.ai ? '🤖 komputer' : t.members.length ? `👥 ${t.members.length} anggota` : ''); a.classList.toggle('on', !!ans);
      if (t.pts !== t.shown) {
        const from = t.shown; t.shown = t.pts; const pEl = $('pts' + i);
        FX.countUp(pEl, from, t.pts, 700); FX.floatTextAt(pEl, (t.pts > from ? '+' : '−') + Math.abs(t.pts - from), t.pts > from ? '#4ade80' : '#f87171', 30);
        c.classList.remove('gain', 'hit'); void c.offsetWidth; c.classList.add(t.pts > from ? 'gain' : 'hit');
      } else setText($('pts' + i), t.pts);
    });
  }
  function hintFor() {
    const t = cur(); if (!t) return '';
    switch (phase) {
      case 'turn': return t.ai ? `🤖 ${esc(t.name)} sedang menyelidiki…` : `${nm(t)}, jawab soal dengan benar untuk membuka amplop petunjuk!`;
      case 'asking': return '❓ Menjawab soal…';
      case 'pick': return t.ai ? `🤖 ${esc(t.name)} memilih amplop…` : `✉️ ${nm(t)}: pilih satu amplop petunjuk!`;
      case 'accuse': return '🕵️ Saatnya memutuskan…';
      case 'solved': return '🎉 Kasus terpecahkan!';
      default: return '';
    }
  }
  function renderAct() {
    const t = cur(); const btn = $('btnMain'); const chip = $('turnChip');
    chip.innerHTML = t && !['idle', 'over'].includes(phase) ? `<span class="tc" style="--pc:${t.color}">${t.ai ? '🤖' : t.avatar} ${esc(t.name)}</span>` : '';
    $('hint').innerHTML = hintFor();
    let label = ''; let dis = false;
    if (phase === 'turn') { label = t && t.ai ? '🤖 Komputer berpikir…' : '❓ JAWAB SOAL<small>SPASI</small>'; dis = !!(t && t.ai); }
    else if (phase === 'pick') { label = '✉️ BUKA AMPLOP<small>SPASI / 1–' + (K.clues.length - opened) + '</small>'; dis = !!(t && t.ai); }
    else if (phase === 'solved') label = caseNo >= S.cases ? '🏆 LIHAT JUARA<small>SPASI</small>' : '➜ KASUS BERIKUTNYA<small>SPASI</small>';
    else { label = '⏳ Tunggu…'; dis = true; }
    if (btn._l !== label) { btn._l = label; btn.innerHTML = label; }
    btn.disabled = dis; btn.classList.toggle('go', !dis);
    $('actbox').style.setProperty('--pc', t ? t.color : '#f59e0b');
  }
  function render() { renderHud(); renderTeams(); renderAct(); if (K) { renderEnvs(); } }
  function addLog(html) {
    logList.unshift({ html }); if (logList.length > 40) logList.pop();
    const li = document.createElement('li'); li.innerHTML = html; const ol = $('log'); ol.prepend(li); while (ol.children.length > 40) ol.lastChild.remove();
  }
  function addPts(t, n, why) {
    const before = t.pts; t.pts = Math.max(0, t.pts + n); renderTeams();
    if (why) addLog(`${nm(t)} ${why} <em class="${n >= 0 ? 'up' : 'down'}">${n >= 0 ? '+' : '−'}${Math.abs(t.pts - before) || Math.abs(n)}</em>`);
  }

  /* ------------------------------ Soal & Rebutan ------------------------------ */
  const rebutCands = (t) => (S.rebut === 'on' ? T.filter((o) => o !== t && !o.ai) : []);
  function decorateAsk(t, m, rebutable) {
    const o = [...document.querySelectorAll('.qc-overlay.qc-ask')].pop(); if (!o) return;
    if (rebutable) o.classList.add('dk-rebutable');
    const head = o.querySelector('.qc-ask-head'); if (!head) return;
    const el = document.createElement('div'); el.className = 'dk-answerer'; el.style.setProperty('--pc', t.color);
    el.innerHTML = m ? `<span class="who">🙋 Penjawab: <b>${esc(m.name)}</b></span><span class="dis">${S.diskusi === 'off' ? '🤫 Jawab sendiri — tanpa diskusi' : '💬 Boleh diskusi dulu dengan tim'}</span>`
      : `<span class="who">👥 Dijawab bersama <b>${esc(t.name)}</b></span><span class="dis">${S.diskusi === 'off' ? '🤫 Tanpa diskusi' : '💬 Boleh berdiskusi'}</span>`;
    head.insertAdjacentElement('afterend', el);
  }
  async function quiz(t, badge, q) {
    q = q || QC.nextQuestion(); curQ = q;
    const m = takeAnswerer(t); curAnswerer = m ? m.name : null; renderTeams();
    const pr = QC.ask(q, { player: { name: t.name, avatar: t.avatar, color: t.color }, time: S.time, badge });
    decorateAsk(t, m, !badge && rebutCands(t).length > 0);
    const r = await pr; curQ = null; curAnswerer = null; const ok = !!r.correct;
    t.asked++; if (ok) t.correct++; if (m) { m.asked++; if (ok) m.correct++; }
    askLog.push({ team: t.id, member: m ? m.name : null, ok, rebut: !!badge }); if (askLog.length > 400) askLog.shift();
    renderTeams(); return { ok, q };
  }
  async function aiQuiz(t, gid) {
    const q = QC.nextQuestion(); SND.think();
    const pr = QC.modal({ cls: 'dk-think', icon: '🤖', title: `${esc(t.name)} sedang berpikir…`, html: `<div class="th-q">${q ? esc(q.question) : ''}</div><div class="dots"><span>•</span><span>•</span><span>•</span></div>`, buttons: [] , onOpen(o, done) { setTimeout(() => done(true), 1300 * TS); } });
    await pr; if (gid !== gameSeq) return { ok: false, q };
    const ok = Math.random() < AI_ACC; t.asked++; if (ok) t.correct++;
    askLog.push({ team: t.id, member: null, ok });
    ok ? QC.sfx.correct() : QC.sfx.wrong();
    QC.toast(ok ? `🤖 ${esc(t.name)} menjawab <b>BENAR</b>!` : `🤖 ${esc(t.name)} menjawab <b>salah</b>${rebutCands(t).length ? ' — ⚡ REBUTAN!' : q ? ` • Jawaban: ${q.correct}. ${esc(q['option' + q.correct])}` : ''}`, ok ? 'good' : 'bad');
    await wait(500); return { ok, q };
  }
  async function rebutan(active, q, gid) {
    const cands = rebutCands(active); if (!q || !cands.length) return null;
    SND.rebut();
    const pick = await QC.modal({
      cls: 'dk-rebut', icon: '⚡', title: 'REBUTAN! Siapa paling cepat?',
      html: `<p class="qc-muted">${esc(active.name)} belum tepat. Tim lain: <b>cepat klik tombol tim kalian!</b> Tim yang paling dulu mengklik berhak menjawab soal yang sama.<br><small>Keyboard: tekan nomor tim.</small></p>
        <div class="rb-q">❓ ${esc(q.question)}</div>
        <div class="rb-grid">${cands.map((o) => `<button class="rb-btn" data-t="${o.id}" style="--pc:${o.color}"><kbd>${o.id + 1}</kbd><span class="rb-av">${o.avatar}</span><b>${esc(o.name)}</b><small>benar = +${PTS_Q} & buka amplop</small></button>`).join('')}</div>`,
      buttons: [{ label: '⏭️ Lewati', value: null }],
      onOpen(o, done) {
        rebDecide = (v) => done(v);
        o.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { QC.sfx.click(); done(+b.dataset.t); }));
        o._onKey = (e) => { const n = parseInt(e.key, 10); const hit = cands.find((c) => c.id === n - 1); if (hit) done(hit.id); else if (e.key === 'Escape') done(null); };
      }
    });
    rebDecide = null;
    if (gid !== gameSeq) return null;
    if (pick == null || !T[pick]) { QC.toast(`💡 Jawaban benar: <b>${q.correct}. ${esc(q['option' + q.correct])}</b>`); addLog('⚡ Rebutan dilewati'); return null; }
    const o = T[pick];
    const r = await quiz(o, '⚡ Soal Rebutan', q);
    if (gid !== gameSeq) return null;
    if (r.ok) { FX.announce('⚡ REBUTAN BERHASIL!', { color: o.color, sub: `${esc(o.name)} merebut soal dan membuka amplop!`, dur: 1200 }); addPts(o, PTS_Q, 'merebut soal ⚡'); await wait(900); return o; }
    addLog(`${nm(o)} gagal merebut soal`); return null;
  }

  /* ------------------------------ Giliran ------------------------------ */
  async function doAsk() {
    if (phase !== 'turn' || QC.isBusy()) return false;
    const gid = gameSeq; const t = cur(); phase = 'asking'; render();
    const r = t.ai ? await aiQuiz(t, gid) : await quiz(t);
    if (gid !== gameSeq) return true;
    let who = null;
    if (r.ok) { addPts(t, PTS_Q, 'menjawab benar'); who = t; }
    else { addLog(`${nm(t)} menjawab salah`); who = await rebutan(t, r.q, gid); if (gid !== gameSeq) return true; }
    if (who) await investigate(who, gid);
    if (gid !== gameSeq || phase === 'solved' || phase === 'over') return true;
    nextTurn(); return true;
  }
  function nextTurn() { turn = (turn + 1) % T.length; phase = 'turn'; render(); if (cur().ai) setTimeout(() => aiGo(gameSeq), 700 * TS); }
  function aiGo(gid) { if (gid === gameSeq && phase === 'turn' && cur().ai && !QC.isBusy()) doAsk(); else if (gid === gameSeq && phase === 'turn' && cur().ai) setTimeout(() => aiGo(gid), 400); }

  async function investigate(t, gid) {
    const prevTurn = turn; turn = t.id; // tim perebut soal tampil sebagai tim aktif selama menyelidiki
    try { await investigateCore(t, gid); } finally { if (gid === gameSeq && phase !== 'solved' && phase !== 'over') { turn = prevTurn; render(); } }
  }
  async function investigateCore(t, gid) {
    if (opened < K.clues.length) {
      phase = 'pick'; render();
      const env = await new Promise((res) => { pickResolve = res; if (t.ai) setTimeout(() => res(K.clues.length - 1), 900 * TS); });
      pickResolve = null; if (gid !== gameSeq) return;
      await openClue(t, env, gid); if (gid !== gameSeq) return;
    } else QC.toast('🗂️ Semua amplop sudah terbuka — langsung ke tuduhan!');
    if (t.skip) {
      t.skip = false; renderTeams();
      await QC.modal({ cls: 'dk-skip', icon: '🚫', title: 'Skors Tuduhan', html: `<p class="qc-muted">${nm(t)} salah menuduh sebelumnya, jadi <b>belum boleh menuduh</b> kali ini. Skors sudah selesai — kesempatan berikutnya boleh menuduh lagi!</p>`, buttons: [{ label: 'Mengerti ➜', value: true, primary: true }], onOpen(o, done) { if (t.ai) setTimeout(() => done(true), 900 * TS); } });
      return;
    }
    await accuseFlow(t, gid);
  }
  async function openClue(t, envIdx, gid) {
    const cl = K.clues[opened]; opened++;
    const fresh = cl.clears.filter((id) => !cleared[id] && id !== K.culprit);
    SND.paper(); renderEnvs(); renderHud();
    const env = document.querySelector('.env.open:last-of-type'); if (env) { env.classList.add('flip'); }
    SND.type(7);
    await QC.modal({
      cls: 'dk-clue', icon: '', title: '',
      html: `<div class="clue-card"><div class="cc-head"><span class="cc-no">PETUNJUK #${cl.no}</span><span class="cc-src">${cl.icon} ${esc(cl.src)}</span></div>
        <div class="cc-txt">${cl.html}</div>
        <div class="cc-clear">${fresh.length ? `<span>Dibebaskan:</span>${fresh.map((id) => `<span class="mini">${faceSVG(K.suspects[id])}<b>${esc(K.suspects[id].name)}</b></span>`).join('')}` : '<span>Petunjuk ini menguatkan dugaan — tidak ada tersangka baru yang dibebaskan.</span>'}</div>
        <div class="cc-by">dibuka oleh ${nm(t)}</div></div>`,
      buttons: [{ label: '🔍 Coret tersangka ➜', value: true, primary: true }],
      onOpen(o, done) { if (t.ai) setTimeout(() => done(true), 2200 * TS); }
    });
    if (gid !== gameSeq) return;
    addLog(`✉️ Petunjuk #${cl.no} (${nm(t)}): ${esc(plainClue(cl))}`);
    for (const id of fresh) { cleared[id] = { by: 'clue', no: cl.no }; renderBoardState(true, [id]); SND.stamp(); await wait(260); }
    renderHud();
    if (remainingIds().length === 1) FX.announce('🔎 Tinggal satu tersangka!', { color: '#b45309', dur: 1200 });
    await wait(fresh.length ? 450 : 150);
  }
  async function accuseFlow(t, gid) {
    if (gid !== gameSeq) return;
    phase = 'accuse'; render();
    const rem = remainingIds();
    let target = null;
    if (t.ai) {
      if (rem.length === 1 || (rem.length === 2 && Math.random() < 0.5)) target = pick(rem);
      if (target == null) { QC.toast(`🤖 ${esc(t.name)} belum mau menuduh.`); await wait(700); return; }
      await QC.modal({ cls: 'dk-think', icon: '🤖', title: `${esc(t.name)} menuduh…`, html: `<p class="qc-muted">"Saya yakin pelakunya adalah <b>${esc(K.suspects[target].name)}</b>!"</p>`, buttons: [], onOpen(o, done) { setTimeout(() => done(true), 1300 * TS); } });
    } else {
      const go = await QC.modal({
        cls: 'dk-ask-acc', icon: '🕵️', title: 'Tuduh pelaku sekarang?',
        html: `<p class="qc-muted">${nm(t)} boleh menuduh satu tersangka. Benar = kasus terpecahkan <b>+${prizeNow()} poin</b>. Salah = <b>−${S.pen} poin</b> dan tidak boleh menuduh di kesempatan berikutnya.</p><p class="acc-left">Tersangka tersisa: <b>${rem.length}</b></p>`,
        buttons: [{ label: '⏭️ Belum, lanjut', value: false }, { label: '🕵️ Tuduh Pelaku!', value: true, primary: true }],
        onOpen(o, done) { accDecide = done; }
      });
      accDecide = null;
      if (gid !== gameSeq) return;
      if (!go) { addLog(`${nm(t)} memilih belum menuduh`); return; }
      target = await choose(t, gid);
      if (gid !== gameSeq || target == null) return;
    }
    await resolveAccuse(t, target, gid);
  }
  let accDecide = null; let chooseDone = null;
  function choose(t, gid) {
    const all = K.suspects;
    return QC.modal({
      cls: 'dk-choose', icon: '👉', title: `${esc(t.name)}: siapa pelakunya?`,
      html: `<p class="qc-muted">Klik foto tersangka (atau tekan nomornya). Tersangka yang sudah BEBAS tidak bisa dipilih.</p><div class="ch-grid">${all.map((s) => `<button class="ch-btn" data-s="${s.id}" ${cleared[s.id] ? 'disabled' : ''}><kbd>${s.id + 1}</kbd>${faceSVG(s)}<b>${esc(s.name)}</b>${cleared[s.id] ? '<em>BEBAS</em>' : ''}</button>`).join('')}</div>`,
      buttons: [{ label: '↩️ Batal', value: null }],
      onOpen(o, done) {
        chooseDone = done;
        o.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { QC.sfx.click(); done(+b.dataset.s); }));
        o._onKey = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= 6 && !cleared[n - 1]) done(n - 1); else if (e.key === 'Escape') done(null); };
      }
    }).then((v) => { chooseDone = null; return v; });
  }
  async function resolveAccuse(t, id, gid) {
    const s = K.suspects[id]; const right = id === K.culprit;
    accuseLog.push({ caseNo, team: t.id, suspect: id, right, opened });
    SND.drum();
    FX.announce(`🕵️ ${esc(t.name)} menuduh…`, { color: t.color, sub: `${esc(s.name)} (${esc(s.role)})`, dur: 1300 });
    const pol = $('pol' + id); if (pol) pol.classList.add('accused');
    await wait(1350); if (gid !== gameSeq) return;
    if (pol) pol.classList.remove('accused');
    if (right) { await solveCase(t, gid); return; }
    SND.buzz(); FX.shake($('board'), 8, 450);
    cleared[id] = { by: 'alibi', team: t.id }; renderBoardState(true, [id]); SND.stamp();
    addPts(t, -S.pen, `salah menuduh ${esc(s.name)}`); t.skip = true; renderTeams(); renderHud();
    await QC.modal({ cls: 'dk-wrong', icon: '❌', title: 'SALAH TUDUH!', html: `<div class="wr-face">${faceSVG(s)}<span class="stamp st-bebas show">BEBAS</span></div><p class="qc-muted"><b>${esc(s.name)}</b> punya alibi kuat: ${esc(s.alibi)}</p><p class="wr-pen">${nm(t)} −${S.pen} poin • 🚫 tidak boleh menuduh di kesempatan berikutnya</p>`, buttons: [{ label: 'Lanjut ➜', value: true, primary: true }], onOpen(o, done) { if (t.ai) setTimeout(() => done(true), 1800 * TS); } });
  }
  async function solveCase(t, gid) {
    const pts = prizeNow(); phase = 'solved'; solver = t.id; t.solved = (t.solved || 0) + 1;
    caseLog.push({ caseNo, title: K.story.title, team: t.id, opened, pts, culprit: K.suspects[K.culprit].name });
    K.suspects.forEach((s) => { if (s.id !== K.culprit && !cleared[s.id]) cleared[s.id] = { by: 'solve' }; });
    renderBoardState(true, []); renderHud();
    addPts(t, pts, `memecahkan kasus "${esc(K.story.title)}" dengan ${opened} petunjuk`);
    SND.solve(); QC.confetti(LITE ? 60 : 160); if (!LITE) setTimeout(() => QC.confetti(90), 600);
    const s = K.suspects[K.culprit];
    lastReveal = { team: t.id, pts, culprit: K.culprit };
    $('reveal').innerHTML = `<div class="rv-card" style="--pc:${t.color}">
      <div class="rv-kicker">🔦 KASUS TERPECAHKAN!</div>
      <div class="rv-pol"><div class="photo">${faceSVG(s)}<span class="stamp st-pelaku show">PELAKU!</span></div><div class="cap"><b>${esc(s.name)}</b><small>${esc(s.role)}</small></div></div>
      <div class="rv-body"><h2>${esc(K.story.icon)} ${esc(K.story.title)}</h2>
      <p class="rv-motive"><b>${esc(s.name)}</b> ${esc(K.story.motive)}</p>
      <p class="rv-traits">Ciri pelaku: ${esc(traitWords(s))}</p>
      <div class="rv-win"><span class="tc" style="--pc:${t.color}">${t.ai ? '🤖' : t.avatar} ${esc(t.name)}</span> memecahkan kasus dengan <b>${opened}</b> petunjuk → <b class="rv-pts">+${pts} poin</b></div>
      <button class="bigbtn go" id="btnNext">${caseNo >= S.cases ? '🏆 LIHAT JUARA' : '➜ KASUS BERIKUTNYA'}<small>SPASI</small></button></div></div>`;
    $('reveal').hidden = false; requestAnimationFrame(() => $('reveal').classList.add('show'));
    $('btnNext').onclick = () => afterSolve();
    render();
    if (t.ai || T.every((x) => x.ai)) { /* tunggu guru menekan tombol */ }
  }
  function afterSolve() {
    if (phase !== 'solved') return false;
    $('reveal').classList.remove('show'); $('reveal').hidden = true;
    if (caseNo >= S.cases) { endGame(); return true; }
    caseNo++; turn = (solver + 1) % T.length; newCase(); return true;
  }

  /* ------------------------------ Kasus & brief ------------------------------ */
  function newCase(storyId) {
    K = generateCase(LEN[S.len] || 4, Math.random, storyId); lastStory = K.story.id; opened = 0; cleared = {}; solver = null;
    T.forEach((t) => (t.skip = false));
    phase = 'brief'; renderCase(); render(); showBrief();
    addLog(`📁 <b>Kasus #${caseNo}: ${esc(K.story.title)}</b> dibuka`);
  }
  function showGuide() {
    phase = 'guide'; render();
    $('brief').innerHTML = `<div class="brief-card guide"><span class="stampx">📋 PANDUAN DETEKTIF</span><h2>Cara Main Detektif Kelas</h2>
      <div class="gd-steps">
        <div class="gd-st" style="--d:0s"><i>❓</i><b>1. Jawab soal</b><span>Anggota tim menjawab <em>bergiliran</em>. Benar = +${PTS_Q} poin</span></div>
        <div class="gd-st" style="--d:.1s"><i>✉️</i><b>2. Buka amplop</b><span>Jawaban benar membuka <em>1 amplop petunjuk</em> untuk semua</span></div>
        <div class="gd-st" style="--d:.2s"><i class="gd-x">🧢<s></s></i><b>3. Coret tersangka</b><span>Tersangka yang tidak cocok dengan petunjuk dicap <em>BEBAS</em></span></div>
        <div class="gd-st" style="--d:.3s"><i>🕵️</i><b>4. Tuduh pelaku</b><span>Benar = <em>hingga 100 poin</em>. Makin sedikit petunjuk, makin besar poinnya!</span></div>
        ${S.rebut === 'on' && T.filter((x) => !x.ai).length > 1 ? `<div class="gd-st hot" style="--d:.4s"><i>⚡</i><b>Rebutan!</b><span>Tim lain salah? <em>Cepat klik tombol timmu</em> untuk merebut soal</span></div>` : ''}
      </div>
      <p class="gd-note">⚠️ Salah menuduh = <b>−${S.pen} poin</b> dan tidak boleh menuduh di kesempatan berikutnya. ${S.cases} kasus • ${S.time} detik per soal • tim dengan poin terbanyak menang!</p>
      <button class="bigbtn go" id="btnGuide">🔍 MENGERTI, BUKA KASUS 1!<small>SPASI</small></button></div>`;
    $('brief').hidden = false; $('btnGuide').onclick = (e) => { e.currentTarget.blur(); guideDone(); };
  }
  function guideDone() { if (phase !== 'guide') return false; SND.ac(); QC.sfx.click(); newCase(); return true; }
  function showBrief() {
    const st = K.story;
    $('brief').innerHTML = `<div class="brief-card case"><span class="stampx red">RAHASIA</span><div class="bc-tab">📁 BERKAS KASUS #${caseNo} dari ${S.cases}</div>
      <div class="bc-head"><span class="bc-icon">${st.icon}</span><h2>${esc(st.title)}</h2></div>
      <p class="bc-story">${esc(st.story)}</p>
      <div class="bc-facts"><span>🔎 Barang hilang: <b>${esc(st.item)}</b></span><span>📍 Lokasi: <b>${esc(st.place)}</b></span><span>✉️ Amplop petunjuk: <b>${K.clues.length}</b></span><span>🏅 Hadiah: <b>hingga 100 poin</b></span></div>
      <div class="bc-sus">${K.suspects.map((s) => `<span class="bs">${faceSVG(s)}<b>${esc(s.name)}</b></span>`).join('')}</div>
      <p class="bc-turn">Giliran pertama: <span class="tc" style="--pc:${cur().color}">${cur().ai ? '🤖' : cur().avatar} ${esc(cur().name)}</span></p>
      <button class="bigbtn go" id="btnGo">🔍 MULAI PENYELIDIKAN<small>SPASI</small></button></div>`;
    $('brief').hidden = false; SND.sting(); $('btnGo').onclick = (e) => { e.currentTarget.blur(); startCase(); };
  }
  function startCase() {
    if (phase !== 'brief') return false; SND.ac(); QC.sfx.click(); $('brief').hidden = true;
    if (!tStart) tStart = Date.now();
    phase = 'turn'; render(); if (cur().ai) setTimeout(() => aiGo(gameSeq), 700 * TS); return true;
  }

  /* ------------------------------ Buku Catatan ------------------------------ */
  function openNotes() {
    if (!K || QC.isBusy() || ['idle', 'guide'].includes(phase)) return;
    const why = (s) => { const c = cleared[s.id]; if (!c) return '<span class="nt-sus">TERSANGKA</span>'; if (c.by === 'clue') return `<span class="nt-free">BEBAS</span><small>Petunjuk #${c.no}</small>`; if (c.by === 'alibi') return `<span class="nt-free">BEBAS</span><small>Alibi (salah tuduh ${esc(T[c.team] ? T[c.team].name : '')})</small>`; return '<span class="nt-free">BEBAS</span>'; };
    const solvedNow = phase === 'solved';
    QC.modal({
      cls: 'dk-notes', icon: '📒', title: `Buku Catatan • ${esc(K.story.title)}`, dismissable: true,
      html: `<div class="nt-wrap"><div class="nt-sus-list">${K.suspects.map((s) => `<div class="nt-row ${cleared[s.id] ? 'off' : ''} ${solvedNow && s.id === K.culprit ? 'culp' : ''}"><span class="nt-face">${faceSVG(s)}</span><div class="nt-info"><b>${s.id + 1}. ${esc(s.name)}</b><small>${esc(s.role)}</small><div class="traits">${traitsHTML(s)}</div></div><div class="nt-st">${solvedNow && s.id === K.culprit ? '<span class="nt-culp">PELAKU!</span>' : why(s)}</div></div>`).join('')}</div>
        <div class="nt-clues"><h4>✉️ Petunjuk terbuka (${opened}/${K.clues.length})</h4>${opened ? K.clues.slice(0, opened).map((c) => `<div class="nt-clue"><span>#${c.no}</span><div>${c.icon} <i>${esc(c.src)}:</i> ${c.html}</div></div>`).join('') : '<p class="qc-muted">Belum ada amplop yang dibuka.</p>'}
        <p class="nt-q">💬 Diskusikan: dari ${remainingIds().length} tersangka tersisa, siapa yang paling cocok dengan semua petunjuk?</p></div></div>`,
      buttons: [{ label: 'Tutup', value: true, primary: true }]
    });
  }

  /* ------------------------------ Akhir permainan ------------------------------ */
  function endGame() {
    phase = 'over'; render();
    const rows = [...T].sort((a, b) => b.pts - a.pts || (b.solved || 0) - (a.solved || 0) || b.correct - a.correct);
    const tie = rows.length > 1 && rows[0].pts === rows[1].pts && (rows[0].solved || 0) === (rows[1].solved || 0) && rows[0].correct === rows[1].correct;
    addLog(`🏁 Permainan selesai. Juara: ${nm(rows[0])}`);
    QC.showWinner({
      title: tie ? 'SERI! Detektif Hebat Semua!' : `${esc(rows[0].name)} — DETEKTIF TERBAIK!`,
      ranking: rows.map((t) => ({ player: { name: t.name, avatar: t.ai ? '🤖' : t.avatar, color: t.color }, value: `${t.pts} poin<small>🕵️ ${t.solved || 0} kasus • ✔ ${t.correct}/${t.asked} soal</small>` })),
      note: `${S.cases} kasus selesai dalam ${clock(Date.now() - tStart)} • Poin = jawaban benar + hadiah kasus − salah tuduh`
    }).then((v) => (v === 'setup' ? openSetup() : newGame()));
    const ov = [...document.querySelectorAll('.qc-winner')].pop(); const body = ov && ov.querySelector('.qc-modal-body');
    if (body) {
      const d = document.createElement('div'); d.className = 'win-detail';
      d.innerHTML = `<h4>📁 Kasus yang dipecahkan</h4>${caseLog.map((c) => `<div class="wd-case" style="--pc:${T[c.team].color}"><b>#${c.caseNo} ${esc(c.title)}</b><span>${esc(T[c.team].name)} • pelaku: ${esc(c.culprit)} • ${c.opened} petunjuk • +${c.pts}</span></div>`).join('')}
        <h4>🙋 Jawaban benar tiap anggota</h4>${rows.map((t) => `<div class="wd" style="--pc:${t.color}"><b>${esc(t.name)}</b><span>${t.members.length ? t.members.map((m) => `<i>${esc(m.name)} <em>✔${m.correct}</em><small>/${m.asked}</small></i>`).join('') : `<i>✔ ${t.correct} dari ${t.asked} soal</i>`}</span></div>`).join('')}`;
      body.appendChild(d);
    }
    if (ov) { const b = [...ov.querySelectorAll('.qc-actions button')].find((x) => /Ubah/.test(x.textContent)); if (b) b.textContent = '⚙️ Ubah Tim'; }
  }

  /* ------------------------------ Pengaturan ------------------------------ */
  const KEY_TIM = 'lokamain_detektif-kelas_tim';
  const RULES_SHORT = `<ul><li>❓ Jawab soal (anggota tim bergiliran). Benar = <b>+${PTS_Q}</b> dan buka 1 amplop petunjuk.</li><li>✉️ Petunjuk mencoret tersangka yang tidak cocok — untuk semua tim.</li><li>🕵️ Setelah membuka amplop, tim boleh <b>menuduh</b>. Benar = hingga <b>100 poin</b> (−15 tiap petunjuk tambahan, minimal 40).</li><li>❌ Salah tuduh = poin dikurangi & tidak boleh menuduh di kesempatan berikutnya.</li><li>⚡ Jawaban salah = <b>Rebutan</b>: tim lain cepat-cepatan klik tombol timnya.</li></ul>`;
  function customizeSetup(o, st) {
    o.classList.add('dk-setup');
    const panels = o.querySelectorAll('.qc-panel'); const h3 = panels[0] && panels[0].querySelector('h3'); if (!h3) return;
    h3.textContent = '👥 Jumlah Tim';
    const p2 = panels[1] && panels[1].querySelector('h3'); if (p2) p2.textContent = '🕵️ Siap Menyelidiki?';
    const setBox = o.querySelector('.qc-settings');
    if (setBox) {
      const adv = document.createElement('details'); adv.className = 'dk-adv';
      adv.innerHTML = '<summary>⚙️ Pengaturan lanjutan <small>(opsional — bawaan sudah pas, langsung klik Mulai saja)</small></summary>';
      setBox.insertAdjacentElement('beforebegin', adv); adv.appendChild(setBox);
      const ok = document.createElement('p'); ok.className = 'dk-ready'; ok.innerHTML = '✅ Bawaan: <b>3 kasus (±20 menit)</b>, 20 detik per soal, Rebutan nyala. Isi nama tim & anggota, lalu klik <b>▶ MULAI MAIN</b>.';
      adv.insertAdjacentElement('beforebegin', ok);
    }
    const sm = o.querySelector('details.qc-rules'); if (sm) { sm.removeAttribute('open'); const s2 = sm.querySelector('summary'); if (s2) s2.textContent = '📜 Cara Main Singkat'; }
    const tip = o.querySelector('.qc-players + .qc-muted');
    const deco = () => {
      o.querySelectorAll('.qc-seg button').forEach((b) => (b.textContent = +b.dataset.n === 1 ? '1 Tim + 🤖' : `${b.dataset.n} Tim`));
      o.querySelectorAll('.qc-prow').forEach((row) => {
        const ni = row.querySelector('[data-name]'); if (!ni) return; const i = +ni.dataset.name;
        if (/^Pemain \d$/.test(ni.value.trim()) || !ni.value.trim()) { ni.value = TEAM_NAMES[i]; ni.dispatchEvent(new Event('input')); }
        if (row.querySelector('.dk-mem')) return;
        const m = document.createElement('textarea'); m.className = 'qc-input dk-mem'; m.rows = 1; m.maxLength = 300; m.placeholder = '👤 Anggota: Andi, Sari, Budi… (pisahkan koma, atau tulis jumlahnya mis. 5)';
        m.value = st.members[i] || ''; const fit = () => { m.style.height = 'auto'; m.style.height = Math.min(100, m.scrollHeight + 2) + 'px'; };
        m.oninput = () => { st.members[i] = m.value; fit(); }; requestAnimationFrame(fit); m.onkeydown = (e) => e.stopPropagation(); row.appendChild(m);
      });
      if (tip) tip.textContent = 'Klik ikon untuk ganti maskot • Tulis nama anggota supaya semua murid bergiliran menjawab • 1 tim = melawan detektif komputer';
    };
    const pl = o.querySelector('.qc-players'); if (pl && window.MutationObserver) new MutationObserver(deco).observe(pl, { childList: true });
    deco();
  }
  async function openSetup() {
    gameSeq++; phase = 'idle'; $('brief').hidden = true; $('reveal').hidden = true; $('reveal').classList.remove('show'); pickResolve = null;
    const saved = store(KEY_TIM) || {}; const st = { members: Array.isArray(saved.members) ? saved.members.slice(0, 4) : [] };
    const pr = QC.setup({
      logo: '🕵️', subtitle: 'Kuis misteri seru! Jawab soal, buka amplop petunjuk, coret tersangka, lalu tuduh pelakunya. Setiap kasus selalu berbeda.',
      min: 1, max: 4, defaultCount: 4, defaultNames: TEAM_NAMES, soloLabel: '1 Tim + 🤖',
      settings: [
        { key: 'kasus', label: '📁 Jumlah kasus', value: 3, options: [[2, '2 kasus (±15 menit)'], [3, '3 kasus (±20 menit)'], [4, '4 kasus (±28 menit)'], [5, '5 kasus (±35 menit)']] },
        { key: 'waktu', label: '⏱️ Waktu menjawab', value: 20, options: [[15, '15 detik'], [20, '20 detik'], [30, '30 detik'], [45, '45 detik']] },
        { key: 'rebut', label: '⚡ Soal Rebutan', value: 'on', options: [['on', 'Nyala'], ['off', 'Mati']] },
        { key: 'panjang', label: '✉️ Amplop per kasus', value: 'normal', options: [['singkat', '3 amplop (cepat)'], ['normal', '4 amplop'], ['panjang', '5 amplop (lama)']] },
        { key: 'lawan', label: '🤖 Detektif komputer', value: 0, options: [[0, 'Tidak ada'], [1, '+1 komputer'], [2, '+2 komputer']] },
        { key: 'denda', label: '❌ Denda salah tuduh', value: 20, options: [[10, '−10 poin'], [20, '−20 poin'], [30, '−30 poin']] },
        { key: 'diskusi', label: '💬 Diskusi tim', value: 'on', options: [['on', 'Boleh'], ['off', 'Tidak boleh']] }
      ],
      rulesHtml: RULES_SHORT
    });
    const o = [...document.querySelectorAll('.qc-setup')].pop(); if (o) customizeSetup(o, st);
    render();
    const r = await pr; const set = r.settings;
    store(KEY_TIM, { members: st.members });
    S.cases = clamp(+set.kasus || 3, 1, 6); S.time = +set.waktu || 20; S.rebut = set.rebut === 'off' ? 'off' : 'on'; S.len = LEN[set.panjang] ? set.panjang : 'normal';
    S.bots = +set.lawan || 0; S.pen = +set.denda || 20; S.diskusi = set.diskusi === 'off' ? 'off' : 'on';
    const humans = r.players.length; let bots = clamp(S.bots, 0, 4 - humans);
    if (humans === 1 && bots === 0) { bots = 1; QC.toast('🤖 1 tim: Detektif Robo ikut menyelidiki!', 'good'); }
    T = r.players.map((pl, i) => ({ id: i, name: pl.name, avatar: pl.avatar, color: pl.color || COLORS[i], ai: false, members: parseMembers(st.members[i]).map((n) => ({ name: n, asked: 0, correct: 0 })) }));
    for (let b = 0; b < bots; b++) { const i = T.length; T.push({ id: i, name: BOTS[b], avatar: '🤖', color: COLORS[i], ai: true, members: [] }); }
    newGame();
  }
  function newGame() {
    gameSeq++; T.forEach((t, i) => Object.assign(t, { id: i, pts: 0, shown: 0, asked: 0, correct: 0, mi: 0, skip: false, solved: 0 }));
    T.forEach((t) => t.members.forEach((m) => { m.asked = 0; m.correct = 0; }));
    caseNo = 1; turn = 0; K = null; opened = 0; cleared = {}; tStart = 0; accuseLog = []; caseLog = []; askLog.length = 0; logList = []; $('log').innerHTML = '';
    $('teams')._sig = ''; $('reveal').hidden = true; $('reveal').classList.remove('show');
    $('lineup').innerHTML = ''; $('envs').innerHTML = '';
    showGuide(); renderTeams();
  }

  /* ------------------------------ Masukan ------------------------------ */
  function mainAction() {
    if (QC.isBusy()) return false;
    if (phase === 'guide') return guideDone();
    if (phase === 'brief') return startCase();
    if (phase === 'turn' && !cur().ai) { doAsk(); return true; }
    if (phase === 'pick' && pickResolve && !cur().ai) { pickResolve(opened); return true; }
    if (phase === 'solved') return afterSolve();
    return false;
  }
  $('btnMain').onclick = (e) => { e.currentTarget.blur(); SND.ac(); mainAction(); };
  QC.onKey = (e) => {
    const key = e.key;
    if (key === ' ' || key === 'Enter') { e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); mainAction(); return; }
    if (key === 'n' || key === 'N') { openNotes(); return; }
    const n = parseInt(key, 10);
    if (phase === 'pick' && pickResolve && !cur().ai && n >= 1 && n <= K.clues.length - opened) pickResolve(opened + n - 1);
  };
  $('btnNotes').onclick = (e) => { e.currentTarget.blur(); if (!K) { QC.toast('📒 Buku Catatan terisi setelah kasus dibuka.'); return; } openNotes(); };
  $('btnRules').onclick = (e) => { e.currentTarget.blur(); QC.modal({ icon: '📜', title: 'Peraturan Detektif Kelas', html: `<div class="rules-pop">${RULES_SHORT}<p class="qc-muted">Ciri tersangka: 🧢 topi • 👓 kacamata • 🎒 tas • 🧣 syal / 👔 dasi • warna baju • ⬆T tinggi / ⬇P pendek. Tekan <b>N</b> untuk Buku Catatan.</p></div>`, cls: 'dk-rules', dismissable: true }); };
  $('btnSetup').onclick = async (e) => {
    e.currentTarget.blur(); if (document.querySelector('.qc-setup.show')) return;
    if (!['idle', 'over'].includes(phase)) {
      const ok = await QC.modal({ icon: '⚙️', title: 'Kembali ke pengaturan?', html: '<p class="qc-muted">Permainan yang sedang berjalan akan dihentikan.</p>', buttons: [{ label: 'Batal', value: false }, { label: 'Ya, ke Pengaturan', value: true, primary: true }] });
      if (!ok) return;
    }
    openSetup();
  };
  setInterval(() => { if (!['idle', 'guide', 'over'].includes(phase) && tStart) setText($('clockNo'), clock(Date.now() - tStart)); }, 1000);

  /* ------------------------------ Kait pengujian ------------------------------ */
  const sleepReal = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__DK = {
    get phase() { return phase; },
    lite: () => LITE,
    state: () => ({
      phase, turn, caseNo, cases: S.cases, settings: { ...S }, opened, prize: prizeNow(), remaining: remainingIds(), rebutOpen: !!rebDecide, accuseAsk: !!accDecide, choosing: !!chooseDone, picking: !!pickResolve,
      question: curQ ? curQ.question : null, answerer: curAnswerer, solver, lastReveal,
      case: K ? { story: K.story.id, title: K.story.title, culprit: K.culprit, clues: K.clues.map((c) => ({ k: c.k, op: c.op || null, v: c.v, clears: c.clears, text: plainClue(c) })), suspects: K.suspects.map((s) => ({ id: s.id, name: s.name, hat: s.hat, glasses: s.glasses, bag: s.bag, shirt: s.shirt, tall: s.tall, acc: s.acc })), cleared: { ...cleared } } : null,
      teams: T.map((t) => ({ name: t.name, ai: !!t.ai, pts: t.pts, skip: !!t.skip, solved: t.solved || 0, asked: t.asked, correct: t.correct, members: t.members.map((m) => ({ ...m })), mi: t.mi })),
      accuseLog: accuseLog.slice(), caseLog: caseLog.slice(), askLog: askLog.slice(-80), log: logList.slice(0, 12).map((l) => l.html.replace(/<[^>]+>/g, ''))
    }),
    start: () => (phase === 'guide' ? guideDone() : phase === 'brief' ? startCase() : false),
    ask: () => { if (phase === 'turn' && !cur().ai && !QC.isBusy()) { doAsk(); return true; } return false; },
    async answer(correct) {
      let o = null;
      for (let i = 0; i < 160; i++) { o = [...document.querySelectorAll('.qc-overlay.qc-ask.show')].find((x) => x.querySelector('.qc-opt:not(:disabled)')); if (o && curQ) break; await sleepReal(40); }
      if (!o || !curQ) return false;
      const keys = QC.optionsOf(curQ); const k = correct ? curQ.correct : keys.find((x) => x !== curQ.correct);
      o.querySelector(`.qc-opt[data-k="${k}"]`).click(); await sleepReal(60);
      const nb = o.querySelector('[data-next]'); if (nb) nb.click(); await sleepReal(60);
      return true;
    },
    openClue: (i) => { if (phase === 'pick' && pickResolve) { pickResolve(i == null ? opened : +i); return true; } return false; },
    async closeModal() { const b = [...document.querySelectorAll('.qc-overlay.show .qc-actions .primary')].pop(); if (b) { b.click(); await sleepReal(60); return true; } return false; },
    decide: (yes) => { if (accDecide) { accDecide(!!yes); return true; } return false; },
    async accuse(id) {
      if (accDecide) { accDecide(true); for (let i = 0; i < 50 && !chooseDone; i++) await sleepReal(30); }
      if (!chooseDone) return false; if (cleared[id]) return false; chooseDone(+id); return true;
    },
    rebut: (i) => { if (!rebDecide) return false; rebDecide(i == null || i === 'skip' ? null : +i); return true; },
    next: () => afterSolve(),
    notes: () => { openNotes(); return !!document.querySelector('.dk-notes'); },
    key: (k) => QC.onKey({ key: k, preventDefault() {} }),
    fast(on) { TS = on ? 0.1 : 1; return TS; },
    gen(n = 500, len) { const out = { n, ok: 0, bad: [], lens: {}, stories: {} }; const L = len ? [len] : [3, 4, 5]; for (let i = 0; i < n; i++) { const l = L[i % L.length]; const k = generateCase(l); const v = validateCase(k); out.stories[k.story.id] = (out.stories[k.story.id] || 0) + 1; out.lens[v.clues] = (out.lens[v.clues] || 0) + 1; if (v.consistent && v.solvable && v.eachNarrows && v.distinct && v.clues === l && k.clues.every((c) => !c.clears.includes(k.culprit))) out.ok++; else if (out.bad.length < 5) out.bad.push(v); } return out; },
    storyCount: () => STORIES.length,
    forceCase(storyId) { if (!K) return false; newCase(storyId); return true; }
  };

  openSetup();
})();
