/* ============================================================
   PLATS: /assets/verifierad.js  (assets-mappen i repo-roten)
   ============================================================
   🌟 VERIFIERAT RECEPT – Mitt Maskinkök
   ============================================================
   Admin (lösenordsskyddat, samma lås som ✏️-redigeringen) kan
   markera ett recept som "bakat & verifierat":

   · Knappen 🌟 i receptets verktygsrad (mk-rnav) → lösenord →
     bekräftelsedialog → metaraden
        <meta name="recept:verifierad" content="ÅÅÅÅ-MM-DD">
     skrivs in i receptfilen via GitHub-API:t (__MK_SPARA).
   · Finns metan visas en GRÖN STJÄRNA uppe i receptheaderns
     högra hörn med datum-tooltip – för ALLA besökare.
   · recept.html visar samma stjärna på receptkorten (läser metan).
   · Klick på 🌟 när receptet redan är verifierat → fråga om att
     ta bort verifieringen (t.ex. efter större receptändring).
   · 📷 BILD PÅ BAKET: i samma dialog kan admin ladda upp ett foto
     av rätten. Bilden skalas ner i webbläsaren (canvas, max
     1200 px, JPEG 80 %) och sparas som images/recept/<recept>.jpg
     via GitHub-API:t – exakt den sökväg receptets .hero-img och
     receptkorten redan letar efter. Ingen receptfil röres.

   Centralt-principen: ingen per-receptkod – bara metaraden i
   filen. Skärm-badgen städas ur sparad HTML (redigera.js).
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_VERIF_LOADED) return;
  window.__MK_VERIF_LOADED = true;
  if (!window.__MK_IS_RECIPE) return;

  var META = 'recept:verifierad';

  function getDatum() {
    var m = document.querySelector('meta[name="' + META + '"]');
    return m ? (m.getAttribute('content') || '').trim() : '';
  }

  /* ============================================================
     🌟 GRÖN STJÄRNA uppe i receptheaderns hörn (alla besökare)
     ============================================================ */
  function visaBadge() {
    var old = document.getElementById('mk-verif-badge');
    if (old) old.remove();
    var datum = getDatum();
    if (!datum) return;
    var header = document.querySelector('body header');
    if (!header) return;
    if (window.getComputedStyle(header).position === 'static') {
      header.style.position = 'relative';
    }
    var b = document.createElement('div');
    b.id = 'mk-verif-badge';
    b.title = 'Verifierat recept – bakat & godkänt av kocken ' + datum;
    b.setAttribute('aria-label', b.title);
    b.style.cssText = 'position:absolute;top:10px;right:10px;width:40px;height:40px;' +
      'background:#27ae60;color:#fff;border-radius:50%;display:flex;align-items:center;' +
      'justify-content:center;font-size:1.35rem;box-shadow:0 3px 10px rgba(0,0,0,.3);' +
      'border:2px solid #fff;cursor:help;z-index:5;line-height:1;';
    b.textContent = '\u2605';
    header.appendChild(b);

    /* Liten förklaringsrad vid klick/tryck (mobil har ingen tooltip) */
    b.addEventListener('click', function () {
      var t = document.getElementById('mk-verif-info');
      if (t) { t.remove(); return; }
      t = document.createElement('div');
      t.id = 'mk-verif-info';
      t.className = 'no-print';
      t.style.cssText = 'position:absolute;top:56px;right:10px;background:#fff;color:#2c3e50;' +
        'border:2px solid #27ae60;border-radius:10px;padding:8px 14px;font-size:.82rem;' +
        'box-shadow:0 6px 18px rgba(0,0,0,.25);z-index:6;max-width:230px;';
      t.innerHTML = '<b style="color:#27ae60;">\u2605 Verifierat recept</b><br>Bakat &amp; godkänt av kocken ' + datum + '.';
      header.appendChild(t);
      setTimeout(function () { var x = document.getElementById('mk-verif-info'); if (x) x.remove(); }, 5000);
    });
  }

  /* ============================================================
     🌟-KNAPP i verktygsraden (admin – lösenordsskyddad vid klick)
     ============================================================ */
  function addButton() {
    var rnav = document.getElementById('mk-rnav');
    if (!rnav || document.getElementById('rnVerif')) return !!document.getElementById('rnVerif');
    var btn = document.createElement('button');
    btn.className = 'rb';
    btn.id = 'rnVerif';
    btn.title = getDatum()
      ? 'Verifierat ' + getDatum() + ' – klicka för att ändra (lösenord krävs)'
      : 'Markera som bakat & verifierat (lösenord krävs)';
    btn.innerHTML = '<span class="ic" style="' + (getDatum() ? 'filter:none;' : 'filter:grayscale(1);opacity:.75;') + '">🌟</span><span class="lb">Verifierat</span>';
    rnav.appendChild(btn);
    btn.addEventListener('click', oppnaDialog);
    return true;
  }
  var tries = 0;
  (function waitBar() {
    if (!addButton() && ++tries < 25) setTimeout(waitBar, 200);
  })();

  /* ============================================================
     Bekräftelsedialog (egen dialog – aldrig confirm(); hårt klick)
     ============================================================ */
  async function oppnaDialog() {
    if (!window.__MK_SPARA) { alert('Spara-modulen kunde inte laddas – prova igen om en stund.'); return; }
    /* 🔒 Lösenordet FÖRST – utan upplåsning visas inte ens dialogen */
    if (!(await window.__MK_SPARA.unlock())) return;

    var datum = getDatum();
    var old = document.getElementById('mk-verif-bg');
    if (old) old.remove();
    var bg = document.createElement('div');
    bg.id = 'mk-verif-bg';
    bg.className = 'no-print';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:320;display:flex;align-items:center;justify-content:center;padding:16px;';
    bg.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:430px;width:100%;padding:24px 26px;text-align:center;font-family:Segoe UI,system-ui,sans-serif;">' +
        '<div style="font-size:2.4rem;">' + (datum ? '\u2605' : '👨‍🍳') + '</div>' +
        (datum
          ? '<h3 style="margin:6px 0;color:#2c3e50;">Receptet är verifierat (' + datum + ')</h3>' +
            '<p style="font-size:.88rem;color:#7f8c8d;margin:0 0 14px;">Vill du ta bort verifieringen (t.ex. efter en större receptändring) eller uppdatera datumet till idag?</p>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
              '<button id="vf-idag" style="flex:1;background:#27ae60;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;cursor:pointer;font-family:inherit;">\u2605 Bakat igen idag</button>' +
              '<button id="vf-bort" style="flex:1;background:#c0392b;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;cursor:pointer;font-family:inherit;">✖ Ta bort</button>' +
              '<button id="vf-avbryt" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;font-family:inherit;">Avbryt</button>' +
            '</div>'
          : '<h3 style="margin:6px 0;color:#2c3e50;">Har du bakat & godkänt receptet?</h3>' +
            '<p style="font-size:.88rem;color:#7f8c8d;margin:0 0 14px;">Receptet märks som <b style="color:#27ae60;">\u2605 Verifierat</b> med dagens datum – den gröna stjärnan visas uppe i hörnet på receptet och på receptkortet för alla besökare.</p>' +
            '<div style="display:flex;gap:10px;">' +
              '<button id="vf-ja" style="flex:1;background:#27ae60;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;cursor:pointer;font-family:inherit;">\u2605 Ja – verifiera!</button>' +
              '<button id="vf-avbryt" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;font-family:inherit;">Avbryt</button>' +
            '</div>') +
        /* 📷 Bild på baket – frivillig, laddas upp ihop med verifieringen */
        '<div style="margin-top:14px;border-top:1.5px solid #f0ebe3;padding-top:12px;text-align:left;">' +
          '<label style="display:block;font-size:.78rem;font-weight:700;color:#7f8c8d;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">📷 Bild på baket/rätten (frivilligt)</label>' +
          '<input type="file" id="vf-bild" accept="image/*" style="font-size:.85rem;width:100%;font-family:inherit;">' +
          '<div id="vf-bild-preview" style="margin-top:8px;"></div>' +
          '<div style="font-size:.72rem;color:#7f8c8d;margin-top:4px;">Bilden förminskas automatiskt (max 1200 px, JPEG) och blir receptets bild – syns överst på receptet och på receptkortet. Befintlig bild ersätts.</div>' +
        '</div>' +
        '<div id="vf-result" style="margin-top:10px;font-size:.85rem;"></div>' +
      '</div>';
    document.body.appendChild(bg);

    /* 📷 Förhandsvisning + "spara bara bilden"-knapp när en bild valts */
    var fil = bg.querySelector('#vf-bild');
    fil.addEventListener('change', function () {
      var pv = bg.querySelector('#vf-bild-preview');
      pv.innerHTML = '';
      if (!fil.files || !fil.files[0]) return;
      var url = URL.createObjectURL(fil.files[0]);
      pv.innerHTML = '<img src="' + url + '" alt="" style="max-width:100%;max-height:140px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.2);">' +
        '<button id="vf-barabild" style="display:block;width:100%;margin-top:8px;background:#2c3e50;color:#fff;border:none;border-radius:10px;padding:10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.88rem;">📷 Spara bara bilden (rör inte verifieringen)</button>';
      pv.querySelector('#vf-barabild').onclick = function () {
        sparaVerifiering(bg, getDatum() || null, true);   /* behåll nuvarande status */
      };
    });

    var ja = bg.querySelector('#vf-ja');
    var idag = bg.querySelector('#vf-idag');
    var bort = bg.querySelector('#vf-bort');
    if (ja) ja.onclick = function () { sparaVerifiering(bg, new Date().toISOString().slice(0, 10)); };
    if (idag) idag.onclick = function () { sparaVerifiering(bg, new Date().toISOString().slice(0, 10)); };
    if (bort) bort.onclick = function () { sparaVerifiering(bg, null); };
    bg.querySelector('#vf-avbryt').onclick = function () { bg.remove(); };
    var dn = false;
    bg.addEventListener('mousedown', function (e) { dn = (e.target === bg); });
    bg.addEventListener('click', function (e) { if (e.target === bg && dn) bg.remove(); });
  }

  /* ============================================================
     📷 Bild → nedskalad JPEG som ren base64 (för GitHub-API:t)
     Max 1200 px längsta sida, kvalitet 0.8 – bra för Pages.
     ============================================================ */
  function bildTillB64(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        try {
          var MAX = 1200;
          var w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) throw new Error('kunde inte läsa bilden');
          var skala = Math.min(1, MAX / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.round(w * skala);
          c.height = Math.round(h * skala);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          var dataUrl = c.toDataURL('image/jpeg', 0.8);
          URL.revokeObjectURL(url);
          resolve(dataUrl.split(',')[1]);   /* ren base64 utan prefix */
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('ogiltig bildfil')); };
      img.src = url;
    });
  }

  /* 📷 Ny bild uppladdad → visa den i receptets hero DIREKT
     (lokal förhandsvisning – GitHubs råfil är färsk, Pages ~1 min) */
  function visaNyBild(bg, bildRes, filEl) {
    if (!(bildRes && bildRes.ok && filEl && filEl.files && filEl.files[0])) return;
    var hero = document.querySelector('.hero-img');
    if (hero) {
      hero.classList.remove('mk-hero-auto');
      hero.removeAttribute('data-mk-auto');
      hero.onerror = null;
      hero.src = URL.createObjectURL(filEl.files[0]);
      hero.style.display = '';
    }
  }

  /* ============================================================
     Spara: metaraden skrivs/uppdateras/tas bort i receptfilens
     RÅTEXT (minimal diff – rör inget annat i filen).
     Vald 📷-bild laddas upp som images/recept/<recept>.jpg.
     ============================================================ */
  async function sparaVerifiering(bg, datum, baraBild) {
    var fname = decodeURIComponent(location.pathname.split('/').pop());
    var out = bg.querySelector('#vf-result');
    out.innerHTML = '⏳ Sparar...';

    /* 📷 Bilden först (om vald) – oberoende av verifieringsstatus */
    var bildRes = null;
    var filEl = bg.querySelector('#vf-bild');
    if (filEl && filEl.files && filEl.files[0]) {
      out.innerHTML = '⏳ Förminskar & laddar upp bilden...';
      var bildNamn = 'images/recept/' + fname.replace(/\.html?$/i, '') + '.jpg';
      try {
        var b64bild = await bildTillB64(filEl.files[0]);
        bildRes = await window.__MK_SPARA.save(bildNamn, b64bild,
          '📷 Receptbild via verifieringen: ' + fname, true);
      } catch (e) { bildRes = { ok: false, error: e.message }; }
      if (!bildRes.ok) {
        out.innerHTML = '<span style="color:#c0392b;">⚠️ Bilden kunde inte laddas upp: ' + bildRes.error + '</span>' +
          (baraBild ? '' : '<br><span style="color:#7f8c8d;">Verifieringen fortsätter ändå...</span>');
        if (baraBild) return;   /* bara bild begärd och den misslyckades → stanna */
      }
      if (!baraBild) out.innerHTML += '<br>⏳ Sparar verifieringen...';
    }

    /* 📷 "Spara bara bilden": receptfilen röres INTE alls */
    if (baraBild) {
      visaNyBild(bg, bildRes, filEl);
      bg.remove();
      return;
    }
    var res = { ok: false, error: 'okänt fel' };
    try {
      var txt = await window.__MK_SPARA.load('recept/' + fname);
      if (!txt) throw new Error('kunde inte läsa receptfilen');
      var metaRe = /[ \t]*<meta\s+name="recept:verifierad"[^>]*>\s*\n?/i;
      if (datum) {
        var rad = '<meta name="recept:verifierad" content="' + datum + '">\n';
        if (metaRe.test(txt)) {
          txt = txt.replace(metaRe, rad);
        } else {
          /* Efter recept:namn-raden (finns alltid – metadata-kravet) */
          var ankare = /(<meta\s+name="recept:namn"[^>]*>\s*\n?)/i;
          if (ankare.test(txt)) txt = txt.replace(ankare, '$1' + rad);
          else txt = txt.replace(/(<\/title>\s*\n?)/i, '$1' + rad);
        }
      } else {
        txt = txt.replace(metaRe, '');
      }
      res = await window.__MK_SPARA.save('recept/' + fname, txt,
        datum ? ('Recept verifierat \u2605 ' + datum + ': ' + fname) : ('Verifiering borttagen: ' + fname));
    } catch (e) { res = { ok: false, error: e.message }; }

    if (res.ok) {
      /* Uppdatera sidans meta + badge + knapp direkt (ingen omladdning) */
      var m = document.querySelector('meta[name="' + META + '"]');
      if (datum) {
        if (!m) {
          m = document.createElement('meta');
          m.setAttribute('name', META);
          document.head.appendChild(m);
        }
        m.setAttribute('content', datum);
      } else if (m) { m.remove(); }
      visaBadge();
      var btn = document.getElementById('rnVerif');
      if (btn) {
        btn.title = datum ? 'Verifierat ' + datum + ' – klicka för att ändra (lösenord krävs)'
                          : 'Markera som bakat & verifierat (lösenord krävs)';
        var ic = btn.querySelector('.ic');
        if (ic) ic.style.cssText = datum ? 'filter:none;' : 'filter:grayscale(1);opacity:.75;';
      }
      visaNyBild(bg, bildRes, filEl);
      bg.remove();
    } else {
      out.innerHTML = '<span style="color:#c0392b;">⚠️ Kunde inte spara: ' + res.error + '</span>';
    }
  }

  /* Init */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', visaBadge);
  } else {
    visaBadge();
  }
})();
