/* ============================================================
   PLATS: /assets/maskinlank.js  (assets-mappen i repo-roten)
   ============================================================
   🔗 MASKINLÄNKAR – Mitt Maskinkök
   ============================================================
   ALLA maskinnamn i recepten blir automatiskt LÄNKAR till rätt
   maskin i maskindatabasen (maskindatabas.html#MASKIN-ID):
     · rubrikbandets maskin-chips ("Deg: Clatronic BBA 3774")
     · maskinsteg-rutorna (⚙️ Midea MB-FS5017 · Långkok)
     · löptext i korten
   Alla länkas LIKADANT: prickad understrykning, ärver färgen.
   Matchning per maskin (längsta namn först så "Clatronic BBA
   3774" vinner över "Clatronic"): fullnamn, varumärke+modell,
   modellnamn, varumärke. Ordgränser respekteras.
   Länkarna är rena <a class="mk-masklank"> – redigera.js packar
   upp dem i sparad HTML. Källfiler röres aldrig.
   Maskindatabasen öppnar rätt kort via #hash (stöd inbyggt där).
   Laddas av site.js på receptsidor.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_MASKLANK_LOADED) return;
  window.__MK_MASKLANK_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  var root = window.__MK_ROOT || '../';

  var css = document.createElement('style');
  css.textContent =
    'a.mk-masklank{color:inherit;text-decoration:underline dotted;text-underline-offset:3px;' +
      'text-decoration-thickness:1.5px;cursor:pointer;}' +
    'a.mk-masklank:hover{text-decoration-style:solid;opacity:.85;}' +
    '@media print{a.mk-masklank{text-decoration:none!important;color:inherit!important;}}';
  document.head.appendChild(css);

  function rensa(s) { return String(s || '').replace(/\([^)]*\)/g, '').trim(); }

  /* ---------- Bygg sökmönster per maskin (längsta först) ---------- */
  function varianter(m) {
    var ut = [];
    var vm = rensa(m.varumarke), mod = rensa(m.modellnamn), namn = rensa(m.namn);
    if (vm && mod) ut.push(vm + ' ' + mod);
    if (namn && namn.length > 5) ut.push(namn);
    (m.alias || []).forEach(function (a) { if (a && a.length >= 5) ut.push(rensa(a)); });
    if (mod && mod.length >= 4) ut.push(mod);
    if (vm && vm.length >= 4) ut.push(vm);
    /* unika, längsta först */
    ut = ut.filter(function (v, i) { return ut.indexOf(v) === i; });
    ut.sort(function (a, b) { return b.length - a.length; });
    return ut;
  }
  function reEscape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function lankaAllt(maskiner) {
    /* Ett gemensamt regex: alla varianter för alla maskiner, längsta först */
    var alla = [];
    maskiner.forEach(function (m) {
      varianter(m).forEach(function (v) { alla.push({ text: v, id: m.id }); });
    });
    if (!alla.length) return;
    alla.sort(function (a, b) { return b.text.length - a.text.length; });
    var re = new RegExp('(' + alla.map(function (x) { return reEscape(x.text); }).join('|') + ')', 'gi');
    var idFor = function (traff) {
      var t = traff.toLowerCase();
      for (var i = 0; i < alla.length; i++) {
        if (alla[i].text.toLowerCase() === t) return alla[i].id;
      }
      return null;
    };

    var zoner = document.querySelectorAll('header, .card, .machine-step, .warn, .tip');
    zoner.forEach(function (zon) {
      if (zon.id && zon.id.indexOf('mk-') === 0) return;   /* modulers egna ytor */
      var walker = document.createTreeWalker(zon, window.NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || n.nodeValue.length < 4) return window.NodeFilter.FILTER_REJECT;
          var p = n.parentNode;
          if (!p || /^(A|BUTTON|SCRIPT|STYLE|SELECT|OPTION)$/.test(p.nodeName)) return window.NodeFilter.FILTER_REJECT;
          if (p.closest && (p.closest('a, button, .no-print, .mk-ingsok') ||
              (p.closest('[id^="mk-"]') && !p.closest('#mk-oversikt')))) return window.NodeFilter.FILTER_REJECT;
          re.lastIndex = 0;
          return re.test(n.nodeValue) ? window.NodeFilter.FILTER_ACCEPT : window.NodeFilter.FILTER_REJECT;
        }
      });
      var noder = [];
      while (walker.nextNode()) noder.push(walker.currentNode);
      noder.forEach(function (nod) {
        var text = nod.nodeValue;
        var frag = document.createDocumentFragment();
        var sista = 0, hit;
        re.lastIndex = 0;
        while ((hit = re.exec(text)) !== null) {
          /* ordgräns: tecknet före/efter får inte vara bokstav/siffra */
          var fore = text[hit.index - 1], efter = text[hit.index + hit[0].length];
          if ((fore && /[A-Za-z0-9ÅÄÖåäö]/.test(fore)) || (efter && /[A-Za-z0-9ÅÄÖåäö]/.test(efter))) continue;
          var id = idFor(hit[0]);
          if (!id) continue;
          if (hit.index > sista) frag.appendChild(document.createTextNode(text.slice(sista, hit.index)));
          var a = document.createElement('a');
          a.className = 'mk-masklank';
          a.href = root + 'maskindatabas.html#' + id;
          a.title = 'Öppna ' + hit[0] + ' i maskindatabasen (program & tider)';
          a.textContent = hit[0];
          frag.appendChild(a);
          sista = hit.index + hit[0].length;
        }
        if (sista === 0) return;
        if (sista < text.length) frag.appendChild(document.createTextNode(text.slice(sista)));
        nod.parentNode.replaceChild(frag, nod);
      });
    });
  }

  /* Ta bort länkarna (redigeringsläget) + kör om */
  window.__MK_MASKLANK_RESET = function () {
    document.querySelectorAll('a.mk-masklank').forEach(function (a) {
      a.parentNode.replaceChild(document.createTextNode(a.textContent), a);
    });
  };
  var cachadeMaskiner = null;
  window.__MK_MASKLANK_KOR = function () { if (cachadeMaskiner) lankaAllt(cachadeMaskiner); };

  /* ---------- Ladda maskinparken och kör ---------- */
  async function start() {
    try {
      var idx = await (await fetch(root + 'json/maskiner-index.json', { cache: 'no-store' })).json();
      var maskiner = [];
      await Promise.all(idx.map(async function (f) {
        try { maskiner.push(await (await fetch(root + 'json/maskiner/' + f)).json()); } catch (e) {}
      }));
      cachadeMaskiner = maskiner;
      /* vänta lite så tydlig.js/ingrediens.js byggt klart */
      setTimeout(function () {
        if (!document.body.classList.contains('mk-editing')) lankaAllt(maskiner);
      }, 700);
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
