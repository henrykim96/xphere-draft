/* security.html — verified-state motion: the whitelist badges settle one by one when the list enters view,
   and the disclosure rail fills. The hero ledger loops in CSS. Copy, reveals and icons are core.js.
   Reveal safety net: see stake.js — sweep() reveals anything already above the trigger line after a fast
   scroll / anchor jump (IntersectionObserver never fires if an element jumps past the viewport). */
(function () {
  'use strict';
  var XP = window.XP || {}, reduce = XP.reduce || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var grids = $$('.sc-grid'), steps = document.querySelector('.sc-steps');
  function showSteps() { if (steps) steps.classList.add('in'); }
  function showGrid(g) {
    if (!g.classList.contains('pre')) return;
    g.classList.remove('pre');
    $$('.sc-ok', g).forEach(function (ic, i) { setTimeout(function () { try { if (ic.startAnimation) ic.startAnimation(); } catch (x) {} }, 250 + i * 140); });
  }
  if (reduce || !('IntersectionObserver' in window)) { showSteps(); return; }
  grids.forEach(function (g) {
    g.classList.add('pre');
    $$('.sc-ok', g).forEach(function (ic, i) { ic.style.setProperty('--d', (0.25 + i * 0.14) + 's'); });
  });

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (!e.isIntersecting) return; io.unobserve(e.target); if (e.target === steps) showSteps(); else showGrid(e.target); });
  }, { rootMargin: '0px 0px -18% 0px' });
  grids.forEach(function (g) { io.observe(g); });
  if (steps) io.observe(steps);

  function above(el, k) { return el.getBoundingClientRect().top < innerHeight * k; }
  function sweep(k) {
    var pending = 0;
    $$('[data-gen]:not(.in)').forEach(function (el) { if (above(el, k)) el.classList.add('in'); else pending++; });
    if (window.gsap) $$('.cells, [data-rv], .sec-head .eyebrow, .sec-head .lede').forEach(function (el) {
      if (parseFloat(getComputedStyle(el).opacity) > .05 || gsap.isTweening(el)) return;
      if (above(el, k)) gsap.to(el, { opacity: 1, y: 0, duration: .9, ease: 'expo.out', clearProps: 'transform,opacity' }); else pending++;
    });
    grids.forEach(function (g) { if (g.classList.contains('pre')) { if (above(g, k)) showGrid(g); else pending++; } });
    if (steps && !steps.classList.contains('in')) { if (above(steps, k)) showSteps(); else pending++; }
    return pending;
  }
  var raf = 0;
  function onScroll() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; sweep(.9); }); }
  if (XP.lenis) XP.lenis.on('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('hashchange', function () { setTimeout(function () { sweep(1); }, 120); });
  var tick = setInterval(function () { if (!sweep(1)) clearInterval(tick); }, 1200);   /* timeout fallback */
})();
