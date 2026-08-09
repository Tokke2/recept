/* ============================================================
   PLATS: /assets/ingrediens.js  (assets-mappen i repo-roten)
   ============================================================
   INGREDIENSTABELL v2 – Mitt Maskinkök
   ============================================================
   Gör om ingredienstabellen på ALLA receptsidor centralt:

   · Namn + mängd i SAMMA kolumn (mängden som grön pastill)
   · Priset längst till höger, diskret – förknippas inte med mängden
   · Tydlig understrykning per rad – lätt att följa raden med ögat
   · 💧 VÄTSKOR SORTERAS ÖVERST (bakmaskinsordning: vätskan i först!)
   · TOTALT-raden ligger alltid sist, markerad

   Källfilerna behåller sina vanliga tabeller (Ingrediens/Mängd/
   Kostnad) – designen läggs på här, på ETT ställe för alla recept.
   Kockläget läser data-namn/data-mangd som sätts på varje rad.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_ING_LOADED) return;
  window.__MK_ING_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  /* Vätskor (bakmaskinsordning: dessa ska i maskinen först).
     OBS: \b funkar inte med åäö i JS – egen ordgräns används. */
  /* Två sorters ord: HELA ord (rom får inte träffa "romkross")
     och SLUT-DELAR (olja träffar rapsolja/olivolja, mjölk träffar
     havremjölk – men mjöl träffar INTE eftersom det inte är vätska). */
  var HELA_ORD = ['vatten', 'yoghurt', 'juice', 'saft', 'honung', 'sirap',
    'ägg', 'agg', 'rom', 'rum', 'vin', 'öl', 'läsk', 'lask', 'kaffe'];
  var SLUT_DELAR = ['olja', 'mjölk', 'mjolk', 'grädde', 'gradde'];
  function arVatska(namn) {
    var n = ' ' + namn.toLowerCase() + ' ';
    var hel = HELA_ORD.some(function (w) {
      var i = n.indexOf(w);
      while (i !== -1) {
        if (!/[a-zåäö]/.test(n[i - 1]) && !/[a-zåäö]/.test(n[i + w.length])) return true;
        i = n.indexOf(w, i + 1);
      }
      return false;
    });
    if (hel) return true;
    return SLUT_DELAR.some(function (w) {
      var i = n.indexOf(w);
      while (i !== -1) {
        if (!/[a-zåäö]/.test(n[i + w.length])) return true;  /* ordSLUT räcker */
        i = n.indexOf(w, i + 1);
      }
      return false;
    });
  }

  var css = document.createElement('style');
  css.textContent =
    '.mk-ing2 { width:100%; border-collapse:collapse; font-size:.92rem; }' +
    '.mk-ing2 th { text-align:left; padding:8px 10px; background:#f0ebe3; font-size:.75rem;' +
      'text-transform:uppercase; letter-spacing:.05em; color:#7f8c8d; }' +
    '.mk-ing2 th.matt, .mk-ing2 td.matt { text-align:right; white-space:nowrap; width:1%; }' +
    '.mk-ing2 th.pris, .mk-ing2 td.pris { text-align:right; white-space:nowrap; width:1%; }' +
    '.mk-ing2 td { padding:9px 10px; border-bottom:1.5px solid #e8e2d8; vertical-align:middle; }' +
    '.mk-ing2 tr:last-child td { border-bottom:none; }' +
    '.mk-ing2 td.matt { font-weight:700; color:#27ae60; font-variant-numeric:tabular-nums; }' +
    '.mk-ing2 td.pris { color:#a5967e; font-size:.88em; font-variant-numeric:tabular-nums; }' +
    '.mk-ing2 .drop { margin-right:5px; }' +
    '.mk-ing2 tr.tot td { background:#faf7f2; font-weight:700; border-top:2px solid #d5cbb8; }' +
    '.mk-ing2 tr.tot td.matt, .mk-ing2 tr.tot td.pris { color:#2c3e50; }' +
    '@media print{' +
      '.mk-ing2 td{border-bottom:.5pt solid #999!important;padding:1.8mm 2mm!important;}' +
      '.mk-ing2 td.matt{color:#000!important;}' +
      '.mk-ing2 td.pris{color:#555!important;}' +
      '.mk-ing2 tr.tot td{background:#eee!important;-webkit-print-color-adjust:exact;}' +
    '}';
  document.head.appendChild(css);

  function findIngTable() {
    var cards = document.querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      var h = cards[i].querySelector('h2');
      if (h && /ingrediens/i.test(h.textContent)) {
        var t = cards[i].querySelector('table');
        if (t) return t;
      }
    }
    return null;
  }

  function build() {
    var table = findIngTable();
    if (!table || table.classList.contains('mk-ing2')) return;

    /* ---------- Läs ut raderna ur befintlig tabell ---------- */
    var items = [], grupp = null, hasPris = false;
    var rows = table.querySelectorAll('tr');
    for (var i = 0; i < rows.length; i++) {
      var tds = rows[i].querySelectorAll('td');
      if (!tds.length) continue;                                   /* th-rubrikrad */
      var namn = (tds[0].textContent || '').trim();
      if (!namn) continue;
      /* Grupprubrik-rad (t.ex. "Smuldegen" med colspan) */
      if (tds.length === 1 || tds[0].getAttribute('colspan')) { grupp = namn; continue; }
      var mangd = (tds[1] ? tds[1].textContent : '').trim();
      var pris = (tds[2] ? tds[2].textContent : '').trim();
      if (pris) hasPris = true;
      items.push({
        namn: namn, mangd: mangd, pris: pris, grupp: grupp,
        tot: /^total/i.test(namn),
        vatska: arVatska(namn)
      });
    }
    if (items.length < 2) return;

    /* ---------- Sortera: grupper bevaras, vätskor först i varje, totalt sist ---------- */
    var tot = items.filter(function (x) { return x.tot; });
    var rest = items.filter(function (x) { return !x.tot; });
    var ordered = [];
    var seen = [];
    rest.forEach(function (x) { if (seen.indexOf(x.grupp) === -1) seen.push(x.grupp); });
    seen.forEach(function (g) {
      var inG = rest.filter(function (x) { return x.grupp === g; });
      ordered.push({ grupp: g, rader: inG.filter(function (x) { return x.vatska; })
        .concat(inG.filter(function (x) { return !x.vatska; })) });
    });

    /* ---------- Bygg nya tabellen: TRE tydliga kolumner ---------- */
    var h = '<tr><th>Ingrediens' +
      (ordered.some(function (g) { return g.rader.some(function (r) { return r.vatska; }); })
        ? ' <span style="font-weight:400;text-transform:none;letter-spacing:0;">(💧 blöta överst – i maskinen först)</span>' : '') +
      '</th><th class="matt">Mått</th>' + (hasPris ? '<th class="pris">Pris</th>' : '') + '</tr>';

    var cols = hasPris ? 3 : 2;
    ordered.forEach(function (g) {
      if (g.grupp) {
        h += '<tr><td colspan="' + cols + '" style="background:#faf7f2;font-weight:700;border-bottom:2px solid #d5cbb8;">' + g.grupp + '</td></tr>';
      }
      g.rader.forEach(function (r) {
        h += '<tr data-namn="' + r.namn.replace(/"/g, '&quot;') + '" data-mangd="' + r.mangd.replace(/"/g, '&quot;') + '">' +
          '<td>' + (r.vatska ? '<span class="drop">💧</span>' : '') + r.namn + '</td>' +
          '<td class="matt">' + (r.mangd || '–') + '</td>' +
          (hasPris ? '<td class="pris">' + (r.pris || '') + '</td>' : '') + '</tr>';
      });
    });
    tot.forEach(function (r) {
      h += '<tr class="tot"><td>' + r.namn + '</td>' +
        '<td class="matt">' + (r.mangd || '') + '</td>' +
        (hasPris ? '<td class="pris">' + (r.pris || '') + '</td>' : '') + '</tr>';
    });

    table.className = (table.className ? table.className + ' ' : '') + 'mk-ing2';
    table.innerHTML = h;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
