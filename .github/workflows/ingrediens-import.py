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
# Stodda butiker:
#   https://www.willys.se/produkt/..._ST      (pris + naring, Axfood-API)
#   https://www.hemkop.se/produkt/..._ST      (pris + naring, Axfood-API)
#   https://handlaprivatkund.ica.se/stores/.../products/...  (ICA: namn +
#       jamforpris kr/kg lases ur produktsidan; naring visas inte publikt
#       hos ICA - fyll i efterat pa sajten eller lamna 0)
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


def ica_name_from_url(url):
    """Reserv: lasbart namn ur ICA-lankens slug.
    .../products/salladsl%C3%B6k-ca-125g-klass-1-ica/1131028 -> Salladslok ca 125g klass 1 ica"""
    from urllib.parse import unquote
    m = re.search(r'/products/([^/]+)/\d+', url)
    if not m:
        return ''
    n = unquote(m.group(1)).replace('-', ' ').strip()
    return (n[:1].upper() + n[1:]) if n else ''


def fetch_ica(url):
    """ICA-produktsida (handlaprivatkund.ica.se) -> (post, varning).
    Namn/varumarke ur ld+json, jamforpris kr/kg ur inbaddad state.
    OBS: ICA har AWS-WAF-botskydd som ibland blockerar - da anvands
    namnet ur lanken som reserv (pris 0, fylls i pa sajten).
    Naring finns inte publikt hos ICA -> 0 + varning."""
    import time
    html = ''
    for forsok in range(3):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'sv-SE,sv;q=0.9'})
            html = urllib.request.urlopen(req, timeout=25).read().decode('utf-8', 'ignore')
            if 'awsWaf' not in html and len(html) > 10000:
                break  # riktig produktsida
        except Exception:
            pass
        time.sleep(3)

    namn, brand = '', ''
    m = re.search(r'type="application/ld\+json">(\{.*?\})</script>', html, re.S)
    if m:
        try:
            ld = json.loads(m.group(1))
            namn = (ld.get('name') or '').strip()
            brand = (ld.get('brand') or '').strip()
        except Exception:
            pass
    if not namn:
        # WAF-blockerad eller okand sida -> namn ur lanken, pris fylls i manuellt
        namn = ica_name_from_url(url)
        if not namn:
            return None, 'ICA blockerade hamtningen och lanken innehov inget produktnamn'
        return {
            'id': slug(namn), 'namn': namn, 'pris_kr_per_kg': 0,
            'kcal': 0, 'protein': 0, 'kolhydrat': 0, 'fett': 0, 'fiber': 0,
            'lank': url, 'kalla': 'ica.se (botskydd blockerade - fyll i pris & naring!)',
            'uppdaterad': date.today().isoformat()
        }, 'ICA:s botskydd blockerade hamtningen - namnet togs ur lanken, fyll i pris & naring pa ingredienser.html'

    # Jamforpris: "unitPrice":{"price":{"amount":"159.20",...},"unit":"fop.price.per.kg"}
    pris, enhet = None, 'kg'
    mp = re.search(r'"unitPrice":\{"price":\{"amount":"([\d.]+)"[^}]*\},"unit":"fop\.price\.per\.(\w+)"', html)
    if mp:
        pris = round(float(mp.group(1)), 2)
        enhet = mp.group(2)
    else:
        mp2 = re.search(r'([\d\s]+,\d+)\s*kr/(kg|l)', html)
        if mp2:
            pris = round(float(mp2.group(1).replace(' ', '').replace(',', '.')), 2)
            enhet = mp2.group(2)
    if pris is None:
        return None, 'Hittade inget jamforpris pa ICA-sidan'

    post = {
        'id': slug(namn),
        'namn': namn,
        'pris_kr_per_kg': pris,
        'kcal': 0, 'protein': 0, 'kolhydrat': 0, 'fett': 0, 'fiber': 0,
        'lank': url,
        'kalla': 'ica.se (jamforpris kr/%s)' % enhet,
        'uppdaterad': date.today().isoformat()
    }
    if brand:
        post['varumarke'] = brand
    varning = 'ICA visar inte naring publikt - kcal/protein m.m. ar 0, fyll i pa sajten (ingredienser.html)'
    if enhet not in ('kg',):
        varning += ' + jamforpris per %s (inte kg)' % enhet
    return post, varning


def fetch_product(url):
    """Produktlank -> (post, felmeddelande)."""
    if 'ica.se' in url:
        return fetch_ica(url)
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
