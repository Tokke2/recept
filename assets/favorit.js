/* ============================================================
   PLATS: /assets/favorit.js  (assets-mappen i repo-roten)
   ============================================================
   ⭐ FAVORITSTJÄRNAN – Mitt Maskinkök (SPEC 263, förslag 1158)
   ============================================================
   · Receptsidor: ⭐-knapp i verktygsraden #mk-rnav (174-regeln:
     alltid appendChild – trayen sorterar). Tryck = favorit på/av.
   · Sparas lokalt i webbläsaren (localStorage 'mk-favoriter',
     en lista med "recept/kategori/fil.html") – inget konto,
     ingen server. Flyttas till ny telefon via 📦-kortet (SPEC 265).
   · Receptsamlingen (recept.html) har ⭐ Favoriter-filtret som
     läser samma lista.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_FAVORIT_LOADED) return;
  window.__MK_FAVORIT_LOADED = true;

  var NYCKEL = 'mk-favoriter';

  function lista() {
    try { return JSON.parse(localStorage.getItem(NYCKEL)) || []; }
    catch (e) { return []; }
  }
  function spara(l) { try { localStorage.setItem(NYCKEL, JSON.stringify(l)); } catch (e) {} }

  /* receptets nyckel ur adressen: "recept/kategori/fil.html" */
  function minNyckel() {
    var m = location.pathname.match(/\/(recept|ratter)\/[^/]+(\/[^/]+)?\.html$/i);
    if (!m) return null;
    try { return decodeURIComponent(m[0].slice(1)); } catch (e) { return m[0].slice(1); }
  }

  var nyckel = minNyckel();
  if (!nyckel) return;

  function arFav() { return lista().indexOf(nyckel) !== -1; }

  function vaxla() {
    var l = lista();
    var i = l.indexOf(nyckel);
    if (i === -1) l.push(nyckel); else l.splice(i, 1);
    spara(l);
    mala();
    if (window.__MK_TOAST) window.__MK_TOAST(i === -1 ? '⭐ Sparad som favorit!' : 'Favoriten borttagen');
  }

  var knapp = null;
  function mala() {
    if (!knapp) return;
    var f = arFav();
    knapp.innerHTML = (f ? '⭐' : '☆') + ' <span>Favorit</span>';
    knapp.style.background = f ? '#fdf3d9' : '#fff';
    knapp.style.borderColor = f ? '#f39c12' : '#e0d9cd';
    knapp.title = f ? 'Favorit – tryck för att ta bort' : 'Spara som favorit (syns i ⭐-filtret på receptsamlingen)';
    knapp.setAttribute('aria-label', knapp.title);
  }

  var forsok = 0;
  function haka() {
    forsok++;
    var rnav = document.getElementById('mk-rnav');
    if (!rnav && forsok < 20) { setTimeout(haka, 400); return; }
    if (!rnav || document.getElementById('rnFavorit')) return;
    knapp = document.createElement('button');
    knapp.id = 'rnFavorit';
    knapp.className = 'no-print';
    knapp.style.cssText = 'background:#fff;border:1.5px solid #e0d9cd;border-radius:11px;padding:9px 13px;' +
      'font-size:.85rem;font-weight:700;color:#2c3e50;cursor:pointer;font-family:inherit;';
    knapp.onclick = vaxla;
    rnav.appendChild(knapp);   /* 174-regeln: appendChild – trayen sorterar */
    mala();
  }
  haka();
})();
