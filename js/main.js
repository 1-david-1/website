(function () {
  'use strict';

  /* ── DOM refs (safe – may be null on sub-pages) ── */
  const body = document.body;
  const pageWipe = document.getElementById('pageWipe');
  const preloader = document.getElementById('preloader');
  const scrollProgress = document.getElementById('scrollProgress');
  const scrollProgressFill = document.getElementById('scrollProgressFill');
  const toastStack = document.getElementById('toastStack');
  const homeStats = document.getElementById('homeStats');
  // nav & mobMenu resolved after injectNav()
  let nav, mobMenu, ham;

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
    'Bewachungsfirmen',
    'Objektschutz-Firmen',
    'Personenschutz-Agenturen',
    'Alarmanlagen-Anbieter',
    'Videoueberwachung-Dienste',
    'Zutrittskontrolle-Systeme',
    'Cybersicherheit-Dienste',
    'Sicherheitskonsultanten'
  ];
  const HERO_TYPE_SPEED = 72;
  const HERO_DELETE_SPEED = 38;
  const HERO_HOLD_DELAY = 1800;
  const HERO_PAUSE_DELAY = 280;
  // Controls for the hero orb/rib visual – set to 'off' to disable
  const HERO_ORB_MODE = 'off'; // 'off' | 'low' | 'full'

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
  let typewriterTimeout = 0;
  let heroOrbStarted = false;
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

  /* ── Nav HTML ── */
  function getNavHTML() {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    const links = [
      { href: '/',          label: 'Start',       shape: '1' },
      { href: '/leistungen', label: 'Leistungen',  shape: '2' },
      { href: '/prozess',    label: 'Prozess',     shape: '3' },
      { href: '/ueber-uns',  label: '\u00dcber uns', shape: '4' },
      { href: '/tipps',      label: 'Tipps',       shape: '5' },
    ];
    const liItems = links.map(({ href, label, shape }) => {
      const active = (path === href || (href !== '/' && path.startsWith(href))) ? ' active' : '';
      return `<li class="menu-list-item" data-shape="${shape}">
          <a href="${href}" class="nav-link w-inline-block${active}">
            <p class="nav-link-text">${label}</p>
            <div class="nav-link-hover-bg"></div>
          </a>
        </li>`;
    }).join('\n        ');
    return `
    <!-- NAV BAR -->
    <nav id="nav">
      <a href="/" class="logo logo-outer" aria-label="InboxElevate \u2013 Startseite">
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M8 32L34 8M34 8L14 6M34 8L32 28" stroke="#1dba6e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M34 8L20 22" stroke="#1dba6e" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M20 22L18 32L23 26" stroke="#1dba6e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="logo-name">InboxElevate</span>
      </a>
      <button class="nav-close-btn" id="ham" aria-expanded="false" aria-controls="navOverlay" aria-label="Men\u00fc \u00f6ffnen/schlie\u00dfen">
        <div class="menu-button-text">
          <p class="p-large">Men\u00fc</p>
          <p class="p-large">Schlie\u00dfen</p>
        </div>
        <div class="icon-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 16 16" fill="none" class="menu-button-icon">
            <path d="M7.33333 16L7.33333 -3.2055e-07L8.66667 -3.78832e-07L8.66667 16L7.33333 16Z" fill="currentColor"></path>
            <path d="M16 8.66667L-2.62269e-07 8.66667L-3.78832e-07 7.33333L16 7.33333L16 8.66667Z" fill="currentColor"></path>
            <path d="M6 7.33333L7.33333 7.33333L7.33333 6C7.33333 6.73637 6.73638 7.33333 6 7.33333Z" fill="currentColor"></path>
            <path d="M10 7.33333L8.66667 7.33333L8.66667 6C8.66667 6.73638 9.26362 7.33333 10 7.33333Z" fill="currentColor"></path>
            <path d="M6 8.66667L7.33333 8.66667L7.33333 10C7.33333 9.26362 6.73638 8.66667 6 8.66667Z" fill="currentColor"></path>
            <path d="M10 8.66667L8.66667 8.66667L8.66667 10C8.66667 9.26362 9.26362 8.66667 10 8.66667Z" fill="currentColor"></path>
          </svg>
        </div>
      </button>
    </nav>

    <!-- FULLSCREEN OVERLAY -->
    <div data-nav="closed" class="nav-overlay-wrapper" id="navOverlay" style="display:none">
      <div class="overlay" id="navOverlayBg"></div>
      <nav class="menu-content" aria-label="Hauptnavigation">
        <div class="menu-bg">
          <div class="backdrop-layer first"></div>
          <div class="backdrop-layer second"></div>
          <div class="backdrop-layer"></div>
          <div class="ambient-background-shapes">
            <svg class="bg-shape bg-shape-1" viewBox="0 0 400 400" fill="none" aria-hidden="true">
              <circle class="shape-element" cx="80" cy="120" r="40" fill="rgba(29,186,110,0.12)"/>
              <circle class="shape-element" cx="300" cy="80" r="60" fill="rgba(29,186,110,0.09)"/>
              <circle class="shape-element" cx="200" cy="300" r="80" fill="rgba(29,186,110,0.07)"/>
              <circle class="shape-element" cx="350" cy="280" r="30" fill="rgba(29,186,110,0.12)"/>
            </svg>
            <svg class="bg-shape bg-shape-2" viewBox="0 0 400 400" fill="none" aria-hidden="true">
              <path class="shape-element" d="M0 200 Q100 100, 200 200 T 400 200" stroke="rgba(29,186,110,0.18)" stroke-width="60" fill="none"/>
              <path class="shape-element" d="M0 280 Q100 180, 200 280 T 400 280" stroke="rgba(29,186,110,0.12)" stroke-width="40" fill="none"/>
            </svg>
            <svg class="bg-shape bg-shape-3" viewBox="0 0 400 400" fill="none" aria-hidden="true">
              <circle class="shape-element" cx="50" cy="50" r="8" fill="rgba(29,186,110,0.28)"/>
              <circle class="shape-element" cx="150" cy="50" r="8" fill="rgba(29,186,110,0.28)"/>
              <circle class="shape-element" cx="250" cy="50" r="8" fill="rgba(29,186,110,0.28)"/>
              <circle class="shape-element" cx="350" cy="50" r="8" fill="rgba(29,186,110,0.28)"/>
              <circle class="shape-element" cx="100" cy="150" r="12" fill="rgba(29,186,110,0.22)"/>
              <circle class="shape-element" cx="200" cy="150" r="12" fill="rgba(29,186,110,0.22)"/>
              <circle class="shape-element" cx="300" cy="150" r="12" fill="rgba(29,186,110,0.22)"/>
              <circle class="shape-element" cx="50" cy="250" r="10" fill="rgba(29,186,110,0.28)"/>
              <circle class="shape-element" cx="150" cy="250" r="10" fill="rgba(29,186,110,0.28)"/>
              <circle class="shape-element" cx="250" cy="250" r="10" fill="rgba(29,186,110,0.28)"/>
              <circle class="shape-element" cx="350" cy="250" r="10" fill="rgba(29,186,110,0.28)"/>
              <circle class="shape-element" cx="100" cy="350" r="6" fill="rgba(29,186,110,0.28)"/>
              <circle class="shape-element" cx="200" cy="350" r="6" fill="rgba(29,186,110,0.28)"/>
              <circle class="shape-element" cx="300" cy="350" r="6" fill="rgba(29,186,110,0.28)"/>
            </svg>
            <svg class="bg-shape bg-shape-4" viewBox="0 0 400 400" fill="none" aria-hidden="true">
              <path class="shape-element" d="M100 100 Q150 50, 200 100 Q250 150, 200 200 Q150 250, 100 200 Q50 150, 100 100" fill="rgba(29,186,110,0.1)"/>
              <path class="shape-element" d="M250 200 Q300 150, 350 200 Q400 250, 350 300 Q300 350, 250 300 Q200 250, 250 200" fill="rgba(29,186,110,0.08)"/>
            </svg>
            <svg class="bg-shape bg-shape-5" viewBox="0 0 400 400" fill="none" aria-hidden="true">
              <line class="shape-element" x1="0" y1="100" x2="300" y2="400" stroke="rgba(29,186,110,0.13)" stroke-width="30"/>
              <line class="shape-element" x1="100" y1="0" x2="400" y2="300" stroke="rgba(29,186,110,0.1)" stroke-width="25"/>
              <line class="shape-element" x1="200" y1="0" x2="400" y2="200" stroke="rgba(29,186,110,0.08)" stroke-width="20"/>
            </svg>
          </div>
        </div>
        <div class="menu-content-wrapper">
          <a href="/" class="menu-logo" aria-label="InboxElevate – Startseite">
            <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
              <path d="M8 32L34 8M34 8L14 6M34 8L32 28" stroke="#1dba6e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M34 8L20 22" stroke="#1dba6e" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M20 22L18 32L23 26" stroke="#1dba6e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="menu-logo-text">InboxElevate</span>
          </a>
          <ul class="menu-list">
        ${liItems}
          </ul>
          <div class="menu-footer" data-menu-fade>
            <a href="/kontakt" class="btn-ink menu-cta">Jetzt anfragen <span class="btn-arrow">→</span></a>
          </div>
        </div>
      </nav>
    </div>`;
  }

  function injectNav() {
    const placeholder = document.querySelector('[data-site-nav]');
    if (!placeholder) return;
    placeholder.outerHTML = getNavHTML();
    // Re-resolve refs after injection
    nav = document.getElementById('nav');
    mobMenu = document.getElementById('mobMenu');
    ham = document.getElementById('ham');
  }

  /* ── Legacy stub (some pages use onclick="toggleMob()") ── */
  function toggleMob() { if (ham) ham.click(); }
  window.toggleMob = toggleMob;

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
        <p>Mehr Anfragen. Mehr Bewerbungen. Spezialisiert auf Sicherheitsunternehmen.</p>
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
        <a href="/#kontakt">Anfrage stellen</a>
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
    if (
      typeof gsap === 'undefined' ||
      typeof Draggable === 'undefined' ||
      typeof InertiaPlugin === 'undefined' ||
      typeof Physics2DPlugin === 'undefined'
    ) return;

    gsap.registerPlugin(Draggable, InertiaPlugin, Physics2DPlugin);

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
    if (reducedMotion) {
      el.textContent = HERO_TYPEWRITER_TERMS[0];
      return;
    }
    el.textContent = '';
    let termIndex = 0, charIndex = 0, isDeleting = false;
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
          schedule(() => {
            isDeleting = true;
            step();
          }, HERO_HOLD_DELAY);
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
    schedule(step, 450);
  }

  function startHeroAnimations() {
    const h = document.querySelector('.hero-h1');
    if (!h) return;
    h.classList.add('v');
    initHeroTypewriter();
  }

  /* ── Hero liquid orb ── */
  function initHeroOrbAnimation() {
    if (heroOrbStarted || reducedMotion || typeof THREE === 'undefined') return;
    const frame = document.getElementById('heroOrbStage');
    const canvas = document.getElementById('heroOrbCanvas');
    // Respect the toggle; hide the frame when disabled
    if (typeof HERO_ORB_MODE !== 'undefined' && HERO_ORB_MODE === 'off') {
      if (frame) frame.style.display = 'none';
      return;
    }
    const pointerSurface = document.querySelector('.hero') || frame;
    if (!frame || !canvas) return;
    heroOrbStarted = true;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    const sceneCam = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    sceneCam.position.set(0, 0, 6);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f3ee);

    const blobGeo = new THREE.IcosahedronGeometry(1.15, 7);
    const blobMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x10a85d) }
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vNormalObj;
        varying vec3 vViewPos;
        varying vec3 vObjPos;
        void main(){
          vec3 pos = position;
          float n1 = sin(pos.x*2.6 + uTime*1.1) * cos(pos.y*2.3 - uTime*0.9) * sin(pos.z*2.8 + uTime*0.7);
          float n2 = sin(pos.x*5.2 - uTime*1.7 + pos.y*3.1) * cos(pos.z*4.4 + uTime*0.6);
          float n3 = sin(pos.x*11.0 + pos.y*9.0 - uTime*0.25) * sin(pos.z*10.5 + pos.x*8.0 + uTime*0.2);
          float wobble = n1*0.68 + n2*0.32;
          pos += normal * wobble * 0.15;
          pos += normal * n3 * 0.05;
          vObjPos = pos;
          vNormalObj = normal;
          vNormal = normalMatrix * normalize(normal);
          vec4 mv = modelViewMatrix * vec4(pos,1.0);
          vViewPos = mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vNormalObj;
        varying vec3 vViewPos;
        varying vec3 vObjPos;

        float hash(vec2 p){
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float valueNoise(vec2 p){
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f*f*(3.0 - 2.0*f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main(){
          vec3 n = normalize(vNormal);
          vec3 v = normalize(-vViewPos);
          vec3 lightDir = normalize(vec3(0.55, 0.75, 0.65));
          vec3 halfDir = normalize(lightDir + v);

          float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.3);
          float diff = max(dot(n, lightDir), 0.0);
          float spec = pow(max(dot(n, halfDir), 0.0), 48.0);

          vec3 blendW = abs(normalize(vNormalObj));
          blendW /= (blendW.x + blendW.y + blendW.z + 0.0001);
          float nx = valueNoise(vObjPos.yz * 5.0);
          float ny = valueNoise(vObjPos.xz * 5.0);
          float nz = valueNoise(vObjPos.xy * 5.0);
          float craterN = nx*blendW.x + ny*blendW.y + nz*blendW.z;

          float pit = smoothstep(0.30, 0.05, craterN);
          float rim = smoothstep(0.72, 0.95, craterN);

          vec3 base = mix(uColor*0.32, uColor*1.35, fresnel);
          base *= (0.55 + 0.55*diff);
          base *= (1.0 - pit * 0.42);
          base += vec3(1.0, 1.0, 0.96) * spec * 0.9;
          base += vec3(1.0) * rim * 0.22;

          gl_FragColor = vec4(base, 1.0);
        }
      `
    });

    const blob = new THREE.Mesh(blobGeo, blobMat);
    scene.add(blob);

    let rt = new THREE.WebGLRenderTarget(2, 2, { encoding: THREE.sRGBEncoding });
    const postScene = new THREE.Scene();
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postMat = new THREE.ShaderMaterial({
      uniforms: {
        uScene: { value: rt.texture },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uRibCount: { value: 0.0 },
        uStrength: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uScene;
        uniform float uRibCount;
        uniform float uStrength;
        varying vec2 vUv;

        void main(){
          vec2 uv = vUv;
          vec3 straight = texture2D(uScene, uv).rgb;
          float maxc = max(straight.r, max(straight.g, straight.b));
          float minc = min(straight.r, min(straight.g, straight.b));
          float sat = maxc - minc;

          float ribPos = uv.x * uRibCount;
          float local = fract(ribPos);
          float centered = local * 2.0 - 1.0;
          float lens = centered * sqrt(max(0.0, 1.0 - centered*centered));

          float localStrength = uStrength * (0.35 + 2.2 * sat);
          vec2 dUv = vec2(lens * localStrength, 0.0);

          float ca = 0.0032 * (0.25 + sat);
          float r = texture2D(uScene, clamp(uv + dUv + vec2(ca,0.0), 0.0, 1.0)).r;
          float g = texture2D(uScene, clamp(uv + dUv, 0.0, 1.0)).g;
          float b = texture2D(uScene, clamp(uv + dUv - vec2(ca,0.0), 0.0, 1.0)).b;
          vec3 col = vec3(r, g, b);

          vec3 glow = vec3(0.0);
          const int TAPS = 6;
          for (int i = 0; i < TAPS; i++){
            float ang = (float(i) / float(TAPS)) * 6.2831853;
            vec2 off = vec2(cos(ang), sin(ang)) * 0.014;
            glow += texture2D(uScene, clamp(uv + off, 0.0, 1.0)).rgb;
          }
          glow /= float(TAPS);
          col += (glow - vec3(1.0)) * -0.22 * sat;

          float shade = 1.0 - 0.16 * abs(centered);
          float highlight = pow(max(0.0, 1.0 - abs(centered - 0.30) * 2.6), 4.0);
          col *= shade;
          col += vec3(1.0) * highlight * 0.28;

          float seam = smoothstep(0.985, 1.0, abs(centered));
          col = mix(col, vec3(0.82, 0.85, 0.84), seam * 0.35);

          float vig = smoothstep(1.1, 0.35, length(uv - 0.5) * 1.3);
          col = mix(col * 0.94, col, vig);

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

    const raycaster = new THREE.Raycaster();
    const pointerPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const pointerNDC = new THREE.Vector2(0, 0);
    const rawTargetPos = new THREE.Vector3(0, 0, 0);
    const targetPos = new THREE.Vector3(0, 0, 0);
    const hitPoint = new THREE.Vector3();
    const velocity = new THREE.Vector2(0, 0);
    const BLOB_RADIUS = 1.35;
    const STIFFNESS = 0.0048;
    const TARGET_LAG = 0.045;
    const DAMPING = 0.988;
    const BOUNCE_RESTITUTION = 0.42;
    let pointerActive = false;
    let impactX = 0, impactY = 0;

    function currentBounds() {
      const dist = sceneCam.position.z;
      const vFov = sceneCam.fov * Math.PI / 180;
      const visH = 2 * Math.tan(vFov / 2) * dist;
      const visW = visH * sceneCam.aspect;
      return {
        maxX: Math.max(0, visW / 2 - BLOB_RADIUS),
        maxY: Math.max(0, visH / 2 - BLOB_RADIUS)
      };
    }

    function updatePointer(clientX, clientY) {
      const rect = frame.getBoundingClientRect();
      pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointerNDC, sceneCam);
      raycaster.ray.intersectPlane(pointerPlane, hitPoint);
      rawTargetPos.copy(hitPoint);
      pointerActive = true;
    }

    pointerSurface.addEventListener('pointermove', e => updatePointer(e.clientX, e.clientY));
    pointerSurface.addEventListener('pointerup', () => { pointerActive = false; });
    pointerSurface.addEventListener('pointercancel', () => { pointerActive = false; });
    pointerSurface.addEventListener('pointerleave', () => { pointerActive = false; });

    function resizeHeroOrb() {
      const rect = frame.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const pr = renderer.getPixelRatio();
      renderer.setSize(w, h, false);
      sceneCam.aspect = w / h;
      sceneCam.updateProjectionMatrix();
      rt.setSize(w * pr, h * pr);
      postMat.uniforms.uResolution.value.set(w * pr, h * pr);
    }

    window.addEventListener('resize', resizeHeroOrb);
    resizeHeroOrb();

    {
      const { maxX, maxY } = currentBounds();
      blob.position.set(-maxX * 0.4, -maxY * 0.25, 0);
      targetPos.copy(blob.position);
      rawTargetPos.copy(blob.position);
    }

    const clock = new THREE.Clock();
    function animateHeroOrb() {
      requestAnimationFrame(animateHeroOrb);
      const t = clock.getElapsedTime();
      const { maxX, maxY } = currentBounds();

      blobMat.uniforms.uTime.value = t;

      if (pointerActive) targetPos.lerp(rawTargetPos, TARGET_LAG);
      const ax = pointerActive ? (targetPos.x - blob.position.x) * STIFFNESS : 0;
      const ay = pointerActive ? (targetPos.y - blob.position.y) * STIFFNESS : 0;
      velocity.x = (velocity.x + ax) * DAMPING;
      velocity.y = (velocity.y + ay) * DAMPING;

      let nextX = blob.position.x + velocity.x;
      let nextY = blob.position.y + velocity.y;

      if (nextX > maxX) { nextX = maxX; velocity.x = -velocity.x * BOUNCE_RESTITUTION; impactX = Math.min(1, Math.abs(velocity.x) * 5.5 + 0.3); }
      if (nextX < -maxX) { nextX = -maxX; velocity.x = -velocity.x * BOUNCE_RESTITUTION; impactX = Math.min(1, Math.abs(velocity.x) * 5.5 + 0.3); }
      if (nextY > maxY) { nextY = maxY; velocity.y = -velocity.y * BOUNCE_RESTITUTION; impactY = Math.min(1, Math.abs(velocity.y) * 5.5 + 0.3); }
      if (nextY < -maxY) { nextY = -maxY; velocity.y = -velocity.y * BOUNCE_RESTITUTION; impactY = Math.min(1, Math.abs(velocity.y) * 5.5 + 0.3); }

      blob.position.x = nextX;
      blob.position.y = nextY;
      impactX *= 0.88;
      impactY *= 0.88;

      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      const travelStretch = THREE.MathUtils.clamp(speed * 8.0, 0, 0.24);
      if (speed > 0.0004) {
        const angle = Math.atan2(velocity.y, velocity.x);
        blob.rotation.z += (angle - blob.rotation.z) * 0.12;
      }

      const scaleX = (1 + travelStretch) * (1 - impactX * 0.28 + impactY * 0.18);
      const scaleY = (1 - travelStretch * 0.42) * (1 - impactY * 0.28 + impactX * 0.18);
      blob.scale.set(scaleX, scaleY, 1);

      renderer.setRenderTarget(rt);
      renderer.render(scene, sceneCam);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
    }
    animateHeroOrb();
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

  /* ── Fullscreen Menu ── */
  function initFullscreenMenu() {
    const btn     = document.getElementById('ham');
    const overlay = document.getElementById('navOverlay');
    const overlayBg = document.getElementById('navOverlayBg');
    if (!btn || !overlay) return;

    let isOpen = false;
    let gsapReady = typeof gsap !== 'undefined';

    // Register CustomEase if available
    if (gsapReady && typeof CustomEase !== 'undefined') {
      try { CustomEase.create('menuEase', '0.65, 0.01, 0.05, 0.99'); } catch (_) {}
    }
    const menuEase = (gsapReady && typeof CustomEase !== 'undefined') ? 'menuEase' : 'power2.inOut';

    function openMenu() {
      if (isOpen) return;
      isOpen = true;
      btn.setAttribute('aria-expanded', 'true');
      overlay.setAttribute('data-nav', 'open');
      document.body.classList.add('menu-open');

      if (!gsapReady) { overlay.style.display = 'flex'; return; }

      const bgPanels  = overlay.querySelectorAll('.backdrop-layer');
      const menuLinks = overlay.querySelectorAll('.nav-link');
      const fadeEls   = overlay.querySelectorAll('[data-menu-fade]');
      const btnTexts  = btn.querySelectorAll('.p-large');
      const btnIcon   = btn.querySelector('.menu-button-icon');

      gsap.timeline()
        .set(overlay, { display: 'flex' })
        .fromTo(btnTexts, { yPercent: 0 }, { yPercent: -100, stagger: 0.18, duration: 0.45, ease: menuEase })
        .fromTo(btnIcon, { rotate: 0 }, { rotate: 315, duration: 0.5, ease: menuEase }, '<')
        .fromTo(overlayBg, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, '<')
        .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.1, duration: 0.55, ease: menuEase }, '<')
        .fromTo(menuLinks, { yPercent: 140, rotate: 10 }, { yPercent: 0, rotate: 0, stagger: 0.055, duration: 0.6, ease: menuEase }, '<+=0.3')
        .fromTo(fadeEls, { autoAlpha: 0, yPercent: 40 }, { autoAlpha: 1, yPercent: 0, stagger: 0.05, duration: 0.5, clearProps: 'all', ease: menuEase }, '<+=0.15');
    }

    function closeMenu() {
      if (!isOpen) return;
      isOpen = false;
      btn.setAttribute('aria-expanded', 'false');
      overlay.setAttribute('data-nav', 'closed');
      document.body.classList.remove('menu-open');

      if (!gsapReady) { overlay.style.display = 'none'; return; }

      const btnTexts  = btn.querySelectorAll('.p-large');
      const btnIcon   = btn.querySelector('.menu-button-icon');

      gsap.timeline()
        .to(overlayBg, { autoAlpha: 0, duration: 0.35, ease: menuEase })
        .to(overlay.querySelector('.menu-content'), { xPercent: 105, duration: 0.45, ease: menuEase }, '<')
        .to(btnTexts, { yPercent: 0, duration: 0.35, ease: menuEase }, '<')
        .to(btnIcon, { rotate: 0, duration: 0.4, ease: menuEase }, '<')
        .set(overlay, { display: 'none', clearProps: 'xPercent' })
        .set(overlay.querySelector('.menu-content'), { clearProps: 'xPercent' });
    }

    function toggleMenu() { isOpen ? closeMenu() : openMenu(); }

    btn.addEventListener('click', toggleMenu);
    if (overlayBg) overlayBg.addEventListener('click', closeMenu);
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closeMenu(); });

    // Shape hover effects
    overlay.querySelectorAll('.menu-list-item[data-shape]').forEach(item => {
      const idx   = item.getAttribute('data-shape');
      const shapesContainer = overlay.querySelector('.ambient-background-shapes');
      const shape = shapesContainer ? shapesContainer.querySelector(`.bg-shape-${idx}`) : null;
      if (!shape || !gsapReady) return;
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
  injectNav();
  initFullscreenMenu();
  initSmoothScroll();
  initReveal();
  startHeroAnimations();
  initHeroOrbAnimation();
  observeScrambleTargets();
  initCounters();
  initBrandAnimation();
  initMagneticButtons();
  initSpotlights();
  initPreloader();
  initGsapInteractions();
  injectFooters();
  injectEmails();
  initStickyMobileCta();
  updateScrollChrome();

  /* ── Event listeners ── */
  motionQuery.addEventListener('change', e => {
    reducedMotion = e.matches;
    initReveal(); observeScrambleTargets(); initSmoothScroll(); initMagneticButtons();
    initHeroTypewriter();
    initHeroOrbAnimation();
  });

  coarsePointerQuery.addEventListener('change', () => initSmoothScroll());

  window.addEventListener('resize', () => { initSmoothScroll(); updateScrollChrome(); });

  window.addEventListener('scroll', () => {
    if (!smoothScrollEnabled) { syncScrollTarget(); return; }
    updateScrollChrome();
    if (!smoothRaf && Math.abs(window.scrollY - scrollTarget) > 4) syncScrollTarget();
  }, { passive: true });

})();
