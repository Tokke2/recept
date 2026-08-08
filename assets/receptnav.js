/* ============================================================
   PLATS: /assets/receptnav.js  (assets-mappen i repo-roten)
   ============================================================
   FOKUSERAD RECEPTVY – Mitt Maskinkök
   ============================================================
   Laddas automatiskt av site.js på RECEPTSIDOR.

   SPEC: När man klickat in på ett recept ska det ENDAST finnas:
     ← Föregående recept   → Nästa recept
     🖨️ Skriv ut   📤 Dela   🏠 Startsida   👨‍🍳 Kockläge

   Allt annat flytande döljs (FAB-menyn, Till toppen, språkpillret)
   → 100% fokus på receptet. En elegant verktygsrad längst ner
   samlar exakt dessa sex funktioner.

   ✔ Pilarna bläddrar mellan recepten (A–Ö, samma ordning som
     receptsamlingen) – listan hämtas en gång och cachas per session
   ✔ Piltangenter ← → bläddrar också (när kockläget är stängt)
   ✔ Kockläge = stor mittknapp (viktigast vid spisen)
   ✔ Döljs vid utskrift
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_RECEPTNAV_LOADED) return;
  window.__MK_RECEPTNAV_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  /* ============================================================
     1) DÖLJ allt annat flytande – endast verktygsraden kvar
     ============================================================ */
  var css = document.createElement('style');
  css.id = 'mk-rnav-style';
  css.textContent =
    /* Dölj FAB, Till toppen, språkpiller på receptsidor */
    '#mk-fab,#mk-top,#mk-lang{display:none!important;}' +
    /* Luft i botten så raden inte täcker innehållet */
    'body{padding-bottom:86px!important;}' +

    /* ---------- Verktygsraden ---------- */
    '#mk-rnav{position:fixed;bottom:0;left:0;right:0;z-index:115;' +
      'background:rgba(44,62,80,.97);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
      'display:flex;align-items:stretch;justify-content:center;gap:2px;' +
      'padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px));' +
      'box-shadow:0 -6px 24px rgba(0,0,0,.3);font-family:Segoe UI,system-ui,sans-serif;}' +

    '#mk-rnav .rb{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;' +
      'background:none;border:none;color:#fff;cursor:pointer;text-decoration:none;' +
      'border-radius:12px;padding:7px 13px;min-width:56px;font-family:inherit;transition:background .14s,transform .1s;}' +
    '#mk-rnav .rb:hover{background:rgba(255,255,255,.12);}' +
    '#mk-rnav .rb:active{transform:scale(.94);}' +
    '#mk-rnav .rb .ic{font-size:1.35rem;line-height:1;}' +
    '#mk-rnav .rb .lb{font-size:.62rem;font-weight:700;opacity:.75;letter-spacing:.02em;white-space:nowrap;}' +
    '#mk-rnav .rb.off{opacity:.28;pointer-events:none;}' +

    /* Kockläge – stor huvudknapp i mitten */
    '#mk-rnav .rb.cook{background:linear-gradient(135deg,#e67e22,#f39c12);margin:0 8px;' +
      'padding:7px 22px;box-shadow:0 4px 14px rgba(230,126,34,.45);}' +
    '#mk-rnav .rb.cook:hover{background:linear-gradient(135deg,#d35400,#e67e22);}' +
    '#mk-rnav .rb.cook .ic{font-size:1.6rem;}' +
    '#mk-rnav .rb.cook .lb{opacity:1;font-size:.68rem;}' +

    /* Pilar – tydliga */
    '#mk-rnav .rb.arr .ic{font-size:1.5rem;font-weight:800;}' +

    '@media (max-width:480px){#mk-rnav .rb{padding:7px 9px;min-width:48px;}' +
      '#mk-rnav .rb.cook{padding:7px 16px;margin:0 4px;}}' +
    '@media print{#mk-rnav{display:none!important;}body{padding-bottom:0!important;}}';
  document.head.appendChild(css);

  /* ============================================================
     2) BYGG VERKTYGSRADEN
     ============================================================ */
  var bar = document.createElement('nav');
  bar.id = 'mk-rnav';
  bar.className = 'no-print';
  bar.setAttribute('aria-label', 'Receptnavigering');
  bar.innerHTML =
    '<a class="rb" id="rnHome" href="../recept.html" title="Till receptsamlingen">' +
      '<span class="ic">🏠</span><span class="lb">Startsida</span></a>' +
    '<button class="rb arr off" id="rnPrev" title="Föregående recept">' +
      '<span class="ic">←</span><span class="lb">Föregående</span></button>' +
    '<button class="rb cook" id="rnCook" title="Starta kockläget">' +
      '<span class="ic">👨‍🍳</span><span class="lb">Kockläge</span></button>' +
    '<button class="rb arr off" id="rnNext" title="Nästa recept">' +
      '<span class="ic">→</span><span class="lb">Nästa</span></button>' +
    '<button class="rb" id="rnPrint" title="Skriv ut (A4)">' +
      '<span class="ic">🖨️</span><span class="lb">Skriv ut</span></button>' +
    '<button class="rb" id="rnShare" title="Dela receptet">' +
      '<span class="ic">📤</span><span class="lb">Dela</span></button>';
  document.body.appendChild(bar);

  /* ---------- Kockläge ---------- */
  document.getElementById('rnCook').addEventListener('click', function () {
    var tries = 0;
    (function go() {
      if (window.__MK_COOK) window.__MK_COOK();
      else if (++tries < 20) setTimeout(go, 150);
    })();
  });

  /* ---------- Skriv ut ---------- */
  document.getElementById('rnPrint').addEventListener('click', function () {
    if (window.__MK_PRINT) window.__MK_PRINT();
    else window.print();
  });

  /* ---------- Dela ---------- */
  document.getElementById('rnShare').addEventListener('click', async function () {
    var meta = document.querySelector('meta[name="recept:namn"]');
    var title = meta ? meta.content + ' – Mitt Maskinkök' : document.title;
    if (navigator.share) {
      try { await navigator.share({ title: title, text: title, url: location.href }); } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(location.href);
        if (window.__MK_TOAST) window.__MK_TOAST('✅ Länk kopierad!');
      } catch (e) { prompt('Kopiera länken:', location.href); }
    }
  });

  /* ============================================================
     3) FÖREGÅENDE / NÄSTA – bläddra mellan recepten (A–Ö)
     ============================================================ */
  var myFile = decodeURIComponent(location.pathname.split('/').pop());

  async function fetchList() {
    var files = [];
    try {
      var parts = location.pathname.split('/').filter(Boolean);
      var user = location.hostname.split('.')[0];
      var repo = parts.length > 1 ? parts[0] : user + '.github.io';
      var res = await fetch('https://api.github.com/repos/' + user + '/' + repo + '/contents/recept?ref=main');
      if (res.ok) {
        files = (await res.json())
          .filter(function (i) { return i.type === 'file' && /\.html?$/i.test(i.name); })
          .map(function (i) { return i.name; })
          .sort(function (a, b) { return a.localeCompare(b, 'sv'); });
      }
    } catch (e) {}
    return files;
  }

  async function getList() {
    // Sessionscache (delas med relaterade-recept-modulen om möjligt)
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem('mk-rnav-list')); } catch (e) {}
    /* NYA RECEPT: om denna sida saknas i cachen är listan gammal
       (t.ex. recept nyss sparat via nytt-recept.html) → hämta färskt. */
    if (cached && cached.length && cached.indexOf(myFile) !== -1) return cached;

    var files = await fetchList();
    /* GitHub-API:t kan släpa efter någon minut efter en sparning –
       lägg då in denna sida på rätt A–Ö-plats lokalt så bläddringen
       fungerar direkt ändå. */
    if (files.length && files.indexOf(myFile) === -1 && /\.html?$/i.test(myFile)) {
      files.push(myFile);
      files.sort(function (a, b) { return a.localeCompare(b, 'sv'); });
    }
    if (files.length) {
      try { sessionStorage.setItem('mk-rnav-list', JSON.stringify(files)); } catch (e) {}
    }
    return files.length ? files : (cached || []);
  }

  var prevFile = null, nextFile = null;

  getList().then(function (files) {
    var i = files.indexOf(myFile);
    if (i === -1) return;
    prevFile = i > 0 ? files[i - 1] : null;
    nextFile = i < files.length - 1 ? files[i + 1] : null;

    var pb = document.getElementById('rnPrev');
    var nb = document.getElementById('rnNext');
    if (prevFile) {
      pb.classList.remove('off');
      pb.title = 'Föregående: ' + prevFile.replace(/\.html$/i, '').replace(/[-_]+/g, ' ');
      pb.addEventListener('click', function () { location.href = encodeURIComponent(prevFile); });
    }
    if (nextFile) {
      nb.classList.remove('off');
      nb.title = 'Nästa: ' + nextFile.replace(/\.html$/i, '').replace(/[-_]+/g, ' ');
      nb.addEventListener('click', function () { location.href = encodeURIComponent(nextFile); });
    }
  });

  /* ---------- Piltangenter (när inget kockläge/dialog är öppet) ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (document.querySelector('[style*="z-index:1000"], #mk-pd-bg')) return; // overlay öppet
    if (e.key === 'ArrowLeft' && prevFile) location.href = encodeURIComponent(prevFile);
    if (e.key === 'ArrowRight' && nextFile) location.href = encodeURIComponent(nextFile);
  });
})();
