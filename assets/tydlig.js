/* ============================================================
   PLATS: /assets/tydlig.js  (assets-mappen i repo-roten)
   ============================================================
   ✨ TYDLIGARE RECEPT – Mitt Maskinkök
   ============================================================
   Två delar, båda helt centrala (inga receptfiler röres):

   1) 📊 SNABB-ÖVERSIKT: faktarad direkt under rubrikbandet med
      allt viktigt på 2 sekunder:
        ⏱️ maskintid (summeras ur json/energi.json)
        🍽️ portioner (ur recept:beskrivning, som kalkylen)
        💰 kr/portion + 🔥 kcal/portion (ur live-kalkylen när den
           räknat klart – fylls på automatiskt)
        🥣 antal steg · 🔧 antal maskiner

   2) 🔥 STEG-MARKERING: tider, temperaturer och mängder i steg-
      texterna markeras automatiskt så ögat hittar dem direkt:
        ⏱ tider  (90 min, 45–90 minuter, 30 sek)  → orange pastill
        🌡 temperaturer (200 °C, 400°C)           → röd pastill
        mängder (30 g, 2 dl, 1 msk)               → grön fetstil
      Markeringen görs i webbläsaren med <span class="mk-stegmark">
      – redigera.js packar upp dem i sparad HTML. Pausas i
      redigeringsläget (körs om efteråt).
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_TYDLIG_LOADED) return;
  window.__MK_TYDLIG_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  var root = window.__MK_ROOT || '../';

  /* ============================================================
     DEL 1: 📊 SNABB-ÖVERSIKTEN
     ============================================================ */
  function pill(emoji, text, id) {
    return '<span' + (id ? ' id="' + id + '"' : '') + ' style="display:inline-flex;align-items:center;gap:5px;' +
      'background:#fff;border:1.5px solid #e8e2d8;border-radius:999px;padding:5px 13px;' +
      'font-size:.82rem;font-weight:700;color:#2c3e50;white-space:nowrap;">' + emoji + ' ' + text + '</span>';
  }

  function byggOversikt() {
    if (document.getElementById('mk-oversikt')) return;
    var header = document.querySelector('header');
    if (!header) return;

    var beskr = (document.querySelector('meta[name="recept:beskrivning"]') || {}).content || '';
    var pm = beskr.match(/(\d+)\s*(portioner|port\b|bitar|hundportioner|klickar|glas|pizzor|bullar|burkar)/i);
    var port = pm ? pm[1] + ' ' + pm[2] : '';

    var steg = document.querySelectorAll('.card ol li').length;
    var maskiner = ((document.querySelector('meta[name="recept:maskiner"]') || {}).content || '')
      .split('|').map(function (s) { return s.trim(); }).filter(Boolean);

    var bar = document.createElement('div');
    bar.id = 'mk-oversikt';
    bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:7px;margin:-8px 0 16px;font-family:Segoe UI,system-ui,sans-serif;';
    var h = '';
    h += pill('⏱️', '<span id="mk-ov-tid">räknar…</span>');
    if (port) h += pill('🍽️', port);
    if (steg) h += pill('🥣', steg + ' steg');
    if (maskiner.length) h += pill('🔧', maskiner.length + ' maskin' + (maskiner.length > 1 ? 'er' : ''));
    h += pill('💰', '<span id="mk-ov-kr">…</span>');
    h += pill('🔥', '<span id="mk-ov-kcal">…</span>');
    bar.innerHTML = h;
    header.parentNode.insertBefore(bar, header.nextSibling);

    /* ⏱️ maskintid ur energi.json */
    var fil = decodeURIComponent(location.pathname.split('/').pop());
    fetch(root + 'json/energi.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var el = document.getElementById('mk-ov-tid');
        if (!el) return;
        var poster = (d.recept || {})[fil];
        if (!poster || !poster.length) { el.closest('span').style.display = 'none'; return; }
        var min = 0;
        poster.forEach(function (p) { min += (+p.min || 0); });
        el.textContent = min >= 60
          ? 'ca ' + Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : '') + ' maskintid'
          : 'ca ' + min + ' min maskintid';
      })
      .catch(function () {
        var el = document.getElementById('mk-ov-tid');
        if (el) el.closest('span').style.display = 'none';
      });

    /* 💰🔥 per portion ur kalkylen – vänta in att den räknat klart */
    var portTal = pm ? +pm[1] : 0;
    var forsok = 0;
    (function vantaKalkyl() {
      var tot = window.__MK_KALKYL_TOT;
      var krEl = document.getElementById('mk-ov-kr');
      var kcEl = document.getElementById('mk-ov-kcal');
      if (!krEl || !kcEl) return;
      if (tot && tot.g) {
        if (portTal) {
          krEl.textContent = (tot.kr / portTal).toLocaleString('sv-SE', { maximumFractionDigits: 2 }) + ' kr/portion';
          kcEl.textContent = Math.round(tot.kcal / portTal) + ' kcal/portion';
        } else {
          krEl.textContent = tot.kr.toLocaleString('sv-SE', { maximumFractionDigits: 2 }) + ' kr totalt';
          kcEl.textContent = Math.round(tot.kcal) + ' kcal totalt';
        }
        return;
      }
      if (++forsok < 30) setTimeout(vantaKalkyl, 400);
      else {
        krEl.closest('span').style.display = 'none';
        kcEl.closest('span').style.display = 'none';
      }
    })();
  }

  /* ============================================================
     DEL 2: 🔥 STEG-MARKERING (tider/temperaturer/mängder)
     ============================================================ */
  var MARK = [
    { /* 🌡 temperaturer FÖRST (så "200 °C" inte äts av mängd-regeln) */
      re: /(\d+(?:[.,]\d+)?)\s*°\s*C\b/g,
      css: 'background:#fdecea;color:#c0392b;border:1px solid #f5b7ae;',
      ikon: '🌡'
    },
    { /* ⏱ tider: 90 min, 45–90 minuter, 30 sek, 1–2 timmar, 8 h */
      re: /(\d+(?:[.,]\d+)?(?:\s*[–\-]\s*\d+(?:[.,]\d+)?)?)\s*(minuter|minut|min\b|sekunder|sek\b|timmar|timme|tim\b|h\b)/g,
      css: 'background:#fdf6ee;color:#b9770e;border:1px solid #f0d5ab;',
      ikon: '⏱'
    },
    { /* mängder: 30 g, 2 dl, 1 msk – diskret grön fetstil */
      re: /(\d+(?:[.,]\d+)?(?:\s*[–\-]\s*\d+(?:[.,]\d+)?)?)\s*(kg|gram|g\b|liter|dl|cl|ml|l\b|msk|tsk|krm)/g,
      css: 'color:#1e8449;font-weight:800;',
      ikon: ''
    }
  ];

  function markeraText(text) {
    /* Dela upp i segment och applicera reglerna i prioritetsordning
       utan dubbelmarkering: första regeln som träffar ett avsnitt vinner. */
    var segment = [{ t: text, m: false }];
    MARK.forEach(function (regel) {
      var ny = [];
      segment.forEach(function (seg) {
        if (seg.m) { ny.push(seg); return; }
        var kvar = seg.t, hit;
        regel.re.lastIndex = 0;
        var sista = 0, delar = [];
        while ((hit = regel.re.exec(kvar)) !== null) {
          if (hit.index > sista) delar.push({ t: kvar.slice(sista, hit.index), m: false });
          delar.push({ t: hit[0], m: true, css: regel.css, ikon: regel.ikon });
          sista = hit.index + hit[0].length;
        }
        if (sista < kvar.length) delar.push({ t: kvar.slice(sista), m: false });
        if (!delar.length) delar.push(seg);
        ny = ny.concat(delar);
      });
      segment = ny;
    });
    return segment;
  }

  function markeraSteg() {
    if (document.body.classList.contains('mk-editing')) return;   /* pausa i redigeringsläget */
    document.querySelectorAll('.card ol li').forEach(function (li) {
      if (li.querySelector('.mk-stegmark')) return;   /* redan markerad */
      var walker = document.createTreeWalker(li, window.NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || !/\d/.test(n.nodeValue)) return window.NodeFilter.FILTER_REJECT;
          var p = n.parentNode;
          if (!p || /^(BUTTON|SCRIPT|STYLE)$/.test(p.nodeName)) return window.NodeFilter.FILTER_REJECT;
          if (p.closest && (p.closest('.mk-stegmark') || p.closest('.no-print'))) return window.NodeFilter.FILTER_REJECT;
          return window.NodeFilter.FILTER_ACCEPT;
        }
      });
      var noder = [];
      while (walker.nextNode()) noder.push(walker.currentNode);
      noder.forEach(function (nod) {
        var segment = markeraText(nod.nodeValue);
        if (!segment.some(function (s) { return s.m; })) return;
        var frag = document.createDocumentFragment();
        segment.forEach(function (s) {
          if (!s.m) { frag.appendChild(document.createTextNode(s.t)); return; }
          var span = document.createElement('span');
          span.className = 'mk-stegmark';
          span.setAttribute('data-orig', s.t);
          span.style.cssText = 'border-radius:6px;padding:0 5px;white-space:nowrap;' + s.css;
          span.textContent = (s.ikon ? s.ikon + ' ' : '') + s.t;
          frag.appendChild(span);
        });
        nod.parentNode.replaceChild(frag, nod);
      });
    });
  }

  /* Ta bort markeringar (används av redigeringsläget) */
  window.__MK_STEGMARK_RESET = function () {
    document.querySelectorAll('span.mk-stegmark').forEach(function (s) {
      s.parentNode.replaceChild(document.createTextNode(s.getAttribute('data-orig') || s.textContent), s);
    });
  };
  window.__MK_STEGMARK_KOR = markeraSteg;

  /* ---------- Start (efter att ingrediens.js ev. flyttat steg) ---------- */
  function start() {
    setTimeout(function () { byggOversikt(); markeraSteg(); }, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
