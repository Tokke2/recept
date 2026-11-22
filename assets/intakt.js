/* ============================================================
   PLATS: /assets/intakt.js  (assets-mappen i repo-roten)
   ============================================================
   💰 KÖPKLICKS-RÄKNAREN – Mitt Maskinkök (SPEC 250, ägarens
   order 2026-11-16: "robot som genererar intäkt", del B)
   ============================================================
   Räknar klick på köplänkar (Amazon-knappar och butiksknappar
   .link-btn) – helt anonymt via Abacus-räknaren, precis som
   besöksräknaren i site.js:

   · kop-total          = alla köpklick på sajten
   · kop-<maskin-id>    = klick per maskin (id ur närmaste
                          kort: [data-id] eller id="card-<id>")

   Visas ENDAST i adminpanelen (💰 Intäktsrapporten) – aldrig
   publikt. Räknar bara på tokke2.github.io (aldrig tester/
   förhandsvisningar, samma regel som besöksräknaren).
   Ingen cookie, ingen personinfo – bara en siffra som ökar.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_INTAKT_LOADED) return;
  window.__MK_INTAKT_LOADED = true;
  if (location.hostname !== 'tokke2.github.io') return;   /* räkna aldrig test/preview */

  var API = 'https://abacus.jasoncameron.dev/hit/mitt-maskinkok-tokke2/';

  function slugga(x) {
    return String(x).toLowerCase().replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 50);
  }

  function pinga(key) {
    /* keepalive → räkningen överlever att fliken navigerar till butiken */
    try { fetch(API + key, { keepalive: true }).catch(function () {}); } catch (e) {}
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target;
    var a = el && el.closest ? el.closest('a') : null;
    if (!a || !a.href) return;
    var arKop = /(^|\.)amazon\./i.test((a.hostname || '')) ||
                /\blink-btn\b/.test(a.className || '');
    if (!arKop) return;
    /* maskin-id ur närmaste kort: galleriet ([data-id]) eller
       maskinkortet (id="card-<id>") – saknas båda räknas bara totalen */
    var id = '';
    var k1 = a.closest('[data-id]');
    if (k1) id = k1.getAttribute('data-id') || '';
    if (!id) {
      var k2 = a.closest('[id^="card-"]');
      if (k2) id = k2.id.slice(5);
    }
    pinga('kop-total');
    if (id) pinga('kop-' + slugga(id));
  }, true);
})();
