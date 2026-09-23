# NOCTARIS Multilingual Standard

## Core rules
- English (`en`) is the default language and keeps the existing root URLs.
- Visitors choose language manually. No GeoIP or browser-language redirect.
- NOCTARIS Core is the single source of structure and functionality. Languages inherit it.
- Localized pages are generated output, never independent development branches.
- DATA is not TRANSLATION. Registered dog names, pedigree names, official title/certificate codes, judges, registrations, DNA/genetic nomenclature and official show/event names remain source data/original nomenclature.
- Dog-specific and Gallery asset isolation remains unchanged.
- Stable Photos, Gallery, pedigree and other core behaviour must not be changed merely for localization.
- Missing translations may fall back to English at runtime as a safety net, but missing required keys are a release-blocking QA failure.

## Routes
- EN: `/`, `/atlas/`, `/shelby/`, `/gallery/`, `/about/`, `/contact/`
- SR: `/sr/`, `/sr/atlas/`, `/sr/shelby/`, `/sr/gallery/`, `/sr/about/`, `/sr/contact/`

Future languages inherit the same page IDs/routes under their language prefix. New master pages are auto-discovered by the generator; they must not require a second per-language development path.

## Source / generated output
- English/core HTML is the structural master.
- Dictionaries: `/i18n/en.js`, `/i18n/sr.js`.
- Generator: `/scripts/generate_languages.py`.
- `/sr/**` is generated. Do not hand-edit it.
- The generator auto-discovers master `index.html` page entry points outside localized/system directories. Creating a new master page therefore creates the corresponding localized route on the next generation run.
- Generated localized HTML carries a `GENERATED FILE — DO NOT EDIT` marker.
- Dictionary completeness is validated before generation; a missing required translation aborts the build.

After changing page structure or shared content, run:

    python scripts/generate_languages.py

Then run regression/translation QA before deployment.

## Serbian terminology decisions
- Home → Početna
- Dogs → Psi
- Gallery → Galerija
- About → O nama
- Contact → Kontakt
- Photos → Fotografije
- Pedigree → Rodovnik
- Achievements → Dostignuća
- Trophy → Trofeji
- Breeder → Odgajivač
- Kennel → Odgajivačnica
- Owners → Vlasnici
- Parents → Roditelji
- SIRE / DAM → OTAC / MAJKA
- Black Miniature Schnauzer → Crni patuljasti šnaucer
- Miniature Schnauzer → Patuljasti šnaucer
- Junior Class → Razred mladih
- Under: → Sudija:

Official names/codes/nomenclature remain original even when an explanatory label around them is localized.

## Serbian terminology baseline (Phase 3)
The Serbian localization uses Latin script and follows Serbian cynological usage. Official registered names, kennel names, judge names, pedigree identifiers, FCI/ENCI title codes, award codes (CACIB, JCACIB, BOB, BIS, etc.), DNA/genetic nomenclature and official event/title names are preserved where they function as proper names or formal nomenclature.

Localized presentation terminology includes:
- Breeder → Odgajivač
- Kennel → Odgajivačnica
- Owners → Vlasnici
- Pedigree → Rodovnik
- Sire / Dam → Otac / Majka
- Junior Class → Razred mladih
- Excellent → Odličan
- Judge label (Under:) → Sudija:
- Miniature Schnauzer → Patuljasti šnaucer

Geographic presentation strings may be localized (e.g. Belgrade, Serbia → Beograd, Srbija), while the underlying identity/data remains single-source.

Any future disputed cynological term must be reviewed before release; machine translation is not authoritative.

## Rollback / release safety
- The last known stable production snapshot must be preserved before every multilingual production release.
- Before the first multilingual deployment, tag the current stable Git commit (`pre-multilingual-20260921` recommended).
- If a release causes a material regression, rollback first; do not debug production through a chain of emergency edits.
- Full procedure: `/ROLLBACK.md`.

## SEO metadata localization
- Every master page must provide a localized `meta description` key (`meta.description.*`).
- Generated language pages inherit the page structure but receive the language-specific description at generation time.
- Metadata is part of localization QA; an SR page must not ship with an EN description merely because the visible body is translated.

## Structured display values
Localized presentation values such as country/city display and judging grades must be referenced from the i18n layer when localization is intended. They must not exist only as unused dictionary entries. Official event/title names and formal cynological codes remain original according to the terminology policy.

## Search discovery inheritance
`sitemap.xml` and `robots.txt` are generated from the same discovered NOCTARIS Core route model. A new Core page therefore enters crawler discovery for every active language on the next generation run; localized URLs are not maintained by hand.

## Pre-deploy QA inheritance rule
Multilingual releases must pass `scripts/qa_predeploy.py` after generation. The QA gate discovers Core pages rather than maintaining a separate manual page list, so future pages inherit the same release checks. A failed gate blocks deployment; production is not debugged in place.
