# NOCTARIS — Phase 3 Visual Acceptance

Technical freeze: V9/V10 line. No feature changes are permitted during acceptance.

## Desktop acceptance
Check EN and SR on Home, Atlas, Shelby, Gallery, About, Contact.
- Header rhythm and alignment remain NOCTARIS baseline.
- Language selector is discreet and opens aligned to the right.
- Switching EN ↔ SR keeps the equivalent current page.
- No clipping, wrapping collisions, unexpected horizontal scroll, or layout shift.
- Atlas/Shelby Photos, fullscreen viewer, pedigree viewer and achievements retain baseline behavior.
- Gallery masonry/fullscreen behavior retains baseline behavior.
- Serbian diacritics render correctly: č ć š ž đ / Č Ć Š Ž Đ.

## Mobile acceptance (priority ≤520 px)
- Five primary navigation items retain their baseline flow.
- Language selector remains independent at the right side of the header.
- Language menu is fully visible and does not overlap/cut off primary navigation.
- Long Serbian labels do not clip or create horizontal scrolling.
- Photo/fullscreen/swipe/zoom behavior remains unchanged.

## Content acceptance
- Registered dog names, pedigree names, official title codes, judge names, show names and DNA nomenclature remain original where locked by the multilingual standard.
- Serbian editorial/UI terminology is consistent with MULTILINGUAL.md.
- About line breaks preserve the intended editorial composition.
- Dates and localized locations render in Serbian where defined.

## GO / NO-GO
GO only if all checks above pass and `python3 scripts/qa_predeploy.py` returns PASS.
Any critical visual/function regression = NO-GO. Do not live-debug production. Restore the stable rollback version first if already deployed, then fix off-production and rerun the gate.
