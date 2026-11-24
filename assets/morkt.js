/* ============================================================
   PLATS: /assets/morkt.js  (assets-mappen i repo-roten)
   ============================================================
   🌙 MÖRKT LÄGE – knappen (SPEC 237, förslag 1085)
   ============================================================
   · Själva temat appliceras TIDIGT av site.js (ingen vit blixt);
     här bor bara växlingsknappen.
   · Receptsidor: knappen läggs i verktygsraden #mk-rnav
     (174-regeln: alltid appendChild – trayen sorterar).
   · Övriga sidor: diskret rund knapp nere till vänster.
   · Valet sparas i localStorage ('mk-tema': mork/ljus) – utan
     sparat val följs systemets inställning, även live om
     systemet byter mitt i besöket.
   · ⚖️ Etiketter & utskrift förblir ALLTID ljusa (design.css).
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_MORKT_LOADED) return;
  window.__MK_MORKT_LOADED = true;

  var rot = document.documentElement;

  function arMork() { return rot.classList.contains('mk-dark'); }

  function satt(mork, spara) {
    rot.classList.toggle('mk-dark', mork);
    if (spara) { try { localStorage.setItem('mk-tema', mork ? 'mork' : 'ljus'); } catch (e) {} }
    uppdateraKnappar();
  }

  function uppdateraKnappar() {
    document.querySelectorAll('.mk-tema-knapp').forEach(function (b) {
      var span = b.querySelector('span');
      b.firstChild.textContent = arMork() ? '☀️' : '🌙';
      if (span) span.textContent = arMork() ? ' Ljust' : ' Mörkt';
      b.title = arMork() ? 'Byt till ljust läge' : 'Byt till mörkt läge';
      b.setAttribute('aria-label', b.title);
    });
  }

  /* systemet byter tema mitt i besöket → följ med (endast utan sparat val) */
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var lyssna = function (e) {
      var sparat = null;
      try { sparat = localStorage.getItem('mk-tema'); } catch (e2) {}
      if (!sparat) satt(e.matches, false);
    };
    if (mq.addEventListener) mq.addEventListener('change', lyssna);
    else if (mq.addListener) mq.addListener(lyssna);
  } catch (e) {}

  function nyKnapp(medText) {
    var b = document.createElement('button');
    b.className = 'mk-tema-knapp no-print';
    b.type = 'button';
    b.appendChild(document.createTextNode(''));
    if (medText) b.appendChild(document.createElement('span'));
    b.onclick = function () { satt(!arMork(), true); };
    return b;
  }

  /* --- receptsidor: in i verktygsraden (174-regeln) --- */
  var forsok = 0;
  function hakaRnav() {
    forsok++;
    var rnav = document.getElementById('mk-rnav');
    if (!rnav && forsok < 20) { setTimeout(hakaRnav, 400); return; }
    if (!rnav || rnav.querySelector('.mk-tema-knapp')) { uppdateraKnappar(); return; }
    var b = nyKnapp(true);
    b.style.cssText = 'background:#fff;border:1.5px solid #e0d9cd;border-radius:11px;padding:9px 13px;' +
      'font-size:.85rem;font-weight:700;color:#2c3e50;cursor:pointer;font-family:inherit;';
    rnav.appendChild(b);
    uppdateraKnappar();
  }

  /* --- övriga sidor: rund knapp nere till vänster --- */
  function flytande() {
    if (document.querySelector('.mk-tema-knapp')) return;
    var b = nyKnapp(false);
    b.style.cssText = 'position:fixed;bottom:18px;left:14px;z-index:115;width:46px;height:46px;' +
      'border-radius:50%;border:1.5px solid #e0d9cd;background:#fff;font-size:1.25rem;cursor:pointer;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;padding:0;';
    document.body.appendChild(b);
    uppdateraKnappar();
  }

  var arRecept = !!document.querySelector('meta[name="recept:namn"]');
  if (arRecept) hakaRnav();
  else if (!/koksskarm\.html$/i.test(location.pathname)) flytande();   /* köksskärmen är redan mörk-designad */
})();
