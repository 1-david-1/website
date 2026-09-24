(function () {
  'use strict';

  const wrapper = document.querySelector('.nav-overlay-wrapper');
  if (!wrapper) return;

  document.body.classList.add('has-fs-menu');

  const menuBtn = document.querySelector('.nav-close-btn');
  const toggleLabel = document.querySelector('.nav-toggle-label');
  const overlay = wrapper.querySelector('.overlay');
  const menu = wrapper.querySelector('.menu-content');
  const bgPanels = wrapper.querySelectorAll('.backdrop-layer');
  const menuLinks = wrapper.querySelectorAll('.nav-link');
  const fadeTargets = wrapper.querySelectorAll('[data-menu-fade]');
  const menuButtonTexts = menuBtn?.querySelectorAll('.menu-button-text p');
  const menuButtonIcon = menuBtn?.querySelector('.menu-button-icon');
  const shapesContainer = wrapper.querySelector('.ambient-background-shapes');

  let isOpen = false;
  let menuTl = null;

  function setMenuState(open) {
    wrapper.setAttribute('data-nav', open ? 'open' : 'closed');
    wrapper.setAttribute('aria-hidden', String(!open));
    menuBtn?.setAttribute('aria-expanded', String(open));
    menuBtn?.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    toggleLabel?.setAttribute('aria-expanded', String(open));
    toggleLabel?.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    document.body.classList.toggle('menu-open', open);
  }

  function bindShapeHovers() {
    if (!shapesContainer || typeof gsap === 'undefined') return;

    wrapper.querySelectorAll('.menu-list-item[data-shape]').forEach(item => {
      if (item.dataset.shapeBound === 'true') return;
      item.dataset.shapeBound = 'true';

      const shapeIndex = item.getAttribute('data-shape');
      const shape = shapesContainer.querySelector('.bg-shape-' + shapeIndex);
      if (!shape) return;

      const shapeEls = shape.querySelectorAll('.shape-element');

      const onEnter = () => {
        shapesContainer.querySelectorAll('.bg-shape').forEach(s => s.classList.remove('active'));
        shape.classList.add('active');
        gsap.fromTo(shapeEls,
          { scale: 0.5, opacity: 0, rotation: -10 },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.6, stagger: 0.08, ease: 'back.out(1.7)', overwrite: 'auto' }
        );
      };

      const onLeave = () => {
        gsap.to(shapeEls, {
          scale: 0.8,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => shape.classList.remove('active'),
          overwrite: 'auto'
        });
      };

      item.addEventListener('mouseenter', onEnter);
      item.addEventListener('mouseleave', onLeave);
    });
  }

  function animateMenu(open) {
    if (typeof gsap === 'undefined') {
      setMenuState(open);
      wrapper.style.display = open ? 'block' : 'none';
      if (open) menuLinks[0]?.focus();
      else menuBtn?.focus();
      return;
    }

    if (menuTl) menuTl.kill();
    menuTl = gsap.timeline();

    if (open) {
      setMenuState(true);

      menuTl
        .set(wrapper, { display: 'block' })
        .set(menu, { xPercent: 0 }, '<')
        .fromTo(menuButtonTexts, { yPercent: 0 }, { yPercent: -100, stagger: 0.2 }, '<')
        .fromTo(menuButtonIcon, { rotate: 0 }, { rotate: 315 }, '<')
        .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1 }, '<')
        .fromTo(bgPanels, { xPercent: -101 }, { xPercent: 0, stagger: 0.12, duration: 0.575, ease: 'power3.inOut' }, '<')
        .fromTo(menuLinks, { yPercent: 140, rotate: 10 }, { yPercent: 0, rotate: 0, stagger: 0.05, ease: 'power3.out' }, '<+=0.35')
        .call(() => menuLinks[0]?.focus());

      if (fadeTargets.length) {
        menuTl.fromTo(fadeTargets, { autoAlpha: 0, yPercent: 50 }, { autoAlpha: 1, yPercent: 0, stagger: 0.04, clearProps: 'all', ease: 'power3.out' }, '<+=0.2');
      }
    } else {
      setMenuState(false);

      menuTl
        .to(overlay, { autoAlpha: 0, duration: 0.4 })
        .to(menu, { xPercent: -120, duration: 0.5, ease: 'power3.in' }, '<')
        .to(menuButtonTexts, { yPercent: 0, duration: 0.35 }, '<')
        .to(menuButtonIcon, { rotate: 0, duration: 0.35 }, '<')
        .set(wrapper, { display: 'none' })
        .call(() => menuBtn?.focus());
    }
  }

  function toggleMenu() {
    isOpen = !isOpen;
    animateMenu(isOpen);
  }

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    animateMenu(false);
  }

  window.toggleFsMenu = toggleMenu;
  window.closeFsMenu = closeMenu;

  menuBtn?.addEventListener('click', toggleMenu);
  toggleLabel?.addEventListener('click', toggleMenu);
  toggleLabel?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMenu();
    }
  });
  overlay?.addEventListener('click', closeMenu);

  wrapper.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => closeMenu());
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });

  if (typeof gsap !== 'undefined') {
    gsap.set(wrapper, { display: 'none' });
    gsap.set(menu, { xPercent: -120 });
    gsap.set(overlay, { autoAlpha: 0 });
    gsap.set(bgPanels, { xPercent: -101 });
  }

  bindShapeHovers();
})();
