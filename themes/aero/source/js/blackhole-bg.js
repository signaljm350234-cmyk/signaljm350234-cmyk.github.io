/**
 * Black Hole Desktop Background v5 — Three.js GPU Shader
 *
 * Renders a physically-based Schwarzschild black hole with:
 *  - Gravitational lensing (light deflection)
 *  - Full accretion disk with temperature coloring
 *  - Photon ring
 *  - Spacetime curvature grid
 *  - Teardrop infalling mass
 *  - Pixel-art upscaling for retro look
 *
 * Three.js loaded via CDN in layout template.
 * This file expects `window.THREE` to be available.
 */

(function() {
  'use strict';

  var THREE = window.THREE;
  if (!THREE) {
    // Retry after a short delay — CDN might still be loading
    setTimeout(arguments.callee, 100);
    return;
  }

  /* ================================================================
     Fragment Shader — Where everything happens
     ================================================================ */
  var fragmentShader = /* glsl */ `
    precision highp float;

    uniform vec2  iResolution;
    uniform float iTime;
    uniform vec2  iMouse;

    #define PI   3.14159265359
    #define TAU  6.28318530718
    #define RS   1.0
    #define ISCO 3.0

    // ---------------------------------------------------------------
    // Ray-sphere (black hole horizon) hit test
    // ---------------------------------------------------------------
    float raySphere(vec3 ro, vec3 rd, vec3 center, float radius) {
      vec3 oc = ro - center;
      float b = dot(oc, rd);
      float c = dot(oc, oc) - radius * radius;
      float h = b * b - c;
      if (h < 0.0) return -1.0;
      float d = -b - sqrt(h);
      return d > 0.0 ? d : (-b + sqrt(h));
    }

    // ---------------------------------------------------------------
    // Deflection angle for light passing Schwarzschild black hole
    // Approximate formula: alpha = 2*rs / b  (weak field)
    // Strong field correction near photon sphere (b -> sqrt(27)/2 * rs ≈ 2.598)
    // ---------------------------------------------------------------
    float deflectionAngle(float b) {
      float bCrit = 2.598076; // 3*sqrt(3)/2
      if (b < bCrit * 1.001) return 999.0; // captured
      // Strong-field approximation
      float alpha = 2.0 / b;                         // leading order
      alpha += 15.0 * PI / 16.0 / (b * b * b);     // 2nd order
      alpha += 1.5 / (b - bCrit);                    // divergence near photon sphere
      return clamp(alpha, 0.0, PI * 2.0);
    }

    // ---------------------------------------------------------------
    // Disk color — temperature profile (Qwen reference)
    // ---------------------------------------------------------------
    vec3 diskColor(float r) {
      float t = (r - ISCO) / 9.0;   // 0 at ISCO, ~1 at outer edge
      t = clamp(t, 0.0, 1.0);

      vec3 col;
      if      (t < 0.06) col = vec3(0.55, 0.07, 0.03);  // dark red (inner, redshifted)
      else if (t < 0.15) col = vec3(0.70, 0.12, 0.04);
      else if (t < 0.25) col = vec3(0.87, 0.35, 0.06);  // orange-red
      else if (t < 0.40) col = vec3(1.00, 0.55, 0.14);  // bright orange (main glow)
      else if (t < 0.55) col = vec3(0.98, 0.47, 0.11);
      else if (t < 0.70) col = vec3(0.82, 0.28, 0.07);  // cooling
      else if (t < 0.85) col = vec3(0.60, 0.26, 0.18);  // pale pink
      else               col = vec3(0.30, 0.12, 0.08);  // fading
      return col;
    }

    // ---------------------------------------------------------------
    // Spacetime grid — computed on equatorial plane
    // ---------------------------------------------------------------
    float gridPattern(vec2 p, float bhDist) {
      float spacing = 1.5;
      // Warp grid lines near black hole (funnel depression)
      float warp = 4.0 * exp(-bhDist * bhDist / 20.0);
      vec2 gp = p / spacing;
      // Radial compression near black hole
      float r = length(p);
      float compress = 1.0 + 2.5 * exp(-r * r / 30.0);
      gp *= compress;

      float gx = abs(fract(gp.x + 0.5) - 0.5) * 2.0;
      float gy = abs(fract(gp.y + 0.5) - 0.5) * 2.0;
      float line = min(gx, gy);
      float grid = 0.04 / (line + 0.04) - 0.5;

      // Darker near black hole (behind disk)
      float visibility = 0.15 + 0.05 * (1.0 - exp(-r * r / 50.0));
      return grid * visibility;
    }

    // ---------------------------------------------------------------
    // Teardrop infalling mass (distance-field based glow)
    // ---------------------------------------------------------------
    float teardropGlow(vec2 uv) {
      // Position: left of the black hole
      vec2 center = vec2(-7.0, 0.3);
      float angle = iTime * 0.15;
      float orbitR = 7.0;
      center = vec2(-orbitR * cos(angle), orbitR * sin(angle) * 0.4);

      vec2 d = uv - center;
      float dist = length(d);

      // Teardrop shape: elongated toward black hole
      float elong = 1.0 - 0.6 * smoothstep(-2.0, 4.0, d.x);
      float shape = dist / elong;

      // Glow
      float glow = 0.0;
      glow += 0.35 * exp(-shape * shape / 0.3);
      glow += 0.15 * exp(-shape * shape / 1.2);
      glow += 0.05 * exp(-shape * shape / 3.0);

      // Pulsation
      glow *= 0.7 + 0.3 * sin(iTime * 2.5 + angle);

      return glow;
    }

    // ---------------------------------------------------------------
    // Main
    // ---------------------------------------------------------------
    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      // --- Coordinate setup ---
      vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
      // Black hole center (slightly offset for composition)
      vec2 bhUV = uv - vec2(-0.03, 0.02);

      // Camera: far above the equatorial plane, looking down at an angle
      float camDist = 30.0;
      float camHeight = 18.0;  // above disk plane
      vec3 ro = vec3(0.0, camHeight, -camDist);
      vec3 rd = normalize(vec3(uv.x, uv.y - camHeight / camDist, 1.0));

      // --- Background: deep blue gradient ---
      vec3 bgColor = mix(
        vec3(0.02, 0.05, 0.16),  // dark navy corner
        vec3(0.04, 0.08, 0.22),  // brighter center
        smoothstep(0.0, 0.8, 1.0 - length(bhUV))
      );
      vec3 col = bgColor;

      // --- Ray trace to black hole ---
      vec3 bhCenter = vec3(0.0, 0.0, 0.0);
      float tHorizon = raySphere(ro, rd, bhCenter, RS * 1.01);
      float tPhoton  = raySphere(ro, rd, bhCenter, RS * 1.7);

      // --- Accretion disk intersection ---
      // Disk lies on y=0 (equatorial plane)
      float tDisk = -1.0;
      if (abs(rd.y) > 0.0001) {
        tDisk = -ro.y / rd.y;  // time to reach y=0 plane
      }

      vec3 hitDisk = ro + rd * tDisk;
      float diskR = length(hitDisk.xz);

      // --- Compute gravitational deflection ---
      // Impact parameter of the ray relative to black hole
      vec3 rayToBH = bhCenter - ro;
      float bProj = length(rayToBH - rd * dot(rayToBH, rd)); // perpendicular distance

      // The deflected ray will intersect the disk at a different radius
      float deflAngle = deflectionAngle(bProj);
      // Deflection direction: toward the black hole, in the plane perpendicular to ray
      vec3 deflectDir = normalize(bhCenter - (ro + rd * dot(bhCenter - ro, rd)));
      // Apply deflection to the disk intersection point
      vec3 deflectedHit = hitDisk;
      if (bProj < 8.0 && bProj > 0.01) {
        float shift = deflAngle * tDisk * 0.15;
        deflectedHit.xz += deflectDir.xz * shift * bProj;
        deflectedHit.xz -= bhCenter.xz * shift * 0.3;  // extra pull inward
      }
      float deflectedR = length(deflectedHit.xz);

      // --- Render disk ---
      if (tDisk > 0.0 && diskR < 12.0 && diskR > RS * 1.1) {
        float r = deflectedR;

        if (r > ISCO && r < 12.0) {
          vec3 dcol = diskColor(r);

          // Hotspot: approaching side (bottom half of disk in screen space)
          float doppler = 1.0;
          if (deflectedHit.z > 0.0) {
            // Approaching side — brighter
            float appFactor = smoothstep(0.0, 10.0, deflectedHit.z);
            doppler = 1.0 + appFactor * 0.4;
          }
          // Receding side — slightly dimmer
          if (deflectedHit.z < -2.0) {
            doppler = 0.7;
          }
          dcol *= doppler;

          // Radial brightness falloff
          float bright = 1.0;
          if (r < ISCO + 0.8) bright = smoothstep(ISCO, ISCO + 0.8, r);
          if (r > 9.0) bright = 1.0 - smoothstep(9.0, 12.0, r);
          dcol *= bright;

          // Inner edge glow
          float edgeGlow = exp(-(r - ISCO) * (r - ISCO) / 0.4);
          dcol += vec3(0.5, 0.3, 0.1) * edgeGlow * 0.4;

          col = mix(col, dcol, 0.95);
        }
      }

      // --- Photon ring ---
      if (tPhoton > 0.0) {
        float photonDist = abs(bProj - 2.6);
        float ring = exp(-photonDist * photonDist / 0.008);
        ring += 0.3 * exp(-photonDist * photonDist / 0.05);
        // Ring only visible where disk is NOT in front (above hole)
        float ringVis = smoothstep(RS * 1.5, RS * 2.5, diskR);
        col += vec3(1.0, 0.7, 0.25) * ring * ringVis * 0.6;
      }

      // --- Black hole shadow ---
      if (tHorizon > 0.0 && (tDisk < 0.0 || tHorizon < tDisk)) {
        float shadow = smoothstep(RS * 1.15, RS * 0.85, bProj);
        col = mix(col, vec3(0.0), shadow);
      }

      // --- Spacetime grid (on equatorial plane, seen through disk) ---
      if (tDisk > 0.0 && diskR > RS * 1.3) {
        float grid = gridPattern(hitDisk.xz, diskR);
        // Grid only visible outside the very bright inner disk
        float gridVis = smoothstep(ISCO + 0.5, ISCO + 2.5, diskR);
        col += vec3(0.7, 0.8, 1.0) * grid * gridVis * 0.6;
      }

      // --- Teardrop infalling mass ---
      float tear = teardropGlow(uv * 10.0);
      col += vec3(1.0, 0.55, 0.15) * tear;

      // --- Vignette ---
      float vig = 1.0 - smoothstep(0.35, 1.15, length(uv)) * 0.65;
      col *= vig;

      // --- Subtle film grain for pixel aesthetic ---
      float grain = fract(sin(dot(fragCoord, vec2(12.9898, 78.233))) * 43758.5453);
      col += (grain - 0.5) * 0.025;

      fragColor = vec4(col, 1.0);
    }

    void main() {
      mainImage(gl_FragColor, gl_FragCoord.xy);
    }
  `;

  /* ================================================================
     Vertex Shader — Fullscreen triangle
     ================================================================ */
  var vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  /* ================================================================
     JS Setup
     ================================================================ */
  var RENDER_SCALE = 0.4; // internal render at 40% → pixel look + perf
  var scene, camera, quad, material, renderer, rt, displayCanvas, displayCtx;
  var uniforms;
  var animId;

  function init() {
    // --- Display canvas (full screen, pixelated upscale) ---
    displayCanvas = document.createElement('canvas');
    displayCanvas.id = 'blackhole-bg';
    displayCanvas.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;image-rendering:pixelated;';
    document.body.insertBefore(displayCanvas, document.body.firstChild);
    displayCtx = displayCanvas.getContext('2d');
    displayCtx.imageSmoothingEnabled = false;

    // --- Three.js renderer ---
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);

    var iW = Math.floor(window.innerWidth * RENDER_SCALE);
    var iH = Math.floor(window.innerHeight * RENDER_SCALE);
    renderer.setSize(iW, iH);

    // --- Render target ---
    rt = new THREE.WebGLRenderTarget(iW, iH, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat
    });

    // --- Scene ---
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // --- Uniforms ---
    uniforms = {
      iResolution: { value: new THREE.Vector2(iW, iH) },
      iTime: { value: 0 },
      iMouse: { value: new THREE.Vector2(0, 0) }
    };

    // --- Fullscreen quad ---
    material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      depthWrite: false,
      depthTest: false
    });
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    // --- Events ---
    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', function(e) {
      uniforms.iMouse.value.set(
        e.clientX / window.innerWidth,
        1.0 - e.clientY / window.innerHeight
      );
    });

    // --- Start ---
    animate(0);
  }

  function onResize() {
    var iW = Math.floor(window.innerWidth * RENDER_SCALE);
    var iH = Math.floor(window.innerHeight * RENDER_SCALE);
    renderer.setSize(iW, iH);
    rt.setSize(iW, iH);
    uniforms.iResolution.value.set(iW, iH);

    // Resize display canvas
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    displayCanvas.width = window.innerWidth * dpr;
    displayCanvas.height = window.innerHeight * dpr;
    displayCanvas.style.width = window.innerWidth + 'px';
    displayCanvas.style.height = window.innerHeight + 'px';
  }

  function animate(ts) {
    animId = requestAnimationFrame(animate);
    uniforms.iTime.value = ts * 0.001;

    // Render at low internal resolution
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    // Upscale to display canvas (pixelated)
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    displayCanvas.width = window.innerWidth * dpr;
    displayCanvas.height = window.innerHeight * dpr;
    displayCtx.imageSmoothingEnabled = false;
    displayCtx.drawImage(
      renderer.domElement,
      0, 0,
      renderer.domElement.width, renderer.domElement.height,
      0, 0,
      displayCanvas.width, displayCanvas.height
    );
  }

  /* ================================================================
     Bootstrap
     ================================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
