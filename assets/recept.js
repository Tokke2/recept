/* ============================================================
   CENTRAL RECEPTMODUL – Mitt Maskinkök
   ============================================================
   Laddas av ALLA receptsidor (efter app.js/print.js):
     <script src="../assets/recept.js"></script>

   Ger varje recept automatiskt:
   1) 👨‍🍳 KOCKLÄGE – steg-för-steg i helskärm med jättetext,
      byggs automatiskt av receptets <ol>-steg. Skärmen hålls
      tänd (Wake Lock). Perfekt vid spisen via QR-koden.
   2) ⚡ ENERGIKOSTNAD – räknar ut kWh + kr för maskinstegen
      via data-energi-attribut ELLER metadatan recept:energi.
      Elpris hämtas centralt från json/maskindatabas.json.
   ============================================================ */
(function () {

  /* ================== 1) KOCKLÄGE ================== */
  var steps = [];
  document.querySelectorAll('.card ol li, .machine-step ol li').forEach(function (li) {
    var section = li.closest('.card');
    var heading = section ? (section.querySelector('h2') || {}).textContent || '' : '';
    steps.push({ text: li.innerHTML, section: heading.trim() });
  });

  if (steps.length) {
    // Knapp i verktygsraden (eller flytande om ingen toolbar finns)
    var toolbar = document.querySelector('.toolbar');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = '👨‍🍳 Kockläge';
    if (toolbar) {
      btn.className = 'tool-btn';
      toolbar.appendChild(btn);
    } else {
      btn.className = 'no-print';
      btn.style.cssText = 'position:fixed;bottom:130px;right:22px;z-index:99;background:#e67e22;color:#fff;border:none;border-radius:999px;padding:13px 20px;font-size:.95rem;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);';
      document.body.appendChild(btn);
    }
    btn.addEventListener('click', openCookMode);
  }

  var overlay, idx = 0, wakeLock = null;

  function openCookMode() {
    idx = 0;
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#2c3e50;color:#fff;z-index:1000;display:flex;flex-direction:column;padding:24px;font-family:inherit;';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    requestWakeLock();
    render();
    document.addEventListener('keydown', keyNav);
  }

  function closeCookMode() {
    overlay.remove();
    document.body.style.overflow = '';
    releaseWakeLock();
    document.removeEventListener('keydown', keyNav);
  }

  function keyNav(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'Escape') closeCookMode();
  }

  function next() { if (idx < steps.length - 1) { idx++; render(); } }
  function prev() { if (idx > 0) { idx--; render(); } }

  function render() {
    var s = steps[idx];
    overlay.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        '<span style="opacity:.75;font-size:1rem;">' + (s.section || 'Steg') + '</span>' +
        '<button id="cmClose" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:1rem;cursor:pointer;">✕ Stäng</button>' +
      '</div>' +
      '<div style="opacity:.75;font-size:1.05rem;margin-bottom:14px;">Steg ' + (idx + 1) + ' av ' + steps.length + '</div>' +
      '<div style="flex:1;display:flex;align-items:center;overflow-y:auto;">' +
        '<div style="font-size:clamp(1.6rem,4.5vw,2.6rem);line-height:1.45;font-weight:600;">' + s.text + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:12px;margin-top:16px;">' +
        '<button id="cmPrev" style="flex:1;background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:14px;padding:22px;font-size:1.3rem;font-weight:700;cursor:pointer;' + (idx === 0 ? 'opacity:.3;' : '') + '">← Föregående</button>' +
        '<button id="cmNext" style="flex:2;background:#27ae60;color:#fff;border:none;border-radius:14px;padding:22px;font-size:1.3rem;font-weight:700;cursor:pointer;">' +
          (idx === steps.length - 1 ? '✅ Klart!' : 'Nästa →') + '</button>' +
      '</div>' +
      '<div style="text-align:center;opacity:.55;font-size:.85rem;margin-top:10px;">Skärmen hålls tänd · piltangenter funkar</div>';

    overlay.querySelector('#cmClose').onclick = closeCookMode;
    overlay.querySelector('#cmPrev').onclick = prev;
    overlay.querySelector('#cmNext').onclick = idx === steps.length - 1 ? closeCookMode : next;
  }

  async function requestWakeLock() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
  }
  function releaseWakeLock() { try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) {} }

  /* ================== 2) ENERGIKOSTNAD ================== */
  /* Receptet anger sin energi via metadata:
       <meta name="recept:energi" content="Clatronic BBA 3774: 550 W x 6 min | Midea MB-FS5017: 860 W x 50 min">
     Elpris hämtas från json/maskindatabas.json (elpris_kr_per_kwh). */
  var energiMeta = document.querySelector('meta[name="recept:energi"]');
  if (energiMeta) {
    fetch('../json/maskindatabas.json')
      .then(function (r) { return r.json(); })
      .then(function (db) { renderEnergy(energiMeta.content, db.elpris_kr_per_kwh || 2.5); })
      .catch(function () { renderEnergy(energiMeta.content, 2.5); });
  }

  function renderEnergy(spec, price) {
    var rows = [], totalKwh = 0;
    spec.split('|').forEach(function (part) {
      var m = part.match(/(.+?):\s*(\d+(?:[.,]\d+)?)\s*W\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*min/i);
      if (!m) return;
      var name = m[1].trim();
      var w = parseFloat(m[2].replace(',', '.'));
      var min = parseFloat(m[3].replace(',', '.'));
      var kwh = (w / 1000) * (min / 60);
      totalKwh += kwh;
      rows.push({ name: name, w: w, min: min, kwh: kwh, kr: kwh * price });
    });
    if (!rows.length) return;

    var box = document.createElement('div');
    box.className = 'card';
    box.innerHTML =
      '<h2>⚡ Energikostnad</h2>' +
      '<table>' +
        '<tr><th>Maskin</th><th>Effekt</th><th>Tid</th><th>Energi</th><th>Kostnad</th></tr>' +
        rows.map(function (r) {
          return '<tr><td>' + r.name + '</td><td>' + r.w + ' W</td><td>' + r.min + ' min</td><td>~' +
            r.kwh.toFixed(2) + ' kWh</td><td>~' + r.kr.toFixed(2).replace('.', ',') + ' kr</td></tr>';
        }).join('') +
        '<tr class="total"><td colspan="3">Totalt</td><td>~' + totalKwh.toFixed(2) + ' kWh</td><td>~' +
          (totalKwh * price).toFixed(2).replace('.', ',') + ' kr</td></tr>' +
      '</table>' +
      '<p style="font-size:.8rem;color:#7f8c8d;margin-top:8px;">Elpris ' + String(price).replace('.', ',') +
        ' kr/kWh (ändras centralt i json/maskindatabas.json). Effektvärden är maxeffekt – verklig förbrukning är ofta lägre eftersom maskinerna termostatstyr.</p>';

    // Placera före betygssektionen (eller sist)
    var betyg = document.getElementById('betyg');
    if (betyg) betyg.parentNode.insertBefore(box, betyg);
    else document.body.appendChild(box);
  }
})();
