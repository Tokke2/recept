/* ============================================================
   PLATS: /assets/app.js  (assets-mappen i repo-roten)
   ============================================================
   CENTRAL APP-MODUL v2 – Mitt Maskinkök
   ============================================================
   Laddas automatiskt av assets/site.js på ALLA sidor.

   v2 – 500% BÄTTRE:
   1) PWA: service worker + manifest + theme-color
      ✔ NYTT: egen "📱 Installera app"-knapp när webbläsaren
        erbjuder installation (beforeinstallprompt)
      ✔ NYTT: uppdaterings-avisering när ny version av sajten
        finns ("Ny version – uppdatera")
   2) FLYTANDE KNAPPMENY (modern FAB istället för knappstapel):
      ✔ En huvudknapp (＋) som fäller ut Dela/Skriv ut/Installera
        med mjuk animation – renare skärm, mindre skymd text
      ✔ Delning: native på mobil, kopiera-länk med toast på dator
      ✔ Knapparna får etiketter vid utfällning
   3) ✔ NYTT: Offline/online-toast ("📡 Offline – visar sparade
        recept" / "✅ Online igen")
   4) ✔ NYTT: Toast-system (snygga meddelanden) – används av
        delning, install och nätstatus
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_APP_LOADED) return;
  window.__MK_APP_LOADED = true;

  var isSubPage = location.pathname.indexOf('/recept/') !== -1;
  var base = isSubPage ? '../' : './';

  /* ============================================================
     1) PWA-GRUND: manifest, theme-color, service worker
     ============================================================ */
  if (!document.querySelector('link[rel="manifest"]')) {
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = base + 'manifest.json';
    document.head.appendChild(link);
  }
  if (!document.querySelector('meta[name="theme-color"]')) {
    var theme = document.createElement('meta');
    theme.name = 'theme-color';
    theme.content = '#c0392b';
    document.head.appendChild(theme);
  }

  var newWorkerWaiting = false;
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register(base + 'sw.js', { scope: base })
      .then(function (reg) {
        // Uppdaterings-avisering: ny sw väntar → erbjud uppdatering
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              newWorkerWaiting = true;
              toast('🔄 Ny version av sajten finns', 'Uppdatera', function () {
                location.reload();
              }, 8000);
            }
          });
        });
      })
      .catch(function () {});
  }

  /* ============================================================
     4) TOAST-SYSTEM (snygga meddelanden nere i mitten)
     ============================================================ */
  var toastEl = null, toastTimer = null;
  function toast(msg, actionLabel, actionFn, ms) {
    if (toastTimer) clearTimeout(toastTimer);
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div');
    toastEl.className = 'no-print';
    toastEl.style.cssText =
      'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(8px);z-index:10000;' +
      'background:#2c3e50;color:#fff;border-radius:14px;padding:13px 20px;font-family:inherit;' +
      'font-size:.92rem;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.35);display:flex;' +
      'align-items:center;gap:12px;opacity:0;transition:opacity .25s,transform .25s;max-width:90vw;';
    toastEl.innerHTML = '<span>' + msg + '</span>' +
      (actionLabel ? '<button style="background:#e67e22;color:#fff;border:none;border-radius:9px;padding:7px 14px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.85rem;">' + actionLabel + '</button>' : '');
    document.body.appendChild(toastEl);
    if (actionLabel && actionFn) toastEl.querySelector('button').onclick = actionFn;
    requestAnimationFrame(function () {
      toastEl.style.opacity = '1';
      toastEl.style.transform = 'translateX(-50%) translateY(0)';
    });
    toastTimer = setTimeout(function () {
      if (!toastEl) return;
      toastEl.style.opacity = '0';
      setTimeout(function () { if (toastEl) { toastEl.remove(); toastEl = null; } }, 300);
    }, ms || 3000);
  }
  window.__MK_TOAST = toast; // andra moduler får använda den

  /* ============================================================
     3) OFFLINE/ONLINE-status
     ============================================================ */
  window.addEventListener('offline', function () {
    toast('📡 Offline – sparade recept fungerar ändå', null, null, 4000);
  });
  window.addEventListener('online', function () {
    toast('✅ Online igen', null, null, 2000);
  });

  /* ============================================================
     2) FLYTANDE KNAPPMENY (FAB) – ersätter knappstapeln
     ============================================================ */
  var installEvent = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvent = e;
    var b = document.getElementById('mk-fab-install');
    if (b) b.style.display = 'flex';
  });

  function buildFab() {
    if (document.getElementById('mk-fab') || document.querySelector('.share-btn')) return;

    var css = document.createElement('style');
    css.textContent =
      '#mk-fab{position:fixed;bottom:22px;right:22px;z-index:99;display:flex;flex-direction:column;align-items:flex-end;gap:10px;font-family:inherit;}' +
      '#mk-fab .fab-main{width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#c0392b,#e67e22);color:#fff;border:none;font-size:1.6rem;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.3);transition:transform .25s;display:flex;align-items:center;justify-content:center;}' +
      '#mk-fab.open .fab-main{transform:rotate(45deg);}' +
      '#mk-fab .fab-item{display:flex;align-items:center;gap:10px;opacity:0;transform:translateY(8px) scale(.9);pointer-events:none;transition:opacity .2s,transform .2s;}' +
      '#mk-fab.open .fab-item{opacity:1;transform:none;pointer-events:auto;}' +
      '#mk-fab .fab-item:nth-child(1){transition-delay:.06s;} #mk-fab .fab-item:nth-child(2){transition-delay:.03s;}' +
      '#mk-fab .fab-label{background:#2c3e50;color:#fff;border-radius:9px;padding:6px 12px;font-size:.8rem;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,.25);white-space:nowrap;}' +
      '#mk-fab .fab-btn{width:46px;height:46px;border-radius:50%;border:none;color:#fff;font-size:1.15rem;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;transition:transform .15s;}' +
      '#mk-fab .fab-btn:hover{transform:scale(1.08);}' +
      '@media print{#mk-fab{display:none!important;}}';
    document.head.appendChild(css);

    var fab = document.createElement('div');
    fab.id = 'mk-fab';
    fab.className = 'no-print';
    fab.innerHTML =
      '<div class="fab-item" id="mk-fab-install" style="display:none;">' +
        '<span class="fab-label">Installera som app</span>' +
        '<button class="fab-btn" style="background:#8e44ad;" title="Installera appen">📱</button></div>' +
      '<div class="fab-item">' +
        '<span class="fab-label">Skriv ut (A4)</span>' +
        '<button class="fab-btn" style="background:#2c3e50;" title="Skriv ut sidan">🖨️</button></div>' +
      '<div class="fab-item">' +
        '<span class="fab-label">Dela sidan</span>' +
        '<button class="fab-btn" style="background:#27ae60;" title="Dela sidan">📤</button></div>' +
      '<button class="fab-main" title="Meny" aria-label="Öppna åtgärdsmeny">＋</button>';
    document.body.appendChild(fab);

    var main = fab.querySelector('.fab-main');
    main.addEventListener('click', function () { fab.classList.toggle('open'); });
    document.addEventListener('click', function (e) {
      if (!fab.contains(e.target)) fab.classList.remove('open');
    });

    // Skriv ut
    fab.querySelectorAll('.fab-btn')[1].addEventListener('click', function () {
      fab.classList.remove('open');
      window.print();
    });

    // Dela
    fab.querySelectorAll('.fab-btn')[2].addEventListener('click', async function () {
      fab.classList.remove('open');
      var meta = document.querySelector('meta[name="recept:namn"]');
      var title = meta ? meta.content + ' – Mitt Maskinkök' : document.title;
      if (navigator.share) {
        try { await navigator.share({ title: title, text: title, url: location.href }); } catch (e) {}
      } else {
        try {
          await navigator.clipboard.writeText(location.href);
          toast('✅ Länk kopierad!');
        } catch (e) {
          prompt('Kopiera länken:', location.href);
        }
      }
    });

    // Installera
    fab.querySelectorAll('.fab-btn')[0].addEventListener('click', async function () {
      fab.classList.remove('open');
      if (!installEvent) return;
      installEvent.prompt();
      var res = await installEvent.userChoice;
      if (res && res.outcome === 'accepted') toast('📱 Appen installeras!');
      installEvent = null;
      document.getElementById('mk-fab-install').style.display = 'none';
    });

    // Dölj gamla fristående print-knappen om print.js hann skapa en
    var oldPrint = document.querySelector('.print-btn');
    if (oldPrint) oldPrint.style.display = 'none';
  }

  if (document.body) buildFab();
  else document.addEventListener('DOMContentLoaded', buildFab);
})();
