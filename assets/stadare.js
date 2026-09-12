/* ============================================================
   PLATS: /assets/stadare.js  (assets-mappen i repo-roten)
   ============================================================
   🧹 LOCALSTORAGE-STÄDAREN (förslag 404) – osynligt underhåll
   ============================================================
   Rensar gamla mk-nycklar hos besökarna AUTOMATISKT så lagringen
   aldrig växer obegränsat (localStorage har ~5 MB-tak – översätt-
   ningscache + loggar + per-receptdata äter annars upp det).

   VAD SOM STÄDAS (försiktigt – aldrig aktiv data):
   1. PER-RECEPT-NYCKLAR vars recept/rätt INTE längre finns på
      sajten (borttagna/omdöpta recept): kock-<fil>, recept-<fil>,
      mk-bock:<fil>, mk-smak:<fil>, mk-kalla:<fil>, mk-port:<fil>,
      mk-rport:<fil>, mk-rbland:<fil>
      → fillistan hämtas från GitHub-API:t (recept/ + ratter/)
   2. ÖVERVUXNA AUTO-ÖVERSÄTTNINGSCACHER (mk-auto-en/de...):
      > 300 kB per språk → halveras (äldsta posterna åker –
      objektordning ≈ insättningsordning)
   3. FÖRÄLDRALÖSA nycklar från borttagna funktioner (okända
      mk-*-prefix som inte finns i dagens moduler)

   SKYDD:
   · Körs MAX 1 gång per 7 dagar (mk-stadad-datum)
   · Körs i requestIdleCallback (aldrig i vägen för sidladdning)
   · VITLISTA: kända aktiva nycklar röres ALDRIG (språkval, tema,
     GitHub-token, upplåsning, betygsröster, loggen...)
   · API-fel (offline/rate limit)? → ingen städning alls den gången
     (hellre ostädat än fel-raderat)
   · Allt som tas bort loggas i Svarta lådan (__MK_LOGG)
   Laddas av site.js på alla sidor.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_STADARE_LOADED) return;
  window.__MK_STADARE_LOADED = true;

  var DATUM = 'mk-stadad-datum';
  var DAGAR = 7;

  /* Statiska nycklar som ALDRIG röres (aktiva funktioner) */
  var VITLISTA = [
    'mk-lang', 'mk-gh-token', 'mk-edit-unlocked', 'mk-fit', 'mk-tema',
    'mk-print-mode', 'mk-last-recipe', 'mk-install-promo',
    'mk-ing-priceupdate', 'mk-logg', 'mk-stadad-datum',
    'mk-felrapport-datum', 'mk-felrapport-sedda'
  ];
  /* Prefix för nycklar som hör till EN receptfil/rättfil */
  var FILPREFIX = ['kock-', 'recept-', 'mk-bock:', 'mk-smak:', 'mk-kalla:',
                   'mk-port:', 'mk-rport:', 'mk-rbland:'];
  /* Prefix som är aktiva men fristående (röres ej i steg 3) */
  var AKTIVA_PREFIX = FILPREFIX.concat(['mk-auto-', 'mk-betyg-vote:', 'mk-idea-vote:']);

  function dagarSedan(datumStr) {
    if (!datumStr) return 9999;
    var d = new Date(datumStr).getTime();
    return isNaN(d) ? 9999 : (Date.now() - d) / 86400000;
  }

  function logga(vad, detalj) {
    try { if (window.__MK_LOGG) window.__MK_LOGG.notera('stadare', { vad: vad, detalj: detalj }); } catch (e) {}
  }

  async function stada() {
    try {
      if (dagarSedan(localStorage.getItem(DATUM)) < DAGAR) return;
    } catch (e) { return; }

    /* ---------- Fillistan (recept + ratter) från GitHub-API:t ---------- */
    var filer = null;
    try {
      var parts = location.pathname.split('/').filter(Boolean);
      var user = location.hostname.split('.')[0];
      var repo = parts.length ? parts[0] : user + '.github.io';
      if (location.hostname.indexOf('github.io') === -1) return;   /* lokalt/test → hoppa */
      var ut = [];
      for (var i = 0; i < 2; i++) {
        var mapp = ['recept', 'ratter'][i];
        var res = await fetch('https://api.github.com/repos/' + user + '/' + repo +
          '/contents/' + mapp + '?ref=main');
        if (!res.ok) { if (mapp === 'recept') return; else continue; }  /* API-fel → avbryt säkert */
        (await res.json()).forEach(function (f) {
          if (f.type === 'file') ut.push(f.name);
        });
      }
      filer = ut;
    } catch (e) { return; }   /* offline/fel → städa inte alls */
    if (!filer || filer.length < 2) return;   /* misstänkt tomt svar → rör inget */

    var borttagna = 0, trimmade = 0, okanda = 0;
    var nycklar = [];
    try { for (var k = 0; k < localStorage.length; k++) nycklar.push(localStorage.key(k)); } catch (e) { return; }

    nycklar.forEach(function (nyckel) {
      if (!nyckel || VITLISTA.indexOf(nyckel) !== -1) return;

      /* 1) Per-fil-nycklar vars fil inte längre finns */
      for (var p = 0; p < FILPREFIX.length; p++) {
        if (nyckel.indexOf(FILPREFIX[p]) === 0) {
          var fil = nyckel.slice(FILPREFIX[p].length);
          try { fil = decodeURIComponent(fil); } catch (e) {}
          if (fil && filer.indexOf(fil) === -1) {
            try { localStorage.removeItem(nyckel); borttagna++; } catch (e) {}
          }
          return;
        }
      }

      /* 2) Övervuxna översättningscacher */
      if (nyckel.indexOf('mk-auto-') === 0) {
        try {
          var v = localStorage.getItem(nyckel) || '';
          if (v.length > 300000) {
            var obj = JSON.parse(v);
            var keys = Object.keys(obj);
            var behall = {};
            keys.slice(Math.floor(keys.length / 2)).forEach(function (t) { behall[t] = obj[t]; });
            localStorage.setItem(nyckel, JSON.stringify(behall));
            trimmade++;
          }
        } catch (e) {}
        return;
      }

      /* 3) Okända mk-nycklar (borttagna funktioner) – endast mk-prefix,
         aldrig något som ser aktivt ut */
      if (nyckel.indexOf('mk-') === 0) {
        var aktiv = AKTIVA_PREFIX.some(function (pre) { return nyckel.indexOf(pre) === 0; });
        if (!aktiv) {
          try { localStorage.removeItem(nyckel); okanda++; } catch (e) {}
        }
      }
    });

    try { localStorage.setItem(DATUM, new Date().toISOString().slice(0, 10)); } catch (e) {}
    if (borttagna || trimmade || okanda) {
      logga('stadat', 'borttagna:' + borttagna + ' trimmade-cacher:' + trimmade + ' okanda:' + okanda);
    }
  }

  /* Kör när CPU:n är ledig – aldrig i vägen för sidladdningen */
  function starta() {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(function () { stada(); }, { timeout: 15000 });
    } else {
      setTimeout(stada, 6000);
    }
  }
  if (document.readyState === 'complete') starta();
  else window.addEventListener('load', starta);
})();
