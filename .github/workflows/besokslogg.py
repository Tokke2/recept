# ============================================================
# PLATS: /.github/workflows/besokslogg.py
# ============================================================
# 📈 DEN NATTLIGA LOGG-ROBOTEN (SPEC 228, ägarens order
# 2026-11-16): läser besok-total + kop-total ur Abacus-räknaren
# varje natt och lägger en rad i json/besok-historik.json –
# råmaterialet till besöksgrafen i adminpanelen.
#
# · Max EN rad per datum (körs den två gånger händer inget).
# · Är räknar-API:t nere hoppar vi över natten HELT (skriver
#   ALDRIG nollor som skulle göra grafen ljugande) – API:t är
#   självläkande, nästa natt funkar det igen.
# · Behåller de senaste 400 dagarna.
# · Filen är ROBOTÄGD – redigeras aldrig för hand.
# ============================================================
import json
import os
import urllib.request
from datetime import date

NS = 'mitt-maskinkok-tokke2'
FIL = 'json/besok-historik.json'


def hamta(key):
    """Läser en räknare (GET /get/ – ökar INTE värdet).
    404 = nyckeln oanvänd ännu → ärlig nolla. Annat fel → None."""
    url = 'https://abacus.jasoncameron.dev/get/%s/%s' % (NS, key)
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            return int(json.load(r).get('value') or 0)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return 0
        return None
    except Exception:
        return None


def main():
    hist = []
    if os.path.exists(FIL):
        try:
            hist = json.load(open(FIL, encoding='utf-8'))
        except Exception:
            hist = []
    if not isinstance(hist, list):
        hist = []
    idag = str(date.today())
    if any(p.get('datum') == idag for p in hist if isinstance(p, dict)):
        print('Redan loggat %s - inget att gora.' % idag)
        return
    besok = hamta('besok-total')
    kop = hamta('kop-total')
    if besok is None or kop is None:
        print('Raknar-API:t nere - hoppar over natten (skriver aldrig nollor).')
        return
    hist.append({'datum': idag, 'besok': besok, 'kop': kop})
    hist = hist[-400:]
    with open(FIL, 'w', encoding='utf-8') as fp:
        json.dump(hist, fp, ensure_ascii=False, indent=1)
        fp.write('\n')
    print('Loggat %s: besok=%d kop=%d' % (idag, besok, kop))


if __name__ == '__main__':
    main()
