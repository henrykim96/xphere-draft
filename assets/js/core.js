/* XPHERE site — core.js (every page). Vanilla JS + GSAP/ScrollTrigger + Lenis (CDN, loaded by the scripts partial).
   block-stream.js (2D ledger renderers) and glass.js (three.js mark) load first; page scripts (home.js, …) load after.
   Exposes window.XP (see SITE.md):
     XP.reduce · XP.lenis · XP.$ / XP.$$ · XP.playIcons(host) · XP.splitWords(el) · XP.reveal(selectorOrEls)
     XP.on('block'|'burn'|'theme'|'stats', fn) · XP.rpc.batch([...]) / XP.rpc.post(body) / XP.rpc.getBlocks(a,b)
     XP.set(key, text) (writes every [data-xp-stat=key]) · XP.group(n) · XP.ring(el) · XP.tabs(el)
   Modules: theme toggle · Lenis · animated icons · header/dropdowns/mobile menu · word reveal · live Mainnet stats ·
   section hairlines · marquee clones · pointer light · ring charts · copy · tabs · accordion · in-page anchors ·
   scroll reveals. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var mqMobile = window.matchMedia('(max-width: 960px)');
  var mqPhone = window.matchMedia('(max-width: 760px)');
  var evts = {};
  function on(n, fn) { (evts[n] = evts[n] || []).push(fn); }
  function emit(n, d) { (evts[n] || []).forEach(function (fn) { try { fn(d); } catch (e) { console.warn('[XP] ' + n, e); } }); }
  var XP = window.XP = { reduce: reduce, hasGsap: hasGsap, $: $, $$: $$, mqMobile: mqMobile, mqPhone: mqPhone, on: on, emit: emit, lenis: null };

  /* ---------- theme: toggle (View Transition circle reveal), persisted, follows the system until chosen ---------- */
  var tt = $('#themeToggle'), meta = $('meta[name="theme-color"]');
  function cur() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function sync() { if (tt) tt.setAttribute('aria-checked', cur() === 'light' ? 'true' : 'false'); }
  function applyTheme(t, persist) {
    root.setAttribute('data-theme', t);
    if (meta) meta.content = t === 'light' ? '#f6f4f2' : '#0b0909';
    if (window.XPStream) XPStream.setTheme(t);
    if (window.XPGL) XPGL.setTheme(t);
    if (persist) { try { localStorage.setItem('xp-theme', t); } catch (e) {} }
    sync(); emit('theme', t);
  }
  XP.theme = cur; XP.setTheme = applyTheme;
  sync();
  if (tt) tt.addEventListener('click', function () {
    var next = cur() === 'light' ? 'dark' : 'light';
    var r = tt.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (document.startViewTransition && !reduce) {
      var vt = document.startViewTransition(function () { applyTheme(next, true); });
      vt.ready.then(function () {
        var R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 760, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(function () {});
    } else {
      root.classList.add('theming'); applyTheme(next, true);
      setTimeout(function () { root.classList.remove('theming'); }, 520);
    }
  });
  (function () {
    var chosen = false;
    try { chosen = !!localStorage.getItem('xp-theme') || /[?&]theme=/.test(location.search); } catch (e) {}
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    if (mq.addEventListener) mq.addEventListener('change', function (e) { if (!chosen) applyTheme(e.matches ? 'light' : 'dark', false); });
  })();

  /* ---------- smooth scroll (window.lenis) ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    window.lenis = XP.lenis = lenis;
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- animated icons: play on host hover / focus ---------- */
  function playIcons(host) { if (host) $$('animate-icons', host).forEach(function (i) { try { i.startAnimation && i.startAnimation(); } catch (e) {} }); }
  XP.playIcons = playIcons;
  $$('a, button, .kf, .pc, .evc, .pt, .card, [data-icons-host]').forEach(function (h) {
    if (!h.querySelector('animate-icons')) return;
    h.addEventListener('mouseenter', function () { playIcons(h); });
    h.addEventListener('focus', function () { playIcons(h); });
  });
  if ('IntersectionObserver' in window) {   /* [data-icons-inview]: play once when 60% visible */
    var iio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { playIcons(e.target); iio.unobserve(e.target); } }); }, { threshold: .6 });
    $$('[data-icons-inview]').forEach(function (k) { iio.observe(k); });
  }

  /* ---------- header ---------- */
  var hdr = $('#hdr');
  if (hdr) {
    var onScrollHdr = function (y) { hdr.classList.toggle('scrolled', y > 24); };
    if (lenis) lenis.on('scroll', function (e) { onScrollHdr(e.scroll); });
    window.addEventListener('scroll', function () { onScrollHdr(window.scrollY); }, { passive: true });
    onScrollHdr(window.scrollY);

    var dds = $$('.dd', hdr);
    var closeAll = function (except) { dds.forEach(function (d) { if (d !== except) { d.classList.remove('open'); $('.dd-t', d).setAttribute('aria-expanded', 'false'); } }); };
    dds.forEach(function (dd) {
      var t = $('.dd-t', dd);
      t.addEventListener('click', function (e) {
        e.stopPropagation(); closeAll(dd);
        var vis = dd.classList.contains('open') || (!mqMobile.matches && !dd.classList.contains('shut') && dd.matches(':hover'));
        var o = !vis; dd.classList.toggle('open', o); dd.classList.toggle('shut', !o && !mqMobile.matches);
        t.setAttribute('aria-expanded', o ? 'true' : 'false');
        if (o) playIcons(t);
      });
      dd.addEventListener('mouseenter', function () { if (!mqMobile.matches) { t.setAttribute('aria-expanded', 'true'); playIcons(t); } });
      dd.addEventListener('mouseleave', function () { dd.classList.remove('shut'); if (!mqMobile.matches && !dd.classList.contains('open')) t.setAttribute('aria-expanded', 'false'); });
      dd.addEventListener('focusout', function (e) { if (!dd.contains(e.relatedTarget) && !mqMobile.matches) { dd.classList.remove('open'); t.setAttribute('aria-expanded', 'false'); } });
    });
    document.addEventListener('click', function (e) { dds.forEach(function (d) { if (!d.contains(e.target)) { d.classList.remove('open'); $('.dd-t', d).setAttribute('aria-expanded', 'false'); } }); });

    var burger = $('#burger'), menu = $('#menu');
    var setMenu = function (open) {
      menu.classList.toggle('open', open); hdr.classList.toggle('menu-open', open); burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (lenis) open ? lenis.stop() : lenis.start();
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function (e) { e.stopPropagation(); setMenu(!menu.classList.contains('open')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    mqMobile.addEventListener && mqMobile.addEventListener('change', function () { if (!mqMobile.matches) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = dds.filter(function (d) { return d.classList.contains('open'); })[0];
      closeAll(null);
      if (open) $('.dd-t', open).focus();
      if (menu.classList.contains('open')) { setMenu(false); burger.focus(); }
    });
    var logo = $('.logo', hdr);   /* href="#" only on index: smooth scroll to top */
    if (logo && logo.getAttribute('href') === '#') logo.addEventListener('click', function (e) { e.preventDefault(); if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ---------- word reveal [data-gen] (words wrapped at runtime; copy unchanged). #hero is started by home.js ---------- */
  function splitWords(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var parts = ch.textContent.split(/( +|\n+)/), frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^[ \n]+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = p; frag.appendChild(s);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch);
      });
    })(el);
  }
  XP.splitWords = splitWords;
  var gens = $$('[data-gen]');
  gens.forEach(splitWords);
  if ('IntersectionObserver' in window && !reduce) {
    var gio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); gio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    gens.forEach(function (g) { if (!g.closest('#hero')) gio.observe(g); });
  } else gens.forEach(function (g) { if (!g.closest('#hero')) g.classList.add('in'); });

  /* ---------- live Mainnet stats (logic from the draft) + real block data for the ledger canvases ----------
     Fills [data-xp-stat="block|council|gas|burn"] and [data-xp-live] on any page; feeds XPStream; emits
     'stats' {block,council,gas}, 'block' (number) and 'burn' {value,changed}. Starts only if the page needs it. */
  var RPC = ['https://en-hkg.x-phere.com', 'https://en-bkk.x-phere.com'], idx = 0;
  function group(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function hex(h) { if (typeof h !== 'string') return null; var n = parseInt(h, 16); return isFinite(n) ? n : null; }
  function post(body, tries) {
    tries = tries || RPC.length;
    return fetch(RPC[idx % RPC.length], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function (e) { idx++; if (tries > 1) return post(body, tries - 1); throw e; });
  }
  function batch(calls) {
    var body = calls.map(function (c, i) { return typeof c === 'string' ? { jsonrpc: '2.0', id: i + 1, method: c, params: [] } : { jsonrpc: '2.0', id: i + 1, method: c[0], params: c[1] }; });
    return post(body).then(function (j) { var by = {}; (Array.isArray(j) ? j : [j]).forEach(function (x) { by[x.id] = x; }); return body.map(function (p) { var x = by[p.id]; return x && !x.error ? x.result : null; }); });
  }
  function getBlocks(from, to) {
    var calls = []; for (var n = from; n <= to; n++) calls.push(['eth_getBlockByNumber', ['0x' + n.toString(16), false]]);
    return calls.length ? batch(calls).then(function (r) { return r.filter(function (b) { return b && b.hash; }); }) : Promise.resolve([]);
  }
  XP.rpc = { post: post, batch: batch, getBlocks: getBlocks, hex: hex };
  XP.group = group;
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  /* odometer: changed digits roll up */
  function paint(el, v) {
    var prev = el.__v; el.__v = v;
    if (prev == null || reduce || prev === v) { el.textContent = v; if (prev == null) { el.classList.remove('od-flash'); void el.offsetWidth; el.classList.add('od-flash'); } return; }
    var off = v.length - prev.length, out = '<span class="sr">' + esc(v) + '</span><span aria-hidden="true">';
    for (var i = 0; i < v.length; i++) {
      var c = v[i], o = prev[i - off];
      if (/\d/.test(c) && o !== undefined && o !== c && /\d/.test(o)) out += '<span class="od roll"><span><b>' + o + '</b><b>' + c + '</b></span></span>';
      else out += esc(c);
    }
    el.innerHTML = out + '</span>';
  }
  function set(k, v) { $$('[data-xp-stat="' + k + '"]').forEach(function (el) { if (el.__v === v) return; paint(el, v); }); }
  XP.set = set; XP.paint = paint;
  function live(ok) { $$('[data-xp-live]').forEach(function (el) { el.classList.toggle('down', !ok); if (!el.classList.contains('live-dot')) el.textContent = ok ? 'Live' : 'Offline'; }); }

  function blockFx(n) {
    $$('.hs-pulse, .bd-pulse, .sec.near .sec-line, [data-xp-pulse]').forEach(function (p) { p.classList.remove('go'); void p.offsetWidth; p.classList.add('go'); });
    if (window.XPGL) XPGL.pulse();
    emit('block', n);
  }
  var shown = null, queue = [], tickT = 0, fetchedTo = null, cache = {};
  function tick() {
    var n = queue.shift();
    if (n == null) { clearInterval(tickT); tickT = 0; return; }
    shown = n; set('block', group(n));
    if (cache[n] && window.XPStream) XPStream.land(cache[n]);
    delete cache[n];
    blockFx(n);
    if (!queue.length) { clearInterval(tickT); tickT = 0; }
  }
  function enqueue(h) {
    var from = Math.max(shown + 1, h - 7);
    for (var n = from; n <= h; n++) if (queue.indexOf(n) < 0) queue.push(n);
    clearInterval(tickT); tick();
    if (queue.length) tickT = setInterval(tick, Math.min(1000, 2900 / (queue.length + 1)));
  }
  var backfilled = false, wantBlocks = !!window.XPStream && !!$('#heroStream, #buildStream, #tokStream, #ptStake, #ptMine, #ptUnion, #ftStream, [data-xp-stream]');
  function onBlock(h) {
    if (shown === null) {
      shown = h; fetchedTo = h; set('block', group(h));
      if (!backfilled && wantBlocks) {
        backfilled = true;
        getBlocks(h - (mqPhone.matches ? 47 : 63), h).then(function (list) { if (window.XPStream && list.length) XPStream.history(list); }).catch(function () {});
      }
      return;
    }
    var last = queue.length ? queue[queue.length - 1] : shown;
    if (h <= last) return;
    var from = Math.max(fetchedTo + 1, h - 7);
    fetchedTo = h;
    (wantBlocks ? getBlocks(from, h) : Promise.resolve([]))
      .then(function (list) { list.forEach(function (b) { cache[parseInt(b.number, 16)] = b; }); })
      .catch(function () {})
      .then(function () { enqueue(h); });
  }
  function refresh() {
    batch(['eth_blockNumber', 'xp_getCouncilSize', 'eth_gasPrice']).then(function (o) {
      var h = hex(o[0]), c = typeof o[1] === 'number' ? o[1] : hex(o[1]), g = hex(o[2]), gs = null;
      if (h !== null) onBlock(h);
      if (c !== null) { set('council', String(c)); if (window.XPStream) XPStream.setCouncil(c); }
      if (g !== null) { var gw = g / 1e9; gs = (gw < 10 ? gw.toFixed(2) : gw.toFixed(1)) + ' gwei'; set('gas', gs); }
      live(h !== null);
      if (h === null && window.XPStream) XPStream.offline();
      emit('stats', { block: h, council: c, gas: gs, gasWei: g });
    }).catch(function () { live(false); if (window.XPStream) XPStream.offline(); emit('stats', null); });
  }
  /* cumulative XP burned — RewardDistributor.totalBurned() */
  function burn() {
    post({ jsonrpc: '2.0', id: 9, method: 'eth_call', params: [{ to: '0x24C5912B63a8B41DA80EBDC2115949fcbb41Fddf', data: '0xd89135cd' }, 'latest'] })
      .then(function (j) {
        if (!j || !j.result) return;
        var xp = BigInt(j.result) / 1000000000000000000n, v = group(xp.toString()), el = $('[data-xp-stat="burn"]');
        var changed = !!el && el.__v !== v; set('burn', v);
        emit('burn', { value: v, changed: changed });
      }).catch(function () {});
  }
  var liveOn = false;
  XP.live = function () {          /* idempotent; call it if a page adds live elements later */
    if (liveOn) return; liveOn = true;
    refresh(); setInterval(function () { if (!document.hidden) refresh(); }, 3000);
    burn(); setInterval(function () { if (!document.hidden) burn(); }, 30000);
  };
  if ($('[data-xp-stat], [data-xp-live]') || wantBlocks) XP.live();

  /* ---------- section hairlines (.sec.band): catch light once on entry, carry each block while near ---------- */
  (function () {
    var secs = $$('.sec.band');   /* dividers only where the surface changes */
    secs.forEach(function (s) { var l = document.createElement('i'); l.className = 'sec-line'; l.setAttribute('aria-hidden', 'true'); s.insertBefore(l, s.firstChild); });
    if (!('IntersectionObserver' in window) || reduce) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('near', e.isIntersecting); if (e.isIntersecting) e.target.classList.add('glint'); }); }, { rootMargin: '0px 0px -25% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  })();

  /* ---------- marquee (.mq-track > .mq-set): clone each set for a seamless loop (clone is aria-hidden + data-dup) ---------- */
  $$('.mq-track').forEach(function (tr) {
    var set0 = $('.mq-set', tr), c = set0.cloneNode(true);
    c.setAttribute('aria-hidden', 'true'); c.setAttribute('data-dup', '');
    $$('img', c).forEach(function (im) { im.alt = ''; });
    tr.appendChild(c);
  });

  /* ---------- pointer light on cells / cards ---------- */
  if (window.matchMedia('(hover:hover)').matches) {
    $$('.cell, .gcard, .evc, .card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
    });
  }

  /* ---------- ring charts: .tk-ring[data-split="40,40,20"][data-c="ink,ember,mute"] (+ sibling .tk-leg hover) ---------- */
  function ring(w) {
    var sp = w.dataset.split.split(',').map(Number), cs = w.dataset.c.split(','), R = 88, C = 2 * Math.PI * R, gap = 3, acc = 0;
    var o = '<svg viewBox="0 0 212 212" aria-hidden="true"><circle class="trk" cx="106" cy="106" r="' + R + '"/>';
    for (var t = 0; t < 60; t++) { var a = t / 60 * Math.PI * 2, r1 = 99, r2 = t % 5 ? 101 : 104; o += '<line class="tick" x1="' + (106 + r1 * Math.cos(a)).toFixed(2) + '" y1="' + (106 + r1 * Math.sin(a)).toFixed(2) + '" x2="' + (106 + r2 * Math.cos(a)).toFixed(2) + '" y2="' + (106 + r2 * Math.sin(a)).toFixed(2) + '"/>'; }
    sp.forEach(function (v, i) {
      var len = Math.max(0, C * v / 100 - gap);
      o += '<circle class="seg" data-i="' + i + '" cx="106" cy="106" r="' + R + '" style="stroke:var(--tk-' + cs[i] + ');transition-delay:' + (i * .16) + 's" stroke-dasharray="' + len.toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + len.toFixed(2) + '" transform="rotate(' + (acc * 3.6).toFixed(2) + ' 106 106)"/>';
      acc += v;
    });
    w.insertAdjacentHTML('afterbegin', o + '</svg>');
    var segs = $$('.seg', w);
    function show() { segs.forEach(function (s) { s.setAttribute('stroke-dashoffset', '0'); s.style.strokeDashoffset = '0'; }); }
    if (reduce || !('IntersectionObserver' in window)) show();
    else { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { show(); io.disconnect(); } }, { threshold: .4 }); io.observe(w); }
    var leg = w.parentNode.querySelector('.tk-leg');
    if (leg) $$('li', leg).forEach(function (li, i) {
      li.addEventListener('mouseenter', function () { w.classList.add('hl'); segs.forEach(function (s, j) { s.classList.toggle('on', j === i); }); });
      li.addEventListener('mouseleave', function () { w.classList.remove('hl'); segs.forEach(function (s) { s.classList.remove('on'); }); });
    });
  }
  XP.ring = ring;
  $$('.tk-ring[data-split]').forEach(ring);

  /* ---------- copy: any [data-cp] (value = attribute; empty = text of the nearest .code pre / [data-cp-scope] pre|code) ---------- */
  function copyText(v) {
    try { if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(v).catch(fallbackCopy.bind(null, v)); } catch (e) {}
    fallbackCopy(v);
  }
  function fallbackCopy(v) {
    try { var ta = document.createElement('textarea'); ta.value = v; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;left:-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cp]');
    if (!b) return;
    var v = b.getAttribute('data-cp');
    if (!v) { var box = b.closest('.code, [data-cp-scope]'), src = box && box.querySelector('pre, code'); v = src ? src.innerText.replace(/\n$/, '') : ''; }
    if (!v) return;
    copyText(v);
    var t = $('.cp-t', b) || (b.children.length ? null : b), ic = $('.cp-i', b);
    if (t && b.__orig == null) b.__orig = t.textContent;
    if (t) t.textContent = 'Copied';
    b.classList.add('done'); if (ic) ic.setAttribute('name', 'check');
    clearTimeout(b.__t); b.__t = setTimeout(function () { if (t) t.textContent = b.__orig; b.classList.remove('done'); if (ic) ic.setAttribute('name', 'copy'); }, 1600);
  });

  /* ---------- tabs: .tabs[role=tablist] > .tab[role=tab][aria-controls] ; emits 'xp:tab' (bubbles) on the tablist ---------- */
  function tabs(tl) {
    var list = $$('[role="tab"]', tl);
    if (!list.length || tl.__tabs) return; tl.__tabs = true;
    var ind = document.createElement('i'); ind.className = 'tabs-ind'; ind.setAttribute('aria-hidden', 'true'); tl.insertBefore(ind, tl.firstChild);
    function move(t) { ind.style.width = t.offsetWidth + 'px'; ind.style.transform = 'translateX(' + t.offsetLeft + 'px)'; }
    function select(t, focus) {
      list.forEach(function (x) {
        var sel = x === t, p = x.getAttribute('aria-controls') && document.getElementById(x.getAttribute('aria-controls'));
        x.setAttribute('aria-selected', sel ? 'true' : 'false'); x.tabIndex = sel ? 0 : -1;
        if (p) { p.hidden = !sel; if (sel && !reduce) { p.classList.remove('tp-in'); void p.offsetWidth; p.classList.add('tp-in'); } }
      });
      move(t); if (focus) t.focus();
      tl.dispatchEvent(new CustomEvent('xp:tab', { bubbles: true, detail: { tab: t, value: t.dataset.value || t.textContent.trim() } }));
      if (hasGsap) ScrollTrigger.refresh();
    }
    list.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, j = list.indexOf(t);
        if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
          e.preventDefault();
          j = k === 'Home' ? 0 : k === 'End' ? list.length - 1 : (j + (k === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
          select(list[j], true);
        }
      });
    });
    var first = list.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || list[0];
    list.forEach(function (x) { var p = x.getAttribute('aria-controls') && document.getElementById(x.getAttribute('aria-controls')); x.setAttribute('aria-selected', x === first ? 'true' : 'false'); x.tabIndex = x === first ? 0 : -1; if (p) p.hidden = x !== first; });
    ind.style.transition = 'none'; move(first); void ind.offsetWidth; ind.style.transition = '';
    function re() { var s = list.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]; if (s) move(s); }
    window.addEventListener('resize', re);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(re);
  }
  XP.tabs = tabs;
  $$('.tabs[role="tablist"]').forEach(tabs);

  /* ---------- accordion: .acc-i > button.acc-t[aria-expanded] + .acc-p > .acc-in ---------- */
  function accOpen(i, o) {
    var t = $('.acc-t', i); i.classList.toggle('open', o); if (t) t.setAttribute('aria-expanded', o ? 'true' : 'false');
    if (o) playIcons(i);
    if (hasGsap) setTimeout(function () { ScrollTrigger.refresh(); }, 480);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.acc-t');
    if (!t) return;
    var i = t.closest('.acc-i'); if (i) accOpen(i, !i.classList.contains('open'));
  });

  /* ---------- in-page anchors: smooth with Lenis, clear the fixed header; open an accordion that holds the target ---------- */
  function target(hash) { try { return hash && hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; } catch (e) { return null; } }
  function revealTarget(el) { var i = el.closest && el.closest('.acc-i'); if (i && !i.classList.contains('open')) accOpen(i, true); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#' || e.defaultPrevented) return;
    var el = target(a.getAttribute('href')); if (!el) return;
    e.preventDefault(); revealTarget(el);
    if (lenis) lenis.scrollTo(el, { offset: -84 }); else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.pushState) history.pushState(null, '', a.getAttribute('href'));
  });
  if (location.hash) { var t0 = target(location.hash); if (t0) revealTarget(t0); }

  /* ---------- scroll reveals: these blocks rise in once; add [data-rv] to any element to join ---------- */
  XP.reveal = function (sel) {
    if (!hasGsap || reduce) return;
    gsap.set(sel, { opacity: 0, y: 16 });
    ScrollTrigger.batch(sel, {
      start: 'top 90%', once: true,
      onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .08, clearProps: 'transform,opacity' }); }
    });
  };
  if (hasGsap) {
    if (!reduce) {
      var sel = $$('.cells, .pt, .rm-col, .evc, .term, .evo2, [data-rv]').filter(function (el) { return !el.closest('[data-rv-off]'); });
      if (sel.length) XP.reveal(sel);
      $$('.sec-head').forEach(function (h) {
        var parts = $$('.eyebrow, .lede', h);
        if (parts.length) gsap.from(parts, { opacity: 0, y: 10, duration: .9, ease: 'expo.out', stagger: .08, clearProps: 'transform,opacity', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
      });
    }
    window.addEventListener('load', function () { ScrollTrigger.refresh(); if (window.XPStream) XPStream.relayout(); });
  }
})();
