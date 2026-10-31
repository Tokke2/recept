/* PLATS: /assets/jast.js  (laddas av site.js på RECEPTSIDOR)
   ============================================================
   🦠 JÄSTOMVANDLAREN (roadmap 81, förslag 607 – användarens
   beställning): i ALLA recept där jäst förekommer visas en
   omvandlare/ersättare mellan FÄRSK och TORR jäst.

   · Ägarens regel (SPEC roadmap 81): TORR = 1/3 AV FÄRSK VIKT.
     Standard = torrjäst.
   · Hittar jästrader i ingredienstabellen: namn som innehåller
     "jäst" – MEN ALDRIG jästflingor/näringsjäst/jästextrakt/
     surdeg (helt andra varor!). "Jäst" utan form räknas som
     färsk (svensk konvention: kuben i kyldisken).
   · 🔄-knappen växlar tabellens jästrad(er) mellan formerna med
     omräknad mängd (samma mönster som 💧 hydrering: ENDAST
     jästraden ändras, live-kalkylen uppdateras via
     __MK_KALKYL_REFRESH).
   · Ingenting sparas i filen: originalet ligger i
     data-mk-jast-orig på raden – buildCleanHtml (redigera.js)
     återställer raden + tar bort #mk-jast vid sparning, och
     valet minns per besökare i localStorage (mk-jast:<fil>).
   · Visar bara omvandling när mängden går att läsa i gram –
     inga påhittade siffror (ärlighetsprincipen).
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_JAST_LOADED) return;
  window.__MK_JAST_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  var JAST_RE = /jäst|jast/i;
  var EJ_RE = /jästflingor|jastflingor|näringsjäst|naringsjast|jästextrakt|jastextrakt|surdeg/i;
  var NYCKEL = 'mk-jast:' + decodeURIComponent(location.pathname.split('/').pop());
  var FAKTOR = 3;   /* ägarens regel: torrjäst = 1/3 av färsk vikt */

  function ingTable() {
    var t = document.querySelector('.mk-ing2');
    if (t) return t;
    var cards = document.querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      var h = cards[i].querySelector('h2');
      if (h && /ingrediens/i.test(h.textContent)) return cards[i].querySelector('table');
    }
    return null;
  }
  function rowName(tr) {
    var td = tr.querySelector('td');
    if (!td) return '';
    var c = td.cloneNode(true);
    c.querySelectorAll('.mg, .mk-rowbtn, .mk-saknas, .mk-prodlank, .drop, .no-print').forEach(function (x) { x.remove(); });
    return c.textContent.replace(/[✕✖]/g, '').trim();
  }
  function qtyCell(tr) { return tr.querySelector('.mg') || tr.querySelectorAll('td')[1] || null; }
  function namnCell(tr) { return tr.querySelector('td'); }

  function gramAv(tr) {
    var c = qtyCell(tr);
    var m = c && c.textContent.match(/([\d.,]+)\s*g\b/i);
    return m ? parseFloat(m[1].replace(',', '.')) : 0;
  }
  function fmtG(n) {
    /* 🔢 ALLTID NÄRMASTE HELTAL (användarens regel) – aldrig "0 g":
       minsta visade mängd är 1 g. 10/3 → "3 g", 2×3 → "6 g". */
    var r = Math.round(n);
    if (r < 1 && n > 0) r = 1;
    return r + ' g';
  }

  /* Alla äkta jästrader med form + gram */
  function jastRader() {
    var tbl = ingTable();
    if (!tbl) return [];
    var ut = [];
    tbl.querySelectorAll('tr').forEach(function (tr) {
      if (tr.classList.contains('total')) return;
      var namn = rowName(tr);
      if (!namn || !JAST_RE.test(namn) || EJ_RE.test(namn)) return;
      var g = gramAv(tr);
      if (!g) return;                                   /* "1 pkt" m.m. → avstå, inga gissningar */
      var form = /torr/i.test(namn) ? 'torr' : 'farsk'; /* "jäst" = färsk (kuben) */
      ut.push({ tr: tr, namn: namn, g: g, form: form });
    });
    return ut;
  }

  /* Växla EN rad till angiven form (sparar original i data-attributet) */
  function sattForm(rad, form) {
    var tr = rad.tr;
    if (!tr.getAttribute('data-mk-jast-orig')) {
      tr.setAttribute('data-mk-jast-orig', JSON.stringify({
        namn: rad.namn, mangd: (qtyCell(tr) || {}).textContent || ''
      }));
    }
    var orig = JSON.parse(tr.getAttribute('data-mk-jast-orig'));
    var origG = parseFloat((orig.mangd.match(/([\d.,]+)\s*g/i) || [0, 0])[1].replace(',', '.'));
    var origForm = /torr/i.test(orig.namn) ? 'torr' : 'farsk';

    var nc = namnCell(tr), qc = qtyCell(tr);
    if (!nc || !qc || !origG) return;
    if (form === origForm) {                            /* tillbaka till originalet, exakt */
      nc.textContent = orig.namn;
      qc.textContent = orig.mangd;
      tr.removeAttribute('data-mk-jast-orig');
    } else if (form === 'torr') {
      nc.textContent = 'Torrjäst';
      qc.textContent = fmtG(origG / FAKTOR);
    } else {
      nc.textContent = 'Färsk jäst';
      qc.textContent = fmtG(origG * FAKTOR);
    }
    if (window.__MK_KALKYL_REFRESH) window.__MK_KALKYL_REFRESH();
  }

  function aktuellForm(rader) {
    /* raden kan redan vara växlad – läs formen ur tabellen nu */
    var tr0 = rader[0].tr;
    return /torr/i.test(rowName(tr0)) ? 'torr' : 'farsk';
  }

  /* 🏷️ KONVERTERING DIREKT PÅ JÄSTRADEN (användarens regel: "alltid
     i alla recept där färsk jäst anges, även visa konvertering av
     torr jäst"): mängdcellen får ett diskret tillägg –
     "10 g (≈ 3,3 g torrjäst)". Åt båda håll (torr → färsk visas
     också). Hoppar över rader som REDAN nämner andra formen
     (t.ex. "7 g (eller 2 g torrjäst)" skriven av ägaren).
     Runtime-span (.mk-jastalt): följer med på UTSKRIFT men städas
     ALLTID ur sparade filer av buildCleanHtml. Mängd-parsers
     (kalkyl/hydrering/skala) läser första talet – opåverkade. */
  function radTips() {
    jastRader().forEach(function (rad) {
      var qc = qtyCell(rad.tr);
      if (!qc || qc.querySelector('.mk-jastalt')) return;
      var text = qc.textContent;
      if (rad.form === 'farsk' && /torrjäst|torr jäst/i.test(text)) return;
      if (rad.form === 'torr' && /färsk/i.test(text)) return;
      var alt;
      var origAttr = rad.tr.getAttribute('data-mk-jast-orig');
      if (origAttr) {
        /* raden är VÄXLAD → visa ägarens EXAKTA originalmängd
           (annars blir 10 g → 3,3 g → "9,9 g" av avrundningen) */
        var o = JSON.parse(origAttr);
        var og = parseFloat((o.mangd.match(/([\d.,]+)\s*g/i) || [0, 0])[1].replace(',', '.'));
        var oForm = /torr/i.test(o.namn) ? 'torr' : 'farsk';
        if (oForm !== rad.form && og) {
          alt = fmtG(og) + (oForm === 'torr' ? ' torrjäst' : ' färsk jäst');
        }
      }
      if (!alt) {
        alt = rad.form === 'farsk'
          ? fmtG(rad.g / FAKTOR) + ' torrjäst'
          : fmtG(rad.g * FAKTOR) + ' färsk jäst';
      }
      var s = document.createElement('span');
      s.className = 'mk-jastalt';
      s.textContent = ' (≈ ' + alt + ')';
      s.style.cssText = 'color:#7f8c8d;font-weight:400;font-size:.88em;white-space:nowrap;';
      qc.appendChild(s);
    });
  }

  function bygg() {
    if (document.getElementById('mk-jast')) return;
    var rader = jastRader();
    if (!rader.length) return;
    var tbl = ingTable();
    var card = tbl.closest('.card') || tbl.parentNode;

    var box = document.createElement('div');
    box.id = 'mk-jast';
    box.className = 'no-print';
    box.style.cssText = 'margin-top:10px;padding:12px 16px;background:linear-gradient(135deg,#fdf6ee,#f4fbf6);' +
      'border:1.5px solid #ead9c2;border-radius:12px;font-size:.88rem;';
    card.appendChild(box);

    function mala() {
      radTips();   /* 🏷️ rad-konverteringen alltid på plats (användarens regel) */
      var r = jastRader();
      if (!r.length) { box.style.display = 'none'; return; }
      var form = aktuellForm(r);
      var g = r.reduce(function (s, x) { return s + gramAv(x.tr); }, 0);
      var andra = form === 'torr'
        ? { form: 'farsk', text: '🧊 ' + fmtG(g * FAKTOR) + ' färsk jäst', knapp: '🔄 Byt till färsk jäst i tabellen' }
        : { form: 'torr', text: '🥄 ' + fmtG(g / FAKTOR) + ' torrjäst', knapp: '🔄 Byt till torrjäst i tabellen' };
      box.innerHTML =
        '<b>🦠 Jästomvandlaren</b> <span style="color:#7f8c8d;font-size:.8rem;">(torrjäst = 1/3 av färsk vikt)</span>' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;">' +
          '<span>Receptet just nu: <b>' + fmtG(g) + ' ' + (form === 'torr' ? 'torrjäst' : 'färsk jäst') + '</b> ≈ <b style="color:#27ae60;">' + andra.text + '</b></span>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">' +
          '<button type="button" id="mk-jast-byt" style="background:#27ae60;color:#fff;border:none;border-radius:9px;' +
            'padding:8px 14px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.82rem;">' + andra.knapp + '</button>' +
          (document.querySelector('[data-mk-jast-orig]')
            ? '<button type="button" id="mk-jast-reset" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:9px;' +
              'padding:8px 14px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.82rem;">↩️ Receptets original</button>'
            : '') +
        '</div>';
      var byt = box.querySelector('#mk-jast-byt');
      byt.onclick = function () {
        jastRader().forEach(function (x) { sattForm(x, andra.form); });
        try {
          var origForm = /torr/i.test(JSON.parse((document.querySelector('[data-mk-jast-orig]') || { getAttribute: function () { return '{"namn":""}'; } }).getAttribute('data-mk-jast-orig') || '{"namn":""}').namn) ? 'torr' : 'farsk';
          if (andra.form === origForm) localStorage.removeItem(NYCKEL);
          else localStorage.setItem(NYCKEL, andra.form);
        } catch (e) {}
        mala();
      };
      var reset = box.querySelector('#mk-jast-reset');
      if (reset) reset.onclick = function () {
        document.querySelectorAll('[data-mk-jast-orig]').forEach(function (tr) {
          var o = JSON.parse(tr.getAttribute('data-mk-jast-orig'));
          var nc = tr.querySelector('td'), qc = tr.querySelector('.mg') || tr.querySelectorAll('td')[1];
          if (nc) nc.textContent = o.namn;
          if (qc) qc.textContent = o.mangd;
          tr.removeAttribute('data-mk-jast-orig');
        });
        try { localStorage.removeItem(NYCKEL); } catch (e) {}
        if (window.__MK_KALKYL_REFRESH) window.__MK_KALKYL_REFRESH();
        mala();
      };
    }
    mala();

    /* besökarens sparade val återläggs */
    try {
      var sparad = localStorage.getItem(NYCKEL);
      if (sparad) {
        var r = jastRader();
        if (r.length && aktuellForm(r) !== sparad) {
          r.forEach(function (x) { sattForm(x, sparad); });
          mala();
        }
      }
    } catch (e) {}
  }

  /* tabellen kan byggas om av andra moduler – försök lugnt några gånger */
  var forsok = 0;
  var iv = setInterval(function () {
    forsok++;
    if (document.getElementById('mk-jast') || forsok > 10) { clearInterval(iv); return; }
    if (ingTable()) { clearInterval(iv); bygg(); }
  }, 400);
})();
