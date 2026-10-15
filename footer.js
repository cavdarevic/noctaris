/* NOCTARIS UNIVERSAL FOOTER V1 — intentionally language-independent. */
(function () {
  "use strict";
  if (document.querySelector(".noctaris-universal-footer")) return;
  const facebook = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M13.7 21v-8.2h2.8l.4-3.2h-3.2v-2c0-.9.3-1.5 1.6-1.5H17V3.2a22 22 0 0 0-2.5-.2c-2.5 0-4.2 1.5-4.2 4.3v2.4H7.5v3.2h2.8V21z"/></svg>';
  const instagram = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.65" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>';
  const footer = document.createElement("footer");
  footer.className = "noctaris-universal-footer";
  footer.setAttribute("aria-label", "NOCTARIS footer");
  footer.innerHTML = '<div class="noctaris-footer-inner">' +
    '<span class="noctaris-footer-copyright">© 2026 <span class="noctaris-footer-wordmark">NOCTARIS</span>. All rights reserved.</span>' +
    '<div class="noctaris-footer-right">' +
    '<span class="noctaris-footer-icon" role="img" aria-label="Facebook (coming soon)">' + facebook + '</span>' +
    '<span class="noctaris-footer-icon" role="img" aria-label="Instagram (coming soon)">' + instagram + '</span>' +
    '<span class="noctaris-footer-privacy">Privacy Policy</span>' +
    '</div></div>';
  document.body.appendChild(footer);
})();
