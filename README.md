# Alumalco — Website

Static website for Alumalco (bespoke aluminum windows & doors).
Bilingual (EN / FR): every page has its own crawlable URL per language, following
*Alumalco — SEO URL & Language Plan* (Nov 4, 2026). No backend: plain HTML + assets.

## Contents

```
src/site.html         SOURCE — markup for every page (EN text inline, FR text in data-fr="…")
build.py              Generator: src/site.html -> en/, fr/, index.html, sitemap.xml, robots.txt
serve.py              Local preview server with clean URLs
en/  fr/              GENERATED pages (one folder + index.html per URL) — do not edit by hand
index.html            GENERATED "/" fallback: language redirect + old #hash links
sitemap.xml           GENERATED — every EN + FR URL with hreflang alternates
robots.txt            GENERATED — allows everything, points to the sitemap
js/legacy-routes.js   GENERATED — maps old #hash URLs (e.g. /#al750) to the new URLs
js/main.js            Site scripts (loaded with `defer` on every page)
css/style.css         All styles
images/  catalogues/  Photography/renders/logos/videos, downloadable PDFs (EN + FR)
```

## Editing workflow

1. Edit `src/site.html` (and `css/`, `js/` as needed). Keep French text in `data-fr`.
2. Edit URLs, titles, meta descriptions, products or projects in the tables at the top of `build.py`.
3. Rebuild: `pip install beautifulsoup4` (once), then `python3 build.py`.
4. Preview: `python3 serve.py` then open http://localhost:8000/
5. Commit the generated files along with the source and deploy the whole folder.

## URLs

| Page | EN | FR |
|---|---|---|
| Home | `/en/` | `/fr/` |
| Projects | `/en/projects` | `/fr/projets` |
| About | `/en/about` | `/fr/a-propos` |
| Solutions | `/en/solutions` | `/fr/solutions` |
| Catalogues | `/en/catalogues` | `/fr/catalogues` |
| FAQ | `/en/faq` | `/fr/faq` |
| Careers | `/en/careers` | `/fr/carrieres` |
| Contact & quote | `/en/contact` | `/fr/contact` |
| Thank-you (noindex) | `/en/thank-you` | `/fr/merci` |
| Tilt & Turn AL750 | `/en/tilt-and-turn-windows` | `/fr/fenetres-oscillo-battantes` |
| Casement AL480 | `/en/casement-windows` | `/fr/fenetres-a-battant` |
| Lift & Slide SL550 | `/en/lift-and-slide-doors` | `/fr/portes-levantes-coulissantes` |
| Minimalist SL650 | `/en/minimalist-sliding-doors` | `/fr/portes-coulissantes-minimalistes` |
| Bi-folding BF8500 | `/en/bi-folding-doors` | `/fr/portes-accordeon` |
| Entrance SD770 | `/en/entrance-doors` | `/fr/portes-d-entree` |
| Projects (19) | `/en/projects/<name>-residence` | `/fr/projets/residence-<name>` |

Each page is written as `en/<slug>/index.html`, which the host (DigitalOcean App Platform)
serves at `/en/<slug>` with no rewrite rules needed. The root `index.html` sends visitors to
`/fr/` or `/en/` by browser language and maps old `#hash` links to the new URLs.

## What each page contains

- Its language baked into the HTML (`<html lang="en">` / `<html lang="fr-CA">`); the EN/FR
  switch is a link to the translated URL.
- Unique `<title>` and meta description, self-referencing absolute canonical, hreflang
  alternates (`en-CA`, `fr-CA`, `x-default` → EN).
- Open Graph / Twitter tags (`og:image` = the page's hero image, `og:locale` + alternate).
- JSON-LD: Organization + LocalBusiness (Montréal, Toronto, Calgary showrooms) on every page,
  Product on the six product pages, BreadcrumbList on project pages.
- Thank-you / merci pages are `noindex, follow` and left out of the sitemap.

## Other notes

- **Quote form**: the contact section embeds the Alumalco CRM form in an iframe
  (`https://admin-crm.alumalco.ca/forms/iframe/en` or `/fr`, picked per page at build time).
  Its height is fixed (736px) in `src/site.html`.
- **External dependencies**: Google Fonts ("Open Sans"); PDF.js (cdnjs) for the in-page
  catalogue viewer, loaded only on pages that have catalogue cards.
- The intro animation now plays once per browser session (each page is a full page load).
- Inline `onclick` attributes call global functions from `main.js`
  (`lbOpen`, `specNav`, `specGo`, `applyFor`, `submitCareer`) — keep them global.
- Image filenames are content-hashed (`img-<hash>.jpg`). The two `.mp4` files are the
  manufacturing-reel clips (desktop + mobile) used on the home page.
- After deploying: verify the domain in Google Search Console and Bing Webmaster Tools,
  submit `https://alumalco.ca/sitemap.xml`, and monitor `/en/` and `/fr/` separately.
- RBQ 5723-4825-01 · © Alumalco.
