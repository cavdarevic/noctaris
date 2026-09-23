# NOCTARIS — Phase 3 Browser Gate Handoff

Date: 2026-09-22
Candidate: V12

## Status before browser acceptance

- Development freeze: PASS
- Pre-deploy QA: PASS
- Static visual-risk audit: PASS
- Language/route interaction contract: PASS (12 pages, 0 errors)
- Production/GitHub: NOT TOUCHED

## Real-browser acceptance gate

The following must be verified in a real browser before Phase 3 is CLOSED:

1. Desktop header: EN/SR selector opens, aligns right, and does not disturb primary navigation.
2. Mobile <=520 px: selector remains independent of the five primary navigation items; no horizontal overflow.
3. Language switching preserves page identity: Home↔Početna, Atlas↔Atlas, Shelby↔Shelby, Gallery↔Galerija, About↔O nama, Contact↔Kontakt.
4. Atlas and Shelby: Photos/fullscreen/swipe/zoom and pedigree viewer remain unchanged functionally.
5. Gallery: masonry rhythm, fullscreen, swipe and close/back behavior remain unchanged.
6. Serbian typography: č/ć/š/ž/đ render correctly; longer labels do not collide, clip or create unwanted wraps.
7. About: editorial line breaks and vertical rhythm remain intentional in SR.
8. Desktop + mobile: no unexpected layout shift, missing image, broken asset, or visible untranslated UI string.

## Decision rule

All eight checks PASS -> Phase 3 PASS/CLOSED and controlled production deployment may be prepared.

Any concrete defect -> NO-GO. Fix only that defect outside production, regenerate localized output, rerun the complete pre-deploy gate, and create a new candidate.

Rollback-first rule remains unchanged for any serious post-deployment regression.
