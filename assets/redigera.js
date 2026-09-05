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

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
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
    /* Dubbelklicksmeny för mängd */
    '#mk-qty{position:absolute;z-index:140;background:#fff;border-radius:14px;box-shadow:0 10px 34px rgba(0,0,0,.3);' +
      'padding:14px 16px;font-family:Segoe UI,system-ui,sans-serif;min-width:230px;}' +
    '#mk-qty h4{margin:0 0 8px;font-size:.9rem;color:#2c3e50;}' +
    '#mk-qty .qrow{display:flex;gap:6px;align-items:center;margin-bottom:8px;}' +
    '#mk-qty .qbtn{border:none;border-radius:9px;padding:8px 12px;font-weight:800;cursor:pointer;font-family:inherit;font-size:.9rem;}' +
    '#mk-qty .minus{background:#fdf6ee;color:#e67e22;}' +
    '#mk-qty .plus{background:#eaf7ef;color:#27ae60;}' +
    '#mk-qty input{width:80px;text-align:center;padding:8px;border:2px solid #e8e2d8;border-radius:9px;font-size:.95rem;font-weight:700;}' +
    '#mk-qty .qdel{width:100%;background:#fdecea;color:#c0392b;border:none;border-radius:9px;padding:9px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.85rem;}' +
    '#mk-qty .qok{width:100%;background:#27ae60;color:#fff;border:none;border-radius:9px;padding:9px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.9rem;margin-bottom:6px;}' +
    /* Kompensationsförslag */
    '#mk-komp{position:fixed;left:50%;transform:translateX(-50%);bottom:86px;z-index:135;background:#2c3e50;color:#fff;' +
      'border-radius:14px;padding:14px 18px;box-shadow:0 10px 30px rgba(0,0,0,.4);max-width:480px;width:calc(100%-32px);' +
      'font-family:Segoe UI,system-ui,sans-serif;font-size:.9rem;}' +
    '#mk-komp select{width:100%;padding:9px;border-radius:9px;border:none;margin:8px 0;font-family:inherit;font-size:.9rem;}' +
    '#mk-komp .krow{display:flex;gap:8px;}' +
    '#mk-komp button{flex:1;border:none;border-radius:9px;padding:9px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.85rem;}' +
    '#mk-komp .kja{background:#27ae60;color:#fff;}' +
    '#mk-komp .knej{background:rgba(255,255,255,.18);color:#fff;}' +
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
          '<div style="position:relative;">' +
            '<input type="password" id="mk-pw-in" placeholder="Lösenord" autocomplete="off" style="padding-right:44px;">' +
            '<button type="button" id="mk-pw-eye" title="Visa/dölj lösenordet" aria-label="Visa lösenordet" ' +
              'style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;' +
              'font-size:1.15rem;cursor:pointer;padding:4px;line-height:1;">👁️</button>' +
          '</div>' +
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

    /* 👁️ Visa/dölj lösenordet */
    bg.querySelector('#mk-pw-eye').addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      this.textContent = show ? '🙈' : '👁️';
      input.focus();
    });

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
    var pwDown = false;
    bg.addEventListener('mousedown', function (e) { pwDown = (e.target === bg); });
    bg.addEventListener('click', function (e) { if (e.target === bg && pwDown) close(); });
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
     MÄNGD-VERKTYG: dubbelklicka en ingrediensrad → meny för att
     minska/öka/ta bort. Minskning → förslag att kompensera med
     mellanskillnaden på en annan ingrediens (behåller totalvikten).
     ============================================================ */
  var dirty = false;   // osparade ändringar?

  function parseQty(s) {
    var m = String(s).replace(',', '.').match(/([\d.]+)\s*(kg|g|gram|dl|cl|ml|l|msk|tsk|krm|st)?/i);
    if (!m || !m[1]) return null;
    return { n: parseFloat(m[1]), unit: (m[2] || 'g').toLowerCase(), raw: String(s) };
  }
  function fmtQty(n, unit) {
    var v = Math.round(n * 10) / 10;
    return (v % 1 === 0 ? v.toFixed(0) : String(v).replace('.', ',')) + ' ' + unit;
  }
  function ingTable() {
    var el = document.querySelector('.mk-ing-card table');
    if (el) return el;
    var cards = document.querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      var h = cards[i].querySelector('h2');
      if (h && /ingrediens/i.test(h.textContent)) return cards[i].querySelector('table');
    }
    return null;
  }
  function rowName(tr) {
    var td = tr.querySelector('td');
    return td ? td.textContent.replace(/✕/g, '').trim() : '';
  }
  function rowQtyCell(tr) {
    /* v2-tabell: mängd i .mg-pastill, klassisk: andra kolumnen */
    return tr.querySelector('.mg') || tr.querySelectorAll('td')[1] || null;
  }

  function closeQty() {
    var el = document.getElementById('mk-qty');
    if (el) el.remove();
    document.removeEventListener('mousedown', qtyOutside, true);
  }
  function qtyOutside(e) {
    var el = document.getElementById('mk-qty');
    if (!el || el.contains(e.target)) return;
    /* Klick utanför: har mängden ÄNDRATS? Då frågar vi först –
       menyn stängs aldrig av misstag. Oförändrad = stäng tyst. */
    var inp = el.querySelector('#mk-qty-in');
    var orig = el.getAttribute('data-orig');
    if (inp && orig !== null && String(inp.value).replace(',', '.') !== orig) {
      e.preventDefault();
      e.stopPropagation();
      var fr = el.querySelector('#mk-qty-fraga');
      if (!fr) {
        fr = document.createElement('div');
        fr.id = 'mk-qty-fraga';
        fr.contentEditable = 'false';
        fr.style.cssText = 'margin-top:8px;padding:8px 10px;background:#fdf6ee;border:1.5px solid #e67e22;border-radius:9px;font-size:.8rem;color:#2c3e50;';
        fr.innerHTML = '\u26A0\uFE0F Osparad \u00e4ndring \u2013 vad vill du g\u00f6ra?' +
          '<div style="display:flex;gap:6px;margin-top:6px;">' +
          '<button id="mk-qty-fja" style="flex:1;background:#27ae60;color:#fff;border:none;border-radius:7px;padding:7px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.8rem;">\u2714 Spara</button>' +
          '<button id="mk-qty-fnej" style="flex:1;background:#ecf0f1;color:#2c3e50;border:none;border-radius:7px;padding:7px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.8rem;">Sl\u00e4ng</button></div>';
        el.appendChild(fr);
        fr.querySelector('#mk-qty-fja').onclick = function () {
          var ok = el.querySelector('#mk-qty-ok');
          if (ok) ok.click(); else closeQty();
        };
        fr.querySelector('#mk-qty-fnej').onclick = closeQty;
      }
      return;
    }
    closeQty();
  }

  function openQtyMenu(tr, x, y) {
    closeQty();
    var cell = rowQtyCell(tr);
    if (!cell) return;
    var q = parseQty(cell.textContent);
    var namn = rowName(tr);
    var menu = document.createElement('div');
    menu.id = 'mk-qty';
    menu.className = 'no-print';
    menu.contentEditable = 'false';
    var step = q && q.n >= 100 ? 10 : 1;
    menu.innerHTML =
      '<h4>' + namn.slice(0, 30) + '</h4>' +
      (q ? '<div class="qrow">' +
        '<button class="qbtn minus" data-d="-' + step + '">−' + step + '</button>' +
        '<input type="text" id="mk-qty-in" value="' + q.n + '"><span style="font-size:.85rem;color:#7f8c8d;">' + q.unit + '</span>' +
        '<button class="qbtn plus" data-d="' + step + '">+' + step + '</button></div>' +
        '<button class="qok" id="mk-qty-ok">✔ Ändra mängden</button>'
        : '<p style="font-size:.8rem;color:#7f8c8d;margin:0 0 8px;">Ingen mängd hittades på raden.</p>') +
      '<button class="qdel" id="mk-qty-del">🗑️ Ta bort ingrediensen</button>' +
      '<button id="mk-qty-avbryt" style="width:100%;margin-top:6px;background:#ecf0f1;color:#2c3e50;border:none;border-radius:9px;padding:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.82rem;">✕ Avbryt</button>';
    if (q) menu.setAttribute('data-orig', String(q.n));
    document.body.appendChild(menu);
    var mw = 240;
    menu.style.left = Math.min(x, window.innerWidth - mw - 12) + 'px';
    menu.style.top = (y + window.scrollY + 8) + 'px';
    setTimeout(function () { document.addEventListener('mousedown', qtyOutside, true); }, 50);
    menu.querySelector('#mk-qty-avbryt').onclick = closeQty;

    if (q) {
      var inp = menu.querySelector('#mk-qty-in');
      menu.querySelectorAll('.qbtn').forEach(function (b) {
        b.onclick = function () {
          var v = parseFloat(String(inp.value).replace(',', '.')) || 0;
          inp.value = Math.max(0, Math.round((v + parseFloat(b.dataset.d)) * 10) / 10);
        };
      });
      menu.querySelector('#mk-qty-ok').onclick = function () {
        var nyN = parseFloat(String(inp.value).replace(',', '.'));
        if (isNaN(nyN) || nyN < 0) return;
        var gammal = q.n;
        cell.textContent = fmtQty(nyN, q.unit);
        if (tr.hasAttribute('data-mangd')) tr.setAttribute('data-mangd', fmtQty(nyN, q.unit));
        dirty = true;
        if (window.__MK_KALKYL_REFRESH) window.__MK_KALKYL_REFRESH();
        closeQty();
        var diff = Math.round((gammal - nyN) * 10) / 10;
        if (diff > 0) offerCompensation(tr, diff, q.unit);
        else if (window.__MK_TOAST) window.__MK_TOAST('✔ ' + namn + ': ' + fmtQty(gammal, q.unit) + ' → ' + fmtQty(nyN, q.unit));
      };
    }
    menu.querySelector('#mk-qty-del').onclick = function () {
      var cellq = q ? q.n : 0;
      tr.remove();
      dirty = true;
      if (window.__MK_KALKYL_REFRESH) window.__MK_KALKYL_REFRESH();
      closeQty();
      if (q && cellq > 0) offerCompensation(null, cellq, q.unit, namn);
      else if (window.__MK_TOAST) window.__MK_TOAST('🗑️ ' + namn + ' borttagen');
    };
  }

  /* ---------- Kompensationsförslag: öka annan ingrediens med diffen ---------- */
  function offerCompensation(exceptTr, diff, unit, removedName) {
    var old = document.getElementById('mk-komp');
    if (old) old.remove();
    var tbl = ingTable();
    if (!tbl) return;
    var cands = [];
    tbl.querySelectorAll('tr').forEach(function (tr) {
      if (tr === exceptTr || tr.classList.contains('tot') || tr.classList.contains('total')) return;
      var c = rowQtyCell(tr);
      if (!c) return;
      var q = parseQty(c.textContent);
      if (q && q.unit === unit && rowName(tr) && !/^total/i.test(rowName(tr))) {
        cands.push({ tr: tr, cell: c, q: q, namn: rowName(tr) });
      }
    });
    if (!cands.length) return;

    var box = document.createElement('div');
    box.id = 'mk-komp';
    box.className = 'no-print';
    box.contentEditable = 'false';
    box.innerHTML =
      '⚖️ ' + (removedName ? '<b>' + removedName + '</b> togs bort (' + fmtQty(diff, unit) + ').' :
        'Du minskade med <b>' + fmtQty(diff, unit) + '</b>.') +
      ' Kompensera genom att öka en annan ingrediens med mellanskillnaden?' +
      '<select id="mk-komp-sel">' + cands.map(function (c, i) {
        return '<option value="' + i + '">' + c.namn.slice(0, 40) + ' (' + fmtQty(c.q.n, unit) + ' → ' + fmtQty(c.q.n + diff, unit) + ')</option>';
      }).join('') + '</select>' +
      '<div class="krow"><button class="kja" id="mk-komp-ja">✔ Ja, öka med ' + fmtQty(diff, unit) + '</button>' +
      '<button class="knej" id="mk-komp-nej">Nej tack</button></div>';
    document.body.appendChild(box);
    box.querySelector('#mk-komp-ja').onclick = function () {
      var c = cands[+box.querySelector('#mk-komp-sel').value];
      c.cell.textContent = fmtQty(c.q.n + diff, unit);
      if (c.tr.hasAttribute('data-mangd')) c.tr.setAttribute('data-mangd', fmtQty(c.q.n + diff, unit));
      dirty = true;
      if (window.__MK_KALKYL_REFRESH) window.__MK_KALKYL_REFRESH();
      box.remove();
      if (window.__MK_TOAST) window.__MK_TOAST('⚖️ ' + c.namn + ' ökad till ' + fmtQty(c.q.n + diff, unit) + ' – totalvikten behållen!');
    };
    box.querySelector('#mk-komp-nej').onclick = function () { box.remove(); };
    setTimeout(function () { if (box.parentNode) box.remove(); }, 30000);
  }

  /* ============================================================
     STARTA REDIGERING
     ============================================================ */
  /* ============================================================
     ✍️ AUTOCOMPLETE: dropdown ur ingrediensdatabasen när man
     skriver i namncellen. "Re" → alla som börjar på "Re" överst,
     sedan de som innehåller "re". Fritext funkar alltid – listan
     är bara ett hjälpmedel. Piltangenter + Enter, Esc stänger.
     ============================================================ */
  var ingDb = null;
  function loadIngDb() {
    if (ingDb) return Promise.resolve(ingDb);
    return fetch('../json/ingredienser.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { ingDb = d.ingredienser || []; return ingDb; })
      .catch(function () { ingDb = []; return ingDb; });
  }
  function sokNorm(s) {
    return String(s).toLowerCase().replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o').trim();
  }
  function cellText(td) {
    var c = td.cloneNode(true);
    c.querySelectorAll('.mk-rowbtn, .mk-saknas, .mk-prodlank, .drop').forEach(function (x) { x.remove(); });
    return c.textContent.replace(/💧/g, '').trim();
  }
  var sokBox = null, sokTd = null, sokIdx = -1;
  function closeSok() {
    if (sokBox) { sokBox.remove(); sokBox = null; }
    sokTd = null; sokIdx = -1;
  }
  function renderSok(td, list) {
    if (!sokBox) {
      sokBox = document.createElement('div');
      sokBox.className = 'mk-ingsok no-print';
      sokBox.style.cssText = 'position:absolute;z-index:160;background:#fff;border-radius:12px;' +
        'box-shadow:0 10px 34px rgba(0,0,0,.28);padding:6px;min-width:230px;max-width:340px;' +
        'max-height:260px;overflow-y:auto;font-family:Segoe UI,system-ui,sans-serif;';
      /* mousedown får inte stjäla fokus från cellen */
      sokBox.addEventListener('mousedown', function (e) { e.preventDefault(); });
      document.body.appendChild(sokBox);
    }
    sokTd = td; sokIdx = -1;
    sokBox.innerHTML = '<div style="font-size:.68rem;color:#a5967e;padding:3px 8px 5px;">🥫 Ur databasen – eller skriv fritt</div>';
    list.forEach(function (ing, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mk-sokval';
      b.setAttribute('data-i', i);
      b.style.cssText = 'display:block;width:100%;text-align:left;border:none;background:none;' +
        'border-radius:8px;padding:6px 9px;cursor:pointer;font-family:inherit;font-size:.84rem;color:#2c3e50;';
      b.innerHTML = '<b>' + ing.namn + '</b> <span style="font-size:.72rem;color:#7f8c8d;">' +
        (+ing.kcal || 0) + ' kcal · ' + (+ing.pris_kr_per_kg || 0) + ' kr/kg</span>';
      b.onmouseenter = function () { markSok(i); };
      b.onclick = function () { pickSok(ing); };
      sokBox.appendChild(b);
    });
    var r = td.getBoundingClientRect();
    sokBox.style.left = Math.max(8, r.left + window.scrollX) + 'px';
    sokBox.style.top = (r.bottom + window.scrollY + 2) + 'px';
  }
  function markSok(i) {
    if (!sokBox) return;
    sokIdx = i;
    sokBox.querySelectorAll('.mk-sokval').forEach(function (b, j) {
      b.style.background = (j === i) ? '#fdf6ee' : 'none';
      b.style.outline = (j === i) ? '2px solid #e67e22' : 'none';
    });
    var akt = sokBox.querySelector('.mk-sokval[data-i="' + i + '"]');
    if (akt && akt.scrollIntoView) akt.scrollIntoView({ block: 'nearest' });
  }
  function pickSok(ing) {
    if (!sokTd) return;
    var td = sokTd;
    closeSok();
    td.textContent = ing.namn;   /* rensar även gamla märken – kalkylen sätter nya */
    markDirty();
    if (window.__MK_KALKYL_REFRESH) window.__MK_KALKYL_REFRESH();
    /* markören sist i cellen så man kan fortsätta direkt */
    try {
      var rng = document.createRange();
      rng.selectNodeContents(td); rng.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(rng);
    } catch (e) {}
  }
  function updateSok(td) {
    loadIngDb().then(function (db) {
      if (!db.length) return;
      /* aktivt element kan vara td:n ELLER något inuti den (contentEditable) */
      var akt = document.activeElement;
      if (akt !== td && !(akt && td.contains(akt))) return;
      var q = sokNorm(cellText(td).replace(/^ny ingrediens$/i, ''));
      var borjar = [], innehaller = [];
      db.forEach(function (ing) {
        var n = sokNorm(ing.namn);
        if (!q) borjar.push(ing);
        else if (n.indexOf(q) === 0) borjar.push(ing);
        else if (n.indexOf(q) !== -1) innehaller.push(ing);
      });
      var list = borjar.concat(innehaller).slice(0, 12);
      if (!list.length) { closeSok(); return; }
      renderSok(td, list);
    });
  }

  /* Är cellen en ingrediens-NAMNCELL i redigeringsläge? */
  function arNamncell(el) {
    if (!editing || !el || !el.closest) return null;
    var td = el.closest('td');
    if (!td || td.cellIndex !== 0) return null;
    var tr = td.closest('tr');
    if (!tr || tr.classList.contains('total') || tr.classList.contains('tot')) return null;
    var tabell = td.closest('.mk-ing2') ||
      (td.closest('.mk-ing-card') ? td.closest('table') : null) ||
      (function () {
        var card = td.closest('.card');
        var h = card && card.querySelector('h2');
        return (h && /ingrediens/i.test(h.textContent)) ? td.closest('table') : null;
      })();
    return tabell ? td : null;
  }

  /* ✍️ HÄNDELSEDELEGERING (v2): lyssnare på document istället för
     per-cell – tål att tabellen byggs om av ingrediens.js/kalkyl.js
     när som helst. attachSok() finns kvar som no-op-kompatibilitet. */
  function attachSok() { /* delegering sköter allt numera */ }
  document.addEventListener('focusin', function (e) {
    var td = arNamncell(e.target);
    if (td) updateSok(td);
  });
  document.addEventListener('click', function (e) {
    var td = arNamncell(e.target);
    if (td && !sokBox) updateSok(td);
  });
  document.addEventListener('input', function (e) {
    var td = arNamncell(e.target);
    if (td) updateSok(td);
  });
  document.addEventListener('focusout', function (e) {
    if (arNamncell(e.target)) setTimeout(closeSok, 150);
  });
  document.addEventListener('keydown', function (e) {
    if (!sokBox) return;
    var td = arNamncell(e.target);
    if (!td || sokTd !== td) return;
    var n = sokBox.querySelectorAll('.mk-sokval').length;
    if (e.key === 'ArrowDown') { e.preventDefault(); markSok((sokIdx + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); markSok((sokIdx - 1 + n) % n); }
    else if (e.key === 'Enter' && sokIdx >= 0) {
      e.preventDefault();
      var b = sokBox.querySelector('.mk-sokval[data-i="' + sokIdx + '"]');
      if (b) b.click();
    }
    else if (e.key === 'Escape') { e.stopPropagation(); closeSok(); }
    else if (e.key === 'Tab') closeSok();
  });

  function startEdit() {
    if (editing) return;
    editing = true;
    document.body.classList.add('mk-editing');

    /* ✨ Steg-markeringar + 🔗 maskinlänkar packas upp – ren text redigeras */
    if (window.__MK_STEGMARK_RESET) window.__MK_STEGMARK_RESET();
    if (window.__MK_MASKLANK_RESET) window.__MK_MASKLANK_RESET();

    /* Gör innehåll redigerbart */
    // Rubrik + beskrivning
    var h1 = document.querySelector('header h1');
    var hp = document.querySelector('header p');
    if (h1) h1.contentEditable = 'true';
    if (hp) hp.contentEditable = 'true';

    // Alla tabellceller (ingredienser, näring)
    document.querySelectorAll('.card table td').forEach(function (td) {
      if (td.closest('.mk-ingsub')) return;   /* variant-underrader ägs av kalkylen */
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

    /* ============================================================
       🔧 LÄGG TILL MASKIN I EFTERHAND: ➕-knapp i "Gör så här"-
       kortet → välj maskin + program ur databasen → ny maskinsteg-
       ruta läggs in OCH recept:maskiner-metan uppdateras (så
       receptflikar/maskinkort/kopplingar hittar receptet). Flera
       maskiner kan läggas till efter varandra. ✕ tar bort ruta.
       ============================================================ */
    (function maskinTillagg() {
      var stegKort = null;
      document.querySelectorAll('.card').forEach(function (c) {
        var h = c.querySelector('h2');
        if (!stegKort && h && /(gör så här|steg|instruktion)/i.test(h.textContent)) stegKort = c;
      });
      if (!stegKort || stegKort.querySelector('.mk-addmaskin')) return;

      /* ✕ på befintliga maskinsteg-rutor */
      document.querySelectorAll('.machine-step').forEach(function (ms) {
        if (ms.querySelector('.mk-rowbtn')) return;
        var del = document.createElement('button');
        del.className = 'mk-rowbtn del no-print';
        del.textContent = '✕';
        del.title = 'Ta bort maskinrutan';
        del.contentEditable = 'false';
        del.onclick = function () { ms.remove(); markDirty(); };
        ms.appendChild(del);
      });

      var add = document.createElement('button');
      add.className = 'mk-addrow mk-addmaskin no-print';
      add.textContent = '+ Lägg till maskin';
      add.onclick = async function () {
        if (document.getElementById('mk-maskval-bg')) return;
        var rot = window.__MK_ROOT || '../';
        var maskiner = [];
        try {
          var idx = await (await fetch(rot + 'json/maskiner-index.json', { cache: 'no-store' })).json();
          await Promise.all(idx.map(async function (f) {
            try { maskiner.push(await (await fetch(rot + 'json/maskiner/' + f)).json()); } catch (e) {}
          }));
        } catch (e) {}
        if (!maskiner.length) { if (window.__MK_TOAST) window.__MK_TOAST('Kunde inte läsa maskindatabasen'); return; }
        maskiner.sort(function (a, b) { return (a.namn || '').localeCompare(b.namn || '', 'sv'); });

        var bg = document.createElement('div');
        bg.id = 'mk-maskval-bg';
        bg.className = 'no-print';
        bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:330;display:flex;align-items:center;justify-content:center;padding:16px;';
        bg.innerHTML =
          '<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;padding:22px 26px;font-family:Segoe UI,system-ui,sans-serif;color:#2c3e50;">' +
            '<h3 style="margin:0 0 10px;">🔧 Lägg till maskin i receptet</h3>' +
            '<label style="display:block;font-size:.8rem;font-weight:700;margin-bottom:3px;">Maskin</label>' +
            '<select id="mv-maskin" style="width:100%;padding:10px;border:2px solid #e8e2d8;border-radius:9px;font-size:.9rem;font-family:inherit;margin-bottom:10px;">' +
              maskiner.map(function (m, i) { return '<option value="' + i + '">' + (m.namn || m.id) + '</option>'; }).join('') +
            '</select>' +
            '<label style="display:block;font-size:.8rem;font-weight:700;margin-bottom:3px;">Program</label>' +
            '<select id="mv-prog" style="width:100%;padding:10px;border:2px solid #e8e2d8;border-radius:9px;font-size:.9rem;font-family:inherit;margin-bottom:10px;"></select>' +
            '<label style="display:block;font-size:.8rem;font-weight:700;margin-bottom:3px;">Moment (visas i metan, t.ex. "Gräddning")</label>' +
            '<input id="mv-moment" type="text" placeholder="t.ex. Gräddning, Alternativ, Jäsning" style="width:100%;padding:10px;border:2px solid #e8e2d8;border-radius:9px;font-size:.9rem;font-family:inherit;box-sizing:border-box;margin-bottom:14px;">' +
            '<div style="display:flex;gap:10px;">' +
              '<button id="mv-ok" style="flex:1;background:#27ae60;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;cursor:pointer;font-family:inherit;">➕ Lägg till</button>' +
              '<button id="mv-nej" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;font-family:inherit;">Avbryt</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(bg);

        function fyllProgram() {
          var m = maskiner[+bg.querySelector('#mv-maskin').value];
          var ps = m.program || [];
          bg.querySelector('#mv-prog').innerHTML = ps.length
            ? ps.map(function (p, i) { return '<option value="' + i + '">' + p.namn + (p.standardtid ? ' (' + p.standardtid + ')' : '') + '</option>'; }).join('')
            : '<option value="-1">– inga program (manuellt läge) –</option>';
        }
        fyllProgram();
        bg.querySelector('#mv-maskin').addEventListener('change', fyllProgram);

        var ned = false;
        bg.addEventListener('mousedown', function (e) { ned = (e.target === bg); });
        bg.addEventListener('click', function (e) { if (e.target === bg && ned) bg.remove(); });
        bg.querySelector('#mv-nej').onclick = function () { bg.remove(); };

        bg.querySelector('#mv-ok').onclick = function () {
          var m = maskiner[+bg.querySelector('#mv-maskin').value];
          var pi = +bg.querySelector('#mv-prog').value;
          var p = (m.program && pi >= 0) ? m.program[pi] : { namn: 'Manuellt läge', standardtid: '', beskrivning: '' };
          var moment = bg.querySelector('#mv-moment').value.trim() || 'Tillagning';
          var kort = (m.varumarke ? m.varumarke + ' ' : '') + (m.modellnamn || m.namn || m.id);

          /* 1) Ny maskinsteg-ruta i Gör så här-kortet */
          var ruta = document.createElement('div');
          ruta.className = 'machine-step';
          ruta.innerHTML = '<h3>⚙️ ' + kort + ' · <span class="prog">' + p.namn +
            (p.standardtid ? ' · ' + p.standardtid : '') + '</span></h3>' +
            (p.beskrivning ? '<div class="why">' + p.beskrivning + '</div>' : '');
          var ol = stegKort.querySelector('ol');
          if (ol) stegKort.insertBefore(ruta, ol);
          else stegKort.appendChild(ruta);
          var del = document.createElement('button');
          del.className = 'mk-rowbtn del no-print';
          del.textContent = '✕'; del.contentEditable = 'false';
          del.onclick = function () { ruta.remove(); markDirty(); };
          ruta.appendChild(del);

          /* 2) Uppdatera recept:maskiner-metan (| -separerad, som övriga) */
          var meta = document.querySelector('meta[name="recept:maskiner"]');
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'recept:maskiner');
            var ank = document.querySelector('meta[name="recept:namn"]');
            (ank && ank.parentNode ? ank.parentNode : document.head).appendChild(meta);
          }
          var post = moment + ': ' + kort + ' · ' + p.namn + (p.standardtid ? ' ' + p.standardtid : '');
          meta.setAttribute('content', (meta.getAttribute('content') ? meta.getAttribute('content') + ' | ' : '') + post);

          bg.remove();
          markDirty();
          if (window.__MK_TOAST) window.__MK_TOAST('🔧 ' + kort + ' tillagd – 💾 Spara för att behålla');
        };
      };
      stegKort.appendChild(add);
    })();

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
      /* Dubbelklick på rad → mängd-meny (minska/öka/ta bort + kompensation) */
      ing.addEventListener('dblclick', function (e) {
        if (!editing) return;
        var tr = e.target.closest('tr');
        if (!tr || tr.classList.contains('tot') || tr.classList.contains('total')) return;
        if (!tr.querySelector('td')) return;
        e.preventDefault();
        openQtyMenu(tr, e.clientX, e.clientY);
      });
      ing.querySelectorAll('tr').forEach(function (tr) {
        var tds = tr.querySelectorAll('td');
        if (tds.length >= 2 && !tr.querySelector('.mk-rowbtn')) {
          var del = document.createElement('button');
          del.className = 'mk-rowbtn del no-print';
          del.textContent = '✕';
          del.title = 'Ta bort raden';
          del.contentEditable = 'false';
          del.onclick = function () { tr.remove(); markDirty(); if (window.__MK_KALKYL_REFRESH) window.__MK_KALKYL_REFRESH(); };
          tds[tds.length - 1].appendChild(del);
        }
        /* ✍️ Autocomplete ur databasen på namncellen */
        if (tds.length >= 2 && !tr.classList.contains('total') && !tr.classList.contains('tot')) attachSok(tds[0]);
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
          attachSok(tr.firstElementChild);   /* ✍️ dropdown ur databasen även på nya raden */
          tr.firstElementChild.focus();
          /* markera platshållartexten så första tecknet ersätter den */
          try {
            var rng = document.createRange();
            rng.selectNodeContents(tr.firstElementChild);
            var sel = window.getSelection();
            sel.removeAllRanges(); sel.addRange(rng);
          } catch (e) {}
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

    /* 🗂️ Kategorier (samma lista som recept.html) + nuvarande värden ur meta */
    var KATTER = [
      ['', '🤖 Auto (gissas)'], ['husdjur', '🐶 Husdjur'], ['sylt', '🫙 Sylt & marmelad'],
      ['saft', '🧃 Saft & dryck'], ['glass', '🍦 Glass & fryst'], ['snacks', '🥨 Snacks'],
      ['brod', '🍞 Bröd'], ['deg', '🥖 Deg'], ['bakning', '🍰 Bakning & fika'],
      ['efterratt', '🍮 Efterrätt'], ['varmratt', '🍲 Varmrätter'], ['ovrigt', '🍽️ Övrigt']
    ];
    var metaKat = (document.querySelector('meta[name="recept:kategori"]') || {}).content || '';
    var metaIng = ((document.querySelector('meta[name="recept:ingrediens"]') || {}).content || '') === 'ja';

    var bar = document.createElement('div');
    bar.id = 'mk-editbar';
    bar.className = 'no-print';
    bar.innerHTML =
      '<b>✏️ Redigeringsläge</b>' +
      '<span id="eb-dirty" style="font-size:.78rem;opacity:.85;"></span>' +
      '<label style="display:flex;align-items:center;gap:5px;font-size:.8rem;font-weight:700;" title="Var receptet hamnar i receptsamlingen. Auto = gissas av namnet/taggarna.">🗂️' +
        '<select id="eb-kat" style="border:none;border-radius:8px;padding:6px 8px;font-size:.8rem;font-family:inherit;font-weight:700;color:#2c3e50;cursor:pointer;max-width:170px;">' +
        KATTER.map(function (k) {
          return '<option value="' + k[0] + '"' + (k[0] === metaKat ? ' selected' : '') + '>' + k[1] + '</option>';
        }).join('') + '</select></label>' +
      '<label style="display:flex;align-items:center;gap:5px;font-size:.8rem;font-weight:700;cursor:pointer;background:rgba(255,255,255,.15);border-radius:8px;padding:6px 10px;" ' +
        'title="Kryssa i om receptet (sylt/saft/buljong...) även ska finnas i ingrediensdatabasen – pris & näring per 100 g räknas ur kalkylen och uppdateras vid varje sparning.">' +
        '<input type="checkbox" id="eb-ing"' + (metaIng ? ' checked' : '') + ' style="width:16px;height:16px;accent-color:#27ae60;cursor:pointer;">🫙 Även ingrediens</label>' +
      '<button class="eb save" id="eb-save" style="background:#27ae60;color:#fff;">💾 Spara på sajten</button>' +
      '<button class="eb" id="eb-dl" style="background:rgba(255,255,255,.2);color:#fff;" title="Reserv: ladda ner filen istället">⬇️</button>' +
      '<button class="eb" id="eb-del" style="background:#c0392b;color:#fff;" title="Ta bort hela receptet från sajten">🗑️ Ta bort receptet</button>' +
      '<button class="eb exit" id="eb-exit">✕ Avsluta</button>';
    document.body.appendChild(bar);
    document.getElementById('eb-save').onclick = saveToSite;
    document.getElementById('eb-dl').onclick = saveFile;
    document.getElementById('eb-del').onclick = deleteRecipe;
    document.getElementById('eb-exit').onclick = tryStopEdit;

    /* Kategori/ingrediens → skrivs DIREKT som meta i dokumentet (följer med i sparad fil) */
    function setMeta(namn, varde) {
      var m = document.querySelector('meta[name="recept:' + namn + '"]');
      if (!varde) { if (m) m.remove(); return; }
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute('name', 'recept:' + namn);
        var ank = document.querySelector('meta[name="recept:namn"]');
        if (ank && ank.parentNode) ank.parentNode.insertBefore(m, ank.nextSibling);
        else document.head.appendChild(m);
      }
      m.setAttribute('content', varde);
    }
    document.getElementById('eb-kat').addEventListener('change', function () {
      setMeta('kategori', this.value);
      markDirty();
    });
    document.getElementById('eb-ing').addEventListener('change', function () {
      setMeta('ingrediens', this.checked ? 'ja' : '');
      markDirty();
    });

    /* Markera osparat + varna vid sidlämning */
    document.body.addEventListener('input', markDirty, true);
    window.addEventListener('beforeunload', warnUnload);

    if (window.__MK_TOAST) window.__MK_TOAST('✏️ Klicka på text för att ändra · DUBBELKLICKA en ingrediens för mängd-menyn');
  }

  function markDirty() {
    if (!editing) return;
    dirty = true;
    var el = document.getElementById('eb-dirty');
    if (el) el.textContent = '● osparade ändringar';
  }
  function warnUnload(e) {
    if (editing && dirty) { e.preventDefault(); e.returnValue = ''; }
  }

  /* Avsluta kräver sparning först (eller uttryckligt "släng ändringarna") */
  function tryStopEdit() {
    if (dirty) {
      if (!confirm('Du har OSPARADE ändringar!\n\nTryck Avbryt och sedan 💾 Spara på sajten för att behålla dem.\nTryck OK för att SLÄNGA ändringarna och ladda om receptet.')) return;
      window.removeEventListener('beforeunload', warnUnload);
      location.reload();
      return;
    }
    stopEdit();
  }

  /* ============================================================
     AVSLUTA (behåller ändringarna synligt på sidan)
     ============================================================ */
  function stopEdit() {
    closeSok();
    window.removeEventListener('beforeunload', warnUnload);
    dirty = false;
    editing = false;
    document.body.classList.remove('mk-editing');
    document.querySelectorAll('[contenteditable="true"]').forEach(function (el) {
      el.removeAttribute('contenteditable');
    });
    document.querySelectorAll('.mk-rowbtn, .mk-addrow').forEach(function (el) { el.remove(); });
    var bar = document.getElementById('mk-editbar');
    if (bar) bar.remove();
    /* ✨ Kör om steg-markeringar + 🔗 maskinlänkar på de (ev. nya) texterna */
    if (window.__MK_STEGMARK_KOR) setTimeout(window.__MK_STEGMARK_KOR, 200);
    if (window.__MK_MASKLANK_KOR) setTimeout(window.__MK_MASKLANK_KOR, 300);
    if (window.__MK_TOAST) window.__MK_TOAST('Ändringarna syns på sidan – ladda upp filen för att spara permanent');
  }

  /* ============================================================
     🗑️ TA BORT HELA RECEPTET – från recept-mappen + energi.json.
     Lösenordsskyddat (spara.js). Dubbel bekräftelse med namn.
     ============================================================ */
  async function deleteRecipe() {
    if (!window.__MK_SPARA || !window.__MK_SPARA.remove) {
      alert('Spara-modulen saknas – ta bort filen manuellt på GitHub.'); return;
    }
    var fname = decodeURIComponent(location.pathname.split('/').pop());
    var rNamn = ((document.querySelector('meta[name="recept:namn"]') || {}).content || fname)
      .replace(/[\u{1F300}-\u{1FAFF}\uFE0F]/gu, '').trim();

    /* Egen bekräftelsedialog (confirm/prompt kan blockeras av webbläsare) */
    if (document.getElementById('mk-del-bg')) return;
    var bg = document.createElement('div');
    bg.id = 'mk-del-bg';
    bg.className = 'no-print';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:320;display:flex;align-items:center;justify-content:center;padding:16px;';
    bg.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:26px 28px;text-align:center;font-family:Segoe UI,system-ui,sans-serif;color:#2c3e50;">' +
        '<div style="font-size:2.4rem;">\uD83D\uDDD1\uFE0F</div>' +
        '<h3 style="margin:8px 0 6px;">Ta bort hela receptet?</h3>' +
        '<p style="font-size:.92rem;margin:0 0 6px;"><b>\u201C' + rNamn + '\u201D</b></p>' +
        '<p style="font-size:.85rem;color:#7f8c8d;margin:0 0 14px;">Raderas permanent fr\u00e5n sajten (GitHub). Detta g\u00e5r inte att \u00e5ngra h\u00e4rifr\u00e5n.</p>' +
        '<label style="display:flex;align-items:center;gap:10px;background:#fdecea;border:1.5px solid #c0392b;border-radius:10px;padding:10px 14px;font-size:.88rem;cursor:pointer;text-align:left;">' +
          '<input type="checkbox" id="mk-del-chk" style="width:20px;height:20px;accent-color:#c0392b;flex-shrink:0;">' +
          'Ja, jag \u00e4r s\u00e4ker \u2013 ta bort receptet permanent</label>' +
        '<div style="display:flex;gap:10px;margin-top:14px;">' +
          '<button id="mk-del-ok" disabled style="flex:1;background:#c0392b;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;font-size:.95rem;cursor:pointer;opacity:.45;">\uD83D\uDDD1\uFE0F Ta bort</button>' +
          '<button id="mk-del-nej" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:12px 18px;font-weight:700;font-size:.95rem;cursor:pointer;">Avbryt</button>' +
        '</div>' +
        '<div id="mk-del-msg" style="font-size:.82rem;color:#c0392b;min-height:16px;margin-top:8px;"></div>' +
      '</div>';
    document.body.appendChild(bg);

    var chk = bg.querySelector('#mk-del-chk');
    var okBtn = bg.querySelector('#mk-del-ok');
    chk.addEventListener('change', function () {
      okBtn.disabled = !chk.checked;
      okBtn.style.opacity = chk.checked ? '1' : '.45';
    });
    bg.querySelector('#mk-del-nej').onclick = function () {
      bg.remove();
      if (window.__MK_TOAST) window.__MK_TOAST('Raderingen avbr\u00f6ts \u2013 receptet \u00e4r kvar.');
    };
    var delDown = false;
    bg.addEventListener('mousedown', function (e) { delDown = (e.target === bg); });
    bg.addEventListener('click', function (e) { if (e.target === bg && delDown) bg.remove(); });

    okBtn.onclick = async function () {
      if (!chk.checked) return;
      okBtn.disabled = true; okBtn.textContent = '\u23F3 Tar bort...';
      var msg = bg.querySelector('#mk-del-msg');

      var res = await window.__MK_SPARA.remove('recept/' + fname, 'Recept borttaget via sajten: ' + rNamn);
      if (res.ok) {
        /* Stada energidata ocksa (fel har stoppar inte flodet) */
        try {
          var raw = await window.__MK_SPARA.load('json/energi.json');
          if (raw) {
            var db = JSON.parse(raw);
            if (db.recept && db.recept[fname]) {
              delete db.recept[fname];
              await window.__MK_SPARA.save('json/energi.json', JSON.stringify(db, null, 1),
                'Energidata borttagen: ' + fname);
            }
          }
        } catch (e) {}
        dirty = false;
        window.removeEventListener('beforeunload', warnUnload);
        document.body.innerHTML =
          '<div style="max-width:520px;margin:15vh auto;text-align:center;font-family:Segoe UI,system-ui,sans-serif;padding:20px;">' +
          '<div style="font-size:3rem;">\uD83D\uDDD1\uFE0F</div>' +
          '<h2 style="color:#2c3e50;margin:10px 0;">Receptet \u00e4r borttaget</h2>' +
          '<p style="color:#7f8c8d;">\u201C' + rNamn + '\u201D raderades fr\u00e5n sajten. Det f\u00f6rsvinner ur receptsamlingen om ~1 minut (gr\u00f6n bock i Actions).</p>' +
          '<a href="../recept.html" style="display:inline-block;margin-top:16px;background:#c0392b;color:#fff;text-decoration:none;border-radius:12px;padding:12px 26px;font-weight:700;">\uD83D\uDCD6 Till receptsamlingen</a></div>';
      } else {
        okBtn.disabled = false; okBtn.textContent = '\uD83D\uDDD1\uFE0F Ta bort';
        msg.textContent = '\u26A0\uFE0F Kunde inte ta bort: ' + res.error;
      }
    };
  }

  /* ============================================================
     💾 SPARA PÅ SAJTEN (huvudvägen) – via spara.js/GitHub API.
     Lösenordsskyddad (spara.js frågar). Redigeringen avslutas
     INTE förrän sparningen lyckats.
     ============================================================ */
  async function saveToSite() {
    if (!window.__MK_SPARA) {
      if (window.__MK_TOAST) window.__MK_TOAST('Spara-modulen saknas – använder nedladdning istället');
      return saveFile();
    }
    var btn = document.getElementById('eb-save');
    btn.disabled = true; btn.textContent = '⏳ Sparar...';
    var fname = decodeURIComponent(location.pathname.split('/').pop());
    var res = await window.__MK_SPARA.save('recept/' + fname, buildCleanHtml(),
      'Recept redigerat via sajten: ' + fname);
    btn.disabled = false; btn.textContent = '💾 Spara på sajten';
    if (res.ok) {
      dirty = false;
      var d = document.getElementById('eb-dirty');
      if (d) d.textContent = '✅ sparat';
      /* 🫙 "Även ingrediens" ikryssad → uppdatera ingrediensdatabasen ur kalkylen */
      var ingChk = document.getElementById('eb-ing');
      if (ingChk && ingChk.checked && window.__MK_RECEPT_TILL_ING) {
        var r2 = await window.__MK_RECEPT_TILL_ING();
        if (window.__MK_TOAST) {
          window.__MK_TOAST(r2.ok
            ? '🎉 Sparat! Receptet är även uppdaterat i ingrediensdatabasen 🫙'
            : '🎉 Receptet sparat – men ingrediensposten misslyckades: ' + r2.error);
        }
      } else if (window.__MK_TOAST) window.__MK_TOAST('🎉 Sparat på GitHub! Live om ~1 minut (grön bock i Actions)');
      stopEdit();
    } else {
      if (window.__MK_TOAST) window.__MK_TOAST('⚠️ Kunde inte spara: ' + res.error + ' – prova ⬇️ som reserv');
    }
  }

  /* ============================================================
     SPARA: bygg uppdaterad HTML-fil och ladda ner (RESERV)
     ============================================================ */
  function buildCleanHtml() {
    // Klona dokumentet och städa bort redigerings-artefakter
    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('#mk-editbar, .mk-rowbtn, .mk-addrow, #mk-rnav, #mk-fab, #mk-top, #mk-qty, #mk-komp, ' +
      '#mk-lang, #mk-auto-qr, #mk-provenance, #mk-betyg, #mk-maskinmatch, #mk-kalkyl, #mk-donation, #mk-aff-disclosure, ' +
      '.share-btn, .print-btn, [id^="mk-pd"], [id^="mk-pw"], [id^="mk-swish"], ' +
      '.mk-saknas, .mk-prodlank, .mk-ingsub, #mk-byt-notis, .mk-ingsok, .mk-bytsmak, .mk-smakval, .mk-kallval, .mk-gruppval, #mk-match-bg, #mk-kedja, #mk-kommentarer, #mk-komm-pill, ' +
      '#mk-verif-badge, #mk-verif-info, #mk-verif-bg, .mk-sidepil, #mk-sidepil-css, #cmResume, #mk-portion').forEach(function (el) { el.remove(); });
    /* 🌡️ Enhets-spans + ⚖️ skalnings-spans + ✨ steg-markeringar → exakt originaltext */
    clone.querySelectorAll('span.mk-enh, span.mk-skala, span.mk-stegmark').forEach(function (s) {
      s.parentNode.replaceChild(clone.ownerDocument.createTextNode(s.getAttribute('data-orig') || s.textContent), s);
    });
    /* 🔗 Maskinlänkar → ren text */
    clone.querySelectorAll('a.mk-masklank').forEach(function (a) {
      a.parentNode.replaceChild(clone.ownerDocument.createTextNode(a.textContent), a);
    });
    clone.querySelectorAll('#mk-skala-badge, #mk-skala-bg, #mk-etikett-ark, #mk-etikett-bg, #mk-etikett-css, #mk-oversikt, #mk-maskval-bg, #mk-bock-reset, #mk-bock-css').forEach(function (el) { el.remove(); });
    /* ✅ bock-status är privat (localStorage) – aldrig i sparad fil */
    clone.querySelectorAll('tr.mk-bockad').forEach(function (tr) { tr.classList.remove('mk-bockad'); });
    /* 🖼️ Auto-genererad hero-SVG → återställ riktiga bildsökvägen */
    clone.querySelectorAll('img.mk-hero-auto').forEach(function (im) {
      var fn = decodeURIComponent(location.pathname.split('/').pop()).replace(/\.html?$/i, '');
      im.classList.remove('mk-hero-auto');
      im.removeAttribute('data-mk-auto');
      im.src = '../images/recept/' + fn + '.jpg';
      im.style.display = '';
    });
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

    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  function saveFile() {
    var html = buildCleanHtml();
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
