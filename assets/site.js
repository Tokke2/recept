/* ============================================================
   PLATS: /assets/site.js  (assets-mappen i repo-roten)
   ============================================================
   CENTRAL LADDARE & KONTROLL v3 – Mitt Maskinkök
   ============================================================
   DEN ENDA raden en sida behöver:
     Rotsidor:     <script src="assets/site.js"></script>
     Receptsidor:  <script src="../assets/site.js"></script>

   v3 – 500% BÄTTRE ÄN v2:
   ✔ CENTRAL TOPPMENY på ALLA sidor (sticky, frostat glas,
     aktiv sida markerad) – sidor med egen .topnav hoppas över.
     Hela sajten får enhetlig navigering från EN fil.
   ✔ SNABBARE NAVIGERING: interna länkar förhämtas (prefetch)
     vid hover/touch → nästa sida känns omedelbar
   ✔ "↑ Till toppen"-knapp vid längre scroll
   ✔ Mjuk sidintoning vid laddning (fade-in, respekterar
     prefers-reduced-motion)
   ✔ Allt från v2: parallell modulladdning + retry, gruppad
     hälsorapport i konsolen, visuell felbanner → status.html,
     designbas (fokusring, scrollbar, selection, tryckkänsla)
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_SITE_LOADED) return;
  window.__MK_SITE_LOADED = true;

  var t0 = performance.now();

  /* ---------- Basväg utifrån var site.js laddades ---------- */
  var self = document.currentScript || document.querySelector('script[src*="site.js"]');
  var base = self ? self.getAttribute('src').replace(/site\.js.*$/, '') : 'assets/';
  var root = base.replace('assets/', ''); // './' eller '../'

  /* RECEPTSIDA = sidan HAR recept-metadata. (Sökvägskoll funkar INTE
     live: repot heter "recept" så ALLA adresser innehåller /recept/!) */
  var isRecipePage = !!document.querySelector('meta[name="recept:namn"]');

  /* Delas med alla moduler – EN källa till sanning */
  window.__MK_ROOT = root;
  window.__MK_IS_RECIPE = isRecipePage;

  var report = { loaded: [], present: [], failed: [] };

  /* ============================================================
     GEMENSAM DESIGNBAS – moderna detaljer på alla sidor
     ============================================================ */
  (function baseStyles() {
    if (document.getElementById('mk-base-style')) return;
    var st = document.createElement('style');
    st.id = 'mk-base-style';
    st.textContent =
      'html{scroll-behavior:smooth;}' +
      '::selection{background:#e67e22;color:#fff;}' +
      ':focus-visible{outline:3px solid #e67e22;outline-offset:2px;border-radius:4px;}' +
      '::-webkit-scrollbar{width:10px;height:10px;}' +
      '::-webkit-scrollbar-track{background:transparent;}' +
      '::-webkit-scrollbar-thumb{background:#d5cbb8;border-radius:99px;}' +
      '::-webkit-scrollbar-thumb:hover{background:#c0392b;}' +
      'button:active,a.cta:active,.tool-btn:active{transform:scale(.97);}' +
      /* Mjuk sidintoning */
      'body{animation:mkFadeIn .3s ease-out;}' +
      '@keyframes mkFadeIn{from{opacity:0;}to{opacity:1;}}' +
      /* Central toppmeny */
      '#mk-nav{position:sticky;top:0;z-index:110;background:rgba(246,243,238,.93);' +
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid #e5ddd0;' +
        'display:flex;align-items:center;gap:4px;padding:9px 16px;font-family:Segoe UI,system-ui,sans-serif;}' +
      '#mk-nav .brand{font-family:Georgia,serif;font-weight:700;font-size:1.02rem;color:#2c3e50;' +
        'text-decoration:none;margin-right:auto;display:flex;align-items:center;gap:7px;}' +
      '#mk-nav a.lnk{color:#2c3e50;text-decoration:none;font-size:.86rem;font-weight:600;' +
        'padding:8px 12px;border-radius:9px;transition:background .14s;white-space:nowrap;}' +
      '#mk-nav a.lnk:hover{background:#eee5d6;}' +
      '#mk-nav a.lnk.on{background:#c0392b;color:#fff;}' +
      '@media (max-width:640px){#mk-nav a.lnk span{display:none;}#mk-nav a.lnk{padding:8px 10px;}}' +
      /* Till toppen-knapp */
      '#mk-top{position:fixed;bottom:22px;left:22px;z-index:98;width:46px;height:46px;border-radius:50%;' +
        'background:#2c3e50;color:#fff;border:none;font-size:1.15rem;cursor:pointer;' +
        'box-shadow:0 6px 16px rgba(0,0,0,.28);opacity:0;transform:translateY(12px);pointer-events:none;' +
        'transition:opacity .25s,transform .25s;}' +
      '#mk-top.show{opacity:1;transform:none;pointer-events:auto;}' +
      '#mk-top:hover{background:#c0392b;}' +
      '@media print{#mk-nav,#mk-top{display:none!important;}}' +
      '@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto;}' +
        '*{transition:none!important;animation:none!important;}}';
    document.head.appendChild(st);
  })();

  /* ============================================================
     CENTRAL FAVICON (logotypmärket – alla sidor från EN fil)
     ============================================================ */
  (function favicon() {
    if (!document.querySelector('link[rel="icon"]')) {
      var l = document.createElement('link');
      l.rel = 'icon';
      l.type = 'image/svg+xml';
      l.href = root + 'images/logo-mark.svg';
      document.head.appendChild(l);
      /* 🍎 Safari stödjer INTE SVG-favicon → PNG-reserv */
      var p = document.createElement('link');
      p.rel = 'icon';
      p.type = 'image/png';
      p.setAttribute('sizes', '32x32');
      p.href = root + 'images/favicon-32.png';
      document.head.appendChild(p);
    }
    /* 🍎 iPhone/iPad "Lägg till på hemskärmen" kräver apple-touch-icon (PNG) */
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      var a = document.createElement('link');
      a.rel = 'apple-touch-icon';
      a.setAttribute('sizes', '180x180');
      a.href = root + 'images/apple-touch-icon.png';
      document.head.appendChild(a);
    }
  })();

  /* ============================================================
     CENTRAL TOPPMENY (hoppar över sidor med egen .topnav)
     ============================================================ */
  (function topNav() {
    if (document.querySelector('.topnav') || document.getElementById('mk-nav')) return;
    var here = location.pathname.split('/').pop() || 'index.html';
    var pages = [
      { file: 'recept.html', ikon: '📖', namn: 'Recept' },
      { file: 'maskindatabas.html', ikon: '🔧', namn: 'Maskiner' },
      { file: 'ingredienser.html', ikon: '🥫', namn: 'Ingredienser' },
      { file: 'generator.html', ikon: '🧪', namn: 'Generator' },
      { file: 'status.html', ikon: '🩺', namn: 'Status' }
    ];
    var nav = document.createElement('nav');
    nav.id = 'mk-nav';
    nav.className = 'no-print';
    nav.innerHTML =
      '<a class="brand" href="' + root + 'index.html">' +
        '<img src="' + root + 'images/logo-mark.svg" alt="" width="26" height="26" ' +
        'style="display:block;" onerror="this.outerHTML=\'🍳\'"> Mitt Maskinkök</a>' +
      pages.map(function (p) {
        var on = here === p.file || (isRecipePage && p.file === 'recept.html');
        return '<a class="lnk' + (on ? ' on' : '') + '" href="' + root + p.file + '">' +
               p.ikon + ' <span>' + p.namn + '</span></a>';
      }).join('');
    document.body.insertBefore(nav, document.body.firstChild);
  })();

  /* ============================================================
     💚 DONATIONSRAD I SIDFOTEN (alla sidor, diskret)
     Swish (QR-kod – numret visas ALDRIG i klartext) + Ko-fi.
     Centralt ur json/donation.json. Ifyllda alternativ visas.
     QR:n genereras av Swish officiella API forst vid klick.
     ============================================================ */
  (function donation() {
    fetch(root + 'json/donation.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var swish = String(d.swish_nummer || '').trim();
        var kofi = String(d.kofi || '').trim()
          .replace(/^https?:\/\/(www\.)?ko-fi\.com\//i, '').replace(/\/+$/, '');
        if (!swish && !kofi) return;

        var msg = d.meddelande || 'Gillar du sajten? Stod utvecklingen - bjud pa en kaffe!';
        var pill = 'display:inline-block;border-radius:999px;padding:3px 14px;font-size:.8rem;' +
          'font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;margin:2px 3px;background:none;';
        var btns = '';
        if (swish) {
          btns += '<button id="mk-swish-btn" style="' + pill +
            'border:1.5px solid #27ae60;color:#27ae60;">\uD83D\uDC9A Swish</button>';
        }
        if (kofi) {
          btns += '<a href="https://ko-fi.com/' + encodeURIComponent(kofi) + '" target="_blank" rel="noopener" style="' + pill +
            'border:1.5px solid #ff5e5b;color:#e0413e;">\u2764\uFE0F Ko-fi</a>';
        }

        var el = document.createElement('div');
        el.id = 'mk-donation';
        el.className = 'no-print';
        el.style.cssText = 'text-align:center;padding:10px 16px 18px;font-size:.8rem;color:#7f8c8d;font-family:Segoe UI,system-ui,sans-serif;';
        el.innerHTML = msg + ' &nbsp;' + btns;
        var footer = document.querySelector('footer');
        if (footer) footer.parentNode.insertBefore(el, footer.nextSibling);
        else document.body.appendChild(el);

        /* ---- Swish: QR-dialog (numret visas aldrig i klartext) ---- */
        var sb = el.querySelector('#mk-swish-btn');
        if (sb) sb.addEventListener('click', function () {
          /* Mobil: oppna Swish-appen direkt (smidigast dar) */
          if (/android|iphone|ipad/i.test(navigator.userAgent)) {
            var data = encodeURIComponent(JSON.stringify({ version: 1, payee: { value: swish, editable: false }, message: { value: 'Mitt Maskinkok', editable: true } }));
            location.href = 'swish://payment?data=' + data;
            return;
          }
          /* Dator: visa QR att skanna med mobilen */
          if (document.getElementById('mk-swish-qr-bg')) return;
          var bg = document.createElement('div');
          bg.id = 'mk-swish-qr-bg';
          bg.className = 'no-print';
          bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:320;display:flex;align-items:center;justify-content:center;padding:16px;';
          bg.innerHTML =
            '<div style="background:#fff;border-radius:18px;padding:26px 30px;text-align:center;max-width:320px;font-family:Segoe UI,system-ui,sans-serif;">' +
              '<h3 style="margin:0 0 4px;color:#2c3e50;">\uD83D\uDC9A Swisha en slant</h3>' +
              '<p style="font-size:.85rem;color:#7f8c8d;margin:0 0 14px;">Skanna med Swish-appen i mobilen</p>' +
              '<div id="mk-swish-qr-box" style="min-height:220px;display:flex;align-items:center;justify-content:center;color:#7f8c8d;font-size:.85rem;">Laddar QR-kod...</div>' +
              '<button id="mk-swish-qr-close" style="margin-top:14px;background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:10px 22px;font-weight:700;cursor:pointer;font-family:inherit;">Stang</button>' +
            '</div>';
          document.body.appendChild(bg);
          bg.querySelector('#mk-swish-qr-close').onclick = function () { bg.remove(); };
          bg.addEventListener('click', function (e) { if (e.target === bg) bg.remove(); });
          /* QR med Swish-betalformat (C<nummer>;;;) via qrserver-bildtjänsten.
             (Swish egna QR-API saknar CORS-headers och kan inte anropas
             från webbläsaren - bild-taggen behöver dock ingen CORS.) */
          var qrData = encodeURIComponent('C' + swish.replace(/[^0-9]/g, '') + ';;;');
          var box = document.getElementById('mk-swish-qr-box');
          if (box) {
            box.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + qrData +
              '" alt="Swish QR" width="220" height="220" style="border-radius:10px;" ' +
              'onerror="this.parentNode.textContent=\'Kunde inte ladda QR-koden - prova igen senare.\'">';
          }
        });
      })['catch'](function () {});
  })();

  /* ============================================================
     "TILL TOPPEN"-KNAPP
     ============================================================ */
  (function topBtn() {
    if (document.getElementById('mk-top')) return;
    var b = document.createElement('button');
    b.id = 'mk-top';
    b.className = 'no-print';
    b.title = 'Till toppen';
    b.setAttribute('aria-label', 'Scrolla till toppen');
    b.textContent = '↑';
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.body.appendChild(b);
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        b.classList.toggle('show', window.scrollY > 600);
        ticking = false;
      });
    }, { passive: true });
  })();

  /* ============================================================
     PREFETCH – förhämta interna sidor vid hover/touch
     ============================================================ */
  (function prefetch() {
    var done = {};
    function grab(href) {
      if (!href || done[href]) return;
      if (href.indexOf('http') === 0 && href.indexOf(location.host) === -1) return;
      if (!/\.(html?)($|\?|#)/i.test(href) && href.indexOf('.') !== -1) return;
      done[href] = true;
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = href;
      document.head.appendChild(l);
    }
    ['mouseover', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (a) grab(a.getAttribute('href'));
      }, { passive: true });
    });
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
      s.onload = function () { report.loaded.push(file); resolve(true); };
      s.onerror = function () {
        s.remove();
        if (!isRetry) {
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
    return { missing: missing, hasSteps: !!document.querySelector('ol li') };
  }

  /* ============================================================
     4) HÄLSORAPPORT i konsolen
     ============================================================ */
  function printReport(meta) {
    var ms = Math.round(performance.now() - t0);
    var ok = report.failed.length === 0 && (!meta || meta.missing.length === 0);
    try {
      console.groupCollapsed(
        '%c🍳 Maskinkök v3%c ' + (ok ? '✅ Allt OK' : '⚠️ Se detaljer') + ' · ' + ms + ' ms',
        'padding:2px 8px;border-radius:6px;font-weight:700;background:#c0392b;color:#fff;',
        'font-weight:600;'
      );
      if (report.present.length) console.info('Redan på sidan:', report.present.join(', '));
      if (report.loaded.length) console.info('Laddade:', report.loaded.join(', '));
      if (report.failed.length) console.error('MISSLYCKADES:', report.failed.join(', '), '– kontrollera assets/ på GitHub!');
      if (meta) {
        if (meta.missing.length) {
          console.warn('Saknad metadata: ' + meta.missing.join(', ') +
            '\n→ Lägg till <meta name="recept:..." content="..."> i <head>. Mall: recept/MALL-nytt-recept.html.txt');
        } else console.info('Metadata: komplett ✓');
        console.info(meta.hasSteps ? 'Kockläge: steg hittade ✓' : 'Kockläge: inga <ol>-steg.');
      }
      console.info('Hälsokontroll: ' + root + 'status.html');
      console.groupEnd();
    } catch (e) {}
  }

  /* ============================================================
     5) VISUELL FELBANNER
     ============================================================ */
  var problemShown = false;
  function showProblem() {
    if (problemShown || !document.body) return;
    problemShown = true;
    var bar = document.createElement('div');
    bar.className = 'no-print';
    bar.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;z-index:97;background:#c0392b;color:#fff;' +
      'font-family:Segoe UI,system-ui,sans-serif;font-size:.85rem;padding:10px 16px;text-align:center;' +
      'box-shadow:0 -4px 14px rgba(0,0,0,.2);';
    bar.innerHTML = '⚠️ En sidmodul kunde inte laddas (' + report.failed.join(', ') + '). ' +
      '<a href="' + root + 'status.html" style="color:#fff;text-decoration:underline;font-weight:700;">Kör hälsokontrollen</a> ' +
      '<button onclick="this.parentNode.remove()" style="margin-left:10px;background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;">✕</button>';
    document.body.appendChild(bar);
  }

  /* ============================================================
     KÖR – allt parallellt
     ============================================================ */
  ensureCss('print.css');
  ensureCss('design.css');   /* 🎨 central designfil – vinner över sidornas :root */
  var scripts = ['print.js', 'app.js', 'sprak.js', 'betyg.js', 'affiliate.js', 'emoji.js', 'seo.js', 'hero.js'];
  if (isRecipePage) scripts.push('ingrediens.js', 'kalkyl.js', 'recept.js', 'energi.js', 'receptnav.js', 'redigera.js', 'maskinmatch.js', 'spara.js', 'enheter.js', 'skala.js', 'etikett.js', 'tydlig.js', 'maskinlank.js', 'kommentarer.js', 'verifierad.js');
  if (/recept\.html$/i.test(location.pathname)) scripts.push('kokbok.js');
  if (/(nytt-recept|generator|maskin-import|ingredienser|maskindatabas|forslag)\.html$/i.test(location.pathname)) scripts.push('spara.js');
  if (/(index\.html$|\/recept\/?$)/i.test(location.pathname)) scripts.push('hem.js');   /* 🏠 Startsidan 2.0 */

  Promise.all(scripts.map(function (f) { return loadScript(f); }))
    .then(function () { printReport(checkMeta()); });
})();
