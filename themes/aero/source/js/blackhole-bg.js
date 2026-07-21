/**
 * Black Hole Desktop Background v5 — Three.js GPU Shader
 *
 * Per-pixel ray-traced Schwarzschild black hole on the GPU.
 * Three.js CDN loads first, then this script picks up window.THREE.
 */

(function() {
  'use strict';

  if (!window.THREE) { setTimeout(arguments.callee, 80); return; }
  var THREE = window.THREE;

  /* ================================================================
     Fragment Shader
     ================================================================ */
  var fragmentShader = /* glsl */ `
    precision highp float;
    uniform vec2  iResolution;
    uniform float iTime;

    #define PI   3.14159265359
    #define RS   1.0
    #define ISCO 3.0

    float raySphere(vec3 ro, vec3 rd, vec3 c, float r) {
      vec3 oc = ro - c;
      float b = dot(oc, rd);
      float h = b*b - dot(oc,oc) + r*r;
      if (h < 0.0) return -1.0;
      float d = -b - sqrt(h);
      return d > 0.0 ? d : (-b + sqrt(h));
    }

    // Schwarzschild deflection angle (strong-field approximation)
    float deflectionAngle(float b) {
      float bCrit = 2.598076;
      if (b < bCrit * 1.001) return 999.0;
      float a = 2.0 / b;
      a += 15.0 * PI / 16.0 / (b*b*b);
      a += 1.5 / (b - bCrit);
      return clamp(a, 0.0, PI * 2.0);
    }

    // Disk temperature → RGB
    vec3 diskColor(float r) {
      float t = clamp((r - ISCO) / 9.0, 0.0, 1.0);
      if      (t < 0.06) return vec3(0.55, 0.07, 0.03);
      else if (t < 0.15) return vec3(0.70, 0.12, 0.04);
      else if (t < 0.25) return vec3(0.88, 0.36, 0.07);
      else if (t < 0.40) return vec3(1.00, 0.55, 0.14);
      else if (t < 0.55) return vec3(0.97, 0.47, 0.12);
      else if (t < 0.70) return vec3(0.82, 0.28, 0.08);
      else if (t < 0.85) return vec3(0.60, 0.26, 0.18);
      else               return vec3(0.28, 0.10, 0.07);
    }

    float gridPattern(vec2 p, float r) {
      float spacing = 1.5;
      float warp = 4.0 * exp(-r*r / 20.0);
      vec2 gp = p / spacing;
      float compress = 1.0 + 2.5 * exp(-r*r / 30.0);
      gp *= compress;
      float gx = abs(fract(gp.x + 0.5) - 0.5) * 2.0;
      float gy = abs(fract(gp.y + 0.5) - 0.5) * 2.0;
      float line = min(gx, gy);
      float grid = 0.04 / (line + 0.04) - 0.5;
      float vis = 0.12 + 0.04 * (1.0 - exp(-r*r / 50.0));
      return grid * vis;
    }

    float teardropGlow(vec2 uv, float time) {
      float angle = time * 0.15;
      float orbitR = 7.2;
      vec2 center = vec2(-orbitR * cos(angle), orbitR * sin(angle) * 0.35);
      vec2 d = uv - center;
      float dist = length(d);
      float elong = 1.0 - 0.6 * smoothstep(-2.0, 4.0, d.x);
      float shape = dist / elong;
      float glow = 0.32 * exp(-shape*shape / 0.3)
                 + 0.14 * exp(-shape*shape / 1.2)
                 + 0.05 * exp(-shape*shape / 3.0);
      glow *= 0.7 + 0.3 * sin(time * 2.5 + angle);
      return glow;
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
      vec2 bhUV = uv - vec2(-0.03, 0.02);

      // Camera above disk plane
      float camDist = 30.0;
      float camHeight = 18.0;
      vec3 ro = vec3(0.0, camHeight, -camDist);
      vec3 rd = normalize(vec3(uv.x, uv.y - camHeight / camDist, 1.0));

      // Background: deep navy blue gradient
      float bgL = 1.0 - length(bhUV);
      vec3 bg = mix(vec3(0.015, 0.04, 0.14), vec3(0.035, 0.07, 0.20), smoothstep(0.0, 0.7, bgL));
      vec3 col = bg;

      // Ray tests
      vec3 bhC = vec3(0.0);
      float tHorizon = raySphere(ro, rd, bhC, RS * 1.01);
      float tOuter   = raySphere(ro, rd, bhC, RS * 1.8);

      // Disk intersection (y = 0 plane)
      float tDisk = -1.0;
      if (abs(rd.y) > 0.0001) tDisk = -ro.y / rd.y;
      vec3 hitDisk = ro + rd * tDisk;
      float diskR = length(hitDisk.xz);
      float diskBehindBH = dot(hitDisk - bhC, rd); // < 0 means behind BH

      // Impact parameter
      vec3 rayToBH = bhC - ro;
      float bProj = length(rayToBH - rd * dot(rayToBH, rd));
      float defl = deflectionAngle(bProj);
      // Deflected hit position
      float deflR = diskR;
      if (bProj > 0.01 && bProj < 9.0 && defl < 900.0) {
        float shift = defl * tDisk * 0.1 * bProj;
        deflR = max(diskR - shift * 0.5, 0.0);
      }

      // ---- Accretion disk ----
      if (tDisk > 0.0 && diskR < 12.0 && diskR > RS * 1.1) {
        float r = deflR;
        if (r > ISCO && r < 12.0) {
          vec3 dcol = diskColor(r);

          // Doppler: bottom z>0 (approaching) brighter
          float doppler = 1.0;
          if (hitDisk.z > 0.0) doppler = 1.0 + smoothstep(0.0, 10.0, hitDisk.z) * 0.4;
          else if (hitDisk.z < -2.0) doppler = 0.7;
          dcol *= doppler * (0.95 + 0.05 * sin(hitDisk.z * 0.5 + iTime));

          // Fade near edges
          float edge = 1.0;
          if (r < ISCO + 0.6) edge = smoothstep(ISCO, ISCO + 0.6, r);
          if (r > 9.5) edge *= 1.0 - smoothstep(9.5, 12.0, r);
          dcol *= edge;

          // Inner edge glow
          dcol += vec3(0.45, 0.25, 0.08) * exp(-(r-ISCO)*(r-ISCO) / 0.5) * 0.4;

          col = mix(col, dcol, 0.93);
        }
      }

      // ---- Photon ring ----
      float ringDist = abs(bProj - 2.6);
      float ring = exp(-ringDist*ringDist / 0.006);
      ring += 0.25 * exp(-ringDist*ringDist / 0.04);
      // Show ring only above horizon
      float ringVis = smoothstep(RS * 1.4, RS * 2.6, diskR)
                    * smoothstep(0.0, 0.3, tDisk)
                    * step(bProj, 4.0);
      col += vec3(1.0, 0.65, 0.22) * ring * ringVis * 0.55;

      // ---- Black hole shadow ----
      if (tHorizon > 0.0 && (tDisk < 0.0 || tHorizon < tDisk)) {
        float shadow = smoothstep(RS * 1.2, RS * 0.80, bProj);
        col = mix(col, vec3(0.0), shadow);
      }

      // ---- Spacetime grid ----
      if (tDisk > 0.0 && diskR > RS * 1.4 && diskR < 13.0) {
        float grid = gridPattern(hitDisk.xz, diskR);
        float visG = smoothstep(ISCO + 0.5, ISCO + 3.0, diskR);
        col += vec3(0.7, 0.8, 1.0) * grid * visG * 0.5;
      }

      // ---- Teardrop infalling mass ----
      col += vec3(1.0, 0.55, 0.15) * teardropGlow(uv * 10.0, iTime);

      // ---- Vignette ----
      col *= 1.0 - smoothstep(0.35, 1.15, length(uv)) * 0.6;

      // ---- Pixel grain ----
      col += (fract(sin(dot(fragCoord, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.02;

      fragColor = vec4(col, 1.0);
    }
    void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
  `;

  var vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  /* ================================================================
     Setup
     ================================================================ */
  var SCALE = 0.4;
  var renderer, scene, camera, quad, material, uniforms;
  var dispCanvas, dispCtx;
  var iW, iH, dW, dH;
  var animId;

  function init() {
    iW = Math.floor(window.innerWidth * SCALE);
    iH = Math.floor(window.innerHeight * SCALE);
    dW = window.innerWidth;
    dH = window.innerHeight;

    // ---- Display canvas (full screen, pixelated upscale) ----
    dispCanvas = document.createElement('canvas');
    dispCanvas.id = 'blackhole-bg';
    dispCanvas.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;image-rendering:pixelated;';
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    dispCanvas.width = dW * dpr;
    dispCanvas.height = dH * dpr;
    document.body.insertBefore(dispCanvas, document.body.firstChild);
    dispCtx = dispCanvas.getContext('2d');
    dispCtx.imageSmoothingEnabled = false;

    // ---- WebGL renderer (small internal buffer) ----
    renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(1);
    renderer.setSize(iW, iH);
    renderer.domElement.style.display = 'none'; // hide the raw GL canvas

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    uniforms = {
      iResolution: { value: new THREE.Vector2(iW, iH) },
      iTime: { value: 0 }
    };

    material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      depthWrite: false,
      depthTest: false
    });
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    window.addEventListener('resize', onResize);
    animate(0);
  }

  function onResize() {
    iW = Math.floor(window.innerWidth * SCALE);
    iH = Math.floor(window.innerHeight * SCALE);
    dW = window.innerWidth;
    dH = window.innerHeight;
    renderer.setSize(iW, iH);
    uniforms.iResolution.value.set(iW, iH);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    dispCanvas.width = dW * dpr;
    dispCanvas.height = dH * dpr;
    dispCanvas.style.width = dW + 'px';
    dispCanvas.style.height = dH + 'px';
  }

  function animate(ts) {
    animId = requestAnimationFrame(animate);
    uniforms.iTime.value = ts * 0.001;

    // Render directly to the WebGL canvas (no render target)
    renderer.render(scene, camera);

    // Copy low-res WebGL canvas → fullscreen display canvas (pixelated upscale)
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    dispCanvas.width = dW * dpr;
    dispCanvas.height = dH * dpr;
    dispCtx.imageSmoothingEnabled = false;
    dispCtx.drawImage(
      renderer.domElement,
      0, 0, iW, iH,
      0, 0, dispCanvas.width, dispCanvas.height
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
