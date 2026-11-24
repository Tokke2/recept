/* ============================================================
   PLATS: /assets/etikett.js  (assets-mappen i repo-roten)
   ============================================================
   🏷️ BURKETIKETTER – Mitt Maskinkök
   ============================================================
   Genererar utskrivbara etiketter för recept – perfekt för
   sylt-/sås-/saftburkar i skafferi & frys:
     · Receptnamn + emoji · tillverkningsdatum (idag, ändringsbart)
     · kcal/100 g + pris ur live-kalkylen (om den finns)
     · QR-kod till receptet (api.qrserver.com, samma som Swish-QR)
     · Välj antal (1–24) och storlek (liten 38×28 / mellan 52×37 /
       stor 70×50 mm) → skrivs ut på A4, skär/klipp efter linjerna
   Knappen visas på ALLA receptsidor (extra given för recept med
   <meta recept:ingrediens="ja"> eller sylt/saft/sås i namnet).
   Egen utskriftsyta (dold iframe-fri: print-only div) så själva
   receptsidan inte skrivs ut samtidigt.
   Laddas av site.js på receptsidor. Källfiler röres aldrig.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_ETIKETT_LOADED) return;
  window.__MK_ETIKETT_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  /* 🖨️ Storlekar för BÅDE laserskrivare (A4-ark, klipplinjer) och
     ETIKETTSKRIVARE (en etikett per sida = skrivarens rullformat).
     dymo-lagen matchar vanliga rullar (Dymo 99014/S0722430 = 54×101,
     Brother DK-11202 = 62×100, DK-11209 = 29×62). */
  var STORLEKAR = {
    mellan:  { w: 52, h: 37,  namn: 'Mellan (52×37 mm) – A4-ark',        qr: 15, fs: 8.5, lage: 'ark' },
    stor:    { w: 70, h: 50,  namn: 'Stor (70×50 mm) – A4-ark',          qr: 20, fs: 10,  lage: 'ark' },
    xl:      { w: 105, h: 74, namn: 'XL (105×74 mm, 8/ark) – A4-ark',    qr: 28, fs: 13,  lage: 'ark' },
    dymo:    { w: 101, h: 54, namn: 'Etikettskrivare 101×54 (Dymo 99014)', qr: 24, fs: 11, lage: 'rulle' },
    brother: { w: 100, h: 62, namn: 'Etikettskrivare 100×62 (Brother DK-11202)', qr: 26, fs: 12, lage: 'rulle' },
    liten:   { w: 62, h: 29,  namn: 'Etikettskrivare 62×29 (Brother DK-11209)', qr: 0, fs: 8, lage: 'rulle' }
  };

  /* 📅 HÅLLBARHET per receptkategori → bäst före räknas AUTOMATISKT.
     Ordlistan matchas mot receptnamn+taggar (första träff vinner). */
  var HALLBARHET = [
    [/sylt|marmelad/i,               365, 'kyl (oöppnad)'],
    [/saft(?!ig)|juice/i,             90, 'kyl (oöppnad)'],
    [/tomatsås|sås|buljong|soppa/i,  180, 'frys'],
    [/glass|sorbet|fryst/i,           90, 'frys'],
    [/bröd|limpa|bulle|pita/i,        90, 'frys (3 dgr rumstemp)'],
    [/deg/i,                           3, 'kyl'],
    [/yoghurt/i,                      14, 'kyl'],
    [/torkad|jerky|chips/i,           60, 'lufttätt skafferi'],
    [/.*/,                            90, 'frys']
  ];
  function raknaBastFore(fran) {
    var text = (((document.querySelector('meta[name="recept:namn"]') || {}).content || '') + ' ' +
                ((document.querySelector('meta[name="recept:taggar"]') || {}).content || ''));
    for (var i = 0; i < HALLBARHET.length; i++) {
      if (HALLBARHET[i][0].test(text)) {
        var d = new Date(fran.getTime() + HALLBARHET[i][1] * 86400000);
        return { datum: d.toLocaleDateString('sv-SE'), dagar: HALLBARHET[i][1], forvaring: HALLBARHET[i][2] };
      }
    }
    return null;
  }

  function receptNamn() {
    var n = (document.querySelector('meta[name="recept:namn"]') || {}).content ||
      (document.querySelector('header h1') || { textContent: 'Recept' }).textContent;
    return String(n).replace(/[\u{1F300}-\u{1FAFF}\uFE0F]/gu, '').trim();
  }
  function receptEmoji() {
    var m = document.querySelector('meta[name="recept:emoji"]');
    if (m && m.content) return m.content;
    var hit = ((document.querySelector('header h1') || {}).textContent || '').match(/[\u{1F300}-\u{1FAFF}]/u);
    return hit ? hit[0] : '\uD83E\uDED9';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function kalkylInfo() {
    var tot = window.__MK_KALKYL_TOT;
    if (!tot || !tot.g) return null;
    return {
      kcal: Math.round(tot.kcal / tot.g * 100),
      kr: Math.round(tot.kr / tot.g * 1000 * 100) / 100
    };
  }

  function qrUrl(px) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=' + px + 'x' + px +
      '&data=' + encodeURIComponent(location.href.split('#')[0]);
  }

  /* ---------- Bygg utskriftsarket ---------- */
  /* 🎁 GÅVOLÄGET (SPEC 219): innehållsförteckning ur ingredienstabellen
     – för bortskänkta burkar (namnen, aldrig mängder; städade celler). */
  function innehallsLista() {
    var tbl = document.querySelector('.mk-ing2');
    if (!tbl) {
      var cards = document.querySelectorAll('.card');
      for (var i = 0; i < cards.length; i++) {
        var h = cards[i].querySelector('h2');
        if (h && /ingrediens/i.test(h.textContent)) { tbl = cards[i].querySelector('table'); break; }
      }
    }
    if (!tbl) return '';
    var ut = [];
    tbl.querySelectorAll('tr').forEach(function (tr) {
      if (tr.classList.contains('total')) return;
      var tds = tr.querySelectorAll('td');
      if (tds.length < 2) return;
      var c = tds[0].cloneNode(true);
      c.querySelectorAll('select, button, .mg, .mk-saknas, .mk-prodlank, .drop, .mk-rowbtn, .mk-ingsub, .mk-jastalt, .mk-bakpalt, .no-print').forEach(function (x) { x.remove(); });
      var n = c.textContent.replace(/[✕✖✓🛒💧]/g, ' ').replace(/\s+/g, ' ').trim();
      n = n.replace(/^[^A-Za-zÅÄÖåäö0-9]+/, '').replace(/\([^)]*\)/g, '').trim();
      if (n && !/^total/i.test(n) && n.length > 1) ut.push(n);
    });
    return ut.join(', ');
  }

  function skrivUt(antal, storlek, datum, extraRad, bastFore, gava) {
    var S = STORLEKAR[storlek];
    var rulle = S.lage === 'rulle';
    var namn = receptNamn(), emoji = receptEmoji();
    var info = kalkylInfo();
    var gammal = document.getElementById('mk-etikett-ark');
    if (gammal) gammal.remove();

    /* CSS byggs om VARJE gång (rulle-läget sätter @page = etikettens
       exakta mått → etikettskrivaren matar en etikett per sida) */
    var cssGammal = document.getElementById('mk-etikett-css');
    if (cssGammal) cssGammal.remove();
    var css = document.createElement('style');
    css.id = 'mk-etikett-css';
    css.textContent =
      '#mk-etikett-ark{display:none;}' +
      '@media print{' +
        (rulle
          ? '@page{size:' + S.w + 'mm ' + S.h + 'mm;margin:0;}' +
            'body.mk-etikett-print #mk-etikett-ark{display:block!important;padding:0;}' +
            '.mk-etikett{page-break-after:always;border:none!important;border-radius:0!important;}'
          : '@page{size:A4;margin:8mm;}' +
            'body.mk-etikett-print #mk-etikett-ark{display:flex!important;flex-wrap:wrap;gap:4mm;padding:6mm;}' +
            '.mk-etikett{border:0.4pt dashed #999;border-radius:2mm;}') +
        'body.mk-etikett-print > *:not(#mk-etikett-ark){display:none!important;}' +
        'body.mk-etikett-print{padding:0!important;background:#fff!important;}' +
        '.mk-etikett{overflow:hidden;display:flex;' +
          'flex-direction:column;justify-content:center;align-items:center;text-align:center;' +
          'page-break-inside:avoid;background:#fff;position:relative;font-family:Georgia,serif;color:#000;}' +
        '.mk-etikett .rand{position:absolute;top:0;left:0;right:0;height:2.2mm;' +
          'background:linear-gradient(90deg,#c0392b,#e67e22);-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
      '}';
    document.head.appendChild(css);

    var ark = document.createElement('div');
    ark.id = 'mk-etikett-ark';
    /* 🎨 ETIKETT-TEMAN (SPEC 244, förslag 1092): diskret inline-SVG-motiv
       ur receptets kategori (mappen i sökvägen) – bröd=veteax, sylt=bär,
       glass=snöflinga, sås/dipp=droppe, annars visp. Opacitet .13 så
       texten alltid vinner; print-color-adjust så motivet skrivs ut. */
    function temaSvg() {
      var kat = (location.pathname.match(/recept\/([^/]+)\//) || [])[1] || '';
      var P = { brod: 'M12 2c-2 3-2 5 0 8 2-3 2-5 0-8zm-5 6c-1 3 0 5 3 7 1-3 0-5-3-7zm10 0c-3 2-4 4-3 7 3-2 4-4 3-7zM12 11v11',
                sylt: 'M8 8a4 4 0 118 0 4 4 0 01-8 0zm-4 8a3 3 0 116 0 3 3 0 01-6 0zm10 1a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z',
                glass: 'M12 2v20M4 6l16 12M20 6L4 18M12 7l3-2M12 7L9 5m3 10l3 2m-3-2l-3 2',
                sas: 'M12 3c-4 6-6 9-6 12a6 6 0 0012 0c0-3-2-6-6-12z',
                dipp: 'M12 3c-4 6-6 9-6 12a6 6 0 0012 0c0-3-2-6-6-12z' };
      var d = P[kat] || 'M7 3c0 7 1 10 5 10s5-3 5-10M12 13v8m-3 0h6';
      return '<svg viewBox="0 0 24 24" style="position:absolute;right:1.5mm;bottom:1.5mm;width:7mm;height:7mm;opacity:.13;' +
        '-webkit-print-color-adjust:exact;print-color-adjust:exact;" fill="none" stroke="#2c3e50" stroke-width="1.6" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
    }
    var en = '';
    en += '<div class="mk-etikett" style="width:' + S.w + 'mm;height:' + S.h + 'mm;padding:3mm 2mm 1.5mm;">';
    en += '<div class="rand"></div>';
    en += temaSvg();
    en += '<div style="font-size:' + (S.fs + 3) + 'pt;line-height:1;">' + esc(emoji) + '</div>';
    en += '<div style="font-size:' + S.fs + 'pt;font-weight:700;line-height:1.15;max-height:' + (S.fs * 2.6) + 'pt;overflow:hidden;">' + esc(namn) + '</div>';
    en += '<div style="font-size:' + (S.fs - 1.5) + 'pt;margin-top:0.8mm;">🍳 Tillagad: ' + esc(datum) + '</div>';
    if (bastFore) en += '<div style="font-size:' + (S.fs - 1.5) + 'pt;font-weight:700;">📅 Bäst före: ' + esc(bastFore.datum) +
      '</div><div style="font-size:' + (S.fs - 2.5) + 'pt;">(' + esc(bastFore.forvaring) + ')</div>';
    if (info) en += '<div style="font-size:' + (S.fs - 1.5) + 'pt;">' + info.kcal + ' kcal/100 g · ' + info.kr.toLocaleString('sv-SE') + ' kr/kg</div>';
    if (extraRad) en += '<div style="font-size:' + (S.fs - 1.5) + 'pt;font-style:italic;">' + esc(extraRad) + '</div>';
    if (gava) {
      var inneh = innehallsLista();
      if (inneh) en += '<div style="font-size:' + (S.fs - 2.8) + 'pt;line-height:1.2;max-height:' + (S.fs * 3.2) + 'pt;overflow:hidden;margin-top:0.6mm;">🎁 Hemgjord · Innehåll: ' + esc(inneh) + '</div>';
    }
    if (S.qr) en += '<img src="' + qrUrl(S.qr * 4) + '" style="width:' + S.qr + 'mm;height:' + S.qr + 'mm;margin-top:1mm;" alt="QR">';
    en += '</div>';
    ark.innerHTML = new Array(antal + 1).join(en);
    document.body.appendChild(ark);

    /* Vänta in QR-bilderna innan utskrift */
    var imgs = ark.querySelectorAll('img');
    var kvar = imgs.length;
    function kor() {
      document.body.classList.add('mk-etikett-print');
      var stada = function () {
        document.body.classList.remove('mk-etikett-print');
        window.removeEventListener('afterprint', stada);
      };
      window.addEventListener('afterprint', stada);
      setTimeout(function () { window.print(); }, 60);
    }
    if (!kvar) return kor();
    imgs.forEach(function (im) {
      var ett = function () { if (--kvar <= 0) kor(); };
      if (im.complete) ett();
      else { im.addEventListener('load', ett); im.addEventListener('error', ett); }
    });
    setTimeout(function () { if (kvar > 0) { kvar = 0; kor(); } }, 4000);   /* reserv om QR-API:t hänger */
  }

  /* ---------- Dialogen ---------- */
  function oppna() {
    if (document.getElementById('mk-etikett-bg')) return;
    var idag = new Date().toLocaleDateString('sv-SE');
    var autoBf = raknaBastFore(new Date());   /* 📅 auto ur recepttypen */
    var bg = document.createElement('div');
    bg.id = 'mk-etikett-bg';
    bg.className = 'no-print';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:320;display:flex;' +
      'align-items:center;justify-content:center;padding:16px;';
    bg.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:24px 26px;' +
        'font-family:Segoe UI,system-ui,sans-serif;color:#2c3e50;">' +
        '<h3 style="margin:0 0 4px;">🏷️ Burketiketter</h3>' +
        '<p style="font-size:.82rem;color:#5f6e70;margin:0 0 14px;">Skrivs ut på A4 – klipp efter de streckade linjerna. QR-koden öppnar receptet.</p>' +
        '<label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px;">Storlek</label>' +
        '<select id="et-storlek" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.9rem;font-family:inherit;margin-bottom:12px;">' +
          Object.keys(STORLEKAR).map(function (k, i) {
            return '<option value="' + k + '"' + (k === 'mellan' ? ' selected' : '') + '>' + STORLEKAR[k].namn +
              (STORLEKAR[k].qr ? ' – med QR' : ' – utan QR') + '</option>';
          }).join('') + '</select>' +
        '<label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px;">Antal etiketter <span style="font-weight:400;color:#5f6e70;">(A4: klipps ur arket · etikettskrivare: matas en och en)</span></label>' +
        '<input id="et-antal" type="number" min="1" max="24" value="6" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.9rem;font-family:inherit;margin-bottom:12px;">' +
        '<label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px;">🍳 Tillagningsdatum</label>' +
        '<input id="et-datum" type="text" value="' + idag + '" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.9rem;font-family:inherit;margin-bottom:12px;">' +
        '<label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px;">📅 Bäst före <span style="font-weight:400;color:#5f6e70;">(räknas ut av receptet – ändra fritt)</span></label>' +
        '<input id="et-bastfore" type="text" value="' + (autoBf ? autoBf.datum : '') + '" placeholder="lämna tomt för att utelämna" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.9rem;font-family:inherit;margin-bottom:4px;">' +
        (autoBf ? '<p style="font-size:.74rem;color:#27ae60;margin:0 0 12px;">🤖 ' + autoBf.dagar + ' dagar (' + autoBf.forvaring + ') utifrån recepttypen</p>' : '<p style="margin:0 0 12px;"></p>') +
        '<label style="display:flex;align-items:center;gap:8px;font-size:.86rem;font-weight:700;margin:0 0 12px;cursor:pointer;background:#fdf6ee;border:1.5px solid #ead9c2;border-radius:10px;padding:10px 12px;">' +
          '<input type="checkbox" id="et-gava" style="width:17px;height:17px;accent-color:#c0392b;cursor:pointer;">🎁 Gåvoetikett – innehållsförteckningen följer med (för bortskänkta burkar)</label>' +
        '<label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px;">Extra rad (valfritt)</label>' +
        '<input id="et-extra" type="text" placeholder="t.ex. Öppnad burk: 1 vecka i kyl" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.9rem;font-family:inherit;margin-bottom:16px;">' +
        '<div style="display:flex;gap:10px;">' +
          '<button id="et-print" style="flex:1;background:#c0392b;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;font-size:.95rem;cursor:pointer;font-family:inherit;">🖨️ Skriv ut etiketter</button>' +
          '<button id="et-stang" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;font-family:inherit;">Stäng</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bg);

    function stang() { bg.remove(); }
    bg.querySelector('#et-stang').onclick = stang;
    var ned = false;
    bg.addEventListener('mousedown', function (e) { ned = (e.target === bg); });
    bg.addEventListener('click', function (e) { if (e.target === bg && ned) stang(); });
    bg.querySelector('#et-print').onclick = function () {
      var antal = Math.max(1, Math.min(24, parseInt(bg.querySelector('#et-antal').value, 10) || 6));
      var storlek = bg.querySelector('#et-storlek').value;
      var datum = bg.querySelector('#et-datum').value.trim() || idag;
      var extra = bg.querySelector('#et-extra').value.trim();
      var bfText = bg.querySelector('#et-bastfore').value.trim();
      var bastFore = bfText ? { datum: bfText, forvaring: (autoBf && autoBf.datum === bfText) ? autoBf.forvaring : 'se recept' } : null;
      var gava = !!bg.querySelector('#et-gava').checked;
      stang();
      skrivUt(antal, storlek, datum, extra, bastFore, gava);
    };
  }

  /* ---------- Knapp i verktygsraden ---------- */
  var forsok = 0;
  (function vantaBar() {
    var bar = document.getElementById('mk-rnav');
    if (!bar) { if (++forsok < 60) return void setTimeout(vantaBar, 250); return; }
    if (document.getElementById('rnEtikett')) return;
    var b = document.createElement('button');
    b.className = 'rb';
    b.id = 'rnEtikett';
    b.title = 'Skriv ut burketiketter (namn, datum, näring, QR till receptet)';
    b.innerHTML = '<span class="ic">🏷️</span><span class="lb">Etiketter</span>';
    var share = document.getElementById('rnShare');
    bar.appendChild(b);   /* punkt 174: konsekvent – observern sorterar till Mer-trayen */
    b.addEventListener('click', oppna);
  })();
})();
