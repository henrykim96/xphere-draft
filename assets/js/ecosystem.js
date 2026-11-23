/* ==========================================================================
   XPHERE site — ecosystem.js (ecosystem.html only; runs after core.js)
   Directory (segmented tabs + search with FLIP layout animation), everyday-life
   app cards, hero stats + logo mosaic. The data below is copied verbatim from
   draft/ecosystem.html (the draft renders these cards from JS as well, so the
   copy stays in JS here too). Image paths keep the draft's "images/" prefix and
   are mapped to assets/media/ at render time.
   ========================================================================== */
(function () {
  'use strict';
  var XP = window.XP || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(.22,1,.36,1)';
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function media(src) { return src.replace(/^images\//, 'assets/media/'); }
  /* opaque square artwork (black ground) fills its tile instead of sitting on it */
  var FILL = { 'images/phos-black.png': 1, 'images/xeffy-mark.png': 1 };

  /* ---------- directory data (same entries as the Home "Apps running on XPHERE" cards) ---------- */
  /* @data:CAT */
  var CAT={defi:'DeFi',apps:'Apps',wallets:'Wallets',explorers:'Explorers',infra:'Infrastructure'};
  /* @data:P */
  var P=[
    {n:'XCROLL',c:'apps',k:'Watch short videos, earn rewards',t:'Watch-to-earn · Shorts · Viewer rewards',u:'https://xcroll.ai/',img:'images/xcroll_mark.png'},
    {n:'Phos',c:'apps',k:'Token launchpad built on XPHERE',t:'Launchpad · Token launches · XPHERE-native',u:'https://phos.land/',img:'images/phos-black.png',s:1.25},
    {n:'Xeffy',c:'defi',k:'An institutional-grade gateway to vaults and RWA',t:'Vault strategies · Real-world assets · XEF token on XPHERE',u:'https://xeffy.io/',img:'images/xeffy-mark.png',s:1.15},
    {n:'Faiyah',c:'defi',k:'Multichain DeFi, from swaps to launches',t:'Staking · P2P swap · Burn pools · Launchpad · DEX',u:'https://faiyah.app/',img:'images/faiyah.svg'},
    {n:'PumpkinSwap',c:'defi',k:'Swap tokens on XPHERE in one step',t:'Swap · Pools · Bridge',u:'https://pumpkinswap.app/swap',img:'images/pumpkinswap.svg'},
    {n:'XP Union Vault',c:'defi',k:'Real-yield staking for XP',t:'60% to stakers · 40%+ burned · 0% fees',u:'https://stake.x-phere.com/',img:'images/eco-vault.png'},
    {n:'ZIGAP',c:'wallets',k:'The wallet with XPHERE built in',t:'Partner wallet · No network setup',u:'https://about.zigap.io/',img:'images/eco-zigap.png'},
    {n:'XPScan',c:'explorers',k:'The XPHERE explorer',t:'Blocks · Contract verification · Union · Burn dashboards',u:'https://xpscan.io/',img:'images/eco-xpscan.png',raw:1},
    {n:'Tamsa Explorer',c:'explorers',k:'Mainnet explorer with a public API',t:'Blocks · Union · Network data',u:'https://xp.tamsa.io/',img:'images/eco-tamsa.png'},
    {n:'Ankr RPC',c:'infra',k:'Global RPC for Mainnet and Testnet',t:'Public endpoints · Mainnet · Testnet',u:'https://www.ankr.com/rpc/xphere/',img:'images/eco-ankr.png'}
  ];
  /* everyday services: Web2-style app cards, kept apart from the crypto directory */
  /* @data:LIFE */
  var LIFE=[
    {n:"Let's Ticket",c:'life',k:'A new way to book tickets that stops forgery and scalping, with every ticket recorded on-chain',t:'Ticketing · On-chain records · Rewards',st:'Live',mono:'LT',img:'images/life-letsticket.png',u:'https://letsticket.io/',sq:1},
    {n:'SuperWallet',c:'life',k:'A digital identity you carry yourself, and anyone can check it is real. Starting with SuperWallet for Laos.',t:'Digital identity · DID · Laos',st:'Coming soon',mono:'SW',img:'images/life-superwallet.png',sq:1},
    {n:'Campass',c:'life',k:'Digital identity for universities. Student documents arrive on your phone and can be verified on the spot.',t:'University · Digital ID · Certificates',st:'Live',mono:'CP',img:'images/life-superwallet.png',sq:1},
    {n:'Yaknaru',c:'life',k:'A health app with XPHERE-based rewards on the way',t:'Health shop · Prescriptions · Points',st:'Coming to XPHERE',mono:'약',img:'images/life-yaknaru.png',sq:1},
    {n:'KWAN',c:'life',k:'A Korean won stablecoin built for real-time tax refunds for visitors, and for local businesses',t:'KRW stablecoin · Tax refunds · Local economy',st:'In development',mono:'₩',img:'images/life-kwan.png'},
    {n:'Local currency',c:'life',k:'Local currency programs on XPHERE',t:'Local payments · Community',st:'Coming soon',mono:'LC'}
  ];
  /* @data:end */
  var PARTNERS = 19;   /* draft: same 19 logos as the Home logo strip (16 partners + 3 media) */

  function count(c) { return c === 'all' ? P.length : P.filter(function (p) { return p.c === c; }).length; }
  /* tags wrap without a dangling separator: each item carries its dot on the left, the first dot of every line is clipped */
  function tags(t) { return '<span class="tg">' + t.split(' · ').map(function (x) { return '<i>' + esc(x) + '</i>'; }).join('') + '</span>'; }
  function tile(p, extra) {
    if (!p.img) return '<span class="tile mono' + (extra || '') + '">' + esc(p.mono || p.n.charAt(0)) + '</span>';
    var cls = p.raw || FILL[p.img] ? ' fill' : (p.c === 'life' && !p.sq ? ' round' : '');
    return '<span class="tile' + cls + (extra || '') + '"><img src="' + media(p.img) + '" alt="" style="--s:' + (p.s || 1) + '" loading="lazy" decoding="async"></span>';
  }

  /* ---------- entrance: stagger children once when the container scrolls in ---------- */
  function entrance(host, sel) {
    if (reduce || !('IntersectionObserver' in window)) return;
    host.classList.add('eco-pre');
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      var i = 0;
      Array.prototype.forEach.call(host.querySelectorAll(sel), function (el) {
        if (el.hidden) return;
        el.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
          { duration: 900, delay: i++ * 60, easing: EASE, fill: 'backwards' });
      });
      host.classList.remove('eco-pre');
    }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(host);
  }
  /* pointer light + icon play for cards created after core.js wired the static ones */
  function wire(host) {
    if (window.matchMedia('(hover:hover)').matches) host.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.card'); if (!c) return;
      var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    Array.prototype.forEach.call(host.querySelectorAll('.card'), function (c) {
      c.addEventListener('mouseenter', function () { if (XP.playIcons) XP.playIcons(c); });
      c.addEventListener('focus', function () { if (XP.playIcons) XP.playIcons(c); });
    });
  }

  /* ---------- hero stats ---------- */
  var vals = { all: P.length, defi: count('defi'), apps: count('apps'), partners: PARTNERS };
  Object.keys(vals).forEach(function (k) {
    var el = $('#ecoStats [data-c="' + k + '"]'); if (!el) return;
    if (XP.paint) XP.paint(el, String(vals[k])); else el.textContent = vals[k];
  });

  /* ---------- hero mosaic: every app logo on one hairline grid; one tile lights at a time ---------- */
  (function () {
    var m = $('#ecoMosaic'); if (!m) return;
    var order = [P[0], LIFE[0], P[3], P[7], LIFE[4], P[1], P[6], LIFE[1], P[5], LIFE[3], P[2], P[9], P[8], LIFE[5], P[4], LIFE[2]];
    m.innerHTML = order.map(function (p) { return '<span class="mc">' + tile(p) + '</span>'; }).join('');
    var cells = m.querySelectorAll('.mc');
    Array.prototype.forEach.call(cells, function (c) {
      c.addEventListener('pointerenter', function () { c.classList.add('hov'); });
      c.addEventListener('pointerleave', function () { c.classList.remove('hov'); });
    });
    if (!reduce) Array.prototype.forEach.call(cells, function (c, i) {
      c.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }],
        { duration: 800, delay: 200 + ((i % 4) + Math.floor(i / 4)) * 70, easing: EASE, fill: 'backwards' });
    });
    if (reduce) return;
    var last = -1, timer = 0, vis = true;
    function step() {
      var j; do { j = Math.floor(Math.random() * cells.length); } while (j === last);
      if (last >= 0) cells[last].classList.remove('on');
      cells[j].classList.add('on'); last = j;
    }
    function run() { clearInterval(timer); timer = 0; if (vis && !document.hidden) { step(); timer = setInterval(step, 2200); } }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; run(); }).observe(m);
    document.addEventListener('visibilitychange', run);
    run();
  })();

  /* ---------- directory: segmented tabs + search ---------- */
  var cur = 'all', grid = $('#grid'), tl = $('#tabs'), q = $('#q'), empty = $('#empty');
  tl.innerHTML = ['all'].concat(Object.keys(CAT)).map(function (c) {
    return '<button class="tab" type="button" role="tab" data-value="' + c + '">' + (c === 'all' ? 'All' : CAT[c]) + '<span class="tab-n">' + count(c) + '</span></button>';
  }).join('');
  grid.innerHTML = P.map(function (p) {
    var top = '<div class="ec-top">' + tile(p) + '<span class="ec-cat">' + CAT[p.c] + '</span></div>';
    var body = '<h3 class="t4">' + esc(p.n) + '</h3><p class="ec-k">' + esc(p.k) + '</p><p class="tags ec-t">' + tags(p.t) + '</p>';
    if (p.u) return '<a class="card gcard eco-card" href="' + p.u + '" target="_blank" rel="noopener" data-c="' + p.c + '"><span class="gc-glow" aria-hidden="true"></span>' + top + body + '<span class="ec-go">Visit <animate-icons name="arrow-up-right" size="12"></animate-icons></span></a>';
    return '<div class="card gcard eco-card" data-c="' + p.c + '"><span class="gc-glow" aria-hidden="true"></span>' + top + body + '<div class="ec-foot"><span class="st">' + esc(p.st || 'Coming soon') + '</span><span class="by">by Seoul Labs</span></div></div>';
  }).join('');
  var cards = Array.prototype.map.call(grid.children, function (el, i) { return { el: el, p: P[i] }; });

  function apply(animate) {
    var term = q.value.trim().toLowerCase(), n = 0, before = [], gr = grid.getBoundingClientRect(), h0 = gr.height;
    if (animate) cards.forEach(function (c) { before.push(c.el.hidden ? null : c.el.getBoundingClientRect()); });
    cards.forEach(function (c) {
      var p = c.p, show = (cur === 'all' || p.c === cur) && (!term || (p.n + ' ' + p.k + ' ' + p.t).toLowerCase().indexOf(term) >= 0);
      c.show = show; if (show) n++;
    });
    if (animate && !reduce) {
      /* cards that leave fade out in place as inert ghosts while the rest re-flow (FLIP) */
      cards.forEach(function (c, i) {
        if (c.show || c.el.hidden || !before[i]) return;
        var r = before[i], g = c.el.cloneNode(true);
        g.classList.add('ec-ghost'); g.setAttribute('aria-hidden', 'true'); g.removeAttribute('href'); g.tabIndex = -1;
        g.style.cssText = 'position:absolute;left:' + (r.left - gr.left) + 'px;top:' + (r.top - gr.top) + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
        grid.appendChild(g);
        g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.96)' }], { duration: 260, easing: EASE, fill: 'forwards' })
          .onfinish = function () { g.remove(); };
      });
    }
    cards.forEach(function (c) { c.el.hidden = !c.show; });
    empty.hidden = n > 0;
    /* later sections' scroll triggers were measured against the old grid height */
    clearTimeout(apply.t); apply.t = setTimeout(function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); }, animate && !reduce ? 600 : 0);
    if (!animate || reduce) return;
    var h1 = grid.getBoundingClientRect().height, k = 0;
    if (Math.abs(h1 - h0) > 1) grid.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 520, easing: EASE });
    cards.forEach(function (c, i) {
      if (!c.show) return;
      var r = c.el.getBoundingClientRect(), f = before[i];
      if (f) {
        var dx = f.left - r.left, dy = f.top - r.top;
        if (Math.abs(dx) > .5 || Math.abs(dy) > .5) c.el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 560, easing: EASE });
      } else {
        c.el.animate([{ opacity: 0, transform: 'translateY(10px) scale(.97)' }, { opacity: 1, transform: 'none' }],
          { duration: 520, delay: 90 + k++ * 45, easing: EASE, fill: 'backwards' });
      }
    });
  }
  /* phones: the segmented control scrolls sideways; fade the clipped edge and keep the chosen tab in view */
  function edges() {
    var max = tl.scrollWidth - tl.clientWidth;
    tl.classList.toggle('fade-r', max > 2 && tl.scrollLeft < max - 2);
    tl.classList.toggle('fade-l', max > 2 && tl.scrollLeft > 2);
  }
  tl.addEventListener('scroll', edges, { passive: true });
  window.addEventListener('resize', edges);
  tl.addEventListener('xp:tab', function (e) {
    var t = e.detail && e.detail.tab, v = t && t.dataset.value;
    if (t && tl.scrollWidth > tl.clientWidth) tl.scrollTo({ left: Math.max(0, t.offsetLeft - (tl.clientWidth - t.offsetWidth) / 2), behavior: reduce ? 'auto' : 'smooth' });
    if (v && v !== cur) { cur = v; apply(true); }
  });
  q.addEventListener('input', function () { apply(true); });
  apply(false);
  if (XP.tabs) XP.tabs(tl);
  edges();
  wire(grid);
  entrance(grid, '.eco-card');

  /* ---------- everyday services ---------- */
  var life = $('#lifeGrid');
  life.innerHTML = LIFE.map(function (p) {
    var tag = p.u ? 'a' : 'div', attr = p.u ? ' href="' + p.u + '" target="_blank" rel="noopener"' : '';
    return '<' + tag + ' class="card gcard life-card' + (p.st === 'Live' ? ' on-air' : '') + '"' + attr + '><span class="gc-glow" aria-hidden="true"></span>' + tile(p) +
      '<div class="life-b"><h3 class="t3">' + esc(p.n) + '</h3><p>' + esc(p.k) + '</p><p class="tags lt">' + tags(p.t) + '</p></div>' +
      '<div class="life-f"><span class="st' + (p.st === 'Live' ? ' st-ok' : '') + '">' + esc(p.st) + '</span>' +
      (p.u ? '<span class="lf-go">Visit <animate-icons name="arrow-up-right" size="12"></animate-icons></span>' : '<span class="by">by Seoul Labs</span>') + '</div></' + tag + '>';
  }).join('');
  wire(life);
  entrance(life, '.life-card');
})();
