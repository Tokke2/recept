/* ============================================================
   PLATS: /assets/logg.js  (assets-mappen i repo-roten)
   ============================================================
   📼 SVARTA LÅDAN – total loggning för enkel felsökning
   ============================================================
   Loggar PRECIS ALLT som händer i webbläsaren, lokalt:

   · 👆 ALLA tryck/klick (element, id/klass/text, position)
   · ⌨️ Inmatning (VILKET fält som ändrades – ALDRIG innehållet i
     lösenords-/nyckelfält; övriga fält loggas med längd, ej text)
   · 🧭 Navigering (sidladdningar, hash-byten, tillbaka/framåt)
   · 💥 ALLA JS-fel (window.onerror + unhandledrejection med stack)
   · 🌐 Nätanrop (fetch: url, status, tid – misslyckade markeras)
   · 🖨️ console.error/warn (speglas in i loggen)
   · 📱 Miljö (skärm, språk, online/offline, PWA-läge)

   LAGRING: ringbuffert i localStorage (max 400 poster / ~200 kB,
   äldsta åker ut). Överlever omladdning → man ser vad som hände
   FÖRE kraschen. Helt lokalt – skickas ALDRIG någonstans.

   ANVÄNDNING (felsökning):
   · Panel:  skriv ?logg=1 i adressen ELLER tryck L 5 ggr snabbt
     → flytande panel med live-logg, filter, ⬇️ Export, 🗑️ Rensa
   · Export: knappen laddar ner mk-logg.json → klistra in i chatten
     ("här är loggen") så ser AI:n exakt vad som hände
   · API:    window.__MK_LOGG.hamta() / .exportera() / .rensa()

   Centralt-principen: EN fil, laddas av site.js på ALLA sidor.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_LOGG_LOADED) return;
  window.__MK_LOGG_LOADED = true;

  var NYCKEL = 'mk-logg';
  var MAX = 400;                 /* poster i ringbufferten */
  var buffert = [];
  var sparTimer = null;

  try { buffert = JSON.parse(localStorage.getItem(NYCKEL) || '[]'); } catch (e) { buffert = []; }

  function nu() {
    var d = new Date();
    return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  function logga(typ, data) {
    buffert.push({ t: nu(), sida: location.pathname.split('/').slice(-1)[0] || 'index', typ: typ, d: data });
    if (buffert.length > MAX) buffert = buffert.slice(-MAX);
    clearTimeout(sparTimer);
    sparTimer = setTimeout(function () {
      try { localStorage.setItem(NYCKEL, JSON.stringify(buffert)); } catch (e) {
        /* localStorage fullt → halvera bufferten och prova igen */
        buffert = buffert.slice(-Math.floor(MAX / 2));
        try { localStorage.setItem(NYCKEL, JSON.stringify(buffert)); } catch (e2) {}
      }
    }, 400);
    /* live-panelen uppdateras direkt */
    if (panelEl) ritaPanel();
  }

  /* ---------- Beskriv ett element kort & träffsäkert ---------- */
  function beskriv(el) {
    if (!el || !el.tagName) return '?';
    var s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (el.className && typeof el.className === 'string') {
      var c = el.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (c) s += '.' + c;
    }
    var txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (txt && /^(button|a|summary|label|option|h1|h2|h3)$/i.test(el.tagName)) s += ' "' + txt + '"';
    return s;
  }

  /* ============================================================
     1) 👆 ALLA TRYCK/KLICK
     ============================================================ */
  document.addEventListener('click', function (e) {
    var mal = e.target.closest('button, a, input, select, summary, [onclick], label, td, .rb, .lnk') || e.target;
    logga('klick', { pa: beskriv(mal), x: e.clientX, y: e.clientY });
  }, true);   /* capture = fångas även om sidan stoppar bubbling */

  /* ============================================================
     2) ⌨️ INMATNING (aldrig innehåll i känsliga fält)
     ============================================================ */
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el || !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    var kansligt = el.type === 'password' ||
      /token|nyckel|losenord|lösenord|pw/i.test((el.id || '') + (el.name || ''));
    logga('input', {
      falt: beskriv(el),
      varde: kansligt ? '•••(dolt)' :
        (el.tagName === 'SELECT' ? String(el.value).slice(0, 60) : 'längd:' + String(el.value || '').length)
    });
  }, true);

  /* ============================================================
     3) 🧭 NAVIGERING & LIVSCYKEL
     ============================================================ */
  logga('sida', {
    url: location.pathname + location.search + location.hash,
    ref: document.referrer ? document.referrer.split('/').slice(-1)[0] : '',
    skarm: window.innerWidth + 'x' + window.innerHeight,
    pwa: (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || false,
    online: navigator.onLine
  });
  window.addEventListener('hashchange', function () { logga('hash', { till: location.hash }); });
  window.addEventListener('online', function () { logga('nat', { status: 'online' }); });
  window.addEventListener('offline', function () { logga('nat', { status: 'OFFLINE' }); });
  window.addEventListener('pagehide', function () {
    clearTimeout(sparTimer);
    try { localStorage.setItem(NYCKEL, JSON.stringify(buffert)); } catch (e) {}
  });

  /* ============================================================
     4) 💥 ALLA FEL (viktigast för felsökningen!)
     ============================================================ */
  window.addEventListener('error', function (e) {
    logga('FEL', {
      msg: String(e.message || '').slice(0, 200),
      fil: (e.filename || '').split('/').slice(-1)[0] + ':' + (e.lineno || '?'),
      stack: e.error && e.error.stack ? String(e.error.stack).split('\n').slice(0, 3).join(' | ').slice(0, 300) : ''
    });
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason || {};
    logga('FEL-promise', { msg: String(r.message || r).slice(0, 200),
      stack: r.stack ? String(r.stack).split('\n').slice(0, 3).join(' | ').slice(0, 300) : '' });
  });
  ['error', 'warn'].forEach(function (niva) {
    var orig = console[niva];
    console[niva] = function () {
      try {
        logga('konsol-' + niva, { msg: [].slice.call(arguments).map(function (a) {
          return typeof a === 'string' ? a : (a && a.message) || JSON.stringify(a).slice(0, 100);
        }).join(' ').slice(0, 250) });
      } catch (e) {}
      return orig.apply(console, arguments);
    };
  });

  /* ============================================================
     5) 🌐 NÄTANROP (fetch-spegel: url, status, tid)
     ============================================================ */
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      var url = String((input && input.url) || input || '');
      var kort = url.replace(location.origin, '').slice(0, 120);
      var metod = (init && init.method) || 'GET';
      var t0 = Date.now();
      return origFetch.apply(this, arguments).then(function (res) {
        /* logga inte lyckade GET mot egna statiska filer – för brusigt */
        var egen = url.indexOf(location.origin) === 0 || url.indexOf('http') !== 0;
        if (!res.ok || !egen || metod !== 'GET') {
          logga(res.ok ? 'fetch' : 'fetch-FEL',
            { url: kort, metod: metod, status: res.status, ms: Date.now() - t0 });
        }
        return res;
      }).catch(function (err) {
        logga('fetch-KRASCH', { url: kort, metod: metod, fel: String(err).slice(0, 120), ms: Date.now() - t0 });
        throw err;
      });
    };
  }

  /* Publikt API för andra moduler: __MK_LOGG.notera('spara', {...}) */
  window.__MK_LOGG = {
    notera: function (typ, data) { logga(typ, data || {}); },
    hamta: function () { return buffert.slice(); },
    rensa: function () { buffert = []; try { localStorage.removeItem(NYCKEL); } catch (e) {} if (panelEl) ritaPanel(); },
    exportera: exportera
  };

  function exportera() {
    var blob = new Blob([JSON.stringify({
      exporterad: new Date().toISOString(),
      sida: location.href,
      ua: navigator.userAgent,
      poster: buffert
    }, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mk-logg.json';
    a.click();
  }

  /* ============================================================
     📺 FELSÖKNINGSPANEL (?logg=1 eller tryck L 5 ggr snabbt)
     ============================================================ */
  var panelEl = null;

  function ritaPanel() {
    if (!panelEl) return;
    var lista = panelEl.querySelector('#mklg-lista');
    var filter = panelEl.querySelector('#mklg-filter').value;
    var poster = buffert.slice(-120).reverse().filter(function (p) {
      return filter === 'alla' || (filter === 'fel' ? /FEL|KRASCH/i.test(p.typ) : p.typ === filter);
    });
    lista.innerHTML = poster.map(function (p) {
      var farg = /FEL|KRASCH/i.test(p.typ) ? '#e74c3c' : p.typ === 'klick' ? '#3498db' :
                 p.typ === 'sida' ? '#27ae60' : p.typ.indexOf('fetch') === 0 ? '#e67e22' : '#95a5a6';
      return '<div style="border-left:3px solid ' + farg + ';padding:2px 6px;margin-bottom:2px;background:rgba(255,255,255,.04);">' +
        '<span style="opacity:.55;">' + p.t + '</span> <b style="color:' + farg + ';">' + p.typ + '</b> ' +
        '<span style="opacity:.85;">' + escapeHtml(JSON.stringify(p.d)).slice(0, 160) + '</span></div>';
    }).join('') || '<div style="opacity:.5;padding:8px;">Inga poster (filter: ' + filter + ')</div>';
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function visaPanel() {
    if (panelEl) { panelEl.remove(); panelEl = null; return; }
    panelEl = document.createElement('div');
    panelEl.id = 'mk-loggpanel';
    panelEl.className = 'no-print';
    panelEl.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:45vh;z-index:9999;' +
      'background:#1a252f;color:#ecf0f1;font:11px/1.5 Consolas,Menlo,monospace;' +
      'border-top:3px solid #e67e22;display:flex;flex-direction:column;box-shadow:0 -8px 30px rgba(0,0,0,.5);';
    panelEl.innerHTML =
      '<div style="display:flex;gap:6px;align-items:center;padding:6px 10px;background:#22303c;flex-wrap:wrap;">' +
        '<b style="font-size:12px;">📼 Svarta lådan</b>' +
        '<span style="opacity:.6;">' + buffert.length + ' poster</span>' +
        '<select id="mklg-filter" style="background:#1a252f;color:#ecf0f1;border:1px solid #3d4d5c;border-radius:6px;padding:3px 6px;font:inherit;">' +
          '<option value="alla">Allt</option><option value="fel">💥 Bara fel</option>' +
          '<option value="klick">👆 Klick</option><option value="input">⌨️ Inmatning</option>' +
          '<option value="fetch-FEL">🌐 Nätfel</option><option value="sida">🧭 Sidor</option></select>' +
        '<button id="mklg-export" style="background:#27ae60;color:#fff;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font:inherit;font-weight:700;">⬇️ Exportera</button>' +
        '<button id="mklg-rensa" style="background:#e74c3c;color:#fff;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font:inherit;font-weight:700;">🗑️ Rensa</button>' +
        '<button id="mklg-stang" style="background:#3d4d5c;color:#fff;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font:inherit;margin-left:auto;">✕</button>' +
      '</div>' +
      '<div id="mklg-lista" style="flex:1;overflow:auto;padding:6px 10px;"></div>' +
      '<div style="padding:4px 10px;background:#22303c;font-size:10px;opacity:.6;">Allt lagras ENDAST lokalt i din webbläsare · lösenord/nycklar loggas aldrig · ⬇️ Exportera och klistra in i chatten för felsökning</div>';
    document.body.appendChild(panelEl);
    panelEl.querySelector('#mklg-filter').addEventListener('change', ritaPanel);
    panelEl.querySelector('#mklg-export').addEventListener('click', exportera);
    panelEl.querySelector('#mklg-rensa').addEventListener('click', function () { window.__MK_LOGG.rensa(); });
    panelEl.querySelector('#mklg-stang').addEventListener('click', visaPanel);
    ritaPanel();
  }

  /* ?logg=1 i adressen → panel direkt */
  if (/[?&]logg=1/.test(location.search)) {
    if (document.body) visaPanel();
    else document.addEventListener('DOMContentLoaded', visaPanel);
  }
  /* Tryck L 5 gånger snabbt (inte i inmatningsfält) → panel */
  var lTryck = [];
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'l' && e.key !== 'L') return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var t = Date.now();
    lTryck = lTryck.filter(function (x) { return t - x < 2000; });
    lTryck.push(t);
    if (lTryck.length >= 5) { lTryck = []; visaPanel(); }
  });
})();
