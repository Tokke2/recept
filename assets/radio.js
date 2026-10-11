/* ============================================================
   PLATS: /assets/radio.js  (assets-mappen i repo-roten)
   ============================================================
   📻 KÖKSRADIO I KOCKLÄGET – Mitt Maskinkök (roadmap 75, förslag 524)
   ============================================================
   Valbar bakgrundsmusik (lofi/50-tal/SR) på låg volym under
   lagningen. Stationerna läses ur json/radio.json – ENDAST
   verifierade officiella strömmar, inga påhittade länkar.

   Regler:
   · Startar ALDRIG automatiskt (autoplay-regler + artighet) –
     ljud spelas enbart efter ett aktivt klick.
   · Radion stängs ALLTID av när kockläget stängs (samma
     princip som mikrofonen och timers).
   · Standardvolym 35% – "låg volym under lagningen".
   · Vid uppläsning (🔊) dämpas musiken automatiskt och
     återställs efteråt (tystare()).
   · Svarar inte huvudservern provas reservservrarna ur samma
     officiella spellista – därefter visas ett ärligt felbesked.
   · Ingen confirm()/alert() (Brave-regeln). Allt inline-stylat,
     responsivt med flex-wrap + clamp().

   API (window.__MK_RADIO):
   · mala(overlay)  – ritar panelen i #cmRadioRad (anropas av
     recept.js efter varje render – radion överlever stegbyten)
   · vaxla(overlay) – visa/dölj panelen (📻-knappen)
   · stopp()        – stäng av helt (kockläget stängs)
   · tystare(on)    – dämpa under uppläsning
   · spelar()       – true om musik spelas
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_RADIO) return;

  var rot = window.__MK_ROT || '';
  var stationer = null;     /* laddas ur json/radio.json vid första öppning */
  var laddFel = false;
  var audio = null;         /* EN <audio> på body – överlever render() */
  var valdId = null;
  var volym = 0.35;
  var panelOppen = false;
  var spelarNu = false;
  var status = '';          /* statusrad i panelen */
  var reservIdx = -1;       /* -1 = huvud-url, 0.. = reservlista */
  var senasteOverlay = null;

  try {
    valdId = localStorage.getItem('mk-radio:station') || null;
    var v = parseFloat(localStorage.getItem('mk-radio:volym'));
    if (!isNaN(v) && v >= 0 && v <= 1) volym = v;
  } catch (e) {}

  function sparaVal() {
    try {
      if (valdId) localStorage.setItem('mk-radio:station', valdId);
      localStorage.setItem('mk-radio:volym', String(volym));
    } catch (e) {}
  }

  function station(id) {
    if (!stationer) return null;
    for (var i = 0; i < stationer.length; i++) if (stationer[i].id === id) return stationer[i];
    return null;
  }

  /* ---------- Stationslistan (rot-säkra sökvägar, som övriga moduler) ---------- */
  function laddaStationer() {
    if (stationer || laddFel) return Promise.resolve();
    var paths = [rot + 'json/radio.json', 'json/radio.json', '../json/radio.json', '../../json/radio.json'];
    var i = 0;
    function forsok() {
      if (i >= paths.length) { laddFel = true; return Promise.resolve(); }
      return fetch(paths[i++]).then(function (r) {
        if (!r.ok) throw 0;
        return r.json();
      }).then(function (d) {
        stationer = (d && d.stationer) || [];
      }).catch(forsok);
    }
    return forsok();
  }

  /* ---------- Ljudmotorn ---------- */
  function sakraAudio() {
    if (audio) return;
    audio = document.createElement('audio');
    audio.preload = 'none';
    audio.setAttribute('aria-hidden', 'true');
    audio.style.display = 'none';
    audio.addEventListener('error', strommenDog);
    audio.addEventListener('stalled', function () { /* buffring – låt stå */ });
    document.body.appendChild(audio);
  }

  function strommenDog() {
    if (!spelarNu) return;
    var st = station(valdId);
    var reserver = (st && st.reserv) || [];
    reservIdx++;
    if (st && reservIdx < reserver.length) {
      status = '⚠️ Servern svarade inte – provar reservserver…';
      mala(senasteOverlay);
      audio.src = reserver[reservIdx];
      audio.volume = volym;
      audio.play().catch(stoppMedFel);
    } else {
      stoppMedFel();
    }
  }

  function stoppMedFel() {
    spelarNu = false;
    try { audio.pause(); } catch (e) {}
    status = '❌ Stationen svarar inte just nu – prova en annan.';
    mala(senasteOverlay);
  }

  function spela(id) {
    var st = station(id);
    if (!st) return;
    sakraAudio();
    valdId = id; reservIdx = -1; sparaVal();
    status = '';
    audio.src = st.url;
    audio.volume = volym;
    var p = audio.play();           /* körs ENBART ur klick-handler */
    if (p && p.catch) p.catch(function () { stoppMedFel(); });
    spelarNu = true;
    mala(senasteOverlay);
  }

  function stoppa() {
    spelarNu = false;
    status = '';
    if (audio) { try { audio.pause(); audio.removeAttribute('src'); audio.load(); } catch (e) {} }
  }

  /* ---------- Panelen (ritas i #cmRadioRad i kocklägets overlay) ---------- */
  function chipStil(aktiv) {
    return 'border:none;cursor:pointer;border-radius:999px;' +
      'padding:clamp(6px,1.6vw,8px) clamp(10px,2.6vw,14px);' +
      'font-size:clamp(.78rem,2.2vw,.9rem);font-weight:700;font-family:inherit;' +
      (aktiv
        ? 'background:#27ae60;color:#fff;box-shadow:0 2px 10px rgba(39,174,96,.45);'
        : 'background:rgba(255,255,255,.14);color:#fff;');
  }

  function mala(overlay) {
    if (overlay) senasteOverlay = overlay;
    var rad = senasteOverlay && senasteOverlay.querySelector('#cmRadioRad');
    if (!rad) return;
    if (!panelOppen) { rad.style.display = 'none'; return; }
    rad.style.display = 'block';

    if (laddFel) {
      rad.innerHTML = '<div style="background:rgba(255,255,255,.1);border-radius:12px;padding:10px 14px;font-size:.85rem;">📻 Stationslistan kunde inte läsas – ladda om sidan.</div>';
      return;
    }
    if (!stationer) {
      rad.innerHTML = '<div style="background:rgba(255,255,255,.1);border-radius:12px;padding:10px 14px;font-size:.85rem;">📻 Hämtar stationer…</div>';
      laddaStationer().then(function () { mala(senasteOverlay); });
      return;
    }

    var st = station(valdId);
    var html =
      '<div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:clamp(10px,2.5vw,14px);">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">' +
          '<b style="font-size:clamp(.88rem,2.4vw,1rem);">📻 Köksradio</b>' +
          '<span style="opacity:.75;font-size:clamp(.72rem,2vw,.82rem);flex:1;min-width:120px;">' +
            (spelarNu && st ? '▶️ ' + st.emoji + ' ' + st.namn + ' · spelar' : 'vald musik på låg volym – startar aldrig själv') +
          '</span>' +
          '<button id="cmRadioDolj" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:.8rem;">✕</button>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">' +
          stationer.map(function (s) {
            return '<button class="cmRadioSt" data-id="' + s.id + '" title="' + (s.beskrivning || '') + '" style="' +
              chipStil(spelarNu && s.id === valdId) + '">' + s.emoji + ' ' + s.namn + '</button>';
          }).join('') +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
          '<button id="cmRadioStopp" style="background:' + (spelarNu ? '#c0392b' : 'rgba(255,255,255,.15)') + ';color:#fff;border:none;border-radius:10px;padding:8px 16px;font-weight:700;cursor:pointer;font-size:clamp(.8rem,2.2vw,.9rem);"' + (spelarNu ? '' : ' disabled') + '>⏹ Stoppa</button>' +
          '<label style="display:flex;align-items:center;gap:7px;flex:1;min-width:150px;font-size:.8rem;opacity:.85;">🔉' +
            '<input id="cmRadioVol" type="range" min="0" max="100" value="' + Math.round(volym * 100) + '" style="flex:1;accent-color:#27ae60;min-width:90px;">' +
          '🔊</label>' +
        '</div>' +
        (status ? '<div style="margin-top:8px;font-size:.8rem;opacity:.9;">' + status + '</div>' : '') +
        '<div style="margin-top:8px;font-size:clamp(.62rem,1.7vw,.7rem);opacity:.55;">Strömmar: SomaFM (lyssnarstödd) &amp; Sveriges Radio – officiella adresser, dämpas vid 🔊 uppläsning</div>' +
      '</div>';
    rad.innerHTML = html;

    /* Händelser */
    rad.querySelector('#cmRadioDolj').onclick = function () { panelOppen = false; mala(senasteOverlay); };
    rad.querySelectorAll('.cmRadioSt').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-id');
        if (spelarNu && id === valdId) { stoppa(); mala(senasteOverlay); }
        else spela(id);
      };
    });
    var stoppBtn = rad.querySelector('#cmRadioStopp');
    if (stoppBtn) stoppBtn.onclick = function () { stoppa(); mala(senasteOverlay); };
    var vol = rad.querySelector('#cmRadioVol');
    if (vol) vol.oninput = function () {
      volym = Math.min(1, Math.max(0, parseInt(vol.value, 10) / 100));
      if (audio) audio.volume = volym;
      sparaVal();
    };
  }

  /* ---------- Publikt API ---------- */
  window.__MK_RADIO = {
    mala: mala,
    vaxla: function (overlay) {
      panelOppen = !panelOppen;
      if (panelOppen) laddaStationer().then(function () { mala(overlay); });
      else mala(overlay);
    },
    stopp: function () { panelOppen = false; stoppa(); },
    tystare: function (pa) { if (audio && spelarNu) audio.volume = pa ? volym * 0.25 : volym; },
    spelar: function () { return spelarNu; }
  };
})();
