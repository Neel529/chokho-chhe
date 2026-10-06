# ChoKho Chhe — custom website build

Custom-coded site for **ChoKho Chhe**, a D2C brand selling **Amlaprash**
(an amla-based functional food). It's built as a standalone static site
first and will be translated into a Shopify theme afterwards. Shopify will
then own products, cart and checkout.

Live preview (GitHub Pages, from `master`): https://neel529.github.io/chokho-chhe/

**Stack:** plain HTML, CSS and vanilla JavaScript, with GSAP (loaded from
a CDN) for all motion. There's no framework and no build step. This is
deliberate, because plain HTML/CSS/JS ports to Shopify Liquid almost
directly. Please don't add a framework or another animation library
without checking with Nilesh first.

---

## What's not in this repo (shared privately)

Some files are deliberately left out of this public repo. **Nilesh will
share them with you privately:**

- **Governing docs.** These decide what gets built and how, so read them
  before changing anything:
  - `CLAUDE.md`: working rules for the build
  - `Ckc_website_master_specification.md`: the source of truth. Each item
    is marked frozen, direction decided, or open.
  - `gaps.md`: every open question, what's blocked, and how the build
    handles it in the meantime
  - `build-log.md`: what was built, session by session
- **Video files.** See [Video files](#video-files) below.
- **Full font packages.** See [Fonts](#fonts).

Put the docs in the repo root. They're already in `.gitignore`, so they
won't be committed by accident.

---

## Folder structure

```
index.html        Homepage: entry animation, hero, Section 2, footer
shop.html         Shop page (built with placeholders)
trust.html        Trust page: credentials, process, documents
about.html        About Us (shell + approved heritage story)
contact.html      Contact page (form not connected to anything yet)

css/
  variables.css   Design tokens: colours, fonts, spacing, z-index
  base.css        Reset, typography, buttons, placeholder styling
  header.css, footer.css, entry.css, transition.css
  home.css, shop.css, trust.css, about.css, contact.css   (per page)

js/
  main.js             Homepage behaviour: hero video, Section 2, reveals
  entry-animation.js  Loading screen / wordmark / curtain lift
  header.js           Menu and header colour switching
  page-transition.js  Transition between pages
  cursor.js           Custom cursor
  cart.js             Cart drawer (front end only, no checkout yet)

data/
  ingredients.json    The real 45-ingredient list. Content lives here,
                      never hardcoded in the markup.
  product.json        Product data (Shopify-compatible shape)

assets/svg/       Wordmarks, emblem and the font files the site uses
assets/video/     NOT in the repo; add the files locally (see below)
```

---

## Running it locally

The pages load data with `fetch`, so opening the `.html` files directly
from disk won't work properly. Serve the folder with a local server that
supports **range requests**, which the scroll-scrubbed video in Section 2
needs in order to seek:

```
cd path/to/chokho-chhe
npx http-server -p 8000
```

This needs Node.js. Then open http://localhost:8000/.

`python -m http.server` also serves the pages, but it doesn't support
range requests, so video scrubbing won't behave correctly with it.

When the site runs on `localhost`, a couple of internal dev markers become
visible, such as the hero's "video can't play" label. On the public site
they're hidden. Visible **PLACEHOLDER** chips mark content that isn't final
yet, and they show everywhere on purpose.

The entry animation plays once per browser session. Open a new tab or
clear session storage to see it again.

---

## Video files

**No video files are in this repo**, and `.gitignore` blocks them. Nilesh
shares them privately. Put them in `assets/video/` with exactly these
filenames:

| File | Used by |
|---|---|
| `hero_provisional_1080_trim.mp4` | Hero, screens wider than 900px |
| `hero_provisional_720_trim.mp4` | Hero, screens 900px and narrower |
| `try2_allintra_720.mp4` | Homepage Section 2 (the default clip) |
| `try2_kf5_720.mp4` | Section 2 alternative (candidate list in `js/main.js`) |
| `try2_allintra_360.mp4` | Section 2 alternative |
| `Scroll_scrub_try2.mp4` | Section 2 alternative |

The hero footage is **provisional** (real footage, not the final cut), and
the Section 2 clips are mock/test clips.

Without these files the site still works. The hero falls back to a teal
textured background and Section 2 to solid dark teal, with all text
readable. The browser console will show "404 Not Found" messages for the
missing videos. That's expected.

---

## Fonts

**Fonts are licensed separately and must not be redistributed.** Only the
8 font files the site actually loads are in the repo:

- General Sans Regular, Medium and Semibold (`.woff2` and `.woff`)
- `ElizethTrial-Medium.otf`
- `kohinoor-devanagari.ttf`

Don't copy these files out of the project, share them, or add more font
files to the repo. Licence status for the files in use is still being
confirmed. Elizeth is currently a *trial* file and is missing some
punctuation glyphs, so the code works around that until the licensed files
arrive.

---

## Status

**Built:**
- Foundation: design tokens, fonts, cursor, page transitions
- Entry animation
- Header and menu
- Homepage hero (with provisional footage)
- Homepage Section 2 (full-bleed scroll-scrubbed video with rotating
  statements)
- Shop, Trust, About Us (shell) and Contact pages
- Shared footer
- Cart drawer (front end only)

**Pending, mostly blocked on content or decisions rather than code:**
- Final hero footage (10–12s) and a final Section 2 clip
- Product photography and facility/process imagery
- Copy: Shop, About (extended story), Trust (process, research), FAQ,
  delivery
- Proofing of the Hindi/Hinglish lines by a native reader
- Real address, email, social links and copyright line; legal pages
- Contact form backend
- Font licences (see above)
- Homepage ingredient-exploration section (purpose decided, design not
  started)
- Shopify theme conversion (after the custom build is approved)

The full list, with what unblocks each item, is in `gaps.md` (shared
privately).

---

## A few rules that matter

- **Don't invent copy, health claims or brand decisions.** Anything not
  approved stays a visibly marked placeholder. There are no health,
  medical or efficacy claims anywhere.
- **Mobile is the primary surface.** Check every change at phone width
  first.
- Keep content as data (`/data/`) and commerce shapes Shopify-compatible.
