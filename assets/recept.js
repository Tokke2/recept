/* ============================================================
   PLATS: /assets/recept.js  (assets-mappen i repo-roten)
   ============================================================
   CENTRAL RECEPTMODUL v2 – Mitt Maskinkök
   ============================================================
   Laddas automatiskt av assets/site.js på alla receptsidor.
   (Energikostnad hanteras av assets/energi.js – INTE här.)

   👨‍🍳 KOCKLÄGE v2 – byggs automatiskt av receptets <ol>-steg:
   ✔ Progressbar + stegräknare
   ✔ AUTOMATISKA TIMERS: "50 min" / "30 sek" i stegtexten blir
     klickbara knappar → nedräkning med pip + blinkning
   ✔ 🔊 Uppläsning av steget (svensk röst, perfekt med mjöliga händer)
   ✔ 🧾 Ingredienspanel – kika på ingredienserna utan att lämna steget
   ✔ Svepgester på mobil (vänster/höger)
   ✔ A+/A− textstorlek (sparas)
   ✔ Fortsätt där du var – positionen sparas per recept
   ✔ Skärmen hålls tänd (Wake Lock, återtas när fliken fokuseras)
   ✔ Piltangenter, mellanslag, Escape
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_RECEPT_LOADED) return;
  window.__MK_RECEPT_LOADED = true;

  /* ================== SAMLA STEGEN ================== */
  var steps = [];
  document.querySelectorAll('.card ol li, .machine-step ol li').forEach(function (li) {
    var section = li.closest('.card');
    var heading = section ? ((section.querySelector('h2') || {}).textContent || '') : '';
    steps.push({ text: li.innerHTML, plain: li.textContent, section: heading.trim(), done: false });
  });
  if (!steps.length) return;

  /* ================== INGREDIENSER (för panelen) ================== */
  var ingHTML = '';
  var tables = document.querySelectorAll('.card table');
  for (var ti = 0; ti < tables.length; ti++) {
    var card = tables[ti].closest('.card');
    var h = card && card.querySelector('h2');
    if (h && /ingrediens/i.test(h.textContent)) { ingHTML = tables[ti].outerHTML; break; }
  }

  /* ================== NYCKLAR & LÄGEN ================== */
  var KEY = 'kock-' + location.pathname.split('/').pop();
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  var idx = 0;
  var fontScale = saved.font || 1;
  var overlay = null, wakeLock = null, timerInt = null;

  /* ================== KNAPP ================== */
  /* Exponera kockläget för receptnav-verktygsraden */
  window.__MK_COOK = open;

  /* Kocklägesknappen: 1) verktygsraden om den finns, 2) FAB-menyn (via API,
     inga egna flytande knappar = inga överlapp), 3) sista utväg: egen knapp
     placerad OVANFÖR där FAB/print-knappen bor. */
  var toolbar = document.querySelector('.toolbar');
  if (toolbar) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tool-btn';
    btn.innerHTML = '👨‍🍳 Kockläge';
    btn.addEventListener('click', open);
    toolbar.appendChild(btn);
  } else {
    // Vänta in FAB-menyn (app.js laddas parallellt)
    var tries = 0;
    (function hookFab() {
      if (window.__MK_FAB_ADD) {
        window.__MK_FAB_ADD('cook', '👨‍🍳', 'Kockläge', '#e67e22', open);
      } else if (++tries < 25) {
        setTimeout(hookFab, 200);
      } else {
        // FAB finns inte alls → egen knapp, säkert ovanför print-knappens plats
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'no-print';
        b.innerHTML = '👨‍🍳 Kockläge';
        b.style.cssText = 'position:fixed;bottom:82px;right:22px;z-index:99;background:#e67e22;color:#fff;border:none;border-radius:999px;padding:13px 20px;font-size:.95rem;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);';
        b.addEventListener('click', open);
        document.body.appendChild(b);
      }
    })();
  }

  /* ================== ÖPPNA/STÄNG ================== */
  function open() {
    // Fortsätt där du var?
    idx = 0;
    if (saved.idx > 0 && saved.idx < steps.length) {
      if (confirm('Fortsätta på steg ' + (saved.idx + 1) + ' där du slutade?')) idx = saved.idx;
    }
    overlay = document.createElement('div');
    overlay.className = 'no-print';
    overlay.style.cssText = 'position:fixed;inset:0;background:#2c3e50;color:#fff;z-index:1000;display:flex;flex-direction:column;padding:20px;font-family:inherit;';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    getLock();
    document.addEventListener('keydown', keys);
    document.addEventListener('visibilitychange', relock);
    // Svepgester
    var x0 = null;
    overlay.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    overlay.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (dx < -60) next(); else if (dx > 60) prev();
      x0 = null;
    }, { passive: true });
    render();
  }

  function close() {
    stopTimer();
    stopSpeak();
    if (overlay) overlay.remove();
    overlay = null;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', keys);
    document.removeEventListener('visibilitychange', relock);
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
  }

  function keys(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'Escape') close();
  }
  function next() { if (idx < steps.length - 1) { steps[idx].done = true; idx++; save(); render(); } }
  function prev() { if (idx > 0) { idx--; save(); render(); } }
  function save() { saved.idx = idx; saved.font = fontScale; try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }

  async function getLock() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
  }
  function relock() { if (document.visibilityState === 'visible' && overlay) getLock(); }

  /* ================== TIMERS I STEGTEXT ================== */
  var timerLeft = 0, timerLabel = '';
  function findTimes(plain) {
    var out = [], re = /(\d+(?:[.,]\d+)?)\s*(min|minuter|sek|sekunder|tim|timmar|h)\b/gi, m;
    while ((m = re.exec(plain))) {
      var v = parseFloat(m[1].replace(',', '.'));
      var u = m[2].toLowerCase();
      var sec = u.indexOf('s') === 0 ? v : (u.indexOf('t') === 0 || u === 'h') ? v * 3600 : v * 60;
      if (sec >= 10 && sec <= 86400) out.push({ label: m[0], sec: Math.round(sec) });
    }
    return out.slice(0, 3);
  }
  function startTimer(sec, label) {
    stopTimer();
    timerLeft = sec; timerLabel = label;
    timerInt = setInterval(function () {
      timerLeft--;
      var el = overlay && overlay.querySelector('#cmTimer');
      if (el) el.textContent = '⏱️ ' + fmt(timerLeft) + ' (' + timerLabel + ')';
      if (timerLeft <= 0) {
        stopTimer();
        beep();
        if (overlay) {
          overlay.style.background = '#c0392b';
          setTimeout(function () { if (overlay) overlay.style.background = '#2c3e50'; }, 400);
          setTimeout(function () { if (overlay) overlay.style.background = '#c0392b'; }, 800);
          setTimeout(function () { if (overlay) overlay.style.background = '#2c3e50'; }, 1200);
          var el2 = overlay.querySelector('#cmTimer');
          if (el2) el2.textContent = '⏰ KLART! (' + timerLabel + ')';
        }
      }
    }, 1000);
  }
  function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }
  function fmt(s) {
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' : '') + (m < 10 && h ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x;
  }
  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.3, 0.6].forEach(function (t) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880; g.gain.value = 0.3;
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
      });
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
  }

  /* ================== UPPLÄSNING ================== */
  var speaking = false;
  function speak(text) {
    stopSpeak();
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = document.documentElement.lang === 'sv' || !document.documentElement.lang ? 'sv-SE' : document.documentElement.lang;
      u.rate = 0.95;
      u.onend = function () { speaking = false; paintSpeak(); };
      speechSynthesis.speak(u);
      speaking = true; paintSpeak();
    } catch (e) {}
  }
  function stopSpeak() { try { speechSynthesis.cancel(); } catch (e) {} speaking = false; }
  function paintSpeak() {
    var el = overlay && overlay.querySelector('#cmSpeak');
    if (el) el.textContent = speaking ? '🔇 Tyst' : '🔊 Läs upp';
  }

  /* ================== RENDERING ================== */
  function render() {
    stopTimer(); stopSpeak();
    var s = steps[idx];
    var pct = Math.round(((idx + 1) / steps.length) * 100);
    var times = findTimes(s.plain);

    overlay.innerHTML =
      /* Topprad */
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<span style="opacity:.75;font-size:.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (s.section || 'Steg') + '</span>' +
        '<div style="display:flex;gap:6px;flex-shrink:0;">' +
          '<button id="cmFontM" style="' + miniBtn() + '">A−</button>' +
          '<button id="cmFontP" style="' + miniBtn() + '">A+</button>' +
          (ingHTML ? '<button id="cmIng" style="' + miniBtn() + '">🧾</button>' : '') +
          '<button id="cmClose" style="' + miniBtn() + '">✕</button>' +
        '</div>' +
      '</div>' +
      /* Progress */
      '<div style="background:rgba(255,255,255,.15);border-radius:99px;height:8px;margin-bottom:10px;">' +
        '<div style="background:#27ae60;height:8px;border-radius:99px;width:' + pct + '%;transition:width .3s;"></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;opacity:.75;font-size:.95rem;margin-bottom:10px;">' +
        '<span>Steg ' + (idx + 1) + ' av ' + steps.length + '</span>' +
        '<span id="cmTimer" style="font-weight:700;"></span>' +
      '</div>' +
      /* Steget */
      '<div style="flex:1;display:flex;align-items:center;overflow-y:auto;-webkit-overflow-scrolling:touch;">' +
        '<div style="font-size:calc(clamp(1.5rem,4.5vw,2.5rem)*' + fontScale + ');line-height:1.45;font-weight:600;">' + s.text + '</div>' +
      '</div>' +
      /* Timers + uppläsning */
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;">' +
        times.map(function (t, i) {
          return '<button class="cmT" data-s="' + t.sec + '" data-l="' + t.label + '" style="background:#f39c12;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-size:1rem;font-weight:700;cursor:pointer;">⏱️ Starta ' + t.label + '</button>';
        }).join('') +
        '<button id="cmSpeak" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:10px;padding:10px 16px;font-size:1rem;cursor:pointer;">🔊 Läs upp</button>' +
      '</div>' +
      /* Navigering */
      '<div style="display:flex;gap:12px;">' +
        '<button id="cmPrev" style="flex:1;background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:14px;padding:20px;font-size:1.25rem;font-weight:700;cursor:pointer;' + (idx === 0 ? 'opacity:.3;' : '') + '">←</button>' +
        '<button id="cmNext" style="flex:3;background:#27ae60;color:#fff;border:none;border-radius:14px;padding:20px;font-size:1.25rem;font-weight:700;cursor:pointer;">' +
          (idx === steps.length - 1 ? '✅ Klart!' : 'Nästa →') + '</button>' +
      '</div>' +
      '<div style="text-align:center;opacity:.5;font-size:.8rem;margin-top:8px;">Svep eller piltangenter · skärmen hålls tänd · position sparas</div>' +
      /* Ingredienspanel (dold) */
      (ingHTML ? '<div id="cmIngPanel" style="display:none;position:absolute;inset:56px 16px 16px;background:#fff;color:#2c3e50;border-radius:14px;padding:18px;overflow:auto;z-index:5;box-shadow:0 10px 40px rgba(0,0,0,.5);">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><b>🧾 Ingredienser</b>' +
        '<button id="cmIngClose" style="background:#2c3e50;color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;">✕</button></div>' + ingHTML + '</div>' : '');

    /* Händelser */
    overlay.querySelector('#cmClose').onclick = close;
    overlay.querySelector('#cmPrev').onclick = prev;
    overlay.querySelector('#cmNext').onclick = (idx === steps.length - 1)
      ? function () {
          saved.idx = 0;
          saved.cooked = (saved.cooked || 0) + 1;
          saved.lastCooked = new Date().toISOString().slice(0, 10);
          save(); close();
          var pv = document.getElementById('mk-provenance');
          if (pv) renderProvenance(pv);
        } : next;
    overlay.querySelector('#cmFontP').onclick = function () { fontScale = Math.min(1.6, fontScale + 0.15); save(); render(); };
    overlay.querySelector('#cmFontM').onclick = function () { fontScale = Math.max(0.7, fontScale - 0.15); save(); render(); };
    overlay.querySelector('#cmSpeak').onclick = function () { speaking ? (stopSpeak(), paintSpeak()) : speak(s.plain); };
    overlay.querySelectorAll('.cmT').forEach(function (b) {
      b.onclick = function () { startTimer(+b.dataset.s, b.dataset.l); };
    });
    if (ingHTML) {
      overlay.querySelector('#cmIng').onclick = function () { overlay.querySelector('#cmIngPanel').style.display = 'block'; };
      overlay.querySelector('#cmIngClose').onclick = function () { overlay.querySelector('#cmIngPanel').style.display = 'none'; };
    }
  }

  function miniBtn() {
    return 'background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:10px;padding:9px 13px;font-size:.95rem;font-weight:700;cursor:pointer;';
  }

  /* ============================================================
     #3 PROVENIENSHUVUD – faktarad som i seriösa kokböcker
     "★★★★ · Tillagad 3 ggr · Senast: 2026-07-09 · Verifierad med Midea..."
     Data: localStorage (betyg/tillagningar) + recept:maskiner-metadatan.
     ============================================================ */
  var ratingData = {};
  try { ratingData = JSON.parse(localStorage.getItem('recept-' + location.pathname.split('/').pop()) || '{}'); } catch (e) {}

  function renderProvenance(el) {
    var r = {};
    try { r = JSON.parse(localStorage.getItem('recept-' + location.pathname.split('/').pop()) || '{}'); } catch (e) {}
    var k = {};
    try { k = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    var meta = document.querySelector('meta[name="recept:maskiner"]');
    var machines = meta ? meta.content.split('|').map(function (s) {
      var p = s.split('·')[0]; return p.replace(/^[^:]*:/, '').trim();
    }).filter(Boolean) : [];
    var uniq = machines.filter(function (v, i) { return machines.indexOf(v) === i; });

    var parts = [];
    parts.push(r.rating ? '<span style="color:#f1c40f;letter-spacing:2px;">' + '★'.repeat(r.rating) + '</span>' : '<span style="opacity:.55;">Ej betygsatt</span>');
    parts.push(k.cooked ? 'Tillagad <b>' + k.cooked + '</b> ' + (k.cooked === 1 ? 'gång' : 'ggr') : 'Ännu inte provlagad');
    if (k.lastCooked) parts.push('Senast: ' + k.lastCooked);
    if (uniq.length) parts.push('Verifierad med <b>' + uniq.join('</b>, <b>') + '</b>');

    el.innerHTML = '<span style="font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#a5967e;display:block;margin-bottom:4px;">Ur Maskinkökets samling</span>' +
      parts.join('<span style="opacity:.35;margin:0 8px;">·</span>');
  }

  (function initProvenance() {
    var header = document.querySelector('header');
    if (!header) return;
    var bar = document.createElement('div');
    bar.id = 'mk-provenance';
    bar.className = 'card';
    bar.style.cssText = 'font-size:.88rem;padding:14px 20px;border-top:3px double #c9b99a;border-bottom:3px double #c9b99a;border-radius:10px;';
    header.parentNode.insertBefore(bar, header.nextSibling);
    renderProvenance(bar);
  })();

  /* ============================================================
     #9 RELATERADE RECEPT – "samma maskin" + "liknande taggar"
     Byggs automatiskt av övriga recepts metadata. Cachas per session.
     ============================================================ */
  (async function related() {
    var myFile = decodeURIComponent(location.pathname.split('/').pop());
    var all = null;
    try { all = JSON.parse(sessionStorage.getItem('mk-related')); } catch (e) {}

    if (!all) {
      var files = [];
      try {
        var parts = location.pathname.split('/').filter(Boolean);
        var user = location.hostname.split('.')[0];
        var repo = parts.length > 1 ? parts[0] : user + '.github.io';
        var res = await fetch('https://api.github.com/repos/' + user + '/' + repo + '/contents/recept?ref=main');
        if (res.ok) files = (await res.json())
          .filter(function (i) { return i.type === 'file' && /\.html?$/i.test(i.name); })
          .map(function (i) { return i.name; });
      } catch (e) {}
      all = [];
      for (var i = 0; i < files.length; i++) {
        try {
          var html = await (await fetch('../recept/' + encodeURIComponent(files[i]))).text();
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var g = function (n) { var el = doc.querySelector('meta[name="recept:' + n + '"]'); return el ? el.content : ''; };
          all.push({
            file: files[i],
            namn: g('namn') || files[i].replace(/\.html$/i, ''),
            emoji: g('emoji') || '🍽️',
            maskiner: g('maskiner'),
            taggar: g('taggar').toLowerCase().split(',').map(function (t) { return t.trim(); }).filter(Boolean)
          });
        } catch (e) {}
      }
      try { sessionStorage.setItem('mk-related', JSON.stringify(all)); } catch (e) {}
    }

    var meMeta = document.querySelector('meta[name="recept:maskiner"]');
    var meTagsEl = document.querySelector('meta[name="recept:taggar"]');
    var meMask = (meMeta ? meMeta.content : '').toLowerCase();
    var meTags = meTagsEl ? meTagsEl.content.toLowerCase().split(',').map(function (t) { return t.trim(); }) : [];
    var others = all.filter(function (r) { return r.file !== myFile; });
    if (!others.length) return;

    // Samma maskin: dela på maskinnamn (grov matchning per ord >3 tecken)
    function sharesMachine(r) {
      var words = meMask.split(/[^a-zåäö0-9-]+/i).filter(function (w) { return w.length > 3; });
      return words.some(function (w) { return r.maskiner.toLowerCase().indexOf(w) !== -1; });
    }
    function sharedTags(r) {
      return r.taggar.filter(function (t) { return meTags.indexOf(t) !== -1; }).length;
    }

    var same = others.filter(sharesMachine).slice(0, 4);
    var similar = others.filter(function (r) { return sharedTags(r) > 0 && same.indexOf(r) === -1; })
      .sort(function (a, b) { return sharedTags(b) - sharedTags(a); }).slice(0, 4);
    if (!same.length && !similar.length) return;

    function chip(r) {
      return '<a href="' + encodeURIComponent(r.file) + '" style="display:inline-flex;align-items:center;gap:6px;background:#f0ebe3;border-radius:999px;padding:8px 16px;margin:3px 4px 3px 0;text-decoration:none;color:#2c3e50;font-size:.87rem;font-weight:600;">' + r.emoji + ' ' + r.namn + '</a>';
    }

    var box = document.createElement('div');
    box.className = 'card no-print';
    box.innerHTML = '<h2 style="font-size:1.05rem;margin-bottom:8px;">📚 Se även</h2>' +
      (same.length ? '<div style="font-size:.8rem;color:#7f8c8d;margin:6px 0 2px;">Fler recept för samma maskin:</div>' + same.map(chip).join('') : '') +
      (similar.length ? '<div style="font-size:.8rem;color:#7f8c8d;margin:10px 0 2px;">Liknande recept:</div>' + similar.map(chip).join('') : '');
    var footer = document.querySelector('footer');
    if (footer) footer.parentNode.insertBefore(box, footer);
    else document.body.appendChild(box);
  })();

})();
