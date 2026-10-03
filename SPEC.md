# SPEC – Mitt Maskinkök
<!-- PLATS: /SPEC.md (repo-roten) -->
<!-- SYFTE: Klistra in denna fil i valfri AI-chatt så vet den exakt hur sajten
     fungerar och hur nya filer ska skrivas. Version 1.0 · 2026-07-07 -->

## 🤖 FÖR AI-CHATTAR: SÅ UTFORMAS RECEPT (läs detta FÖRST)

Om denna spec klistrats in i en AI-chatt och användaren ber om ett RECEPT
eller en MATRÄTT – följ EXAKT dessa regler (fullständig mall med
HTML-skelett + maskinlista finns i /RECEPT-CHATT.md, men reglerna nedan
räcker för korrekta svar):

### RECEPT (svara med komplett HTML-fil, inget annat)
1. SVENSKA överallt. Gram (g) för allt, vätskor får även dl. ALDRIG cups/oz.
2. Kortordning: (ev. .warn-varning) → 🧾 Ingredienser → 🥣 Gör så här →
   💡 Tips. INGEN NÄRINGSTABELL – sajten live-räknar näring & pris själv
   ur sin ingrediensdatabas (näring i inklistrade recept RADERAS av roboten).
3. Obligatorisk metadata i <head>:
   <meta name="recept:namn" content="...">
   <meta name="recept:emoji" content="...">
   <meta name="recept:beskrivning" content="... X portioner, ~Y kcal/portion.">
   <meta name="recept:taggar" content="tagg1, tagg2, tagg3">
   <meta name="recept:maskiner" content="Roll: Maskin · Program, tid | Roll2: ...">
4. Ingredienstabellen: BLÖTAST ÖVERST (vätska i bakmaskinen först).
   Kolumner: ENDAST Ingrediens | Mängd. Inga priser. Vanliga svenska
   varunamn ("Vetemjöl", "Turkisk yoghurt 10%", "Mjölk 3%").
5. Stegen: <ol><li>, ETT moment/steg, max 2 meningar, tider som "⏱ 25 min".
   Beskrivande text hör till beskrivningen – ALDRIG i ingredienstabellen.
6. Maskinsteg: .machine-step-ruta FÖRE stegen (maskin + EXAKT program +
   tid + kort .why). Använd ENDAST maskiner/program ur maskindatabasen
   (https://tokke2.github.io/recept/json/maskindatabas.json) – hitta
   ALDRIG på program. Osäker? Skriv "Manuellt läge".
7. Sista raden före </body>: <script src="../assets/site.js"></script>
8. Klassnamn som MÅSTE användas: .card, .machine-step (.prog/.why),
   .warn, .tip, .alt, .total (se befintliga recept som facit).

### MATRÄTT (tallrik av flera delar – svara med tabell + JSON)
1. Bygg STOR SATS (3–6 portioner) – sajten har portionsjusterare.
2. JSON-post för json/matratter.json:
   { "id": "namn-med-bindestreck", "namn": "...", "emoji": "🍽️",
     "blandad": false,   ← true om allt serveras ihopblandat (gryta)
     "delar": [ { "fil": "receptfil.html", "g": 600 },
                { "fil": "ing:ingrediens-id", "g": 300 },
                { "fil": "fri:Namn:kcal,protein,kolh,fett", "g": 500 } ] }
   (fri: = näring per 100 g, används när recept saknas – rätten kan
   publiceras direkt utan receptkoppling)

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
├── index.html              Startsida/portal v4 (🎨 färgstark design):
│                              HERO med levande gradient (heroskift-animation,
│                              14s, stängs av vid prefers-reduced-motion) +
│                              4 svävande matemojis (.flyt f1–f4) + logga.
│                              Livestatistik #heroStats: receptantal (GitHub
│                              API) + maskinantal + TOTALT programantal.
│                              HUVUDKORTEN färgkodade per sida (--mc: recept=
│                              röd, maskiner=teal, generator=lila, varor=
│                              orange, förslag=blå, status=grön) med färgad
│                              ikonplatta (color-mix + @supports-reserv) och
│                              dekorcirkel som växer vid hover. MASKINBANDET
│                              färgkodat per maskinTYP (samma TYPTEMA som
│                              maskindatabas.html: färg + emoji), länkar till
│                              maskindatabas.html#MASKIN-ID (hash-öppning),
│                              emoji-reserv om bild saknas, typ-pill i färg.
│                              Features med färgad vänsterkant + ikonplatta,
│                              steg-cirklar med gradient, sitemapgrupper med
│                              färgad toppkant + emoji-rubriker. MÖRK footer
│                              (mörkblå gradient, guldlänkar). 📱 MOBIL: 2-
│                              kolumns huvudkort (1 kolumn <380px), mindre
│                              ikonplattor, dämpade flyt-emojis. ⚠️ BEVARADE
│                              ANKARE (får ej tas bort): .topnav (site.js
│                              hoppar över egen meny), .hero .tagline (hem.js
│                              hälsning), .main-cards (hem.js veckans recept-
│                              sektion ankras efter), #heroStats, #machineBand,
│                              #pwaInstallBtn (app.js).
├── recept.html (samlingen) 🗂️ KATEGORIER: recepten grupperas automatiskt
│                              (Husdjur/Sylt/Saft & dryck/Glass/Snacks/Bröd/Deg/
│                              Bakning/Efterrätt/Varmrätter/Övrigt) via prioriterad
│                              ordlista mot taggar+namn (KAT_ORD – specifikt före
│                              generellt, "saftig" triggar ej saft). Standardvyn
│                              visar rubriker per kategori; kategoripiller
│                              filtrerar. Kombinerbart med maskinflikarna & sök.
│  🎨 V2-POLISH (alla sidor, 2026-10): recept/matratter/ingredienser/
│     forslag/status har appendad "V2-POLISH"-CSS sist i <style>
│     (ändrar ALDRIG html/JS): tema-gradient-header med emoji-mönster
│     per sida (recept=röd, maträtter=teal, varor=orange, förslag=blå,
│     status=grön) + theme-color-meta, hover-lyft på knappar, fokus-
│     ringar (a11y), 📱 mobilblock (fullbreddsknappar, tabell-skroll i
│     kortet, 16px-inputs stoppar iOS-zoom), prefers-reduced-motion.
│     assets/design.css: centralt mobilblock för ALLA recept-/rätt-
│     sidor (padding/h1/tabeller/hero/machine-step skalas) – recept-
│     filerna ändras aldrig (Centralt-principen).
├── maskindatabas.html      Maskindatabas med programförslag ("vad ska du laga?")
│                              🛒 MULTIBUTIK (användarens regel "bara dom som
│                              betalar"): butiksknappar genereras ur affiliate.
│                              json→partners – ENDAST aktiv:true visas. Exakt
│                              produktlänk ur maskinens "butiker"-objekt
│                              ({"netonnet":"https://..."}) vinner → "Köp hos X";
│                              annars ÄRLIG sökknapp "Sök hos X" via sok_mall
│                              ({q}=varumärke+modell, URL-kodad). Länkar HITTAS
│                              ALDRIG PÅ. deeplink_mall ({url}) = nätverkets
│                              spårningsomslag (Adtraction/Awin) – läggs på
│                              centralt när kontot är godkänt, aldrig i maskin-
│                              filerna. ✏️-dialogen har 🏬-textarea ("butik:
│                              https://..."-rader, endast https accepteras) som
│                              sparar m.butiker. Amazon går ASIN-vägen som förut.
│                              Partners i registret: amazon(aktiv), netonnet/
│                              komplett/philips/ninja (inaktiva tills nätverks-
│                              konton godkänts – se /business/-rapporten).
│                              🎨 DESIGN v2 (färgglad + mobilanpassad):
│                              header med flerfärgsgradient, emoji-mönster och
│                              📊 live-statistik (antal maskiner/program/total-kW).
│                              🖼️ MASKINGALLERI ersätter flikraden: rutnät med
│                              färgkodade kort (färg+emoji per maskinTYP via
│                              TYPTEMA: riskokare=teal 🍚, airfryer=orange 🍟,
│                              glassmaskin=rosa 🍦, bakmaskin=brun 🍞 osv),
│                              bild med emoji-reserv, programantal och 📖
│                              receptantal per kort. Klick (även Enter/Space,
│                              role=button) → detaljkortet visas + .vald-ram.
│                              🔍 GALLERISÖK (namn/typ/alias) + 🎨 TYPFILTER-
│                              knappar (byggs ur maskinernas typer). Detalj-
│                              kortet: färgad toppkant i typfärgen, 🔍
│                              PROGRAMSÖK i kort med >6 program (filtrerar
│                              tabellrader live). 📱 MOBIL: programtabellen
│                              blir staplade programkort (display:block +
│                              thead döljs, rader = färgkantade kort),
│                              2-kolumns galleri, bild centreras. Rekommen-
│                              dationen har 👀 Visa maskin-knappar (alternativ
│                              klickbara). showMachine finns kvar (bakåt-
│                              kompatibel → visaMaskin); hash-öppning
│                              #maskin-id orörd; ✏️-redigering, Amazon-ASIN,
│                              maskinrecept-rutan och rekommendationsmotorn
│                              oförändrade.
├── generator.html          ⛔ PENSIONERAD (användarens beställning 2026-10):
│                              gamla receptgeneratorn är INAKTIVERAD – filen är
│                              nu en hänvisningssida (noindex + auto-redirect
│                              6 s → nytt-recept.html) så gamla bokmärken inte
│                              ger 404. ALLA interna länkar ompekade till
│                              nytt-recept.html: site.js-menyn ("Skapa" 📝),
│                              index.html (topnav/huvudkort/steg-text/footer/
│                              sitemapgrupp), recept.html-navkortet, manifest-
│                              genvägen, sitemap.xml. Småtexter om "generatorn"
│                              i maskin-import/ingredienser omskrivna.
├── maskin-import.html      Lägg till maskin via produktlänk (Amazon m.fl.):
│                              genererar json-mall + 💾 SPARA DIREKT PÅ SAJTEN
│                              (via spara.js, lösenordsskyddat) – skriver både
│                              json/maskiner/ID.json OCH maskiner-index.json →
│                              maskinen syns automatiskt i databasen, recept-
│                              flikarna, generatorn och maskinförslagen.
│                              Produktlänken sparas som "kop"-länk (affiliate-
│                              taggas automatiskt om affiliate.json är ifylld).
│                              🎨 DESIGN v2 (färgglad + mobilanpassad): lila→
│                              orange gradient-header med 🤖-emojimönster och
│                              stegvisare (1 Klistra in → 2 Roboten fixar →
│                              3 Klart ~2 min). 🤖-knappen = stor gradient-
│                              "robotknapp" med undertext (fullbredd). 🎨 TYP-
│                              VÄLJARE: 10 färgglada emoji-knappar (typgrid)
│                              istället för rå dropdown – synkar den DOLDA
│                              <select id="type"> så all gammal kod (parseUrl-
│                              gissning, build) funkar orört; gissad typ
│                              markeras i griden (typRita efter parseUrl).
│                              👀 FÖRHANDSGRANSKNING: kort som visar hur
│                              maskinen ser ut i databasen (emoji+namn+kW-chip+
│                              ASIN-chip+id-chip) byggs live i build(). Manuella
│                              läget ligger i <details> (hopfällt som förut).
│                              Kortens toppkant färgkodad per steg (lila/blå/
│                              grön). 📱 MOBIL: fullbreddsknappar, 3-kolumns
│                              typgrid, inputmode=numeric på effekt.
│                              Robotkö-flödet (maskin-ko.txt), ASIN-igen-
│                              känningen och spara-flödet HELT oförändrade.
├── status.html             Hälsokontroll: testar recept/metadata/bilder/energi/maskiner live
├── ratter/                 🍽️ EN .html-FIL PER MATRÄTT (egen sida likt recepten).
│                              Byggs AUTOMATISKT av matratter.html vid sparning
│                              (id.html). Innehåller ENDAST metadata (ratt:namn/
│                              emoji/delar "fil:gram|ing:id:gram") – assets/ratt.js
│                              ritar allt & räknar näring/pris LIVE. Ändra aldrig
│                              för hand – redigera via matratter.html (spara med
│                              samma namn = sidan uppdateras; 🗑️ tar bort båda).
│                              sw.js cachar ratter/ som receptsidor (offline).
├── matratter.html          🍽️ MATRÄTTER (i toppmenyn): slå ihop recept till
│                              kompletta rätter – t.ex. stekt kyckling + kokt ris
│                              + sås. Ange MÄNGD i gram av varje del → näring &
│                              pris räknas ihop LIVE (varje recepts ingrediens-
│                              tabell läses och räknas per gram mot ingrediens-
│                              databasen, alias-medveten). Delarnas mängder kan
│                              ändras direkt i tabellen. 🥫 MAT-MARKERADE
│                              INGREDIENSER (fält "mat":true, 🍽️ Mat-kryssruta i
│                              ✏️-dialogen på ingredienser.html, orange 🍽️-pill)
│                              är också valbara delar – t.ex. tacosås som sås,
│                              färdigris, sallad – näring per gram direkt ur
│                              databasen (id "ing:<id>"). Sparas i
│                              json/matratter.json via __MK_SPARA (lösenords-
│                              skyddat); besökare ser rätterna, endast admin
│                              sparar/tar bort (egen dialog, aldrig confirm).
│                              ✏️ REDIGERA: knappen på varje rätt laddar den i
│                              byggaren (mängder ändras i tabellen, ✕ tar bort
│                              delar, dropdownen lägger till nya recept/varor) –
│                              spara med SAMMA namn = rätt + egen sida uppdateras.
│                              🔧 SKAPA OM SIDAN: listan HEAD-kollar varje rätts
│                              egna sida – 404 (sidan misslyckades sparas/togs
│                              bort manuellt) → orange 🔧-knapp återskapar den
│                              ur JSON-datan (kollaSidor/skapaOmSida).
│                              ⚡ DIREKTÖPPNING (som recepten): nysparad rätts
│                              sida läggs i SW:ns sid-cache (cachaDirekt) →
│                              öppnas OMEDELBART i ny flik efter sparning,
│                              nätet tar över när Pages byggt om (~1 min).
│                              ✍️ FRIA DELAR (publicera UTAN recept): fällbar
│                              sektion – skriv namn + näring/100 g själv →
│                              delen sparas som "fri:Namn:kcal,prot,kolh,fett"
│                              i delens fil-fält. Ingen receptkoppling behövs;
│                              rätt kan byggas av enbart fria delar och/eller
│                              🥫 mat-varor. tolkaFri() i redigering/listning,
│                              ratt.js renderar fri:-delar (utan länk, 0 kr).
│                              Ändras ett recept/pris räknas rätterna om
│                              automatiskt vid nästa sidladdning.
├── ingredienser.html       🥫 INGREDIENSDATABASEN (i toppmenyn): sök-/sorterbar
│                              tabell över alla ingredienser (pris kr/kg, näring
│                              per 100 g) + LÄGG TILL DIREKT PÅ SIDAN:
│                              1) Butikslänk (Willys/Hemköp/ICA) → skrivs till
│                                 json/ingrediens-lankar.txt via spara.js
│                                 (lösenordsskyddat) → Actions-roboten hämtar
│                                 riktigt jämförpris + näring → ingredienser.json.
│                                 🌱 EGENODLAD-kryssruta vid importen (och i ✏️-
│                                 dialogen): näring från butiken, pris = 0 kr,
│                                 namn får "hemodlad", grön 🌱-pill i listan.
│                                 🌐 ALLA BUTIKER STÖDS (ej bara Willys/Hemköp/ICA):
│                                 övriga (Gymgrossisten, Coop, tillverkare...) läses
│                                 GENERISKT av fetch_generisk(): JSON-LD Product +
│                                 og:title/itemprop-pris + näring ur "per 100 g"-
│                                 zon i sidtexten. Vikt ur namnet ("4 x 1 kg" även
│                                 med text emellan) → kr/kg; utan vikt = styckpris
│                                 + varning. 🍫 SMAKVARIANTER: kolumn-per-smak-
│                                 tabeller (hitta_varianter) → "varianter"-fält
│                                 [{smak,kcal,protein,kolhydrat,fett}] på posten;
│                                 HUVUDVÄRDEN = SNITT över smakerna. Ingrediens-
│                                 sidan visar "🍫 N smaker"-knapp → expanderbara
│                                 ↳-underrader med varje smaks egen näring.
│                                 TVÅ SMAKTABELL-MÖNSTER: A) kolumn-per-smak
│                                 (Gymgrossisten; Per 100g/Portion-rubriker
│                                 filtreras), B) EGEN tabell per smak med smak-
│                                 namn i rubrik före (Tyngre; "Vassle "-prefix
│                                 strippas, dubbletter slås ihop). Vikt letas
│                                 även i SIDTEXTEN ("5x900g"/"900 gram x 5" –
│                                 hela sidan, React-sidor är stora) + pris ur
│                                 "price":"..."-state. Verifierat: Gymgrossisten
│                                 Whey-80 4×1 kg → 299,75 kr/kg · 32 smaker;
│                                 Tyngre Vassle Mix&Match XL → 1799 kr/4,5 kg =
│                                 399,78 kr/kg · 42 smaker (Vaniljdrömmar 395/75,
│                                 Kladdkaka 384/71, Nougatpralin 381/68...).
│                                 LÄNKEN SPARAS på posten ("lank") + 🔗-ikon.
│                              2) Manuellt formulär → skrivs direkt till
│                                 json/ingredienser.json. Uppdaterar befintlig
│                                 ingrediens vid samma namn/id.
│                              ✅ MARKERA & TA BORT: kryssrutor per rad + "Ta bort
│                                 markerade" (lösenordsskyddat, bekräftelsedialog).
│                              ✏️ REDIGERA PER RAD: penna på varje rad → dialog med
│                                 alla fält (namn/märke/pris/näring) + BUTIKSLÄNK-
│                                 fält. 🔗 = länk kopplad, ⛓️‍💥 = saknas (klistra
│                                 in i dialogen → varan ingår i månatliga pris-
│                                 uppdateringen). Endast Willys/Hemköp/ICA-länkar
│                                 accepteras. Sparas lösenordsskyddat.
│                              🔄 MÅNATLIG PRISUPPDATERING: knappen "Uppdatera
│                                 priser via länkarna" lägger auto-länkarna
│                                 (Willys/Hemköp/ICA) i importkön → roboten hämtar
│                                 färska priser → slår igenom i alla recepts
│                                 live-kalkyl. Referenslänkar (andra butiker)
│                                 hoppar över. Spärr: 1 gång/månad.
│                              🔗 VALFRI BUTIKSLÄNK: ✏️-dialogen accepterar alla
│                                 https-länkar (Systembolaget, tillverkare...) som
│                                 klickbar REFERENSLÄNK; endast Willys/Hemköp/ICA
│                                 prisuppdateras automatiskt. Länkfältet på sidan
│                                 guidar andra butiker till ✏️ (kopierar länken).
│                              0️⃣ NOLL-OK: kryss i ✏️-dialogen "varan har verkligen
│                                 0 kcal" (vatten, salt...) → ⚠️-varning för
│                                 0-värden döljs (fält: noll_ok). Utan kryss visas
│                                 ⚠️ vid pris/kcal = 0 i listan.
│                              🛡️ GITHUB-FEL FIXAT: spara.js gör 3 försök med
│                                 färsk sha vid 409-konflikt (roboten hann ändra
│                                 filen). Ta bort-dialogen är egen (ej confirm som
│                                 Brave blockerar).
│                              🖱️ HÅRT-KLICK-REGEL (alla dialoger): stängning vid
│                                 klick utanför kräver att musen BÅDE trycks ned
│                                 OCH släpps på bakgrunden. Textmarkering som
│                                 släpps utanför rutan stänger ALDRIG (mousedown-
│                                 target spåras). Gäller ingrediens-/ta bort-/
│                                 lösenordsdialogerna.
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
│                              "metod": "epost" (AKTIVT – med platshållarskydd:
│                              FYLL-I-adress → github-reserv tills riktig e-post angetts i
│                              sajten flyttar från GitHub. Byt metod = aktivera).
├── nytt-recept.html        🎨 DESIGN v2 (färgglad + mobilanpassad): teal→grön→
│                              orange gradient-header med 📝🍳-emojimönster och
│                              stegvisare (1 Klistra in → 2 Analysera → 3 Justera
│                              & spara). 🔍 Analysera = stor fullbredds-gradient-
│                              knapp med undertext. Korten färgkodade per steg
│                              (teal/orange) med numrerade cirklar (.knr).
│                              Maskinraderna = kort med ram+hover istället för
│                              listrader. ➕-panelen (expanel) grön→blå gradient-
│                              bakgrund med emoji-labels. resBox pop-animeras vid
│                              varje analys (.visad). ⚠️ INLINE-FELRUTA (#srcFel,
│                              visaFel/doljFel) ersätter ALLA alert() i besökar-
│                              flödet (tom textarea/ingen träff/spara-modul
│                              saknas → röd hint-ruta, döljs vid lyckad analys).
│                              📱 MOBIL: fullbreddsknappar, mindre textarea,
│                              mrow radbryter. ALL parser-/maskinmatchnings-/
│                              programvals-/sparlogik OFÖRÄNDRAD.
│                           ➕ KOPPLA FLER MASKINER: utöver auto-förslagen kan
│                              man BLÄDDRA bland ALLA maskiner i databasen och
│                              koppla dem i KEDJA med eget moment per steg
│                              ("Blenda basen: Ninja Detect · BlendSense" →
│                              "Spinn efter 24 h frys: CREAMi · Glass"). Fritt
│                              antal; ✕ tar bort; momenten hamnar i recept:
│                              maskiner-metan OCH maskinsteg-rutorna. Dubblett-
│                              skydd mot förslagen (samma maskin+program).        📝 NYTT RECEPT VIA INKLISTRING: klistra in recept som TEXT
│                              eller HTML-KOD → parsas i webbläsaren → färdig fil i
│                              standardutformningen (mk-std-v4) med metadata, taggar
│                              och MASKINFÖRSLAG (matchar hela maskinparken, bocka
│                              i/ur) → förhandsgranskning → ladda ner → ladda upp
│                              till recept/. Roboten rör inte filen (redan standard).
│                              🧮 NÄRING TAS BORT VID INKLISTRING (användarens
│                              regel): näringstabeller/-sektioner i inklistrade
│                              recept SLÄNGS (arNaringstabell: ≥2 av kcal/protein/
│                              kolh/fett-etiketter; textläget slänger hela
│                              "Näringsvärde:"-sektionen) – live-kalkylen räknar
│                              ALLTID om mot ingrediensdatabasen istället.
│                              Samma regel i konvertera.py (naringstabell
│                              BORTTAGEN loggas). 🎯 PROGRAMVAL (användarens
│                              HÅRDA regel): INGREDIENSLISTAN ÄR ALDRIG MED I
│                              MATCHNINGEN – matchtext = titel+beskrivning+steg,
│                              ings exkluderas helt ("Turkisk yoghurt" som vara
│                              kan aldrig ge Yoghurt-programmet). Säkert val
│                              ENDAST om a) TITELN pekar ut programmet (även
│                              sammansatt: "AnanasKAKA" → Kaka, suffixmatch)
│                              eller b) programnamnet står EXPLICIT i stegen
│                              ("Kör Yoghurt-programmet"). ALLT annat med
│                              konkurrerande kandidater → orange dropdown
│                              "❓ Osäker – vilket program menas?" så
│                              ANVÄNDAREN väljer. Samma ings-exkludering i
│                              maskinmatch.js (receptsidor): rubriker inne i
│                              🧾 Ingredienser-kortet hoppas över.
│                              🔧 MASKINRUBRIK-SEKTIONER i parseText
│                              (lantbröds-fixen): rader som "Bakmaskin –
│                              1,5 h" / "🔥 Air Fryer" (kort rad, maskinord,
│                              ingen mening) växlar till STEG-läge och blir
│                              egna steg → stegMaskiner hittar maskin+tid;
│                              raderna hamnar ALDRIG i ingredienstabellen.
│                              🔁 DUBBLETT-SKYDD i steg-läget: ingrediens-
│                              rader som UPPREPAS ("Lägg i: vatten 245 g...")
│                              buntas till ETT steg ("Lägg i: vatten, tomater,
│                              ...") istället för skräprader. 🧮 SUMMARADER
│                              ("Deg – ca 700 g"/"Sats: 1000 g") → aldrig
│                              tabellen. EMOJI: titeln vinner med suffixmatch
│                              ("lantBRÖD"→🍞, "ananasKAKA"→🍰) före text-
│                              matchningen. 👣 Segment-tid: totalt→ankarsteg→
│                              FÖRSTA tiden i segmentet; alias-suffix inkl
│                              -et ("våffeljärnet"). 🧱 TYDLIGARE GENERERAD
│                              LAYOUT: steg-kopplade maskiner får sin ruta
│                              VID SITT STEG i byggda filen – <ol> delas med
│                              start=N+1 (samma mönster som 📍-placeringen i
│                              redigera.js); maskiner utan steg-koppling
│                              ligger kvar överst.
│                              👣 STEG-FÖR-STEG-MASKINVAL (användarens regel):
│                              recept med FLERA maskiner får varje maskin
│                              kopplad till SITT steg (stegMaskiner): steg som
│                              nämner maskin (modellnamn ELLER vardagsord:
│                              "crockpotten"/"riskokaren"/"multikokaren", med
│                              böjningssuffix) blir ANKARE; ankarets segment =
│                              steget + följande steg tills nästa maskin nämns.
│                              Tid ur segmentet ("totaltiden blir 11 h" vinner
│                              över "5 min") skrivs in i maskinrutan/metan
│                              istället för programmets standardtid.
│                              crockpot/slow cooker = ALIAS_PROG → Långkok
│                              (säkert: en crockpot ÄR ett långkok).
│                              🍲 ALIAS-KARTAN (uppdaterad när riktiga
│                              maskiner köptes): crockpot/slow cooker →
│                              crock-csc063x (Crock-Pot CSC063X 7,5 L, 320 W,
│                              LÅG/HÖG/Varmhållning – verifierat mot produkt-
│                              spec); köttslicer/skärmaskin/slicer →
│                              vevor-sus420 (VEVOR köttslicer 340 W, 0–15 mm).
│                              YASHE-torken (400 W ur Amazon-titeln, robotens
│                              1000W-gissning rättad) delar torkautomat-alias
│                              med WMF (wmf-snacktogo behåller aliaset –
│                              syskonlogiken tar YASHE vid dubbelbokning).
│                              ⏱ RIMLIGHETSSPÄRR: 3+ h får ALDRIG hamna på
│                              snabb-/autoprogram (riskokaren kan ALDRIG få
│                              "koka kyckling 11 h") – långkoksprogram gynnas,
│                              annars ❓-dropdown. Två maskiner av samma typ
│                              (Midea+Yum Asia är båda riskokare): andra
│                              omnämnandet tar det LEDIGA syskonet. Steg-
│                              maskiner visas med grön 👣 Steg N-etikett,
│                              förbockas alltid, momentet blir "Steg N".
│                              Helhetsmatchningen fyller på med maskiner som
│                              inte redan tagits av ett steg.
│                              📝 INGREDIENS ≠ BESKRIVNING:
│                              beskrivande meningar (verb/skiljetecken/>7 ord,
│                              t.ex. "Häll i 200 g mjöl och rör om.") hamnar
│                              ALDRIG i ingredienstabellen utan i beskrivningen;
│                              uttrycklig "Beskrivning:"-rubrik stöds också.
├── manifest.json           PWA-manifest (installerbar app)
├── sw.js                   Service worker: offline + injicerar site.js i recept som saknar den.
│                              ⚡ DIREKTÖPPNING: nytt-recept.html lägger nysparade
│                              recept i SW:ns sid-cache (cachaDirekt) → receptet
│                              öppnas OMEDELBART efter sparning (öppnas auto i ny
│                              flik), nätet tar över när Pages byggt om (~1 min)
├── SPEC.md                 Denna fil
├── .github/workflows/
│   ├── autofix-recept.yml  AUTO-KONVERTERARE (se nedan)
│   ├── backup-ingredienser.yml  🗄️ Veckobackup av ingrediensdatabasen
│   └── maskin-import.yml + maskin-robot.py  🤖 MASKINIMPORT-ROBOT:
│                           maskin-import.html lägger produktlänk(ar) i
│                           json/maskin-ko.txt (💾 lösenordsskyddat) → roboten
│                           bygger KOMPLETT maskinfil automatiskt. EN RAD = EN
│                           MASKIN, raden får ha FLERA länkar (Amazon +
│                           tillverkarsida) som kombineras: Amazon ger ASIN/
│                           köplänk (Amazon SCRAPAS ALDRIG – namn via URL-slug
│                           + DuckDuckGo-POST-söktitel), TILLVERKARSIDAN ger
│                           namn (og:title; generiska titlar som "Startseite"
│                           förkastas), 🖼️ PRODUKTBILD (og:image, logga-filter,
│                           sparas som images/ID.jpg – aldrig från Amazon) och
│                           📖 MANUAL-PDF (href-sökning; hittas den läses
│                           PROGRAMNAMNEN ur PDF:en med pypdf mot programord-
│                           lista sv/en/de, märkta "SE MANUALEN"). Övrigt:
│                           varumärke (35 kända), modell (regex), typ (13
│                           nyckelordstyper), effekt (W), tillverkarens hemsida
│                           (domän-karta), manualslib/manuals.plus-sökningar.
│                           ✏️ MASKINREDIGERING PÅ SAJTEN: penna på varje
│                           maskinkort → dialog (namn/effekt/kapacitet/
│                           📝 FRITEXT (valfri, blå ruta på kortet)/köp-/
│                           manual-/tillverkarlänk), sparas lösenordsskyddat
│                           via spara.js till json/maskiner/. Program
│                           redigeras på GitHub. "alias"-fält i maskinfiler
│                           ("Ninja FlexDrawer") används av receptkopplingen
│                           OCH maskinlank.js. Startsidans band visar
│                           maskintyp istället för "0 program" när program
│                           saknas.
│                           MANUAL-JAKT I 3 STEG: 1) PDF på tillverkarsidan,
│                           TILLVERKARENS DOMÄN PRIORITERAS ALLTID FÖRST
│                           även i söksteg 2–3 (nr 1-regeln),
│                           2) DDG "märke modell manual filetype:pdf" (PDF:er
│                           verifieras med %PDF-huvud), 3) DDG-manualsida
│                           (manualslib/manuals.plus) – riktiga direktlänkar,
│                           ALDRIG sök-platshållare. TOMT UTELÄMNAS HELT
│                           (användarens beställning): ingen manual → ingen
│                           bruksanvisningslänk alls; inga program → INGEN
│                           program-nyckel, ingen varningstext, inga plats-
│                           hållare (maskindatabas.html döljer tabellen,
│                           generator.html hanterar maskiner utan program).
│                           Titlar städas (HTML-tecken, "| Sajtnamn" bort).
│                           NAMN = "Tillverkare Modell – Typ" när båda hittats;
│                           extra DDG-sökrunda på ASIN när modell/effekt saknas.
│                           ENDAST AMAZON-LÄNK RÄCKER: roboten letar upp
│                           tillverkarens produktsida SJÄLV (DDG-sök, träffen
│                           måste ligga på tillverkardomän; butiker/prisjakt/
│                           sociala filtreras). 📐 SPECS auto-extraheras (mått
│                           cm, vikt kg, volym L, hastigheter, temp-spann,
│                           antal program, volt) → egenskaper-chips. PROGRAM
│                           MED typ "Ur manualen" ÄNDRAS ALDRIG av robotar
│                           utan användarens godkännande (även gamla robot-
│                           gissningar uppgraderas bara om HELA listan är
│                           gissad). maskindatabas.html visar ⚡ effekt (kW/W)
│                           + 🥛 kapacitet ALLTID först bland egenskaperna.
│   ├── sjalvlakning.yml + sjalvlakning.py  🩹 SJÄLVLÄKNINGSROBOT
│                           (natt 04:15 UTC + push + manuell): gör sajten
│                           SJÄLVSTYRD. 1) ⚡ effekt_w saknas → fylls ur central
│                           reservtabell (13 kända maskiner) eller typstandard
│                           (märkt UPPSKATTAD). 2) ⚡ ENERGIDATA PER RECEPT
│                           BERÄKNAS AUTOMATISKT: recept som saknas i energi.json
│                           får poster ur recept:maskiner-metan (maskin-id via
│                           namn/modell/alias-matchning, tid ur metan "3:00 h"→
│                           180 min/spann→snitt, annars programmets standardtid;
│                           aldrig vild gissning). 3) 🖼️ trasiga bildvägar rättas
│                           (jpg/png/webp-ändelser). 4) 🗑️ sökmotor-verifierings-
│                           filer i recept/ tas bort (hör hemma i roten).
│                           5) 🍽️ MATRÄTTSSIDOR: rätt i matratter.json utan sin
│                           ratter/<id>.html → sidan byggs automatiskt (samma
│                           metadata-skelett som byggRattSida); föräldralösa
│                           sidor (rätten borttagen ur JSON) städas. Triggern
│                           lyssnar även på push av json/matratter.json →
│                           sidan finns inom ~30 sek efter sparning (extra
│                           skyddsnät bakom matratter.html:s direktbygge).
│                           Befintliga sidor skrivs ALDRIG över.
│                           Skriver ALDRIG över befintliga värden. Logg:
│                           backup/sjalvlakning-LOGG.md.
│   ├── sprak-robot.yml + sprak-robot.py  🌐 SPRÅKROBOT: förgenererar
│                           översättningar → OMEDELBART språkbyte. SKÖRDAR
│                           alla texter (HTML-sidor: synlig text + title +
│                           placeholder/title/alt/aria-label + metas; maskin-
│                           filer: namn/typ/egenskaper/viktigt/program;
│                           ingrediensnamn), filtrerar skräp (filnamn, rena
│                           priser, koder), översätter ENDAST NYA fraser via
│                           gtx (⁂-buntar, backoff 5/15/45s vid 429, partiell
│                           körning OK – resten tas nästa natt) och lägger
│                           till i json/sprak/*.json. RÖR ALDRIG befintliga/
│                           handrättade fraser. Trigger: natt 03:30 UTC +
│                           push av recept/maskiner/sidor + manuell.
│   └── maskin-underhall.yml + maskin-underhall.py  🔧 VECKOUNDERHÅLL
│                           (måndagar 05:00 svensk tid + manuellt): för varje
│                           maskin – hämtar SAKNAD bild från tillverkarsidan,
│                           jagar SAKNAD manual (3-stegsjakten), tar bort/
│                           ersätter DÖDA länkar (HEAD-koll). 🥣 PROGRAM:
│                           ägarens/manualens program RÖRS ALDRIG – men listor
│                           som HELT består av robot-gissningar/platshållare
│                           (typ Standardprogram/Ej ifyllt, "ROBOT-FÖRIFYLLT",
│                           ❓-poster) får UPPGRADERAS: manual-PDF hittad →
│                           riktiga programnamn ersätter gissningarna; ingen
│                           manual → platshållarna TAS BORT (tomt syns aldrig).
│                           FÖRBÄTTRAR ENDAST – skriver aldrig över data som
│                           ägaren lagt in själv. Logg:
│                           backup/maskin-underhall-LOGG.md.
│                           Uppdaterar maskiner-index.json + committar images/;
│                           kön töms till #KLAR-kommentarer. Trigger: push på
│                           maskin-ko.txt + manuell (workflow_dispatch).
├── assets/                 CENTRALA MODULER (styr ALLA sidor – ändra här, aldrig per sida)
│   ├── site.js             LADDAREN: enda raden en sida behöver. Laddar övriga moduler + kontrollerar metadata.
│   │                          Injicerar även central favicon (images/logo-mark.svg)
│   │                          + logotypmärket i toppmenyns brand-länk
│   ├── logo.svg            Hel logotyp: märke + ordbild "MITT MASKINKÖK" + tagline (tryckfärdig vektor)
│   ├── print.css           A4-utskriftsformat för alla sidor
│   ├── logg.js             📼 SVARTA LÅDAN (alla sidor, laddas FÖRST av
│   │                          modulerna): loggar ALLT lokalt för felsökning –
│   │                          alla klick (element+text+position), inmatning
│   │                          (fält + längd, ALDRIG innehåll; lösenord/nycklar
│   │                          alltid "•••(dolt)"), sidladdningar/hash/online,
│   │                          ALLA JS-fel med stack, console.error/warn,
│   │                          misslyckade fetch-anrop (url/status/ms).
│   │                          Ringbuffert 400 poster i localStorage (mk-logg) –
│   │                          överlever omladdning = ser vad som hände FÖRE
│   │                          kraschen. Skickas ALDRIG någonstans (helt lokal).
│   │                          PANEL: ?logg=1 i adressen ELLER tryck L 5 ggr
│   │                          snabbt → live-logg med filter (💥 Bara fel...),
│   │                          ⬇️ Exportera (mk-logg.json → klistra in i chatten
│   │                          för felsökning), 🗑️ Rensa. API: __MK_LOGG
│   │                          .notera(typ,data)/.hamta()/.exportera()/.rensa()
│   ├── felrapport.js       🚨 FELRAPPORT-ROBOTEN (alla sidor, efter logg.js):
│   │                          besökares JS-fel/promise-krascher mailas ANONYMT
│   │                          till admin via Web3Forms (samma nyckel som
│   │                          Förslagslådan, forslag.json → web3forms_nyckel;
│   │                          tom nyckel = helt passiv). → Admin ser krascher
│   │                          han aldrig själv upplevt. Skydd: max 1 rapport/
│   │                          webbläsare/DYGN, buntar 5 fel (8 s), samma fel
│   │                          aldrig 2 ggr (hash i localStorage), brusfilter
│   │                          (ResizeObserver/NetworkError/tillägg), aldrig
│   │                          personligt innehåll. API: __MK_FELRAPPORT
│   │                          .rapportera(msg, fil, stack)
│   ├── stadare.js          🧹 LOCALSTORAGE-STÄDAREN (alla sidor, osynligt
│   │                          underhåll): rensar besökarnas lagring automatiskt
│   │                          MAX 1 gång/7 dagar, i requestIdleCallback (aldrig
│   │                          i vägen). 1) Per-recept-nycklar (kock-/recept-/
│   │                          mk-bock:/mk-smak:/mk-kalla:/mk-port:/mk-rport:/
│   │                          mk-rbland:) vars fil INTE längre finns (fillistan
│   │                          ur GitHub-API:t recept/+ratter/) tas bort.
│   │                          2) Översättningscacher >300 kB halveras.
│   │                          3) Okända mk-nycklar (döda funktioner) städas.
│   │                          SKYDD: VITLISTA (lang/token/tema/logg m.fl. röres
│   │                          ALDRIG), API-fel → ingen städning alls (hellre
│   │                          ostädat än fel-raderat), allt loggas i Svarta
│   │                          lådan. Nya per-fil-prefix? Lägg till i FILPREFIX!
│   ├── print.js            🖨️-knappen (skapas automatiskt)
│   ├── app.js              PWA-registrering + 📤 delningsknapp + FAB-meny.
│   │                          📱 PWA-KNAPP PÅ STARTSIDAN (#pwaInstallBtn i
│   │                          hero:n): äkta install-prompt där webbläsaren
│   │                          stödjer det; annars egen instruktionsdialog
│   │                          (iOS: Dela→Lägg till på hemskärmen / övriga:
│   │                          menyn ⋮ → Installera app). Döljs i app-läge.
│   │                          isSubPage-buggen fixad (var odefinierad →
│   │                          stoppade Fortsätt laga + install-bannern).
│   ├── recept.js           👨‍🍳 Kockläge (steg-för-steg helskärm, Wake Lock)
│   │                          🔍 STEGZOOM: A+/A− upp till 300 % – JÄTTESTOR
│   │                          text läsbar från andra sidan köket (zoomen
│   │                          sparas, toppen klipps aldrig, % i tooltip)
│   │                          🐛 FIXAT "kockläge funkar inte": 1) recept med
│   │                          TOM <ol> (skapade via nytt-recept.html) fick
│   │                          inget kockläge alls → stegen byggs nu av
│   │                          .machine-step-rutorna som reserv; 2) confirm()
│   │                          för "fortsätt där du var?" (Brave blockerar →
│   │                          dött läge) ersatt med banner i overlayn
│   │                          (#cmResume: Fortsätt där / Från början).
│   │                          📱 SKÄRMANPASSAT: padding/knappar/textrader i
│   │                          clamp() efter skärmbredd + env(safe-area-inset)
│   │                          för iPhone-hak/hemlinje; nav-knappar min 56 px.
│   ├── energi.js           ⚡ Energikostnadstabell (läser central data)
│   ├── sprak.js            🌐 SPRÅKMODUL v4: dropdown på alla sidor, översätter ALLT.
│   │                          v4 – INGET SVENSKT BLIR KVAR (användarens regel:
│   │                          "väljer man DE ska inget SVE finnas"):
│   │                          · MutationObserver bevakar nu även characterData
│   │                            + attribut (placeholder/title/alt/aria-label) →
│   │                            moduler som SKRIVER OM befintliga noder (kalkyl,
│   │                            timers, portionspanel...) fångas och översätts
│   │                            direkt – tidigare blev sådana texter kvar på
│   │                            svenska tills omladdning
│   │                          · Loop-skydd: egna skrivningar markeras (skrivna-
│   │                            set för noder, __satt_-markörer för attribut) så
│   │                            observern aldrig re-översätter översättningar
│   │                          · Språkroboten v4 skördar 35% fler texter (1857):
│   │                            även ratter/-sidor, matratter.json, ingrediens-
│   │                            grupper/smaker OCH JS-modulernas UI-strängar
│   │                            (dynamiska knappar/dialoger: "Kockläge", "Din
│   │                            portion"...) → ordboken träffar direkt utan gtx.
│   │                          · sprak-robot.yml triggas nu även av assets/**.js,
│   │                            ratter/ och matratter.json.
│   │                          v3-FÖRBÄTTRINGAR (bättre översättning vid språkbyte):
│   │                          · gtx-buntar separeras med ⁂-token (inte bara \n) →
│   │                            texter med egna radbrytningar splittrar aldrig
│   │                            bunten ("halva sidan oöversatt"-buggen borta)
│   │                          · trasig bunt delas i två och provas igen automatiskt
│   │                          · attribut (placeholder/title/alt/aria-label) och
│   │                            SIDTITELN auto-översätts nu också (förr endast
│   │                            ordboken) och ÅTERSTÄLLS korrekt vid byte till sv
│   │                          · sena gtx-svar efter nytt språkbyte ignoreras
│   │                            (pumpLang-vakt) – aldrig blandade språk
│   │                          · maxlängd höjd 450→1200 tecken (långa steg översätts)
│   │                          · ordböcker: en 788 / de 808 fraser (nya moduler
│   │                            skala/etikett/enheter/tydlig/affiliate handöversatta)
│   │                          🤖 SPRÅKROBOTEN (sprak-robot.py + .yml) förgenererar
│   │                            ALLT → språkbyte är OMEDELBART (ren ordboks-
│   │                            uppslagning, gtx behövs bara för splitternytt
│   │                            innehåll tills nästa natt-körning).
│   ├── redigera.js         ✏️ REDIGERING v2: ändra text direkt på sidan.
│   │                          🔧 LÄGG TILL MASKIN I EFTERHAND: "+ Lägg till
│   │                          maskin"-knapp i Gör så här-kortet → dialog med
│   │                          maskin + program ur databasen + moment-text →
│   │                          ny maskinsteg-ruta läggs in OCH recept:maskiner-
│   │                          metan uppdateras (| -separerad).
│   │                          🧩 MASKIN PER DEL (användarens regel): dialogen
│   │                          har 📍 Placering-väljare – "Överst" eller "Före
│   │                          steg N" (stegen listas med text). Väljs ett steg
│   │                          DELAS <ol>-listan där och maskinrutan hamnar
│   │                          mellan delarna (andra listan får start=N+1 så
│   │                          numreringen fortsätter). Kockläget ser alla steg
│   │                          oförändrat (.card ol li). Perfekt för fler-
│   │                          maskinsrecept: blender vid steg 1, riskokare
│   │                          vid steg 4. Metan uppdateras som vanligt så
│   │                          maskinkort/kopplingar hittar receptet. FLERA
│   │                          maskiner kan läggas till efter varandra; ✕ tar
│   │                          bort maskinrutor. Hårt-klick-regel på dialogen.
│   │                          🗂️ KATEGORI-VÄLJARE i redigeringsbalken: dropdown
│   │                          med sajtens kategorier (+ "🤖 Auto" = gissning som
│   │                          förut). Valet skrivs som <meta name="recept:kategori">
│   │                          och följer med i sparad fil; recept.html låter
│   │                          manuell kategori VINNA över ordliste-gissningen.
│   │                          🫙 "ÄVEN INGREDIENS"-KRYSS i balken: skrivs som
│   │                          <meta name="recept:ingrediens" content="ja">. Vid
│   │                          varje 💾 Spara uppdateras då ingrediensdatabasen
│   │                          automatiskt ur live-kalkylen (per 100 g, via
│   │                          kalkylens API __MK_RECEPT_TILL_ING – matchar på id
│   │                          ELLER käll-recept så namnbyten inte ger dubbletter).
│   │                          ✍️ AUTOCOMPLETE UR DATABASEN v2 (HÄNDELSEDELEGERING
│   │                          på document – tål att tabellen byggs om av andra
│   │                          moduler när som helst; triggas på focusin+click+
│   │                          input, endast kolumn 0 i ingredienstabellen): när
│   │                          namncellen redigeras (befintlig eller ny rad)
│   │                          visas en dropdown med databasens ingredienser
│   │                          som filtreras medan man skriver ("Re" → allt som
│   │                          BÖRJAR på Re överst, sedan innehåller-träffar,
│   │                          max 12). Fritext funkar alltid – listan är bara
│   │                          hjälp. Piltangenter+Enter väljer, Esc stänger,
│   │                          klick fyller i namnet + triggar kalkylomräkning.
│   │                          DUBBELKLICK på ingrediensrad → mängd-meny
│   │                          (−/+ steg, fritt värde, 🗑️ ta bort).
│   │                          🧹 TEXTSTÄDNING VID BORTTAGEN INGREDIENS
│   │                          (användarens regel): tas en ingrediens bort
│   │                          (🗑️-menyn ELLER ✕-knappen) städas den även ur
│   │                          "Gör så här"-stegen, tips/varningar och recept:
│   │                          beskrivning-metan, och meningen skrivs om
│   │                          LOGISKT (textCleanup): "Tillsätt vetemjöl,
│   │                          majsmjöl och proteinpulver" → "Tillsätt vetemjöl
│   │                          och proteinpulver"; "vatten + yoghurt" →
│   │                          "vatten"; tappat "och" i uppräkning lagas
│   │                          (", X" → " och X"). Ordmatchning per ordSTART
│   │                          med böjningssuffix (majsmjölet ✓) men ALDRIG
│   │                          inuti ord (vetemjöl smittas inte); märken i
│   │                          parentes/procent/småord filtreras ur tabell-
│   │                          namnet (ordKandidater). SÄKERT (uppräkning,
│   │                          ordet helt borta efter omskrivning) → städas
│   │                          direkt och visas i 🧹-panel #mk-txt med
│   │                          före/efter + ↩️ Ångra per rad. OSÄKERT (hela
│   │                          raden handlar om ingrediensen: "Pudra majsmjöl
│   │                          på bordet") → ❓-fråga i panelen: 🗑️ Ta bort
│   │                          raden / Behåll – ALDRIG tyst radering av hela
│   │                          steg. Jobbar per TEXTNOD så <b>-taggar
│   │                          överlever; ingredienstabellen och egna
│   │                          injektioner (.no-print, #mk-*) rörs aldrig;
│   │                          #mk-txt är med i buildCleanHtml-städlistan.
│   │                          🧹 EFTERSTÄDNING VID REDIGERINGSSTART
│   │                          (skannaForaldralosa, körs 600 ms efter
│   │                          startEdit, EN gång per pass): hittar
│   │                          FÖRÄLDRALÖSA ingrediensord – nämns i stegen
│   │                          men ingrediensen finns inte i tabellen
│   │                          (borttagen INNAN textstädningen fanns eller
│   │                          redigerad utanför sajten). Ordlista ur
│   │                          ingrediensDATABASEN (namn+alias via
│   │                          loadIngDb) så bara riktiga ingrediensord
│   │                          flaggas; ord <4 tecken skippas; sammansatt-
│   │                          skydd åt BÅDA hållen ("jäst" flaggas inte
│   │                          när tabellen har Torrjäst, "mjölk" inte vid
│   │                          havremjölk). Träffar → samma 🧹-panel
│   │                          (textCleanup tar nu valfri kandidatlista som
│   │                          andra argument). Fångade pizzadeg-fallet:
│   │                          majsmjöl borttaget live med GAMLA redigera.js
│   │                          → låg kvar i "Tillsätt vetemjöl, majsmjöl och
│   │                          proteinpulver" tills skannern städar.
│   │                          ➕ TEXT-TILLÄGG VID NY INGREDIENS (användarens
│   │                          regel, spegeln av 🧹): läggs en NY rad till via
│   │                          "+ Lägg till ingrediens" (raden märks
│   │                          data-mk-ny) skrivs ingrediensen även in i "Gör
│   │                          så här" när namnet är klart (dropdown-val
│   │                          pickSok ELLER focusout, nyRadKlar körs EN gång
│   │                          och bara på nya rader – befintliga rader rörs
│   │                          aldrig). Bästa steget väljs på poäng: flest
│   │                          ANDRA tabellingredienser omnämnda + verbbonus
│   │                          (tillsätt/blanda/häll...). Insättning LOGISKT
│   │                          efter första ingrediens-ankaret: uppräkning →
│   │                          ", rågmjöl" ("vetemjöl, rågmjöl, majsmjöl och
│   │                          proteinpulver"), ensam → " och X". Redan
│   │                          omnämnd (inkl suffixmatch: "Torrjäst" räknas
│   │                          omnämnd när steget säger "jäst") → inget görs.
│   │                          Panel #mk-txt visar före/efter med ↩️ Ångra
│   │                          och 🔁 flytta till annat steg (dropdown).
│   │                          OSÄKERT (inget steg med ankare) → ❓-fråga:
│   │                          välj steg / ➕ Eget steg ("Tillsätt X.") /
│   │                          Hoppa över. data-mk-ny städas i buildCleanHtml.
│   │                          MINSKAS en mängd → ⚖️ kompensationsförslag:
│   │                          öka annan ingrediens (samma enhet) med mellan-
│   │                          skillnaden så totalvikten behålls (välj i lista).
│   │                          Redigeringen avslutas INTE förrän 💾 Spara på
│   │                          sajten lyckats (via spara.js, lösenordsskyddad) –
│   │                          avsluta med osparat kräver bekräftelse ("släng
│   │                          ändringarna"), beforeunload varnar. ⬇️ = reserv-
│   │                          nedladdning. Sparad fil städas från alla moduler.
│   │                          🗑️ TA BORT RECEPTET: röd knapp i redigeringsbalken
│   │                          raderar filen från GitHub (spara.js remove(),
│   │                          lösenordsskyddad) + städar energi.json. DUBBEL
│   │                          bekräftelse: dialog + skriv "TA BORT".
│   ├── betyg.js            ⭐ GLOBALT BETYG: alla besökare kan rösta 1–5 stjärnor,
│   │                          alla ser samma genomsnitt (gratis räknar-API Abacus,
│   │                          abacus.jasoncameron.dev – ingen server behövs).
│   │                          En röst per webbläsare. Visas på receptsidan,
│   │                          i provenienshuvudet och på receptkorten.
│   ├── maskinmatch.js      🔧 MASKINANPASSNING: matchar automatiskt ALLA maskiner
│   │                          i json/maskiner/ mot receptet (programmens nyckelord
│   │                          vs taggar/titel/rubriker) och visar "Fler av dina
│   │                          maskiner som klarar receptet" med program + tid.
│   │                          🧪 TESTAD-MED-VILKEN (användarens regel): finns
│   │                          FLERA maskiner av samma typ (2 riskokare: Midea +
│   │                          Yum Asia) märks receptets maskinsteg "🧪 Testad
│   │                          med denna" (tooltip listar typ-syskonen) och
│   │                          förslag av samma typ i matchrutan får varningen
│   │                          "⚠️ Ej testad med denna – tider/program kan
│   │                          behöva justeras". Typgrupp = första ledet i
│   │                          maskinens "typ"-fält. Badgen är skärm-endast
│   │                          (städas ur sparad HTML: .mk-testad).
│   │                          ✅ TESTAD & LYCKAD I BÅDA (admin, lösenord):
│   │                          knappen "✅ Jag har testat – markera" på otestade
│   │                          typ-syskon öppnar dialog (unlock FÖRST, program/
│   │                          tid förifyllt) → sparar metaraden
│   │                          <meta name="recept:testad" content="maskin-id:
│   │                          Program, tid | ..."> i receptfilen via __MK_SPARA
│   │                          (efter recept:maskiner-raden). Förslaget blir då
│   │                          GRÖNT "✅ Testad & lyckad" med den VERIFIERADE
│   │                          tiden (grön radbakgrund) för ALLA besökare –
│   │                          ⚠️-varningen försvinner. Flera maskiner möjliga
│   │                          (|-separerade). mentioned() exkluderar egna
│   │                          injicerade element (badge-smitta-buggen fixad).
│   │                          Dialogen städas ur sparad HTML (#mk-testad-bg).
│   │                          Ny maskin = alla recept anpassas direkt, utan att
│   │                          en enda receptfil ändras.
│   ├── kokbok.js           📕 KOKBOKSUTSKRIFT (på recept.html): knappen "📕 Kokbok"
│   │                          → bocka för valfria recept → 🖨️ skriver ut omslag +
│   │                          innehållsförteckning + alla valda recept i A4,
│   │                          ett recept per sida. Byggs i webbläsaren (iframe).
│   ├── spara.js            💾 DIREKT-SPARA (nytt-recept.html & generator.html):
│   │                          sparar recept direkt i recept-mappen via GitHub API,
│   │                          ingen nedladdning/uppladdning. save(path, content,
│   │                          msg, redanB64) – redanB64=true skickar innehållet
│   │                          som färdig base64 (BINÄRT: bilder m.m., används av
│   │                          verifierad.js 📷-uppladdning). 🔒 SIDLÅS: nytt-recept
│   │                          .html och maskin-import.html kräver lösenord DIREKT
│   │                          vid öppning (helskärms-låsskärm med 🔓-knapp, döljer
│   │                          innehållet tills upplåst; upplåst session = ingen
│   │                          skärm; API __MK_SPARA.unlock). Lösenordsdialogen
│   │                          har z-index 450 (ÖVER låsskärmens 400 – annars
│   │                          syns inte fältet!). 🚪 3 FEL LÖSENORD = skickas
│   │                          till startsidan (räknare "försök 1 av 3", fältet
│   │                          låses, omdirigering efter 1,4 s). 🔒 LÖSENORDSSKYDDAT:
│   │                          samma lösenord som json/las.json (ETT ställe att
│   │                          byta på – GitHub), upplåsning delas med ✏️-redigering
│   │                          (sessionStorage mk-edit-unlocked). Kräver dessutom
│   │                          personlig GitHub-nyckel (fine-grained token,
│   │                          Contents R/W på Tokke2/recept) – engångsinställning,
│   │                          lagras endast i webbläsarens localStorage.
│   │                          Generatorn uppdaterar även json/energi.json
│   │                          automatiskt vid spar, och har "➕ Ny ingrediens"
│   │                          som skriver direkt till json/ingredienser.json.
│   ├── ingrediens.js       🧾 INGREDIENSTABELL v4 + SJÄLVLÄKNING v2 (alla receptsidor):
│   │                          ✅ AVBOCKNINGSBARA RADER (roadmap 4): klicka på en
│   │                          ingrediensrad → ⬜→✅, genomstruken + tonad. Sparas
│   │                          per recept (localStorage mk-bock:<fil>), överlever
│   │                          omladdning. "↩️ Nollställ avbockade (N)"-knapp under
│   │                          tabellen. Avstängt i ✏️-läget, aldrig i utskrift
│   │                          eller sparad fil (redigera.js städar klassen).
│   │                          🔧 AUTO-LAGNING v2: recept där steg/rubriker/varningar/
│   │                          näringstext fastnat inuti ingredienstabellen lagas
│   │                          AUTOMATISKT i webbläsaren. VERSAL-rubriker (🥣 FÖRBERED,
│   │                          ⚙️ RISKOKARE, 🍕 ANVÄNDNING, ❄️ FÖRVARING...) upptäcks
│   │                          GENERISKT (≥80 % versaler, <60 tecken) och delar upp
│   │                          tabellen i sektioner: rader utan riktiga mängder = STEG
│   │                          → flyttas till "Gör så här" med rubriken som h3-mellan-
│   │                          rubrik (ordning bevaras); rader MED mängder = ingrediens-
│   │                          grupp → blir äkta colspan-grupprubrik i tabellen;
│   │                          ⚠️ VIKTIGT/VARNING → .warn-ruta; 📊 NÄRING → näringskort;
│   │                          TIPS → 💡-ruta. Även LÖSA stegrader bland ingredienserna
│   │                          ("1. Gör...", stegnummer i måttkolumnen, lång text utan
│   │                          mått) flyttas. KÄLLFILEN RÖRES ALDRIG.
│   │                          TRE TYDLIGA KOLUMNER: Ingrediens | Mått (grönt,
│   │                          högerställt) | Pris (diskret, längst till höger).
│   │                          En rad per ingrediens med tydlig radlinje.
│   │                          💧 BLÖTA INGREDIENSER SORTERAS ÖVERST (bakmaskins-
│   │                          ordning), grupprubriker bevaras, Totalt sist.
│   │                          Gäller ALLA recept – gamla som nya – eftersom
│   │                          designen läggs på i webbläsaren; källfilerna
│   │                          behåller sina vanliga tabeller och röres aldrig.
│   │                          Kockläget läser data-namn/data-mangd per rad.
│   ├── kalkyl.js           🧮 LIVE-KALKYL (alla receptsidor): räknar pris & näring
│   │                          + 🫙 RECEPT→INGREDIENS: knappen "Spara receptet som
│   │                          INGREDIENS" (sylt/saft/buljong...) räknar om till
│   │                          per-100g (pris kr/kg + macros ur kalkylen) och
│   │                          sparar i ingredienser.json (lösenordsskyddat, fält
│   │                          "recept" pekar på källreceptet). Kan sen användas
│   │                          i andra recept & generatorn. Ingredienssidan visar
│   │                          🫙 Eget recept-märke med länk till receptet.
│   │                          AUTOMATISKT ur json/ingredienser.json – matchar
│   │                          receptets ingredienser mot databasen, konverterar
│   │                          mängder till gram (g/kg/dl/msk/tsk/st...), visar
│   │                          kortet "Live-kalkyl" (totalt + per portion, portioner
│   │                          läses ur beskrivningen) och skriver FÄRSKA gröna
│   │                          priser i tabellen. Ingredienser som saknas listas
│   │                          med länk till ingredienser.html. → Uppdaterat pris i
│   │                          databasen slår igenom på ALLA recept direkt.
│   │                          RAD-MARKERING i ingredienstabellen: 🟢 GRÖN rad =
│   │                          finns i databasen (🛒-länk till produkten om
│   │                          butikslänk kopplad, annars ✓), 🔴 RÖD rad =
│   │                          "✖ saknas i databasen" (klickbar → ingredienser.html;
│   │                          receptet fungerar ändå – raden räknas bara inte med).
│   │                          🔽 FLERA TRÄFFAR = UNDERRADER: om flera databas-
│   │                          poster matchar lika bra (t.ex. "Hemmagjord sylt
│   │                          30 g" → både svartvinbärs- och fläder-sylt) blir
│   │                          receptraden en TITELRAD och varje variant visas
│   │                          som egen underrad direkt under, med kcal & pris
│   │                          för RECEPTETS MÄNGD: "↳ Hemmagjord sylt
│   │                          svartvinbär 63 kcal för 30 g · 0,90 kr" (om
│   │                          mängden inte kan tolkas visas /100 g). Ingen
│   │                          väljare – alla varianter syns alltid (klass
│   │                          .mk-ingsub, skapas/städas av kalkylen, aldrig
│   │                          redigerbara, följer aldrig med i sparad fil).
│   │                          Kalkylen räknar med GENOMSNITTET av varianterna.
│   │                          🔄 LIVE-OMRÄKNING VID REDIGERING: ändras mängder/
│   │                          ingredienser i ✏️-läget (text, mängd-menyn, rad
│   │                          bort, kompensation) räknas pris & näring om direkt
│   │                          (__MK_KALKYL_REFRESH, 400 ms debounce; läser
│   │                          LEVANDE celltext, inte gamla attribut).
│   │                          🍫 SMAKVAL I REALTID: ingrediens med "varianter"-
│   │                          fält (whey-smaker m.m. ur importens smaktabeller)
│   │                          får lila dropdown på raden: "🍫 Snitt av 32
│   │                          smaker / Banana · 396 kcal / ...". Vald smak →
│   │                          kalkylen räknas om DIREKT med smakens egen näring
│   │                          (pris oförändrat – samma för alla smaker). Valet
│   │                          sparas per recept (localStorage mk-smak:<fil>),
│   │                          förvalt vid återbesök; tomt val = snittet.
│   │                          Väljaren städas ur sparad HTML (mk-smakval).
│   │                          🌱/🛒 KÄLLVAL (hemodlad eller köpt): finns
│   │                          ingrediensen BÅDE som egenodlad (0 kr) och köpt
│   │                          vara → grön dropdown på raden FRÅGAR vilken som
│   │                          används: "❓ Hemodlad eller köpt? / 🌱 Äpplen
│   │                          hemodlad · 0 kr / 🛒 Äpplen · 30 kr/kg". Vald
│   │                          källa → kalkylen räknas om direkt (hemodlad =
│   │                          0 kr, näring kvar). Före valet räknas försiktigt
│   │                          med KÖPT (grön puls-ring visar att frågan väntar).
│   │                          Sparas per recept (mk-kalla:<fil>), förvalt vid
│   │                          återbesök. medMotpart() parar exakt-träffar med
│   │                          sin hemodlad/köpt-motpart så frågan alltid visas.
│   │                          Städas ur sparad HTML (mk-kallval).
│   │                          🔗 MATCHA SAKNAD INGREDIENS – TVÅ SÄTT på röda
│   │                          rader: 1) 🔽 SNABB-DROPDOWN direkt på raden
│   │                          ("Matcha mot..." – alla varor A–Ö, välj → klart)
│   │                          2) "✖ saknas"-knappen öppnar sökbar dialog.
│   │                          Båda sparar receptets formulering som ALIAS
│   │                          (fält "alias":[] i ingredienser.json, via
│   │                          __MK_SPARA) → alla recept med samma text matchar
│   │                          sedan automatiskt (alias = 100 poäng i matchAll),
│   │                          kalkylen räknas om direkt. Blå 🔗 N alias-pill
│   │                          på ingredienssidan.
│   │                          📦 GRUPPER (skifta sort/smak i recept): poster med
│   │                          samma "grupp"-fält (t.ex. "hemgjord sylt" på 10
│   │                          syltposter, eller proteinpulver) får gul dropdown
│   │                          på receptraden → byt medlem = Hela postens pris &
│   │                          näring byts, kalkylen räknas om direkt. Sparas per
│   │                          recept (g:-prefix i mk-kalla:<fil>). Gruppfält i
│   │                          ✏️-dialogen på ingredienser.html (datalist med
│   │                          befintliga grupper), 📦-pill i listan.
│   │                          🫙 HEMGJORDA (fält "recept"): tydligt GUL rad +
│   │                          gul 🫙 Eget recept-knapp på ingredienssidan, INGEN
│   │                          "länk saknas"-knapp (pris & näring kommer ur
│   │                          käll-receptet via recept→ingrediens-flödet).
│   │                          🔀 BYT SMAK (förslag 169): smaksättar-rader (bär/
│   │                          frukt/vanilj/choklad/sylt/saft...) får 🔀-knapp
│   │                          som slumpar ANNAN smaksättare ur databasen –
│   │                          namn+data-namn byts på skärmen, kalkylen räknas
│   │                          om. Aldrig i sparad fil (städas överallt).
│   │                          📊 AUTO-KORRIGERAD NÄRING (användarens regel):
│   │                          ALLA recepts egna näringstal RÄKNAS ALLTID OM mot
│   │                          databasen (extra kontroll) – vid ≥80 % ingrediens-
│   │                          matchning byts kcal/protein/kolhydrat/fett/fiber/
│   │                          pris i 📊-kortet mot live-värden (gröna, original
│   │                          i tooltip) + notis "N värden auto-korrigerade".
│   │                          <80 % matchat → siffrorna lämnas orörda men kortet
│   │                          får RÖD VARNING "kunde inte kontrollräknas: bara
│   │                          N av M i databasen" + länk att lägga till saknade.
│   │                          🍽️ PORTIONER BÅDE TOTALT & PER PORTION: antal ur
│   │                          beskrivningen ("6 portioner") ELLER PORTIONSVIKT
│   │                          ur sidtexten ("500 g smet i varje", "Per bägare
│   │                          (500 g)", "portionsstorlek 500 g") → kalkylen får
│   │                          kolumnen "Per portion (500 g)" = totalen×500/totG
│   │                          + notis "~N portioner". Viktbaserat är oberoende
│   │                          av omatchade ingredienser. portionsInfo() delas
│   │                          som __MK_KALKYL_PORT → tydlig.js-pillren visar
│   │                          samma kr/kcal per portion. Per portion-tabeller
│   │                          i 📊-kortet delas antal- eller viktbaserat.
│   │                          Källfilen röres aldrig.
│   │                          💧 HYDRERING (bagerimått): visas när receptet har
│   │                          ≥50 g mjöl/gryn – vätska÷mjöl i % med beskrivning
│   │                          (<50 fast, 50-60 normal, 60-70 pizza, 70-85
│   │                          ciabatta, >85 smet). Yoghurt/kvarg räknas som 80%
│   │                          vatten, ägg 75%, olja/honung 20%. "saftig" ≠ saft.
│   │                          ♻️ UTBYTES-NOTIS under ingredienserna på ALLA recept:
│   │                          "går att byta mot liknande vara från annan affär,
│   │                          men närings-/prisberäkningen kan skilja sig".
│   │                          Utskrift: markeringarna neutraliseras (print.css).
│   ├── emoji.js            🏷️ SMART EMOJI-VAL (alla sidor): central prioriterad
│   │                          ordlista väljer LOGISK ikon efter innehållet –
│   │                          sylt→🫙, saft→🧃, kötträtt→🥩, gryta→🍲, paj→🥧...
│   │                          Substrängsmatchning (jordgubbsSYLT→burk), specifikt
│   │                          vinner över generellt. Generisk/ologisk emoji byts
│   │                          på receptsidor & receptkorten – ENDAST på skärmen,
│   │                          källfilen röres aldrig. Rätt emoji lämnas orörd.
│   │                          Samma lista i nytt-recept.html & konvertera.py.
│   ├── seo.js              🔍 SEO (alla sidor, centralt): canonical, meta
│   │                          description (ur recept:beskrivning), Open Graph +
│   │                          Twitter-kort (delningsbilder), JSON-LD Recipe-
│   │                          schema (ingredienser+steg+kcal/portion+betyg ur
│   │                          Abacus) → RIKA RESULTAT i Google. WebSite-schema
│   │                          på startsidan. robots.txt + sitemap.xml – sitemapen
│   │                          AUTOGENERERAS av sjalvlakning.py steg6_sitemap
│   │                          (ENDA ägaren: rotsidor + recept/ + ratter/,
│   │                          pensionerade sidor utesluts, lastmod ur git,
│   │                          skrivs endast vid ändring; konvertera.py:s
│   │                          gamla sitemap-del är urkopplad).
│   ├── hero.js             🖼️ AUTO-HERO-BILDER: recept utan foto får en snygg
│   │                          GENERERAD SVG-bild (kategorifärgad gradient +
│   │                          cirkelmönster + stor emoji + receptnamn på 1–2
│   │                          rader) istället för tom yta. Finns riktig bild
│   │                          i images/recept/ används den ALLTID – SVG:n är
│   │                          bara reserv. Kategorifärg via samma prioriterade
│   │                          ordlista som recept.html (sylt=bärröd, glass=
│   │                          isblå, varmrätt=grön, bakning=rosa/orange...).
│   │                          API: window.__MK_HERO_SVG(namn, emoji, w, h) →
│   │                          data-URI; används även av recept.html-korten
│   │                          (onerror på kortbilden). Klass mk-hero-auto –
│   │                          redigera.js återställer riktiga bildsökvägen i
│   │                          sparad HTML. Källfilen röres aldrig.
│   ├── tydlig.js           ✨ TYDLIGARE RECEPT (receptsidor), två delar:
│   │                          1) 📊 SNABB-ÖVERSIKT: faktarad med pastiller direkt
│   │                          under rubrikbandet – ⏱️ maskintid (summeras ur
│   │                          json/energi.json), 🍽️ portioner (ur beskrivningen),
│   │                          🥣 antal steg, 🔧 antal maskiner, 💰 kr/portion +
│   │                          🔥 kcal/portion (fylls i när live-kalkylen räknat
│   │                          klart, __MK_KALKYL_TOT). Pastiller utan data döljs.
│   │                          2) 🔥 STEG-MARKERING: tider (⏱ 90 min, 45–90
│   │                          minuter – orange), temperaturer (🌡 200 °C – röd)
│   │                          och mängder (30 g/2 dl – grön fetstil) markeras
│   │                          AUTOMATISKT i stegtexterna. Spans mk-stegmark med
│   │                          data-orig; API __MK_STEGMARK_RESET/_KOR – redigera-
│   │                          läget packar upp före redigering, kör om efteråt,
│   │                          och sparad HTML städas alltid till ren text.
│   │                          Prioritetsordning temp→tid→mängd = ingen dubbel-
│   │                          markering. Källfiler röres aldrig.
│   │                          3) ⛓️ KEDJE-VY (förslag 166): recept med ≥2 maskin-
│   │                          steg i recept:maskiner-metan får visuell tidslinje
│   │                          under översikten: [🌀 Blenda basen]→[🧊 Frys 24 h]→
│   │                          [🍦 Spinn] med smarta ikoner (frys=🧊, jäs=⏳,
│   │                          blenda=🌀, grädda=🔥...). Skärm, ej utskrift.
│   ├── maskinlank.js       🔗 MASKINLÄNKAR (receptsidor): ALLA maskinnamn i
│   │                          recepten (rubrikchips, maskinsteg-rutor, löptext)
│   │                          blir automatiskt länkar till maskindatabas.html
│   │                          #maskin-id – likadan stil överallt (prickad under-
│   │                          strykning, ärver färg, osynlig vid utskrift).
│   │                          Matchar fullnamn/varumärke+modell/modell/varumärke
│   │                          (längsta först, ordgränser). maskindatabas.html
│   │                          öppnar rätt kort via #hash (oppnaFranHash) och
│   │                          visar "📖 Recept för den här maskinen" med länkar
│   │                          till alla recept som använder maskinen
│   │                          (byggMaskinRecept – matchar recept:maskiner-meta
│   │                          + innehåll). API __MK_MASKLANK_RESET/_KOR;
│   │                          redigera.js packar upp länkarna före redigering
│   │                          och i sparad HTML. Källfiler röres aldrig.
│   ├── verifierad.js       🌟 VERIFIERAT RECEPT (receptsidor): admin markerar
│   │                          receptet som "bakat & godkänt" via 🌟-knappen i
│   │                          verktygsraden – LÖSENORDSSKYDDAT (__MK_SPARA.unlock,
│   │                          samma lås som ✏️; utan lösenord visas ingen dialog).
│   │                          Skriver <meta name="recept:verifierad"
│   │                          content="ÅÅÅÅ-MM-DD"> i receptfilen via GitHub-API:t
│   │                          (rå textdiff efter recept:namn – rör inget annat).
│   │                          Finns metan → GRÖN STJÄRNA (★, #27ae60) uppe i
│   │                          receptheaderns högra hörn för ALLA besökare, med
│   │                          datum-tooltip + klickruta (mobil). recept.html visar
│   │                          samma stjärna uppe till VÄNSTER på receptkortet
│   │                          (höger hörn = betygsstjärnorna). Omklick på 🌟 →
│   │                          "Bakat igen idag" (nytt datum) eller "Ta bort".
│   │                          Egen dialog (aldrig confirm), hårt-klick-regeln.
│   │                          Badge/dialog städas ur sparad HTML (buildCleanHtml).
│   │                          📷 BILD PÅ BAKET i samma dialog (frivillig): fotot
│   │                          förminskas i webbläsaren (canvas max 1200 px,
│   │                          JPEG 80 %) och sparas som images/recept/<fil>.jpg
│   │                          via __MK_SPARA.save(..., redanB64=true) – exakt
│   │                          sökvägen .hero-img + receptkorten redan läser.
│   │                          "📷 Spara bara bilden" = receptfilen röres EJ.
│   │                          Hero-bilden byts lokalt direkt (Pages ~1 min).
│   ├── ratt.js             🍽️ MATRÄTTS-RENDERAREN: ritar ratter/-sidorna ur
│   │                          deras metadata (delar-tabell med kcal/protein/
│   │                          kolh/fett/pris per del + Hela tallriken-total).
│   │                          Recept-delar räknas per gram ur receptets
│   │                          ingredienstabell mot databasen (alias-medveten),
│   │                          ing:-delar direkt ur databasen. Laddas av site.js
│   │                          när meta ratt:namn finns (__MK_IS_RATT).
│   │                          🍽️ PORTIONSPANEL "Din portion" (användarens
│   │                          regel: rätten byggs som STOR SATS): besökaren
│   │                          anger portionsstorlek i gram → kcal/protein/
│   │                          kolh/fett/pris per portion + "satsen räcker
│   │                          till X portioner". Omvänt: önskad kcal →
│   │                          gram räknas ut. Sparas per rätt (localStorage
│   │                          mk-rport:<fil>). RECEPT-CHATT.md DEL 2
│   │                          instruerar AI:n att bygga sats (3–6 port).
│   │                          🍱 UPPDELNING ("2 kg kyckling i crockpotten →
│   │                          dela upp"): fältet "dela satsen i N lådor" →
│   │                          VARJE LÅDAS INNEHÅLL per del ("400 g kyckling,
│   │                          200 g potatis, 100 g grädde"), total vikt,
│   │                          näring & pris per låda + vägnings-tips.
│   │                          Portionsfältet synkas till lådstorleken;
│   │                          manuell portionsändring rensar lådvyn.
│   │                          🥘 BLANDAT-VÄXEL (användarens regel: "blanda
│   │                          ihop allt och väg upp – enklare än väga varje
│   │                          del"): kryssruta → lådvyn visar BARA totalvikt
│   │                          att väga upp ("⚖️ Väg upp 450 g per låda");
│   │                          kcal märks ~ (genomsnitt av blandningen,
│   │                          brasklapp ±10 %). VALBART PER RÄTT: serverings-
│   │                          dropdown i byggaren (🍽️ Separata delar / 🥘
│   │                          Ihopblandad) → sparas i rättens data (blandad:
│   │                          true) + metan ratt:servering → FÖRVAL på sidan.
│   │                          Besökarens egen växling ('1'/'0' i mk-rbland:)
│   │                          vinner alltid över förvalet. Bakåtkompatibelt:
│   │                          rätter utan metan = separat.
│   │                          🔪 SKIVLÄGE: kött-delar (fläsk/kyckling/karré/
│   │                          filé/stek... via regex) får egen ruta "skivad?
│   │                          ange antal skivor" → g/skiva + kcal & protein
│   │                          per skiva + snabbräkning 2/3 skivor. Perfekt
│   │                          för uppskuret kött till mackor/lådor.
│   │                          Utseendeändring HÄR = alla rätter uppdateras.
│   ├── portion.js          🍽️ PORTIONSPANELEN (alla receptsidor, längst upp
│   │                          direkt under headern): fyra live-kontroller ur
│   │                          kalkylens data (__MK_KALKYL_TOT/_PORT):
│   │                          1) PORTIONSSTORLEK i gram → kcal/protein/kolh/
│   │                             fett/pris per portion räknas om direkt
│   │                          2) 👥 ANTAL PORTIONER (±) → INGREDIENSERNA
│   │                             skalas på skärmen (__MK_SKALA_APPLY ur
│   │                             skala.js) + hela satsen räknas om
│   │                          3) 🔥 ÖNSKAD KCAL/PORTION (omvänt): ange t.ex.
│   │                             300 kcal → portionsstorleken i gram räknas ut
│   │                          4) 🍞 BRÖD (namn/taggar matchar bröd/limpa/
│   │                             toast/fralla): skivtjocklek (cm) + limpans
│   │                             längd (cm, förval 30) → näring per skiva
│   │                             ("1,5 cm ≈ 40 g · 90 kcal · 20 skivor")
│   │                          Startvärden ur kalkylens portionsinfo; valen
│   │                          sparas per recept (mk-port:<fil>). Skärm-endast:
│   │                          no-print + städas ur sparad HTML (#mk-portion).
│   ├── hydrering.js        💧 HYDRERINGSVÄLJARE (användarens beställning, på
│   │                          DEGRECEPT): reglage 45–80% under ingrediens-
│   │                          tabellen – vattnet räknas om, inget annat ändras.
│   │                          Visas ENDAST om tabellen har mjöl + vatten OCH
│   │                          titel/taggar/text nämner deg/bröd/pizza/bulle/
│   │                          limpa/pita/toast (eller 💧 Hydrering-text finns).
│   │                          Torrbas = mjöl/stärkelse/gryn/whey/proteinpulver-
│   │                          rader; vätska viktas per vatteninnehåll (vatten
│   │                          100%, mjölk 87%, yoghurt/fil 80%, kvarg 78%, ägg
│   │                          76%). Nytt vatten = torrbas × mål% − övrig vätska
│   │                          (ENDAST Vatten-raden ändras). Originalhydrering
│   │                          räknas ur tabellen och visas; info-rad med ±g-
│   │                          diff + degkänsla (fast/lättkavlad/mjuk/lös).
│   │                          ↩️ Recept-knapp återställer. Per besökare:
│   │                          localStorage mk-hydr:<fil> (i städarens
│   │                          FILPREFIX), tas bort vid originalvärde. Kalkylen
│   │                          räknas om via __MK_KALKYL_REFRESH. Skärm-endast:
│   │                          no-print + städas ur sparad HTML (#mk-hydr i
│   │                          redigera.js-listan). Byggs 900 ms efter load
│   │                          (väntar in ingrediens.js mk-ing2-ombyggnad);
│   │                          funkar med BÅDA tabellformaten (.mg-pastill/
│   │                          klassisk kolumn 2).
│   ├── skala.js            ⚖️ SATS-SKALNING + SKÖRDE-KALKYLATOR (receptsidor):
│   │                          exponerar __MK_SKALA_APPLY(f) för portion.js.
│   │                          knapp i verktygsraden → dialog med tre sätt:
│   │                          1) snabbknappar ×½/×2/×3, 2) EGEN faktor (t.ex.
│   │                          1,7), 3) 🧮 SKÖRDE-LÄGE: välj huvudråvara + ange
│   │                          vad du har ("3,2 kg tomater") → hela receptet
│   │                          skalas proportionellt (3,2/2,0 = ×1,6). Skalar
│   │                          ingredienstabellen OCH mängder i stegtexten,
│   │                          inkl. spann (35–40 g → 56–64 g). Lila siffror +
│   │                          fast badge "⚖️ Satsen ×1,6" med Återställ-knapp.
│   │                          Spans mk-skala med data-orig → återställning är
│   │                          tecken-exakt; redigera.js städar sparad HTML.
│   │                          Kalkylen räknas om automatiskt. Hårt-klick-regel.
│   ├── etikett.js          🏷️ BURKETIKETTER v2 (receptsidor): knapp i verktygs-
│   │                          raden → dialog. 6 STORLEKAR: A4-ark (52×37, 70×50,
│   │                          XL 105×74 = 8/ark, klipplinjer) + ETIKETTSKRIVARE
│   │                          (Dymo 99014 101×54, Brother DK-11202 100×62,
│   │                          DK-11209 62×29 – rulle-läge: @page = etikettens
│   │                          exakta mått, margin 0, page-break per etikett →
│   │                          skrivaren matar en i taget; funkar även på laser
│   │                          via A4-lägena). Etiketten visar: emoji + namn +
│   │                          🍳 TILLAGAD: <datum> + 📅 BÄST FÖRE: <datum>
│   │                          (RÄKNAS UT AUTOMATISKT ur recepttypen via central
│   │                          HALLBARHET-ordlista: sylt +365 dgr kyl, saft +90,
│   │                          sås/soppa +180 frys, glass +90 frys, bröd +90
│   │                          frys, deg +3 kyl... – redigerbart i dialogen) +
│   │                          förvaringsanvisning + kcal/100 g & kr/kg ur
│   │                          kalkylen + QR till receptet. Reserv-timeout 4 s.
│   ├── enheter.js          🌡️ ENHETSVÄXLARE (receptsidor): knapp i verktygs-
│   │                          raden växlar °C→°F, dl→cups (avrundat till ¼),
│   │                          msk→tbsp, tsk→tsp i HELA receptet (header, kort,
│   │                          maskinsteg, varningar). Träffar lindas i
│   │                          <span class="mk-enh" data-orig="..."> → växling
│   │                          tillbaka ger EXAKT originaltexten. Valet sparas
│   │                          (localStorage mk-enheter) och återappliceras vid
│   │                          sidladdning. Kalkylen & no-print-ytor rörs ej.
│   │                          redigera.js packar upp spans i sparad HTML.
│   │                          Perfekt ihop med 🌐 engelska/tyska-läget.
│   │   ⬅️➡️ SIDOPILAR (receptnav.js): stora fasta pilar mitt på vänster-/
│   │       högerkanten av varje recept → föregående/nästa recept med
│   │       namn-tooltip. Visas på ALLA skärmar; mobil får smalare
│   │       halvgenomskinliga 44px-pilar. RECEPTBYTE ENDAST VIA KLICK –
│   │       receptsidor låses till upp/ner-scroll (touch-action:pan-y
│   │       pinch-zoom + overflow-x:hidden; nyp-zoom funkar fortfarande).
│   │       Kocklägets svepgester för STEGBYTE inne i overlayn är kvar.
│   │       Städas ur sparad HTML.
│   └── receptnav.js        🎯 FOKUSERAD RECEPTVY: på receptsidor visas ENDAST
│                              verktygsraden: ← Föregående · 👨‍🍳 Kockläge · Nästa →
│                              · 🖨️ Skriv ut · 📤 Dela · 🏠 Startsida. Allt annat
│                              flytande döljs – fullt fokus på receptet.
├── json/                   ALL DATA (aldrig data i HTML!)
│   ├── maskindatabas.json  Basdata: elpris_kr_per_kwh, recept-register, ai_instruktion
│   ├── energi.json         Energidata per recept: filnamn → [{maskin, min, moment}]
│   ├── affiliate.json      🛒 AMAZON-AFFILIATE (ASIN-arkitektur): fyll i
│   │                          "amazon_tag" (Associates Store ID från affiliate-
│   │                          program.amazon.se) → ALLA amazon.se-länkar taggas
│   │                          automatiskt (?tag=...), märks "(betald länk)" och
│   │                          Amazons obligatoriska text visas HÖGST UPP men
│   │                          ENDAST på maskindatabas.html (användarens val –
│   │                          där Amazon-knapparna finns; aldrig på recept/
│   │                          övriga sidor). Tomt = helt av.
│   │                          ARKITEKTUR: taggen finns ENDAST här (centralt) –
│   │                          ALDRIG i maskinfilerna. Maskinerna har "asin"
│   │                          (10 tecken, t.ex. B0CJVNGMFL) → maskindatabasen
│   │                          bygger ren länk amazon.se/dp/ASIN/ och lyfter
│   │                          "🛒 Köp på Amazon" ÖVERST (orange, rel="noopener
│   │                          sponsored") → affiliate.js taggar den i webb-
│   │                          läsaren. maskin-import.html känner igen alla
│   │                          Amazon-format (/dp/, /gp/product/, /Namn/dp/),
│   │                          extraherar ASIN, normaliserar URL:en och sparar
│   │                          "asin" i maskinfilen. Byt tag = ändra EN fil.
│   │                          Modulen: assets/affiliate.js.
│   │                          IFYLLT: amazon_tag = "tokke2-21" (Store ID) –
│   │                          affiliate-länkarna är AKTIVA live. OBS: Associate-
│   │                          ID:t är publikt synligt på GitHub Pages – det är
│   │                          OK (ingen hemlighet, till skillnad från API-nycklar).
│   │                          FRAMTID (ej byggt): Amazon Product Advertising API
│   │                          för auto-produktdata kräver liten backend
│   │                          (Cloudflare Workers e.d.) så API-nycklarna inte
│   │                          exponeras – byggs först när API-åtkomst beviljats
│   │                          (kräver 3 kvalificerade köp). SCRAPING av Amazon
│   │                          är FÖRBJUDET enligt deras policy – aldrig bygga.
│   ├── donation.json       💚 DONATIONER: swish_nummer (visas ALDRIG i klartext –
│   │                          💚-knappen visar QR-kod via Swish officiella API på
│   │                          dator, öppnar Swish-appen direkt på mobil) och
│   │                          kofi (användarnamn på ko-fi.com). Endast ifyllda
│   │                          visas. Båda tomma = ingen rad. (assets/site.js)
│   ├── ingredienser.json   Ingrediensdatabas: pris kr/kg + näring per 100 g
│   ├── ingrediens-lankar.txt 🛒 PRODUKTLÄNKAR (via ingredienser.html eller direkt),
│   │                          en per rad → roboten (ingrediens-import.py) hämtar
│   │                          pris + näring och uppdaterar ingredienser.json.
│   │                          Filen töms efteråt. Befintlig ingrediens UPPDATERAS.
│   │                          🌱 "EGENODLAD" efter länken på samma rad = egenodlad
│   │                            vara: näring hämtas från butiken men pris = 0 kr,
│   │                            noll_ok:true, egenodlad:true och namnet får
│   │                            tillägget "hemodlad" (eget id – butiksvarianten av
│   │                            samma vara kan finnas parallellt med sitt pris;
│   │                            matchningen blandar ALDRIG ihop egenodlad↔butik).
│   │                            Kryssrutan 🌱 i ingredienser.html sätter flaggan;
│   │                            månadsuppdateringen skickar med den → priset
│   │                            förblir 0 men näringen hålls färsk.
│   │                          · Willys/Hemköp: komplett (jämförpris + näring, API)
│   │                          · ICA (handlaprivatkund.ica.se): namn + ev. jämför-
│   │                            pris ur produktsidan; näring visas ej publikt och
│   │                            botskydd kan blockera → post skapas ändå (0-värden)
│   │                            med varning: fyll i på ingredienser.html.
│   ├── las.json            🔒 LÖSENORD för receptredigering & uppladdning. Byts
│   │                          ENDAST genom att redigera denna fil på GitHub.
│   │                          NU: "losenord" i KLARTEXT (användarens val – enkelt
│   │                          att byta). Valfritt senare: "losenord_hash" =
│   │                          SHA-256 (har företräde om ifylld, döljer lösenordet).
│   │                          las_redigering:false = av.
│   ├── maskiner/           EN .json-FIL PER MASKIN – läses in automatiskt (11 st)
│   ├── maskiner-index.json Maskinlista (byggs av Action, ren array)
│   └── sprak/              ÖVERSÄTTNINGAR: en.json, de.json... ("svensk text": "översatt")
├── recept/                 EN .html-FIL PER RECEPT – läses in automatiskt
└── images/                 Maskinbilder (maskin-id.jpg) + images/recept/ (receptbilder)
    ├── logo-mark.svg       🎨 LOGOTYPMÄRKET (gryta + kugghjul + blixt, färg):
    │                          favicon (injiceras centralt av site.js), toppmenyns
    │                          brand, startsidans hero & sidfot, PWA-ikonerna.
    │                          Hel logotyp m. ordbild+tagline: assets/logo.svg.
    │                          Svartvit variant inbakad i visitkort.svg.
    │                          Färger: gryta #c0392b, lock #e67e22, kugghjul
    │                          #2c3e50, blixt #f1c40f (sajtens :root-palett).
    ├── icon-192/512.png    PWA-ikoner – genererade ur logo-mark.svg
    ├── apple-touch-icon.png 🍎 iOS-hemskärmsikon 180×180 (Safari kräver PNG,
    │                          injiceras centralt av site.js på alla sidor)
    ├── favicon-32.png      🍎 PNG-favicon-reserv (Safari stödjer ej SVG-favicon)
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
- Valfria metataggar: `recept:kategori` (manuell kategori, vinner över gissning)
  och `recept:ingrediens` = "ja" (uppdaterar ingrediensdatabasen vid varje sparning)
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

🎨 CENTRAL DESIGNFIL: assets/design.css laddas av site.js på ALLA
sidor EFTER sidornas egna <style> → dess :root-variabler VINNER.
Byt tema för HELA sajten = ändra variablerna i design.css (ETT
ställe): --accent/--accent2 (färger), --bg, --radius, --shadow,
--grad (rubrikbandens gradient). Innehåller även försiktig
gemensam polering (fokusringar, kort-hover, enhetlig fältfokus).
Sidornas gamla :root-block ligger kvar som reserv om design.css
inte laddar – de behöver INTE tas bort.

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
- STORLEK vid utskrift (v5 – 50%-regeln BORTTAGEN på användarens begäran):
  · NORMAL (standard): naturlig storlek, ingen krympning – så många
    sidor som behövs. BREDDEN fylls ALLTID (hela 186 mm, print.css
    tvingar full bredd + kompenserar vid ev. skalning).
  · TVINGA 1 SIDA (valbart i dialogen): krymper allt till en sida
    (max ner till 62% – därunder blir det oläsligt).
  · Valet minns (localStorage: mk-fit, gamla värden migreras).
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

## ARBETSRUTINER FÖR AI-ASSISTENTEN (obligatoriska, användarens beställning)

1. 🧹 WS-RENSNING VAR 10:e KODUPPDATERING: efter var tionde kod-
   uppdatering ska arbetsytan (workspace) rensas – behåll ENDAST
   aktiva filer (site/-mappen = 1:1-spegel av repot) plus SPEC.md.
   Ta bort: uploads/, testfiler, cache-mappar, genererade PDF:er/
   bilder som inte hör till sajten. Räkna uppdateringar löpande.

2. 💡 10 NYA FÖRSLAG VAR 5:e KODUPPDATERING: efter var FEMTE kod-
   uppdatering ska AI:n AUTOMATISKT (utan att användaren ber om det)
   presentera 10 nya förslag som INTE redan finns i SPEC eller
   roadmapen och ALDRIG återanvänds från tidigare listor. Fokus:
   bättre KOD, DESIGN, MINNES- och CPU-ANVÄNDNING. Användaren
   väljer fritt vilka som läggs i checklistan eller byggs – och
   kan avstå alla. Korta (tabellformat), realistiska för GitHub
   Pages.

   Räkneläge vid denna specversion: uppdateringsräknaren börjar om
   på 0 nu. AI:n ansvarar för att hålla räkningen i sitt arbete.

3. 📤 UPPLADDNINGSLISTAN LÄNKAR ALLTID TILL FILERNA I ARBETSYTAN:
   varje filnamn i uppladdningstabellen skrivs som markdown-länk
   direkt till filens plats i arbetsytan (t.ex.
   [app.js](/home/user/site/assets/app.js)) – ALDRIG via separat
   md-fil eller liknande omväg. Dessutom öppnas leveransens
   viktigaste fil i visaren (present_file).

## 🗣️ KOMMANDON (användarens spec-regler – gäller ALLTID)

| Användaren skriver | AI:n gör |
|---|---|
| "förslag" | 25 NYA förslag (aldrig återanvända, ej i SPEC) som gör appen/designen/minnesanvändningen bättre – användaren väljer vilka som läggs i checklistan |
| "töm" | Rensar arbetsytan: ENDAST aktiva filer kvar (site/ = 1:1-spegel av repot); cache/test/temp-filer bort + rapport |
| "checklista" eller "lista" | Visar checklistan (roadmapen) ur SPEC med nummer + status ✔️/⏳ så användaren kan välja vad som ska implementeras |
| "kommande" | Samma som checklista (äldre kommando, behålls) |
| "filer" | De 10 senast ändrade filerna i arbetsytan som tabell med klickbara länkar |

## ROADMAP – BESTÄLLDA FRAMTIDA FUNKTIONER (byggs vid kommande uppdateringar)

Användaren har valt dessa – bygg i denna ordning när de beställs "nästa
punkt på roadmapen" e.d. Följ Centralt-principen: nya moduler i assets/,
data i json/, ALDRIG per receptfil.

1.  🏷️ SEO-TITLAR: sökordsoptimera alla receptens <title>/H1
    ("Pizzadeg i bakmaskin – Clatronic BBA 3774 (4×250 g)") – nischord
    med maskinnamn vinner gratis i Google. Central hjälp i seo.js +
    genomgång av befintliga recept.
2.  ❓ FAQ PER RECEPT: 2–4 vanliga frågor/svar per recept ("Kan degen
    frysas?"), renderas som kort + FAQPage JSON-LD-schema (extra
    Google-yta, röstsök). Data: json/faq.json (fil → [{q,a}]) eller
    meta-taggar; modul assets/faq.js.
3.  ⏲️ MULTITIMER i kockläget — ✔️ KLAR (byggd i recept.js): flera
    namngivna timers samtidigt i egen rad (#cmTimers), överlever
    stegbyten, pip + vibration + rödblink vid klart, ✕ per timer,
    samma etikett startas om istället för dubblett. Stoppas först
    när kockläget stängs.
4.  ✅ AVBOCKNINGSBARA INGREDIENSER — ✔️ KLAR (byggd i ingrediens.js):
    klicka på raden → ⬜→✅ + genomstruken/tonad, sparas i localStorage
    per recept (mk-bock:<fil>), "↩️ Nollställ avbockade (N)"-knapp,
    avstängt i redigeringsläget, osynligt vid utskrift och i sparad fil.
5.  💰 "BILLIGAST PER PORTION"-TOPPLISTA: sida/sektion som rankar alla
    recept efter kr/portion ur live-kalkylens data ("10 middagar under
    15 kr/portion"). Kalkylen behöver exponera resultat per recept
    (förberäknas i JS på recept.html via samma matchningslogik).
6.  💪 MAKROFILTER i receptsamlingen: filtrera på >X g protein,
    <Y kcal/portion m.m. (data ur kalkyl-läsning av recepten).
7.  📈 PRISHISTORIK: ingrediens-import.py sparar datum+pris i
    json/prishistorik.json vid varje månadsuppdatering; graf på
    ingredienser.html (canvas, ingen extern lib).
8.  💬 KOMMENTARER PER RECEPT — ✔️ KLAR v2 (assets/kommentarer.js):
    EGEN FLIK under receptet ("📖 Om receptet | 💬 Kommentarer (N)")
    + 🔢 RÄKNARE ÖVERST: "💬 N kommentarer"-pastill i snabb-översikten
    (röd när kommentarer finns), klick scrollar ner + öppnar fliken. En GitHub-
    issue per recept (titel "💬 <filnamn>", label "kommentar", skapas
    förifylld första gången). Kommentarer listas med avatar/namn/
    datum. 🔧 "FUNKADE I EN ANNAN MASKIN?"-rapport: dialog med
    maskindropdown ur databasen + program-fält → grönmarkerad
    rapport ("GreenPan Frost · Soft Ice Cream N4") som ägaren sen
    kan koppla permanent. Skrivande kräver GitHub-konto (förklarat);
    recepten redigeras ENDAST av admin (lösenord) – kommentarer är
    besökarnas kanal.
9.  📷 "JAG LAGADE DETTA!": besökare skickar in bild på sitt resultat
    (GitHub Issue med bild-URL eller upload via spara.js för inloggad
    ägare), galleri per recept.
10. 🔔 PUSH-NOTISER VID NYA RECEPT: PWA-notis "Nytt recept: X!" –
    kräver notification-permission-flöde i app.js + jämförelse av
    receptlistan mot senast sedda (localStorage).
11. 🏅 "VECKANS RECEPT" — ✔️ KLAR (byggd i assets/hem.js, ihop m. 16).
12. 🗣️ RÖSTSTYRT KOCKLÄGE — ✔️ KLAR (byggd i recept.js, täcker även
    roadmap 39): Web Speech API (SpeechRecognition, sv-SE).
    Kommandon: "nästa" · "tillbaka"/"föregående" · "timer"/"starta
    timern" (första tiden i steget) · "läs upp" · "tyst" · "stäng
    kockläge". 🎙️-knapp i kocklägets topprad slår PÅ/AV – mikrofonen
    är ALDRIG på utan aktivt klick och stängs ALLTID när kockläget
    stängs (rostStopp i close()). Grön statusrad visar lyssnings-
    läge + senaste kommandot. continuous-läge med auto-omstart
    (webbläsare avbryter efter tystnad). Saknas API-stödet
    (Brave/Firefox) visas ingen knapp alls. Nekad mikrofon →
    "🚫 Mikrofon nekad" och läget stängs av.
13. 🧾 "VILKEN MASKIN SKA JAG KÖPA?"-GUIDEN: 4 frågor (Vad lagar du
    mest? Hur många i hushållet? Budget? Bänkyta?) → sajten
    rekommenderar maskin ur json/maskiner/ (matchning mot typ/
    program/kapacitet) + 🛒 köpknapp (affiliate). Visar även antal
    recept på sajten för maskinen. Egen sida kopguide.html eller
    sektion på maskindatabas.html.
14. 💡 "VISSTE DU?"-FAKTA PÅ MASKINKORTEN: roterande tips ur
    maskinernas viktigt-fält ("Clatronic Cake-programmet ger skummiga
    kakor om hela cykeln körs...") – visas som liten roterande ruta
    på maskinkorten i maskindatabas.html. Unikt originalinnehåll
    (bra för Google/Amazon-godkännande). Central rendering, data
    finns redan i json/maskiner/*.json.
15. 🆚 RECEPT-VERSIONER PER MASKIN: samma recept med maskinflikar:
    "I COSORI: Air Fry 200°C 12 min · I Ninja: Max Crisp 10 min".
    Fliken väljs AUTOMATISKT efter besökarens senast valda maskin
    (localStorage mk-min-maskin). Data: recept:versioner-meta eller
    json/versioner.json (fil → maskin-id → {program, tid, temp});
    modul assets/versioner.js. Källreceptfiler röres aldrig.
16. 🏠 STARTSIDAN 2.0 — ✔️ KLAR (assets/hem.js, laddas endast på
    index): 🌤️ säsongs-/väderhälsning under taglinen (open-meteo
    Kumla utan nyckel; regn→bakdag, ≥22°→glassväder, ≤2°→grytväder;
    reserv = säsongstext per månad), ⭐ VECKANS RECEPT (SLUMPAS per
    vecka: seedad hash av år+veckonr → oförutsägbart men SAMMA för
    alla besökare hela veckan, byts måndag; kort med motivering) + 💰 BILLIGAST
    JUST NU (förenklad priskalkyl mot ingrediensdatabasen, kr/
    portion) som kortpar under hero-sektionen.
17. 🔗 INGREDIENS ↔ RECEPT-KOPPLING: klicka på ingrediens i databasen
    → "används i 7 recept: pizzadeg, majsbröd..." (klickbara piller).
    Omvänt syns kopplingen redan via kalkylens gröna rader. Byggs på
    ingredienser.html: läs alla recept (som recept.html gör), matcha
    varje recepts ingredienstabell mot databasens poster med SAMMA
    matchningslogik som kalkyl.js (norm/matchAll återanvänds –
    exponeras som window.__MK_MATCH ur kalkyl.js eller kopieras).
    Antal-badge i tabellen + expanderbar receptlista per rad.
18. 🏭 TILLVERKAR-SIDOR: gruppera maskiner per varumärke ("dina 2
    Ninja-maskiner") – flik/sektion per märke på maskindatabas.html
    (eller marke.html?m=ninja): märkesfakta (ur TILLVERKARE-kartan +
    maskinernas gemensamma data), alla maskiner + ALLA tillhörande
    recept (byggMaskinRecept återanvänds). SEO-yta: "Ninja recept
    svenska" – sitemap-poster per märke byggs av konvertera.py.
19. 🔍 STAVNINGSTOLERANT SÖK: "pizadeg" hittar pizzadeg – fuzzy-
    matchning (Levenshtein-avstånd ≤2 eller trigram-likhet) i ALLA
    sökfält: recept.html, ingredienser.html, maskindatabasens
    rekommendationsmotor, autocomplete i redigeringsläget. Central
    hjälpfunktion i assets/app.js (window.__MK_FUZZY) som alla
    sökningar återanvänder.
20. 🖥️ KÖKSSKÄRM-LÄGE: surfplattan på köksbänken – helskärmssida
    (koksskarm.html) med stor klocka, aktiva timers, dagens/veckans
    recept och snabbknappar till kockläget. Wake Lock så skärmen
    hålls tänd. Mörk design som passar kök (fettfingrar-vänliga
    STORA knappar).
21. ⏲️ FRISTÅENDE TIMERSIDA: äggklocka utan recept (timer.html) –
    flera samtidiga namngivna timers där VARJE TIMER HAR TEXT om
    vad den hör till ("Pasta – spisen", "Jäsning – bunken på
    bänken"). Pip + vibration + titelblink. Funkar offline (läggs
    i sw.js CORE). Delar timerkod med kockläget/multitimern (rp 3).
22. 🚦 NÄRINGSAMPEL: grön/gul/röd märkning per recept för fett/
    mättat fett/socker/salt per 100 g enligt Livsmedelsverkets/
    brittiska trafikljusgränser – liten ampel på receptkorten +
    detaljer vid kalkylen. Data finns redan (live-kalkylen);
    gränsvärden i central tabell i kalkyl.js eller egen modul.
23. 🐶 HUSDJURS-SÄKERHETSVAKT: recept i kategorin Husdjur (eller med
    hund/katt-tagg) kollas AUTOMATISKT mot lista över farliga
    ingredienser (lök, vitlök, choklad, russin/vindruvor, xylitol/
    björksocker, avokado, macadamia, alkohol, koffein) → STOR röd
    varning på sidan + blockerande bekräftelsedialog INNAN sparning
    i redigeringsläget/nytt-recept. Central lista i json eller
    modul (assets/husdjur.js).
24. 👶 BARNVÄNLIG-MÄRKNING: recept utan alkohol och utan stark
    krydda (chili, tabasco, cayenne...) får automatiskt 🧒-badge på
    receptkorten + filter i samlingen. Alkohol-detektering finns
    delvis (GreenPan Spiked-recepten) – återanvänd + utöka.
25. 📅 GARANTIKOLLEN: nya valfria fält i maskinfilerna (kopdatum,
    garanti_manader) → maskinkortet visar "Garanti t.o.m. 2027-08-23
    (14 månader kvar)" och VARNAR gult när <3 månader återstår.
    Redigerbart via maskin-import/maskindatabasens länksystem.
26. ❓ "KAN MAN...?"-SIDOR (SEO-magneter): frågesidor som matchar
    exakta Google-sökningar – "Kan man baka bröd i airfryer?",
    "Kan man göra yoghurt i riskokare?". Svar med sajtens egna
    data: ja/nej + vilken maskin/program + länk till recepten.
    Data: json/kanman.json (fråga → svar/maskin/recept), byggs som
    egna html-sidor av konvertera.py → sitemap. FAQPage-schema.
27. 🏆 "BILLIGARE ÄN SNABBMAT"-JÄMFÖRELSEN: på varje recept (och
    korten): "Pizzan: 12 kr hemma vs ~129 kr levererad – du sparar
    117 kr 🎉". Jämförpriser i central json/jamfor.json (kategori →
    typiskt hämtmatspris, uppskattningar märkta "ca"). Modul i
    kalkyl.js (kr/portion finns redan) – mycket delbart.
28. 🇸🇪 SVENSKA KLASSIKER-SERIEN: pannkakor, köttbullar, kanelbullar,
    risgrynsgröt m.fl. "i dina maskiner" – högvolymsökningar med
    sajtens twist (exakt maskin/program/pris). Skrivs som vanliga
    recept med SEO-titlar ("Kanelbullar i airfryer – Ninja/COSORI").
    En klassiker i taget, användaren väljer ordning.
29. 📋 PROGRAM-LEXIKONET: förklaringssidor per programterm – "Vad
    betyder PROVE på Ninja?", "Vad är Fuzzy Logic?", "Skillnad Air
    Fry vs Max Crisp?". Data: json/lexikon.json (term → förklaring
    + maskiner som har programmet + recept som använder det).
    Egen sida lexikon.html + ord-länkning från maskinkorten.
30. 🗳️ "RÖSTA FRAM NÄSTA RECEPT": startsidan visar 3 receptidéer,
    besökare röstar (Abacus idea-röster, en röst/webbläsare) →
    vinnaren byggs, resultatet annonseras = återbesök. Idéerna i
    json/rostning.json (ägaren fyller i 3 nya per omgång).
31. 🔗 BÄDDA-IN-KORT: embed.html?r=FILNAMN – litet fristående
    receptkort (bild/namn/pris/kcal + länk) som bloggar/forum kan
    lägga in via <iframe>. "</> Bädda in"-knapp på receptsidorna
    som kopierar koden. Gratis bakåtlänkar (SEO).
32. 📲 "LÄGG TILL PÅ HEMSKÄRMEN"-KAMPANJ: snygg egen install-prompt
    för PWA:n (beforeinstallprompt + iOS-instruktion) – "Få Mitt
    Maskinkök som app – gratis, funkar offline". Visas diskret
    efter 2:a besöket (localStorage-räknare), aldrig tjatig.
33. 🖨️ GRATIS PRINTABLES: nedladdningsbara PDF:er med sajtens URL –
    konverteringstabell (dl/msk/g), airfryer-tidskarta för kyl-
    skåpsdörren, ugns→airfryer-omräknare. Byggs som print-sidor
    (skriv ut till PDF) + nedladdningssida printables.html.
    Pinterest-vänliga = gratis trafik.
34. 📊 RÖSTNINGS-WIDGET PÅ STARTSIDAN: topp-3 mest röstade förslagen
    (ur json/forslag-lista.json + Abacus) visas på index.html med
    röstknapp direkt på plats – fler ser lådan, fler röstar.
    Byggs i assets/hem.js.
35. 🔔 "NYTT SEDAN SIST"-MARKERING: recept/kommentarer/förslag som
    tillkommit sedan besökarens senaste besök får 🆕-badge.
    localStorage-tidsstämpel (mk-senast-sedd) jämförs mot recept-
    listans/kommentarernas datum. Central modul, badge på kort +
    kommentarsräknaren.
36. 📅 HÅLLBARHETSDATUM PÅ RECEPT-INGREDIENSER: 🫙-poster (recept
    sparade som ingrediens, t.ex. tomatsåsen) får valfria fält
    tillverkad/bast_fore_dagar → ingredienssidan varnar "din
    tomatsås är 5 mån gammal – dags att använda!" + länkar recept
    som använder den. Kopplas till etiketternas bäst före-datum
    (json/hallbarhet.json delas).
37. 🏷️ PRISJÄMFÖRELSE PER BUTIK: samma vara hos flera butiker
    (whey hos Gymgrossisten OCH Tyngre) → posterna länkas (falt
    "jamfor_grupp" eller namn-matchning) och visas ihop med
    "💰 billigast just nu"-pil på ingredienssidan; kalkylen räknar
    med billigaste. Prishistorik per butik när roadmap 7 byggs.

38. 🔔 PRISVAKT (förslag 198): ingrediens-import.py sparar förra
    månadens pris (falt "pris_forra") vid varje prisuppdatering –
    ändras en länkad vara >15 % flaggas den: lista på status.html
    ("📈 Mjölk +18 % sedan förra månaden") + varningsemoji vid
    varan på ingredienser.html. Ingen extra robot behövs – bygger
    på befintlig månadsuppdatering.

39. 🔊 RÖSTSTYRT KOCKLÄGE — ✔️ KLAR (samma bygge som roadmap 12,
    se punkt 12 för detaljerna – byggd i assets/recept.js).

40. 👥 GRATIS ANVÄNDARKONTON (STORT – byggs i etapper): besökare
    ska kunna registrera sig GRATIS, använda allt och lägga upp
    EGNA ingredienser, recept och maskiner. Viktigt: GitHub Pages
    har ingen server – tre realistiska vägar, väljs vid bygget:
    a) 📱 ETAPP 1 "Mitt kök" (enklast, ingen inloggning): egna
       recept/ingredienser/maskiner sparas i localStorage på
       enheten och visas ihop med sajtens – bara för användaren
       själv. Export/import som fil. Byggbart direkt.
    b) 🐙 ETAPP 2 GitHub-inloggning: användare loggar in med eget
       (gratis) GitHub-konto → deras bidrag skickas som förslag
       (Issues/PR) som admin godkänner. Ägarens data skyddas –
       allt publikt går genom godkännande.
    c) ☁️ ETAPP 3 riktiga konton: FIREBASE (användarens val,
       gratisnivån: e-post+lösenord-inloggning + Firestore-databas)
       → publika användarprofiler med egna samlingar. Moderering:
       admin godkänner innan publikt, spam-skydd.
    ⛔ BYGGS INTE FÖRRÄN ANVÄNDAREN UTTRYCKLIGEN SÄGER TILL –
       ingen etapp påbörjas oombedd.
    Adminens egna data (recept/, json/) förblir ALLTID skyddade –
    användarbidrag lagras separat och blandas aldrig okontrollerat
    in. Detaljplan tas fram när etappen beställs.
    ➕ TILLÄGG: kontona ska även ge FAVORITMARKERING av recept
    (hjärta på receptkort + egen "Mina favoriter"-vy). Byggs i
    etapper: ❤️ lokala favoriter (localStorage, ingen inloggning)
    kan byggas när som helst; Firebase-konton synkar dem sen
    mellan enheter.

41. 🖼️ AUTO-SOCIAL-PAKET: varje nytt recept genererar färdig
    Instagram-bildtext + hashtags (svenska + maskinnamn, t.ex.
    #airfryer #ninjacreami #maskinkök) ur receptets metadata.
    Kopiera-knapp i admin-läge (lösenordsskyddat). Modul i
    assets/, ev. robot som lägger texten i receptets meta.

42. 🥗 ALLERGIFILTER: auto-taggning gluten/laktos/nötter/ägg ur
    ingrediensdatabasen (vetemjöl→gluten, mjölk/yoghurt→laktos...)
    → filterknappar på recept.html ("visa glutenfritt") + varnings-
    ikoner på receptkorten. Central ordlista i assets/allergi.js
    eller json/allergener.json. Recepten röres aldrig.

43. 📸 AI-BILDER VID BEHOV: recept utan egna foton kan (frivilligt,
    lösenordsskyddat, admin väljer per recept) generera en AI-bild
    av slutresultatet via bildgenererings-API → sparas i
    images/recept/<fil>.jpg precis som riktiga foton (📷-flödet).
    Riktiga foton vinner ALLTID över AI-bilder; AI-bilden märks
    diskret ("AI-genererad illustration"). Kräver API-nyckel –
    tjänst väljs vid bygget (gratis/billig nivå).

44. 🧂 KRYDDSKÅPSKOLLEN (förslag 226): central lista över ägarens/
    användarens kryddor → recepten markerar direkt vid ingredienserna
    "har du inte: rökt paprika" innan bakningen börjar. PER KONTO
    (användarens val): byggs först lokalt (localStorage per enhet),
    kopplas till kontosystemet (roadmap 40, Firebase) när det finns
    så kryddskåpet följer med mellan enheter. Kryddlista redigeras
    på egen sida/sektion; matchning mot receptens ingrediensrader
    via samma norm/alias-logik som kalkylen.

45. 🗓️ UNDERHÅLLSPÅMINNELSER (förslag 234): per maskin i databasen –
    "avkalka var 3:e månad", "byt kolfilter", "smörj packning" →
    påminnelselista med datum (localStorage: senast utfört + intervall)
    på maskindatabas.html + diskret 🔔-badge på maskinkortet när
    något förfallit. Underhållsregler läggs i maskinens json-fil
    (falt "underhall": [{namn, intervall_dagar}]) – centralt, aldrig
    per sida.

46. 🎬 RECEPT-TILL-REELS-MANUS (förslag 251): genererar färdigt
    15-sekunders videomanus per recept ur metadata + steg ("Klipp 1:
    häll mjölken · Text på skärm: 18 kr för 3 bägare!") med
    kopiera-knapp. Sänker tröskeln för TikTok/Reels/Shorts.
    Central modul; manus-mallar per kategori (bröd/glass/sylt).

47. 🖼️ DELNINGSKORT-GENERATOR (förslag 252): en knapp per recept →
    snygg 1080×1080-bild ritas i canvas (receptfoto/hero-SVG + namn
    + kcal + pris + QR till receptet) → laddas ner färdig för
    Instagram/Facebook. Ingen server behövs (allt i webbläsaren).

48. 📱 BOTTENFLIK-NAVIGERING I PWA — ✔️ KLAR (site.js): körs sajten
    som installerad app (standalone) byts topmenyn mot riktiga
    appflikar i botten (#mk-nav.app-bottom: ikon + text, safe-area-
    padding, body.mk-has-bottomnav lyfter mk-top/FAB). EJ på recept-/
    rättsidor (mk-rnav äger botten där). Samtidigt: 📱 MOBILMENYN
    OMBYGGD – ikon + LÄSBAR text under (tidigare bara emojis =
    "svårt att se"), korta namn (Rätter/Varor/Skapa), scrollbar rad
    utan synlig scrollbar, aktiv flik röd med skugga + auto-scroll
    i synfältet, 54px träffytor, aria-label/aria-current.
    index.html:s egen .topnav matchad + kompletterad (Rätter/Varor).

49. 🌗 AUTO-KONTRAST PÅ HERO-TEXT (förslag 262): textskugga/mörk
    overlay på receptheadern beräknas ur bildens ljushet (canvas-
    sampling av uppladdad bild) – texten aldrig oläsbar på ljusa
    foton. Central i hero.js; källfiler röres aldrig.

50. 📋 KRAV-RUTAN (förslag 266): överst per recept en kompakt ruta
    INNAN man börjar läsa: "Kräver: bakmaskin + frys · 24 h vänte-
    tid · 4 ingredienser". Byggs automatiskt ur recept:maskiner-
    metan (maskiner + tider) och ingredienstabellen (antal).
    Central modul – inga receptfiler ändras.

51. 🗜️ BILDOPTIMERINGS-ROBOT (förslag 272): GitHub Action som auto-
    komprimerar nya uppladdade bilder i images/ (>300 kB → JPEG 80%/
    WebP, max 1200 px) och committar tillbaka. Följer robotreglerna:
    original skrivs över först efter lyckad komprimering, aldrig
    kvalitetsförlust under satta gränser, logg i backup/.

52. 🔎 STAVNINGSTÅLIG SÖKNING (förslag 273): receptsöket (och ev.
    ingredienssöket) tål stavfel – "makkaroner" hittar "makaroner"
    (Levenshtein-avstånd ≤2 på ordnivå). Ren JS i recept.html/
    central modul, inga externa bibliotek.

53. 🛠️ DESIGN-DOKTORN (förslag 315): utbyggd konvertera.py –
    inklistrade recept med FEL design (främmande CSS, andra
    klassnamn, inline-röra) byggs om till sajtens standard:
    innehållet EXTRAHERAS (rubrik/beskrivning/ingredienser/steg/
    näring/tips, oavsett hur källan ser ut) och hälls i det rätta
    HTML-skelettet (samma som RECEPT-CHATT.md). Innehållet röres
    aldrig – bara förpackningen. Robotregler gäller: ändringarna
    rapporteras i commit-texten, originalstruktur loggas i backup/
    innan ombyggnad första gången.

54. 📐 MALL-SYNK-ROBOT (förslag 319): när receptmallen/skelettet
    förbättras (nya kort, bättre struktur) uppdaterar roboten ALLA
    befintliga recepts struktur till nya standarden – INNEHÅLLET
    (text, ingredienser, steg, näringstal) förblir helt orört.
    Körs manuellt (workflow_dispatch) med diff-rapport innan push;
    bygger på Design-doktorns extraherings-/ombyggnadslogik (53).

55. 💧 AUTO-SORTERA INGREDIENSER (förslag 321): robot sorterar
    receptens ingredienstabeller blötast-överst automatiskt
    (bakmaskinsordning: vätska i först) med samma hydrerings-
    klassning som kalkylen (vatten/mjölk/yoghurt 80 %/ägg 75 %/
    olja 20 %/torrt). Total-raden ligger alltid kvar sist.
    Endast radordningen ändras – celler/värden röres aldrig.
    Del av konvertera.py/autofix-flödet.

56. 🔄 BYT DEL-KNAPP PÅ RÄTTSIDAN (förslag 329): på ratter/-sidorna –
    "byt riset mot potatismos": varje del får bytknapp som listar
    andra recept/mat-varor av liknande typ → näringen räknas om
    direkt. Valet kan sparas i rättens metadata (admin) eller bara
    lokalt för besökaren (localStorage).

57. 🖨️ MATRÄTTS-UTSKRIFT (förslag 328): kokbokskort för HELA rätten
    på en utskrift – alla delrecept (kortform), mängder på tallriken,
    hopsummerad näring + inköpslista för alla delar. Byggs på
    print-flödet (print.css/print.js) + ratt.js-datan.

58. 🍽️ MATRÄTTER I RECEPTSAMLINGEN — ✔️ KLAR (recept.html): rätterna
    visas som egna kort (gul ram + 🍽️ Maträtt-märke, läses ur
    json/matratter.json) under egen kategori "Maträtter" överst i
    kategorilistan – samma vy som t.ex. 🐶 Husdjur. Korten länkar
    till rättens egna sida i ratter/. Bild: images/recept/<id>.jpg
    om den finns, annars hero-SVG.

59. 🍱 MATLÅDELÄGE (förslag 331): på rättsidan – "gör X matlådor av
    denna rätt" → total batch räknas (delar × antal), inköpsmängder,
    och ETIKETTER per låda via etikettmodulen (namn, datum, näring
    per låda). Meal prep-flöde på en knapp.

60. 🌒 MÖRKT LÄGE (förslag 352): auto via prefers-color-scheme +
    växlare i menyn. ENDAST :root-variablerna byts i design.css
    (mörk palett: bg/card/dark inverteras, accent behålls) –
    Centralt-principen gör att hela sajten följer med. Valet
    sparas (localStorage mk-tema).

61. 📳 HAPTIK (förslag 358): kort vibration vid avbockning av
    ingrediens, timer-klar och lyckad sparning (navigator.vibrate
    – stöds ej på iOS, failar tyst där). Central hjälpare i
    app.js (__MK_VIBRA), respekterar prefers-reduced-motion.

62. 🔄 PULL-TO-REFRESH I PWA (förslag 360): dra ner på recept-
    samlingen/startsidan i app-läge → färsk data hämtas (annars
    fastnar besökare i cache-versionen). Egen touch-gest (ingen
    lib), spinner-indikator, endast i standalone-läge.

63. 🧪 NATTLIG LÄNK-HÄLSOKOLL (förslag 363): robot verifierar alla
    kopplingar recept↔maträtt↔ingrediens (delar som pekar på
    borttagna recept, alias mot borttagna varor, energi.json-
    poster utan recept...) → bruten-lista på status.html +
    logg i backup/. Byggs in i sjalvlakning.py (nytt steg).

64. 🏷️ MATRÄTTS-ETIKETTER (användarens beställning): rättsidorna
    får 🏷️ Etiketter-knapp likt recepten (etikett.js utökas att
    känna igen rättsidor via __MK_RATT_TOT): namn, tillagnings-
    datum, bäst före (frysta lådor +90 dgr), näring per låda ur
    låduppdelningen, samma 6 etikettformat (A4-ark + rulle).
    Perfekt ihop med matlådeläget (59).

65. 📚 SAMLINGAR (förslag 410): egna mappar ("Julbak", "Barnens
    favoriter") som recepten taggas in i – LOKALT (localStorage,
    ingen inloggning). Egen vy/flik i receptsamlingen med
    samlingarna, ➕ "Lägg i samling"-knapp på receptkorten/
    receptsidorna, hantera samlingar (skapa/döp om/ta bort).
    Framtid: synkas via Firebase-kontona (roadmap 40) när de byggs.

66. 📋 KLISTRA IN-KNAPP (förslag 442): knapp vid textarean i
    nytt-recept.html som hämtar urklippet direkt via
    navigator.clipboard.readText() – slipper långtryck+klistra
    på mobil. Kräver behörighetskoll (clipboard-read) med snygg
    reserv: stöds inte API:t (Firefox/äldre webbläsare) döljs
    knappen helt. Samma knapp även i maskin-import.html
    (produktlänken) och matratter.html om det passar.

67. ⏲️ INNERTEMPERATUR-FÄLT (förslag 454): "94–96°C" i recepttext
    känns igen vid parsning → egen 🌡️-pill på receptkortet +
    <meta name="recept:innertemp"> i filen + påminnelse i
    kocklägets sista steg ("Kolla med termometer: 94–96°C").
    Perfekt för bröd (lantbrödet) och kött (pulled kyckling 95°C).

68. 📁 FYSISKA KATEGORIMAPPAR ✔️ STEG 1+2 KLARA & LIVE (2026-10-03,
    push 4d4f0a1 + df002ee via användarens GitHub-token):
    25 recept flyttade till recept/<kategori>/ med stubbar på gamla
    adresserna och json/recept-index.json som modulernas sanning.
    ⏳ ÅTERSTÅR: robotfilerna (.github/workflows/) kunde inte pushas –
    token saknar Workflows-rättighet (lägg till "Workflows: Read and
    write" på token ELLER ladda upp de 4 filerna manuellt). Utan dem
    ser robotarna inte undermapparna (sitemap/index uppdateras fel
    tills de är uppe!). 🔑 ARBETSFLÖDE HÄDANEFTER: agenten pushar
    direkt via token (sparad i /flytt/gh-token.txt utanför repot) –
    inga uppladdningslistor utom för .github/-filer tills scope lagts
    till. Ursprunglig plan: recepten flyttas till recept/<kategori>/ (deg,
    brod, bakning, glass, husdjur, saft, snacks, varmratt, sylt –
    samma id:n som recept.html:s KATEGORIER). Flyttscript FÄRDIGT
    & TESTAT (utanför repot): flyttar 20 filer, skriver om relativa
    sökvägar (../ → ../../), lämnar noindex-STUBBAR på gamla
    platserna (QR-koder/Google/bokmärken fortsätter fungera; betyg/
    kockläge/bockar överlever – nycklarna är per FILNAMN) och bygger
    json/recept-index.json (modulernas nya sanning om sökvägar).
    GENOMFÖRANDE i 3 pushar när token finns: (1) modulfundament –
    recept-index läses av recept.html/hem/kokbok/maskindatabas/
    receptnav/stadare/ratt/nytt-recept m.fl. med GitHub-API som
    reserv, funkar med BÅDE platt & nästlad struktur; robotarna
    (konvertera/sjalvlakning steg6/sprak) görs rekursiva;
    (2) själva flytten + stubbar + index; (3) live-verifiering +
    nytt-recept sparar nya recept direkt i rätt kategorimapp.
    ✔️ STEG 3 KLART (2026-10-03): 📁 REN ROTMAPP (användarens regel
    "inga lösa html-filer i recept/"): stubbarna RADERADE (användaren
    valde ren mapp före redirect-skydd – gamla flata URL:er ger 404).
    🗂️ KATEGORIBYTE = FLYTT i redigeraren: väljs annan kategori i
    editbarens 🗂️-dropdown sparas filen på recept/<ny-kat>/<fil>,
    gamla tas bort (efter lyckad sparning), relativa sökvägar
    justeras vid djupbyte, PLATS-raden säkras (buildCleanHtml tappar
    kommentarer före <html> – saveToSite återinjicerar), besökaren
    skickas till nya adressen. Auto = ligg kvar. 📁 nytt-recept.html:
    kategori-dropdown (gissas ur titel+taggar via KAT_ORD, suffixsäker,
    "saftig" triggar aldrig saft) → sparar till recept/<kat>/<fil>,
    bygger med ../../-sökvägar + recept:kategori-meta. 🤖 MAPPVAKTEN
    (sjalvlakning steg8, körs FÖRE steg6/7): lösa rotrecept flyttas
    automatiskt till sin mapp (meta vinner → ordlista-gissning →
    ovrigt/) med sökvägsomskrivning; kvarglömda stubbar raderas;
    MALL/sökmotorfiler rörs aldrig.

## ⏸️ ARBETSREGEL FÖR ROADMAPEN (användarens beställning)

- 🛡️ REGRESSIONSKOLL VID VARJE KODÄNDRING: när kod skrivs eller
  uppdateras ska AI:n ALLTID kontrollera att inget befintligt
  försvunnit eller slutat fungera:
  1) Före/efter-jämförelse av filen (befintliga funktioner, API:er
     (window.__MK_*), event-kopplingar och städlistor ska finnas kvar)
  2) node --check / python ast på ALLA ändrade filer
  3) jsdom-test som även rör vid NÄRLIGGANDE funktioner (inte bara
     den nya) – t.ex. vid ändring i kalkyl.js testas att smakval,
     källval och underrader fortfarande byggs
  4) Vid minsta tvekan: grep efter funktionen/ID:t i hela assets/
     för att se att inga beroenden brutits.
  Raderingar av befintlig kod får ENDAST ske avsiktligt och ska då
  nämnas uttryckligen i leveransen ("borttaget: X, därför att Y").

- Roadmap-punkter byggs ENDAST när användaren uttryckligen beställer
  dem ("bygg 44", "bygg kryddskåpskollen" e.d.). Skriv ingen kod för
  en roadmap-funktion i förväg.
- KOMMANDE-punkter TAS ALDRIG BORT ur roadmapen. Endast när en punkt
  är IMPLEMENTERAD flyttas/märks den som ✔️ KLAR i specen.
- Kommandon ("förslag"/"töm"/"checklista"/"lista"/"kommande"/"filer"):
  se 🗣️ KOMMANDON-tabellen under ARBETSRUTINER.

## BACKUP AV INGREDIENSDATABASEN (automatisk, veckovis)

Ingrediensdatabasen ska ALDRIG kunna gå förlorad. Robot:
`.github/workflows/backup-ingredienser.yml` körs varje söndag
kl 04:00 svensk tid (och manuellt via Actions → "Veckobackup
ingredienser" → Run workflow).

- Arkiverar `json/ingredienser.json` → `backup/ingredienser/ingredienser-ÅÅÅÅ-MM-DD.json`
  och `json/ingrediens-lankar.txt` → `backup/ingredienser/ingrediens-lankar-ÅÅÅÅ-MM-DD.txt`.
- Vägrar arkivera trasig JSON eller tom databas (skyddar arkivet).
- Oförändrat innehåll ⇒ ingen dubblettfil, men körningen loggas alltid
  i `backup/ingredienser/LOGG.md` (tabell: datum/fil/resultat).
- Gamla kopior raderas ALDRIG automatiskt.
- ÅTERSTÄLLNING: öppna datumfilen i `backup/ingredienser/` på GitHub,
  kopiera innehållet till `json/ingredienser.json`, committa.


## FÖRSLAGSLÅDAN v3 (forslag.html)

- 🚀 DIREKTSÄNDNING FRÅN SIDAN (inget mailprogram!): Web3Forms-API
  (gratis 250/mån). ÄGARSTEG: web3forms.com → ange tokke2@gmail.com →
  Create Access Key (inget konto) → klistra nyckeln i json/forslag.json
  → "web3forms_nyckel". Formuläret POST:ar direkt, bekräftelse visas
  på sidan, användarens adress blir svara-till. Nyckeln är ofarlig
  publikt (kan endast skicka till din adress). TOM NYCKEL/API-fel =
  mailto-RESERV (mailprogram öppnas förifyllt). Användarens e-post
  obligatorisk i båda lägena.
- 🗳️ RÖSTLISTAN: json/forslag-lista.json (id/titel/beskrivning/
  status/datum). Röster = Abacus idea-<id>, en per webbläsare.
  Sortering: öppna först (flest röster överst) → kommande → färdiga
  (nedtonade).
- 🛠️ ADMIN (endast upplåst session, spara.js): ➕ Lägg till förslag
  (från inkomna mail) · 🔜 Kommande · ✅ Färdig · ↩️ Öppen · 🗑️ Ta bort.
  Allt sparas lösenordsskyddat till json/forslag-lista.json.

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
