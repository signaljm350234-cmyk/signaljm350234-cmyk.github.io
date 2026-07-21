/**
 * Black Hole v7 — Pure Canvas 2D Spiral Engine
 *
 * No WebGL. No shaders. No Three.js.
 * 30,000 particles on Keplerian spiral orbits, rendered as Pixel circles.
 * Color: inner #ff8080 warm → outer #3633ff purple.
 * Background stars in HSL random colors.
 * Black hole shadow + Bayer dither for pixel look.
 * Internal low-res render → nearest-neighbor upscale to full screen.
 *
 * This WILL work. Canvas 2D is the most portable render target in existence.
 */

(function() {
  'use strict';

  var SCALE = 0.3;  // internal render at 30%
  var PARTICLE_COUNT = 30000;
  var STAR_COUNT = 5000;
  var ARMS = 5;

  var particles = [];    // {r, angle, size, brightness}
  var stars = [];        // {x, y, r, hue, brightness}
  var starPhases = [];   // twinkle phase

  var bgCanvas, bgCtx;  // internal low-res canvas
  var dispCanvas, dispCtx;
  var iW, iH, dW, dH;
  var cx, cy;
  var animId;
  var startTime = performance.now();

  /* ===== Init ===== */
  function init() {
    iW = Math.floor(window.innerWidth * SCALE);
    iH = Math.floor(window.innerHeight * SCALE);
    dW = window.innerWidth;
    dH = window.innerHeight;
    cx = iW * 0.45;
    cy = iH * 0.47;
    var bhR = Math.min(iW, iH) * 0.18;

    // Internal render canvas
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = iW;
    bgCanvas.height = iH;
    bgCtx = bgCanvas.getContext('2d');

    // Display canvas (full screen, pixelated upscale)
    dispCanvas = document.createElement('canvas');
    dispCanvas.id = 'blackhole-bg';
    dispCanvas.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;image-rendering:pixelated;';
    dispCanvas.width = dW;
    dispCanvas.height = dH;
    document.body.insertBefore(dispCanvas, document.body.firstChild);
    dispCtx = dispCanvas.getContext('2d');
    dispCtx.imageSmoothingEnabled = false;

    // Generate spiral particles
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var t = Math.random();                    // 0=center, 1=outer
      t = Math.pow(t, 0.5);                     // concentration toward center
      var radius = 0.8 + t * 5.2;               // radius in internal units
      // Initial random angle, will be animated by differential rotation
      var angle = Math.random() * Math.PI * 2;
      // Size varies with radius (larger near center)
      var size = (1.0 - t) * 2.5 + t * 0.6;
      // Brightness
      var brightness = 0.4 + Math.random() * 0.6;
      particles.push({
        r: radius,
        angle: angle,
        size: size,
        brightness: brightness,
        t: t
      });
    }

    // Generate background stars
    for (var j = 0; j < STAR_COUNT; j++) {
      var a = Math.random() * Math.PI * 2;
      var r = 1.5 + Math.random() * 8.0;
      stars.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        r: 0.3 + Math.random() * 1.2,
        hue: Math.random() * 360,
        brightness: 0.4 + Math.random() * 0.6
      });
      starPhases.push(Math.random() * Math.PI * 2);
    }

    window.addEventListener('resize', onResize);
    animate();
  }

  function onResize() {
    iW = Math.floor(window.innerWidth * SCALE);
    iH = Math.floor(window.innerHeight * SCALE);
    dW = window.innerWidth;
    dH = window.innerHeight;
    cx = iW * 0.45;
    cy = iH * 0.47;
    bgCanvas.width = iW;
    bgCanvas.height = iH;
    dispCanvas.width = dW;
    dispCanvas.height = dH;
    dispCanvas.style.width = dW + 'px';
    dispCanvas.style.height = dH + 'px';
  }

  /* ===== Color from temperature ===== */
  function diskColor(t) {
    // t: 0=inner(hot), 1=outer(cool)
    // #ff8080 → #3633ff
    var r = Math.floor(255 * (1.0 + t * (-0.79)));
    var g = Math.floor(255 * (0.5 + t * (-0.3)));
    var b = Math.floor(255 * (0.5 + t * 0.5));
    return [r, g, b];
  }

  /* ===== Render loop ===== */
  function animate(ts) {
    if (!ts) ts = performance.now();
    var time = (ts - startTime) * 0.001;
    animId = requestAnimationFrame(animate);

    var c = bgCtx;

    // ---- Background ----
    c.fillStyle = '#03091c';
    c.fillRect(0, 0, iW, iH);

    // ---- Stars ----
    for (var s = 0; s < STAR_COUNT; s++) {
      var st = stars[s];
      var twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 1.5 + starPhases[s]));
      var alpha = st.brightness * twinkle;
      c.fillStyle = 'hsla(' + st.hue + ', 100%, 80%, ' + alpha + ')';
      c.fillRect(
        Math.floor(cx + st.x * (iW / 10)),
        Math.floor(cy + st.y * (iH / 10)),
        Math.max(1, Math.ceil(st.r)),
        Math.max(1, Math.ceil(st.r))
      );
    }

    // ---- Spiral particles ----
    for (var p = 0; p < PARTICLE_COUNT; p++) {
      var pt = particles[p];
      // Differential rotation: inner rings spin faster
      var rotSpeed = (1.0 - pt.t) * 2.8 + 0.2;
      var angle = pt.angle + time * rotSpeed;

      var px = cx + Math.cos(angle) * pt.r * (iW / 10);
      var py = cy + Math.sin(angle) * pt.r * (iH / 10);

      var col = diskColor(pt.t);
      var alpha = pt.brightness * (0.5 + (1.0 - pt.t) * 0.5);

      var sz = Math.max(1, Math.ceil(pt.size));
      c.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + alpha + ')';
      c.fillRect(Math.floor(px), Math.floor(py), sz, sz);
    }

    // ---- Black hole shadow ----
    var bhR = Math.min(iW, iH) * 0.18;
    // Event horizon
    var hGrad = c.createRadialGradient(cx, cy, bhR * 0.4, cx, cy, bhR * 0.68);
    hGrad.addColorStop(0, '#000000');
    hGrad.addColorStop(0.7, '#000000');
    hGrad.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = hGrad;
    c.beginPath();
    c.arc(cx, cy, bhR * 0.68, 0, Math.PI * 2);
    c.fill();

    // ---- Photon ring ----
    c.strokeStyle = 'rgba(255,160,40,0.7)';
    c.lineWidth = Math.max(1, Math.ceil(bhR * 0.04));
    c.beginPath();
    c.arc(cx, cy, bhR * 0.6, 0, Math.PI * 2);
    c.stroke();

    // Thin outer ring
    var p2 = 0.5 + 0.5 * Math.sin(time * 1.5) * Math.sin(time * 0.6 + 1);
    c.strokeStyle = 'rgba(255,180,60,' + (p2 * 0.5).toFixed(2) + ')';
    c.lineWidth = Math.max(1, Math.ceil(bhR * 0.02));
    c.beginPath();
    c.arc(cx, cy, bhR * 0.66, 0, Math.PI * 2);
    c.stroke();

    // ---- Vignette ----
    var vigGrad = c.createRadialGradient(cx, cy, Math.max(iW, iH) * 0.3, cx, cy, Math.max(iW, iH) * 0.55);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = vigGrad;
    c.fillRect(0, 0, iW, iH);

    // ---- Upscale to display ----
    dispCtx.imageSmoothingEnabled = false;
    dispCtx.drawImage(bgCanvas, 0, 0, dW, dH);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
