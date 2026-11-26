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

  /* ---------- Burn history: cumulative chart + latest settlements from the Vault's daily feed ---------- */
  (function () {
    var box = document.getElementById('burnHist'); if (!box || !window.fetch) return;
    var q = function (k) { return box.querySelector('[data-bh="' + k + '"]'); };
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var dl = function (s, y) { var p = s.split('-'); return MON[+p[1] - 1] + ' ' + (+p[2]) + (y ? ', ' + p[0] : ''); };
    var nf = function (n) { return Math.round(n).toLocaleString('en-US'); };
    var fail = function () { q('log').innerHTML = '<li class="th-empty">The daily log is unavailable right now. See <a href="https://stake.x-phere.com/burn.html" target="_blank" rel="noopener noreferrer">stake.x-phere.com/burn</a>.</li>'; };
    fetch('https://stake.x-phere.com/data/stats.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      var days = (j && j.days || []).filter(function (d) { return d && d.date && d.burned >= 0; });
      if (!days.length) return fail();
      var cum = 0, pts = days.map(function (d) { cum += d.burned; return { d: d.date, b: d.burned, c: cum }; });
      q('total').textContent = nf(cum); q('since').textContent = dl(pts[0].d, true);
      q('log').innerHTML = pts.slice(-5).reverse().map(function (p) { return '<li><span>' + dl(p.d) + '</span><b>' + nf(p.b) + ' XP</b></li>'; }).join('');
      var host = q('chart'), NS = 'http://www.w3.org/2000/svg', tip = document.createElement('div'); tip.className = 'th-tip'; host.appendChild(tip);
      var draw = function () {
        var old = host.querySelector('svg'); if (old) old.remove();
        var W = host.clientWidth || 600, H = window.matchMedia('(max-width:760px)').matches ? 170 : 200, L = 4, R = 4, T = 14, B = 22, iw = W - L - R, ih = H - T - B;
        var t0 = Date.parse(pts[0].d), t1 = Date.parse(pts[pts.length - 1].d) || t0 + 1, span = Math.max(1, t1 - t0);
        var x = function (p) { return L + (Date.parse(p.d) - t0) / span * iw; }, y = function (v) { return T + ih - v / cum * ih; };
        var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(p).toFixed(1) + ' ' + y(p.c).toFixed(1); }).join('');
        var s = '<defs><linearGradient id="bhg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--tk-ember)" stop-opacity=".28"/><stop offset="1" stop-color="var(--tk-ember)" stop-opacity="0"/></linearGradient></defs>';
        [0.5, 1].forEach(function (f) { s += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(cum * f) + '" y2="' + y(cum * f) + '"/>'; });
        s += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ih) + '" y2="' + (T + ih) + '"/>';
        s += '<path d="' + line + 'L' + x(pts[pts.length - 1]) + ' ' + (T + ih) + 'L' + L + ' ' + (T + ih) + 'Z" fill="url(#bhg)"/>';
        s += '<path d="' + line + '" fill="none" stroke="var(--tk-ember)" stroke-width="2" stroke-linejoin="round"/>';
        var next = 1e6; pts.forEach(function (p) { if (p.c >= next) { var mx = x(p), my = y(p.c), m = Math.floor(p.c / 1e6), right = mx > W * 0.8; s += '<g class="ms"><circle cx="' + mx + '" cy="' + my + '" r="4"/><text x="' + (right ? mx - 8 : mx + 8) + '" y="' + (right ? my - 10 : my + 14) + '" text-anchor="' + (right ? 'end' : 'start') + '">' + m + 'M · ' + dl(p.d) + '</text></g>'; next = (m + 1) * 1e6; } });
        s += '<text class="ax" x="' + L + '" y="' + (H - 4) + '">' + dl(pts[0].d) + '</text><text class="ax" x="' + (W - R) + '" y="' + (H - 4) + '" text-anchor="end">' + dl(pts[pts.length - 1].d) + '</text>';
        s += '<line class="hv" stroke="var(--tx-3)" stroke-dasharray="3 3" y1="' + T + '" y2="' + (T + ih) + '" opacity="0"/><circle class="hd" r="4" fill="var(--tk-ember)" opacity="0"/>';
        var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.innerHTML = s; host.insertBefore(svg, tip);
        var hv = svg.querySelector('.hv'), hd = svg.querySelector('.hd');
        var move = function (e) {
          var r = svg.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width * W, best = pts[0], bd = 1e9;
          pts.forEach(function (p) { var dd = Math.abs(x(p) - mx); if (dd < bd) { bd = dd; best = p; } });
          var px = x(best), py = y(best.c);
          hv.setAttribute('x1', px); hv.setAttribute('x2', px); hv.setAttribute('opacity', '1'); hd.setAttribute('cx', px); hd.setAttribute('cy', py); hd.setAttribute('opacity', '1');
          tip.innerHTML = '<b>' + dl(best.d, true) + '</b><br>Burned that day: ' + nf(best.b) + ' XP<br>Total: ' + nf(best.c) + ' XP';
          tip.style.left = Math.min(Math.max(px / W * r.width, 80), r.width - 80) + 'px'; tip.style.top = (py / H * r.height) + 'px'; tip.classList.add('on');
        };
        svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
        svg.addEventListener('pointerleave', function () { tip.classList.remove('on'); hv.setAttribute('opacity', '0'); hd.setAttribute('opacity', '0'); });
      };
      draw(); var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
    }).catch(fail);
  })();

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
