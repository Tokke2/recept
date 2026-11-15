/* PLATS: /assets/tipsa.js  (laddas av site.js på RECEPTSIDOR)
   ============================================================
   💌 TIPSA EN VÄN (SPEC-punkt 214, förslag 1033 – användarens
   beställning): mailto-knapp med färdigt receptkort i brödtexten
   – namn, maskinrad och länk. INGEN tracking, inga tredjeparts-
   tjänster: ren mailto: som öppnar vännens egen e-postapp.
   · Knappen läggs i #mk-rnav med appendChild (174-regeln:
     Mer-trayen äger ordningen).
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_TIPSA_LOADED) return;
  window.__MK_TIPSA_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  function meta(n) {
    var el = document.querySelector('meta[name="recept:' + n + '"]');
    return el ? el.content : '';
  }

  function tipsa() {
    var namn = meta('namn') || document.title;
    var maskin = (meta('maskiner').split('|')[0] || '').trim();
    var rader = [
      '🍳 ' + namn,
      maskin ? '🔧 ' + maskin : '',
      '',
      location.href.split('#')[0],
      '',
      'Från Mitt Maskinkök – recept med exakta maskinprogram, kökstestade av ägaren.'
    ].filter(function (r, i) { return r !== '' || i === 2 || i === 4; });
    var url = 'mailto:?subject=' + encodeURIComponent('Recepttips: ' + namn) +
      '&body=' + encodeURIComponent(rader.join('\n'));
    location.href = url;
  }

  var forsok = 0;
  var iv = setInterval(function () {
    forsok++;
    var rnav = document.getElementById('mk-rnav');
    if (!rnav && forsok < 20) return;
    clearInterval(iv);
    if (!rnav || document.getElementById('rnTipsa')) return;
    var b = document.createElement('button');
    b.id = 'rnTipsa';
    b.type = 'button';
    b.innerHTML = '💌<span>Tipsa</span>';
    b.title = 'Tipsa en vän via e-post – färdigt receptkort, ingen spårning';
    b.onclick = tipsa;
    rnav.appendChild(b);   /* 174-regeln: appendChild – trayen sorterar */
  }, 400);
})();
