/* ============================================================
   CENTRAL ENERGIMODUL – Mitt Maskinkök
   ============================================================
   Styr ALL energiberäkning på receptsidorna.

   DATAKÄLLOR (allt centralt, inget hårdkodat i recepten):
   - Effekt (W):  json/maskiner/<id>.json  →  "effekt_w"
   - Elpris:      json/maskindatabas.json  →  "elpris_kr_per_kwh"

   RECEPTET anger bara maskin + tid i metadata:

     <meta name="recept:energi"
           content="clatronic-bba3774: 6 min | midea-mb-fs5017: 50 min">

   → Modulen slår upp watten själv ur maskindatabasen!

   Bakåtkompatibelt: gamla formatet "Namn: 550 W x 6 min"
   fungerar också (då används angiven watt direkt).

   Ändra elpriset på ETT ställe (json/maskindatabas.json)
   → alla recept räknas om automatiskt.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_ENERGI_LOADED) return;
  window.__MK_ENERGI_LOADED = true;

  var meta = document.querySelector('meta[name="recept:energi"]');
  if (!meta || !meta.content.trim()) return;
  if (document.getElementById('mk-energi')) return; // redan renderad

  var isSub = location.pathname.indexOf('/recept/') !== -1;
  var base = isSub ? '../' : './';

  var DEFAULT_PRICE = 2.5;

  init();

  async function init() {
    // 1) Hämta elpris centralt
    var price = DEFAULT_PRICE;
    var db = {};
    try {
      db = await (await fetch(base + 'json/maskindatabas.json')).json();
      if (db.elpris_kr_per_kwh) price = db.elpris_kr_per_kwh;
    } catch (e) {}

    // 2) Tolka energi-specen och slå upp maskiner vid behov
    var parts = meta.content.split('|');
    var rows = [];

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;

      // Format A (nytt): "maskin-id: 50 min"  → watt hämtas ur databasen
      // Format B (gammalt): "Namn: 550 W x 6 min" → watt anges direkt
      var mB = part.match(/(.+?):\s*(\d+(?:[.,]\d+)?)\s*W\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*min/i);
      var mA = !mB && part.match(/(.+?):\s*(\d+(?:[.,]\d+)?)\s*min/i);

      if (mB) {
        rows.push(makeRow(mB[1].trim(), parseFloat(mB[2].replace(',', '.')),
                          parseFloat(mB[3].replace(',', '.')), price, ''));
      } else if (mA) {
        var key = mA[1].trim();
        var min = parseFloat(mA[2].replace(',', '.'));
        var machine = await lookupMachine(key);
        if (machine && machine.effekt_w) {
          var label = (machine.varumarke || '') + ' ' + (machine.modellnamn || machine.id);
          rows.push(makeRow(label.trim(), machine.effekt_w, min, price, ''));
        } else {
          rows.push(makeRow(key, null, min, price,
            'effekt saknas – lägg till "effekt_w" i json/maskiner/' + key + '.json'));
          console.warn('[Maskinkök/energi] Hittade ingen effekt för "' + key +
            '". Kontrollera maskin-id eller lägg till effekt_w i maskinfilen.');
        }
      } else {
        console.warn('[Maskinkök/energi] Kunde inte tolka: "' + part +
          '". Format: "maskin-id: 50 min" eller "Namn: 550 W x 6 min"');
      }
    }

    if (rows.length) render(rows, price);
  }

  var machineCache = null;
  async function lookupMachine(key) {
    key = key.toLowerCase();
    // Ladda alla maskiner en gång (via index eller GitHub API-mönstret används ej här:
    // maskiner-index.json räcker eftersom den alltid ligger bredvid)
    if (!machineCache) {
      machineCache = [];
      var files = [];
      try { files = await (await fetch(base + 'json/maskiner-index.json')).json(); } catch (e) {}
      for (var i = 0; i < files.length; i++) {
        try { machineCache.push(await (await fetch(base + 'json/maskiner/' + files[i])).json()); } catch (e) {}
      }
    }
    // Matcha på id, modellnamn eller varumärke+modell
    for (var j = 0; j < machineCache.length; j++) {
      var m = machineCache[j];
      var names = [m.id, m.modellnamn, (m.varumarke + ' ' + (m.modellnamn || ''))]
        .filter(Boolean).map(function (s) { return s.toLowerCase(); });
      if (names.some(function (n) { return n === key || key.indexOf(n) !== -1 || n.indexOf(key) !== -1; })) {
        return m;
      }
    }
    return null;
  }

  function makeRow(name, watt, min, price, note) {
    var kwh = watt ? (watt / 1000) * (min / 60) : null;
    return { name: name, watt: watt, min: min, kwh: kwh,
             kr: kwh !== null ? kwh * price : null, note: note };
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
        '<tr><th>Maskin</th><th>Effekt</th><th>Tid</th><th>Energi</th><th>Kostnad</th></tr>' +
        rows.map(function (r) {
          return '<tr><td>' + r.name + (r.note ? ' <span style="color:#e67e22;font-size:.75em;">(' + r.note + ')</span>' : '') +
            '</td><td>' + (r.watt ? r.watt + ' W' : '–') +
            '</td><td>' + r.min + ' min' +
            '</td><td>' + (r.kwh !== null ? '~' + r.kwh.toFixed(2) + ' kWh' : '–') +
            '</td><td>' + (r.kr !== null ? '~' + kr(r.kr) : '–') + '</td></tr>';
        }).join('') +
        '<tr class="total"><td colspan="3">Totalt' + (incomplete ? ' (ofullständigt)' : '') +
          '</td><td>~' + totalKwh.toFixed(2) + ' kWh</td><td>~' + kr(totalKr) + '</td></tr>' +
      '</table>' +
      '<p style="font-size:.8rem;color:#7f8c8d;margin-top:8px;">Elpris ' +
        String(price).replace('.', ',') + ' kr/kWh – ändras centralt i json/maskindatabas.json. ' +
        'Effekt hämtas ur maskindatabasen (maxeffekt; verklig förbrukning ofta lägre pga termostatstyrning).</p>';

    // Placera före betyg, annars före footer, annars sist
    var anchor = document.getElementById('betyg') || document.querySelector('footer');
    if (anchor) anchor.parentNode.insertBefore(box, anchor);
    else document.body.appendChild(box);
  }
})();
