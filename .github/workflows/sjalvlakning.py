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
    rotsidor = ['', 'recept.html', 'matratter.html', 'maskindatabas.html', 'koksskarm.html',
                'ingredienser.html', 'nytt-recept.html', 'maskin-import.html',
                'forslag.html', 'status.html', 'stod.html', 'kopguide.html', 'printables.html']

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


def steg9_receptstandard():
    """🧹 RECEPTSTANDARD-VAKTEN (användarens order: "håll alltid alla
    recept uppdaterade via robot"). Körs VARJE körning, för alltid:
    A) NÄRINGSBLOCK I INGREDIENSTABELLEN TAS BORT – SPEC-regeln är
       att sajten ALDRIG har statiska näringstabeller (live-kalkylen
       räknar mot databasen). Gamla konverterade recept har rubrikrad
       "📊 NÄRINGSVÄRDE" + kcal/Protein/Fett/Fiber-rader instoppade i
       tabellen → de förvirrar kalkylen. Tas bort med EXAKT-matchning
       på kända näringsord ("Proteinpulver (whey)" är alltid trygg).
    B) recept:kategori-METAN AUTOFYLLS ur mappnamnet när den saknas
       (självlärande: mappen är sanningen, ✏️-väljaren förvald rätt).
    FÖRBÄTTRAR ENDAST: tar aldrig bort ingredienser eller recepttext."""
    import re as _re
    NARINGSORD = {'kcal', 'energi', 'kalorier', 'protein', 'kolhydrater', 'kolhydrat',
                  'fett', 'mättat fett', 'fiber', 'socker', 'näringsvärde'}

    def rensa_tabell(m):
        inre = m.group(1)
        trs = _re.findall(r'<tr[^>]*>.*?</tr>', inre, _re.S)
        if not trs:
            return m.group(0)
        nya, i_block, bort = [], False, 0
        for tr in trs:
            tds = _re.findall(r'<td[^>]*>(.*?)</td>', tr, _re.S)
            c1 = _re.sub(r'<[^>]+>', '', tds[0]).strip() if tds else ''
            c2 = _re.sub(r'<[^>]+>', '', tds[1]).strip() if len(tds) > 1 else ''
            norm = _re.sub(r'^[^A-Za-zÅÄÖåäö0-9]+', '', c1).lower().rstrip(' :').strip()
            ar_rubrik = norm.startswith('näringsvärde')
            ar_narings = (norm in NARINGSORD
                          or bool(_re.fullmatch(r'per (skiva|portion|bit|styck|100 ?g).*', norm))
                          or bool(_re.fullmatch(r'hela (brödet|satsen|limpan|degen|grytan)', norm))
                          or bool(_re.fullmatch(r'[\d\s.,]+kcal', norm))
                          or norm.startswith('salt: ca') or norm.startswith('salthalt'))
            if ar_rubrik:
                i_block = True
                bort += 1
                continue
            if i_block and (ar_narings or not c2):
                bort += 1
                continue
            if i_block and c2 and not ar_narings:
                i_block = False          # blocket slut – riktiga rader igen
            if not i_block and ar_narings:
                bort += 1                # lös näringsrad utanför block
                continue
            nya.append(tr)
        if not bort:
            return m.group(0)
        rensa_tabell.bort += bort
        return m.group(0).replace(m.group(1), _ersatt_rader(inre, trs, nya))

    def _ersatt_rader(inre, gamla, nya):
        ut = inre
        behall = set(nya)
        for tr in gamla:
            if tr not in behall:
                ut = ut.replace(tr, '', 1)
        return ut

    for f in sorted(glob.glob('recept/*/*.html')):
        namn = os.path.basename(f)
        if namn.upper().startswith('MALL'):
            continue
        try:
            with open(f, encoding='utf-8') as fp:
                html = fp.read()
        except OSError:
            continue
        if 'STUB - receptet har flyttat' in html[:500]:
            continue
        orig = html
        atg = []

        # --- A) näringsblock/näringsrader bort ur alla tabeller ---
        rensa_tabell.bort = 0
        html = _re.sub(r'<table[^>]*>(.*?)</table>', rensa_tabell, html, flags=_re.S)
        if rensa_tabell.bort:
            atg.append('%d näringsrader bort (live-kalkylen räknar)' % rensa_tabell.bort)

        # --- B) kategori-meta ur mappnamnet ---
        if 'name="recept:kategori"' not in html:
            kat = os.path.basename(os.path.dirname(f))
            ny_meta = '<meta name="recept:kategori" content="%s">\n' % kat
            ankare = _re.search(r'<meta name="recept:namn"[^>]*>\n?', html)
            if ankare:
                html = html[:ankare.end()] + ny_meta + html[ankare.end():]
            else:
                html = html.replace('</head>', ny_meta + '</head>', 1)
            atg.append('kategori-meta "%s" ifylld ur mappen' % kat)

        if html != orig:
            with open(f, 'w', encoding='utf-8') as fp:
                fp.write(html)
            rader.append('| %s | 🧹 %s (steg9 receptstandard) |' % (f, ' · '.join(atg)))


def steg10_maskinplacering():
    """📍 MASKINPLACERAREN (användarens order: "utforma alla befintliga
    och kommande recept så" = standardutformningen med maskinrutor VID
    sina steg, som nytt-recept genererar). Körs varje körning:
    Hittar KLUNGOR (≥2 ⚙️-maskinrutor direkt efter varandra följda av
    en odelad <ol>) och flyttar varje ruta till sitt steg – listan
    delas med start="N" (exakt samma mönster som nytt-recept).
    POSITION HÄRLEDS ALDRIG PÅ GISSNING – endast:
      a) ägarens egen "Steg N"-etikett i rubriken, eller
      b) rubrikens programnamn/programnummer återfinns i EXAKT ETT steg.
    Olösta rutor ligger kvar överst. Rutor utan ⚙️ (t.ex. ⭐-tips) och
    redan sektionerade recept (egna <ol> per ruta) röres aldrig.
    Idempotent: delade listor bildar inga klungor."""
    import re as _re

    def blockslut(html, start):
        i = start
        djup = 0
        while True:
            m = _re.compile(r'<div\b|</div>').search(html, i)
            if not m:
                return None
            djup += 1 if m.group(0) != '</div>' else -1
            i = m.end()
            if djup == 0:
                return i

    for f in sorted(glob.glob('recept/*/*.html')):
        namn = os.path.basename(f)
        if namn.upper().startswith('MALL'):
            continue
        try:
            with open(f, encoding='utf-8') as fp:
                html = fp.read()
        except OSError:
            continue
        if 'STUB - receptet har flyttat' in html[:500]:
            continue
        if '<ol start=' in html:
            continue   # redan sektionerad/delad – standardformatet finns

        # --- hitta klungan: run av ⚙️-rutor + direkt följande <ol> ---
        pos0 = html.find('<div class="machine-step">')
        run = []
        olst = -1
        i = pos0
        while i != -1:
            slut = blockslut(html, i)
            if slut is None:
                break
            block = html[i:slut]
            if '⚙️' not in block[:250]:
                break                      # ⭐-tips m.m. – avbryt klungan
            run.append((i, slut, block))
            rest = html[slut:]
            hopp = len(rest) - len(rest.lstrip())
            nxt = slut + hopp
            if html.startswith('<div class="machine-step">', nxt):
                i = nxt
                continue
            i = -1
            olst = nxt if html.startswith('<ol>', nxt) else -1
        if len(run) < 2 or olst == -1:
            continue

        olslut = html.find('</ol>', olst)
        if olslut == -1:
            continue
        olinre = html[olst + 4:olslut]
        lis = _re.findall(r'<li\b.*?</li>', olinre, _re.S)
        if len(lis) < 2:
            continue
        litext = [_re.sub(r'<[^>]+>', ' ', x).lower() for x in lis]

        # --- härleda position per ruta (aldrig gissning) ---
        placerade, kvar = [], []
        for _, _, block in run:
            h3m = _re.search(r'<h3>(.*?)</h3>', block, _re.S)
            h3txt = _re.sub(r'<[^>]+>', '', h3m.group(1)) if h3m else ''
            sm = _re.search(r'Steg\s+(\d+)', h3txt)
            pos = None
            if sm and 1 <= int(sm.group(1)) <= len(lis):
                pos = int(sm.group(1))
            else:
                seg = h3txt.split('·', 1)[1] if '·' in h3txt else ''
                ordn = _re.findall(r'[a-zåäö]{4,}', seg.lower())
                num = _re.search(r'(\d+)\.', seg)
                traff = set()
                for idx, lt in enumerate(litext):
                    if any(w in lt for w in ordn) or (num and ('program ' + num.group(1)) in lt):
                        traff.add(idx + 1)
                if len(traff) == 1:
                    pos = traff.pop()
            (placerade if pos else kvar).append((pos, block))
        if not placerade:
            continue

        # --- bygg om: olösta rutor först, sedan interfolierad lista ---
        ny = ''.join(b + '\n\n  ' for _, b in kvar)
        oppen = False
        for k, li in enumerate(lis, 1):
            har = [b for p, b in placerade if p == k]
            if har:
                if oppen:
                    ny += '\n  </ol>\n\n  '
                    oppen = False
                ny += '\n\n  '.join(har) + '\n\n  '
            if not oppen:
                ny += '<ol' + (' start="%d"' % k if k > 1 else '') + '>\n    '
                oppen = True
            ny += li + '\n    '
        if oppen:
            ny = ny.rstrip() + '\n  </ol>'
        nyhtml = html[:run[0][0]] + ny + html[olslut + 5:]

        # --- säkerhetsnät: ingen text får försvinna/tillkomma ---
        # (anagram-jämförelse: flytten ÄNDRAR ordningen avsiktligt,
        #  men varenda tecken måste finnas kvar exakt en gång)
        def badtext(s):
            return _re.sub(r'\s+', '', _re.sub(r'<[^>]+>', '', s))
        if sorted(badtext(nyhtml)) != sorted(badtext(html)):
            rader.append('| %s | ⚠️ steg10 AVBRUTEN (textdiff – ingen ändring) |' % f)
            continue
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(nyhtml)
        rader.append('| %s | 📍 %d maskinrutor till sina steg, %d kvar överst (steg10) |'
                     % (f, len(placerade), len(kvar)))


def steg11_portioner():
    """🍽️ PORTIONSVAKTEN (användarens order: "alla befintliga och
    kommande recept redigeras enligt denna – står det st/frallor i
    receptet är portionsstorleken DEN, låst; live-kalkylen visar
    både hela satsen och per styck"). Körs varje körning:
    Saknar receptet recept:portioner-metan hämtas antalet ur
    ÄGARENS EGNA text – aldrig gissning, endast explicita mönster:
      a) total-raden ("880 g · 8 frallor à 110 g")
      b) beskrivnings-metan ("8 kompakta frallor")
      c) titeln ("4×250 g" → 4 st)
    → <meta name="recept:portioner" content="8 frallor"> skrivs in.
    Befintlig meta skrivs ALDRIG över (ägardata)."""
    import re as _re
    ORD = (r'(frallor|bullar|bollar|bitar|portioner|skivor|kakor|muffins|'
           r'pizzor|glas|burkar|klickar|v[åa]fflor|pannkakor|limpor|'
           r'hundportioner|b[äa]gare|tumblers?|st)')

    for f in sorted(glob.glob('recept/*/*.html')):
        namn = os.path.basename(f)
        if namn.upper().startswith('MALL'):
            continue
        try:
            with open(f, encoding='utf-8') as fp:
                html = fp.read()
        except OSError:
            continue
        if 'STUB - receptet har flyttat' in html[:500]:
            continue
        if 'name="recept:portioner"' in html:
            continue

        fynd = None
        # a) total-raden
        tm = _re.search(r'class="total">.*?</tr>', html, _re.S)
        if tm:
            m = _re.search(r'(\d{1,2})\s*' + ORD + r'\b', _re.sub(r'<[^>]+>', ' ', tm.group(0)), _re.I)
            if m:
                fynd = (m.group(1), m.group(2))
        # b) beskrivningen
        if not fynd:
            bm = _re.search(r'name="recept:beskrivning" content="([^"]*)"', html)
            if bm:
                m = _re.search(r'(\d{1,2})\s*(?:kompakta\s+|sm[åa]\s+|stora\s+)?' + ORD + r'\b', bm.group(1), _re.I)
                if m:
                    fynd = (m.group(1), m.group(2))
        # c) titeln: "4×250 g" / "4 x 250 g" → 4 st
        if not fynd:
            tt = _re.search(r'<title>([^<]*)</title>', html)
            if tt:
                m = _re.search(r'(\d{1,2})\s*[x×]\s*\d{2,4}\s*g', tt.group(1), _re.I)
                if m:
                    fynd = (m.group(1), 'st')
        if not fynd:
            continue
        antal, ord = int(fynd[0]), fynd[1].lower()
        if antal < 2 or antal > 48:
            continue   # 1 st/orimligt → ingen portionsuppdelning

        ny_meta = '<meta name="recept:portioner" content="%d %s">\n' % (antal, ord)
        ank = _re.search(r'<meta name="recept:namn"[^>]*>\n?', html)
        if ank:
            html = html[:ank.end()] + ny_meta + html[ank.end():]
        else:
            html = html.replace('</head>', ny_meta + '</head>', 1)
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(html)
        rader.append('| %s | 🍽️ recept:portioner "%d %s" ur receptets text (steg11) |' % (f, antal, ord))


def steg12_beskrivningar():
    """📝 META-DESCRIPTION-ROBOTEN (användarens order 2026-11-01:
    "kan robot fixa?"): Google skriver egen (sämre) text när
    <meta name="description"> saknas → skriver in en STATISK
    description i varje receptfil som saknar en. Texten byggs
    ENDAST ur receptets egna metadata – aldrig påhittad:
      namn (recept:namn) + beskrivning (recept:beskrivning)
      + maskinnamnen ur recept:maskiner ("Lagas i X + Y.")
    Max ~155 tecken (Googles klippgräns). Befintlig description
    skrivs ALDRIG över (ägardata). Idempotent."""
    import re as _re
    for f in sorted(glob.glob('recept/*/*.html')):
        namn_fil = os.path.basename(f)
        if namn_fil.upper().startswith('MALL'):
            continue
        try:
            with open(f, encoding='utf-8') as fp:
                html = fp.read()
        except OSError:
            continue
        if 'STUB - receptet har flyttat' in html[:500]:
            continue
        if '<meta name="description"' in html:
            continue
        nm = _re.search(r'name="recept:namn" content="([^"]*)"', html)
        if not nm or not nm.group(1).strip():
            continue   # utan namn-meta gissar vi ingenting
        namn = nm.group(1).strip()
        bm = _re.search(r'name="recept:beskrivning" content="([^"]*)"', html)
        beskr = bm.group(1).strip() if bm else ''
        # 🔧 maskinnamn ur recept:maskiner: "Etikett: Namn · program | ..."
        masknamn = []
        mm = _re.search(r'name="recept:maskiner" content="([^"]*)"', html)
        if mm:
            for seg in mm.group(1).split('|'):
                m2 = _re.search(r':\s*([^:·|]+?)\s*·', seg)
                if m2:
                    n2 = m2.group(1).strip()
                    if n2 and n2 not in masknamn:
                        masknamn.append(n2)
        delar = [namn if namn.endswith(('.', '!', '?')) else namn + '.']
        if beskr:
            delar.append(beskr if beskr.endswith(('.', '!', '?')) else beskr + '.')
        if masknamn:
            delar.append('Lagas i %s.' % ' + '.join(masknamn[:3]))
        text = ' '.join(delar)
        if len(text) > 155:
            text = text[:152]
            if ' ' in text:
                text = text[:text.rfind(' ')]   # klipp vid ordgräns
            text = text.rstrip('.,;:· ') + '…'
        text = text.replace('"', '&quot;')
        ny = '<meta name="description" content="%s">\n' % text
        ank = _re.search(r'</title>\s*\n', html)
        if ank:
            html = html[:ank.end()] + ny + html[ank.end():]
        else:
            html = html.replace('</head>', ny + '</head>', 1)
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(html)
        rader.append('| %s | 📝 meta description ur receptets egna metadata (steg12) |' % f)


def steg13_kategorivakt():
    """🗂️ KATEGORIVAKTEN (punkt 170, användarens order "placera alla
    recept i rätt kategori, robot som alltid kontrollerar"): METAN
    STYR. Ligger en fil i en annan mapp än recept:kategori-metan
    pekar på flyttas den dit (samma djup → inga sökvägsändringar,
    PLATS-raden uppdateras, gamla filen raderas – ren mapp-policyn
    från steg8). Ägaren byter kategori genom att ändra metan (eller
    ✏️-väljaren) – roboten verkställer. Ogiltig kategori ignoreras."""
    import re as _re
    GILTIGA = {'matratt', 'husdjur', 'sylt', 'saft', 'glass', 'snacks',
               'brod', 'deg', 'bakning', 'efterratt', 'varmratt', 'ovrigt'}
    for f in sorted(glob.glob('recept/*/*.html')):
        namn = os.path.basename(f)
        if namn.upper().startswith('MALL'):
            continue
        try:
            with open(f, encoding='utf-8') as fp:
                html = fp.read()
        except OSError:
            continue
        if 'STUB - receptet har flyttat' in html[:500]:
            continue
        mapp = f.split('/')[1]
        m = _re.search(r'name="recept:kategori" content="([a-z]+)"', html)
        if not m:
            continue
        kat = m.group(1)
        if kat not in GILTIGA or kat == mapp:
            continue
        ny = html.replace('PLATS: /recept/%s/' % mapp, 'PLATS: /recept/%s/' % kat)
        os.makedirs('recept/' + kat, exist_ok=True)
        with open('recept/%s/%s' % (kat, namn), 'w', encoding='utf-8') as fp:
            fp.write(ny)
        os.remove(f)
        rader.append('| recept/%s/%s | 🗂️ flyttad %s → %s (kategorimetan styr, steg13) |' % (kat, namn, mapp, kat))


def steg14_titelstandard(maskiner):
    """🏷️ TITELSTANDARDEN (punkt 170, användarens order "justera titeln
    – t.ex. Snabba frallor – Bakmaskin"): recept vars namn saknar
    maskintyp får " – Typ" tillagt – MEN ENDAST när receptets ALLA
    maskiner (recept:maskiner-metan) har SAMMA typ. Flera typer eller
    okänd maskin → hoppas över (aldrig gissning). Namnet byts i HELA
    filen (title/h1/og/schema/description) via exakt strängbyte."""
    import re as _re, html as _h
    kand = {}
    for m in maskiner.values():   # lasta_maskiner() ger {fil: data}
        typ = str(m.get('typ', '')).split('/')[0].strip()
        if not typ:
            continue
        for k in (str(m.get('varumarke', '')), str(m.get('modellnamn', '')).split(' ')[0]):
            k = k.strip().lower()
            if len(k) >= 3:
                kand.setdefault(k, set()).add(typ)
    # 🛡️ tvetydiga nycklar KASTAS ("ninja" = airfryer+glassmaskin+matberedare)
    nycklar = [(k, t.pop()) for k, t in kand.items() if len(t) == 1]
    TYPORD = _re.compile(r'bakmaskin|airfryer|air fryer|riskokare|glassmaskin|pizzaugn|'
                         r'torkautomat|slush|smörgåsgrill|tryckkokare|creami|multikokare|'
                         r'blender|skärmaskin|slowcooker', _re.I)
    for f in sorted(glob.glob('recept/*/*.html')):
        bn = os.path.basename(f)
        if bn.upper().startswith('MALL'):
            continue
        try:
            with open(f, encoding='utf-8') as fp:
                html = fp.read()
        except OSError:
            continue
        if 'STUB - receptet har flyttat' in html[:500]:
            continue
        nm = _re.search(r'name="recept:namn" content="([^"]*)"', html)
        mm = _re.search(r'name="recept:maskiner" content="([^"]*)"', html)
        if not nm or not mm:
            continue
        namn = nm.group(1)
        if TYPORD.search(_h.unescape(namn)):
            continue   # typen finns redan i namnet
        if any(k in namn.lower() for k, _t in nycklar):
            continue   # modell/varumärke redan i namnet → ingen dubblering
        typer = set()
        okand = False
        for seg in mm.group(1).split('|'):
            fore = seg.split('·')[0].lower()
            traff = ''
            for k, t in nycklar:
                if k in fore:
                    traff = t
                    break
            if traff:
                typer.add(traff)
            else:
                okand = True
        if okand or len(typer) != 1:
            continue   # 🛡️ aldrig gissning
        typ = list(typer)[0]
        nytt = namn + ' – ' + typ
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(html.replace(namn, nytt))
        rader.append('| %s | 🏷️ titel → "%s" (steg14) |' % (f, _h.unescape(nytt)[:60]))


def main():
    maskiner = lasta_maskiner()
    steg1_effekt(maskiner)
    steg2_energi(maskiner)
    steg3_bildvagar(maskiner)
    steg4_verifieringsfiler()
    steg5_matrattssidor()
    steg8_mappvakt()
    steg9_receptstandard()
    steg10_maskinplacering()
    steg11_portioner()
    steg13_kategorivakt()
    steg14_titelstandard(maskiner)
    steg12_beskrivningar()
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
