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

  var isSub = location.pathname.indexOf('/recept/') !== -1;
  var base = isSub ? '../' : './';
  var lang = localStorage.getItem('mk-lang') || 'sv';
  if (!LANGS[lang]) lang = 'sv';

  var dict = {}, patterns = [], autoCache = {}, originals = new WeakMap();
  var pending = {}, queue = [], busy = false, saveTimer = null;

  /* ============================================================
     MODERN SPRÅKVÄLJARE (pillerknapp + utfällbar meny)
     ============================================================ */
  var css = document.createElement('style');
  css.textContent =
    '#mk-lang{position:fixed;top:14px;right:14px;z-index:120;font-family:Segoe UI,system-ui,sans-serif;}' +
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
    return t && t.length >= 2 && t.length <= 450 &&
      /[a-zA-ZåäöÅÄÖ]{2}/.test(t) && t.indexOf('http') !== 0;
  }

  function handleNode(n) {
    var raw = n.nodeValue, t = raw.trim();
    if (!t) return;
    if (!originals.has(n)) originals.set(n, raw);
    var out = tr(t);
    if (out !== null) { n.nodeValue = raw.replace(t, out); return; }
    if (translatable(t)) queueAuto(t, n);
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

    // Attribut
    var els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[alt]') : [];
    for (var i = 0; i < els.length; i++) {
      if (els[i].closest('#mk-lang')) continue;
      ['placeholder', 'title', 'alt'].forEach(function (a) {
        var v = els[i].getAttribute(a);
        if (!v || !v.trim()) return;
        var out = tr(v.trim());
        if (out !== null) els[i].setAttribute(a, v.replace(v.trim(), out));
      });
    }
    // Sidtitel
    if (root === document.body) {
      if (!originals.has(document)) originals.set(document, document.title);
      var tt = tr(document.title.trim());
      if (tt !== null) document.title = tt;
    }
  }

  /* ============================================================
     AUTO-ÖVERSÄTTNING – buntad gtx-kö med progressindikator
     ============================================================ */
  function queueAuto(text, node) {
    if (!pending[text]) { pending[text] = []; queue.push(text); pump(); }
    pending[text].push(node);
  }

  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    progress(true);
    var batch = queue.splice(0, 30);
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=sv&tl=' +
              lang + '&dt=t&q=' + encodeURIComponent(batch.join('\n'));
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var full = '';
        (d && d[0] || []).forEach(function (seg) { if (seg && seg[0]) full += seg[0]; });
        var outs = full.split('\n');
        batch.forEach(function (text, i) {
          var out = (outs.length === batch.length ? outs[i] : '').trim();
          if (out && out !== text) {
            autoCache[text] = out;
            (pending[text] || []).forEach(function (n) {
              try {
                if (n.nodeValue && n.nodeValue.trim() === text) {
                  n.nodeValue = n.nodeValue.replace(text, out);
                }
              } catch (e) {}
            });
          }
          delete pending[text];
        });
        saveCache();
      })
      .catch(function () { batch.forEach(function (t) { delete pending[t]; }); })
      .then(function () {
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
