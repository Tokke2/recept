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
      /* ✍️ FRI DEL utan recept: "fri:Namn:kcal,prot,kolh,fett" */
      var friM = d.ref.match(/^fri:([^:]+):([\d.]+),([\d.]+),([\d.]+),([\d.]+)$/);
      if (friM) {
        namn = '✍️ ' + friM[1];
        lank = null;
        perG = { kcal: +friM[2] / 100, prot: +friM[3] / 100, kolh: +friM[4] / 100,
                 fett: +friM[5] / 100, kr: 0 };
        tot.g += d.g; tot.kcal += perG.kcal * d.g; tot.prot += perG.prot * d.g;
        tot.kolh += perG.kolh * d.g; tot.fett += perG.fett * d.g;
        rader.push({ namn: namn, g: d.g, perG: perG, lank: null });
        continue;
      }
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
      var namnHtml = r.lank ? '<a href="' + r.lank + '" style="color:#c0392b;">' + r.namn + '</a>' : r.namn;
      return '<tr><td>' + namnHtml + '</td>' +
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
      /* 🍽️ PORTIONSPANEL (användarens regel): rätten byggs som STOR
         SATS – här anger besökaren sin portionsstorlek så räknas
         näring & pris per portion + antal portioner ur satsen.
         Även omvänt: önskad kcal → portionsstorlek. Sparas per rätt. */
      '<div class="card no-print" id="mk-ratt-portion" style="border:2px solid #e67e22;">' +
        '<h2>🍽️ Din portion & uppdelning</h2>' +
        '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;">' +
          '<div><span style="' + LBL + '">Portionsstorlek</span>' +
            '<span style="white-space:nowrap;"><input id="rp-g" type="text" inputmode="numeric" style="' + INP + '" value="' + (sparadPort() || 400) + '"> <b style="font-size:.9rem;">g</b></span></div>' +
          '<div><span style="' + LBL + '">🔥 Önskad kcal/portion</span>' +
            '<span style="white-space:nowrap;"><input id="rp-kcal" type="text" inputmode="numeric" style="' + INP + '" placeholder="t.ex. 500"> <b style="font-size:.9rem;">kcal</b></span></div>' +
          '<div><span style="' + LBL + '">🍱 Eller: dela satsen i</span>' +
            '<span style="white-space:nowrap;"><input id="rp-antal" type="text" inputmode="numeric" style="' + INP + 'width:64px;" placeholder="t.ex. 5"> <b style="font-size:.9rem;">lådor</b></span></div>' +
        '</div>' +
        '<div id="rp-ut" style="margin-top:10px;padding:9px 12px;background:#fdf6ee;border-radius:9px;font-size:.9rem;line-height:1.6;"></div>' +
        '<div id="rp-lador" style="margin-top:10px;"></div>' +
      '</div>' +
      '<div class="card no-print">' +
        '<h2>✏️ Ändra maträtten</h2>' +
        '<p style="font-size:.88rem;color:#7f8c8d;">Delar och mängder redigeras på <a href="' + root + 'matratter.html" style="color:#c0392b;">🍽️ Maträtter-sidan</a> (spara med samma namn så uppdateras denna sida).</p>' +
      '</div>';

    /* dela totalen med etikett/portionsmoduler om de laddas i framtiden */
    window.__MK_RATT_TOT = tot;

    /* ---------- 🍽️ Portionslogik + 🍱 uppdelning ---------- */
    kopplaPortion(tot, rader);
  }

  var LBL = 'font-size:.72rem;font-weight:700;color:#7f8c8d;text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:3px;';
  var INP = 'width:84px;padding:7px 9px;border:2px solid #e8e2d8;border-radius:9px;font-size:.95rem;font-family:inherit;text-align:right;font-weight:700;';

  function portKey() { return 'mk-rport:' + decodeURIComponent(location.pathname.split('/').pop()); }
  function sparadPort() {
    try { return +localStorage.getItem(portKey()) || 0; } catch (e) { return 0; }
  }
  function kopplaPortion(tot, rader) {
    var gEl = document.getElementById('rp-g');
    var kcEl = document.getElementById('rp-kcal');
    var anEl = document.getElementById('rp-antal');
    var ut = document.getElementById('rp-ut');
    var ladorEl = document.getElementById('rp-lador');
    if (!gEl || !tot.g) return;
    var perG = { kcal: tot.kcal / tot.g, prot: tot.prot / tot.g, kolh: tot.kolh / tot.g,
                 fett: tot.fett / tot.g, kr: tot.kr / tot.g };
    function tal(el, fb) {
      var v = parseFloat(String(el.value || '').replace(',', '.').replace(/[^\d.]/g, ''));
      return (isNaN(v) || v <= 0) ? fb : v;
    }
    function visa() {
      var g = tal(gEl, 400);
      ut.innerHTML = '<b>Per portion (' + fmt(g, 0) + ' g):</b> ' +
        '🔥 <b>' + fmt(perG.kcal * g, 0) + ' kcal</b> · ' +
        '💪 ' + fmt(perG.prot * g) + ' g protein · ' +
        '🍞 ' + fmt(perG.kolh * g) + ' g kolh · ' +
        '🧈 ' + fmt(perG.fett * g) + ' g fett · ' +
        '💰 ' + fmt(perG.kr * g, 2) + ' kr' +
        '<br><span style="color:#7f8c8d;font-size:.82rem;">Hela satsen (' + fmt(tot.g, 0) + ' g) räcker till ' +
        '<b>' + fmt(tot.g / g, 1) + ' portioner</b> à ' + fmt(g, 0) + ' g</span>';
      try { localStorage.setItem(portKey(), String(Math.round(g))); } catch (e) {}
    }
    /* 🍱 UPPDELNING (användarens regel: "2 kg kyckling i crockpotten →
       dela upp"): ange antal lådor → VARJE LÅDAS INNEHÅLL visas per
       del ("i varje låda: 400 g kycklinggryta, 150 g potatis...") +
       näring & pris per låda. Perfekt för meal prep-uppdelning. */
    function visaLador() {
      var n = Math.round(tal(anEl, 0));
      if (!n || n < 2) { ladorEl.innerHTML = ''; return; }
      var perLada = rader.filter(function (r) { return !r.saknas; }).map(function (r) {
        return '<tr><td>' + r.namn.replace(/<[^>]*>/g, '') + '</td>' +
          '<td class="num" style="text-align:right;font-weight:700;">' + fmt(r.g / n, 0) + ' g</td></tr>';
      }).join('');
      ladorEl.innerHTML =
        '<div style="border:1.5px dashed #e67e22;border-radius:10px;padding:12px 14px;background:#fffdf9;">' +
        '<b>🍱 Delat i ' + n + ' lådor – i VARJE låda:</b>' +
        '<table style="width:100%;border-collapse:collapse;font-size:.88rem;margin-top:6px;">' + perLada +
        '<tr style="font-weight:700;background:#faf7f2;"><td>Totalt per låda</td>' +
        '<td style="text-align:right;">' + fmt(tot.g / n, 0) + ' g</td></tr></table>' +
        '<div style="margin-top:8px;font-size:.9rem;">' +
          '🔥 <b>' + fmt(tot.kcal / n, 0) + ' kcal</b> · 💪 ' + fmt(tot.prot / n) + ' g protein · ' +
          '🍞 ' + fmt(tot.kolh / n) + ' g kolh · 🧈 ' + fmt(tot.fett / n) + ' g fett · ' +
          '💰 ' + fmt(tot.kr / n, 2) + ' kr per låda</div>' +
        '<div style="margin-top:4px;font-size:.78rem;color:#7f8c8d;">💡 Väg upp med våg för exakthet – eller ögonmåtta: dela varje del i ' + n + ' lika högar.</div>' +
        '</div>';
      /* synka portionsfältet till lådstorleken */
      gEl.value = Math.round(tot.g / n);
      visa();
    }
    gEl.addEventListener('input', function () { kcEl.value = ''; if (anEl) anEl.value = ''; if (ladorEl) ladorEl.innerHTML = ''; visa(); });
    /* 🔥 omvänt: önskad kcal → gram räknas ut */
    kcEl.addEventListener('input', function () {
      var vill = tal(kcEl, 0);
      if (vill > 0 && perG.kcal > 0) { gEl.value = Math.round(vill / perG.kcal); if (anEl) anEl.value = ''; if (ladorEl) ladorEl.innerHTML = ''; visa(); }
    });
    if (anEl) anEl.addEventListener('input', visaLador);
    visa();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
