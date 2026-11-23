/* XPHERE site — docs.js (docs/*.html only; loads after core.js).
   Sidebar groups (collapse) · drawer ≤960 · TOC bar ≤1199 · scroll-spy (TOC + whitepaper chapter list) with a
   sliding indicator · in-page anchors with the right sticky offset · heading anchor links · code language labels
   (the draft added these at runtime too) · sticky table headers · reading progress on long pages.
   No new copy: every label shown comes from the page itself. */
(function () {
  'use strict';
  var XP = window.XP || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqBar = window.matchMedia('(max-width:1199px)'), mqDrawer = window.matchMedia('(max-width:960px)');
  var dx = $('#dx'), side = $('#dxSide'), tocBox = $('#dxToc'), toc = $('#toc'), doc = $('.dx-doc');
  if (!dx || !doc) return;
  var lenis = function () { return window.lenis || XP.lenis || null; };
  function stick() { return 60 + (mqBar.matches ? 44 : 0); }
  function raf(fn) { var q = false; return function () { if (q) return; q = true; requestAnimationFrame(function () { q = false; fn(); }); }; }

  /* ---------- code: language label (as the draft did at runtime) ---------- */
  $$('.code[data-lang]', doc).forEach(function (c) { var l = $('.code-bar .lab', c); if (l && !l.textContent) l.textContent = c.getAttribute('data-lang'); });

  /* ---------- heading anchors (icon only) ---------- */
  $$('h2[id], h3[id], h4[id], h5[id]', doc).forEach(function (h) {
    var a = document.createElement('a');
    a.className = 'hd-a'; a.href = '#' + h.id; a.setAttribute('aria-label', h.textContent.trim());
    a.innerHTML = '<animate-icons name="link" size="13"></animate-icons>';
    h.appendChild(a);
  });

  /* ---------- sidebar groups ---------- */
  $$('.dx-sec-t', side).forEach(function (b) {
    b.addEventListener('click', function () {
      var s = b.parentNode, o = !s.classList.contains('open');
      s.classList.toggle('open', o); b.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
  });
  (function () { /* bring the current page into view inside the sidebar */
    var on = $('a.on', side); if (!on) return;
    var r = on.getBoundingClientRect(), sr = side.getBoundingClientRect();
    if (r.bottom > sr.bottom - 40) side.scrollTop += r.top - sr.top - sr.height / 3;
  })();

  /* ---------- drawer (≤960) ---------- */
  var dw = $('#dxDw'), scrim = $('#dxScrim');
  function drawer(open, focusBack) {
    if (!dw) return;
    dx.classList.toggle('drawer', open); dw.setAttribute('aria-expanded', open ? 'true' : 'false');
    var l = lenis(); if (l) { open ? l.stop() : l.start(); }
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) { tocOpen(false); side.setAttribute('tabindex', '-1'); setTimeout(function () { side.focus({ preventScroll: true }); }, 60); }
    else if (focusBack) dw.focus();
  }
  if (dw) dw.addEventListener('click', function (e) { e.stopPropagation(); drawer(!dx.classList.contains('drawer')); });
  if (scrim) scrim.addEventListener('click', function () { drawer(false); });
  $$('a', side).forEach(function (a) { a.addEventListener('click', function () { if (dx.classList.contains('drawer')) drawer(false); }); });
  (mqDrawer.addEventListener ? mqDrawer.addEventListener.bind(mqDrawer, 'change') : mqDrawer.addListener.bind(mqDrawer))(function () { if (!mqDrawer.matches) drawer(false); });

  /* ---------- TOC bar (≤1199) ---------- */
  var tocT = $('#dxTocT');
  function tocOpen(o) {
    if (!tocBox || !tocT) return;
    tocBox.classList.toggle('open', o); tocT.setAttribute('aria-expanded', o ? 'true' : 'false');
    if (o) { var on = $('a.on', toc); if (on) toc.scrollTop = on.offsetTop - toc.clientHeight / 3; }
  }
  if (tocT) tocT.addEventListener('click', function (e) { if (!mqBar.matches) return; e.stopPropagation(); tocOpen(!tocBox.classList.contains('open')); });
  document.addEventListener('click', function (e) { if (tocBox && tocBox.classList.contains('open') && !tocBox.contains(e.target)) tocOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (dx.classList.contains('drawer')) drawer(false, true);
    if (tocBox && tocBox.classList.contains('open')) { tocOpen(false); tocT.focus(); }
  });

  /* ---------- in-page anchors: offset for the header (+ TOC bar), close panels ---------- */
  function byHash(h) { try { return h && h.length > 1 ? document.getElementById(decodeURIComponent(h.slice(1))) : null; } catch (e) { return null; } }
  function go(el) {
    var off = stick() + 18, l = lenis();
    if (l) l.scrollTo(el, { offset: -off, duration: 1.1 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#' || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var el = byHash(a.getAttribute('href')); if (!el) return;
    e.preventDefault();
    if (tocBox && tocBox.contains(a)) tocOpen(false);
    var wasDrawer = dx.classList.contains('drawer'); if (wasDrawer) drawer(false);
    setTimeout(function () { go(el); }, wasDrawer ? 30 : 0);
    if (history.pushState) history.pushState(null, '', a.getAttribute('href'));
  }, true);

  /* ---------- scroll-spy ---------- */
  var tocLinks = toc ? $$('a[href^="#"]', toc) : [];
  var chLinks = $$('.dx-ch a[href^="#"]', side);
  var ind = $('.dx-toc-ind', toc);
  function targets(links) { return links.map(function (a) { return byHash(a.getAttribute('href')); }); }
  var tocT_ = targets(tocLinks), chT = targets(chLinks), tocY = [], chY = [];
  function measure() {
    var sy = window.scrollY;
    tocY = tocT_.map(function (h) { return h ? h.getBoundingClientRect().top + sy : Infinity; });
    chY = chT.map(function (h) { return h ? h.getBoundingClientRect().top + sy : Infinity; });
  }
  function find(ys, y) { var lo = 0, hi = ys.length - 1, r = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (ys[m] <= y) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
  var curToc = -2, curCh = -2;
  function spy() {
    var y = window.scrollY + stick() + Math.min(150, window.innerHeight * .22);
    var atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    var i = atEnd && tocLinks.length ? tocLinks.length - 1 : Math.max(0, find(tocY, y));
    if (i !== curToc) {
      curToc = i;
      tocLinks.forEach(function (a, j) { a.classList.toggle('on', j === i); if (j === i) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      var on = tocLinks[i];
      if (ind) {
        if (on) { ind.style.setProperty('--y', on.offsetTop + 'px'); ind.style.height = on.offsetHeight + 'px'; ind.classList.add('on'); }
        else ind.classList.remove('on');
      }
      if (on && !mqBar.matches && toc.scrollHeight > toc.clientHeight) {
        var t = on.offsetTop, b = t + on.offsetHeight;
        if (t < toc.scrollTop + 24 || b > toc.scrollTop + toc.clientHeight - 48) toc.scrollTo({ top: t - toc.clientHeight / 3, behavior: reduce ? 'auto' : 'smooth' });
      }
    }
    if (chLinks.length) {
      var k = atEnd ? chLinks.length - 1 : Math.max(0, find(chY, y));
      if (k !== curCh) { curCh = k; chLinks.forEach(function (a, j) { a.classList.toggle('on', j === k); }); }
    }
  }

  /* ---------- sticky table headers (the wrapper scrolls sideways, so CSS sticky can't reach the page) ---------- */
  var tables = $$('.tbl-wrap', doc).filter(function (w) { return $$('tbody tr', w).length >= 6 && $('thead', w); });
  var live = [];
  if (tables.length && 'IntersectionObserver' in window) {
    var tio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var w = e.target, i = live.indexOf(w);
        if (e.isIntersecting && i < 0) live.push(w);
        if (!e.isIntersecting && i >= 0) { live.splice(i, 1); unstick(w); }
      });
      onScroll();
    });
    tables.forEach(function (w) { w.__th = $$('thead th', w); tio.observe(w); });
  }
  function unstick(w) { if (!w.__s) return; w.__s = 0; w.classList.remove('stuck'); w.__th.forEach(function (th) { th.style.transform = ''; }); }
  function stickTables() {
    var top = stick();
    live.forEach(function (w) {
      var r = w.getBoundingClientRect(), h = w.__th[0] ? w.__th[0].offsetHeight : 0;
      if (!h) { unstick(w); return; }
      if (r.top < top && r.bottom > top + h * 2) {
        var off = Math.min(top - r.top, r.height - h * 2);
        w.__s = 1; w.classList.add('stuck');
        w.__th.forEach(function (th) { th.style.transform = 'translate3d(0,' + off + 'px,0)'; });
      } else unstick(w);
    });
  }

  /* ---------- reading progress (long pages) ---------- */
  var prog = $('.dx-prog'), long = false;
  function sizeProg() { long = document.body.classList.contains('dx-wp') || document.documentElement.scrollHeight > window.innerHeight * 4.5; if (prog) prog.classList.toggle('on', long); }
  function progress() {
    if (!prog || !long) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.setProperty('--p', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
  }

  /* ---------- sideways scrollers: fade the right edge while more is hidden ---------- */
  var scrollers = $$('.tbl-wrap, .code pre', doc);
  function fade(el) { var ov = el.scrollWidth > el.clientWidth + 2; el.classList.toggle('ov-r', ov && el.scrollLeft + el.clientWidth < el.scrollWidth - 4); }
  scrollers.forEach(function (el) { el.addEventListener('scroll', function () { fade(el); }, { passive: true }); });

  var onScroll = raf(function () { spy(); stickTables(); progress(); });
  var onResize = raf(function () { measure(); sizeProg(); scrollers.forEach(fade); curToc = -2; curCh = -2; onScroll(); });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  if ('ResizeObserver' in window) { var ro = new ResizeObserver(onResize); ro.observe(doc); }
  measure(); sizeProg(); spy(); progress();
})();
