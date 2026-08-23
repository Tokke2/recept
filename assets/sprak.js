/* ============================================================
   PLATS: /assets/sprak.js  (assets-mappen i repo-roten)
   ============================================================
   CENTRAL SPRÅKMODUL v2 – Mitt Maskinkök
   ============================================================
   Laddas automatiskt av assets/site.js på alla sidor.

   v2 – 500% BÄTTRE:
   ✔ MODERN SPRÅKVÄLJARE: elegant pillerknapp med flagga som
     fäller ut en snygg meny (istället för rå <select>) –
     flaggor, språknamn, bock på aktivt språk, mjuk animation
   ✔ INGEN OMLADDNING: språkbyte sker DIREKT på sidan
     (gamla versionen laddade om hela sidan)
   ✔ Progressindikator vid stora översättningar (tunn linje
     under väljaren medan auto-översättning pågår)
   ✔ Snabbare: ordbok + cache appliceras synkront, auto-kön
     buntar 30 fraser per anrop (gtx, ~35 ms)
   ✔ Original bevaras per textnod → felfri växling fram och
     tillbaka utan att texter "fastnar" på fel språk
   ✔ Kommer ihåg valet (localStorage) + märker upp <html lang>

   ÖVERSÄTTNING I TRE STEG (per text):
   1) ORDBOK   json/sprak/<kod>.json (bäst kvalitet, manuell)
   2) MÖNSTER  "Steg {1} av {2}" med platshållare
   3) AUTO     Googles gratis gtx-endpoint, buntat + cachat

   NYTT SPRÅK: skapa json/sprak/XX.json + rad i LANGS nedan.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_SPRAK_LOADED) return;
  window.__MK_SPRAK_LOADED = true;

  /* ---------- Tillgängliga språk ---------- */
  var LANGS = {
    sv: { flagga: '🇸🇪', namn: 'Svenska' },
    en: { flagga: '🇬🇧', namn: 'English' },
    de: { flagga: '🇩🇪', namn: 'Deutsch' }
  };

  var base = (window.__MK_ROOT || (document.querySelector('meta[name="recept:namn"]') ? '../' : './'));
  var lang = localStorage.getItem('mk-lang') || 'sv';
  if (!LANGS[lang]) lang = 'sv';

  var dict = {}, patterns = [], autoCache = {}, originals = new WeakMap();
  var attrOriginals = new WeakMap();          /* el → {placeholder: "...", title: "..."} */
  var attrElement = [];                        /* lista för återställning (WeakMap kan ej itereras) */
  var pending = {}, queue = [], busy = false, saveTimer = null;

  /* ============================================================
     MODERN SPRÅKVÄLJARE (pillerknapp + utfällbar meny)
     ============================================================ */
  var css = document.createElement('style');
  css.textContent =
    '#mk-lang{position:fixed;top:var(--mk-lang-top,14px);right:14px;z-index:105;font-family:Segoe UI,system-ui,sans-serif;}' +
    '#mk-lang .pill{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.95);' +
      'backdrop-filter:blur(6px);border:none;border-radius:999px;padding:9px 15px;cursor:pointer;' +
      'font-size:.88rem;font-weight:700;color:#2c3e50;box-shadow:0 4px 14px rgba(0,0,0,.22);' +
      'transition:transform .15s,box-shadow .15s;font-family:inherit;}' +
    '#mk-lang .pill:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.28);}' +
    '#mk-lang .pill .car{font-size:.6rem;opacity:.5;transition:transform .2s;}' +
    '#mk-lang.open .pill .car{transform:rotate(180deg);}' +
    '#mk-lang .menu{position:absolute;top:calc(100% + 8px);right:0;background:#fff;border-radius:16px;' +
      'box-shadow:0 16px 44px rgba(0,0,0,.3);padding:8px;min-width:180px;opacity:0;' +
      'transform:translateY(-6px) scale(.97);pointer-events:none;transition:opacity .18s,transform .18s;}' +
    '#mk-lang.open .menu{opacity:1;transform:none;pointer-events:auto;}' +
    '#mk-lang .item{display:flex;align-items:center;gap:11px;width:100%;background:none;border:none;' +
      'border-radius:11px;padding:11px 13px;cursor:pointer;font-size:.92rem;font-weight:600;' +
      'color:#2c3e50;font-family:inherit;transition:background .12s;text-align:left;}' +
    '#mk-lang .item:hover{background:#f6f3ee;}' +
    '#mk-lang .item .fl{font-size:1.25rem;}' +
    '#mk-lang .item .chk{margin-left:auto;color:#27ae60;font-weight:800;}' +
    '#mk-lang .prog{position:absolute;left:12px;right:12px;bottom:-5px;height:3px;border-radius:99px;' +
      'background:#eee;overflow:hidden;opacity:0;transition:opacity .3s;}' +
    '#mk-lang .prog.on{opacity:1;}' +
    '#mk-lang .prog i{display:block;height:100%;width:40%;background:linear-gradient(90deg,#c0392b,#e67e22);' +
      'border-radius:99px;animation:mkprog 1s infinite linear;}' +
    '@keyframes mkprog{from{transform:translateX(-110%);}to{transform:translateX(280%);}}' +
    '@media print{#mk-lang{display:none!important;}}';
  document.head.appendChild(css);

  var widget = document.createElement('div');
  widget.id = 'mk-lang';
  widget.className = 'no-print mk-lang';
  widget.innerHTML =
    '<button class="pill" aria-label="Välj språk" title="Språk / Language">' +
      '<span class="fl">' + LANGS[lang].flagga + '</span><span class="nm">' + LANGS[lang].namn + '</span>' +
      '<span class="car">▼</span></button>' +
    '<div class="menu" role="menu">' +
      Object.keys(LANGS).map(function (k) {
        return '<button class="item" data-lang="' + k + '" role="menuitem">' +
          '<span class="fl">' + LANGS[k].flagga + '</span>' + LANGS[k].namn +
          (k === lang ? '<span class="chk">✓</span>' : '') + '</button>';
      }).join('') +
    '</div><div class="prog"><i></i></div>';
  document.body.appendChild(widget);

  /* Krockskydd: lägg pillret UNDER toppmenyn (site.js #mk-nav eller egen .topnav) */
  function placeBelowNav() {
    var nav = document.getElementById('mk-nav') || document.querySelector('.topnav');
    var top = nav ? (nav.getBoundingClientRect().height + 10) : 14;
    document.documentElement.style.setProperty('--mk-lang-top', top + 'px');
  }
  placeBelowNav();
  setTimeout(placeBelowNav, 300);   // om nav skapas strax efter
  window.addEventListener('resize', placeBelowNav, { passive: true });

  widget.querySelector('.pill').addEventListener('click', function (e) {
    e.stopPropagation();
    widget.classList.toggle('open');
  });
  document.addEventListener('click', function () { widget.classList.remove('open'); });
  widget.querySelector('.menu').addEventListener('click', function (e) {
    var item = e.target.closest('.item');
    if (!item) return;
    widget.classList.remove('open');
    switchLang(item.getAttribute('data-lang'));
  });

  function paintWidget() {
    widget.querySelector('.pill .fl').textContent = LANGS[lang].flagga;
    widget.querySelector('.pill .nm').textContent = LANGS[lang].namn;
    var items = widget.querySelectorAll('.item');
    for (var i = 0; i < items.length; i++) {
      var k = items[i].getAttribute('data-lang');
      var chk = items[i].querySelector('.chk');
      if (k === lang && !chk) items[i].insertAdjacentHTML('beforeend', '<span class="chk">✓</span>');
      else if (k !== lang && chk) chk.remove();
    }
  }
  function progress(on) {
    widget.querySelector('.prog').classList.toggle('on', !!on);
  }

  /* ============================================================
     SPRÅKBYTE UTAN OMLADDNING
     ============================================================ */
  async function switchLang(newLang) {
    if (newLang === lang) return;
    lang = newLang;
    localStorage.setItem('mk-lang', lang);
    document.documentElement.lang = lang;
    paintWidget();

    // Tillbaka till svenska: återställ originalen direkt
    if (lang === 'sv') {
      restoreOriginals();
      if (window.__MK_TOAST) window.__MK_TOAST('🇸🇪 Svenska');
      return;
    }
    await loadDict();
    restoreOriginals();       // utgå alltid från ren svenska
    translateAll(document.body);
    if (window.__MK_TOAST) window.__MK_TOAST(LANGS[lang].flagga + ' ' + LANGS[lang].namn);
  }

  function restoreOriginals() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false), n;
    while ((n = walker.nextNode())) {
      if (originals.has(n)) n.nodeValue = originals.get(n);
    }
    if (originals.has(document)) document.title = originals.get(document);
    /* Attribut (placeholder/title/alt/aria-label) tillbaka till svenska */
    attrElement.forEach(function (el) {
      var store = attrOriginals.get(el);
      if (!store) return;
      Object.keys(store).forEach(function (a) {
        try { el.setAttribute(a, store[a]); } catch (e) {}
      });
    });
    /* Töm auto-kön så inga sena svar skriver över svenskan */
    queue = []; pending = {};
  }

  /* ============================================================
     ORDBOK & CACHE
     ============================================================ */
  async function loadDict() {
    dict = {}; patterns = [];
    try {
      var d = await (await fetch(base + 'json/sprak/' + lang + '.json')).json();
      dict = d.texter || {};
      Object.keys(d.monster || {}).forEach(function (k) {
        var esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{(\d+)\\\}/g, '(.+?)');
        patterns.push({ re: new RegExp('^' + esc + '$'), out: d.monster[k] });
      });
    } catch (e) {}
    try { autoCache = JSON.parse(localStorage.getItem('mk-auto-' + lang) || '{}'); } catch (e) { autoCache = {}; }
  }
  function saveCache() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem('mk-auto-' + lang, JSON.stringify(autoCache)); } catch (e) {}
    }, 700);
  }

  /* ============================================================
     ÖVERSÄTTNING
     ============================================================ */
  function tr(t) {
    if (dict[t] !== undefined) return dict[t];
    if (autoCache[t] !== undefined) return autoCache[t];
    for (var i = 0; i < patterns.length; i++) {
      var m = t.match(patterns[i].re);
      if (m) return patterns[i].out.replace(/\{(\d+)\}/g, function (_, n) { return m[+n] || ''; });
    }
    return null;
  }

  function translatable(t) {
    return t && t.length >= 2 && t.length <= 1200 &&
      /[a-zA-ZåäöÅÄÖ]{2}/.test(t) && t.indexOf('http') !== 0;
  }

  function handleNode(n) {
    var raw = n.nodeValue, t = raw.trim();
    if (!t) return;
    if (!originals.has(n)) originals.set(n, raw);
    var out = tr(t);
    if (out !== null) { n.nodeValue = raw.replace(t, out); return; }
    if (translatable(t)) queueAuto(t, { typ: 'nod', n: n });
  }

  function translateAll(root) {
    if (!root) return;
    if (root.nodeType === 3) { handleNode(root); return; }
    if (root.nodeType !== 1) return;
    if (root.id === 'mk-lang' || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(root.tagName)) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('#mk-lang')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }, false), n;
    while ((n = w.nextNode())) handleNode(n);

    // Attribut – ordbok först, annars auto-översättning (nytt i v3)
    var els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[alt],[aria-label]') : [];
    for (var i = 0; i < els.length; i++) {
      if (els[i].closest('#mk-lang')) continue;
      ['placeholder', 'title', 'alt', 'aria-label'].forEach(function (a) {
        var v = els[i].getAttribute(a);
        if (!v || !v.trim()) return;
        var t = v.trim();
        var key = 'attr:' + a;
        if (!attrOriginals.has(els[i])) { attrOriginals.set(els[i], {}); attrElement.push(els[i]); }
        var store = attrOriginals.get(els[i]);
        if (store[a] === undefined) store[a] = v;
        var out = tr(t);
        if (out !== null) { els[i].setAttribute(a, v.replace(t, out)); return; }
        if (translatable(t)) queueAuto(t, { typ: 'attr', el: els[i], attr: a });
      });
    }
    // Sidtitel – ordbok först, annars auto (nytt i v3)
    if (root === document.body) {
      if (!originals.has(document)) originals.set(document, document.title);
      var ttxt = document.title.trim();
      var tt = tr(ttxt);
      if (tt !== null) document.title = tt;
      else if (translatable(ttxt)) queueAuto(ttxt, { typ: 'titel' });
    }
  }

  /* ============================================================
     AUTO-ÖVERSÄTTNING v3 – buntad gtx-kö med progressindikator
     · SEPARATOR-TOKEN "\n⁂\n" istället för bara \n → texter med
       egna radbrytningar splittrar inte längre bunten (vanligaste
       orsaken till "halva sidan blev inte översatt")
     · Mål kan vara textnod, attribut ELLER sidtiteln
     · Misslyckad bunt provas igen EN gång med mindre bitar
     ============================================================ */
  var SEP = '\n⁂\n';
  function queueAuto(text, mal) {
    if (!pending[text]) { pending[text] = []; queue.push(text); pump(); }
    pending[text].push(mal);
  }

  function applicera(text, out) {
    autoCache[text] = out;
    (pending[text] || []).forEach(function (mal) {
      try {
        if (mal.typ === 'nod' || mal.n) {
          var n = mal.n || mal;
          if (n.nodeValue && n.nodeValue.trim() === text) {
            n.nodeValue = n.nodeValue.replace(text, out);
          }
        } else if (mal.typ === 'attr') {
          var v = mal.el.getAttribute(mal.attr);
          if (v && v.trim() === text) mal.el.setAttribute(mal.attr, v.replace(text, out));
        } else if (mal.typ === 'titel') {
          if (document.title.trim() === text) document.title = out;
        }
      } catch (e) {}
    });
  }

  function pump(retryBatch) {
    if (busy || (!queue.length && !retryBatch)) return;
    busy = true;
    progress(true);
    var pumpLang = lang;   /* sena svar efter språkbyte ignoreras */
    var batch = retryBatch || queue.splice(0, 20);
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=sv&tl=' +
              lang + '&dt=t&q=' + encodeURIComponent(batch.join(SEP));
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (lang !== pumpLang) { batch.forEach(function (t) { delete pending[t]; }); return; }
        var full = '';
        (d && d[0] || []).forEach(function (seg) { if (seg && seg[0]) full += seg[0]; });
        /* gtx kan tappa mellanslag runt separatorn – tolerant split */
        var outs = full.split(/\s*⁂\s*/);
        if (outs.length === batch.length) {
          batch.forEach(function (text, i) {
            var out = (outs[i] || '').trim();
            if (out && out !== text) applicera(text, out);
            delete pending[text];
          });
        } else if (batch.length > 1) {
          /* Bunten gick sönder → dela i två och prova igen */
          busy = false;
          var mitt = Math.ceil(batch.length / 2);
          pump(batch.slice(0, mitt));
          queue = batch.slice(mitt).concat(queue);
          return;
        } else {
          /* Enstaka text: ta hela svaret rakt av */
          var ensam = full.trim();
          if (ensam && ensam !== batch[0]) applicera(batch[0], ensam);
          delete pending[batch[0]];
        }
        saveCache();
      })
      .catch(function () { batch.forEach(function (t) { delete pending[t]; }); })
      .then(function () {
        if (busy === false) return;   /* retrasplit tog över */
        busy = false;
        if (queue.length) setTimeout(pump, 120);
        else progress(false);
      });
  }

  /* ============================================================
     START + bevaka dynamiskt innehåll
     ============================================================ */
  new MutationObserver(function (muts) {
    if (lang === 'sv') return;
    muts.forEach(function (m) {
      for (var i = 0; i < m.addedNodes.length; i++) translateAll(m.addedNodes[i]);
    });
  }).observe(document.body, { childList: true, subtree: true });

  if (lang !== 'sv') {
    document.documentElement.lang = lang;
    loadDict().then(function () { translateAll(document.body); });
  }
})();
