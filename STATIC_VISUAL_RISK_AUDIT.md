# NOCTARIS — Phase 3 Static Visual Risk Audit

Date: 2026-09-22
Candidate: V10

## Scope
Static inspection of the frozen EN/SR build before real-browser visual acceptance. This does not replace browser rendering.

## PASS checks
- Mobile (<=520px) language selector is absolutely positioned at the right edge and removed from the five-item navigation flow.
- Mobile navigation reserves 48px on the right for the selector.
- Language dropdown remains right-aligned in default, hover, focus-within and is-open states.
- EN/SR selector label is short and stable; chevron is presentation-only.
- Serbian primary-nav labels fit the compact-navigation design by static width-risk review.
- No language-specific layout fork exists; EN and SR use the same CSS and functional JS.
- About controlled line breaks remain structural and translated spans preserve them.
- Serbian diacritics are UTF-8 content; no alternate font/CSS fork was introduced.
- Generated SR pages keep shared photo, gallery and pedigree behavior/assets.

## Browser-only acceptance still required
- Actual font metrics and wrapping at representative desktop/mobile widths.
- Dropdown visual position and layering while opened.
- Touch interaction on mobile.
- Photos/fullscreen/swipe/zoom behavior.
- Gallery masonry/fullscreen behavior.
- Pedigree viewer/export behavior.
- Overall NOCTARIS visual rhythm and spacing.

## Gate
STATIC VISUAL RISK AUDIT: PASS
REAL-BROWSER VISUAL ACCEPTANCE: PENDING
