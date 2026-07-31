/* ============================================================
   PLATS: /assets/kokbok.js  (assets-mappen i repo-roten)
   ============================================================
   KOKBOKSUTSKRIFT – Mitt Maskinkök
   ============================================================
   På receptsamlingen (recept.html): knappen "📕 Kokbok" startar
   väljarläget – bocka för recepten du vill ha → 🖨️ Skriv ut.

   Utskriften byggs ihop automatiskt:
     · Omslag (titel, datum, antal recept)
     · Innehållsförteckning med sidnummer-ordning
     · Ett recept per uppslag (sidbrytning mellan recepten)
     · Samma design som recepten – ingredienser alltid överst

   Allt sker i webbläsaren (dold iframe) – ingen server behövs.
   Laddas automatiskt av site.js på recept.html.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_KOKBOK_LOADED) return;
  window.__MK_KOKBOK_LOADED = true;

  /* Endast på receptsamlingen */
  if (!/recept\.html$/i.test(location.pathname) &&
      !document.getElementById('grid')) return;

  var selecting = false;
  var chosen = {};           // fil → {namn, emoji}

  /* ---------- Stilar ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.mk-kb-btn{background:#8e44ad;color:#fff;border:none;border-radius:10px;padding:11px 18px;' +
      'font-weight:700;font-size:.92rem;cursor:pointer;font-family:inherit;white-space:nowrap;}' +
    '.mk-kb-btn:hover{background:#7d3c98;}' +
    'body.mk-kb-val .rcard{position:relative;}' +
    'body.mk-kb-val .rcard .mk-kb-check{display:flex;}' +
    '.mk-kb-check{display:none;position:absolute;top:10px;left:10px;z-index:5;width:34px;height:34px;' +
      'border-radius:50%;background:#fff;border:3px solid #8e44ad;align-items:center;justify-content:center;' +
      'font-size:1.1rem;font-weight:800;color:transparent;box-shadow:0 2px 8px rgba(0,0,0,.25);}' +
    '.rcard.mk-kb-on .mk-kb-check{background:#8e44ad;color:#fff;}' +
    '.rcard.mk-kb-on{outline:3px solid #8e44ad;outline-offset:2px;}' +
    '#mk-kb-bar{position:fixed;left:0;right:0;bottom:0;z-index:125;background:#8e44ad;color:#fff;' +
      'display:none;align-items:center;gap:12px;padding:12px 18px;flex-wrap:wrap;' +
      'box-shadow:0 -4px 16px rgba(0,0,0,.25);font-family:Segoe UI,system-ui,sans-serif;}' +
    'body.mk-kb-val #mk-kb-bar{display:flex;}' +
    '#mk-kb-bar b{font-size:.95rem;}' +
    '#mk-kb-bar button{border:none;border-radius:10px;padding:10px 18px;font-weight:700;' +
      'font-size:.88rem;cursor:pointer;font-family:inherit;}' +
    '#mk-kb-print{background:#fff;color:#8e44ad;}' +
    '#mk-kb-all{background:rgba(255,255,255,.2);color:#fff;}' +
    '#mk-kb-cancel{background:rgba(0,0,0,.25);color:#fff;margin-left:auto;}' +
    '@media print{#mk-kb-bar,.mk-kb-check{display:none!important;}}';
  document.head.appendChild(css);

  /* ---------- Kokbok-knapp i verktygsraden ---------- */
  function addButton() {
    var row = document.querySelector('.toolrow');
    if (!row || document.getElementById('mk-kb-start')) return;
    var b = document.createElement('button');
    b.id = 'mk-kb-start';
    b.className = 'mk-kb-btn no-print';
    b.textContent = '📕 Kokbok';
    b.title = 'Välj recept och skriv ut som kokbok';
    b.onclick = toggleSelect;
    row.appendChild(b);
  }

  /* ---------- Bottenrad ---------- */
  function addBar() {
    if (document.getElementById('mk-kb-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'mk-kb-bar';
    bar.className = 'no-print';
    bar.innerHTML =
      '<b id="mk-kb-count">0 valda recept</b>' +
      '<button id="mk-kb-print">🖨️ Skriv ut kokboken</button>' +
      '<button id="mk-kb-all">☑️ Välj alla synliga</button>' +
      '<button id="mk-kb-cancel">✕ Avbryt</button>';
    document.body.appendChild(bar);
    bar.querySelector('#mk-kb-print').onclick = printBook;
    bar.querySelector('#mk-kb-all').onclick = selectAllVisible;
    bar.querySelector('#mk-kb-cancel').onclick = toggleSelect;
  }

  function toggleSelect() {
    selecting = !selecting;
    document.body.classList.toggle('mk-kb-val', selecting);
    if (selecting) {
      decorateCards();
      if (window.__MK_TOAST) window.__MK_TOAST('📕 Bocka för recepten du vill ha i kokboken!');
    } else {
      chosen = {};
      updateCount();
      document.querySelectorAll('.rcard.mk-kb-on').forEach(function (c) { c.classList.remove('mk-kb-on'); });
    }
  }

  /* ---------- Kryssrutor på korten (överlever omritning) ---------- */
  function decorateCards() {
    document.querySelectorAll('.rcard').forEach(function (card) {
      if (!card.querySelector('.mk-kb-check')) {
        var chk = document.createElement('span');
        chk.className = 'mk-kb-check';
        chk.textContent = '✓';
        card.appendChild(chk);
      }
      var file = decodeURIComponent((card.getAttribute('href') || '').split('/').pop());
      card.classList.toggle('mk-kb-on', !!chosen[file]);
    });
  }

  /* Klick på kort i väljarläge = bocka i/ur (inte öppna) */
  document.addEventListener('click', function (e) {
    if (!selecting) return;
    var card = e.target.closest && e.target.closest('.rcard');
    if (!card) return;
    e.preventDefault();
    var href = card.getAttribute('href') || '';
    var file = decodeURIComponent(href.split('/').pop());
    if (/\.pdf$/i.test(file)) {
      if (window.__MK_TOAST) window.__MK_TOAST('📄 PDF-recept kan inte ingå i kokboken – skriv ut det separat.');
      return;
    }
    if (chosen[file]) { delete chosen[file]; card.classList.remove('mk-kb-on'); }
    else {
      chosen[file] = {
        namn: (card.querySelector('h3') || {}).textContent || file,
        emoji: (card.querySelector('.big-emoji') || {}).textContent || '🍽️'
      };
      card.classList.add('mk-kb-on');
    }
    updateCount();
  }, true);

  function selectAllVisible() {
    document.querySelectorAll('.rcard').forEach(function (card) {
      var file = decodeURIComponent((card.getAttribute('href') || '').split('/').pop());
      if (/\.pdf$/i.test(file) || chosen[file]) return;
      chosen[file] = {
        namn: (card.querySelector('h3') || {}).textContent || file,
        emoji: (card.querySelector('.big-emoji') || {}).textContent || '🍽️'
      };
      card.classList.add('mk-kb-on');
    });
    updateCount();
  }

  function updateCount() {
    var n = Object.keys(chosen).length;
    var el = document.getElementById('mk-kb-count');
    if (el) el.textContent = n + ' ' + (n === 1 ? 'valt recept' : 'valda recept');
  }

  /* Omritning av rutnätet (sök/flik/sortering) → sätt tillbaka kryssen */
  var grid = document.getElementById('grid');
  if (grid) new MutationObserver(function () { if (selecting) decorateCards(); }).observe(grid, { childList: true });

  /* ============================================================
     BYGG & SKRIV UT KOKBOKEN
     ============================================================ */
  function cleanRecipeBody(doc) {
    /* Ta bort allt interaktivt/oönskat ur receptets body */
    var kill = ['script', 'link', '.no-print', '.qr-box', '#mk-betyg', 'footer'];
    kill.forEach(function (sel) {
      doc.querySelectorAll(sel).forEach(function (el) { el.remove(); });
    });
    /* Kort med betyg/anteckningar (innehåller textarea eller #stars) */
    doc.querySelectorAll('.card').forEach(function (c) {
      if (c.querySelector('textarea, #stars, .stars')) c.remove();
    });
    return doc.body.innerHTML;
  }

  async function printBook() {
    var files = Object.keys(chosen);
    if (!files.length) {
      if (window.__MK_TOAST) window.__MK_TOAST('Välj minst ett recept först! ☝️');
      return;
    }
    if (window.__MK_TOAST) window.__MK_TOAST('📕 Bygger kokboken (' + files.length + ' recept)...');

    /* Sortera A–Ö efter namn */
    files.sort(function (a, b) { return chosen[a].namn.localeCompare(chosen[b].namn, 'sv'); });

    var baseStyle = '';
    var sections = [];
    for (var i = 0; i < files.length; i++) {
      try {
        var html = await (await fetch('recept/' + encodeURIComponent(files[i]))).text();
        var doc = new DOMParser().parseFromString(html, 'text/html');
        if (!baseStyle) {
          var st = doc.querySelector('style');
          if (st) baseStyle = st.textContent;
        }
        sections.push(
          '<section class="mk-kb-recipe" id="r' + i + '">' + cleanRecipeBody(doc) + '</section>'
        );
      } catch (e) {
        sections.push('<section class="mk-kb-recipe"><h1>' + chosen[files[i]].namn + '</h1><p>⚠️ Kunde inte hämtas.</p></section>');
      }
    }

    var today = new Date().toLocaleDateString('sv-SE');
    var toc = files.map(function (f, i) {
      return '<div class="toc-row"><span class="toc-n">' + (i + 1) + '.</span> ' +
        chosen[f].emoji + ' ' + chosen[f].namn + '</div>';
    }).join('');

    var bookHtml =
      '<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8">' +
      '<title>Min kokbok – Mitt Maskinkök</title><style>' +
      baseStyle +
      /* Kokboks-tillägg */
      '@page{size:A4;margin:14mm;}' +
      'body{background:#fff!important;padding:0!important;max-width:none!important;' +
        '-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      '.mk-kb-recipe{page-break-before:always;}' +
      '.mk-kb-cover{page-break-after:always;text-align:center;padding-top:26vh;}' +
      '.mk-kb-cover .big{font-size:4rem;}' +
      '.mk-kb-cover h1{font-size:2.3rem;margin:12px 0 6px;' +
        'background:linear-gradient(135deg,#c0392b,#e67e22);color:#fff;display:inline-block;' +
        'padding:16px 38px;border-radius:18px;}' +
      '.mk-kb-cover p{color:#7f8c8d;font-size:1rem;margin-top:10px;}' +
      '.mk-kb-toc{page-break-after:always;padding-top:20px;}' +
      '.mk-kb-toc h2{font-size:1.5rem;border-bottom:3px double #c9b99a;padding-bottom:8px;margin-bottom:16px;}' +
      '.toc-row{font-size:1.05rem;padding:8px 4px;border-bottom:1px dotted #d5cbb8;}' +
      '.toc-n{display:inline-block;width:34px;font-weight:800;color:#c0392b;}' +
      '.hero-img{max-height:220px;}' +
      '</style></head><body>' +
      '<div class="mk-kb-cover"><div class="big">📕</div>' +
      '<h1>Min kokbok</h1>' +
      '<p>Mitt Maskinkök · ' + files.length + ' recept · ' + today + '</p>' +
      '<p style="font-size:.85rem;">Alla recept med exakt maskin, program och tid</p></div>' +
      '<div class="mk-kb-toc"><h2>📖 Innehåll</h2>' + toc + '</div>' +
      sections.join('') +
      '</body></html>';

    /* Dold iframe → skriv ut → städa */
    var frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    var fdoc = frame.contentDocument || frame.contentWindow.document;
    fdoc.open(); fdoc.write(bookHtml); fdoc.close();

    /* Vänta in bilder innan utskrift */
    setTimeout(function () {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { window.print(); }
      setTimeout(function () { frame.remove(); }, 60000);
    }, 900);
  }

  /* ---------- Init ---------- */
  function init() { addButton(); addBar(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
