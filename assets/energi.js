/* ============================================================
   PLATS: /assets/energi.js  (assets-mappen i repo-roten)
   ============================================================ */
/* ============================================================
   CENTRAL ENERGIMODUL – Mitt Maskinkök
   ============================================================
   ALLT centralt – recepten behöver INGEN egen energidata!

   DATAKÄLLOR (prioritetsordning):
   1) json/energi.json      → energidata per recept (filnamn som nyckel)
   2) <meta name="recept:energi">  → reserv/övertrumfning per sida
                                     (används bara om receptet saknas
                                      i energi.json)

   Effekt (W):  json/maskiner/<id>.json  → "effekt_w"
   Elpris:      json/maskindatabas.json  → "elpris_kr_per_kwh"

   LÄGGA TILL ENERGI FÖR ETT NYTT RECEPT:
   Öppna json/energi.json och lägg till en rad:
     "mittrecept.html": [
       { "maskin": "clatronic-bba3774", "min": 90, "moment": "Knådning" }
     ]
   Klart! Ingen HTML behöver röras. Ändra tid/maskin → bara JSON.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_ENERGI_LOADED) return;
  window.__MK_ENERGI_LOADED = true;

  var isSub = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isSub) return; // energitabell bara på receptsidor
  var base = '../';
  var DEFAULT_PRICE = 2.5;

  // Filnamn = nyckel i energi.json
  var fileName = decodeURIComponent(location.pathname.split('/').pop());

  init();

  async function init() {
    if (document.getElementById('mk-energi')) return;

    /* ---------- 1) Elpris (centralt) ---------- */
    var price = DEFAULT_PRICE;
    try {
      var db = await (await fetch(base + 'json/maskindatabas.json')).json();
      if (db.elpris_kr_per_kwh) price = db.elpris_kr_per_kwh;
    } catch (e) {}

    /* ---------- 2) Energidata: centralt först, meta som reserv ---------- */
    var entries = null;

    try {
      var ej = await (await fetch(base + 'json/energi.json')).json();
      if (ej.recept && ej.recept[fileName]) entries = ej.recept[fileName];
    } catch (e) {}

    if (!entries) {
      var meta = document.querySelector('meta[name="recept:energi"]');
      if (meta && meta.content.trim()) entries = parseMeta(meta.content);
    }

    if (!entries || !entries.length) {
      console.info('[Maskinkök/energi] Ingen energidata för "' + fileName +
        '". Lägg till receptet i json/energi.json (central) så visas tabellen automatiskt.');
      return;
    }

    /* ---------- 3) Slå upp maskiner & räkna ---------- */
    var rows = [];
    for (var i = 0; i < entries.length; i++) {
      var en = entries[i];
      var min = parseFloat(en.min);
      if (en.watt) {
        // direktangiven effekt (meta-reservformatet)
        rows.push(makeRow(en.namn || en.maskin || '?', en.watt, min, price, en.moment || ''));
        continue;
      }
      var m = await lookupMachine(String(en.maskin || '').toLowerCase());
      if (m && m.effekt_w) {
        var label = ((m.varumarke || '') + ' ' + (m.modellnamn || m.id)).trim();
        rows.push(makeRow(label, m.effekt_w, min, price, en.moment || ''));
      } else {
        rows.push(makeRow(en.maskin || '?', null, min, price, en.moment || '',
          'effekt saknas i json/maskiner/'));
        console.warn('[Maskinkök/energi] Hittar ingen effekt_w för "' + en.maskin + '".');
      }
    }
    if (rows.length) render(rows, price);
  }

  /* ---------- Meta-reservformat: "maskin-id: 50 min" | "Namn: 550 W x 6 min" ---------- */
  function parseMeta(spec) {
    var out = [];
    spec.split('|').forEach(function (part) {
      part = part.trim();
      var mB = part.match(/(.+?):\s*(\d+(?:[.,]\d+)?)\s*W\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*min/i);
      var mA = !mB && part.match(/(.+?):\s*(\d+(?:[.,]\d+)?)\s*min/i);
      if (mB) out.push({ namn: mB[1].trim(), watt: parseFloat(mB[2].replace(',', '.')), min: parseFloat(mB[3].replace(',', '.')) });
      else if (mA) out.push({ maskin: mA[1].trim(), min: parseFloat(mA[2].replace(',', '.')) });
    });
    return out;
  }

  /* ---------- Maskinuppslag (cachas) ---------- */
  var machineCache = null;
  async function lookupMachine(key) {
    if (!machineCache) {
      machineCache = [];
      var files = [];
      try { files = await (await fetch(base + 'json/maskiner-index.json')).json(); } catch (e) {}
      for (var i = 0; i < files.length; i++) {
        try { machineCache.push(await (await fetch(base + 'json/maskiner/' + files[i])).json()); } catch (e) {}
      }
    }
    for (var j = 0; j < machineCache.length; j++) {
      var m = machineCache[j];
      var names = [m.id, m.modellnamn, ((m.varumarke || '') + ' ' + (m.modellnamn || ''))]
        .filter(Boolean).map(function (s) { return s.toLowerCase().trim(); });
      if (names.some(function (n) { return n === key || key.indexOf(n) !== -1 || n.indexOf(key) !== -1; })) return m;
    }
    return null;
  }

  function makeRow(name, watt, min, price, moment, note) {
    var kwh = watt ? (watt / 1000) * (min / 60) : null;
    return { name: name, watt: watt, min: min, kwh: kwh,
             kr: kwh !== null ? kwh * price : null,
             moment: moment || '', note: note || '' };
  }

  function kr(v) { return v.toFixed(2).replace('.', ',') + ' kr'; }

  function render(rows, price) {
    var totalKwh = 0, totalKr = 0, incomplete = false;
    rows.forEach(function (r) {
      if (r.kwh !== null) { totalKwh += r.kwh; totalKr += r.kr; } else incomplete = true;
    });

    var box = document.createElement('div');
    box.className = 'card';
    box.id = 'mk-energi';
    box.innerHTML =
      '<h2>⚡ Energikostnad</h2>' +
      '<table>' +
        '<tr><th>Moment</th><th>Maskin</th><th>Effekt</th><th>Tid</th><th>Energi</th><th>Kostnad</th></tr>' +
        rows.map(function (r) {
          return '<tr><td>' + (r.moment || '–') +
            '</td><td>' + r.name + (r.note ? ' <span style="color:#e67e22;font-size:.75em;">(' + r.note + ')</span>' : '') +
            '</td><td>' + (r.watt ? r.watt + ' W' : '–') +
            '</td><td>' + r.min + ' min' +
            '</td><td>' + (r.kwh !== null ? '~' + r.kwh.toFixed(2) + ' kWh' : '–') +
            '</td><td>' + (r.kr !== null ? '~' + kr(r.kr) : '–') + '</td></tr>';
        }).join('') +
        '<tr class="total"><td colspan="4">Totalt' + (incomplete ? ' (ofullständigt)' : '') +
          '</td><td>~' + totalKwh.toFixed(2) + ' kWh</td><td>~' + kr(totalKr) + '</td></tr>' +
      '</table>' +
      '<p style="font-size:.8rem;color:#7f8c8d;margin-top:8px;">Energidata: json/energi.json · Effekt: json/maskiner/ · Elpris ' +
        String(price).replace('.', ',') + ' kr/kWh (json/maskindatabas.json) – allt centralt, inga recept behöver ändras.</p>';

    var anchor = document.getElementById('betyg') || document.querySelector('footer');
    if (anchor) anchor.parentNode.insertBefore(box, anchor);
    else document.body.appendChild(box);
  }
})();
