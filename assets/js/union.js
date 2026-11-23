/* XPHERE site — union.js (union.html only). Runs after core.js (window.XP).
   Every graphic is built from facts already on the page: 31 slots (25 filled / 6 open), 35M XP stake (1M at application),
   40/40/20 block rewards, 50/20/20/10 fees, a reward every 60 blocks (live block height), −26.28% emission a year.
   Modules: seat/cell builders · live 60-block cycle · role diagram seat sweep · overview word light · section index ·
   reward flow map · emission chart · registration stepper. */
(function () {
  'use strict';
  var XP = window.XP || {}, reduce = !!XP.reduce || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var NS = 'http://www.w3.org/2000/svg';
  function f(n) { return (Math.round(n * 10) / 10).toString(); }

  /* ---------- cell builders ---------- */
  function cells(el, n, cls) {
    if (!el) return [];
    var out = [];
    for (var i = 0; i < n; i++) { var c = document.createElement('i'); var k = cls ? cls(i) : ''; if (k) c.className = k; c.style.setProperty('--k', i); el.appendChild(c); out.push(c); }
    return out;
  }
  var seats = cells($('#rlSeats'), 31);
  cells($('#bnSeats'), 31, function (i) { return i < 25 ? '' : i === 25 ? 'me' : 'o'; });
  cells($('#cells'), 31, function (i) { return i < 25 ? '' : 'o'; }).forEach(function (c, i) { if (i >= 25) c.style.setProperty('--k', i - 25); });
  cells($('#qMeter'), 35);
  var gv = $('#gvVotes'); if (gv) { cells(gv, 31); var fd = document.createElement('i'); fd.className = 'fd'; gv.appendChild(fd); }
  var cycA = cells($('#bkCyc'), 60), cycB = cells($('#fxCyc'), 60);
  var em = $('#fxEm'); if (em) for (var y = 0; y < 8; y++) { var b = document.createElement('i'); b.style.height = (100 * Math.pow(1 - .2628, y)).toFixed(1) + '%'; em.appendChild(b); }

  /* ---------- live: position in the 60-block reward cycle (from the real block height) ---------- */
  var bk = $('#bk'), lastSweep = 0;
  function cycle(n) {
    if (n == null || !isFinite(n)) return;
    var p = n % 60 || 60;
    if (bk) bk.textContent = p;
    [cycA, cycB].forEach(function (set) { set.forEach(function (c, i) { c.className = i < p - 1 ? 'f' : i === p - 1 ? 'c' : ''; }); });
  }
  var dia = $('#roleDia'), diaVis = false;
  if (dia && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { diaVis = es[0].isIntersecting; }).observe(dia);
  function sweep() {   /* each new Main Chain block: a validation round passes over the 31 seats (throttled) */
    if (reduce || !diaVis) return;
    var t = performance.now(); if (t - lastSweep < 2600) return; lastSweep = t;
    seats.forEach(function (s) { s.classList.remove('sw'); }); void dia.offsetWidth;
    seats.forEach(function (s) { s.classList.add('sw'); });
  }
  if (XP.on) {
    XP.on('stats', function (s) { if (s && s.block != null) cycle(s.block); });
    XP.on('block', function (n) { cycle(n); sweep(); });
  }


  /* ---------- hero seat arc (page-local renderer): 31 seats on three arcs (9/10/12).
     Members = the 25 member slots stated in the copy (solid); seats above 25 that the live council fills are the
     Foundation's interim nodes (hatched ember, as in the "4 interim nodes" tile); the rest are open (outline).
     Each new Main Chain block sweeps a validation round across the lit seats. ---------- */
  (function () {
    var cv = $('#uSeats'); if (!cv) return;
    var x = cv.getContext('2d'), MEM = 25, council = null, landT = -1e9, seats = [], W = 0, H = 0, dpr = 1, vis = true, raf = 0, hatch = null;
    var MARK = new Path2D('M255.99 213.612 C254.687 185.112 219.662 142.844 200.545 121.863 C187.258 107.292 171.293 91.662 154.804 77.347 C163.154 71.682 171.162 66.879 178.544 63.09 C190.935 75.033 199.06 91.575 200.545 109.394 C211.559 97.313 222.065 84.669 231.456 71.375 C240.054 59.024 248.12 46.175 253.107 31.925 C258.494 16.617 257.81 0.272 237.761 0.002 C230.925 -0.064 224.183 1.506 217.667 3.491 C209.754 5.952 202.125 9.186 194.64 12.792 C186.567 16.705 178.785 21.012 171.024 25.677 C161.451 31.444 152.176 37.62 142.988 44.182 C138.045 47.716 133.036 51.446 127.998 55.337 C122.953 51.446 117.951 47.716 113.008 44.182 C103.828 37.62 94.546 31.444 84.973 25.677 C77.219 21.012 69.429 16.705 61.356 12.792 C53.872 9.186 46.242 5.944 38.329 3.491 C31.827 1.506 25.079 -0.056 18.243 0.002 C-1.807 0.272 -2.484 16.617 2.904 31.925 C7.898 46.175 15.957 59.016 24.555 71.375 C33.939 84.676 44.451 97.313 55.466 109.394 C56.951 91.575 65.076 75.04 77.466 63.09 C84.848 66.879 92.857 71.682 101.207 77.347 C84.718 91.67 68.76 107.292 55.466 121.863 C37.579 141.683 20.529 162.635 8.364 186.462 C3.369 196.762 -4.216 214.158 2.911 224.744 C11.363 236.161 32.075 229.993 43.308 226.116 C68.403 216.896 91.19 202.486 113.016 187.082 C95.558 183.44 80.175 173.344 69.859 159.554 C81.952 141.23 105.56 116.074 128.012 97.626 C150.479 116.089 174.06 141.216 186.167 159.554 C175.85 173.336 160.468 183.44 143.002 187.082 C163.372 201.515 184.623 214.911 207.752 224.255 C223.04 230.511 256.317 240.126 255.998 213.626 Z');
    function tk(n) { return getComputedStyle(cv).getPropertyValue(n).trim(); }
    function layout() {
      var r = cv.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      var cx = W / 2, cy = H - 24, R2 = Math.min(W * .36, H - 52), rows = [9, 10, 12], radii = [R2 * .58, R2 * .79, R2], A0 = Math.PI * .06;
      seats = [];
      rows.forEach(function (cnt, ri) { for (var i = 0; i < cnt; i++) { var a = Math.PI - A0 - i / (cnt - 1) * (Math.PI - 2 * A0); seats.push({ x: cx + Math.cos(a) * radii[ri], y: cy - Math.sin(a) * radii[ri], a: a, r: ri }); } });
      seats.sort(function (p, q) { return (q.a - p.a) || (p.r - q.r); });
      seats.cx = cx; seats.cy = cy; seats.R = R2; seats.radii = radii; seats.A0 = A0;
      hatch = null; draw();
    }
    function pattern(col) {
      var p = document.createElement('canvas'), s = Math.round(4 * dpr); p.width = p.height = s;
      var c = p.getContext('2d'); c.strokeStyle = col; c.lineWidth = 1.1 * dpr;
      c.beginPath(); c.moveTo(0, s); c.lineTo(s, 0); c.moveTo(-1, 1); c.lineTo(1, -1); c.moveTo(s - 1, s + 1); c.lineTo(s + 1, s - 1); c.stroke();
      var pt = x.createPattern(p, 'repeat');
      if (pt && pt.setTransform && window.DOMMatrix) pt.setTransform(new DOMMatrix().scale(1 / dpr));
      return pt;
    }
    function draw() {
      raf = 0;
      if (!W) return;
      var now = performance.now(), wa = reduce ? 9 : (now - landT) / 1000;
      var red = tk('--tk-red'), emb = tk('--live'), ln = tk('--line-2'), ln3 = tk('--line-3'), hi = tk('--accent-2'), brand = tk('--brand');
      if (!hatch) hatch = pattern(emb);
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
      x.fillStyle = ln; x.fillRect(seats.cx - seats.R - 14, seats.cy + 6, (seats.R + 14) * 2, 1);
      x.strokeStyle = ln; x.lineWidth = 1;
      seats.radii.forEach(function (rr) { x.beginPath(); x.arc(seats.cx, seats.cy, rr, Math.PI + seats.A0 * .5, -seats.A0 * .5); x.stroke(); });
      var sw = Math.min(seats.radii[0] * .52, 30), sc = sw / 256;
      x.save(); x.translate(seats.cx - sw / 2, seats.cy - sw * 231.3 / 256 - 4); x.scale(sc, sc); x.fillStyle = brand; x.fill(MARK); x.restore();
      var lit = council == null ? MEM : Math.min(31, council), mem = Math.min(MEM, lit);
      seats.forEach(function (st, i) {
        var kind = i < mem ? 'm' : i < lit ? 'i' : 'o', r = 4;
        x.beginPath(); x.arc(st.x, st.y, r, 0, Math.PI * 2);
        if (kind === 'm') { x.fillStyle = red; x.fill(); }
        else if (kind === 'i') { x.fillStyle = hatch; x.fill(); x.strokeStyle = emb; x.lineWidth = 1.2; x.stroke(); }
        else { x.beginPath(); x.arc(st.x, st.y, r - .5, 0, Math.PI * 2); x.strokeStyle = ln3; x.lineWidth = 1; x.stroke(); }
        if (kind !== 'o' && wa < 1.4) {
          var ph = wa * 1.5 - (1 - st.a / Math.PI) * .9 - .05, w = Math.exp(-ph * ph * 60);
          if (w > .03) { x.globalAlpha = w * .85; x.beginPath(); x.arc(st.x, st.y, r + 1.5, 0, Math.PI * 2); x.fillStyle = hi; x.fill(); x.globalAlpha = 1; }
        }
      });
      if (!reduce && vis && wa < 1.4) raf = requestAnimationFrame(draw);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(draw); }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) kick(); }).observe(cv);
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(cv); else window.addEventListener('resize', layout);
    if (XP.on) {
      XP.on('stats', function (s) { if (s && s.council != null && +s.council !== council) { council = +s.council; kick(); } });
      XP.on('block', function () { landT = performance.now(); kick(); });
      XP.on('theme', function () { hatch = null; requestAnimationFrame(draw); });
    }
    layout();
  })();

  /* ---------- responsibilities: "Validate blocks and record data" — one cell per Main Chain block as it is recorded (live) ---------- */
  (function () {
    var tr = $('#gvRecT'); if (!tr) return;
    var N = 40, started = false;
    for (var i = 0; i < N; i++) tr.appendChild(document.createElement('i'));
    function start() { if (started) return; started = true; $$('i', tr).forEach(function (c) { c.className = 'f'; }); }
    if (XP.on) {
      XP.on('stats', function (s) { if (s && s.block != null) start(); });
      XP.on('block', function () {
        start();
        $$('i.nw', tr).forEach(function (o) { o.classList.remove('nw'); });
        var c = document.createElement('i'); c.className = 'f nw'; tr.appendChild(c);
        while (tr.children.length > N) tr.firstElementChild.remove();
        if (!reduce) { tr.classList.remove('go'); void tr.offsetWidth; tr.classList.add('go'); }
      });
    }
  })();

  /* ---------- overview statement: words light up as it scrolls through ---------- */
  var st = $('#ustate'), words = [];
  if (st && !reduce) {
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var fr = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { fr.appendChild(document.createTextNode(t)); return; }
            var s = document.createElement('span'); s.className = 'w'; s.textContent = t; fr.appendChild(s); words.push(s);
          });
          node.replaceChild(fr, c);
        } else if (c.nodeType === 1) wrap(c);
      });
    })(st);
    st.classList.add('lit');
  }
  function light() {
    if (!words.length) return;
    var r = st.getBoundingClientRect(), vh = innerHeight, p = (vh * .86 - r.top) / (vh * .36);
    var n = Math.round(Math.max(0, Math.min(1, p)) * words.length);
    words.forEach(function (w, i) { w.classList.toggle('on', i < n); });
  }

  /* ---------- section index: appears after the hero, tracks the current section + page progress ---------- */
  var idx = $('#uIdx'), list = $('#uIdxList'), fill = $('#uIdxFill'), links = $$('a', list || document.createElement('i'));
  var secs = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var hero = $('.u-hero'), foot = $('#footer'), curIdx = -1;
  function index() {
    if (!idx) return;
    var vh = innerHeight, show = hero.getBoundingClientRect().bottom < 90 && foot.getBoundingClientRect().top > vh * .45;
    idx.classList.toggle('on', show);
    var a = -1;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < vh * .4) a = i; });
    if (a !== curIdx) {
      curIdx = a;
      links.forEach(function (l, i) { l.classList.toggle('on', i === a); });
      if (a > -1 && list.scrollWidth > list.clientWidth) {
        var l = links[a], to = l.offsetLeft - (list.clientWidth - l.offsetWidth) / 2;
        list.scrollTo({ left: Math.max(0, to), behavior: reduce ? 'auto' : 'smooth' });
      }
    }
    var top = secs[0].getBoundingClientRect().top + scrollY, end = foot.getBoundingClientRect().top + scrollY - vh;
    var p = Math.max(0, Math.min(1, (scrollY - top + vh * .4) / Math.max(1, end - top + vh * .4)));
    fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  }

  /* ---------- reward flow map: two sources split into four destinations (data from the copy) ---------- */
  (function () {
    var s = $('#sankey'); if (!s) return;
    var U = 1.5, X0 = 176, X1 = 800, NW = 10, h = '';
    var src = [{ k: 'Block Rewards', y: 20 }, { k: 'Transaction Fees', y: 222 }];
    var dst = [{ k: 'Union', c: 'un', sub: '40% of rewards + 20% of fees' }, { k: 'Miner', c: 'mn', sub: '40% of rewards + 20% of fees' },
               { k: 'Foundation', c: 'fd', sub: '20% of rewards + 10% of fees' }, { k: 'Burned', c: 'bn', sub: '50% of fees, removed from supply' }];
    var flows = [[0, 0, 40], [0, 1, 40], [0, 2, 20], [1, 0, 20], [1, 1, 20], [1, 2, 10], [1, 3, 50]];
    var y = 20, gap = 17;
    dst.forEach(function (d, i) { d.v = 0; flows.forEach(function (fl) { if (fl[1] === i) d.v += fl[2]; }); d.y = y; d.h = d.v * U; d.f = y; y += d.h + gap; });
    src.forEach(function (o) { o.f = o.y; o.h = 100 * U; });
    h += '<defs><linearGradient id="skU" x1="0" x2="1"><stop offset="0" class="sk-stop-a"/><stop offset="1" class="sk-stop-b"/></linearGradient>' +
      '<pattern id="skB" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="sk-hatch-bg"/><rect width="2" height="6" class="sk-hatch"/></pattern></defs>';
    var g = '', p = '', lbl = '';
    flows.forEach(function (fl, i) {
      var a = src[fl[0]], d = dst[fl[1]], t = fl[2] * U, ya = a.f, yb = d.f; a.f += t; d.f += t;
      var xa = X0 + NW, xb = X1, mx = (xa + xb) / 2;
      var path = 'M' + xa + ',' + f(ya) + ' C' + mx + ',' + f(ya) + ' ' + mx + ',' + f(yb) + ' ' + xb + ',' + f(yb) + ' L' + xb + ',' + f(yb + t) + ' C' + mx + ',' + f(yb + t) + ' ' + mx + ',' + f(ya + t) + ' ' + xa + ',' + f(ya + t) + 'Z';
      g += '<path class="rb ' + d.c + '" data-d="' + d.c + '" d="' + path + '" style="--i:' + i + '"/>';
      lbl += '<text class="pc' + (d.c === 'un' ? ' on' : '') + '" x="' + (xa + 10) + '" y="' + f(ya + t / 2 + 4) + '">' + fl[2] + '%</text>';
      if (d.c === 'un' && !reduce) {
        var c = 'M' + xa + ',' + f(ya + t / 2) + ' C' + mx + ',' + f(ya + t / 2) + ' ' + mx + ',' + f(yb + t / 2) + ' ' + xb + ',' + f(yb + t / 2);
        for (var j = 0; j < 3; j++) p += '<circle class="pt" r="2.2"><animateMotion dur="3.6s" begin="' + (-j * 1.2 - i * .4).toFixed(1) + 's" repeatCount="indefinite" path="' + c + '"/></circle>';
      }
    });
    h += '<g class="rbs">' + g + '</g>' + p + lbl;
    src.forEach(function (o) {
      h += '<rect class="nd" x="' + X0 + '" y="' + o.y + '" width="' + NW + '" height="' + o.h + '" rx="2"/>' +
        '<text class="nk" x="' + (X0 - 16) + '" y="' + (o.y + o.h / 2 - 4) + '" text-anchor="end">' + o.k + '</text>' +
        '<text class="nv" x="' + (X0 - 16) + '" y="' + (o.y + o.h / 2 + 15) + '" text-anchor="end">100%</text>';
    });
    dst.forEach(function (d) {
      h += '<g class="dn" data-d="' + d.c + '"><rect class="nd ' + d.c + '" x="' + X1 + '" y="' + f(d.y) + '" width="' + NW + '" height="' + f(d.h) + '" rx="2"/>' +
        '<rect x="' + X1 + '" y="' + f(d.y) + '" width="256" height="' + f(d.h) + '" fill="transparent"/>' +
        '<text class="nk" x="' + (X1 + NW + 16) + '" y="' + f(d.y + d.h / 2 - 3) + '">' + d.k + '</text>' +
        '<text class="ns" x="' + (X1 + NW + 16) + '" y="' + f(d.y + d.h / 2 + 14) + '">' + d.sub + '</text></g>';
    });
    s.innerHTML = h;
    $$('.dn', s).forEach(function (n) {
      var k = n.getAttribute('data-d');
      n.addEventListener('mouseenter', function () { s.classList.add('hl'); $$('.rb', s).forEach(function (r) { r.classList.toggle('on', r.getAttribute('data-d') === k); }); n.classList.add('on'); });
      n.addEventListener('mouseleave', function () { s.classList.remove('hl'); $$('.rb.on, .dn.on', s).forEach(function (r) { r.classList.remove('on'); }); });
    });
  })();

  /* ---------- emission: −26.28% a year, relative to year 1 (drawn at the real pixel width so labels stay 11px) ---------- */
  (function () {
    var s = $('#curveSvg'); if (!s) return;
    var lastW = 0;
    function draw() {
      var W = Math.round(s.parentNode.clientWidth - 48 > 0 ? s.getBoundingClientRect().width : 560);
      if (!W || Math.abs(W - lastW) < 2) return; lastW = W;
      var sm = W < 480, H = sm ? 230 : 300, L = 2, R = W - 2, T = sm ? 34 : 40, B = H - 36, n = 8, sw = (R - L) / n, bw = Math.min(38, sw * .56), h = '', pts = [];
      s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      h += '<defs><linearGradient id="cvA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="cvA-a"/><stop offset="1" class="cvA-b"/></linearGradient></defs>';
      for (var i = 1; i <= 4; i++) { var gy = B - (B - T) * i / 4; h += '<line class="gl" x1="' + L + '" y1="' + f(gy) + '" x2="' + R + '" y2="' + f(gy) + '"/>'; }
      var bars = '';
      for (i = 0; i < n; i++) {
        var v = Math.pow(1 - .2628, i), bh = (B - T) * v, cx = L + sw * i + sw / 2;
        bars += '<rect class="bar' + (i ? '' : ' y1') + '" x="' + f(cx - bw / 2) + '" y="' + f(B - bh) + '" width="' + f(bw) + '" height="' + f(bh) + '" rx="3" style="--i:' + i + '"/>';
        pts.push([cx, B - bh]);
        h += '<text class="ax" x="' + f(cx) + '" y="' + (B + 24) + '" text-anchor="middle">Y' + (i + 1) + '</text>';
      }
      h += bars + '<line class="gb" x1="' + L + '" y1="' + B + '" x2="' + R + '" y2="' + B + '"/>';
      h += '<path class="ln" d="M' + pts.map(function (q) { return f(q[0]) + ',' + f(q[1] - 8); }).join(' L') + '"/>';
      pts.forEach(function (q, j) { h += '<circle class="pt' + (j ? '' : ' y1') + '" cx="' + f(q[0]) + '" cy="' + f(q[1] - 8) + '" r="3"/>'; });
      h += '<text class="tg" x="' + f(pts[0][0] + 12) + '" y="' + f(pts[0][1] - 4) + '">EARLIER MEMBERS</text>';
      s.innerHTML = h;
    }
    draw();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(draw, 120); });
  })();
  /* draw-in once visible */
  (function () {
    var els = $$('#sankey, #curveSvg');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .3 });
    els.forEach(function (e) { io.observe(e); });
  })();

  /* ---------- registration stepper: rail fills, steps light, the side panel follows ---------- */
  var steps = $('#steps'), rail = $('#prFill'), lis = steps ? $$('li', steps) : [], last = 0;
  var PN = ['Application', 'Evaluation', 'Registration', 'Support', 'Obligation'];
  function pane(n) {
    if (n === last) return; last = n;
    if ($('#psn')) $('#psn').textContent = '0' + n;
    $('#pamt').textContent = n >= 3 ? '35M' : '1M';
    $('#pbar').style.width = (n >= 3 ? 100 : 100 / 35) + '%';
    $('#pcur').textContent = PN[n - 1];
    $$('#psteps i').forEach(function (d, j) { d.className = j < n - 1 ? 'd' : (j === n - 1 ? 'c' : ''); });
  }
  function stepper() {
    if (!steps) return;
    var r = steps.getBoundingClientRect(), mid = innerHeight * .55, n = 0;
    var p = Math.max(0, Math.min(1, (mid - r.top - 30) / Math.max(1, r.height - 60)));
    rail.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    lis.forEach(function (li) { var on = li.getBoundingClientRect().top + 30 < mid; li.classList.toggle('on', on); if (on) n++; });
    pane(Math.max(1, n));
  }

  /* ---------- one scroll loop ---------- */
  var queued = false;
  function frame() { queued = false; light(); index(); stepper(); }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  if (XP.lenis) XP.lenis.on('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();
})();
