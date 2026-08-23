# ============================================================
# PLATS: /.github/workflows/sprak-robot.py
# ============================================================
# 🌐 SPRÅKROBOT – Mitt Maskinkök
# ============================================================
# Gör språkbytet OMEDELBART för besökarna: samlar ALLA texter
# från sajtens sidor + recept + maskinfiler + ingredienser och
# FÖRGENERERAR översättningarna till json/sprak/<kod>.json.
# → sprak.js hittar då allt i ordboken direkt (steg 1) och
#   behöver aldrig vänta på Googles gtx-API i webbläsaren.
#
# Så funkar den:
#   1. SKÖRDAR svenska texter ur:
#      · alla *.html (rot + recept/): synlig text, title,
#        placeholder/title/alt-attribut, meta-beskrivningar
#      · json/maskiner/*.json: namn, typ, egenskaper, viktigt,
#        program (namn/beskrivning/bast_for), kapacitet
#      · json/ingredienser.json: namn
#   2. JÄMFÖR med befintliga ordböcker – ENDAST NYA texter
#      översätts (aldrig ändra befintliga/handrättade!)
#   3. ÖVERSÄTTER nya via gtx (buntat med ⁂-separator, samma
#      teknik som sprak.js, med paus mellan anrop)
#   4. SPARAR till json/sprak/en.json + de.json under "texter"
# Körs varje natt + vid push av recept/maskiner + manuellt.
# ============================================================
import json
import os
import re
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser

SPRAK = ['en', 'de']
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
SEP = '\n⁂\n'
MAXLEN = 1200


# ---------- 1. SKÖRDA TEXTER ----------
class TextSkordare(HTMLParser):
    SKIPPA = {'script', 'style', 'noscript', 'code'}

    def __init__(self):
        super().__init__()
        self.texter = set()
        self._i_skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIPPA:
            self._i_skip += 1
        for namn, varde in attrs:
            if namn in ('placeholder', 'title', 'alt', 'aria-label', 'content') and varde:
                # content endast för description/og-metas (via heuristik: längre text)
                if namn == 'content' and len(varde) < 15:
                    continue
                self._ta(varde)

    def handle_endtag(self, tag):
        if tag in self.SKIPPA and self._i_skip:
            self._i_skip -= 1

    def handle_data(self, data):
        if not self._i_skip:
            self._ta(data)

    def _ta(self, t):
        t = re.sub(r'\s+', ' ', t).strip()
        if oversattbar(t):
            self.texter.add(t)


def oversattbar(t):
    if not t or len(t) < 2 or len(t) > MAXLEN:
        return False
    if t.startswith(('http', '{', '[', '<')):
        return False
    if not re.search(r'[a-zA-ZåäöÅÄÖ]{2}', t):
        return False
    if re.match(r'^[\d\s.,:%°×+\-–/()]+$', t):
        return False
    if re.search(r'\.(jpg|jpeg|png|webp|svg|html?|json|txt|pdf|js|css|py|yml)\b', t, re.I):
        return False                      # filnamn/sökvägar
    if re.match(r'^[\d\s.,]+ ?kr$', t):
        return False                      # rena priser ("3,29 kr")
    if re.match(r'^[A-Z0-9_-]{6,}$', t):
        return False                      # koder/ID:n
    return True


def skorda():
    texter = set()
    # HTML-sidor
    filer = [f for f in os.listdir('.') if f.endswith('.html')]
    filer += ['recept/' + f for f in os.listdir('recept') if f.endswith('.html')] if os.path.isdir('recept') else []
    for fil in filer:
        try:
            p = TextSkordare()
            p.feed(open(fil, encoding='utf-8', errors='ignore').read())
            texter |= p.texter
        except Exception as e:
            print('⚠️ %s: %s' % (fil, e))
    # Maskinfiler
    if os.path.isdir('json/maskiner'):
        for fil in os.listdir('json/maskiner'):
            if not fil.endswith('.json'):
                continue
            try:
                m = json.load(open('json/maskiner/' + fil, encoding='utf-8'))
                kandidater = [m.get('namn'), m.get('typ'), m.get('kapacitet')]
                kandidater += m.get('egenskaper', []) + m.get('viktigt', [])
                for p in m.get('program', []):
                    kandidater += [p.get('namn'), p.get('beskrivning'), p.get('bast_for'), p.get('standardtid')]
                for k in kandidater:
                    if isinstance(k, str):
                        k = re.sub(r'\s+', ' ', k).strip()
                        if oversattbar(k):
                            texter.add(k)
            except Exception:
                pass
    # Ingredienser
    try:
        d = json.load(open('json/ingredienser.json', encoding='utf-8'))
        for ing in d.get('ingredienser', []):
            n = str(ing.get('namn', '')).strip()
            if oversattbar(n):
                texter.add(n)
    except Exception:
        pass
    return texter


# ---------- 2+3. ÖVERSÄTT NYA (gtx, buntat) ----------
def gtx(batch, mal):
    q = SEP.join(batch)
    url = ('https://translate.googleapis.com/translate_a/single?client=gtx&sl=sv&tl=%s&dt=t&q=%s'
           % (mal, urllib.parse.quote(q)))
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.load(r)
    full = ''.join(seg[0] for seg in (d[0] or []) if seg and seg[0])
    ut = re.split(r'\s*⁂\s*', full)
    return ut if len(ut) == len(batch) else None


def gtx_talig(batch, mal, forsok=4):
    """gtx med exponentiell backoff vid 429/fel (Actions-IP:n klarar
       normalt kvoten, men roboten ska aldrig ge upp i onödan)."""
    paus = 5
    for i in range(forsok):
        try:
            return gtx(batch, mal)
        except Exception as e:
            if '429' in str(e) and i < forsok - 1:
                print('  ⏳ 429 – väntar %ds...' % paus)
                time.sleep(paus)
                paus *= 3          # 5s → 15s → 45s
            else:
                raise
    return None


def oversatt_nya(nya, mal):
    ut = {}
    lista = sorted(nya)
    i = 0
    misslyckade = 0
    while i < len(lista):
        batch = lista[i:i + 15]
        try:
            svar = gtx_talig(batch, mal)
            if svar is None and len(batch) > 1:
                # dela bunten
                svar = []
                for t in batch:
                    enk = gtx_talig([t], mal)
                    svar.append(enk[0] if enk else '')
                    time.sleep(0.5)
            for t, o in zip(batch, svar or []):
                o = (o or '').strip()
                if o and o != t:
                    ut[t] = o
            misslyckade = 0
        except Exception as e:
            print('⚠️ gtx-fel (%s): %s' % (mal, e))
            misslyckade += 1
            if misslyckade >= 3:
                print('🛑 3 buntar i rad misslyckades – sparar det som hunnits (%d) och avbryter snyggt.' % len(ut))
                break              # partiell körning OK – nästa natt tar resten
            time.sleep(20)
        i += 15
        time.sleep(1.2)   # snäll mot API:t
        if i % 150 == 0:
            print('  %s: %d/%d...' % (mal, i, len(lista)))
    return ut


def main():
    texter = skorda()
    print('🌾 Skördade %d översättbara texter' % len(texter))

    for kod in SPRAK:
        fil = 'json/sprak/%s.json' % kod
        try:
            d = json.load(open(fil, encoding='utf-8'))
        except Exception:
            d = {'_plats': '/json/sprak/%s.json' % kod, 'sprak': kod, 'texter': {}, 'monster': {}}
        bef = d.get('texter', {})
        nya = {t for t in texter if t not in bef}
        print('🌐 %s: %d finns, %d NYA att översätta' % (kod, len(bef), len(nya)))
        if not nya:
            continue
        oversatta = oversatt_nya(nya, kod)
        # ENDAST tillägg – befintliga/handrättade rörs ALDRIG
        for k, v in oversatta.items():
            if k not in bef:
                bef[k] = v
        d['texter'] = bef
        d['_auto_genererade'] = len(bef)
        d['_senast_robot'] = time.strftime('%Y-%m-%d')
        with open(fil, 'w', encoding='utf-8') as f:
            json.dump(d, f, ensure_ascii=False, indent=1)
        print('✅ %s: +%d nya → %d totalt' % (kod, len(oversatta), len(bef)))


if __name__ == '__main__':
    main()
