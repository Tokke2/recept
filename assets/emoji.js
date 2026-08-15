/* ============================================================
   PLATS: /assets/emoji.js  (assets-mappen i repo-roten)
   ============================================================
   SMART EMOJI-VAL – Mitt Maskinkök
   ============================================================
   EN central, prioriterad ordlista som väljer LOGISK ikon utifrån
   vad receptet faktiskt är: sylt → 🫙 syltburk, saft → 🧃 flaska,
   kötträtt → 🥩 köttbit, osv.

   · window.__MK_EMOJI.pick(text) → bästa emojin för texten
   · På RECEPTSIDOR: är receptets emoji generisk (🍽️ m.fl.) eller
     ologisk mot innehållet byts den ut i rubrik/titel/metadata –
     ENDAST på skärmen, källfilen röres aldrig (Centralt-principen).
   · På RECEPTSAMLINGEN: korten i rutnätet får samma logik.
   · nytt-recept.html & generatorn använder samma lista via pick().

   Listan är PRIORITERAD – mest specifika orden först.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_EMOJI) return;

  /* [sökord (ordstart räcker), emoji] – första träffen vinner */
  var MAP = [
    /* Konserverat & sylt – FÖRE frukt (jordgubbsSYLT → burk, inte gubbe) */
    ['sylt', '🫙'], ['marmelad', '🫙'], ['chutney', '🫙'], ['inlagd', '🫙'],
    /* Shakes FÖRE saft (proteinshake med saft → shake) */
    ['milkshake', '🥤'], ['proteinshake', '🥤'], ['smoothie', '🥤'], ['shake', '🥤'],
    ['saft', '🧃'], ['juice', '🧃'], ['lemonad', '🍋'],
    ['slush', '🍹'], ['drink', '🍹'], ['cocktail', '🍸'], ['glögg', '🍷'],
    /* Glass & kallt */
    ['hundglass', '🐶'], ['mjukglass', '🍦'], ['sorbet', '🍧'], ['isglass', '🍧'], ['glass', '🍦'],
    /* Snacks/chips FÖRE pasta (makaroniCHIPS = snacks) */
    ['chips', '🥨'], ['snacks', '🥨'], ['popcorn', '🍿'],
    /* Sallad FÖRE protein (räkSALLAD = sallad) */
    ['sallad', '🥗'],
    /* Rätter FÖRE råvara (köttGRYTA → gryta, inte köttbit) */
    ['soppa', '🍲'], ['gryta', '🍲'], ['stuvning', '🍲'], ['curry', '🍛'],
    ['köttbull', '🧆'], ['köttfärs', '🥩'],
    /* Bakning – sammansatta först */
    ['smulpaj', '🥧'], ['smuldeg', '🥧'], ['pizzadeg', '🍕'], ['pizza', '🍕'],
    ['pitabröd', '🫓'], ['pita', '🫓'], ['tortilla', '🫓'], ['naan', '🫓'],
    ['toastbröd', '🍞'], ['majsbröd', '🍞'], ['formbröd', '🍞'], ['bröd', '🍞'], ['limpa', '🍞'],
    ['baguette', '🥖'], ['kanelbull', '🥐'], ['croissant', '🥐'], ['bull', '🥐'],
    ['paj', '🥧'], ['tårta', '🎂'], ['muffin', '🧁'], ['cupcake', '🧁'],
    ['kladdkaka', '🍫'], ['brownie', '🍫'], ['pannkak', '🥞'], ['plätt', '🥞'],
    ['kaka', '🍰'], ['kex', '🍪'], ['cookie', '🍪'], ['våffl', '🧇'], ['scones', '🥐'],
    ['deg', '🥖'],
    /* Kött, fågel, fisk */
    ['fläsk', '🥓'], ['bacon', '🥓'], ['falukorv', '🌭'], ['korv', '🌭'],
    ['hamburg', '🍔'], ['kyckling', '🍗'], ['kalkon', '🦃'], ['revben', '🍖'],
    ['biff', '🥩'], ['stek', '🥩'], ['högrev', '🥩'], ['kött', '🥩'],
    ['lax', '🐟'], ['torsk', '🐟'], ['fisk', '🐟'], ['räk', '🦐'], ['skaldjur', '🦐'],
    /* Varmrätter */
    ['risotto', '🍚'], ['risgrynsgröt', '🥣'], ['gröt', '🥣'], ['ris', '🍚'],
    ['spaghetti', '🍝'], ['lasagne', '🍝'], ['makaron', '🍝'], ['pasta', '🍝'],
    ['nudl', '🍜'], ['ramen', '🍜'], ['taco', '🌮'], ['burrito', '🌯'],
    ['sushi', '🍣'], ['omelett', '🍳'], ['ägg', '🍳'],
    ['pommes', '🍟'], ['potatis', '🥔'], ['toast', '🥪'], ['macka', '🥪'],
    ['sandwich', '🥪'],
    /* Snacks & övrigt */
    ['jerky', '🥓'],
    ['granola', '🥣'], ['müsli', '🥣'], ['yoghurt', '🥛'], ['buljong', '🍯'],
    ['sås', '🥫'], ['ketchup', '🥫'], ['pesto', '🌿'], ['hummus', '🥫'],
    ['kaffe', '☕'], ['glögg', '🍷'],
    /* Frukt sist (bara om inget annat träffat) */
    ['ananas', '🍍'], ['äppel', '🍎'], ['äpple', '🍎'], ['jordgubb', '🍓'],
    ['blåbär', '🫐'], ['banan', '🍌'], ['citron', '🍋'], ['mango', '🥭'],
    ['hund', '🐶']
  ];

  var GENERIC = ['🍽️', '🍽', '🍴', '🥄', '', '❓'];

  function pick(text, fallback) {
    /* Substräng VAR SOM HELST – svenskan bygger ihop ord
       (jordgubbsSYLT, fläderblomsSAFT). Prioritetsordningen i MAP
       gör att det specifika vinner över det generella. */
    var t = String(text || '').toLowerCase();
    for (var i = 0; i < MAP.length; i++) {
      if (t.indexOf(MAP[i][0]) !== -1) return MAP[i][1];
    }
    return fallback || '🍽️';
  }

  window.__MK_EMOJI = { pick: pick, MAP: MAP };

  /* ============================================================
     RECEPTSIDOR: byt ologisk/generisk emoji – endast på skärmen
     ============================================================ */
  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));

  function fixRecipePage() {
    var meta = document.querySelector('meta[name="recept:emoji"]');
    var namnMeta = document.querySelector('meta[name="recept:namn"]');
    if (!namnMeta) return;
    var text = namnMeta.content + ' ' +
      ((document.querySelector('meta[name="recept:taggar"]') || {}).content || '') + ' ' +
      ((document.querySelector('meta[name="recept:beskrivning"]') || {}).content || '');
    var current = meta ? meta.content.trim() : '';
    var basta = pick(text, current || '🍽️');
    /* Byt ENDAST om nuvarande är generisk/tom – eller om listan ger
       en träff och nuvarande inte alls förekommer som rimligt val */
    var byt = false;
    if (!current || GENERIC.indexOf(current) !== -1) byt = true;
    else if (basta !== current && basta !== '🍽️') {
      /* nuvarande emoji finns inte bland de logiska valen för texten → byt */
      var currentAnyMatch = MAP.some(function (p) { return p[1] === current && text.toLowerCase().indexOf(p[0]) !== -1; });
      if (!currentAnyMatch) byt = true;
    }
    if (!byt || basta === current) return;

    if (meta) meta.setAttribute('content', basta);
    var h1 = document.querySelector('header h1');
    if (h1) {
      var m = h1.textContent.match(/^\s*(\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*)\s*/u);
      if (m) h1.textContent = h1.textContent.replace(m[1], basta);
      else h1.textContent = basta + ' ' + h1.textContent.trim();
    }
    document.title = document.title.replace(/^\s*(\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*)\s*/u, basta + ' ');
  }

  /* ============================================================
     RECEPTSAMLINGEN: fixa korten i rutnätet (efter rendering)
     ============================================================ */
  function fixCards() {
    document.querySelectorAll('.rcard').forEach(function (card) {
      var em = card.querySelector('.big-emoji');
      var h3 = card.querySelector('h3');
      if (!em || !h3) return;
      var current = em.textContent.trim();
      var desc = card.querySelector('.desc');
      var basta = pick(h3.textContent + ' ' + (desc ? desc.textContent : ''), current);
      if (GENERIC.indexOf(current) !== -1 && basta !== current) em.textContent = basta;
      else if (basta !== current && basta !== '🍽️') {
        var ok = MAP.some(function (p) { return p[1] === current && h3.textContent.toLowerCase().indexOf(p[0]) !== -1; });
        if (!ok) em.textContent = basta;
      }
    });
  }

  function init() {
    if (isRecipePage) fixRecipePage();
    var grid = document.getElementById('grid');
    if (grid) {
      fixCards();
      new MutationObserver(fixCards).observe(grid, { childList: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
