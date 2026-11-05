#!/usr/bin/env python3
"""
Alumalco static-site generator.

Reads the single-document template `src/site.html` (every page, EN text in the markup,
FR text in `data-fr` attributes) and writes one crawlable HTML file per page and
language, following "Alumalco — SEO URL & Language Plan" (Nov 4, 2026):

  /en/...  English pages  (<html lang="en">)
  /fr/...  French pages   (<html lang="fr-CA">, French text baked into the HTML)

Each page gets its own <title>, meta description, self-referencing canonical,
hreflang alternates (en-CA / fr-CA / x-default), Open Graph + Twitter tags and
JSON-LD. It also writes /index.html (language redirect), /sitemap.xml,
/robots.txt and js/legacy-routes.js (old #hash URLs -> new URLs).

Usage:   python3 build.py            (requires: pip install beautifulsoup4)
"""
import copy
import json
import os
import re
import shutil
from datetime import date
from html import escape

from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(ROOT, 'src', 'site.html')
SITE = 'https://alumalco.ca'
LANGS = ('en', 'fr')
HREFLANG = {'en': 'en-CA', 'fr': 'fr-CA'}
HTML_LANG = {'en': 'en', 'fr': 'fr-CA'}
OG_LOCALE = {'en': 'en_CA', 'fr': 'fr_CA'}
DEFAULT_IMAGE = 'images/img-1175bb8c509d18a7.jpg'   # home hero
LOGO = 'images/img-551c77e752e4f553.png'
TODAY = date.today().isoformat()

# --------------------------------------------------------------------------------------
# Page inventory: URLs, titles and meta descriptions exactly as defined in the plan.
# `src` is the id of the page container in src/site.html.
# --------------------------------------------------------------------------------------
PAGES = [
    dict(key='home', src='page-home', kind='home',
         path={'en': '/en/', 'fr': '/fr/'},
         title={'en': 'Alumalco | Bespoke Aluminum Windows & Doors | Montréal',
                'fr': 'Alumalco | Fenêtres et portes en aluminium sur mesure'},
         desc={'en': 'Bespoke aluminum windows, doors and entrances, designed and manufactured in-house in Montréal for premium homes. Explore our systems and projects.',
               'fr': 'Fenêtres, portes et entrées en aluminium sur mesure, conçues et fabriquées à Montréal pour les résidences haut de gamme. Découvrez nos produits.'}),
    dict(key='projects', src='page-projects', kind='page',
         path={'en': '/en/projects', 'fr': '/fr/projets'},
         title={'en': 'Projects — Aluminum Window & Door Installations | Alumalco',
                'fr': "Projets — Réalisations en fenêtres et portes d'aluminium"},
         desc={'en': "Explore Alumalco's portfolio of modern homes featuring custom aluminum windows and doors across Canada.",
               'fr': "Découvrez le portfolio d'Alumalco : des résidences modernes dotées de fenêtres et portes en aluminium sur mesure."}),
    dict(key='about', src='page-about', kind='page',
         path={'en': '/en/about', 'fr': '/fr/a-propos'},
         title={'en': 'About Alumalco — Aluminum Fenestration, Montréal',
                'fr': "À propos d'Alumalco — Fenestration en aluminium"},
         desc={'en': 'Three decades designing and manufacturing bespoke aluminum window and door systems in Montréal. Meet Alumalco.',
               'fr': 'Trois décennies de conception et de fabrication de systèmes de fenêtres et portes en aluminium sur mesure à Montréal.'}),
    dict(key='pro', src='page-pro', kind='page',
         path={'en': '/en/solutions', 'fr': '/fr/solutions'},
         title={'en': 'Solutions for Architects, Builders & Homeowners | Alumalco',
                'fr': 'Solutions pour architectes et constructeurs | Alumalco'},
         desc={'en': 'Aluminum fenestration solutions for architects, builders and homeowners: technical support, custom systems and project collaboration.',
               'fr': 'Solutions de fenestration en aluminium pour architectes, constructeurs et propriétaires : soutien technique et systèmes sur mesure.'}),
    dict(key='downloads', src='page-downloads', kind='page',
         path={'en': '/en/catalogues', 'fr': '/fr/catalogues'},
         title={'en': 'Product Catalogues — Window & Door PDFs | Alumalco',
                'fr': 'Catalogues de produits — Fenêtres et portes (PDF)'},
         desc={'en': 'Download Alumalco catalogues: tilt & turn, casement, lift & slide, bi-folding and entrance doors, plus hardware and RAL colours.',
               'fr': "Téléchargez les catalogues Alumalco : oscillo-battante, à battant, levante coulissante, accordéon, portes d'entrée et couleurs RAL."}),
    dict(key='faq', src='page-faq', kind='page',
         path={'en': '/en/faq', 'fr': '/fr/faq'},
         title={'en': 'FAQ — Aluminum Windows & Doors | Alumalco',
                'fr': 'FAQ — Fenêtres et portes en aluminium | Alumalco'},
         desc={'en': "Common questions about Alumalco's aluminum windows and doors: lead times, installation and warranty.",
               'fr': 'Questions fréquentes sur les fenêtres et portes en aluminium Alumalco : délais, installation et garantie.'}),
    dict(key='careers', src='page-careers', kind='page',
         path={'en': '/en/careers', 'fr': '/fr/carrieres'},
         title={'en': 'Careers — Join Alumalco | Montréal',
                'fr': 'Carrières — Rejoignez Alumalco | Montréal'},
         desc={'en': 'Build your career at Alumalco, a Montréal manufacturer of bespoke aluminum windows and doors. See openings.',
               'fr': 'Faites carrière chez Alumalco, fabricant montréalais de fenêtres et portes en aluminium sur mesure. Postes offerts.'}),
    dict(key='contact', src='contact', kind='contact',
         path={'en': '/en/contact', 'fr': '/fr/contact'},
         title={'en': 'Contact & Request a Quote | Alumalco',
                'fr': 'Contact et demande de soumission | Alumalco'},
         desc={'en': 'Contact Alumalco for a no-obligation quote on custom aluminum windows and doors. Showrooms in Montréal, Toronto, Calgary.',
               'fr': "Contactez Alumalco pour une soumission sans engagement. Salles d'exposition à Montréal, Toronto et Calgary."}),
    dict(key='thank-you', src='page-thank-you', kind='page', noindex=True,
         path={'en': '/en/thank-you', 'fr': '/fr/merci'},
         title={'en': 'Thank You | Alumalco', 'fr': 'Merci | Alumalco'},
         desc={'en': 'Thank you for contacting Alumalco. A member of our team will reach out shortly.',
               'fr': "Merci d'avoir communiqué avec Alumalco. Un membre de notre équipe vous contactera sous peu."}),
]

PRODUCTS = [
    # key, model, category (en, fr), EN slug, FR slug, name (en, fr), title (en, fr), desc (en, fr)
    ('al750', 'AL750', ('Windows', 'Fenêtres'), 'tilt-and-turn-windows', 'fenetres-oscillo-battantes',
     ('Tilt & Turn Aluminum Windows', 'Fenêtres oscillo-battantes en aluminium'),
     ('Tilt & Turn Aluminum Windows (AL750) | Alumalco', 'Fenêtres oscillo-battantes en aluminium (AL750)'),
     ('European-style tilt & turn aluminum windows: slim frames, oversized glazing, multi-point locking. The AL750 system.',
      'Fenêtres oscillo-battantes en aluminium à cadres minces, grands vitrages et verrouillage multipoints. Le système AL750.')),
    ('al480', 'AL480', ('Windows', 'Fenêtres'), 'casement-windows', 'fenetres-a-battant',
     ('Casement Aluminum Windows', 'Fenêtres à battant en aluminium'),
     ('Casement Aluminum Windows (AL480) | Alumalco', 'Fenêtres à battant en aluminium (AL480) | Alumalco'),
     ('Slim-framed casement aluminum windows engineered for the Canadian climate. The AL480 system by Alumalco.',
      "Fenêtres à battant en aluminium à cadres minces, conçues pour le climat canadien. Le système AL480 d'Alumalco.")),
    ('sl550', 'SL550', ('Doors', 'Portes'), 'lift-and-slide-doors', 'portes-levantes-coulissantes',
     ('Lift & Slide Aluminum Doors', 'Portes levantes coulissantes en aluminium'),
     ('Lift & Slide Aluminum Doors (SL550) | Alumalco', 'Portes levantes coulissantes en aluminium (SL550)'),
     ('Oversized lift & slide aluminum doors with a low threshold and effortless operation. The SL550 system by Alumalco.',
      'Portes levantes coulissantes en aluminium surdimensionnées, à seuil bas et maniement fluide. Le système SL550.')),
    ('sl650', 'SL650', ('Doors', 'Portes'), 'minimalist-sliding-doors', 'portes-coulissantes-minimalistes',
     ('Minimalist Sliding Doors', 'Portes coulissantes minimalistes'),
     ('Minimalist Sliding Doors (SL650) | Alumalco', 'Portes coulissantes minimalistes (SL650) | Alumalco'),
     ('Minimalist sliding doors with ultra-slim, nearly invisible aluminum frames for maximum glass. The SL650 system.',
      "Portes coulissantes minimalistes aux cadres d'aluminium ultraminces, presque invisibles. Le système SL650.")),
    ('bf850', 'BF8500', ('Doors', 'Portes'), 'bi-folding-doors', 'portes-accordeon',
     ('Bi-Folding Aluminum Doors', 'Portes accordéon en aluminium'),
     ('Bi-Folding Aluminum Doors (BF8500) | Alumalco', 'Portes accordéon en aluminium (BF8500) | Alumalco'),
     ("Bi-folding aluminum doors that open a wall of glass outdoors, with the market's highest glass-to-frame ratio. BF8500.",
      "Portes accordéon en aluminium qui ouvrent un mur de verre sur l'extérieur, au meilleur ratio verre-cadre. Le BF8500.")),
    ('entry', 'SD770', ('Doors', 'Portes'), 'entrance-doors', 'portes-d-entree',
     ('Aluminum Entrance Doors', "Portes d'entrée en aluminium"),
     ('Aluminum Entrance Doors (SD770) | Alumalco', "Portes d'entrée en aluminium (SD770) | Alumalco"),
     ('Custom aluminum entrance doors for a striking first impression, built for security and insulation. The SD770 system.',
      "Portes d'entrée en aluminium sur mesure, alliant sécurité et isolation. Le système SD770 d'Alumalco.")),
]
for key, model, cat, en, fr, name, title, desc in PRODUCTS:
    PAGES.append(dict(key=key, src='page-' + key, kind='product', model=model,
                      category={'en': cat[0], 'fr': cat[1]},
                      name={'en': name[0], 'fr': name[1]},
                      path={'en': '/en/' + en, 'fr': '/fr/' + fr},
                      title={'en': title[0], 'fr': title[1]},
                      desc={'en': desc[0], 'fr': desc[1]}))

# Project pages: (template slug in src/site.html, residence name)
PROJECTS = [
    ('duchastel', 'Duchastel'), ('maryward', 'Maryward'), ('casaverde', 'Bardis'),
    ('escarpment', 'Escarpment'), ('northshore', 'Northshore'), ('labaie', 'Labaie'),
    ('courcelette', 'Courcelette'), ('beechwood', 'Beechwood'), ('eagle', 'Eagle Road'),
    ('ahrens', 'Ahrens'), ('bromont', 'Bromont'), ('pinecrest', 'Pinecrest'),
    ('stoneham', 'Stoneham'), ('langley', 'Langley'), ('sanguinet', 'Sanguinet'),
    ('esterel', 'Esterel'), ('gables', 'Gables'), ('strathcona', 'Strathcona'),
    ('tudor', 'Lansdowne'),
]
for slug, name in PROJECTS:
    s = name.lower().replace(' ', '-')
    PAGES.append(dict(
        key='project-' + slug, src='page-project-' + slug, kind='project', name=name,
        path={'en': '/en/projects/%s-residence' % s, 'fr': '/fr/projets/residence-%s' % s},
        title={'en': '%s Residence — Project | Alumalco' % name,
               'fr': 'Résidence %s — Projet | Alumalco' % name},
        desc={'en': 'A modern home featuring custom Alumalco aluminum windows and doors. View the %s Residence project.' % name,
              'fr': 'Une résidence moderne dotée de fenêtres et portes en aluminium Alumalco sur mesure. Découvrez le projet Résidence %s.' % name}))

BY_KEY = {p['key']: p for p in PAGES}

# Old hash routes -> (page key, fragment kept on the new URL)
ROUTES = {p['key']: (p['key'], '') for p in PAGES}
ROUTES.update({
    'home': ('home', ''),
    'pro-architects': ('pro', '#pro-architects'),
    'pro-builders': ('pro', '#pro-builders'),
    'pro-homeowners': ('pro', '#pro-homeowners'),
})
# Home "featured projects" stack uses its own slugs
STACK_SLUGS = {'bardis': 'project-casaverde', 'duchastel': 'project-duchastel',
               'maryward': 'project-maryward', 'beechwood': 'project-beechwood'}

# Accessible names / titles that are only in English in the template
FR_LABELS = {
    'Contact a specialist today': "Contactez un spécialiste dès aujourd'hui",
    'Previous view': 'Vue précédente', 'Next view': 'Vue suivante',
    'Side view': 'Vue de côté', 'Front view': 'Vue de face',
    'Section view A': 'Vue en coupe A', 'Section view B': 'Vue en coupe B',
    'Previous': 'Précédent', 'Next': 'Suivant', 'Close': 'Fermer',
    'Scroll audiences': 'Faire défiler les publics',
    'In-house manufacturing film': 'Film sur notre fabrication à l\'interne',
    'Catalogue viewer': 'Visionneuse de catalogue', 'Audience gallery': 'Galerie des publics',
    'Showroom and facility: 100 Stinson, Montréal, QC H4N 2E7 (opens Google Maps)':
        "Salle d'exposition et usine : 100 Stinson, Montréal, QC H4N 2E7 (ouvre Google Maps)",
}
FR_LABEL_PATTERNS = [
    (re.compile(r'^Discover (.+) Residence$'), r'Découvrir la résidence \1'),
    (re.compile(r'^Open (.+) Residence$'), r'Ouvrir la résidence \1'),
    (re.compile(r'^View next project: (.+) Residence$'), r'Voir le projet suivant : Résidence \1'),
]

SOCIALS = ['https://www.instagram.com/alumalco/',
           'https://www.linkedin.com/company/alumalco-ca/',
           'https://www.facebook.com/alumalco.ca/',
           'https://www.houzz.com/professionals/window-sales-and-installation/alumalco-pfvwus-pf~60730658']
SHOWROOMS = [
    ('montreal', 'Montréal', '100 Stinson', 'Montréal', 'QC', 'H4N 2E7'),
    ('toronto', 'Toronto', '1535 Meyerside Drive, Unit 3', 'Toronto', 'ON', 'L5T 1M9'),
    ('calgary', 'Calgary', '5920 30 Street SE', 'Calgary', 'AB', 'T2C 1X8'),
]


def url(key, lang, absolute=False):
    p = BY_KEY[key]['path'][lang]
    return SITE + p if absolute else p


def out_file(path):
    rel = path.lstrip('/')
    # Folder + index.html: the host (DigitalOcean App Platform) serves en/about/index.html at /en/about
    rel = rel.rstrip('/') + '/index.html'
    return os.path.join(ROOT, rel)


def absolute(src):
    return src if src.startswith('http') else SITE + '/' + src.lstrip('/')


ASSET_RE = re.compile(r'(^|[\s,(\'"])(images|catalogues)/')


def fix_asset(v):
    return ASSET_RE.sub(r'\1/\2/', v)


def translate_label(s):
    if s in FR_LABELS:
        return FR_LABELS[s]
    for rx, rep in FR_LABEL_PATTERNS:
        if rx.match(s):
            return rx.sub(rep, s)
    return s


# --------------------------------------------------------------------------------------
# JSON-LD
# --------------------------------------------------------------------------------------
def jsonld(page, lang, image):
    org_id = SITE + '/#organization'
    graph = [{
        '@type': 'Organization', '@id': org_id, 'name': 'Alumalco', 'url': SITE + '/',
        'logo': absolute(LOGO), 'telephone': '+1-855-826-6799', 'email': 'info@alumalco.ca',
        'sameAs': SOCIALS,
    }]
    for sid, label, street, city, region, postal in SHOWROOMS:
        graph.append({
            '@type': 'LocalBusiness', '@id': '%s/#showroom-%s' % (SITE, sid),
            'name': 'Alumalco — %s' % label, 'url': url('contact', lang, True),
            'image': absolute(DEFAULT_IMAGE), 'telephone': '+1-855-826-6799',
            'email': 'info@alumalco.ca', 'parentOrganization': {'@id': org_id},
            'address': {'@type': 'PostalAddress', 'streetAddress': street, 'addressLocality': city,
                        'addressRegion': region, 'postalCode': postal, 'addressCountry': 'CA'},
        })
    if page['kind'] == 'product':
        graph.append({
            '@type': 'Product', '@id': url(page['key'], lang, True) + '#product',
            'name': '%s (%s)' % (page['name'][lang], page['model']), 'model': page['model'],
            'sku': page['model'], 'category': page['category'][lang],
            'description': page['desc'][lang], 'image': [image], 'url': url(page['key'], lang, True),
            'brand': {'@type': 'Brand', 'name': 'Alumalco'}, 'manufacturer': {'@id': org_id},
        })
    if page['kind'] == 'project':
        name = ('%s Residence' if lang == 'en' else 'Résidence %s') % page['name']
        crumbs = [('Home' if lang == 'en' else 'Accueil', url('home', lang, True)),
                  ('Projects' if lang == 'en' else 'Projets', url('projects', lang, True)),
                  (name, url(page['key'], lang, True))]
        graph.append({'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u}
            for i, (n, u) in enumerate(crumbs)]})
    data = json.dumps({'@context': 'https://schema.org', '@graph': graph},
                      ensure_ascii=False, indent=1)
    return data.replace('</', '<\\/')


def head_html(page, lang, image, has_catalogues):
    other = 'fr' if lang == 'en' else 'en'
    canon = url(page['key'], lang, True)
    t, d = escape(page['title'][lang]), escape(page['desc'][lang])
    L = ['<meta charset="UTF-8">',
         '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
         '<title>%s</title>' % t,
         '<meta name="description" content="%s">' % d]
    if page.get('noindex'):
        L.append('<meta name="robots" content="noindex, follow">')
    L += ['<link rel="canonical" href="%s">' % canon,
          '<link rel="alternate" hreflang="en-CA" href="%s">' % url(page['key'], 'en', True),
          '<link rel="alternate" hreflang="fr-CA" href="%s">' % url(page['key'], 'fr', True),
          '<link rel="alternate" hreflang="x-default" href="%s">' % url(page['key'], 'en', True),
          '<meta property="og:type" content="%s">' % ('product' if page['kind'] == 'product' else 'website'),
          '<meta property="og:site_name" content="Alumalco">',
          '<meta property="og:title" content="%s">' % t,
          '<meta property="og:description" content="%s">' % d,
          '<meta property="og:image" content="%s">' % escape(image),
          '<meta property="og:url" content="%s">' % canon,
          '<meta property="og:locale" content="%s">' % OG_LOCALE[lang],
          '<meta property="og:locale:alternate" content="%s">' % OG_LOCALE[other],
          '<meta name="twitter:card" content="summary_large_image">',
          '<meta name="twitter:title" content="%s">' % t,
          '<meta name="twitter:description" content="%s">' % d,
          '<meta name="twitter:image" content="%s">' % escape(image),
          '<link rel="preconnect" href="https://fonts.googleapis.com">',
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
          '<link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,600&display=swap" rel="stylesheet">',
          '<link rel="stylesheet" href="/css/style.css">']
    if page['kind'] == 'home':
        L.append('<script src="/js/legacy-routes.js"></script>')
    if has_catalogues:
        L.append('<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" defer></script>')
    L.append('<script src="/js/main.js" defer></script>')
    L.append('<script type="application/ld+json">\n%s\n</script>' % jsonld(page, lang, image))
    return '\n'.join(L)


# --------------------------------------------------------------------------------------
# Page builder
# --------------------------------------------------------------------------------------
def build_page(template, home_ids, page, lang):
    soup = BeautifulSoup(template, 'html.parser')
    other = 'fr' if lang == 'en' else 'en'
    home = soup.find(id='page-home')

    # 1. Keep only this page's content between the shared header and footer.
    if page['kind'] == 'contact':
        target = soup.new_tag('main', attrs={'id': 'page-contact', 'class': 'page'})
        target.append(copy.copy(home.find('section', id='contact')))
    else:
        target = soup.find(id=page['src'])
    if target is not home:
        home.insert_before(target.extract() if target.parent else target)
    for el in soup.find_all(class_='page'):
        if el is not target:
            el.decompose()
    target.name = 'main'
    if target.has_attr('hidden'):
        del target['hidden']

    # 2. Bake the language into the HTML (no JS text swapping).
    for el in soup.find_all(attrs={'data-fr': True}):
        fr = el['data-fr']
        del el['data-fr']
        if lang == 'fr':
            el.clear()
            for c in list(BeautifulSoup(fr, 'html.parser').contents):
                el.append(c)
    for el in soup.find_all(attrs={'data-fr-ph': True}):
        if lang == 'fr':
            el['placeholder'] = el['data-fr-ph']
        del el['data-fr-ph']
    for f in soup.find_all('iframe', attrs={'data-src-en': True}):
        f['src'] = f['data-src-' + lang]
        if lang == 'fr' and f.has_attr('data-title-fr'):
            f['title'] = f['data-title-fr']
        for a in ('data-src-en', 'data-src-fr', 'data-title-fr'):
            if f.has_attr(a):
                del f[a]
    for a in soup.find_all(attrs={'data-pdf-fr': True}):
        if lang == 'fr':
            a['href'] = a['data-pdf-fr']
        del a['data-pdf-fr']
    if lang == 'fr':
        for attr in ('aria-label', 'title'):
            for el in soup.find_all(attrs={attr: True}):
                el[attr] = translate_label(el[attr])

    # 3. Hash links -> real URLs.
    ids = {el['id'] for el in soup.find_all(id=True)}
    for a in soup.find_all('a', href=True):
        h = a['href']
        if h == '#' and a.find_parent(class_='crumb'):
            a['href'] = url('home', lang) + '#products'
        elif h.startswith('#') and len(h) > 1:
            frag = h[1:]
            if frag in ROUTES:
                key, anchor = ROUTES[frag]
                a['href'] = url(key, lang) + anchor
            elif frag not in ids and frag in home_ids:
                a['href'] = url('home', lang) + h
    for el in soup.find_all(onclick=True):
        el['onclick'] = re.sub(r"location\.hash='([^']+)'",
                               lambda m: "location.href='%s'" % url(ROUTES[m.group(1)][0], lang),
                               el['onclick'])
    for el in soup.find_all(attrs={'data-slug': True}):
        key = STACK_SLUGS.get(el['data-slug'])
        if key:
            el['data-href'] = url(key, lang)

    # 4. Language switch = link to the translated URL.
    for a in soup.find_all('a', class_='lang-toggle'):
        a['href'] = url(page['key'], other)
        a['hreflang'] = HREFLANG[other]
        a['lang'] = HTML_LANG[other]
        a['aria-label'] = 'Version française' if other == 'fr' else 'English version'
        if a.has_attr('onclick'):
            del a['onclick']
        a.string = other.upper()

    # 5. Root-relative asset paths (pages now live in sub-folders).
    for el in soup.find_all(True):
        for attr in ('src', 'href', 'poster', 'srcset', 'style', 'data-mobile', 'data-img'):
            if el.has_attr(attr):
                el[attr] = fix_asset(el[attr])

    # 6. Head + <html lang>.
    img = target.find('img', src=True)
    image = absolute(img['src']) if img and not img['src'].startswith('data:') else absolute(DEFAULT_IMAGE)
    has_cat = bool(target.find('a', class_='cat-card'))
    soup.html['lang'] = HTML_LANG[lang]
    soup.head.clear()
    soup.head.append(BeautifulSoup('\n' + head_html(page, lang, image, has_cat) + '\n', 'html.parser'))

    return str(soup)


# --------------------------------------------------------------------------------------
# Site-level files
# --------------------------------------------------------------------------------------
def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(text)


def legacy_routes_js():
    m = {h: {l: url(k, l) + a for l in LANGS} for h, (k, a) in ROUTES.items()}
    m.update({s: {l: url(k, l) for l in LANGS} for s, k in STACK_SLUGS.items() if s not in m})
    return ("/* GENERATED by build.py: maps the old single-page #hash URLs to the new per-language URLs.\n"
            "   Loaded by / and the two home pages. Fragments never reach the server, so this is done client-side. */\n"
            "(function(){\n"
            "  var R=%s;\n"
            "  var h=(location.hash||'').slice(1), root=/^\\/(index\\.html)?$/.test(location.pathname);\n"
            "  var lang=null; try{ lang=localStorage.getItem('al_lang'); }catch(e){}\n"
            "  if(root){\n"
            "    if(lang!=='en'&&lang!=='fr') lang=/^fr/i.test(navigator.language||'')?'fr':'en';\n"
            "  } else {\n"
            "    if(!h||!R[h]) return;\n"
            "    lang=/^\\/fr\\//.test(location.pathname)?'fr':'en';\n"
            "  }\n"
            "  var dest=R[h]?R[h][lang]:(lang==='fr'?'/fr/':'/en/');\n"
            "  if(dest.split('#')[0]===location.pathname){ return; }\n"
            "  location.replace(dest);\n"
            "})();\n" % json.dumps(m, ensure_ascii=False, separators=(',', ':')))


ROOT_INDEX = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Alumalco | Bespoke Aluminum Windows &amp; Doors | Montréal</title>
<meta name="description" content="Bespoke aluminum windows, doors and entrances, designed and manufactured in-house in Montréal for premium homes. Explore our systems and projects.">
<link rel="canonical" href="https://alumalco.ca/en/">
<link rel="alternate" hreflang="en-CA" href="https://alumalco.ca/en/">
<link rel="alternate" hreflang="fr-CA" href="https://alumalco.ca/fr/">
<link rel="alternate" hreflang="x-default" href="https://alumalco.ca/en/">
<!-- GENERATED by build.py. The host has no server-side redirects, so this page
     sends visitors to their
     language and maps old #hash links to the new URLs. -->
<script src="/js/legacy-routes.js"></script>
<noscript><meta http-equiv="refresh" content="0; url=/en/"></noscript>
</head>
<body>
<p><a href="/en/" hreflang="en-CA">English</a> · <a href="/fr/" hreflang="fr-CA" lang="fr-CA">Français</a></p>
</body>
</html>
"""


def sitemap():
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
           '        xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for p in PAGES:
        if p.get('noindex'):
            continue
        for lang in LANGS:
            out += ['  <url>',
                    '    <loc>%s</loc>' % url(p['key'], lang, True),
                    '    <lastmod>%s</lastmod>' % TODAY,
                    '    <xhtml:link rel="alternate" hreflang="en-CA" href="%s"/>' % url(p['key'], 'en', True),
                    '    <xhtml:link rel="alternate" hreflang="fr-CA" href="%s"/>' % url(p['key'], 'fr', True),
                    '    <xhtml:link rel="alternate" hreflang="x-default" href="%s"/>' % url(p['key'], 'en', True),
                    '  </url>']
    out.append('</urlset>')
    return '\n'.join(out) + '\n'


ROBOTS = """User-agent: *
Allow: /

Sitemap: https://alumalco.ca/sitemap.xml
"""


def main():
    with open(TEMPLATE, encoding='utf-8') as fh:
        template = fh.read()
    tsoup = BeautifulSoup(template, 'html.parser')
    for p in PAGES:
        if p['kind'] != 'contact':
            assert tsoup.find(id=p['src']), 'missing page in template: ' + p['src']
    home_ids = {el['id'] for el in tsoup.find(id='page-home').find_all(id=True)}

    for lang in LANGS:
        shutil.rmtree(os.path.join(ROOT, lang), ignore_errors=True)
    for p in PAGES:
        for lang in LANGS:
            write(out_file(p['path'][lang]), build_page(template, home_ids, p, lang))
    write(os.path.join(ROOT, 'index.html'), ROOT_INDEX)
    write(os.path.join(ROOT, 'js', 'legacy-routes.js'), legacy_routes_js())
    write(os.path.join(ROOT, 'sitemap.xml'), sitemap())
    write(os.path.join(ROOT, 'robots.txt'), ROBOTS)
    print('Built %d pages (%d URLs).' % (len(PAGES), len(PAGES) * len(LANGS)))


if __name__ == '__main__':
    main()
