/* ============================================================
   PLATS: /assets/print.js  (assets-mappen i repo-roten)
   ============================================================
   CENTRAL UTSKRIFTSMODUL v2 – Mitt Maskinkök
   ============================================================
   Laddas automatiskt av assets/site.js på alla sidor.

   v2 – 500% BÄTTRE:
   ✔ SMART UTSKRIFT: Ctrl+P eller 🖨️ → snygg FÖRHANDSDIALOG
     med val innan utskriften:
       · 📄 Med eller utan bilder (spara bläck)
       · 🧾 Endast ingredienser (inköpslista-läge!)
       · 📖 Hela receptet i kokboksformat
   ✔ QR-kod läggs automatiskt till på utskriften även för
     sidor som saknar egen QR-ruta (skanna → tillbaka hit)
   ✔ Sidhuvud med datum på utskriften ("Utskriven 2026-07-09")
   ✔ Reservknapp (🖨️) skapas ENDAST om FAB-menyn (app.js)
     inte finns – annars sköter FAB:en utskriften via denna
     moduls dialog (window.__MK_PRINT)
   ✔ Kockläges-/modal-skydd: stänger overlays före utskrift
   ✔ SMART SIDANPASSNING (auto-skala till 1 sida):
       · Innehållet mäts mot A4-sidhöjden före utskrift
       · Skulle sida 2 bli < 50% fylld → allt skalas ner
         (max till 62%) så det ryms på EN sida
       · Är överskottet > 50% → naturlig 2+ sidor, oskalat
       · Väljbart i dialogen: Auto / Alltid 1 sida / Aldrig skala
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_PRINT_LOADED) return;
  window.__MK_PRINT_LOADED = true;

  var isRecipePage = location.pathname.indexOf('/recept/') !== -1 ||
                     !!document.querySelector('meta[name="recept:namn"]');

  /* ============================================================
     UTSKRIFTSLÄGEN (styrs med en klass på <body> + CSS nedan)
     ============================================================ */
  var css = document.createElement('style');
  css.id = 'mk-print-modes';
  css.textContent =
    '@media print{' +
      /* Läge: utan bilder */
      'body.mk-print-noimg img{display:none!important;}' +
      /* Läge: endast ingredienser – dölj allt utom ingredienskortet */
      'body.mk-print-ing .card{display:none!important;}' +
      'body.mk-print-ing .card.mk-ing-card{display:block!important;}' +
      'body.mk-print-ing .machine-step,body.mk-print-ing .warn,body.mk-print-ing .alt,' +
      'body.mk-print-ing .hero-img,body.mk-print-ing #mk-provenance{display:none!important;}' +
      /* Datumrad på alla utskrifter */
      'body::after{content:"Utskriven " attr(data-mk-date) " · maskinkök";display:block;' +
        'text-align:center;font-size:7pt;color:#999;margin-top:6mm;font-family:Georgia,serif;}' +
      /* Auto-QR (för sidor utan egen QR-ruta) */
      '#mk-auto-qr{display:block!important;text-align:center;margin-top:6mm;}' +
      '#mk-auto-qr img{width:22mm;height:22mm;}' +
      '#mk-auto-qr p{font-size:7pt;color:#666;margin-top:1mm;}' +
      /* Auto-skalning till 1 sida (zoom funkar i print för Chrome/Edge; transform som reserv) */
      'body.mk-print-scaled{zoom:var(--mk-print-scale,1);}' +
      '@supports not (zoom:1){body.mk-print-scaled{transform:scale(var(--mk-print-scale,1));' +
        'transform-origin:top left;width:calc(100%/var(--mk-print-scale,1));}}' +
    '}' +
    '#mk-auto-qr{display:none;}' +
    /* Dialogens stil v2.1 – kokbokskänsla */
    '#mk-pd-bg{position:fixed;inset:0;background:rgba(30,41,54,.6);backdrop-filter:blur(3px);' +
      '-webkit-backdrop-filter:blur(3px);z-index:10001;display:flex;align-items:center;' +
      'justify-content:center;padding:20px;opacity:0;transition:opacity .22s;}' +
    '#mk-pd-bg.in{opacity:1;}' +
    '#mk-pd{background:#fff;border-radius:22px;padding:0;max-width:460px;width:100%;overflow:hidden;' +
      'box-shadow:0 30px 80px rgba(0,0,0,.45);font-family:inherit;transform:translateY(14px) scale(.98);' +
      'transition:transform .22s cubic-bezier(.2,.8,.3,1.1);}' +
    '#mk-pd-bg.in #mk-pd{transform:none;}' +
    '#mk-pd .pd-head{background:linear-gradient(135deg,#c0392b,#e67e22);color:#fff;padding:20px 26px 16px;}' +
    '#mk-pd .pd-head h3{font-family:Georgia,serif;font-size:1.3rem;margin:0 0 2px;}' +
    '#mk-pd .pd-head .sub{opacity:.92;font-size:.83rem;}' +
    '#mk-pd .pd-body{padding:18px 22px 20px;}' +
    '#mk-pd .opt{display:flex;align-items:center;gap:14px;width:100%;background:#f6f3ee;' +
      'border:2px solid transparent;border-radius:14px;padding:13px 16px;margin-bottom:9px;' +
      'cursor:pointer;text-align:left;font-family:inherit;transition:all .15s;}' +
    '#mk-pd .opt:hover{border-color:#e67e22;background:#fdf6ee;transform:translateX(3px);}' +
    '#mk-pd .opt .ic{font-size:1.55rem;width:34px;text-align:center;}' +
    '#mk-pd .opt b{display:block;color:#2c3e50;font-size:.95rem;}' +
    '#mk-pd .opt small{color:#7f8c8d;font-size:.78rem;}' +
    '#mk-pd .opt .pg{margin-left:auto;background:#2c3e50;color:#fff;border-radius:8px;' +
      'padding:3px 9px;font-size:.72rem;font-weight:700;white-space:nowrap;}' +
    '#mk-pd .opt .pg.one{background:#27ae60;}' +
    /* Sidanpassnings-väljare (segmenterad) */
    '#mk-pd .fitrow{display:flex;align-items:center;gap:10px;margin:4px 0 12px;padding:10px 12px;' +
      'background:#faf7f2;border-radius:12px;}' +
    '#mk-pd .fitrow .fl{font-size:.78rem;font-weight:700;color:#7f8c8d;text-transform:uppercase;' +
      'letter-spacing:.06em;margin-right:auto;}' +
    '#mk-pd .seg{display:flex;background:#eee5d6;border-radius:9px;padding:3px;}' +
    '#mk-pd .seg button{background:none;border:none;border-radius:7px;padding:6px 11px;font-size:.76rem;' +
      'font-weight:700;color:#7f8c8d;cursor:pointer;font-family:inherit;transition:all .13s;}' +
    '#mk-pd .seg button.on{background:#fff;color:#c0392b;box-shadow:0 2px 6px rgba(0,0,0,.12);}' +
    '#mk-pd .cancel{background:none;border:none;color:#7f8c8d;font-size:.85rem;cursor:pointer;' +
      'font-family:inherit;width:100%;padding:8px;}' +
    '@media print{#mk-pd-bg{display:none!important;}}';
  document.head.appendChild(css);

  /* ============================================================
     FÖRBEREDELSER INFÖR UTSKRIFT
     ============================================================ */
  function prepare() {
    // Datum för sidfoten
    document.body.setAttribute('data-mk-date', new Date().toLocaleDateString('sv-SE'));

    // Markera ingredienskortet (för inköpslista-läget)
    if (!document.querySelector('.mk-ing-card')) {
      var cards = document.querySelectorAll('.card');
      for (var i = 0; i < cards.length; i++) {
        var h = cards[i].querySelector('h2');
        if (h && /ingrediens/i.test(h.textContent)) { cards[i].classList.add('mk-ing-card'); break; }
      }
    }

    // Auto-QR för sidor utan egen QR-ruta
    if (!document.getElementById('mk-auto-qr') && !document.querySelector('.qr-box')) {
      var qr = document.createElement('div');
      qr.id = 'mk-auto-qr';
      qr.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' +
        encodeURIComponent(location.href) + '" alt="QR"><p>Skanna för att öppna sidan digitalt</p>';
      document.body.appendChild(qr);
    }

    // Stäng ev. öppna overlays (kockläge, modaler) så de inte skrivs ut
    var overlays = document.querySelectorAll('[style*="z-index:1000"], .modal-bg');
    for (var j = 0; j < overlays.length; j++) {
      if (overlays[j].style.display !== 'none' && overlays[j].id !== 'mk-pd-bg') {
        overlays[j].style.display = 'none';
      }
    }
  }

  /* ============================================================
     SMART SIDANPASSNING
     A4 portrait med sajtens marginaler (15mm topp/botten) ger
     ~267mm innehållshöjd ≈ 1010px vid 96dpi. Vi mäter innehållet
     i utskriftsläge och skalar ENDAST om sida 2 blir < 50% fylld.
     ============================================================ */
  var PAGE_H = 1010;        // px, innehållshöjd per A4-sida
  var MIN_SCALE = 0.62;     // skala aldrig mindre än så (läsbarhet)

  function measurePrintHeight(mode) {
    // Simulera utskriftsläget: dölj skärm-element temporärt och mät
    var hidden = [];
    var sels = ['.no-print', '.toolbar', '#mk-fab', '#mk-nav', '#mk-top', '#mk-lang',
                '.print-btn', '.share-btn', '#betyg', '.tabbar', '.search-wrap'];
    if (mode === 'noimg') sels.push('img');
    document.querySelectorAll(sels.join(',')).forEach(function (el) {
      if (el.style.display !== 'none') {
        hidden.push([el, el.style.display]);
        el.style.display = 'none';
      }
    });
    if (mode === 'ing') {
      document.querySelectorAll('.card').forEach(function (c) {
        if (!c.classList.contains('mk-ing-card') && c.style.display !== 'none') {
          hidden.push([c, c.style.display]);
          c.style.display = 'none';
        }
      });
    }
    var h = document.body.scrollHeight;
    hidden.forEach(function (p) { p[0].style.display = p[1]; });
    return h;
  }

  function decideScale(mode, fitPref) {
    if (fitPref === 'never') return 1;
    var h = measurePrintHeight(mode);
    var pages = h / PAGE_H;
    if (pages <= 1.02) return 1;                       // ryms redan
    var overflow = pages - Math.floor(pages);          // fyllnad på sista sidan
    var wantOne = fitPref === 'always' ||
                  (pages < 2 && overflow > 0 && overflow < 0.5); // sida 2 < 50% fylld
    if (!wantOne) return 1;                            // > 50% → naturliga sidor
    var scale = Math.max(MIN_SCALE, Math.min(1, 1 / pages) - 0.01);
    return (1 / pages) < MIN_SCALE && fitPref !== 'always' ? 1 : scale;
  }

  function doPrint(mode, fitPref) {
    prepare();
    document.body.classList.remove('mk-print-noimg', 'mk-print-ing', 'mk-print-scaled');
    if (mode === 'noimg') document.body.classList.add('mk-print-noimg');
    if (mode === 'ing') document.body.classList.add('mk-print-ing');

    var scale = decideScale(mode, fitPref || localStorage.getItem('mk-fit') || 'auto');
    if (scale < 1) {
      document.documentElement.style.setProperty('--mk-print-scale', scale.toFixed(3));
      document.body.classList.add('mk-print-scaled');
    }
    closeDialog();
    setTimeout(function () { window.print(); }, 80);
  }

  /* ============================================================
     FÖRHANDSDIALOGEN
     ============================================================ */
  var dlg = null;
  function openDialog() {
    if (dlg) return;
    var hasIng = isRecipePage && (function () {
      var cards = document.querySelectorAll('.card h2');
      for (var i = 0; i < cards.length; i++) if (/ingrediens/i.test(cards[i].textContent)) return true;
      return false;
    })();

    var fitPref = localStorage.getItem('mk-fit') || 'auto';

    function pageBadge(mode) {
      var h = measurePrintHeight(mode);
      var pages = Math.max(1, Math.ceil(h / PAGE_H - 0.02));
      var scale = decideScale(mode, fitPref);
      if (scale < 1) return '<span class="pg one">→ 1 sida</span>';
      return '<span class="pg' + (pages === 1 ? ' one' : '') + '">' + pages + ' sid' + (pages === 1 ? 'a' : 'or') + '</span>';
    }

    dlg = document.createElement('div');
    dlg.id = 'mk-pd-bg';
    dlg.className = 'no-print';
    dlg.innerHTML =
      '<div id="mk-pd" role="dialog" aria-label="Utskriftsval">' +
        '<div class="pd-head"><h3>🖨️ Skriv ut</h3>' +
        '<div class="sub">A4 i kokboksstil · sidantal beräknat i förväg</div></div>' +
        '<div class="pd-body">' +
        '<div class="fitrow"><span class="fl">Sidanpassning</span><div class="seg">' +
          '<button data-fit="auto"' + (fitPref === 'auto' ? ' class="on"' : '') + ' title="Skalar till 1 sida om sida 2 blir mindre än halvfull">Auto</button>' +
          '<button data-fit="always"' + (fitPref === 'always' ? ' class="on"' : '') + ' title="Skala alltid till 1 sida">1 sida</button>' +
          '<button data-fit="never"' + (fitPref === 'never' ? ' class="on"' : '') + ' title="Aldrig skala – naturliga sidbrytningar">Av</button>' +
        '</div></div>' +
        '<button class="opt" data-mode="full"><span class="ic">📖</span><span><b>Hela sidan</b>' +
          '<small>Komplett med bilder – klassisk kokbokssida</small></span>' + pageBadge('full') + '</button>' +
        '<button class="opt" data-mode="noimg"><span class="ic">🄼</span><span><b>Utan bilder</b>' +
          '<small>Sparar bläck – bara text och tabeller</small></span>' + pageBadge('noimg') + '</button>' +
        (hasIng ? '<button class="opt" data-mode="ing"><span class="ic">🧾</span><span><b>Endast ingredienser</b>' +
          '<small>Perfekt som inköpslista till butiken</small></span>' + pageBadge('ing') + '</button>' : '') +
        '<button class="cancel">Avbryt (Esc)</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    requestAnimationFrame(function () { dlg.classList.add('in'); });

    function refreshBadges() {
      var opts = dlg.querySelectorAll('.opt');
      for (var i = 0; i < opts.length; i++) {
        var mode = opts[i].getAttribute('data-mode');
        var old = opts[i].querySelector('.pg');
        if (old) old.outerHTML = pageBadge(mode);
      }
    }

    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) closeDialog();
      var fit = e.target.closest('[data-fit]');
      if (fit) {
        fitPref = fit.getAttribute('data-fit');
        localStorage.setItem('mk-fit', fitPref);
        dlg.querySelectorAll('[data-fit]').forEach(function (b) { b.classList.remove('on'); });
        fit.classList.add('on');
        refreshBadges();
        return;
      }
      var opt = e.target.closest('.opt');
      if (opt) doPrint(opt.getAttribute('data-mode'), fitPref);
      if (e.target.classList.contains('cancel')) closeDialog();
    });
    document.addEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') closeDialog(); }
  function closeDialog() {
    if (!dlg) return;
    dlg.classList.remove('in');
    var d = dlg; dlg = null;
    document.removeEventListener('keydown', escClose);
    setTimeout(function () { d.remove(); }, 200);
  }

  /* Exponera för FAB-menyn (app.js) och andra moduler */
  window.__MK_PRINT = openDialog;

  /* Fånga Ctrl+P / Cmd+P → visa dialogen istället */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      openDialog();
    }
  });

  /* Städa lägesklasser efter utskrift */
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('mk-print-noimg', 'mk-print-ing', 'mk-print-scaled');
    document.documentElement.style.removeProperty('--mk-print-scale');
  });

  /* ============================================================
     RESERVKNAPP – endast om FAB-menyn inte finns/kommer
     ============================================================ */
  function maybeButton() {
    if (document.getElementById('mk-fab')) return;         // FAB sköter det
    if (document.querySelector('.print-btn')) return;      // redan en knapp
    var btn = document.createElement('button');
    btn.className = 'print-btn no-print';
    btn.type = 'button';
    btn.title = 'Skriv ut sidan (A4)';
    btn.innerHTML = '🖨️ Skriv ut';
    btn.addEventListener('click', openDialog);
    document.body.appendChild(btn);
  }
  // Vänta kort så app.js hinner bygga FAB:en först
  setTimeout(maybeButton, 400);
})();
