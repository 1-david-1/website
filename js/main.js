(function () {
  'use strict';

  /* ── DOM refs (safe – may be null on sub-pages) ── */
  const body = document.body;
  const preloader = document.getElementById('preloader');
  const scrollProgress = document.getElementById('scrollProgress');
  const scrollProgressFill = document.getElementById('scrollProgressFill');
  const toastStack = document.getElementById('toastStack');
  const homeStats = document.getElementById('homeStats');

  /* ── Config ── */
  const FORMSPREE_ID = 'xvzveqvz';
  const SITE_CONFIG = {
    email: ['david', 'inbox-elevate.de'].join('@'),
    linkedin: 'https://www.linkedin.com/company/inboxelevate/'
  };
  // Weiche Trennzeichen (\u00AD) erlauben saubere Umbrüche langer Wörter, ohne dass etwas abgeschnitten wird
  const HERO_TYPEWRITER_TERMS = [
    'Sicherheits\u00ADunternehmen',
    'Wachdienste',
    'Objekt\u00ADschutz-Firmen',
    'Personen\u00ADschutz-Firmen',
    'Alarm\u00ADanlagen-Anbieter',
    'Sicherheits\u00ADdienste',
    'Security-Dienst\u00ADleister',
    'Revierdienste',
    'Event-Security',
    'Sicherheits\u00ADtechniker'
  ];
  const HERO_TYPE_SPEED = 72;
  const HERO_DELETE_SPEED = 38;
  const HERO_HOLD_DELAY = 1800;
  const HERO_PAUSE_DELAY = 280;

  /* ── State ── */
  let currentPage = 'home';
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollHeavyPages = new Set(['home']);
  let revealObserver, counterObserver;
  let countersRun = false;
  let typewriterTimeout = 0;

  /* ── Utilities ── */
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  function getScrollMax() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }

  function handleKeyAction(event, callback) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); callback(); }
  }
  window.handleKeyAction = handleKeyAction;

  function initBrandAnimation() {
    document.querySelectorAll('.logo').forEach(logo => {
      if (!logo.querySelector('.logo-name')) {
        const textNode = Array.from(logo.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        if (textNode) {
          const span = document.createElement('span');
          span.className = 'logo-name';
          span.textContent = textNode.textContent.trim();
          textNode.replaceWith(span);
        }
      }
      if (reducedMotion) return;
      logo.classList.remove('brand-animated');
      void logo.offsetWidth;
      logo.classList.add('brand-animated');
      setTimeout(() => logo.classList.remove('brand-animated'), 1700);
    });
  }

  /* ── Email obfuscation ── */
  function injectEmails() {
    const email = SITE_CONFIG.email;
    document.querySelectorAll('.js-email-link').forEach(el => {
      el.href = 'mailto:' + email;
      if (el.textContent.trim() === '[E-Mail laden…]') el.textContent = email;
    });
    document.querySelectorAll('.js-email-text').forEach(el => { el.textContent = email; });
    const replyTo = document.getElementById('js-replyto');
    if (replyTo) replyTo.value = email;
  }

  /* ── Scroll chrome ── */
  function updateScrollChrome() {
    const y = window.scrollY || 0;
    const navEl = document.getElementById('nav');
    if (navEl) navEl.classList.toggle('nav-shrink', y > 80);
    if (!scrollProgress || !scrollProgressFill) return;
    const visible = scrollHeavyPages.has(currentPage) && getScrollMax() > 240;
    scrollProgress.classList.toggle('visible', visible);
    scrollProgressFill.style.width = visible ? `${clamp(y / Math.max(getScrollMax(), 1), 0, 1) * 100}%` : '0%';
  }

  /* ── FAQ toggle ── */
  function toggleFaq(button) {
    const card = button.closest('.faq-card');
    if (!card) return;
    const open = card.classList.contains('open');
    const scope = card.closest('.faq-col, .home-faq-list') || card.parentElement;
    scope.querySelectorAll('.faq-card').forEach(item => item.classList.remove('open'));
    if (!open) card.classList.add('open');
  }
  window.toggleFaq = toggleFaq;

  /* ── Toast ── */
  function showToast(title, message, type = 'success') {
    if (!toastStack) return;
    const toast = document.createElement('div');
    toast.className = `toast${type === 'error' ? ' error' : ''}`;
    toast.innerHTML = `<div class="toast-title">${title}</div><p>${message}</p>`;
    toastStack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 320); }, 4000);
  }

  /* ── Sticky mobile CTA ── */
  function initStickyMobileCta() {
    const bar = document.getElementById('stickyMobileCta');
    if (!bar) return;
    body.classList.add('has-sticky-cta');
    const onScroll = () => {
      bar.classList.toggle('visible', window.innerWidth <= 768 && window.scrollY > 320);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* ── Contact form ── */
  async function submitForm(event) {
    event.preventDefault();
    const form = document.getElementById('contactForm');
    const btn = document.getElementById('submitBtn');
    if (!form || !btn) return;
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Wird gesendet...';
    try {
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('server-error');
      const cForm = document.getElementById('cForm');
      const cFormOk = document.getElementById('cFormOk');
      if (cForm) cForm.style.display = 'none';
      if (cFormOk) cFormOk.style.display = 'block';
      showToast('Nachricht gesendet', 'Wir melden uns innerhalb von 48 Stunden.', 'success');
    } catch {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      showToast('Senden fehlgeschlagen', `Schreib uns direkt an ${SITE_CONFIG.email}`, 'error');
    }
  }
  window.submitForm = submitForm;

  /* ── Reveal on scroll ── */
  function initReveal() {
    if (revealObserver) revealObserver.disconnect();
    if (reducedMotion) { document.querySelectorAll('.sr,.sr-l,.sr-r').forEach(el => el.classList.add('v')); return; }
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('v'); revealObserver.unobserve(e.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll('.sr,.sr-l,.sr-r').forEach(el => { el.classList.remove('v'); revealObserver.observe(el); });
  }

  /* ── Hero typewriter ── */
  function stopHeroTypewriter() {
    if (typewriterTimeout) {
      clearTimeout(typewriterTimeout);
      typewriterTimeout = 0;
    }
  }

  function initHeroTypewriter() {
    stopHeroTypewriter();
    const el = document.getElementById('tw-text');
    if (!el) return;
    // Startzustand = vollständiges erstes Wort (identisch zum statischen HTML, kein Flackern)
    el.textContent = HERO_TYPEWRITER_TERMS[0];
    if (reducedMotion) return;
    let termIndex = 0, charIndex = HERO_TYPEWRITER_TERMS[0].length, isDeleting = false;
    const schedule = (fn, ms) => { typewriterTimeout = setTimeout(fn, ms); };
    function step() {
      const target = document.getElementById('tw-text');
      if (!target) return;
      const word = HERO_TYPEWRITER_TERMS[termIndex];
      if (!isDeleting) {
        if (charIndex < word.length) {
          charIndex++;
          target.textContent = word.slice(0, charIndex);
          schedule(step, HERO_TYPE_SPEED);
        } else {
          schedule(() => { isDeleting = true; step(); }, HERO_HOLD_DELAY);
        }
        return;
      }
      if (charIndex > 0) {
        charIndex--;
        target.textContent = word.slice(0, charIndex);
        schedule(step, HERO_DELETE_SPEED);
        return;
      }
      isDeleting = false;
      termIndex = (termIndex + 1) % HERO_TYPEWRITER_TERMS.length;
      schedule(step, HERO_PAUSE_DELAY);
    }
    schedule(() => { isDeleting = true; step(); }, HERO_HOLD_DELAY);
  }

  function startHeroAnimations() {
    const h = document.querySelector('.hero-h1');
    if (!h) return;
    h.classList.add('v');
    initHeroTypewriter();
  }

  /* ── Magnetic buttons ── */
  function initMagneticButtons() {
    document.querySelectorAll('.btn-ink,.nav-cta,.btn-submit,.btn-green,.btn-dark').forEach(btn => {
      btn.classList.add('magnetic');
      if (btn.dataset.magneticBound === 'true' || reducedMotion) return;
      btn.dataset.magneticBound = 'true';
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(((e.clientX-r.left)/r.width)-.5)*16}px,${(((e.clientY-r.top)/r.height)-.5)*16}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ── Fullscreen-Menü (Dialog mit Fokus-Management) ── */
  function initFullscreenMenu() {
    const btn       = document.getElementById('ham');
    const overlay   = document.getElementById('navOverlay');
    const overlayBg = document.getElementById('navOverlayBg');
    const closeBtn  = document.getElementById('menuClose');
    if (!btn || !overlay) return;

    let isOpen = false;
    let closeToken = 0;
    const gsapReady = typeof gsap !== 'undefined';

    if (gsapReady && typeof CustomEase !== 'undefined') {
      try { CustomEase.create('menuEase', '0.65, 0.01, 0.05, 0.99'); } catch (_) {}
    }
    const menuEase = (gsapReady && typeof CustomEase !== 'undefined') ? 'menuEase' : 'power2.inOut';

    // Alles hinter dem Dialog wird für Tastatur und Screenreader gesperrt, solange das Menü offen ist
    const backgroundEls = () => Array.from(document.body.children).filter(el => el !== overlay && el.tagName !== 'SCRIPT');
    const setBackgroundInert = on => backgroundEls().forEach(el => { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
    const focusables = () => Array.from(overlay.querySelectorAll('a[href], button:not([disabled])')).filter(el => el.getClientRects().length);

    function openMenu() {
      if (isOpen) return;
      isOpen = true;
      closeToken++;
      btn.setAttribute('aria-expanded', 'true');
      overlay.setAttribute('data-nav', 'open');
      overlay.style.display = 'flex';
      document.body.classList.add('menu-open');
      setBackgroundInert(true);
      if (closeBtn) closeBtn.focus({ preventScroll: true });

      if (!gsapReady || reducedMotion) return;

      const bgPanels  = overlay.querySelectorAll('.backdrop-layer');
      const menuLinks = overlay.querySelectorAll('.nav-link');
      const fadeEls   = overlay.querySelectorAll('[data-menu-fade]');

      gsap.timeline()
        .fromTo(overlayBg, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 })
        .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.1, duration: 0.55, ease: menuEase }, '<')
        .fromTo(menuLinks, { yPercent: 140, rotate: 10 }, { yPercent: 0, rotate: 0, stagger: 0.055, duration: 0.6, ease: menuEase }, '<+=0.3')
        .fromTo(fadeEls, { autoAlpha: 0, yPercent: 40 }, { autoAlpha: 1, yPercent: 0, stagger: 0.05, duration: 0.5, clearProps: 'all', ease: menuEase }, '<+=0.15');
    }

    function finishClose() {
      overlay.style.display = 'none';
      overlay.setAttribute('data-nav', 'closed');
    }

    function closeMenu() {
      if (!isOpen) return;
      isOpen = false;
      btn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
      setBackgroundInert(false);
      btn.focus({ preventScroll: true });

      if (!gsapReady || reducedMotion) { finishClose(); return; }

      // Sicherheitsnetz: Falls die Animation (z. B. in einem Hintergrund-Tab) nicht zu Ende läuft, wird das Overlay trotzdem ausgeblendet
      const token = ++closeToken;
      setTimeout(() => { if (!isOpen && token === closeToken) finishClose(); }, 1000);

      const panel = overlay.querySelector('.menu-content');
      gsap.timeline({ onComplete: () => { gsap.set(panel, { clearProps: 'xPercent' }); finishClose(); } })
        .to(overlayBg, { autoAlpha: 0, duration: 0.35, ease: menuEase })
        .to(panel, { xPercent: 105, duration: 0.45, ease: menuEase }, '<');
    }

    btn.addEventListener('click', () => (isOpen ? closeMenu() : openMenu()));
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (overlayBg) overlayBg.addEventListener('click', closeMenu);
    overlay.querySelectorAll('a[href]').forEach(a => a.addEventListener('click', () => {
      // Link auf die aktuelle Seite: Menü schließen statt neu zu laden
      if (a.pathname === location.pathname && !a.hash) closeMenu();
    }));

    window.addEventListener('keydown', e => {
      if (!isOpen) return;
      if (e.key === 'Escape') { closeMenu(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // Hover-Formen hinter den Menüpunkten
    overlay.querySelectorAll('.menu-list-item[data-shape]').forEach(item => {
      const idx   = item.getAttribute('data-shape');
      const shapesContainer = overlay.querySelector('.ambient-background-shapes');
      const shape = shapesContainer ? shapesContainer.querySelector(`.bg-shape-${idx}`) : null;
      if (!shape || !gsapReady || reducedMotion) return;
      const shapeEls = shape.querySelectorAll('.shape-element');

      item.addEventListener('mouseenter', () => {
        shapesContainer.querySelectorAll('.bg-shape').forEach(s => s.classList.remove('active'));
        shape.classList.add('active');
        gsap.fromTo(shapeEls,
          { scale: 0.5, opacity: 0, rotation: -10 },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.55, stagger: 0.07, ease: 'back.out(1.7)', overwrite: 'auto' }
        );
      });
      item.addEventListener('mouseleave', () => {
        gsap.to(shapeEls, {
          scale: 0.8, opacity: 0, duration: 0.28, ease: 'power2.in',
          onComplete: () => shape.classList.remove('active'), overwrite: 'auto'
        });
      });
    });
  }

  /* ── Spotlight cards ── */
  function initSpotlights() {
    document.querySelectorAll('.spotlight-card').forEach(card => {
      if (card.dataset.spotlightBound === 'true') return;
      card.dataset.spotlightBound = 'true';
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--x', `${((e.clientX-r.left)/r.width)*100}%`);
        card.style.setProperty('--y', `${((e.clientY-r.top)/r.height)*100}%`);
      });
    });
  }

  /* ── Counters ── */
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '', prefix = el.dataset.prefix || '';
    const start = performance.now();
    (function tick(now) {
      const p = Math.min((now - start) / 1600, 1);
      el.textContent = `${prefix}${Math.round((1-Math.pow(1-p,3))*target)}${suffix}`;
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }

  function initCounters() {
    if (!homeStats) return;
    if (counterObserver) counterObserver.disconnect();
    counterObserver = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || countersRun) return;
      countersRun = true;
      document.querySelectorAll('.stat-counter').forEach((el, i) => {
        if (reducedMotion) { el.textContent = `${el.dataset.prefix||''}${el.dataset.target}${el.dataset.suffix||''}`; return; }
        setTimeout(() => animateCounter(el), i * 120);
      });
    }, { threshold: 0.3 });
    counterObserver.observe(homeStats);
  }

  /* ── USP Handschrift-Animation ──
     Zeichnet den USP-Satz Buchstabe für Buchstabe wie mit einem Stift, dann füllt
     er sich ein. Die Buchstaben-Umrisse kommen aus der echten Schriftdatei
     (opentype.js parst die TTF), nicht aus einer Web-Font – nur so lässt sich ein
     Umriss überhaupt als Linie zeichnen. Läuft nur einmal, wenn der Bereich ins
     Bild scrollt, und lädt Bibliothek + Schrift nur dann nach (keine Kosten auf
     Unterseiten ohne diesen Bereich). */
  const USP_OPENTYPE_CDN = '/vendor/opentype.min.js';
  const USP_FONT_URL = '/assets/fonts/PermanentMarker-Regular.ttf';
  const USP_EM = 100;
  let uspOpentypePromise = null;
  let uspFontPromise = null;

  function loadUspOpentype() {
    if (window.opentype) return Promise.resolve(window.opentype);
    if (!uspOpentypePromise) {
      uspOpentypePromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = USP_OPENTYPE_CDN;
        script.async = true;
        script.onload = () => window.opentype ? resolve(window.opentype) : reject(new Error('opentype.js lieferte kein Objekt'));
        script.onerror = () => reject(new Error('opentype.js konnte nicht geladen werden'));
        document.head.appendChild(script);
      });
    }
    return uspOpentypePromise;
  }

  function loadUspFont() {
    if (!uspFontPromise) {
      uspFontPromise = fetch(USP_FONT_URL)
        .then(res => { if (!res.ok) throw new Error('Font-Request fehlgeschlagen: ' + res.status); return res.arrayBuffer(); })
        .then(buffer => window.opentype.parse(buffer));
    }
    return uspFontPromise;
  }

  function uspGlyphGeometry(text, font) {
    const path = font.getPath(text, 0, USP_EM, USP_EM);
    const box = path.getBoundingBox();
    const pad = USP_EM * 0.12;
    const full = path.toPathData(2);
    return {
      full,
      contours: full.split(/(?=M)/).filter(d => d.trim().length > 1),
      x: box.x1 - pad,
      y: box.y1 - pad,
      w: (box.x2 - box.x1) + pad * 2,
      h: (box.y2 - box.y1) + pad * 2
    };
  }

  function renderUspLine(el, font, delay, instant) {
    const text = (el.textContent || '').trim();
    if (!text) return delay;
    const geom = uspGlyphGeometry(text, font);
    const count = Math.max(1, geom.contours.length);
    const duration = Math.min(2.6, Math.max(1.1, text.length * 0.052));
    const ns = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `${geom.x} ${geom.y} ${geom.w} ${geom.h}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.style.height = '1.05em';
    svg.style.width = `calc(1.05em * ${(geom.w / geom.h).toFixed(4)})`;

    const fillPath = document.createElementNS(ns, 'path');
    fillPath.setAttribute('d', geom.full);
    fillPath.setAttribute('fill', 'currentColor');
    fillPath.setAttribute('stroke', 'none');
    fillPath.style.opacity = instant ? '1' : '0';
    svg.appendChild(fillPath);

    const strokePaths = geom.contours.map(d => {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', '2.1');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(p);
      return p;
    });

    el.innerHTML = '';
    el.appendChild(svg);

    if (instant) return delay;

    const lengths = strokePaths.map(p => p.getTotalLength() || 1);
    strokePaths.forEach((p, i) => {
      p.style.strokeDasharray = String(lengths[i]);
      p.style.strokeDashoffset = String(lengths[i]);
    });

    requestAnimationFrame(() => requestAnimationFrame(() => {
      strokePaths.forEach((p, i) => {
        const each = (duration / count) * 2.4;
        const start = delay + (i / count) * duration;
        p.style.transition = `stroke-dashoffset ${each.toFixed(3)}s ease-out ${start.toFixed(3)}s`;
        p.style.strokeDashoffset = '0';
      });
      fillPath.style.transition = `opacity .45s ease-out ${(delay + duration * 0.72).toFixed(3)}s`;
      fillPath.style.opacity = '1';
    }));

    return delay + duration + 0.45;
  }

  function playUspHandwriting(container) {
    const lines = Array.prototype.slice.call(container.querySelectorAll('[data-usp-line]'));
    if (!lines.length) return;
    loadUspOpentype()
      .then(loadUspFont)
      .then(font => {
        const instant = reducedMotion;
        let nextDelay = instant ? 0 : 0.15;
        lines.forEach(el => {
          nextDelay = renderUspLine(el, font, nextDelay, instant) + (instant ? 0 : 0.25);
        });
      })
      .catch(() => { /* Fallback bleibt: normaler Text, bereits im DOM */ });
  }

  function initUspHandwriting() {
    const container = document.getElementById('uspHandwriting');
    if (!container || !container.querySelector('[data-usp-line]')) return;
    const io = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      playUspHandwriting(container);
    }, { threshold: 0.4 });
    io.observe(container);
  }

  /* ── Preloader ── */
  function initPreloader() {
    if (!preloader) {
      // sub-page: no preloader element, just start animations
      startHeroAnimations();
      return;
    }
    if (window.getComputedStyle(preloader).display === 'none') {
      startHeroAnimations();
      return;
    }
    Promise.race([
      new Promise(r => window.addEventListener('load', r, { once: true })),
      new Promise(r => setTimeout(r, 1500))
    ]).then(() => {
      preloader.classList.add('hide');
      startHeroAnimations();
      setTimeout(() => { preloader.style.display = 'none'; }, 720);
    });
  }

  /* ── Boot ── */
  initFullscreenMenu();
  initReveal();
  startHeroAnimations();
  initCounters();
  initUspHandwriting();
  initBrandAnimation();
  initMagneticButtons();
  initSpotlights();
  initPreloader();
  injectEmails();
  initStickyMobileCta();
  updateScrollChrome();

  /* ── Event listeners ── */
  motionQuery.addEventListener('change', e => {
    reducedMotion = e.matches;
    initReveal(); initMagneticButtons(); initHeroTypewriter();
  });
  window.addEventListener('resize', updateScrollChrome);
  window.addEventListener('scroll', updateScrollChrome, { passive: true });

})();
