/* stake.html — page motion: the mechanism rail fills and the reward-split meter draws in once in view.
   Reveal safety net (both page scripts): a fast scroll / anchor jump can carry an element past the viewport
   without it ever intersecting, so IntersectionObserver never fires and it stays hidden. sweep() reveals anything
   whose top is already above the trigger line, on every scroll and on a short interval until nothing is pending.
   Covers core.js word reveals ([data-gen]), GSAP rise-ins (.cells, [data-rv], .sec-head eyebrow/lede) and this page's own states. */
(function () {
  'use strict';
  var XP = window.XP || {}, reduce = XP.reduce || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  var steps = document.querySelector('.sk-steps'), bar = document.getElementById('skBar');
  function showSteps() { if (steps) steps.classList.add('in'); }
  function showBar() { if (bar) bar.classList.remove('pre'); }
  if (reduce || !('IntersectionObserver' in window)) { showSteps(); return; }
  if (bar) bar.classList.add('pre');

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (!e.isIntersecting) return; if (e.target === bar) showBar(); else showSteps(); io.unobserve(e.target); });
  }, { rootMargin: '0px 0px -18% 0px' });
  if (steps) io.observe(steps);
  if (bar) io.observe(bar);

  function above(el, k) { return el.getBoundingClientRect().top < innerHeight * k; }
  function sweep(k) {
    var pending = 0;
    $$('[data-gen]:not(.in)').forEach(function (el) { if (above(el, k)) el.classList.add('in'); else pending++; });
    if (window.gsap) $$('.cells, [data-rv], .sec-head .eyebrow, .sec-head .lede').forEach(function (el) {
      if (parseFloat(getComputedStyle(el).opacity) > .05 || gsap.isTweening(el)) return;
      if (above(el, k)) gsap.to(el, { opacity: 1, y: 0, duration: .9, ease: 'expo.out', clearProps: 'transform,opacity' }); else pending++;
    });
    if (steps && !steps.classList.contains('in')) { if (above(steps, k)) showSteps(); else pending++; }
    if (bar && bar.classList.contains('pre')) { if (above(bar, k)) showBar(); else pending++; }
    return pending;
  }
  var raf = 0;
  function onScroll() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; sweep(.9); }); }
  if (XP.lenis) XP.lenis.on('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('hashchange', function () { setTimeout(function () { sweep(1); }, 120); });
  var tick = setInterval(function () { if (!sweep(1)) clearInterval(tick); }, 1200);   /* timeout fallback */
})();
