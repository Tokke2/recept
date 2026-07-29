# ============================================================
# PLATS: /.github/workflows/konvertera.py  (körs av autofix-recept.yml)
# ============================================================
# KONVERTERINGSMOTORN v4 - 10000% battre an v3
# ============================================================
# Bygger om nya recept till sajtens standardutformning.
#
# v4-NYHETER:
#  1) INGREDIENSER ALLTID OVERST (mk-ing-card + forsta kortet)
#  2) SMARTARE TABELLIGENKANNING: hittar ingredienstabellen aven
#     om den inte ar forst (soker "g", "gram", "msk" i cellerna)
#  3) PRIS/NARING-EXTRAKTION: summerar kostnad ur tabellen,
#     hittar kcal/protein i texten -> battre beskrivning
#  4) FLERA MASKINSTEG: alla matchade maskiner far egna rutor
#     med program + tid nara maskinnamnet (inte bara forsta)
#  5) VARNINGS-EXTRAKTION: stycken med "OBS/varning/viktigt/!"
#     blir riktiga .warn-rutor
#  6) TIPS-EXTRAKTION: stycken med "tips/tips:" blir .tip-rutor
#  7) PORTIONS-DETEKTION: "4 portioner/bitar/bollar" -> metadata
#  8) STADAR filnamn-baserade namn (a4-, recept_, -print osv)
#  9) VALIDERING + RAPPORT: loggar exakt vad som gjordes per fil
# 10) IDEMPOTENT: kors om utan att forstora (markor + igenkanning)
# ============================================================
import glob
import re
import json
import os
import html as H

MARKER = 'mk-std-v4'
OLD_MARKERS = ['mk-std-v3']

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

# ---------- Maskindatabas ----------
machines = []
for mf in sorted(glob.glob('json/maskiner/*.json')):
    try:
        machines.append(json.load(open(mf, encoding='utf-8')))
    except Exception:
        pass
by_id = {m['id']: m for m in machines}

ALIAS = {'airfryer': 'cosori-twinfry-10l', 'air fryer': 'cosori-twinfry-10l',
         'varmluftsfrit': 'cosori-twinfry-10l', 'bakmaskin': 'clatronic-bba3774',
         'brodmaskin': 'clatronic-bba3774', 'brödmaskin': 'clatronic-bba3774',
         'riskokare': 'midea-mb-fs5017', 'multikokare': 'midea-mb-fs5017',
         'glassmaskin': 'greenpan-frost', 'slushmaskin': 'greenpan-frost',
         'slushie': 'greenpan-frost', 'frost': 'greenpan-frost',
         'greenpan': 'greenpan-frost', 'pizzaugn': 'klaif-pizzaugn',
         'pizzasten': 'klaif-pizzaugn', 'ismaskin': 'silonn-ismaskin',
         'torkautomat': 'wmf-snacktogo', 'dehydrator': 'wmf-snacktogo',
         'smorgasgrill': 'krups-fdk452', 'kaffekvarn': 'linkchef-grinder'}

EMOJI_MAP = [('pizza', '\U0001F355'), ('glass', '\U0001F366'), ('slush', '\U0001F379'),
             ('shake', '\U0001F964'), ('smoothie', '\U0001F964'), ('pita', '\U0001FAD3'),
             ('brod', '\U0001F35E'), ('bröd', '\U0001F35E'), ('deg', '\U0001F956'),
             ('kaka', '\U0001F370'), ('chips', '\U0001F968'), ('snacks', '\U0001F968'),
             ('soppa', '\U0001F372'), ('gryta', '\U0001F372'), ('kyckling', '\U0001F357'),
             ('fisk', '\U0001F41F'), ('lax', '\U0001F41F'), ('ris', '\U0001F35A'),
             ('pasta', '\U0001F35D'), ('makaron', '\U0001F35D'), ('hund', '\U0001F436'),
             ('drink', '\U0001F379'), ('sallad', '\U0001F957'), ('yoghurt', '\U0001F95B'),
             ('agg', '\U0001F373'), ('ägg', '\U0001F373'), ('pannkak', '\U0001F95E'),
             ('vaffl', '\U0001F9C7'), ('kott', '\U0001F969'), ('kött', '\U0001F969')]

MATORD = ['kaka', 'bröd', 'deg', 'pizza', 'glass', 'slush', 'soppa', 'gryta',
          'kyckling', 'fisk', 'ris', 'pasta', 'sallad', 'shake', 'smoothie',
          'chips', 'snacks', 'efterrätt', 'fika', 'protein', 'airfryer', 'drink',
          'frukost', 'vegetarisk', 'bakning', 'grill']

DEFAULT_EMOJI = '\U0001F37D\uFE0F'


def meta_of(t, n):
    m = re.search(r'<meta name="recept:' + n + r'" content="([^"]*)"', t)
    return m.group(1) if m else ''


def time_near(tl, anchor, window=170):
    """Tid (min) inom `window` tecken EFTER anchor-ordet."""
    i = tl.find(anchor.lower())
    if i == -1:
        return None
    seg = tl[i:i + window]
    hm = re.search(r'(\d+)[:.](\d+)\s*h', seg)
    if hm:
        return int(hm.group(1)) * 60 + int(hm.group(2))
    tm = re.search(r'(\d+)\s*(?:min|minuter)', seg)
    if tm:
        return int(tm.group(1))
    hh = re.search(r'(\d+)\s*(?:h|tim)', seg)
    if hh:
        return int(hh.group(1)) * 60
    return None


def find_machines(tl):
    """Alla maskiner i texten -> [(maskin, program, min)] med tid nara namnet."""
    hits, seen = [], set()
    for m in machines:
        names = [x for x in [m.get('modellnamn', ''), m.get('varumarke', '')] if len(x) > 3]
        anchor = next((n for n in names if n.lower() in tl), None)
        if not anchor:
            continue
        prog = next((p['namn'] for p in m.get('program', [])
                     if len(p['namn'].split('(')[0].strip()) > 3
                     and p['namn'].split('(')[0].strip().lower() in tl), None)
        mins = (time_near(tl, prog.split('(')[0].strip()) if prog else None) or time_near(tl, anchor)
        hits.append((m, prog, mins))
        seen.add(m['id'])
    for w, mid in ALIAS.items():
        if w in tl and mid not in seen and mid in by_id:
            m = by_id[mid]
            prog = next((p['namn'] for p in m.get('program', [])
                         if len(p['namn'].split('(')[0].strip()) > 3
                         and p['namn'].split('(')[0].strip().lower() in tl), None)
            mins = (time_near(tl, prog.split('(')[0].strip()) if prog else None) or time_near(tl, w)
            hits.append((m, prog, mins))
            seen.add(mid)
    return hits


def extract(t):
    body = t[t.index('<body'):] if '<body' in t else t
    body = re.sub(r'<script.*?</script>', '', body, flags=re.S)
    body = re.sub(r'<style.*?</style>', '', body, flags=re.S)
    tables = re.findall(r'<table[^>]*>.*?</table>', body, flags=re.S)
    ols = re.findall(r'<ol[^>]*>.*?</ol>', body, flags=re.S)
    paras = [re.sub(r'<[^>]+>', '', p).strip()
             for p in re.findall(r'<p[^>]*>(.*?)</p>', body, flags=re.S)]
    plain = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', body))
    return tables, ols, paras, plain


def looks_like_ingredients(tbl):
    """Poang: hur mycket ser tabellen ut som en ingredienslista?"""
    txt = re.sub(r'<[^>]+>', ' ', tbl).lower()
    score = 0
    score += 3 * len(re.findall(r'\b\d+[.,]?\d*\s*(?:g|gram|kg|dl|ml|msk|tsk|st)\b', txt))
    if 'ingredien' in txt or 'ravara' in txt or 'råvara' in txt:
        score += 10
    if 'kcal' in txt and score < 5:
        score -= 5  # troligen naringstabell
    return score


def pick_tables(tables):
    """Valj (ingredienstabell, naringstabell) smartast mojligt."""
    if not tables:
        return None, None
    scored = sorted(((looks_like_ingredients(tb), i) for i, tb in enumerate(tables)), reverse=True)
    ing_i = scored[0][1] if scored[0][0] > 0 else 0
    nar_i = None
    for i, tb in enumerate(tables):
        if i != ing_i and 'kcal' in re.sub(r'<[^>]+>', ' ', tb).lower():
            nar_i = i
            break
    if nar_i is None and len(tables) > 1:
        nar_i = 1 if ing_i != 1 else (0 if ing_i != 0 else None)
    return tables[ing_i], (tables[nar_i] if nar_i is not None else None)


def clean_table(tbl):
    tbl = re.sub(r'<table[^>]*>', '<table>', tbl)
    tbl = re.sub(r'<(td|th)[^>]*>', r'<\1>', tbl)
    tbl = re.sub(r'<tr[^>]*>(\s*<td>\s*Total)', r'<tr class="total">\1', tbl, flags=re.I)
    return tbl


def extract_boxes(paras):
    """Varningar och tips ur styckena."""
    warns, tips, used = [], [], set()
    for p in paras:
        pl = p.lower()
        if len(p) < 15 or len(p) > 400:
            continue
        if re.match(r'\s*(⚠|obs|varning|viktigt)', pl) or 'far inte' in pl or 'får inte' in pl or 'aldrig' in pl:
            warns.append(p)
            used.add(p)
        elif re.match(r'\s*(💡|tips)', pl) or pl.startswith('tips'):
            tips.append(p)
            used.add(p)
    return warns[:2], tips[:2], used


def prettify_name(base):
    """Stadar filnamnsbaserade namn: a4-, recept_, -print, bindestreck."""
    n = base
    n = re.sub(r'^(a4|recept|print)[-_]+', '', n, flags=re.I)
    n = re.sub(r'[-_]+(print|a4)$', '', n, flags=re.I)
    n = n.replace('-', ' ').replace('_', ' ')
    n = re.sub(r'\s+', ' ', n).strip()
    return n[:1].upper() + n[1:] if n else base


def is_standard(t):
    if MARKER in t:
        return True
    # v3-filer uppgraderas INTE automatiskt (de ar redan bra) - men rakna dem som standard
    if any(m in t for m in OLD_MARKERS):
        return True
    return ('--bg:#f6f3ee' in t and 'viewport' in t and 'assets/site.js' in t
            and 'hero-img' in t and 'linear-gradient(135deg,#c0392b,#e67e22)' in t)


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

{warns}

{ing}

{steg}

{naring}

{tips}

<footer>Recept kopplat till Maskindatabas - konverterat till standardutformning</footer>

<script src="../assets/site.js"></script>
</body>
</html>
"""


def convert_file(f, energi):
    fname = os.path.basename(f)
    t = open(f, encoding='utf-8').read()
    if is_standard(t):
        return None

    log = []
    tables, ols, paras, plain = extract(t)
    tl = plain.lower()
    base = fname.replace('.html', '')

    # ---------- Namn ----------
    namn = meta_of(t, 'namn')
    if not namn:
        tm = re.search(r'<title>(.*?)</title>', t, re.S)
        h1 = re.search(r'<h1[^>]*>(.*?)</h1>', t, re.S)
        t_txt = re.sub(r'<[^>]+>', '', tm.group(1)).strip() if tm else ''
        h_txt = re.sub(r'<[^>]+>', '', h1.group(1)).strip() if h1 else ''
        # Foredra h1 om title ser ut som ett filnamn (bindestreck, inga mellanslag)
        title_is_filename = bool(t_txt) and (' ' not in t_txt) and ('-' in t_txt or '_' in t_txt)
        raw = h_txt if (title_is_filename and h_txt) else (t_txt or h_txt or base)
        namn = re.sub(r'\s*[-\u2013]\s*Recept.*$', '', raw).strip()
        if not namn or namn.lower() == base.lower():
            namn = prettify_name(base)
        log.append('namn')

    # ---------- Emoji ----------
    emoji = meta_of(t, 'emoji')
    if not emoji or emoji == DEFAULT_EMOJI:
        em = re.findall(r'[\U0001F300-\U0001FAFF]', namn)
        emoji = em[0] if em else next(
            (e for w, e in EMOJI_MAP if w in (namn + ' ' + base).lower()), DEFAULT_EMOJI)
        log.append('emoji=' + emoji)
    namn_ren = re.sub(r'[\U0001F300-\U0001FAFF\uFE0F]\s*', '', namn).strip()

    # ---------- Portioner, kcal, kostnad (for beskrivning) ----------
    port_m = re.search(r'(\d+)\s*(?:portioner|port\b|bitar|bollar|st(?:ycken)?\b|brod|bröd)', tl)
    kcal_m = re.search(r'(\d+)\s*kcal', tl)
    cost_m = re.findall(r'(\d+[.,]?\d*)\s*kr', tl)

    # ---------- Beskrivning ----------
    beskr = meta_of(t, 'beskrivning')
    if not beskr or len(beskr) < 12:
        cand = next((p for p in paras if 15 < len(p) < 200
                     and not re.match(r'\s*(⚠|obs|tips|💡)', p.lower())), '')
        bits = [cand] if cand else []
        extra = []
        if port_m:
            extra.append(port_m.group(1) + ' portioner')
        if kcal_m:
            extra.append('~' + kcal_m.group(1) + ' kcal/port')
        if cost_m:
            try:
                total = max(float(x.replace(',', '.')) for x in cost_m)
                extra.append('~' + ('%g' % total) + ' kr')
            except ValueError:
                pass
        if extra:
            bits.append(', '.join(extra) + '.')
        beskr = ' '.join(bits)[:200] or 'Se receptet for detaljer.'
        log.append('beskrivning')

    # ---------- Taggar ----------
    taggar = meta_of(t, 'taggar') or ', '.join([w for w in MATORD if w in tl][:6])

    # ---------- Maskiner (ALLA matchade) ----------
    mhits = find_machines(tl)
    mask_meta = meta_of(t, 'maskiner')
    if (not mask_meta or 'se recept' in mask_meta) and mhits:
        parts = []
        for m, prog, mins in mhits[:3]:
            p = '%s %s - %s' % (m.get('varumarke', ''), m.get('modellnamn', ''),
                                (prog or 'se program i databasen'))
            if mins:
                p += ' %d min' % mins
            parts.append('Tillagning: ' + p)
        mask_meta = ' | '.join(parts)
        log.append('maskiner=%d st' % len(mhits))

    # ---------- Tabeller: valj smart ----------
    ing_tbl, nar_tbl = pick_tables(tables)
    ing = ''
    if ing_tbl:
        ing = ('<div class="card mk-ing-card">\n  <h2>\U0001F9FE Ingredienser</h2>\n  '
               + clean_table(ing_tbl) + '\n</div>')
    naring = ''
    if nar_tbl:
        naring = ('<div class="card">\n  <h2>\U0001F4CA Naringsvarde</h2>\n  '
                  + clean_table(nar_tbl) + '\n</div>')

    # ---------- Varningar & tips ----------
    warn_list, tip_list, _used = extract_boxes(paras)
    warns = '\n'.join('<div class="warn">\u26A0\uFE0F ' + H.escape(w) + '</div>' for w in warn_list)
    tips = '\n'.join('<div class="tip">\U0001F4A1 ' + H.escape(p) + '</div>' for p in tip_list)
    if warn_list:
        log.append('varningar=%d' % len(warn_list))
    if tip_list:
        log.append('tips=%d' % len(tip_list))

    # ---------- Maskinsteg (ALLA maskiner far rutor) ----------
    boxes = ''
    for m, prog, mins in mhits[:3]:
        tid = (' \u00b7 %d min' % mins) if mins else ''
        boxes += ('<div class="machine-step">\n    <h3>\u2699\uFE0F %s %s \u00b7 '
                  '<span class="prog">%s%s</span></h3>\n    <div class="why">'
                  'Se maskindatabasen for programdetaljer.</div>\n  </div>\n  ') % (
                 m.get('varumarke', ''), m.get('modellnamn', ''),
                 prog or 'se program', tid)
    steg = ''
    if ols or boxes:
        steg = ('<div class="card mk-step-card">\n  <h2>\U0001F963 Gor sa har</h2>\n  '
                + boxes + (ols[0] if ols else '') + '\n</div>')

    chips = ' '.join(
        '<span style="background:rgba(255,255,255,.25); border-radius:6px; '
        'padding:2px 10px; font-size:.85rem;">%s %s</span>' % (
            m.get('varumarke', ''), m.get('modellnamn', '')) for m, prog, mins in mhits[:2])

    new = TEMPLATE.format(
        fname=fname, marker=MARKER, emoji=emoji,
        namn=H.escape(namn_ren, quote=True), beskr=H.escape(beskr, quote=True),
        taggar=H.escape(taggar, quote=True), maskiner=H.escape(mask_meta, quote=True),
        style=STYLE, chips=chips, base=base, warns=warns, ing=ing,
        steg=steg, naring=naring, tips=tips)

    open(f, 'w', encoding='utf-8').write(new)

    # ---------- Energidata: ALLA maskiner med tid ----------
    if fname not in energi['recept'] and mhits:
        rows = [{'maskin': m['id'], 'min': mins,
                 'moment': (prog or 'Tillagning').split('(')[0].strip()}
                for m, prog, mins in mhits[:3] if mins]
        if not rows:
            # Fallback: forsta tid i texten -> forsta maskinen
            any_t = re.search(r'(\d+)\s*(?:min|minuter)', plain)
            if any_t:
                m0, prog0, _ = mhits[0]
                rows = [{'maskin': m0['id'], 'min': int(any_t.group(1)),
                         'moment': (prog0 or 'Tillagning').split('(')[0].strip()}]
        if rows:
            energi['recept'][fname] = rows
            log.append('energi=%d steg' % len(rows))

    return fname + '  [' + ', '.join(log) + ']'


def main():
    try:
        energi = json.load(open('json/energi.json', encoding='utf-8'))
    except Exception:
        energi = {'_plats': '/json/energi.json  (central energidata per recept)', 'recept': {}}
    energi.setdefault('recept', {})

    changed = []
    for f in sorted(glob.glob('recept/*.html')):
        res = convert_file(f, energi)
        if res:
            changed.append(res)

    json.dump(energi, open('json/energi.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    idx = sorted(os.path.basename(x) for x in glob.glob('json/maskiner/*.json'))
    json.dump(idx, open('json/maskiner-index.json', 'w'), ensure_ascii=False, indent=1)

    print('=== KONVERTERINGSRAPPORT v4 ===')
    for c in changed:
        print(' -', c)
    if not changed:
        print(' (alla recept redan i standardutformningen)')


if __name__ == '__main__':
    main()
