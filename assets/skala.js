/* ============================================================
   PLATS: /assets/skala.js  (assets-mappen i repo-roten)
   ============================================================
   ⚖️ SATS-SKALNING + SKÖRDE-KALKYLATOR – Mitt Maskinkök
   ============================================================
   Knapp i receptverktygsraden öppnar en dialog med TRE sätt:
     1. Snabbknappar ×½ · ×2 · ×3
     2. Egen faktor (t.ex. 1,7)
     3. 🧮 SKÖRDE-LÄGE: "Jag har 3,2 kg tomater" → välj ingrediens,
        ange din mängd → HELA receptet skalas proportionellt
   Alla mängder på sidan (ingredienstabell + mängder i stegtext)
   räknas om PÅ SKÄRMEN – källfilen röres aldrig, sparad HTML
   städas alltid tillbaka till originalet (spans mk-skala med
   data-orig, samma teknik som enheter.js).
   Kalkylen räknas om automatiskt (läser levande celltext).
   Dialogen följer hårt-klick-regeln (mousedown+click på bakgrund).
   Laddas av site.js på receptsidor.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_SKALA_LOADED) return;
  window.__MK_SKALA_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  var faktor = 1;

  function sv(n) {
    /* snygg svensk siffra: 250 → 250, 12.5 → 12,5, 0.33 → 0,35 */
    var dec = n >= 100 ? 0 : (n >= 10 ? (n % 1 ? 1 : 0) : (n % 1 ? 2 : 0));
    return n.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: dec });
  }

  /* Tal + enhet i text: "250 g", "2,5 dl", "35–40 g", "1 msk" */
  var TAL_RE = /(\d+(?:[.,]\d+)?)(\s*[–\-]\s*\d+(?:[.,]\d+)?)?(\s*)(kg|g|gram|l|liter|dl|cl|ml|msk|tsk|krm|st|burkar?|påsar?|klyftor)\b/gi;
  function skalaText(text, f) {
    return text.replace(TAL_RE, function (m, a, spann, mellan, enhet) {
      var ut = sv(parseFloat(a.replace(',', '.')) * f);
      if (spann) {
        var b = spann.replace(/[–\-\s]/g, '');
        ut += '–' + sv(parseFloat(b.replace(',', '.')) * f);
      }
      return ut + mellan + enhet;
    });
  }

  /* ---------- Applicera på sidan (spans med data-orig) ---------- */
  function aterstall() {
    document.querySelectorAll('span.mk-skala').forEach(function (s) {
      s.parentNode.replaceChild(document.createTextNode(s.getAttribute('data-orig')), s);
    });
    var b = document.getElementById('mk-skala-badge');
    if (b) b.remove();
  }
  window.__MK_SKALA_RESET = aterstall;
  /* 🍽️ portion.js skalar ingredienserna när antal portioner ändras */
  window.__MK_SKALA_APPLY = function (f) { applicera(f); };

  function applicera(f) {
    aterstall();
    faktor = f;
    if (Math.abs(f - 1) < 0.001) { efterAndring(); return; }
    var zoner = document.querySelectorAll('.mk-ing-card, .mk-ing2, .card, .machine-step');
    var gjorda = [];
    zoner.forEach(function (zon) {
      if (zon.closest('#mk-kalkyl')) return;
      var walker = document.createTreeWalker(zon, window.NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || !/\d/.test(n.nodeValue)) return window.NodeFilter.FILTER_REJECT;
          var p = n.parentNode;
          if (!p || /^(SCRIPT|STYLE|BUTTON)$/.test(p.nodeName)) return window.NodeFilter.FILTER_REJECT;
          if (p.closest && (p.closest('.mk-skala') || p.closest('#mk-kalkyl') || p.closest('.no-print') ||
              p.closest('.mk-ingsub') || p.closest('.pris'))) return window.NodeFilter.FILTER_REJECT;
          TAL_RE.lastIndex = 0;
          return TAL_RE.test(n.nodeValue) ? window.NodeFilter.FILTER_ACCEPT : window.NodeFilter.FILTER_REJECT;
        }
      });
      var noder = [];
      while (walker.nextNode()) { if (gjorda.indexOf(walker.currentNode) === -1) noder.push(walker.currentNode); }
      noder.forEach(function (nod) {
        gjorda.push(nod);
        var orig = nod.nodeValue;
        var ny = skalaText(orig, f);
        if (ny === orig) return;
        var span = document.createElement('span');
        span.className = 'mk-skala';
        span.setAttribute('data-orig', orig);
        span.textContent = ny;
        span.style.cssText = 'color:#8e44ad;font-weight:inherit;';
        nod.parentNode.replaceChild(span, nod);
      });
    });
    /* Badge som visar aktiv skalning + återställ-knapp */
    var badge = document.createElement('div');
    badge.id = 'mk-skala-badge';
    badge.className = 'no-print';
    badge.style.cssText = 'position:fixed;top:12px;right:12px;z-index:118;background:#8e44ad;color:#fff;' +
      'border-radius:999px;padding:8px 16px;font-family:Segoe UI,system-ui,sans-serif;font-size:.85rem;' +
      'font-weight:700;box-shadow:0 4px 14px rgba(142,68,173,.4);display:flex;gap:10px;align-items:center;';
    badge.innerHTML = '⚖️ Satsen ×' + sv(f) +
      '<button style="background:rgba(255,255,255,.25);color:#fff;border:none;border-radius:99px;' +
      'padding:3px 10px;font-size:.75rem;font-weight:700;cursor:pointer;font-family:inherit;">Återställ</button>';
    badge.querySelector('button').onclick = function () { faktor = 1; aterstall(); efterAndring(); };
    document.body.appendChild(badge);
    efterAndring();
  }

  function efterAndring() {
    if (window.__MK_KALKYL_REFRESH) window.__MK_KALKYL_REFRESH();
  }

  /* ---------- Ingredienser för skörde-läget ---------- */
  function lasIngredienser() {
    var ut = [];
    document.querySelectorAll('.mk-ing2 tr[data-namn]').forEach(function (tr) {
      var namn = tr.getAttribute('data-namn');
      var matt = (tr.querySelector('.matt') || {}).textContent || tr.getAttribute('data-mangd') || '';
      var m = String(matt).replace(',', '.').match(/([\d.]+)\s*(kg|g|l|dl|cl|ml)\b/i);
      if (!m) return;
      var tal = parseFloat(m[1]);
      var enhet = m[2].toLowerCase();
      var iGram = enhet === 'kg' || enhet === 'l' ? tal * 1000 : enhet === 'dl' ? tal * 100 : enhet === 'cl' ? tal * 10 : tal;
      ut.push({ namn: namn, tal: tal, enhet: enhet, gram: iGram, visning: matt.trim() });
    });
    return ut;
  }

  /* ---------- Dialogen ---------- */
  function oppna() {
    if (document.getElementById('mk-skala-bg')) return;
    var ings = lasIngredienser();
    var bg = document.createElement('div');
    bg.id = 'mk-skala-bg';
    bg.className = 'no-print';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:320;display:flex;' +
      'align-items:center;justify-content:center;padding:16px;';
    bg.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;padding:24px 26px;' +
        'font-family:Segoe UI,system-ui,sans-serif;color:#2c3e50;max-height:90vh;overflow-y:auto;">' +
        '<h3 style="margin:0 0 4px;">⚖️ Skala satsen</h3>' +
        '<p style="font-size:.82rem;color:#7f8c8d;margin:0 0 14px;">Alla mängder räknas om på skärmen – receptfilen ändras inte.</p>' +

        '<div style="display:flex;gap:8px;margin-bottom:14px;">' +
          '<button class="sk-snabb" data-f="0.5" style="flex:1;background:#f0ebe3;border:none;border-radius:10px;padding:12px;font-weight:800;font-size:1rem;cursor:pointer;font-family:inherit;">×½</button>' +
          '<button class="sk-snabb" data-f="2" style="flex:1;background:#f0ebe3;border:none;border-radius:10px;padding:12px;font-weight:800;font-size:1rem;cursor:pointer;font-family:inherit;">×2</button>' +
          '<button class="sk-snabb" data-f="3" style="flex:1;background:#f0ebe3;border:none;border-radius:10px;padding:12px;font-weight:800;font-size:1rem;cursor:pointer;font-family:inherit;">×3</button>' +
        '</div>' +

        '<label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px;">Egen faktor</label>' +
        '<div style="display:flex;gap:8px;margin-bottom:16px;">' +
          '<input id="sk-egen" type="text" inputmode="decimal" placeholder="t.ex. 1,7" value="' + (faktor !== 1 ? String(faktor).replace('.', ',') : '') + '" ' +
            'style="flex:1;padding:11px 13px;border:2px solid #e8e2d8;border-radius:10px;font-size:.95rem;font-family:inherit;">' +
          '<button id="sk-egen-ok" style="background:#8e44ad;color:#fff;border:none;border-radius:10px;padding:11px 20px;font-weight:700;cursor:pointer;font-family:inherit;">Skala</button>' +
        '</div>' +

        (ings.length ? (
        '<div style="border-top:2px dashed #e8e2d8;padding-top:14px;">' +
          '<label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px;">🧮 Skörde-läge: utgå från det DU har</label>' +
          '<p style="font-size:.78rem;color:#7f8c8d;margin:0 0 8px;">Välj din huvudråvara och ange hur mycket du har – hela receptet följer med.</p>' +
          '<select id="sk-ing" style="width:100%;padding:10px 12px;border:2px solid #e8e2d8;border-radius:10px;font-size:.9rem;font-family:inherit;margin-bottom:8px;">' +
            ings.map(function (x, i) {
              return '<option value="' + i + '">' + x.namn + ' (receptet: ' + x.visning + ')</option>';
            }).join('') + '</select>' +
          '<div style="display:flex;gap:8px;">' +
            '<input id="sk-har" type="text" inputmode="decimal" placeholder="Jag har..." ' +
              'style="flex:1;padding:11px 13px;border:2px solid #e8e2d8;border-radius:10px;font-size:.95rem;font-family:inherit;">' +
            '<select id="sk-enhet" style="padding:10px;border:2px solid #e8e2d8;border-radius:10px;font-size:.9rem;font-family:inherit;">' +
              '<option value="kg">kg</option><option value="g">g</option><option value="l">l</option><option value="dl">dl</option>' +
            '</select>' +
            '<button id="sk-har-ok" style="background:#27ae60;color:#fff;border:none;border-radius:10px;padding:11px 18px;font-weight:700;cursor:pointer;font-family:inherit;">Räkna</button>' +
          '</div>' +
          '<div id="sk-resultat" style="font-size:.85rem;color:#27ae60;font-weight:700;min-height:20px;margin-top:8px;"></div>' +
        '</div>') : '') +

        '<button id="sk-stang" style="width:100%;margin-top:14px;background:#ecf0f1;color:#2c3e50;border:none;' +
          'border-radius:10px;padding:11px;font-weight:700;cursor:pointer;font-family:inherit;">Stäng</button>' +
      '</div>';
    document.body.appendChild(bg);

    function stang() { bg.remove(); }
    bg.querySelector('#sk-stang').onclick = stang;
    var ned = false;
    bg.addEventListener('mousedown', function (e) { ned = (e.target === bg); });
    bg.addEventListener('click', function (e) { if (e.target === bg && ned) stang(); });

    bg.querySelectorAll('.sk-snabb').forEach(function (b) {
      b.onclick = function () { applicera(parseFloat(b.getAttribute('data-f'))); stang(); };
    });
    function egenOk() {
      var v = parseFloat((bg.querySelector('#sk-egen').value || '').replace(',', '.'));
      if (!v || v <= 0 || v > 50) {
        bg.querySelector('#sk-egen').style.borderColor = '#c0392b';
        return;
      }
      applicera(v); stang();
    }
    bg.querySelector('#sk-egen-ok').onclick = egenOk;
    bg.querySelector('#sk-egen').addEventListener('keydown', function (e) { if (e.key === 'Enter') egenOk(); });

    if (ings.length) {
      function harOk() {
        var harEl = bg.querySelector('#sk-har');
        var v = parseFloat((harEl.value || '').replace(',', '.'));
        if (!v || v <= 0) { harEl.style.borderColor = '#c0392b'; return; }
        var enhet = bg.querySelector('#sk-enhet').value;
        var iGram = (enhet === 'kg' || enhet === 'l') ? v * 1000 : enhet === 'dl' ? v * 100 : v;
        var ing = ings[+bg.querySelector('#sk-ing').value];
        var f = iGram / ing.gram;
        bg.querySelector('#sk-resultat').textContent =
          '→ faktor ×' + sv(f) + ' (receptets ' + ing.visning + ' → din mängd ' + v.toLocaleString('sv-SE') + ' ' + enhet + ')';
        setTimeout(function () { applicera(f); stang(); }, 900);
      }
      bg.querySelector('#sk-har-ok').onclick = harOk;
      bg.querySelector('#sk-har').addEventListener('keydown', function (e) { if (e.key === 'Enter') harOk(); });
    }
  }

  /* ---------- Knapp i verktygsraden ---------- */
  var forsok = 0;
  (function vantaBar() {
    var bar = document.getElementById('mk-rnav');
    if (!bar) { if (++forsok < 60) return void setTimeout(vantaBar, 250); return; }
    if (document.getElementById('rnSkala')) return;
    var b = document.createElement('button');
    b.className = 'rb';
    b.id = 'rnSkala';
    b.title = 'Skala satsen (×2, egen faktor eller efter din skörd)';
    b.innerHTML = '<span class="ic">⚖️</span><span class="lb">Skala</span>';
    var enh = document.getElementById('rnEnh');
    var print = document.getElementById('rnPrint');
    bar.insertBefore(b, enh || print || null);
    b.addEventListener('click', oppna);
  })();
})();
