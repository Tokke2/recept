# ============================================================
# PLATS: /.github/workflows/maskin-underhall.py
# ============================================================
# 🔧 VECKOUNDERHÅLL AV MASKINDATABASEN – Mitt Maskinkök
# ============================================================
# Körs varje vecka (maskin-underhall.yml). För VARJE maskin i
# json/maskiner/:
#   1. 🖼️ BILD saknas på disk? → hämta från tillverkarsidan
#      (og:image, aldrig Amazon) och spara i images/
#   2. 📖 MANUAL saknas i lankar? → kör manual-jakten (tillverkar-
#      sida → PDF-sökning → manualslib/manuals.plus)
#   3. 🔗 LÄNK-KOLL: bruksanvisning/tillverkare som svarar 404 →
#      tas bort (död länk är sämre än ingen); ny manual-jakt körs
#   4. 🥣 PROGRAM: ägarens/manualens program RÖRS ALDRIG. MEN
#      robot-gissade/platshållar-program (typ "Standardprogram"/
#      "Ej ifyllt", "ROBOT-FÖRIFYLLT" i beskrivningen eller
#      "❓ PROGRAM"-poster) får UPPGRADERAS: hittas manual-PDF
#      läses riktiga programnamn ur den och ersätter gissningarna;
#      hittas ingen manual TAS platshållarna BORT (tomt ska inte
#      synas – användarens regel).
# FÖRBÄTTRAR ENDAST: fyller bara tomma hål och byter döda länkar –
# skriver ALDRIG över data som ägaren lagt in själv.
# Resultat loggas i backup/maskin-underhall-LOGG.md.
# ============================================================
import importlib.util
import json
import os
import urllib.request
from datetime import date

# Importera roboten (filnamnet har bindestreck → importlib)
_spec = importlib.util.spec_from_file_location(
    'robot', os.path.join(os.path.dirname(__file__), 'maskin-robot.py'))
robot = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(robot)

MASKINDIR = 'json/maskiner'
LOGG = 'backup/maskin-underhall-LOGG.md'


def lank_ok(url):
    """HEAD-koll: svarar länken? (200/301/302 = ok)"""
    if not url or not url.startswith('http'):
        return False
    try:
        req = urllib.request.Request(url, headers=robot.UA, method='HEAD')
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status < 400
    except Exception:
        # Vissa servrar vägrar HEAD – prova liten GET
        try:
            req = urllib.request.Request(url, headers=robot.UA)
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.status < 400
        except Exception:
            return False


def main():
    rader = []

    for fil in sorted(os.listdir(MASKINDIR)):
        if not fil.endswith('.json') or fil == 'MALL.json':
            continue
        vag = os.path.join(MASKINDIR, fil)
        try:
            m = json.load(open(vag, encoding='utf-8'))
        except Exception as e:
            rader.append('| %s | ❌ trasig JSON: %s |' % (fil, e))
            continue

        andrad = False
        mid = m.get('id', fil[:-5])
        lankar = m.get('lankar', {})
        tillv_url = lankar.get('tillverkare', '')
        varumarke = m.get('varumarke', '')
        modell = m.get('modellnamn', '')

        # 1) 🖼️ Bild saknas på disk? Hämta från tillverkarsidan
        bild = m.get('bild', '')
        bild_finns = bild and os.path.exists(bild)
        if not bild_finns:
            for alt in ('jpg', 'png', 'webp'):
                if os.path.exists('images/%s.%s' % (mid, alt)):
                    if m.get('bild') != 'images/%s.%s' % (mid, alt):
                        m['bild'] = 'images/%s.%s' % (mid, alt)
                        andrad = True
                    bild_finns = True
                    break
        if not bild_finns and tillv_url and 'amazon.' not in tillv_url:
            html = robot.hamta(tillv_url)
            if html:
                ny = robot.spara_bild(robot.hitta_bild(html, tillv_url), mid)
                if ny:
                    m['bild'] = ny
                    andrad = True
                    rader.append('| %s | 🖼️ ny bild från tillverkaren |' % fil)

        # 2+3) 📖 Manual: saknas ELLER död → ny manual-jakt
        manual = lankar.get('bruksanvisning', '')
        behover_manual = not manual
        if manual and not lank_ok(manual):
            rader.append('| %s | 🔗 död manuallänk borttagen |' % fil)
            lankar.pop('bruksanvisning', None)
            behover_manual = True
            andrad = True
        pdf_url = ''
        if behover_manual and (varumarke and modell) and 'FYLL I' not in (varumarke + modell):
            tillv_html = robot.hamta(tillv_url) if tillv_url else ''
            pdf, sida = robot.sok_manual(varumarke, modell, tillv_html, tillv_url)
            pdf_url = pdf
            ny_manual = pdf or sida
            if ny_manual:
                lankar['bruksanvisning'] = ny_manual
                andrad = True
                rader.append('| %s | 📖 manual hittad: %s |' % (fil, ny_manual[:60]))
        elif manual and '.pdf' in manual.lower():
            pdf_url = manual   # befintlig PDF-manual kan användas för programuppgradering

        # 4) 🥣 PROGRAM: ägarens/manualens rörs ALDRIG – men robot-
        #    gissningar/platshållare får uppgraderas eller städas bort.
        def ar_robotprogram(p):
            typ_ = str(p.get('typ', ''))
            besk = str(p.get('beskrivning', ''))
            namn_ = str(p.get('namn', ''))
            return ('Standardprogram' in typ_ or 'Ej ifyllt' in typ_ or
                    'ROBOT-FÖRIFYLLT' in besk or namn_.startswith('❓') or
                    'PROGRAM SAKNAS' in namn_ or 'fyll i från bruksanvisningen' in namn_.lower())

        prog = m.get('program', [])
        if prog and all(ar_robotprogram(p) for p in prog):
            # HELA listan är robot-gissad/platshållare → får förbättras
            nya = robot.program_ur_pdf(pdf_url) if pdf_url else []
            if nya:
                m['program'] = [{
                    'namn': p, 'typ': 'Ur manualen', 'standardtid': 'SE MANUALEN',
                    'beskrivning': 'Programnamnet hittades i bruksanvisningen – VERIFIERA tid/temperatur där!',
                    'bast_for': '...', 'nyckelord': [p.lower()],
                } for p in nya]
                m['viktigt'] = ['Programlistan lästes ur bruksanvisningen – VERIFIERA tider/temperaturer där.']
                andrad = True
                rader.append('| %s | 🥣 gissade program ersatta med %d ur manualen |' % (fil, len(nya)))
            else:
                # Ingen manual-PDF → platshållarna bort (tomt ska inte synas)
                m.pop('program', None)
                if m.get('viktigt') and any('STANDARDPROGRAM' in str(v) or 'PROGRAM EJ IFYLLDA' in str(v)
                                            for v in m['viktigt']):
                    m.pop('viktigt', None)
                andrad = True
                rader.append('| %s | 🧹 robot-gissade/tomma program borttagna |' % fil)

        # 3b) Död tillverkarlänk → ersätt med kända kartan (annars bort)
        if tillv_url and not lank_ok(tillv_url):
            ersatt = robot.TILLVERKARE.get((varumarke or '').lower(), '')
            if ersatt and ersatt != tillv_url:
                lankar['tillverkare'] = ersatt
                rader.append('| %s | 🔗 död tillverkarlänk ersatt |' % fil)
            else:
                lankar.pop('tillverkare', None)
                rader.append('| %s | 🔗 död tillverkarlänk borttagen |' % fil)
            andrad = True

        if andrad:
            m['lankar'] = lankar
            with open(vag, 'w', encoding='utf-8') as f:
                json.dump(m, f, ensure_ascii=False, indent=1)

    # Logg
    os.makedirs('backup', exist_ok=True)
    if not os.path.exists(LOGG):
        with open(LOGG, 'w', encoding='utf-8') as f:
            f.write('<!-- PLATS: /backup/maskin-underhall-LOGG.md (skrivs av maskin-underhall.py) -->\n'
                    '# 🔧 Underhållslogg – maskindatabasen\n\n| Fil | Åtgärd |\n|---|---|\n')
    with open(LOGG, 'a', encoding='utf-8') as f:
        if rader:
            f.write('\n**%s**\n\n' % date.today() + '\n'.join(rader) + '\n')
        else:
            f.write('| %s | ✅ allt friskt – inga åtgärder |\n' % date.today())
    print('Underhåll klart: %d åtgärder.' % len(rader))
    for r in rader:
        print(' ', r)


if __name__ == '__main__':
    main()
