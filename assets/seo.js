/* ============================================================
   PLATS: /assets/seo.js  (assets-mappen i repo-roten)
   ============================================================
   SEO-MODUL – Mitt Maskinkök
   ============================================================
   Central sökmotoroptimering för ALLA sidor (Google kör JavaScript,
   så injicerade taggar räknas). Inga sidfiler behöver ändras:

   · <link rel="canonical">  – rätt adress, inga dubbletter
   · Meta description        – på recept: ur recept:beskrivning
   · Open Graph + Twitter    – snygga delningskort (FB/X/Discord)
   · JSON-LD Recipe-schema   – ⭐ RIKA RESULTAT i Google: bild,
     betyg, tid, kalorier direkt i sökträffen! Byggs automatiskt
     ur receptets metadata + ingredienstabell + steg.
   · JSON-LD WebSite-schema  – på startsidan (sitelinks-sökruta)
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_SEO_LOADED) return;
  window.__MK_SEO_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  var root = window.__MK_ROOT || (isRecipePage ? '../' : './');

  function meta(n) {
    var el = document.querySelector('meta[name="recept:' + n + '"]');
    return el ? el.content : '';
  }
  function addMeta(attr, name, content) {
    if (!content) return;
    if (document.querySelector('meta[' + attr + '="' + name + '"]')) return;
    var m = document.createElement('meta');
    m.setAttribute(attr, name);
    m.setAttribute('content', content);
    document.head.appendChild(m);
  }

  /* ---------- 1) Canonical ---------- */
  if (!document.querySelector('link[rel="canonical"]')) {
    var c = document.createElement('link');
    c.rel = 'canonical';
    c.href = location.origin + location.pathname;
    document.head.appendChild(c);
  }

  /* ---------- 2) Description + Open Graph + Twitter ---------- */
  var titel = document.title;
  var beskr = meta('beskrivning') ||
    (document.querySelector('meta[name="description"]') || {}).content || '';
  var bildUrl = '';
  var hero = document.querySelector('.hero-img');
  if (hero && hero.getAttribute('src')) {
    bildUrl = new URL(hero.getAttribute('src'), location.href).href;
  }
  if (isRecipePage && beskr) addMeta('name', 'description', beskr);
  addMeta('property', 'og:title', titel);
  addMeta('property', 'og:description', beskr);
  addMeta('property', 'og:type', isRecipePage ? 'article' : 'website');
  addMeta('property', 'og:url', location.origin + location.pathname);
  addMeta('property', 'og:site_name', 'Mitt Maskinkök');
  addMeta('property', 'og:locale', 'sv_SE');
  if (bildUrl) addMeta('property', 'og:image', bildUrl);
  addMeta('name', 'twitter:card', bildUrl ? 'summary_large_image' : 'summary');
  addMeta('name', 'twitter:title', titel);
  addMeta('name', 'twitter:description', beskr);
  if (bildUrl) addMeta('name', 'twitter:image', bildUrl);

  /* ---------- 3) JSON-LD ---------- */
  function inject(obj) {
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }

  if (isRecipePage) {
    /* Recipe-schema ur sidans innehåll (körs när tabellen är klar) */
    setTimeout(function () {
      var ings = [];
      document.querySelectorAll('.mk-ing2 tr[data-namn]').forEach(function (tr) {
        var m = tr.getAttribute('data-mangd') || '';
        ings.push((m ? m + ' ' : '') + tr.getAttribute('data-namn'));
      });
      var steg = [];
      document.querySelectorAll('.card ol li').forEach(function (li) {
        var t = li.textContent.trim();
        if (t) steg.push({ '@type': 'HowToStep', text: t });
      });
      var kcal = '';
      var kalkyl = document.getElementById('mk-kalkyl');
      if (kalkyl) {
        /* Per portion-cellen (sista td på Kcal-raden), annars total */
        var kcalRow = Array.prototype.find.call(kalkyl.querySelectorAll('tr'), function (tr) {
          return /Kcal/i.test(tr.textContent);
        });
        if (kcalRow) {
          var tds = kcalRow.querySelectorAll('td');
          var v = (tds[tds.length - 1] || {}).textContent || '';
          kcal = v.replace(/[^\d]/g, '');
        }
      }
      var portioner = '';
      var pm = beskr.match(/(\d+)\s*(portioner|bitar|st)/i);
      if (pm) portioner = pm[1];

      var recipe = {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: meta('namn') || titel.replace(/ – Recept.*$/, ''),
        description: beskr,
        recipeIngredient: ings,
        recipeInstructions: steg,
        keywords: meta('taggar'),
        inLanguage: 'sv',
        author: { '@type': 'Person', name: 'Mitt Maskinkök' },
        url: location.origin + location.pathname
      };
      if (bildUrl) recipe.image = [bildUrl];
      if (portioner) recipe.recipeYield = portioner + ' portioner';
      if (kcal) recipe.nutrition = { '@type': 'NutritionInformation', calories: kcal + ' kcal' };

      /* Betyg (om röster finns via betyg.js) */
      if (window.__MK_BETYG) {
        window.__MK_BETYG.get(location.pathname.split('/').pop()).then(function (g) {
          if (g && g.count > 0) {
            recipe.aggregateRating = {
              '@type': 'AggregateRating',
              ratingValue: Math.round(g.avg * 10) / 10,
              ratingCount: g.count
            };
          }
          inject(recipe);
        })['catch'](function () { inject(recipe); });
      } else {
        inject(recipe);
      }
    }, 900);
  } else if (/(index\.html)?$/.test(location.pathname.split('/').pop() || '')) {
    inject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Mitt Maskinkök',
      description: beskr,
      url: location.origin + (window.__MK_ROOT === './' ? location.pathname : '/recept/'),
      inLanguage: 'sv'
    });
  }
})();
