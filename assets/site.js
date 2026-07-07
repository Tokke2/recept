/* =====================================================================
   CENTRAL DATA & LOGIK för alla recept
   © Rickard Längkvist 2025–2026
   ---------------------------------------------------------------------
   ÄNDRA HÄR – slår igenom i ALLA recept-HTML-filer automatiskt.
   Recepten behöver inte uppdateras manuellt.
   ===================================================================== */

const SITE = {
  /* ---- 1. ELPRIS (ändra bara här) ---- */
  elpris_kr_per_kWh: 2.0,

  /* ---- 2. MASKINER: effekt (W), tid (h), andel aktiv uppvärmning ----
     energi (kWh) = W/1000 * timmar * aktivandel                        */
  maskiner: {
    "clatronic-dough":  { namn: "Clatronic Dough (deg)",        W: 550,  h: 1.50, aktiv: 0.35 },
    "clatronic-cake":   { namn: "Clatronic Cake",               W: 550,  h: 1.83, aktiv: 0.55 },
    "clatronic-normal": { namn: "Clatronic Normal/bröd",        W: 550,  h: 3.00, aktiv: 0.45 },
    "clatronic-quick":  { namn: "Clatronic Quick (snabb)",      W: 550,  h: 1.63, aktiv: 0.45 },
    "clatronic-jam":    { namn: "Clatronic Jam/marmelad",       W: 550,  h: 1.33, aktiv: 0.60 },
    "ugn-225":          { namn: "Ugn 225°C (~12 min)",          W: 2000, h: 0.25, aktiv: 0.80 },
    "ugn-250":          { namn: "Ugn 250°C (~20 min)",          W: 2200, h: 0.33, aktiv: 0.85 },
    "airfryer":         { namn: "Airfryer (~20 min)",           W: 1500, h: 0.33, aktiv: 0.70 },
    "riskokare":        { namn: "Riskokare (~40 min)",          W: 700,  h: 0.67, aktiv: 0.60 },
    "mikro-popcorn":    { namn: "Mikro (~3 min)",               W: 1000, h: 0.05, aktiv: 1.00 }
  },

  /* ---- 3. INGREDIENSPRISER (kr/kg) – valfri central källa ----
     Uppdatera pris här och räkna om vid behov.                        */
  priser_kr_per_kg: {
    "Vetemjöl (Garant)": 7.55,
    "Bönmjöl / vita bönor": 35.36,
    "Majsmjöl Finmalt (Favero)": 15.99,
    "Whey-80 Natural / Proteinpulver": 274.75,
    "Turkisk Yoghurt 10%": 33.02,
    "Mjölk Längre Hållbarhet 3%": 11.92,
    "Strösocker": 11.31,
    "Honung Flytande": 75.52,
    "Salt": 37.66,
    "Jäst Söt Deg Färsk / torrjäst (Kronjäst)": 66.20,
    "Margarin Mat & Bak": 29.90,
    "Rapsolja": 23.14,
    "Ananas Fryst": 60.38,
    "Mango Fryst": 41.44,
    "Blåbär Frysta": 83.91,
    "Morötter Klass 1": 12.90,
    "Rabarber": 0.0,
    "Rabarberkräm (hemmagjord)": 2.45,
    "Ananaskräm (hemmagjord)": 58.60,
    "Popcornmajs": 30.0,
    "Rädisor": 30.0,
    "Jordnötssmör Crunchy": 82.57,
    "Jordnötssmör Creamy": 82.57
  },

  /* ---- Beräkna energi (kWh) och kostnad (kr) för en maskin ---- */
  energi(maskinId) {
    const m = this.maskiner[maskinId];
    if (!m) return null;
    const kWh = (m.W / 1000) * m.h * m.aktiv;
    return { namn: m.namn, kWh: kWh, kr: kWh * this.elpris_kr_per_kWh };
  }
};

/* =====================================================================
   AUTOMATISK IFYLLNAD I RECEPTEN
   ---------------------------------------------------------------------
   I receptet skriver du t.ex.:
     <span data-energi="clatronic-cake"></span>
   → site.js fyller i "1,11 kr (0,55 kWh)" automatiskt.

   Flera maskiner (t.ex. deg + ugn):
     <span data-energi="clatronic-dough+ugn-225"></span>
   ===================================================================== */
document.addEventListener("DOMContentLoaded", function () {
  // Energikostnad
  document.querySelectorAll("[data-energi]").forEach(function (el) {
    const ids = el.getAttribute("data-energi").split("+").map(s => s.trim());
    let totKr = 0, totKwh = 0, namn = [];
    ids.forEach(function (id) {
      const e = SITE.energi(id);
      if (e) { totKr += e.kr; totKwh += e.kWh; namn.push(e.namn); }
    });
    el.textContent = totKr.toFixed(2).replace(".", ",") + " kr ("
      + totKwh.toFixed(2).replace(".", ",") + " kWh)";
    el.title = "Energi: " + namn.join(" + ") + " @ "
      + SITE.elpris_kr_per_kWh.toFixed(2).replace(".", ",") + " kr/kWh";
  });

  // Visa aktuellt elpris där man vill: <span data-elpris></span>
  document.querySelectorAll("[data-elpris]").forEach(function (el) {
    el.textContent = SITE.elpris_kr_per_kWh.toFixed(2).replace(".", ",") + " kr/kWh";
  });

  // Ingrediens-pris/kg: <span data-pris="Vetemjöl (Garant)"></span>
  document.querySelectorAll("[data-pris]").forEach(function (el) {
    const p = SITE.priser_kr_per_kg[el.getAttribute("data-pris")];
    if (p != null) el.textContent = p.toFixed(2).replace(".", ",") + " kr/kg";
  });
});
