/**
 * Black Hole Desktop Background v5.2 — Pixel-Perfect GPU Shader
 *
 * Three.js shader with:
 *  - Differential disk rotation (inner faster, outer slower)
 *  - 25% internal resolution for big crisp pixels
 *  - 4-level color posterization per channel
 *  - Bayer dither for authentic pixel look
 *  - Sharp features, no smooth gradients
 */

(function() {
  'use strict';

  if (!window.THREE) { setTimeout(arguments.callee, 80); return; }
  var THREE = window.THREE;

  var fragmentShader = /* glsl */ `
    precision highp float;
    uniform vec2  iResolution;
    uniform float iTime;

    #define PI   3.14159265359
    #define RS   1.0
    #define ISCO 3.0

    // ---- Bayer 4x4 dither matrix ----
    float bayer4(vec2 p) {
      int x = int(mod(p.x, 4.0));
      int y = int(mod(p.y, 4.0));
      // 4x4 Bayer matrix / 16
      if (y==0) return float(x==0?0:x==1?8:x==2?2:10)/16.0;
      if (y==1) return float(x==0?12:x==1?4:x==2?14:6)/16.0;
      if (y==2) return float(x==0?3:x==1?11:x==2?1:9)/16.0;
      return          float(x==0?15:x==1?7:x==2?13:5)/16.0;
    }

    // Quantize to nLevels for crisp pixel-art look
    vec3 quantize3(vec3 c, float levels) {
      return floor(c * levels + 0.5) / levels;
    }

    float raySphere(vec3 ro, vec3 rd, vec3 c, float r) {
      vec3 oc = ro - c;
      float b = dot(oc, rd);
      float h = b*b - dot(oc,oc) + r*r;
      if (h < 0.0) return -1.0;
      float d = -b - sqrt(h);
      return d > 0.0 ? d : (-b + sqrt(h));
    }

    float deflectionAngle(float b) {
      float bCrit = 2.598076;
      if (b < bCrit * 1.001) return 999.0;
      float a = 2.0 / b + 15.0*PI/16.0/(b*b*b) + 1.5/(b-bCrit);
      return clamp(a, 0.0, PI*2.0);
    }

    // Discrete color bands (sharp, no gradient)
    vec3 diskColor(float r) {
      float t = clamp((r - ISCO) / 9.0, 0.0, 1.0);
      // 8 discrete bands, quantized for pixel look
      float band = floor(t * 8.0);
      if      (band <= 0.0) return vec3(0.50, 0.06, 0.03);
      else if (band <= 1.0) return vec3(0.68, 0.12, 0.04);
      else if (band <= 2.0) return vec3(0.85, 0.35, 0.06);
      else if (band <= 3.0) return vec3(1.00, 0.55, 0.15);
      else if (band <= 4.0) return vec3(0.96, 0.46, 0.12);
      else if (band <= 5.0) return vec3(0.82, 0.28, 0.08);
      else if (band <= 6.0) return vec3(0.55, 0.24, 0.16);
      else                  return vec3(0.25, 0.10, 0.06);
    }

    float gridPattern(vec2 p, float r) {
      float spacing = 1.5;
      vec2 gp = p / spacing;
      float compress = 1.0 + 2.5 * exp(-r*r / 30.0);
      gp *= compress;
      float gx = abs(fract(gp.x + 0.5) - 0.5) * 2.0;
      float gy = abs(fract(gp.y + 0.5) - 0.5) * 2.0;
      float line = min(gx, gy);
      // Sharp line, no smoothstep
      return line < 0.08 ? 0.35 : 0.0;
    }

    float teardropGlow(vec2 uv, float time) {
      float angle = time * 0.15;
      float orbitR = 7.2;
      vec2 center = vec2(-orbitR * cos(angle), orbitR * sin(angle) * 0.35);
      vec2 d = uv - center;
      float dist = length(d);
      float elong = 1.0 - 0.6 * clamp((d.x + 2.0) / 6.0, 0.0, 1.0);
      float shape = dist / elong;

      float glow = 0.0;
      if (shape < 1.8) {  // hard cutoff
        glow = 0.45 * (1.0 - shape / 1.8);
      }
      glow *= 0.7 + 0.3 * sin(time * 2.5 + angle);
      return glow;
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
      vec2 bhUV = uv - vec2(-0.03, 0.02);

      float camDist = 30.0;
      float camHeight = 18.0;
      vec3 ro = vec3(0.0, camHeight, -camDist);
      vec3 rd = normalize(vec3(uv.x, uv.y - camHeight / camDist, 1.0));

      // Background: deep navy
      vec3 bg = vec3(0.02, 0.05, 0.15);
      vec3 col = bg;

      vec3 bhC = vec3(0.0);
      float tHorizon = raySphere(ro, rd, bhC, RS * 1.01);

      float tDisk = -1.0;
      if (abs(rd.y) > 0.0001) tDisk = -ro.y / rd.y;
      vec3 hitDisk = ro + rd * tDisk;

      // ---- DIFFERENTIAL DISK ROTATION ----
      float diskAngle = atan(hitDisk.z, hitDisk.x);
      // Inner rings spin faster (Keplerian profile)
      float diskR_raw = length(hitDisk.xz);
      float rotSpeed = 0.0;
      if (diskR_raw > 0.1) {
        rotSpeed = 1.8 / (pow(diskR_raw, 1.5) + 0.3);
      }
      diskAngle += iTime * rotSpeed;
      vec3 hitDiskRot = vec3(cos(diskAngle) * diskR_raw, hitDisk.y, sin(diskAngle) * diskR_raw);

      float diskR = length(hitDiskRot.xz);

      vec3 rayToBH = bhC - ro;
      float bProj = length(rayToBH - rd * dot(rayToBH, rd));
      float defl = deflectionAngle(bProj);
      float deflR = diskR;
      if (bProj > 0.01 && bProj < 9.0 && defl < 900.0) {
        float shift = defl * tDisk * 0.1 * bProj;
        deflR = max(diskR - shift * 0.5, 0.0);
      }

      if (tDisk > 0.0 && diskR < 12.0 && diskR > RS * 1.1) {
        float r = deflR;
        if (r > ISCO && r < 12.0) {
          vec3 dcol = diskColor(r);

          float doppler = 1.0;
          if (hitDisk.z > 0.0) doppler = 1.0 + clamp(hitDisk.z / 10.0, 0.0, 0.4);
          else if (hitDisk.z < -2.0) doppler = 0.7;
          dcol *= doppler;

          float edge = 1.0;
          if (r < ISCO + 0.6) edge = clamp((r - ISCO) / 0.6, 0.0, 1.0);
          if (r > 9.5) edge *= 1.0 - clamp((r - 9.5) / 2.5, 0.0, 1.0);
          dcol *= edge;

          // Sharp inner glow
          float eg = (r - ISCO) < 0.7 ? 0.35 : 0.0;
          dcol += vec3(0.40, 0.22, 0.06) * eg;

          col = mix(col, dcol, 0.93);
        }
      }

      // Photon ring — sharp single line
      float ringDist = abs(bProj - 2.6);
      float ring = 0.0;
      if (ringDist < 0.08) ring = 0.8;
      else if (ringDist < 0.20) ring = 0.2;
      float ringVis = smoothstep(RS*1.4, RS*2.6, diskR) * step(bProj, 4.0);
      col += vec3(1.0, 0.60, 0.20) * ring * ringVis;

      if (tHorizon > 0.0 && (tDisk < 0.0 || tHorizon < tDisk)) {
        float shadow = smoothstep(RS*1.2, RS*0.80, bProj);
        col = mix(col, vec3(0.0), shadow);
      }

      // Spacetime grid — sharp lines
      if (tDisk > 0.0 && diskR > RS*1.4 && diskR < 13.0) {
        float grid = gridPattern(hitDisk.xz, diskR);
        float visG = clamp((diskR - ISCO - 0.5) / 2.5, 0.0, 1.0);
        col += vec3(0.6, 0.7, 1.0) * grid * visG;
      }

      // Teardrop mass
      col += vec3(1.0, 0.50, 0.12) * teardropGlow(uv * 10.0, iTime);

      // Vignette
      col *= 1.0 - clamp(length(uv) - 0.35, 0.0, 0.8) * 0.55 / 0.8;

      // ---- Bayer dither for authentic pixel look ----
      float dither = bayer4(fragCoord.xy) - 0.5;
      col += dither * 0.06;

      // ---- Posterize to 6 levels for crisp pixel art ----
      col = quantize3(col, 6.0);

      fragColor = vec4(col, 1.0);
    }
    void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
  `;

  var vertexShader = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

  /* ================================================================ */
  var SCALE = 0.25; // 25% internal → big crisp pixels
  var renderer, scene, camera, quad, material, uniforms;
  var dispCanvas, dispCtx;
  var iW, iH, dW, dH;
  var animId;

  function init() {
    iW = Math.floor(window.innerWidth * SCALE);
    iH = Math.floor(window.innerHeight * SCALE);
    dW = window.innerWidth;
    dH = window.innerHeight;

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

    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(iW, iH);
    renderer.domElement.style.display = 'none';

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
    renderer.render(scene, camera);

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    dispCanvas.width = dW * dpr;
    dispCanvas.height = dH * dpr;
    dispCtx.imageSmoothingEnabled = false;
    dispCtx.drawImage(renderer.domElement, 0, 0, iW, iH, 0, 0, dispCanvas.width, dispCanvas.height);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
