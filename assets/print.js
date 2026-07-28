/* ============================================================
   PLATS: /assets/print.js  (assets-mappen i repo-roten)
   ============================================================ */
/* ============================================================
   CENTRAL UTSKRIFTSKNAPP – Mitt Maskinkök
   ============================================================
   Skapar automatiskt den flytande 🖨️-knappen på varje sida
   som laddar detta skript. Ingen knapp-HTML behövs i sidorna.

   Läggs in längst ner före </body>:
     <script src="assets/print.js"></script>       (rotsidor)
     <script src="../assets/print.js"></script>    (receptsidor)

   Vill du ändra knappens text, ikon eller beteende?
   Ändra HÄR – alla sidor uppdateras samtidigt.
   ============================================================ */
(function () {
  if (window.__MK_PRINT_LOADED) return;
  window.__MK_PRINT_LOADED = true;
  // Skapa inte dubblett om sidan redan har en knapp
  if (document.querySelector('.print-btn')) return;

  var btn = document.createElement('button');
  btn.className = 'print-btn';
  btn.type = 'button';
  btn.title = 'Skriv ut sidan (A4)';
  btn.innerHTML = '🖨️ Skriv ut';
  btn.addEventListener('click', function () { window.print(); });

  document.body.appendChild(btn);
})();
