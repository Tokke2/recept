/* ============================================================
   PLATS: /assets/etikett.js  (assets-mappen i repo-roten)
   ============================================================
   🏷️ BURKETIKETTER – Mitt Maskinkök
   ============================================================
   Genererar utskrivbara etiketter för recept – perfekt för
   sylt-/sås-/saftburkar i skafferi & frys:
     · Receptnamn + emoji · tillverkningsdatum (idag, ändringsbart)
     · kcal/100 g + pris ur live-kalkylen (om den finns)
     · QR-kod till receptet (api.qrserver.com, samma som Swish-QR)
     · Välj antal (1–24) och storlek (liten 38×28 / mellan 52×37 /
       stor 70×50 mm) → skrivs ut på A4, skär/klipp efter linjerna
   Knappen visas på ALLA receptsidor (extra given för recept med
   <meta recept:ingrediens="ja"> eller sylt/saft/sås i namnet).
   Egen utskriftsyta (dold iframe-fri: print-only div) så själva
   receptsidan inte skrivs ut samtidigt.
   Laddas av site.js på receptsidor. Källfiler röres aldrig.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_ETIKETT_LOADED) return;
  window.__MK_ETIKETT_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  var STORLEKAR = {
    liten:  { w: 38, h: 28, kol: 4, namn: 'Liten (38×28 mm)',  qr: 0,  fs: 7 },
    mellan: { w: 52, h: 37, kol: 3, namn: 'Mellan (52×37 mm)', qr: 16, fs: 8.5 },
    stor:   { w: 70, h: 50, kol: 2, namn: 'Stor (70×50 mm)',   qr: 24, fs: 10 }
  };

  function receptNamn() {
    var n = (document.querySelector('meta[name="recept:namn"]') || {}).content ||
      (document.querySelector('header h1') || { textContent: 'Recept' }).textContent;
    return String(n).replace(/[\u{1F300}-\u{1FAFF}\uFE0F]/gu, '').trim();
  }
  function receptEmoji() {
    var m = document.querySelector('meta[name="recept:emoji"]');
    if (m && m.content) return m.content;
    var hit = ((document.querySelector('header h1') || {}).textContent || '').match(/[\u{1F300}-\u{1FAFF}]/u);
    return hit ? hit[0] : '\uD83E\uDED9';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function kalkylInfo() {
    var tot = window.__MK_KALKYL_TOT;
    if (!tot || !tot.g) return null;
    return {
      kcal: Math.round(tot.kcal / tot.g * 100),
      kr: Math.round(tot.kr / tot.g * 1000 * 100) / 100
    };
  }

  function qrUrl(px) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=' + px + 'x' + px +
      '&data=' + encodeURIComponent(location.href.split('#')[0]);
  }

  /* ---------- Bygg utskriftsarket ---------- */
  function skrivUt(antal, storlek, datum, extraRad) {
    var S = STORLEKAR[storlek];
    var namn = receptNamn(), emoji = receptEmoji();
    var info = kalkylInfo();
    var gammal = document.getElementById('mk-etikett-ark');
    if (gammal) gammal.remove();

    var css = document.getElementById('mk-etikett-css');
    if (!css) {
      css = document.createElement('style');
      css.id = 'mk-etikett-css';
      css.textContent =
        '#mk-etikett-ark{display:none;}' +
        '@media print{' +
          'body.mk-etikett-print > *:not(#mk-etikett-ark){display:none!important;}' +
          'body.mk-etikett-print #mk-etikett-ark{display:flex!important;flex-wrap:wrap;gap:4mm;padding:6mm;}' +
          'body.mk-etikett-print{padding:0!important;background:#fff!important;}' +
          '.mk-etikett{border:0.4pt dashed #999;border-radius:2mm;overflow:hidden;display:flex;' +
            'flex-direction:column;justify-content:center;align-items:center;text-align:center;' +
            'page-break-inside:avoid;background:#fff;position:relative;font-family:Georgia,serif;color:#000;}' +
          '.mk-etikett .rand{position:absolute;top:0;left:0;right:0;height:2.2mm;' +
            'background:linear-gradient(90deg,#c0392b,#e67e22);-webkit-print-color-adjust:exact;print-color-adjust:exact;}' +
        '}';
      document.head.appendChild(css);
    }

    var ark = document.createElement('div');
    ark.id = 'mk-etikett-ark';
    var en = '';
    en += '<div class="mk-etikett" style="width:' + S.w + 'mm;height:' + S.h + 'mm;padding:3mm 2mm 1.5mm;">';
    en += '<div class="rand"></div>';
    en += '<div style="font-size:' + (S.fs + 3) + 'pt;line-height:1;">' + esc(emoji) + '</div>';
    en += '<div style="font-size:' + S.fs + 'pt;font-weight:700;line-height:1.15;max-height:' + (S.fs * 2.6) + 'pt;overflow:hidden;">' + esc(namn) + '</div>';
    en += '<div style="font-size:' + (S.fs - 1.5) + 'pt;margin-top:0.8mm;">' + esc(datum) + '</div>';
    if (info) en += '<div style="font-size:' + (S.fs - 1.5) + 'pt;">' + info.kcal + ' kcal/100 g · ' + info.kr.toLocaleString('sv-SE') + ' kr/kg</div>';
    if (extraRad) en += '<div style="font-size:' + (S.fs - 1.5) + 'pt;font-style:italic;">' + esc(extraRad) + '</div>';
    if (S.qr) en += '<img src="' + qrUrl(S.qr * 4) + '" style="width:' + S.qr + 'mm;height:' + S.qr + 'mm;margin-top:1mm;" alt="QR">';
    en += '</div>';
    ark.innerHTML = new Array(antal + 1).join(en);
    document.body.appendChild(ark);

    /* Vänta in QR-bilderna innan utskrift */
    var imgs = ark.querySelectorAll('img');
    var kvar = imgs.length;
    function kor() {
      document.body.classList.add('mk-etikett-print');
      var stada = function () {
        document.body.classList.remove('mk-etikett-print');
        window.removeEventListener('afterprint', stada);
      };
      window.addEventListener('afterprint', stada);
      setTimeout(function () { window.print(); }, 60);
    }
    if (!kvar) return kor();
    imgs.forEach(function (im) {
      var ett = function () { if (--kvar <= 0) kor(); };
      if (im.complete) ett();
      else { im.addEventListener('load', ett); im.addEventListener('error', ett); }
    });
    setTimeout(function () { if (kvar > 0) { kvar = 0; kor(); } }, 4000);   /* reserv om QR-API:t hänger */
  }

  /* ---------- Dialogen ---------- */
  function oppna() {
    if (document.getElementById('mk-etikett-bg')) return;
    var idag = new Date().toLocaleDateString('sv-SE');
    var bg = document.createElement('div');
    bg.id = 'mk-etikett-bg';
    bg.className = 'no-print';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:320;display:flex;' +
      'align-items:center;justify-content:center;padding:16px;';
    bg.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:24px 26px;' +
        'font-family:Segoe UI,system-ui,sans-serif;color:#2c3e50;">' +
        '<h3 style="margin:0 0 4px;">🏷️ Burketiketter</h3>' +
        '<p style="font-size:.82rem;color:#7f8c8d;margin:0 0 14px;">Skrivs ut på A4 – klipp efter de streckade linjerna. QR-koden öppnar receptet.</p>' +
        '<label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px;">Storlek</label>' +
        '<select id="et-storlek" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.9rem;font-family:inherit;margin-bottom:12px;">' +
          Object.keys(STORLEKAR).map(function (k, i) {
            return '<option value="' + k + '"' + (k === 'mellan' ? ' selected' : '') + '>' + STORLEKAR[k].namn +
              (STORLEKAR[k].qr ? ' – med QR' : ' – utan QR') + '</option>';
          }).join('') + '</select>' +
        '<label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px;">Antal etiketter</label>' +
        '<input id="et-antal" type="number" min="1" max="24" value="6" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.9rem;font-family:inherit;margin-bottom:12px;">' +
        '<label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px;">Datum på etiketten</label>' +
        '<input id="et-datum" type="text" value="' + idag + '" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.9rem;font-family:inherit;margin-bottom:12px;">' +
        '<label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px;">Extra rad (valfritt)</label>' +
        '<input id="et-extra" type="text" placeholder="t.ex. Öppnad burk: 1 vecka i kyl" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.9rem;font-family:inherit;margin-bottom:16px;">' +
        '<div style="display:flex;gap:10px;">' +
          '<button id="et-print" style="flex:1;background:#c0392b;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;font-size:.95rem;cursor:pointer;font-family:inherit;">🖨️ Skriv ut etiketter</button>' +
          '<button id="et-stang" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;font-family:inherit;">Stäng</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bg);

    function stang() { bg.remove(); }
    bg.querySelector('#et-stang').onclick = stang;
    var ned = false;
    bg.addEventListener('mousedown', function (e) { ned = (e.target === bg); });
    bg.addEventListener('click', function (e) { if (e.target === bg && ned) stang(); });
    bg.querySelector('#et-print').onclick = function () {
      var antal = Math.max(1, Math.min(24, parseInt(bg.querySelector('#et-antal').value, 10) || 6));
      var storlek = bg.querySelector('#et-storlek').value;
      var datum = bg.querySelector('#et-datum').value.trim() || idag;
      var extra = bg.querySelector('#et-extra').value.trim();
      stang();
      skrivUt(antal, storlek, datum, extra);
    };
  }

  /* ---------- Knapp i verktygsraden ---------- */
  var forsok = 0;
  (function vantaBar() {
    var bar = document.getElementById('mk-rnav');
    if (!bar) { if (++forsok < 60) return void setTimeout(vantaBar, 250); return; }
    if (document.getElementById('rnEtikett')) return;
    var b = document.createElement('button');
    b.className = 'rb';
    b.id = 'rnEtikett';
    b.title = 'Skriv ut burketiketter (namn, datum, näring, QR till receptet)';
    b.innerHTML = '<span class="ic">🏷️</span><span class="lb">Etiketter</span>';
    var share = document.getElementById('rnShare');
    bar.insertBefore(b, share ? share.nextSibling : null);
    b.addEventListener('click', oppna);
  })();
})();
