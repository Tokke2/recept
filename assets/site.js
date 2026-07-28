/* ============================================================
   PLATS: /assets/site.js  (assets-mappen i repo-roten)
   ============================================================
   CENTRAL LADDARE & KONTROLL v2 – Mitt Maskinkök
   ============================================================
   DEN ENDA raden en sida behöver:
     Rotsidor:     <script src="assets/site.js"></script>
     Receptsidor:  <script src="../assets/site.js"></script>

   v2 – 500% BÄTTRE:
   ✔ PARALLELL modulladdning (allt laddas samtidigt – snabbare
     sidstart än gamla en-i-taget-kön)
   ✔ SJÄLVLÄKANDE: laddar moduler som saknas, retry vid nätfel
   ✔ HÄLSORAPPORT: snygg gruppad konsolrapport (F12) med status
     för moduler + metadata istället för spridda loggrader
   ✔ VISUELL FELINDIKATOR: liten diskret banner om en modul
     inte kunde laddas (bara för dig – döljs vid utskrift)
   ✔ GEMENSAM DESIGNBAS: injicerar moderna bas-stilar för
     knappar/fokus/scrollbeteende så alla sidor känns enhetliga
   ✔ Dubbelladdningsskydd för sig själv och alla moduler
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_SITE_LOADED) return;
  window.__MK_SITE_LOADED = true;

  var t0 = performance.now();

  /* ---------- Basväg utifrån var site.js laddades ---------- */
  var self = document.currentScript || document.querySelector('script[src*="site.js"]');
  var base = self ? self.getAttribute('src').replace(/site\.js.*$/, '') : 'assets/';

  var isRecipePage = location.pathname.indexOf('/recept/') !== -1 ||
                     !!document.querySelector('meta[name="recept:namn"]');

  var report = { loaded: [], present: [], failed: [] };

  /* ============================================================
     GEMENSAM DESIGNBAS – moderna detaljer på alla sidor
     ============================================================ */
  (function baseStyles() {
    if (document.getElementById('mk-base-style')) return;
    var st = document.createElement('style');
    st.id = 'mk-base-style';
    st.textContent =
      /* Mjuk scroll + snyggt textval */
      'html{scroll-behavior:smooth;}' +
      '::selection{background:#e67e22;color:#fff;}' +
      /* Modern tydlig fokusring för tangentbordsnavigering */
      ':focus-visible{outline:3px solid #e67e22;outline-offset:2px;border-radius:4px;}' +
      /* Diskret scrollbar (WebKit) */
      '::-webkit-scrollbar{width:10px;height:10px;}' +
      '::-webkit-scrollbar-track{background:transparent;}' +
      '::-webkit-scrollbar-thumb{background:#d5cbb8;border-radius:99px;}' +
      '::-webkit-scrollbar-thumb:hover{background:#c0392b;}' +
      /* Knapp-tryckkänsla globalt */
      'button:active,a.cta:active,.tool-btn:active{transform:scale(.97);}' +
      /* Respektera reducerad rörelse */
      '@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto;}*{transition:none!important;animation:none!important;}}';
    document.head.appendChild(st);
  })();

  /* ============================================================
     1) CSS-MODULER
     ============================================================ */
  function ensureCss(file) {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      if ((links[i].getAttribute('href') || '').indexOf(file) !== -1) {
        report.present.push(file);
        return;
      }
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base + file;
    link.onload = function () { report.loaded.push(file); };
    link.onerror = function () { report.failed.push(file); showProblem(); };
    document.head.appendChild(link);
  }

  /* ============================================================
     2) JS-MODULER – parallellt med retry
     (Modulerna är oberoende och har egna dubbelladdningsskydd,
      därför kan allt laddas samtidigt = snabbare än kö.)
     ============================================================ */
  function loadScript(file, isRetry) {
    return new Promise(function (resolve) {
      var existing = document.querySelectorAll('script[src]');
      for (var i = 0; i < existing.length; i++) {
        if ((existing[i].getAttribute('src') || '').indexOf(file) !== -1) {
          report.present.push(file);
          return resolve(true);
        }
      }
      var s = document.createElement('script');
      s.src = base + file + (isRetry ? '?retry=' + Date.now() : '');
      s.onload = function () {
        report.loaded.push(file);
        resolve(true);
      };
      s.onerror = function () {
        s.remove();
        if (!isRetry) {
          // En andra chans vid tillfälligt nätfel
          setTimeout(function () { loadScript(file, true).then(resolve); }, 600);
        } else {
          report.failed.push(file);
          showProblem();
          resolve(false);
        }
      };
      document.body.appendChild(s);
    });
  }

  /* ============================================================
     3) METADATA-KONTROLL (receptsidor)
     ============================================================ */
  function checkMeta() {
    if (!isRecipePage) return null;
    var required = ['recept:namn', 'recept:emoji', 'recept:beskrivning', 'recept:taggar', 'recept:maskiner'];
    var missing = required.filter(function (n) {
      return !document.querySelector('meta[name="' + n + '"]');
    });
    var hasSteps = !!document.querySelector('ol li');
    return { missing: missing, hasSteps: hasSteps };
  }

  /* ============================================================
     4) HÄLSORAPPORT – en snygg gruppad rapport i konsolen
     ============================================================ */
  function printReport(meta) {
    var ms = Math.round(performance.now() - t0);
    var ok = report.failed.length === 0 && (!meta || meta.missing.length === 0);
    var badge = 'padding:2px 8px;border-radius:6px;font-weight:700;';
    try {
      console.groupCollapsed(
        '%c🍳 Maskinkök%c ' + (ok ? '✅ Allt OK' : '⚠️ Se detaljer') + ' · ' + ms + ' ms',
        badge + 'background:#c0392b;color:#fff;',
        'font-weight:600;'
      );
      if (report.present.length) console.info('Redan på sidan:', report.present.join(', '));
      if (report.loaded.length) console.info('Laddade:', report.loaded.join(', '));
      if (report.failed.length) console.error('MISSLYCKADES:', report.failed.join(', '), '– kontrollera assets/-mappen på GitHub!');
      if (meta) {
        if (meta.missing.length) {
          console.warn('Saknad metadata: ' + meta.missing.join(', ') +
            '\n→ Startsidan visar receptet utan beskrivning/taggar/maskiner.' +
            '\n→ Lägg till <meta name="recept:..." content="..."> i <head>. Mall: recept/MALL-nytt-recept.html.txt');
        } else {
          console.info('Metadata: komplett ✓');
        }
        console.info(meta.hasSteps ? 'Kockläge: steg hittade ✓' : 'Kockläge: inga <ol>-steg – lägg stegen i <ol><li> så byggs kockläget.');
        console.info('Energidata hanteras centralt i json/energi.json');
      }
      console.info('Hälsokontroll för hela sajten: ' + base.replace('assets/', '') + 'status.html');
      console.groupEnd();
    } catch (e) { /* konsol saknas – ignorera */ }
  }

  /* ============================================================
     5) VISUELL FELINDIKATOR (endast vid riktiga fel)
     ============================================================ */
  var problemShown = false;
  function showProblem() {
    if (problemShown || !document.body) return;
    problemShown = true;
    var bar = document.createElement('div');
    bar.className = 'no-print';
    bar.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#c0392b;color:#fff;' +
      'font-family:Segoe UI,system-ui,sans-serif;font-size:.85rem;padding:10px 16px;text-align:center;' +
      'box-shadow:0 -4px 14px rgba(0,0,0,.2);';
    bar.innerHTML = '⚠️ En sidmodul kunde inte laddas (' +
      report.failed.join(', ') + ') – vissa funktioner kan saknas. ' +
      '<a href="' + base.replace('assets/', '') + 'status.html" style="color:#fff;text-decoration:underline;font-weight:700;">Kör hälsokontrollen</a> ' +
      '<button onclick="this.parentNode.remove()" style="margin-left:10px;background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;">✕</button>';
    document.body.appendChild(bar);
  }

  /* ============================================================
     KÖR – allt parallellt
     ============================================================ */
  ensureCss('print.css');

  var scripts = ['print.js', 'app.js', 'sprak.js'];
  if (isRecipePage) scripts.push('recept.js', 'energi.js');

  Promise.all(scripts.map(function (f) { return loadScript(f); }))
    .then(function () {
      printReport(checkMeta());
    });
})();
