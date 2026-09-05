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
      /* 🔗 ALIAS: manuellt kopplade receptnamn ("Hemgjord sylt (t.ex.
         svartvinbär)" → svartvinbärssylt-posten) vinner alltid */
      var alias = db[i].alias || [];
      for (var ai = 0; ai < alias.length; ai++) {
        if (norm(alias[ai]) === n) { score = 100; break; }
      }
      if (!score) {
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
      }
      if (score > bestScore) { bestScore = score; list = [db[i]]; }
      else if (score === bestScore && score >= 30) list.push(db[i]);
    }
    return bestScore >= 30 ? list : [];
  }
  function match(namn, db) { var l = matchAll(namn, db); return l.length ? l[0] : null; }

  /* ============================================================
     🔗 MATCHA SAKNAD INGREDIENS: receptets rad ("Hemgjord sylt
     (t.ex. svartvinbär)") kopplas till en BEFINTLIG databaspost →
     receptnamnet sparas som alias på posten (json/ingredienser.json,
     lösenordsskyddat via __MK_SPARA). Alla recept med samma
     formulering matchar sedan direkt. Egen dialog, hårt-klick.
     ============================================================ */
  function oppnaMatchning(radNamn, db) {
    var old = document.getElementById('mk-match-bg');
    if (old) old.remove();
    var bg = document.createElement('div');
    bg.id = 'mk-match-bg';
    bg.className = 'no-print';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:320;display:flex;align-items:center;justify-content:center;padding:16px;';
    var sorterade = db.slice().sort(function (a, b) { return String(a.namn).localeCompare(String(b.namn), 'sv'); });
    bg.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:480px;width:100%;padding:24px 26px;font-family:Segoe UI,system-ui,sans-serif;color:#2c3e50;">' +
        '<h3 style="margin:0 0 4px;">🔗 Matcha ingrediensen</h3>' +
        '<p style="font-size:.85rem;color:#7f8c8d;margin:0 0 12px;">Receptet skriver <b>"' + radNamn + '"</b> – vilken vara i databasen är det? ' +
        'Kopplingen sparas som alias: alla recept med samma formulering matchar sedan automatiskt.</p>' +
        '<input id="mk-match-sok" type="text" placeholder="🔍 Sök vara..." style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.92rem;font-family:inherit;margin-bottom:8px;">' +
        '<div id="mk-match-lista" style="max-height:260px;overflow:auto;border:1.5px solid #f0ebe3;border-radius:10px;"></div>' +
        '<div style="display:flex;gap:8px;margin-top:12px;">' +
          '<a href="../ingredienser.html" style="flex:1;text-align:center;background:#f0ebe3;color:#2c3e50;border-radius:10px;padding:11px;font-weight:700;font-size:.85rem;text-decoration:none;">➕ Finns inte – lägg till ny</a>' +
          '<button id="mk-match-avbryt" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:11px 18px;font-weight:700;cursor:pointer;font-family:inherit;">Avbryt</button>' +
        '</div>' +
        '<div id="mk-match-result" style="margin-top:8px;font-size:.85rem;"></div>' +
      '</div>';
    document.body.appendChild(bg);
    var lista = bg.querySelector('#mk-match-lista');
    function rita(filter) {
      var f = norm(filter || '');
      lista.innerHTML = sorterade.filter(function (d) {
        return !f || norm(d.namn).indexOf(f) !== -1;
      }).slice(0, 60).map(function (d) {
        return '<button class="mk-match-val" data-id="' + d.id + '" style="display:block;width:100%;text-align:left;background:none;' +
          'border:none;border-bottom:1px solid #f0ebe3;padding:9px 12px;font-size:.88rem;cursor:pointer;font-family:inherit;color:#2c3e50;">' +
          (d.egenodlad ? '🌱 ' : d.recept ? '🫙 ' : '🛒 ') + d.namn +
          ' <span style="color:#a5967e;font-size:.75rem;">' + fmt(+d.kcal || 0, 0) + ' kcal · ' +
          ((+d.pris_kr_per_kg || 0) > 0 ? fmt(+d.pris_kr_per_kg, 0) + ' kr/kg' : '0 kr') + '</span></button>';
      }).join('') || '<p style="padding:12px;font-size:.85rem;color:#7f8c8d;">Ingen träff.</p>';
      lista.querySelectorAll('.mk-match-val').forEach(function (b) {
        b.onclick = function () { sparaAlias(bg, radNamn, b.getAttribute('data-id')); };
      });
    }
    rita('');
    bg.querySelector('#mk-match-sok').addEventListener('input', function () { rita(this.value); });
    bg.querySelector('#mk-match-avbryt').onclick = function () { bg.remove(); };
    var dn = false;
    bg.addEventListener('mousedown', function (e) { dn = (e.target === bg); });
    bg.addEventListener('click', function (e) { if (e.target === bg && dn) bg.remove(); });
  }

  async function sparaAlias(bg, radNamn, ingId) {
    var out = bg.querySelector('#mk-match-result');
    if (!window.__MK_SPARA) { out.innerHTML = '<span style="color:#c0392b;">Spara-modulen saknas – ladda om sidan.</span>'; return; }
    out.innerHTML = '⏳ Sparar kopplingen...';
    var res = { ok: false, error: 'okänt fel' };
    try {
      var raw = await window.__MK_SPARA.load('json/ingredienser.json');
      if (!raw) throw new Error('kunde inte läsa databasen');
      var db2 = JSON.parse(raw);
      var post = (db2.ingredienser || []).find(function (x) { return x.id === ingId; });
      if (!post) throw new Error('varan hittades inte');
      post.alias = post.alias || [];
      if (post.alias.indexOf(radNamn) === -1) post.alias.push(radNamn);
      res = await window.__MK_SPARA.save('json/ingredienser.json', JSON.stringify(db2, null, 2),
        'Alias: "' + radNamn.slice(0, 50) + '" → ' + post.namn);
    } catch (e) { res = { ok: false, error: e.message }; }
    if (res.ok) {
      /* uppdatera lokala cachen + räkna om direkt */
      if (dbCache) {
        var lokal = dbCache.find(function (x) { return x.id === ingId; });
        if (lokal) { lokal.alias = lokal.alias || []; if (lokal.alias.indexOf(radNamn) === -1) lokal.alias.push(radNamn); }
      }
      bg.remove();
      if (window.__MK_TOAST) window.__MK_TOAST('🔗 Matchad! Kalkylen räknas om.');
      run();
    } else {
      out.innerHTML = '<span style="color:#c0392b;">⚠️ ' + res.error + '</span>';
    }
  }

  /* 🌱 Para ihop hemodlad↔köpt: exakt träff på "Äpplen Royal Gala"
     vinner annars ensam över "Äpplen Royal Gala hemodlad" (och tvärtom)
     → motparten läggs till så källfrågan alltid kan visas. */
  function medMotpart(kandidater, db) {
    if (!kandidater.length) return kandidater;
    var ut = kandidater.slice();
    kandidater.forEach(function (k) {
      var bas = norm(String(k.namn).replace(/hemodlad/ig, ''));
      db.forEach(function (d) {
        if (ut.indexOf(d) !== -1) return;
        if (!!d.egenodlad === !!k.egenodlad) return;   /* motpart = andra sorten */
        var dbas = norm(String(d.namn).replace(/hemodlad/ig, ''));
        if (dbas && dbas === bas) ut.push(d);
      });
    });
    return ut;
  }

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
    c.querySelectorAll('.mk-saknas, .mk-prodlank, .drop, .mk-rowbtn, .mk-bytsmak, .mk-smakval, .mk-kallval, .mk-gruppval').forEach(function (x) { x.remove(); });
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

  /* ---------- 🍫 Smakval (whey m.fl. med varianter): sparas per recept ---------- */
  function smakKey() { return 'mk-smak:' + decodeURIComponent(location.pathname.split('/').pop()); }
  function smakGet() {
    try { return JSON.parse(localStorage.getItem(smakKey()) || '{}'); } catch (e) { return {}; }
  }
  function smakSet(ingId, smak) {
    var m = smakGet();
    if (smak) m[ingId] = smak; else delete m[ingId];
    try { localStorage.setItem(smakKey(), JSON.stringify(m)); } catch (e) {}
  }

  /* ---------- 🌱/🛒 Källval (hemodlad ELLER köpt): sparas per recept ---------- */
  function kallaKey() { return 'mk-kalla:' + decodeURIComponent(location.pathname.split('/').pop()); }
  function kallaGet() {
    try { return JSON.parse(localStorage.getItem(kallaKey()) || '{}'); } catch (e) { return {}; }
  }
  function kallaSet(radNamn, ingId) {
    var m = kallaGet();
    if (ingId) m[radNamn] = ingId; else delete m[radNamn];
    try { localStorage.setItem(kallaKey(), JSON.stringify(m)); } catch (e) {}
  }

  function fmt(n, dec) {
    return n.toLocaleString('sv-SE', { minimumFractionDigits: dec === undefined ? 0 : dec, maximumFractionDigits: dec === undefined ? 1 : dec });
  }

  /* ---------- 🍽️ Portionsdetektering (antal ELLER vikt) ----------
     1) Antal ur beskrivningen: "6 portioner", "12 bitar", "3 bägare"
     2) VIKT ur sidtexten: "500 g smet i varje", "Per bägare (500 g)",
        "portionsstorlek 500 g" → per portion = totalen × 500/totG
        (viktbaserat är oberoende av omatchade ingredienser). */
  function portionsInfo(totG) {
    var beskr = (document.querySelector('meta[name="recept:beskrivning"]') || {}).content || '';
    var pm = beskr.match(/(\d+)\s*(portioner|port\b|bitar|hundportioner|klickar|glas|bullar|pizzor|b[äa]gare|burkar|tumblers?)/i);
    if (pm) return { typ: 'antal', n: +pm[1], rubrik: 'Per portion (' + pm[1] + ' st)' };
    var body = document.body ? document.body.textContent : '';
    var vm = body.match(/[Pp]er\s+(?:b[äa]gare|portion|burk|glas|tumbler)\s*\(\s*(\d{2,4})\s*g\s*\)/) ||
             body.match(/(\d{2,4})\s*g\s+(?:smet\s+)?i\s+varje/i) ||
             body.match(/portionsstorlek\s*(?:p[åa]|:)?\s*(\d{2,4})\s*g/i);
    if (vm && totG > 0) {
      var vikt = +vm[1];
      if (vikt >= 50 && vikt <= totG) {
        return { typ: 'vikt', g: vikt, n: Math.max(1, Math.round(totG / vikt)), rubrik: 'Per portion (' + vikt + ' g)' };
      }
    }
    return null;
  }

  var dbCache = null;

  async function run() {
    /* Riv gammalt (så omkörning efter redigering ger färska värden) */
    var oldBox = document.getElementById('mk-kalkyl');
    if (oldBox) oldBox.remove();
    document.querySelectorAll('.mk-saknas, .mk-prodlank, .mk-ingsub, .mk-bytsmak, .mk-smakval, .mk-kallval, .mk-gruppval').forEach(function (x) { x.remove(); });

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
      var kandidater = medMotpart(matchAll(r.namn, db), db);
      var ing = kandidater[0] || null;
      var g = toGrams(r.mangd, r.namn);

      /* 🌱/🛒 KÄLLVAL: finns ingrediensen BÅDE som egenodlad (0 kr)
         och köpt vara → receptet FRÅGAR vilken som används.
         Dropdown på raden, valet sparas per recept, kalkylen räknar
         med vald källa (hemodlad = pris 0, näringen kvar). */
      var egna = kandidater.filter(function (k) { return k.egenodlad; });
      var kopta = kandidater.filter(function (k) { return !k.egenodlad; });
      if (egna.length && kopta.length) {
        var valdaKallor = kallaGet();
        var valtId = valdaKallor[norm(r.namn)];
        var valdKalla = valtId ? kandidater.find(function (k) { return k.id === valtId; }) : null;
        if (valdKalla) {
          kandidater = [valdKalla];
          ing = valdKalla;
        } else {
          /* Inget val gjort än → räkna försiktigt med KÖPTA (snitt),
             men visa frågan tydligt på raden */
          kandidater = kopta;
          ing = kopta.length > 1 ? snitt(kopta) : kopta[0];
        }
        if (r.el) {
          var kc = r.el.querySelector('td');
          if (kc && !kc.querySelector('.mk-kallval')) {
            var ks = document.createElement('select');
            ks.className = 'mk-kallval no-print';
            ks.title = 'Ingrediensen finns både hemodlad (0 kr) och köpt – vilken använder du? Kalkylen räknas om direkt.';
            ks.style.cssText = 'margin-left:8px;padding:2px 6px;border:1.5px solid #27ae60;color:#27ae60;' +
              'border-radius:999px;font-size:.72rem;font-weight:700;background:#eaf7ef;cursor:pointer;' +
              'font-family:inherit;max-width:180px;vertical-align:middle;' +
              (!valdKalla ? 'box-shadow:0 0 0 3px rgba(39,174,96,.25);' : '');
            var kopts = '<option value="">❓ Hemodlad eller köpt?</option>' +
              egna.map(function (k) {
                return '<option value="' + k.id + '"' + (valtId === k.id ? ' selected' : '') + '>🌱 ' +
                  k.namn + ' · 0 kr</option>';
              }).join('') +
              kopta.map(function (k) {
                return '<option value="' + k.id + '"' + (valtId === k.id ? ' selected' : '') + '>🛒 ' +
                  k.namn + ((+k.pris_kr_per_kg || 0) > 0 ? ' · ' + fmt(+k.pris_kr_per_kg, 0) + ' kr/kg' : '') + '</option>';
              }).join('');
            ks.innerHTML = kopts;
            (function (radNamn) {
              ks.addEventListener('change', function () {
                kallaSet(radNamn, ks.value);
                if (window.__MK_TOAST) {
                  var o = ks.options[ks.selectedIndex];
                  window.__MK_TOAST(ks.value ? o.text + ' – kalkylen räknas om' : '❓ Inget val – räknar med köpt');
                }
                run();
              });
              ks.addEventListener('click', function (e) { e.stopPropagation(); });
            })(norm(r.namn));
            kc.appendChild(ks);
          }
        }
      }

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
      /* 🫙 GRUPPVAL: ingrediensen tillhör en GRUPP (fält "grupp",
         t.ex. "hemgjord sylt" på 10 syltposter) → dropdown på raden
         som skiftar mellan gruppens medlemmar – som whey-smakvalet
         men mellan HELA POSTER (pris & näring byts). Sparas per recept. */
      if (ing && ing.grupp && r.el) {
        var gruppMedl = db.filter(function (d) { return d.grupp === ing.grupp; });
        if (gruppMedl.length > 1) {
          var gVal = kallaGet();
          var gValtId = gVal['g:' + norm(r.namn)];
          var gVald = gValtId ? gruppMedl.find(function (k) { return k.id === gValtId; }) : null;
          if (gVald) ing = gVald;
          var gc = r.el.querySelector('td');
          if (gc && !gc.querySelector('.mk-gruppval')) {
            var gs = document.createElement('select');
            gs.className = 'mk-gruppval no-print';
            gs.title = 'Byt smak/sort inom gruppen "' + ing.grupp + '" – pris & näring räknas om direkt.';
            gs.style.cssText = 'margin-left:8px;padding:2px 6px;border:1.5px solid #b8860b;color:#b8860b;' +
              'border-radius:999px;font-size:.72rem;font-weight:700;background:#fff8ec;cursor:pointer;' +
              'font-family:inherit;max-width:190px;vertical-align:middle;';
            gs.innerHTML = gruppMedl.map(function (k) {
              return '<option value="' + k.id + '"' + (k.id === ing.id ? ' selected' : '') + '>🫙 ' +
                k.namn + ' · ' + fmt(+k.kcal || 0, 0) + ' kcal</option>';
            }).join('');
            (function (radNamn) {
              gs.addEventListener('change', function () {
                kallaSet('g:' + radNamn, gs.value);
                if (window.__MK_TOAST) window.__MK_TOAST('🫙 ' + gs.options[gs.selectedIndex].text.replace(/^🫙 /, '') + ' – räknas om');
                run();
              });
              gs.addEventListener('click', function (e) { e.stopPropagation(); });
            })(norm(r.namn));
            gc.appendChild(gs);
          }
        }
      }

      /* 🍫 SMAKVAL: ingrediensen har varianter (whey-smaker m.m.) →
         dropdown på raden. Vald smak ersätter näringen i kalkylen
         (pris är samma för alla smaker). Sparas per recept. */
      var basVarianter = ing && ing.varianter;
      if (ing && basVarianter && basVarianter.length > 1 && r.el) {
        var valda = smakGet();
        var valdSmak = valda[ing.id || ing.namn];
        var vald = valdSmak ? basVarianter.find(function (v) { return v.smak === valdSmak; }) : null;
        if (vald) {
          /* klona posten med smakens näring – originalet röres ej */
          ing = {
            id: ing.id, namn: ing.namn + ' (' + vald.smak + ')',
            pris_kr_per_kg: ing.pris_kr_per_kg, lank: ing.lank, kalla: ing.kalla,
            kcal: vald.kcal, protein: vald.protein,
            kolhydrat: vald.kolhydrat, fett: vald.fett, fiber: ing.fiber || 0
          };
        }
        var ncell0 = r.el.querySelector('td');
        if (ncell0 && !ncell0.querySelector('.mk-smakval')) {
          var sel = document.createElement('select');
          sel.className = 'mk-smakval no-print';
          sel.title = 'Vilken smak använder du? Kalkylen räknas om direkt med smakens egen näring.';
          sel.style.cssText = 'margin-left:8px;padding:2px 6px;border:1.5px solid #8e44ad;color:#8e44ad;' +
            'border-radius:999px;font-size:.72rem;font-weight:700;background:#f4ecfb;cursor:pointer;' +
            'font-family:inherit;max-width:170px;vertical-align:middle;';
          var basIng = db.find(function (d) { return d.id === ing.id; }) || ing;
          var opts = '<option value="">🍫 Snitt av ' + (basIng.varianter || []).length + ' smaker</option>' +
            (basIng.varianter || []).map(function (v) {
              return '<option value="' + String(v.smak).replace(/"/g, '&quot;') + '"' +
                (valdSmak === v.smak ? ' selected' : '') + '>' + v.smak + ' · ' + fmt(+v.kcal || 0, 0) + ' kcal</option>';
            }).join('');
          sel.innerHTML = opts;
          (function (ingId) {
            sel.addEventListener('change', function () {
              smakSet(ingId, sel.value);
              if (window.__MK_TOAST) window.__MK_TOAST(sel.value ? '🍫 ' + sel.value + ' – kalkylen räknas om' : '🍫 Snitt av alla smaker');
              run();
            });
            sel.addEventListener('click', function (e) { e.stopPropagation(); });
          })(ing.id || ing.namn);
          ncell0.appendChild(sel);
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
            s.title = 'Ingrediensen saknas i databasen – klicka för att MATCHA den mot en befintlig vara (alias) eller lägga till den';
            s.textContent = '✖ saknas – matcha?';
            s.style.cssText = 'display:inline-block;margin-left:8px;background:#fdecea;color:#c0392b;border:1px solid #c0392b;border-radius:999px;padding:0 8px;font-size:.68rem;font-weight:700;text-decoration:none;vertical-align:middle;cursor:pointer;';
            (function (radNamn) {
              s.addEventListener('click', function (e) {
                e.preventDefault();
                oppnaMatchning(radNamn, db);
              });
            })(r.namn);
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

    /* 🔀 BYT SMAK (förslag 169): på smaksättar-rader (bär/frukt/sylt/
       saft/smaksättare) visas en 🔀-knapp som byter ingrediensen mot
       en ANNAN smaksättare ur databasen – kalkylen räknas om direkt.
       Endast på skärmen (spans städas som allt annat). */
    (function bytSmak() {
      var SMAK_RE = /jordgubb|hallon|blåbär|svartvinbär|vinbär|lingon|hjortron|bär\b|banan|mango|ananas|persika|äpple|päron|citron|lime|apelsin|vanilj|choklad|kakao|biscoff|kanel|kardemumma|sylt|saft|honung|sirap|smak/i;
      var kandidater = db.filter(function (d) { return SMAK_RE.test(d.namn || ''); });
      if (kandidater.length < 2) return;
      rows.forEach(function (r) {
        if (!r.el || !SMAK_RE.test(r.namn)) return;
        var nc = r.el.querySelector('td');
        if (!nc || nc.querySelector('.mk-bytsmak')) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mk-bytsmak no-print';
        b.contentEditable = 'false';
        b.textContent = '🔀';
        b.title = 'Byt smak: slumpa en annan smaksättare ur databasen (' + kandidater.length + ' möjliga)';
        b.style.cssText = 'margin-left:6px;background:#f4ecfb;border:1.5px solid #8e44ad;color:#8e44ad;' +
          'border-radius:999px;padding:0 8px;font-size:.75rem;cursor:pointer;vertical-align:middle;';
        (function (rad) {
          b.onclick = function (e) {
            e.stopPropagation();
            var nuvarande = norm(liveName(rad.el));
            var alternativ = kandidater.filter(function (k) { return norm(k.namn) !== nuvarande; });
            if (!alternativ.length) return;
            var ny = alternativ[Math.floor(Math.random() * alternativ.length)];
            var cell = rad.el.querySelector('td');
            /* behåll ev. 💧-droppe, byt bara namnet */
            var drop = cell.querySelector('.drop');
            cell.textContent = ny.namn;
            if (drop) cell.insertBefore(drop, cell.firstChild);
            rad.el.setAttribute('data-namn', ny.namn);
            if (window.__MK_TOAST) window.__MK_TOAST('🔀 Bytte till ' + ny.namn + ' – kalkylen räknas om (endast på skärmen)');
            if (window.__MK_KALKYL_REFRESH) window.__MK_KALKYL_REFRESH();
          };
        })(r);
        nc.appendChild(b);
      });
    })();

    /* ♻️ UTBYTES-NOTIS – alltid, på alla recept (även utan kalkyl) */
    window.__MK_KALKYL_TOT = tot;   /* delas med etikett.js (burketiketter) m.fl. */
    window.__MK_KALKYL_PORT = portionsInfo(tot.g);   /* 🍽️ delas med tydlig.js (översiktspillren) */
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

    /* ============================================================
       📊 AUTO-KORRIGERAD NÄRING (användarens regel): inklistrade
       recept kan ha egna näringstal – de RÄKNAS ALLTID OM mot
       databasen och korrigeras automatiskt PÅ SKÄRMEN när ≥80 %
       av ingredienserna matchat (annars vore siffrorna sämre än
       originalets). Kcal/protein/kolhydrat/fett/fiber i recept-
       filens 📊 Näringsvärde-kort byts mot kalkylens live-värden
       + märks "🔄 live ur databasen". Källfilen röres aldrig.
       ============================================================ */
    (function korrigeraNaring() {
      var kort = null;
      document.querySelectorAll('.card').forEach(function (c) {
        var h = c.querySelector('h2');
        if (!kort && h && /näringsvärde/i.test(h.textContent) && !c.id) kort = c;
      });
      if (!kort || kort.getAttribute('data-mk-livekorr')) return;
      /* 🧮 ALLA recept kontrollräknas mot databasen (användarens regel).
         <80 % matchade → korrigera INTE siffrorna (databasen vet för
         lite) men flagga ändå tydligt att kortet inte kunnat verifieras. */
      if (matched / rows.length < 0.8) {
        if (!kort.querySelector('.mk-naring-varn')) {
          var varn = document.createElement('p');
          varn.className = 'no-print mk-naring-varn';
          varn.innerHTML = '⚠️ <b>Kunde inte kontrollräknas:</b> bara ' + matched + ' av ' + rows.length +
            ' ingredienser finns i databasen – siffrorna ovan är receptets egna. ' +
            '<a href="../ingredienser.html" style="color:#c0392b;">Lägg till de saknade</a> så live-verifieras kortet.';
          varn.style.cssText = 'font-size:.76rem;color:#c0392b;background:#fdecea;border-radius:8px;padding:6px 10px;margin-top:8px;';
          kort.appendChild(varn);
        }
        return;
      }

      var pinfo0 = portionsInfo(tot.g);
      var perPortion = /per (boll|portion|bit|glas|bulle|klick|styck|b[äa]gare|burk|tumbler)/i.test(kort.textContent) && pinfo0;
      /* antal → dela med antalet; viktportion → andel av totalvikten */
      var d = perPortion ? (pinfo0.typ === 'vikt' ? tot.g / pinfo0.g : pinfo0.n) : 1;

      var VARDEN = [
        [/^kcal|^energi/i, Math.round(tot.kcal / d) + (perPortion ? '' : ' totalt')],
        [/^protein/i, fmt(tot.prot / d) + ' g'],
        [/^kolhydrat/i, fmt(tot.kolh / d) + ' g'],
        [/^fett/i, fmt(tot.fett / d) + ' g'],
        [/^fiber/i, fmt(tot.fiber / d) + ' g'],
        [/^pris|^kostnad/i, '~' + fmt(tot.kr / d, 2) + ' kr']
      ];
      var andrade = 0;
      kort.querySelectorAll('tr').forEach(function (tr) {
        var tds = tr.querySelectorAll('td');
        if (tds.length < 2) return;
        var etikett = tds[0].textContent.trim();
        VARDEN.forEach(function (v) {
          if (v[0].test(etikett)) {
            var gammalt = tds[1].textContent.trim();
            var nytt = String(v[1]);
            if (gammalt.replace(/\s/g, '') !== nytt.replace(/\s/g, '')) {
              tds[1].innerHTML = '<b style="color:#27ae60;" title="Auto-korrigerad mot ingrediensdatabasen (stod: ' +
                gammalt.replace(/"/g, '&quot;') + ')">' + nytt + '</b>';
              andrade++;
            }
          }
        });
      });
      if (andrade) {
        kort.setAttribute('data-mk-livekorr', '1');
        var not = document.createElement('p');
        not.className = 'no-print mk-naring-not';
        not.innerHTML = '🔄 <b>' + andrade + ' värden auto-korrigerade</b> mot ingrediensdatabasen (live) – gröna siffror är omräknade, hovra för originalet.';
        not.style.cssText = 'font-size:.76rem;color:#27ae60;background:#eaf7ef;border-radius:8px;padding:6px 10px;margin-top:8px;';
        kort.appendChild(not);
      }
    })();

    if (matched < 2) return;   /* för få träffar → ingen kalkylbox (varningen ovan visas ändå) */

    /* 🍽️ Portioner: antal ur beskrivningen ELLER portionsvikt ur
       sidtexten ("500 g i varje") → BÅDE totalt & per portion visas */
    var pinfo = portionsInfo(tot.g);
    var port = pinfo ? pinfo.n : 0;
    /* delare: antal → dela med antalet; vikt → andel av totalvikten */
    var pdel = pinfo ? (pinfo.typ === 'vikt' ? tot.g / pinfo.g : pinfo.n) : 1;

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
      (port ? '<th style="text-align:right;padding:6px 8px;background:#f0ebe3;font-size:.72rem;text-transform:uppercase;color:#7f8c8d;">' + pinfo.rubrik + '</th>' : '') + '</tr>' +
      rad('💰 Kostnad', fmt(tot.kr, 2) + ' kr', fmt(tot.kr / pdel, 2) + ' kr') +
      rad('🔥 Kcal', fmt(tot.kcal, 0), fmt(tot.kcal / pdel, 0)) +
      rad('💪 Protein', fmt(tot.prot) + ' g', fmt(tot.prot / pdel) + ' g') +
      rad('🍞 Kolhydrat', fmt(tot.kolh) + ' g', fmt(tot.kolh / pdel) + ' g') +
      rad('🧈 Fett', fmt(tot.fett) + ' g', fmt(tot.fett / pdel) + ' g') +
      rad('🌾 Fiber', fmt(tot.fiber) + ' g', fmt(tot.fiber / pdel) + ' g') +
      '</table>' +
      (pinfo && pinfo.typ === 'vikt' ? '<p style="font-size:.74rem;color:#7f8c8d;margin-top:6px;">🍽️ Portionsstorlek ' + pinfo.g + ' g hittad i receptet (~' + pinfo.n + ' portioner av totalen).</p>' : '') +
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
