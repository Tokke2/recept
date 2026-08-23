# ============================================================
# PLATS: /.github/workflows/maskin-robot.py
# ============================================================
# 🤖 MASKIN-IMPORTROBOT – Mitt Maskinkök
# ============================================================
# Läser produktlänkar ur json/maskin-ko.txt (skrivs av
# maskin-import.html via spara.js) och bygger KOMPLETTA
# maskinfiler automatiskt:
#   · ASIN + produktnamn (Amazon: ur URL-slug eller DuckDuckGo-
#     sökning på ASIN – Amazons sidor SCRAPAS ALDRIG, policy!)
#   · Andra butiker/tillverkare: sidans <title>/og:title
#   · Varumärke (känd lista + första ordet) + modellnummer (regex)
#   · Maskintyp (nyckelord sv/en) + effekt (W ur namnet)
#   · Tillverkarens hemsida (varumärke→domän-karta)
#   · Bruksanvisning: sökta länkar (manualslib + manuals.plus)
#   · Program: STANDARDPROGRAM per maskintyp, märkta
#     "VERIFIERA mot bruksanvisningen" (ingen robot kan läsa
#     manualen – be en AI-chatt verifiera, eller redigera själv)
# Skriver json/maskiner/ID.json + uppdaterar maskiner-index.json.
# Kön töms (behandlade rader blir #KLAR-kommentarer).
# ============================================================
import json
import os
import re
import sys
import urllib.request
import urllib.parse

KO = 'json/maskin-ko.txt'
MASKINDIR = 'json/maskiner'
INDEX = 'json/maskiner-index.json'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

BRANDS = ['ninja', 'cosori', 'philips', 'tefal', 'bosch', 'electrolux', 'wilfa',
          'kenwood', 'moulinex', 'russell hobbs', 'instant', 'xiaomi', 'severin',
          'wmf', 'greenpan', 'midea', 'clatronic', 'princess', 'emerio', 'tristar',
          'melissa', 'obh nordica', 'obh', 'krups', 'klaif', 'silonn', 'yum asia',
          'delonghi', 'sage', 'gastroback', 'steba', 'unold', 'graef', 'caso',
          'klarstein', 'aigostar', 'ultratec', 'arendo', 'bomann', 'proficook']

TILLVERKARE = {
    'ninja': 'https://ninjakitchen.eu/', 'cosori': 'https://cosori.com/',
    'philips': 'https://www.philips.se/', 'tefal': 'https://www.tefal.se/',
    'bosch': 'https://www.bosch-home.se/', 'electrolux': 'https://www.electrolux.se/',
    'wilfa': 'https://www.wilfa.se/', 'kenwood': 'https://www.kenwoodworld.com/sv-se',
    'moulinex': 'https://www.moulinex.com/', 'russell hobbs': 'https://se.russellhobbs.com/',
    'instant': 'https://www.instanthome.com/', 'xiaomi': 'https://www.mi.com/se/',
    'severin': 'https://www.severin.com/', 'wmf': 'https://www.wmf.com/',
    'greenpan': 'https://www.greenpan.se/', 'midea': 'https://www.midea.com/',
    'clatronic': 'https://www.clatronic.de/', 'princess': 'https://www.princesshome.eu/sv-se',
    'emerio': 'https://emerio.eu/', 'tristar': 'https://www.tristar.eu/sv/',
    'melissa': 'https://melissa.dk/', 'obh nordica': 'https://www.obhnordica.se/',
    'obh': 'https://www.obhnordica.se/', 'krups': 'https://www.krups.se/',
    'delonghi': 'https://www.delonghi.com/sv-se/', 'sage': 'https://www.sageappliances.com/',
    'gastroback': 'https://www.gastroback.de/', 'steba': 'https://www.steba.com/',
    'unold': 'https://unold.de/', 'graef': 'https://www.graef.de/',
    'caso': 'https://www.casoappliances.com/', 'klarstein': 'https://www.klarstein.se/',
    'yum asia': 'https://yumasia.co.uk/', 'bomann': 'https://www.bomann-germany.de/',
    'proficook': 'https://www.proficook.de/'
}

TYPER = [
    (r'airfry|air fry|varmluftsfrit|hot air fryer|heißluftfrit|crispi|frit[öo]s', 'Airfryer / Varmluftsfritös'),
    (r'riskokare|rice cooker|multikok|multicooker|multi cooker|pressure cooker|tryckkokare', 'Riskokare / Multikokare'),
    (r'bakmaskin|bread ?(maker|baker|machine)|brotback|brödbak|bakautomat', 'Bakmaskin / Brödbakningsmaskin'),
    (r'glass|ice cream|slush|frozen drink|sorbet', 'Glassmaskin / Frozen Drink Maker'),
    (r'dehydrator|torkautomat|food dryer|dörrautomat', 'Torkautomat / Dehydrator'),
    (r'ismaskin|ice maker|ice cube', 'Ismaskin'),
    (r'pizzaugn|pizza oven|pizza maker', 'Pizzaugn'),
    (r'blender|mixer|smoothie maker', 'Blender / Mixer'),
    (r'sous vide', 'Sous vide'),
    (r'kaffekvarn|coffee grinder|kryddkvarn|spice grinder', 'Kaffekvarn / Kryddkvarn'),
    (r'smörgåsgrill|sandwich toaster|sandwich maker|panini', 'Smörgåsgrill'),
    (r'våffeljärn|waffle', 'Våffeljärn'),
    (r'slow ?cooker|långkokare', 'Slow cooker'),
]

# Standardprogram per typ – ALLTID märkta för verifiering
PROGRAM = {
    'Airfryer / Varmluftsfritös': [
        ('Air Fry', '200 °C · 12–18 min', 'pommes, kyckling, grönsaker'),
        ('Roast', '180 °C · 18–25 min', 'kött, rotfrukter'),
        ('Bake', '160 °C · 20–30 min', 'bakverk, gratänger'),
        ('Reheat', '150 °C · 5–10 min', 'uppvärmning av rester'),
        ('Dehydrate', '55 °C · 4–8 h', 'torkade frukter, jerky'),
    ],
    'Riskokare / Multikokare': [
        ('Ris', 'auto', 'vitt ris, jasminris'),
        ('Gröt/Risotto', '45–60 min', 'gröt, risotto'),
        ('Ångkok', '15–30 min', 'grönsaker, fisk'),
        ('Soppa', '60 min', 'soppor, buljong'),
        ('Långkok (Slow cook)', '2–8 h', 'grytor, pulled pork'),
        ('Kaka', '45–60 min', 'mjuka kakor'),
        ('Yoghurt', '8 h', 'hemgjord yoghurt'),
    ],
    'Bakmaskin / Brödbakningsmaskin': [
        ('Basic/Standard', '3:00 h', 'vitt matbröd'),
        ('Snabbprogram', '1:58 h', 'snabbt bröd'),
        ('Deg (Dough)', '1:30 h', 'pizzadeg, bulldeg – knådar+jäser utan bakning'),
        ('Sylt (Jam)', '1:20 h', 'sylt och marmelad'),
        ('Kaka (Cake)', '1:50 h', 'mjuka kakor'),
        ('Glutenfri', '2:50 h', 'glutenfritt bröd'),
    ],
    'Glassmaskin / Frozen Drink Maker': [
        ('Glass', '20–40 min', 'gräddglass'),
        ('Sorbet', '20–30 min', 'fruktsorbet'),
        ('Milkshake', '10–15 min', 'milkshake'),
    ],
    'Torkautomat / Dehydrator': [
        ('Örter', '35–40 °C · 4–8 h', 'basilika, persilja'),
        ('Grönsaker', '50–55 °C · 6–10 h', 'tomater, chips'),
        ('Frukt', '57–60 °C · 6–12 h', 'äpple, banan'),
        ('Jerky', '65–70 °C · 4–7 h', 'köttorkning'),
    ],
    'Ismaskin': [
        ('Iskuber', '6–12 min per omgång', 'små/stora kuber'),
        ('Självrengöring', '~30 min', 'rengöringsprogram'),
    ],
    'Pizzaugn': [
        ('Pizza', 'max värme · 60–120 sek efter 10–15 min förvärmning', 'napolitansk pizza'),
    ],
    'Blender / Mixer': [
        ('Mixa', '30–60 sek', 'smoothies, soppor'),
        ('Puls', 'korta tryck', 'hackning, krossa is'),
    ],
    'Sous vide': [('Sous vide', 'temp/tid ställs manuellt', 'kött, fisk, ägg')],
    'Kaffekvarn / Kryddkvarn': [('Malning', 'puls, 10–30 sek', 'kaffe, kryddor, nötter')],
    'Smörgåsgrill': [('Toast', '3–5 min', 'varma mackor')],
    'Våffeljärn': [('Våfflor', '3–5 min', 'frasvåfflor')],
    'Slow cooker': [('Låg', '6–8 h', 'grytor'), ('Hög', '3–4 h', 'snabbare långkok')],
}


def hamta(url, timeout=20):
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode('utf-8', 'ignore')
    except Exception:
        return ''


def extrahera_asin(url):
    m = re.search(r'/(?:dp|gp/product|gp/aw/d)/([A-Z0-9]{10})(?:[/?]|$)', url, re.I)
    return m.group(1).upper() if m else None


def namn_ur_slug(url):
    """amazon.se/Ninja-Foodi-FlexDrawer-AF500EUCP/dp/ASIN → 'Ninja Foodi FlexDrawer AF500EUCP'"""
    m = re.search(r'amazon\.[a-z.]+/([^/]+)/dp/', url, re.I)
    if not m:
        return ''
    slug = urllib.parse.unquote(m.group(1))
    if slug.lower() in ('dp', 'gp'):
        return ''
    namn = slug.replace('-', ' ').strip()
    return namn if len(namn) > 8 else ''


def ddg_titel(fraga):
    """DuckDuckGo HTML-sök (POST krävs) → första resultattiteln.
       Amazons egna sidor SCRAPAS ALDRIG – endast söktitlar."""
    try:
        data = urllib.parse.urlencode({'q': fraga}).encode()
        req = urllib.request.Request('https://html.duckduckgo.com/html/', data=data, headers=UA)
        with urllib.request.urlopen(req, timeout=20) as r:
            html = r.read().decode('utf-8', 'ignore')
    except Exception:
        return ''
    m = re.search(r'result__a[^>]*>(.*?)</a>', html, re.S)
    if not m:
        return ''
    t = re.sub(r'<[^>]+>', '', m.group(1))
    t = re.sub(r'\s+', ' ', t).strip()
    # städa butiksstavelser
    t = re.sub(r'\s*[-–|:]\s*(Amazon\.[a-z.]+|amazon\.(se|com|de)).*$', '', t, flags=re.I)
    return t


def sid_titel(url):
    """Icke-Amazon-sidor: og:title eller <title>."""
    html = hamta(url)
    if not html:
        return ''
    m = re.search(r'property=["\']og:title["\']\s+content=["\']([^"\']+)', html) or \
        re.search(r'content=["\']([^"\']+)["\']\s+property=["\']og:title', html) or \
        re.search(r'<title[^>]*>(.*?)</title>', html, re.S)
    if not m:
        return ''
    t = re.sub(r'<[^>]+>', '', m.group(1))
    return re.sub(r'\s+', ' ', t).strip()


def hitta_varumarke(namn):
    n = ' ' + namn.lower() + ' '
    for b in sorted(BRANDS, key=len, reverse=True):
        if ' ' + b + ' ' in n or n.strip().startswith(b + ' '):
            return b.title() if b != 'wmf' else 'WMF'
    ord1 = namn.split()[0] if namn.split() else ''
    return ord1.capitalize() if len(ord1) >= 3 else ''


def hitta_modell(namn, varumarke):
    """Modelliknande token: versaler+siffror (AF500EUCP, MB-FS5017, BBA 3774)."""
    kandidater = re.findall(r'\b([A-Z]{2,}[- ]?[A-Z0-9]*\d[A-Z0-9-]*)\b', namn)
    kandidater = [k for k in kandidater if k.upper() != (varumarke or '').upper()
                  and not re.match(r'^\d+(L|W|ML|CM|KG|V|HZ)$', k, re.I)
                  and len(k) >= 3]
    if kandidater:
        return kandidater[0]
    delar = namn.split()
    if varumarke and delar and delar[0].lower() == varumarke.lower() and len(delar) > 1:
        return ' '.join(delar[1:3])
    return ''


def hitta_typ(namn):
    n = namn.lower()
    for monster, typ in TYPER:
        if re.search(monster, n):
            return typ
    return 'Annan köksmaskin'


def hitta_watt(namn):
    m = re.search(r'(\d{3,4})\s*W\b', namn, re.I)
    return int(m.group(1)) if m else 0


def slug(s):
    s = s.lower().replace('å', 'a').replace('ä', 'a').replace('ö', 'o')
    return re.sub(r'^-+|-+$', '', re.sub(r'[^a-z0-9]+', '-', s))


def hamta_bin(url, timeout=25, max_mb=8):
    """Hämta binärdata (bild/PDF)."""
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read(max_mb * 1024 * 1024 + 1)
            if len(data) > max_mb * 1024 * 1024:
                return b''
            return data
    except Exception:
        return b''


def hitta_bild(html, bas_url):
    """og:image / twitter:image / största produktbild ur tillverkarsidan.
       (Amazon-bilder hämtas ALDRIG – deras policy förbjuder det.)"""
    if not html:
        return ''
    for monster in [r'property=["\']og:image["\']\s+content=["\']([^"\']+)',
                    r'content=["\']([^"\']+)["\']\s+property=["\']og:image',
                    r'name=["\']twitter:image["\']\s+content=["\']([^"\']+)']:
        m = re.search(monster, html)
        if m and not re.search(r'logo|icon|sprite|favicon', m.group(1), re.I):
            return urllib.parse.urljoin(bas_url, m.group(1).split('?')[0] if '?' in m.group(1) else m.group(1))
    # reserv: första stora produktbilden
    for m in re.finditer(r'<img[^>]+src=["\']([^"\']+\.(?:jpg|jpeg|png|webp))["\']', html, re.I):
        src = m.group(1)
        if re.search(r'logo|icon|sprite|flag|badge', src, re.I):
            continue
        return urllib.parse.urljoin(bas_url, src)
    return ''


def spara_bild(bild_url, mid):
    """Ladda ner bilden → images/ID.jpg (eller .png/.webp)."""
    if not bild_url:
        return ''
    data = hamta_bin(bild_url)
    if len(data) < 3000:          # trasigt/pyttebild
        return ''
    and_ = '.jpg'
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        and_ = '.png'
    elif data[:4] == b'RIFF' and b'WEBP' in data[:16]:
        and_ = '.webp'
    os.makedirs('images', exist_ok=True)
    fil = 'images/%s%s' % (mid, and_)
    with open(fil, 'wb') as f:
        f.write(data)
    print('🖼️  Bild sparad: %s (%d kB)' % (fil, len(data) // 1024))
    return fil


def hitta_manual_pdf(html, bas_url):
    """Leta manual-PDF-länk på tillverkarsidan."""
    if not html:
        return ''
    for m in re.finditer(r'href=["\']([^"\']+\.pdf[^"\']*)["\']', html, re.I):
        href = m.group(1)
        if re.search(r'manual|bruksanvisning|instruction|user.?guide|gebrauch|bedienung|ib[-_]', href, re.I):
            return urllib.parse.urljoin(bas_url, href)
    m = re.search(r'href=["\']([^"\']+\.pdf[^"\']*)["\']', html, re.I)
    return urllib.parse.urljoin(bas_url, m.group(1)) if m else ''


# Programord som letas i manual-PDF:er (sv/en/de)
PROGRAMORD = [
    'air fry', 'airfry', 'max crisp', 'roast', 'bake', 'grill', 'reheat',
    'dehydrate', 'prove', 'proof', 'sync', 'broil', 'steam',
    'basic', 'french', 'whole wheat', 'quick', 'sweet', 'gluten free',
    'dough', 'jam', 'cake', 'sandwich', 'ultra fast', 'knead',
    'vitt bröd', 'fullkorn', 'snabbprogram', 'deg', 'sylt', 'kaka', 'glutenfri',
    'rice', 'porridge', 'soup', 'slow cook', 'yoghurt', 'yogurt', 'keep warm',
    'ris', 'gröt', 'soppa', 'långkok', 'varmhållning', 'ångkok',
    'sorbet', 'ice cream', 'milkshake', 'slush', 'smoothie',
]


def program_ur_pdf(pdf_url):
    """Försök läsa programnamn ur manual-PDF (kräver pypdf).
       Returnerar lista av programnamn – tider måste alltid verifieras."""
    if not pdf_url:
        return []
    try:
        from pypdf import PdfReader
    except ImportError:
        print('ℹ️  pypdf saknas – hoppar över PDF-läsning')
        return []
    data = hamta_bin(pdf_url, max_mb=15)
    if not data or data[:4] != b'%PDF':
        return []
    try:
        import io
        text = ''
        lasare = PdfReader(io.BytesIO(data))
        for sida in lasare.pages[:40]:
            text += (sida.extract_text() or '') + '\n'
        text_lc = text.lower()
        hittade = []
        for ord_ in PROGRAMORD:
            if ord_ in text_lc and ord_ not in [h.lower() for h in hittade]:
                hittade.append(ord_.title())
        if hittade:
            print('📖 Program ur manualen: %s' % ', '.join(hittade))
        return hittade
    except Exception as e:
        print('ℹ️  PDF-läsning misslyckades: %s' % e)
        return []


def bygg_maskin(urls):
    """urls = lista med 1+ länkar för SAMMA maskin (Amazon + tillverkare).
       Amazon ger ASIN/köplänk; tillverkarsidan ger namn/bild/manual."""
    if isinstance(urls, str):
        urls = [urls]
    amazon_url = next((u for u in urls if 'amazon.' in u.lower()), '')
    ovriga = [u for u in urls if u != amazon_url]
    tillv_url = ovriga[0] if ovriga else ''

    asin = extrahera_asin(amazon_url) if amazon_url else None

    # 1) Produktnamn: tillverkarsidan är bästa källan, annars Amazon-slug + DDG
    namn, sok, tillv_html = '', '', ''
    if tillv_url:
        tillv_html = hamta(tillv_url)
        namn = sid_titel(tillv_url) if not tillv_html else ''
        if tillv_html:
            m = re.search(r'property=["\']og:title["\']\s+content=["\']([^"\']+)', tillv_html) or \
                re.search(r'<title[^>]*>(.*?)</title>', tillv_html, re.S)
            if m:
                namn = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', m.group(1))).strip()
    if amazon_url:
        slug_namn = namn_ur_slug(amazon_url)
        if asin:
            sok = ddg_titel(asin) or ddg_titel(asin + ' amazon')
        # Amazon-namnet vinner om tillverkartiteln är generisk
        # ("Startseite", "Home", bara varumärket...) – produktsidor har
        # långa beskrivande titlar, startsidor har korta.
        def generisk(s):
            if not s:
                return True
            if re.search(r'startseite|homepage|produkter\b|products\b|official|välkommen|\bhome\b', s, re.I):
                return True
            return len(s.split()) <= 2 and not re.search(r'\d', s)
        basta_amazon = slug_namn or sok
        if basta_amazon and len(basta_amazon.split()) >= 3 and generisk(namn):
            namn = basta_amazon
    if not namn:
        namn = 'OKÄND PRODUKT – fyll i namnet'

    varumarke = hitta_varumarke(namn) or hitta_varumarke(sok)
    modell = hitta_modell(namn, varumarke) or hitta_modell(sok, varumarke)
    typ = hitta_typ(namn + ' ' + sok + ' ' + ' '.join(urls))
    watt = hitta_watt(namn) or hitta_watt(sok) or hitta_watt(tillv_html[:5000] if tillv_html else '')

    mid = slug((varumarke + '-' + modell) if (varumarke and modell) else (namn[:40] or (asin or 'maskin')))
    soktext = urllib.parse.quote((varumarke + ' ' + modell).strip() or namn[:50])

    # 2) 🖼️ Bild från TILLVERKARENS sida (aldrig Amazon)
    bildfil = ''
    if tillv_html:
        bildfil = spara_bild(hitta_bild(tillv_html, tillv_url), mid)

    # 3) 📖 Manual: PDF på tillverkarsidan? Läs programnamn ur den!
    manual_pdf = hitta_manual_pdf(tillv_html, tillv_url) if tillv_html else ''
    pdf_program = program_ur_pdf(manual_pdf)

    lankar = {
        'kop': ('https://www.amazon.se/dp/%s/' % asin) if asin else (amazon_url or tillv_url),
        'bruksanvisning': manual_pdf or ('https://www.manualslib.com/search.html?q=' + soktext),
        'bruksanvisning_alternativ': 'https://manuals.plus/?s=' + soktext,
        'tillverkare': tillv_url or TILLVERKARE.get(varumarke.lower(),
                                    'https://duckduckgo.com/?q=' + soktext + '+officiell+hemsida'),
    }

    # 4) Program: manual-PDF:ns program vinner, annars typstandard
    if pdf_program:
        program = [{
            'namn': p,
            'typ': 'Ur manualen',
            'standardtid': 'SE MANUALEN',
            'beskrivning': 'Programnamnet hittades i bruksanvisningen – VERIFIERA tid/temperatur där!',
            'bast_for': '...',
            'nyckelord': [p.lower()],
        } for p in pdf_program]
    else:
        program = [{
            'namn': p[0],
            'typ': 'Standardprogram',
            'standardtid': p[1],
            'beskrivning': 'ROBOT-FÖRIFYLLT standardprogram för maskintypen – VERIFIERA mot bruksanvisningen!',
            'bast_for': p[2],
            'nyckelord': [w.strip(',').lower() for w in p[2].split()[:4]],
        } for p in PROGRAM.get(typ, [])] or [{
            'namn': 'PROGRAM – fyll i från bruksanvisningen',
            'typ': 'Program', 'standardtid': 'XX min',
            'beskrivning': 'Roboten kände inte igen maskintypen – fyll i programmen manuellt.',
            'bast_for': '...', 'nyckelord': [],
        }]

    maskin = {
        '_plats': '/json/maskiner/%s.json  (en maskinfil per maskin – läses in automatiskt)' % mid,
        'id': mid,
        'namn': (namn[:80] if namn else mid),
        'typ': typ,
        'varumarke': varumarke or 'FYLL I',
        'modellnamn': modell or 'FYLL I',
        'kapacitet': 'FYLL I (t.ex. 5 L)',
        'effekt_w': watt or 1000,
        'effekt_kalla': 'ur produktnamnet' if watt else 'UPPSKATTAD av roboten – kontrollera!',
        'egenskaper': ['🤖 Importerad automatiskt %s – kontrollera uppgifterna' %
                       os.environ.get('DATUM', '')],
        'viktigt': [('Programlistan lästes ur bruksanvisningen – VERIFIERA tider/temperaturer där.'
                     if pdf_program else
                     'Programlistan är STANDARDPROGRAM för maskintypen – verifiera tider/'
                     'temperaturer mot bruksanvisningen (länk under Bruksanvisning).')],
        'lankar': lankar,
        'program': program,
        'bild': bildfil or ('images/%s.jpg' % mid),
    }
    if asin:
        maskin['asin'] = asin
    return mid, maskin


def main():
    if not os.path.exists(KO):
        print('Ingen kö – klart.')
        return
    rader = open(KO, encoding='utf-8').read().splitlines()
    # En rad = EN maskin. Raden kan innehålla FLERA länkar (mellanslag/| mellan):
    # Amazon-länken ger ASIN/köpknapp, tillverkarlänken ger namn/bild/manual.
    grupper = []
    for r in rader:
        r = r.strip()
        if not r.startswith('http'):
            continue
        urls = [u for u in re.split(r'[\s|]+', r) if u.startswith('http')]
        if urls:
            grupper.append((r, urls))
    if not grupper:
        print('Kön är tom.')
        return

    index = []
    if os.path.exists(INDEX):
        try:
            index = json.load(open(INDEX, encoding='utf-8'))
        except Exception:
            index = []

    klara = []
    for rad, urls in grupper:
        try:
            mid, maskin = bygg_maskin(urls)
            fil = os.path.join(MASKINDIR, mid + '.json')
            if os.path.exists(fil):
                print('⏭️  %s finns redan – hoppar över' % mid)
                klara.append((rad, mid, 'fanns redan'))
                continue
            os.makedirs(MASKINDIR, exist_ok=True)
            with open(fil, 'w', encoding='utf-8') as f:
                json.dump(maskin, f, ensure_ascii=False, indent=1)
            if mid + '.json' not in index:
                index.append(mid + '.json')
                index.sort()
            klara.append((rad, mid, 'skapad'))
            print('✅ %s skapad (%s, %s)' % (mid, maskin['varumarke'], maskin['typ']))
        except Exception as e:
            klara.append((rad, '?', 'FEL: %s' % e))
            print('❌ %s: %s' % (rad, e))

    with open(INDEX, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=1)

    # Töm kön – behandlade rader blir kommentarer
    from datetime import date
    huvud = [r for r in rader if r.strip().startswith('#') and not r.startswith('# KLAR')]
    if not huvud:
        huvud = ['# PLATS: /json/maskin-ko.txt (kö för maskinimport-roboten – en produktlänk per rad)']
    nya = huvud + ['# KLAR %s %s → %s (%s)' % (date.today(), u, m, s) for u, m, s in klara]
    with open(KO, 'w', encoding='utf-8') as f:
        f.write('\n'.join(nya) + '\n')
    print('Kö tömd, %d rader behandlade.' % len(klara))


if __name__ == '__main__':
    main()
