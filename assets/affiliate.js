/* ============================================================
   PLATS: /assets/affiliate.js  (assets-mappen i repo-roten)
   ============================================================
   AMAZON-AFFILIATE – Mitt Maskinkök
   ============================================================
   Central modul (laddas av site.js på alla sidor):

   · Läser json/affiliate.json → "amazon_tag" (Associates Store ID)
   · Skriver om ALLA amazon.se-länkar på sidan till affiliatelänkar
     (?tag=DIN-TAG) – även länkar som skapas senare (MutationObserver)
   · Märker länkarna "(betald länk)" – krav från Konsumentverket
   · Visar Amazons obligatoriska text i sidfoten:
     "Som Amazon-associate tjänar jag pengar på kvalificerade köp."

   Tom tag = modulen gör INGENTING (vanliga länkar, ingen text).
   Ett ställe att ändra på: json/affiliate.json. Inga maskin- eller
   receptfiler behöver röras – länkarna i json/maskiner/ lämnas
   orörda i källan och taggas i webbläsaren.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_AFF_LOADED) return;
  window.__MK_AFF_LOADED = true;

  var self = document.currentScript || document.querySelector('script[src*="affiliate.js"]');
  var base = self ? self.getAttribute('src').replace(/assets\/affiliate\.js.*$/, '') : './';

  var TAG = '';

  function tagUrl(url) {
    try {
      var u = new URL(url, location.href);
      if (!/(^|\.)amazon\.se$/i.test(u.hostname)) return null;
      if (u.searchParams.get('tag') === TAG) return null;   /* redan taggad */
      u.searchParams.set('tag', TAG);
      return u.href;
    } catch (e) { return null; }
  }

  function markLink(a) {
    var t = tagUrl(a.href);
    if (!t) return;
    a.href = t;
    a.rel = 'sponsored noopener';
    /* "(betald länk)" – tydligt men diskret, endast en gång per länk */
    if (!a.querySelector('.mk-aff-note') && !/betald länk/i.test(a.textContent)) {
      var s = document.createElement('span');
      s.className = 'mk-aff-note';
      s.textContent = ' (betald länk)';
      s.style.cssText = 'font-size:.78em;opacity:.65;font-weight:400;';
      a.appendChild(s);
    }
  }

  function sweep() {
    document.querySelectorAll('a[href*="amazon.se"]').forEach(markLink);
  }

  function disclosure() {
    if (document.getElementById('mk-aff-disclosure')) return;
    var el = document.createElement('div');
    el.id = 'mk-aff-disclosure';
    el.className = 'no-print';
    /* HÖGST UPP på sidan (Amazons riktlinje: tydligt avslöjande nära
       länkarna, inte gömt i sidfoten) – diskret men synlig rad. */
    el.style.cssText = 'text-align:center;padding:7px 16px;font-size:.74rem;color:#8a7a60;' +
      'background:#faf7f2;border-bottom:1px solid #eee5d6;font-family:Segoe UI,system-ui,sans-serif;';
    el.textContent = 'Som Amazon-associate tjänar jag pengar på kvalificerade köp.';
    var nav = document.getElementById('mk-nav');
    if (nav && nav.parentNode) nav.parentNode.insertBefore(el, nav.nextSibling);
    else document.body.insertBefore(el, document.body.firstChild);
  }

  fetch(base + 'json/affiliate.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      TAG = String(d.amazon_tag || '').trim();
      if (!TAG) return;                       /* av – gör ingenting */
      sweep();
      if (d.visa_disclosure !== false) disclosure();
      /* Länkar som byggs senare (maskindatabasen renderar via JS) */
      new MutationObserver(function () { sweep(); })
        .observe(document.body, { childList: true, subtree: true });
    })['catch'](function () {});
})();
