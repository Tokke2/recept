# ============================================================
# PLATS: /.github/workflows/sjalvlakning.py
# ============================================================
# 🩹 SJÄLVLÄKNINGSROBOT – Mitt Maskinkök
# ============================================================
# Gör sajten SJÄLVSTYRD: hittar och lagar datahål automatiskt.
# Körs varje natt + vid push av recept/maskiner + manuellt.
#
#   1. ⚡ EFFEKT_W-VAKT: maskinfil saknar effekt_w? → hämtas ur
#      central reservtabell (kända maskiner) eller typ-standard,
#      märkt med källa. ALDRIG skriva över befintligt värde.
#   2. ⚡ ENERGI-BERÄKNING PER RECEPT: recept som saknas i
#      json/energi.json får poster automatiskt:
#      · recept:maskiner-metan tolkas ("Tillagning: Clatronic
#        BBA 3774 · 11. Sandwich 3:00 h") → maskin-id matchas
#        (namn/modell/alias) + tid ur metan (3:00 h → 180 min)
#      · ingen tid i metan? → programmets standardtid ur
#        maskinfilen · annars hoppas över (aldrig gissa vilt)
#   3. 🖼️ BILDVÄGS-VAKT: maskinfilens "bild" pekar på fil som
#      inte finns men annan ändelse finns (jpg/png/webp) → rättas.
#   4. 🗑️ VERIFIERINGSFILER i recept/ (google*/bing*) → tas bort
#      (de hör hemma i roten; kopior blir trasiga "recept").
#   5. 🍽️ MATRÄTTSSIDOR: rätt i json/matratter.json saknar sin
#      ratter/<id>.html? → sidan byggs automatiskt (samma skelett
#      som matratter.html:s byggRattSida). Sidor vars rätt tagits
#      bort ur JSON:en städas bort. Körs även vid push av
#      json/matratter.json → sidan finns inom ~30 sek.
# FÖRBÄTTRAR ENDAST – skriver aldrig över ägarens data.
# Logg: backup/sjalvlakning-LOGG.md
# ============================================================
import glob
import json
import os
import re
from datetime import date

LOGG = 'backup/sjalvlakning-LOGG.md'
rader = []

# Reservtabell: kända maskiners effekter (om filen tappat värdet)
KANDA_EFFEKTER = {
    'clatronic-bba3774': 550, 'cosori-twinfry-10l': 2400, 'greenpan-frost': 190,
    'klaif-pizzaugn': 1200, 'krups-fdk452': 850, 'linkchef-grinder': 300,
    'midea-mb-fs5017': 860, 'ninja-af500eucp': 2470, 'ninja-detect-power': 1200,
    'ninja-nc502eu': 800, 'silonn-ismaskin': 160, 'wmf-snacktogo': 250,
    'yumasia-sakura': 610,
}
TYP_STANDARD = [
    (r'airfry', 1800), (r'riskokare|multikok', 700), (r'bakmaskin|bröd', 600),
    (r'glassmaskin|frozen', 200), (r'torkautomat|dehydrator', 300),
    (r'ismaskin', 150), (r'pizzaugn', 1300), (r'blender|mixer', 1000),
    (r'smörgåsgrill', 800), (r'kvarn', 200),
]


def lasta_maskiner():
    ut = {}
    for f in glob.glob('json/maskiner/*.json'):
        if 'MALL' in f.upper():
            continue
        try:
            ut[f] = json.load(open(f, encoding='utf-8'))
        except Exception as e:
            rader.append('| %s | ❌ trasig JSON: %s |' % (os.path.basename(f), e))
    return ut


def steg1_effekt(maskiner):
    for f, m in maskiner.items():
        if m.get('effekt_w'):
            continue
        mid = m.get('id', '')
        w = KANDA_EFFEKTER.get(mid, 0)
        kalla = 'central reservtabell'
        if not w:
            typ = str(m.get('typ', '')).lower()
            for monster, std in TYP_STANDARD:
                if re.search(monster, typ):
                    w = std
                    kalla = 'typstandard (%s) – UPPSKATTAD' % m.get('typ', '')
                    break
        if not w:
            continue
        m['effekt_w'] = w
        m['effekt_kalla'] = 'självläkning: ' + kalla
        json.dump(m, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        rader.append('| %s | ⚡ effekt_w %d W ifylld (%s) |' % (os.path.basename(f), w, kalla))


def tid_till_min(s):
    """'3:00 h'→180 · '1:30 h'→90 · '90 min'→90 · '8 h'→480 · '45–90 min'→snitt 68"""
    s = s.replace(',', '.')
    m = re.search(r'(\d+):(\d+)\s*h', s)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))
    m = re.search(r'(\d+(?:\.\d+)?)\s*[–\-]\s*(\d+(?:\.\d+)?)\s*(min|h|tim)', s)
    if m:
        a, b = float(m.group(1)), float(m.group(2))
        snitt = (a + b) / 2
        return round(snitt * 60) if m.group(3) != 'min' else round(snitt)
    m = re.search(r'(\d+(?:\.\d+)?)\s*(min)\b', s)
    if m:
        return round(float(m.group(1)))
    m = re.search(r'(\d+(?:\.\d+)?)\s*(h|tim)\b', s)
    if m:
        return round(float(m.group(1)) * 60)
    return 0


def matcha_maskin(text, maskiner):
    """Matcha maskintext mot id via namn/varumärke+modell/alias."""
    t = text.lower()
    bast, poang = None, 0
    for m in maskiner.values():
        kandidater = [
            ((m.get('varumarke', '') + ' ' + m.get('modellnamn', '')).strip(), 3),
            (m.get('namn', ''), 2),
        ] + [(a, 3) for a in m.get('alias', [])]
        for namn, p in kandidater:
            n = namn.lower().strip()
            if n and len(n) >= 5 and n in t and p > poang:
                bast, poang = m.get('id'), p
    return bast


def steg2_energi(maskiner):
    try:
        energi = json.load(open('json/energi.json', encoding='utf-8'))
    except Exception:
        energi = {'_plats': '/json/energi.json  (central energidata per recept)', 'recept': {}}
    rec = energi.setdefault('recept', {})
    andrad = False

    for f in glob.glob('recept/*.html') + glob.glob('recept/*/*.html'):
        namn = os.path.basename(f)
        if 'MALL' in namn.upper() or re.match(r'^(google|bingsiteauth|yandex_)', namn, re.I):
            continue
        if namn in rec:
            continue
        try:
            html = open(f, encoding='utf-8', errors='ignore').read()
        except Exception:
            continue
        mm = re.search(r'name="recept:maskiner"\s+content="([^"]*)"', html)
        if not mm:
            continue
        poster = []
        for del_ in mm.group(1).split('|'):
            del_ = del_.strip()
            if not del_:
                continue
            moment = del_.split(':')[0].strip() if ':' in del_ else 'Tillagning'
            mid = matcha_maskin(del_, maskiner)
            if not mid:
                continue
            minuter = tid_till_min(del_)
            if not minuter:
                # programmets standardtid ur maskinfilen
                mfil = next((m for m in maskiner.values() if m.get('id') == mid), None)
                if mfil:
                    for p in mfil.get('program', []):
                        pn = str(p.get('namn', '')).lower()
                        if pn and any(o in del_.lower() for o in pn.split() if len(o) > 3):
                            minuter = tid_till_min(str(p.get('standardtid', '')))
                            if minuter:
                                break
            if minuter:
                poster.append({'maskin': mid, 'min': minuter,
                               'moment': moment + ' (🤖 auto ur receptets meta)'})
        if poster:
            rec[namn] = poster
            andrad = True
            rader.append('| %s | ⚡ energidata skapad: %s |' %
                         (namn, ', '.join('%s %d min' % (p['maskin'], p['min']) for p in poster)))

    if andrad:
        json.dump(energi, open('json/energi.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def steg3_bildvagar(maskiner):
    for f, m in maskiner.items():
        bild = m.get('bild', '')
        if bild and os.path.exists(bild):
            continue
        mid = m.get('id', '')
        for and_ in ('jpg', 'png', 'webp'):
            kandidat = 'images/%s.%s' % (mid, and_)
            if os.path.exists(kandidat):
                if m.get('bild') != kandidat:
                    m['bild'] = kandidat
                    json.dump(m, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
                    rader.append('| %s | 🖼️ bildväg rättad → %s |' % (os.path.basename(f), kandidat))
                break


def steg4_verifieringsfiler():
    for f in glob.glob('recept/*') + glob.glob('recept/*/*'):
        if re.match(r'^(google|bingsiteauth|yandex_)', os.path.basename(f), re.I):
            os.remove(f)
            rader.append('| %s | 🗑️ verifieringsfil borttagen ur recept/ (hör hemma i roten) |' % os.path.basename(f))


RATT_MALL = '''<!DOCTYPE html>
<!-- PLATS: /ratter/{id}.html  (ratter-mappen - matratt, renderas av assets/ratt.js) -->
<html lang="sv">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{emoji} {namn} - Matratt</title>
<meta name="ratt:namn" content="{namn}">
<meta name="ratt:emoji" content="{emoji}">
<meta name="ratt:delar" content="{delar}">
<style>
  :root {{ --bg:#f6f3ee; --card:#fff; --accent:#c0392b; --accent2:#e67e22; --dark:#2c3e50; --muted:#7f8c8d; }}
  * {{ box-sizing:border-box; margin:0; padding:0; }}
  body {{ font-family:'Segoe UI',system-ui,sans-serif; background:var(--bg); color:var(--dark); padding:24px; max-width:900px; margin:0 auto; }}
  header {{ background:linear-gradient(135deg,#e67e22,#f1c40f); color:#fff; border-radius:16px; padding:26px 30px; margin-bottom:20px; }}
  header h1 {{ font-size:1.6rem; margin-bottom:4px; }}
  header p {{ opacity:.95; font-size:.92rem; }}
  .card {{ background:var(--card); border-radius:14px; padding:20px 24px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,.07); }}
  h2 {{ font-size:1.1rem; margin-bottom:10px; }}
  td.num, th.num {{ text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }}
  td {{ padding:7px 10px; border-bottom:1px solid #eee; }}
  a {{ color:var(--accent); }}
  footer {{ text-align:center; color:var(--muted); font-size:.8rem; margin-top:20px; }}
</style>
</head>
<body>

<header>
  <h1>{emoji} {namn}</h1>
  <p>Komplett matratt &middot; delar &amp; naring raknas live nedan</p>
</header>

<div id="ratt-innehall"><p style="color:var(--muted);">&#9203; Raknar naring &amp; pris live...</p></div>

<footer>Matratt ur Mitt Maskinkok &middot; <a href="../matratter.html">Alla matratter</a></footer>

<script src="../assets/site.js"></script>
</body>
</html>
'''


def steg5_matrattssidor():
    """🍽️ Bygg saknade ratter/<id>.html ur json/matratter.json + städa
    sidor vars rätt tagits bort. Sidan innehåller endast metadata –
    assets/ratt.js ritar allt (Centralt-principen)."""
    if not os.path.exists('json/matratter.json'):
        return
    try:
        with open('json/matratter.json', encoding='utf-8') as fp:
            db = json.load(fp)
    except (json.JSONDecodeError, OSError):
        return
    ratter = db.get('ratter') or []
    os.makedirs('ratter', exist_ok=True)
    ids = set()
    for r in ratter:
        rid = str(r.get('id') or '').strip()
        namn = str(r.get('namn') or '').strip()
        delar = r.get('delar') or []
        if not rid or not namn or not delar:
            continue
        ids.add(rid)
        mal = 'ratter/%s.html' % rid
        if os.path.exists(mal):
            continue  # aldrig skriva över befintlig sida (kan vara handjusterad)
        delstr = '|'.join('%s:%s' % (d.get('fil', ''), d.get('g', 0))
                          for d in delar if d.get('fil') and d.get('g'))
        if not delstr:
            continue
        html = RATT_MALL.format(
            id=rid,
            namn=namn.replace('"', '&quot;'),
            emoji=str(r.get('emoji') or '\U0001F37D\uFE0F'),
            delar=delstr.replace('"', '&quot;'))
        with open(mal, 'w', encoding='utf-8') as fp:
            fp.write(html)
        rader.append('| ratter/%s.html | 🍽️ maträttssida byggd (saknades för "%s") |' % (rid, namn))
    # städa sidor vars rätt inte längre finns i JSON:en
    for f in glob.glob('ratter/*.html'):
        base = os.path.splitext(os.path.basename(f))[0]
        if base not in ids:
            os.remove(f)
            rader.append('| ratter/%s.html | 🗑️ borttagen (rätten finns ej i matratter.json) |' % base)


def steg6_sitemap():
    """🗺️ SITEMAP AUTOUPPDATERAS (användarens fråga "autoupdateras?"
    → nu JA): sitemap.xml byggs om ur filerna som faktiskt finns –
    rotsidor + recept/*.html + ratter/*.html. lastmod = filens senaste
    git-datum (reserv: dagens datum). Skrivs ENDAST om innehållet
    ändrats (ingen onödig commit). Pensionerade sidor (generator.html)
    och mallar tas aldrig med."""
    bas = 'https://tokke2.github.io/recept/'
    rotsidor = ['', 'recept.html', 'matratter.html', 'maskindatabas.html',
                'ingredienser.html', 'nytt-recept.html', 'maskin-import.html',
                'forslag.html', 'status.html']

    def gitdatum(path):
        try:
            import subprocess
            d = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', path],
                               capture_output=True, text=True, timeout=10).stdout.strip()
            return d or str(date.today())
        except Exception:
            return str(date.today())

    poster = []
    for p in rotsidor:
        fil = p or 'index.html'
        if os.path.exists(fil):
            poster.append((bas + p, gitdatum(fil)))
    for mapp in ('recept', 'ratter'):
        for f in sorted(glob.glob('%s/*.html' % mapp) + glob.glob('%s/*/*.html' % mapp)):
            namn = os.path.basename(f)
            if namn.upper().startswith('MALL'):
                continue
            try:  # 📁 stubbar (flytt-vidarebefordringar) ska inte indexeras
                with open(f, encoding='utf-8') as fp2:
                    if 'STUB - receptet har flyttat' in fp2.read(400):
                        continue
            except OSError:
                pass
            from urllib.parse import quote
            rel = f.split('/', 1)[1]
            poster.append((bas + mapp + '/' + '/'.join(quote(x) for x in rel.split('/')), gitdatum(f)))

    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<!-- PLATS: /sitemap.xml (AUTOGENERERAD av sjalvlakning.py steg6 - redigera inte for hand) -->\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
           ''.join('  <url><loc>%s</loc><lastmod>%s</lastmod></url>\n' % (u, d)
                   for u, d in poster) +
           '</urlset>\n')
    gammal = ''
    if os.path.exists('sitemap.xml'):
        with open('sitemap.xml', encoding='utf-8') as fp:
            gammal = fp.read()
    if xml != gammal:
        with open('sitemap.xml', 'w', encoding='utf-8') as fp:
            fp.write(xml)
        rader.append('| sitemap.xml | 🗺️ omgenererad (%d adresser) |' % len(poster))


def steg7_receptindex():
    """📁 json/recept-index.json AUTOUNDERHÅLLS: central fillista med
    kategorisökvägar ("deg/pizzadeg...html") som ALLA moduler läser
    (GitHub-API:t är bara reserv). Stubbar/MALL hoppas. Skrivs endast
    vid ändring."""
    poster = []
    for f in sorted(glob.glob('recept/*.html') + glob.glob('recept/*/*.html')):
        namn = os.path.basename(f)
        if namn.upper().startswith('MALL'):
            continue
        try:
            with open(f, encoding='utf-8') as fp:
                if 'STUB - receptet har flyttat' in fp.read(400):
                    continue
        except OSError:
            continue
        rel = f.split('/', 1)[1]
        kat = rel.split('/')[0] if '/' in rel else ''
        poster.append({'fil': rel, 'kategori': kat})
    for f in sorted(glob.glob('recept/*.pdf') + glob.glob('recept/*/*.pdf')):
        rel = f.split('/', 1)[1]
        kat = rel.split('/')[0] if '/' in rel else ''
        poster.append({'fil': rel, 'kategori': kat})
    ny = {'_plats': '/json/recept-index.json (AUTOGENERERAD av sjalvlakning.py steg7)',
          'recept': poster}
    gammal = None
    if os.path.exists('json/recept-index.json'):
        try:
            with open('json/recept-index.json', encoding='utf-8') as fp:
                gammal = json.load(fp)
        except (json.JSONDecodeError, OSError):
            pass
    if gammal != ny:
        with open('json/recept-index.json', 'w', encoding='utf-8') as fp:
            json.dump(ny, fp, ensure_ascii=False, indent=1)
        rader.append('| json/recept-index.json | 📁 omgenererad (%d recept) |' % len(poster))


KAT_ORD = [
    ('hund', 'husdjur'), ('husdjur', 'husdjur'),
    ('sylt', 'sylt'), ('marmelad', 'sylt'),
    ('smulpaj', 'bakning'), ('paj', 'bakning'),
    ('glass', 'glass'), ('sorbet', 'glass'),
    ('shake', 'saft'), ('smoothie', 'saft'), ('slush', 'saft'), ('drink', 'saft'),
    ('saft', 'saft'), ('juice', 'saft'), ('dryck', 'saft'),
    ('snacks', 'snacks'), ('chips', 'snacks'), ('jerky', 'snacks'),
    ('pizzadeg', 'deg'), ('smuldeg', 'deg'),
    ('bröd', 'brod'), ('brod', 'brod'), ('limpa', 'brod'), ('pita', 'brod'), ('toast', 'brod'),
    ('deg', 'deg'),
    ('kaka', 'bakning'), ('muffin', 'bakning'), ('bulle', 'bakning'), ('bakning', 'bakning'),
    ('efterrätt', 'efterratt'), ('dessert', 'efterratt'),
    ('gryta', 'varmratt'), ('soppa', 'varmratt'), ('sås', 'varmratt'), ('sas', 'varmratt'),
    ('kyckling', 'varmratt'), ('kött', 'varmratt'), ('fisk', 'varmratt'), ('ris', 'varmratt'),
]


def steg8_mappvakt():
    """📁 MAPPVAKTEN (användarens regel: INGA lösa html-filer i recept/-
    roten): lösa recept flyttas till sin kategorimapp – kategori ur
    recept:kategori-metan, annars gissning på filnamn+titel+taggar,
    annars ovrigt/. Relativa sökvägar skrivs om (../ → ../../).
    Gamla flytt-stubbar RADERAS (användaren valde ren mapp före
    redirects). MALL-filer rörs aldrig."""
    import re as _re
    for f in sorted(glob.glob('recept/*.html')):
        namn = os.path.basename(f)
        if namn.upper().startswith('MALL') or namn.lower().startswith(('google', 'bingsiteauth', 'yandex_')):
            continue
        try:
            with open(f, encoding='utf-8') as fp:
                html = fp.read()
        except OSError:
            continue
        if 'STUB - receptet har flyttat' in html[:500]:
            os.remove(f)
            rader.append('| recept/%s | 🗑️ stub raderad (ren rotmapp) |' % namn)
            continue
        m = _re.search(r'name="recept:kategori" content="([a-z]+)"', html)
        kat = m.group(1) if m else ''
        if not kat:
            m2 = _re.search(r'name="recept:(?:namn|taggar)" content="([^"]*)"', html)
            text = (namn + ' ' + (m2.group(1) if m2 else '')).lower()
            text = _re.sub(r'saftig\w*', '', text)   # "saftig" får ALDRIG trigga saft/
            orden = _re.split(r'[^a-zåäö]+', text)
            for ord_, k in KAT_ORD:
                traff = any(o == ord_ or (len(o) > len(ord_) and o.endswith(ord_))
                            for o in orden if o)
                if traff:
                    kat = k
                    break
        kat = kat or 'ovrigt'
        ny = _re.sub(r'((?:href|src|content)=["\'])\.\./', r'\1../../', html)
        ny = ny.replace("url('../", "url('../../").replace('url("../', 'url("../../')
        ny = ny.replace('PLATS: /recept/' + namn, 'PLATS: /recept/%s/%s' % (kat, namn))
        os.makedirs('recept/' + kat, exist_ok=True)
        with open('recept/%s/%s' % (kat, namn), 'w', encoding='utf-8') as fp:
            fp.write(ny)
        os.remove(f)
        rader.append('| recept/%s | 📁 flyttad till %s/ (mappvakten) |' % (namn, kat))


def main():
    maskiner = lasta_maskiner()
    steg1_effekt(maskiner)
    steg2_energi(maskiner)
    steg3_bildvagar(maskiner)
    steg4_verifieringsfiler()
    steg5_matrattssidor()
    steg8_mappvakt()
    steg6_sitemap()
    steg7_receptindex()

    os.makedirs('backup', exist_ok=True)
    if not os.path.exists(LOGG):
        with open(LOGG, 'w', encoding='utf-8') as fp:
            fp.write('<!-- PLATS: /backup/sjalvlakning-LOGG.md (skrivs av sjalvlakning.py) -->\n'
                     '# 🩹 Självläkningslogg\n\n| Fil | Åtgärd |\n|---|---|\n')
    with open(LOGG, 'a', encoding='utf-8') as fp:
        if rader:
            fp.write('\n**%s**\n\n' % date.today() + '\n'.join(rader) + '\n')
    print('Självläkning klar: %d åtgärder' % len(rader))
    for r in rader:
        print(' ', r)


if __name__ == '__main__':
    main()
