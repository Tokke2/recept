/* ============================================================
   PLATS: /assets/hem.js  (assets-mappen i repo-roten)
   ============================================================
   🏠 STARTSIDAN 2.0 – Mitt Maskinkök  (roadmap 11 + 16)
   ============================================================
   Laddas ENDAST på index.html (site.js). Tre delar, allt ur
   sajtens egen data – inga receptfiler röres:

   1. 🌤️ SÄSONGS-/VÄDERHÄLSNING under sidrubriken:
      väder via open-meteo.com (gratis, ingen nyckel, CORS ✓,
      Kumla-koordinater). Regn → "perfekt bakdag 🍞", sol+varmt →
      "glassväder 🍦", kallt → "grytväder 🍲". Reserv utan väder:
      enbart säsong (månad).
   2. ⭐ VECKANS RECEPT: deterministisk rotation
      (ISO-veckonummer % antal recept = samma för ALLA besökare
      hela veckan). Stort kort med bild/emoji + motivering.
   3. 💰 BILLIGASTE MIDDAGEN JUST NU: alla recepts ingredienser
      matchas mot ingrediensdatabasen (samma logik som kalkylen,
      förenklad) → recept med lägst kr/portion lyfts fram.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_HEM_LOADED) return;
  window.__MK_HEM_LOADED = true;
  if (!/(^|\/)(index\.html)?$/.test(location.pathname.replace(/\/recept\//, '/'))) {
    if (!/index\.html$/.test(location.pathname) && !/\/recept\/?$/.test(location.pathname)) return;
  }

  var root = window.__MK_ROOT || './';

  /* ---------- 1. 🌤️ Säsong + väder ---------- */
  function veckonr(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    return Math.ceil((((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
  }
  function sasongsText(manad) {
    if (manad >= 11 || manad === 0) return '❄️ Vintermys i köket – långkok och bak värmer bäst.';
    if (manad <= 3) return '🌸 Vårkänslor! Dags att väcka bakmaskinen ur vintervilan.';
    if (manad <= 7) return '☀️ Sommar i maskinköket – glass, slush och kalla drinkar!';
    return '🍂 Skördetid! Tomater, äpplen och bär vill bli sylt och sås.';
  }
  function vaderText(kod, temp) {
    if (kod >= 51 && kod <= 99) return '🌧️ Regnigt ute – perfekt bakdag! Sätt igång bakmaskinen. 🍞';
    if (temp >= 22) return '🥵 ' + Math.round(temp) + '° ute – glassväder! CREAMi:n och Frost väntar. 🍦';
    if (temp <= 2) return '🥶 ' + Math.round(temp) + '° ute – grytväder! Långkok i riskokaren värmer. 🍲';
    if (kod <= 1) return '☀️ Solen skiner – men middagen lagar inte sig själv! 😄';
    return '';
  }
  function halsning() {
    var el = document.getElementById('mk-halsning');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mk-halsning';
      el.className = 'no-print';
      el.style.cssText = 'text-align:center;font-size:.95rem;margin:-6px auto 14px;opacity:.92;font-style:italic;';
      var tag = document.querySelector('.hero .tagline');
      if (tag) tag.parentNode.insertBefore(el, tag.nextSibling);
      else return;
    }
    el.textContent = sasongsText(new Date().getMonth());
    /* Väder (Kumla ~59.13N 15.14E) – uppgraderar texten om svar kommer */
    fetch('https://api.open-meteo.com/v1/forecast?latitude=59.13&longitude=15.14&current=temperature_2m,weather_code')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var c = d && d.current;
        if (!c) return;
        var t = vaderText(+c.weather_code, +c.temperature_2m);
        if (t) el.textContent = t;
      })['catch'](function () { /* säsongstexten står kvar */ });
  }

  /* ---------- Läs receptlistan (GitHub API → DOM-parsning) ---------- */
  async function lasRecept() {
    var filer = [];
    try {
      var res = await fetch('https://api.github.com/repos/Tokke2/recept/contents/recept?ref=main');
      if (res.ok) filer = (await res.json())
        .filter(function (i) { return i.type === 'file' && /\.html?$/i.test(i.name); })
        .map(function (i) { return i.name; });
    } catch (e) {}
    var ut = [];
    await Promise.all(filer.map(async function (f) {
      try {
        var html = await (await fetch(root + 'recept/' + encodeURIComponent(f))).text();
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var g = function (n) { var m = doc.querySelector('meta[name="recept:' + n + '"]'); return m ? m.content : ''; };
        if (!g('namn')) return;
        var ingr = [];
        doc.querySelectorAll('.card table tr').forEach(function (tr) {
          var td = tr.querySelectorAll('td');
          if (td.length >= 2) ingr.push({ namn: td[0].textContent.trim(), mangd: td[1].textContent.trim() });
        });
        ut.push({
          fil: f, namn: g('namn'), emoji: g('emoji') || '🍽️',
          beskr: g('beskrivning'), maskiner: g('maskiner'), ingr: ingr,
          port: (function () { var m = g('beskrivning').match(/(\d+)\s*(portioner|port\b|bitar|glas|bullar|klickar)/i); return m ? +m[1] : 0; })()
        });
      } catch (e) {}
    }));
    ut.sort(function (a, b) { return a.namn.localeCompare(b.namn, 'sv'); });
    return ut;
  }

  /* ---------- Förenklad priskalkyl (samma anda som kalkyl.js) ---------- */
  var UNITS = { g: 1, kg: 1000, l: 1000, dl: 100, cl: 10, ml: 1, msk: 15, tsk: 5, krm: 1 };
  function gram(mangd) {
    var s = String(mangd).toLowerCase().replace(',', '.');
    var m = s.match(/([\d.]+)\s*(kg|g|dl|cl|ml|l|msk|tsk|krm)\b/);
    if (!m) return null;
    return parseFloat(m[1]) * UNITS[m[2]];
  }
  function norm(s) {
    return String(s).toLowerCase().replace(/\([^)]*\)/g, '')
      .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
      .replace(/[^a-z0-9%]+/g, ' ').trim();
  }
  function pris(recept, db) {
    var kr = 0, traff = 0;
    recept.ingr.forEach(function (r) {
      var n = norm(r.namn);
      if (!n) return;
      var bast = null, poang = 0;
      db.forEach(function (d) {
        var dn = norm(d.namn), p = 0;
        if (dn === n) p = 3;
        else if (n.indexOf(dn) === 0 || dn.indexOf(n) === 0) p = 2;
        else {
          var dw = dn.split(' ').filter(function (w) { return w.length > 2; });
          if (dw.length && dw.every(function (w) { return (' ' + n + ' ').indexOf(' ' + w + ' ') !== -1; })) p = 1;
        }
        if (p > poang) { poang = p; bast = d; }
      });
      var g = gram(r.mangd);
      if (bast && g) { kr += g / 1000 * (+bast.pris_kr_per_kg || 0); traff++; }
    });
    if (traff < 2 || !recept.port) return null;
    return kr / recept.port;
  }

  /* ---------- Bygg sektionen ---------- */
  function kort(r, rubrik, motivering, farg) {
    return '<a href="recept/' + encodeURIComponent(r.fil) + '" style="display:flex;gap:16px;align-items:center;' +
      'background:#fff;border-radius:14px;padding:18px 20px;text-decoration:none;color:#2c3e50;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.07);border-left:5px solid ' + farg + ';flex:1;min-width:260px;">' +
      '<span style="font-size:2.6rem;flex-shrink:0;">' + r.emoji + '</span>' +
      '<span><b style="font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:' + farg + ';">' + rubrik + '</b>' +
      '<br><b style="font-size:1.05rem;">' + r.namn + '</b>' +
      '<br><span style="font-size:.82rem;color:#7f8c8d;">' + motivering + '</span></span></a>';
  }

  async function byggSektion() {
    var recept = await lasRecept();
    if (!recept.length) return;

    var v = veckonr(new Date());
    var veckans = recept[v % recept.length];

    var billigast = null, lagst = Infinity;
    try {
      var db = (await (await fetch(root + 'json/ingredienser.json', { cache: 'no-store' })).json()).ingredienser || [];
      recept.forEach(function (r) {
        var p = pris(r, db);
        if (p !== null && p < lagst) { lagst = p; billigast = r; }
      });
    } catch (e) {}

    var sek = document.createElement('section');
    sek.id = 'mk-hem2';
    sek.className = 'no-print';
    sek.style.cssText = 'margin:26px 0 0;';
    var h = '<div style="display:flex;flex-wrap:wrap;gap:14px;">';
    h += kort(veckans, '⭐ Veckans recept (v.' + v + ')',
      'Veckans lyft ur samlingen – nytt varje måndag!', '#e67e22');
    if (billigast && billigast !== veckans) {
      h += kort(billigast, '💰 Billigast just nu',
        'ca ' + lagst.toLocaleString('sv-SE', { maximumFractionDigits: 2 }) + ' kr/portion med dagens priser', '#27ae60');
    }
    h += '</div>';
    sek.innerHTML = h;

    /* EFTER huvudkorten (main-cards har negativ marginal som annars
       lägger sig ÖVER sektionen – "inget ska gömmas bakom annat") */
    var mc = document.querySelector('.main-cards');
    if (mc && mc.parentNode) mc.parentNode.insertBefore(sek, mc.nextSibling);
    else {
      var hero = document.querySelector('.hero');
      if (hero && hero.parentNode) hero.parentNode.insertBefore(sek, hero.nextSibling);
    }
  }

  function start() { halsning(); byggSektion(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
