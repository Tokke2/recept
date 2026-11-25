/* ============================================================
   PLATS: /assets/dela.js  (assets-mappen i repo-roten)
   ============================================================
   📤 DELA-MODULEN – Mitt Maskinkök (SPEC 94+168+47+259)
   ============================================================
   · 📤 Dela-knapp i receptnavet (#mk-rnav, 174-regeln: alltid
     appendChild): mobilens delningsark (Web Share API) med
     titel + länk. Datorer utan delningsark → länken kopieras
     + toast "Länk kopierad!".
   · 🖼️ Delningskort (SPEC 47): genererar 1200×630-bild (canvas,
     helt lokalt – ingen server) med receptets namn och sajtens
     färger → laddas ner som PNG, perfekt till sociala medier.
   · 🥕 Ingredienssidan (SPEC 168): egen diskret dela-knapp.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_DELA_LOADED) return;
  window.__MK_DELA_LOADED = true;

  function titel() {
    var m = document.querySelector('meta[name="recept:namn"]');
    return (m && m.content) || document.title || 'Mitt Maskinkök';
  }

  function toast(txt) {
    if (window.__MK_TOAST) { window.__MK_TOAST(txt); return; }
    var t = document.createElement('div');
    t.className = 'no-print';
    t.textContent = txt;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#2c3e50;color:#fff;' +
      'padding:10px 20px;border-radius:999px;font-size:.9rem;font-weight:700;z-index:500;font-family:Segoe UI,system-ui,sans-serif;';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }

  async function dela() {
    var data = { title: titel(), text: titel() + ' – Mitt Maskinkök', url: location.href };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    /* 🖥️ dator-fallback: kopiera länken */
    try {
      await navigator.clipboard.writeText(location.href);
      toast('🔗 Länk kopierad!');
    } catch (e2) {
      var inp = document.createElement('input');
      inp.value = location.href;
      document.body.appendChild(inp);
      inp.select();
      try { document.execCommand('copy'); toast('🔗 Länk kopierad!'); } catch (e3) { toast('⚠️ Kopiera adressraden manuellt'); }
      inp.remove();
    }
  }

  /* 🖼️ DELNINGSKORTET (SPEC 47): 1200×630 – og-bildformatet */
  function kort() {
    /* 🌙 SPEC 266 (förslag 1165): kortet följer temat – mörkt läge
       ger mörk variant med samma varumärkesfärger i ramen */
    var mork = document.documentElement.classList.contains('mk-dark');
    var c = document.createElement('canvas');
    c.width = 1200; c.height = 630;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 1200, 630);
    if (mork) { g.addColorStop(0, '#7e241a'); g.addColorStop(1, '#9c5410'); }
    else { g.addColorStop(0, '#c0392b'); g.addColorStop(1, '#e67e22'); }
    x.fillStyle = g; x.fillRect(0, 0, 1200, 630);
    x.fillStyle = mork ? '#1d242c' : '#fff';
    rundad(x, 60, 70, 1080, 490, 28);
    x.fill();
    /* emoji + titel (radbruten) */
    var em = '🍞';
    var mEm = document.querySelector('meta[name="recept:emoji"]');
    if (mEm && mEm.content) em = mEm.content;
    x.font = '90px serif';
    x.textAlign = 'center';
    x.fillText(em, 600, 210);
    x.fillStyle = mork ? '#e8e4da' : '#2c3e50';
    x.font = '700 58px Georgia, serif';
    radbryt(x, titel(), 600, 300, 940, 66, 3);
    x.fillStyle = mork ? '#a9b3b5' : '#a5967e';
    x.font = '700 30px Segoe UI, sans-serif';
    x.fillText('Recept byggda för maskinerna i köket', 600, 470);
    x.fillStyle = mork ? '#e67e22' : '#c0392b';
    x.font = '800 34px Segoe UI, sans-serif';
    x.fillText('tokke2.github.io/recept', 600, 522);
    var a = document.createElement('a');
    var fil = (location.pathname.split('/').pop() || 'recept').replace(/\.html?$/i, '');
    a.download = decodeURIComponent(fil) + '-delningskort.png';
    a.href = c.toDataURL('image/png');
    a.click();
    toast('🖼️ Delningskortet sparades!');
  }

  function rundad(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }

  function radbryt(x, txt, cx, y, maxW, lh, maxRader) {
    var ord = String(txt).split(/\s+/), rad = '', rader = [];
    ord.forEach(function (o) {
      var t = rad ? rad + ' ' + o : o;
      if (x.measureText(t).width > maxW && rad) { rader.push(rad); rad = o; } else rad = t;
    });
    if (rad) rader.push(rad);
    if (rader.length > maxRader) { rader = rader.slice(0, maxRader); rader[maxRader - 1] += '…'; }
    rader.forEach(function (r2, i) { x.fillText(r2, cx, y + i * lh); });
  }

  function knapp(id, ikon, text, fn) {
    var b = document.createElement('button');
    b.id = id;
    b.className = 'no-print';
    b.innerHTML = ikon + ' <span>' + text + '</span>';
    b.style.cssText = 'background:#fff;border:1.5px solid #e0d9cd;border-radius:11px;padding:9px 13px;' +
      'font-size:.85rem;font-weight:700;color:#2c3e50;cursor:pointer;font-family:inherit;';
    b.onclick = fn;
    return b;
  }

  /* --- receptsidor: in i #mk-rnav (174-regeln: appendChild) --- */
  var forsok = 0;
  function haka() {
    forsok++;
    var rnav = document.getElementById('mk-rnav');
    if (!rnav && forsok < 20) { setTimeout(haka, 400); return; }
    if (!rnav || document.getElementById('rnDela')) return;
    rnav.appendChild(knapp('rnDela', '📤', 'Dela', dela));
    rnav.appendChild(knapp('rnKort', '🖼️', 'Delningskort', kort));
  }

  /* --- ingredienssidan (SPEC 168): diskret knapp uppe till höger --- */
  function ingrediens() {
    if (document.getElementById('mkDelaIng')) return;
    var b = knapp('mkDelaIng', '📤', 'Dela sidan', dela);
    b.style.cssText += 'position:fixed;bottom:18px;right:14px;z-index:115;box-shadow:0 4px 14px rgba(0,0,0,.18);';
    document.body.appendChild(b);
  }

  var arRecept = !!document.querySelector('meta[name="recept:namn"]');
  if (arRecept) haka();
  else if (/ingredienser\.html$/i.test(location.pathname)) ingrediens();
})();
