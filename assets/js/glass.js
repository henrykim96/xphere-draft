var GLASS_BASE = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
/* XPHERE B5 — glass mark over the live ledger.
   The official XPHERE symbol (vector path from the inline fallback SVG = _shared/brand/XPHERE-symbol-ondark.svg
   verbatim) is extruded with three.js r169 into a bevelled, "inflated" glass sculpture (B1).
   New in B5: the glass refracts the real ledger. MeshPhysicalMaterial's transmission sampler is redirected
   (onBeforeCompile) from three's internal framebuffer copy to a CanvasTexture that holds exactly the patch of
   the 2D ledger canvas (block-stream.js) lying behind the WebGL canvas. So every new block row that writes in
   behind the mark bends through the glass, with dispersion. The WebGL canvas is transparent and small
   (2× the mark slot), so the page around it stays the crisp 2D ledger.
   - per theme: environment light box, attenuation colour/distance, rim gain, tone mapping (both warmed up front)
   - floats, sways, tilts toward the cursor (spring); every block (XPGL.pulse) sends a light front through it
   - intro: noise dissolve-in with ember edges; reduced motion: one still frame
   - render loop only while on screen and the tab is visible; DPR cap + adaptive step-down
   - no WebGL2 / CDN failure / timeout -> html.no-gl: the official SVG mark stays
   Footer: the same geometry in liquid red metal (second lightweight renderer).
   Site: loaded on every page. With the hero (index) three.js loads at once; on pages that only have the
   shared footer it loads lazily when the footer comes within ~900px (the SVG fallback shows until then). */
(function () {
  'use strict';
  var root = document.documentElement;
  var hero = document.getElementById('hero');
  var heroCanvas = document.getElementById('heroGL');
  var heroSlot = document.getElementById('heroMark');
  var ftStage = document.getElementById('ftStage');
  var ftCanvas = document.getElementById('ftGL');
  var ftSlot = document.getElementById('ftMark');
  var hasHero = !!(hero && heroCanvas && heroSlot), hasFt = !!(ftCanvas && ftSlot && ftStage);
  if (!hasHero && !hasFt) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var listeners = [], themeFns = [];
  function curTheme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  window.XPGL = {
    pulse: function () { for (var i = 0; i < listeners.length; i++) listeners[i](); },
    setTheme: function (t) { for (var i = 0; i < themeFns.length; i++) themeFns[i](t); }
  };

  function fallback() { root.classList.add('no-gl'); root.classList.remove('gl-wait'); }
  var ok = false;
  try { ok = !!document.createElement('canvas').getContext('webgl2'); } catch (e) { ok = false; }
  if (!ok) { fallback(); return; }
  var slow = 0;
  function load() {
    root.classList.add('gl-wait');
    slow = setTimeout(fallback, 7000);
    new Promise(function (res, rej) {
      if (window.XPTHREE) return res(window.XPTHREE);
      var s = document.createElement('script');
      s.src = GLASS_BASE + '../vendor/three-r169-bundle.js';
      s.onload = function () { window.XPTHREE ? res(window.XPTHREE) : rej(new Error('three bundle')); };
      s.onerror = rej;
      document.head.appendChild(s);
    }).then(function (m) {
      try { start(m); } catch (e) { console.warn('[glass] init failed', e); fallback(); }
    }).catch(function (e) { console.warn('[glass] three.js unavailable', e); fallback(); });
  }
  if (hasHero || !('IntersectionObserver' in window)) load();
  else {
    /* footer-only pages: warm three.js up while the browser is idle after load,
       so the glass never initialises mid-scroll (avoids a ~150 ms hitch). */
    var started = false, idle = window.requestIdleCallback || function (f) { return setTimeout(f, 1200); };
    var go = function () { if (started) return; started = true; lio.disconnect(); load(); };
    var lio = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) idle(go, { timeout: 600 });
    }, { rootMargin: '1600px 0px' });
    lio.observe(ftStage);
    var warm = function () { idle(go, { timeout: 6000 }); };
    if (document.readyState === 'complete') warm(); else window.addEventListener('load', warm, { once: true });
  }

  var NOISE = [
    'float gh(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
    'float gn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);',
    ' return mix(mix(mix(gh(i),gh(i+vec3(1,0,0)),f.x),mix(gh(i+vec3(0,1,0)),gh(i+vec3(1,1,0)),f.x),f.y),',
    '            mix(mix(gh(i+vec3(0,0,1)),gh(i+vec3(1,0,1)),f.x),mix(gh(i+vec3(0,1,1)),gh(i+vec3(1,1,1)),f.x),f.y),f.z);}',
    'float gfbm(vec3 p){return gn(p)*.62+gn(p*2.13+7.1)*.28+gn(p*4.7+3.3)*.1;}'
  ].join('\n');

  /* light front (block pulse) + dissolve edges + inflated caps; optionally the ledger as transmission source */
  function patchMark(THREE, mat, U, hot, ledger) {
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uPulse = U.pulse; sh.uniforms.uDis = U.dis; sh.uniforms.uTime = U.time; sh.uniforms.uNM = U.nm; sh.uniforms.uMap = U.map; sh.uniforms.uRim = U.rim;
      var frag = sh.fragmentShader;
      if (ledger) {
        sh.uniforms.uLedger = U.ledger; sh.uniforms.uLedgerSize = U.ledgerSize;
        frag = frag.replace('#include <transmission_pars_fragment>',
          THREE.ShaderChunk.transmission_pars_fragment.replace(/transmissionSamplerMap/g, 'uLedger').replace(/transmissionSamplerSize/g, 'uLedgerSize'))
          .replace('#include <transmission_fragment>', THREE.ShaderChunk.transmission_fragment.replace('material.thickness = thickness;', 'material.thickness = thickness * gThk;'));
      }
      sh.vertexShader = 'varying vec3 vObj;varying vec3 vObjN;varying vec3 vBX;varying vec3 vBY;varying vec3 vBZ;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObj = position; vObjN = objectNormal;' +
          ' vBX = normalize(normalMatrix * vec3(1., 0., 0.)); vBY = normalize(normalMatrix * vec3(0., 1., 0.)); vBZ = normalize(normalMatrix * vec3(0., 0., 1.));');
      sh.fragmentShader = 'float gThk = .3;uniform float uPulse;uniform float uDis;uniform float uTime;uniform float uRim;uniform sampler2D uNM;uniform vec3 uMap;' +
        'varying vec3 vObj;varying vec3 vObjN;varying vec3 vBX;varying vec3 vBY;varying vec3 vBZ;\n' + NOISE + '\n' +
        frag
          .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n float dn = gfbm(vObj * 5.2 + vec3(0., 0., uTime * .04));\n if (dn < uDis * 1.08 - .04) discard;')
          .replace('#include <clearcoat_normal_fragment_maps>', [
            '#include <clearcoat_normal_fragment_maps>',
            ' if (abs(vObjN.z) > .999) {',
            '  vec2 suv = vec2((vObj.x / uMap.z + uMap.x) / 256., -(vObj.y / uMap.z + uMap.y) / 231.298);',
            '  vec4 nmS = texture2D(uNM, suv); vec3 tn = nmS.xyz * 2. - 1.; gThk = mix(.3, 1., nmS.a);',
            '  vec3 nv = normalize(tn.x * vBX + tn.y * vBY + abs(tn.z) * sign(vObjN.z) * vBZ);',
            '  #ifdef DOUBLE_SIDED',
            '  nv *= faceDirection;',
            '  #endif',
            '  normal = nv;',
            '  #ifdef USE_CLEARCOAT',
            '  clearcoatNormal = nv;',
            '  #endif',
            ' }'
          ].join('\n'))
          .replace('#include <emissivemap_fragment>', [
            '#include <emissivemap_fragment>',
            ' float pr = length(vObj.xy * vec2(1., 1.1));',
            ' float front = uPulse * 1.7 - .12;',
            ' float bx = (pr - front) * 9.;',
            ' float band = exp(-bx * bx) * exp(-uPulse * 2.2);',
            ' float core = exp(-pr * 5.) * exp(-uPulse * 6.);',
            ' vec3 emb = vec3(1., .13, .05);',
            ' vec3 vdir = normalize(vViewPosition);',
            ' float fr = 1. - abs(dot(normal, vdir));',
            ' totalEmissiveRadiance += min(vec3(.9, .03, .06) * (fr * fr * fr * uRim + .012), vec3(.22));',
            ' totalEmissiveRadiance += min(emb * band * ' + (hot * .7).toFixed(2) + ' + vec3(1., .62, .45) * band * band * ' + (hot * .25).toFixed(2) + ', vec3(.32));',
            ' float edge = (1. - smoothstep(uDis * 1.08 - .04, uDis * 1.08 + .015, dn)) * step(.001, uDis);',
            ' totalEmissiveRadiance += mix(vec3(.9, .06, .03), vec3(1., .45, .25), edge * edge * edge) * edge * 1.7;'
          ].join('\n'));
    };
  }

  function start(m) {
    var THREE = m[0], SVGLoader = m[1].SVGLoader, BGU = m[2];
    var mobile = window.matchMedia('(max-width: 760px)').matches;
    var coarse = window.matchMedia('(pointer: coarse)').matches;

    /* geometry: official path -> extrusion with rounded bevels, creased normals, flat caps */
    var d = document.querySelector('#heroMark path.mk, #ftMark path').getAttribute('d');
    var mapUV = new THREE.Vector3();
    function buildGeo(q) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1)"><path d="' + d + '"/></g></svg>';
      var data = new SVGLoader().parse(svg), shapes = [];
      data.paths.forEach(function (p) { shapes = shapes.concat(SVGLoader.createShapes(p)); });
      var g = new THREE.ExtrudeGeometry(shapes, { depth: 24, curveSegments: q.cs, bevelEnabled: true, bevelThickness: 6, bevelSize: 3, bevelOffset: -3, bevelSegments: q.bs });
      g.computeBoundingBox();
      var bb = g.boundingBox, c = new THREE.Vector3(); bb.getCenter(c);
      g.translate(-c.x, -c.y, -c.z);
      var s = 2 / (bb.max.x - bb.min.x); g.scale(s, s, s);
      mapUV.set(c.x, c.y, s);
      g = BGU.toCreasedNormals(g, Math.PI / 4.2);
      var P = g.attributes.position.array, N = g.attributes.normal.array, a = new THREE.Vector3(), b = new THREE.Vector3(), cc = new THREE.Vector3();
      for (var i = 0; i < P.length; i += 9) {
        a.set(P[i], P[i + 1], P[i + 2]); b.set(P[i + 3], P[i + 4], P[i + 5]); cc.set(P[i + 6], P[i + 7], P[i + 8]);
        if (Math.abs(a.z - b.z) < 1e-5 && Math.abs(a.z - cc.z) < 1e-5) {
          var nz = b.sub(a).cross(cc.sub(a)).z > 0 ? 1 : -1;
          for (var j = 0; j < 9; j += 3) { N[i + j] = 0; N[i + j + 1] = 0; N[i + j + 2] = nz; }
        }
      }
      g.attributes.normal.needsUpdate = true;
      g.computeBoundingSphere();
      return g;
    }
    var geo = buildGeo(mobile ? { cs: 44, bs: 8 } : { cs: 56, bs: 10 });

    /* inflated-cap normal map: exact EDT of the rasterised path (Felzenszwalb) -> height field -> normals */
    function buildNormalMap() {
      var Wm = 512, Hm = Math.round(512 * 231.298 / 256), k = Wm / 256;
      var cv = document.createElement('canvas'); cv.width = Wm; cv.height = Hm;
      var cx2 = cv.getContext('2d'); cx2.scale(k, k); cx2.fillStyle = '#fff'; cx2.fill(new Path2D(d));
      var px = cx2.getImageData(0, 0, Wm, Hm).data, n = Wm * Hm, INF = 1e20;
      var f = new Float64Array(n), i, x, y;
      for (i = 0; i < n; i++) f[i] = px[i * 4 + 3] > 127 ? INF : 0;
      function edt1(src, off, stride, len, out) {
        var v = new Int32Array(len), z = new Float64Array(len + 1), q, kk = 0, sv;
        v[0] = 0; z[0] = -INF; z[1] = INF;
        for (q = 1; q < len; q++) {
          do { var r = v[kk]; sv = ((src[off + q * stride] + q * q) - (src[off + r * stride] + r * r)) / (2 * q - 2 * r); } while (sv <= z[kk] && --kk >= 0);
          kk++; v[kk] = q; z[kk] = sv; z[kk + 1] = INF;
        }
        kk = 0;
        for (q = 0; q < len; q++) { while (z[kk + 1] < q) kk++; var dq = q - v[kk]; out[q] = dq * dq + src[off + v[kk] * stride]; }
      }
      var tmp = new Float64Array(Math.max(Wm, Hm));
      for (x = 0; x < Wm; x++) { edt1(f, x, Wm, Hm, tmp); for (y = 0; y < Hm; y++) f[y * Wm + x] = tmp[y]; }
      for (y = 0; y < Hm; y++) { edt1(f, y * Wm, 1, Wm, tmp); for (x = 0; x < Wm; x++) f[y * Wm + x] = tmp[x]; }
      var dist = new Float32Array(n), bl = new Float32Array(n);
      for (i = 0; i < n; i++) dist[i] = Math.sqrt(f[i]) / k;
      var R = 5;
      for (y = 0; y < Hm; y++) for (x = 0; x < Wm; x++) {
        var sum = 0, cnt = 0;
        for (var dx = -R; dx <= R; dx++) { var xx = Math.min(Wm - 1, Math.max(0, x + dx)); sum += dist[y * Wm + xx]; cnt++; }
        bl[y * Wm + x] = sum / cnt;
      }
      for (x = 0; x < Wm; x++) for (y = 0; y < Hm; y++) {
        var s2 = 0, c2 = 0;
        for (var dy = -R; dy <= R; dy++) { var yy = Math.min(Hm - 1, Math.max(0, y + dy)); s2 += bl[yy * Wm + x]; c2++; }
        dist[y * Wm + x] = s2 / c2;
      }
      var out = new Uint8Array(n * 4), EDGE = .72, L = 15, INSET = 3, hmax = 1e-6;
      for (i = 0; i < n; i++) hmax = Math.max(hmax, 1 - Math.exp(-Math.max(0, dist[i] - INSET) / L));
      for (y = 0; y < Hm; y++) for (x = 0; x < Wm; x++) {
        i = y * Wm + x;
        var gx = (dist[y * Wm + Math.min(Wm - 1, x + 1)] - dist[y * Wm + Math.max(0, x - 1)]) * .5 * k;
        var gy = (dist[Math.min(Hm - 1, y + 1) * Wm + x] - dist[Math.max(0, y - 1) * Wm + x]) * .5 * k;
        var gl2 = Math.sqrt(gx * gx + gy * gy) || 1;
        var dc = Math.max(0, dist[i] - INSET);
        var slope = EDGE * Math.exp(-dc / L) * (1 - Math.exp(-dc / 1.5)) * Math.min(1, gl2);
        var nx = -slope * gx / gl2, ny = slope * gy / gl2, nl = Math.sqrt(nx * nx + ny * ny + 1);
        out[i * 4] = Math.round((nx / nl * .5 + .5) * 255);
        out[i * 4 + 1] = Math.round((ny / nl * .5 + .5) * 255);
        out[i * 4 + 2] = Math.round((1 / nl * .5 + .5) * 255);
        out[i * 4 + 3] = Math.round(Math.min(1, (1 - Math.exp(-dc / L)) / hmax) * 255);
      }
      var tex = new THREE.DataTexture(out, Wm, Hm, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
      return tex;
    }
    var normalMap = buildNormalMap();

    /* procedural light boxes (no HDR files) */
    function envTexture(renderer, kind) {
      var s = new THREE.Scene(), light = kind.indexOf('light') >= 0, metal = kind.indexOf('metal') >= 0;
      var boxCol = light ? (metal ? 0x8f8784 : 0x1e1a19) : 0x030202;
      s.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: boxCol, side: THREE.BackSide })));
      function panel(w, h, col, k, x, y, z) {
        var mm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
        mm.position.set(x, y, z); mm.lookAt(0, 0, 0); s.add(mm);
      }
      if (!light) {
        panel(14, 1.1, '#fff0e6', metal ? 4 : 5, -2, 7, 5);
        panel(1.1, 11, '#ff2a14', 5, 8, 0, 3);
        panel(1.0, 9, '#ff5a2a', 2.5, -8, -1, 3);
        panel(12, .7, '#ff4a22', metal ? 3 : 1.6, 0, -7, 4);
        panel(9, 9, '#bb0022', metal ? 1.6 : 1.1, 0, 0, -9);
        panel(1.6, 1.6, '#ffffff', 16, 5, 5, 7);
        panel(12, 1.2, '#fff1ea', metal ? 1.2 : .5, 1, 5.5, 9);
        panel(12, 2, '#d40a1e', metal ? 1.2 : .22, -1, -5, 9);
      } else {
        /* studio: soft white softboxes on a mid-grey room, a little red bounce from the page's brand light */
        panel(16, metal ? 2.2 : 1.2, '#ffffff', metal ? 2.6 : 7, -1, 7.5, 4);
        panel(metal ? 1.4 : .8, 12, '#ffffff', metal ? 1.8 : 4.5, 8.5, 0, 3);
        panel(1.2, 10, '#fff4ef', 1.4, -8.5, -1, 3);
        panel(14, 6, '#f2ecea', metal ? 1.1 : .9, 0, 0, -10);
        panel(14, 1.2, '#ff3a2a', metal ? 1.6 : .9, 0, -7, 4);
        panel(1.6, 1.6, '#ffffff', metal ? 10 : 22, 5, 5, 7);
        panel(14, 1.2, '#ffffff', metal ? 1.4 : 1.6, 1, 5.5, 9);
      }
      var pm = new THREE.PMREMGenerator(renderer);
      var tex = pm.fromScene(s, .04).texture;
      pm.dispose();
      return tex;
    }

    var pending = [];
    if (!reduce) listeners.push(function () { pending.forEach(function (f) { f(); }); });

    if (hasHero) makeHero();
    if (hasFt) makeFooter();

    /* ================================================================ HERO */
    function makeHero() {
      var renderer = new THREE.WebGLRenderer({ canvas: heroCanvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
      var maxDpr = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 2), dpr = maxDpr;
      renderer.setPixelRatio(dpr);
      var scene = new THREE.Scene();
      var ENV = { dark: envTexture(renderer, 'glass-dark'), light: envTexture(renderer, 'glass-light') };
      var camera = new THREE.PerspectiveCamera(26, 1, .1, 60);

      /* the ledger patch behind this canvas */
      var tc = document.createElement('canvas'), tx = tc.getContext('2d');
      tc.width = tc.height = 4;
      var ledgerTex = new THREE.CanvasTexture(tc);
      ledgerTex.colorSpace = THREE.SRGBColorSpace;
      ledgerTex.minFilter = THREE.LinearMipmapLinearFilter; ledgerTex.magFilter = THREE.LinearFilter;
      ledgerTex.wrapS = ledgerTex.wrapT = THREE.ClampToEdgeWrapping;

      var U = { pulse: { value: 99 }, dis: { value: reduce ? 0 : 1 }, time: { value: 0 }, nm: { value: normalMap }, map: { value: mapUV },
        rim: { value: .25 }, ledger: { value: ledgerTex }, ledgerSize: { value: new THREE.Vector2(4, 4) } };
      var glass = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: .05, transmission: 1, thickness: 1.1, ior: 1.5, dispersion: .6,
        attenuationColor: new THREE.Color('#e3122c'), attenuationDistance: .3,
        clearcoat: 1, clearcoatRoughness: .04, specularIntensity: 1, envMapIntensity: 1.6,
        emissive: 0x000000, side: THREE.DoubleSide
      });
      patchMark(THREE, glass, U, 1.0, true);
      var mark = new THREE.Mesh(geo, glass);
      var rig = new THREE.Group(); rig.add(mark); scene.add(rig);

      var TH = {
        dark: { env: ENV.dark, att: '#e0283a', attD: 1.1, th: .8, envI: 1.5, rim: .22, tm: THREE.NeutralToneMapping, exp: 1.05, rough: .045 },
        light: { env: ENV.light, att: '#b51418', attD: .6, th: .95, envI: 1.45, rim: .24, tm: THREE.NeutralToneMapping, exp: 1.0, rough: .04 }
      };
      function applyTheme(t) {
        var c = TH[t];
        scene.environment = c.env; glass.attenuationColor.set(c.att); glass.attenuationDistance = c.attD; glass.thickness = c.th;
        glass.envMapIntensity = c.envI; glass.roughness = c.rough; U.rim.value = c.rim;
        renderer.toneMapping = c.tm; renderer.toneMappingExposure = c.exp;
      }
      applyTheme(curTheme());

      var W = 1, H = 1, base = 6;
      function layout() {
        var r = heroCanvas.getBoundingClientRect(), sr = heroSlot.getBoundingClientRect();
        W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        var ppu = sr.width / 2;
        base = H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * ppu);
        camera.updateProjectionMatrix();
        var td = Math.min(window.devicePixelRatio || 1, 1.5);
        tc.width = Math.max(4, Math.round(W * td)); tc.height = Math.max(4, Math.round(H * td));
        ledgerTex.dispose(); // size changed: let three reallocate
        U.ledgerSize.value.set(tc.width, tc.height);
        copyLedger();
      }
      /* copy the exact ledger pixels behind this canvas */
      function copyLedger() {
        var lc = window.XPStream && XPStream.heroCanvas();
        if (!lc || !lc.width) { tx.fillStyle = curTheme() === 'light' ? '#f6f4f2' : '#0b0909'; tx.fillRect(0, 0, tc.width, tc.height); ledgerTex.needsUpdate = true; return; }
        var lr = lc.getBoundingClientRect(), gr = heroCanvas.getBoundingClientRect(), k = lc.width / Math.max(1, lr.width);
        tx.fillStyle = XPStream.heroBg(); tx.fillRect(0, 0, tc.width, tc.height);
        var sx = (gr.left - lr.left) * k, sy = (gr.top - lr.top) * k, sw = gr.width * k, sh = gr.height * k;
        /* clip the source rect to the ledger canvas, map to the destination proportionally */
        var x0 = Math.max(0, sx), y0 = Math.max(0, sy), x1 = Math.min(lc.width, sx + sw), y1 = Math.min(lc.height, sy + sh);
        if (x1 > x0 && y1 > y0) {
          var fx = tc.width / sw, fy = tc.height / sh;
          tx.drawImage(lc, x0, y0, x1 - x0, y1 - y0, (x0 - sx) * fx, (y0 - sy) * fy, (x1 - x0) * fx, (y1 - y0) * fy);
        }
        ledgerTex.needsUpdate = true;
      }
      var ledgerDirty = true;
      if (window.XPStream) XPStream.onHero(function () { ledgerDirty = true; });

      var tgt = { x: 0, y: 0 }, rot = { x: 0, y: 0, vx: 0, vy: 0 };
      if (!coarse) window.addEventListener('pointermove', function (e) {
        var sr = heroSlot.getBoundingClientRect();
        var nx = (e.clientX - (sr.left + sr.width / 2)) / (window.innerWidth * .5), ny = -(e.clientY - (sr.top + sr.height / 2)) / (window.innerHeight * .5);
        nx = Math.max(-1.3, Math.min(1.3, nx)); ny = Math.max(-1.3, Math.min(1.3, ny));
        tgt.y = nx * .38; tgt.x = -ny * .28;
      }, { passive: true });

      var visible = true, raf = 0, last = performance.now(), t = 0, pulseT = 99, intro = reduce ? 1 : 0, ready = false;
      var frames = 0, acc = 0, lastRect = '';
      pending.push(function () { pulseT = 0; rot.vx -= .14; rot.vy += .09; });

      function frame(now) {
        raf = 0;
        var dt = Math.min(.05, (now - last) / 1000); last = now;
        if (!reduce) { t += dt; pulseT += dt; intro = Math.min(1, intro + dt / 2.2); }
        var k = 38, c = 9.5;
        rot.vx += ((tgt.x - rot.x) * k - rot.vx * c) * dt; rot.x += rot.vx * dt;
        rot.vy += ((tgt.y - rot.y) * k - rot.vy * c) * dt; rot.y += rot.vy * dt;
        var ei = 1 - Math.pow(1 - intro, 3), ed = intro * intro * (3 - 2 * intro);
        rig.rotation.set(
          rot.x + Math.sin(t * .27) * .06 + (1 - ei) * .45,
          rot.y + Math.sin(t * .31) * .2 - .12 + (1 - ei) * -.6,
          Math.sin(t * .23) * .03);
        rig.position.y = Math.sin(t * .6) * .03;
        camera.position.set(0, 0, base);
        U.dis.value = reduce ? 0 : Math.max(0, 1 - ed * 1.06);
        U.pulse.value = pulseT; U.time.value = t;
        /* refresh the ledger patch when the ledger redrew or the canvas moved (scroll / layout) */
        var gr = heroCanvas.getBoundingClientRect(), key = Math.round(gr.left) + ',' + Math.round(gr.top);
        if (ledgerDirty || key !== lastRect) { copyLedger(); ledgerDirty = false; lastRect = key; }
        renderer.render(scene, camera);

        if (!ready) { ready = true; clearTimeout(slow); root.classList.remove('no-gl', 'gl-wait'); root.classList.add('gl-on'); }
        if (!reduce) {
          frames++; acc += dt;
          if (frames === 60) {
            var avg = acc / frames;
            if (avg > .022 && dpr > 1) { dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); layout(); }
            frames = 0; acc = 0;
          }
        }
        if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame);
      }
      function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
      layout();
      /* warm both theme programs up front so the theme switch never compiles mid-transition */
      (function warm() {
        var cur = curTheme(), other = cur === 'light' ? 'dark' : 'light';
        try { applyTheme(other); renderer.compile(scene, camera); renderer.render(scene, camera); applyTheme(cur); renderer.compile(scene, camera); } catch (e) {}
      })();
      themeFns.push(function (th) {
        applyTheme(th); ledgerDirty = true;
        if (window.XPStream) XPStream.redraw();
        copyLedger(); renderer.render(scene, camera); kick();
      });
      window.addEventListener('resize', function () { clearTimeout(layout.t); layout.t = setTimeout(function () { layout(); kick(); }, 90); });
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(hero);
      document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) kick(); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); kick(); });
      if (window.ResizeObserver) new ResizeObserver(function () { layout(); kick(); }).observe(heroSlot);
      kick();
    }

    /* ================================================================ FOOTER: liquid red metal */
    function makeFooter() {
      var renderer = new THREE.WebGLRenderer({ canvas: ftCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      var scene = new THREE.Scene();
      var ENV = { dark: envTexture(renderer, 'metal-dark'), light: envTexture(renderer, 'metal-light') };
      var camera = new THREE.PerspectiveCamera(24, 1, .1, 40);
      var U = { pulse: { value: 99 }, dis: { value: 0 }, time: { value: 0 }, nm: { value: normalMap }, map: { value: mapUV }, rim: { value: .25 } };
      var metal = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#c0102a'), metalness: 1, roughness: .2, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.35 });
      patchMark(THREE, metal, U, .8, false);
      var mark = new THREE.Mesh(geo, metal), rig = new THREE.Group(); rig.add(mark); scene.add(rig);
      function applyTheme(t) {
        scene.environment = ENV[t];
        metal.envMapIntensity = t === 'light' ? 1.45 : 1.35; metal.roughness = t === 'light' ? .24 : .2;
        metal.color.set(t === 'light' ? '#c4102c' : '#c0102a'); U.rim.value = t === 'light' ? .12 : .25;
      }
      applyTheme(curTheme());
      function layout() {
        var r = ftStage.getBoundingClientRect(), sr = ftSlot.getBoundingClientRect();
        var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
        renderer.setSize(w, h, false); camera.aspect = w / h;
        camera.position.set(0, 0, h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (sr.width / 2)));
        camera.updateProjectionMatrix();
      }
      var tgt = { x: 0, y: 0 }, rot = { x: 0, y: 0, vx: 0, vy: 0 }, visible = false, raf = 0, last = 0, t = 3, pulseT = 99;
      if (!coarse) window.addEventListener('pointermove', function (e) {
        if (!visible) return;
        var r = ftStage.getBoundingClientRect();
        tgt.y = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth * .5))) * .5;
        tgt.x = -Math.max(-1, Math.min(1, -(e.clientY - (r.top + r.height / 2)) / (window.innerHeight * .5))) * .35;
      }, { passive: true });
      pending.push(function () { pulseT = 0; });
      function frame(now) {
        raf = 0;
        var dt = Math.min(.05, (now - last) / 1000); last = now;
        if (!reduce) { t += dt; pulseT += dt; }
        rot.vx += ((tgt.x - rot.x) * 30 - rot.vx * 8.5) * dt; rot.x += rot.vx * dt;
        rot.vy += ((tgt.y - rot.y) * 30 - rot.vy * 8.5) * dt; rot.y += rot.vy * dt;
        rig.rotation.set(rot.x + Math.sin(t * .3) * .1 + .12, rot.y + Math.sin(t * .22) * .42 - .25, Math.sin(t * .2) * .04);
        rig.position.y = Math.sin(t * .55) * .03;
        U.pulse.value = pulseT; U.time.value = t;
        renderer.render(scene, camera);
        root.classList.add('ft-gl-on');
        if (!hasHero) { clearTimeout(slow); root.classList.remove('gl-wait'); }
        if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame);
      }
      function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
      layout();
      themeFns.push(function (th) { applyTheme(th); kick(); });
      window.addEventListener('resize', function () { clearTimeout(layout.t); layout.t = setTimeout(function () { layout(); kick(); }, 90); });
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '120px 0px' }).observe(ftStage);
      document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) kick(); });
      kick();
    }
  }
})();
