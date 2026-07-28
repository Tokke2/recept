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
    '}' +
    '#mk-auto-qr{display:none;}' +
    /* Dialogens stil */
    '#mk-pd-bg{position:fixed;inset:0;background:rgba(44,62,80,.55);z-index:10001;display:flex;' +
      'align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .2s;}' +
    '#mk-pd-bg.in{opacity:1;}' +
    '#mk-pd{background:#fff;border-radius:20px;padding:26px 28px;max-width:430px;width:100%;' +
      'box-shadow:0 24px 60px rgba(0,0,0,.4);font-family:inherit;transform:translateY(10px);transition:transform .2s;}' +
    '#mk-pd-bg.in #mk-pd{transform:none;}' +
    '#mk-pd h3{font-family:Georgia,serif;font-size:1.25rem;color:#2c3e50;margin:0 0 4px;}' +
    '#mk-pd .sub{color:#7f8c8d;font-size:.85rem;margin-bottom:16px;}' +
    '#mk-pd .opt{display:flex;align-items:center;gap:14px;width:100%;background:#f6f3ee;border:2px solid transparent;' +
      'border-radius:14px;padding:14px 16px;margin-bottom:10px;cursor:pointer;text-align:left;font-family:inherit;transition:all .15s;}' +
    '#mk-pd .opt:hover{border-color:#e67e22;transform:translateX(3px);}' +
    '#mk-pd .opt .ic{font-size:1.5rem;}' +
    '#mk-pd .opt b{display:block;color:#2c3e50;font-size:.95rem;}' +
    '#mk-pd .opt small{color:#7f8c8d;font-size:.78rem;}' +
    '#mk-pd .cancel{background:none;border:none;color:#7f8c8d;font-size:.85rem;cursor:pointer;' +
      'margin-top:4px;font-family:inherit;width:100%;padding:8px;}' +
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

  function doPrint(mode) {
    prepare();
    document.body.classList.remove('mk-print-noimg', 'mk-print-ing');
    if (mode === 'noimg') document.body.classList.add('mk-print-noimg');
    if (mode === 'ing') document.body.classList.add('mk-print-ing');
    closeDialog();
    setTimeout(function () { window.print(); }, 60);
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

    dlg = document.createElement('div');
    dlg.id = 'mk-pd-bg';
    dlg.className = 'no-print';
    dlg.innerHTML =
      '<div id="mk-pd" role="dialog" aria-label="Utskriftsval">' +
        '<h3>🖨️ Skriv ut</h3>' +
        '<div class="sub">A4-format i kokboksstil. Välj vad som ska med:</div>' +
        '<button class="opt" data-mode="full"><span class="ic">📖</span><span><b>Hela sidan</b>' +
          '<small>Komplett med bilder – klassisk kokbokssida</small></span></button>' +
        '<button class="opt" data-mode="noimg"><span class="ic">🄼</span><span><b>Utan bilder</b>' +
          '<small>Sparar bläck – bara text och tabeller</small></span></button>' +
        (hasIng ? '<button class="opt" data-mode="ing"><span class="ic">🧾</span><span><b>Endast ingredienser</b>' +
          '<small>Perfekt som inköpslista till butiken</small></span></button>' : '') +
        '<button class="cancel">Avbryt (Esc)</button>' +
      '</div>';
    document.body.appendChild(dlg);
    requestAnimationFrame(function () { dlg.classList.add('in'); });

    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) closeDialog();
      var opt = e.target.closest('.opt');
      if (opt) doPrint(opt.getAttribute('data-mode'));
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
    document.body.classList.remove('mk-print-noimg', 'mk-print-ing');
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
