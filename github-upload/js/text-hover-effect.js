(function () {
  'use strict';

  let uidCounter = 0;

  function initTextHoverEffects() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.querySelectorAll('[data-text-hover]').forEach(container => {
      if (container.dataset.textHoverBound === 'true') return;
      container.dataset.textHoverBound = 'true';

      const text = container.dataset.textHover || container.textContent.trim();
      const fontSize = parseFloat(container.dataset.textHoverSize) || 56;
      const vbW = parseFloat(container.dataset.textHoverWidth) || Math.max(300, text.length * fontSize * 0.55);
      const vbH = parseFloat(container.dataset.textHoverHeight) || Math.max(80, fontSize * 1.6);
      const uid = 'the-' + (++uidCounter);

      container.textContent = '';
      container.setAttribute('aria-label', text);

      if (reducedMotion) {
        const span = document.createElement('span');
        span.className = 'text-hover-fallback';
        span.textContent = text;
        container.appendChild(span);
        return;
      }

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.classList.add('text-hover-svg');

      svg.innerHTML = `
        <defs>
          <linearGradient id="textGradient-${uid}" gradientUnits="userSpaceOnUse"></linearGradient>
          <radialGradient id="revealMask-${uid}" gradientUnits="userSpaceOnUse" r="25%" cx="50%" cy="50%">
            <stop offset="0%" stop-color="white" />
            <stop offset="100%" stop-color="black" />
          </radialGradient>
          <mask id="textMask-${uid}">
            <rect x="0" y="0" width="100%" height="100%" fill="url(#revealMask-${uid})" />
          </mask>
        </defs>
        <text class="the-base the-base-ghost" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
          stroke-width="0.3" style="font-size:${fontSize}px;opacity:0"></text>
        <text class="the-base the-base-stroke" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
          stroke-width="0.3" style="font-size:${fontSize}px"></text>
        <text class="the-base the-base-gradient" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
          stroke-width="0.3" style="font-size:${fontSize}px"
          stroke="url(#textGradient-${uid})" mask="url(#textMask-${uid})"></text>
      `;

      const gradientStops = [
        ['0%', '#eab308'],
        ['25%', '#ef4444'],
        ['50%', '#3b82f6'],
        ['75%', '#06b6d4'],
        ['100%', '#8b5cf6']
      ];

      function setGradientStops(active) {
        const grad = svg.querySelector(`#textGradient-${uid}`);
        if (!grad) return;
        grad.innerHTML = '';
        if (!active) return;
        gradientStops.forEach(([offset, color]) => {
          const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
          stop.setAttribute('offset', offset);
          stop.setAttribute('stop-color', color);
          grad.appendChild(stop);
        });
      }

      svg.querySelectorAll('.the-base').forEach(el => { el.textContent = text; });
      container.appendChild(svg);

      const maskGradient = svg.querySelector(`#revealMask-${uid}`);
      const animatedText = svg.querySelector('.the-base-stroke');
      const ghostText = svg.querySelector('.the-base-ghost');
      let hovered = false;

      if (typeof gsap !== 'undefined' && animatedText) {
        gsap.fromTo(animatedText,
          { strokeDashoffset: 1000, strokeDasharray: 1000 },
          { strokeDashoffset: 0, strokeDasharray: 1000, duration: 4, ease: 'power2.inOut' }
        );
      }

      function updateCursor(x, y) {
        const rect = svg.getBoundingClientRect();
        if (!rect.width) return;
        const cx = ((x - rect.left) / rect.width) * 100;
        const cy = ((y - rect.top) / rect.height) * 100;
        if (maskGradient) {
          maskGradient.setAttribute('cx', cx + '%');
          maskGradient.setAttribute('cy', cy + '%');
        }
      }

      function setHovered(state) {
        hovered = state;
        setGradientStops(state);
        if (ghostText) ghostText.style.opacity = state ? '0.7' : '0';
      }

      svg.addEventListener('mouseenter', () => setHovered(true));
      svg.addEventListener('mouseleave', () => setHovered(false));
      svg.addEventListener('mousemove', e => updateCursor(e.clientX, e.clientY));
      svg.addEventListener('touchstart', e => {
        setHovered(true);
        if (e.touches.length) updateCursor(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      svg.addEventListener('touchmove', e => {
        if (e.touches.length) updateCursor(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      svg.addEventListener('touchend', () => setHovered(false));
    });
  }

  window.initTextHoverEffects = initTextHoverEffects;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTextHoverEffects);
  } else {
    initTextHoverEffects();
  }
})();
