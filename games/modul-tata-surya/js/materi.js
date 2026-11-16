/* =========================================================================
   Modul Ajar Digital — MATERI INTERAKTIF
   Model tata surya, kartu planet, perbandingan ukuran, benda kecil,
   rotasi & revolusi, fase Bulan, gerhana. Semua gambar SVG buatan sendiri.
   ========================================================================= */
(function () {
  'use strict';
  const M = window.MOD; const D = M.D; const $ = M.$; const $$ = M.$$;
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (n, d = 0) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  const rad = (a) => (a * Math.PI) / 180;
  const built = {};
  let curPanel = 'tatasurya';
  const PANELS = ['tatasurya', 'kelompok', 'ukuran', 'kecil', 'bumi', 'bulan', 'gerhana'];

  /* ================================================== panel switching */
  function showPanel(id) {
    if (!PANELS.includes(id)) id = curPanel || 'tatasurya';
    curPanel = id;
    $$('#subnav button').forEach((b) => { const on = b.dataset.mt === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $$('.mpanel').forEach((p) => p.classList.toggle('on', p.dataset.panel === id));
    if (!built[id]) { BUILD[id](); built[id] = true; }
    const b = $(`#subnav [data-mt="${id}"]`); if (b) { try { b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* lama */ } }
    const h = '#materi/' + id; if (location.hash !== h) history.replaceState(null, '', h);
  }
  M.onSection('materi', (sub) => showPanel(sub || curPanel));

  /* ================================================== 1. MODEL TATA SURYA */
  const ORB_R = [80, 116, 154, 190, 274, 332, 388, 438];
  const SS_R = [11, 16, 17, 13, 36, 26, 22, 21];
  const ORB_T = [6, 10, 15, 24, 50, 80, 120, 165];
  const START = [20, 140, 250, 330, 60, 205, 300, 110];
  let ssPaused = false;

  function planetBody(p, r, uid) {
    const g = `ss-${p.id}-${uid}`;
    let s = `<defs><radialGradient id="${g}" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="${p.warna[0]}"/><stop offset="1" stop-color="${p.warna[1]}"/></radialGradient><clipPath id="${g}c"><circle r="${r}"/></clipPath></defs>`;
    if (p.id === 'saturnus') s += `<ellipse rx="${r * 1.9}" ry="${r * 0.55}" fill="none" stroke="#d9c38c" stroke-width="${r * 0.28}" opacity=".9" transform="rotate(-14)"/>`;
    if (p.id === 'uranus') s += `<ellipse rx="${r * 0.4}" ry="${r * 1.6}" fill="none" stroke="#9fd8e0" stroke-width="2" opacity=".75" transform="rotate(8)"/>`;
    s += `<circle r="${r}" fill="url(#${g})"/>`;
    if (p.id === 'jupiter') s += `<g opacity=".45" clip-path="url(#${g}c)"><rect x="${-r}" y="${-r * 0.45}" width="${2 * r}" height="${r * 0.18}" fill="#9a6440"/><rect x="${-r}" y="${r * 0.2}" width="${2 * r}" height="${r * 0.15}" fill="#9a6440"/></g><ellipse cx="${r * 0.35}" cy="${r * 0.4}" rx="${r * 0.2}" ry="${r * 0.11}" fill="#c1442b" opacity=".8"/>`;
    if (p.id === 'saturnus') s += `<path d="M ${-r * 1.9} 0 A ${r * 1.9} ${r * 0.55} 0 0 0 ${r * 1.9} 0" fill="none" stroke="#efdca8" stroke-width="${r * 0.28}" transform="rotate(-14)"/>`;
    if (p.id === 'bumi') s += `<path d="M ${-r * 0.5} ${-r * 0.4} q ${r * 0.4} ${-r * 0.3} ${r * 0.6} 0 q 0 ${r * 0.4} ${-r * 0.3} ${r * 0.5}z M ${r * 0.1} ${r * 0.1} q ${r * 0.4} 0 ${r * 0.5} ${r * 0.3} q ${-r * 0.2} ${r * 0.4} ${-r * 0.5} ${r * 0.3}z" fill="#3fae5a" opacity=".85"/>`;
    return s;
  }

  function buildTataSurya() {
    const W = 492;
    let s = `<svg class="ss-svg" viewBox="${-W} ${-W} ${2 * W} ${2 * W}" role="img" aria-label="Model tata surya: Matahari dan delapan planet beserta orbitnya">`;
    s += `<defs><radialGradient id="ssSun" cx=".42" cy=".38"><stop offset="0" stop-color="#fff7d6"/><stop offset=".5" stop-color="#ffc63f"/><stop offset="1" stop-color="#f26a10"/></radialGradient>
      <radialGradient id="ssGlow"><stop offset="0" stop-color="#ffb43a" stop-opacity=".5"/><stop offset=".6" stop-color="#ff8a1e" stop-opacity=".12"/><stop offset="1" stop-color="#ff8a1e" stop-opacity="0"/></radialGradient></defs>`;
    ORB_R.forEach((r) => { s += `<circle r="${r}" fill="none" stroke="rgba(170,195,255,.28)" stroke-width="1.3"/>`; });
    // sabuk asteroid (titik-titik acak tetapi deterministik)
    let belt = ''; let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 170; i++) {
      const a = rnd() * Math.PI * 2; const rr = 210 + rnd() * 26; const sz = 0.8 + rnd() * 1.7;
      belt += `<circle cx="${(rr * Math.cos(a)).toFixed(1)}" cy="${(rr * Math.sin(a)).toFixed(1)}" r="${sz.toFixed(1)}" fill="#a99a88" opacity="${(0.45 + rnd() * 0.5).toFixed(2)}"/>`;
    }
    s += `<g class="belt">${belt}</g>`;
    s += `<text x="0" y="-243" fill="#d9ccb8" font-size="19" font-weight="700" text-anchor="middle" opacity=".85" font-family="Plus Jakarta Sans, sans-serif">sabuk asteroid</text>`;
    s += `<circle r="105" fill="url(#ssGlow)"/>`;
    s += `<g class="sun pl" data-id="matahari" tabindex="0" role="button" aria-label="Matahari"><circle class="ring-sel" r="52"/><circle r="44" fill="url(#ssSun)"/><text class="plabel sunlabel" y="6">Matahari</text></g>`;
    D.PLANETS.forEach((p, i) => {
      const R = ORB_R[i]; const T = ORB_T[i]; const a0 = START[i]; const pr = SS_R[i];
      const st = `animation-duration:${T}s`;
      s += `<g transform="rotate(${-a0})"><g class="orb" style="${st}"><g transform="translate(${R} 0)"><g transform="rotate(${a0})"><g class="counter" style="${st}">
        <g class="pl" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.nama}">
          <circle class="hit" r="${Math.max(pr + 12, 28)}"/><circle class="ring-sel" r="${pr + 7}"/>${planetBody(p, pr, 'm')}
        </g><text class="plabel" y="${pr + (p.id === 'saturnus' ? 30 : 26)}">${p.nama}</text></g></g></g></g></g>`;
    });
    s += '</svg>';
    $('#ssStage').innerHTML = s;
    const svg = $('#ssStage svg');
    const open = (e) => { const pl = e.target.closest('.pl'); if (pl) openPlanet(pl.dataset.id); };
    svg.addEventListener('click', open);
    svg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); } });

    // chip daftar planet
    let c = `<button class="chip sun-chip" data-id="matahari">${M.planetArt('matahari', 40)}<span>Matahari <span class="n">(bintang)</span></span></button>`;
    D.PLANETS.forEach((p) => { c += `<button class="chip" data-id="${p.id}">${M.planetArt(p.id, 40)}<span><span class="n">${p.urut}.</span> ${p.nama}</span></button>`; });
    $('#planetChips').innerHTML = c;
    $('#planetChips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) openPlanet(b.dataset.id); });

    $('#btnOrbit').addEventListener('click', () => setOrbitPaused(!ssPaused));
    $('#chkLabel').addEventListener('change', (e) => svg.classList.toggle('nolabel', !e.target.checked));
    document.addEventListener('anim', syncOrbitBtn);
    syncOrbitBtn();
  }
  function setOrbitPaused(p) {
    ssPaused = p; const svg = $('#ssStage svg'); if (svg) svg.classList.toggle('paused', p); syncOrbitBtn();
  }
  function syncOrbitBtn() {
    const b = $('#btnOrbit'); if (!b) return;
    if (!M.animOn()) { b.textContent = '✨ Animasi mati'; b.disabled = true; return; }
    b.disabled = false; b.textContent = ssPaused ? '▶ Jalankan orbit' : '⏸ Jeda orbit';
  }

  /* ================================================== KARTU PLANET */
  const ORDER = ['matahari'].concat(D.PLANETS.map((p) => p.id));
  let cardId = null; let pausedByCard = false;
  function openPlanet(id) {
    if (!ORDER.includes(id)) return false;
    cardId = id;
    const m = $('#planetModal');
    if (id === 'matahari') {
      const s = D.MATAHARI;
      $('#pcArt').innerHTML = M.planetArt('matahari', 150);
      $('#pcNo').textContent = 'Pusat tata surya';
      $('#pcName').textContent = s.nama;
      $('#pcType').textContent = 'Bintang · bola gas pijar (terutama hidrogen dan helium)';
      $('#pcGrid').innerHTML = cell('Diameter', s.diameter) + cell('Perbandingan dengan Bumi', '± 109 × diameter Bumi') + cell('Massa', '± 99,8% massa tata surya') +
        cell('Suhu permukaan', '± 5.500 °C') + cell('Rotasi', '± 25 hari (di ekuator)') + cell('Cahaya sampai ke Bumi', '± 8 menit 20 detik');
      $('#pcFact').textContent = s.fakta;
    } else {
      const p = D.PLANETS.find((x) => x.id === id);
      $('#pcArt').innerHTML = M.planetArt(p.id, 150);
      $('#pcNo').textContent = `Planet ke-${p.urut} dari Matahari`;
      $('#pcName').textContent = p.nama;
      $('#pcType').textContent = p.tipe;
      $('#pcGrid').innerHTML = cell('Jarak rata-rata ke Matahari', `${p.sa} SA · ${p.jt} juta km`) + cell('Diameter', `${p.diameter} km`) + cell('Periode revolusi', p.rev) +
        cell('Periode rotasi', p.rot) + cell('Satelit alami', p.satelit) + cell('Cincin', p.cincin);
      $('#pcFact').textContent = p.fakta + (/^(Lebih|\d+ \(data)/.test(p.satelit) ? ' (Jumlah satelit terus bertambah seiring penemuan baru.)' : '');
    }
    m.hidden = false;
    const svg = $('#ssStage svg');
    if (svg && !ssPaused) { setOrbitPaused(true); pausedByCard = true; }
    setTimeout(() => { const x = m.querySelector('.x'); if (x) x.focus({ preventScroll: true }); }, 30);
    return true;
  }
  function cell(k, v) { return `<div><dt>${k}</dt><dd>${v}</dd></div>`; }
  function stepCard(d) { const i = ORDER.indexOf(cardId); openPlanet(ORDER[(i + d + ORDER.length) % ORDER.length]); }
  $('#pcPrev').addEventListener('click', () => stepCard(-1));
  $('#pcNext').addEventListener('click', () => stepCard(1));
  new MutationObserver(() => {
    if ($('#planetModal').hidden && pausedByCard) { pausedByCard = false; setOrbitPaused(false); }
  }).observe($('#planetModal'), { attributes: true, attributeFilter: ['hidden'] });

  /* ================================================== 2. PLANET DALAM & LUAR */
  function buildKelompok() {
    const W = 1000, H = 230, cy = 120;
    const xs = [150, 205, 262, 318, 520, 650, 778, 892];
    const rs = [7, 11, 11.5, 9, 30, 25, 17, 16.5];
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagram planet dalam, sabuk asteroid, dan planet luar (tidak berskala)">
      <defs><radialGradient id="kgSun" cx="0" cy=".5" r="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#ffc23d"/><stop offset="1" stop-color="#f06d14"/></radialGradient></defs>
      <circle cx="-30" cy="${cy}" r="120" fill="url(#kgSun)"/><text x="18" y="${cy + 5}" fill="#4a2500" font-weight="800" font-size="17">Matahari</text>`;
    // sabuk asteroid
    let seed = 3; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    s += '<g>';
    for (let i = 0; i < 90; i++) s += `<circle cx="${(372 + rnd() * 76).toFixed(1)}" cy="${(cy - 70 + rnd() * 140).toFixed(1)}" r="${(1 + rnd() * 2).toFixed(1)}" fill="#b4a592" opacity=".8"/>`;
    s += `</g><text x="410" y="${H - 8}" fill="#d9ccb8" font-weight="800" font-size="15" text-anchor="middle">Sabuk asteroid</text>`;
    // braket
    s += `<path d="M ${xs[0] - 22} 34 v -10 h ${xs[3] - xs[0] + 44} v 10" fill="none" stroke="#ff9a6b" stroke-width="3"/><text x="${(xs[0] + xs[3]) / 2}" y="16" fill="#ffb999" font-weight="800" font-size="17" text-anchor="middle">PLANET DALAM</text>`;
    s += `<path d="M ${xs[4] - 40} 34 v -10 h ${xs[7] - xs[4] + 70} v 10" fill="none" stroke="#7fb0ff" stroke-width="3"/><text x="${(xs[4] + xs[7]) / 2 + 8}" y="16" fill="#a9c8ff" font-weight="800" font-size="17" text-anchor="middle">PLANET LUAR</text>`;
    D.PLANETS.forEach((p, i) => {
      s += `<g transform="translate(${xs[i]} ${cy})" class="kg-p" data-id="${p.id}" style="cursor:pointer">${planetBody(p, rs[i], 'k')}</g>`;
      s += `<text x="${xs[i]}" y="${cy + 62}" fill="#e8eeff" font-weight="700" font-size="${i < 4 ? 14 : 16}" text-anchor="middle">${p.nama}</text>`;
    });
    s += `<text x="${W - 6}" y="${H - 8}" fill="#aeb9de" font-size="13" text-anchor="end" font-style="italic">tidak berskala</text></svg>`;
    $('#beltDiagram').innerHTML = s;
    $('#beltDiagram').addEventListener('click', (e) => { const g = e.target.closest('.kg-p'); if (g) openPlanet(g.dataset.id); });
  }

  /* ================================================== 3. PERBANDINGAN UKURAN */
  const EARTH_D = 12756;
  const SAT_RING_D = 273550; // diameter tepi luar cincin A Saturnus (± 2 × 136.775 km)
  function sizeSVG(mode) {
    const W = 1000;
    if (mode === 'jarak') {
      const H = 270, x0 = 50, x1 = W - 30, maxSA = 32;
      const X = (sa) => x0 + (sa / maxSA) * (x1 - x0);
      const y = 160;
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Skala jarak planet dari Matahari dalam satuan astronomi">`;
      s += `<rect x="${X(2.1)}" y="${y - 26}" width="${X(3.3) - X(2.1)}" height="52" fill="#b4a592" opacity=".25"/><text x="${X(2.7)}" y="${y + 20}" fill="#d9ccb8" font-size="12" font-weight="700" text-anchor="middle">sabuk asteroid</text>`;
      s += `<rect x="${X(30)}" y="${y - 26}" width="${x1 - X(30) + 30}" height="52" fill="#8fb6ff" opacity=".15"/><text x="998" y="${y + 20}" fill="#a9c8ff" font-size="12" font-weight="700" text-anchor="end">Sabuk Kuiper</text>`;
      s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="rgba(200,215,255,.5)" stroke-width="2"/>`;
      for (let k = 0; k <= 30; k += 5) s += `<line x1="${X(k)}" y1="${y + 34}" x2="${X(k)}" y2="${y + 44}" stroke="#aeb9de" stroke-width="2"/><text x="${X(k)}" y="${y + 62}" fill="#aeb9de" font-size="14" text-anchor="middle" font-weight="700">${k} SA</text>`;
      s += `<circle cx="${x0}" cy="${y}" r="8" fill="#ffc23d"/><text x="${x0}" y="${y + 34}" fill="#ffd479" font-size="13" text-anchor="middle" font-weight="800">Matahari</text>`;
      D.PLANETS.forEach((p, i) => {
        const sa = parseFloat(p.sa.replace(',', '.'));
        const ly = i < 4 ? y - 70 - (3 - i) * 22 : y - 40;
        const anchor = i < 4 ? 'start' : 'middle';
        s += `<circle cx="${X(sa)}" cy="${y}" r="6" fill="${p.warna[0]}" stroke="${p.warna[1]}" stroke-width="2"/>`;
        s += `<line x1="${X(sa)}" y1="${y - 8}" x2="${X(sa)}" y2="${ly + 4}" stroke="rgba(200,215,255,.35)"/>`;
        s += `<text x="${X(sa) + (i < 4 ? 3 : 0)}" y="${ly}" fill="#e8eeff" font-size="14" font-weight="700" text-anchor="${anchor}">${p.nama} (${p.sa})</text>`;
      });
      s += `<text x="${W / 2}" y="${H - 12}" fill="#aeb9de" font-size="14" text-anchor="middle" font-style="italic">Jarak berskala (1 SA ≈ 149,6 juta km). Lingkaran hanya penanda posisi — pada skala ini planet terlalu kecil untuk terlihat.</text></svg>`;
      return s;
    }
    const withSun = mode === 'matahari';
    const H = withSun ? 330 : 330;
    const gap = withSun ? 34 : 18;
    const widths = D.PLANETS.map((p) => (p.id === 'saturnus' ? SAT_RING_D : p.dNum));
    let sc, xStart, cy;
    if (withSun) { sc = 100 / 142984; xStart = 250; cy = 150; } else {
      const sum = widths.reduce((a, b) => a + b, 0); sc = (W - 40 - gap * 7) / sum; xStart = 20; cy = 120;
    }
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Perbandingan diameter planet${withSun ? ' dan Matahari' : ''} sesuai skala">`;
    if (withSun) {
      const R = (D.MATAHARI.dNum * sc) / 2; const cx = 205 - R;
      s += `<defs><radialGradient id="szSun" cx=".85" cy=".5" r=".6"><stop offset="0" stop-color="#fff3c4"/><stop offset=".4" stop-color="#ffc23d"/><stop offset="1" stop-color="#f06d14"/></radialGradient></defs>`;
      s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#szSun)"/>`;
      s += `<text x="18" y="${H - 58}" fill="#4a2500" font-size="22" font-weight="800">Matahari</text><text x="18" y="${H - 34}" fill="#5a2c00" font-size="16" font-weight="800">± 1,39 juta km</text><text x="18" y="${H - 12}" fill="#5a2c00" font-size="16" font-weight="800">≈ 109 × Bumi</text>`;
    }
    let x = xStart;
    const badgeY = withSun ? cy + 70 : cy + 138;
    D.PLANETS.forEach((p, i) => {
      const w = widths[i] * sc; const r = (p.dNum * sc) / 2; const cx = x + w / 2;
      s += `<g transform="translate(${cx.toFixed(1)} ${cy})">${planetBody(p, Math.max(r, 0.8), 'z' + mode)}</g>`;
      s += `<line x1="${cx.toFixed(1)}" y1="${(cy + Math.max(r, 2) + 4).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${badgeY - 14}" stroke="rgba(200,215,255,.3)"/>`;
      s += `<circle cx="${cx.toFixed(1)}" cy="${badgeY}" r="13" fill="#ffbf47"/><text x="${cx.toFixed(1)}" y="${badgeY + 6}" fill="#241500" font-size="16" font-weight="900" text-anchor="middle">${p.urut}</text>`;
      if (i >= 4 && !withSun) s += `<text x="${cx.toFixed(1)}" y="${badgeY + 40}" fill="#e8eeff" font-size="${withSun ? 15 : 19}" font-weight="800" text-anchor="middle">${p.nama}</text>`;
      x += w + gap;
    });
    s += '</svg>';
    s += `<div class="size-legend">${D.PLANETS.map((p) => `<div><span class="nb">${p.urut}</span><b>${p.nama}</b><small>${p.diameter} km · ${fmt(p.dNum / EARTH_D, p.dNum < EARTH_D ? 2 : 1)}× Bumi</small></div>`).join('')}</div>`;
    return s;
  }
  const SIZE_NOTE = {
    planet: 'Diameter digambar berskala. Jupiter ± 11 kali diameter Bumi; cincin Saturnus digambar sampai tepi luar cincin utamanya.',
    matahari: 'Matahari jauh lebih besar dari semua planet: diameternya ± 109 kali Bumi, dan volumenya cukup untuk menampung ± 1,3 juta Bumi.',
    jarak: 'Jarak planet makin renggang ke arah luar. Planet dalam berdekatan, sedangkan planet luar sangat berjauhan.'
  };
  let sizeMode = 'planet';
  function setSize(mode) {
    sizeMode = mode;
    $$('#sizeMode button').forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
    $('#sizeStage').innerHTML = sizeSVG(mode);
    $('#sizeNote').textContent = SIZE_NOTE[mode];
  }
  function buildUkuran() {
    $('#sizeMode').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setSize(b.dataset.m); });
    setSize('planet');
  }

  /* ================================================== 4. BENDA KECIL */
  function buildKecil() {
    $('#dwarfList').innerHTML = D.KERDIL.map((k) => `<div class="dw">${k.nama === 'Pluto' ? M.planetArt('pluto', 46) : ''}<b>${k.nama}</b><span class="loc">${k.lokasi}</span>Ukuran: ${k.diameter}<br>${k.catatan}</div>`).join('');
    const sun = [40, 110];
    // komet: ekor menjauhi Matahari
    const comet = (cx, cy, len, k) => {
      const dx = cx - sun[0], dy = cy - sun[1]; const L = Math.hypot(dx, dy); const ux = dx / L, uy = dy / L; const nx = -uy, ny = ux;
      const tx = cx + ux * len, ty = cy + uy * len;
      return `<g class="hl" data-k="${k}"><path d="M ${cx + nx * 5} ${cy + ny * 5} L ${tx + nx * 22} ${ty + ny * 22} L ${tx - nx * 22} ${ty - ny * 22} L ${cx - nx * 5} ${cy - ny * 5} Z" fill="url(#mtTail)" transform="rotate(0)"/><circle cx="${cx}" cy="${cy}" r="9" fill="#e7f6ff"/><circle cx="${cx}" cy="${cy}" r="16" fill="#bfe6ff" opacity=".25"/></g>`;
    };
    let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    let ast = '';
    for (let i = 0; i < 60; i++) { const a = rad(-25 + rnd() * 95); const r = 135 + rnd() * 30; ast += `<circle cx="${(sun[0] + r * Math.cos(a)).toFixed(1)}" cy="${(sun[1] + r * Math.sin(a)).toFixed(1)}" r="${(1.2 + rnd() * 2.6).toFixed(1)}" fill="#b4a592"/>`; }
    const s = `<svg viewBox="0 0 600 380" role="img" aria-label="Ilustrasi asteroid, komet, meteoroid, meteor, dan meteorit">
      <defs>
        <linearGradient id="mtTail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfefff" stop-opacity=".9"/><stop offset="1" stop-color="#cfefff" stop-opacity="0"/></linearGradient>
        <radialGradient id="mtSun"><stop offset="0" stop-color="#fff6d0"/><stop offset=".6" stop-color="#ffc23d"/><stop offset="1" stop-color="#f26b12"/></radialGradient>
        <linearGradient id="mtMeteor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#ffe9a8"/></linearGradient>
        <radialGradient id="mtAtm" cx="600" cy="640" r="345" gradientUnits="userSpaceOnUse"><stop offset=".85" stop-color="#5fb4ff" stop-opacity=".45"/><stop offset="1" stop-color="#5fb4ff" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="600" height="380" fill="#070b1f"/>
      <circle cx="${sun[0]}" cy="${sun[1]}" r="42" fill="url(#mtSun)"/><text x="${sun[0]}" y="${sun[1] + 62}" fill="#ffd479" font-size="13" font-weight="800" text-anchor="middle">Matahari</text>
      <g class="hl" data-k="asteroid">${ast}<text x="196" y="40" fill="#d9ccb8" font-size="14" font-weight="800">Asteroid</text></g>
      <ellipse cx="250" cy="150" rx="230" ry="70" fill="none" stroke="#bfe6ff" stroke-width="1.2" stroke-dasharray="5 6" opacity=".45" transform="rotate(-8 250 150)"/>
      ${comet(360, 80, 120, 'komet')}${comet(250, 222, 95, 'komet')}
      <text x="300" y="38" fill="#cfefff" font-size="14" font-weight="800" class="hl" data-k="komet">Komet (ekor menjauhi Matahari)</text>
      <g class="hl" data-k="meteoroid"><path d="M 470 120 l 7 -4 l 6 3 l 1 7 l -6 4 l -7 -2 z" fill="#9a8b7a"/><text x="490" y="118" fill="#e8dccb" font-size="14" font-weight="800">Meteoroid</text></g>
      <circle cx="600" cy="640" r="345" fill="url(#mtAtm)"/>
      <circle cx="600" cy="640" r="300" fill="#1d5fa8"/>
      <path d="M 330 520 Q 420 380 600 345 L 600 380 L 330 380 Z" fill="#3fae5a" opacity=".85"/>
      <g class="hl" data-k="meteor"><path d="M 390 300 L 452 338" stroke="url(#mtMeteor)" stroke-width="6" stroke-linecap="round"/><circle cx="452" cy="338" r="4.5" fill="#fff4c8"/><text x="368" y="292" fill="#fff0b8" font-size="14" font-weight="800">Meteor</text></g>
      <g class="hl" data-k="meteorit"><path d="M 512 352 l 8 -6 l 9 2 l 3 7 l -20 2 z" fill="#5c4f43" stroke="#2b241d"/><text x="500" y="338" fill="#fff" font-size="14" font-weight="800" text-anchor="end">Meteorit</text></g>
      <text x="590" y="372" fill="#d6ecff" font-size="12" font-weight="700" text-anchor="end">Bumi &amp; atmosfer</text>
    </svg>`;
    $('#meteoSvg').innerHTML = s;
    const sel = (k) => {
      $$('#meteoCards .mc').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
      $$('#meteoSvg .hl').forEach((g) => g.classList.toggle('on', !k || g.dataset.k === k));
    };
    let cur = null;
    $('#meteoCards').addEventListener('click', (e) => { const b = e.target.closest('.mc'); if (!b) return; cur = cur === b.dataset.k ? null : b.dataset.k; sel(cur); });
    sel(null);
  }

  /* ================================================== 5. ROTASI & REVOLUSI */
  const pad2 = (n) => String(n).padStart(2, '0');
  const jam = (h) => { h = ((h % 24) + 24) % 24; return `${pad2(Math.floor(h))}.${pad2(Math.round((h % 1) * 60))}`; };
  const CITIES = [
    { z: 'WIB', kota: 'Jakarta', lon: 106.8, off: 7 },
    { z: 'WITA', kota: 'Makassar', lon: 119.4, off: 8 },
    { z: 'WIT', kota: 'Jayapura', lon: 140.7, off: 9 }
  ];
  function drawRot(wib) {
    const cx = 330, cy = 215, R = 150;
    const utc = wib - 7;
    const ang = (lon) => rad(utc * 15 + lon); // sudut matematis (berlawanan jarum jam), Matahari di kiri (180°)
    const P = (a, r) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    let s = `<svg viewBox="0 0 640 430" role="img" aria-label="Bumi dilihat dari atas kutub utara, berotasi dari barat ke timur">`;
    s += `<defs><radialGradient id="rtSun" cx="0" cy=".5" r="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#ffc23d"/><stop offset="1" stop-color="#f06d14"/></radialGradient>
      <marker id="rtArr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#ffd479"/></marker></defs>`;
    s += `<circle cx="-60" cy="${cy}" r="110" fill="url(#rtSun)"/><text x="10" y="${cy + 132}" fill="#ffd479" font-size="15" font-weight="800">Matahari</text>`;
    for (let k = -3; k <= 3; k++) s += `<line x1="62" y1="${cy + k * 40}" x2="${cx - R - 14}" y2="${cy + k * 40}" stroke="#ffd479" stroke-width="2" opacity=".55" marker-end="url(#rtArr)"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#1f63b0"/>`;
    // garis bujur ikut berputar
    for (let k = 0; k < 24; k++) { const a = rad(utc * 15 + k * 15); const [x, y] = P(a, R); s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,${k % 6 === 0 ? 0.35 : 0.13})" stroke-width="1"/>`; }
    // busur wilayah Indonesia (± 95°–141° BT)
    const a1 = ang(95), a2 = ang(141); const [x1, y1] = P(a1, R - 12); const [x2, y2] = P(a2, R - 12);
    s += `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R - 12} ${R - 12} 0 0 0 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="#49c26b" stroke-width="10" stroke-linecap="round"/>`;
    // malam (separuh kanan)
    s += `<path d="M ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx} ${cy + R} Z" fill="#050817" opacity=".72"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#8fd3ff" stroke-width="2" opacity=".6"/>`;
    CITIES.forEach((c, i) => {
      const [x, y] = P(ang(c.lon), R - 12); const [lx, ly] = P(ang(c.lon), R + 26 + i * 4);
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#fff" stroke="#e8483b" stroke-width="3"/>`;
      s += `<text x="${lx.toFixed(1)}" y="${(ly + 5).toFixed(1)}" fill="#fff" font-size="13" font-weight="800" text-anchor="middle" paint-order="stroke" stroke="#060a1c" stroke-width="4">${c.kota}</text>`;
    });
    s += `<circle cx="${cx}" cy="${cy}" r="5" fill="#fff"/><text x="${cx}" y="${cy - 12}" fill="#fff" font-size="12" font-weight="700" text-anchor="middle" paint-order="stroke" stroke="#0b2a55" stroke-width="3">Kutub Utara</text>`;
    // panah arah rotasi (berlawanan jarum jam dilihat dari atas kutub utara)
    s += `<path d="M ${cx + R + 30} ${cy + 60} A ${R + 30} ${R + 30} 0 0 0 ${cx + R + 30} ${cy - 60}" fill="none" stroke="#ffd479" stroke-width="3" marker-end="url(#rtArr)" transform="rotate(0)"/>`;
    s += `<text x="${cx + R + 52}" y="${cy + 5}" fill="#ffd479" font-size="13" font-weight="800">arah</text><text x="${cx + R + 52}" y="${cy + 22}" fill="#ffd479" font-size="13" font-weight="800">rotasi</text>`;
    s += `<text x="${cx - R + 18}" y="${cy - R + 6}" fill="#ffe7a6" font-size="16" font-weight="800">SIANG</text><text x="${cx + R - 18}" y="${cy - R + 6}" fill="#aab7ff" font-size="16" font-weight="800" text-anchor="end">MALAM</text>`;
    s += `<text x="630" y="420" fill="#aeb9de" font-size="12" text-anchor="end" font-style="italic">dilihat dari atas kutub utara · tidak berskala</text></svg>`;
    $('#rotSvg').innerHTML = s;
    $('#rotJam').textContent = jam(wib) + ' WIB';
    $('#rotZones').innerHTML = CITIES.map((c) => {
      const solar = (((utc + c.lon / 15) % 24) + 24) % 24;
      const day = solar >= 6 && solar < 18;
      return `<div class="zone ${day ? 'day' : 'night'}"><small>${c.z} · ${c.kota}</small><b>${jam(wib + (c.off - 7))}</b><span>${day ? '☀️ Siang' : '🌙 Malam'}</span></div>`;
    }).join('');
  }

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI_BLN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const tglDari = (d) => { let m = 0; while (d >= HARI_BLN[m]) { d -= HARI_BLN[m]; m++; } return `${d + 1} ${BULAN[m]}`; };
  const deklinasi = (d) => 23.44 * Math.sin(rad((360 * (d - 79)) / 365.25));
  function drawRev(d) {
    const cx = 320, cy = 112, rx = 245, ry = 74;
    const th = rad((360 * (d - 79)) / 365.25) - Math.PI / 2;
    const ex = cx + rx * Math.cos(th), ey = cy - ry * Math.sin(th);
    const dec = deklinasi(d);
    const TILT = 23.44;
    const axis = (x, y, L) => { const a = rad(TILT); return `<line x1="${(x + Math.sin(a) * L).toFixed(1)}" y1="${(y + Math.cos(a) * L).toFixed(1)}" x2="${(x - Math.sin(a) * L).toFixed(1)}" y2="${(y - Math.cos(a) * L).toFixed(1)}" stroke="#fff" stroke-width="2"/>`; };
    let s = `<svg viewBox="0 0 640 440" role="img" aria-label="Revolusi Bumi dan kemiringan sumbu yang menyebabkan musim">`;
    s += `<defs><radialGradient id="rvSun" cx=".4" cy=".4"><stop offset="0" stop-color="#fff6d0"/><stop offset=".6" stop-color="#ffc23d"/><stop offset="1" stop-color="#f26b12"/></radialGradient>
      <marker id="rvArr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#ffd479"/></marker></defs>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="rgba(170,195,255,.4)" stroke-width="1.5"/>`;
    s += `<path d="M ${cx - 60} ${cy + ry + 2} A ${rx} ${ry} 0 0 0 ${cx + 60} ${cy + ry + 2}" fill="none" stroke="#ffd479" stroke-width="2.5" marker-end="url(#rvArr)" opacity=".85"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="26" fill="url(#rvSun)"/>`;
    [[79, '21 Mar'], [171, '21 Jun'], [265, '23 Sep'], [355, '22 Des']].forEach(([dd, t]) => {
      const a = rad((360 * (dd - 79)) / 365.25) - Math.PI / 2; const x = cx + rx * Math.cos(a), y = cy - ry * Math.sin(a);
      const ox = Math.cos(a) * 44, oy = -Math.sin(a) * 22;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="rgba(255,255,255,.4)"/><text x="${(x + ox).toFixed(1)}" y="${(y + oy + 5).toFixed(1)}" fill="#aeb9de" font-size="13" font-weight="800" text-anchor="middle">${t}</text>`;
    });
    // Bumi pada orbit + sumbu tetap arahnya (kutub utara condong ke kiri layar)
    s += `<g><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="13" fill="#1f63b0" stroke="#8fd3ff" stroke-width="1.5"/>`;
    const phi = (Math.atan2(cy - ey, cx - ex) * 180) / Math.PI; // arah ke Matahari
    s += `<path d="M 0 -13 A 13 13 0 0 1 0 13 Z" fill="#050817" opacity=".6" transform="translate(${ex.toFixed(1)} ${ey.toFixed(1)}) rotate(${(phi - 180).toFixed(1)})"/>`;
    s += axis(ex, ey, 21) + `<text x="${(ex - Math.sin(rad(TILT)) * 26).toFixed(1)}" y="${(ey - Math.cos(rad(TILT)) * 26 - 3).toFixed(1)}" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">U</text></g>`;

    // tampilan samping (close-up): sinar dari kiri, kutub utara condong ke Matahari sebesar deklinasi
    const bx = 410, by = 330, br = 82;
    s += `<rect x="20" y="222" width="600" height="210" rx="16" fill="rgba(0,0,0,.28)" stroke="rgba(150,175,255,.2)"/>`;
    s += `<text x="36" y="248" fill="#aeb9de" font-size="13" font-weight="800">TAMPAK SAMPING (sinar Matahari datang dari kiri)</text>`;
    for (let k = -3; k <= 3; k++) s += `<line x1="40" y1="${by + k * 24}" x2="${bx - Math.sqrt(Math.max(0, br * br - (k * 24) ** 2)) - 6}" y2="${by + k * 24}" stroke="#ffd479" stroke-width="${k === 0 ? 3 : 1.6}" opacity="${k === 0 ? 0.95 : 0.5}" marker-end="url(#rvArr)"/>`;
    const tr = (lat) => (br * Math.sin(rad(lat))).toFixed(1);
    const chord = (lat, col, dash = '') => { const y = -br * Math.sin(rad(lat)); const w = br * Math.cos(rad(lat)); return `<line x1="${(-w).toFixed(1)}" y1="${y.toFixed(1)}" x2="${w.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${col}" stroke-width="1.6" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`; };
    s += `<g transform="translate(${bx} ${by}) rotate(${(-dec).toFixed(2)})">
      <circle r="${br}" fill="#1f63b0"/>
      ${chord(0, '#fff')}${chord(23.44, '#ffd479', '5 4')}${chord(-23.44, '#ffd479', '5 4')}${chord(66.56, '#8fd3ff', '3 4')}${chord(-66.56, '#8fd3ff', '3 4')}
      <line x1="0" y1="${-br - 22}" x2="0" y2="${br + 22}" stroke="#fff" stroke-width="2.5"/>
      <text x="6" y="${-br - 10}" fill="#fff" font-size="13" font-weight="800">KU</text>
      <text x="${br * 0.98 + 6}" y="4" fill="#fff" font-size="12" font-weight="700">khatulistiwa</text>
      <text x="${br * 0.92 + 6}" y="${-tr(23.44) + 4}" fill="#ffd479" font-size="11" font-weight="700">23,5° LU</text>
      <text x="${br * 0.92 + 6}" y="${tr(23.44) + 10}" fill="#ffd479" font-size="11" font-weight="700">23,5° LS</text>
    </g>`;
    s += `<path d="M ${bx} ${by - br} A ${br} ${br} 0 0 1 ${bx} ${by + br} Z" fill="#050817" opacity=".55"/>`;
    s += `<circle cx="${bx - br * Math.cos(0)}" cy="${by}" r="0"/>`;
    s += `<text x="${bx - br - 10}" y="${by + br + 2}" fill="#ffe7a6" font-size="12" font-weight="800" text-anchor="end">sinar tegak lurus</text>`;
    s += '</svg>';
    $('#revSvg').innerHTML = s;
    $('#revTgl').textContent = tglDari(d);
    $$('#revQuick button').forEach((b) => b.classList.toggle('on', +b.dataset.d === d));

    const lat = Math.abs(dec) < 0.5 ? 'khatulistiwa (0°)' : `${fmt(Math.abs(dec), 1)}° ${dec > 0 ? 'LU' : 'LS'}`;
    let nh, sh;
    if (d >= 79 && d < 171) { nh = 'musim semi'; sh = 'musim gugur'; } else if (d >= 171 && d < 265) { nh = 'musim panas'; sh = 'musim dingin'; } else if (d >= 265 && d < 355) { nh = 'musim gugur'; sh = 'musim semi'; } else { nh = 'musim dingin'; sh = 'musim panas'; }
    const sign = Math.abs(dec) < 1 ? 'Lama siang dan malam hampir sama di seluruh Bumi (ekuinoks).' : dec > 0 ? 'Belahan Bumi utara condong ke Matahari: siang lebih panjang daripada malam di belahan utara.' : 'Belahan Bumi selatan condong ke Matahari: siang lebih panjang daripada malam di belahan selatan.';
    let extra = '';
    if (d <= 8 || d >= 362) extra = '<p>📍 Sekitar awal Januari Bumi berada di titik <b>terdekat</b> dengan Matahari (perihelion) — padahal belahan utara sedang musim dingin.</p>';
    else if (d >= 180 && d <= 189) extra = '<p>📍 Sekitar awal Juli Bumi berada di titik <b>terjauh</b> dari Matahari (aphelion) — padahal belahan utara sedang musim panas.</p>';
    $('#revInfo').innerHTML = `<p>☀️ Matahari tepat di atas: <b>${lat}</b></p><p>Belahan Bumi utara: <b>${nh}</b> · Belahan Bumi selatan: <b>${sh}</b></p><p>${sign}</p><p>🌏 Indonesia (dekat khatulistiwa): lama siang ± 12 jam sepanjang tahun; yang bergantian adalah musim hujan dan kemarau akibat angin muson.</p>${extra}`;
  }
  function buildBumi() {
    const r = $('#rotRange'); r.addEventListener('input', () => drawRot(+r.value)); drawRot(+r.value);
    const v = $('#revRange'); v.addEventListener('input', () => drawRev(+v.value)); drawRev(+v.value);
    $('#revQuick').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { v.value = b.dataset.d; drawRev(+b.dataset.d); } });
    $('#bumiMode').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#bumiMode button').forEach((x) => x.classList.toggle('on', x === b));
      $$('.bumi-pane').forEach((p) => { p.hidden = p.dataset.bm !== b.dataset.m; });
    });
  }

  /* ================================================== 6. FASE BULAN */
  const SYN = 29.53;
  const FASE = ['Bulan baru', 'Sabit awal', 'Kuartal pertama', 'Cembung awal', 'Purnama', 'Cembung akhir', 'Kuartal ketiga', 'Sabit akhir'];
  // bentuk bagian terang (tampak dari belahan utara: Bulan muda terang di kanan)
  function phasePath(theta, r) {
    const t = ((theta % 360) + 360) % 360; const k = Math.cos(rad(t)); const rx = Math.abs(k) * r;
    if (t < 0.5 || t > 359.5) return '';
    if (t <= 180) { const sw = k > 0 ? 0 : 1; return `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${rx.toFixed(2)} ${r} 0 0 ${sw} 0 ${-r} Z`; }
    const sw = k > 0 ? 1 : 0; return `M 0 ${-r} A ${r} ${r} 0 0 0 0 ${r} A ${rx.toFixed(2)} ${r} 0 0 ${sw} 0 ${-r} Z`;
  }
  function moonDisk(theta, r, id) {
    return `<defs><radialGradient id="${id}" cx=".45" cy=".45"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e3d9bd"/></radialGradient></defs><circle r="${r}" fill="#262b40"/><path d="${phasePath(theta, r)}" fill="url(#${id})"/><circle r="${r}" fill="none" stroke="rgba(255,255,255,.18)"/>`;
  }
  let moonDay = 14.5;
  function drawMoon(day) {
    moonDay = day;
    const theta = (day / SYN) * 360;
    const cx = 340, cy = 220, R = 155;
    const pos = (th) => { const a = rad(180 + th); return [cx + R * Math.cos(a), cy - R * Math.sin(a)]; };
    let s = `<svg viewBox="0 0 640 440" role="img" aria-label="Posisi Bulan mengelilingi Bumi dan fase yang terlihat">`;
    s += `<defs><marker id="mnArr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#ffd479"/></marker></defs>`;
    for (let k = -4; k <= 4; k++) s += `<line x1="10" y1="${cy + k * 46}" x2="70" y2="${cy + k * 46}" stroke="#ffd479" stroke-width="2" opacity=".55" marker-end="url(#mnArr)"/>`;
    s += `<text x="12" y="24" fill="#ffd479" font-size="14" font-weight="800">← dari Matahari</text>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(170,195,255,.35)" stroke-dasharray="4 6"/>`;
    // Bumi
    s += `<circle cx="${cx}" cy="${cy}" r="34" fill="#1f63b0"/><path d="M ${cx} ${cy - 34} A 34 34 0 0 1 ${cx} ${cy + 34} Z" fill="#050817" opacity=".65"/><text x="${cx}" y="${cy + 54}" fill="#d6ecff" font-size="13" font-weight="800" text-anchor="middle">Bumi</text>`;
    // 8 posisi bayangan
    for (let i = 0; i < 8; i++) {
      const [x, y] = pos(i * 45);
      s += `<g class="mpos" data-i="${i}" style="cursor:pointer" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="22" fill="transparent"/><circle r="11" fill="#3a3f57" opacity=".7"/><path d="M 0 -11 A 11 11 0 0 0 0 11 Z" fill="#e3d9bd" opacity=".55"/></g>`;
    }
    // Bulan saat ini (sisi kiri = sisi yang menghadap Matahari selalu terang)
    const [mx, my] = pos(theta);
    s += `<line x1="${cx}" y1="${cy}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="rgba(255,255,255,.25)" stroke-dasharray="3 4"/>`;
    s += `<g transform="translate(${mx.toFixed(1)} ${my.toFixed(1)})"><circle r="21" fill="#262b40" stroke="#ffd479" stroke-width="2.5"/><path d="M 0 -21 A 21 21 0 0 0 0 21 Z" fill="#f3ecd2"/></g>`;
    s += `<path d="M ${cx + 105} ${cy - 118} A ${R} ${R} 0 0 0 ${cx + 30} ${cy - 152}" fill="none" stroke="#ffd479" stroke-width="2.5" marker-end="url(#mnArr)"/>`;
    s += `<text x="630" y="430" fill="#aeb9de" font-size="12" text-anchor="end" font-style="italic">dilihat dari atas kutub utara · tidak berskala</text></svg>`;
    $('#moonOrbitSvg').innerHTML = s;
    const idx = Math.round(theta / 45) % 8;
    $('#moonViewSvg').innerHTML = `<svg viewBox="-60 -60 120 120" role="img" aria-label="Bentuk Bulan: ${FASE[idx]}">${moonDisk(theta, 52, 'mvG')}</svg>`;
    $('#moonName').textContent = FASE[idx];
    const illum = Math.round(((1 - Math.cos(rad(theta))) / 2) * 100);
    const rise = 6 + theta / 15;
    $('#moonDay').textContent = `Hari ke-${fmt(day, day % 1 ? 1 : 0)} · bagian terang terlihat ± ${illum}% · terbit sekitar pukul ${jam(Math.round(rise))}`;
    $$('#moonQuick button').forEach((b, i) => b.classList.toggle('on', i === idx && Math.abs(theta - i * 45) < 6));
  }
  function setMoonPhase(i) { const d = Math.round(((i * SYN) / 8) * 2) / 2; $('#moonRange').value = d; drawMoon(d); }
  function buildBulan() {
    $('#moonQuick').innerHTML = FASE.map((f, i) => `<button data-i="${i}">${f}</button>`).join('');
    $('#moonQuick').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMoonPhase(+b.dataset.i); });
    $('#moonOrbitSvg').addEventListener('click', (e) => { const g = e.target.closest('.mpos'); if (g) setMoonPhase(+g.dataset.i); });
    const r = $('#moonRange'); r.addEventListener('input', () => drawMoon(+r.value));
    drawMoon(+r.value);
  }

  /* ================================================== 7. GERHANA */
  let ecMode = 'matahari';
  function ecState() {
    const off = +$('#ecRange').value; const far = $('#ecFar').checked;
    const S = [95, 190];
    if (ecMode === 'matahari') {
      const Mo = [520, 190 + off * 1.1], Rm = 18, E = [865, 190], Re = 64;
      const dU = far ? 240 : 360, k = 0.14;
      return { S, Mo, Rm, E, Re, dU, k, body: Mo, Rb: Rm, target: E, Rt: Re };
    }
    const E = [470, 190], Re = 60, Mo = [850, 190 + off * 1.3], Rm = 17;
    return { S, E, Re, Mo, Rm, dU: 900, k: 0.1, body: E, Rb: Re, target: Mo, Rt: Rm };
  }
  function drawEclipse() {
    const st = ecState();
    const { S, body: B, Rb, target: T, Rt, dU, k } = st;
    const dx = B[0] - S[0], dy = B[1] - S[1]; const L = Math.hypot(dx, dy); const u = [dx / L, dy / L]; const n = [-u[1], u[0]];
    const P = (t, w) => [B[0] + u[0] * t + n[0] * w, B[1] + u[1] * t + n[1] * w];
    const pt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    const Tlen = 900;
    const pen = [P(0, Rb), P(Tlen, Rb + Tlen * k), P(Tlen, -(Rb + Tlen * k)), P(0, -Rb)];
    const umb = [P(0, Rb), P(dU, 0), P(0, -Rb)];
    const ant = [P(dU, 0), P(Tlen, Rb * (Tlen / dU - 1)), P(Tlen, -Rb * (Tlen / dU - 1))];
    // analisis
    const rel = [T[0] - B[0], T[1] - B[1]]; const t = rel[0] * u[0] + rel[1] * u[1]; const dist = Math.abs(rel[0] * n[0] + rel[1] * n[1]);
    const wU = Rb * (1 - t / dU); const wP = Rb + t * k;
    let status, cls = '';
    if (ecMode === 'matahari') {
      if (dist < Rt) {
        const tSurf = t - Math.sqrt(Rt * Rt - dist * dist);
        if (dU > tSurf) { status = '<b>Gerhana Matahari total</b> di wilayah Bumi yang terkena umbra (bayangan inti) Bulan. Wilayah di sekitarnya yang terkena penumbra mengalami gerhana Matahari sebagian.'; cls = 'total'; } else { status = '<b>Gerhana Matahari cincin</b>: umbra Bulan tidak sampai ke Bumi karena Bulan sedang jauh. Pengamat di daerah antumbra melihat tepi Matahari seperti cincin bercahaya.'; cls = 'cincin'; }
      } else if (dist < Rt + wP) { status = '<b>Gerhana Matahari sebagian</b>: hanya penumbra (bayangan kabur) Bulan yang mengenai Bumi.'; cls = 'sebagian'; } else { status = '<b>Tidak terjadi gerhana</b>: bayangan Bulan lewat di atas atau di bawah Bumi. Inilah sebabnya tidak setiap Bulan baru terjadi gerhana.'; cls = 'tidak'; }
    } else {
      if (dist + Rt <= wU) { status = '<b>Gerhana Bulan total</b>: seluruh Bulan masuk umbra Bumi. Bulan tampak merah tembaga karena cahaya Matahari dibiaskan atmosfer Bumi.'; cls = 'total'; } else if (dist - Rt < wU) { status = '<b>Gerhana Bulan sebagian</b>: sebagian Bulan masuk umbra Bumi.'; cls = 'sebagian'; } else if (dist - Rt < wP) { status = '<b>Gerhana Bulan penumbra</b>: Bulan hanya masuk penumbra Bumi sehingga sedikit meredup dan sulit diamati.'; cls = 'penumbra'; } else { status = '<b>Tidak terjadi gerhana</b>: Bulan purnama lewat di atas atau di bawah bayangan Bumi.'; cls = 'tidak'; }
    }
    let s = `<svg viewBox="0 0 1000 380" role="img" aria-label="Simulasi ${ecMode === 'matahari' ? 'gerhana Matahari' : 'gerhana Bulan'}">`;
    s += `<defs><radialGradient id="ecSun" cx=".45" cy=".45"><stop offset="0" stop-color="#fff6d0"/><stop offset=".6" stop-color="#ffc23d"/><stop offset="1" stop-color="#f26b12"/></radialGradient>
      <linearGradient id="ecBeam" x1="0" x2="1"><stop offset="0" stop-color="#fff0c0" stop-opacity=".16"/><stop offset="1" stop-color="#fff0c0" stop-opacity=".04"/></linearGradient><clipPath id="ecClip"><rect x="-400" width="1800" height="380"/></clipPath></defs><g clip-path="url(#ecClip)">`;
    s += `<path d="M 95 100 L 1400 0 L 1400 380 L 95 280 Z" fill="url(#ecBeam)"/>`;
    s += `<circle cx="${S[0]}" cy="${S[1]}" r="95" fill="url(#ecSun)"/><text x="${S[0]}" y="${S[1] + 125}" fill="#ffd479" font-size="16" font-weight="800" text-anchor="middle">Matahari</text>`;
    const earth = (E, R) => `<circle cx="${E[0]}" cy="${E[1]}" r="${R}" fill="#1f63b0"/><path d="M ${E[0]} ${E[1] - R} A ${R} ${R} 0 0 1 ${E[0]} ${E[1] + R} Z" fill="#050817" opacity=".55"/><text x="${E[0]}" y="${E[1] + R + 22}" fill="#d6ecff" font-size="15" font-weight="800" text-anchor="middle">Bumi</text>`;
    const moonFill = ecMode === 'bulan' && cls === 'total' ? '#b8532c' : '#d9d2bd';
    const moon = (Mo, R) => `<circle cx="${Mo[0].toFixed(1)}" cy="${Mo[1].toFixed(1)}" r="${R}" fill="${moonFill}"/><text x="${Mo[0].toFixed(1)}" y="${(Mo[1] - R - 8).toFixed(1)}" fill="#f1ead6" font-size="15" font-weight="800" text-anchor="middle">Bulan</text>`;
    const poly = (arr, f, extra = '') => `<path d="M ${arr.map(pt).join(' L ')} Z" fill="${f}" ${extra}/>`;
    if (ecMode === 'matahari') {
      s += earth(st.E, st.Re);
      s += poly(pen, 'rgba(10,14,35,.55)', 'stroke="rgba(170,190,255,.5)" stroke-dasharray="6 5"');
      if (dU < Tlen) s += poly(ant, 'rgba(10,14,35,.35)', 'stroke="rgba(255,200,120,.6)" stroke-dasharray="3 4"');
      if (cls === 'cincin') { const pa = P(dU + 8, -Rb * 0.9 - 6); s += `<text x="${pa[0].toFixed(1)}" y="${pa[1].toFixed(1)}" fill="#ffd38a" font-size="13" font-weight="800">antumbra</text>`; }
      s += poly(umb, 'rgba(0,0,0,.92)', 'stroke="#9aa7d6" stroke-width="1.2"');
      s += moon(st.Mo, st.Rm);
      s += `<path d="M ${st.Mo[0]} ${st.Mo[1] - st.Rm} A ${st.Rm} ${st.Rm} 0 0 1 ${st.Mo[0]} ${st.Mo[1] + st.Rm} Z" fill="#2a2f45"/>`;
    } else {
      s += poly(pen, 'rgba(10,14,35,.5)', 'stroke="rgba(170,190,255,.5)" stroke-dasharray="6 5"');
      s += poly(umb, 'rgba(0,0,0,.72)', 'stroke="#9aa7d6" stroke-width="1.2"');
      s += earth(st.E, st.Re);
      s += moon(st.Mo, st.Rm);
      if (cls !== 'total') s += `<clipPath id="ecMoonClip"><circle cx="${st.Mo[0].toFixed(1)}" cy="${st.Mo[1].toFixed(1)}" r="${st.Rm}"/></clipPath><g clip-path="url(#ecMoonClip)">${poly(pen, 'rgba(0,0,0,.28)')}${poly(umb, 'rgba(40,8,0,.7)')}</g>`;
    }
    const lblP = P(Math.min(t, 300) * 0.55 + 60, Rb + (Math.min(t, 300) * 0.55 + 60) * k - 14);
    s += `<text x="${lblP[0].toFixed(1)}" y="${lblP[1].toFixed(1)}" fill="#c3cdf5" font-size="14" font-weight="800" text-anchor="middle">penumbra</text>`;
    const lblU = P(Math.min(dU, 300) * 0.35, 0);
    s += `<text x="${lblU[0].toFixed(1)}" y="${(lblU[1] + 5).toFixed(1)}" fill="#fff" font-size="13" font-weight="800" text-anchor="middle" paint-order="stroke" stroke="#000" stroke-width="3">umbra</text>`;
    s += `<line x1="-400" y1="190" x2="1400" y2="190" stroke="rgba(255,255,255,.15)" stroke-dasharray="2 6"/><text x="215" y="182" fill="#aeb9de" font-size="13">bidang orbit Bumi</text></g>`;
    s += '</svg>';
    $('#ecSvg').innerHTML = s;
    const pos = ecMode === 'matahari' ? 'Susunan: Matahari – <b>Bulan</b> – Bumi (fase Bulan baru).' : 'Susunan: Matahari – <b>Bumi</b> – Bulan (fase purnama).';
    $('#ecStatus').innerHTML = `${pos}<br>${status}`;
    $('#ecStatus').dataset.state = cls;
  }
  function buildGerhana() {
    $('#ecRange').addEventListener('input', drawEclipse);
    $('#ecFar').addEventListener('change', drawEclipse);
    $('#ecMode').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      ecMode = b.dataset.m;
      $$('#ecMode button').forEach((x) => x.classList.toggle('on', x === b));
      $('#ecFarWrap').hidden = ecMode !== 'matahari';
      drawEclipse();
    });
    drawEclipse();
  }

  const BUILD = { tatasurya: buildTataSurya, kelompok: buildKelompok, ukuran: buildUkuran, kecil: buildKecil, bumi: buildBumi, bulan: buildBulan, gerhana: buildGerhana };

  $('#subnav').addEventListener('click', (e) => { const b = e.target.closest('[data-mt]'); if (b) showPanel(b.dataset.mt); });

  // hook uji
  Object.assign(window.__MOD, {
    materi: (id) => { M.go('materi', id); return curPanel; },
    openPlanet: (id) => openPlanet(id),
    closeCard: () => { $('#planetModal').hidden = true; },
    cardText: () => ($('#planetModal').hidden ? null : $('#pcard').innerText),
    planets: () => D.PLANETS.map((p) => p.id),
    setMoonDay: (d) => { if (curPanel !== 'bulan' || M.current !== 'materi') M.go('materi', 'bulan'); $('#moonRange').value = d; drawMoon(d); return $('#moonName').textContent; },
    setSeasonDay: (d) => { if (curPanel !== 'bumi' || M.current !== 'materi') M.go('materi', 'bumi'); $('#bumiMode [data-m=revolusi]').click(); $('#revRange').value = d; drawRev(d); return $('#revInfo').innerText; },
    eclipse: (mode, off, far) => {
      if (curPanel !== 'gerhana' || M.current !== 'materi') M.go('materi', 'gerhana');
      $(`#ecMode [data-m="${mode}"]`).click(); $('#ecRange').value = off; $('#ecFar').checked = !!far; drawEclipse();
      return $('#ecStatus').dataset.state;
    },
    sizeMode: (m) => { if (curPanel !== 'ukuran' || M.current !== 'materi') M.go('materi', 'ukuran'); setSize(m); return sizeMode; },
    phasePath
  });
})();
