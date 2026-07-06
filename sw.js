/* ============================================================
   SERVICE WORKER – Mitt Maskinkök (PWA)
   Cachar besökta sidor så appen fungerar även offline i köket.
   Strategi: network-first (alltid färskt när nät finns),
   cache-fallback (senast sedda version utan nät).
   ============================================================ */
const CACHE = 'maskinkok-v1';

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
  // Cachea inte GitHub API-anrop (ska alltid vara färska, och failar tyst offline)
  if (e.request.url.includes('api.github.com') || e.request.url.includes('api.qrserver.com')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
