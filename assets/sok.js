/* ============================================================
   PLATS: /assets/sok.js  (assets-mappen i repo-roten)
   ============================================================
   🔍 GLOBALA SÖKET – Mitt Maskinkök (punkt 148, användarens
   designorder: "global sök högst upp – recept, maskiner och
   ingredienser")
   ============================================================
   · 🔍-knapp läggs i navet på ALLA sidor (egna .topnav på
     startsidan eller injicerade #mk-nav överallt annars)
   · Klick → fullskärmsoverlay med ETT fält som söker samtidigt i:
       📖 recept  (json/recept-index.json, namn ur filnamnet)
       🔧 maskiner (json/maskiner-index.json + maskinfilerna,
                    cachas i sessionStorage 'mk-maskinpark')
       🥫 ingredienser (json/ingredienser.json)
   · Länkbyggen per segment (%2F-regeln) · Esc stänger · ingen
     autostart av något – laddar datan första gången fältet öppnas
   Laddas av site.js på alla sidor. Centralt-principen: EN fil.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_SOK_LOADED) return;
  window.__MK_SOK_LOADED = true;

  var rot = window.__MK_ROT || '';
  var DATA = null;   /* { recept:[], maskiner:[], ingredienser:[] } */

  function lasbart(fil) {
    var n = fil.split('/').pop().replace(/\.(html?|pdf)$/i, '').replace(/[-_]+/g, ' ').trim();
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  function lankSeg(p) { return p.split('/').map(encodeURIComponent).join('/'); }

  async function laddaData() {
    if (DATA) return DATA;
    DATA = { recept: [], maskiner: [], ingredienser: [] };
    try {
      var ri = await (await fetch(rot + 'json/recept-index.json')).json();
      DATA.recept = (ri.recept || []).map(function (r) {
        return { namn: lasbart(r.fil), kat: r.kategori || '', url: rot + 'recept/' + lankSeg(r.fil) };
      });
    } catch (e) {}
    try {
      var park = null;
      try { park = JSON.parse(sessionStorage.getItem('mk-maskinpark')); } catch (e2) {}
      if (!park || !park.length) {
        var ix = await (await fetch(rot + 'json/maskiner-index.json')).json();
        park = (await Promise.all(ix.map(function (f) {
          return fetch(rot + 'json/maskiner/' + f).then(function (r) { return r.json(); })['catch'](function () { return null; });
        }))).filter(Boolean);
        try { sessionStorage.setItem('mk-maskinpark', JSON.stringify(park)); } catch (e3) {}
      }
      DATA.maskiner = park.map(function (m) {
        return { namn: ((m.varumarke || '') + ' ' + (m.modellnamn || '')).trim() || m.namn || m.id,
                 kat: m.typ || '', url: rot + 'maskindatabas.html#' + encodeURIComponent(m.id) };
      });
    } catch (e) {}
    try {
      var db = await (await fetch(rot + 'json/ingredienser.json')).json();
      DATA.ingredienser = (db.ingredienser || []).map(function (p) {
        return { namn: p.namn || p.id, kat: (p.pris_kr_per_kg ? p.pris_kr_per_kg + ' kr/kg' : ''),
                 url: rot + 'ingredienser.html' };
      });
    } catch (e) {}
    return DATA;
  }

  function traffar(q) {
    q = q.toLowerCase();
    function f(lista) {
      return lista.filter(function (x) { return (x.namn + ' ' + x.kat).toLowerCase().indexOf(q) !== -1; }).slice(0, 6);
    }
    return { recept: f(DATA.recept), maskiner: f(DATA.maskiner), ingredienser: f(DATA.ingredienser) };
  }

  function grupp(rubrik, lista) {
    if (!lista.length) return '';
    return '<div style="font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#a5967e;margin:14px 0 6px;">' + rubrik + '</div>' +
      lista.map(function (x) {
        return '<a href="' + x.url + '" style="display:block;padding:11px 14px;margin-bottom:6px;background:#faf8f4;' +
          'border:1px solid #eee2d2;border-radius:10px;text-decoration:none;color:#2c3e50;font-weight:600;">' +
          x.namn + (x.kat ? ' <small style="color:#5f6e70;font-weight:400;">· ' + x.kat + '</small>' : '') + '</a>';
      }).join('');
  }

  function oppna() {
    if (document.getElementById('mk-sok-bg')) return;
    var bg = document.createElement('div');
    bg.id = 'mk-sok-bg';
    bg.className = 'no-print';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(44,62,80,.96);z-index:500;overflow:auto;padding:20px;';
    bg.innerHTML =
      '<div style="max-width:640px;margin:0 auto;font-family:Segoe UI,system-ui,sans-serif;">' +
        '<div style="display:flex;gap:10px;margin-bottom:6px;">' +
          '<input id="mk-sok-in" type="search" placeholder="🔍 Sök recept, maskiner & ingredienser..." autocomplete="off" ' +
            'style="flex:1;padding:15px 18px;border:none;border-radius:12px;font-size:1.05rem;font-family:inherit;">' +
          '<button id="mk-sok-x" aria-label="Stäng sökningen" style="background:rgba(255,255,255,.15);color:#fff;border:none;' +
            'border-radius:12px;padding:0 18px;font-size:1.1rem;font-weight:700;cursor:pointer;">✕</button>' +
        '</div>' +
        '<div id="mk-sok-ut" style="background:#fff;border-radius:14px;padding:6px 16px 14px;min-height:40px;">' +
          '<p style="color:#5f6e70;font-size:.88rem;padding:10px 0;">Skriv minst 2 tecken…</p></div>' +
      '</div>';
    document.body.appendChild(bg);
    var inp = bg.querySelector('#mk-sok-in');
    setTimeout(function () { inp.focus(); }, 80);
    function stang() { bg.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') stang(); }
    document.addEventListener('keydown', esc);
    bg.querySelector('#mk-sok-x').onclick = stang;
    bg.addEventListener('mousedown', function (e) { if (e.target === bg) stang(); });
    inp.addEventListener('input', async function () {
      var q = inp.value.trim();
      var ut = bg.querySelector('#mk-sok-ut');
      if (q.length < 2) { ut.innerHTML = '<p style="color:#5f6e70;font-size:.88rem;padding:10px 0;">Skriv minst 2 tecken…</p>'; return; }
      await laddaData();
      var t = traffar(q);
      var h = grupp('📖 Recept', t.recept) + grupp('🔧 Maskiner', t.maskiner) + grupp('🥫 Ingredienser', t.ingredienser);
      ut.innerHTML = h || '<p style="color:#5f6e70;font-size:.88rem;padding:10px 0;">Inga träffar på "' + q.replace(/</g, '&lt;') + '" 🤔</p>';
    });
  }

  function knapp() {
    var nav = document.getElementById('mk-nav') || document.querySelector('.topnav');
    if (!nav || document.getElementById('mk-sok-btn')) return;
    var b = document.createElement('button');
    b.id = 'mk-sok-btn';
    b.type = 'button';
    b.className = 'no-print';
    b.setAttribute('aria-label', 'Sök på hela sajten');
    b.title = 'Sök recept, maskiner & ingredienser';
    b.textContent = '🔍';
    b.style.cssText = 'margin-left:auto;background:none;border:none;font-size:1.15rem;cursor:pointer;padding:6px 10px;line-height:1;';
    b.onclick = oppna;
    nav.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', knapp);
  else knapp();
})();
