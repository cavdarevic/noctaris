# NOCTARIS — Multilingual Release Checklist

## Pre-deploy gate
- Stable production ZIP exists and checksum is recorded in `ROLLBACK.md`.
- Create Git tag `pre-multilingual-20260921` on the current stable production commit.
- Deploy only the approved release candidate; do not mix unrelated changes.

## Immediate post-deploy smoke test
Check both desktop and mobile:
- EN: `/`, `/atlas/`, `/shelby/`, `/gallery/`, `/about/`, `/contact/`
- SR: `/sr/`, `/sr/atlas/`, `/sr/shelby/`, `/sr/gallery/`, `/sr/about/`, `/sr/contact/`
- EN/SR selector preserves the current page.
- DOGS menu still works.
- Atlas/Shelby Photos, fullscreen viewer, swipe/zoom and pedigree viewer still work.
- Gallery masonry/fullscreen behavior is unchanged.
- No horizontal overflow or broken navigation.
- Canonical/hreflang values match the current page/language.

## Rollback trigger
Rollback first if any core EN route breaks, navigation becomes unusable, dog/gallery media behavior regresses, localized routing loops/404s, or the release introduces a site-wide layout failure.

Follow `ROLLBACK.md`; diagnose only after stable production is restored.
- Confirm each localized page has a localized `<meta name="description">`; no EN description may remain on SR pages.
- Confirm localized accessibility labels are present for page/profile/carousel landmarks before JavaScript runs.

## Localized structured display QA
- [ ] Show/location display strings are localized through i18n keys (not hard-coded in generated language pages).
- [ ] Official show/title names and cynological codes remain unchanged where classified as official nomenclature.

## Search discovery
- [ ] `sitemap.xml` contains every Core route in EN and every active localized route.
- [ ] `robots.txt` points to `https://noctarisone.com/sitemap.xml`.
- [ ] A newly added Core page appears in the sitemap for all active languages after generation.

## Automated pre-deploy gate
Before every production release, run:

`python3 scripts/generate_languages.py && python3 scripts/qa_predeploy.py`

Deployment is blocked unless the result is `NOCTARIS PREDEPLOY QA: PASS`.
This gate checks EN/SR dictionary parity, generated-page parity, html language, canonical/hreflang presence, duplicate IDs, root-relative local links/assets, sitemap parity, and critical rollback/release files.
