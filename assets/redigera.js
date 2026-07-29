/* ============================================================
   PLATS: /assets/redigera.js  (assets-mappen i repo-roten)
   ============================================================
   RECEPTREDIGERING – Mitt Maskinkök
   ============================================================
   Laddas automatiskt av site.js på receptsidor.

   ✏️ REDIGERA-knapp i verktygsraden (eller flytande):
   → Redigeringsläge där du direkt på sidan kan:
      · Ändra ingrediensnamn & mängder ("10 g mjöl" → "10 g vatten")
      · Lägga till / ta bort ingrediensrader (+ / ✕)
      · Ändra stegtexterna, lägga till/ta bort steg
      · Ändra rubrik & beskrivning
   → Spara-alternativ:
      💾 Ladda ner uppdaterad fil (ersätt på GitHub = permanent)
      📤 Öppna filen på GitHub för direkt-redigering
      👁️ Ändringarna syns direkt på sidan (lokalt tills omladdning)

   Ren webbstandard (contentEditable) – ingen server behövs.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_EDIT_LOADED) return;
  window.__MK_EDIT_LOADED = true;

  var isRecipePage = location.pathname.indexOf('/recept/') !== -1;
  if (!isRecipePage) return;

  var editing = false;
  var GH_EDIT = 'https://github.com/Tokke2/recept/edit/main/recept/';

  /* ---------- Stilar ---------- */
  var css = document.createElement('style');
  css.textContent =
    /* Redigeringsläge: markera redigerbart */
    'body.mk-editing [contenteditable="true"]{outline:2px dashed #e67e22;outline-offset:2px;' +
      'border-radius:4px;min-width:30px;transition:background .12s;}' +
    'body.mk-editing [contenteditable="true"]:hover{background:#fdf6ee;}' +
    'body.mk-editing [contenteditable="true"]:focus{outline:2px solid #c0392b;background:#fff;}' +
    /* Rad-knappar i tabeller/listor */
    '.mk-rowbtn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;' +
      'border-radius:50%;border:none;cursor:pointer;font-size:.75rem;font-weight:800;margin-left:6px;' +
      'vertical-align:middle;font-family:inherit;}' +
    '.mk-rowbtn.del{background:#fdecea;color:#c0392b;}' +
    '.mk-rowbtn.del:hover{background:#c0392b;color:#fff;}' +
    '.mk-addrow{background:#eaf7ef;color:#27ae60;border:2px dashed #27ae60;border-radius:10px;' +
      'padding:7px 16px;font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px;}' +
    '.mk-addrow:hover{background:#27ae60;color:#fff;}' +
    /* Redigeringsbalk (toppen) */
    '#mk-editbar{position:fixed;top:0;left:0;right:0;z-index:130;background:#e67e22;color:#fff;' +
      'display:flex;align-items:center;gap:10px;padding:10px 16px;font-family:Segoe UI,system-ui,sans-serif;' +
      'box-shadow:0 4px 16px rgba(0,0,0,.25);flex-wrap:wrap;}' +
    '#mk-editbar b{font-size:.95rem;}' +
    '#mk-editbar .eb{border:none;border-radius:10px;padding:9px 16px;font-size:.85rem;font-weight:700;' +
      'cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px;}' +
    '#mk-editbar .save{background:#fff;color:#c0392b;}' +
    '#mk-editbar .gh{background:rgba(255,255,255,.2);color:#fff;text-decoration:none;}' +
    '#mk-editbar .exit{background:rgba(0,0,0,.25);color:#fff;margin-left:auto;}' +
    'body.mk-editing{padding-top:64px!important;}' +
    'body.mk-editing #mk-rnav{display:none!important;}' +
    '@media print{#mk-editbar,.mk-rowbtn,.mk-addrow{display:none!important;}}';
  document.head.appendChild(css);

  /* ---------- Redigera-knapp i verktygsraden ---------- */
  function addEditButton() {
    var rnav = document.getElementById('mk-rnav');
    if (rnav && !document.getElementById('rnEdit')) {
      var btn = document.createElement('button');
      btn.className = 'rb';
      btn.id = 'rnEdit';
      btn.title = 'Redigera receptet';
      btn.innerHTML = '<span class="ic">✏️</span><span class="lb">Redigera</span>';
      // Lägg före Skriv ut-knappen
      var printBtn = document.getElementById('rnPrint');
      rnav.insertBefore(btn, printBtn || null);
      btn.addEventListener('click', startEdit);
      return true;
    }
    return false;
  }
  var tries = 0;
  (function waitBar() {
    if (!addEditButton() && ++tries < 25) setTimeout(waitBar, 200);
  })();

  /* ============================================================
     STARTA REDIGERING
     ============================================================ */
  function startEdit() {
    if (editing) return;
    editing = true;
    document.body.classList.add('mk-editing');

    /* Gör innehåll redigerbart */
    // Rubrik + beskrivning
    var h1 = document.querySelector('header h1');
    var hp = document.querySelector('header p');
    if (h1) h1.contentEditable = 'true';
    if (hp) hp.contentEditable = 'true';

    // Alla tabellceller (ingredienser, näring)
    document.querySelectorAll('.card table td').forEach(function (td) {
      td.contentEditable = 'true';
    });

    // Stegtexter
    document.querySelectorAll('.card ol li, .machine-step ol li').forEach(function (li) {
      li.contentEditable = 'true';
    });

    // Varnings-/tipsrutor
    document.querySelectorAll('.warn, .tip, .alt').forEach(function (el) {
      el.contentEditable = 'true';
    });

    /* Rad-knappar: ta bort-✕ på ingrediensrader + lägg till-knapp */
    var ing = document.querySelector('.mk-ing-card table') ||
              (function () {
                var cards = document.querySelectorAll('.card');
                for (var i = 0; i < cards.length; i++) {
                  var h = cards[i].querySelector('h2');
                  if (h && /ingrediens/i.test(h.textContent)) return cards[i].querySelector('table');
                }
                return null;
              })();
    if (ing) {
      ing.querySelectorAll('tr').forEach(function (tr) {
        var tds = tr.querySelectorAll('td');
        if (tds.length >= 2 && !tr.querySelector('.mk-rowbtn')) {
          var del = document.createElement('button');
          del.className = 'mk-rowbtn del no-print';
          del.textContent = '✕';
          del.title = 'Ta bort raden';
          del.contentEditable = 'false';
          del.onclick = function () { tr.remove(); };
          tds[tds.length - 1].appendChild(del);
        }
      });
      var card = ing.closest('.card');
      if (card && !card.querySelector('.mk-addrow')) {
        var add = document.createElement('button');
        add.className = 'mk-addrow no-print';
        add.textContent = '+ Lägg till ingrediens';
        add.onclick = function () {
          var cols = ing.querySelector('tr') ? ing.querySelector('tr').children.length : 2;
          var tr = document.createElement('tr');
          var html = '<td contenteditable="true">Ny ingrediens</td><td contenteditable="true">0 g</td>';
          for (var c = 2; c < cols; c++) html += '<td contenteditable="true">–</td>';
          tr.innerHTML = html;
          var totalRow = ing.querySelector('tr.total');
          if (totalRow) ing.querySelector('tbody') ? totalRow.parentNode.insertBefore(tr, totalRow) : totalRow.before(tr);
          else (ing.querySelector('tbody') || ing).appendChild(tr);
          // del-knapp på nya raden
          var del = document.createElement('button');
          del.className = 'mk-rowbtn del no-print';
          del.textContent = '✕';
          del.contentEditable = 'false';
          del.onclick = function () { tr.remove(); };
          tr.lastElementChild.appendChild(del);
          tr.firstElementChild.focus();
        };
        card.appendChild(add);
      }
    }

    /* Steg: ✕ per steg + lägg till */
    document.querySelectorAll('.card ol').forEach(function (ol) {
      ol.querySelectorAll('li').forEach(function (li) {
        if (!li.querySelector('.mk-rowbtn')) {
          var del = document.createElement('button');
          del.className = 'mk-rowbtn del no-print';
          del.textContent = '✕';
          del.title = 'Ta bort steget';
          del.contentEditable = 'false';
          del.onclick = function () { li.remove(); };
          li.appendChild(del);
        }
      });
      var card = ol.closest('.card');
      if (card && !card.querySelector('.mk-addstep')) {
        var add = document.createElement('button');
        add.className = 'mk-addrow mk-addstep no-print';
        add.textContent = '+ Lägg till steg';
        add.onclick = function () {
          var li = document.createElement('li');
          li.contentEditable = 'true';
          li.textContent = 'Nytt steg...';
          var del = document.createElement('button');
          del.className = 'mk-rowbtn del no-print';
          del.textContent = '✕';
          del.contentEditable = 'false';
          del.onclick = function () { li.remove(); };
          li.appendChild(del);
          ol.appendChild(li);
          li.focus();
        };
        card.appendChild(add);
      }
    });

    /* Redigeringsbalk */
    var fname = decodeURIComponent(location.pathname.split('/').pop());
    var bar = document.createElement('div');
    bar.id = 'mk-editbar';
    bar.className = 'no-print';
    bar.innerHTML =
      '<b>✏️ Redigeringsläge</b>' +
      '<button class="eb save" id="eb-save">💾 Ladda ner uppdaterad fil</button>' +
      '<a class="eb gh" href="' + GH_EDIT + encodeURIComponent(fname) + '" target="_blank" rel="noopener">📤 Redigera på GitHub</a>' +
      '<button class="eb exit" id="eb-exit">✕ Avsluta</button>';
    document.body.appendChild(bar);
    document.getElementById('eb-save').onclick = saveFile;
    document.getElementById('eb-exit').onclick = stopEdit;

    if (window.__MK_TOAST) window.__MK_TOAST('✏️ Klicka på text för att ändra – t.ex. byt "mjöl" mot "vatten"');
  }

  /* ============================================================
     AVSLUTA (behåller ändringarna synligt på sidan)
     ============================================================ */
  function stopEdit() {
    editing = false;
    document.body.classList.remove('mk-editing');
    document.querySelectorAll('[contenteditable="true"]').forEach(function (el) {
      el.removeAttribute('contenteditable');
    });
    document.querySelectorAll('.mk-rowbtn, .mk-addrow').forEach(function (el) { el.remove(); });
    var bar = document.getElementById('mk-editbar');
    if (bar) bar.remove();
    if (window.__MK_TOAST) window.__MK_TOAST('Ändringarna syns på sidan – ladda upp filen för att spara permanent');
  }

  /* ============================================================
     SPARA: bygg uppdaterad HTML-fil och ladda ner
     ============================================================ */
  function saveFile() {
    // Klona dokumentet och städa bort redigerings-artefakter
    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('#mk-editbar, .mk-rowbtn, .mk-addrow, #mk-rnav, #mk-fab, #mk-top, ' +
      '#mk-lang, #mk-auto-qr, #mk-provenance, .share-btn, .print-btn, [id^="mk-pd"]').forEach(function (el) { el.remove(); });
    clone.querySelectorAll('[contenteditable]').forEach(function (el) {
      el.removeAttribute('contenteditable');
    });
    var body = clone.querySelector('body');
    if (body) { body.classList.remove('mk-editing'); body.removeAttribute('data-mk-date'); body.style.paddingTop = ''; }
    // Ta bort dynamiskt injicerade stilar/skript (site.js återskapar dem)
    clone.querySelectorAll('style').forEach(function (st) {
      if (!st.closest('head') || (st.id && st.id.indexOf('mk-') === 0) || st.textContent.indexOf('mk-editing') !== -1 ||
          st.textContent.indexOf('#mk-') !== -1) {
        // behåll bara receptets egen style (den utan mk-referenser)
        if (st.textContent.indexOf('--bg:#f6f3ee') === -1) st.remove();
      }
    });
    clone.querySelectorAll('script').forEach(function (sc) {
      var src = sc.getAttribute('src') || '';
      if (src.indexOf('site.js') === -1 && src === '') {
        // behåll receptets egna inline-script (betyg/QR) – ta bara bort module-injicerade utan src? De har src.
      }
      if (src && src.indexOf('assets/') !== -1 && src.indexOf('site.js') === -1) sc.remove();
    });

    // Uppdatera metadata-beskrivningen om rubrik/desc ändrats
    var h1 = clone.querySelector('header h1');
    var meta = clone.querySelector('meta[name="recept:namn"]');
    if (h1 && meta) {
      var txt = h1.textContent.replace(/[\u{1F300}-\u{1FAFF}\uFE0F]/gu, '').trim();
      if (txt) meta.setAttribute('content', txt);
    }

    var html = '<!DOCTYPE html>\n' + clone.outerHTML;
    var fname = decodeURIComponent(location.pathname.split('/').pop());
    var blob = new Blob([html], { type: 'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    a.click();

    if (window.__MK_TOAST) {
      window.__MK_TOAST('💾 Nedladdad! Ladda upp till recept/ på GitHub (skriver över)', 'Öppna GitHub', function () {
        window.open('https://github.com/Tokke2/recept/upload/main/recept', '_blank');
      }, 8000);
    }
  }
})();
