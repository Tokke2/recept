# ============================================================
# PLATS: /.github/workflows/veckorapport.py
# ============================================================
# 📊 VECKORAPPORTEN MED FELLOGGAR (SPEC 245, förslag 1094 +
# ägarens tillägg "felloggar"): körs varje söndag och MEJLAR
# ägaren via Web3Forms:
#   · veckans besök (ur json/besok-historik.json, loggrobotens rader)
#   · köpklick totalt
#   · antal recept + verifierade delar
#   · robotflaggorna från senaste 7 dagarna (sjalvlakning-LOGG.md)
# ÄRLIG GRÄNS: klientfel (Svarta lådan/sidledsvakten) bor i
# besökarnas webbläsare och kan aldrig mejlas härifrån – de ses
# i adminpanelen på den egna enheten.
# Fel i API/mejl fäller ALDRIG körningen (exit 0 – nästa söndag
# kommer alltid).
# ============================================================
import glob
import json
import os
import re
import urllib.request
from datetime import date, timedelta

W3F_KEY = '1d0d747a-fe30-4e87-898b-faa2a421005f'
NS = 'mitt-maskinkok-tokke2'


def abacus(key):
    try:
        with urllib.request.urlopen('https://abacus.jasoncameron.dev/get/%s/%s' % (NS, key), timeout=15) as r:
            return int(json.load(r).get('value') or 0)
    except Exception:
        return None


def veckobesok():
    try:
        hist = json.load(open('json/besok-historik.json', encoding='utf-8'))
    except Exception:
        return None, None
    if not isinstance(hist, list) or len(hist) < 2:
        return None, (hist[-1].get('besok') if hist else None)
    gräns = str(date.today() - timedelta(days=7))
    vecka = [p for p in hist if isinstance(p, dict) and str(p.get('datum', '')) >= gräns]
    if len(vecka) < 2:
        return None, hist[-1].get('besok')
    return max(0, (vecka[-1].get('besok') or 0) - (vecka[0].get('besok') or 0)), hist[-1].get('besok')


def robotflaggor():
    """Rader ur självläkningsloggen daterade senaste 7 dagarna."""
    try:
        txt = open('backup/sjalvlakning-LOGG.md', encoding='utf-8').read()
    except Exception:
        return []
    ut, aktiv = [], False
    gräns = date.today() - timedelta(days=7)
    for rad in txt.splitlines():
        m = re.match(r'\*\*(\d{4}-\d{2}-\d{2})\*\*', rad.strip())
        if m:
            try:
                aktiv = date.fromisoformat(m.group(1)) >= gräns
            except ValueError:
                aktiv = False
            continue
        if aktiv and rad.strip().startswith('|') and '---' not in rad:
            ut.append(rad.strip())
    return ut[:40]


def main():
    nya, totalt = veckobesok()
    kop = abacus('kop-total')
    recept = len(glob.glob('recept/*/*.html'))
    verif = 0
    for f in glob.glob('recept/*/*.html'):
        try:
            if 'recept:testad' in open(f, encoding='utf-8').read():
                verif += 1
        except Exception:
            pass
    flaggor = robotflaggor()

    rader = ['📊 MITT MASKINKÖK – VECKORAPPORTEN (%s)' % date.today(), '']
    rader.append('📈 Besök denna vecka: %s' % ('%d nya sidvisningar' % nya if nya is not None else 'för lite loggdata ännu'))
    if totalt is not None:
        rader.append('   Totalt sedan start: %d' % totalt)
    rader.append('🛒 Köpklick totalt: %s' % (kop if kop is not None else 'räknar-API:t svarade inte (självläkande)'))
    rader.append('📖 Recept: %d st, varav %d med verifierade delar' % (recept, verif))
    rader.append('')
    if flaggor:
        rader.append('🤖 ROBOTFLAGGOR SENASTE VECKAN (%d):' % len(flaggor))
        rader += ['  ' + f for f in flaggor]
    else:
        rader.append('🤖 Robotflaggor senaste veckan: inga – allt grönt! 🎉')
    rader.append('')
    rader.append('📱 Klientfel (Svarta lådan/sidledsvakten) kan inte mejlas – de bor i webbläsaren. Kika i adminpanelen vid behov.')
    rader.append('🔗 Adminpanelen: https://tokke2.github.io/recept/losenord.html')

    data = json.dumps({
        'access_key': W3F_KEY,
        'subject': '📊 Veckorapport Mitt Maskinkök – ' + str(date.today()),
        'from_name': 'Veckorapport-roboten',
        'message': '\n'.join(rader),
    }).encode('utf-8')
    req = urllib.request.Request('https://api.web3forms.com/submit', data=data,
                                 headers={'Content-Type': 'application/json', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print('Mejl skickat:', r.status)
    except Exception as e:
        print('Mejlet gick inte ivag (%s) - provar igen nasta sondag.' % e)


if __name__ == '__main__':
    main()
