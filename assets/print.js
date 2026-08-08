/* ============================================================
   PLATS: /assets/print.js  (assets-mappen i repo-roten)
   ============================================================
   CENTRAL UTSKRIFTSMODUL v3 – Mitt Maskinkök
   ============================================================
   Laddas automatiskt av assets/site.js på alla sidor.

   v3 – 50000% BÄTTRE ÄN v2:
   ✔ LIVE FÖRHANDSGRANSKNING i dialogen: miniatyr av arket som
     uppdateras när du växlar läge/sidanpassning – du SER
     resultatet innan du skriver ut
   ✔ NYTT LÄGE "👨‍🍳 Kökskort": ingredienser + steg komprimerat
     på 1 sida – perfekt att ha vid spisen
   ✔ Kopiera som text 📋 (klistra in i SMS/anteckningar)
   ✔ Spara som PDF-tips inbyggt (visar vägen i dialogen)
   ✔ INGREDIENSER FLYTTAS ALLTID ÖVERST på utskriften
     (även om sidan skulle ha annan ordning)
   ✔ Bläckestimat per läge (🖤 låg/medel/hög)
   ✔ Exakt sidmätning med klon (påverkar inte synliga sidan =
     inget "blink" vid mätning som i v2)
   ✔ Allt från v2: sidanpassning 50%-regeln (Auto/1 sida/Av),
     lägen med/utan bilder + inköpslista, sidprognos-badges,
     auto-QR, datumrad, Ctrl+P-fångst, overlay-skydd,
     FAB-integration (window.__MK_PRINT), reservknapp
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_PRINT_LOADED) return;
  window.__MK_PRINT_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));

  /* ============================================================
     CSS: utskriftslägen + dialog v3
     ============================================================ */
  var css = document.createElement('style');
  css.id = 'mk-print-modes';
  css.textContent =
    '@media print{' +
      /* ===== v4: ENDAST RECEPTET – vitlista. Allt som inte är själva
         receptet (betyg, proveniens, maskinförslag, "Se även", energi-
         tabeller, anteckningar, QR-kort, framtida moduler...) döljs
         AUTOMATISKT eftersom bara .mk-keep-märkta element skrivs ut. */
      'body.mk-print-clean > *:not(.mk-keep):not(#mk-auto-qr){display:none!important;}' +
      'body.mk-print-noimg img{display:none!important;}' +
      /* Inköpslista: endast ingredienskortet */
      'body.mk-print-ing .card{display:none!important;}' +
      'body.mk-print-ing .card.mk-ing-card{display:block!important;}' +
      'body.mk-print-ing .machine-step,body.mk-print-ing .warn,body.mk-print-ing .alt,' +
      'body.mk-print-ing .tip,body.mk-print-ing .hero-img,body.mk-print-ing #mk-provenance{display:none!important;}' +
      /* Kökskort: ingredienser + steg, komprimerat, inga bilder/extra */
      'body.mk-print-cook .hero-img,body.mk-print-cook #mk-provenance,body.mk-print-cook .tip,' +
      'body.mk-print-cook .alt,body.mk-print-cook img{display:none!important;}' +
      'body.mk-print-cook .card{display:none!important;padding:3mm 4mm!important;}' +
      'body.mk-print-cook .card.mk-ing-card,body.mk-print-cook .card.mk-step-card{display:block!important;}' +
      'body.mk-print-cook{font-size:9pt!important;}' +
      'body.mk-print-cook header{padding:0 0 2mm 0!important;margin-bottom:2mm!important;}' +
      'body.mk-print-cook header h1{font-size:14pt!important;}' +
      'body.mk-print-cook td{padding:1mm 2mm!important;}' +
      'body.mk-print-cook ol li{margin-bottom:1mm!important;}' +
      /* QR bara på Hela/Utan bilder – kökskort & inköpslista = renast */
      'body.mk-print-cook #mk-auto-qr,body.mk-print-ing #mk-auto-qr{display:none!important;}' +
      /* Ingredienser ALLTID överst på utskrift (flex-ordning) */
      'body.mk-print-ordered{display:flex!important;flex-direction:column!important;}' +
      'body.mk-print-ordered > *{order:10;}' +
      'body.mk-print-ordered > header{order:1!important;}' +
      'body.mk-print-ordered > .warn{order:2!important;}' +
      'body.mk-print-ordered > .hero-img{order:3!important;}' +
      'body.mk-print-ordered > .card.mk-ing-card{order:4!important;}' +
      'body.mk-print-ordered > footer{order:99!important;}' +
      /* Snygga sidbrytningar: rubrik lämnas aldrig ensam, steg hålls ihop */
      'header{page-break-after:avoid;break-after:avoid;}' +
      'h2,h3{page-break-after:avoid;break-after:avoid;}' +
      'ol li,tr{page-break-inside:avoid;break-inside:avoid;}' +
      /* Kort HÖGRE än en sida får brytas inuti – annars uppstår
         nästan tomma sidor (kortet skjuts till nästa sida). */
      '.card.mk-tall{page-break-inside:auto!important;break-inside:auto!important;}' +
      /* Receptnamnet följer med i ingrediens- & stegrubriken om de
         hamnar på en annan sida än rubrikbandet. */
      '.mk-print-name{display:inline!important;font-weight:400;color:#555;}' +
      /* Datumrad + auto-QR */
      'body::after{content:"Utskriven " attr(data-mk-date) " · Mitt Maskinkök";display:block;' +
        'text-align:center;font-size:7pt;color:#999;margin-top:6mm;font-family:Georgia,serif;order:100;}' +
      '#mk-auto-qr{display:block!important;text-align:center;margin-top:6mm;order:98;}' +
      '#mk-auto-qr img{width:22mm;height:22mm;}' +
      '#mk-auto-qr p{font-size:7pt;color:#666;margin-top:1mm;}' +
      /* Skalning (zoom för Chrome/Edge, transform-reserv) */
      'body.mk-print-scaled{zoom:var(--mk-print-scale,1);}' +
      '@supports not (zoom:1){body.mk-print-scaled{transform:scale(var(--mk-print-scale,1));' +
        'transform-origin:top left;width:calc(100%/var(--mk-print-scale,1));}}' +
    '}' +
    '#mk-auto-qr{display:none;}' +
    '.mk-print-name{display:none;}' +   /* receptnamn i rubriker: endast vid utskrift */

    /* ---------- Dialog v3: tvåkolumn med förhandsgranskning ---------- */
    '#mk-pd-bg{position:fixed;inset:0;background:rgba(30,41,54,.62);backdrop-filter:blur(4px);' +
      '-webkit-backdrop-filter:blur(4px);z-index:10001;display:flex;align-items:center;' +
      'justify-content:center;padding:16px;opacity:0;transition:opacity .22s;}' +
    '#mk-pd-bg.in{opacity:1;}' +
    '#mk-pd{background:#fff;border-radius:22px;padding:0;max-width:640px;width:100%;overflow:hidden;' +
      'box-shadow:0 30px 80px rgba(0,0,0,.45);font-family:inherit;transform:translateY(14px) scale(.98);' +
      'transition:transform .22s cubic-bezier(.2,.8,.3,1.1);max-height:92vh;display:flex;flex-direction:column;}' +
    '#mk-pd-bg.in #mk-pd{transform:none;}' +
    '#mk-pd .pd-head{background:linear-gradient(135deg,#c0392b,#e67e22);color:#fff;padding:16px 24px 13px;flex-shrink:0;}' +
    '#mk-pd .pd-head h3{font-family:Georgia,serif;font-size:1.25rem;margin:0 0 2px;}' +
    '#mk-pd .pd-head .sub{opacity:.92;font-size:.8rem;}' +
    '#mk-pd .pd-cols{display:flex;overflow:hidden;flex:1;}' +
    '#mk-pd .pd-body{padding:14px 18px 16px;flex:1;overflow-y:auto;}' +
    /* Förhandsgranskning (höger kolumn) */
    '#mk-pd .pd-prev{width:190px;flex-shrink:0;background:#eee5d6;padding:16px 14px;display:flex;' +
      'flex-direction:column;align-items:center;gap:8px;overflow-y:auto;}' +
    '#mk-pd .pd-prev .pv-label{font-size:.68rem;font-weight:700;letter-spacing:.1em;color:#a5967e;text-transform:uppercase;}' +
    '#mk-pd .sheet{width:150px;height:212px;background:#fff;border-radius:3px;box-shadow:0 3px 10px rgba(0,0,0,.22);' +
      'padding:12px 10px;position:relative;flex-shrink:0;}' +
    '#mk-pd .sheet .ln{height:4px;border-radius:2px;background:#e8e2d6;margin-bottom:4px;}' +
    '#mk-pd .sheet .ln.t{background:#c0392b;height:7px;width:70%;margin:0 auto 6px;}' +
    '#mk-pd .sheet .ln.h{background:#e67e22;width:45%;}' +
    '#mk-pd .sheet .img-ph{height:34px;border-radius:3px;background:linear-gradient(135deg,#f3c98b,#eda75f);margin-bottom:5px;}' +
    '#mk-pd .sheet .pgnum{position:absolute;bottom:4px;right:8px;font-size:.55rem;color:#bbb;}' +
    '#mk-pd .ink{font-size:.7rem;color:#7f8c8d;display:flex;align-items:center;gap:5px;}' +
    /* Alternativ (vänster) */
    '#mk-pd .opt{display:flex;align-items:center;gap:12px;width:100%;background:#f6f3ee;' +
      'border:2px solid transparent;border-radius:13px;padding:11px 14px;margin-bottom:8px;' +
      'cursor:pointer;text-align:left;font-family:inherit;transition:all .15s;}' +
    '#mk-pd .opt:hover{border-color:#e67e22;background:#fdf6ee;transform:translateX(3px);}' +
    '#mk-pd .opt.sel{border-color:#c0392b;background:#fdf6ee;}' +
    '#mk-pd .opt .ic{font-size:1.4rem;width:30px;text-align:center;}' +
    '#mk-pd .opt b{display:block;color:#2c3e50;font-size:.92rem;}' +
    '#mk-pd .opt small{color:#7f8c8d;font-size:.75rem;}' +
    '#mk-pd .opt .pg{margin-left:auto;background:#2c3e50;color:#fff;border-radius:8px;' +
      'padding:3px 9px;font-size:.7rem;font-weight:700;white-space:nowrap;}' +
    '#mk-pd .opt .pg.one{background:#27ae60;}' +
    '#mk-pd .fitrow{display:flex;align-items:center;gap:10px;margin:2px 0 10px;padding:9px 12px;' +
      'background:#faf7f2;border-radius:12px;}' +
    '#mk-pd .fitrow .fl{font-size:.72rem;font-weight:700;color:#7f8c8d;text-transform:uppercase;' +
      'letter-spacing:.06em;margin-right:auto;}' +
    '#mk-pd .seg{display:flex;background:#eee5d6;border-radius:9px;padding:3px;}' +
    '#mk-pd .seg button{background:none;border:none;border-radius:7px;padding:5px 10px;font-size:.73rem;' +
      'font-weight:700;color:#7f8c8d;cursor:pointer;font-family:inherit;transition:all .13s;}' +
    '#mk-pd .seg button.on{background:#fff;color:#c0392b;box-shadow:0 2px 6px rgba(0,0,0,.12);}' +
    /* Åtgärdsrad */
    '#mk-pd .actions{display:flex;gap:8px;padding:12px 18px;border-top:1px solid #eee5d6;flex-shrink:0;flex-wrap:wrap;}' +
    '#mk-pd .go{flex:1;background:#c0392b;color:#fff;border:none;border-radius:12px;padding:13px;' +
      'font-size:1rem;font-weight:800;cursor:pointer;font-family:inherit;min-width:130px;}' +
    '#mk-pd .go:hover{background:#a93226;}' +
    '#mk-pd .side{background:#f0ebe3;color:#2c3e50;border:none;border-radius:12px;padding:13px 15px;' +
      'font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit;}' +
    '#mk-pd .side:hover{background:#e2d9cb;}' +
    '#mk-pd .pdftip{font-size:.7rem;color:#7f8c8d;width:100%;text-align:center;}' +
    '@media (max-width:560px){#mk-pd .pd-prev{display:none;}}' +
    '@media print{#mk-pd-bg{display:none!important;}}';
  document.head.appendChild(css);

  /* ============================================================
     FÖRBEREDELSER (datum, ing-kort, steg-kort, QR, overlays)
     ============================================================ */
  function markCards() {
    if (!document.querySelector('.mk-ing-card')) {
      var cards = document.querySelectorAll('.card');
      for (var i = 0; i < cards.length; i++) {
        var h = cards[i].querySelector('h2');
        if (h && /ingrediens/i.test(h.textContent)) { cards[i].classList.add('mk-ing-card'); break; }
      }
    }
    if (!document.querySelector('.mk-step-card')) {
      var cards2 = document.querySelectorAll('.card');
      for (var j = 0; j < cards2.length; j++) {
        var h2 = cards2[j].querySelector('h2');
        if (h2 && /(gör så här|steg|instruktion)/i.test(h2.textContent)) {
          cards2[j].classList.add('mk-step-card');
        }
      }
    }
  }

  /* ============================================================
     v4-VITLISTA: märk det som ÄR receptet med .mk-keep.
     Allt annat (betyg, proveniens, maskinförslag, "Se även",
     anteckningar, QR-kort, energitabeller, framtida moduler...)
     försvinner automatiskt ur utskriften – utan att någon
     behöver underhålla en dölj-lista.
     ============================================================ */
  function markKeep(root) {
    root = root || document;
    var kids = root.body ? root.body.children : root.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      var keep = false;
      var tag = el.tagName;
      /* Modul-element (id "mk-...") är per definition INTE receptet
         (energi, proveniens, betyg, maskinförslag, se-även...). */
      if (el.id && el.id.indexOf('mk-') === 0 && el.id !== 'mk-auto-qr') { el.classList.remove('mk-keep'); continue; }
      if (tag === 'HEADER') keep = true;                                /* rubrikband */
      else if (el.classList.contains('hero-img')) keep = true;          /* receptbild */
      else if (el.classList.contains('warn') || el.classList.contains('tip') ||
               el.classList.contains('alt')) keep = true;               /* varning/tips */
      else if (el.classList.contains('card')) {
        /* Kort behålls ENDAST om de är recept-innehåll:
           ingredienser, steg, näringsvärde eller maskinsteg.
           Kort med interaktivt innehåll (textarea, stjärnor, knappar)
           är per definition INTE receptet. */
        if (el.querySelector('textarea, input, select, button, .stars, #stars')) keep = false;
        else if (el.classList.contains('mk-ing-card') || el.classList.contains('mk-step-card')) keep = true;
        else if (el.querySelector('.machine-step, ol, table')) keep = true;
        else {
          var h2 = el.querySelector('h2');
          keep = !!(h2 && /(näring|gör så här|steg|ingrediens|kostnad)/i.test(h2.textContent));
        }
      }
      el.classList.toggle('mk-keep', keep);
    }
  }

  function prepare() {
    document.body.setAttribute('data-mk-date', new Date().toLocaleDateString('sv-SE'));
    markCards();
    if (isRecipePage) markKeep();

    /* Receptnamnet med i Ingrediens-/Gör så här-rubrikerna på pappret
       ("🧾 Ingredienser – Äppelsmulpaj") så sidor utan rubrikband
       aldrig blir anonyma. Läggs bara till en gång. */
    var nameMeta = document.querySelector('meta[name="recept:namn"]');
    var rName = nameMeta ? nameMeta.content :
      (document.querySelector('header h1') || { textContent: '' }).textContent
        .replace(/^[\u{1F000}-\u{1FAFF}\u2600-\u27BF\uFE0F\s]+/u, '').trim();
    if (rName) {
      document.querySelectorAll('.card.mk-keep h2, .card.mk-ing-card h2, .card.mk-step-card h2').forEach(function (h) {
        if (!h.querySelector('.mk-print-name')) {
          var s = document.createElement('span');
          s.className = 'mk-print-name';
          s.textContent = ' – ' + rName;
          h.appendChild(s);
        }
      });
    }

    /* Kort högre än ~en A4-sida måste få brytas inuti, annars skjuts
       de till nästa sida och lämnar en nästan tom sida efter sig. */
    document.querySelectorAll('.card').forEach(function (c) {
      c.classList.toggle('mk-tall', c.scrollHeight > 900);
    });
    /* v4: på receptsidor rensas gamla QR-kort bort av vitlistan,
       så auto-QR:n (liten, i sidfoten) behövs alltid där. */
    if (!document.getElementById('mk-auto-qr') && (isRecipePage || !document.querySelector('.qr-box'))) {
      var qr = document.createElement('div');
      qr.id = 'mk-auto-qr';
      qr.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' +
        encodeURIComponent(location.href) + '" alt="QR"><p>Skanna för att öppna sidan digitalt</p>';
      document.body.appendChild(qr);
    }
    var overlays = document.querySelectorAll('[style*="z-index:1000"], .modal-bg');
    for (var j = 0; j < overlays.length; j++) {
      if (overlays[j].style.display !== 'none' && overlays[j].id !== 'mk-pd-bg') {
        overlays[j].style.display = 'none';
      }
    }
  }

  /* ============================================================
     SIDMÄTNING v3 – via osynlig KLON (inget blink på sidan!)
     ============================================================ */
  var PAGE_H = 1010;      // px innehållshöjd per A4-sida (96dpi, 15mm marginal)
  var MIN_SCALE = 0.62;
  var measureCache = {};

  function measurePrintHeight(mode) {
    if (measureCache[mode] !== undefined) return measureCache[mode];
    markCards();
    if (isRecipePage) markKeep();
    var clone = document.body.cloneNode(true);
    clone.style.cssText = 'position:absolute;left:-99999px;top:0;width:794px;visibility:hidden;';
    // Ta bort skärm-element ur klonen
    var sels = '.no-print,.toolbar,#mk-fab,#mk-nav,#mk-top,#mk-lang,.print-btn,.share-btn,#betyg,.tabbar,.search-wrap,#mk-rnav,#mk-pd-bg,script,style';
    clone.querySelectorAll(sels).forEach(function (el) { el.remove(); });
    // v4: på receptsidor mäts ENDAST vitlistan (samma som skrivs ut)
    if (isRecipePage) {
      var kids = Array.prototype.slice.call(clone.children);
      kids.forEach(function (el) {
        if (!el.classList.contains('mk-keep') && el.id !== 'mk-auto-qr') el.remove();
      });
    }
    if (mode === 'noimg' || mode === 'cook') clone.querySelectorAll('img').forEach(function (el) { el.remove(); });
    if (mode === 'ing') {
      clone.querySelectorAll('.card:not(.mk-ing-card),.machine-step,.warn,.alt,.tip,.hero-img').forEach(function (el) { el.remove(); });
    }
    if (mode === 'cook') {
      clone.querySelectorAll('.card:not(.mk-ing-card):not(.mk-step-card),.tip,.alt,.hero-img').forEach(function (el) { el.remove(); });
    }
    document.body.appendChild(clone);
    var h = clone.scrollHeight * (mode === 'cook' ? 0.72 : 1); // cook-läget komprimerar typografin
    clone.remove();
    measureCache[mode] = h;
    return h;
  }

  function decideScale(mode, fitPref) {
    if (fitPref === 'never') return 1;
    var pages = measurePrintHeight(mode) / PAGE_H;
    if (pages <= 1.02) return 1;
    var overflow = pages - Math.floor(pages);
    /* v4 AUTO: skala till närmaste HELA sidantal när sista sidan är
       mindre än halvfull – 1,4 sidor→1, 2,3 sidor→2 osv. (50%-regeln
       gällde tidigare bara 1–2 sidor, nu alla). */
    var target = null;
    if (fitPref === 'always') target = 1;
    else if (overflow > 0.02 && overflow < 0.5) target = Math.floor(pages);
    if (!target) return 1;
    var scale = Math.max(MIN_SCALE, Math.min(1, target / pages) - 0.005);
    return (target / pages) < MIN_SCALE && fitPref !== 'always' ? 1 : scale;
  }

  function pagesFor(mode, fitPref) {
    var scale = decideScale(mode, fitPref);
    return Math.max(1, Math.ceil(measurePrintHeight(mode) * scale / PAGE_H - 0.02));
  }

  /* ============================================================
     UTSKRIFT
     ============================================================ */
  function doPrint(mode, fitPref) {
    prepare();
    document.body.classList.remove('mk-print-noimg', 'mk-print-ing', 'mk-print-cook', 'mk-print-scaled', 'mk-print-ordered', 'mk-print-clean');
    if (mode === 'noimg') document.body.classList.add('mk-print-noimg');
    if (mode === 'ing') document.body.classList.add('mk-print-ing');
    if (mode === 'cook') document.body.classList.add('mk-print-cook');
    if (isRecipePage) document.body.classList.add('mk-print-clean'); // v4: endast receptet (vitlista)
    document.body.classList.add('mk-print-ordered'); // ingredienser alltid överst
    var scale = decideScale(mode, fitPref || localStorage.getItem('mk-fit') || 'auto');
    if (scale < 1) {
      document.documentElement.style.setProperty('--mk-print-scale', scale.toFixed(3));
      document.body.classList.add('mk-print-scaled');
    }
    closeDialog();
    setTimeout(function () { window.print(); }, 80);
  }

  window.addEventListener('afterprint', function () {
    document.body.classList.remove('mk-print-noimg', 'mk-print-ing', 'mk-print-cook', 'mk-print-scaled', 'mk-print-ordered', 'mk-print-clean');
    document.documentElement.style.removeProperty('--mk-print-scale');
    measureCache = {};
  });

  /* ============================================================
     KOPIERA SOM TEXT (för SMS/anteckningar)
     ============================================================ */
  function copyAsText() {
    markCards();
    var out = [];
    var title = document.querySelector('header h1');
    if (title) out.push(title.textContent.trim(), '');
    var ing = document.querySelector('.mk-ing-card');
    if (ing) {
      out.push('INGREDIENSER:');
      ing.querySelectorAll('tr').forEach(function (tr) {
        var tds = tr.querySelectorAll('td');
        if (tds.length >= 2) out.push('• ' + tds[0].textContent.trim() + ' – ' + tds[1].textContent.trim());
      });
      out.push('');
    }
    var n = 1;
    document.querySelectorAll('.card ol li, .machine-step ol li').forEach(function (li) {
      out.push(n + '. ' + li.textContent.trim());
      n++;
    });
    out.push('', location.href);
    var text = out.join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(function () {
        if (window.__MK_TOAST) window.__MK_TOAST('📋 Receptet kopierat som text!');
      })
      .catch(function () { prompt('Kopiera:', text); });
  }

  /* ============================================================
     DIALOGEN v3 – med live-förhandsgranskning
     ============================================================ */
  var dlg = null;

  function sheetHtml(mode, pages) {
    // Miniatyr av arket beroende på läge
    var lines = '';
    if (mode === 'ing') {
      lines = '<div class="ln t"></div><div class="ln h" style="width:55%;"></div>' +
        '<div class="ln"></div><div class="ln" style="width:88%;"></div><div class="ln" style="width:92%;"></div>' +
        '<div class="ln" style="width:85%;"></div><div class="ln" style="width:90%;"></div><div class="ln" style="width:80%;"></div>';
    } else if (mode === 'cook') {
      lines = '<div class="ln t"></div><div class="ln h" style="width:40%;"></div>' +
        '<div class="ln" style="width:85%;"></div><div class="ln" style="width:88%;"></div>' +
        '<div class="ln h" style="width:38%;margin-top:6px;"></div>' +
        '<div class="ln" style="width:92%;"></div><div class="ln" style="width:86%;"></div>' +
        '<div class="ln" style="width:90%;"></div><div class="ln" style="width:84%;"></div>';
    } else {
      lines = '<div class="ln t"></div>' +
        (mode === 'full' ? '<div class="img-ph"></div>' : '') +
        '<div class="ln h"></div><div class="ln" style="width:90%;"></div><div class="ln" style="width:85%;"></div>' +
        '<div class="ln h" style="width:38%;margin-top:5px;"></div>' +
        '<div class="ln" style="width:92%;"></div><div class="ln" style="width:88%;"></div><div class="ln" style="width:80%;"></div>';
    }
    return '<div class="sheet">' + lines + '<span class="pgnum">1/' + pages + '</span></div>';
  }

  function inkFor(mode) {
    if (mode === 'full') return '🖤🖤🖤 <span>Bläck: hög (bilder)</span>';
    if (mode === 'noimg') return '🖤🖤🤍 <span>Bläck: medel</span>';
    return '🖤🤍🤍 <span>Bläck: låg</span>';
  }

  function openDialog() {
    if (dlg) return;
    measureCache = {};
    markCards();
    var hasIng = !!document.querySelector('.mk-ing-card');
    var hasSteps = !!document.querySelector('.mk-step-card');
    var fitPref = localStorage.getItem('mk-fit') || 'auto';
    /* Minns senaste läget – men bara om det finns på denna sida */
    var selMode = localStorage.getItem('mk-print-mode') || 'full';
    if ((selMode === 'cook' && !(hasIng && hasSteps)) || (selMode === 'ing' && !hasIng)) selMode = 'full';

    function badge(mode) {
      var p = pagesFor(mode, fitPref);
      var scaled = decideScale(mode, fitPref) < 1;
      if (scaled) return '<span class="pg one">→ 1 sida</span>';
      return '<span class="pg' + (p === 1 ? ' one' : '') + '">' + p + ' sid' + (p === 1 ? 'a' : 'or') + '</span>';
    }

    dlg = document.createElement('div');
    dlg.id = 'mk-pd-bg';
    dlg.className = 'no-print';
    dlg.innerHTML =
      '<div id="mk-pd" role="dialog" aria-label="Utskriftsval">' +
        '<div class="pd-head"><h3>🖨️ Skriv ut</h3>' +
        '<div class="sub">A4 i kokboksstil · ✨ endast receptet skrivs ut (betyg, förslag m.m. rensas automatiskt) · ingredienser överst</div></div>' +
        '<div class="pd-cols">' +
        '<div class="pd-body">' +
          '<div class="fitrow"><span class="fl">Sidanpassning</span><div class="seg">' +
            '<button data-fit="auto"' + (fitPref === 'auto' ? ' class="on"' : '') + ' title="Skalar till 1 sida om sida 2 blir mindre än halvfull">Auto</button>' +
            '<button data-fit="always"' + (fitPref === 'always' ? ' class="on"' : '') + ' title="Skala alltid till 1 sida">1 sida</button>' +
            '<button data-fit="never"' + (fitPref === 'never' ? ' class="on"' : '') + ' title="Aldrig skala">Av</button>' +
          '</div></div>' +
          '<button class="opt" data-mode="full"><span class="ic">📖</span><span><b>Hela receptet</b>' +
            '<small>Med bild – ren kokbokssida</small></span>' + badge('full') + '</button>' +
          '<button class="opt" data-mode="noimg"><span class="ic">🄼</span><span><b>Utan bilder</b>' +
            '<small>Sparar bläck – text och tabeller</small></span>' + badge('noimg') + '</button>' +
          (hasIng && hasSteps ? '<button class="opt" data-mode="cook"><span class="ic">👨‍🍳</span><span><b>Kökskort</b>' +
            '<small>Ingredienser + steg komprimerat – för spisen</small></span>' + badge('cook') + '</button>' : '') +
          (hasIng ? '<button class="opt" data-mode="ing"><span class="ic">🧾</span><span><b>Endast ingredienser</b>' +
            '<small>Inköpslista till butiken</small></span>' + badge('ing') + '</button>' : '') +
        '</div>' +
        '<div class="pd-prev"><span class="pv-label">Förhandsvisning</span>' +
          '<div id="pv-sheet">' + sheetHtml('full', pagesFor('full', fitPref)) + '</div>' +
          '<div class="ink" id="pv-ink">' + inkFor('full') + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="go" id="pd-go">🖨️ Skriv ut</button>' +
          '<button class="side" id="pd-copy" title="Kopiera receptet som ren text">📋 Kopiera text</button>' +
          '<button class="side" id="pd-cancel">Avbryt</button>' +
          '<div class="pdftip">💡 Spara som PDF: klicka Skriv ut → välj "Spara som PDF" som skrivare</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    requestAnimationFrame(function () { dlg.classList.add('in'); });
    refresh();  /* markera ihågkommet läge + färska sidbadges direkt */

    function refresh() {
      dlg.querySelectorAll('.opt').forEach(function (o) {
        o.classList.toggle('sel', o.getAttribute('data-mode') === selMode);
        var old = o.querySelector('.pg');
        if (old) old.outerHTML = badge(o.getAttribute('data-mode'));
      });
      document.getElementById('pv-sheet').innerHTML = sheetHtml(selMode, pagesFor(selMode, fitPref));
      document.getElementById('pv-ink').innerHTML = inkFor(selMode);
    }

    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) return closeDialog();
      var fit = e.target.closest('[data-fit]');
      if (fit) {
        fitPref = fit.getAttribute('data-fit');
        localStorage.setItem('mk-fit', fitPref);
        dlg.querySelectorAll('[data-fit]').forEach(function (b) { b.classList.remove('on'); });
        fit.classList.add('on');
        refresh();
        return;
      }
      var opt = e.target.closest('.opt');
      if (opt) {
        selMode = opt.getAttribute('data-mode');
        try { localStorage.setItem('mk-print-mode', selMode); } catch (err) {}
        refresh(); return;
      }
      if (e.target.id === 'pd-go') doPrint(selMode, fitPref);
      if (e.target.id === 'pd-copy') { copyAsText(); }
      if (e.target.id === 'pd-cancel') closeDialog();
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

  /* Exponera + Ctrl/Cmd+P */
  window.__MK_PRINT = openDialog;
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      openDialog();
    }
  });

  /* Reservknapp endast om FAB saknas */
  function maybeButton() {
    if (document.getElementById('mk-fab')) return;
    if (document.getElementById('mk-rnav')) return;
    if (document.querySelector('.print-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'print-btn no-print';
    btn.type = 'button';
    btn.title = 'Skriv ut sidan (A4)';
    btn.innerHTML = '🖨️ Skriv ut';
    btn.addEventListener('click', openDialog);
    document.body.appendChild(btn);
  }
  setTimeout(maybeButton, 400);
})();
