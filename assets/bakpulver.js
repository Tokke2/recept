/* PLATS: /assets/bakpulver.js  (laddas av site.js på RECEPTSIDOR)
   ============================================================
   🧁 BAKPULVERERSÄTTAREN (SPEC-punkt 184 – användarens beställning):
   i ALLA recept med bakpulver visas hur det ersätts med BIKARBONAT
   – och om CITRONSYRA/annan syra behövs. Syra behövs INTE när
   receptet redan innehåller något surt (t.ex. yoghurt).

   · Webbverifierad regel (Santa Maria, Kockens, Lindas bakskola):
     1 tsk bakpulver = ½ tsk bikarbonat.
   · Bikarbonat kräver SYRA för att jäsa. Finns yoghurt/fil/citron/
     vinäger m.fl. i ingredienstabellen räcker den. Annars: ½ tsk
     citronsaft/vinäger – eller lika mycket citronsyra löst i
     degvätskan – per tsk bakpulver (Samarin-regeln: 50/50
     bikarbonat+citronsyra ersätter bakpulver 1:1).
   · Radtips (.mk-bakpalt) på bakpulverraden + panel #mk-bakp under
     ingredienskortet + stegtips i "Gör så här" + kockläges-
     hjälparen window.__MK_BAKP_ALT (recept.js anropar).
   · Ingenting sparas i filen: buildCleanHtml (redigera.js) städar
     #mk-bakp + .mk-bakpalt ur sparade filer.
   · Visar bara omvandling när mängden går att läsa i tsk/msk/krm –
     inga påhittade siffror (ärlighetsprincipen).
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_BAKP_LOADED) return;
  window.__MK_BAKP_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  var BAKP_RE = /bakpulver/i;
  /* sura ingredienser som aktiverar bikarbonat (då behövs INGEN citronsyra) */
  var SYRA_RE = /yoghurt|yogurt|youghurt|filmjölk|filmjolk|\bfil\b|kefir|gräddfil|graddfil|creme ?fraiche|crème ?fraîche|surmjölk|surmjolk|kärnmjölk|karnmjolk|citron|lime|vinäger|vinager|ättika|attika|lingon/i;
  var TSK = { tsk: 1, msk: 3, krm: 0.2 };   /* 1 msk = 3 tsk · 1 tsk = 5 krm */

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

  /* "2 tsk", "1 ½ msk", "0,5 tsk", "3 krm" → antal tsk (0 = oläsbar) */
  function tskAv(text) {
    var m = String(text || '').match(/((?:\d+\s+)?[½¼¾]|\d+(?:[.,]\d+)?)\s*(tsk|msk|krm)\b/i);
    if (!m) return 0;
    var tal = m[1].trim(), v = 0;
    var br = { '½': 0.5, '¼': 0.25, '¾': 0.75 };
    if (/[½¼¾]/.test(tal)) {
      var delar = tal.split(/\s+/);
      delar.forEach(function (d) { v += br[d] !== undefined ? br[d] : (parseFloat(d.replace(',', '.')) || 0); });
    } else v = parseFloat(tal.replace(',', '.')) || 0;
    return v * (TSK[m[2].toLowerCase()] || 0);
  }
  function fmtTsk(v) {
    /* kvartsavrundning med ½/¼/¾ – under ¼ tsk visas krm (1 tsk = 5 krm) */
    if (v <= 0) return '';
    if (v < 0.24) return Math.max(1, Math.round(v * 5)) + ' krm';
    var q = Math.round(v * 4) / 4;
    var hel = Math.floor(q), rest = +(q - hel).toFixed(2);
    var R = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' }[rest] || '';
    var s = (hel ? String(hel) : '') + (R ? (hel ? ' ' : '') + R : '');
    if (!s) s = String(q).replace('.', ',');
    return s + ' tsk';
  }

  function bakpRader() {
    var tbl = ingTable();
    if (!tbl) return [];
    var ut = [];
    tbl.querySelectorAll('tr').forEach(function (tr) {
      if (tr.classList.contains('total')) return;
      var namn = rowName(tr);
      if (!namn || !BAKP_RE.test(namn)) return;
      var qc = qtyCell(tr);
      var t = tskAv(qc ? qc.textContent : '');
      if (!t) return;                       /* oläsbar mängd → avstå, inga gissningar */
      ut.push({ tr: tr, namn: namn, tsk: t });
    });
    return ut;
  }

  /* Finns en sur ingrediens i tabellen? → returnera dess namn (eller '') */
  function surIngrediens() {
    var tbl = ingTable();
    if (!tbl) return '';
    var hit = '';
    tbl.querySelectorAll('tr').forEach(function (tr) {
      if (hit || tr.classList.contains('total')) return;
      var namn = rowName(tr);
      if (namn && SYRA_RE.test(namn) && !BAKP_RE.test(namn)) hit = namn;
    });
    return hit;
  }

  /* 🏷️ Radtips direkt på bakpulverraden: "2 tsk (≈ 1 tsk bikarbonat)" */
  function radTips() {
    bakpRader().forEach(function (rad) {
      var qc = qtyCell(rad.tr);
      if (!qc || qc.querySelector('.mk-bakpalt')) return;
      if (/bikarbonat/i.test(qc.textContent)) return;   /* ägaren har redan skrivit det */
      var s = document.createElement('span');
      s.className = 'mk-bakpalt';
      s.textContent = ' (≈ ' + fmtTsk(rad.tsk / 2) + ' bikarbonat)';
      s.style.cssText = 'color:#5f6e70;font-weight:400;font-size:.88em;white-space:nowrap;';
      qc.appendChild(s);
    });
  }

  /* 🏷️ Stegtips i "Gör så här": "...1 tsk bakpulver (≈ ½ tsk bikarbonat)" */
  function stegTips() {
    document.querySelectorAll('.card ol li, .card ul li').forEach(function (li) {
      if (li.querySelector('.mk-bakpalt')) return;
      var t = li.textContent;
      if (!BAKP_RE.test(t) || /bikarbonat/i.test(t)) return;
      var m = t.match(/((?:\d+\s+)?[½¼¾]|\d+(?:[.,]\d+)?)\s*(tsk|msk|krm)\s+bakpulver/i);
      if (!m) return;
      var v = tskAv(m[0]);
      if (!v) return;
      var s = document.createElement('span');
      s.className = 'mk-bakpalt';
      s.textContent = ' (≈ ' + fmtTsk(v / 2) + ' bikarbonat)';
      s.style.cssText = 'color:#5f6e70;font-weight:400;font-size:.88em;';
      li.appendChild(s);
    });
  }

  /* 🧁 Panelen under ingredienskortet */
  function bygg() {
    if (document.getElementById('mk-bakp')) return;
    var rader = bakpRader();
    if (!rader.length) return;
    var tbl = ingTable();
    var card = tbl.closest('.card') || tbl.parentNode;
    var tot = rader.reduce(function (s, r) { return s + r.tsk; }, 0);
    var syra = surIngrediens();

    var box = document.createElement('div');
    box.id = 'mk-bakp';
    box.className = 'no-print';
    box.style.cssText = 'margin-top:10px;padding:12px 16px;background:linear-gradient(135deg,#fdf6ee,#f6f4fb);' +
      'border:1.5px solid #ead9c2;border-radius:12px;font-size:.88rem;';
    var syraHtml = syra
      ? '<div style="margin-top:6px;">✅ <b>Ingen citronsyra behövs</b> – receptet innehåller redan en sur ingrediens (' +
        syra.replace(/</g, '&lt;') + ') som aktiverar bikarbonatet.</div>'
      : '<div style="margin-top:6px;">⚠️ Receptet saknar sur ingrediens → tillsätt även <b>' + fmtTsk(tot / 2) +
        ' citronsaft eller vinäger</b> – eller lika mycket <b>citronsyra</b> löst i degvätskan – annars jäser inte bikarbonatet.</div>';
    box.innerHTML =
      '<b>🧁 Slut på bakpulver?</b> <span style="color:#5f6e70;font-size:.8rem;">(1 tsk bakpulver = ½ tsk bikarbonat · Santa Maria/Kockens-regeln)</span>' +
      '<div style="margin-top:8px;">Receptets <b>' + fmtTsk(tot) + ' bakpulver</b> kan ersättas med <b style="color:#27ae60;">' +
      fmtTsk(tot / 2) + ' bikarbonat</b>.</div>' + syraHtml;
    card.appendChild(box);
  }

  /* 🧑‍🍳 KOCKLÄGETS BAKPULVERVISNING – samma mönster som __MK_JAST_ALT */
  window.__MK_BAKP_ALT = function (namn, mangd) {
    namn = String(namn || ''); mangd = String(mangd || '');
    if (!BAKP_RE.test(namn) || /bikarbonat/i.test(mangd)) return '';
    var v = tskAv(mangd);
    if (!v) return '';
    return ' (≈ ' + fmtTsk(v / 2) + ' bikarbonat)';
  };

  /* tabellen kan byggas om av andra moduler – försök lugnt några gånger */
  var forsok = 0;
  var iv = setInterval(function () {
    forsok++;
    if (document.getElementById('mk-bakp') || forsok > 10) { clearInterval(iv); return; }
    if (ingTable()) { clearInterval(iv); bygg(); radTips(); stegTips(); }
  }, 400);
})();
