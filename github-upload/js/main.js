(function () {
  'use strict';

  /* ── DOM refs (safe – may be null on sub-pages) ── */
  const body = document.body;
  const nav = document.getElementById('nav');
  const mobMenu = document.getElementById('mobMenu');
  const ham = document.getElementById('ham');
  const pageWipe = document.getElementById('pageWipe');
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
  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const HERO_TYPEWRITER_TERMS = [
    'Sicherheitsunternehmen',
    'Wachdienstleister',
    'Alarmanlagen-Anbieter',
    'Objektschutz-Firmen',
    'Sie',
    'Ihr Unternehmen'
  ];

  /* ── State ── */
  let currentPage = 'home';
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
  const scrollHeavyPages = new Set(['home']);
  let revealObserver, scrambleObserver, counterObserver;
  let countersRun = false;
  let scrollTarget = window.scrollY || 0;
  let scrollCurrent = window.scrollY || 0;
  let smoothScrollEnabled = false;
  let smoothRaf = 0;
  let heroPrepared = false;
  let typewriterTimeout = 0;
  let smoothBindingsReady = false;

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

  /* ── Footer HTML ── */
  function getFooterHTML() {
    return `<div class="footer-grid">
      <div class="footer-brand">
        <a href="/" class="logo" style="color:var(--cream);">
          <svg viewBox="0 0 40 40" width="26" fill="none">
            <path d="M8 32L34 8M34 8L14 6M34 8L32 28" stroke="#1dba6e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M34 8L20 22" stroke="#1dba6e" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M20 22L18 32L23 26" stroke="#1dba6e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          InboxElevate
        </a>
        <p>Mehr passende Anfragen. Klare Prozesse. Für Sicherheitsunternehmen.</p>
      </div>
      <div class="footer-col">
        <h5>Navigation</h5>
        <a href="/">Start</a>
        <a href="/leistungen">Leistungen</a>
        <a href="/#prozess">Prozess</a>
        <a href="/#ueber-uns">Über uns</a>
        <a href="/tipps">Tipps</a>
      </div>
      <div class="footer-col">
        <h5>Leistungen</h5>
        <a href="/leistungen/webseiten">Webentwicklung</a>
        <a href="/leistungen/paid-ads">Paid Ads</a>
        <a href="/leistungen/ki">KI-Automatisierung</a>
      </div>
      <div class="footer-col">
        <h5>Kontakt</h5>
        <a class="js-email-link" data-u="david" data-d="inbox-elevate.de">[E-Mail laden…]</a>
        <a href="/#kontakt">Anfrage senden</a>
        <a href="/#datenschutz">Datenschutz</a>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© 2026 InboxElevate. Alle Rechte vorbehalten.</p>
      <div class="socials">
        <a href="${SITE_CONFIG.linkedin}" target="_blank" rel="noopener noreferrer" class="soc">in</a>
        <a class="soc js-email-link" data-u="david" data-d="inbox-elevate.de">✉</a>
      </div>
    </div>`;
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

  /* ── Footer inject ── */
  function injectFooters() {
    document.querySelectorAll('[data-site-footer]').forEach(el => { el.innerHTML = getFooterHTML(); });
    injectEmails(); // re-run after footer injection
  }

  /* ── Nav ── */
  function toggleMob(force) {
    if (!ham || !mobMenu) return;
    const open = typeof force === 'boolean' ? force : !ham.classList.contains('open');
    ham.classList.toggle('open', open);
    mobMenu.classList.toggle('open', open);
  }
  window.toggleMob = toggleMob;

  function initNavDropdowns() {
    document.querySelectorAll('.nav-dropdown > a').forEach(trigger => {
      const parent = trigger.closest('.nav-dropdown');
      if (!parent || parent.dataset.dropdownBound === 'true') return;
      parent.dataset.dropdownBound = 'true';
      trigger.addEventListener('click', e => {
        if (window.innerWidth > 900) return;
        e.preventDefault();
        const open = !parent.classList.contains('open');
        document.querySelectorAll('.nav-dropdown.open').forEach(d => { if (d !== parent) d.classList.remove('open'); });
        parent.classList.toggle('open', open);
      });
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.nav-dropdown')) {
        document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
      }
    });
  }

  /* ── Scroll chrome ── */
  function updateScrollChrome() {
    const y = window.scrollY || 0;
    if (nav) nav.classList.toggle('nav-shrink', y > 80);
    if (!scrollProgress || !scrollProgressFill) return;
    const visible = scrollHeavyPages.has(currentPage) && getScrollMax() > 240;
    scrollProgress.classList.toggle('visible', visible);
    scrollProgressFill.style.width = visible ? `${clamp(y / Math.max(getScrollMax(), 1), 0, 1) * 100}%` : '0%';
  }

  function syncScrollTarget() {
    scrollCurrent = window.scrollY || 0;
    scrollTarget = scrollCurrent;
    updateScrollChrome();
  }

  /* ── Smooth scroll ── */
  function smoothStep() {
    scrollCurrent += (scrollTarget - scrollCurrent) * 0.08;
    if (Math.abs(scrollTarget - scrollCurrent) < 0.4) scrollCurrent = scrollTarget;
    window.scrollTo(0, scrollCurrent);
    updateScrollChrome();
    smoothRaf = Math.abs(scrollTarget - scrollCurrent) >= 0.4 ? requestAnimationFrame(smoothStep) : 0;
  }

  function requestSmoothScroll() {
    if (!smoothRaf) smoothRaf = requestAnimationFrame(smoothStep);
  }

  function scrollPageTo(y, instant = false) {
    const nextY = clamp(y, 0, getScrollMax());
    if (!smoothScrollEnabled || instant || reducedMotion) { window.scrollTo(0, nextY); syncScrollTarget(); return; }
    scrollTarget = nextY;
    requestSmoothScroll();
  }

  function initSmoothScroll() {
    smoothScrollEnabled = !reducedMotion && !coarsePointerQuery.matches && window.innerWidth > 900;
    if (!smoothBindingsReady) {
      smoothBindingsReady = true;
      window.addEventListener('wheel', e => {
        if (!smoothScrollEnabled) return;
        e.preventDefault();
        scrollTarget = clamp(scrollTarget + e.deltaY, 0, getScrollMax());
        requestSmoothScroll();
      }, { passive: false });
      window.addEventListener('keydown', e => {
        if (!smoothScrollEnabled) return;
        const tag = (e.target?.tagName || '').toLowerCase();
        if (['input','textarea','select','button'].includes(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
        const map = { ArrowDown:100, ArrowUp:-100, PageDown:window.innerHeight*.9, PageUp:-window.innerHeight*.9, ' ':window.innerHeight*.9 };
        if (e.key === 'Home') { e.preventDefault(); scrollPageTo(0); return; }
        if (e.key === 'End') { e.preventDefault(); scrollPageTo(getScrollMax()); return; }
        if (map[e.key] != null) {
          e.preventDefault();
          scrollTarget = clamp(scrollTarget + (e.shiftKey && e.key===' ' ? -map[e.key] : map[e.key]), 0, getScrollMax());
          requestSmoothScroll();
        }
      });
    }
    if (!smoothScrollEnabled) { cancelAnimationFrame(smoothRaf); smoothRaf = 0; syncScrollTarget(); }
  }

  /* ── Page wipe ── */
  function runPageWipe(callback) {
    if (reducedMotion || !pageWipe) { callback(); return; }
    pageWipe.style.transition = 'transform 350ms cubic-bezier(.22,1,.36,1)';
    pageWipe.style.transform = 'translateX(0)';
    setTimeout(() => {
      callback();
      pageWipe.style.transition = 'transform 250ms cubic-bezier(.22,1,.36,1)';
      pageWipe.style.transform = 'translateX(100%)';
      setTimeout(() => { pageWipe.style.transition = 'none'; pageWipe.style.transform = 'translateX(-100%)'; }, 250);
    }, 350);
  }

  /* ── Navigate (legacy stub for inline onclick refs) ── */
  function navigate(page) { if (page) currentPage = page; }
  window.navigate = navigate;

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

  /* ── GSAP Brand & Contact Animations ── */
  function initGsapInteractions() {
    if (typeof gsap === 'undefined') return;
    const plugins = [
      typeof Draggable !== 'undefined' ? Draggable : null,
      typeof InertiaPlugin !== 'undefined' ? InertiaPlugin : null,
      typeof Physics2DPlugin !== 'undefined' ? Physics2DPlugin : null
    ].filter(Boolean);
    if (plugins.length) gsap.registerPlugin(...plugins);

    const mainEl = document.querySelector('main');
    if (mainEl) {
      gsap.set(mainEl, { perspective: 650 });
      const outerRX = gsap.quickTo('.logo-outer', 'rotationX', { ease: 'power3' });
      const outerRY = gsap.quickTo('.logo-outer', 'rotationY', { ease: 'power3' });
      const innerX = gsap.quickTo('.logo', 'x', { ease: 'power3' });
      const innerY = gsap.quickTo('.logo', 'y', { ease: 'power3' });

      mainEl.addEventListener('pointermove', e => {
        outerRX(gsap.utils.interpolate(15, -15, e.y / window.innerHeight));
        outerRY(gsap.utils.interpolate(-15, 15, e.x / window.innerWidth));
        innerX(gsap.utils.interpolate(-30, 30, e.x / window.innerWidth));
        innerY(gsap.utils.interpolate(-30, 30, e.y / window.innerHeight));
      });

      mainEl.addEventListener('pointerleave', () => {
        outerRX(0);
        outerRY(0);
        innerX(0);
        innerY(0);
      });
    }

    const emitter = document.createElement('div');
    emitter.id = 'emitter';
    emitter.style.cssText = 'position:absolute; width:0; height:0; pointer-events:none;';
    document.body.appendChild(emitter);

    const container = document.createElement('div');
    container.style.cssText = 'position:absolute; left:0; top:0; overflow:visible; z-index:5000; pointer-events:none;';
    document.body.appendChild(container);

    const emitterSize = 100;
    const dotQuantity = 25;
    const dotSizeMax = 20;
    const dotSizeMin = 10;
    const speed = 3;
    const gravity = 3;

    function createExplosion(container) {
      const tl = gsap.timeline({ paused: true });
      for (let i = 0; i < dotQuantity; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        const size = gsap.utils.random(dotSizeMin, dotSizeMax, 1);
        container.appendChild(dot);
        const angle = Math.random() * Math.PI * 2;
        const length = Math.random() * (emitterSize / 2 - size / 2);
        gsap.set(dot, {
          x: Math.cos(angle) * length,
          y: Math.sin(angle) * length,
          width: size,
          height: size,
          xPercent: -50,
          yPercent: -50,
          force3D: true,
          borderRadius: '50%',
          backgroundColor: 'var(--green)',
          position: 'absolute'
        });
        tl.to(dot, {
          physics2D: {
            angle: (angle * 180) / Math.PI,
            velocity: (100 + Math.random() * 250) * speed,
            gravity: 500 * gravity
          },
          duration: 1 + Math.random()
        }, 0).to(dot, {
          opacity: 0,
          duration: 0.2,
          ease: 'power2.inOut'
        }, 0.7);
      }
      return tl;
    }

    const explosion = createExplosion(container);

    function explode(element) {
      const bounds = element.getBoundingClientRect();
      gsap.set(container, { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
      explosion.restart();
    }

    document.querySelectorAll('.contact-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        explode(btn);
      });
    });
  }

  /* ── Reveal on scroll ── */
  function initReveal() {
    if (revealObserver) revealObserver.disconnect();
    if (reducedMotion) { document.querySelectorAll('.sr,.sr-l,.sr-r').forEach(el => el.classList.add('v')); return; }
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('v'); revealObserver.unobserve(e.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll('.sr,.sr-l,.sr-r').forEach(el => { el.classList.remove('v'); revealObserver.observe(el); });
  }

  /* ── Scramble text ── */
  function scrambleText(el) {
    if (reducedMotion || el.dataset.scrambled === 'true') { el.textContent = el.dataset.original || el.textContent; el.dataset.scrambled = 'true'; return; }
    const original = el.dataset.original || el.textContent.trim();
    el.dataset.original = original;
    let frame = 0;
    const total = 18;
    const iv = setInterval(() => {
      const p = frame / total;
      el.textContent = original.split('').map((c, i) => c === ' ' ? ' ' : i < p * original.length ? c : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]).join('');
      if (++frame > total) { clearInterval(iv); el.textContent = original; el.dataset.scrambled = 'true'; }
    }, 600 / total);
  }

  function observeScrambleTargets() {
    if (scrambleObserver) scrambleObserver.disconnect();
    const labels = document.querySelectorAll('.page-label,.hero-label');
    if (reducedMotion) { labels.forEach(l => { if (l.dataset.original) l.textContent = l.dataset.original; l.dataset.scrambled = 'true'; }); return; }
    scrambleObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { scrambleText(e.target); scrambleObserver.unobserve(e.target); } });
    }, { threshold: 0.3 });
    labels.forEach(l => { if (!l.dataset.original) l.dataset.original = l.textContent.trim(); if (l.dataset.scrambled !== 'true') scrambleObserver.observe(l); });
  }

  /* ── Hero typewriter ── */
  function prepareHeroWords() {
    if (heroPrepared) return;
    ['tw-line1','tw-line2'].forEach(id => {
      const line = document.getElementById(id);
      if (!line) return;
      line.innerHTML = line.textContent.trim().split(/\s+/).map((w, i) => `<span class="hero-word-clip"><span class="hero-word" style="--word-delay:${i*60}ms">${w}</span></span>`).join(' ');
    });
    heroPrepared = true;
  }

  function stopHeroTypewriter() { if (typewriterTimeout) { clearTimeout(typewriterTimeout); typewriterTimeout = 0; } }

  function initHeroTypewriter() {
    stopHeroTypewriter();
    const el = document.getElementById('tw-text');
    if (!el) return;
    if (reducedMotion) { el.textContent = HERO_TYPEWRITER_TERMS[0]; return; }

    let termIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    el.textContent = '';

    const schedule = (fn, ms) => { typewriterTimeout = setTimeout(fn, ms); };

    function step() {
      const target = document.getElementById('tw-text');
      if (!target) return;
      const word = HERO_TYPEWRITER_TERMS[termIndex];

      if (!isDeleting) {
        if (charIndex < word.length) {
          charIndex++;
          target.textContent = word.slice(0, charIndex);
          schedule(step, 58);
        } else {
          schedule(() => { isDeleting = true; step(); }, 2400);
        }
        return;
      }

      if (charIndex > 0) {
        charIndex--;
        target.textContent = word.slice(0, charIndex);
        schedule(step, 32);
        return;
      }

      isDeleting = false;
      termIndex = (termIndex + 1) % HERO_TYPEWRITER_TERMS.length;
      schedule(step, 400);
    }

    schedule(step, 500);
  }

  function startHeroAnimations() {
    prepareHeroWords();
    const h = document.querySelector('.hero-h1');
    if (!h) return;
    document.querySelectorAll('.hero .sr, .hero .sr-l, .hero .sr-r').forEach(el => el.classList.add('v'));
    const label = document.querySelector('.hero-label');
    if (label && label.dataset.scrambled !== 'true') scrambleText(label);
    if (reducedMotion) { h.classList.add('ready'); h.querySelectorAll('.hero-word').forEach(w => w.classList.add('no-animate')); }
    else { requestAnimationFrame(() => h.classList.add('ready')); }
    initHeroTypewriter();
  }

  window.startHeroAnimations = startHeroAnimations;

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

  /* ── Preloader ── */
  function initPreloader() {
    const start = () => {
      if (preloader) {
        preloader.classList.add('hide');
        setTimeout(() => { preloader.style.display = 'none'; }, 720);
      }
      startHeroAnimations();
    };

    if (!preloader) {
      start();
      return;
    }

    if (document.readyState === 'complete') {
      start();
      return;
    }

    Promise.race([
      new Promise(r => window.addEventListener('load', r, { once: true })),
      new Promise(r => setTimeout(r, 1500))
    ]).then(start);
  }

  /* ── Boot ── */
  initSmoothScroll();
  initReveal();
  observeScrambleTargets();
  initCounters();
  initBrandAnimation();
  initMagneticButtons();
  initSpotlights();
  initGsapInteractions();
  initNavDropdowns();
  initPreloader();
  injectFooters();
  injectEmails();
  initStickyMobileCta();
  updateScrollChrome();

  /* ── Event listeners ── */
  motionQuery.addEventListener('change', e => {
    reducedMotion = e.matches;
    initReveal(); observeScrambleTargets(); initSmoothScroll(); initMagneticButtons();
    initHeroTypewriter();
  });

  coarsePointerQuery.addEventListener('change', () => initSmoothScroll());

  window.addEventListener('resize', () => { initSmoothScroll(); updateScrollChrome(); });

  window.addEventListener('scroll', () => {
    if (!smoothScrollEnabled) { syncScrollTarget(); return; }
    updateScrollChrome();
    if (!smoothRaf && Math.abs(window.scrollY - scrollTarget) > 4) syncScrollTarget();
  }, { passive: true });

})();
