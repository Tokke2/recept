# Mitt Maskinkök 🍳

> **För AI-chattar:** klistra in innehållet i `SPEC.md` i en ny chatt så vet den
> exakt hur sajten fungerar och hur nya recept/maskiner ska skrivas.

Databas över mina matlagningsmaskiner och recept, med programförslag för varje rätt.

## Publicera gratis på GitHub Pages

1. Skapa konto på [github.com](https://github.com)
2. Skapa nytt repository (t.ex. `maskinkok`), välj **Public**
3. Ladda upp ALLA filer i denna mapp (behåll mappstrukturen: `recept/`, `images/`)
4. **Settings → Pages → Source: Deploy from branch → main → / (root)** → Save
5. Efter ~1 minut: `https://DITTNAMN.github.io/maskinkok/`

## Lägga till ny maskin (automatiskt!)

1. Kopiera en fil i `json/maskiner/`, ändra innehållet (se MALL-ny-maskin.json.txt)
2. Ladda upp till `json/maskiner/` — klart, läses in automatiskt!

## Lägga till nytt recept (automatiskt!)

1. Kopiera `recept/ananaskaka.html`, döp om (t.ex. `kottgryta.html`)
2. Ändra metadata-taggarna i `<head>` (namn, emoji, beskrivning, taggar, maskiner)
3. Ändra innehållet
4. Ladda upp till `recept/`-mappen — **klart! Startsidan hittar den automatiskt** (via GitHub API)
5. Egen bild? Lägg `images/recept/kottgryta.jpg` (samma namn som receptet) — visas automatiskt överst på receptet och som miniatyr på startsidan

## Platsmärkning (kodstandard)

ALLA filer anger sin plats på rad 1–5:
- HTML: `<!-- PLATS: /mapp/fil.html -->` (rad 2, efter doctype)
- JS/CSS/YML: kommentarsblock med `PLATS: /mapp/fil`
- JSON: `"_plats"` som första nyckel

Så vet du (och AI-chattar) alltid exakt var en fil ska laddas upp.

## Filstruktur

- `index.html` – startsida: receptsök, maskinväljare, maskingalleri
- `maskindatabas.html` – interaktiv maskindatabas med programförslag
- `json/maskindatabas.json` – basdata (recept-register, AI-instruktion)
- `json/maskiner/` – EN fil per maskin (alla .json läses in automatiskt!)
- `json/maskiner-index.json`, `json/recept-index.json` – reservlistor (behövs bara utanför GitHub Pages)
- `recept/` – receptkort (alla .html läses in automatiskt)
- `images/` – maskinbilder
- `images/recept/` – receptbilder (samma filnamn som receptet)
- `assets/site.js` – CENTRAL LADDARE: en rad per sida laddar allt + självläker (kontrollerar att moduler/metadata finns, laddar det som saknas, varnar i konsolen)
- `assets/print.css` + `assets/print.js` – A4-utskrift + 🖨️-knapp
- `assets/app.js` – PWA + 📤 delningsknapp
- `assets/recept.js` – 👨‍🍳 kockläge
- `assets/energi.js` + `json/energi.json` – ⚡ HELT CENTRAL energi: energidata per recept ligger i json/energi.json (filnamn som nyckel). Effekt ur maskindatabasen, elpris ur maskindatabas.json. INGEN HTML behöver ändras!

## Sidor

- `index.html` – startsida (sök, maskinväljare, ändringslogg)
- `maskindatabas.html` – maskindatabas med programförslag

## Appen (PWA)

Sajten är installerbar som app: öppna den i mobilen → webbläsarmenyn →
**"Lägg till på startskärmen"** (eller "Installera app"). Egen ikon, helskärm,
och besökta sidor fungerar offline (service worker cachar).

## Självläkande recept (3 skyddslager!)

Ett recept som laddas upp UTAN `<script src="../assets/site.js"></script>` fixas ändå:

1. **GitHub Action** (`.github/workflows/autofix-recept.yml`) – körs vid varje
   uppladdning: lägger till site.js-raden i recept som saknar den och bygger
   om maskiner-index.json. Recepten läses direkt från main/recept/*.html.
2. **Service worker** (`sw.js`) – injicerar raden i farten i webbläsaren
   (gäller besökare som varit på sajten minst en gång).
3. **site.js själv** – laddar alla moduler och varnar i konsolen om metadata saknas.

## Språk 🌐

Dropdown uppe till höger på alla sidor (svenska/engelska/tyska). Ordböcker i
`json/sprak/`. Allt översätts – även maskiner, recept och energitabeller.
Text som saknas i ordboken AUTO-ÖVERSÄTTS med gratis AI-API (MyMemory) och
cachas i webbläsaren. Ordboken har alltid företräde – flytta bra auto-fraser
dit för permanent kvalitet (loggas i konsolen, F12). Nytt språk = ny json-fil
+ en rad i `assets/sprak.js`.

## Receptgeneratorn 🧪

`generator.html` – välj ingredienser ur `json/ingredienser.json`, maskin + program
ur maskindatabasen, skriv stegen → generatorn räknar kostnad/näring och laddar ner
en FÄRDIG receptfil (korrekt metadata, site.js, design) + energirad för energi.json.
Ladda upp filen till recept/ → klart. Nya ingredienser läggs i ingredienser.json.

## Funktioner

- 🔍 Sök bland recept
- 🔧 Filtrera recept per maskin
- ⭐ Betygsätt recept + egna anteckningar (sparas i webbläsaren)
- 🖨️ Central A4-utskrift på alla sidor (assets/print.css – ändra en fil, alla sidor följer)
- 🆕 Ändringslogg på startsidan – hämtas automatiskt från GitHubs commit-historik (inget att underhålla!)
- 📱 PWA: installera som app, offline-stöd (manifest.json + sw.js + assets/app.js)
- 📤 Delningsknapp på alla sidor (mobil: delningsmeny, dator: kopiera länk)
- ⚡ Energikostnad per recept (effekt i maskin-JSON, elpris centralt i json/maskindatabas.json)
- 👨‍🍳 Kockläge på recepten: steg-för-steg i helskärm med jättetext, skärmen hålls tänd
- 🖼️ Optimerade bilder (~70% mindre, snabb laddning i köket)
- 📱 QR-kod på varje recept – skriv ut och skanna i köket
