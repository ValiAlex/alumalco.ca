# Alumalco — Website

Single-page static website for Alumalco (bespoke aluminum windows & doors).
Bilingual (EN / FR), no build step, no backend — plain HTML + assets.

## Contents

```
index.html            Markup for every page (one document, hash-routed)
css/style.css         All styles (order matters — later rules override earlier ones)
js/main.js            All scripts (loaded with `defer`, sections run in order)
images/               Photography, product renders, logos, icons (JPG/PNG/SVG) + 2 MP4 clips
catalogues/           Downloadable product PDFs (EN + FR), served by the in-page viewer
```

## Running / deploying

It is a **static site** — deploy the whole folder to any static host
(Netlify, Vercel, S3/CloudFront, Nginx/Apache, GitHub Pages, etc.).
`index.html` must sit at the site root with `css/`, `js/`, `images/` and `catalogues/` beside it.

For local preview, serve the folder over HTTP rather than opening the file
directly — the in-page PDF catalogue viewer fetches the PDFs, which browsers
block over `file://`. For example:

```
cd this-folder
python3 -m http.server 8000      # then open http://localhost:8000
```

## How it works

- **Routing** is hash-based (a single-page app): `#home`, `#projects`,
  `#project-<slug>`, product pages `#al750` `#al480` `#sl550` `#sl650`
  `#bf850` `#entry`, `#about`, `#downloads`, `#contact`, `#faq`, `#careers`,
  `#pro`. No server-side routing or rewrites are required.
- **Bilingual**: an in-page EN/FR toggle swaps text via `data-fr` attributes
  and remembers the choice in `localStorage` (`al_lang`). French catalogue
  PDFs are selected automatically for FR viewers via `data-pdf-fr`.
- **Quote form**: the contact section embeds the Alumalco CRM form in an iframe
  (`https://admin-crm.alumalco.ca/forms/iframe/en` or `/fr`, switched with the
  language). Its height is fixed (736px) in `index.html` — raise it if fields are
  added to the CRM form.
- **External dependencies** (loaded from CDNs, so the deployed site needs
  internet access, or self-host them):
  - Google Fonts — "Open Sans"
  - PDF.js (cdnjs) — renders catalogue PDFs in the in-page viewer (deferred, so it
    does not block page rendering)

## Notes for the developer

- CSS and JS live in `css/style.css` and `js/main.js`. Inline `onclick`
  attributes in `index.html` call global functions from `main.js`
  (`lbOpen`, `specNav`, `specGo`, `applyFor`, `toggleLang`, `submitCareer`) —
  keep them global if you refactor.
- Image filenames are content-hashed (`img-<hash>.jpg`); the Stoneham project
  uses named files (`stoneham-*.jpg`).
- The two `.mp4` files in `images/` are the manufacturing-reel clips
  (desktop + mobile) used on the home page.
- RBQ 5723-4825-01 · © Alumalco.

A single self-contained `Alumalco-Website-single-file.html` (all images
embedded) is also provided for quick preview/sending; the deployable version
is this folder.
