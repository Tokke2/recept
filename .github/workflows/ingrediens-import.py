# ============================================================
# PLATS: /.github/workflows/ingrediens-import.py
# ============================================================
# INGREDIENS-ROBOTEN - Mitt Maskinkok
# ============================================================
# Klistra in produktlankar (Willys/Hemkop) i json/ingrediens-lankar.txt
# -> roboten hamtar RIKTIGT pris (jamforpris kr/kg) + naringsvarden
#    per 100 g direkt fran butikens eget API och uppdaterar
#    json/ingredienser.json automatiskt.
#
# En lank per rad. Rader som borjar med # ignoreras.
# Finns ingrediensen redan (samma lank eller samma namn) UPPDATERAS
# den istallet for att dubbleras. Lankfilen toms efter lyckad import.
#
# Stodda butiker (samma Axfood-API):
#   https://www.willys.se/produkt/..._ST
#   https://www.hemkop.se/produkt/..._ST
# ============================================================
import json
import os
import re
import urllib.request
from datetime import date

LANKFIL = 'json/ingrediens-lankar.txt'
DBFIL = 'json/ingredienser.json'

HEADER = """# ============================================================
# PLATS: /json/ingrediens-lankar.txt
# ============================================================
# KLISTRA IN PRODUKTLANKAR HAR - en per rad - och committa.
# Roboten hamtar pris (kr/kg) + naring per 100 g automatiskt
# och lagger in dem i json/ingredienser.json. Filen toms sen.
#
# Stodda butiker: willys.se och hemkop.se, t.ex:
# https://www.willys.se/produkt/Turkisk-Yoghurt-10procent-100486886_ST
# ============================================================
"""


def slug(s):
    s = s.lower()
    for a, b in [('å', 'a'), ('ä', 'a'), ('ö', 'o'), ('é', 'e')]:
        s = s.replace(a, b)
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s or 'okand'


def fetch_product(url):
    """Produktlank -> (post, felmeddelande)."""
    m = re.search(r'(\d+_(?:ST|KG|EA))\b', url)
    if not m:
        return None, 'Ingen produktkod (..._ST) hittades i lanken'
    code = m.group(1)
    domain = 'hemkop.se' if 'hemkop' in url else 'willys.se'
    api = 'https://www.%s/axfood/rest/p/%s' % (domain, code)
    try:
        req = urllib.request.Request(api, headers={'User-Agent': 'Mozilla/5.0'})
        d = json.load(urllib.request.urlopen(req, timeout=25))
    except Exception as e:
        return None, 'Kunde inte hamta: %s' % e

    namn = (d.get('name') or '').strip()
    if not namn:
        return None, 'Produkten saknar namn i API-svaret'

    # Jamforpris = pris per kg/l (bast for receptberakning)
    pris = None
    enhet = (d.get('comparePriceUnit') or '').strip().lower()
    cp = (d.get('comparePrice') or '').replace('kr', '').replace(',', '.').strip()
    try:
        pris = round(float(cp), 2)
    except ValueError:
        pass
    if pris is None:
        try:
            pris = round(float(d.get('priceValue')), 2)
            enhet = 'st'
        except (TypeError, ValueError):
            return None, 'Hittade inget pris'

    # Naring per 100 g ur nutrientHeaders (rikaste strukturen)
    naring = {}
    for h in (d.get('nutrientHeaders') or []):
        if str(h.get('nutrientBasisQuantity')) != '100':
            continue
        for det in h.get('nutrientDetails', []):
            t = det.get('nutrientTypeCode')
            u = det.get('measurementUnitCode')
            try:
                v = float(str(det.get('quantityContained')).replace(',', '.'))
            except (TypeError, ValueError):
                continue
            if t == 'energi' and u == 'kilokalori':
                naring.setdefault('kcal', v)
            elif t == 'fett':
                naring.setdefault('fett', v)
            elif t == 'kolhydrat':
                naring.setdefault('kolhydrat', v)
            elif t == 'protein':
                naring.setdefault('protein', v)
            elif t == 'fiber':
                naring.setdefault('fiber', v)
        if naring:
            break

    post = {
        'id': slug(namn),
        'namn': namn,
        'pris_kr_per_kg': pris,
        'kcal': naring.get('kcal', 0),
        'protein': naring.get('protein', 0),
        'kolhydrat': naring.get('kolhydrat', 0),
        'fett': naring.get('fett', 0),
        'fiber': naring.get('fiber', 0),
        'lank': url,
        'kalla': '%s (jamforpris kr/%s)' % (domain, enhet or 'kg'),
        'uppdaterad': date.today().isoformat()
    }
    varning = None
    if enhet and enhet not in ('kg', 'kilogram'):
        varning = 'jamforpris per %s (inte kg) - kontrollera' % enhet
    if not naring:
        varning = ((varning + ' + ') if varning else '') + 'naringsvarden saknades hos butiken'
    return post, varning


def main():
    if not os.path.exists(LANKFIL):
        print('Ingen lankfil - inget att gora.')
        return

    rader = [r.strip() for r in open(LANKFIL, encoding='utf-8').read().splitlines()]
    lankar = [r for r in rader if r and not r.startswith('#') and 'http' in r]
    # Stada bort kopieringsartefakter: [text](url) -> url
    lankar = [re.sub(r'^\[.*?\]\((https?://[^)]+)\).*$', r'\1', l) for l in lankar]

    if not lankar:
        print('Lankfilen ar tom - inget att gora.')
        return

    db = json.load(open(DBFIL, encoding='utf-8'))
    items = db.setdefault('ingredienser', [])
    rapport = []

    for lank in lankar:
        post, varning = fetch_product(lank)
        if post is None:
            rapport.append('FEL  %s -> %s' % (lank[:60], varning))
            continue
        # Uppdatera om samma lank, id ELLER liknande namn redan finns
        def norm(s):
            return re.sub(r'[^a-z0-9]', '', slug(str(s)))
        hittad = False
        for i, g in enumerate(items):
            if (g.get('lank') == post['lank'] or g.get('id') == post['id']
                    or norm(g.get('namn')).startswith(norm(post['namn']))
                    or norm(post['namn']).startswith(norm(g.get('namn')))):
                post['id'] = g['id']  # behall gammalt id (recept kan peka pa det)
                items[i] = post
                hittad = True
                break
        if not hittad:
            items.append(post)
        rapport.append('%s %s -> %s kr/kg, %s kcal/100g%s' % (
            'UPPD' if hittad else 'NY  ', post['namn'], post['pris_kr_per_kg'],
            post['kcal'], (' [VARNING: %s]' % varning) if varning else ''))

    json.dump(db, open(DBFIL, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(LANKFIL, 'w', encoding='utf-8').write(HEADER)

    print('=== INGREDIENS-IMPORT ===')
    for r in rapport:
        print(' ', r)
    print('Totalt i databasen: %d ingredienser' % len(items))


if __name__ == '__main__':
    main()
