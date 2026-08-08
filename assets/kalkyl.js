/* ============================================================
   PLATS: /assets/kalkyl.js  (assets-mappen i repo-roten)
   ============================================================
   LIVE-KALKYL – Mitt Maskinkök
   ============================================================
   Räknar ut PRIS & NÄRING för varje recept AUTOMATISKT ur den
   centrala ingrediensdatabasen (json/ingredienser.json):

   · Läser receptets ingredienstabell (data-namn/data-mangd som
     ingrediens.js sätter, annars vanliga tabellceller)
   · Matchar varje rad mot databasen, räknar om mängden till gram
     (g, kg, dl, msk, tsk, st ...) och summerar pris, kcal,
     protein, kolhydrat, fett och fiber
   · Visar kortet "🧮 Live-kalkyl" under ingredienserna med
     totaler + per portion (portioner läses ur beskrivningen)
   · Uppdaterar även prisen i ingredienstabellen med FÄRSKA
     priser ur databasen (gröna = live, gamla behålls om ingen
     träff finns)

   → Uppdaterar du en ingrediens pris/näring på ingredienser.html
     slår det igenom på ALLA recept direkt. Inga receptfiler rörs.
   Laddas av site.js på receptsidor.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_KALKYL_LOADED) return;
  window.__MK_KALKYL_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  /* ---------- Mängd → gram ---------- */
  var UNITS = { g: 1, gram: 1, kg: 1000, l: 1000, liter: 1000, dl: 100, cl: 10, ml: 1, msk: 15, tsk: 5, krm: 1 };
  function toGrams(mangd, namn) {
    var s = String(mangd).toLowerCase().replace(',', '.');
    var m = s.match(/([\d.]+)\s*(kg|g|gram|dl|cl|ml|l|liter|msk|tsk|krm|st)\b/);
    if (!m) {
      var bare = s.match(/^([\d.]+)\s*$/);           /* "2" utan enhet = st */
      if (bare) m = [0, bare[1], 'st'];
      else return null;
    }
    var n = parseFloat(m[1]);
    if (isNaN(n)) return null;
    var u = m[2];
    if (u === 'st') {
      var nl = String(namn).toLowerCase();
      if (/ägg/.test(nl)) return n * 60;             /* medelägg utan skal */
      if (/vitlök/.test(nl)) return n * 5;
      if (/lök/.test(nl)) return n * 100;
      if (/äpple|banan|morot|potatis/.test(nl)) return n * 130;
      return null;                                    /* okänd styck-vikt */
    }
    return n * UNITS[u];
  }

  /* ---------- Namnmatchning mot databasen ---------- */
  function norm(s) {
    return String(s).toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
      .replace(/[^a-z0-9%]+/g, ' ').trim();
  }
  function match(namn, db) {
    var n = norm(namn);
    if (!n) return null;
    var best = null, bestScore = 0;
    for (var i = 0; i < db.length; i++) {
      var d = norm(db[i].namn);
      var score = 0;
      if (d === n) score = 100;
      else if (n.indexOf(d) === 0 || d.indexOf(n) === 0) score = 80;
      else {
        /* ordöverlapp: andel av db-ordens träffar i receptnamnet */
        var dw = d.split(' ').filter(function (w) { return w.length > 2; });
        var hits = dw.filter(function (w) { return (' ' + n + ' ').indexOf(' ' + w + ' ') !== -1; }).length;
        if (dw.length && hits === dw.length) score = 60;
        else if (hits >= 2) score = 40;
        else if (hits === 1 && dw.length === 1) score = 30;
      }
      if (score > bestScore) { bestScore = score; best = db[i]; }
    }
    return bestScore >= 30 ? best : null;
  }

  /* ---------- Läs receptets ingrediensrader ---------- */
  function readRows() {
    var rows = [];
    var t = document.querySelector('.mk-ing2');
    if (t) {
      t.querySelectorAll('tr[data-namn]').forEach(function (tr) {
        rows.push({ namn: tr.getAttribute('data-namn'), mangd: tr.getAttribute('data-mangd'), el: tr });
      });
    } else {
      var cards = document.querySelectorAll('.card');
      for (var i = 0; i < cards.length; i++) {
        var h = cards[i].querySelector('h2');
        if (h && /ingrediens/i.test(h.textContent)) {
          cards[i].querySelectorAll('tr').forEach(function (tr) {
            var tds = tr.querySelectorAll('td');
            if (tds.length >= 2 && !/^total/i.test(tds[0].textContent.trim())) {
              rows.push({ namn: tds[0].textContent.trim(), mangd: tds[1].textContent.trim(), el: tr });
            }
          });
          break;
        }
      }
    }
    return rows;
  }

  function fmt(n, dec) {
    return n.toLocaleString('sv-SE', { minimumFractionDigits: dec === undefined ? 0 : dec, maximumFractionDigits: dec === undefined ? 1 : dec });
  }

  async function run() {
    var rows = readRows();
    if (rows.length < 2) return;

    var db = [];
    try {
      var d = await (await fetch('../json/ingredienser.json', { cache: 'no-store' })).json();
      db = d.ingredienser || [];
    } catch (e) { return; }
    if (!db.length) return;

    var tot = { g: 0, kr: 0, kcal: 0, prot: 0, kolh: 0, fett: 0, fiber: 0 };
    var matched = 0, missed = [];

    rows.forEach(function (r) {
      var ing = match(r.namn, db);
      var g = toGrams(r.mangd, r.namn);
      if (!ing || g === null) { missed.push(r.namn); return; }
      matched++;
      tot.g += g;
      var kr = g / 1000 * (+ing.pris_kr_per_kg || 0);
      tot.kr += kr;
      tot.kcal += g / 100 * (+ing.kcal || 0);
      tot.prot += g / 100 * (+ing.protein || 0);
      tot.kolh += g / 100 * (+ing.kolhydrat || 0);
      tot.fett += g / 100 * (+ing.fett || 0);
      tot.fiber += g / 100 * (+ing.fiber || 0);
      /* Färskt pris in i tabellen (grönt = live ur databasen) */
      var prisCell = r.el && r.el.querySelector('.pris');
      if (prisCell && +ing.pris_kr_per_kg > 0) {
        prisCell.innerHTML = '<span style="color:#27ae60;" title="Live-pris ur ingrediensdatabasen (' +
          (ing.kalla || 'databasen') + ')">' + fmt(kr, 2) + ' kr</span>';
      }
    });

    if (matched < 2) return;   /* för få träffar för att vara meningsfullt */

    /* Portioner ur beskrivningen: "12 bitar", "6 portioner" */
    var beskr = (document.querySelector('meta[name="recept:beskrivning"]') || {}).content || '';
    var pm = beskr.match(/(\d+)\s*(portioner|port\b|bitar|hundportioner|klickar|glas)/i);
    var port = pm ? +pm[1] : 0;

    var rad = function (et, tv, pv) {
      return '<tr><td>' + et + '</td><td style="text-align:right;font-weight:700;">' + tv + '</td>' +
        (port ? '<td style="text-align:right;">' + pv + '</td>' : '') + '</tr>';
    };
    var css = 'width:100%;border-collapse:collapse;font-size:.88rem;';

    var box = document.createElement('div');
    box.className = 'card';
    box.id = 'mk-kalkyl';
    box.innerHTML =
      '<h2>🧮 Live-kalkyl <span style="font-weight:400;font-size:.76rem;color:#7f8c8d;">– räknas ur ingrediensdatabasen just nu (' + matched + ' av ' + rows.length + ' ingredienser matchade)</span></h2>' +
      '<table style="' + css + '">' +
      '<tr><th style="text-align:left;padding:6px 8px;background:#f0ebe3;font-size:.72rem;text-transform:uppercase;color:#7f8c8d;"></th>' +
      '<th style="text-align:right;padding:6px 8px;background:#f0ebe3;font-size:.72rem;text-transform:uppercase;color:#7f8c8d;">Totalt (~' + fmt(tot.g, 0) + ' g)</th>' +
      (port ? '<th style="text-align:right;padding:6px 8px;background:#f0ebe3;font-size:.72rem;text-transform:uppercase;color:#7f8c8d;">Per portion (' + port + ' st)</th>' : '') + '</tr>' +
      rad('💰 Kostnad', fmt(tot.kr, 2) + ' kr', fmt(tot.kr / (port || 1), 2) + ' kr') +
      rad('🔥 Kcal', fmt(tot.kcal, 0), fmt(tot.kcal / (port || 1), 0)) +
      rad('💪 Protein', fmt(tot.prot) + ' g', fmt(tot.prot / (port || 1)) + ' g') +
      rad('🍞 Kolhydrat', fmt(tot.kolh) + ' g', fmt(tot.kolh / (port || 1)) + ' g') +
      rad('🧈 Fett', fmt(tot.fett) + ' g', fmt(tot.fett / (port || 1)) + ' g') +
      rad('🌾 Fiber', fmt(tot.fiber) + ' g', fmt(tot.fiber / (port || 1)) + ' g') +
      '</table>' +
      (missed.length ? '<p style="font-size:.78rem;color:#a5967e;margin-top:8px;">⚠️ Ej i databasen (räknas inte med): ' +
        missed.join(' · ') + ' – <a href="../ingredienser.html" style="color:#c0392b;">lägg till dem här</a> så blir kalkylen komplett!</p>' : '') +
      '<p style="font-size:.72rem;color:#a5967e;margin-top:6px;">Uppdateras automatiskt när priser/näring ändras i databasen. Tabellens gröna priser = live.</p>';

    /* Lägg direkt efter ingredienskortet */
    var ingCard = (document.querySelector('.mk-ing-card')) ||
      (function () {
        var cs = document.querySelectorAll('.card');
        for (var i = 0; i < cs.length; i++) {
          var h = cs[i].querySelector('h2');
          if (h && /ingrediens/i.test(h.textContent)) return cs[i];
        }
        return null;
      })();
    if (ingCard) ingCard.parentNode.insertBefore(box, ingCard.nextSibling);
    else document.body.appendChild(box);
  }

  /* Vänta in ingrediens.js (bygger mk-ing2-tabellen) */
  function start() { setTimeout(run, 250); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
