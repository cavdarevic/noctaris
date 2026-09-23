# NOCTARIS Rollback Standard

## Rule
The last known stable production release is always preserved before a multilingual deployment. A multilingual release must never overwrite or replace the rollback package.

## Current rollback baseline
- Release: `noctaris-PRODUKCIJA-20260921-2.zip`
- SHA-256: `c07a9dd683a16c30dd2b4f75c0b69441a41cd6c074a99fdadb34ada03cb0bfd1`
- Meaning: exact production snapshot supplied before Phase 2/3 multilingual work.

## Fast rollback procedure (GitHub Pages)
1. Do not debug live production under pressure.
2. Restore the repository to the last stable production commit/tag, or replace the repository contents with the preserved stable production snapshot.
3. Commit/push the rollback as one clean change.
4. Wait for GitHub Pages deployment to complete.
5. Verify `/`, `/atlas/`, `/shelby/`, `/gallery/`, `/about/`, and `/contact/`.
6. Only after production is stable, diagnose the failed multilingual release in a separate working copy.

## Release discipline
- Immediately before the first multilingual production deployment, create a Git tag for the current stable production commit, recommended name: `pre-multilingual-20260921`.
- Create a separate tag for each approved multilingual production release.
- Never delete the last stable tag/snapshot during a deployment.
- Generated `/sr/**` pages are deployable output, not hand-maintained source.
- If a problem is limited to Serbian localization but affects production confidence, prefer full rollback to the known stable release rather than emergency edits directly in `/sr/**`.

## STOP rule
If deployment produces broken navigation, missing assets, layout regression, incorrect language routing, JavaScript errors, or unexpected impact on existing English pages, stop further edits and rollback first. Diagnose second.
