/* ============================================================
   PLATS: /assets/maskinmatch.js  (assets-mappen i repo-roten)
   ============================================================
   MASKINANPASSNING – Mitt Maskinkök
   ============================================================
   Alla recept ANPASSAS AUTOMATISKT till maskinparken:

   När en NY maskin läggs till i json/maskiner/ kollar denna modul
   på varje receptsida om maskinen klarar receptet (programmens
   nyckelord matchas mot receptets taggar, titel och text) och
   visar då rutan "🔧 Fler av dina maskiner som klarar receptet"
   med maskin + program + tid.

   → Ingen receptfil behöver ändras. Lägg till maskinen = alla
     recept uppdateras direkt, överallt. (Centralt-principen!)

   Maskiner som redan står i receptet visas inte igen.
   Laddas automatiskt av site.js på receptsidor.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_MATCH_LOADED) return;
  window.__MK_MATCH_LOADED = true;

  var isRecipePage = location.pathname.indexOf('/recept/') !== -1;
  if (!isRecipePage) return;

  function meta(n) {
    var el = document.querySelector('meta[name="recept:' + n + '"]');
    return el ? el.content : '';
  }

  /* ---------- Receptets "profil" att matcha mot ---------- */
  function recipeText() {
    var t = [
      document.title,
      meta('namn'),
      meta('taggar'),
      meta('beskrivning')
    ].join(' ');
    /* + rubriker och maskinsteg ur sidan (ej hela brödtexten – för brett) */
    document.querySelectorAll('h1, h2, .machine-step h3').forEach(function (el) {
      t += ' ' + el.textContent;
    });
    return t.toLowerCase();
  }

  /* ---------- Maskiner som REDAN nämns i receptet ---------- */
  function mentioned() {
    return (meta('maskiner') + ' ' + document.body.innerHTML).toLowerCase();
  }

  /* ---------- Ladda maskinparken (cachas per session) ---------- */
  async function loadMachines() {
    try {
      var c = JSON.parse(sessionStorage.getItem('mk-maskinpark'));
      if (c && c.length) return c;
    } catch (e) {}
    var out = [];
    try {
      var idx = await (await fetch('../json/maskiner-index.json')).json();
      await Promise.all(idx.map(async function (f) {
        try { out.push(await (await fetch('../json/maskiner/' + f)).json()); } catch (e) {}
      }));
      try { sessionStorage.setItem('mk-maskinpark', JSON.stringify(out)); } catch (e) {}
    } catch (e) {}
    return out;
  }

  /* För generiska ord som annars ger tokiga tips (glassmaskin på kakrecept) */
  var GENERIC = ['efterrätt', 'dessert', 'fika', 'fest', 'snack', 'mat'];

  /* ---------- Poängsätt: klarar maskinen receptet? ---------- */
  function bestProgram(machine, text) {
    var best = null, bestScore = 0;
    (machine.program || []).forEach(function (p) {
      var score = 0;
      (p.nyckelord || []).forEach(function (k) {
        k = String(k).toLowerCase().trim();
        if (k.length < 3 || GENERIC.indexOf(k) !== -1) return;
        /* Hela ord – "ost" får inte matcha inuti "frost" */
        var re = new RegExp('(^|[^a-zåäö])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-zåäö])');
        if (re.test(text)) score++;
      });
      /* rengörings-/underhållsprogram räknas aldrig som recepttips */
      if (/reng|clean|extrude/i.test(p.namn || '')) score = 0;
      if (score > bestScore) { bestScore = score; best = p; }
    });
    return bestScore >= 1 ? { program: best, score: bestScore } : null;
  }

  async function run() {
    var text = recipeText();
    var known = mentioned();
    var machines = await loadMachines();
    if (!machines.length) return;

    var hits = [];
    machines.forEach(function (m) {
      var name = ((m.varumarke || '') + ' ' + (m.modellnamn || '')).trim();
      /* hoppa över maskiner som redan står i receptet */
      var already =
        (m.varumarke && known.indexOf(String(m.varumarke).toLowerCase()) !== -1) ||
        (m.modellnamn && known.indexOf(String(m.modellnamn).toLowerCase()) !== -1);
      if (already) return;
      var b = bestProgram(m, text);
      if (b) hits.push({ m: m, name: name || m.namn || m.id, p: b.program, score: b.score });
    });
    if (!hits.length) return;
    hits.sort(function (a, b) { return b.score - a.score; });
    hits = hits.slice(0, 4);  // max 4 tips – de mest relevanta

    var rows = hits.map(function (h) {
      var img = h.m.bild ? '<img src="../' + h.m.bild + '" alt="" loading="lazy" ' +
        'style="width:44px;height:44px;object-fit:contain;border-radius:8px;background:#fff;flex-shrink:0;" ' +
        'onerror="this.remove()">' : '';
      var tid = h.p.standardtid ? ' · ' + h.p.standardtid : '';
      var beskr = h.p.beskrivning ? '<div style="color:#7f8c8d;font-size:.82rem;margin-top:2px;">' + h.p.beskrivning + '</div>' : '';
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f0ebe3;">' +
        img +
        '<div><b>' + h.name + '</b> · <span style="color:#27ae60;font-weight:700;">' +
        (h.p.namn || '') + tid + '</span>' + beskr + '</div></div>';
    }).join('');

    var st = document.createElement('style');
    st.textContent = '@media print{#mk-maskinmatch{display:none!important;}}';
    document.head.appendChild(st);

    var box = document.createElement('div');
    box.className = 'card no-print';
    box.id = 'mk-maskinmatch';
    box.innerHTML =
      '<h2>🔧 Fler av dina maskiner som klarar receptet</h2>' +
      '<p style="color:#7f8c8d;font-size:.83rem;margin-bottom:6px;">Matchas automatiskt mot maskindatabasen – ' +
      'lägger du till en ny maskin dyker den upp här av sig själv.</p>' + rows;
    box.querySelector('div:last-child') && (box.querySelector('div:last-child').style.borderBottom = 'none');

    var footer = document.querySelector('footer');
    if (footer) footer.parentNode.insertBefore(box, footer);
    else document.body.appendChild(box);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
