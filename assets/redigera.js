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

   🔒 LÖSENORDSSKYDD: redigering kräver lösenordet i json/las.json.
      Lösenordet byts ENDAST genom att redigera las.json på GitHub.
      SÄKRAST: "losenord_hash" = SHA-256 av lösenordet (syns inte i
      klartext). Reserv: "losenord" i klartext (används om hash saknas).
      Rätt lösenord låser upp för hela webbläsarsessionen.
      Sätt "las_redigering": false för att stänga av skyddet.

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
    '@media print{#mk-editbar,.mk-rowbtn,.mk-addrow{display:none!important;}}' +
    /* Lösenordsdialog */
    '#mk-pw-bg{position:fixed;inset:0;background:rgba(30,41,54,.62);backdrop-filter:blur(4px);' +
      'z-index:10002;display:flex;align-items:center;justify-content:center;padding:20px;' +
      'opacity:0;transition:opacity .2s;}' +
    '#mk-pw-bg.in{opacity:1;}' +
    '#mk-pw{background:#fff;border-radius:20px;padding:0;max-width:360px;width:100%;overflow:hidden;' +
      'box-shadow:0 24px 60px rgba(0,0,0,.45);font-family:Segoe UI,system-ui,sans-serif;' +
      'transform:translateY(12px);transition:transform .2s;}' +
    '#mk-pw-bg.in #mk-pw{transform:none;}' +
    '#mk-pw.shake{animation:mkshake .4s;}' +
    '@keyframes mkshake{0%,100%{transform:translateX(0);}20%,60%{transform:translateX(-9px);}' +
      '40%,80%{transform:translateX(9px);}}' +
    '#mk-pw .pw-head{background:linear-gradient(135deg,#2c3e50,#34495e);color:#fff;padding:18px 24px 14px;text-align:center;}' +
    '#mk-pw .pw-head .lock{font-size:2rem;}' +
    '#mk-pw .pw-head h3{font-family:Georgia,serif;font-size:1.15rem;margin:6px 0 2px;}' +
    '#mk-pw .pw-head p{opacity:.85;font-size:.8rem;}' +
    '#mk-pw .pw-body{padding:18px 22px 20px;}' +
    '#mk-pw input{width:100%;padding:13px 15px;border:2px solid #ddd;border-radius:12px;' +
      'font-size:1.05rem;font-family:inherit;text-align:center;letter-spacing:.1em;outline:none;}' +
    '#mk-pw input:focus{border-color:#e67e22;}' +
    '#mk-pw input.err{border-color:#c0392b;background:#fdecea;}' +
    '#mk-pw .pw-msg{color:#c0392b;font-size:.8rem;font-weight:700;text-align:center;' +
      'min-height:18px;margin-top:8px;}' +
    '#mk-pw .pw-row{display:flex;gap:8px;margin-top:10px;}' +
    '#mk-pw .pw-ok{flex:1;background:#c0392b;color:#fff;border:none;border-radius:12px;' +
      'padding:12px;font-size:.95rem;font-weight:800;cursor:pointer;font-family:inherit;}' +
    '#mk-pw .pw-ok:hover{background:#a93226;}' +
    '#mk-pw .pw-cancel{background:#f0ebe3;color:#2c3e50;border:none;border-radius:12px;' +
      'padding:12px 16px;font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit;}';
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
      btn.addEventListener('click', requestEdit);
      return true;
    }
    return false;
  }
  var tries = 0;
  (function waitBar() {
    if (!addEditButton() && ++tries < 25) setTimeout(waitBar, 200);
  })();

  /* ============================================================
     🔒 LÖSENORDSSKYDD (lösenordet ligger i json/las.json)
     ============================================================ */
  var UNLOCK_KEY = 'mk-edit-unlocked';

  async function getLock() {
    try {
      var d = await (await fetch('../json/las.json', { cache: 'no-store' })).json();
      return {
        pw: String(d.losenord || ''),                 // klartext (reserv)
        hash: String(d.losenord_hash || '').toLowerCase().trim(), // SHA-256 (säkrare – syns ej i klartext)
        on: d.las_redigering !== false
      };
    } catch (e) {
      return { pw: '', hash: '', on: false }; // ingen låsfil => inget lås
    }
  }

  /* SHA-256 av en text → hex-sträng (inbyggt i webbläsaren, kräver https) */
  async function sha256(text) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  /* Stämmer inmatningen? Hash har företräde, klartext är reserv. */
  async function checkPassword(input, lock) {
    if (lock.hash) {
      try { return (await sha256(input)) === lock.hash; } catch (e) { /* http/gammal webbläsare */ }
    }
    return lock.pw ? input === lock.pw : false;
  }

  function askPassword(lock, onOk) {
    var bg = document.createElement('div');
    bg.id = 'mk-pw-bg';
    bg.className = 'no-print';
    bg.innerHTML =
      '<div id="mk-pw" role="dialog" aria-label="Lösenord för redigering">' +
        '<div class="pw-head"><div class="lock">🔒</div>' +
        '<h3>Redigering är låst</h3><p>Ange lösenordet för att ändra receptet</p></div>' +
        '<div class="pw-body">' +
          '<input type="password" id="mk-pw-in" placeholder="Lösenord" autocomplete="off">' +
          '<div class="pw-msg" id="mk-pw-msg"></div>' +
          '<div class="pw-row">' +
            '<button class="pw-ok" id="mk-pw-ok">🔓 Lås upp</button>' +
            '<button class="pw-cancel" id="mk-pw-cancel">Avbryt</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bg);
    requestAnimationFrame(function () { bg.classList.add('in'); });
    var input = bg.querySelector('#mk-pw-in');
    setTimeout(function () { input.focus(); }, 150);

    function close() {
      bg.classList.remove('in');
      setTimeout(function () { bg.remove(); }, 200);
      document.removeEventListener('keydown', esc);
    }
    function esc(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc);

    async function attempt() {
      if (await checkPassword(input.value, lock)) {
        try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {}
        close();
        if (window.__MK_TOAST) window.__MK_TOAST('🔓 Upplåst för denna session');
        onOk();
      } else {
        var box = bg.querySelector('#mk-pw');
        box.classList.remove('shake');
        void box.offsetWidth; // starta om animationen
        box.classList.add('shake');
        input.classList.add('err');
        bg.querySelector('#mk-pw-msg').textContent = 'Fel lösenord – försök igen';
        input.select();
      }
    }
    bg.querySelector('#mk-pw-ok').onclick = attempt;
    bg.querySelector('#mk-pw-cancel').onclick = close;
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') attempt();
      input.classList.remove('err');
    });
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
  }

  async function requestEdit() {
    if (editing) return;
    var lock = await getLock();
    var unlocked = false;
    try { unlocked = sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) {}
    if (!lock.on || (!lock.pw && !lock.hash) || unlocked) return startEdit();
    askPassword(lock, startEdit);
  }

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
