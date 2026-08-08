# 🚀 Publicera Mitt Maskinkök på GitHub Pages – Steg för steg

**Allt är kostnadsfritt. Inget kreditkort. Ingen reklam. Tar ca 10–15 min första gången.**

---

## DEL 1 – Ladda ner filerna från chatten (2 min)

1. Öppna filvisaren i chatten (Arena.ai)
2. Ladda ner **hela `site/`-mappen** till din dator
   - Går det inte att ladda ner hela mappen på en gång: ladda ner filerna en och en
     och lägg dem i samma struktur på datorn:
     ```
     site/
     ├── index.html
     ├── maskindatabas.html
     ├── maskindatabas.json
     ├── README.md
     ├── recept/          (ananaskaka.html, index.json, MALL-nytt-recept.html.txt)
     └── images/          (alla maskinbilder + recept/ananaskaka.jpg)
     ```

---

## DEL 2 – Skapa GitHub-konto (3 min, gratis)

1. Gå till **https://github.com/signup**
2. Ange e-post → välj lösenord → välj användarnamn
   - 💡 Användarnamnet blir del av din webbadress, t.ex. `rickard-vasteras`
     ger adressen `rickard-vasteras.github.io`
3. Verifiera e-posten (kolla inkorgen)
4. Frågor om "plan"? Välj **Free** (förvalt)

---

## DEL 3 – Skapa ditt repository (2 min)

Ett "repository" (repo) = en mapp på GitHub där sajten bor.

1. Logga in på github.com
2. Klicka på **+** uppe till höger → **New repository**
3. Fyll i:
   - **Repository name:** `maskinkok` (eller vad du vill – blir del av adressen)
   - **Public** ← måste vara valt (krav för gratis Pages)
   - ❌ Bocka INTE i "Add a README" (vi har redan en)
4. Klicka **Create repository**

---

## DEL 4 – Ladda upp filerna (3 min)

1. På sidan som visas: klicka länken **"uploading an existing file"**
   (eller gå till fliken **Code** → **Add file** → **Upload files**)
2. **Dra och släpp ALLT innehåll i site-mappen** i webbläsarfönstret
   - ⚠️ Viktigt: dra in mapparna `recept/` och `images/` också – GitHub
     bevarar mappstrukturen när du drar in hela mappar
   - Alternativ om drag-och-släpp strular: dra in filerna i omgångar,
     mappstrukturen följer med när du drar in själva mapparna
3. Skriv valfri text i "Commit changes"-rutan (t.ex. "Första uppladdningen")
4. Klicka **Commit changes**
5. Kontrollera att fillistan nu visar: `index.html`, `maskindatabas.html`,
   `maskindatabas.json`, `recept/`, `images/`

---

## DEL 5 – Slå på GitHub Pages (2 min)

1. I ditt repo: klicka **Settings** (kugghjulet, högst upp)
2. Vänstermenyn: klicka **Pages**
3. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main** och mapp **/ (root)**
4. Klicka **Save**
5. Vänta 1–2 minuter → ladda om sidan → grön ruta visar din adress:

   **`https://DITTNAMN.github.io/maskinkok/`**

6. Klicka på adressen – din sajt är LIVE! 🎉

---

## DEL 6 – Testa att allt fungerar (2 min)

- ✅ Startsidan visar recept + maskingalleri med bilder
- ✅ Maskinväljar-knapparna filtrerar recepten
- ✅ Sökrutan hittar "ananas"
- ✅ Klicka in på ananaskakan: bild, betygsstjärnor, QR-kod, utskriftsknapp
- ✅ "Maskindatabasen" öppnas med alla 11 maskiner
- ✅ QR-koden på receptet: skanna med mobilen → receptet öppnas i mobilen

---

## 🔄 SÅ UPPDATERAR DU SAJTEN (efter publicering)

### Lägga till nytt recept
1. Kopiera `recept/ananaskaka.html` på din dator → döp om (t.ex. `kottgryta.html`)
2. Ändra metadata-raderna i `<head>` (namn, emoji, beskrivning, taggar, maskiner)
   och själva innehållet
3. På GitHub: öppna mappen `recept` → **Add file → Upload files** → dra in filen
   → **Commit changes**
4. **Klart!** Startsidan hittar den automatiskt inom ~1 minut (via GitHub API)

### Lägga till bild till ett recept
1. Döp bilden till SAMMA namn som receptfilen: `kottgryta.jpg`
2. Ladda upp till `images/recept/` (öppna mappen → Add file → Upload files)
3. Bilden visas automatiskt överst på receptet + som miniatyr på startsidan

### Lägga till ny maskin (automatiskt!)
1. Kopiera en befintlig maskinfil från `json/maskiner/` (t.ex. `midea-mb-fs5017.json`)
2. Ändra id, namn, program osv. (se `json/maskiner/MALL-ny-maskin.json.txt`)
3. Ladda upp till `json/maskiner/` → **klart! Läses in automatiskt** på både startsidan och i maskindatabasen
4. Maskinbild? Ladda upp `images/DITT-ID.jpg` och ange `"bild": "images/DITT-ID.jpg"` i filen

### Ändra i en befintlig fil
1. Klicka på filen på GitHub (t.ex. `json/maskiner/midea-mb-fs5017.json`)
2. Klicka pennikonen ✏️ (Edit this file)
3. Gör ändringen → **Commit changes**
4. Live inom ~1 minut

### Enklaste arbetsflödet med AI
1. Be chatten (denna eller ny) om nytt recept/ny maskin
2. Ladda ner den uppdaterade filen från chattens workspace
3. Ladda upp till GitHub (ersätt gamla filen – samma filnamn skriver över)

---

## ❓ Vanliga problem

| Problem | Lösning |
|---|---|
| 404-sida efter Save | Vänta 2–3 min, ladda om. Kontrollera att filen heter exakt `index.html` |
| Bilder visas inte | Kontrollera att `images/`-mappen laddades upp med innehåll och att sökvägarna är små bokstäver |
| Recepten laddas inte | Kontrollera att `json/`-mappen med `maskindatabas.json` laddats upp |
| Maskiner saknas | Kontrollera att `json/maskiner/`-mappen med alla .json-filer laddats upp |
| Nytt recept syns inte | Vänta 1 min (GitHub API cachar), hård-uppdatera med Ctrl+Shift+R |
| Ändringar syns inte | GitHub Pages tar upp till 1 min att bygga om + webbläsarcache: Ctrl+Shift+R |

---

## 💰 Kostnadssammanfattning

| Sak | Kostnad |
|---|---|
| GitHub-konto | 0 kr |
| Repository (publikt) | 0 kr |
| GitHub Pages-hosting | 0 kr, obegränsad tid |
| Trafik/bandbredd | 0 kr (mjuk gräns 100 GB/mån = tiotusentals besök) |
| QR-kod-tjänsten (api.qrserver.com) | 0 kr |
| **Totalt** | **0 kr** |

Enda valfria kostnaden: eget domännamn (t.ex. maskinkoket.se, ~100–150 kr/år)
– men adressen `dittnamn.github.io/maskinkok` är gratis för alltid.
