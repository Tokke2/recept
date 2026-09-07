/* ============================================================
   PLATS: /assets/ratt.js  (assets-mappen i repo-roten)
   ============================================================
   🍽️ MATRÄTTS-SIDOR – Mitt Maskinkök
   ============================================================
   Renderar sidorna i ratter/-mappen (byggda av matratter.html).
   Sidan innehåller ENDAST metadata – ALLT innehåll ritas här
   (Centralt-principen: ändra utseendet för ALLA rätter i denna fil).

   Metadata i rättsidan:
     <meta name="ratt:namn"  content="Kycklingmiddag">
     <meta name="ratt:emoji" content="🍗">
     <meta name="ratt:delar" content="stekt-kyckling.html:150|ing:tacosas:50">
       (fil:gram | ing:<ingrediens-id>:gram)

   Näring & pris räknas LIVE per gram:
   · recept-delar: receptets ingredienstabell läses och räknas mot
     json/ingredienser.json (alias-medveten, samma som matratter.html)
   · ing:-delar: direkt ur ingrediensdatabasen
   Laddas av site.js när meta ratt:namn finns.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_RATT_LOADED) return;
  window.__MK_RATT_LOADED = true;

  var namnMeta = document.querySelector('meta[name="ratt:namn"]');
  if (!namnMeta) return;

  var root = '../';

  function norm(s) {
    return String(s).toLowerCase().replace(/\([^)]*\)/g, '')
      .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
      .replace(/[^a-z0-9%]+/g, ' ').trim();
  }
  function gram(m) {
    var x = String(m).replace(',', '.');
    var r = x.match(/([\d.]+)\s*kg/i); if (r) return parseFloat(r[1]) * 1000;
    r = x.match(/([\d.]+)\s*g\b/i); if (r) return parseFloat(r[1]);
    r = x.match(/([\d.]+)\s*dl/i); if (r) return parseFloat(r[1]) * 100;
    r = x.match(/([\d.]+)\s*ml/i); if (r) return parseFloat(r[1]);
    r = x.match(/([\d.]+)\s*l\b/i); if (r) return parseFloat(r[1]) * 1000;
    return null;
  }
  function fmt(n, dec) {
    return n.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: dec === undefined ? 1 : dec });
  }
  function matcha(namn, DB) {
    var n = norm(namn);
    if (!n) return null;
    var bast = null, poang = 0;
    DB.forEach(function (d) {
      var dn = norm(d.namn), p = 0;
      if ((d.alias || []).some(function (a) { return norm(a) === n; })) p = 4;
      else if (dn === n) p = 3;
      else if (n.indexOf(dn) === 0 || dn.indexOf(n) === 0) p = 2;
      else {
        var dw = dn.split(' ').filter(function (w) { return w.length > 2; });
        if (dw.length && dw.every(function (w) { return (' ' + n + ' ').indexOf(' ' + w + ' ') !== -1; })) p = 1;
      }
      if (p > poang) { poang = p; bast = d; }
    });
    return bast;
  }

  async function receptPerGram(fil, DB) {
    try {
      var html = await (await fetch(root + 'recept/' + encodeURIComponent(fil))).text();
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var tot = { g: 0, kcal: 0, prot: 0, kolh: 0, fett: 0, kr: 0 }, rader = 0;
      var namnEl = doc.querySelector('meta[name="recept:namn"]');
      var rNamn = namnEl ? namnEl.getAttribute('content') : fil.replace(/\.html?$/i, '').replace(/[-_]+/g, ' ');
      doc.querySelectorAll('table tr').forEach(function (tr) {
        var card = tr.closest('.card');
        var h = card && card.querySelector('h2');
        if (h && !/ingrediens/i.test(h.textContent)) return;
        var namn = tr.getAttribute('data-namn') || ((tr.querySelectorAll('td')[0] || {}).textContent || '');
        var mangd = tr.getAttribute('data-mangd') || ((tr.querySelectorAll('td')[1] || {}).textContent || '');
        if (!namn.trim() || /^total/i.test(namn.trim())) return;
        var g = gram(mangd);
        var ing = matcha(namn, DB);
        if (g && ing) {
          tot.g += g;
          tot.kcal += (+ing.kcal || 0) * g / 100;
          tot.prot += (+ing.protein || 0) * g / 100;
          tot.kolh += (+ing.kolhydrat || 0) * g / 100;
          tot.fett += (+ing.fett || 0) * g / 100;
          tot.kr += (+ing.pris_kr_per_kg || 0) * g / 1000;
          rader++;
        } else if (g) { tot.g += g; }
      });
      if (rader < 1 || tot.g < 50) return null;
      return { namn: rNamn,
        perG: { kcal: tot.kcal / tot.g, prot: tot.prot / tot.g, kolh: tot.kolh / tot.g,
                fett: tot.fett / tot.g, kr: tot.kr / tot.g } };
    } catch (e) { return null; }
  }

  async function run() {
    var mal = document.getElementById('ratt-innehall');
    if (!mal) return;

    var DB = [];
    try {
      DB = (await (await fetch(root + 'json/ingredienser.json', { cache: 'no-store' })).json()).ingredienser || [];
    } catch (e) {}

    /* Delar: "fil.html:150|ing:tacosas:50" (sista kolonet = gram) */
    var delarMeta = (document.querySelector('meta[name="ratt:delar"]') || {}).content || '';
    var delar = delarMeta.split('|').map(function (s) {
      s = s.trim();
      var i = s.lastIndexOf(':');
      if (i < 1) return null;
      return { ref: s.slice(0, i), g: parseFloat(s.slice(i + 1)) || 0 };
    }).filter(function (d) { return d && d.g > 0; });

    if (!delar.length) { mal.innerHTML = '<p style="color:#c0392b;">⚠️ Maträtten saknar delar.</p>'; return; }

    var tot = { g: 0, kcal: 0, prot: 0, kolh: 0, fett: 0, kr: 0 };
    var rader = [];
    for (var i = 0; i < delar.length; i++) {
      var d = delar[i], namn, perG, lank;
      if (d.ref.indexOf('ing:') === 0) {
        var ing = DB.find(function (x) { return x.id === d.ref.slice(4); });
        if (!ing) { rader.push({ namn: d.ref.slice(4), g: d.g, saknas: true }); continue; }
        namn = '🥫 ' + ing.namn;
        lank = root + 'ingredienser.html';
        perG = { kcal: (+ing.kcal || 0) / 100, prot: (+ing.protein || 0) / 100,
                 kolh: (+ing.kolhydrat || 0) / 100, fett: (+ing.fett || 0) / 100,
                 kr: (+ing.pris_kr_per_kg || 0) / 1000 };
      } else {
        var r = await receptPerGram(d.ref, DB);
        if (!r) { rader.push({ namn: d.ref.replace(/\.html?$/i, ''), g: d.g, saknas: true }); continue; }
        namn = r.namn;
        lank = root + 'recept/' + encodeURIComponent(d.ref);
        perG = r.perG;
      }
      tot.g += d.g; tot.kcal += perG.kcal * d.g; tot.prot += perG.prot * d.g;
      tot.kolh += perG.kolh * d.g; tot.fett += perG.fett * d.g; tot.kr += perG.kr * d.g;
      rader.push({ namn: namn, g: d.g, perG: perG, lank: lank });
    }

    var rows = rader.map(function (r) {
      if (r.saknas) {
        return '<tr style="background:rgba(192,57,43,.06);"><td>' + r.namn +
          ' <span style="color:#c0392b;font-size:.75rem;font-weight:700;">✖ hittas inte</span></td>' +
          '<td class="num">' + fmt(r.g, 0) + ' g</td><td class="num">–</td><td class="num">–</td><td class="num">–</td><td class="num">–</td><td class="num">–</td></tr>';
      }
      return '<tr><td><a href="' + r.lank + '" style="color:#c0392b;">' + r.namn + '</a></td>' +
        '<td class="num">' + fmt(r.g, 0) + ' g</td>' +
        '<td class="num">' + fmt(r.perG.kcal * r.g, 0) + '</td>' +
        '<td class="num">' + fmt(r.perG.prot * r.g) + ' g</td>' +
        '<td class="num">' + fmt(r.perG.kolh * r.g) + ' g</td>' +
        '<td class="num">' + fmt(r.perG.fett * r.g) + ' g</td>' +
        '<td class="num">' + fmt(r.perG.kr * r.g, 2) + ' kr</td></tr>';
    }).join('');

    mal.innerHTML =
      '<div class="card">' +
        '<h2>🍽️ Delar på tallriken</h2>' +
        '<table style="width:100%;border-collapse:collapse;font-size:.9rem;">' +
          '<tr><th style="text-align:left;padding:6px 8px;background:#f0ebe3;font-size:.72rem;text-transform:uppercase;color:#7f8c8d;">Del</th>' +
          '<th class="num" style="text-align:right;padding:6px 8px;background:#f0ebe3;font-size:.72rem;text-transform:uppercase;color:#7f8c8d;">Mängd</th>' +
          '<th class="num" style="text-align:right;padding:6px 8px;background:#f0ebe3;font-size:.72rem;text-transform:uppercase;color:#7f8c8d;">Kcal</th>' +
          '<th class="num" style="text-align:right;padding:6px 8px;background:#f0ebe3;font-size:.72rem;text-transform:uppercase;color:#7f8c8d;">Protein</th>' +
          '<th class="num" style="text-align:right;padding:6px 8px;background:#f0ebe3;font-size:.72rem;text-transform:uppercase;color:#7f8c8d;">Kolh.</th>' +
          '<th class="num" style="text-align:right;padding:6px 8px;background:#f0ebe3;font-size:.72rem;text-transform:uppercase;color:#7f8c8d;">Fett</th>' +
          '<th class="num" style="text-align:right;padding:6px 8px;background:#f0ebe3;font-size:.72rem;text-transform:uppercase;color:#7f8c8d;">Pris</th></tr>' +
          rows +
          '<tr style="font-weight:700;background:#faf7f2;"><td>🍽️ Hela tallriken</td>' +
          '<td class="num">' + fmt(tot.g, 0) + ' g</td><td class="num">' + fmt(tot.kcal, 0) + '</td>' +
          '<td class="num">' + fmt(tot.prot) + ' g</td><td class="num">' + fmt(tot.kolh) + ' g</td>' +
          '<td class="num">' + fmt(tot.fett) + ' g</td><td class="num">' + fmt(tot.kr, 2) + ' kr</td></tr>' +
        '</table>' +
        '<p style="font-size:.78rem;color:#7f8c8d;margin-top:8px;">🧮 Räknas live ur recepten & ingrediensdatabasen – alltid dagens priser & näring.</p>' +
      '</div>' +
      '<div class="card no-print">' +
        '<h2>✏️ Ändra maträtten</h2>' +
        '<p style="font-size:.88rem;color:#7f8c8d;">Delar och mängder redigeras på <a href="' + root + 'matratter.html" style="color:#c0392b;">🍽️ Maträtter-sidan</a> (spara med samma namn så uppdateras denna sida).</p>' +
      '</div>';

    /* dela totalen med etikett/portionsmoduler om de laddas i framtiden */
    window.__MK_RATT_TOT = tot;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
