/* ============================================================
   PLATS: /assets/portion.js  (assets-mappen i repo-roten)
   ============================================================
   🍽️ PORTIONSPANELEN – Mitt Maskinkök
   ============================================================
   Längst upp på VARJE recept: en panel där besökaren justerar
   portionen och allt räknas om live (ur __MK_KALKYL_TOT):

   1. 🍽️ PORTIONSSTORLEK (gram): ändra → kcal/protein/kolh/fett/
      pris per portion räknas om direkt.
   2. 👥 ANTAL PORTIONER (±): ändra → beräkningen nedan uppdateras.
      OBS (användarens regel 2026-11-07, punkt 132): panelen skalar
      ALDRIG ingredienserna – den är ENDAST för kcal-beräkningen.
      Dubbel/halv sats väljs i satsväljaren ovanför receptet
      (skala.js #mk-satsval).
   3. 🔥 ÖNSKAD KCAL/PORTION (omvänt): "jag vill ha 300 kcal"
      → portionsstorleken i gram räknas ut och fylls i.
   4. 🍞 BRÖD: recept som är bröd/limpa/toast får skivläge –
      ange SKIVTJOCKLEK (cm) + limpans längd (cm, förval 30)
      → näring per skiva ("1,5 cm skiva ≈ 62 g · 152 kcal").

   Startvärde ur kalkylens portionsinfo (__MK_KALKYL_PORT: antal
   eller vikt). Valen sparas per recept (localStorage mk-port:<fil>).
   Panelen är skärm-endast: städas ur sparad HTML (redigera.js)
   och döljs vid utskrift. Källfilen röres aldrig.
   Laddas av site.js på receptsidor.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_PORTION_LOADED) return;
  window.__MK_PORTION_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  var KEY = 'mk-port:' + decodeURIComponent(location.pathname.split('/').pop());

  function sparat() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function spara(o) {   /* 🔀 merge – olika delar sparar olika nycklar */
    try {
      var c = sparat();
      for (var k in o) c[k] = o[k];
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch (e) {}
  }
  function fmt(n, dec) {
    return n.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: dec === undefined ? 1 : dec });
  }

  /* 🍞 LIMPA eller FRALLA? (användarens regel 2026-11-07, punkt 134:
     "på alla brödrecept räknas portionsstorlek per skivor och
     skivbredd – om det inte står att det är en fralla").
     Limpa = brödord i namn/taggar/titel UTAN fralla/bulle-ord. */
  function typText() {
    return ((document.querySelector('meta[name="recept:namn"]') || {}).content || '') + ' ' +
           ((document.querySelector('meta[name="recept:taggar"]') || {}).content || '') + ' ' +
           ((document.querySelector('meta[name="recept:portioner"]') || {}).content || '') + ' ' +
           document.title;
  }
  function arBrod() {
    return /br[öo]d|limpa|toast|baguette|frall|bull|boll/i.test(typText()) && !/br[öo]dkrutong|k[öo]ttbull/i.test(typText());
  }
  function arFralla() {
    return /frall|bull|boll|muffin|scones?/i.test(typText());
  }

  /* ---------- Vänta in kalkylen, bygg sedan panelen ---------- */
  var forsok = 0;
  (function vanta() {
    var tot = window.__MK_KALKYL_TOT;
    if (tot && tot.g > 0 && tot.kcal > 0) { bygg(tot); return; }
    if (++forsok < 40) setTimeout(vanta, 400);
  })();

  function bygg(tot) {
    if (document.getElementById('mk-portion')) return;
    var header = document.querySelector('body header');
    if (!header) return;

    var pi = window.__MK_KALKYL_PORT || null;
    var s = sparat();
    /* 🍞/🥯 LÄGET (punkt 172, "om det är en limpa ska det ej kallas
       fralla"): brödrecept kan VÄXLAS mellan limpa (skivor) och styck
       (frallor) – t.ex. snabba frallor som gräddas som LIMPA i bak-
       maskinen. Valet sparas per recept. Standard som förr. */
    var lage = s.lage || (arFralla() ? 'styck' : 'limpa');
    var limpa = arBrod() && lage === 'limpa';

    /* Startvärden: sparade val → kalkylens portionsinfo → hela satsen */
    var basN = (pi && pi.n) || 1;                                  /* receptets antal portioner */
    var portG = s.g || (pi ? (pi.typ === 'vikt' ? pi.g : Math.round(tot.g / pi.n)) : Math.round(tot.g));
    var antalN = s.n || basN;
    var basSkivor = s.sk || (pi && pi.typ === 'antal' ? pi.n : 0) || 20;   /* 🔪 antal skivor (längd behövs inte – användarens order) */

    var perG = { kcal: tot.kcal / tot.g, prot: tot.prot / tot.g, kolh: tot.kolh / tot.g,
                 fett: tot.fett / tot.g, kr: tot.kr / tot.g };

    var box = document.createElement('div');
    box.id = 'mk-portion';
    box.className = 'no-print';
    box.style.cssText = 'background:#fff;border:2px solid #e67e22;border-radius:14px;padding:14px 18px;' +
      'margin:14px 0;font-family:Segoe UI,system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.07);';

    var inp = 'width:74px;padding:7px 9px;border:2px solid #e8e2d8;border-radius:9px;font-size:.95rem;' +
      'font-family:inherit;text-align:right;font-weight:700;';
    var lbl = 'font-size:.72rem;font-weight:700;color:#5f6e70;text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:3px;';
    var stepBtn = 'width:34px;height:38px;border:none;border-radius:9px;background:#f0ebe3;color:#2c3e50;' +
      'font-size:1.1rem;font-weight:800;cursor:pointer;font-family:inherit;';

    var lasInp = inp + 'background:#f6f3ee;color:#5f6e70;';
    box.innerHTML =
      '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;">' +
        (limpa ?
        /* 🍞 LIMPA: skivan ÄR portionen – ANTAL SKIVOR styr (ingen längd behövs) */
        '<div><span style="' + lbl + '">🔪 Antal skivor på limpan</span>' +
          '<span style="white-space:nowrap;display:inline-flex;gap:5px;align-items:center;">' +
          '<button id="mp-smin" style="' + stepBtn + '">−</button>' +
          '<input id="mp-skiv" type="text" inputmode="numeric" style="' + inp + 'width:56px;text-align:center;" value="' + basSkivor + '">' +
          '<button id="mp-splus" style="' + stepBtn + '">+</button></span></div>' +
        '<div><span style="' + lbl + '">🍽️ Skivans vikt (auto)</span>' +
          '<span style="white-space:nowrap;"><input id="mp-g" type="text" readonly style="' + lasInp + '"> <b style="font-size:.9rem;">g</b></span></div>' +
        '<div><span style="' + lbl + '">🔥 Önskad kcal/skiva</span>' +
          '<span style="white-space:nowrap;"><input id="mp-kcal" type="text" inputmode="numeric" style="' + inp + '" placeholder="t.ex. 120"> <b style="font-size:.9rem;">kcal</b></span></div>'
        :
        '<div><span style="' + lbl + '">🍽️ Portionsstorlek</span>' +
          '<span style="white-space:nowrap;"><input id="mp-g" type="text" inputmode="numeric" style="' + inp + '" value="' + Math.round(portG) + '"> <b style="font-size:.9rem;">g</b></span></div>' +
        '<div><span style="' + lbl + '">👥 Portioner (endast beräkning)</span>' +
          '<span style="white-space:nowrap;display:inline-flex;gap:5px;align-items:center;">' +
          '<button id="mp-min" style="' + stepBtn + '">−</button>' +
          '<input id="mp-n" type="text" inputmode="numeric" style="' + inp + 'width:52px;text-align:center;" value="' + antalN + '">' +
          '<button id="mp-plus" style="' + stepBtn + '">+</button></span></div>' +
        '<div><span style="' + lbl + '">🔥 Önskad kcal/portion</span>' +
          '<span style="white-space:nowrap;"><input id="mp-kcal" type="text" inputmode="numeric" style="' + inp + '" placeholder="t.ex. 300"> <b style="font-size:.9rem;">kcal</b></span></div>') +
      '</div>' +
      '<div id="mp-ut" style="margin-top:10px;padding:9px 12px;background:#fdf6ee;border-radius:9px;font-size:.9rem;line-height:1.6;"></div>' +
      (arBrod() ? '<div style="margin-top:8px;font-size:.8rem;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
        '<span style="color:#5f6e70;font-weight:700;">Bakas som:</span>' +
        '<button type="button" id="mp-lage-limpa" style="border:2px solid #a0622d;border-radius:999px;padding:5px 12px;font-weight:700;cursor:pointer;font-family:inherit;' +
          (limpa ? 'background:#a0622d;color:#fff;' : 'background:#fff;color:#a0622d;') + '">🍞 Limpa (skivor)</button>' +
        '<button type="button" id="mp-lage-styck" style="border:2px solid #e67e22;border-radius:999px;padding:5px 12px;font-weight:700;cursor:pointer;font-family:inherit;' +
          (!limpa ? 'background:#e67e22;color:#fff;' : 'background:#fff;color:#e67e22;') + '">🥯 Styck (frallor)</button></div>' : '');

    /* 📦 KOMPAKTLÄGE (punkt 163, designorder A): panelen + satsväljaren
       göms bakom EN smal rad → ingredienserna hamnar på första skärmen.
       Expanderat läge minns per session. */
    var wrap = document.createElement('div');
    wrap.id = 'mk-panelwrap';
    wrap.className = 'no-print';
    var kompakt = document.createElement('button');
    kompakt.id = 'mk-vrad';
    kompakt.type = 'button';
    kompakt.setAttribute('aria-expanded', 'false');
    kompakt.style.cssText = 'display:block;width:100%;text-align:left;background:#fff;border:2px solid #e67e22;' +
      'border-radius:12px;padding:11px 16px;margin:14px 0;font-family:inherit;font-size:.95rem;font-weight:700;' +
      'color:#2c3e50;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.06);';
    var exp = document.createElement('div');
    exp.id = 'mk-panelexp';
    exp.style.display = 'none';
    wrap.appendChild(kompakt);
    wrap.appendChild(exp);
    exp.appendChild(box);
    box.style.margin = '0 0 10px';
    header.parentNode.insertBefore(wrap, header.nextSibling);
    function fangaSatsval() {
      var sv = document.getElementById('mk-satsval');
      if (sv && sv.parentNode !== exp) { exp.insertBefore(sv, box); sv.style.margin = '10px 0'; }
    }
    fangaSatsval();
    var fs = setInterval(fangaSatsval, 800);
    setTimeout(function () { clearInterval(fs); }, 8000);
    function visaKompakt() {
      var bf = window.__MK_SKALA_F || 1;
      var fTxt = bf === 0.5 ? '×½' : '×' + String(bf).replace('.', ',');
      var txt;
      if (limpa) {
        var N = Math.max(1, Math.round(tal(skEl, basSkivor)));
        txt = '⚖️ ' + fTxt + ' · 🍞 ' + N + ' skivor à ' + Math.round(tot.g * bf / N) + ' g · 🔥 ' +
          Math.round(perG.kcal * tot.g * bf / N) + ' kcal/skiva';
      } else {
        var gK = tal(gEl, portG);
        txt = '⚖️ ' + fTxt + ' · 🍽️ ' + Math.round(tal(nEl, antalN)) + ' port à ' + Math.round(gK) + ' g · 🔥 ' +
          Math.round(perG.kcal * gK) + ' kcal/port';
      }
      var oppen = exp.style.display !== 'none';
      kompakt.innerHTML = txt + ' <span style="float:right;color:#e67e22;">' + (oppen ? '▴ Stäng' : '▾ Ändra') + '</span>';
    }
    kompakt.onclick = function () {
      var oppen = exp.style.display !== 'none';
      exp.style.display = oppen ? 'none' : '';
      kompakt.setAttribute('aria-expanded', String(!oppen));
      fangaSatsval();
      visaKompakt();
      try { sessionStorage.setItem('mk-vrad-open', oppen ? '' : '1'); } catch (e) {}
    };
    try { if (sessionStorage.getItem('mk-vrad-open') === '1') { exp.style.display = ''; kompakt.setAttribute('aria-expanded', 'true'); } } catch (e) {}
    document.addEventListener('mk-skala', visaKompakt);
    var gamlaVisa = visa;
    visa = function () { gamlaVisa(); visaKompakt(); };
    visaKompakt();

    var gEl = box.querySelector('#mp-g'), nEl = box.querySelector('#mp-n'),
        kcEl = box.querySelector('#mp-kcal'), utEl = box.querySelector('#mp-ut'),
        skEl = box.querySelector('#mp-skiv');

    function tal(el, fallback) {
      var v = parseFloat(String(el && el.value || '').replace(',', '.').replace(/[^\d.]/g, ''));
      return (isNaN(v) || v <= 0) ? fallback : v;
    }

    /* 🔪 SKIVMASKINEN (punkt 173, användarens order "ifall man bakar
       limpa ska den skivas med skivmaskin – erbjud i alla brödrecept"):
       i limpa-läget visas kökets egen skärmaskin (typ Skärmaskin ur
       maskinparken) som erbjudande med länk. Finns ingen → ingen rad. */
    async function visaSkivmaskin() {
      if (document.getElementById('mp-skivmaskin')) return;
      var park = null;
      try { park = JSON.parse(sessionStorage.getItem('mk-maskinpark')); } catch (e) {}
      if (!park || !park.length) {
        try {
          var rot0 = window.__MK_ROT || '../';
          var ix = await (await fetch(rot0 + 'json/maskiner-index.json')).json();
          park = (await Promise.all(ix.map(function (f0) {
            return fetch(rot0 + 'json/maskiner/' + f0).then(function (r) { return r.json(); })['catch'](function () { return null; });
          }))).filter(Boolean);
          try { sessionStorage.setItem('mk-maskinpark', JSON.stringify(park)); } catch (e) {}
        } catch (e) { return; }
      }
      var sk = null;
      for (var i2 = 0; i2 < park.length; i2++) {
        if (/skärmaskin|slicer/i.test(String(park[i2].typ || ''))) { sk = park[i2]; break; }
      }
      if (!sk || !utEl || !document.getElementById('mp-skiv')) return;   /* kvar i limpa-läget? */
      var namn2 = ((sk.varumarke || '') + ' ' + (sk.modellnamn || '')).trim() || sk.namn || sk.id;
      var rad = document.createElement('div');
      rad.id = 'mp-skivmaskin';
      rad.style.cssText = 'margin-top:6px;font-size:.82rem;color:#5f6e70;';
      rad.innerHTML = '🔪 Skivas jämnast med kökets skärmaskin: <a href="' + (window.__MK_ROT || '../') +
        'maskindatabas.html#' + encodeURIComponent(sk.id) + '" style="color:#a0622d;font-weight:700;">' +
        namn2 + ' →</a>';
      utEl.insertAdjacentElement('afterend', rad);
    }
    function visa() {
      var bf0 = window.__MK_SKALA_F || 1;
      if (limpa) {
        /* 🍞 skivan är portionen: vikt = satsvikt / antal skivor */
        var N0 = Math.max(1, Math.round(tal(skEl, basSkivor)));
        var skivG0 = tot.g * bf0 / N0;
        gEl.value = Math.round(skivG0);
        utEl.innerHTML = '<b>Per skiva (1 av ' + N0 + ' ≈ ' + fmt(skivG0, 0) + ' g):</b> ' +
          '🔥 <b>' + fmt(perG.kcal * skivG0, 0) + ' kcal</b> · ' +
          '💪 ' + fmt(perG.prot * skivG0) + ' g protein · ' +
          '🍞 ' + fmt(perG.kolh * skivG0) + ' g kolh · ' +
          '🧈 ' + fmt(perG.fett * skivG0) + ' g fett · ' +
          '💰 ' + fmt(perG.kr * skivG0, 2) + ' kr<br>' +
          '<span style="color:#5f6e70;font-size:.82rem;">Hela limpan' + (bf0 !== 1 ? ' (×' + fmt(bf0) + '-sats)' : '') + ': ' +
          fmt(tot.g * bf0, 0) + ' g · ' + fmt(tot.kcal * bf0, 0) + ' kcal → ' + N0 + ' skivor</span>';
        spara({ sk: N0 });
        visaSkivmaskin();
        return;
      }
      var g = tal(gEl, portG);
      var n = Math.round(tal(nEl, antalN));
      var rad1 = '<b>Per portion (' + fmt(g, 0) + ' g):</b> ' +
        '🔥 <b>' + fmt(perG.kcal * g, 0) + ' kcal</b> · ' +
        '💪 ' + fmt(perG.prot * g) + ' g protein · ' +
        '🍞 ' + fmt(perG.kolh * g) + ' g kolh · ' +
        '🧈 ' + fmt(perG.fett * g) + ' g fett · ' +
        '💰 ' + fmt(perG.kr * g, 2) + ' kr';
      /* satsfaktorn kommer ENDAST från satsväljaren/Skala-verktyget */
      var bf = window.__MK_SKALA_F || 1;
      var rad2 = '<span style="color:#5f6e70;font-size:.82rem;">Hela satsen' + (bf !== 1 ? ' (×' + fmt(bf) + '-sats)' : '') + ': ' +
        fmt(tot.g * bf, 0) + ' g · ' + fmt(tot.kcal * bf, 0) + ' kcal · ' + fmt(tot.kr * bf, 2) + ' kr → ' +
        fmt((tot.g * bf) / g, 0) + ' portioner à ' + fmt(g, 0) + ' g</span>';
      utEl.innerHTML = rad1 + '<br>' + rad2;
      spara({ g: g, n: n });
    }

    /* 🔥 Omvänd: önskad kcal → gram (vanligt) eller SKIVTJOCKLEK (limpa) */
    kcEl.addEventListener('input', function () {
      var vill = tal(kcEl, 0);
      if (!(vill > 0 && perG.kcal > 0)) return;
      if (limpa) {
        /* önskad kcal/skiva → ANTAL skivor baklänges */
        var bf1 = window.__MK_SKALA_F || 1;
        var N1 = Math.round((tot.kcal * bf1) / vill);
        if (N1 >= 1 && N1 <= 200) { skEl.value = N1; visa(); }
        return;
      }
      gEl.value = Math.round(vill / perG.kcal);
      visa();
    });
    /* 🍞/🥯 lägesväxling → spara + bygg om panelen från grunden */
    function bytLage(nytt) {
      if ((nytt === 'limpa') === limpa) return;
      spara({ lage: nytt });
      var w = document.getElementById('mk-panelwrap');
      var hdr = document.querySelector('body header');
      var sv = document.getElementById('mk-satsval');
      if (sv && hdr) hdr.parentNode.insertBefore(sv, hdr.nextSibling);   /* satsvalet räddas ut */
      if (w) w.remove();
      bygg(tot);
    }
    var lgL = box.querySelector('#mp-lage-limpa'), lgS = box.querySelector('#mp-lage-styck');
    if (lgL) lgL.onclick = function () { bytLage('limpa'); };
    if (lgS) lgS.onclick = function () { bytLage('styck'); };
    if (!limpa) gEl.addEventListener('input', function () { kcEl.value = ''; visa(); });
    if (limpa) {
      skEl.addEventListener('input', function () { kcEl.value = ''; visa(); });
      box.querySelector('#mp-smin').onclick = function () { skEl.value = Math.max(1, Math.round(tal(skEl, basSkivor)) - 1); kcEl.value = ''; visa(); };
      box.querySelector('#mp-splus').onclick = function () { skEl.value = Math.round(tal(skEl, basSkivor)) + 1; kcEl.value = ''; visa(); };
    }

    /* 👥 Antal portioner: ENDAST beräkningen (skalar ALDRIG tabellen) */
    function sattN(n) {
      n = Math.max(1, Math.round(n));
      nEl.value = n;
      visa();
    }
    if (!limpa) {
      box.querySelector('#mp-min').onclick = function () { sattN(tal(nEl, antalN) - 1); };
      box.querySelector('#mp-plus').onclick = function () { sattN(tal(nEl, antalN) + 1); };
      nEl.addEventListener('change', function () { sattN(tal(nEl, antalN)); });
    }

    visa();
    /* 🔄 satsväljaren/Skala ändrades → räkna om "Hela satsen"-raden */
    document.addEventListener('mk-skala', visa);
  }
})();
