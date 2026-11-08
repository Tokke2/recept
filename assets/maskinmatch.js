/* ============================================================
   PLATS: /assets/maskinmatch.js  (assets-mappen i repo-roten)
   ============================================================
   MASKINANPASSNING – Mitt Maskinkök
   ============================================================
   Alla recept ANPASSAS AUTOMATISKT till maskinparken:

   När en NY maskin läggs till i json/maskiner/ kollar denna modul
   på varje receptsida om maskinen klarar receptet (programmens
   nyckelord matchas mot receptets taggar, titel och text) och
   visar då rutan "🔧 Fler av dina maskiner som klarar receptet"
   med maskin + program + tid.

   → Ingen receptfil behöver ändras. Lägg till maskinen = alla
     recept uppdateras direkt, överallt. (Centralt-principen!)

   Maskiner som redan står i receptet visas inte igen.
   Laddas automatiskt av site.js på receptsidor.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_MATCH_LOADED) return;
  window.__MK_MATCH_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  function meta(n) {
    var el = document.querySelector('meta[name="recept:' + n + '"]');
    return el ? el.content : '';
  }

  /* ---------- Receptets "profil" att matcha mot ----------
     🎯 ANVÄNDARENS REGEL: ingredienserna är ALDRIG med ("yoghurt" som
     vara får inte matcha Yoghurt-programmet). Rubriker inne i
     ingredienskortet ("🧾 Ingredienser") hoppas därför också över. */
  function recipeText() {
    var t = [
      document.title,
      meta('namn'),
      meta('taggar'),
      meta('beskrivning')
    ].join(' ');
    /* + rubriker och maskinsteg ur sidan (ej brödtext, ej ingredienskort) */
    document.querySelectorAll('h1, h2, .machine-step h3').forEach(function (el) {
      var kort = el.closest && el.closest('.card');
      if (kort) {
        var h = kort.querySelector('h2');
        if (h && /ingrediens/i.test(h.textContent)) return;   /* 🧾-kortet bort */
      }
      t += ' ' + el.textContent;
    });
    return t.toLowerCase();
  }

  /* ---------- Maskiner som REDAN nämns i receptet ----------
     OBS: våra EGNA injicerade element (🧪-badgar, matchrutan,
     dialoger) exkluderas – annars "smittar" ett maskinnamn i en
     tooltip och maskinen hoppas över vid omritning (bugg). */
  function mentioned() {
    var clone = document.body.cloneNode(true);
    clone.querySelectorAll('.mk-testad, #mk-maskinmatch, #mk-testad-bg, .mk-masklank, #mk-kedja').forEach(function (el) { el.remove(); });
    return (meta('maskiner') + ' ' + clone.innerHTML).toLowerCase();
  }

  /* ---------- Ladda maskinparken (cachas per session) ---------- */
  async function loadMachines() {
    try {
      var c = JSON.parse(sessionStorage.getItem('mk-maskinpark'));
      if (c && c.length) return c;
    } catch (e) {}
    var out = [];
    try {
      var idx = await (await fetch((window.__MK_ROT || '../') + 'json/maskiner-index.json')).json();
      await Promise.all(idx.map(async function (f) {
        try { out.push(await (await fetch((window.__MK_ROT || '../') + 'json/maskiner/' + f)).json()); } catch (e) {}
      }));
      try { sessionStorage.setItem('mk-maskinpark', JSON.stringify(out)); } catch (e) {}
    } catch (e) {}
    return out;
  }

  /* För generiska ord som annars ger tokiga tips (glassmaskin på kakrecept) */
  var GENERIC = ['efterrätt', 'dessert', 'fika', 'fest', 'snack', 'mat'];

  /* ---------- Poängsätt: klarar maskinen receptet? ---------- */
  function bestProgram(machine, text) {
    var best = null, bestScore = 0;
    (machine.program || []).forEach(function (p) {
      var score = 0;
      (p.nyckelord || []).forEach(function (k) {
        k = String(k).toLowerCase().trim();
        if (k.length < 3 || GENERIC.indexOf(k) !== -1) return;
        /* Hela ord – "ost" får inte matcha inuti "frost" */
        var re = new RegExp('(^|[^a-zåäö])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-zåäö])');
        if (re.test(text)) score++;
      });
      /* rengörings-/underhållsprogram räknas aldrig som recepttips */
      if (/reng|clean|extrude/i.test(p.namn || '')) score = 0;
      if (score > bestScore) { bestScore = score; best = p; }
    });
    return bestScore >= 1 ? { program: best, score: bestScore } : null;
  }

  /* ============================================================
     ✅ TESTAD & LYCKAD I FLER MASKINER (användarens regel):
     admin kan markera att receptet testats OCKSÅ i typ-syskonet
     (t.ex. båda riskokarna) med egen tid/program. Sparas som
     metarad i receptfilen (lösenordsskyddat via __MK_SPARA):
       <meta name="recept:testad" content="maskin-id: Program, tid | ...">
     → förslaget blir GRÖNT "✅ Testad & lyckad · [tid]" för alla
     besökare istället för orange "Ej testad"-varning.
     ============================================================ */
  function lasTestade() {
    var m = document.querySelector('meta[name="recept:testad"]');
    var ut = {};
    if (!m) return ut;
    String(m.getAttribute('content') || '').split('|').forEach(function (del) {
      var i = del.indexOf(':');
      if (i > 0) ut[del.slice(0, i).trim()] = del.slice(i + 1).trim();
    });
    return ut;
  }

  var PARK = [];   /* fylls i run() – markeraTestad slår upp typ/modellnamn här */
  function parkInfo(id) {
    for (var i = 0; i < PARK.length; i++) if (PARK[i].id === id) return PARK[i];
    return null;
  }
  async function markeraTestad(maskin) {
    if (!window.__MK_SPARA) {
      if (window.__MK_TOAST) window.__MK_TOAST('⚠️ Spara-modulen kunde inte laddas – ladda om sidan.');
      return;
    }
    if (!(await window.__MK_SPARA.unlock())) return;   /* 🔒 lösenord först */
    var mInfo = parkInfo(maskin.id) || {};
    var arAF = /airfryer/i.test(String(mInfo.typ || ''));
    var old = document.getElementById('mk-testad-bg');
    if (old) old.remove();
    var bg = document.createElement('div');
    bg.id = 'mk-testad-bg';
    bg.className = 'no-print';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:320;display:flex;align-items:center;justify-content:center;padding:16px;';
    bg.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;padding:24px 26px;font-family:Segoe UI,system-ui,sans-serif;color:#2c3e50;">' +
        '<h3 style="margin:0 0 4px;">✅ Testat receptet i ' + maskin.namn + '?</h3>' +
        '<p style="font-size:.85rem;color:#5f6e70;margin:0 0 12px;">Ange program och tid som funkade i just DENNA maskin (kan skilja sig från receptets) – visas grönt för alla besökare.</p>' +
        '<label style="display:block;font-size:.75rem;font-weight:700;color:#5f6e70;text-transform:uppercase;margin-bottom:4px;">Program &amp; tid som lyckades</label>' +
        '<input id="mt-prog" type="text" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.92rem;font-family:inherit;" ' +
          'placeholder="t.ex. Kakbakning (Cake), 45 min" value="' + String(maskin.forslag || '').replace(/"/g, '&quot;') + '">' +
        /* 🍟 AIRFRYER-EXTRA (användarens order 2026-11-07, punkt 141):
           registrera faktisk tid + om maten ska vändas – skrivs AUTOMATISKT
           in i instruktionerna vid maskinens ⚙️-ruta, med maskinnamnet */
        (arAF ?
        '<div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;align-items:center;">' +
          '<span style="white-space:nowrap;"><label style="font-size:.75rem;font-weight:700;color:#5f6e70;text-transform:uppercase;display:block;margin-bottom:4px;">⏱️ Faktisk tid (min)</label>' +
          '<input id="mt-tid" type="text" inputmode="numeric" style="width:90px;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.92rem;font-family:inherit;" placeholder="t.ex. 12"></span>' +
          '<label style="font-size:.9rem;font-weight:700;display:flex;align-items:center;gap:7px;cursor:pointer;margin-top:18px;">' +
          '<input id="mt-vand" type="checkbox" style="width:20px;height:20px;accent-color:#27ae60;"> 🔄 Vänd/skaka halvvägs</label>' +
        '</div>' : '') +
        '<div style="display:flex;gap:8px;margin-top:14px;">' +
          '<button id="mt-spara" style="flex:1;background:#27ae60;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;cursor:pointer;font-family:inherit;">✅ Testad &amp; lyckad!</button>' +
          '<button id="mt-avbryt" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;font-family:inherit;">Avbryt</button>' +
        '</div>' +
        '<div id="mt-result" style="margin-top:8px;font-size:.85rem;"></div>' +
      '</div>';
    document.body.appendChild(bg);
    bg.querySelector('#mt-avbryt').onclick = function () { bg.remove(); };
    var dn = false;
    bg.addEventListener('mousedown', function (e) { dn = (e.target === bg); });
    bg.addEventListener('click', function (e) { if (e.target === bg && dn) bg.remove(); });
    bg.querySelector('#mt-spara').onclick = async function () {
      var prog = bg.querySelector('#mt-prog').value.trim();
      if (!prog) {
        bg.querySelector('#mt-result').textContent = '⚠️ Ange program & tid som funkade!';
        bg.querySelector('#mt-prog').focus();
        return;
      }
      var out = bg.querySelector('#mt-result');
      out.textContent = '⏳ Sparar...';
      var fname = decodeURIComponent(location.pathname.split('/').pop());
      /* 📁 BUGGFIX (punkt 123): recepten ligger i recept/<kategorimapp>/ –
         basnamnet räcker inte ("kunde inte läsa receptfilen"). Hela
         undervägen härleds ur rot-djupet, samma som redigera.js. */
      var djup = ((window.__MK_ROT || '../').match(/\.\.\//g) || ['../']).length;
      var fsokvag = location.pathname.split('/').filter(Boolean).slice(-djup).map(decodeURIComponent).join('/');
      var res = { ok: false, error: 'okänt fel' };
      try {
        var txt = await window.__MK_SPARA.load('recept/' + fsokvag);
        if (!txt) throw new Error('kunde inte läsa receptfilen');
        /* uppdatera/lägg till maskinens post i recept:testad-metan */
        var alla = {};
        var metaRe = /<meta\s+name="recept:testad"\s+content="([^"]*)"\s*>\s*\n?/i;
        var m0 = txt.match(metaRe);
        if (m0) m0[1].split('|').forEach(function (del) {
          var i = del.indexOf(':');
          if (i > 0) alla[del.slice(0, i).trim()] = del.slice(i + 1).trim();
        });
        /* 📅 datum följer med (punkt 133) + 🔄 vändning (punkt 141) */
        var idag = new Date().toISOString().slice(0, 10);
        var tidMin = '', vand = false;
        if (arAF) {
          tidMin = String((bg.querySelector('#mt-tid') || {}).value || '').replace(/[^\d]/g, '');
          vand = !!(bg.querySelector('#mt-vand') || {}).checked;
        }
        alla[maskin.id] = prog + (vand ? ' · vänd halvvägs' : '') + ' (verifierad ' + idag + ')';
        var inneh = Object.keys(alla).map(function (k) { return k + ': ' + alla[k]; }).join(' | ');
        var rad = '<meta name="recept:testad" content="' + inneh.replace(/"/g, '&quot;') + '">\n';
        if (metaRe.test(txt)) txt = txt.replace(metaRe, rad);
        else {
          var ankare = /(<meta\s+name="recept:maskiner"[^>]*>\s*\n?)/i;
          if (ankare.test(txt)) txt = txt.replace(ankare, '$1' + rad);
          else txt = txt.replace(/(<meta\s+name="recept:namn"[^>]*>\s*\n?)/i, '$1' + rad);
        }
        /* 🍟 AF: skriv ⏱️-raden i INSTRUKTIONERNA vid maskinens ⚙️-ruta (punkt 141) */
        if (arAF && (tidMin || vand)) {
          var radTxt = '⏱️ <b>' + maskin.namn + ':</b> ' + (tidMin ? tidMin + ' min' : prog) +
            (vand ? ' · 🔄 vänd/skaka halvvägs' : '') +
            ' <span style="color:#5f6e70;font-size:.85em;">(verifierad ' + idag + ')</span>';
          var divNy = '<div class="mk-aftid" data-mid="' + maskin.id + '" ' +
            'style="margin-top:8px;padding:8px 12px;background:#eafaf1;border:1.5px solid #27ae60;' +
            'border-radius:9px;font-size:.9rem;">' + radTxt + '</div>';
          /* bort med ev. gammal rad för samma maskin */
          txt = txt.replace(new RegExp('\\n?<div class="mk-aftid" data-mid="' + maskin.id + '"[\\s\\S]*?</div>', 'g'), '');
          /* in efter maskinens ⚙️-rubrik (h3 som innehåller modellord/varumärke) */
          var nycklar = [String(mInfo.varumarke || ''), String(mInfo.modellnamn || '').split(/\s+/)[0]]
            .filter(function (x) { return x.length >= 3; });
          var traff = -1;
          var h3Re = /<h3>[^<]*/g, m3;
          while ((m3 = h3Re.exec(txt))) {
            var rubrik = m3[0].toLowerCase();
            if (nycklar.some(function (k) { return rubrik.indexOf(k.toLowerCase()) !== -1; })) {
              traff = txt.indexOf('</h3>', m3.index);
              break;
            }
          }
          if (traff !== -1) {
            traff += '</h3>'.length;
            txt = txt.slice(0, traff) + '\n' + divNy + txt.slice(traff);
          } else {
            /* reserv: direkt efter "Gör så här"-rubriken */
            var gsIx = txt.search(/Gör så här<\/h2>/);
            if (gsIx !== -1) {
              gsIx = txt.indexOf('</h2>', gsIx) + '</h2>'.length;
              txt = txt.slice(0, gsIx) + '\n' + divNy + txt.slice(gsIx);
            }
          }
        }
        res = await window.__MK_SPARA.save('recept/' + fsokvag, txt,
          '✅ Testad & lyckad i ' + maskin.namn + ': ' + fname);
      } catch (e) { res = { ok: false, error: e.message }; }
      if (res.ok) {
        /* uppdatera sidans meta + rita om rutan direkt */
        var mEl = document.querySelector('meta[name="recept:testad"]');
        if (!mEl) {
          mEl = document.createElement('meta');
          mEl.setAttribute('name', 'recept:testad');
          document.head.appendChild(mEl);
        }
        var a2 = lasTestade(); a2[maskin.id] = prog;
        mEl.setAttribute('content', Object.keys(a2).map(function (k) { return k + ': ' + a2[k]; }).join(' | '));
        bg.remove();
        var gammal = document.getElementById('mk-maskinmatch');
        if (gammal) gammal.remove();
        /* 🔄 maskinraden överst byggs om så ⏳ → ✅ syns direkt */
        var topp = document.getElementById('mk-maskintop');
        if (topp) topp.remove();
        run();
      } else {
        out.innerHTML = '<span style="color:#c0392b;">⚠️ ' + res.error + '</span>';
      }
    };
  }

  async function run() {
    var text = recipeText();
    var known = mentioned();
    var machines = await loadMachines();
    if (!machines.length) return;

    /* 🧪 TESTAD-MED-VILKEN? (användarens regel): finns FLERA maskiner
       av samma typ i parken (t.ex. 2 riskokare: Midea + Yum Asia) ska
       receptet tydligt visa VILKEN som receptet testats med.
       Typgrupp = första ledet i "typ" ("Riskokare / Multikokare" →
       "riskokare"). */
    function typKey(m) {
      return String(m.typ || '').split('/')[0].trim().toLowerCase();
    }
    var typAntal = {};
    machines.forEach(function (m) {
      var t = typKey(m);
      if (t) typAntal[t] = (typAntal[t] || 0) + 1;
    });
    function arKand(m) {
      return (m.varumarke && known.indexOf(String(m.varumarke).toLowerCase()) !== -1) ||
             (m.modellnamn && known.indexOf(String(m.modellnamn).toLowerCase()) !== -1);
    }
    PARK = machines;
    var testade = machines.filter(arKand);
    var testadeTyper = {};
    testade.forEach(function (m) { var t = typKey(m); if (t) testadeTyper[t] = m; });

    /* ✅ GRÖN BOCK PÅ MASKINRUTAN (användarens regel): maskiner som
       receptet självt anger får en tydlig grön bock VID namnet + en
       klartextrad "✅ Verifierad maskin: ..." i rutan – MEN ENDAST
       när ägaren faktiskt VERIFIERAT (användarens regel 2026-10-31:
       "inga recept man laddar upp ska vara verifierade innan
       användaren har lagat/bakat"). Kravet: receptet är 🌟-verifierat
       (recept:verifierad-metan) ELLER maskinen är ✅-markerad med tid
       i recept:testad-metan. Overifierade recept visar INGENTING –
       och alternativa maskiner avvaktar som vanligt med ⚠️ i
       förslagsrutan tills de ✅-markeras. Runtime-element
       (.mk-verifmask) städas alltid av buildCleanHtml.
       🧪-syskonpillen kräver samma verifiering (annars vore
       "Testad med denna" en osann utfästelse). */
    var manTest = lasTestade();   /* ur recept:testad-metan */
    var receptVerifierad = !!document.querySelector('meta[name="recept:verifierad"]');

    /* 🔧 MASKIN-THUMBS ÖVER RECEPTET (användarens regel 2026-11-01:
       "visa thumb med länkar ovan receptet, ange att det är de
       maskiner som ANVÄNDS – overifierad tills man säger till").
       Bild + namn (med typ) + länk till maskindatabasen per maskin.
       Status per maskin: ✅ endast när delen är admin-verifierad
       (recept:testad, eller 🌟 på ett-maskinsrecept) – annars ⏳.
       INGA "Verifierad med"-påståenden. Runtime (#mk-maskintop). */
    (function maskinTop() {
      if (!testade.length || document.getElementById('mk-maskintop')) return;
      var header = document.querySelector('body > header') || document.querySelector('header');
      if (!header) return;
      var rot = window.__MK_ROT || '../';
      var rad = document.createElement('div');
      rad.id = 'mk-maskintop';
      rad.className = 'no-print';
      rad.style.cssText = 'background:#fff;border:1.5px solid #eee2d2;border-radius:14px;' +
        'padding:10px 14px;margin:14px 0;box-shadow:0 2px 8px rgba(0,0,0,.06);';
      var chips = testade.map(function (m) {
        var n = ((m.varumarke || '') + ' ' + (m.modellnamn || '')).trim() || m.namn || m.id;
        if (window.__MK_MED_TYP) n = window.__MK_MED_TYP(n, m.typ);
        var klar = manTest[m.id] || (receptVerifierad && testade.length < 2);
        var status = klar
          ? '<span title="Admin har verifierat receptet i denna maskin" style="color:#27ae60;font-weight:900;">✅</span>'
          : '<span title="Ej verifierad av admin ännu" style="opacity:.75;">⏳</span>';
        var bild = m.bild
          ? '<img src="' + rot + m.bild + '" alt="" loading="lazy" onerror="this.remove()" ' +
            'style="width:34px;height:34px;object-fit:contain;border-radius:8px;background:#f6f3ee;flex-shrink:0;">'
          : '';
        return '<a href="' + rot + 'maskindatabas.html#' + encodeURIComponent(m.id) + '" ' +
          'data-mk-mid="' + m.id + '" data-mk-namn="' + n.replace(/"/g, '&quot;') + '" ' +
          'style="display:inline-flex;align-items:center;gap:8px;background:#f6f3ee;border:1px solid #eee2d2;' +
          'border-radius:999px;padding:5px 14px 5px 6px;text-decoration:none;color:#2c3e50;' +
          'font-size:.84rem;font-weight:700;margin:3px 6px 3px 0;' +
          '-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;">' +
          bild + '<span>' + n + '</span>' + status + '</a>';
      }).join('');
      rad.innerHTML = '<span style="font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;' +
        'color:#a5967e;display:block;margin-bottom:6px;">🔧 Maskiner som används i receptet ' +
        '<span style="text-transform:none;letter-spacing:0;">(⏳ = ej verifierad · klick = maskinsidan · håll inne 3 sek = ✅ verifiera)</span></span>' + chips;

      /* ✅ HÅLL-INNE-VERIFIERING (användarens order 2026-11-01, punkt 131):
         vanligt klick går till maskindatabasen som förr – håll inne
         chipen i 3 sekunder → verifieringsdialogen (lösenordslåset i
         markeraTestad gäller som vanligt). Programförslaget förifylls
         ur recept:maskiner-metan när maskinen hittas där. */
      function forslagFor(id) {
        var mEl2 = document.querySelector('meta[name="recept:maskiner"]');
        var m2 = testade.filter(function (x) { return x.id === id; })[0];
        if (!mEl2 || !m2) return '';
        var nycklar = [String(m2.varumarke || ''), String(m2.modellnamn || '').split(/\s+/)[0]]
          .map(function (x) { return x.toLowerCase(); }).filter(function (x) { return x.length >= 3; });
        var delar = String(mEl2.getAttribute('content') || '').split('|');
        for (var i = 0; i < delar.length; i++) {
          var ix = delar[i].indexOf('·');
          if (ix === -1) continue;
          var fore = delar[i].slice(0, ix).toLowerCase();
          if (nycklar.some(function (k) { return fore.indexOf(k) !== -1; })) return delar[i].slice(ix + 1).trim();
        }
        return '';
      }
      var HALL_MS = window.__MK_HALL_MS || 3000;
      rad.querySelectorAll('a[data-mk-mid]').forEach(function (a) {
        var tmr = null, fired = false;
        function starta() {
          fired = false;
          tmr = setTimeout(function () {
            fired = true;
            try { if (navigator.vibrate) navigator.vibrate(60); } catch (e2) {}
            markeraTestad({ id: a.getAttribute('data-mk-mid'),
                            namn: a.getAttribute('data-mk-namn'),
                            forslag: forslagFor(a.getAttribute('data-mk-mid')) });
          }, HALL_MS);
        }
        function avbryt() { if (tmr) { clearTimeout(tmr); tmr = null; } }
        a.addEventListener('touchstart', starta, { passive: true });
        ['touchend', 'touchcancel'].forEach(function (ev) { a.addEventListener(ev, avbryt); });
        a.addEventListener('touchmove', avbryt, { passive: true });
        a.addEventListener('mousedown', starta);
        ['mouseup', 'mouseleave'].forEach(function (ev) { a.addEventListener(ev, avbryt); });
        a.addEventListener('contextmenu', function (e) { if (fired || tmr) e.preventDefault(); });
        a.addEventListener('click', function (e) { avbryt(); if (fired) { e.preventDefault(); fired = false; } });
      });
      header.parentNode.insertBefore(rad, header.nextSibling);
    })();

    /* 🔀 ALTERNATIVGRUPPER (användarens regel 2026-11-01: "maskiner för
       samma sak, t.ex. gräddning i olika maskiner → ska tydligt stå
       att det funkar i dessa, men ej vara verifierat innan admin
       verifierar"). Gruppnyckel = första betydande programordet efter
       '·' i rubriken (bake/dough/grill...). Minst 2 rutor med OLIKA
       maskiner på samma nyckel = alternativ för samma moment. */
    function progNyckel(t) {
      var efter = String(t).split('·').slice(1).join(' ').toLowerCase();
      var m = efter.match(/[a-zåäö]{4,}/);
      return m ? m[0] : '';
    }
    var TASKORD = { bake: 'Gräddningen', dough: 'Degen', grill: 'Grillningen',
                    roast: 'Rostningen', dehydrate: 'Torkningen', fry: 'Friteringen' };
    var egnaRutor = [];
    document.querySelectorAll('.machine-step h3').forEach(function (h3) {
      var txt = h3.textContent.toLowerCase();
      for (var i = 0; i < testade.length; i++) {
        var mod = String(testade[i].modellnamn || '').toLowerCase();
        if (mod && txt.indexOf(mod) !== -1) {
          egnaRutor.push({ h3: h3, m: testade[i], key: progNyckel(h3.textContent) });
          return;
        }
      }
    });
    var grupper = {};
    egnaRutor.forEach(function (r) { if (r.key) (grupper[r.key] = grupper[r.key] || []).push(r); });
    var altFor = [];   /* [{h3, andra:[namn], task}] */
    Object.keys(grupper).forEach(function (k) {
      var g = grupper[k];
      var olika = {};
      g.forEach(function (r) { olika[r.m.id] = 1; });
      if (g.length < 2 || Object.keys(olika).length < 2) return;
      g.forEach(function (r) {
        var andra = g.filter(function (x) { return x !== r; }).map(function (x) {
          var n = ((x.m.varumarke || '') + ' ' + (x.m.modellnamn || '')).trim() || x.m.namn;
          return window.__MK_MED_TYP ? window.__MK_MED_TYP(n, x.m.typ) : n;
        });
        altFor.push({ h3: r.h3, andra: andra, task: TASKORD[k] || 'Momentet' });
      });
    });
    function altInfoFor(h3) {
      for (var i = 0; i < altFor.length; i++) if (altFor[i].h3 === h3) return altFor[i];
      return null;
    }

    document.querySelectorAll('.machine-step h3').forEach(function (h3) {
      if (h3.querySelector('.mk-testad') || h3.querySelector('.mk-verifmask')) return;
      var txt = h3.textContent.toLowerCase();
      testade.forEach(function (m) {
        var modell = String(m.modellnamn || '').toLowerCase();
        var marke = String(m.varumarke || '').toLowerCase();
        var traff = (modell && txt.indexOf(modell) !== -1) ||
                    (marke && modell && txt.indexOf(marke) !== -1 && txt.indexOf(modell.split(' ')[0]) !== -1);
        if (!traff) return;
        var tid = manTest[m.id] || '';
        var box = h3.closest('.machine-step');
        /* 🛡️ grindvakten + 🧩 PER MASKINDEL (användarens regel
           2026-10-31: "om recept har fler maskiner ska man verifiera
           var maskindel"): har receptet FLERA egna maskiner räcker
           INTE 🌟 för grön bock – varje maskindel kräver egen
           ✅-markering med tid (recept:testad). Ett-maskinsrecept:
           🌟 ELLER ✅ räcker (hela receptet = den maskinen). */
        var delKlar = tid || (receptVerifierad && testade.length < 2);
        /* 🔀 alternativrutans klartext – "funkar även i dessa" alltid
           synlig; ⏳-status tills just DENNA del är admin-verifierad */
        var ai = altInfoFor(h3);
        if (box && ai && !box.querySelector('.mk-altinfo')) {
          var alt = document.createElement('div');
          alt.className = 'mk-altinfo no-print';
          alt.style.cssText = 'margin-top:8px;background:#f5f7f8;border:1px solid #b0bec5;border-radius:9px;' +
            'padding:6px 12px;font-size:.78rem;color:#546e7a;line-height:1.5;';
          alt.textContent = '🔀 ' + ai.task + ' funkar även i: ' + ai.andra.join(' · ') + ' – välj EN maskin.' +
            (delKlar ? '' : ' ⏳ Ej verifierad av admin ännu.');
          box.appendChild(alt);
        }
        if (!delKlar) {
          /* overifierad DEL i flermaskinsrecept → diskret admin-knapp
             så varje del kan verifieras på plats (lösenord krävs) */
          if (box && testade.length >= 2 && !box.querySelector('.mk-verifdel')) {
            var vb = document.createElement('button');
            vb.className = 'mk-verifdel no-print';
            vb.textContent = '✅ Verifiera denna maskindel';
            vb.title = 'Admin: har du lagat/bakat momentet i denna maskin med lyckat resultat? Klicka och ange program & tid (lösenord krävs).';
            vb.style.cssText = 'display:inline-block;margin-top:8px;background:transparent;color:#5f6e70;' +
              'border:1.5px dashed #b0bec5;border-radius:999px;padding:4px 12px;font-size:.74rem;' +
              'font-weight:700;cursor:pointer;font-family:inherit;';
            (function (mm2, h32) {
              vb.onclick = function () {
                var prog = h32.textContent.split('·').slice(1).join('·').replace(/\s+/g, ' ').trim();
                markeraTestad({ id: mm2.id,
                  namn: ((mm2.varumarke || '') + ' ' + (mm2.modellnamn || '')).trim() || mm2.namn || mm2.id,
                  forslag: prog });
              };
            })(m, h3);
            box.appendChild(vb);
          }
          return;
        }

        /* ✅ bocken + klartexten (en gång per ruta) */
        if (box && !box.querySelector('.mk-verifmask')) {
          var bock = document.createElement('span');
          bock.className = 'mk-verifmask no-print';
          bock.title = 'Admin har verifierat receptet i denna maskin';
          bock.setAttribute('aria-label', bock.title);
          bock.textContent = '✓';
          bock.style.cssText = 'display:inline-flex;width:26px;height:26px;background:#27ae60;color:#fff;' +
            'border-radius:50%;align-items:center;justify-content:center;font-size:.95rem;font-weight:900;' +
            'margin-right:8px;vertical-align:middle;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);line-height:1;flex-shrink:0;';
          h3.insertBefore(bock, h3.firstChild);

          var namn = ((m.varumarke || '') + ' ' + (m.modellnamn || '')).trim() || m.namn || m.id;
          if (window.__MK_MED_TYP) namn = window.__MK_MED_TYP(namn, m.typ);
          var rad = document.createElement('div');
          rad.className = 'mk-verifmask no-print';
          rad.style.cssText = 'margin-top:8px;background:#eaf7ef;border:1.5px solid #27ae60;border-radius:9px;' +
            'padding:6px 12px;font-size:.82rem;color:#1e8449;font-weight:700;';
          rad.textContent = '✅ Admin har verifierat i denna maskin: ' + namn +
            (tid ? ' (' + tid + ')' : '');
          box.appendChild(rad);
        }

        /* 🧪-pillen endast när det FINNS syskon i parken */
        var t = typKey(m);
        if (!t || (typAntal[t] || 0) < 2) return;
        var syskon = machines.filter(function (x) {
          return typKey(x) === t && x.id !== m.id;
        }).map(function (x) {
          var n = ((x.varumarke || '') + ' ' + (x.modellnamn || '')).trim() || x.namn || x.id;
          return window.__MK_MED_TYP ? window.__MK_MED_TYP(n, x.typ) : n;   /* 🏷️ typ i namnet */
        });
        var b = document.createElement('span');
        b.className = 'mk-testad no-print';
        b.title = 'Du har ' + typAntal[t] + ' ' + t + ' – receptet är testat med just DENNA. ' +
          (syskon.length ? 'Din andra (' + syskon.join(', ') + ') kan kräva andra tider/program.' : '');
        b.textContent = '🧪 Testad med denna';
        b.style.cssText = 'display:inline-block;margin-left:8px;background:#eaf7ef;color:#27ae60;' +
          'border:1px solid #27ae60;border-radius:999px;padding:1px 9px;font-size:.68rem;' +
          'font-weight:700;vertical-align:middle;cursor:help;';
        h3.appendChild(b);
      });
    });

    var manuelltTestade = lasTestade();   /* ✅ ur recept:testad-metan */
    var hits = [];
    machines.forEach(function (m) {
      var name = ((m.varumarke || '') + ' ' + (m.modellnamn || '')).trim();
      /* 🏷️ typ i namnet – "Clatronic BBA 3774 (Bakmaskin)" (användarens regel) */
      name = window.__MK_MED_TYP ? window.__MK_MED_TYP(name || m.namn || m.id, m.typ) : name;
      /* hoppa över maskiner som redan står i receptet */
      if (arKand(m)) return;
      var b = bestProgram(m, text);
      if (b) {
        /* ✅ manuellt markerad som testad & lyckad? annars ⚠️ om typ-krock */
        var t = typKey(m);
        var lyckad = manuelltTestade[m.id] || null;
        var otestad = !lyckad && !!(t && testadeTyper[t]);
        hits.push({ m: m, name: name || m.namn || m.id, p: b.program, score: b.score,
                    otestad: otestad, lyckad: lyckad });
      }
    });
    if (!hits.length) return;
    hits.sort(function (a, b) { return b.score - a.score; });
    hits = hits.slice(0, 4);  // max 4 tips – de mest relevanta

    var rows = hits.map(function (h) {
      var img = h.m.bild ? '<img src="../' + h.m.bild + '" alt="" loading="lazy" ' +
        'style="width:44px;height:44px;object-fit:contain;border-radius:8px;background:#fff;flex-shrink:0;" ' +
        'onerror="this.remove()">' : '';
      var tid = h.p.standardtid ? ' · ' + h.p.standardtid : '';
      var beskr = h.p.beskrivning ? '<div style="color:#5f6e70;font-size:.82rem;margin-top:2px;">' + h.p.beskrivning + '</div>' : '';
      var badge = '', progHtml;
      if (h.lyckad) {
        /* ✅ GRÖN: testad & lyckad i denna maskin – visa den LYCKADE tiden */
        badge = ' <span title="Admin har testat receptet i denna maskin – programmet/tiden nedan är verifierad." ' +
          'style="display:inline-block;background:#27ae60;color:#fff;border:1px solid #1e8449;border-radius:999px;' +
          'padding:0 8px;font-size:.68rem;font-weight:700;vertical-align:middle;cursor:help;">✅ Testad &amp; lyckad</span>';
        progHtml = '<span style="color:#27ae60;font-weight:700;">' + h.lyckad + '</span>';
      } else {
        if (h.otestad) {
          badge = ' <span title="Receptet är testat med din andra maskin av samma typ – tider/program kan behöva justeras för denna." ' +
            'style="display:inline-block;background:#fdf6ee;color:#e67e22;border:1px solid #e67e22;border-radius:999px;' +
            'padding:0 8px;font-size:.68rem;font-weight:700;vertical-align:middle;cursor:help;">⚠️ Ej testad med denna</span>';
        }
        progHtml = '<span style="color:#27ae60;font-weight:700;">' + (h.p.namn || '') + tid + '</span>';
      }
      /* ✅-knapp för admin: markera testad & lyckad (visas på otestade typ-syskon) */
      var testaBtn = (!h.lyckad && h.otestad)
        ? ' <button class="mk-testa-btn" data-id="' + h.m.id + '" data-namn="' + h.name.replace(/"/g, '&quot;') + '" ' +
          'data-forslag="' + ((h.p.namn || '') + (h.p.standardtid ? ', ' + h.p.standardtid : '')).replace(/"/g, '&quot;') + '" ' +
          'title="Har du testat receptet i denna maskin med lyckat resultat? Klicka och ange tiden (lösenord krävs)." ' +
          'style="background:#f0ebe3;border:none;border-radius:999px;padding:1px 9px;font-size:.68rem;font-weight:700;' +
          'cursor:pointer;font-family:inherit;color:#2c3e50;vertical-align:middle;">✅ Jag har testat – markera</button>'
        : '';
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f0ebe3;' +
        (h.lyckad ? 'background:rgba(39,174,96,.06);border-left:3px solid #27ae60;padding-left:8px;border-radius:6px;' : '') + '">' +
        img +
        '<div><b>' + h.name + '</b>' + badge + testaBtn + ' · ' + progHtml + beskr + '</div></div>';
    }).join('');

    var st = document.createElement('style');
    st.textContent = '@media print{#mk-maskinmatch{display:none!important;}}';
    document.head.appendChild(st);

    var box = document.createElement('div');
    box.className = 'card no-print';
    box.id = 'mk-maskinmatch';
    box.innerHTML =
      '<h2>🔧 Fler av dina maskiner som klarar receptet</h2>' +
      '<p style="color:#5f6e70;font-size:.83rem;margin-bottom:6px;">Matchas automatiskt mot maskindatabasen – ' +
      'lägger du till en ny maskin dyker den upp här av sig själv.</p>' + rows;
    box.querySelector('div:last-child') && (box.querySelector('div:last-child').style.borderBottom = 'none');

    var footer = document.querySelector('footer');
    if (footer) footer.parentNode.insertBefore(box, footer);
    else document.body.appendChild(box);

    /* ✅ koppla "Jag har testat"-knapparna (admin, lösenord i markeraTestad) */
    box.querySelectorAll('.mk-testa-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        markeraTestad({ id: btn.getAttribute('data-id'), namn: btn.getAttribute('data-namn'),
                        forslag: btn.getAttribute('data-forslag') });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
