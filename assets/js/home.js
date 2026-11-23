/* XPHERE site — home.js (index.html only; loads after core.js).
   Hero entrance + quiet scroll exit, dApp rail, key-feature "+" details, Vault burn flare,
   2.0 scan line, roadmap progress. Everything shared (theme, nav, live stats, rings, copy, reveals) is in core.js. */
(function () {
  'use strict';
  var XP = window.XP, $ = XP.$, $$ = XP.$$, reduce = XP.reduce, hasGsap = XP.hasGsap, mqPhone = XP.mqPhone, playIcons = XP.playIcons;

  /* ---------- hero entrance + quiet scroll exit ---------- */
  var h1 = $('.hero .h1');
  setTimeout(function () { h1 && h1.classList.add('in'); }, reduce ? 0 : 420);
  if (hasGsap && !reduce) {
    gsap.from(['.hero .eyebrow', '.hero .sub', '.hero .ctas', '#hstats'], { opacity: 0, y: 14, duration: 1.1, ease: 'expo.out', stagger: .1, delay: .7, clearProps: 'transform,opacity' });
    gsap.from('#hdr .hdr-in', { opacity: 0, y: -10, duration: .9, ease: 'expo.out', delay: .15, clearProps: 'transform,opacity' });
    gsap.to('.hero-in', { y: -36, opacity: .0, ease: 'none', scrollTrigger: { trigger: '#hero', start: '38% top', end: '95% top', scrub: true } });
  }

  /* ---------- Vault burn counter flares when it grows ---------- */
  XP.on('burn', function (d) {
    if (d && d.changed) $$('.tk-burn').forEach(function (b) { b.classList.remove('flare'); void b.offsetWidth; b.classList.add('flare'); });
  });

  /* ---------- dApp rail (<1100px): prev/next + progress ---------- */
  (function () {
    var deck = $('#deck'), bar = $('#deckBar'), prev = $('#prevBtn'), next = $('#nextBtn');
    if (!deck) return;
    function upd() { var max = deck.scrollWidth - deck.clientWidth; if (max <= 0) return; var vis = deck.clientWidth / deck.scrollWidth; bar.style.width = (vis * 100) + '%'; bar.style.transform = 'translateX(' + (deck.scrollLeft / max * (1 / vis - 1) * 100) + '%)'; }
    function step(d) { var c = deck.querySelector('.pc'); deck.scrollBy({ left: d * (c.offsetWidth + 12), behavior: reduce ? 'auto' : 'smooth' }); }
    deck.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd);
    prev.addEventListener('click', function () { step(-1); }); next.addEventListener('click', function () { step(1); });
    upd();
  })();

  /* ---------- key features: "+" toggles details ---------- */
  $$('.kf-plus').forEach(function (b) {
    b.addEventListener('click', function () {
      var kf = b.closest('.kf'), o = kf.classList.toggle('open'); b.setAttribute('aria-expanded', o ? 'true' : 'false');
      if (o) playIcons($('.kf-more', kf));
      if (hasGsap) setTimeout(function () { ScrollTrigger.refresh(); }, 520);
    });
  });
  if ('IntersectionObserver' in window) {
    var kio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { playIcons($('.ic-tile', e.target)); kio.unobserve(e.target); } }); }, { threshold: .6 });
    $$('.kf, .fcol').forEach(function (k) { kio.observe(k); });
  }

  /* ---------- scroll-driven: 2.0 scan, roadmap progress ---------- */
  var evo = $('#evo2'), rows = $$('.er:not(.eh)', evo), track = $('#rmTrack'), fill = $('#rmFill'), head = $('#rmHead'), rail = $('.rm-rail'), cols = $$('.rm-col', track);
  function rmReach() {          /* the rail is lit up to the phase in progress (data, not decoration) */
    var now = $('.rm-col.now .rm-dot', track), rr = rail.getBoundingClientRect(), nr = now.getBoundingClientRect();
    return mqPhone.matches ? (nr.top + nr.height / 2 - rr.top) / Math.max(1, rr.height) : (nr.left + nr.width / 2 - rr.left) / Math.max(1, rr.width);
  }
  function rmSet(p) {
    var v = mqPhone.matches, reach = rmReach() * p, rr = rail.getBoundingClientRect(), L = v ? rr.height : rr.width;
    fill.style.transform = v ? 'scaleY(' + reach + ')' : 'scaleX(' + reach + ')';
    head.style.transform = v ? 'translateY(' + (reach * L) + 'px)' : 'translateX(' + (reach * L) + 'px)';
    head.style.opacity = p > .01 ? 1 : 0;
    cols.forEach(function (c) {
      var d = $('.rm-dot', c).getBoundingClientRect(), pos = v ? (d.top + d.height / 2 - rr.top) : (d.left + d.width / 2 - rr.left);
      c.classList.toggle('reached', pos <= reach * L + 2);
    });
  }
  if (hasGsap) {
    var efill = $('.evo-fill', evo);   /* a 2px brand rule fills down the 2.0 column; it never crosses text */
    ScrollTrigger.create({
      trigger: evo, start: 'top 75%', end: 'bottom 45%', scrub: reduce ? false : .6,
      onUpdate: function (s) {
        var y = s.progress * evo.offsetHeight;
        efill.style.transform = 'scaleY(' + s.progress + ')';
        rows.forEach(function (r) { r.classList.toggle('lit', r.offsetTop + r.offsetHeight * .5 < y || s.progress >= .999); });
      },
      onLeave: function () { rows.forEach(function (r) { r.classList.add('lit'); }); efill.style.transform = 'scaleY(1)'; }
    });
    ScrollTrigger.create({ trigger: track, start: 'top 78%', end: 'bottom 55%', scrub: reduce ? false : .5, onUpdate: function (s) { rmSet(s.progress); }, onLeave: function () { rmSet(1); } });
  } else {
    rows.forEach(function (r) { r.classList.add('lit'); });
    $('.evo-fill', evo).style.transform = 'scaleY(1)';
    rmSet(1);
  }
  window.addEventListener('resize', function () { if (!hasGsap) rmSet(1); });
})();
