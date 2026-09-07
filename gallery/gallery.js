(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('gallery-root');
    const pages = root ? [...root.querySelectorAll('.gallery-dog-page')] : [];

    const modal = document.getElementById('gallery-modal');
    const stage = document.getElementById('gallery-stage');
    const full = document.getElementById('gallery-full');
    const close = document.getElementById('gallery-close');
    const modalPrev = document.getElementById('gallery-prev');
    const modalNext = document.getElementById('gallery-next');
    const modalCounter = document.getElementById('gallery-counter');

    if (!root || !pages.length || !modal || !stage || !full || !close || !modalPrev || !modalNext || !modalCounter) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointers = new Map();
    let pageIndex = Math.max(0, pages.findIndex(page => page.classList.contains('is-active')));
    let photoIndex = 0;
    let activePhotos = [];
    let returnTarget = null;
    let viewerOpenedWithHistory = false;
    let previousBodyOverflow = '';
    let previousHtmlOverflow = '';

    let scale = 1;
    let panX = 0;
    let panY = 0;
    let pinchStartDistance = 0;
    let pinchStartScale = 1;
    let pinchStartCenter = null;
    let dragStart = null;
    let viewerSwipeStart = null;

    const pad = value => String(value).padStart(2, '0');

    function pagePhotos(page) {
      return [...page.querySelectorAll('[data-gallery-photo][data-src]')].map(button => ({
        button,
        src: button.dataset.src,
        alt: button.dataset.alt || button.querySelector('img')?.alt || 'NOCTARIS Gallery photograph'
      })).filter(photo => photo.src);
    }

    function updatePageUI() {
      pages.forEach((page, index) => {
        const active = index === pageIndex;
        page.classList.toggle('is-active', active);
        page.hidden = !active;
        page.querySelectorAll('[data-page-current]').forEach(node => { node.textContent = String(index + 1); });
        page.querySelectorAll('[data-page-total]').forEach(node => { node.textContent = String(pages.length); });
        const headerCount = page.querySelector('.gallery-page-count');
        if (headerCount) headerCount.setAttribute('aria-label', `Gallery page ${index + 1} of ${pages.length}`);
        const prev = page.querySelector('[data-gallery-page-prev]');
        const next = page.querySelector('[data-gallery-page-next]');
        if (prev) prev.disabled = index === 0;
        if (next) next.disabled = index === pages.length - 1;
      });
    }

    function goToPage(target) {
      if (modal.classList.contains('is-open') || target < 0 || target >= pages.length || target === pageIndex) return;
      pageIndex = target;
      updatePageUI();
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }

    function setTransform() {
      clampPan();
      full.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale})`;
    }

    function clampScale(value) {
      return Math.min(Math.max(value, 1), 5);
    }

    function imageBaseSize() {
      const naturalW = full.naturalWidth || 1;
      const naturalH = full.naturalHeight || 1;
      const maxW = window.innerWidth;
      const maxH = window.innerHeight * 0.92;
      const fit = Math.min(maxW / naturalW, maxH / naturalH, 1);
      return { width: naturalW * fit, height: naturalH * fit };
    }

    function clampPan() {
      if (scale <= 1) {
        panX = 0;
        panY = 0;
        return;
      }
      const base = imageBaseSize();
      const maxX = Math.max(0, (base.width * scale - window.innerWidth) / 2);
      const maxY = Math.max(0, (base.height * scale - window.innerHeight) / 2);
      panX = Math.max(-maxX, Math.min(maxX, panX));
      panY = Math.max(-maxY, Math.min(maxY, panY));
    }

    function resetZoom() {
      scale = 1;
      panX = 0;
      panY = 0;
      pointers.clear();
      dragStart = null;
      pinchStartCenter = null;
      viewerSwipeStart = null;
      setTransform();
    }

    function preload(index) {
      if (index < 0 || index >= activePhotos.length) return;
      const image = new Image();
      image.decoding = 'async';
      image.src = activePhotos[index].src;
    }

    function updateViewerControls() {
      const atStart = photoIndex <= 0;
      const atEnd = photoIndex >= activePhotos.length - 1;
      modalPrev.disabled = atStart;
      modalNext.disabled = atEnd;
      modalCounter.textContent = `${pad(photoIndex + 1)} / ${pad(activePhotos.length)}`;
      modalPrev.setAttribute('aria-hidden', atStart ? 'true' : 'false');
      modalNext.setAttribute('aria-hidden', atEnd ? 'true' : 'false');
    }

    function setViewerPhoto({ reset = true } = {}) {
      if (!activePhotos.length) return;
      if (reset) resetZoom();
      const photo = activePhotos[photoIndex];
      full.src = photo.src;
      full.alt = `${photo.alt}. Fullscreen view.`;
      updateViewerControls();
      preload(photoIndex - 1);
      preload(photoIndex + 1);
    }

    function openViewer(button) {
      const page = pages[pageIndex];
      activePhotos = pagePhotos(page);
      photoIndex = activePhotos.findIndex(photo => photo.button === button);
      if (photoIndex < 0 || !activePhotos.length) return;

      returnTarget = button;
      setViewerPhoto({ reset:true });
      previousBodyOverflow = document.body.style.overflow;
      previousHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('gallery-viewer-open');
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      close.focus({ preventScroll:true });

      history.pushState({ ...(history.state || {}), noctarisGalleryViewer:true }, '', window.location.href);
      viewerOpenedWithHistory = true;
    }

    function finishClose() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('gallery-viewer-open');
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      resetZoom();
      full.removeAttribute('src');
      if (returnTarget) returnTarget.focus({ preventScroll:true });
      viewerOpenedWithHistory = false;
    }

    function closeViewer({ fromPop = false } = {}) {
      if (!modal.classList.contains('is-open')) return;
      if (!fromPop && viewerOpenedWithHistory) {
        history.back();
        return;
      }
      finishClose();
    }

    function viewerGoTo(target) {
      /* Hard boundary: fullscreen never crosses into another dog's page. */
      if (scale > 1 || target < 0 || target >= activePhotos.length || target === photoIndex) return;
      const candidate = new Image();
      candidate.decoding = 'async';
      candidate.onload = () => {
        photoIndex = target;
        setViewerPhoto({ reset:true });
      };
      candidate.src = activePhotos[target].src;
    }

    function viewerMove(delta) {
      viewerGoTo(photoIndex + delta);
    }

    pages.forEach((page, index) => {
      page.querySelectorAll('[data-gallery-photo]').forEach(button => {
        button.addEventListener('click', () => {
          if (index !== pageIndex) return;
          openViewer(button);
        });
      });

      page.querySelector('[data-gallery-page-prev]')?.addEventListener('click', () => goToPage(index - 1));
      page.querySelector('[data-gallery-page-next]')?.addEventListener('click', () => goToPage(index + 1));
    });

    close.addEventListener('click', () => closeViewer());
    modalPrev.addEventListener('click', () => viewerMove(-1));
    modalNext.addEventListener('click', () => viewerMove(1));

    function distance(a,b) {
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function center(a,b) {
      return { x:(a.clientX + b.clientX) / 2, y:(a.clientY + b.clientY) / 2 };
    }

    stage.addEventListener('pointerdown', event => {
      if (event.target.closest('.gallery-close, .gallery-arrow')) return;
      event.preventDefault();
      try { stage.setPointerCapture(event.pointerId); } catch (_) {}
      pointers.set(event.pointerId,event);

      if (pointers.size === 1) {
        dragStart = { x:event.clientX, y:event.clientY, panX, panY };
        viewerSwipeStart = { x:event.clientX, y:event.clientY, time:performance.now() };
        stage.classList.add('is-dragging');
      } else if (pointers.size === 2) {
        const pts = [...pointers.values()];
        pinchStartDistance = distance(pts[0],pts[1]);
        pinchStartScale = scale;
        pinchStartCenter = center(pts[0],pts[1]);
      }
    }, { passive:false });

    stage.addEventListener('pointermove', event => {
      if (!pointers.has(event.pointerId)) return;
      event.preventDefault();
      pointers.set(event.pointerId,event);

      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const currentCenter = center(pts[0],pts[1]);
        const currentDistance = distance(pts[0],pts[1]);
        scale = clampScale(pinchStartScale * (currentDistance / Math.max(1,pinchStartDistance)));
        if (pinchStartCenter) {
          panX += currentCenter.x - pinchStartCenter.x;
          panY += currentCenter.y - pinchStartCenter.y;
          pinchStartCenter = currentCenter;
        }
        setTransform();
      } else if (pointers.size === 1 && scale > 1 && dragStart) {
        panX = dragStart.panX + (event.clientX - dragStart.x);
        panY = dragStart.panY + (event.clientY - dragStart.y);
        setTransform();
      }
    }, { passive:false });

    function endViewerPointer(event) {
      if (!pointers.has(event.pointerId)) return;
      const start = viewerSwipeStart;
      pointers.delete(event.pointerId);
      if (pointers.size === 0) {
        stage.classList.remove('is-dragging');
        dragStart = null;
        pinchStartCenter = null;
        if (scale <= 1.001) {
          scale = 1;
          setTransform();
          if (start) {
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            const duration = performance.now() - start.time;
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.15 && duration < 950) {
              viewerMove(dx < 0 ? 1 : -1);
            }
          }
        }
        viewerSwipeStart = null;
      }
    }

    stage.addEventListener('pointerup',endViewerPointer,{ passive:false });
    stage.addEventListener('pointercancel',endViewerPointer,{ passive:false });

    stage.addEventListener('wheel', event => {
      if (!modal.classList.contains('is-open')) return;
      event.preventDefault();
      const oldScale = scale;
      scale = clampScale(scale * (event.deltaY < 0 ? 1.16 : .86));
      if (scale === 1) {
        panX = 0;
        panY = 0;
      } else if (oldScale > 0) {
        panX *= scale / oldScale;
        panY *= scale / oldScale;
      }
      setTransform();
    }, { passive:false });

    stage.addEventListener('dblclick', event => {
      if (event.target.closest('.gallery-close, .gallery-arrow')) return;
      event.preventDefault();
      if (scale > 1) resetZoom();
      else {
        scale = 2;
        panX = 0;
        panY = 0;
        setTransform();
      }
    });

    document.addEventListener('keydown', event => {
      if (modal.classList.contains('is-open')) {
        if (event.key === 'Escape') { event.preventDefault(); closeViewer(); }
        else if (event.key === 'ArrowLeft' && scale === 1) { event.preventDefault(); viewerMove(-1); }
        else if (event.key === 'ArrowRight' && scale === 1) { event.preventDefault(); viewerMove(1); }
        else if (event.key === 'Home' && scale === 1) { event.preventDefault(); viewerGoTo(0); }
        else if (event.key === 'End' && scale === 1) { event.preventDefault(); viewerGoTo(activePhotos.length - 1); }
        return;
      }

      if (event.key === 'ArrowLeft') goToPage(pageIndex - 1);
      if (event.key === 'ArrowRight') goToPage(pageIndex + 1);
    });

    window.addEventListener('resize', () => {
      if (modal.classList.contains('is-open')) setTransform();
    });

    window.addEventListener('popstate', () => {
      if (modal.classList.contains('is-open')) closeViewer({ fromPop:true });
    });

    updatePageUI();
  });
})();
