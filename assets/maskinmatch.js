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

  /* 🍞/🥯 STYCKORDET (användarens order 2026-11-16: "om det är en
     limpa så ska det ej kallas fralla"): ordet för styck-varianten
     hämtas ur recept:portioner-metan – frall→frallor, bull→bullar,
     annars (t.ex. "1 limpa") det neutrala "bitar". Datanycklarna
     (id#fralla) RÖRS ALDRIG – endast visningsorden. Måste ligga på
     IIFE-toppnivå: används både i markeraTestad och brödstatusen.
     Exporteras som __MK_STYCKORD (portion.js använder samma). */
  function styckOrd() {
    var pm = (document.querySelector('meta[name="recept:portioner"]') || {}).content || '';
    if (/frall/i.test(pm)) return 'frallor';
    if (/bull/i.test(pm)) return 'bullar';
    return 'bitar';
  }
  window.__MK_STYCKORD = styckOrd;

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
        try {
          var mj = await (await fetch((window.__MK_ROT || '../') + 'json/maskiner/' + f)).json();
          /* 🚫 SPÄRRADE PROGRAM (SPEC 225): anvands_ej-program göms för
             förslag/alternativ – receptens egen text styr fortfarande. */
          mj.program = (mj.program || []).filter(function (pr) { return !pr.anvands_ej; });
          out.push(mj);
        } catch (e) {}
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
    /* 🍞/🥯 VARIANT (punkt 179): brödrecepts gräddning verifieras per
       variant – metanyckeln blir id#limpa / id#fralla. Deg = utan variant. */
    var variant = maskin.variant || '';
    var vNyckel = maskin.id + (variant ? '#' + variant : '');
    var vEtikett = variant === 'limpa' ? '🍞 LIMPA-gräddningen' : variant === 'fralla' ? '🥯 ' + styckOrd().toUpperCase() + '-gräddningen' : 'receptet';
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
        '<h3 style="margin:0 0 4px;">✅ Testat ' + vEtikett + ' i ' + maskin.namn + '?</h3>' +
        '<p style="font-size:.85rem;color:#5f6e70;margin:0 0 12px;">Ange program och tid som funkade i just DENNA maskin (kan skilja sig från receptets) – visas grönt för alla besökare.</p>' +
        '<label style="display:block;font-size:.75rem;font-weight:700;color:#5f6e70;text-transform:uppercase;margin-bottom:4px;">Program &amp; tid som lyckades</label>' +
        '<input id="mt-prog" type="text" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.92rem;font-family:inherit;" ' +
          'placeholder="t.ex. Kakbakning (Cake), 45 min" value="' + String(maskin.forslag || '').replace(/"/g, '&quot;') + '">' +
        /* 🌡️ DEGTERMOMETERN (SPEC 239, förslag 1084): frivillig innertemp
           vid klart – ägarens egen siffra, bakas in i programtexten och
           visas överallt där verifieringen syns. */
        '<label style="display:block;font-size:.75rem;font-weight:700;color:#5f6e70;text-transform:uppercase;margin:10px 0 4px;">🌡️ Innertemp när klar (°C, frivilligt)</label>' +
        '<input id="mt-temp" type="text" inputmode="decimal" style="width:110px;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.92rem;font-family:inherit;" placeholder="t.ex. 96">' +
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
    /* 🎤 diktering (punkt 175/176): sv-SE, kontinuerlig tills ⏹/stängning */
    var rec = null, rostKnapp = null;
    function rostStopp() {
      if (rec) { try { rec.stop(); } catch (e) {} rec = null; }
      if (rostKnapp) { rostKnapp.style.background = '#2c3e50'; rostKnapp.textContent = '🎤'; }
    }
    function kopplaRost(btn, ta) {
      rostKnapp = btn;
      btn.onclick = function () {
        if (rec) { rostStopp(); return; }
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        rec = new SR();
        rec.lang = 'sv-SE'; rec.continuous = true; rec.interimResults = false;
        rec.onresult = function (e) {
          for (var i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) ta.value = (ta.value + ' ' + e.results[i][0].transcript).trim();
          }
        };
        rec.onerror = rostStopp;
        rec.onend = function () { if (rec) rostStopp(); };
        btn.style.background = '#c0392b'; btn.textContent = '⏹';
        try { rec.start(); } catch (e) { rostStopp(); }
      };
    }
    bg.querySelector('#mt-avbryt').onclick = function () { rostStopp(); bg.remove(); };
    var dn = false;
    bg.addEventListener('mousedown', function (e) { dn = (e.target === bg); });
    bg.addEventListener('click', function (e) { if (e.target === bg && dn) bg.remove(); });
    bg.querySelector('#mt-spara').onclick = async function () {
      var prog = bg.querySelector('#mt-prog').value.trim();
      var tEl = bg.querySelector('#mt-temp');
      var tv = tEl ? tEl.value.trim().replace(',', '.') : '';
      if (tv && /^\d{1,3}(\.\d)?$/.test(tv)) prog += ' · 🌡️ ' + tv.replace('.', ',') + '°C';
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
        var note = '';   /* 📝 instruktioner läggs i STEG 2 (punkt 176) */
        alla[vNyckel] = prog + (vand ? ' · vänd halvvägs' : '') + ' (verifierad ' + idag + ')';
        var inneh = Object.keys(alla).map(function (k) { return k + ': ' + alla[k]; }).join(' | ');
        var rad = '<meta name="recept:testad" content="' + inneh.replace(/"/g, '&quot;') + '">\n';
        if (metaRe.test(txt)) txt = txt.replace(metaRe, rad);
        else {
          var ankare = /(<meta\s+name="recept:maskiner"[^>]*>\s*\n?)/i;
          if (ankare.test(txt)) txt = txt.replace(ankare, '$1' + rad);
          else txt = txt.replace(/(<meta\s+name="recept:namn"[^>]*>\s*\n?)/i, '$1' + rad);
        }
        /* ⏱️/📝 raden i INSTRUKTIONERNA vid maskinens ⚙️-ruta (punkt 141+175):
           AF: tid/vändning/notering · övriga maskiner: notering */
        if ((arAF && (tidMin || vand || note)) || (!arAF && note)) {
          var radTxt = (variant === 'limpa' ? '🍞 ' : variant === 'fralla' ? '🥯 ' : '') + (arAF
            ? '⏱️ <b>' + maskin.namn + ':</b> ' + (tidMin ? tidMin + ' min' : prog) +
              (vand ? ' · 🔄 vänd/skaka halvvägs' : '') + (note ? ' · 📝 ' + note : '')
            : '📝 <b>' + maskin.namn + ':</b> ' + note) +
            ' <span style="color:#5f6e70;font-size:.85em;">(verifierad ' + idag + ')</span>';
          var divNy = '<div class="mk-aftid" data-mid="' + vNyckel + '" ' +
            'style="margin-top:8px;padding:8px 12px;background:#eafaf1;border:1.5px solid #27ae60;' +
            'border-radius:9px;font-size:.9rem;">' + radTxt + '</div>';
          /* bort med ev. gammal rad för samma maskin */
          txt = txt.replace(new RegExp('\\n?<div class="mk-aftid" data-mid="' + vNyckel + '"[\\s\\S]*?</div>', 'g'), '');
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
        /* ============ STEG 2 (punkt 176, användarens order): appen
           frågar efter YTTERLIGARE instruktioner – två val ============ */
        var inre = bg.firstElementChild;
        var befNote = '';
        function stangKlart() {
          rostStopp();
          bg.remove();
          var gammal = document.getElementById('mk-maskinmatch');
          if (gammal) gammal.remove();
          var topp = document.getElementById('mk-maskintop');
          if (topp) topp.remove();
          run();
        }
        async function sparaNote(txt2) {
          var t2 = await window.__MK_SPARA.load('recept/' + fsokvag);
          if (!t2) return false;
          t2 = t2.replace(new RegExp('\\n?<div class="mk-aftid" data-mid="' + vNyckel + '"[\\s\\S]*?</div>', 'g'), '');
          var radTxt2 = (variant === 'limpa' ? '🍞 ' : variant === 'fralla' ? '🥯 ' : '') + (arAF
            ? '⏱️ <b>' + maskin.namn + ':</b> ' + (tidMin ? tidMin + ' min' : prog) +
              (vand ? ' · 🔄 vänd/skaka halvvägs' : '') + ' · 📝 ' + txt2
            : '📝 <b>' + maskin.namn + ':</b> ' + txt2) +
            ' <span style="color:#5f6e70;font-size:.85em;">(verifierad ' + idag + ')</span>';
          var divNy2 = '<div class="mk-aftid" data-mid="' + vNyckel + '" ' +
            'style="margin-top:8px;padding:8px 12px;background:#eafaf1;border:1.5px solid #27ae60;' +
            'border-radius:9px;font-size:.9rem;">' + radTxt2 + '</div>';
          var tr2 = -1, h3Re2 = /<h3>[^<]*/g, m32;
          var nycklar2 = [String(mInfo.varumarke || ''), String(mInfo.modellnamn || '').split(/\s+/)[0]]
            .filter(function (x) { return x.length >= 3; });
          while ((m32 = h3Re2.exec(t2))) {
            var rub2 = m32[0].toLowerCase();
            if (nycklar2.some(function (k) { return rub2.indexOf(k.toLowerCase()) !== -1; })) {
              tr2 = t2.indexOf('</h3>', m32.index);
              break;
            }
          }
          if (tr2 !== -1) { tr2 += 5; t2 = t2.slice(0, tr2) + '\n' + divNy2 + t2.slice(tr2); }
          else {
            var gs2 = t2.search(/Gör så här<\/h2>/);
            if (gs2 !== -1) { gs2 = t2.indexOf('</h2>', gs2) + 5; t2 = t2.slice(0, gs2) + '\n' + divNy2 + t2.slice(gs2); }
          }
          var r2 = await window.__MK_SPARA.save('recept/' + fsokvag, t2, '📝 Instruktion (' + maskin.namn + '): ' + fname);
          return !!(r2 && r2.ok);
        }
        function visaFraga(medd) {
          inre.innerHTML =
            '<h3 style="margin:0 0 4px;">' + (medd || '✅ Verifieringen sparad!') + '</h3>' +
            '<p style="font-size:.9rem;color:#5f6e70;margin:0 0 14px;">Vill du lägga till ytterligare instruktioner till ' + maskin.namn + '?</p>' +
            '<div style="display:flex;gap:10px;">' +
              '<button id="mt-mer" style="flex:1;background:#2c3e50;color:#fff;border:none;border-radius:10px;padding:13px;font-weight:700;cursor:pointer;font-family:inherit;">➕ Lägg till</button>' +
              '<button id="mt-klar" style="flex:1;background:#27ae60;color:#fff;border:none;border-radius:10px;padding:13px;font-weight:700;cursor:pointer;font-family:inherit;">✔ Klar</button>' +
            '</div>';
          inre.querySelector('#mt-klar').onclick = stangKlart;
          inre.querySelector('#mt-mer').onclick = visaNoteUI;
        }
        function visaNoteUI() {
          inre.innerHTML =
            '<h3 style="margin:0 0 4px;">📝 Instruktion till ' + maskin.namn + '</h3>' +
            '<p style="font-size:.85rem;color:#5f6e70;margin:0 0 10px;">Skriv eller 🎤 diktera – syns vid maskinens ruta i receptet.</p>' +
            '<div style="display:flex;gap:8px;align-items:stretch;">' +
              '<textarea id="mt-note" rows="3" style="flex:1;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.92rem;font-family:inherit;resize:vertical;">' + befNote + '</textarea>' +
              (('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) ?
                '<button type="button" id="mt-rost" title="Diktera (svenska) – tryck igen för att stoppa" style="width:52px;background:#2c3e50;color:#fff;border:none;border-radius:10px;font-size:1.3rem;cursor:pointer;">🎤</button>' : '') +
            '</div>' +
            '<div style="display:flex;gap:10px;margin-top:12px;">' +
              '<button id="mt-notespara" style="flex:1;background:#27ae60;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;cursor:pointer;font-family:inherit;">💾 Spara instruktionen</button>' +
              '<button id="mt-klar2" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;font-family:inherit;">✔ Klar</button>' +
            '</div><div id="mt-noteres" style="margin-top:8px;font-size:.85rem;"></div>';
          var rb = inre.querySelector('#mt-rost');
          if (rb) kopplaRost(rb, inre.querySelector('#mt-note'));
          inre.querySelector('#mt-klar2').onclick = stangKlart;
          inre.querySelector('#mt-notespara').onclick = async function () {
            var v = inre.querySelector('#mt-note').value.trim().slice(0, 300)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            if (!v) { inre.querySelector('#mt-noteres').textContent = '⚠️ Skriv eller diktera något först!'; return; }
            inre.querySelector('#mt-noteres').textContent = '⏳ Sparar...';
            rostStopp();
            var ok2 = await sparaNote(v);
            if (ok2) { befNote = v; visaFraga('✅ Instruktionen sparad!'); }
            else inre.querySelector('#mt-noteres').textContent = '⚠️ Kunde inte spara – försök igen.';
          };
        }
        rostStopp();
        visaFraga();
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
    /* 🍞 BRÖDSIDA? (punkt 179) – namn/taggar/titel, köttbullar undantagna */
    var brodTxt = ((document.querySelector('meta[name="recept:namn"]') || {}).content || '') + ' ' +
      ((document.querySelector('meta[name="recept:taggar"]') || {}).content || '') + ' ' + document.title;
  var AR_BROD = /br[öo]d|limpa|toast|baguette|frall|bull/i.test(brodTxt) && !/köttbull|br[öo]dkrutong/i.test(brodTxt);
    function harNyckel(id) {
      for (var k in manTest) if (k === id || k.indexOf(id + '#') === 0) return true;
      return false;
    }
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
        var klar = harNyckel(m.id) || (receptVerifierad && testade.length < 2);
        var status = klar
          ? '<span title="Admin har verifierat receptet i denna maskin" style="color:#27ae60;font-weight:900;">✅</span>'
          : '<span title="Ej verifierad av admin ännu" style="opacity:.75;">⏳</span>';
        var bild = m.bild
          ? '<img src="' + rot + m.bild + '" alt="" loading="lazy" onerror="this.remove()" ' +
            'style="width:34px;height:34px;object-fit:contain;border-radius:8px;background:#f6f3ee;flex-shrink:0;">'
          : '';
        /* 🍏 BUTTON i stället för <a> (punkt 172): iOS långtrycks-förhands-
           visning på länkar kunde sluka 3-sekundersgesten – knappar har
           ingen callout alls. Klick navigerar via data-href. */
        return '<button type="button" data-href="' + rot + 'maskindatabas.html#' + encodeURIComponent(m.id) + '" ' +
          'data-mk-mid="' + m.id + '" data-mk-namn="' + n.replace(/"/g, '&quot;') + '" ' +
          'style="display:inline-flex;align-items:center;gap:8px;background:#f6f3ee;border:1px solid #eee2d2;' +
          'border-radius:999px;padding:5px 14px 5px 6px;color:#2c3e50;cursor:pointer;font-family:inherit;' +
          'font-size:.84rem;font-weight:700;margin:3px 6px 3px 0;' +
          '-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;">' +
          bild + '<span>' + n + '</span>' + status + '</button>';
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

      rad.querySelectorAll('[data-mk-mid]').forEach(function (a) {
        var tmr = null, fired = false, startXY = null;
        function starta(e) {
          fired = false;
          /* 📱 HÅLLTOLERANS (användarens mobilrapport 2026-11-16: hållet
             avbröts alltid → klicket tog en till maskinsidan): fingret
             darrar ALLTID någon mm under 3 sekunder – touchmove får bara
             avbryta vid RIKTIG rörelse (>12 px). */
          var t = e && e.touches && e.touches[0];
          startXY = t ? { x: t.clientX, y: t.clientY } : null;
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
        a.addEventListener('touchmove', function (e) {
          if (!startXY || !e.touches || !e.touches[0]) return avbryt();
          var dx = e.touches[0].clientX - startXY.x, dy = e.touches[0].clientY - startXY.y;
          if (Math.sqrt(dx * dx + dy * dy) > 12) avbryt();   /* riktig svepning → avbryt */
        }, { passive: true });
        a.addEventListener('mousedown', starta);
        ['mouseup', 'mouseleave'].forEach(function (ev) { a.addEventListener(ev, avbryt); });
        a.addEventListener('contextmenu', function (e) { if (fired || tmr) e.preventDefault(); });
        a.addEventListener('click', function (e) {
          avbryt();
          if (fired) { e.preventDefault(); fired = false; return; }
          location.href = a.getAttribute('data-href');   /* vanligt klick = maskinsidan */
        });
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
        /* ============ 🍞/🥯 BRÖDGRÄDDNING (punkt 179): egen verifiering
           per variant – limpa OCH frallor; degen som förr.
           + AF-regeln: otestad AF-gräddning döljer förinställd tid/temp. */
        var arGradd = /grädd|bake|baka|air ?fry|rost/i.test(txt);
        if (AR_BROD && arGradd) {
          var tidL = manTest[m.id + '#limpa'] || manTest[m.id] || '';
          var tidF = manTest[m.id + '#fralla'] || '';
          if (/airfryer/i.test(String(m.typ || '')) && !tidL && !tidF) {
            var progEl = h3.querySelector('.prog');
            if (progEl && !progEl.getAttribute('data-mk-orig')) {
              progEl.setAttribute('data-mk-orig', progEl.textContent);
              progEl.textContent = '⏳ tid & temp sätts vid admin-verifiering';
            }
          }
          if (box && !box.querySelector('.mk-brodstatus')) {
            var st = document.createElement('div');
            st.className = 'mk-brodstatus no-print';
            st.style.cssText = 'margin-top:8px;background:#fdf6ee;border:1px solid #e0d9cd;border-radius:9px;padding:7px 12px;font-size:.8rem;line-height:1.6;color:#5f6e70;';
            var sOrd = styckOrd();
            st.innerHTML = '🍞/🥯 Går att baka som <b>limpa ELLER ' + sOrd + '</b> – degen verifieras en gång, gräddningen per variant.<br>' +
              '🍞 Limpa: ' + (tidL ? '<b style="color:#27ae60;">✅ ' + tidL.replace(/</g, '&lt;') + '</b>' : '⏳ ej verifierad') +
              ' · 🥯 ' + sOrd.charAt(0).toUpperCase() + sOrd.slice(1) + ': ' + (tidF ? '<b style="color:#27ae60;">✅ ' + tidF.replace(/</g, '&lt;') + '</b>' : '⏳ ej verifierad');
            box.appendChild(st);
            var progF = h3.textContent.split('·').slice(1).join('·').replace(/\s+/g, ' ').trim();
            [['limpa', '🍞 Verifiera LIMPA', tidL], ['fralla', '🥯 Verifiera ' + sOrd.toUpperCase(), tidF]].forEach(function (v) {
              if (v[2]) return;
              var kb = document.createElement('button');
              kb.className = 'mk-verifdel no-print';
              kb.textContent = '✅ ' + v[1];
              kb.style.cssText = 'display:inline-block;margin:8px 6px 0 0;background:transparent;color:#5f6e70;border:1.5px dashed #b0bec5;border-radius:999px;padding:4px 12px;font-size:.74rem;font-weight:700;cursor:pointer;font-family:inherit;';
              (function (mm3, vv) {
                kb.onclick = function () {
                  markeraTestad({ id: mm3.id, variant: vv,
                    namn: ((mm3.varumarke || '') + ' ' + (mm3.modellnamn || '')).trim() || mm3.namn || mm3.id,
                    forslag: progF });
                };
              })(m, v[0]);
              box.appendChild(kb);
            });
            if (tidL && tidF) {
              var bock2 = document.createElement('span');
              bock2.className = 'mk-verifmask no-print';
              bock2.title = 'Båda varianterna verifierade';
              bock2.textContent = '✓';
              bock2.style.cssText = 'display:inline-flex;width:26px;height:26px;background:#27ae60;color:#fff;border-radius:50%;align-items:center;justify-content:center;font-size:.95rem;font-weight:900;margin-right:8px;vertical-align:middle;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);line-height:1;flex-shrink:0;';
              h3.insertBefore(bock2, h3.firstChild);
            }
          }
          return;
        }
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
