(function () {
  'use strict';

  const flow = document.querySelector('[data-process-flow]');
  if (!flow) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopQuery = window.matchMedia('(min-width: 761px)');
  let triggers = [];
  let nativeFrame = 0;
  let nativeBound = false;

  function getSections() {
    return Array.from(flow.querySelectorAll('[data-flow-section]'));
  }

  function setActiveSections() {
    const viewportCenter = window.innerHeight * .5;
    getSections().forEach(section => {
      const bounds = section.getBoundingClientRect();
      section.classList.toggle('is-active', bounds.top <= viewportCenter && bounds.bottom >= viewportCenter);
    });
  }

  function updateNativeFlow() {
    nativeFrame = 0;
    if (motionQuery.matches || !desktopQuery.matches) return;

    getSections().forEach((section, index) => {
      if (index === 0) return;
      const top = section.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, (window.innerHeight - top) / (window.innerHeight * .75)));
      section.style.transform = `rotate(${20 * (1 - progress)}deg)`;
    });
    setActiveSections();
  }

  function requestNativeUpdate() {
    if (!nativeFrame) nativeFrame = requestAnimationFrame(updateNativeFlow);
  }

  function enableNativeFlow() {
    flow.classList.add('process-flow--native');
    getSections().forEach((section, index) => { section.style.zIndex = String(index + 1); });
    if (!nativeBound) {
      nativeBound = true;
      window.addEventListener('scroll', requestNativeUpdate, { passive: true });
      window.addEventListener('resize', requestNativeUpdate);
    }
    requestNativeUpdate();
  }

  function clearFlow() {
    flow.classList.remove('process-flow--native');
    triggers.forEach(trigger => trigger.kill());
    triggers = [];
    getSections().forEach(section => {
      section.classList.remove('is-active');
      section.style.transform = '';
      section.style.zIndex = '';
    });
  }

  function createFlow() {
    clearFlow();
    if (motionQuery.matches || !desktopQuery.matches) return;

    const sections = getSections();
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      enableNativeFlow();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    sections.forEach((section, index) => {
      gsap.set(section, { zIndex: index + 1 });

      if (index > 0) {
        gsap.set(section, { rotation: 20, transformOrigin: 'bottom left' });
        const tween = gsap.to(section, {
          rotation: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'top 25%',
            scrub: 1
          }
        });
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
      }

      triggers.push(ScrollTrigger.create({
        trigger: section,
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: () => section.classList.add('is-active'),
        onEnterBack: () => section.classList.add('is-active'),
        onLeave: () => section.classList.remove('is-active'),
        onLeaveBack: () => section.classList.remove('is-active')
      }));

      if (index < sections.length - 1) {
        triggers.push(ScrollTrigger.create({
          trigger: section,
          start: 'bottom bottom',
          end: 'bottom top',
          pin: true,
          pinSpacing: false,
          anticipatePin: 1
        }));
      }
    });

    ScrollTrigger.refresh();
  }

  motionQuery.addEventListener('change', createFlow);
  desktopQuery.addEventListener('change', createFlow);
  window.addEventListener('load', createFlow, { once: true });
  createFlow();
})();
