/* ============================================================
   PLATS: /assets/portion.js  (assets-mappen i repo-roten)
   ============================================================
   🍽️ PORTIONSPANELEN – Mitt Maskinkök
   ============================================================
   Längst upp på VARJE recept: en panel där besökaren justerar
   portionen och allt räknas om live (ur __MK_KALKYL_TOT):

   1. 🍽️ PORTIONSSTORLEK (gram): ändra → kcal/protein/kolh/fett/
      pris per portion räknas om direkt.
   2. 👥 ANTAL PORTIONER (±): ändra → INGREDIENSERNA skalas om
      på skärmen (via __MK_SKALA_APPLY ur skala.js) och kalkylen
      följer med. Basantal ur kalkylens portionsinfo.
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
  function spara(o) {
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
  }
  function fmt(n, dec) {
    return n.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: dec === undefined ? 1 : dec });
  }

  /* Är receptet ett bröd? (namn/taggar/titel) */
  function arBrod() {
    var t = ((document.querySelector('meta[name="recept:namn"]') || {}).content || '') + ' ' +
            ((document.querySelector('meta[name="recept:taggar"]') || {}).content || '') + ' ' +
            document.title;
    return /br[öo]d|limpa|toast|baguette|fralla/i.test(t) && !/br[öo]dkrutong/i.test(t);
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
    var brod = arBrod();

    /* Startvärden: sparade val → kalkylens portionsinfo → hela satsen */
    var basN = (pi && pi.n) || 1;                                  /* receptets antal portioner */
    var portG = s.g || (pi ? (pi.typ === 'vikt' ? pi.g : Math.round(tot.g / pi.n)) : Math.round(tot.g));
    var antalN = s.n || basN;
    var tjocklek = s.tj || 1.5;                                    /* cm */
    var langd = s.lg || 30;                                        /* cm limpa */

    var perG = { kcal: tot.kcal / tot.g, prot: tot.prot / tot.g, kolh: tot.kolh / tot.g,
                 fett: tot.fett / tot.g, kr: tot.kr / tot.g };

    var box = document.createElement('div');
    box.id = 'mk-portion';
    box.className = 'no-print';
    box.style.cssText = 'background:#fff;border:2px solid #e67e22;border-radius:14px;padding:14px 18px;' +
      'margin:14px 0;font-family:Segoe UI,system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.07);';

    var inp = 'width:74px;padding:7px 9px;border:2px solid #e8e2d8;border-radius:9px;font-size:.95rem;' +
      'font-family:inherit;text-align:right;font-weight:700;';
    var lbl = 'font-size:.72rem;font-weight:700;color:#7f8c8d;text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:3px;';
    var stepBtn = 'width:34px;height:38px;border:none;border-radius:9px;background:#f0ebe3;color:#2c3e50;' +
      'font-size:1.1rem;font-weight:800;cursor:pointer;font-family:inherit;';

    box.innerHTML =
      '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;">' +
        '<div><span style="' + lbl + '">🍽️ Portionsstorlek</span>' +
          '<span style="white-space:nowrap;"><input id="mp-g" type="text" inputmode="numeric" style="' + inp + '" value="' + Math.round(portG) + '"> <b style="font-size:.9rem;">g</b></span></div>' +
        '<div><span style="' + lbl + '">👥 Portioner (skalar ingredienser)</span>' +
          '<span style="white-space:nowrap;display:inline-flex;gap:5px;align-items:center;">' +
          '<button id="mp-min" style="' + stepBtn + '">−</button>' +
          '<input id="mp-n" type="text" inputmode="numeric" style="' + inp + 'width:52px;text-align:center;" value="' + antalN + '">' +
          '<button id="mp-plus" style="' + stepBtn + '">+</button></span></div>' +
        '<div><span style="' + lbl + '">🔥 Önskad kcal/portion</span>' +
          '<span style="white-space:nowrap;"><input id="mp-kcal" type="text" inputmode="numeric" style="' + inp + '" placeholder="t.ex. 300"> <b style="font-size:.9rem;">kcal</b></span></div>' +
        (brod ?
        '<div><span style="' + lbl + '">🍞 Skivtjocklek · limpans längd</span>' +
          '<span style="white-space:nowrap;"><input id="mp-tj" type="text" inputmode="decimal" style="' + inp + 'width:56px;" value="' + String(tjocklek).replace('.', ',') + '"> cm av ' +
          '<input id="mp-lg" type="text" inputmode="numeric" style="' + inp + 'width:56px;" value="' + langd + '"> cm</span></div>' : '') +
      '</div>' +
      '<div id="mp-ut" style="margin-top:10px;padding:9px 12px;background:#fdf6ee;border-radius:9px;font-size:.9rem;line-height:1.6;"></div>';

    header.parentNode.insertBefore(box, header.nextSibling);

    var gEl = box.querySelector('#mp-g'), nEl = box.querySelector('#mp-n'),
        kcEl = box.querySelector('#mp-kcal'), utEl = box.querySelector('#mp-ut'),
        tjEl = box.querySelector('#mp-tj'), lgEl = box.querySelector('#mp-lg');

    function tal(el, fallback) {
      var v = parseFloat(String(el && el.value || '').replace(',', '.').replace(/[^\d.]/g, ''));
      return (isNaN(v) || v <= 0) ? fallback : v;
    }

    function visa() {
      var g = tal(gEl, portG);
      var n = Math.round(tal(nEl, antalN));
      var f = n / basN;   /* ingrediensfaktor */
      var rad1 = '<b>Per portion (' + fmt(g, 0) + ' g):</b> ' +
        '🔥 <b>' + fmt(perG.kcal * g, 0) + ' kcal</b> · ' +
        '💪 ' + fmt(perG.prot * g) + ' g protein · ' +
        '🍞 ' + fmt(perG.kolh * g) + ' g kolh · ' +
        '🧈 ' + fmt(perG.fett * g) + ' g fett · ' +
        '💰 ' + fmt(perG.kr * g, 2) + ' kr';
      var rad2 = '<span style="color:#7f8c8d;font-size:.82rem;">Hela satsen' + (f !== 1 ? ' (×' + fmt(f) + ')' : '') + ': ' +
        fmt(tot.g * f, 0) + ' g · ' + fmt(tot.kcal * f, 0) + ' kcal · ' + fmt(tot.kr * f, 2) + ' kr → ' +
        fmt((tot.g * f) / g, 0) + ' portioner à ' + fmt(g, 0) + ' g</span>';
      var rad3 = '';
      if (brod) {
        var tj = tal(tjEl, tjocklek), lg = tal(lgEl, langd);
        if (tj > 0 && lg >= tj) {
          var skivG = tot.g * f * (tj / lg);
          rad3 = '<br>🍞 <b>Per skiva (' + String(tj).replace('.', ',') + ' cm):</b> ≈ ' + fmt(skivG, 0) + ' g · ' +
            '<b>' + fmt(perG.kcal * skivG, 0) + ' kcal</b> · ' + fmt(perG.prot * skivG) + ' g protein · ' +
            fmt(perG.kr * skivG, 2) + ' kr <span style="color:#7f8c8d;font-size:.82rem;">(' +
            fmt(lg / tj, 0) + ' skivor på limpan)</span>';
        }
      }
      utEl.innerHTML = rad1 + '<br>' + rad2 + rad3;
      spara({ g: g, n: n, tj: tjEl ? tal(tjEl, tjocklek) : undefined, lg: lgEl ? tal(lgEl, langd) : undefined });
    }

    /* 🔥 Omvänd: önskad kcal → portionsstorlek i gram */
    kcEl.addEventListener('input', function () {
      var vill = tal(kcEl, 0);
      if (vill > 0 && perG.kcal > 0) {
        gEl.value = Math.round(vill / perG.kcal);
        visa();
      }
    });
    gEl.addEventListener('input', function () { kcEl.value = ''; visa(); });
    if (tjEl) tjEl.addEventListener('input', visa);
    if (lgEl) lgEl.addEventListener('input', visa);

    /* 👥 Antal portioner: ± skalar INGREDIENSERNA på skärmen */
    function sattN(n) {
      n = Math.max(1, Math.round(n));
      nEl.value = n;
      var f = n / basN;
      if (window.__MK_SKALA_APPLY) {
        window.__MK_SKALA_APPLY(f);   /* egen faktor 1 = återställ */
      }
      visa();
    }
    box.querySelector('#mp-min').onclick = function () { sattN(tal(nEl, antalN) - 1); };
    box.querySelector('#mp-plus').onclick = function () { sattN(tal(nEl, antalN) + 1); };
    nEl.addEventListener('change', function () { sattN(tal(nEl, antalN)); });

    visa();
    /* Sparat portionsantal ≠ bas → applicera skalningen direkt */
    if (antalN !== basN && window.__MK_SKALA_APPLY) {
      window.__MK_SKALA_APPLY(antalN / basN);
    }
  }
})();
