# PLATS: /.github/workflows/indexnow.py  (IndexNow-pingen, SPEC 233 / förslag 1010)
# ============================================================
# 🔔 INDEXNOW-ROBOTEN: varje push till main anmäler ÄNDRADE
# HTML-sidor till api.indexnow.org (når Bing m.fl. – ChatGPT
# kör Bings index). Nyckelfilen ligger i sajtroten:
# https://tokke2.github.io/recept/991bf49e43471533d8b76c6b68c1581f.txt
# · Endast ändrade *.html (+ startsidan när sitemap.xml ändrats)
# · Max 100 URL:er per push (IndexNow-taket är 10 000)
# · DRY=1 → skriver bara ut, pingar inte (för tester)
# · Fel får ALDRIG fälla bygget (exit 0 alltid)
# ============================================================
import json
import os
import subprocess
import sys
import time
import urllib.request

HOST = 'tokke2.github.io'
BAS = 'https://tokke2.github.io/recept/'
KEY = '991bf49e43471533d8b76c6b68c1581f'
KEYLOC = BAS + KEY + '.txt'


def andrade_filer():
    try:
        ut = subprocess.check_output(
            ['git', '-c', 'core.quotepath=off', 'diff', '--name-only', 'HEAD^', 'HEAD'],   # åäö-filnamn får ALDRIG citeras sönder
            text=True, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        return []
    return [r.strip() for r in ut.splitlines() if r.strip()]


def till_urler(filer):
    urler = []
    for f in filer:
        if f.endswith('.html') and not f.startswith('.github'):
            from urllib.parse import quote
            urler.append(BAS + '/'.join(quote(x) for x in f.split('/')))
        elif f in ('sitemap.xml', 'llms.txt'):
            urler.append(BAS)
    # dubbletter bort, behåll ordning
    setts, ut = set(), []
    for u in urler:
        if u not in setts:
            setts.add(u)
            ut.append(u)
    return ut[:100]


def main():
    urler = till_urler(andrade_filer())
    if not urler:
        print('IndexNow: inga HTML-ändringar att anmäla.')
        return
    body = json.dumps({'host': HOST, 'key': KEY, 'keyLocation': KEYLOC,
                       'urlList': urler}).encode('utf-8')
    print('IndexNow: anmäler %d sidor:' % len(urler))
    for u in urler:
        print('  •', u)
    if os.environ.get('DRY'):
        print('(DRY-läge – ingen ping skickad)')
        return
    time.sleep(120)   # ge GitHub Pages tid att publicera först
    req = urllib.request.Request(
        'https://api.indexnow.org/indexnow', data=body,
        headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print('IndexNow-svar:', r.status)
    except Exception as e:  # noqa: BLE001 - pingen får aldrig fälla bygget
        print('IndexNow misslyckades (ofarligt, försöker igen nästa push):', e)


if __name__ == '__main__':
    main()
    sys.exit(0)
