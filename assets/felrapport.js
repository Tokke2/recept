/* ============================================================
   PLATS: /assets/felrapport.js  (assets-mappen i repo-roten)
   ============================================================
   🚨 FELRAPPORT-ROBOTEN – besökares fel når admin AUTOMATISKT
   ============================================================
   Byggd ovanpå Svarta lådan (logg.js): när en besökare drabbas
   av ett JS-fel/kraschat nätanrop skickas en ANONYM felrapport
   till admin via Web3Forms (samma nyckel som Förslagslådan,
   json/forslag.json → web3forms_nyckel) → mail till admin.

   → Du får veta om krascher du ALDRIG själv upplevt, utan att
     besökaren behöver göra någonting.

   SPAM-/INTEGRITETS-SKYDD:
   · Max 1 rapport per webbläsare per DYGN (localStorage-datum)
   · Buntar ihop max 5 fel per rapport (väntar 8 s efter första)
   · Samma fel rapporteras aldrig två gånger (md5-ish nyckel)
   · Anonymt: sida, fel, stack, version, skärm – ALDRIG personligt
     innehåll (svarta lådans inmatningsskydd gäller)
   · Ingen nyckel i forslag.json? → helt passiv (inga anrop)
   Laddas av site.js på alla sidor (efter logg.js).
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_FELRAPPORT_LOADED) return;
  window.__MK_FELRAPPORT_LOADED = true;

  var base = (window.__MK_ROOT || (document.querySelector('meta[name="recept:namn"]') ? '../' : './'));
  var DATUMNYCKEL = 'mk-felrapport-datum';
  var SEDDA_NYCKEL = 'mk-felrapport-sedda';
  var ko = [], timer = null, nyckel = null;

  /* ---------- Web3Forms-nyckeln (delas med Förslagslådan) ---------- */
  fetch(base + 'json/forslag.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (d) { nyckel = String(d.web3forms_nyckel || '').trim() || null; })
    .catch(function () {});

  function idag() { return new Date().toISOString().slice(0, 10); }

  function felId(msg, fil) {
    /* enkel stabil hash så samma fel inte rapporteras igen */
    var s = (msg + '|' + fil).slice(0, 200), h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return String(h);
  }

  function redanSett(id) {
    try {
      var sedda = JSON.parse(localStorage.getItem(SEDDA_NYCKEL) || '[]');
      if (sedda.indexOf(id) !== -1) return true;
      sedda.push(id);
      localStorage.setItem(SEDDA_NYCKEL, JSON.stringify(sedda.slice(-60)));
    } catch (e) {}
    return false;
  }

  function fangat(msg, fil, stack) {
    msg = String(msg || '').slice(0, 200);
    if (!msg) return;
    /* brusfilter: nät-avbrott, tillägg och annulleringar är inte sajtfel */
    if (/ResizeObserver|Script error\.?$|NetworkError|Load failed|aborted|AbortError|extension/i.test(msg)) return;
    var id = felId(msg, fil || '');
    if (redanSett(id)) return;
    ko.push({ msg: msg, fil: String(fil || '').slice(0, 120), stack: String(stack || '').slice(0, 400) });
    if (ko.length > 5) ko = ko.slice(0, 5);
    clearTimeout(timer);
    timer = setTimeout(skicka, 8000);   /* bunta fler fel i 8 s */
  }

  function skicka() {
    if (!nyckel || !ko.length) { ko = []; return; }
    var sist = '';
    try { sist = localStorage.getItem(DATUMNYCKEL) || ''; } catch (e) {}
    if (sist === idag()) { ko = []; return; }   /* max 1 rapport/dygn */
    try { localStorage.setItem(DATUMNYCKEL, idag()); } catch (e) {}

    var rapport = ko.map(function (f, i) {
      return (i + 1) + ') ' + f.msg + (f.fil ? '\n   ' + f.fil : '') + (f.stack ? '\n   ' + f.stack : '');
    }).join('\n\n');
    ko = [];

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: nyckel,
        subject: '🚨 Maskinkök felrapport: ' + (location.pathname.split('/').slice(-1)[0] || 'index'),
        from_name: 'Felrapport-roboten',
        botcheck: '',
        message:
          'Sida: ' + location.href + '\n' +
          'Tid: ' + new Date().toISOString() + '\n' +
          'Webbläsare: ' + navigator.userAgent.slice(0, 140) + '\n' +
          'Skärm: ' + window.innerWidth + 'x' + window.innerHeight +
          (navigator.onLine === false ? ' (OFFLINE!)' : '') + '\n\nFEL:\n' + rapport +
          '\n\n(Automatisk anonym rapport – max 1/dygn per besökare. ' +
          'Be besökaren trycka L 5 ggr → Exportera för full logg.)'
      })
    }).catch(function () {});
  }

  /* ---------- Fånga felen (egna lyssnare – oberoende av logg.js) ---------- */
  window.addEventListener('error', function (e) {
    fangat(e.message, (e.filename || '').split('/').slice(-1)[0] + ':' + (e.lineno || '?'),
      e.error && e.error.stack ? String(e.error.stack).split('\n').slice(0, 3).join(' | ') : '');
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason || {};
    fangat('Promise: ' + (r.message || r), '',
      r.stack ? String(r.stack).split('\n').slice(0, 3).join(' | ') : '');
  });
  /* modul-API: allvarliga fel kan rapporteras manuellt */
  window.__MK_FELRAPPORT = { rapportera: fangat };
})();
