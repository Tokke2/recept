/* PLATS: /assets/inkopslista.js  (laddas av site.js på RECEPTSIDOR)
   ============================================================
   🛒 INKÖPSLISTAN (SPEC-punkt 191, förslag 955 – användarens
   beställning): utskrift med ENDAST ingredienstabellen + kryss-
   rutor i A5-format – att ta med till butiken.
   · Knappen läggs i #mk-rnav med appendChild (174-regeln:
     ALDRIG positionera mot syskon – Mer-trayen äger ordningen).
   · Läser tabellen FÄRSKT vid klick → skalade mängder (×½/×2,
     skivläge) följer med exakt som de visas.
   · Samma UI-städning som kockläget (SPEC 226): matchnings-
     rullistor, radknappar och verktyg följer ALDRIG med.
   · Ingenting sparas i filen – ren utskriftsvy i eget fönster.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_INKOP_LOADED) return;
  window.__MK_INKOP_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  var SKRAP = 'select, button, .mk-saknas, .mk-prodlank, .drop, .mk-rowbtn, .mk-bytsmak, .mk-smakval, .mk-kallval, .mk-gruppval, .mk-ingsub, .no-print';

  function ingTable() {
    var t = document.querySelector('.mk-ing2');
    if (t) return t;
    var cards = document.querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      var h = cards[i].querySelector('h2');
      if (h && /ingrediens/i.test(h.textContent)) return cards[i].querySelector('table');
    }
    return null;
  }
  function cellText(td) {
    var c = td.cloneNode(true);
    c.querySelectorAll(SKRAP).forEach(function (x) { x.remove(); });
    return c.textContent.replace(/[✕✖]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function skrivUt() {
    var tbl = ingTable();
    if (!tbl) return;
    var namn = (document.querySelector('meta[name="recept:namn"]') || {}).content || document.title;
    var rader = [];
    tbl.querySelectorAll('tr').forEach(function (tr) {
      if (tr.classList.contains('total')) return;
      var tds = tr.querySelectorAll('td');
      if (tds.length < 2) return;
      var n = cellText(tds[0]), m = cellText(tds[1]);
      if (!n || /^total/i.test(n)) return;
      rader.push('<li><span class="ruta"></span><b>' + n.replace(/</g, '&lt;') + '</b><span class="m">' + m.replace(/</g, '&lt;') + '</span></li>');
    });
    if (!rader.length) return;
    var w = window.open('', '_blank');
    if (!w) { if (window.__MK_TOAST) window.__MK_TOAST('Tillåt popup-fönster för att skriva ut inköpslistan'); return; }
    w.document.write('<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>🛒 Inköpslista – ' + namn.replace(/</g, '&lt;') + '</title><style>' +
      '@page{size:A5;margin:12mm;}' +
      'body{font-family:-apple-system,"Segoe UI",Roboto,sans-serif;color:#222;font-size:11pt;max-width:420px;margin:0 auto;padding:12px;}' +
      'h1{font-size:13pt;margin:0 0 4px;}' +
      '.sub{font-size:8.5pt;color:#777;margin:0 0 10px;}' +
      'ul{list-style:none;padding:0;margin:0;}' +
      'li{display:flex;align-items:baseline;gap:8px;padding:6px 0;border-bottom:1px dotted #bbb;}' +
      '.ruta{flex:0 0 auto;width:13px;height:13px;border:1.5px solid #555;border-radius:3px;transform:translateY(2px);}' +
      'li b{flex:1;font-weight:600;}' +
      '.m{color:#444;white-space:nowrap;}' +
      'footer{margin-top:14px;font-size:8pt;color:#999;}' +
      '</style></head><body>' +
      '<h1>🛒 ' + namn.replace(/</g, '&lt;') + '</h1>' +
      '<p class="sub">Inköpslista · mängderna som de visas just nu (inkl. din skalning)</p>' +
      '<ul>' + rader.join('') + '</ul>' +
      '<footer>Mitt Maskinkök · tokke2.github.io/recept</footer>' +
      '</body></html>');
    w.document.close();
    w.focus();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 350);
  }

  /* knappen in i verktygsraden när den finns (receptnav bygger async) */
  var forsok = 0;
  var iv = setInterval(function () {
    forsok++;
    var rnav = document.getElementById('mk-rnav');
    if (!rnav && forsok < 20) return;
    clearInterval(iv);
    if (!rnav || document.getElementById('rnInkop')) return;
    var b = document.createElement('button');
    b.id = 'rnInkop';
    b.type = 'button';
    b.innerHTML = '🛒<span>Inköp</span>';
    b.title = 'Skriv ut inköpslista (A5): endast ingredienserna + kryssrutor';
    b.onclick = skrivUt;
    rnav.appendChild(b);   /* 174-regeln: appendChild – trayen sorterar */
  }, 400);
})();
