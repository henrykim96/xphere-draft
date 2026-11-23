/* XPHERE B5 — block stream renderers (canvas 2D). Every lit cell is real Mainnet data from
   eth_getBlockByNumber: one row / column / tile per block, one cell per hash nibble
   (brightness = nibble value), tx count, gas used and timestamps straight from the block.
   Nothing is invented: with no data each view shows its idle grid.
     hero   — ledger rows rising from a landing line that runs through the glass mark
              (glass.js samples this canvas, so the glass refracts the live ledger)
     build  — 8×8 hash tiles chained inside the terminal
     tok    — gas used per block (fees, half of which burn)
     stake  — vault split: every block's reward flow divides 60 / 40 (stakers / burn)
     mine   — hash spectrogram: one column per block, cadence ticks from real timestamps
     union  — 31 seats, lit by the live council size; each block's PBFT round sweeps the seats
   Theme-aware: XPStream.setTheme('dark'|'light') swaps the palette and redraws.
   Site: loaded on every page (the shared footer has the ledger strip #ftStream); renderers start only for
   canvases that exist (ids in init()). Fed by core.js (XP live module). */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var MONO = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
  var blocks = [];            // oldest → newest
  var MAX = 160;
  var landAt = -1e9;          // perf time of the newest landing
  var council = null;
  var mouse = { x: -1e4, y: -1e4 };
  var renderers = [], heroR = null, heroHooks = [];

  /* ---------- palettes ---------- */
  var PAL = {
    dark: {
      bg: '#0b0909', glow: [187, 0, 34, .24], caustic: [255, 70, 40, .07],
      slot: [255, 236, 228], slotA: .04, line: [255, 236, 228],
      hot: [255, 231, 214], num: [244, 239, 236], num2: [176, 167, 164], time: [139, 130, 128],
      tick: [255, 90, 42], ink: [236, 230, 227], burn: [255, 90, 42], red: [214, 0, 42], mult: .9,
      ramp: function (v) { var x = v / 15; if (x < .5) { var u = x / .5; return [40 + 147 * u, 6 * (1 - u), 12 + 22 * u]; } var w = (x - .5) / .5; return [187 + 68 * w, 90 * w, 34 + 8 * w]; }
    },
    light: {
      bg: '#f6f4f2', glow: [187, 0, 34, .085], caustic: [187, 0, 34, .07],
      slot: [70, 36, 32], slotA: .055, line: [40, 20, 18],
      hot: [255, 96, 52], num: [22, 17, 16], num2: [92, 84, 82], time: [112, 104, 102],
      tick: [205, 52, 22], ink: [31, 24, 23], burn: [232, 88, 44], red: [187, 0, 34], mult: .82,
      ramp: function (v) { var x = v / 15; if (x < .5) { var u = x / .5; return [222 - 2 * u, 205 - 85 * u, 202 - 72 * u]; } var w = (x - .5) / .5; return [220 - 33 * w, 120 - 120 * w, 130 - 96 * w]; }
    }
  };
  var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  var P = PAL[theme];

  function now() { return performance.now(); }
  function group(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function hhmmss(ts) { var d = new Date(ts * 1000); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (x) { return (x < 10 ? '0' : '') + x; }).join(':'); }
  function eo(x) { x = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - x, 4); }
  function eio(x) { x = Math.min(1, Math.max(0, x)); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + clamp(a, 0, 1).toFixed(3) + ')'; }
  function mix(a, b, u) { return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }

  function norm(b) {
    var h = (b.hash || '').replace(/^0x/, ''), nib = new Uint8Array(64);
    for (var i = 0; i < 64; i++) nib[i] = parseInt(h[i] || '0', 16) || 0;
    return { n: parseInt(b.number, 16), nib: nib, tx: (b.transactions || []).length,
      gas: parseInt(b.gasUsed, 16) || 0, ts: parseInt(b.timestamp, 16) || 0, t: -1e9 };
  }
  /* landing envelope: write progress (0..1 over `dur`) + flash (1→0) */
  function env(b, t, delay, dur) {
    if (reduce) return { w: 1, f: 0, a: 9 };
    var a = (t - b.t) / 1000 - (delay || 0);
    return { w: clamp(a / (dur || .45), 0, 1), f: a < 0 ? 1 : Math.exp(-a * 3.2), a: a };
  }

  /* official symbol, drawn from the brand vector path (no <img>: keeps the canvas untainted under file://,
     so glass.js may upload it to WebGL) */
  var MARK = null;
  (function () { var p = document.querySelector('#heroMark path.mk, #ftMark path'); if (p && window.Path2D) MARK = new Path2D(p.getAttribute('d')); })();
  function drawSym(x, l, t, w, alpha) {
    if (!MARK) return;
    x.save(); x.globalAlpha = alpha == null ? 1 : alpha; x.translate(l, t); x.scale(w / 256, w / 256);
    var g = x.createLinearGradient(255.104, 229.953, 0, -19.762); g.addColorStop(0, '#a8011f'); g.addColorStop(1, '#bb0022');
    x.fillStyle = g; x.fill(MARK); x.restore();
  }

  /* ---------- base renderer ---------- */
  function R(canvas, draw, opts) {
    opts = opts || {};
    var o = { c: canvas, x: canvas.getContext('2d'), w: 0, h: 0, dpr: 1, vis: false, dirty: true, draw: draw, anim: opts.anim };
    o.resize = function () {
      var r = canvas.getBoundingClientRect();
      o.dpr = Math.min(window.devicePixelRatio || 1, 2);
      o.w = Math.max(1, r.width); o.h = Math.max(1, r.height);
      canvas.width = Math.round(o.w * o.dpr); canvas.height = Math.round(o.h * o.dpr);
      o.dirty = true;
    };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { o.vis = es[0].isIntersecting; if (o.vis) { o.dirty = true; kick(); } }, { rootMargin: '120px' }).observe(canvas);
    else o.vis = true;
    if ('ResizeObserver' in window) {
      var lw = 0, lh = 0;
      new ResizeObserver(function () { var r = canvas.getBoundingClientRect(); if (Math.abs(r.width - lw) > .5 || Math.abs(r.height - lh) > .5) { lw = r.width; lh = r.height; o.resize(); kick(); } }).observe(canvas);
    }
    renderers.push(o); o.resize(); return o;
  }
  function dirtyAll() { renderers.forEach(function (r) { r.dirty = true; }); kick(); }

  var running = false;
  function loop() {
    running = false;
    var t = now(), anim = !reduce && t - landAt < 2800, again = false;
    renderers.forEach(function (r) {
      if (!r.vis) return;
      var a = !reduce && r.anim ? r.anim(t) : false;
      if (r.dirty || anim || a) { r.x.setTransform(r.dpr, 0, 0, r.dpr, 0, 0); r.draw(r, t); r.dirty = false; }
      if (anim || a) again = true;
    });
    if (again) kick();
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }

  /* =================== HERO LEDGER =================== */
  function heroLedger(canvas) {
    var hero = document.getElementById('hero'), slot = document.getElementById('heroMark'), wrap = hero.querySelector('.hero-in');
    var g = {};
    var lay = document.createElement('canvas'), lx = lay.getContext('2d');   /* cells layer, feathered by a mask */
    function layout(r) {
      var hr = canvas.getBoundingClientRect(), sr = slot.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      var pad = parseFloat(getComputedStyle(wrap).paddingLeft) || 0;
      var m = r.w < 761;
      g.m = m; g.L = wr.left - hr.left + pad; g.W = wr.width - pad * 2;
      g.mx = sr.left - hr.left + sr.width / 2; g.my = sr.top - hr.top + sr.height / 2; g.mw = sr.width; g.mh = sr.height;
      g.rowH = m ? 12 : 15; g.cellH = m ? 6 : 7;
      g.land = g.my + g.cellH / 2;                       // the newest row runs through the mark's centre
      var tab = !m && g.W < 1000;
      g.ncell = m ? 32 : tab ? 48 : 64; g.gap = m ? 1.5 : 2; g.grp = m ? 8 : 16; g.gx = m ? 4 : 6;
      /* labels only: block number left, local time right (no tx columns; tx count = row brightness) */
      g.numW = m ? 0 : 92; g.timeW = m ? 0 : 58; g.sep = m ? 0 : 20;
      var cellsW = g.W - g.numW - g.timeW - g.sep * 2;
      var groups = g.ncell / g.grp - 1;
      g.cw = (cellsW - (g.ncell - 1) * g.gap - groups * g.gx) / g.ncell;
      g.cx0 = g.L + g.numW + g.sep; g.cellsW = cellsW;
      g.rows = Math.ceil(g.land / g.rowH) + 2;
      g.bottom = r.h - (m ? 40 : 120);                  // faint future slots continue behind the headline
    }
    function cellsRow(fn) { var cx = g.cx0; for (var i = 0; i < g.ncell; i++) { fn(cx, i); cx += g.cw + g.gap + ((i + 1) % g.grp === 0 ? g.gx : 0); } }
    function backdrop(x, r) {
      x.fillStyle = P.bg; x.fillRect(0, 0, r.w, r.h);
      var R0 = Math.max(g.mw * 2.3, 260), gr = x.createRadialGradient(g.mx, g.my, 0, g.mx, g.my, R0);
      gr.addColorStop(0, rgba(P.glow, P.glow[3])); gr.addColorStop(.45, rgba(P.glow, P.glow[3] * .35)); gr.addColorStop(1, rgba(P.glow, 0));
      x.fillStyle = gr; x.fillRect(g.mx - R0, g.my - R0, R0 * 2, R0 * 2);
      x.save(); x.translate(g.mx + g.mw * .06, g.my + g.mh * .66); x.scale(1, .2);
      var cr = g.mw * .62, cg = x.createRadialGradient(0, 0, 0, 0, 0, cr);
      cg.addColorStop(0, rgba(P.caustic, P.caustic[3])); cg.addColorStop(1, rgba(P.caustic, 0));
      x.fillStyle = cg; x.beginPath(); x.arc(0, 0, cr, 0, Math.PI * 2); x.fill(); x.restore();
    }
    /* soft edges on all four sides: alpha mask over the cells layer */
    function feather(r) {
      lx.globalCompositeOperation = 'destination-in';
      var x0 = g.cx0, x1 = g.cx0 + g.cellsW, fw = g.cellsW * (g.m ? .18 : .14);
      var gh = lx.createLinearGradient(x0, 0, x1, 0);
      gh.addColorStop(0, 'rgba(0,0,0,0)'); gh.addColorStop(fw / g.cellsW, 'rgba(0,0,0,1)'); gh.addColorStop(1 - fw / g.cellsW, 'rgba(0,0,0,1)'); gh.addColorStop(1, 'rgba(0,0,0,0)');
      lx.fillStyle = gh; lx.fillRect(0, 0, r.w, r.h);
      var top = 64, gv = lx.createLinearGradient(0, top, 0, g.bottom);
      var a = clamp((g.land - top) / (g.bottom - top), .01, .99);
      gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(Math.min(a * .55, a - .01), 'rgba(0,0,0,1)'); gv.addColorStop(a, 'rgba(0,0,0,1)');
      gv.addColorStop(Math.min(.99, a + (1 - a) * .25), 'rgba(0,0,0,.55)'); gv.addColorStop(1, 'rgba(0,0,0,0)');
      lx.fillStyle = gv; lx.fillRect(0, 0, r.w, r.h);
      lx.globalCompositeOperation = 'source-over';
    }
    var r = R(canvas, function (r, t) { draw(r, t); for (var i = 0; i < heroHooks.length; i++) heroHooks[i](); });
    function draw(r, t) {
      var x = r.x; layout(r);
      backdrop(x, r);
      if (lay.width !== r.c.width || lay.height !== r.c.height) { lay.width = r.c.width; lay.height = r.c.height; }
      lx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0); lx.clearRect(0, 0, r.w, r.h);
      var hr = canvas.getBoundingClientRect(), mx = mouse.x - hr.left, my = mouse.y - hr.top, M = P.mult;
      /* future slots below the line (not produced yet): faint, continuing behind the headline */
      for (var fy = g.land + g.rowH - g.cellH + 6, f = 1; fy < g.bottom; fy += g.rowH, f++) {
        lx.fillStyle = rgba(P.slot, P.slotA * (f === 1 ? 1 : .55));
        cellsRow(function (cx) { lx.fillRect(cx, fy, g.cw, g.cellH); });
      }
      var n = blocks.length, newest = n ? blocks[n - 1] : null;
      var slide = newest && !reduce ? eo(((t - newest.t) / 1000) / .3) : 1;
      var e0 = newest ? env(newest, t, .3, .38) : { w: 1, f: 0 };   /* writes in after the older rows have moved up */
      var labels = [];
      if (!n) {
        for (var k = 0; k < 12; k++) { var yy = g.land - k * g.rowH - g.cellH; lx.fillStyle = rgba(P.slot, P.slotA * (1 - k / 14)); cellsRow(function (cx) { lx.fillRect(cx, yy, g.cw, g.cellH); }); }
      } else {
        for (var k2 = 0; k2 < Math.min(n, g.rows); k2++) {
          var b = blocks[n - 1 - k2];
          var pos = k2 === 0 ? 0 : (k2 - 1) + slide;
          var y = g.land - pos * g.rowH - g.cellH;
          if (y < -g.rowH) break;
          var A = M * (Math.exp(-pos / 8) * .8 + .2);
          var txL = .62 + .38 * Math.min(1, b.tx / 8);                 /* tx count shows as row brightness */
          lx.fillStyle = rgba(P.slot, P.slotA);
          cellsRow(function (cx) { lx.fillRect(cx, y, g.cw, g.cellH); });
          var en = k2 === 0 ? e0 : { w: 1, f: 0 };
          if (k2 === 0 && (slide < .999 || en.w <= 0) && !reduce) { continue; }   /* the newest row waits for the slide */
          cellsRow(function (cx, i) {
            var v = b.nib[i], c = P.ramp(v), a = A * txL * (.25 + .75 * v / 15);
            if (fine && my > -1e3) { var dx = cx + g.cw / 2 - mx, dy = y + g.cellH / 2 - my; a += .4 * M * Math.exp(-(dx * dx + dy * dy) / 9000) * (.3 + .7 * v / 15); }
            if (k2 === 0) {
              var wp = en.w * (g.ncell + 6) - i;
              if (wp < 0) return;
              var hot = Math.max(en.f * .8, Math.exp(-wp * .45)); c = mix(c, P.hot, hot); a = Math.max(a, hot * M);
            }
            lx.fillStyle = rgba(c, a); lx.fillRect(cx, y, g.cw, g.cellH);
          });
          if (!g.m) {
            var la = clamp(1 - pos / 7, 0, 1) * (k2 === 0 ? Math.min(1, en.w * 3) : 1) * clamp((y - 60) / 80, 0, 1);
            if (la > .01) labels.push({ b: b, y: y, la: la, f: k2 === 0 ? en.f : 0, top: k2 === 0 });
          }
        }
        if (e0.f > .01 && slide >= .999) {                               /* the row lights the glass as it lands */
          var yl = g.land - g.cellH, gr = lx.createLinearGradient(0, yl - 22, 0, yl + g.cellH + 22);
          gr.addColorStop(0, rgba(P.tick, 0)); gr.addColorStop(.5, rgba(P.tick, (theme === 'light' ? .08 : .14) * e0.f)); gr.addColorStop(1, rgba(P.tick, 0));
          lx.fillStyle = gr; lx.fillRect(g.cx0, yl - 22, g.cellsW, g.cellH + 44);
        }
      }
      feather(r);
      x.drawImage(lay, 0, 0, r.w, r.h);
      /* landing line + registration crosses (unmasked) */
      var ly = g.land + 5, lg = x.createLinearGradient(g.L, 0, g.L + g.W, 0);
      lg.addColorStop(0, rgba(P.line, .14)); lg.addColorStop(.5, rgba(P.line, .05)); lg.addColorStop(1, rgba(P.line, .14));
      x.fillStyle = lg; x.fillRect(g.L, ly, g.W, 1);
      x.fillStyle = rgba(P.line, .3);
      [g.L, g.L + g.W].forEach(function (px) { x.fillRect(px - 4, ly, 9, 1); x.fillRect(px, ly - 4, 1, 9); });
      /* labels: real block number · local time, one per row (each drawn once) */
      x.textBaseline = 'alphabetic'; x.font = '500 10.5px ' + MONO;
      labels.forEach(function (L) {
        var ty = L.y + g.cellH;
        x.fillStyle = L.top ? rgba(mix(P.num, P.hot, L.f), L.la) : rgba(P.num2, L.la * .8);
        x.textAlign = 'left';
        if (L.top) { drawSym(x, g.L, L.y + (g.cellH - 9) / 2, 9 * 256 / 231.3, L.la); x.fillStyle = rgba(mix(P.num, P.hot, L.f), L.la); }
        else x.fillRect(g.L + 2, L.y + g.cellH / 2 - 1, 2, 2);
        x.fillText(group(L.b.n), g.L + 16, ty);
        x.textAlign = 'right'; x.fillStyle = rgba(P.time, L.la);
        x.fillText(hhmmss(L.b.ts), g.L + g.W, ty);
      });
    }
    heroR = r;
    return r;
  }

  /* =================== BUILD — chained 8×8 hash tiles =================== */
  function tileStrip(canvas) {
    return R(canvas, function (r, t) {
      var x = r.x, W = r.w, H = r.h, m = W < 600;
      x.clearRect(0, 0, W, H);
      var cs = m ? 3.5 : 4, cg = 1, tile = cs * 8 + cg * 7, pitch = tile + (m ? 12 : 16);
      var top = Math.round((H - tile) / 2) + 4, cy = top + tile / 2;
      var slots = Math.floor(W / pitch) + 1;
      var n = blocks.length, newest = n ? blocks[n - 1] : null;
      var sl = newest && !reduce ? eo(((t - newest.t) / 1000) / .5) : 1;
      var lg = x.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, rgba(P.line, 0)); lg.addColorStop(1, rgba(P.line, .12));
      x.fillStyle = lg; x.fillRect(0, cy, W, 1);
      for (var k = 0; k <= slots; k++) {
        var b = n - 1 - k >= 0 ? blocks[n - 1 - k] : null;
        var px = W - tile - (k === 0 ? 0 : (k - 1 + sl)) * pitch;
        if (px < -tile) break;
        var fadeL = clamp(px / (W * .35), 0, 1);
        if (!b) { x.strokeStyle = rgba(P.line, .08 * fadeL); x.lineWidth = 1; x.strokeRect(px + .5, top + .5, tile - 1, tile - 1); continue; }
        var en = k === 0 ? env(b, t, .2, .45) : { w: 1, f: 0 };
        var age = k === 0 ? 0 : k - 1 + sl, A = (.35 + .65 * Math.exp(-age / 9)) * fadeL * P.mult;
        for (var i = 0; i < 64; i++) {
          var cx = px + (i % 8) * (cs + cg), yy = top + (i >> 3) * (cs + cg), v = b.nib[i], c = P.ramp(v), a = A * (.2 + .8 * v / 15);
          if (k === 0) {
            var wp = en.w * 70 - i;
            if (wp < 0) { x.fillStyle = rgba(P.slot, P.slotA * 1.4); x.fillRect(cx, yy, cs, cs); continue; }
            var hot = Math.max(en.f * .8, Math.exp(-wp * .35)); c = mix(c, P.hot, hot); a = Math.max(a, hot);
          }
          x.fillStyle = rgba(c, a); x.fillRect(cx, yy, cs, cs);
        }
        var bw = tile * Math.min(1, b.tx / 20);
        x.fillStyle = rgba(P.tick, (k === 0 ? .9 : .25 + .4 * A));
        if (b.tx) x.fillRect(px, top + tile + 6, Math.max(2, bw), 1.5); else { x.fillStyle = rgba(P.line, .14 * fadeL); x.fillRect(px, top + tile + 6, 3, 1.5); }
        if (k === 0) {
          x.font = '500 10px ' + MONO; x.textAlign = 'right'; x.textBaseline = 'alphabetic';
          x.fillStyle = rgba(mix(P.num, P.hot, en.f), 1); x.fillText(group(b.n), px + tile, top - 8);
          if (en.f > .02) { x.strokeStyle = rgba(P.hot, en.f * .8); x.lineWidth = 1; x.strokeRect(px - 3.5, top - 3.5, tile + 7, tile + 7); }
        }
      }
    });
  }

  /* =================== TOKENOMICS — gas used per block: a regular bar grid on one baseline =================== */
  function barStrip(canvas) {
    return R(canvas, function (r, t) {
      var x = r.x, W = r.w, H = r.h; x.clearRect(0, 0, W, H);
      var bw = 3, pitch = 5, N = Math.min(48, Math.floor((W + 2) / pitch)), base = H, maxH = H - 2;
      var x0 = W - N * pitch + 2;
      var n = blocks.length, newest = n ? blocks[n - 1] : null, mx = 1, LG = function (g) { return Math.log(1 + g / 1000); };
      for (var j = 0; j < Math.min(n, N); j++) mx = Math.max(mx, blocks[n - 1 - j].gas);
      for (var k = 0; k < N; k++) {
        var px = x0 + (N - 1 - k) * pitch, b = n - 1 - k >= 0 ? blocks[n - 1 - k] : null;
        x.fillStyle = rgba(P.line, .1); x.fillRect(px, base - 2, bw, 2);          /* slot: same grid, empty */
        if (!b) continue;
        var en = k === 0 ? env(b, t, .1, .5) : { w: 1, f: 0 };
        /* empty block: low bar (it still burned nothing); any gas: 45–100% on a log scale of gas used */
        var h = b.gas ? maxH * (.45 + .55 * LG(b.gas) / Math.max(1e-6, LG(mx))) : maxH * .22;
        h *= k === 0 ? eo(en.w) : 1;
        var A = (b.gas ? 1 : .38) * (.55 + .45 * Math.exp(-k / 40));
        x.fillStyle = rgba(mix(P.burn, P.hot, k === 0 ? en.f : 0), A); x.fillRect(px, base - h, bw, h);
      }
    });
  }

  /* =================== PARTICIPATE — Stake: the vault splits every reward exactly 60 / 40 =================== */
  function stakeFlow(canvas) {
    return R(canvas, function (r, t) {
      var x = r.x, W = r.w, H = r.h; x.clearRect(0, 0, W, H);
      var cy = H * .58, x0 = Math.max(22, W * .07), vx = W * .4, vw = 30, vh = 52, ex = W - Math.max(18, W * .05);
      var T = Math.min(46, H * .24), tS = T * .6, tB = T * .4;           /* 60% to stakers · 40% burned: band widths exact */
      var yS = H * .3, yB = H * .86, x1 = vx + vw / 2, mxp = (x1 + ex) / 2, top = cy - T / 2;
      function ribbonPath(y0a, y0b, y1a, y1b) {
        x.beginPath(); x.moveTo(x1, y0a); x.bezierCurveTo(mxp, y0a, mxp, y1a, ex, y1a); x.lineTo(ex, y1b);
        x.bezierCurveTo(mxp, y1b, mxp, y0b, x1, y0b); x.closePath();
      }
      function ribbon(y0a, y0b, y1a, y1b, c, a0, a1) {
        var gx = x.createLinearGradient(x1, 0, ex, 0); gx.addColorStop(0, rgba(c, a0)); gx.addColorStop(1, rgba(c, a1));
        ribbonPath(y0a, y0b, y1a, y1b); x.fillStyle = gx; x.fill();
      }
      var S = [top, top + tS, yS - tS / 2, yS + tS / 2], B = [top + tS, top + T, yB - tB / 2, yB + tB / 2];
      ribbon(S[0], S[1], S[2], S[3], P.ink, theme === 'light' ? .1 : .09, theme === 'light' ? .16 : .14);
      ribbon(B[0], B[1], B[2], B[3], P.burn, theme === 'light' ? .22 : .24, .04);
      x.fillStyle = rgba(P.ink, .45); x.fillRect(ex, S[2], 1.5, tS);
      x.strokeStyle = rgba(P.line, .16); x.lineWidth = 1;
      x.beginPath(); x.moveTo(x0, cy + .5); x.lineTo(vx - vw / 2, cy + .5); x.stroke();
      x.fillStyle = rgba(P.line, .35); x.beginPath(); x.arc(x0, cy + .5, 2.5, 0, Math.PI * 2); x.fill();
      /* one light pulse per landed block (real): it travels the input, then passes through both bands */
      var n = blocks.length;
      for (var k = 0; k < Math.min(n, 6); k++) {
        var b = blocks[n - 1 - k], a = (t - b.t) / 1000;
        if (reduce || a < 0 || a > 2.4) continue;
        var p1 = clamp(a / .7, 0, 1), p2 = clamp((a - .7) / 1.5, 0, 1);
        if (p1 < 1) {
          var px = x0 + (vx - vw / 2 - x0) * eio(p1), gl = x.createLinearGradient(px - 30, 0, px + 2, 0);
          gl.addColorStop(0, rgba(P.tick, 0)); gl.addColorStop(1, rgba(P.tick, .9));
          x.fillStyle = gl; x.fillRect(px - 30, cy - .5, 32, 1.5);
          x.fillStyle = rgba(P.tick, 1); x.beginPath(); x.arc(px + 1, cy + .25, 2, 0, Math.PI * 2); x.fill();
        } else {
          var u = 1 - Math.pow(1 - p2, 2), sx = x1 + (ex - x1) * u, al = Math.sin(Math.PI * Math.min(1, p2 * 1.1));
          [[S, P.ink, .32], [B, P.burn, .5]].forEach(function (q) {
            x.save(); ribbonPath(q[0][0], q[0][1], q[0][2], q[0][3]); x.clip();
            var gp = x.createLinearGradient(sx - 36, 0, sx + 10, 0);
            gp.addColorStop(0, rgba(q[1], 0)); gp.addColorStop(.8, rgba(q[1], q[2] * al)); gp.addColorStop(1, rgba(q[1], 0));
            x.fillStyle = gp; x.fillRect(sx - 36, 0, 46, H); x.restore();
          });
        }
      }
      /* the vault */
      var vt = cy - vh / 2;
      x.fillStyle = theme === 'light' ? '#ffffff' : '#171212';
      roundRect(x, vx - vw / 2, vt, vw, vh, 7); x.fill();
      x.strokeStyle = rgba(P.line, .22); x.lineWidth = 1; x.stroke();
      drawSym(x, vx - 7.5, cy - 6.8, 15, .95);
    }, { anim: function (t) { return blocks.length && t - blocks[blocks.length - 1].t < 2600; } });
  }
  function roundRect(x, l, tp, w, h, rr) { x.beginPath(); x.moveTo(l + rr, tp); x.arcTo(l + w, tp, l + w, tp + h, rr); x.arcTo(l + w, tp + h, l, tp + h, rr); x.arcTo(l, tp + h, l, tp, rr); x.arcTo(l, tp, l + w, tp, rr); x.closePath(); }

  /* =================== PARTICIPATE — Mine: once-per-second cadence, each block sealed =================== */
  function mineCadence(canvas) {
    return R(canvas, function (r, t) {
      var x = r.x, W = r.w, H = r.h; x.clearRect(0, 0, W, H);
      var padX = Math.max(20, W * .07), axisY = Math.round(H * .66), right = W - padX - 18, left = padX;
      var pps = Math.max(18, Math.min(30, (right - left) / 12));            /* pixels per second */
      var n = blocks.length, newest = n ? blocks[n - 1] : null;
      var sl = newest && !reduce ? eo(((t - newest.t) / 1000) / .6) : 1;
      /* one-second grid */
      var fade = function (px) { return clamp((px - left) / (W * .22), 0, 1); };
      for (var s = 0; s < 40; s++) {
        var gx = right - s * pps + (1 - sl) * 0; if (gx < left) break;
        x.fillStyle = rgba(P.line, (s % 5 ? .05 : .1) * fade(gx)); x.fillRect(Math.round(gx), axisY - 46, 1, 54);
      }
      x.fillStyle = rgba(P.line, .16); x.fillRect(left, axisY, right - left + 10, 1);
      if (!newest) return;
      for (var k = 0; k < Math.min(n, 60); k++) {
        var b = blocks[n - 1 - k];
        var dt = newest.ts - b.ts, px = right - (dt + (k === 0 ? 0 : (1 - sl))) * pps;
        if (k === 0) px = right;
        if (px < left - 4) break;
        var en = k === 0 ? env(b, t, 0, .35) : { w: 1, f: 0 };
        var h = 22 * (k === 0 ? eo(en.w) : 1), a = (k === 0 ? 1 : .55 + .35 * Math.exp(-k / 8)) * fade(px);
        x.fillStyle = rgba(k === 0 ? mix(P.red, P.hot, en.f * .6) : P.red, a); x.fillRect(Math.round(px) - 1, axisY - h, 2, h);
        x.fillStyle = rgba(P.red, a); x.beginPath(); x.arc(Math.round(px), axisY - h, k === 0 ? 2.5 : 1.6, 0, Math.PI * 2); x.fill();
        if (k === 0) {
          /* the ASIC seal: a square closes onto the newest tick */
          var sc = reduce ? 1 : 1 + 1.2 * Math.exp(-((t - b.t) / 1000) * 5), sz = 12 * sc;
          x.strokeStyle = rgba(P.red, .85 * (reduce ? 1 : Math.min(1, ((t - b.t) / 1000) * 4 + .2))); x.lineWidth = 1.25;
          roundRect(x, px - sz / 2, axisY - h - 12 - sz / 2, sz, sz, 3); x.stroke();
          drawSym(x, px - 4.5, axisY - h - 12 - 4, 9, .95);
        }
      }
    }, { anim: function (t) { return blocks.length && t - blocks[blocks.length - 1].t < 1200; } });
  }

  /* =================== PARTICIPATE — Union: 31 seats on 3 arcs (9/10/12), council lit, PBFT round per block =================== */
  function unionSeats(canvas) {
    var seats = null, lastKey = '';
    function build(W, H) {
      var key = W + 'x' + H; if (key === lastKey && seats) return; lastKey = key;
      var cx = W / 2, cy = H - 24, R2 = Math.min(W * .36, H - 52), rows = [9, 10, 12];
      var radii = [R2 * .58, R2 * .79, R2], A0 = Math.PI * .06;   /* three concentric semicircles; ends lifted off the base */
      seats = [];
      rows.forEach(function (cnt, ri) {
        for (var i = 0; i < cnt; i++) {
          var a = Math.PI - A0 - i / (cnt - 1) * (Math.PI - 2 * A0);       /* even angular spacing on each arc */
          seats.push({ x: cx + Math.cos(a) * radii[ri], y: cy - Math.sin(a) * radii[ri], a: a, r: ri });
        }
      });
      seats.radii = radii; seats.A0 = A0;
      seats.sort(function (p, q) { return (q.a - p.a) || (p.r - q.r); });
      seats.cx = cx; seats.cy = cy; seats.R = R2; seats.r0 = radii[0];
    }
    return R(canvas, function (r, t) {
      var x = r.x, W = r.w, H = r.h; x.clearRect(0, 0, W, H);
      build(W, H);
      var lit = council == null ? 0 : Math.min(31, council);
      var newest = blocks.length ? blocks[blocks.length - 1] : null;
      var wa = newest && !reduce ? (t - newest.t) / 1000 : 9;
      x.fillStyle = rgba(P.line, .14); x.fillRect(seats.cx - seats.R - 14, seats.cy + 6, (seats.R + 14) * 2, 1);
      x.strokeStyle = rgba(P.line, .1); x.lineWidth = 1;                    /* the arc lines the seats sit on */
      seats.radii.forEach(function (rr) { x.beginPath(); x.arc(seats.cx, seats.cy, rr, Math.PI + seats.A0 * .5, -seats.A0 * .5); x.stroke(); });
      var sw = Math.min(seats.r0 * .52, 30); drawSym(x, seats.cx - sw / 2, seats.cy - sw * 231.3 / 256 - 4, sw, .92);
      seats.forEach(function (st, i) {
        var on = i < lit, wave = 0;
        if (on && wa < 1.4) { var ph = wa * 1.5 - (1 - st.a / Math.PI) * .9 - .05; wave = Math.exp(-ph * ph * 60); }
        x.beginPath(); x.arc(st.x, st.y, 3.5, 0, Math.PI * 2);          /* uniform 7px seats */
        if (on) { x.fillStyle = rgba(mix(P.red, P.tick, wave * .9), .92); x.fill(); }
        else { x.strokeStyle = rgba(P.line, council == null ? .2 : .45); x.lineWidth = 1; x.beginPath(); x.arc(st.x, st.y, 3, 0, Math.PI * 2); x.stroke(); }
      });
    }, { anim: function (t) { return blocks.length && t - blocks[blocks.length - 1].t < 1500; } });
  }

  /* =================== FOOTER — three faint ledger rows, latest block labelled =================== */
  function footStrip(canvas) {
    return R(canvas, function (r, t) {
      var x = r.x, W = r.w, H = r.h; x.clearRect(0, 0, W, H);
      var m = W < 600, numW = m ? 0 : 96, ncell = m ? 32 : 64, gap = 2, ch = 5, rowH = 12;
      var cw = (W - numW - (ncell - 1) * gap) / ncell, n = blocks.length;
      var gx = x.createLinearGradient(numW, 0, W, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(.75, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)');
      for (var k = 0; k < 3; k++) {
        var b = n - 1 - k >= 0 ? blocks[n - 1 - k] : null, y = 6 + (2 - k) * rowH;
        var en = b && k === 0 ? env(b, t, .1, .5) : { w: 1, f: 0 };
        for (var i = 0; i < ncell; i++) {
          var cx = numW + i * (cw + gap), fx = clamp((W - cx) / (W * .25), 0, 1);
          if (!b) { x.fillStyle = rgba(P.slot, P.slotA * fx); x.fillRect(cx, y, cw, ch); continue; }
          var v = b.nib[i], c = P.ramp(v), a = (k === 0 ? .7 : .38 - k * .1) * (.25 + .75 * v / 15) * P.mult * fx;
          if (k === 0) { var wp = en.w * (ncell + 6) - i; if (wp < 0) { x.fillStyle = rgba(P.slot, P.slotA); x.fillRect(cx, y, cw, ch); continue; } var hot = Math.max(en.f * .7, Math.exp(-wp * .45)); c = mix(c, P.hot, hot); a = Math.max(a, hot * .8); }
          x.fillStyle = rgba(c, a); x.fillRect(cx, y, cw, ch);
        }
        if (b && k === 0 && !m) {
          x.font = '500 10.5px ' + MONO; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
          drawSym(x, 0, y - 2, 9 * 256 / 231.3, 1);
          x.fillStyle = rgba(mix(P.num2, P.hot, en.f), 1); x.fillText(group(b.n), 15, y + 6);
        }
      }
    });
  }

  /* ---------- public API (fed by main.js) ---------- */
  var XS = window.XPStream = {
    history: function (list) { blocks = list.map(norm).sort(function (a, b) { return a.n - b.n; }).slice(-MAX); dirtyAll(); },
    land: function (raw) {
      var b = norm(raw);
      if (blocks.length && b.n <= blocks[blocks.length - 1].n) return false;
      b.t = now(); blocks.push(b); if (blocks.length > MAX) blocks.shift();
      landAt = b.t; dirtyAll(); return true;
    },
    offline: function () { dirtyAll(); },
    setCouncil: function (c) { if (c !== council) { council = c; dirtyAll(); } },
    setTheme: function (t) { theme = t === 'light' ? 'light' : 'dark'; P = PAL[theme]; renderers.forEach(function (r) { r.dirty = true; }); loop(); },
    onHero: function (fn) { heroHooks.push(fn); },
    heroCanvas: function () { return heroR ? heroR.c : null; },
    heroDpr: function () { return heroR ? heroR.dpr : 1; },
    heroBg: function () { return P.bg; },
    redraw: function () { renderers.forEach(function (r) { r.dirty = true; }); loop(); },
    relayout: function () { renderers.forEach(function (r) { r.resize(); }); kick(); }
  };

  function init() {
    var map = { heroStream: heroLedger, buildStream: tileStrip, tokStream: barStrip, ptStake: stakeFlow, ptMine: mineCadence, ptUnion: unionSeats, ftStream: footStrip };
    Object.keys(map).forEach(function (id) { var c = document.getElementById(id); if (c) map[id](c); });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { renderers.forEach(function (r) { r.resize(); }); kick(); }, 100); });
    if (fine) window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; if (heroR && heroR.vis) { heroR.dirty = true; kick(); } }, { passive: true });
    document.addEventListener('pointerleave', function () { mouse.x = mouse.y = -1e4; dirtyAll(); });
    if (document.fonts) document.fonts.load('500 11px "Geist Mono"').then(dirtyAll, function () {});
    kick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
