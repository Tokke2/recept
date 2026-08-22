/* ============================================================
   PLATS: /assets/hero.js  (assets-mappen i repo-roten)
   ============================================================
   🖼️ AUTO-HERO-BILDER – Mitt Maskinkök
   ============================================================
   Recept utan foto får en SNYGG GENERERAD bild istället för tom
   yta: kategorifärgad gradient + mönster + stor emoji + receptnamn.
   · Receptsidor: ersätter .hero-img när bilden saknas (onerror
     har redan gömt den, eller så laddar den inte)
   · Receptsamlingen: window.__MK_HERO_SVG(namn, emoji) ger en
     data-URI som recept.html kan använda för kortbilder
   Finns riktig bild (images/recept/FILNAMN.jpg) används den ALLTID
   – SVG:n är bara reserv tills en äkta bild laddas upp.
   Kategorifärgen väljs med samma prioriterade ordlista som
   recept.html (specifikt före generellt, "saftig" triggar ej saft).
   Laddas av site.js. Källfilen röres aldrig; genererade bilder
   städas ur sparad HTML (klass mk-hero-auto i redigera.js).
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_HERO_LOADED) return;
  window.__MK_HERO_LOADED = true;

  /* ---------- Kategorifärger (samma anda som sajtens palett) ---------- */
  var KAT_FARG = {
    husdjur:   ['#8e6e53', '#b5936f'],
    sylt:      ['#8e2f4f', '#c0392b'],
    saft:      ['#d35400', '#f39c12'],
    glass:     ['#2980b9', '#7fd3f7'],
    snacks:    ['#b7950b', '#f1c40f'],
    brod:      ['#a0622d', '#d68f4c'],
    deg:       ['#9c7b4f', '#c9a76f'],
    bakning:   ['#c2185b', '#e67e22'],
    efterratt: ['#7d3c98', '#b569d4'],
    varmratt:  ['#286e46', '#27ae60'],
    ovrigt:    ['#c0392b', '#e67e22']
  };
  /* Prioriterad ordlista – SAMMA logik som recept.html (först vinner) */
  var KAT_ORD = [
    ['hund', 'husdjur'], ['husdjur', 'husdjur'], ['katt', 'husdjur'],
    ['sylt', 'sylt'], ['marmelad', 'sylt'], ['chutney', 'sylt'], ['inlagd', 'sylt'],
    ['smulpaj', 'bakning'], ['smuldeg', 'bakning'], ['paj', 'bakning'],
    ['glass', 'glass'], ['sorbet', 'glass'], ['frozen', 'glass'],
    ['milkshake', 'saft'], ['proteinshake', 'saft'], ['shake', 'saft'], ['smoothie', 'saft'],
    ['slush', 'saft'], ['drink', 'saft'], ['cocktail', 'saft'], ['lemonad', 'saft'],
    ['saft', 'saft'], ['juice', 'saft'], ['dryck', 'saft'],
    ['snacks', 'snacks'], ['chips', 'snacks'], ['popcorn', 'snacks'], ['tilltugg', 'snacks'], ['jerky', 'snacks'],
    ['pizzadeg', 'deg'], ['jäsning', 'deg'],
    ['bröd', 'brod'], ['limpa', 'brod'], ['pita', 'brod'], ['tortilla', 'brod'], ['baguette', 'brod'], ['toast', 'brod'],
    ['deg', 'deg'],
    ['kaka', 'bakning'], ['tårta', 'bakning'], ['muffin', 'bakning'], ['bulle', 'bakning'],
    ['kex', 'bakning'], ['cookie', 'bakning'], ['bakning', 'bakning'], ['fika', 'bakning'],
    ['våffl', 'bakning'], ['pannkak', 'bakning'],
    ['efterrätt', 'efterratt'], ['dessert', 'efterratt'], ['pudding', 'efterratt'], ['mousse', 'efterratt'],
    ['gryta', 'varmratt'], ['soppa', 'varmratt'], ['curry', 'varmratt'], ['kött', 'varmratt'],
    ['kyckling', 'varmratt'], ['fisk', 'varmratt'], ['lax', 'varmratt'], ['pasta', 'varmratt'],
    ['lasagne', 'varmratt'], ['risotto', 'varmratt'], ['middag', 'varmratt'], ['varmrätt', 'varmratt'],
    ['tomatsås', 'varmratt'], ['sås', 'varmratt'], ['pizza', 'varmratt']
  ];
  function kategori(text) {
    var t = String(text).toLowerCase().replace(/saftig\w*/g, '');
    for (var i = 0; i < KAT_ORD.length; i++) {
      if (t.indexOf(KAT_ORD[i][0]) !== -1) return KAT_ORD[i][1];
    }
    return 'ovrigt';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Dela receptnamnet i max 2 rader (~26 tecken/rad) */
  function rader(namn) {
    var ord = String(namn).trim().split(/\s+/), r = [''], MAX = 26;
    ord.forEach(function (o) {
      if ((r[r.length - 1] + ' ' + o).trim().length <= MAX || !r[r.length - 1]) {
        r[r.length - 1] = (r[r.length - 1] + ' ' + o).trim();
      } else if (r.length < 2) r.push(o);
      else r[1] = r[1].replace(/\u2026?$/, '') + '\u2026';
    });
    return r;
  }

  /* ---------- SVG-generatorn (delas med recept.html via API) ---------- */
  function heroSvg(namn, emoji, w, h) {
    w = w || 900; h = h || 340;
    var kat = kategori(namn);
    var f = KAT_FARG[kat] || KAT_FARG.ovrigt;
    var rr = rader(namn);
    var cy = h / 2;
    var textY1 = rr.length === 2 ? cy + 62 : cy + 74;
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '">' +
        '<defs>' +
          '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="' + f[0] + '"/>' +
            '<stop offset="1" stop-color="' + f[1] + '"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/>' +
        /* diskreta cirklar som mönster */
        '<circle cx="' + (w * 0.85) + '" cy="' + (h * 0.2) + '" r="90" fill="rgba(255,255,255,.07)"/>' +
        '<circle cx="' + (w * 0.12) + '" cy="' + (h * 0.85) + '" r="120" fill="rgba(255,255,255,.06)"/>' +
        '<circle cx="' + (w * 0.75) + '" cy="' + (h * 0.9) + '" r="60" fill="rgba(0,0,0,.06)"/>' +
        /* stor emoji */
        '<text x="' + (w / 2) + '" y="' + (cy - 20) + '" text-anchor="middle" font-size="110" dominant-baseline="middle">' + esc(emoji || '\uD83C\uDF7D\uFE0F') + '</text>' +
        /* receptnamn (1–2 rader) */
        rr.map(function (rad, i) {
          return '<text x="' + (w / 2) + '" y="' + (textY1 + i * 38) + '" text-anchor="middle" ' +
            'font-family="Georgia,serif" font-weight="700" font-size="30" fill="#ffffff" ' +
            'style="paint-order:stroke" stroke="rgba(0,0,0,.25)" stroke-width="4">' + esc(rad) + '</text>';
        }).join('') +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  window.__MK_HERO_SVG = heroSvg;   /* används av recept.html för kortbilder */

  /* ---------- Receptsidor: ersätt saknad hero-bild ---------- */
  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  function namnet() {
    var m = document.querySelector('meta[name="recept:namn"]');
    var n = (m && m.content) || (document.querySelector('header h1') || { textContent: 'Recept' }).textContent;
    return String(n).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '').trim();
  }
  function emojin() {
    var m = document.querySelector('meta[name="recept:emoji"]');
    if (m && m.content) return m.content;
    var h1 = document.querySelector('header h1');
    if (h1) {
      var hit = h1.textContent.match(/[\u{1F300}-\u{1FAFF}]/u);
      if (hit) return hit[0];
    }
    return '\uD83C\uDF7D\uFE0F';
  }

  function fixa(img) {
    if (img.getAttribute('data-mk-auto')) return;
    img.setAttribute('data-mk-auto', '1');
    img.classList.add('mk-hero-auto');
    img.src = heroSvg(namnet(), emojin());
    img.style.display = '';           /* onerror kan ha gömt den */
    img.style.objectFit = 'cover';
  }

  function koll() {
    var img = document.querySelector('.hero-img');
    if (!img) return;
    if (img.getAttribute('data-mk-auto')) return;
    /* Redan färdigladdad? */
    if (img.complete) {
      if (!img.naturalWidth) fixa(img);       /* laddningen misslyckades */
      return;
    }
    img.addEventListener('error', function () { fixa(img); });
    /* display:none via onerror hann före oss */
    if (window.getComputedStyle(img).display === 'none') fixa(img);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', koll);
  else koll();
})();
