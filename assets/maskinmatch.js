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

  /* ---------- Receptets "profil" att matcha mot ---------- */
  function recipeText() {
    var t = [
      document.title,
      meta('namn'),
      meta('taggar'),
      meta('beskrivning')
    ].join(' ');
    /* + rubriker och maskinsteg ur sidan (ej hela brödtexten – för brett) */
    document.querySelectorAll('h1, h2, .machine-step h3').forEach(function (el) {
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
      var idx = await (await fetch('../json/maskiner-index.json')).json();
      await Promise.all(idx.map(async function (f) {
        try { out.push(await (await fetch('../json/maskiner/' + f)).json()); } catch (e) {}
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

  async function markeraTestad(maskin) {
    if (!window.__MK_SPARA) { alert('Spara-modulen kunde inte laddas – ladda om sidan.'); return; }
    if (!(await window.__MK_SPARA.unlock())) return;   /* 🔒 lösenord först */
    var old = document.getElementById('mk-testad-bg');
    if (old) old.remove();
    var bg = document.createElement('div');
    bg.id = 'mk-testad-bg';
    bg.className = 'no-print';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:320;display:flex;align-items:center;justify-content:center;padding:16px;';
    bg.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;padding:24px 26px;font-family:Segoe UI,system-ui,sans-serif;color:#2c3e50;">' +
        '<h3 style="margin:0 0 4px;">✅ Testat receptet i ' + maskin.namn + '?</h3>' +
        '<p style="font-size:.85rem;color:#7f8c8d;margin:0 0 12px;">Ange program och tid som funkade i just DENNA maskin (kan skilja sig från receptets) – visas grönt för alla besökare.</p>' +
        '<label style="display:block;font-size:.75rem;font-weight:700;color:#7f8c8d;text-transform:uppercase;margin-bottom:4px;">Program &amp; tid som lyckades</label>' +
        '<input id="mt-prog" type="text" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.92rem;font-family:inherit;" ' +
          'placeholder="t.ex. Kakbakning (Cake), 45 min" value="' + String(maskin.forslag || '').replace(/"/g, '&quot;') + '">' +
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
      if (!prog) { alert('Ange program & tid som funkade!'); return; }
      var out = bg.querySelector('#mt-result');
      out.textContent = '⏳ Sparar...';
      var fname = decodeURIComponent(location.pathname.split('/').pop());
      var res = { ok: false, error: 'okänt fel' };
      try {
        var txt = await window.__MK_SPARA.load('recept/' + fname);
        if (!txt) throw new Error('kunde inte läsa receptfilen');
        /* uppdatera/lägg till maskinens post i recept:testad-metan */
        var alla = {};
        var metaRe = /<meta\s+name="recept:testad"\s+content="([^"]*)"\s*>\s*\n?/i;
        var m0 = txt.match(metaRe);
        if (m0) m0[1].split('|').forEach(function (del) {
          var i = del.indexOf(':');
          if (i > 0) alla[del.slice(0, i).trim()] = del.slice(i + 1).trim();
        });
        alla[maskin.id] = prog;
        var inneh = Object.keys(alla).map(function (k) { return k + ': ' + alla[k]; }).join(' | ');
        var rad = '<meta name="recept:testad" content="' + inneh.replace(/"/g, '&quot;') + '">\n';
        if (metaRe.test(txt)) txt = txt.replace(metaRe, rad);
        else {
          var ankare = /(<meta\s+name="recept:maskiner"[^>]*>\s*\n?)/i;
          if (ankare.test(txt)) txt = txt.replace(ankare, '$1' + rad);
          else txt = txt.replace(/(<meta\s+name="recept:namn"[^>]*>\s*\n?)/i, '$1' + rad);
        }
        res = await window.__MK_SPARA.save('recept/' + fname, txt,
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
    var testade = machines.filter(arKand);
    var testadeTyper = {};
    testade.forEach(function (m) { var t = typKey(m); if (t) testadeTyper[t] = m; });

    /* 🧪 Badge på maskinstegen: receptets maskin har typ-syskon i
       parken → "Testad med denna – du har även X" */
    document.querySelectorAll('.machine-step h3').forEach(function (h3) {
      if (h3.querySelector('.mk-testad')) return;
      var txt = h3.textContent.toLowerCase();
      testade.forEach(function (m) {
        var modell = String(m.modellnamn || '').toLowerCase();
        var marke = String(m.varumarke || '').toLowerCase();
        var traff = (modell && txt.indexOf(modell) !== -1) ||
                    (marke && modell && txt.indexOf(marke) !== -1 && txt.indexOf(modell.split(' ')[0]) !== -1);
        if (!traff) return;
        var t = typKey(m);
        if (!t || (typAntal[t] || 0) < 2) return;   /* bara när det FINNS syskon */
        var syskon = machines.filter(function (x) {
          return typKey(x) === t && x.id !== m.id;
        }).map(function (x) {
          return ((x.varumarke || '') + ' ' + (x.modellnamn || '')).trim() || x.namn || x.id;
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
      var beskr = h.p.beskrivning ? '<div style="color:#7f8c8d;font-size:.82rem;margin-top:2px;">' + h.p.beskrivning + '</div>' : '';
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
      '<p style="color:#7f8c8d;font-size:.83rem;margin-bottom:6px;">Matchas automatiskt mot maskindatabasen – ' +
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

  /* ---------- Receptets "profil" att matcha mot ---------- */
  function recipeText() {
    var t = [
      document.title,
      meta('namn'),
      meta('taggar'),
      meta('beskrivning')
    ].join(' ');
    /* + rubriker och maskinsteg ur sidan (ej hela brödtexten – för brett) */
    document.querySelectorAll('h1, h2, .machine-step h3').forEach(function (el) {
      t += ' ' + el.textContent;
    });
    return t.toLowerCase();
  }

  /* ---------- Maskiner som REDAN nämns i receptet ---------- */
  function mentioned() {
    return (meta('maskiner') + ' ' + document.body.innerHTML).toLowerCase();
  }

  /* ---------- Ladda maskinparken (cachas per session) ---------- */
  async function loadMachines() {
    try {
      var c = JSON.parse(sessionStorage.getItem('mk-maskinpark'));
      if (c && c.length) return c;
    } catch (e) {}
    var out = [];
    try {
      var idx = await (await fetch('../json/maskiner-index.json')).json();
      await Promise.all(idx.map(async function (f) {
        try { out.push(await (await fetch('../json/maskiner/' + f)).json()); } catch (e) {}
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
    var testade = machines.filter(arKand);
    var testadeTyper = {};
    testade.forEach(function (m) { var t = typKey(m); if (t) testadeTyper[t] = m; });

    /* 🧪 Badge på maskinstegen: receptets maskin har typ-syskon i
       parken → "Testad med denna – du har även X" */
    document.querySelectorAll('.machine-step h3').forEach(function (h3) {
      if (h3.querySelector('.mk-testad')) return;
      var txt = h3.textContent.toLowerCase();
      testade.forEach(function (m) {
        var modell = String(m.modellnamn || '').toLowerCase();
        var marke = String(m.varumarke || '').toLowerCase();
        var traff = (modell && txt.indexOf(modell) !== -1) ||
                    (marke && modell && txt.indexOf(marke) !== -1 && txt.indexOf(modell.split(' ')[0]) !== -1);
        if (!traff) return;
        var t = typKey(m);
        if (!t || (typAntal[t] || 0) < 2) return;   /* bara när det FINNS syskon */
        var syskon = machines.filter(function (x) {
          return typKey(x) === t && x.id !== m.id;
        }).map(function (x) {
          return ((x.varumarke || '') + ' ' + (x.modellnamn || '')).trim() || x.namn || x.id;
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

    var hits = [];
    machines.forEach(function (m) {
      var name = ((m.varumarke || '') + ' ' + (m.modellnamn || '')).trim();
      /* hoppa över maskiner som redan står i receptet */
      if (arKand(m)) return;
      var b = bestProgram(m, text);
      if (b) {
        /* ⚠️ samma typ som en TESTAD maskin → märk som ej testad */
        var t = typKey(m);
        var otestad = !!(t && testadeTyper[t]);
        hits.push({ m: m, name: name || m.namn || m.id, p: b.program, score: b.score, otestad: otestad });
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
      var beskr = h.p.beskrivning ? '<div style="color:#7f8c8d;font-size:.82rem;margin-top:2px;">' + h.p.beskrivning + '</div>' : '';
      /* ⚠️ receptet är testat med en ANNAN maskin av samma typ */
      var otestadBadge = h.otestad
        ? ' <span title="Receptet är testat med din andra maskin av samma typ – tider/program kan behöva justeras för denna." ' +
          'style="display:inline-block;background:#fdf6ee;color:#e67e22;border:1px solid #e67e22;border-radius:999px;' +
          'padding:0 8px;font-size:.68rem;font-weight:700;vertical-align:middle;cursor:help;">⚠️ Ej testad med denna</span>'
        : '';
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f0ebe3;">' +
        img +
        '<div><b>' + h.name + '</b>' + otestadBadge + ' · <span style="color:#27ae60;font-weight:700;">' +
        (h.p.namn || '') + tid + '</span>' + beskr + '</div></div>';
    }).join('');

    var st = document.createElement('style');
    st.textContent = '@media print{#mk-maskinmatch{display:none!important;}}';
    document.head.appendChild(st);

    var box = document.createElement('div');
    box.className = 'card no-print';
    box.id = 'mk-maskinmatch';
    box.innerHTML =
      '<h2>🔧 Fler av dina maskiner som klarar receptet</h2>' +
      '<p style="color:#7f8c8d;font-size:.83rem;margin-bottom:6px;">Matchas automatiskt mot maskindatabasen – ' +
      'lägger du till en ny maskin dyker den upp här av sig själv.</p>' + rows;
    box.querySelector('div:last-child') && (box.querySelector('div:last-child').style.borderBottom = 'none');

    var footer = document.querySelector('footer');
    if (footer) footer.parentNode.insertBefore(box, footer);
    else document.body.appendChild(box);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
