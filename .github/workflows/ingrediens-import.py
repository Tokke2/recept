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
# 🌱 "EGENODLAD" efter lanken pa samma rad = egenodlad vara:
#    naring hamtas fran butiken, pris satts till 0 kr, namnet far
#    tillagget "hemodlad" och varan skyddas fran prisuppdateringar.
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
import urllib.parse
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


def hitta_varianter(html_ra):
    """🍫 SMAKVARIANTER: sidor med naringstabell per smak (Gymgrossisten
    m.fl.: kolumn per smak, rad per naringsamne) -> lista av
    {smak, kcal, protein, kolhydrat, fett} for ALLA smaker."""
    import html as _html

    def celltext(td):
        t = re.sub(r'<[^>]+>', ' ', td)
        return re.sub(r'\s+', ' ', _html.unescape(t)).strip()

    varianter = []
    for tab in re.findall(r'<table[\s\S]*?</table>', html_ra, re.I):
        if not re.search(r'per 100\s*&?g|per 100&nbsp;g|ringsv.{0,10}rde per 100', tab, re.I):
            continue
        rader = [ [celltext(c) for c in re.findall(r'<t[dh][\s\S]*?</t[dh]>', rad, re.I)]
                  for rad in re.findall(r'<tr[\s\S]*?</tr>', tab, re.I) ]
        rader = [r for r in rader if len(r) >= 2]
        if len(rader) < 3:
            continue
        smaker = rader[0][1:]                     # kolumnrubrikerna = smakerna
        if not smaker or not any(s.strip() for s in smaker):
            continue

        def tal(s):
            m = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:g|kcal)?\s*$', s) or \
                re.search(r'/\s*(\d+(?:[.,]\d+)?)\s*kcal', s) or \
                re.search(r'(\d+(?:[.,]\d+)?)', s.replace('.g', ' g'))
            return float(m.group(1).replace(',', '.')) if m else 0

        def radfor(monster):
            for r in rader[1:]:
                if re.match(monster, r[0], re.I) and not re.match(r'varav', r[0], re.I):
                    return r[1:]
            return None

        kcal_r = radfor(r'energi|kcal')
        prot_r = radfor(r'protein')
        kolh_r = radfor(r'kolhydrat')
        fett_r = radfor(r'fett')
        if not kcal_r:
            continue
        for i, smak in enumerate(smaker):
            smak = smak.strip()
            if not smak or re.match(r'per\s*100|per\s*portion|100\s*g|portion', smak, re.I):
                continue      # kolumnrubrik, inte smak (Tyngre-stil -> monster B)
            # kcal-cellen: "1657 kJ / 396 kcal" -> ta kcal-talet
            kc = kcal_r[i] if i < len(kcal_r) else ''
            m = re.search(r'/\s*(\d+(?:[.,]\d+)?)\s*kcal', kc) or re.search(r'(\d+(?:[.,]\d+)?)\s*kcal', kc)
            kcal = float(m.group(1).replace(',', '.')) if m else tal(kc)
            varianter.append({
                'smak': smak[:40],
                'kcal': kcal,
                'protein': tal(prot_r[i]) if prot_r and i < len(prot_r) else 0,
                'kolhydrat': tal(kolh_r[i]) if kolh_r and i < len(kolh_r) else 0,
                'fett': tal(fett_r[i]) if fett_r and i < len(fett_r) else 0,
            })
    if varianter:
        return varianter

    # === MÖNSTER B (Tyngre m.fl.): EGEN tabell per smak, smaknamnet i
    # rubrik före tabellen. Rader: "Energi | 1653 kJ/395 kcal | ...",
    # "Protein | 75 g". Dubbletter (samma smak flera ggr) slås ihop. ===
    sedda = {}
    for m in re.finditer(r'Per 100\s?g', html_ra):
        pos = m.start()
        fore = html_ra[max(0, pos - 2500):pos]
        rubriker = re.findall(r'>([A-ZÅÄÖ][^<>{}]{3,60})<', fore)
        smak = ''
        for kand in reversed(rubriker):
            kand = _html.unescape(kand).strip()
            if re.match(r'^(Näringsvärde|Energi|Fett|Protein|Salt|Kolhydrat|Ingredienser|Innehåller|Konsument|Tillverkat|Låt |Blanda|Rekommenderad)', kand, re.I):
                continue
            smak = kand[:60]
            break
        if not smak or smak in sedda:
            continue
        efter = html_ra[pos:pos + 4000]
        txt = re.sub(r'<[^>]+>', ' ', efter)
        txt = re.sub(r'\s+', ' ', _html.unescape(txt))

        def tal2(monster):
            mm = re.search(monster, txt)
            return float(mm.group(1).replace(',', '.')) if mm else 0

        kcal = tal2(r'/\s*(\d+(?:[.,]\d+)?)\s*kcal')
        if not kcal:
            kcal = tal2(r'(\d+(?:[.,]\d+)?)\s*kcal')
        if not kcal:
            continue
        sedda[smak] = {
            'smak': smak.replace('Vassle ', '')[:40],
            'kcal': kcal,
            'protein': tal2(r'Protein\D{0,20}?(\d+(?:[.,]\d+)?)\s*g'),
            'kolhydrat': tal2(r'Kolhydrat\w*\D{0,20}?(\d+(?:[.,]\d+)?)\s*g'),
            'fett': tal2(r'Fett\D{0,20}?(\d+(?:[.,]\d+)?)\s*g'),
        }
    return list(sedda.values())


def fetch_generisk(url):
    """🌐 VALFRI BUTIK (Gymgrossisten, Coop, Mathem, tillverkare...):
    laser JSON-LD Product (namn/pris/varumarke) + og:title som reserv,
    plus naringsvarden ur sidtexten om de finns ("per 100 g").
    Pris blir kr/kg ENDAST om vikt hittas i namnet (t.ex. "1 kg",
    "4 x 1 kg", "500 g") - annars styckpris med varning."""
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
        html = urllib.request.urlopen(req, timeout=25).read().decode('utf-8', 'ignore')
    except Exception as e:
        return None, 'Kunde inte hamta sidan: %s' % e

    import html as _html
    namn, pris, varumarke = '', 0.0, ''

    # 1) JSON-LD Product
    for m in re.finditer(r'<script type="application/ld\+json">([\s\S]*?)</script>', html):
        try:
            d = json.loads(m.group(1))
            kandidater = d if isinstance(d, list) else [d]
            for k in kandidater:
                if 'Product' in str(k.get('@type', '')):
                    namn = _html.unescape(str(k.get('name', '')))[:90]
                    b = k.get('brand', {})
                    varumarke = _html.unescape(str(b.get('name', b) if isinstance(b, dict) else b))[:40]
                    off = k.get('offers', {})
                    if isinstance(off, list):
                        off = off[0] if off else {}
                    try:
                        pris = float(str(off.get('price', 0)).replace(',', '.'))
                    except Exception:
                        pass
        except Exception:
            pass
    # 2) Reserv: og:title + itemprop-pris
    if not namn:
        m = re.search(r'og:title" content="([^"]+)"', html)
        if m:
            namn = _html.unescape(m.group(1)).split('|')[0].replace('Köp ', '').strip()[:90]
    if not pris:
        m = re.search(r'itemprop="price"[^>]*content="([\d.,]+)"', html)
        if m:
            pris = float(m.group(1).replace(',', '.'))
    if not pris:
        # React-state: "price":"1799,00" eller "price":1799 (forsta = huvudprodukten)
        m = re.search(r'"price"\s*:\s*"?(\d+(?:[.,]\d+)?)', html)
        if m:
            pris = float(m.group(1).replace(',', '.'))
    if not namn:
        return None, 'Hittade varken JSON-LD Product eller og:title pa sidan'

    # 3) Vikt ur namnet -> kr/kg. "4 x 1 kg" / "1 kg" / "500 g" / "0,5 kg"
    vikt_kg = 0.0
    # "4 x 1 kg" tatt ihop ELLER "4 x <text> 1 kg" (Mix&Match: 4 x Whey-80 ... 1 kg)
    m = re.search(r'(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(kg|g)\b', namn, re.I) or \
        re.search(r'(\d+)\s*[x×].{0,40}?(\d+(?:[.,]\d+)?)\s*(kg|g)\b', namn, re.I)
    if m:
        per = float(m.group(2).replace(',', '.'))
        vikt_kg = int(m.group(1)) * (per if m.group(3).lower() == 'kg' else per / 1000)
    else:
        m = re.search(r'(\d+(?:[.,]\d+)?)\s*(kg|g)\b', namn, re.I)
        if m:
            v = float(m.group(1).replace(',', '.'))
            vikt_kg = v if m.group(2).lower() == 'kg' else v / 1000

    # Vikt inte i namnet? Leta i SIDTEXTEN: "5x900g", "900 gram x 5", "3x900g"
    if not vikt_kg:
        txt0 = re.sub(r'<[^>]+>', ' ', html)   # hela sidan (React-sidor ar stora)
        m = re.search(r'(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(kg|g)\b', txt0) or \
            re.search(r'(\d+(?:[.,]\d+)?)\s*(gram|g|kg)\s*[x×]\s*(\d+)', txt0)
        if m:
            gr = m.groups()
            if len(gr) == 3 and gr[2] in ('kg', 'g'):
                per = float(gr[1].replace(',', '.'))
                vikt_kg = int(gr[0]) * (per if gr[2] == 'kg' else per / 1000)
            else:  # "900 gram x 5"
                per = float(gr[0].replace(',', '.'))
                enhet = gr[1]
                vikt_kg = int(gr[2]) * (per if enhet == 'kg' else per / 1000)

    varning = ''
    if pris and vikt_kg:
        pris_kr_per_kg = round(pris / vikt_kg, 2)
    else:
        pris_kr_per_kg = round(pris, 2)
        varning = 'Ingen vikt i produktnamnet - priset ar STYCKPRIS, inte kr/kg. Justera pa sajten!'

    # 4) Naring ur sidtexten ("per 100 g" i narheteten av Energi/Protein)
    naring = {'kcal': 0, 'protein': 0, 'kolhydrat': 0, 'fett': 0, 'fiber': 0}
    txt = re.sub(r'<[^>]+>', ' ', html)
    txt = re.sub(r'\s+', ' ', txt)
    zon = re.search(r'per 100 ?g[\s\S]{0,800}', txt, re.I)
    if zon:
        z = zon.group(0)
        for falt, monster in [('kcal', r'(\d+(?:[.,]\d+)?)\s*kcal'),
                              ('protein', r'[Pp]rotein\D{0,20}(\d+(?:[.,]\d+)?)[.,]?\s*g'),
                              ('kolhydrat', r'[Kk]olhydrat\D{0,20}(\d+(?:[.,]\d+)?)\s*g'),
                              ('fett', r'[Ff]ett\D{0,20}(\d+(?:[.,]\d+)?)\s*g'),
                              ('fiber', r'[Ff]iber\D{0,20}(\d+(?:[.,]\d+)?)\s*g')]:
            m = re.search(monster, z)
            if m:
                naring[falt] = float(m.group(1).replace(',', '.'))
    if not naring['kcal']:
        varning = (varning + ' ' if varning else '') + \
            'Naring hittades inte pa sidan - fyll i manuellt (✏️ pa ingredienssidan).'

    # 🍫 Smakvarianter (kolumn-per-smak-tabeller) → "varianter"-fält
    varianter = hitta_varianter(html)

    post = {
        'id': slug(namn)[:50],
        'namn': namn,
        'pris_kr_per_kg': pris_kr_per_kg,
        'kcal': naring['kcal'], 'protein': naring['protein'],
        'kolhydrat': naring['kolhydrat'], 'fett': naring['fett'], 'fiber': naring['fiber'],
        'varumarke': varumarke,
        'lank': url,
        'kalla': 'import %s %s' % (re.sub(r'^www\.', '', urllib.parse.urlparse(url).netloc),
                                   __import__('datetime').date.today())
    }
    if varianter:
        post['varianter'] = varianter
        # Huvudvärden = SNITT över alla smaker (ärligare än första kolumnen)
        n = len(varianter)
        post['kcal'] = round(sum(v['kcal'] for v in varianter) / n, 1)
        post['protein'] = round(sum(v['protein'] for v in varianter) / n, 1)
        post['kolhydrat'] = round(sum(v['kolhydrat'] for v in varianter) / n, 1)
        post['fett'] = round(sum(v['fett'] for v in varianter) / n, 1)
        varning = (varning + ' ' if varning else '') + \
            '%d smakvarianter hittade - huvudvarden ar snittet.' % n

    return post, varning


def fetch_product(url):
    """Produktlank -> (post, felmeddelande)."""
    if 'ica.se' in url:
        return fetch_ica(url)
    if 'willys.se' in url or 'hemkop.se' in url:
        m = re.search(r'(\d+_(?:ST|KG|EA))\b', url)
        if not m:
            return None, 'Ingen produktkod (..._ST) hittades i lanken'
        code = m.group(1)
        domain = 'hemkop.se' if 'hemkop' in url else 'willys.se'
    else:
        # 🌐 ALLA ANDRA BUTIKER: generisk JSON-LD/og-lasning
        return fetch_generisk(url)
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

    for rad in lankar:
        # 🌱 EGENODLAD-flaggan: "https://... EGENODLAD" pa samma rad
        #    -> naring hamtas fran butiken som vanligt, men priset satts
        #       till 0 kr och namnet far tillagget "hemodlad".
        egenodlad = bool(re.search(r'\bEGENODLAD\b', rad, re.I))
        lank = re.sub(r'\s+EGENODLAD\b', '', rad, flags=re.I).strip()

        post, varning = fetch_product(lank)
        if post is None:
            rapport.append('FEL  %s -> %s' % (lank[:60], varning))
            continue

        if egenodlad:
            # Namn: "Applen Royal Gala" -> "Applen Royal Gala hemodlad"
            if 'hemodlad' not in post['namn'].lower():
                post['namn'] = post['namn'].rstrip() + ' hemodlad'
            post['id'] = slug(post['namn'])
            post['pris_kr_per_kg'] = 0
            post['noll_ok'] = True          # 0 kr ar avsiktligt - varna inte
            post['egenodlad'] = True
            # Lanken behalls som naringsreferens men pris-uppdateringen
            # far ALDRIG skriva over 0-priset (hanteras nedan vid UPPD).
            post['kalla'] = 'egenodlad (naring: %s)' % post.get('kalla', 'butik')
        # Uppdatera om samma lank, id ELLER liknande namn redan finns.
        # OBS: egenodlade och vanliga butiksvaror halls ISAR - samma
        # Willys-lank kan finnas bade som butiksvara (med pris) och som
        # egenodlad (0 kr), t.ex. "Applen" och "Applen hemodlad".
        def norm(s):
            return re.sub(r'[^a-z0-9]', '', slug(str(s)))
        hittad = False
        for i, g in enumerate(items):
            if bool(g.get('egenodlad')) != egenodlad:
                continue  # blanda aldrig ihop egenodlad <-> butiksvara
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
