/* ============================================================
   PLATS: /sw.js  (repo-roten – MÅSTE ligga i roten för PWA-scope)
   ============================================================
   SERVICE WORKER v2 – Mitt Maskinkök (RECEPTFOKUS)
   ============================================================
   Allt är optimerat för att RECEPTEN ska fungera 500%:

   1) RECEPT OFFLINE-FÖRST:
      - Besökta recept (.html OCH .pdf) cachas → fungerar i köket
        även utan nät.
      - assets/ (site.js, print.css, kockläge, energi...) cachas
        vid installation → även ett recept du INTE besökt förut
        får alla moduler offline.
   2) SJÄLVLÄKNING: recept-HTML som saknar site.js-raden lagas
      i farten innan sidan visas (utskrift/delning/kockläge/
      energi fungerar även för "nakna" recept).
   3) SNABBHET: stale-while-revalidate för recept & assets –
      visar cachad version DIREKT (0 ms) och uppdaterar cachen
      i bakgrunden till nästa besök.
   4) Bilder cachas (images/recept/ prioriteras), externa API:er
      cachas aldrig.
   ============================================================ */
'use strict';

const VERSION = 'maskinkok-v35';
const CACHE_CORE = VERSION + '-core';     // assets + startsida (förcachas)
const CACHE_PAGES = VERSION + '-pages';   // recept & övriga sidor
const CACHE_IMG = VERSION + '-img';       // bilder

const SITE_SNIPPET = '<script src="../assets/site.js"></script>';

/* Kärnfiler som förcachas vid installation → recepten har alltid
   sina moduler offline, även vid första receptbesöket. */
const CORE = [
  './',
  'index.html',
  'assets/site.js',
  'assets/print.css',
  'assets/print.js',
  'assets/app.js',
  'assets/recept.js',
  'assets/receptnav.js',
  'assets/redigera.js',
  'assets/energi.js',
  'assets/sprak.js',
  'assets/betyg.js',
  'assets/maskinmatch.js',
  'assets/kokbok.js',
  'assets/spara.js',
  'assets/ingrediens.js',
  'assets/affiliate.js',
  'assets/kalkyl.js',
  'json/donation.json',
  'json/affiliate.json',
  'json/maskindatabas.json',
  'json/energi.json',
  'json/maskiner-index.json',
  'manifest.json'
];

/* Externa tjänster som ALDRIG cachas (alltid live, failar tyst) */
const NEVER_CACHE = [
  'api.github.com',
  'api.qrserver.com',
  'mymemory.translated.net',
  'translate.googleapis.com',
  'abacus.jasoncameron.dev',
  'mpc.getswish.net'
];

/* ================= INSTALL: förcacha kärnan ================= */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_CORE)
      .then(c => Promise.allSettled(CORE.map(u => c.add(u)))) // enskilda missar fäller inte installationen
      .then(() => self.skipWaiting())
  );
});

/* ================= ACTIVATE: städa gamla versioner ================= */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ================= FETCH ================= */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  if (NEVER_CACHE.some(h => url.includes(h))) return;

  const isRecipeHtml = url.includes('/recept/') && /\.html?(\?|$)/i.test(url);
  const isRecipePdf  = url.includes('/recept/') && /\.pdf(\?|$)/i.test(url);
  const isAsset      = url.includes('/assets/') || url.includes('/json/');
  const isImage      = /\.(jpe?g|png|webp|gif|svg|ico)(\?|$)/i.test(url);

  /* ---------- RECEPT-HTML: stale-while-revalidate + självläkning ---------- */
  if (isRecipeHtml) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const network = fetch(e.request)
          .then(res => healAndCache(e.request, res))
          .catch(() => null);
        // Cachad version visas DIREKT (0 ms); nätet uppdaterar i bakgrunden
        return cached || network.then(r => r || offlineFallback());
      })
    );
    return;
  }

  /* ---------- RECEPT-PDF: cache-först (stora filer, ändras sällan) ---------- */
  if (isRecipePdf) {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(res => {
          if (res.ok) putIn(CACHE_PAGES, e.request, res.clone());
          return res;
        }).catch(() => offlineFallback())
      )
    );
    return;
  }

  /* ---------- ASSETS & JSON: stale-while-revalidate ---------- */
  if (isAsset) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const network = fetch(e.request).then(res => {
          if (res.ok) putIn(CACHE_CORE, e.request, res.clone());
          return res;
        }).catch(() => null);
        return cached || network.then(r => r || new Response('', { status: 504 }));
      })
    );
    return;
  }

  /* ---------- BILDER: cache-först ---------- */
  if (isImage) {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(res => {
          if (res.ok) putIn(CACHE_IMG, e.request, res.clone());
          return res;
        }).catch(() => new Response('', { status: 404 }))
      )
    );
    return;
  }

  /* ---------- ÖVRIGT (startsida m.m.): network-först med cache-reserv ---------- */
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) putIn(CACHE_PAGES, e.request, res.clone());
        return res;
      })
      .catch(() => caches.match(e.request).then(c => c || offlineFallback()))
  );
});

/* ================= HJÄLPARE ================= */

/* Självläkning: injicera site.js i recept som saknar den, cachea sedan */
function healAndCache(request, res) {
  if (!res || !res.ok) return res;
  return res.text().then(body => {
    if (!body.includes('assets/site.js')) {
      body = body.includes('</body>')
        ? body.replace('</body>', SITE_SNIPPET + '\n</body>')
        : body + '\n' + SITE_SNIPPET;
    }
    const fixed = new Response(body, {
      status: res.status,
      statusText: res.statusText,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
    putIn(CACHE_PAGES, request, fixed.clone());
    return fixed;
  });
}

function putIn(cacheName, request, response) {
  caches.open(cacheName).then(c => c.put(request, response)).catch(() => {});
}

/* Snygg offline-sida i sajtens design (istället för webbläsarens felsida) */
function offlineFallback() {
  return new Response(
    '<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Offline – Mitt Maskinkök</title><style>' +
    'body{font-family:Segoe UI,system-ui,sans-serif;background:#f6f3ee;color:#2c3e50;' +
    'display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;}' +
    '.box{background:#fff;border-radius:20px;padding:40px;text-align:center;max-width:420px;' +
    'box-shadow:0 12px 32px rgba(0,0,0,.14);}' +
    '.e{font-size:4rem;margin-bottom:12px;}h1{font-size:1.4rem;margin:0 0 8px;}' +
    'p{color:#7f8c8d;font-size:.95rem;line-height:1.6;margin:0 0 18px;}' +
    'button{background:#c0392b;color:#fff;border:none;border-radius:12px;padding:13px 26px;' +
    'font-size:1rem;font-weight:700;cursor:pointer;font-family:inherit;}' +
    '</style></head><body><div class="box"><div class="e">📡</div>' +
    '<h1>Ingen anslutning</h1>' +
    '<p>Det här receptet är inte sparat offline än.<br>' +
    'Recept du besökt tidigare fungerar utan nät – öppna dem från startsidan.</p>' +
    '<button onclick="location.reload()">🔄 Försök igen</button></div></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
