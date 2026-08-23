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

    for f in glob.glob('recept/*.html'):
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
    for f in glob.glob('recept/*'):
        if re.match(r'^(google|bingsiteauth|yandex_)', os.path.basename(f), re.I):
            os.remove(f)
            rader.append('| %s | 🗑️ verifieringsfil borttagen ur recept/ (hör hemma i roten) |' % os.path.basename(f))


def main():
    maskiner = lasta_maskiner()
    steg1_effekt(maskiner)
    steg2_energi(maskiner)
    steg3_bildvagar(maskiner)
    steg4_verifieringsfiler()

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
