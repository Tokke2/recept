/* ============================================================
   PLATS: /assets/sprak.js  (assets-mappen i repo-roten)
   ============================================================
   CENTRAL SPRÅKMODUL – Mitt Maskinkök
   ============================================================
   🌐-dropdown på alla sidor (laddas automatiskt av site.js).

   ÖVERSÄTTNING I TRE STEG (per text):
   1) ORDBOK      json/sprak/<kod>.json  – exakta fraser (bäst kvalitet)
   2) MÖNSTER     "Steg {1} av {2}" osv. med platshållare
   3) AUTO (AI)   Text som saknas i ordboken skickas automatiskt
                  till gratis översättnings-API (MyMemory, ingen
                  nyckel krävs) och CACHAS i webbläsaren – varje
                  text översätts bara EN gång per enhet.

   Ordboken vinner alltid över auto (bättre kvalitet). Auto-
   resultat loggas i konsolen så bra fraser enkelt kan flyttas
   in i ordboken permanent.

   OBS AUTO-GRÄNS: MyMemory ger ca 5 000 tecken/dygn per IP
   gratis. Räcker gott tack vare cachen – första besöket på en
   sida översätter, sedan är det lagrat.

   NYTT SPRÅK: skapa json/sprak/XX.json + rad i LANGS nedan.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_SPRAK_LOADED) return;
  window.__MK_SPRAK_LOADED = true;

  /* ---------- Tillgängliga språk ---------- */
  var LANGS = {
    sv: '🇸🇪 Svenska',
    en: '🇬🇧 English',
    de: '🇩🇪 Deutsch'
  };

  var isSub = location.pathname.indexOf('/recept/') !== -1;
  var base = isSub ? '../' : './';
  var lang = localStorage.getItem('mk-lang') || 'sv';
  if (!LANGS[lang]) lang = 'sv';

  /* ---------- Dropdown ---------- */
  var sel = document.createElement('select');
  sel.className = 'no-print mk-lang';
  sel.title = 'Språk / Language';
  sel.style.cssText =
    'position:fixed;top:14px;right:14px;z-index:120;padding:8px 12px;border-radius:10px;' +
    'border:none;background:rgba(255,255,255,.95);color:#2c3e50;font-weight:700;font-size:.85rem;' +
    'box-shadow:0 3px 10px rgba(0,0,0,.25);cursor:pointer;font-family:inherit;';
  Object.keys(LANGS).forEach(function (k) {
    var o = document.createElement('option');
    o.value = k; o.textContent = LANGS[k];
    if (k === lang) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', function () {
    localStorage.setItem('mk-lang', sel.value);
    location.reload();
  });
  document.body.appendChild(sel);

  if (lang === 'sv') return; // originalspråk

  /* ============================================================
     AUTO-ÖVERSÄTTNING (steg 3)
     ============================================================ */
  var AUTO_CACHE_KEY = 'mk-auto-' + lang;
  var autoCache = {};
  try { autoCache = JSON.parse(localStorage.getItem(AUTO_CACHE_KEY) || '{}'); } catch (e) {}
  var saveTimer = null;
  function saveCache() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(AUTO_CACHE_KEY, JSON.stringify(autoCache)); } catch (e) {}
    }, 800);
  }

  // registry: svensk text -> lista av {node} eller {el, attr} som väntar på auto
  var pending = {};
  var queue = [];
  var busy = false;

  function looksTranslatable(t) {
    if (!t || t.length < 2 || t.length > 450) return false;
    if (!/[a-zA-ZåäöÅÄÖ]{2}/.test(t)) return false;   // minst två bokstäver
    if (/^https?:\/\//.test(t)) return false;
    return true;
  }

  function queueAuto(text, target) {
    if (autoCache[text] !== undefined) { applyAuto(text, autoCache[text], [target]); return; }
    if (!looksTranslatable(text)) return;
    if (!pending[text]) {
      pending[text] = [];
      queue.push(text);
      pump();
    }
    pending[text].push(target);
  }

  function applyAuto(orig, translated, targets) {
    if (!translated || translated === orig) return;
    targets.forEach(function (t) {
      try {
        if (t.node && t.node.nodeValue !== null) {
          // ersätt bara om texten fortfarande är originalet
          if (t.node.nodeValue.trim() === orig) {
            t.node.nodeValue = t.node.nodeValue.replace(orig, translated);
          }
        } else if (t.el && t.attr) {
          if ((t.el.getAttribute(t.attr) || '').trim() === orig) {
            t.el.setAttribute(t.attr, translated);
          }
        }
      } catch (e) {}
    });
  }

  function pump() {
    if (busy) return;
    var text = queue.shift();
    if (!text) return;
    busy = true;
    var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) +
              '&langpair=sv|' + lang;
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var out = d && d.responseData && d.responseData.translatedText || '';
        // MyMemory returnerar ibland VERSALER eller felflaggor – sanera lätt
        if (/MYMEMORY WARNING/i.test(out)) out = '';
        if (out) {
          autoCache[text] = out;
          saveCache();
          applyAuto(text, out, pending[text] || []);
          console.info('[Maskinkök/språk] AUTO: "' + text + '" → "' + out +
            '"  (lägg gärna in i json/sprak/' + lang + '.json för permanent kvalitet)');
        }
        delete pending[text];
      })
      .catch(function () { delete pending[text]; })
      .finally ? undefined : null;
    // .finally saknas i äldre motorer – kör vidare via then/catch ovan:
    setTimeout(function () { busy = false; pump(); }, 350); // skonsam takt mot API:t
  }

  /* ============================================================
     ORDBOK + MÖNSTER (steg 1–2) och DOM-vandring
     ============================================================ */
  fetch(base + 'json/sprak/' + lang + '.json')
    .then(function (r) { return r.json(); })
    .catch(function () { return { texter: {}, monster: {} }; })
    .then(function (d) {
      var map = d.texter || {};
      var patterns = [];
      Object.keys(d.monster || {}).forEach(function (k) {
        var esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{(\d+)\\\}/g, '(.+?)');
        patterns.push({ re: new RegExp('^' + esc + '$'), out: d.monster[k] });
      });

      document.documentElement.lang = lang;

      // returnerar översatt sträng ELLER null (= inte i ordbok/mönster)
      function tr(s) {
        if (!s) return null;
        var t = s.trim();
        if (!t) return null;
        if (map[t] !== undefined) return s.replace(t, map[t]);
        if (autoCache[t] !== undefined) return s.replace(t, autoCache[t]);
        for (var i = 0; i < patterns.length; i++) {
          var m = t.match(patterns[i].re);
          if (m) {
            var out = patterns[i].out.replace(/\{(\d+)\}/g, function (_, n) { return m[+n] || ''; });
            return s.replace(t, out);
          }
        }
        return null;
      }

      function handleTextNode(n) {
        var r = tr(n.nodeValue);
        if (r !== null) { n.nodeValue = r; return; }
        var t = (n.nodeValue || '').trim();
        if (t) queueAuto(t, { node: n });
      }

      function handleAttr(el, attr) {
        var v = el.getAttribute(attr);
        if (!v) return;
        var r = tr(v);
        if (r !== null) { el.setAttribute(attr, r); return; }
        queueAuto(v.trim(), { el: el, attr: attr });
      }

      function walk(root) {
        if (!root) return;
        if (root.nodeType === 3) { handleTextNode(root); return; }
        if (root.nodeType !== 1) return;
        if (root.classList && root.classList.contains('mk-lang')) return;
        if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(root.tagName)) return;
        var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode: function (n) {
            var p = n.parentNode;
            if (p && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        }, false), n;
        while ((n = w.nextNode())) handleTextNode(n);
        var attrEls = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[alt]') : [];
        for (var i = 0; i < attrEls.length; i++) {
          ['placeholder', 'title', 'alt'].forEach(function (a) {
            if (attrEls[i].hasAttribute(a)) handleAttr(attrEls[i], a);
          });
        }
        if (root === document.body && document.title) {
          var rt = tr(document.title);
          if (rt !== null) document.title = rt;
          else queueAuto(document.title.trim(), { el: { getAttribute: function(){return document.title;}, setAttribute: function(_,v){document.title=v;} }, attr: 't' });
        }
      }

      walk(document.body);

      // Dynamiskt innehåll (maskiner, recept, energi, kockläge) översätts också
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          for (var i = 0; i < m.addedNodes.length; i++) walk(m.addedNodes[i]);
        });
      }).observe(document.body, { childList: true, subtree: true });

      console.info('[Maskinkök/språk] ' + LANGS[lang] + ' aktivt. Ordbok: ' +
        Object.keys(map).length + ' fraser · Auto-cache: ' + Object.keys(autoCache).length +
        ' fraser. Saknade texter auto-översätts (MyMemory) och cachas.');
    });
})();
