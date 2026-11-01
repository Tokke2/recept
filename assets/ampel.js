/* ============================================================
   PLATS: /assets/ampel.js  (assets-mappen i repo-roten)
   ============================================================
   🚦 NÄRINGSAMPELN – Mitt Maskinkök (roadmap 22)
   ============================================================
   Grön/gul/röd märkning per 100 g enligt FSA:s (brittiska
   Livsmedelsverkets) publicerade trafikljusgränser för livsmedel.
   KÄLLA (webbverifierad 2026-11-01):
     Fett:   🟢 ≤3,0 g  · 🟡 >3–17,5 g  · 🔴 >17,5 g
     Socker: 🟢 ≤5,0 g  · 🟡 >5–22,5 g  · 🔴 >22,5 g
     Salt:   🟢 ≤0,3 g  · 🟡 >0,3–1,5 g · 🔴 >1,5 g
   ÄRLIGHETSREGLER (v1):
   · Salt & socker räknas EXAKT ur receptets egna ingrediensrader
     (tillsatt mängd / totalvikt) – socker märks därför "tillsatt
     socker" (naturligt socker i t.ex. frukt ingår inte).
   · Fett kräver ≥70 % viktteckning i ingrediensdatabasen – annars
     visas ingen fettlampa alls.
   · Mättat fett visas INTE ännu – fältet saknas i databasen
     (läggs till när datan finns, aldrig gissningar).
   Används av recept.html (kortens ampelrad). Gränserna bor ENDAST
   här (Centralt-principen).
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_AMPEL) return;

  var GRANS = {            /* per 100 g – FSA food thresholds */
    fett:   { gron: 3.0, rod: 17.5, namn: 'Fett' },
    socker: { gron: 5.0, rod: 22.5, namn: 'Tillsatt socker' },
    salt:   { gron: 0.3, rod: 1.5,  namn: 'Salt' }
  };

  function lampa(typ, varde) {
    var g = GRANS[typ];
    if (!g || varde === null || varde === undefined || isNaN(varde)) return null;
    return varde <= g.gron ? '🟢' : (varde > g.rod ? '🔴' : '🟡');
  }

  function fmt(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }

  /* Ampelrad för receptkorten: "🚦 🟢 fett · 🟡 socker · 🔴 salt" med
     exakta värden i tooltip. Fält utan data hoppas över tyst. */
  function kortHtml(a) {
    var delar = [], titlar = [];
    ['fett', 'socker', 'salt'].forEach(function (t) {
      var l = lampa(t, a[t]);
      if (!l) return;
      delar.push(l + ' ' + (t === 'socker' ? 'socker' : t));
      titlar.push(GRANS[t].namn + ': ' + fmt(a[t]) + ' g/100 g');
    });
    if (!delar.length) return '';
    return '<div class="mline" style="color:#5f6e70;" title="Näringsampel per 100 g (FSA-gränser). ' +
      titlar.join(' · ').replace(/"/g, '&quot;') +
      '. Socker = tillsatt mängd ur receptet.">🚦 ' + delar.join(' · ') + '</div>';
  }

  window.__MK_AMPEL = { GRANS: GRANS, lampa: lampa, kortHtml: kortHtml };
})();
