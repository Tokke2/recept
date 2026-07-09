/* ============================================================
   PLATS: /sw.js  (repo-roten – MÅSTE ligga i roten för PWA-scope)
   ============================================================ */
/* ============================================================
   SERVICE WORKER – Mitt Maskinkök (PWA)
   ============================================================
   1) OFFLINE: cachar besökta sidor (network-first).
   2) SJÄLVLÄKNING: om en receptsida saknar
      <script src="../assets/site.js"></script>
      injiceras raden i farten innan sidan visas!
      → Utskrift/delning/kockläge/energi fungerar även för
        recept som laddats upp helt utan raden.
      (Gäller efter första besöket på sajten, när workern
       är aktiv. GitHub Action:en fixar dessutom själva
       filen permanent vid uppladdning.)
   ============================================================ */
const CACHE = 'maskinkok-v2';
const SITE_SNIPPET = '<script src="../assets/site.js"></script>';

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  // Cachea inte externa API:er
  if (url.includes('api.github.com') || url.includes('api.qrserver.com') || url.includes('mymemory.translated.net') || url.includes('translate.googleapis.com')) return;

  const isRecipeHtml = url.includes('/recept/') && url.endsWith('.html');

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (isRecipeHtml) {
          // Läs sidan, injicera site.js om den saknas
          return res.text().then(body => {
            if (!body.includes('assets/site.js')) {
              if (body.includes('</body>')) {
                body = body.replace('</body>', SITE_SNIPPET + '\n</body>');
              } else {
                body += '\n' + SITE_SNIPPET;
              }
            }
            const fixed = new Response(body, {
              status: res.status,
              statusText: res.statusText,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
            caches.open(CACHE).then(c => c.put(e.request, fixed.clone()));
            return fixed;
          });
        }
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
