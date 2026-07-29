# ============================================================
# PLATS: /.github/workflows/konvertera.py  (körs av autofix-recept.yml)
# ============================================================
# KONVERTERINGSMOTORN v3 - bygger om nya recept till sajtens
# standardutformning (samma som de 8 befintliga recepten).
# Separat fil (inte inline i YML) = lättare att underhålla.
# ============================================================
import glob, re, json, os, html as H

MARKER = 'mk-std-v3'

STYLE = """  :root { --bg:#f6f3ee; --card:#fff; --accent:#c0392b; --accent2:#e67e22; --dark:#2c3e50; --muted:#7f8c8d; --green:#27ae60; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:var(--bg); color:var(--dark); padding:24px; max-width:900px; margin:0 auto; }
  header { background:linear-gradient(135deg,#c0392b,#e67e22); color:#fff; border-radius:16px; padding:26px 30px; margin-bottom:20px; box-shadow:0 4px 14px rgba(0,0,0,.12); }
  header h1 { font-size:1.6rem; margin-bottom:4px; }
  header p { opacity:.95; font-size:.92rem; }
  .hero-img { width:100%; max-height:340px; object-fit:cover; border-radius:14px; margin-bottom:16px; box-shadow:0 2px 10px rgba(0,0,0,.1); }
  .card { background:var(--card); border-radius:14px; padding:20px 24px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,.07); }
  h2 { font-size:1.1rem; margin-bottom:10px; }
  table { width:100%; border-collapse:collapse; font-size:.9rem; }
  th { text-align:left; padding:8px 10px; background:#f0ebe3; font-size:.78rem; text-transform:uppercase; color:var(--muted); }
  td { padding:7px 10px; border-bottom:1px solid #eee; }
  tr:last-child td { border-bottom:none; }
  .total td { font-weight:700; background:#faf7f2; }
  ol { padding-left:22px; line-height:1.7; }
  .machine-step { border-left:5px solid var(--green); background:#f4fbf6; border-radius:10px; padding:14px 16px; margin-bottom:12px; }
  .machine-step h3 { font-size:1rem; margin-bottom:4px; }
  .machine-step .prog { color:var(--green); font-weight:700; }
  .machine-step .why { color:var(--muted); font-size:.87rem; margin-top:4px; }
  .warn { border-left:5px solid var(--accent2); background:#fdf6ee; border-radius:10px; padding:12px 16px; margin-bottom:12px; font-size:.9rem; }
  .alt { border-left:5px solid #b0bec5; background:#f5f7f8; border-radius:10px; padding:12px 16px; margin-bottom:12px; font-size:.9rem; }
  .tip { border-left:5px solid #f1c40f; background:#fefbea; border-radius:10px; padding:12px 16px; margin-bottom:12px; font-size:.9rem; }
  .cols { display:flex; gap:14px; flex-wrap:wrap; }
  .cols > div { flex:1; min-width:260px; }
  .badge { display:inline-block; background:#eaf7ef; color:var(--green); border-radius:6px; padding:2px 10px; font-size:.8rem; font-weight:600; margin-right:6px; }
  footer { text-align:center; color:var(--muted); font-size:.8rem; margin-top:20px; }"""

machines = []
for mf in sorted(glob.glob('json/maskiner/*.json')):
    try:
        machines.append(json.load(open(mf, encoding='utf-8')))
    except Exception:
        pass
by_id = {m['id']: m for m in machines}

ALIAS = {'airfryer': 'cosori-twinfry-10l', 'air fryer': 'cosori-twinfry-10l',
         'varmluftsfrit': 'cosori-twinfry-10l', 'bakmaskin': 'clatronic-bba3774',
         'brodmaskin': 'clatronic-bba3774', 'riskokare': 'midea-mb-fs5017',
         'multikokare': 'midea-mb-fs5017', 'glassmaskin': 'greenpan-frost',
         'slushmaskin': 'greenpan-frost', 'slushie': 'greenpan-frost',
         'frost': 'greenpan-frost', 'greenpan': 'greenpan-frost',
         'pizzaugn': 'klaif-pizzaugn', 'ismaskin': 'silonn-ismaskin',
         'torkautomat': 'wmf-snacktogo', 'dehydrator': 'wmf-snacktogo',
         'kaffekvarn': 'linkchef-grinder'}

EMOJI_MAP = [('pizza', '🍕'), ('glass', '🍦'), ('slush', '🍹'), ('shake', '🥤'),
             ('pita', '🫓'), ('brod', '🍞'), ('bröd', '🍞'), ('deg', '🥖'),
             ('kaka', '🍰'), ('chips', '🥨'), ('snacks', '🥨'), ('soppa', '🍲'),
             ('gryta', '🍲'), ('kyckling', '🍗'), ('fisk', '🐟'), ('ris', '🍚'),
             ('pasta', '🍝'), ('hund', '🐶'), ('drink', '🍹'), ('sallad', '🥗')]
MATORD = ['kaka', 'bröd', 'deg', 'pizza', 'glass', 'slush', 'soppa', 'gryta',
          'kyckling', 'fisk', 'ris', 'pasta', 'sallad', 'shake', 'smoothie',
          'chips', 'snacks', 'efterrätt', 'fika', 'protein', 'airfryer', 'drink']


def meta_of(t, n):
    m = re.search(r'<meta name="recept:' + n + r'" content="([^"]*)"', t)
    return m.group(1) if m else ''


def find_machines(tl):
    hits, seen = [], set()
    for m in machines:
        names = [x for x in [m.get('modellnamn', ''), m.get('varumarke', '')] if len(x) > 3]
        if any(n.lower() in tl for n in names):
            prog = next((p['namn'] for p in m.get('program', [])
                         if len(p['namn'].split('(')[0].strip()) > 3
                         and p['namn'].split('(')[0].strip().lower() in tl), None)
            hits.append((m, prog))
            seen.add(m['id'])
    for w, mid in ALIAS.items():
        if w in tl and mid not in seen and mid in by_id:
            m = by_id[mid]
            prog = next((p['namn'] for p in m.get('program', [])
                         if len(p['namn'].split('(')[0].strip()) > 3
                         and p['namn'].split('(')[0].strip().lower() in tl), None)
            hits.append((m, prog))
            seen.add(mid)
    return hits


def extract(t):
    body = t[t.index('<body'):] if '<body' in t else t
    body = re.sub(r'<script.*?</script>', '', body, flags=re.S)
    body = re.sub(r'<style.*?</style>', '', body, flags=re.S)
    tables = re.findall(r'<table[^>]*>.*?</table>', body, flags=re.S)
    ols = re.findall(r'<ol[^>]*>.*?</ol>', body, flags=re.S)
    plain = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', body))
    return tables, ols, plain


def clean_table(tbl):
    tbl = re.sub(r'<table[^>]*>', '<table>', tbl)
    tbl = re.sub(r'<(td|th)[^>]*>', r'<\1>', tbl)
    tbl = re.sub(r'<tr[^>]*>(\s*<td>\s*Total)', r'<tr class="total">\1', tbl, flags=re.I)
    return tbl


def is_standard(t):
    return (MARKER in t or
            ('--bg:#f6f3ee' in t and 'viewport' in t and 'assets/site.js' in t
             and 'hero-img' in t and 'linear-gradient(135deg,#c0392b,#e67e22)' in t))


TEMPLATE = """<!DOCTYPE html>
<!-- PLATS: /recept/{fname}  (recept-mappen - laeses in automatiskt) -->
<!-- {marker} : konverterad till standardutformningen -->
<html lang="sv">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{emoji} {namn} - Recept</title>

<!-- ===== RECEPT-METADATA ===== -->
<meta name="recept:namn" content="{namn}">
<meta name="recept:emoji" content="{emoji}">
<meta name="recept:beskrivning" content="{beskr}">
<meta name="recept:taggar" content="{taggar}">
<meta name="recept:maskiner" content="{maskiner}">
<!-- =========================== -->

<link rel="stylesheet" href="../assets/print.css">
<style>
{style}
</style>
</head>
<body>

<header>
  <h1>{emoji} {namn}</h1>
  <p>{beskr}</p>
  <p style="margin-top:6px;">{chips}</p>
</header>

<img class="hero-img" src="../images/recept/{base}.jpg" alt="{namn}" onerror="this.style.display='none'">

{ing}

{steg}

{naring}

<footer>Recept kopplat till Maskindatabas - konverterat till standardutformning</footer>

<script src="../assets/site.js"></script>
</body>
</html>
"""


def main():
    try:
        energi = json.load(open('json/energi.json', encoding='utf-8'))
    except Exception:
        energi = {'_plats': '/json/energi.json  (central energidata per recept)', 'recept': {}}
    energi.setdefault('recept', {})

    changed = []
    for f in sorted(glob.glob('recept/*.html')):
        fname = os.path.basename(f)
        t = open(f, encoding='utf-8').read()
        if is_standard(t):
            continue

        tables, ols, plain = extract(t)
        tl = plain.lower()
        base = fname.replace('.html', '')

        namn = meta_of(t, 'namn')
        if not namn:
            tm = re.search(r'<title>(.*?)</title>', t, re.S)
            h1 = re.search(r'<h1[^>]*>(.*?)</h1>', t, re.S)
            raw = tm.group(1) if tm else (h1.group(1) if h1 else base)
            namn = re.sub(r'<[^>]+>', '', raw)
            namn = re.sub(r'\s*[-\u2013]\s*Recept.*$', '', namn).strip()

        emoji = meta_of(t, 'emoji')
        if not emoji or emoji == '\U0001F37D\uFE0F':
            em = re.findall(r'[\U0001F300-\U0001FAFF]', namn)
            emoji = em[0] if em else next(
                (e for w, e in EMOJI_MAP if w in (namn + ' ' + base).lower()), '\U0001F37D\uFE0F')
        namn_ren = re.sub(r'[\U0001F300-\U0001FAFF]\s*', '', namn).strip()

        beskr = meta_of(t, 'beskrivning')
        if not beskr:
            pm = re.search(r'<p[^>]*>(.*?)</p>', t, re.S)
            beskr = re.sub(r'<[^>]+>', '', pm.group(1)).strip()[:160] if pm else 'Se receptet.'

        taggar = meta_of(t, 'taggar') or ', '.join([w for w in MATORD if w in tl][:6])

        mhits = find_machines(tl)
        mask_meta = meta_of(t, 'maskiner')
        if not mask_meta and mhits:
            mask_meta = ' | '.join('Tillagning: %s %s - %s' % (
                m.get('varumarke', ''), m.get('modellnamn', ''),
                (prog or 'se program i databasen')) for m, prog in mhits[:3])

        ing = ('<div class="card">\n  <h2>\U0001F9FE Ingredienser</h2>\n  '
               + clean_table(tables[0]) + '\n</div>') if tables else ''

        machine_box = ''
        if mhits:
            m, prog = mhits[0]
            machine_box = ('<div class="machine-step">\n    <h3>\u2699\uFE0F %s %s - '
                           '<span class="prog">%s</span></h3>\n    <div class="why">'
                           'Se maskindatabasen for programdetaljer.</div>\n  </div>') % (
                          m.get('varumarke', ''), m.get('modellnamn', ''), prog or 'se program')
        steg = ''
        if ols or machine_box:
            steg = ('<div class="card">\n  <h2>\U0001F963 Gor sa har</h2>\n  '
                    + machine_box + '\n  ' + (ols[0] if ols else '') + '\n</div>')

        naring = ('<div class="card">\n  <h2>\U0001F4CA Naringsvarde</h2>\n  '
                  + clean_table(tables[1]) + '\n</div>') if len(tables) > 1 else ''

        chips = ' '.join(
            '<span style="background:rgba(255,255,255,.25); border-radius:6px; '
            'padding:2px 10px; font-size:.85rem;">%s %s</span>' % (
                m.get('varumarke', ''), m.get('modellnamn', '')) for m, prog in mhits[:2])

        new = TEMPLATE.format(
            fname=fname, marker=MARKER, emoji=emoji,
            namn=H.escape(namn_ren, quote=True), beskr=H.escape(beskr, quote=True),
            taggar=H.escape(taggar, quote=True), maskiner=H.escape(mask_meta, quote=True),
            style=STYLE, chips=chips, base=base, ing=ing, steg=steg, naring=naring)

        open(f, 'w', encoding='utf-8').write(new)
        changed.append(fname)

        if fname not in energi['recept'] and mhits:
            tm2 = re.search(r'(\d+)\s*(?:min|minuter)', plain)
            if tm2:
                m, prog = mhits[0]
                energi['recept'][fname] = [{'maskin': m['id'], 'min': int(tm2.group(1)),
                                            'moment': (prog or 'Tillagning').split('(')[0].strip()}]

    json.dump(energi, open('json/energi.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    idx = sorted(os.path.basename(x) for x in glob.glob('json/maskiner/*.json'))
    json.dump(idx, open('json/maskiner-index.json', 'w'), ensure_ascii=False, indent=1)

    print('=== OMBYGGDA TILL STANDARD ===')
    for c in changed:
        print(' -', c)
    if not changed:
        print(' (alla recept redan i standardutformningen)')


if __name__ == '__main__':
    main()
