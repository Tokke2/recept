/* ============================================================
   PLATS: /assets/enheter.js  (assets-mappen i repo-roten)
   ============================================================
   🌡️ ENHETSVÄXLARE – Mitt Maskinkök
   ============================================================
   Knapp i receptverktygsraden som växlar enheter i HELA receptet:
     · °C → °F        (200 °C → 392 °F)
     · dl → cups      (2 dl → 0,85 cups, avrundat till ¼)
     · msk → tbsp · tsk → tsp
   Perfekt ihop med engelska/tyska översättningen.

   Tekniken: träffar i textnoder lindas in i
   <span class="mk-enh" data-orig="ORIGINALTEXT">omräknat</span>
   → växling tillbaka återställer EXAKT originaltexten.
   Källfilen röres aldrig; redigera.js städar spans ur sparad HTML.
   Valet sparas i localStorage (mk-enheter) och återappliceras
   vid sidladdning. Laddas av site.js på receptsidor.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_ENHETER_LOADED) return;
  window.__MK_ENHETER_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  var LS = 'mk-enheter';
  function pref() { try { return localStorage.getItem(LS) || 'metric'; } catch (e) { return 'metric'; } }
  function setPref(v) { try { localStorage.setItem(LS, v); } catch (e) {} }

  function num(s) { return parseFloat(String(s).replace(',', '.')); }
  function sv(n, dec) {
    return n.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: dec === undefined ? 1 : dec });
  }

  /* ---------- Omvandlingsregler (ordning: specifikt först) ---------- */
  var REGLER = [
    { /* 200 °C / 200°C / 200 grader → °F */
      re: /(\d+(?:[.,]\d+)?)(\s*)(°\s*C\b|grader(?:s)?\b)/gi,
      ut: function (m, tal) { return sv(Math.round(num(tal) * 9 / 5 + 32), 0) + ' °F'; }
    },
    { /* 2 dl → cups (1 dl = 0,4227 cups, avrunda till ¼) */
      re: /(\d+(?:[.,]\d+)?)(\s*)dl\b/gi,
      ut: function (m, tal) {
        var c = Math.round(num(tal) * 0.42268 * 4) / 4;
        return sv(c, 2) + ' cup' + (c === 1 ? '' : 's');
      }
    },
    { re: /(\d+(?:[.,]\d+)?)(\s*)msk\b/gi, ut: function (m, tal) { return sv(num(tal), 1) + ' tbsp'; } },
    { re: /(\d+(?:[.,]\d+)?)(\s*)tsk\b/gi, ut: function (m, tal) { return sv(num(tal), 1) + ' tsp'; } }
  ];

  function harTraff(text) {
    return REGLER.some(function (r) { r.re.lastIndex = 0; return r.re.test(text); });
  }

  /* ---------- Till imperial: linda träffar i spans ---------- */
  function tillImperial() {
    var zoner = document.querySelectorAll('header, .card, .machine-step, .warn, .tip, .alt');
    zoner.forEach(function (zon) {
      var walker = document.createTreeWalker(zon, window.NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || !/\d/.test(n.nodeValue)) return window.NodeFilter.FILTER_REJECT;
          var p = n.parentNode;
          if (!p || /^(SCRIPT|STYLE|BUTTON|A)$/.test(p.nodeName)) return window.NodeFilter.FILTER_REJECT;
          if (p.closest && (p.closest('.mk-enh') || p.closest('#mk-kalkyl') || p.closest('.no-print'))) return window.NodeFilter.FILTER_REJECT;
          return harTraff(n.nodeValue) ? window.NodeFilter.FILTER_ACCEPT : window.NodeFilter.FILTER_REJECT;
        }
      });
      var noder = [];
      while (walker.nextNode()) noder.push(walker.currentNode);
      noder.forEach(function (nod) {
        var orig = nod.nodeValue;
        var ny = orig;
        REGLER.forEach(function (r) { r.re.lastIndex = 0; ny = ny.replace(r.re, r.ut); });
        if (ny === orig) return;
        var span = document.createElement('span');
        span.className = 'mk-enh';
        span.setAttribute('data-orig', orig);
        span.textContent = ny;
        nod.parentNode.replaceChild(span, nod);
      });
    });
  }

  /* ---------- Tillbaka till metriskt: återställ originaltext ---------- */
  function tillMetrisk() {
    document.querySelectorAll('span.mk-enh').forEach(function (s) {
      s.parentNode.replaceChild(document.createTextNode(s.getAttribute('data-orig') || s.textContent), s);
    });
  }
  window.__MK_ENHETER_RESET = tillMetrisk;   /* för spara-flödet m.m. */

  function paintBtn(btn) {
    var imp = pref() === 'imperial';
    btn.querySelector('.ic').textContent = '🌡️';
    btn.querySelector('.lb').textContent = imp ? '°F · cups' : '°C · dl';
    btn.title = imp ? 'Visa metriska enheter (°C, dl)' : 'Visa amerikanska enheter (°F, cups)';
  }

  function toggle(btn) {
    if (pref() === 'imperial') { setPref('metric'); tillMetrisk(); }
    else { setPref('imperial'); tillImperial(); }
    paintBtn(btn);
    if (window.__MK_TOAST) window.__MK_TOAST(pref() === 'imperial' ? '🌡️ Visar °F & cups' : '🌡️ Visar °C & dl');
  }

  /* ---------- Knapp i verktygsraden (väntar in receptnav) ---------- */
  var forsok = 0;
  (function vantaBar() {
    var bar = document.getElementById('mk-rnav');
    if (!bar) { if (++forsok < 60) return void setTimeout(vantaBar, 250); return; }
    if (document.getElementById('rnEnh')) return;
    var b = document.createElement('button');
    b.className = 'rb';
    b.id = 'rnEnh';
    b.innerHTML = '<span class="ic">🌡️</span><span class="lb">°C · dl</span>';
    var print = document.getElementById('rnPrint');
    bar.insertBefore(b, print || null);
    paintBtn(b);
    b.addEventListener('click', function () { toggle(b); });

    /* Återapplicera sparat val (efter att ingrediens.js byggt klart) */
    if (pref() === 'imperial') setTimeout(tillImperial, 600);
  })();
})();
