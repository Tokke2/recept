/* ============================================================
   CENTRAL APP-MODUL – Mitt Maskinkök
   ============================================================
   Laddas av ALLA sidor (som print.js). Hanterar:
   1) PWA-registrering (service worker → installerbar app, offline)
   2) Delningsknapp 📤 (native delning på mobil, kopiera länk på dator)

   Läggs in före </body>:
     <script src="assets/app.js"></script>      (rotsidor)
     <script src="../assets/app.js"></script>   (receptsidor)
   ============================================================ */
(function () {
  var isSubPage = location.pathname.includes('/recept/');
  var base = isSubPage ? '../' : './';

  /* ---------- 1) PWA: registrera service worker + manifest ---------- */
  if (!document.querySelector('link[rel="manifest"]')) {
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = base + 'manifest.json';
    document.head.appendChild(link);
  }
  var theme = document.createElement('meta');
  theme.name = 'theme-color';
  theme.content = '#c0392b';
  document.head.appendChild(theme);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register(base + 'sw.js', { scope: base }).catch(function () {});
  }

  /* ---------- 2) Delningsknapp (flytande, ovanför utskriftsknappen) ---------- */
  if (!document.querySelector('.share-btn')) {
    var btn = document.createElement('button');
    btn.className = 'share-btn no-print';
    btn.type = 'button';
    btn.title = 'Dela sidan';
    btn.innerHTML = '📤 Dela';
    btn.style.cssText =
      'position:fixed;bottom:76px;right:22px;z-index:99;background:#27ae60;color:#fff;border:none;' +
      'border-radius:999px;padding:13px 20px;font-size:.95rem;font-weight:700;font-family:inherit;cursor:pointer;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;gap:8px;';
    btn.addEventListener('mouseenter', function () { btn.style.background = '#1f8b4d'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = '#27ae60'; });

    btn.addEventListener('click', async function () {
      var meta = document.querySelector('meta[name="recept:namn"]');
      var title = meta ? meta.content + ' – Mitt Maskinkök' : document.title;
      var data = { title: title, text: title, url: location.href };

      if (navigator.share) {
        // Mobil: native delningsmeny (SMS, Messenger, WhatsApp, e-post...)
        try { await navigator.share(data); } catch (e) { /* avbruten */ }
      } else {
        // Dator: kopiera länken
        try {
          await navigator.clipboard.writeText(location.href);
          var orig = btn.innerHTML;
          btn.innerHTML = '✅ Länk kopierad!';
          setTimeout(function () { btn.innerHTML = orig; }, 2000);
        } catch (e) {
          prompt('Kopiera länken:', location.href);
        }
      }
    });

    document.body.appendChild(btn);
  }

  /* ---------- Dölj delningsknappen vid utskrift ---------- */
  var st = document.createElement('style');
  st.textContent = '@media print { .share-btn { display:none !important; } }';
  document.head.appendChild(st);
})();
