/* ============================================================
   PLATS: /assets/site.js  (assets-mappen i repo-roten)
   ============================================================ */
/* ============================================================
   CENTRAL LADDARE & KONTROLL – Mitt Maskinkök
   ============================================================
   DEN ENDA raden en sida behöver:

     Rotsidor:     <script src="assets/site.js"></script>
     Receptsidor:  <script src="../assets/site.js"></script>

   Denna modul:
   1) KONTROLLERAR att alla obligatoriska moduler finns
      och laddar in dem som saknas (självläkande):
        - print.css  (A4-utskriftsformat)
        - print.js   (🖨️-knappen)
        - app.js     (PWA + 📤 delningsknapp)
      och på receptsidor dessutom:
        - recept.js  (👨‍🍳 kockläge)
        - energi.js  (⚡ energikostnad)
   2) KONTROLLERAR receptens metadata och varnar i
      utvecklarkonsolen om något saknas (F12 → Console).

   Gamla sidor med de enskilda script-raderna fungerar också –
   varje modul skyddar sig själv mot dubbelladdning.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_SITE_LOADED) return;
  window.__MK_SITE_LOADED = true;

  /* ---------- Hitta basvägen utifrån var site.js laddades ---------- */
  var self = document.currentScript || document.querySelector('script[src*="site.js"]');
  var base = self ? self.getAttribute('src').replace(/site\.js.*$/, '') : 'assets/';
  // base = "assets/" eller "../assets/"

  var isRecipePage = location.pathname.indexOf('/recept/') !== -1 ||
                     !!document.querySelector('meta[name="recept:namn"]');

  /* ---------- 1) Kontrollera & ladda CSS ---------- */
  function ensureCss(file) {
    var already = [].slice.call(document.querySelectorAll('link[rel="stylesheet"]'))
      .some(function (l) { return (l.getAttribute('href') || '').indexOf(file) !== -1; });
    if (already) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base + file;
    document.head.appendChild(link);
    console.info('[Maskinkök] Laddade saknad modul: ' + file);
  }

  /* ---------- 2) Kontrollera & ladda JS (i ordning) ---------- */
  function ensureScripts(files) {
    var queue = files.filter(function (f) {
      return ![].slice.call(document.querySelectorAll('script[src]'))
        .some(function (s) { return (s.getAttribute('src') || '').indexOf(f) !== -1; });
    });
    (function next() {
      var f = queue.shift();
      if (!f) { checkMeta(); return; }
      var s = document.createElement('script');
      s.src = base + f;
      s.onload = next;
      s.onerror = function () {
        console.warn('[Maskinkök] Kunde inte ladda: ' + f);
        next();
      };
      document.body.appendChild(s);
      console.info('[Maskinkök] Laddade saknad modul: ' + f);
    })();
  }

  /* ---------- 3) Metadata-kontroll för receptsidor ---------- */
  function checkMeta() {
    if (!isRecipePage) return;
    var required = ['recept:namn', 'recept:emoji', 'recept:beskrivning', 'recept:taggar', 'recept:maskiner'];
    var recommended = [];
    var missing = required.filter(function (n) { return !document.querySelector('meta[name="' + n + '"]'); });
    var missingRec = [];

    if (missing.length) {
      console.warn('[Maskinkök] ⚠️ Receptet SAKNAR obligatorisk metadata: ' + missing.join(', ') +
        '\nStartsidan kan då inte visa beskrivning/taggar/maskiner för detta recept.' +
        '\nLägg till <meta name="recept:..." content="..."> i <head>. Se recept/MALL-nytt-recept.html.txt');
    }
    if (!missing.length) {
      console.info('[Maskinkök] ✅ Receptets metadata komplett.');
    }
  }

  /* ---------- Kör ---------- */
  ensureCss('print.css');
  var scripts = ['print.js', 'app.js', 'sprak.js'];
  if (isRecipePage) scripts.push('recept.js', 'energi.js');
  ensureScripts(scripts);
})();
