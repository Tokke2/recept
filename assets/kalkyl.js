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
  /* matchAll: returnerar ALLA kandidater som delar högsta poängen.
     Fler än 1 = tvetydigt ("hemmagjord sylt" träffar både svartvinbär
     och fläder) → raden får en väljare så användaren bestämmer. */
  function matchAll(namn, db) {
    var n = norm(namn);
    if (!n) return [];
    var bestScore = 0, list = [];
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
      if (score > bestScore) { bestScore = score; list = [db[i]]; }
      else if (score === bestScore && score >= 30) list.push(db[i]);
    }
    return bestScore >= 30 ? list : [];
  }
  function match(namn, db) { var l = matchAll(namn, db); return l.length ? l[0] : null; }

  /* ---------- Flera träffar → UNDERRADER i tabellen ----------
     "Hemmagjord sylt 30 g" blir en titelrad och varje databas-
     post som matchar visas som egen underrad med kcal per sylt.
     Kalkylen räknar med GENOMSNITTET av varianterna. */
  function snitt(list) {
    var f = ['pris_kr_per_kg', 'kcal', 'protein', 'kolhydrat', 'fett', 'fiber'];
    var o = { namn: 'genomsnitt av ' + list.length + ' sorter' };
    f.forEach(function (k) {
      var s = 0;
      list.forEach(function (c) { s += (+c[k] || 0); });
      o[k] = s / list.length;
    });
    return o;
  }

  /* ---------- Läs receptets ingrediensrader ---------- */
  function liveName(tr) {
    /* Namn ur cellens LEVANDE text (användaren kan ha redigerat den) –
       utan våra märken (✖ saknas / 🛒 / ✓) och utan 💧-droppen */
    var td = tr.querySelector('td');
    if (!td) return '';
    var c = td.cloneNode(true);
    c.querySelectorAll('.mk-saknas, .mk-prodlank, .drop, .mk-rowbtn').forEach(function (x) { x.remove(); });
    return c.textContent.replace(/💧/g, '').trim();
  }
  function readRows() {
    var rows = [];
    var t = document.querySelector('.mk-ing2');
    if (t) {
      t.querySelectorAll('tr[data-namn]').forEach(function (tr) {
        var mattCell = tr.querySelector('.matt') || tr.querySelectorAll('td')[1];
        rows.push({
          namn: liveName(tr) || tr.getAttribute('data-namn'),
          mangd: (mattCell ? mattCell.textContent.trim() : '') || tr.getAttribute('data-mangd'),
          el: tr
        });
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

  var dbCache = null;

  async function run() {
    /* Riv gammalt (så omkörning efter redigering ger färska värden) */
    var oldBox = document.getElementById('mk-kalkyl');
    if (oldBox) oldBox.remove();
    document.querySelectorAll('.mk-saknas, .mk-prodlank, .mk-ingsub').forEach(function (x) { x.remove(); });

    var rows = readRows();
    if (rows.length < 2) return;

    var db = dbCache;
    if (!db) {
      try {
        var d = await (await fetch('../json/ingredienser.json', { cache: 'no-store' })).json();
        db = dbCache = d.ingredienser || [];
      } catch (e) { return; }
    }
    if (!db.length) return;

    var tot = { g: 0, kr: 0, kcal: 0, prot: 0, kolh: 0, fett: 0, fiber: 0 };
    var matched = 0, missed = [];
    /* Hydrering (bagerimått): vätska / mjöl. Yoghurt/ägg räknas delvis. */
    var hyd = { mjol: 0, vatska: 0 };
    function hydKlass(namn) {
      var n = String(namn).toLowerCase();
      if (/mj[öo]l|havregryn|gryn(?!ing)/.test(n) && !/mj[öo]lk/.test(n)) return 'mjol';
      if (/vatten|mj[öo]lk|juice|saft(?!ig)|[öo]l\b/.test(n)) return 'vatska';
      if (/yoghurt|kvarg|keso|gr[äa]dde/.test(n)) return 'vatska80';   /* ~80% vatten */
      if (/[äa]gg/.test(n)) return 'vatska75';                        /* ~75% vatten */
      if (/olja|hon[uo]ng|sirap/.test(n)) return 'vatska20';          /* bidrar lite */
      return null;
    }

    rows.forEach(function (r) {
      var kandidater = matchAll(r.namn, db);
      var ing = kandidater[0] || null;
      var g = toGrams(r.mangd, r.namn);
      if (kandidater.length > 1) {
        /* 🔽 FLERA TRÄFFAR: raden blir titel, varianterna visas som
           underrader med kcal för RECEPTETS MÄNGD (t.ex. 30 g).
           Kalkylen räknar med genomsnittet. */
        ing = snitt(kandidater);
        var nEl = r.el && r.el.nextElementSibling;
        if (r.el && r.el.parentNode && !(nEl && nEl.classList && nEl.classList.contains('mk-ingsub'))) {
          var cols = r.el.children.length || 3;
          var next = r.el.nextSibling;
          kandidater.forEach(function (c) {
            var sub = document.createElement('tr');
            sub.className = 'mk-ingsub';
            var td = document.createElement('td');
            td.colSpan = cols;
            td.style.cssText = 'padding:2px 8px 2px 26px;font-size:.8rem;color:#7f8c8d;border:none;background:rgba(230,126,34,.05);';
            var kcalTxt;
            if (g !== null) {
              /* kcal för receptets mängd: 30 g × 210/100 = 63 kcal */
              kcalTxt = '<span style="color:#e67e22;font-weight:700;">' +
                fmt((+c.kcal || 0) * g / 100, 0) + ' kcal</span>' +
                '<span style="font-size:.72rem;"> för ' + fmt(g, 0) + ' g</span>';
            } else {
              /* okänd mängd-enhet → visa per 100 g som reserv */
              kcalTxt = '<span style="color:#e67e22;font-weight:700;">' +
                fmt(+c.kcal || 0, 0) + ' kcal</span><span style="font-size:.72rem;">/100 g</span>';
            }
            td.innerHTML = '↳ ' + c.namn + ' ' + kcalTxt +
              ((+c.pris_kr_per_kg || 0) > 0 && g !== null ?
                ' · ' + fmt((+c.pris_kr_per_kg) * g / 1000, 2) + ' kr' : '');
            sub.appendChild(td);
            r.el.parentNode.insertBefore(sub, next);
          });
        }
      }
      if (!ing) {
        missed.push(r.namn);
        /* 🔴 RÖD rad: ingrediensen finns INTE i databasen */
        if (r.el) {
          r.el.style.background = 'rgba(192,57,43,.07)';
          r.el.style.borderLeft = '3px solid #c0392b';
          var namnCell = r.el.querySelector('td');
          if (namnCell && !namnCell.querySelector('.mk-saknas')) {
            var s = document.createElement('a');
            s.className = 'mk-saknas no-print';
            s.href = '../ingredienser.html';
            s.title = 'Ingrediensen saknas i databasen – klicka för att lägga till den (räknas inte med i kalkylen)';
            s.textContent = '✖ saknas i databasen';
            s.style.cssText = 'display:inline-block;margin-left:8px;background:#fdecea;color:#c0392b;border:1px solid #c0392b;border-radius:999px;padding:0 8px;font-size:.68rem;font-weight:700;text-decoration:none;vertical-align:middle;';
            namnCell.appendChild(s);
          }
        }
        return;
      }
      /* 🟢 GRÖN rad: finns i databasen (+ ev. länk till produkten) */
      if (r.el) {
        r.el.style.background = 'rgba(39,174,96,.06)';
        r.el.style.borderLeft = '3px solid #27ae60';
        var nc = r.el.querySelector('td');
        if (nc && !nc.querySelector('.mk-prodlank')) {
          if (ing.lank) {
            var a = document.createElement('a');
            a.className = 'mk-prodlank no-print';
            a.href = ing.lank;
            a.target = '_blank';
            a.rel = 'noopener';
            a.title = 'Öppna produkten i butiken (' + (ing.namn || '') + ')';
            a.textContent = '🛒';
            a.style.cssText = 'margin-left:6px;text-decoration:none;font-size:.85em;vertical-align:middle;';
            nc.appendChild(a);
          } else {
            var ok = document.createElement('span');
            ok.className = 'mk-prodlank no-print';
            ok.title = 'Finns i ingrediensdatabasen (' + (ing.namn || '') + ') – ingen butikslänk kopplad än';
            ok.textContent = '✓';
            ok.style.cssText = 'margin-left:6px;color:#27ae60;font-weight:700;font-size:.8em;vertical-align:middle;';
            nc.appendChild(ok);
          }
        }
      }
      if (g === null) { missed.push(r.namn); return; }  /* finns men okänd mängd-enhet */
      matched++;
      tot.g += g;
      var hk = hydKlass(r.namn);
      if (hk === 'mjol') hyd.mjol += g;
      else if (hk === 'vatska') hyd.vatska += g;
      else if (hk === 'vatska80') hyd.vatska += g * 0.8;
      else if (hk === 'vatska75') hyd.vatska += g * 0.75;
      else if (hk === 'vatska20') hyd.vatska += g * 0.2;
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

    /* ♻️ UTBYTES-NOTIS – alltid, på alla recept (även utan kalkyl) */
    (function bytesNotis() {
      if (document.getElementById('mk-byt-notis')) return;
      var ingCard0 = document.querySelector('.mk-ing-card') ||
        (function () {
          var cs = document.querySelectorAll('.card');
          for (var i = 0; i < cs.length; i++) {
            var h = cs[i].querySelector('h2');
            if (h && /ingrediens/i.test(h.textContent)) return cs[i];
          }
          return null;
        })();
      if (!ingCard0) return;
      var n = document.createElement('p');
      n.id = 'mk-byt-notis';
      n.innerHTML = '♻️ <b>Ingredienserna går att byta ut</b> mot liknande varor från annan affär – men då kan närings- och prisberäkningen skilja sig från det som visas.';
      n.style.cssText = 'font-size:.8rem;color:#7f8c8d;background:#faf7f2;border-left:3px solid #d5cbb8;border-radius:8px;padding:8px 12px;margin-top:10px;';
      ingCard0.appendChild(n);
    })();

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
      (hyd.mjol >= 50 ? (function () {
        var pct = Math.round(hyd.vatska / hyd.mjol * 100);
        var beskr = pct < 50 ? 'fast deg (bagels, kex)' :
                    pct < 60 ? 'normal bröddeg' :
                    pct < 70 ? 'mjuk deg (pizza, focaccia)' :
                    pct < 85 ? 'lös deg (ciabatta, lantbröd)' : 'smet (våfflor, pannkakor)';
        return '<div id="mk-hydrering" style="margin-top:10px;padding:9px 12px;background:#eef7fb;border-left:3px solid #3498db;border-radius:8px;font-size:.85rem;">' +
          '💧 <b>Hydrering: ' + pct + '%</b> <span style="color:#7f8c8d;">(' +
          fmt(hyd.vatska, 0) + ' g vätska / ' + fmt(hyd.mjol, 0) + ' g mjöl & gryn – ' + beskr + ')</span></div>';
      })() : '') +
      (missed.length ? '<p style="font-size:.78rem;color:#a5967e;margin-top:8px;">⚠️ Ej i databasen (räknas inte med): ' +
        missed.join(' · ') + ' – <a href="../ingredienser.html" style="color:#c0392b;">lägg till dem här</a> så blir kalkylen komplett!</p>' : '') +
      '<button id="mk-recept2ing" class="no-print" style="margin-top:10px;background:#eaf7ef;color:#27ae60;' +
        'border:2px dashed #27ae60;border-radius:10px;padding:8px 16px;font-size:.85rem;font-weight:700;' +
        'cursor:pointer;font-family:inherit;">🫙 Spara receptet som INGREDIENS (sylt, saft, buljong...)</button>' +
      '<div id="mk-r2i-result"></div>' +
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

    /* ============================================================
       🫙 RECEPT → INGREDIENS: sylt/saft/buljong m.m. sparas i
       ingrediensdatabasen med pris & näring PER 100 g räknat ur
       receptets live-kalkyl. Kan sedan användas i andra recept
       och generatorn som vilken vara som helst.
       ============================================================ */
    /* Bygg ingrediensposten ur kalkylens totaler (delas med API:t nedan) */
    function byggIngrediensPost(namn, rNamn) {
      var per100 = function (v) { return Math.round(v / tot.g * 100 * 10) / 10; };
      return {
        id: namn.toLowerCase().replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        namn: namn,
        pris_kr_per_kg: Math.round(tot.kr / tot.g * 1000 * 100) / 100,
        kcal: per100(tot.kcal), protein: per100(tot.prot),
        kolhydrat: per100(tot.kolh), fett: per100(tot.fett), fiber: per100(tot.fiber),
        recept: decodeURIComponent(location.pathname.split('/').pop()),
        kalla: 'eget recept (' + rNamn + ') ' + new Date().toISOString().slice(0, 10)
      };
    }
    async function sparaIngrediensPost(post, namn) {
      var raw = await window.__MK_SPARA.load('json/ingredienser.json');
      if (!raw) throw new Error('kunde inte läsa databasen');
      var db2 = JSON.parse(raw);
      db2.ingredienser = db2.ingredienser || [];
      /* matcha på id ELLER samma käll-recept (namnbyte ger ingen dubblett) */
      var fil = post.recept;
      var idx = db2.ingredienser.findIndex(function (x) { return x.id === post.id || (fil && x.recept === fil); });
      if (idx >= 0) db2.ingredienser[idx] = post; else db2.ingredienser.push(post);
      return window.__MK_SPARA.save('json/ingredienser.json', JSON.stringify(db2, null, 2),
        'Recept sparat som ingrediens: ' + namn);
    }
    /* 🫙 API för redigera.js: tyst sparning vid "Även ingrediens"-kryss */
    window.__MK_RECEPT_TILL_ING = async function () {
      if (!window.__MK_SPARA || !tot.g) return { ok: false, error: 'kalkylen saknas' };
      var rN = (document.querySelector('meta[name="recept:namn"]') || {}).content ||
        (document.querySelector('header h1') || { textContent: 'Recept' }).textContent.trim();
      rN = rN.replace(/[\u{1F300}-\u{1FAFF}\uFE0F]/gu, '').trim();
      var n = rN + ' (hemgjord)';
      try { return await sparaIngrediensPost(byggIngrediensPost(n, rN), n); }
      catch (e) { return { ok: false, error: e.message }; }
    };

    box.querySelector('#mk-recept2ing').addEventListener('click', async function () {
      var out = box.querySelector('#mk-r2i-result');
      if (!window.__MK_SPARA) { out.innerHTML = '<p style="color:#c0392b;font-size:.85rem;">Spara-modulen kunde inte laddas – ladda om sidan.</p>'; return; }
      var rNamn = (document.querySelector('meta[name="recept:namn"]') || {}).content ||
        (document.querySelector('header h1') || { textContent: 'Recept' }).textContent.trim();
      rNamn = rNamn.replace(/[\u{1F300}-\u{1FAFF}\uFE0F]/gu, '').trim();
      var namn = prompt('Namn på ingrediensen (så den hittas i andra recept):', rNamn + ' (hemgjord)');
      if (!namn) return;
      var post = byggIngrediensPost(namn, rNamn);
      var btn = this;
      btn.disabled = true; btn.textContent = '⏳ Sparar i ingrediensdatabasen...';
      var res = { ok: false, error: 'okänt fel' };
      try {
        res = await sparaIngrediensPost(post, namn);
      } catch (e) { res = { ok: false, error: e.message }; }
      btn.disabled = false; btn.textContent = '🫙 Spara receptet som INGREDIENS (sylt, saft, buljong...)';
      if (res.ok) {
        out.innerHTML = '<p style="font-size:.85rem;color:#27ae60;margin-top:6px;">🎉 <b>' + namn +
          '</b> finns nu i <a href="../ingredienser.html" style="color:#27ae60;">ingrediensdatabasen</a>: ' +
          post.pris_kr_per_kg.toLocaleString('sv-SE') + ' kr/kg · ' + post.kcal + ' kcal/100 g · ' +
          post.protein + ' g protein. Använd den i andra recept & generatorn!</p>';
      } else {
        out.innerHTML = '<p style="font-size:.85rem;color:#c0392b;margin-top:6px;">⚠️ Kunde inte spara: ' + res.error + '</p>';
      }
    });
  }

  /* Omkörning utifrån (redigera.js anropar efter varje ändring) */
  var omTimer = null;
  window.__MK_KALKYL_REFRESH = function () {
    clearTimeout(omTimer);
    omTimer = setTimeout(run, 400);
  };

  /* Auto-omräkning under redigeringsläget: text ändras / rad tas bort */
  document.addEventListener('input', function (e) {
    if (!document.body.classList.contains('mk-editing')) return;
    if (e.target.closest && e.target.closest('.mk-ing2, .mk-ing-card')) window.__MK_KALKYL_REFRESH();
  }, true);

  /* Vänta in ingrediens.js (bygger mk-ing2-tabellen) */
  function start() { setTimeout(run, 250); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
