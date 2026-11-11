/* Gestapelte Karten – Vanilla-Port der StackingCards-Komponente
   Original: Khoa Phan, https://www.pldkhoa.dev (React + motion/react)

   Entspricht useScroll({ offset: ["start start", "end end"] }) auf dem Container:
   Fortschritt 0 = Oberkante des Containers erreicht den oberen Fensterrand,
   Fortschritt 1 = Unterkante erreicht den unteren Fensterrand.
   Je Karte i von n:  scale = lerp(1, 1 - (n - i) * step, Fortschritt von i/n bis 1)

   Markup:
     <div class="stack" data-stack data-count="5" data-scale-step="0.03">
       <div class="stack__item" data-stack-item><article class="stack-card">…</article></div>
       …
     </div>                                                                      */
(function () {
  'use strict';

  var roots = Array.prototype.slice.call(document.querySelectorAll('[data-stack]'));
  if (!roots.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var short = window.matchMedia('(max-height: 620px)');

  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  var stacks = roots.map(function (root) {
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-stack-item]'));
    items.forEach(function (item, i) { item.style.setProperty('--i', i); });
    root.setAttribute('data-count', String(items.length));
    return {
      root: root,
      cards: items.map(function (item) { return item.querySelector('.stack-card'); }),
      step: parseFloat(root.getAttribute('data-scale-step')) || 0.03,
      live: false
    };
  });

  function update(s) {
    var n = s.cards.length;
    if (reduced.matches || short.matches) {
      s.cards.forEach(function (c) { c.style.removeProperty('--stack-scale'); });
      return;
    }
    var rect = s.root.getBoundingClientRect();
    var range = rect.height - window.innerHeight;
    var p = range > 0 ? clamp(-rect.top / range, 0, 1) : 0;
    s.cards.forEach(function (card, i) {
      var from = i / n;
      var t = clamp((p - from) / (1 - from), 0, 1);
      var target = 1 - (n - i) * s.step;
      card.style.setProperty('--stack-scale', (1 + (target - 1) * t).toFixed(4));
    });
  }

  var queued = false;
  function tick() {
    queued = false;
    stacks.forEach(function (s) { if (s.live) update(s); });
  }
  function request() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        stacks.forEach(function (s) { if (s.root === e.target) s.live = e.isIntersecting; });
      });
      request();
    }, { rootMargin: '10% 0px 10% 0px' });
    stacks.forEach(function (s) { io.observe(s.root); });
  } else {
    stacks.forEach(function (s) { s.live = true; });
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { stacks.forEach(update); });
  reduced.addEventListener && reduced.addEventListener('change', function () { stacks.forEach(update); });
  stacks.forEach(update);
})();
