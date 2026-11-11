/* InboxElevate – Site-Skript
   Header + Menü + Footer (eingefügt), Typewriter, USP-Handschrift, mobiler Sticky-CTA.
   Keine externen Abhängigkeiten, kein Scroll-Hijacking. */
(function () {
  'use strict';

  var SITE = {
    email: ['david', 'inbox-elevate.de'].join('@'),
    linkedin: 'https://www.linkedin.com/company/inboxelevate/'
  };

  var NAV = [
    { href: '/', label: 'Start' },
    { href: '/leistungen', label: 'Leistungen', sub: [
      { href: '/leistungen/webseiten', label: 'Webseiten' },
      { href: '/leistungen/paid-ads', label: 'Paid Ads' },
      { href: '/leistungen/ki', label: 'KI-Automatisierung' }
    ] },
    { href: '/prozess', label: 'Prozess' },
    { href: '/ueber-uns', label: '\u00dcber uns' },
    { href: '/tipps', label: 'Tipps' }
  ];

  var TERMS = [
    'Sicherheits\u00adunternehmen', 'Wachdienstleister', 'Bewachungsfirmen', 'Objektschutz-Firmen',
    'Personenschutz-Agenturen', 'Alarmanlagen-Anbieter', 'Videoüberwachungs-Firmen',
    'Zutrittskontroll-Firmen', 'IT-Sicherheitsfirmen', 'Sicherheitsberater'
  ];

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var path = (location.pathname.replace(/index\.html$/, '').replace(/\/+$/, '')) || '/';

  var LOGO = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">' +
    '<path d="M8 32L34 8M34 8L14 6M34 8L32 28" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M34 8L20 22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M20 22L18 32L23 26" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function isExact(href) { return path === href; }
  function isSection(href) { return href !== '/' && (path === href || path.indexOf(href + '/') === 0); }
  function cur(href) { return isExact(href) ? ' aria-current="page"' : ''; }
  function act(href) { return (isExact(href) || isSection(href)) ? ' data-active="true"' : ''; }

  /* ---------- Header + Menü ---------- */
  function headerHTML() {
    var items = NAV.map(function (item, i) {
      var sub = '';
      if (item.sub) {
        sub = '<div class="menu__sub">' + item.sub.map(function (s) {
          return '<a href="' + s.href + '"' + cur(s.href) + '>' + s.label + '</a>';
        }).join('') + '</div>';
      }
      return '<li style="--n:' + i + '"><a class="menu__link" href="' + item.href + '"' + cur(item.href) + act(item.href) + '>' +
        item.label + '</a>' + sub + '</li>';
    }).join('');

    return '<header class="site-header"><div class="wrap">' +
      '<a class="logo" href="/" aria-label="InboxElevate, Startseite">' + LOGO + '<span>InboxElevate</span></a>' +
      '<div class="header-actions">' +
        '<a class="btn header-cta" href="/kontakt">Marketing-Check</a>' +
        '<button class="menu-btn" type="button" id="menuBtn" aria-expanded="false" aria-controls="menu">' +
          '<span class="menu-btn__label">Men\u00fc</span><span class="menu-btn__icon" aria-hidden="true"></span>' +
        '</button>' +
      '</div></div></header>' +
      '<div class="menu" id="menu" data-open="false">' +
        '<div class="menu__scrim" data-menu-close></div>' +
        '<div class="menu__panel" role="dialog" aria-modal="true" aria-label="Hauptmen\u00fc">' +
          '<nav aria-label="Hauptnavigation"><ul class="menu__list">' + items + '</ul></nav>' +
          '<div class="menu__foot" style="--n:' + NAV.length + '">' +
            '<a class="btn" href="/kontakt">Kostenlosen Marketing-Check anfordern</a>' +
            '<a class="js-email-link" href="mailto:' + SITE.email + '">' + SITE.email + '</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function injectHeader() {
    var slot = document.querySelector('[data-site-header]');
    if (slot) slot.outerHTML = headerHTML();
  }

  function initMenu() {
    var btn = document.getElementById('menuBtn');
    var menu = document.getElementById('menu');
    if (!btn || !menu) return;
    var label = btn.querySelector('.menu-btn__label');
    var panel = menu.querySelector('.menu__panel');
    var outside = function () {
      return [document.getElementById('main'), document.querySelector('.site-footer'), document.querySelector('.sticky-cta')]
        .filter(Boolean);
    };

    function setOpen(open, restoreFocus) {
      menu.setAttribute('data-open', open ? 'true' : 'false');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      label.textContent = open ? 'Schlie\u00dfen' : 'Men\u00fc';
      document.body.classList.toggle('menu-open', open);
      outside().forEach(function (el) { if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
      if (open) {
        var first = panel.querySelector('a');
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
      } else if (restoreFocus) {
        btn.focus();
      }
    }

    btn.addEventListener('click', function () { setOpen(menu.getAttribute('data-open') !== 'true', false); });
    menu.querySelectorAll('[data-menu-close]').forEach(function (el) {
      el.addEventListener('click', function () { setOpen(false, true); });
    });
    panel.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a && a.getAttribute('href') && a.getAttribute('href').charAt(0) === '#') setOpen(false, false);
    });
    document.addEventListener('keydown', function (e) {
      if (menu.getAttribute('data-open') !== 'true') return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false, true); return; }
      if (e.key !== 'Tab') return;
      var f = [btn].concat(Array.prototype.slice.call(panel.querySelectorAll('a[href], button')));
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted) setOpen(false, false); });
  }

  /* ---------- Footer ---------- */
  function footerHTML() {
    var pages = NAV.map(function (n) { return '<a href="' + n.href + '">' + n.label + '</a>'; }).join('');
    var services = NAV[1].sub.map(function (s) { return '<a href="' + s.href + '">' + s.label + '</a>'; }).join('');
    return '<div class="wrap"><div class="footer-grid">' +
      '<div class="footer-brand"><a class="logo" href="/" aria-label="InboxElevate, Startseite">' + LOGO + '<span>InboxElevate</span></a>' +
        '<p>Mehr Anfragen, mehr Bewerbungen. Spezialisiert auf Sicherheitsunternehmen.</p></div>' +
      '<div class="footer-col"><p class="footer-title">Seiten</p>' + pages + '</div>' +
      '<div class="footer-col"><p class="footer-title">Leistungen</p>' + services + '</div>' +
      '<div class="footer-col"><p class="footer-title">Kontakt</p>' +
        '<a class="js-email-link" href="mailto:' + SITE.email + '">' + SITE.email + '</a>' +
        '<a href="/kontakt">Anfrage stellen</a>' +
        '<a href="' + SITE.linkedin + '" target="_blank" rel="noopener noreferrer">LinkedIn</a></div>' +
      '</div><div class="footer-bottom"><p>\u00a9 ' + new Date().getFullYear() + ' InboxElevate</p>' +
      '<p><a href="/datenschutz">Datenschutz</a></p></div></div>';
  }

  function injectFooter() {
    document.querySelectorAll('[data-site-footer]').forEach(function (el) { el.innerHTML = footerHTML(); });
  }

  function injectEmails() {
    document.querySelectorAll('.js-email-text').forEach(function (el) { el.textContent = SITE.email; });
    var replyTo = document.getElementById('js-replyto');
    if (replyTo) replyTo.value = SITE.email;
  }

  /* ---------- Startseite: Typewriter im Schild ---------- */
  function initTypewriter() {
    var el = document.getElementById('tw-text');
    if (!el || reduced.matches) return;
    var term = 0, chars = el.textContent.length, deleting = true, t;
    var TYPE = 72, DELETE = 38, HOLD = 2200, PAUSE = 280;
    function step() {
      var word = TERMS[term];
      if (!deleting) {
        if (chars < word.length) { chars++; el.textContent = word.slice(0, chars); t = setTimeout(step, TYPE); }
        else { deleting = true; t = setTimeout(step, 1800); }
        return;
      }
      if (chars > 0) { chars--; el.textContent = TERMS[term].slice(0, chars); t = setTimeout(step, DELETE); return; }
      deleting = false;
      term = (term + 1) % TERMS.length;
      t = setTimeout(step, PAUSE);
    }
    t = setTimeout(step, HOLD);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearTimeout(t); else { clearTimeout(t); t = setTimeout(step, 400); }
    });
  }

  /* ---------- Startseite: USP in Handschrift ---------- */
  var EM = 100, opentypePromise = null, fontPromise = null;

  function loadOpentype() {
    if (window.opentype) return Promise.resolve(window.opentype);
    if (!opentypePromise) {
      opentypePromise = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = '/assets/vendor/opentype.min.js';
        s.async = true;
        s.onload = function () { window.opentype ? resolve(window.opentype) : reject(new Error('opentype')); };
        s.onerror = function () { reject(new Error('opentype laden')); };
        document.head.appendChild(s);
      });
    }
    return opentypePromise;
  }

  function loadMarker() {
    if (!fontPromise) {
      fontPromise = fetch('/assets/fonts/PermanentMarker-Regular.ttf')
        .then(function (r) { if (!r.ok) throw new Error('font ' + r.status); return r.arrayBuffer(); })
        .then(function (buf) { return window.opentype.parse(buf); });
    }
    return fontPromise;
  }

  function geometry(text, font) {
    var p = font.getPath(text, 0, EM, EM);
    var b = p.getBoundingBox();
    var pad = EM * 0.12;
    var full = p.toPathData(2);
    return {
      full: full,
      contours: full.split(/(?=M)/).filter(function (d) { return d.trim().length > 1; }),
      x: b.x1 - pad, y: b.y1 - pad, w: (b.x2 - b.x1) + pad * 2, h: (b.y2 - b.y1) + pad * 2
    };
  }

  function drawLine(el, font, delay, instant) {
    var text = (el.textContent || '').trim();
    if (!text) return delay;
    var g = geometry(text, font);
    var count = Math.max(1, g.contours.length);
    var duration = Math.min(2.6, Math.max(1.1, text.length * 0.052));
    var ns = 'http://www.w3.org/2000/svg';

    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', g.x + ' ' + g.y + ' ' + g.w + ' ' + g.h);
    svg.setAttribute('aria-hidden', 'true');
    svg.style.height = '1.05em';
    svg.style.width = 'calc(1.05em * ' + (g.w / g.h).toFixed(4) + ')';

    var fill = document.createElementNS(ns, 'path');
    fill.setAttribute('d', g.full);
    fill.setAttribute('fill', 'currentColor');
    fill.setAttribute('stroke', 'none');
    fill.style.opacity = instant ? '1' : '0';
    svg.appendChild(fill);

    var strokes = g.contours.map(function (d) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', '2.1');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(p);
      return p;
    });

    el.textContent = '';
    el.appendChild(svg);
    if (instant) return delay;

    var lengths = strokes.map(function (p) { return p.getTotalLength() || 1; });
    strokes.forEach(function (p, i) { p.style.strokeDasharray = String(lengths[i]); p.style.strokeDashoffset = String(lengths[i]); });
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      strokes.forEach(function (p, i) {
        var each = (duration / count) * 2.4;
        var start = delay + (i / count) * duration;
        p.style.transition = 'stroke-dashoffset ' + each.toFixed(3) + 's ease-out ' + start.toFixed(3) + 's';
        p.style.strokeDashoffset = '0';
      });
      fill.style.transition = 'opacity .45s ease-out ' + (delay + duration * 0.72).toFixed(3) + 's';
      fill.style.opacity = '1';
    }); });
    return delay + duration + 0.45;
  }

  function initHandwriting() {
    var box = document.getElementById('uspHandwriting');
    if (!box) return;
    var lines = Array.prototype.slice.call(box.querySelectorAll('[data-usp-line]'));
    if (!lines.length) return;
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      loadOpentype().then(loadMarker).then(function (font) {
        var instant = reduced.matches, next = instant ? 0 : 0.15;
        lines.forEach(function (el) { next = drawLine(el, font, next, instant) + (instant ? 0 : 0.25); });
      }).catch(function () { /* Fallback: Text bleibt stehen */ });
    }, { threshold: 0.4 });
    io.observe(box);
  }

  /* ---------- Mobiler Sticky-CTA ---------- */
  function initStickyCta() {
    var bar = document.getElementById('stickyCta');
    if (!bar) return;
    function on() { bar.setAttribute('data-show', (window.innerWidth < 900 && window.scrollY > 360) ? 'true' : 'false'); }
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    on();
  }

  /* ---------- Start ---------- */
  injectHeader();
  injectFooter();
  injectEmails();
  initMenu();
  initTypewriter();
  initHandwriting();
  initStickyCta();
})();
