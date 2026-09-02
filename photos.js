(() => {
  'use strict';

  const photos = [
    { src: '/assets/atlas/atlas-01.webp', alt: 'Made In Spain Atlas — photograph 1', width: 2048, height: 1365 },
    { src: '/assets/atlas/atlas-02.webp', alt: 'Made In Spain Atlas — photograph 2', width: 2504, height: 1814 },
    { src: '/assets/atlas/atlas-04.webp', alt: 'Made In Spain Atlas — photograph 3', width: 2048, height: 1365 },
    { src: '/assets/atlas/atlas-03.webp', alt: 'Made In Spain Atlas — photograph 4', width: 3505, height: 2414 }
  ];

  document.addEventListener('DOMContentLoaded', () => {
    const section = document.getElementById('photos');
    const carousel = document.getElementById('photos-carousel');
    const viewport = document.getElementById('photos-viewport');
    const openButton = document.getElementById('photos-open');
    const image = document.getElementById('photos-image');
    const prev = document.getElementById('photos-prev');
    const next = document.getElementById('photos-next');
    const counter = document.getElementById('photos-counter');

    const modal = document.getElementById('gallery-modal');
    const stage = document.getElementById('gallery-stage');
    const full = document.getElementById('gallery-full');
    const close = document.getElementById('gallery-close');
    const modalPrev = document.getElementById('gallery-prev');
    const modalNext = document.getElementById('gallery-next');
    const modalCounter = document.getElementById('gallery-counter');

    if (!section || !carousel || !viewport || !openButton || !image || !prev || !next || !counter ||
        !modal || !stage || !full || !close || !modalPrev || !modalNext || !modalCounter || !photos.length) return;

    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const loaded = new Set();
    const failed = new Set();
    const pointers = new Map();
    let index = 0;
    let transitionToken = 0;
    let carouselPointer = null;
    let lastTap = { time: 0, x: 0, y: 0 };
    let viewerOpenedWithHistory = false;
    let viewerClosingFromPop = false;
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
    const label = () => `${pad(index + 1)} / ${pad(photos.length)}`;

    function existingIndex(candidate, direction = 1) {
      if (!failed.has(candidate)) return candidate;
      for (let step = 1; step < photos.length; step += 1) {
        const forward = candidate + step * direction;
        if (forward >= 0 && forward < photos.length && !failed.has(forward)) return forward;
      }
      for (let step = 1; step < photos.length; step += 1) {
        const backward = candidate - step * direction;
        if (backward >= 0 && backward < photos.length && !failed.has(backward)) return backward;
      }
      return candidate;
    }

    function preload(i) {
      if (i < 0 || i >= photos.length || loaded.has(i) || failed.has(i)) return;
      const preloadImage = new Image();
      preloadImage.decoding = 'async';
      preloadImage.onload = () => loaded.add(i);
      preloadImage.onerror = () => failed.add(i);
      preloadImage.src = photos[i].src;
    }

    function preloadNeighbours() {
      preload(index - 1);
      preload(index + 1);
    }

    function updateControls() {
      const atStart = index <= 0;
      const atEnd = index >= photos.length - 1;
      prev.disabled = atStart;
      next.disabled = atEnd;
      modalPrev.disabled = atStart;
      modalNext.disabled = atEnd;
      const value = label();
      counter.textContent = value;
      modalCounter.textContent = value;
      openButton.setAttribute('aria-label', `Open photo ${index + 1} of ${photos.length} in fullscreen`);
      viewport.setAttribute('aria-label', `Photo ${index + 1} of ${photos.length}`);
    }

    function applyCarouselPhoto(i, { animate = true } = {}) {
      const target = existingIndex(i, i >= index ? 1 : -1);
      if (target < 0 || target >= photos.length || target === index && image.src.endsWith(photos[target].src)) {
        updateControls();
        preloadNeighbours();
        return;
      }

      const token = ++transitionToken;
      const nextPhoto = photos[target];
      const candidate = new Image();
      candidate.decoding = 'async';
      candidate.onload = async () => {
        if (token !== transitionToken) return;
        try { await candidate.decode(); } catch (_) {}
        if (token !== transitionToken) return;

        if (animate && !reduceMotion.matches) image.classList.add('is-changing');
        const swap = () => {
          index = target;
          image.src = nextPhoto.src;
          image.alt = nextPhoto.alt;
          image.width = nextPhoto.width;
          image.height = nextPhoto.height;
          loaded.add(target);
          updateControls();
          preloadNeighbours();
          if (modal.classList.contains('is-open')) setViewerPhoto(false);
          requestAnimationFrame(() => image.classList.remove('is-changing'));
        };
        if (animate && !reduceMotion.matches) window.setTimeout(swap, 120);
        else swap();
      };
      candidate.onerror = () => {
        failed.add(target);
        if (failed.size >= photos.length) section.hidden = true;
        else applyCarouselPhoto(existingIndex(target, target >= index ? 1 : -1), { animate: false });
      };
      candidate.src = nextPhoto.src;
    }

    function move(delta) {
      const target = index + delta;
      if (target < 0 || target >= photos.length) return;
      applyCarouselPhoto(target);
    }

    function goToBoundary(which) {
      applyCarouselPhoto(which === 'start' ? 0 : photos.length - 1);
    }

    function setViewerPhoto(reset = true) {
      if (reset) resetZoom();
      const photo = photos[index];
      full.src = photo.src;
      full.alt = `${photo.alt}. Fullscreen view.`;
      full.width = photo.width;
      full.height = photo.height;
      updateControls();
      preloadNeighbours();
    }

    function setTransform() {
      clampPan();
      full.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale})`;
    }

    function clampScale(value) {
      return Math.min(Math.max(value, 1), 5);
    }

    function imageBaseSize() {
      const naturalW = full.naturalWidth || photos[index].width;
      const naturalH = full.naturalHeight || photos[index].height;
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
      setTransform();
    }

    function openViewer({ fromHistory = false } = {}) {
      if (modal.classList.contains('is-open')) return;
      setViewerPhoto(true);
      previousBodyOverflow = document.body.style.overflow;
      previousHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('gallery-viewer-open');
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      close.focus({ preventScroll: true });

      if (!fromHistory) {
        history.pushState({ ...(history.state || {}), noctarisPhotoViewer: true }, '', window.location.href);
        viewerOpenedWithHistory = true;
      } else {
        viewerOpenedWithHistory = false;
      }
    }

    function finishClose() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('gallery-viewer-open');
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      resetZoom();
      full.removeAttribute('src');
      openButton.focus({ preventScroll: true });
      viewerOpenedWithHistory = false;
      viewerClosingFromPop = false;
    }

    function closeViewer({ fromPop = false } = {}) {
      if (!modal.classList.contains('is-open')) return;
      if (!fromPop && viewerOpenedWithHistory) {
        viewerClosingFromPop = true;
        history.back();
        return;
      }
      finishClose();
    }

    function viewerGoTo(target) {
      if (scale > 1 || target < 0 || target >= photos.length || target === index) return;
      const photo = photos[target];
      const candidate = new Image();
      candidate.onload = () => {
        index = target;
        loaded.add(target);
        resetZoom();
        setViewerPhoto(false);
        image.src = photo.src;
        image.alt = photo.alt;
        image.width = photo.width;
        image.height = photo.height;
        updateControls();
        preloadNeighbours();
      };
      candidate.onerror = () => failed.add(target);
      candidate.src = photo.src;
    }

    function viewerMove(delta) {
      viewerGoTo(index + delta);
    }

    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));

    viewport.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      if (event.key === 'Home') { event.preventDefault(); goToBoundary('start'); }
      if (event.key === 'End') { event.preventDefault(); goToBoundary('end'); }
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openViewer(); }
    });

    openButton.addEventListener('click', event => {
      if (coarsePointer.matches) {
        event.preventDefault();
        return;
      }
      openViewer();
    });

    viewport.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse') return;
      carouselPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, time: performance.now() };
      try { viewport.setPointerCapture(event.pointerId); } catch (_) {}
    });

    viewport.addEventListener('pointermove', event => {
      if (!carouselPointer || carouselPointer.id !== event.pointerId) return;
      if (Math.abs(event.clientX - carouselPointer.x) > 8 || Math.abs(event.clientY - carouselPointer.y) > 8) carouselPointer.moved = true;
    });

    viewport.addEventListener('pointerup', event => {
      if (!carouselPointer || carouselPointer.id !== event.pointerId) return;
      const dx = event.clientX - carouselPointer.x;
      const dy = event.clientY - carouselPointer.y;
      const duration = performance.now() - carouselPointer.time;
      const moved = carouselPointer.moved;
      carouselPointer = null;

      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.15 && duration < 900) {
        move(dx < 0 ? 1 : -1);
        lastTap.time = 0;
        return;
      }

      if (!moved && coarsePointer.matches) {
        const now = performance.now();
        const distance = Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y);
        if (now - lastTap.time < 360 && distance < 36) {
          lastTap.time = 0;
          openViewer();
        } else {
          lastTap = { time: now, x: event.clientX, y: event.clientY };
        }
      }
    });

    viewport.addEventListener('pointercancel', () => { carouselPointer = null; });

    close.addEventListener('click', () => closeViewer());
    modalPrev.addEventListener('click', () => viewerMove(-1));
    modalNext.addEventListener('click', () => viewerMove(1));

    function distance(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
    function center(a, b) { return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; }

    stage.addEventListener('pointerdown', event => {
      if (event.target.closest('.gallery-close, .gallery-arrow')) return;
      event.preventDefault();
      try { stage.setPointerCapture(event.pointerId); } catch (_) {}
      pointers.set(event.pointerId, event);

      if (pointers.size === 1) {
        dragStart = { x: event.clientX, y: event.clientY, panX, panY };
        viewerSwipeStart = { x: event.clientX, y: event.clientY, time: performance.now() };
        stage.classList.add('is-dragging');
      } else if (pointers.size === 2) {
        const pts = [...pointers.values()];
        pinchStartDistance = distance(pts[0], pts[1]);
        pinchStartScale = scale;
        pinchStartCenter = center(pts[0], pts[1]);
      }
    }, { passive: false });

    stage.addEventListener('pointermove', event => {
      if (!pointers.has(event.pointerId)) return;
      event.preventDefault();
      pointers.set(event.pointerId, event);

      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const currentCenter = center(pts[0], pts[1]);
        const currentDistance = distance(pts[0], pts[1]);
        scale = clampScale(pinchStartScale * (currentDistance / Math.max(1, pinchStartDistance)));
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
    }, { passive: false });

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
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.15 && duration < 950) viewerMove(dx < 0 ? 1 : -1);
          }
        }
        viewerSwipeStart = null;
      }
    }

    stage.addEventListener('pointerup', endViewerPointer, { passive: false });
    stage.addEventListener('pointercancel', endViewerPointer, { passive: false });

    stage.addEventListener('wheel', event => {
      if (!modal.classList.contains('is-open')) return;
      event.preventDefault();
      const oldScale = scale;
      scale = clampScale(scale * (event.deltaY < 0 ? 1.16 : 0.86));
      if (scale === 1) {
        panX = 0;
        panY = 0;
      } else if (oldScale > 0) {
        panX *= scale / oldScale;
        panY *= scale / oldScale;
      }
      setTransform();
    }, { passive: false });

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
        else if (event.key === 'End' && scale === 1) { event.preventDefault(); viewerGoTo(photos.length - 1); }
        return;
      }
    });

    window.addEventListener('resize', () => { if (modal.classList.contains('is-open')) setTransform(); });

    window.addEventListener('popstate', () => {
      if (!modal.classList.contains('is-open')) return;
      finishClose();
    });

    image.addEventListener('load', () => {
      loaded.add(index);
      section.classList.add('is-ready');
      preloadNeighbours();
    });
    image.addEventListener('error', () => {
      failed.add(index);
      if (failed.size >= photos.length) section.hidden = true;
      else applyCarouselPhoto(existingIndex(index, 1), { animate: false });
    });

    updateControls();
    loaded.add(0);
    preloadNeighbours();
  });
})();
