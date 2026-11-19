/* ==========================================================================
   game.js — Ludo Juara (Ludo Edukasi 4 Pemain)
   ========================================================================== */
(function () {
  'use strict';

  const QC = window.QuizCore;
  const esc = QC ? QC.esc : (s => s);
  const $ = (id) => document.getElementById(id);

  // Inisialisasi QuizCore
  QC.init({
    gameId: 'ludo-juara',
    title: 'Ludo Juara Nusantara',
    avatars: ['🔴', '🟢', '🟡', '🔵'],
    colors: ['#ef4444', '#10b981', '#f59e0b', '#3b82f6']
  });

  const canvas = $('ludoCanvas');
  const ctx = canvas.getContext('2d');

  let BOARD_SIZE = 600;
  let CELL = BOARD_SIZE / 15;
  let DPR = 1;

  function resizeBoard() {
    const wrap = $('boardWrapper');
    const minDim = Math.min(wrap.clientWidth || 600, wrap.clientHeight || 600, 640);
    BOARD_SIZE = Math.max(340, Math.min(minDim - 20, 600));
    CELL = BOARD_SIZE / 15;
    DPR = Math.min(2, window.devicePixelRatio || 1);

    canvas.width = Math.round(BOARD_SIZE * DPR);
    canvas.height = Math.round(BOARD_SIZE * DPR);
    canvas.style.width = BOARD_SIZE + 'px';
    canvas.style.height = BOARD_SIZE + 'px';
  }
  window.addEventListener('resize', resizeBoard);

  // Konfigurasi 4 Pemain
  const PLAYERS = [
    { id: 0, name: 'Regu Merah', color: '#ef4444', light: '#f87171', dark: '#b91c1c', avatar: '🔴', isBot: false },
    { id: 1, name: 'Regu Hijau', color: '#10b981', light: '#34d399', dark: '#047857', avatar: '🟢', isBot: true },
    { id: 2, name: 'Regu Kuning', color: '#f59e0b', light: '#fbbf24', dark: '#d97706', avatar: '🟡', isBot: true },
    { id: 3, name: 'Regu Biru', color: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8', avatar: '🔵', isBot: true }
  ];

  let playerCount = 4;
  let pawnsPerPlayer = 2; // 2 untuk game kelas cepat (15 menit), 4 untuk mode penuh
  let activePlayer = 0;
  let diceValue = 1;
  let isRolling = false;
  let turnState = 'ROLL'; // 'ROLL', 'SELECT_PAWN', 'MOVING', 'QUIZ', 'GAMEOVER'
  let consecutiveNoSix = [0, 0, 0, 0];
  let movablePawns = [];
  let isAiTurn = false;

  // Koordinat Jalur Luar 52 Petak (Clockwise dari Titik Start Merah di x:1, y:6)
  const TRACK_TILES = [
    { x: 1, y: 6 },  { x: 2, y: 6 },  { x: 3, y: 6 },  { x: 4, y: 6 },  { x: 5, y: 6 },
    { x: 6, y: 5 },  { x: 6, y: 4 },  { x: 6, y: 3 },  { x: 6, y: 2 },  { x: 6, y: 1 },  { x: 6, y: 0 },
    { x: 7, y: 0 },  { x: 8, y: 0 },
    { x: 8, y: 1 },  { x: 8, y: 2 },  { x: 8, y: 3 },  { x: 8, y: 4 },  { x: 8, y: 5 },
    { x: 9, y: 6 },  { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },
    { x: 14, y: 7 }, { x: 14, y: 8 },
    { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
    { x: 8, y: 9 },  { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
    { x: 7, y: 14 }, { x: 6, y: 14 },
    { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },
    { x: 5, y: 8 },  { x: 4, y: 8 },  { x: 3, y: 8 },  { x: 2, y: 8 },  { x: 1, y: 8 },  { x: 0, y: 8 },
    { x: 0, y: 7 },  { x: 0, y: 6 }
  ];

  // Offset Index Titik Start untuk Tiap Warna
  const START_INDEX = [0, 13, 26, 39];

  // 8 Petak Bintang Aman (Safe Star Tiles)
  const SAFE_TILES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

  // 8 Petak Kuis Cerdas Tambahan (Quiz Mystery Tiles)
  const QUIZ_TILES = new Set([4, 11, 17, 24, 30, 37, 43, 50]);

  // Jalur Kolom Rumah (Home Column) 5 Petak Menuju Segitiga Finis
  const HOME_COLUMNS = [
    // Merah (P0): masuk dari (0, 7) menuju tengah
    [{ x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }],
    // Hijau (P1): masuk dari (7, 0) menuju tengah
    [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
    // Kuning (P2): masuk dari (14, 7) menuju tengah
    [{ x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }],
    // Biru (P3): masuk dari (7, 14) menuju tengah
    [{ x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }]
  ];

  // Posisi Titik Tengah Segitiga Finis (Goal)
  const GOAL_COORDS = [
    { x: 6.2, y: 7 }, // Merah (Kiri Segitiga)
    { x: 7, y: 6.2 }, // Hijau (Atas Segitiga)
    { x: 7.8, y: 7 }, // Kuning (Kanan Segitiga)
    { x: 7, y: 7.8 }  // Biru (Bawah Segitiga)
  ];

  // Posisi Pion di Dalam Markas (Kandang)
  const BASE_SLOTS = [
    // Merah
    [{ x: 1.8, y: 1.8 }, { x: 3.8, y: 1.8 }, { x: 1.8, y: 3.8 }, { x: 3.8, y: 3.8 }],
    // Hijau
    [{ x: 10.8, y: 1.8 }, { x: 12.8, y: 1.8 }, { x: 10.8, y: 3.8 }, { x: 12.8, y: 3.8 }],
    // Kuning
    [{ x: 10.8, y: 10.8 }, { x: 12.8, y: 10.8 }, { x: 10.8, y: 12.8 }, { x: 12.8, y: 12.8 }],
    // Biru
    [{ x: 1.8, y: 10.8 }, { x: 3.8, y: 10.8 }, { x: 1.8, y: 12.8 }, { x: 3.8, y: 12.8 }]
  ];

  // Inisialisasi Data Seluruh Pion
  let pawns = [];
  function initPawns() {
    pawns = [];
    for (let p = 0; p < 4; p++) {
      for (let i = 0; i < pawnsPerPlayer; i++) {
        pawns.push({
          id: i,
          pIdx: p,
          state: 'BASE', // 'BASE', 'TRACK', 'HOME', 'GOAL'
          step: 0,       // 0 s/d 56 (56 = GOAL)
          shield: false, // Perisai Kebal dari hadiah kuis
          animX: BASE_SLOTS[p][i].x,
          animY: BASE_SLOTS[p][i].y
        });
      }
    }
  }

  // ---------------- MENGHITUNG KOORDINAT PION ----------------
  function getPawnTargetCoord(pawn) {
    const p = pawn.pIdx;
    if (pawn.state === 'BASE') {
      return BASE_SLOTS[p][pawn.id];
    }
    if (pawn.state === 'GOAL') {
      return GOAL_COORDS[p];
    }
    if (pawn.state === 'HOME') {
      const homeIdx = pawn.step - 51;
      return HOME_COLUMNS[p][Math.max(0, Math.min(4, homeIdx))];
    }
    // 'TRACK'
    const tileIdx = (START_INDEX[p] + pawn.step) % 52;
    return TRACK_TILES[tileIdx];
  }

  // ---------------- RENDER PAPAN LUDO (CANVAS) ----------------
  function drawLudoBoard() {
    ctx.save();
    ctx.scale(DPR, DPR);

    // Bersihkan Kanvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    // 1. Gambar 4 Markas Besar di Sudut
    drawCornerBase(0, 0, 6 * CELL, 6 * CELL, PLAYERS[0]); // Merah
    drawCornerBase(9 * CELL, 0, 6 * CELL, 6 * CELL, PLAYERS[1]); // Hijau
    drawCornerBase(9 * CELL, 9 * CELL, 6 * CELL, 6 * CELL, PLAYERS[2]); // Kuning
    drawCornerBase(0, 9 * CELL, 6 * CELL, 6 * CELL, PLAYERS[3]); // Biru

    // 2. Gambar 52 Petak Jalur Keliling
    TRACK_TILES.forEach((t, idx) => {
      const px = t.x * CELL;
      const py = t.y * CELL;

      // Warna dasar petak
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px, py, CELL, CELL);

      // Garis tepi petak
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px, py, CELL, CELL);

      // Tandai Petak Start
      if (idx === 0) { ctx.fillStyle = PLAYERS[0].color; ctx.fillRect(px, py, CELL, CELL); }
      else if (idx === 13) { ctx.fillStyle = PLAYERS[1].color; ctx.fillRect(px, py, CELL, CELL); }
      else if (idx === 26) { ctx.fillStyle = PLAYERS[2].color; ctx.fillRect(px, py, CELL, CELL); }
      else if (idx === 39) { ctx.fillStyle = PLAYERS[3].color; ctx.fillRect(px, py, CELL, CELL); }

      // Tandai Petak Bintang Aman ⭐ & Petak Kuis ❓
      if (SAFE_TILES.has(idx)) {
        ctx.fillStyle = '#facc15';
        ctx.font = `${Math.round(CELL * 0.52)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', px + CELL * 0.5, py + CELL * 0.54);
      } else if (QUIZ_TILES.has(idx)) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = `${Math.round(CELL * 0.48)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❓', px + CELL * 0.5, py + CELL * 0.54);
      }
    });

    // 3. Gambar Kolom Jalur Rumah (Home Columns)
    HOME_COLUMNS.forEach((col, pIdx) => {
      const colColor = PLAYERS[pIdx].color;
      col.forEach((t) => {
        const px = t.x * CELL;
        const py = t.y * CELL;
        ctx.fillStyle = colColor;
        ctx.fillRect(px, py, CELL, CELL);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px, py, CELL, CELL);
      });
    });

    // 4. Gambar Segitiga Tengah Kemenangan (Goal Triangles)
    drawCenterTriangles();

    // 5. Gambar Seluruh Pion
    drawAllPawns();

    ctx.restore();
  }

  function drawCornerBase(x, y, w, h, player) {
    // Kotak luar markas
    ctx.fillStyle = player.color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Kotak putih dalam
    const pad = CELL * 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
    ctx.strokeStyle = player.dark;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x + pad, y + pad, w - pad * 2, h - pad * 2);

    // Lingkaran slot kandang pion
    BASE_SLOTS[player.id].slice(0, pawnsPerPlayer).forEach((slot) => {
      const cx = slot.x * CELL;
      const cy = slot.y * CELL;
      ctx.fillStyle = player.light;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = player.dark;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  function drawCenterTriangles() {
    const cx = 7.5 * CELL;
    const cy = 7.5 * CELL;

    // Segitiga Merah (Kiri)
    ctx.fillStyle = PLAYERS[0].color;
    ctx.beginPath();
    ctx.moveTo(6 * CELL, 6 * CELL);
    ctx.lineTo(6 * CELL, 9 * CELL);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();

    // Segitiga Hijau (Atas)
    ctx.fillStyle = PLAYERS[1].color;
    ctx.beginPath();
    ctx.moveTo(6 * CELL, 6 * CELL);
    ctx.lineTo(9 * CELL, 6 * CELL);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();

    // Segitiga Kuning (Kanan)
    ctx.fillStyle = PLAYERS[2].color;
    ctx.beginPath();
    ctx.moveTo(9 * CELL, 6 * CELL);
    ctx.lineTo(9 * CELL, 9 * CELL);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();

    // Segitiga Biru (Bawah)
    ctx.fillStyle = PLAYERS[3].color;
    ctx.beginPath();
    ctx.moveTo(6 * CELL, 9 * CELL);
    ctx.lineTo(9 * CELL, 9 * CELL);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();

    // Garis pemisah segitiga
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(6 * CELL, 6 * CELL, 3 * CELL, 3 * CELL);
  }

  function drawAllPawns() {
    const time = Date.now() * 0.006;

    pawns.forEach((pawn) => {
      // Hanya gambar pion pemain yang aktif
      if (pawn.pIdx >= playerCount) return;

      const pInfo = PLAYERS[pawn.pIdx];
      const target = getPawnTargetCoord(pawn);

      // Lerp posisi animasi agar gerakan mulus
      pawn.animX += (target.x - pawn.animX) * 0.28;
      pawn.animY += (target.y - pawn.animY) * 0.28;

      const cx = (pawn.animX + 0.5) * CELL;
      const cy = (pawn.animY + 0.5) * CELL;
      const radius = CELL * 0.42;

      // Cek apakah pion ini bisa digerakkan saat giliran memilih
      const isMovable = turnState === 'SELECT_PAWN' && pawn.pIdx === activePlayer && movablePawns.includes(pawn);

      // 1. Cincin Efek Bergerak (Pulsing Ring) jika pion dapat dipilih
      if (isMovable) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        const pulseR = radius + Math.sin(time) * 3 + 4;
        ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2. Bayangan Pion
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + radius * 0.55, radius * 0.9, radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Badan Pion (Gradient 3D)
      const grad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
      grad.addColorStop(0, pInfo.light);
      grad.addColorStop(0.7, pInfo.color);
      grad.addColorStop(1, pInfo.dark);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 4. Mahkota atau Nomor Pion
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(radius * 0.9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (pawn.state === 'GOAL') {
        ctx.fillText('👑', cx, cy);
      } else if (pawn.shield) {
        ctx.fillText('🛡️', cx, cy);
      } else {
        ctx.fillText(pawn.id + 1, cx, cy);
      }
    });
  }

  // ---------------- SISTEM LEMPAR DADU & ATURAN LUDO ----------------
  const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  function rollDice() {
    if (isRolling) return;

    // Jika sedang dalam status menunggu respon pion macet, klik dadu melewati giliran
    if (turnState === 'WAIT_STUCK') {
      nextTurn();
      return;
    }

    if (turnState !== 'ROLL') return;

    isRolling = true;
    $('diceBtn').classList.add('is-rolling');
    if (QC && QC.sfx && QC.sfx.pop) QC.sfx.pop();

    let rollTicks = 0;
    const rollTimer = setInterval(() => {
      const randVal = Math.floor(Math.random() * 6) + 1;
      $('diceFace').textContent = DICE_FACES[randVal - 1];
      rollTicks++;

      if (rollTicks >= 10) {
        clearInterval(rollTimer);
        isRolling = false;
        $('diceBtn').classList.remove('is-rolling');

        // Nilai Dadu Final
        diceValue = Math.floor(Math.random() * 6) + 1;
        $('diceFace').textContent = DICE_FACES[diceValue - 1];
        handleDiceResult(diceValue);
      }
    }, 55);
  }

  function handleDiceResult(value) {
    if (QC && QC.sfx && QC.sfx.whoosh) QC.sfx.whoosh();

    // Hitung pion mana saja yang bisa bergerak secara legal
    movablePawns = getLegalMoves(activePlayer, value);

    if (movablePawns.length === 0) {
      // Tidak ada pion yang bisa bergerak
      consecutiveNoSix[activePlayer] += 1;
      const hasStuckPawns = pawns.some(p => p.pIdx === activePlayer && p.state === 'BASE');

      if (hasStuckPawns && !PLAYERS[activePlayer].isBot) {
        // Tawarkan opsi jawab kuis agar pion bisa keluar
        turnState = 'WAIT_STUCK';
        $('diceHintText').textContent = `Dadu ${value} (belum 6). Jawab Kuis untuk keluar markas, atau klik dadu untuk lewati!`;
        if ($('btnGateQuiz')) $('btnGateQuiz').style.display = 'inline-flex';
        return;
      }

      $('diceHintText').textContent = 'Tidak ada langkah legal. Giliran dilewati!';
      setTimeout(nextTurn, 1200);
      return;
    }

    // Reset hitungan no-six jika dapat melangkah
    consecutiveNoSix[activePlayer] = 0;
    if ($('btnGateQuiz')) $('btnGateQuiz').style.display = 'none';

    if (movablePawns.length === 1) {
      // Hanya ada 1 pilihan langkah -> langsung jalankan otomatis
      turnState = 'MOVING';
      $('diceHintText').textContent = `Melangkahkan Pion ${movablePawns[0].id + 1}...`;
      setTimeout(() => movePawn(movablePawns[0], value), 450);
    } else {
      // Ada beberapa pilihan langkah -> tunggu pemain memilih pion
      turnState = 'SELECT_PAWN';
      $('diceHintText').textContent = 'PILIH PION yang ingin digerakkan!';

      // Jika giliran Bot AI, pilih pion secara otomatis dan cerdas
      if (PLAYERS[activePlayer].isBot) {
        setTimeout(aiSelectPawn, 900);
      }
    }
  }

  function getLegalMoves(pIdx, roll) {
    const playerPawns = pawns.filter(p => p.pIdx === pIdx);
    const valid = [];

    playerPawns.forEach((pawn) => {
      if (pawn.state === 'GOAL') return;

      if (pawn.state === 'BASE') {
        // Keluar kandang hanya jika dapat dadu 6
        if (roll === 6) valid.push(pawn);
      } else if (pawn.state === 'TRACK' || pawn.state === 'HOME') {
        // Cek apakah tidak melewati batas segitiga finis (step 56)
        if (pawn.step + roll <= 56) {
          valid.push(pawn);
        }
      }
    });

    return valid;
  }

  // ---------------- PERGERAKAN PION & DETEKSI TABRAKAN ----------------
  function movePawn(pawn, steps) {
    turnState = 'MOVING';

    if (pawn.state === 'BASE') {
      // Keluar dari markas ke titik awal
      pawn.state = 'TRACK';
      pawn.step = 0;
      if (QC && QC.sfx && QC.sfx.magic) QC.sfx.magic();
      postMoveCheck(pawn);
      return;
    }

    // Melangkah maju bertahap
    let remaining = steps;
    const stepInterval = setInterval(() => {
      pawn.step += 1;
      if (QC && QC.sfx && QC.sfx.coin) QC.sfx.coin();

      if (pawn.step > 50 && pawn.step < 56) {
        pawn.state = 'HOME';
      } else if (pawn.step >= 56) {
        pawn.step = 56;
        pawn.state = 'GOAL';
      }

      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(stepInterval);
        postMoveCheck(pawn);
      }
    }, 140);
  }

  function postMoveCheck(pawn) {
    // 1. Cek Finis (Goal)
    if (pawn.state === 'GOAL') {
      if (QC && QC.sfx && QC.sfx.celebrate) QC.sfx.celebrate();
      showToastKick(`🎉 PION ${pawn.id + 1} (${PLAYERS[pawn.pIdx].name}) BERHASIL FINIS!`);
      checkWinCondition();
      proceedAfterMove();
      return;
    }

    // 2. Cek Tabrakan / Tendang Pion Lawan (Hanya di TRACK luar)
    if (pawn.state === 'TRACK') {
      const myTileIdx = (START_INDEX[pawn.pIdx] + pawn.step) % 52;
      const isSafe = SAFE_TILES.has(myTileIdx);

      if (!isSafe) {
        // Cari pion lawan di petak yang sama
        const victim = pawns.find(o => 
          o.pIdx !== pawn.pIdx && 
          o.state === 'TRACK' && 
          ((START_INDEX[o.pIdx] + o.step) % 52) === myTileIdx
        );

        if (victim) {
          if (victim.shield) {
            // Dilindungi Perisai
            victim.shield = false;
            showToastKick(`🛡️ Pion ${victim.id + 1} selamat berkat Perisai Kebal!`);
            if (QC && QC.sfx && QC.sfx.pop) QC.sfx.pop();
          } else {
            // DITENDANG KEMBALI KE MARKAS!
            victim.state = 'BASE';
            victim.step = 0;
            if (QC && QC.sfx && QC.sfx.boom) QC.sfx.boom();
            showToastKick(`💥 PION ${victim.id + 1} ${PLAYERS[victim.pIdx].name} DITENDANG KEMBALI KE MARKAS!`);

            // Pemain yang menendang mendapat hadiah LEMPAR DADU LAGI
            $('diceHintText').textContent = 'BERHASIL MENENDANG! Lempar Dadu Lagi!';
            turnState = 'ROLL';
            if (PLAYERS[activePlayer].isBot) setTimeout(rollDice, 1000);
            return;
          }
        }
      }

      // 3. Cek Petak Bintang ⭐ & Petak Kuis ❓
      if (SAFE_TILES.has(myTileIdx) || QUIZ_TILES.has(myTileIdx)) {
        triggerStarTileQuiz(pawn);
        return;
      }
    }

    proceedAfterMove();
  }

  function proceedAfterMove() {
    // Jika dapat angka 6: dapat melempar dadu sekali lagi!
    if (diceValue === 6) {
      $('diceHintText').textContent = 'ANGKA 6! Lempar dadu sekali lagi!';
      turnState = 'ROLL';
      if (PLAYERS[activePlayer].isBot) setTimeout(rollDice, 1000);
    } else {
      setTimeout(nextTurn, 500);
    }
  }

  function nextTurn() {
    activePlayer = (activePlayer + 1) % playerCount;
    turnState = 'ROLL';
    $('diceHintText').textContent = 'Klik Dadu untuk Melempar!';
    updateUI();

    // Jika giliran AI Bot, lempar dadu otomatis
    if (PLAYERS[activePlayer].isBot) {
      setTimeout(rollDice, 900);
    }
  }

  // ---------------- BOT AI STRATEGI CERDAS ----------------
  function aiSelectPawn() {
    if (movablePawns.length === 0) return;

    // 1. Prioritas Utama: Cari langkah yang bisa menendang pion lawan!
    for (const pawn of movablePawns) {
      if (pawn.state === 'TRACK') {
        const nextStep = pawn.step + diceValue;
        const targetTile = (START_INDEX[pawn.pIdx] + nextStep) % 52;
        if (!SAFE_TILES.has(targetTile)) {
          const enemy = pawns.find(o => o.pIdx !== pawn.pIdx && o.state === 'TRACK' && ((START_INDEX[o.pIdx] + o.step) % 52) === targetTile);
          if (enemy) {
            movePawn(pawn, diceValue);
            return;
          }
        }
      }
    }

    // 2. Prioritas Kedua: Gerakkan pion yang bisa langsung finis (GOAL)
    for (const pawn of movablePawns) {
      if (pawn.step + diceValue === 56) {
        movePawn(pawn, diceValue);
        return;
      }
    }

    // 3. Prioritas Ketiga: Keluarkan pion dari kandang (BASE) jika dapat 6
    const basePawn = movablePawns.find(p => p.state === 'BASE');
    if (basePawn && diceValue === 6) {
      movePawn(basePawn, diceValue);
      return;
    }

    // 4. Prioritas Keempat: Gerakkan pion yang paling jauh melangkah
    movablePawns.sort((a, b) => b.step - a.step);
    movePawn(movablePawns[0], diceValue);
  }

  // ---------------- KUIS PETAK BINTANG ⭐ ----------------
  let quizPawnTarget = null;

  function triggerStarTileQuiz(pawn) {
    turnState = 'QUIZ';
    quizPawnTarget = pawn;

    let q = null;
    if (QC && QC.nextQuestion) q = QC.nextQuestion();
    if (!q && window.DEFAULT_QUESTIONS && window.DEFAULT_QUESTIONS.length) {
      q = window.DEFAULT_QUESTIONS[Math.floor(Math.random() * window.DEFAULT_QUESTIONS.length)];
    }

    if (!q) {
      proceedAfterMove();
      return;
    }

    $('quizQuestionText').textContent = q.question;
    $('quizSubTitle').textContent = `Tantangan untuk ${PLAYERS[pawn.pIdx].name} (Pion ${pawn.id + 1})`;
    
    const optsWrap = $('quizOptionsList');
    optsWrap.innerHTML = '';
    $('quizFeedback').className = 'quiz-feedback-box';
    $('quizFeedback').style.display = 'none';

    const letters = ['A', 'B', 'C', 'D'];
    letters.forEach((letCode) => {
      const optText = q['option' + letCode];
      if (!optText) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-opt-btn';
      btn.innerHTML = `<span class="quiz-opt-letter">${letCode}</span><span>${esc(optText)}</span>`;
      btn.onclick = () => submitStarQuizAnswer(letCode, q.correct, q.explanation);
      optsWrap.appendChild(btn);
    });

    $('starQuizModal').classList.add('is-visible');
    if (QC && QC.sfx && QC.sfx.magic) QC.sfx.magic();

    // Jika AI Bot yang menjawab kuis, pilih jawaban otomatis dengan akurasi 80%
    if (PLAYERS[pawn.pIdx].isBot) {
      setTimeout(() => {
        const isSmart = Math.random() < 0.85;
        const chosen = isSmart ? q.correct : (q.correct === 'A' ? 'B' : 'A');
        submitStarQuizAnswer(chosen, q.correct, q.explanation);
      }, 1600);
    }
  }

  function submitStarQuizAnswer(selected, correct, explanation) {
    const isCorrect = String(selected).trim().toUpperCase() === String(correct).trim().toUpperCase();
    const fb = $('quizFeedback');
    const pawn = quizPawnTarget;

    if (isCorrect) {
      fb.className = 'quiz-feedback-box success';
      if (QC && QC.sfx && QC.sfx.correct) QC.sfx.correct();

      // Pilih Hadiah Booster Acak: Langkah Kilat (+3 Petak), Perisai Kebal, atau Lempar Lagi!
      const rollBooster = Math.random();
      if (rollBooster < 0.38) {
        fb.innerHTML = `🎉 <b>BENAR!</b> ${esc(explanation || '')}<br>⚡ <b>Hadiah:</b> Langkah Kilat (+3 Petak Tambahan)!`;
        setTimeout(() => {
          $('starQuizModal').classList.remove('is-visible');
          movePawn(pawn, 3);
        }, 2200);
        return;
      } else if (rollBooster < 0.72) {
        pawn.shield = true;
        fb.innerHTML = `🎉 <b>BENAR!</b> ${esc(explanation || '')}<br>🛡️ <b>Hadiah:</b> Perisai Kebal Aktif (Aman dari tendangan lawan)!`;
      } else {
        fb.innerHTML = `🎉 <b>BENAR!</b> ${esc(explanation || '')}<br>🎲 <b>Hadiah:</b> Kesempatan Lempar Dadu Lagi!`;
        diceValue = 6; // Mengizinkan lempar dadu lagi
      }
    } else {
      fb.className = 'quiz-feedback-box fail';
      fb.innerHTML = `❌ <b>KURANG TEPAT.</b> Jawaban benar: ${correct}.<br><small>${esc(explanation || '')}</small>`;
      if (QC && QC.sfx && QC.sfx.wrong) QC.sfx.wrong();
    }

    setTimeout(() => {
      $('starQuizModal').classList.remove('is-visible');
      proceedAfterMove();
    }, 2400);
  }

  // ---------------- BUKA GERBANG VIA KUIS ----------------
  window.triggerGateQuiz = function () {
    const stuckPawn = pawns.find(p => p.pIdx === activePlayer && p.state === 'BASE');
    if (!stuckPawn) return;

    let q = null;
    if (QC && QC.nextQuestion) q = QC.nextQuestion();
    if (!q && window.DEFAULT_QUESTIONS && window.DEFAULT_QUESTIONS.length) {
      q = window.DEFAULT_QUESTIONS[Math.floor(Math.random() * window.DEFAULT_QUESTIONS.length)];
    }
    if (!q) return;

    $('quizQuestionText').textContent = q.question;
    $('quizSubTitle').textContent = `Tantangan Buka Gerbang untuk ${PLAYERS[activePlayer].name}! Jawab Benar = Pion Langsung Keluar!`;
    
    const optsWrap = $('quizOptionsList');
    optsWrap.innerHTML = '';
    $('quizFeedback').className = 'quiz-feedback-box';
    $('quizFeedback').style.display = 'none';

    ['A', 'B', 'C', 'D'].forEach((letCode) => {
      const optText = q['option' + letCode];
      if (!optText) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-opt-btn';
      btn.innerHTML = `<span class="quiz-opt-letter">${letCode}</span><span>${esc(optText)}</span>`;
      btn.onclick = () => {
        const isCorrect = String(letCode).toUpperCase() === String(q.correct).toUpperCase();
        if (isCorrect) {
          $('quizFeedback').className = 'quiz-feedback-box success';
          $('quizFeedback').innerHTML = `🎉 <b>GERBANG TERBUKA!</b> ${esc(q.explanation || '')}<br>Pion ${stuckPawn.id + 1} berhasil keluar ke petak awal! Silakan lempar dadu untuk melangkah!`;
          if (QC && QC.sfx && QC.sfx.celebrate) QC.sfx.celebrate();
          setTimeout(() => {
            $('starQuizModal').classList.remove('is-visible');
            stuckPawn.state = 'TRACK';
            stuckPawn.step = 0;
            turnState = 'ROLL';
            $('diceHintText').textContent = 'Pion sudah di petak start! Klik Dadu untuk melangkah!';
            updateUI();
          }, 1800);
        } else {
          $('quizFeedback').className = 'quiz-feedback-box fail';
          $('quizFeedback').innerHTML = `❌ <b>KURANG TEPAT!</b> Jawaban benar: ${q.correct}.<br><small>${esc(q.explanation || '')}</small>`;
          if (QC && QC.sfx && QC.sfx.wrong) QC.sfx.wrong();
          setTimeout(() => {
            $('starQuizModal').classList.remove('is-visible');
            nextTurn();
          }, 2000);
        }
      };
      optsWrap.appendChild(btn);
    });

    $('starQuizModal').classList.add('is-visible');
  };

  // ---------------- TANTANGAN KUIS CERDAS (DADU SUPER) ----------------
  window.triggerBonusQuiz = function () {
    if (turnState !== 'ROLL' || PLAYERS[activePlayer].isBot) return;

    let q = null;
    if (QC && QC.nextQuestion) q = QC.nextQuestion();
    if (!q && window.DEFAULT_QUESTIONS && window.DEFAULT_QUESTIONS.length) {
      q = window.DEFAULT_QUESTIONS[Math.floor(Math.random() * window.DEFAULT_QUESTIONS.length)];
    }
    if (!q) return;

    $('quizQuestionText').textContent = q.question;
    $('quizSubTitle').textContent = `Kuis Cerdas untuk ${PLAYERS[activePlayer].name}! Jawab Benar = Dadu Super (Angka 6 Otomatis)!`;
    
    const optsWrap = $('quizOptionsList');
    optsWrap.innerHTML = '';
    $('quizFeedback').className = 'quiz-feedback-box';
    $('quizFeedback').style.display = 'none';

    ['A', 'B', 'C', 'D'].forEach((letCode) => {
      const optText = q['option' + letCode];
      if (!optText) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-opt-btn';
      btn.innerHTML = `<span class="quiz-opt-letter">${letCode}</span><span>${esc(optText)}</span>`;
      btn.onclick = () => {
        const isCorrect = String(letCode).toUpperCase() === String(q.correct).toUpperCase();
        if (isCorrect) {
          $('quizFeedback').className = 'quiz-feedback-box success';
          $('quizFeedback').innerHTML = `🎉 <b>BENAR!</b> ${esc(q.explanation || '')}<br>⚡ <b>Hadiah:</b> Dadu Super Angka 6 Aktif!`;
          if (QC && QC.sfx && QC.sfx.celebrate) QC.sfx.celebrate();
          setTimeout(() => {
            $('starQuizModal').classList.remove('is-visible');
            diceValue = 6;
            $('diceFace').textContent = DICE_FACES[5];
            handleDiceResult(6);
          }, 1800);
        } else {
          $('quizFeedback').className = 'quiz-feedback-box fail';
          $('quizFeedback').innerHTML = `❌ <b>KURANG TEPAT!</b> Jawaban benar: ${q.correct}.<br><small>${esc(q.explanation || '')}</small>`;
          if (QC && QC.sfx && QC.sfx.wrong) QC.sfx.wrong();
          setTimeout(() => {
            $('starQuizModal').classList.remove('is-visible');
            nextTurn();
          }, 2000);
        }
      };
      optsWrap.appendChild(btn);
    });

    $('starQuizModal').classList.add('is-visible');
  };

  // ---------------- CEK KONDISI KEMENANGAN ----------------
  function checkWinCondition() {
    for (let p = 0; p < playerCount; p++) {
      const pPawns = pawns.filter(o => o.pIdx === p);
      const isWinner = pPawns.every(o => o.state === 'GOAL');
      if (isWinner) {
        turnState = 'GAMEOVER';
        alert(`🏆 SELAMAT KEPADA ${PLAYERS[p].name.toUpperCase()}!\nSemua pion berhasil memasuki segitiga kemenangan Ludo Juara!`);
        break;
      }
    }
  }

  // ---------------- UI & NOTIFIKASI TOAST ----------------
  function updateUI() {
    const banner = $('turnBanner');
    const p = PLAYERS[activePlayer];
    banner.className = `turn-banner turn-p${activePlayer}`;
    $('turnBannerAvatar').textContent = p.avatar;
    $('turnBannerText').textContent = `GILIRAN ${p.name.toUpperCase()}${p.isBot ? ' (BOT)' : ''}`;

    for (let i = 0; i < 4; i++) {
      const card = $(`playerCard${i}`);
      if (card) {
        if (i >= playerCount) {
          card.classList.add('is-disabled');
        } else {
          card.classList.remove('is-disabled');
          card.classList.toggle('is-active', i === activePlayer);
          
          // Hitung pion di kandang vs finis
          const myPawns = pawns.filter(o => o.pIdx === i);
          const inBase = myPawns.filter(o => o.state === 'BASE').length;
          const inGoal = myPawns.filter(o => o.state === 'GOAL').length;
          $(`p${i}BaseCount`).textContent = inBase;
          $(`p${i}GoalCount`).textContent = inGoal;
        }
      }
    }

    // Kelola tombol kuis di samping dadu
    const btnGate = $('btnGateQuiz');
    const btnBonus = $('btnBonusQuiz');
    const hasBasePawn = pawns.some(o => o.pIdx === activePlayer && o.state === 'BASE');

    if (turnState === 'ROLL' && !p.isBot) {
      if (btnGate) btnGate.style.display = hasBasePawn ? 'inline-flex' : 'none';
      if (btnBonus) btnBonus.style.display = 'inline-flex';
      $('diceHintText').textContent = hasBasePawn 
        ? 'Lempar Dadu ATAU Jawab Kuis Keluar Markas!' 
        : 'Lempar Dadu / Jawab Kuis Cerdas!';
    } else if (turnState === 'WAIT_STUCK' && !p.isBot) {
      if (btnGate) btnGate.style.display = 'inline-flex';
      if (btnBonus) btnBonus.style.display = 'none';
    } else {
      if (btnGate) btnGate.style.display = 'none';
      if (btnBonus) btnBonus.style.display = 'none';
    }
  }

  function showToastKick(text) {
    const t = $('toastKick');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3500);
  }

  // ---------------- INPUT EVENT: KLIK PADA PAPAN ----------------
  canvas.addEventListener('pointerdown', (e) => {
    if (turnState !== 'SELECT_PAWN' || PLAYERS[activePlayer].isBot) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 15;
    const clickY = ((e.clientY - rect.top) / rect.height) * 15;

    // Cari pion yang diklik pemain aktif
    for (const pawn of movablePawns) {
      const dist = Math.hypot(clickX - (pawn.animX + 0.5), clickY - (pawn.animY + 0.5));
      if (dist < 1.1) {
        movePawn(pawn, diceValue);
        break;
      }
    }
  });

  // Tombol Dadu
  $('diceBtn')?.addEventListener('click', rollDice);

  // Keyboard Spasi / Enter untuk lempar dadu
  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      if (turnState === 'ROLL' && !PLAYERS[activePlayer].isBot) {
        rollDice();
      }
    }
  });

  // Ganti Jumlah Pemain (2 Pemain / 4 Pemain)
  $('btnTogglePlayers')?.addEventListener('click', () => {
    playerCount = playerCount === 4 ? 2 : 4;
    $('btnTogglePlayers').textContent = playerCount === 4 ? '👥 4 Pemain' : '👥 2 Pemain (Duel)';
    activePlayer = 0;
    initPawns();
    updateUI();
  });

  // Ganti Tipe Pemain (Semua Manusia / Campur Bot)
  $('btnToggleBot')?.addEventListener('click', () => {
    const allHuman = PLAYERS.slice(1).every(p => !p.isBot);
    PLAYERS.slice(1).forEach(p => p.isBot = allHuman);
    $('btnToggleBot').textContent = allHuman ? '🤖 Lawan Bot AI' : '🎮 4 Pemain Asli (Siswa)';
    updateUI();
  });

  // Tombol Peraturan
  $('btnRules')?.addEventListener('click', () => {
    alert(
      '📜 CARA BERMAIN LUDO JUARA:\n\n' +
      '1. Setiap regu/pemain memiliki pion di markas sudut.\n' +
      '2. Lempar dadu: Angka 6 dapat mengeluarkan pion ke titik start, atau bisa gunakan tombol "Buka Gerbang via Kuis"!\n' +
      '3. Berkelilinglah searah jarum jam menuju segitiga kemenangan di tengah.\n' +
      '4. Menendang Pion Lawan: Jika mendarat persis di petak pion lawan, pion lawan DITENDANG kembali ke markas dan Anda mendapat bonus lempar dadu lagi!\n' +
      '5. Petak Bintang Kuis ⭐: Petak aman anti-tendang yang memicu kuis cerdas berhadiah Langkah Kilat (+3 Petak) atau Perisai Kebal!'
    );
  });

  // Loop Render Animasi
  function animLoop() {
    drawLudoBoard();
    requestAnimationFrame(animLoop);
  }

  // Mulai Game
  resizeBoard();
  initPawns();
  updateUI();
  requestAnimationFrame(animLoop);
})();
