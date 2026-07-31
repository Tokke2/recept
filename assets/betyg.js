/* ============================================================
   PLATS: /assets/betyg.js  (assets-mappen i repo-roten)
   ============================================================
   GLOBALT BETYGSSYSTEM – Mitt Maskinkök
   ============================================================
   Alla besökare kan betygsätta recepten (1–5 ★) och alla ser
   samma genomsnitt – utan server, konto eller databas!

   Tekniken: gratis räknar-API:et Abacus (abacus.jasoncameron.dev).
   Per recept lagras två räknare:
     <recept>-sum  = summan av alla stjärnor
     <recept>-cnt  = antal röster
   Genomsnitt = sum / cnt. En röst per webbläsare (localStorage).

   Laddas av site.js på receptsidor OCH på recept.html (listan).
   Exponerar window.__MK_BETYG = { get, getMany, vote, myVote, slug }
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_BETYG) return;

  var API = 'https://abacus.jasoncameron.dev';
  var NS = 'mitt-maskinkok-tokke2';          // namnrymd = unik för denna sajt
  var TTL = 5 * 60 * 1000;                   // cache 5 min (sessionStorage)

  /* ---------- Nyckel av filnamn: "Mjukglass MAX.html" → "mjukglass-max" ---------- */
  function slug(file) {
    return decodeURIComponent(String(file)).split('/').pop()
      .replace(/\.(html?|pdf)$/i, '')
      .toLowerCase()
      .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  /* ---------- Cache ---------- */
  function cGet(k) {
    try {
      var d = JSON.parse(sessionStorage.getItem('mk-betyg:' + k));
      if (d && Date.now() - d.t < TTL) return d;
    } catch (e) {}
    return null;
  }
  function cSet(k, sum, cnt) {
    try { sessionStorage.setItem('mk-betyg:' + k, JSON.stringify({ s: sum, c: cnt, t: Date.now() })); } catch (e) {}
  }

  async function apiGet(key) {
    try {
      var r = await fetch(API + '/get/' + NS + '/' + key);
      if (!r.ok) return 0;                    // 404 = ingen har röstat än
      return (await r.json()).value || 0;
    } catch (e) { return 0; }
  }
  async function apiHit(key) {
    try { await fetch(API + '/hit/' + NS + '/' + key); } catch (e) {}
  }

  /* ---------- Läs betyg för ETT recept → {avg, count} ---------- */
  async function get(file) {
    var k = slug(file);
    var c = cGet(k);
    if (c) return { avg: c.c ? c.s / c.c : 0, count: c.c };
    var res = await Promise.all([apiGet(k + '-sum'), apiGet(k + '-cnt')]);
    cSet(k, res[0], res[1]);
    return { avg: res[1] ? res[0] / res[1] : 0, count: res[1] };
  }

  /* ---------- Läs betyg för MÅNGA recept (recept.html) ---------- */
  async function getMany(files) {
    var out = {};
    await Promise.all(files.map(async function (f) { out[f] = await get(f); }));
    return out;
  }

  /* ---------- Min röst (en per webbläsare) ---------- */
  function myVote(file) {
    try { return +localStorage.getItem('mk-betyg-vote:' + slug(file)) || 0; } catch (e) { return 0; }
  }

  /* ---------- Rösta: n stjärnor (1–5) ---------- */
  async function vote(file, n) {
    n = Math.max(1, Math.min(5, Math.round(n)));
    if (myVote(file)) return false;           // redan röstat i denna webbläsare
    var k = slug(file);
    var jobs = [apiHit(k + '-cnt')];
    for (var i = 0; i < n; i++) jobs.push(apiHit(k + '-sum'));
    await Promise.all(jobs);
    try { localStorage.setItem('mk-betyg-vote:' + k, String(n)); } catch (e) {}
    try { sessionStorage.removeItem('mk-betyg:' + k); } catch (e) {}   // töm cache
    // spara även i receptets gamla lokala data så provenienshuvudet funkar offline
    try {
      var lk = 'recept-' + decodeURIComponent(location.pathname.split('/').pop());
      var d = JSON.parse(localStorage.getItem(lk) || '{}');
      d.rating = n;
      localStorage.setItem(lk, JSON.stringify(d));
    } catch (e) {}
    return true;
  }

  function stars(avg) {
    var full = Math.round(avg);
    var s = '';
    for (var i = 1; i <= 5; i++) {
      s += '<span style="color:' + (i <= full ? '#f1c40f' : '#d8d2c6') + ';">★</span>';
    }
    return s;
  }

  window.__MK_BETYG = { get: get, getMany: getMany, vote: vote, myVote: myVote, slug: slug, stars: stars };

  /* ============================================================
     WIDGET på receptsidor: "⭐ Betygsätt receptet"
     ============================================================ */
  var isRecipePage = location.pathname.indexOf('/recept/') !== -1;
  if (!isRecipePage) return;

  var FILE = decodeURIComponent(location.pathname.split('/').pop());

  var css = document.createElement('style');
  css.textContent =
    '#mk-betyg{margin:26px auto;max-width:820px;text-align:center;}' +
    '#mk-betyg h3{margin:0 0 4px;font-size:1.05rem;}' +
    '#mk-betyg .bstars{font-size:2.2rem;letter-spacing:6px;cursor:pointer;user-select:none;line-height:1.2;}' +
    '#mk-betyg .bstars.done{cursor:default;}' +
    '#mk-betyg .bstars span{color:#d8d2c6;transition:color .1s, transform .1s;display:inline-block;}' +
    '#mk-betyg .bstars span.on{color:#f1c40f;}' +
    '#mk-betyg .bstars:not(.done) span:hover{transform:scale(1.18);}' +
    '#mk-betyg .bsub{font-size:.9rem;color:#7f8c8d;margin-top:4px;}' +
    '@media print{#mk-betyg{display:none!important;}}';
  document.head.appendChild(css);

  function build() {
    var box = document.createElement('div');
    box.id = 'mk-betyg';
    box.className = 'card no-print';
    box.innerHTML =
      '<h3>⭐ Betygsätt receptet</h3>' +
      '<div class="bstars" id="mkBS">' +
        [1,2,3,4,5].map(function (i) { return '<span data-v="' + i + '">★</span>'; }).join('') +
      '</div>' +
      '<div class="bsub" id="mkBSub">Hämtar betyg...</div>';

    var footer = document.querySelector('footer');
    if (footer) footer.parentNode.insertBefore(box, footer);
    else document.body.appendChild(box);

    var wrap = box.querySelector('#mkBS');
    var sub = box.querySelector('#mkBSub');
    var spans = wrap.querySelectorAll('span');
    var mine = myVote(FILE);

    function paint(n) {
      spans.forEach(function (s) { s.classList.toggle('on', +s.dataset.v <= n); });
    }

    function subText(g) {
      var t = g.count
        ? 'Genomsnitt <b>' + g.avg.toFixed(1).replace('.', ',') + '</b> av 5 · ' + g.count + (g.count === 1 ? ' röst' : ' röster')
        : 'Bli först att betygsätta!';
      if (myVote(FILE)) t += ' · Du gav ' + myVote(FILE) + ' ★';
      return t;
    }

    get(FILE).then(function (g) {
      sub.innerHTML = subText(g);
      paint(mine || Math.round(g.avg));
      if (window.__MK_PROV_REFRESH) window.__MK_PROV_REFRESH();
    });

    if (mine) { wrap.classList.add('done'); paint(mine); return; }

    wrap.addEventListener('mouseover', function (e) {
      if (wrap.classList.contains('done') || !e.target.dataset.v) return;
      paint(+e.target.dataset.v);
    });
    wrap.addEventListener('mouseleave', function () {
      if (wrap.classList.contains('done')) return;
      get(FILE).then(function (g) { paint(Math.round(g.avg)); });
    });
    wrap.addEventListener('click', async function (e) {
      var v = +e.target.dataset.v;
      if (!v || wrap.classList.contains('done')) return;
      wrap.classList.add('done');
      paint(v);
      sub.textContent = 'Skickar din röst...';
      await vote(FILE, v);
      var g = await get(FILE);
      sub.innerHTML = subText(g);
      if (window.__MK_TOAST) window.__MK_TOAST('⭐ Tack för ditt betyg: ' + v + ' av 5!');
      if (window.__MK_PROV_REFRESH) window.__MK_PROV_REFRESH();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
