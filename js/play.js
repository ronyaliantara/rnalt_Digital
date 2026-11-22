(() => {
  const { loadStore, normalizePhone, buildBuyerWhatsAppUrl } = window.LokaStore;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const safe = (s) => {
    const v = String(s || '').trim();
    return /^(javascript|vbscript):/i.test(v) || (/^data:/i.test(v) && !/^data:(image|video)\//i.test(v)) ? '' : v;
  };
  const isVideo = (s) => /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(s || '') || String(s || '').startsWith('data:video/');

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
  /* ================= Panel samping: UJI COBA GRATIS (game asli dalam Mode Coba) =================
     Game di folder games/ yang memakai mesin kuis (quiz-core) dibuka dengan ?coba=1:
     5 soal bawaan, Mode Guru terkunci, 1x per perangkat (diatur games/lokamain-license.js).
     Dimatikan per game lewat Aplikasi Admin (centang "Coba Main Gratis"). */
  const COBA_TIDAK_DUKUNG = ['ular-tangga', 'ekspedisi-kapal', 'modul-tata-surya'];
  const panel = $('coba-panel');
  const gu = safe(game.gameUrl);
  const slugM = String(gu || '').match(/^(?:\.?\/)?games\/([a-z0-9-]+)\/?(?:index\.html)?$/i);
  const isModul = game.kind === 'modul' || /^modul ajar/i.test(String(game.category || ''));
  const bisaCoba = !!slugM && game.trial !== false && !isModul && !COBA_TIDAK_DUKUNG.includes(slugM[1].toLowerCase());
  const posterSrc = cover || (!isVideo(media) ? media : '');
  const sudahDicoba = (() => {
    if (!slugM) return false;
    try { return !!(JSON.parse(localStorage.getItem('lokamain_coba_v1_' + slugM[1].toLowerCase())) || {}).selesai; } catch (_) { return false; }
  })();

  if (bisaCoba) {
    const url = `games/${slugM[1].toLowerCase()}/?coba=1`;
    panel.innerHTML = `
      <div class="demo-head">
        <p class="quiz-kicker">🎮 Uji coba gratis · game asli</p>
        <h2 class="coba-title">Coba main ${esc(game.title)} sekarang</h2>
      </div>
      <div class="coba-stage" id="coba-stage">
        ${posterSrc ? `<img src="${esc(posterSrc)}" alt="" class="coba-poster" loading="lazy" decoding="async">` : '<div class="coba-poster coba-poster-empty" aria-hidden="true">🎮</div>'}
        <button type="button" class="coba-play" id="coba-play" aria-label="Mulai uji coba gratis ${esc(game.title)}">
          <span class="coba-play-ico" aria-hidden="true">▶</span>
          <span>${sudahDicoba ? 'Uji coba sudah dipakai' : 'Coba Main Gratis'}</span>
        </button>
      </div>
      <div class="coba-tools" id="coba-tools" hidden>
        <button type="button" class="btn btn-sm btn-ghost-detail" id="coba-full">⛶ Layar penuh</button>
        <a class="btn btn-sm btn-ghost-detail" id="coba-tab" href="${esc(url)}" target="_blank" rel="noopener">↗ Buka di tab baru</a>
      </div>
      <ul class="coba-facts">
        <li>✅ Game yang <b>sama persis</b> dengan versi lengkap, langsung main tanpa daftar</li>
        <li>📝 Uji coba berisi <b>5 soal contoh</b>, 1× per perangkat</li>
        <li>🔐 Ganti soal sendiri (Mode Guru) tersedia di versi lengkap</li>
      </ul>
      <button type="button" class="btn btn-primary" id="coba-order">🛒 Pesan versi lengkap</button>`;

    const stage = $('coba-stage');
    const start = () => {
      // HP / layar kecil: buka game penuh satu layar (lebih nyaman daripada bingkai kecil).
      if (window.matchMedia('(max-width: 760px)').matches) { location.href = url; return; }
      stage.innerHTML = `<iframe src="${esc(url)}" title="Uji coba ${esc(game.title)}" allow="fullscreen; autoplay" allowfullscreen loading="eager"></iframe>`;
      stage.classList.add('is-playing');
      $('coba-tools').hidden = false;
      const fr = stage.querySelector('iframe');
      fr.addEventListener('load', () => { try { fr.focus(); } catch (_) { /* abaikan */ } }, { once: true });
    };
    $('coba-play').addEventListener('click', start);
    $('coba-full').addEventListener('click', () => {
      const fr = stage.querySelector('iframe') || stage;
      const req = fr.requestFullscreen || fr.webkitRequestFullscreen;
      if (req) Promise.resolve(req.call(fr)).catch(() => { location.href = url; }); else location.href = url;
    });
    $('coba-order').addEventListener('click', () => $('play-order').click());
  } else {
    // Game tanpa Mode Coba: tampilkan cuplikan + ajakan bertanya.
    const vid = isVideo(media) ? media : '';
    panel.innerHTML = `
      <div class="demo-head">
        <p class="quiz-kicker">🎬 Cuplikan game</p>
        <h2 class="coba-title">${esc(game.title)}</h2>
      </div>
      <div class="coba-stage">
        ${vid ? `<video src="${esc(vid)}"${posterSrc ? ` poster="${esc(posterSrc)}"` : ''} autoplay loop muted playsinline controls></video>`
          : posterSrc ? `<img src="${esc(posterSrc)}" alt="" class="coba-poster" loading="lazy" decoding="async">` : '<div class="coba-poster coba-poster-empty" aria-hidden="true">🎮</div>'}
      </div>
      <p class="coba-note">Uji coba gratis belum tersedia untuk ${isModul ? 'modul ajar' : 'game'} ini. Tanyakan contoh atau demo langsung ke Admin lewat WhatsApp.</p>
      <a class="btn btn-wa" href="${esc(buildBuyerWhatsAppUrl(game, settings))}" target="_blank" rel="noopener">Tanya via WhatsApp</a>
      <button type="button" class="btn btn-primary" id="coba-order">🛒 Pesan sekarang</button>`;
    $('coba-order').addEventListener('click', () => $('play-order').click());
  }
})();
