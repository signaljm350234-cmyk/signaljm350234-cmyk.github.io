/**
 * Black Hole v6.1 — Single-pass spiral engine
 * No render targets, no multi-scene. One quad, one fragment shader.
 * Particle spiral computed per-pixel via math, not geometry.
 */
(function() {
  'use strict';
  if (!window.THREE) { setTimeout(arguments.callee, 80); return; }
  var THREE = window.THREE;

  var fragmentShader = /* glsl */ `
    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;

    #define PI 3.14159265359
    #define STAR_COUNT 200.0

    // Hash
    float hash(float n) { return fract(sin(n) * 43758.5453); }
    float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }

    // ===== Per-pixel spiral ring calculation =====
    // Returns (color, alpha) based on whether this pixel hits a spiral particle
    vec4 spiralParticle(vec2 uv, float time) {
      float r = length(uv);
      float angle = atan(uv.y, uv.x);

      // Particles exist from innerRadius to outerRadius
      float innerR = 0.8;
      float outerR = 6.0;
      if (r < innerR || r > outerR) return vec4(0.0);

      // Normalized 0..1 across the disk
      float t = (r - innerR) / (outerR - innerR);

      // Differential rotation: inner spins faster
      float rotSpeed = (1.0 - t) * 3.0;
      float twist = time * rotSpeed;
      // Spiral arms: angle wraps with radius
      float spiralAngle = angle - twist - t * 8.0 - time * 0.5;

      // Multiple arms via modulo
      float arms = 5.0;
      float armDist = abs(fract(spiralAngle * arms / (PI * 2.0) + 0.5) - 0.5) * 2.0;

      // Particle density varies with radius (more at center, less at edge)
      float density = mix(0.6, 0.15, t);
      // Randomness seed per position
      float seed = hash(floor(spiralAngle * 20.0) + floor(r * 8.0));
      float hit = 0.0;

      // Each arm has random gaps
      for (float i = 0.0; i < arms; i++) {
        float aOff = i / arms;
        float a = abs(fract(spiralAngle * arms / (PI * 2.0) + aOff + 0.5) - 0.5) * 2.0;
        float spread = mix(0.025, 0.06, t);
        float d = a / (spread + seed * 0.03);
        if (d < 1.0) {
          hit = max(hit, 1.0 - d);
        }
      }

      // Color: warm orange inner → blue-purple outer
      vec3 innerCol = vec3(1.0, 0.5, 0.5);  // #ff8080
      vec3 outerCol = vec3(0.212, 0.2, 1.0); // #3633ff
      vec3 col = mix(innerCol, outerCol, t);

      float alpha = hit * density * 0.6;
      return vec4(col, alpha);
    }

    // ===== Background stars =====
    vec3 starfield(vec2 uv, float time) {
      vec3 col = vec3(0.0);
      float r = length(uv);
      if (r > 1.0 && r < 8.0) {
        float a = atan(uv.y, uv.x);
        for (float i = 0.0; i < STAR_COUNT; i++) {
          float seed = i / STAR_COUNT;
          float sR = 1.0 + hash(seed) * 7.0;
          float sA = hash(seed + 0.1) * PI * 2.0;
          float sB = hash(seed + 0.2);
          float twinkle = 0.5 + 0.5 * sin(time * 2.0 + seed * 100.0);
          float dist = length(uv - vec2(cos(sA) * sR, sin(sA) * sR));
          float size = 0.008 + sB * 0.02;
          if (dist < size) {
            vec3 sCol = mix(vec3(0.8,0.8,1.0), vec3(1.0,1.0,1.0), sB);
            col += sCol * (1.0 - dist / size) * twinkle * 0.8;
          }
        }
      }
      return col;
    }

    // ===== Black hole shadow =====
    float bhShadow(vec2 uv) {
      float r = length(uv);
      float inner = 0.45;
      float outer = 0.62;
      if (r < inner) return 1.0;
      if (r < outer) return 1.0 - smoothstep(inner, outer, r);
      return 0.0;
    }

    // ===== Photon ring =====
    float photonRing(vec2 uv) {
      float r = length(uv);
      float ringR = 0.60;
      return exp(-abs(r - ringR) * 40.0) * 0.7;
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y * 3.0;

      // Deep space background
      vec3 col = vec3(0.02, 0.04, 0.12);

      // Stars
      col += starfield(uv, iTime);

      // Spiral disk
      vec4 spiral = spiralParticle(uv, iTime);
      col = mix(col, spiral.rgb, spiral.a);

      // Photon ring
      float ring = photonRing(uv);
      col += vec3(1.0, 0.6, 0.3) * ring;

      // Black hole shadow (on top of everything)
      float shadow = bhShadow(uv);
      col = mix(col, vec3(0.0), shadow);

      // Vignette
      float vig = 1.0 - smoothstep(0.6, 1.6, length(uv / 3.0));
      col *= vig;

      // Pixel grain + posterize for crisp look
      col = floor(col * 6.0 + 0.5) / 6.0;

      fragColor = vec4(col, 1.0);
    }

    void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
  `;

  var vertexShader = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

  var SCALE = 0.35;
  var renderer, scene, camera, quad, material, uniforms;
  var dispCanvas, dispCtx;
  var iW, iH, dW, dH, animId;

  function init() {
    iW = Math.floor(window.innerWidth * SCALE);
    iH = Math.floor(window.innerHeight * SCALE);
    dW = window.innerWidth;
    dH = window.innerHeight;

    dispCanvas = document.createElement('canvas');
    dispCanvas.id = 'blackhole-bg';
    dispCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;image-rendering:pixelated;';
    document.body.insertBefore(dispCanvas, document.body.firstChild);
    dispCtx = dispCanvas.getContext('2d');
    dispCtx.imageSmoothingEnabled = false;

    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(iW, iH);
    renderer.domElement.style.display = 'none';
    // Debug: log WebGL errors
    var gl = renderer.getContext();
    var origErr = gl.getError.bind(gl);
    gl.getError = function() { var e = origErr(); if (e !== 0) console.warn('[blackhole-bg] WebGL error:', e); return e; };

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
      depthWrite: false, depthTest: false
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
  }

  function animate(ts) {
    animId = requestAnimationFrame(animate);
    uniforms.iTime.value = ts * 0.001;
    renderer.render(scene, camera);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    dispCanvas.width = dW * dpr;
    dispCanvas.height = dH * dpr;
    dispCanvas.style.width = dW + 'px';
    dispCanvas.style.height = dH + 'px';
    dispCtx.imageSmoothingEnabled = false;
    dispCtx.drawImage(renderer.domElement, 0, 0, iW, iH, 0, 0, dispCanvas.width, dispCanvas.height);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
