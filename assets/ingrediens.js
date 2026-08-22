/* ============================================================
   PLATS: /assets/ingrediens.js  (assets-mappen i repo-roten)
   ============================================================
   INGREDIENSTABELL v2 – Mitt Maskinkök
   ============================================================
   Gör om ingredienstabellen på ALLA receptsidor centralt:

   · Namn + mängd i SAMMA kolumn (mängden som grön pastill)
   · Priset längst till höger, diskret – förknippas inte med mängden
   · Tydlig understrykning per rad – lätt att följa raden med ögat
   · 💧 VÄTSKOR SORTERAS ÖVERST (bakmaskinsordning: vätskan i först!)
   · TOTALT-raden ligger alltid sist, markerad

   Källfilerna behåller sina vanliga tabeller (Ingrediens/Mängd/
   Kostnad) – designen läggs på här, på ETT ställe för alla recept.
   Kockläget läser data-namn/data-mangd som sätts på varje rad.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_ING_LOADED) return;
  window.__MK_ING_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  /* Vätskor (bakmaskinsordning: dessa ska i maskinen först).
     OBS: \b funkar inte med åäö i JS – egen ordgräns används. */
  /* Två sorters ord: HELA ord (rom får inte träffa "romkross")
     och SLUT-DELAR (olja träffar rapsolja/olivolja, mjölk träffar
     havremjölk – men mjöl träffar INTE eftersom det inte är vätska). */
  var HELA_ORD = ['vatten', 'yoghurt', 'juice', 'saft', 'honung', 'sirap',
    'ägg', 'agg', 'rom', 'rum', 'vin', 'öl', 'läsk', 'lask', 'kaffe'];
  var SLUT_DELAR = ['olja', 'mjölk', 'mjolk', 'grädde', 'gradde'];
  function arVatska(namn) {
    var n = ' ' + namn.toLowerCase() + ' ';
    var hel = HELA_ORD.some(function (w) {
      var i = n.indexOf(w);
      while (i !== -1) {
        if (!/[a-zåäö]/.test(n[i - 1]) && !/[a-zåäö]/.test(n[i + w.length])) return true;
        i = n.indexOf(w, i + 1);
      }
      return false;
    });
    if (hel) return true;
    return SLUT_DELAR.some(function (w) {
      var i = n.indexOf(w);
      while (i !== -1) {
        if (!/[a-zåäö]/.test(n[i + w.length])) return true;  /* ordSLUT räcker */
        i = n.indexOf(w, i + 1);
      }
      return false;
    });
  }

  var css = document.createElement('style');
  css.textContent =
    '.mk-ing2 { width:100%; border-collapse:collapse; font-size:.92rem; }' +
    '.mk-ing2 th { text-align:left; padding:8px 10px; background:#f0ebe3; font-size:.75rem;' +
      'text-transform:uppercase; letter-spacing:.05em; color:#7f8c8d; }' +
    '.mk-ing2 th.matt, .mk-ing2 td.matt { text-align:right; white-space:nowrap; width:1%; }' +
    '.mk-ing2 th.pris, .mk-ing2 td.pris { text-align:right; white-space:nowrap; width:1%; }' +
    '.mk-ing2 td { padding:9px 10px; border-bottom:1.5px solid #e8e2d8; vertical-align:middle; }' +
    '.mk-ing2 tr:last-child td { border-bottom:none; }' +
    '.mk-ing2 td.matt { font-weight:700; color:#27ae60; font-variant-numeric:tabular-nums; }' +
    '.mk-ing2 td.pris { color:#a5967e; font-size:.88em; font-variant-numeric:tabular-nums; }' +
    '.mk-ing2 .drop { margin-right:5px; }' +
    '.mk-ing2 tr.tot td { background:#faf7f2; font-weight:700; border-top:2px solid #d5cbb8; }' +
    '.mk-ing2 tr.tot td.matt, .mk-ing2 tr.tot td.pris { color:#2c3e50; }' +
    '@media print{' +
      '.mk-ing2 td{border-bottom:.5pt solid #999!important;padding:1.8mm 2mm!important;}' +
      '.mk-ing2 td.matt{color:#000!important;}' +
      '.mk-ing2 td.pris{color:#555!important;}' +
      '.mk-ing2 tr.tot td{background:#eee!important;-webkit-print-color-adjust:exact;}' +
    '}';
  document.head.appendChild(css);

  function findIngTable() {
    var cards = document.querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      var h = cards[i].querySelector('h2');
      if (h && /ingrediens/i.test(h.textContent)) {
        var t = cards[i].querySelector('table');
        if (t) return t;
      }
    }
    return null;
  }

  /* ============================================================
     SJÄLVLÄKNING v2: vissa inklistrade recept har hamnat med STEG,
     SEKTIONSRUBRIKER, VARNINGAR och NÄRINGSTEXT inuti ingrediens-
     tabellen. Detta lagas här AUTOMATISKT i webbläsaren – käll-
     filen röres aldrig:
     · VERSAL-rubriker (🥣 FÖRBERED..., ⚙️ RISKOKARE..., 🍕 ANVÄNDNING,
       ❄️ FÖRVARING...) upptäcks generiskt och startar en sektion
     · sektioner där raderna saknar riktiga mängder = STEG → flyttas
       till "Gör så här"-kortet med rubriken som mellanrubrik
     · sektioner där raderna HAR mängder = ingrediensgrupp → behålls
       i tabellen som äkta grupprubrik
     · ⚠️ VIKTIGT/VARNING → egen varningsruta
     · 📊 NÄRING → näringskort (par) eller infotext
     · TIPS → 💡-ruta
     · lösa stegrader bland ingredienserna ("1. Gör...", nummer i
       måttkolumnen, lång text utan mått) flyttas också till stegen
     ============================================================ */
  function repair(table) {
    var trs = Array.prototype.slice.call(table.querySelectorAll('tr'));
    function txt(td) { return (td ? td.textContent : '').trim(); }
    function ledText(s) { return s.replace(/^[^0-9A-Za-zÅÄÖåäö]+/, '').trim(); }
    function arRubrik(a, b) {
      if (b && !/^\d+[.)]?$/.test(b)) return false;
      if (!a || a.length > 60) return false;
      var t = ledText(a);
      var letters = t.replace(/[^A-Za-zÅÄÖåäö]/g, '');
      if (letters.length < 3) return false;
      var upper = letters.replace(/[^A-ZÅÄÖ]/g, '');
      return upper.length / letters.length >= 0.8;   /* nästan bara VERSALER */
    }
    function riktigMangd(b) {
      if (!b) return false;
      if (/^\d+[.)]?$/.test(b)) return false;        /* bara ett stegnummer */
      return /\d/.test(b);
    }
    function serUtSomSteg(a, b) {
      if (/^\d+[.)]\s/.test(a)) return true;         /* "1. Diska..." */
      if (/^\d+[.)]?$/.test(b)) return true;          /* nummer i måttkolumnen */
      if (!b && a.length > 40) return true;           /* lång text utan mått */
      return false;
    }

    /* Dela upp raderna i sektioner vid VERSAL-rubriker */
    var sektioner = [{ rubrik: null, rubrikTr: null, rader: [] }];
    var harRubriker = false;
    trs.forEach(function (tr) {
      var tds = tr.querySelectorAll('td');
      if (!tds.length) return;                                        /* th-raden */
      if (tds.length === 1 || tds[0].getAttribute('colspan')) return; /* äkta grupprubrik – rörs ej */
      var a = txt(tds[0]), b = txt(tds[1]);
      if (arRubrik(a, b)) {
        sektioner.push({ rubrik: ledText(a) ? a : a, rubrikTr: tr, rader: [] });
        harRubriker = true;
        return;
      }
      sektioner[sektioner.length - 1].rader.push({ tr: tr, a: a, b: b });
    });

    var steg0 = sektioner[0].rader.filter(function (r) { return serUtSomSteg(r.a, r.b) && !/^total/i.test(r.a); });
    if (!harRubriker && !steg0.length) return;        /* tabellen är frisk */

    var stegSektioner = [], naringPar = [], naringText = [], varningar = [], tipsar = [];

    sektioner.forEach(function (s, idx) {
      if (idx === 0) return;
      var R = s.rubrik;
      var antalMangd = s.rader.filter(function (r) { return riktigMangd(r.b); }).length;
      var typ;
      if (s.rader.length && antalMangd / s.rader.length >= 0.5 &&
          !/NÄRING|TIPS|VIKTIGT|VARNING/i.test(R)) {
        typ = 'grupp';                                /* ingrediensgrupp – stannar i tabellen */
      } else if (/NÄRING/i.test(R)) typ = 'naring';
      else if (/^TIPS/i.test(ledText(R))) typ = 'tips';
      else if (/VIKTIGT|VARNING|OBS!/i.test(R)) typ = 'warn';
      else typ = 'steg';                              /* FÖRBERED/ANVÄNDNING/FÖRVARING/maskin... */

      if (typ === 'grupp') {
        /* gör om rubrikraden till äkta colspan-grupprubrik som build() förstår */
        var gtd = document.createElement('td');
        gtd.setAttribute('colspan', '3');
        gtd.textContent = R;
        s.rubrikTr.innerHTML = '';
        s.rubrikTr.appendChild(gtd);
        return;
      }
      s.rubrikTr.remove();
      if (typ === 'steg') {
        var steg = [];
        s.rader.forEach(function (r) {
          var t = r.a.replace(/^\d+[.)]\s*/, '').trim();
          if (t) steg.push(t);
          r.tr.remove();
        });
        if (steg.length) stegSektioner.push({ rubrik: R, steg: steg });
      } else if (typ === 'naring') {
        s.rader.forEach(function (r) {
          if (r.b && !/^\d+[.)]?$/.test(r.b)) naringPar.push([r.a, r.b]);
          else if (r.a) naringText.push(r.a);
          r.tr.remove();
        });
      } else if (typ === 'warn') {
        s.rader.forEach(function (r) { if (r.a) varningar.push(r.a); r.tr.remove(); });
      } else {
        s.rader.forEach(function (r) { if (r.a) tipsar.push(r.a); r.tr.remove(); });
      }
    });

    /* Lösa stegrader bland ingredienserna (utan egen rubrik) */
    var losa = [];
    steg0.forEach(function (r) {
      var t = r.a.replace(/^\d+[.)]\s*/, '').trim();
      if (t) losa.push(t);
      r.tr.remove();
    });
    if (losa.length) stegSektioner.unshift({ rubrik: null, steg: losa });

    /* STEG → "Gör så här"-kortet (mellanrubriker per sektion) */
    if (stegSektioner.length) {
      var kort = null;
      var cards = document.querySelectorAll('.card');
      for (var i = 0; i < cards.length; i++) {
        var h = cards[i].querySelector('h2');
        if (h && /(gör så här|steg|instruktion)/i.test(h.textContent)) { kort = cards[i]; break; }
      }
      if (!kort) {
        kort = document.createElement('div');
        kort.className = 'card';
        kort.innerHTML = '<h2>🥣 Gör så här</h2>';
        var ingKort = table.closest('.card');
        ingKort.parentNode.insertBefore(kort, ingKort.nextSibling);
      }
      var huvudOl = kort.querySelector('ol');
      stegSektioner.forEach(function (s) {
        var mal;
        if (!s.rubrik && huvudOl && !huvudOl.querySelector('li')) {
          mal = huvudOl;
        } else {
          if (s.rubrik) {
            var h3 = document.createElement('h3');
            h3.textContent = s.rubrik;
            h3.style.cssText = 'font-size:.95rem;margin:14px 0 6px;color:#2c3e50;';
            kort.appendChild(h3);
          }
          mal = document.createElement('ol');
          kort.appendChild(mal);
        }
        s.steg.forEach(function (t) {
          var li = document.createElement('li');
          li.textContent = t;
          mal.appendChild(li);
        });
      });
      if (huvudOl && !huvudOl.querySelector('li')) huvudOl.remove();  /* tom rest-lista bort */
    }

    /* ⚠️ Varningar → egna rutor före footern */
    var footer = document.querySelector('footer');
    varningar.forEach(function (t) {
      var w = document.createElement('div');
      w.className = 'warn';
      w.textContent = '⚠️ ' + t;
      if (footer) footer.parentNode.insertBefore(w, footer);
      else document.body.appendChild(w);
    });

    /* 📊 Näring → kort (par som tabell, lös text som stycken) */
    if (naringPar.length || naringText.length) {
      var harNaring = false;
      document.querySelectorAll('.card h2').forEach(function (h) { if (/näring/i.test(h.textContent)) harNaring = true; });
      if (!harNaring) {
        var nc = document.createElement('div');
        nc.className = 'card';
        nc.innerHTML = '<h2>📊 Näringsvärde</h2>';
        if (naringPar.length) {
          var nt = document.createElement('table');
          naringPar.forEach(function (p) {
            var tr2 = document.createElement('tr');
            var td1 = document.createElement('td'); td1.textContent = p[0];
            var td2 = document.createElement('td'); td2.textContent = p[1];
            td2.style.cssText = 'text-align:right;font-weight:700;';
            tr2.appendChild(td1); tr2.appendChild(td2); nt.appendChild(tr2);
          });
          nc.appendChild(nt);
        }
        naringText.forEach(function (t) {
          var p = document.createElement('p');
          p.textContent = t;
          p.style.cssText = 'font-size:.85rem;color:#7f8c8d;margin-top:8px;';
          nc.appendChild(p);
        });
        if (footer) footer.parentNode.insertBefore(nc, footer);
        else document.body.appendChild(nc);
      }
    }

    /* 💡 Tips → gul ruta */
    if (tipsar.length && !document.querySelector('.tip')) {
      var tip = document.createElement('div');
      tip.className = 'tip';
      tip.textContent = '💡 ' + tipsar.join(' ');
      if (footer) footer.parentNode.insertBefore(tip, footer);
      else document.body.appendChild(tip);
    }
    if (window.__MK_TOAST) window.__MK_TOAST('🔧 Receptet visades rörigt och har auto-lagats på skärmen');
  }

  function build() {
    var table = findIngTable();
    if (!table || table.classList.contains('mk-ing2')) return;
    repair(table);   /* självläkning av trasiga inklistringar */

    /* ---------- Läs ut raderna ur befintlig tabell ---------- */
    var items = [], grupp = null, hasPris = false;
    var rows = table.querySelectorAll('tr');
    for (var i = 0; i < rows.length; i++) {
      var tds = rows[i].querySelectorAll('td');
      if (!tds.length) continue;                                   /* th-rubrikrad */
      var namn = (tds[0].textContent || '').trim();
      if (!namn) continue;
      /* Grupprubrik-rad (t.ex. "Smuldegen" med colspan) */
      if (tds.length === 1 || tds[0].getAttribute('colspan')) { grupp = namn; continue; }
      var mangd = (tds[1] ? tds[1].textContent : '').trim();
      var pris = (tds[2] ? tds[2].textContent : '').trim();
      if (pris) hasPris = true;
      items.push({
        namn: namn, mangd: mangd, pris: pris, grupp: grupp,
        tot: /^total/i.test(namn),
        vatska: arVatska(namn)
      });
    }
    if (items.length < 2) return;

    /* ---------- Sortera: grupper bevaras, vätskor först i varje, totalt sist ---------- */
    var tot = items.filter(function (x) { return x.tot; });
    var rest = items.filter(function (x) { return !x.tot; });
    var ordered = [];
    var seen = [];
    rest.forEach(function (x) { if (seen.indexOf(x.grupp) === -1) seen.push(x.grupp); });
    seen.forEach(function (g) {
      var inG = rest.filter(function (x) { return x.grupp === g; });
      ordered.push({ grupp: g, rader: inG.filter(function (x) { return x.vatska; })
        .concat(inG.filter(function (x) { return !x.vatska; })) });
    });

    /* ---------- Bygg nya tabellen: TRE tydliga kolumner ---------- */
    var h = '<tr><th>Ingrediens' +
      (ordered.some(function (g) { return g.rader.some(function (r) { return r.vatska; }); })
        ? ' <span style="font-weight:400;text-transform:none;letter-spacing:0;">(💧 blöta överst – i maskinen först)</span>' : '') +
      '</th><th class="matt">Mått</th>' + (hasPris ? '<th class="pris">Pris</th>' : '') + '</tr>';

    var cols = hasPris ? 3 : 2;
    ordered.forEach(function (g) {
      if (g.grupp) {
        h += '<tr><td colspan="' + cols + '" style="background:#faf7f2;font-weight:700;border-bottom:2px solid #d5cbb8;">' + g.grupp + '</td></tr>';
      }
      g.rader.forEach(function (r) {
        h += '<tr data-namn="' + r.namn.replace(/"/g, '&quot;') + '" data-mangd="' + r.mangd.replace(/"/g, '&quot;') + '">' +
          '<td>' + (r.vatska ? '<span class="drop">💧</span>' : '') + r.namn + '</td>' +
          '<td class="matt">' + (r.mangd || '–') + '</td>' +
          (hasPris ? '<td class="pris">' + (r.pris || '') + '</td>' : '') + '</tr>';
      });
    });
    tot.forEach(function (r) {
      h += '<tr class="tot"><td>' + r.namn + '</td>' +
        '<td class="matt">' + (r.mangd || '') + '</td>' +
        (hasPris ? '<td class="pris">' + (r.pris || '') + '</td>' : '') + '</tr>';
    });

    table.className = (table.className ? table.className + ' ' : '') + 'mk-ing2';
    table.innerHTML = h;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
