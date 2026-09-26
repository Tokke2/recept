/* PLATS: /assets/hydrering.js  (laddas av site.js på RECEPTSIDOR)
   ============================================================
   💧 HYDRERINGSVÄLJARE (användarens beställning): på DEGRECEPT
   ska besökaren kunna VÄLJA hydreringen – vattnet räknas om.

   · Visas ENDAST på degrecept: tabellen har mjöl + vatten OCH
     titel/taggar/text nämner deg/bröd/pizza/bulle/limpa/pita
     (eller en 💧 Hydrering-text finns i receptet).
   · Torrbas = rader vars namn matchar mjöl/stärkelse/gryn/whey/
     proteinpulver (samma definition som receptens hydreringstext).
   · Vätska = vatten (100%) + mjölk (87%) + yoghurt/fil (80%) +
     kvarg (78%) + ägg (76%) – viktat vatteninnehåll.
   · Väljaren ändrar ENDAST Vatten-raden (den fria variabeln):
     nytt vatten = torrbas × mål% − övrig vätska.
   · Ingenting sparas i filen – ändringen är per besökare
     (localStorage mk-hydr:<fil>) och återställs med ett klick.
     Live-kalkylen räknas om via __MK_KALKYL_REFRESH.
   · Panelen städas ur sparad HTML (#mk-hydr i redigera.js-listan).
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_HYDR_LOADED) return;
  window.__MK_HYDR_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  /* torrbas-ord och vätske-ord (andel vatten per gram) */
  var TORR_RE = /mjöl|mjol|semolina|durum|rågsikt|graham|stärkelse|starkelse|whey|proteinpulver|mannagryn|havregryn/i;
  var VATSKA = [
    { re: /^vatten$|^vatten\s|ljummet vatten|kallt vatten/i, andel: 1.0, vatten: true },
    { re: /mjölk|mjolk/i, andel: 0.87 },
    { re: /yoghurt|fil(mjölk)?$|a-fil/i, andel: 0.80 },
    { re: /kvarg|kesella/i, andel: 0.78 },
    { re: /ägg|agg/i, andel: 0.76 }
  ];
  var NYCKEL = 'mk-hydr:' + decodeURIComponent(location.pathname.split('/').pop());

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
  function rowName(tr) {
    var td = tr.querySelector('td');
    if (!td) return '';
    var c = td.cloneNode(true);
    c.querySelectorAll('.mg, .mk-rowbtn, .mk-saknas, .mk-prodlank, .drop, .no-print').forEach(function (x) { x.remove(); });
    return c.textContent.replace(/[✕✖]/g, '').trim();
  }
  function qtyCell(tr) { return tr.querySelector('.mg') || tr.querySelectorAll('td')[1] || null; }
  function gram(tr) {
    var c = qtyCell(tr);
    var m = c && c.textContent.match(/([\d.,]+)\s*(g|kg)\b/i);
    if (!m) return 0;
    var n = parseFloat(m[1].replace(',', '.'));
    return /kg/i.test(m[2]) ? n * 1000 : n;
  }

  /* Analysera tabellen → { torrbas, vatska(exkl vatten), vattenTr, rader } */
  function analysera() {
    var tbl = ingTable();
    if (!tbl) return null;
    var torr = 0, ovrigVatska = 0, vattenTr = null, vattenG = 0;
    tbl.querySelectorAll('tr').forEach(function (tr) {
      var n = rowName(tr);
      if (!n || /^(total|summa|ingrediens)/i.test(n)) return;
      var g = gram(tr);
      if (!g) return;
      if (TORR_RE.test(n)) { torr += g; return; }
      for (var i = 0; i < VATSKA.length; i++) {
        if (VATSKA[i].re.test(n)) {
          if (VATSKA[i].vatten && !vattenTr) { vattenTr = tr; vattenG = g; }
          else ovrigVatska += g * VATSKA[i].andel;
          return;
        }
      }
    });
    if (!torr || !vattenTr) return null;
    return { torr: torr, ovrig: ovrigVatska, vattenTr: vattenTr, vattenG: vattenG };
  }

  /* Är det här ett DEGRECEPT? titel/taggar/beskrivning eller 💧-text */
  function arDeg() {
    var meta = function (n) {
      var m = document.querySelector('meta[name="recept:' + n + '"]');
      return m ? (m.content || '') : '';
    };
    var txt = (document.title + ' ' + meta('namn') + ' ' + meta('taggar') + ' ' + meta('beskrivning')).toLowerCase();
    if (/\bdeg\b|pizzadeg|bröddeg|bröd|limpa|bulle|pita|toast|baguette|pizza/.test(txt)) return true;
    return !!Array.prototype.find.call(document.querySelectorAll('p, .card p'), function (p) {
      return /hydrering/i.test(p.textContent);
    });
  }

  function fmt(n) { return String(Math.round(n)); }

  function bygg() {
    if (document.getElementById('mk-hydr')) return;
    if (!arDeg()) return;
    var a = analysera();
    if (!a) return;
    var tbl = ingTable();
    var card = tbl.closest('.card') || tbl.parentNode;

    var origVatten = a.vattenG;                     /* filens originalvärde */
    var origHydr = (a.vattenG + a.ovrig) / a.torr;  /* receptets hydrering */

    var box = document.createElement('div');
    box.id = 'mk-hydr';
    box.className = 'no-print';
    box.style.cssText = 'margin-top:10px;padding:12px 16px;background:linear-gradient(135deg,#eef7fb,#f4fbf6);' +
      'border:1.5px solid #cfe5ef;border-radius:12px;font-size:.88rem;';
    box.innerHTML =
      '<b>💧 Välj hydrering</b> <span style="color:#7f8c8d;font-size:.8rem;">(receptets: ' + Math.round(origHydr * 100) + '% – vattnet räknas om, inget annat ändras)</span>' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;">' +
        '<input type="range" id="mk-hydr-sl" min="45" max="80" step="1" value="' + Math.round(origHydr * 100) + '"' +
          ' style="flex:1;min-width:140px;accent-color:#2980b9;">' +
        '<span id="mk-hydr-val" style="font-weight:800;color:#2980b9;font-size:1.05rem;min-width:46px;text-align:center;">' + Math.round(origHydr * 100) + '%</span>' +
        '<button type="button" id="mk-hydr-reset" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:9px;' +
          'padding:7px 14px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.8rem;">↩️ Recept</button>' +
      '</div>' +
      '<div id="mk-hydr-info" style="margin-top:6px;font-size:.8rem;color:#7f8c8d;"></div>';
    card.appendChild(box);

    var sl = box.querySelector('#mk-hydr-sl');
    var val = box.querySelector('#mk-hydr-val');
    var info = box.querySelector('#mk-hydr-info');

    function satt(procent, spara) {
      var mal = procent / 100;
      var nyVatten = Math.max(0, a.torr * mal - a.ovrig);
      var cell = qtyCell(a.vattenTr);
      if (!cell) return;
      cell.textContent = fmt(nyVatten) + ' g';
      if (a.vattenTr.hasAttribute('data-mangd')) a.vattenTr.setAttribute('data-mangd', fmt(nyVatten) + ' g');
      val.textContent = procent + '%';
      var diff = Math.round(nyVatten - origVatten);
      info.textContent = diff === 0
        ? 'Vatten: ' + fmt(nyVatten) + ' g (receptets original)'
        : 'Vatten: ' + fmt(nyVatten) + ' g (' + (diff > 0 ? '+' : '') + diff + ' g mot receptet) · '
          + (procent >= 70 ? 'Lös deg – degskrapa & våta händer! 🖐️'
             : procent >= 62 ? 'Mjuk, lätthanterad deg 👍'
             : procent >= 55 ? 'Fast, lättkavlad deg 🥖'
             : 'Mycket fast deg – kräver ordentlig knådning 💪');
      if (spara) {
        try {
          if (diff === 0) localStorage.removeItem(NYCKEL);
          else localStorage.setItem(NYCKEL, String(procent));
        } catch (e) {}
      }
      if (window.__MK_KALKYL_REFRESH) window.__MK_KALKYL_REFRESH();
    }

    sl.addEventListener('input', function () { satt(+sl.value, true); });
    box.querySelector('#mk-hydr-reset').addEventListener('click', function () {
      sl.value = Math.round(origHydr * 100);
      satt(+sl.value, true);
      if (window.__MK_TOAST) window.__MK_TOAST('↩️ Vattnet återställt till receptets ' + Math.round(origHydr * 100) + '%');
    });

    /* återställ besökarens tidigare val */
    try {
      var sparad = parseInt(localStorage.getItem(NYCKEL));
      if (sparad >= 45 && sparad <= 80 && sparad !== Math.round(origHydr * 100)) {
        sl.value = sparad;
        satt(sparad, false);
      } else {
        satt(Math.round(origHydr * 100), false);
      }
    } catch (e) { satt(Math.round(origHydr * 100), false); }
  }

  /* vänta in ev. tabell-ombyggnad (ingrediens.js bygger mk-ing2) */
  function start() { setTimeout(bygg, 900); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
