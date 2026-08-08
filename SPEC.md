# SPEC – Mitt Maskinkök
<!-- PLATS: /SPEC.md (repo-roten) -->
<!-- SYFTE: Klistra in denna fil i valfri AI-chatt så vet den exakt hur sajten
     fungerar och hur nya filer ska skrivas. Version 1.0 · 2026-07-07 -->

## VAD DETTA ÄR

En statisk sajt på GitHub Pages (gratis) med matlagningsmaskiner och recept.

- **Live:** https://tokke2.github.io/recept/
- **Repo:** https://github.com/Tokke2/recept (användare: Tokke2, repo: recept, branch: main)
- **Databas-URL (för AI):** https://tokke2.github.io/recept/json/maskindatabas.json
- Ingen server, ingen byggprocess – rena HTML/CSS/JS/JSON-filer.
- Uppladdning = dra in filer på GitHub → Commit → live inom ~1 min.

## FILSTRUKTUR

```
/                           (repo-roten)
├── index.html              Startsida: receptsök, maskinväljare, ändringslogg
├── maskindatabas.html      Maskindatabas med programförslag ("vad ska du laga?")
├── generator.html          Receptgenerator: bygg recept av ingrediensdatabasen
├── maskin-import.html      Lägg till maskin via produktlänk (Amazon m.fl.):
│                              genererar json-mall + 💾 SPARA DIREKT PÅ SAJTEN
│                              (via spara.js, lösenordsskyddat) – skriver både
│                              json/maskiner/ID.json OCH maskiner-index.json →
│                              maskinen syns automatiskt i databasen, recept-
│                              flikarna, generatorn och maskinförslagen.
│                              Produktlänken sparas som "kop"-länk (affiliate-
│                              taggas automatiskt om affiliate.json är ifylld).
├── status.html             Hälsokontroll: testar recept/metadata/bilder/energi/maskiner live
├── forslag.html            💡 FÖRSLAGSLÅDAN: besökare föreslår funktioner/recept
│                              och röstar 👍. Förslag = GitHub Issues (label
│                              "förslag", inskick via förifylld issue-länk –
│                              kräver GH-konto). Röster = Abacus-räknare
│                              (idea-NUMMER), en röst per webbläsare. ENDAST
│                              ÖPPNA issues visas – stäng issuen på GitHub när
│                              förslaget är byggt = det försvinner ur listan
│                              automatiskt (historikrad med antal byggda +
│                              länk visas under). Sorteras efter röster.
│                              INSKICKSMETOD styrs av json/forslag.json:
│                              "metod": "github" (nu) eller "epost" (FÖRBEREDD,
│                              EJ AKTIV – mailto till "epost"-adressen, för när
│                              sajten flyttar från GitHub. Byt metod = aktivera).
├── nytt-recept.html        📝 NYTT RECEPT VIA INKLISTRING: klistra in recept som TEXT
│                              eller HTML-KOD → parsas i webbläsaren → färdig fil i
│                              standardutformningen (mk-std-v4) med metadata, taggar
│                              och MASKINFÖRSLAG (matchar hela maskinparken, bocka
│                              i/ur) → förhandsgranskning → ladda ner → ladda upp
│                              till recept/. Roboten rör inte filen (redan standard).
├── manifest.json           PWA-manifest (installerbar app)
├── sw.js                   Service worker: offline + injicerar site.js i recept som saknar den
├── SPEC.md                 Denna fil
├── .github/workflows/
│   └── autofix-recept.yml  AUTO-KONVERTERARE (se nedan)
├── assets/                 CENTRALA MODULER (styr ALLA sidor – ändra här, aldrig per sida)
│   ├── site.js             LADDAREN: enda raden en sida behöver. Laddar övriga moduler + kontrollerar metadata
│   ├── print.css           A4-utskriftsformat för alla sidor
│   ├── print.js            🖨️-knappen (skapas automatiskt)
│   ├── app.js              PWA-registrering + 📤 delningsknapp
│   ├── recept.js           👨‍🍳 Kockläge (steg-för-steg helskärm, Wake Lock)
│   ├── energi.js           ⚡ Energikostnadstabell (läser central data)
│   ├── sprak.js            🌐 SPRÅKMODUL: dropdown på alla sidor, översätter ALLT
│   ├── redigera.js         ✏️ REDIGERING: ändra ingredienser/mängder/steg direkt
│   │                          på sidan (t.ex. "10 g mjöl" → "10 g vatten"), ladda
│   │                          ner uppdaterad fil eller redigera direkt på GitHub
│   ├── betyg.js            ⭐ GLOBALT BETYG: alla besökare kan rösta 1–5 stjärnor,
│   │                          alla ser samma genomsnitt (gratis räknar-API Abacus,
│   │                          abacus.jasoncameron.dev – ingen server behövs).
│   │                          En röst per webbläsare. Visas på receptsidan,
│   │                          i provenienshuvudet och på receptkorten.
│   ├── maskinmatch.js      🔧 MASKINANPASSNING: matchar automatiskt ALLA maskiner
│   │                          i json/maskiner/ mot receptet (programmens nyckelord
│   │                          vs taggar/titel/rubriker) och visar "Fler av dina
│   │                          maskiner som klarar receptet" med program + tid.
│   │                          Ny maskin = alla recept anpassas direkt, utan att
│   │                          en enda receptfil ändras.
│   ├── kokbok.js           📕 KOKBOKSUTSKRIFT (på recept.html): knappen "📕 Kokbok"
│   │                          → bocka för valfria recept → 🖨️ skriver ut omslag +
│   │                          innehållsförteckning + alla valda recept i A4,
│   │                          ett recept per sida. Byggs i webbläsaren (iframe).
│   ├── spara.js            💾 DIREKT-SPARA (nytt-recept.html & generator.html):
│   │                          sparar recept direkt i recept-mappen via GitHub API,
│   │                          ingen nedladdning/uppladdning. 🔒 LÖSENORDSSKYDDAT:
│   │                          samma lösenord som json/las.json (ETT ställe att
│   │                          byta på – GitHub), upplåsning delas med ✏️-redigering
│   │                          (sessionStorage mk-edit-unlocked). Kräver dessutom
│   │                          personlig GitHub-nyckel (fine-grained token,
│   │                          Contents R/W på Tokke2/recept) – engångsinställning,
│   │                          lagras endast i webbläsarens localStorage.
│   │                          Generatorn uppdaterar även json/energi.json
│   │                          automatiskt vid spar, och har "➕ Ny ingrediens"
│   │                          som skriver direkt till json/ingredienser.json.
│   ├── ingrediens.js       🧾 INGREDIENSTABELL v2 (alla receptsidor, centralt):
│   │                          namn + mängd i samma kolumn (grön pastill), priset
│   │                          diskret längst till höger, tydlig radlinje,
│   │                          💧 VÄTSKOR SORTERAS ÖVERST (bakmaskinsordning),
│   │                          grupprubriker bevaras, Totalt sist. Källfilerna
│   │                          behåller vanliga tabeller – designen läggs på här.
│   │                          Kockläget läser data-namn/data-mangd per rad.
│   └── receptnav.js        🎯 FOKUSERAD RECEPTVY: på receptsidor visas ENDAST
│                              verktygsraden: ← Föregående · 👨‍🍳 Kockläge · Nästa →
│                              · 🖨️ Skriv ut · 📤 Dela · 🏠 Startsida. Allt annat
│                              flytande döljs – fullt fokus på receptet.
├── json/                   ALL DATA (aldrig data i HTML!)
│   ├── maskindatabas.json  Basdata: elpris_kr_per_kwh, recept-register, ai_instruktion
│   ├── energi.json         Energidata per recept: filnamn → [{maskin, min, moment}]
│   ├── affiliate.json      🛒 AMAZON-AFFILIATE: fyll i "amazon_tag" (Associates
│   │                          Store ID från affiliate-program.amazon.se) → ALLA
│   │                          amazon.se-länkar taggas automatiskt (?tag=...),
│   │                          märks "(betald länk)" enligt svensk lag och
│   │                          Amazons obligatoriska text visas i sidfoten.
│   │                          Tomt = av. Modulen: assets/affiliate.js.
│   ├── donation.json       💚 DONATIONER: swish_nummer (visas ALDRIG i klartext –
│   │                          💚-knappen visar QR-kod via Swish officiella API på
│   │                          dator, öppnar Swish-appen direkt på mobil) och
│   │                          kofi (användarnamn på ko-fi.com). Endast ifyllda
│   │                          visas. Båda tomma = ingen rad. (assets/site.js)
│   ├── ingredienser.json   Ingrediensdatabas: pris kr/kg + näring per 100 g
│   ├── ingrediens-lankar.txt 🛒 KLISTRA IN PRODUKTLÄNKAR (Willys/Hemköp), en per
│   │                          rad, committa → roboten hämtar RIKTIGT jämförpris
│   │                          (kr/kg) + näring per 100 g ur butikens API och
│   │                          uppdaterar ingredienser.json. Filen töms efteråt.
│   │                          Befintlig ingrediens med samma namn UPPDATERAS.
│   ├── las.json            🔒 LÖSENORD för receptredigering. Byts ENDAST genom
│   │                          att redigera denna fil på GitHub. SÄKRAST:
│   │                          "losenord_hash" = SHA-256-hash (syns ej i klartext).
│   │                          Reserv: "losenord" i klartext. las_redigering:false = av.
│   ├── maskiner/           EN .json-FIL PER MASKIN – läses in automatiskt (11 st)
│   ├── maskiner-index.json Maskinlista (byggs av Action, ren array)
│   └── sprak/              ÖVERSÄTTNINGAR: en.json, de.json... ("svensk text": "översatt")
├── recept/                 EN .html-FIL PER RECEPT – läses in automatiskt
└── images/                 Maskinbilder (maskin-id.jpg) + images/recept/ (receptbilder)
    └── recept/             Receptbild = SAMMA filnamn som receptet (.jpg)
```

## AUTO-KONVERTERAREN (GitHub Action)

Ladda upp VILKEN recept-HTML som helst till recept/ → inom ~30 sek konverteras
den automatiskt till appens standard:
- site.js-raden + PLATS-märkning läggs till
- METADATA GENERERAS ur innehållet: namn/emoji ur titeln, beskrivning ur
  första stycket, taggar ur matord i texten
- MASKINER MATCHAS mot json/maskiner/ (nämns "GreenPan" eller "airfryer"
  i texten kopplas maskinen + programmet automatiskt)
- ENERGIDATA skapas i json/energi.json om maskin + tid hittas i texten
Auto-genererad metadata är en bra grund – finslipa gärna för hand efteråt.

## KÄRNPRINCIPER (bryt aldrig dessa)

1. **AUTOMATISK INLÄSNING:** Nya filer i `recept/` (.html OCH .pdf) och `json/maskiner/`
   (.json) hittas automatiskt. HTML-recept: metadata läses ur filen. PDF-recept:
   visas automatiskt som kort (namn = filnamnet, öppnas i ny flik). Ingen
   lista/index/kod behöver ändras – släpp filen i mappen = klart.
2. **ALLT CENTRALT:** Funktioner (utskrift, delning, kockläge, energi) och data
   (elpris, effekt, energitider) bor i `assets/` och `json/` – ALDRIG hårdkodat i sidor.
   En ändring på ett ställe slår igenom överallt.
3. **PLATSMÄRKNING:** Alla filer anger sin plats på rad 1–5 (se format nedan).
4. **SJÄLVLÄKNING:** Recept utan site.js-raden fixas av GitHub Action + service worker.
   Men skriv ALLTID raden ändå.
5. **SVENSKA** i allt användarvänt innehåll.

## PLATSMÄRKNING (rad 1–5 i varje fil)

- HTML (rad 2, efter doctype): `<!-- PLATS: /recept/filnamn.html  (kommentar) -->`
- JS/CSS/YML (rad 1–3): `/* PLATS: /assets/fil.js  (kommentar) */` resp. `# PLATS: ...`
- JSON (första nyckeln): `"_plats": "/json/fil.json  (kommentar)"`
- UNDANTAG: `maskiner-index.json` och `recept-index.json` är rena arrayer – ingen _plats.

## RECEPT VIA KLISTRAD TEXT (enklaste vägen!)

Skapa recept/mittrecept.txt på GitHub (Add file → Create new file), klistra in:
  Rad 1: Receptnamn (emoji valfri)
  Stycke: beskrivning. "OBS!..." blir varningsruta, "Tips:..." blir tipsruta.
  Ingredienser:            (rubrik)
  - Vetemjöl 210 g         (namn + mängd, olika format tolkas)
  Gör så här:              (rubrik)
  1. Första steget         (numrerade eller punktade rader)
→ Committa → roboten bygger färdig standard-HTML och raderar txt-filen!

## SÅ SKRIVS ETT NYTT RECEPT

Fil: `recept/kort-filnamn.html` (små bokstäver, bindestreck, inga mellanslag/åäö i filnamnet).

**OBLIGATORISKT SKELETT:**

```html
<!DOCTYPE html>
<!-- PLATS: /recept/FILNAMN.html  (recept-mappen – läses in automatiskt av startsidan) -->
<html lang="sv">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EMOJI Receptnamn – Recept</title>

<!-- METADATA – läses av startsidan. ALLA 5 är obligatoriska: -->
<meta name="recept:namn" content="Receptnamn">
<meta name="recept:emoji" content="🍲">
<meta name="recept:beskrivning" content="Kort beskrivning. X portioner, ~Y kcal/port, ~Z kr.">
<meta name="recept:taggar" content="tagg1, tagg2, tagg3">
<meta name="recept:maskiner" content="Roll: Maskinnamn · Program tid | Roll 2: Maskin · Program">

<link rel="stylesheet" href="../assets/print.css">
<style>/* sidans egen stil – se designsystem nedan */</style>
</head>
<body>
<header> ... rubrik + beskrivning ... </header>

<!-- Receptbild (frivillig): lägg images/recept/FILNAMN.jpg så visas den -->
<img class="hero-img" src="../images/recept/FILNAMN.jpg" alt="" onerror="this.style.display='none'">

<div class="card"><h2>🧾 Ingredienser</h2>
  <table> ... ingrediens | mängd | pris ... <tr class="total">totalrad</tr></table>
</div>

<div class="card"><h2>🥣 Så gör du</h2>
  <div class="machine-step"><h3>⚙️ MASKIN · <span class="prog">PROGRAM + TID</span></h3></div>
  <ol><li>Steg 1...</li><li>Steg 2...</li></ol>   <!-- <ol>-steg blir kockläges-steg! -->
</div>

<div class="card"><h2>📊 Näringsvärde</h2> ... </div>

<footer>Recept kopplat till Maskindatabas</footer>
<script src="../assets/site.js"></script>   <!-- OBLIGATORISK – laddar ALLT -->
</body>
</html>
```

**REGLER FÖR RECEPT:
- 🧾 INGREDIENSER ALLTID ÖVERST (första kortet efter header/hero/varning)
- Kockläget visar automatiskt: ingredienslistan som steg 1 + mängder
  som gröna piller på varje steg där ingrediensen nämns**
- `recept:maskiner`-format: `Roll: Maskin · Program` — flera separeras med `|`
- Stegen MÅSTE ligga i `<ol><li>` — kockläget byggs automatiskt av dem
- Maskinval: välj ALLTID maskinen med mest dedikerat program ur maskindatabasen
  (dedikerat > generellt). Ange exakt programnamn + tid. Respektera maskinens
  "viktigt"-varningar (t.ex. bakmaskinens Cake-program gör kakor skummiga –
  blanda bara, grädda i annan maskin).
- INGEN energidata i HTML! Läggs i `json/energi.json` (se nedan).
- INGEN egen utskrifts-CSS/knappar/delning – site.js sköter allt.

**ENERGI för receptet** → lägg till i `json/energi.json` under "recept":
```json
"FILNAMN.html": [
  { "maskin": "maskin-id", "min": 50, "moment": "Gräddning" }
]
```
Effekt (W) hämtas automatiskt ur maskinfilen, elpris ur maskindatabas.json.

## SÅ SKRIVS EN NY MASKIN

Fil: `json/maskiner/maskin-id.json` (id = små bokstäver + bindestreck, t.ex. `philips-airfryer-xxl`).

```json
{
  "_plats": "/json/maskiner/MASKIN-ID.json  (en maskinfil per maskin – läses in automatiskt)",
  "id": "MASKIN-ID",
  "namn": "Fullständigt namn",
  "typ": "Kategori / Underkategori",
  "varumarke": "Märke",
  "modellnamn": "Modell",
  "asin": "AMAZON-ASIN (om känt)",
  "kapacitet": "T.ex. 5 L, 1200 W",
  "effekt_w": 1200,
  "egenskaper": ["Egenskap 1", "Egenskap 2"],
  "viktigt": ["Varning/begränsning 1 (från manualen)"],
  "lankar": {
    "kop": "https://www.amazon.se/dp/ASIN",
    "bruksanvisning": "URL till manual",
    "tillverkare": "URL"
  },
  "program": [
    {
      "namn": "Programnamn (originalnamn)",
      "typ": "Program/Funktion/Menyprogram",
      "standardtid": "40 min (30 min–2 h)",
      "beskrivning": "Vad programmet gör, verifierat mot manualen.",
      "bast_for": "Rätter det passar för",
      "nyckelord": ["sökord1", "sökord2"]
    }
  ],
  "bild": "images/MASKIN-ID.jpg"
}
```

**REGLER FÖR MASKINER:**
- Programtider VERIFIERAS mot officiell bruksanvisning (sök upp manualen!) – gissa inte.
- `nyckelord` driver rekommendationsmotorn ("vad ska du laga?") – var generös med svenska mattermer.
- `effekt_w` krävs för energiberäkningen.
- Bild: ladda upp `images/MASKIN-ID.jpg` (max 480 px längsta sida, JPEG kvalitet 80).

## DESIGNSYSTEM (färger/klasser som används överallt)

```css
--bg:#f6f3ee; --card:#fff; --accent:#c0392b; --accent2:#e67e22;
--dark:#2c3e50; --muted:#7f8c8d; --green:#27ae60;
```
- Typsnitt: 'Segoe UI', system-ui, sans-serif
- `.card` = vit box, border-radius 14px, padding ~20px, lätt skugga
- `.machine-step` = grön vänsterkant + ljusgrön bakgrund (maskininstruktion)
- `.warn` = orange vänsterkant + ljusorange bakgrund (varning)
- `.alt` = grå variant (alternativ metod)
- `.badge` = grön liten etikett · `.total` = fet summarad i tabell
- Header: gradient accent→accent2, vit text, rundade hörn

## FLERSPRÅK (🌐-dropdown uppe till höger på alla sidor)

- Svenska = originalspråk (texten i filerna). Andra språk = ordbok i json/sprak/<kod>.json
- sprak.js (laddas av site.js) byter ut ALLA texter – även maskiner/recept/energi
  som renderas dynamiskt (MutationObserver). Valet sparas i webbläsaren.
- Text som saknas i ordboken AUTO-ÖVERSÄTTS via gratis API (MyMemory, ingen
  nyckel) och cachas i besökarens webbläsare – översätts bara en gång per enhet.
  Ordboken vinner alltid över auto (bättre kvalitet). Auto-resultat loggas i
  konsolen → flytta bra fraser till json/sprak/<kod>.json för permanent kvalitet.
  Gräns: ~5000 tecken/dygn per besökare (räcker gott tack vare cachen).
- Manuell översättning läggs i språkfilen under "texter"
  ("Exakt svensk text": "Översättning") eller "monster"
  ("Steg {1} av {2}": "Step {1} of {2}") och slår igenom överallt.
- NYTT SPRÅK: skapa json/sprak/XX.json + lägg till koden i LANGS i assets/sprak.js.
- VIKTIGT för nya recept/maskiner: använd samma svenska standardfraser som
  övriga filer (rubriker som "🧾 Ingredienser", "🥣 Så gör du", "📊 Näringsvärde",
  programtyper som "Menyprogram") – då översätts de gratis av befintliga ordböcker.
  Receptunika texter (beskrivningar, steg) läggs till i språkfilerna vid behov.

## UTSKRIFT & SIDANPASSNING (central: assets/print.js v4 + print.css)

- 🖨️/Ctrl+P öppnar utskriftsdialog med lägen: Hela receptet / Utan bilder /
  Kökskort / Endast ingredienser (inköpslista). Sidantal visas i förväg
  per läge. Senast valda läget minns (localStorage: mk-print-mode).
- ✨ ENDAST RECEPTET (v4-vitlista, automatisk): på receptsidor skrivs BARA
  själva receptet ut – header, receptbild, varningar/tips, ingredienser,
  steg, näringsvärde. Allt annat (betyg, proveniensrad, maskinförslag,
  "Se även", energitabell, anteckningar, QR-kort, FRAMTIDA moduler) rensas
  automatiskt: vitlistan behåller endast recept-innehåll, och alla element
  med id "mk-*" (moduler) utesluts per definition. Ingen dölj-lista behöver
  underhållas när nya moduler byggs.
- SMART SIDANPASSNING (50%-regeln, v4 för ALLA sidantal):
  · Endast det som faktiskt skrivs ut mäts mot A4-sidhöjd (vitlistan).
  · Sista sidan mindre än halvfull → auto-skala till närmaste hela
    sidantal: 1,3 sidor→1 · 2,3→2 · 3,4→3 (max ner till 62%).
  · Överskott över 50% → naturliga sidor, oskalat.
  · Väljbart: Auto / 1 sida / Av (localStorage: mk-fit).
- Snygga brytningar: rubriker lämnas aldrig ensamma nederst, steg/tabell-
  rader delas aldrig mitt itu. Kort högre än en A4-sida får brytas inuti
  (annars uppstår nästan tomma sidor). RECEPTNAMNET skrivs automatiskt in
  i Ingrediens-/steg-/näringsrubrikerna på pappret ("🧾 Ingredienser –
  Äppelsmulpaj") så ingen sida blir anonym.
- Utskrifter får alltid: kokboksformat, datumrad, liten QR i sidfoten
  (Hela/Utan bilder; kökskort & inköpslista hålls helt rena).

## CENTRALA DATAFILER (ändra data HÄR, aldrig i HTML)

| Vad | Fil | Nyckel |
|---|---|---|
| Elpris | json/maskindatabas.json | `elpris_kr_per_kwh` (nu: 2.5) |
| Maskineffekt | json/maskiner/<id>.json | `effekt_w` |
| Recepts energitider | json/energi.json | `recept["filnamn.html"]` |
| AI-instruktion | json/maskindatabas.json | `ai_instruktion` |

## MASKINPARK (id → namn, för recept-/energikoppling)

- `midea-mb-fs5017` – Midea riskokare/multikokare (860 W) – ris, långkok, stuvning, kött, soppa, yoghurt, bröd, fisk, ångkok, gröt/risotto, KAKA, varmhållning
- `greenpan-frost` – GreenPan Frost glass/slushmaskin (190 W) – Soft Ice Cream, Slushie, Spiked Slushie, Sorbet, Milkshake, Extrude Clean. 7 texturnivåer. VIKTIGT: min ~4% socker, alkohol 2,8–16% (Spiked), ALDRIG is/fryst i behållaren, extrudera vid pip
- `cosori-twinfry-10l` – COSORI dubbel airfryer (2400 W) – air fry, roast, bake, grill, reheat, dehydrate, sync
- `ninja-af500eucp` – Ninja FlexDrawer airfryer (2470 W) – air fry, max crisp, roast, bake, reheat, dehydrate, PROVE (jäsning!)
- `yumasia-sakura` – Yum Asia riskokare fuzzy logic (610 W) – ris (5 sorter inkl. sushi/tahdig), gröt, ångkok, långkok, soppa, kaka, yoghurt
- `wmf-snacktogo` – WMF torkautomat (250 W) – örter 30–40°C, grönsaker 50–55°C, frukt 57–60°C, jerky 65–70°C, timer 24 h
- `linkchef-grinder` – LINKChef kaffe/kryddkvarn (300 W) – torr- och våtmalning (puls)
- `krups-fdk452` – KRUPS smörgåsgrill (850 W) – toast 3–5 min
- `klaif-pizzaugn` – KLAIF pizzaugn 12" keramisk sten (1200 W) – separat över/undervärme, ~400°C, pizza 60–120 s efter 10–15 min förvärmning
- `silonn-ismaskin` – Silonn ismaskin (160 W) – små/stora kuber 9 st/6 min, självrengöring 30 min
- `clatronic-bba3774` – Clatronic bakmaskin (550 W) – 12 program. VIKTIGT: Cake-programmet (1:50 h: knåda 6+10 min, baka 80 min) ger SKUMMIGA kakor om hela cykeln körs – använd endast 1:a knådfasen (6 min) för att blanda, grädda i annan maskin. Dough-programmet (1:30 h) = knåda+jäs utan bakning, perfekt för pizzadeg. Max 590 g mjöl/7 g torrjäst.

## BEFINTLIGA RECEPT

- `ananaskaka.html` 🍍 – mjuk ananaskaka (Clatronic blandar 6 min → Midea Kaka 50 min)
- `Ananas_Rom_Yoghurt_Slush.html` 🍹 – rom-slush (GreenPan Frost Spiked Slushie N4) OBS alkohol
- `annanasglas_hund.html` 🐶 – hundglass (GreenPan Frost Soft Ice Cream) utan socker/alkohol
- `Mjukglass MAX.html` 🍦 – mjukglass (GreenPan Frost Soft Ice Cream)
- `a4-makaronichips-airfryer-salt--peppar.html` 🥨 – makaronichips (COSORI Air Fry)
- `pizzadeg-bakmaskin-4x250g.html` 🍕 – pizzadeg 4×250 g (Clatronic Dough 90 min → KLAIF-ugn)
- `recept_pitabrod_airfryer.html` 🫓 – pitabröd (COSORI airfryer)
- `recept_proteinshake_saft.html` 🥤 – proteinshake
- `majsbrod-saftig-print.html` 🍞 – saftigt majsbröd

## UPPLADDNINGSRUTINER

1. En logisk ändring = EN commit (undvik deploy-krockar; vänta på grön bock i Actions)
2. Skriv beskrivande commit-text (visas i startsidans ändringslogg!): "Nytt recept: köttgryta"
3. Nya recept → recept/ · nya maskiner → json/maskiner/ · bilder → images/ resp. images/recept/
4. Energidata → json/energi.json (glöm inte!)
5. Reservlistorna (maskiner-index/recept-index) behöver INTE uppdateras på GitHub Pages,
   men det skadar inte (krävs bara på andra webbhotell utan GitHub API).

## INSTRUKTION TILL AI SOM FÅR DENNA SPEC

När användaren ber om ett recept:
1. Välj maskin(er) ur maskinparken ovan – mest dedikerat program vinner
2. Respektera maskinernas VIKTIGT-varningar
3. Producera: (a) komplett recept-HTML enligt skelettet, (b) energirad för json/energi.json,
   (c) ev. instruktion om receptbild
4. Följ designsystemet och platsmärkningen
5. Ange alltid var varje fil ska laddas upp

När användaren ber om en maskin:
1. Sök upp OFFICIELL bruksanvisning, verifiera programtider
2. Producera json-fil enligt maskinmallen med effekt_w och bild-instruktion
