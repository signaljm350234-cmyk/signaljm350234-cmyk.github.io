/**
 * Black Hole Background v6 — Particle Spiral Engine
 *
 * Technique ported from CodePen "galaxy" source (MIT).
 * 50K particles in Keplerian spiral orbits with differential rotation.
 * Point sprite circles + center disc + distortion post-processing.
 * Three.js CDN required.
 */
(function() {
  'use strict';
  if (!window.THREE) { setTimeout(arguments.callee, 80); return; }
  var THREE = window.THREE;

  /* ================================================================
     Disc Vertex Shader — spiral particle disc orbiting center
     ================================================================ */
  var discVert = /* glsl */ `
    uniform mat4 projectionMatrix;
    uniform mat4 modelViewMatrix;
    uniform float uTime;
    uniform vec3 uInnerColor;
    uniform vec3 uOuterColor;
    uniform float uViewHeight;
    uniform float uSize;
    attribute float position;  // 0..1 normalized distance from center
    attribute float aSize;
    attribute float aRandom;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float concentration = 0.05;
      float outerProgress = smoothstep(0.0, 1.0, position);
      outerProgress = mix(concentration, outerProgress, pow(aRandom, 1.7));
      float radius = 1.0 + outerProgress * 5.0;
      // Differential rotation: inner rings spin faster
      float angle = outerProgress - uTime * (1.0 - outerProgress) * 3.0;
      vec3 newPosition = vec3(sin(angle) * radius, 0.0, cos(angle) * radius);
      vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = aSize * uSize * uViewHeight;
      gl_PointSize *= (1.0 / -mvPosition.z);
      vColor = mix(uInnerColor, uOuterColor, outerProgress);
      vAlpha = 1.0 - outerProgress * 0.6;
    }`;

  var discFrag = /* glsl */ `
    precision highp float;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.35, dist) * vAlpha * 0.55;
      gl_FragColor = vec4(vColor, alpha);
    }`;

  /* ================================================================
     Distortion Vertex/Fragment — radial lensing mask
     ================================================================ */
  var distVert = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;

  var distFrag = /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    float remap(float v, float inMin, float inMax, float outMin, float outMax) {
      return outMin + (v - inMin) / (inMax - inMin) * (outMax - outMin);
    }
    void main() {
      float d = length(vUv - 0.5);
      float strength = remap(d, 0.0, 0.15, 1.0, 0.0);
      strength = smoothstep(0.0, 1.0, strength);
      gl_FragColor = vec4(strength, 1.0, 1.0, 1.0);
    }`;

  var maskFrag = /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    float remap(float v, float inMin, float inMax, float outMin, float outMax) {
      return outMin + (v - inMin) / (inMax - inMin) * (outMax - outMin);
    }
    void main() {
      float d = length(vUv - 0.5);
      float a = smoothstep(0.0, 0.15, d);
      float alpha = smoothstep(0.0, 1.0, remap(d, 0.4, 0.5, 1.0, 0.0));
      gl_FragColor = vec4(a, 0.0, 0.0, alpha);
    }`;

  /* ================================================================
     Star Vertex/Fragment — background starfield
     ================================================================ */
  var starVert = /* glsl */ `
    uniform mat4 projectionMatrix;
    uniform mat4 modelViewMatrix;
    uniform float uViewHeight;
    uniform float uSize;
    attribute float aSize;
    attribute vec3 aColor;
    varying vec3 vColor;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uSize * uViewHeight;
      vColor = aColor;
    }`;

  var starFrag = /* glsl */ `
    precision highp float;
    varying vec3 vColor;
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      gl_FragColor = vec4(vColor, 1.0);
    }`;

  /* ================================================================
     Final Comp Fragment — screenspace RGB shift for lensing
     ================================================================ */
  var finalVert = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;

  var finalFrag = /* glsl */ `
    precision highp float;
    uniform sampler2D tSpace;
    uniform sampler2D tDistortion;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec4 dist = texture2D(tDistortion, vUv);
      float shift = dist.r * 0.02;
      // RGB chromatic aberration from lensing
      float r = texture2D(tSpace, vUv + vec2(shift * 1.5, 0.0)).r;
      float g = texture2D(tSpace, vUv).g;
      float b = texture2D(tSpace, vUv - vec2(shift * 1.5, 0.0)).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }`;

  /* ================================================================
     Setup
     ================================================================ */
  var SCALE = 0.3;
  var renderer, scene, camera, dispCanvas, dispCtx;
  var rts, discParticles, starPoints, distQuad, maskQuad, finalQuad, finalMat;
  var discMat, starMat;
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
    document.body.insertBefore(dispCanvas, document.body.firstChild);
    dispCtx = dispCanvas.getContext('2d');
    dispCtx.imageSmoothingEnabled = false;

    renderer = new THREE.WebGLRenderer({
      antialias: false, alpha: false, preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(1);
    renderer.setSize(iW, iH);
    renderer.domElement.style.display = 'none';
    renderer.autoClear = false;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, iW / iH, 0.1, 1000);
    camera.position.set(0, 14, 8);
    camera.lookAt(0, 0, 0);

    // ---- Render Targets ----
    rts = {
      space: new THREE.WebGLRenderTarget(iW, iH, {
        minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat
      }),
      distortion: new THREE.WebGLRenderTarget(iW, iH, {
        minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat
      })
    };

    // ---- Disc particles (50K spiral) ----
    var COUNT = 50000;
    var posAttr = new Float32Array(COUNT);
    var sizeAttr = new Float32Array(COUNT);
    var rndAttr = new Float32Array(COUNT);
    for (var i = 0; i < COUNT; i++) {
      posAttr[i] = Math.random();
      sizeAttr[i] = Math.random();
      rndAttr[i] = Math.random();
    }
    var discGeo = new THREE.BufferGeometry();
    discGeo.setAttribute('position', new THREE.BufferAttribute(posAttr, 1));
    discGeo.setAttribute('aSize', new THREE.BufferAttribute(sizeAttr, 1));
    discGeo.setAttribute('aRandom', new THREE.BufferAttribute(rndAttr, 1));

    discMat = new THREE.ShaderMaterial({
      vertexShader: discVert,
      fragmentShader: discFrag,
      uniforms: {
        uTime: { value: 0 },
        uInnerColor: { value: new THREE.Color('#ff8080') },
        uOuterColor: { value: new THREE.Color('#3633ff') },
        uViewHeight: { value: iH },
        uSize: { value: 0.015 }
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true
    });
    discParticles = new THREE.Points(discGeo, discMat);
    discParticles.frustumCulled = false;

    // ---- Background stars (50K) ----
    var sPositions = new Float32Array(COUNT * 3);
    var sSizes = new Float32Array(COUNT);
    var sColors = new Float32Array(COUNT * 3);
    for (var j = 0; j < COUNT; j++) {
      var a = 2 * Math.PI * Math.random();
      var o = Math.acos(2 * Math.random() - 1);
      var r = 400;
      sPositions[j * 3] = Math.cos(a) * Math.sin(o) * r;
      sPositions[j * 3 + 1] = Math.sin(a) * Math.sin(o) * r;
      sPositions[j * 3 + 2] = Math.cos(o) * r;
      sSizes[j] = Math.random();
      var c = new THREE.Color('hsl(' + Math.round(360 * Math.random()) + ', 100%, 80%)');
      sColors[j * 3] = c.r;
      sColors[j * 3 + 1] = c.g;
      sColors[j * 3 + 2] = c.b;
    }
    var starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sPositions, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(sSizes, 1));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(sColors, 3));

    starMat = new THREE.ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: starFrag,
      uniforms: {
        uViewHeight: { value: iH },
        uSize: { value: 0.001 }
      },
      depthWrite: false,
      depthTest: false
    });
    starPoints = new THREE.Points(starGeo, starMat);
    starPoints.frustumCulled = false;

    // ---- Distortion mesh ----
    var distGeo = new THREE.PlaneGeometry(10, 10);
    var distMatLocal = new THREE.ShaderMaterial({
      vertexShader: distVert,
      fragmentShader: distFrag,
      depthWrite: false, depthTest: false, transparent: true,
      side: THREE.DoubleSide
    });
    distQuad = new THREE.Mesh(distGeo, distMatLocal);
    distQuad.renderOrder = 2;

    // ---- Mask mesh ----
    var maskMatLocal = new THREE.ShaderMaterial({
      vertexShader: distVert,
      fragmentShader: maskFrag,
      depthWrite: false, depthTest: false, transparent: true,
      side: THREE.DoubleSide
    });
    maskQuad = new THREE.Mesh(distGeo.clone(), maskMatLocal);
    maskQuad.rotation.x = Math.PI * 0.5;

    // ---- Final composite quad ----
    finalMat = new THREE.ShaderMaterial({
      vertexShader: finalVert,
      fragmentShader: finalFrag,
      uniforms: {
        tSpace: { value: rts.space.texture },
        tDistortion: { value: rts.distortion.texture },
        uTime: { value: 0 }
      },
      depthWrite: false, depthTest: false
    });
    finalQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), finalMat);

    // ---- Scene graph ----
    var spaceScene = new THREE.Scene();
    spaceScene.add(starPoints);
    spaceScene.add(discParticles);

    var distScene = new THREE.Scene();
    distScene.add(distQuad);
    distScene.add(maskQuad);

    var finalScene = new THREE.Scene();
    var finalCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    finalScene.add(finalQuad);

    window.addEventListener('resize', onResize);
    animate(0);

    function animate(ts) {
      animId = requestAnimationFrame(animate);
      var t = ts * 0.001;

      discMat.uniforms.uTime.value = t + 9999;
      finalMat.uniforms.uTime.value = t;
      camera.position.x = Math.sin(t * 0.05) * 2;

      // Pass 1: Render space scene to space RT
      renderer.setRenderTarget(rts.space);
      renderer.clear(true, true, true);
      renderer.render(spaceScene, camera);

      // Pass 2: Render distortion mask to distortion RT
      distQuad.lookAt(camera.position);
      renderer.setRenderTarget(rts.distortion);
      renderer.clear(true, true, true);
      renderer.render(distScene, camera);

      // Pass 3: Final composite to screen
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(finalScene, finalCam);

      // Upscale to display
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      dispCanvas.width = dW * dpr;
      dispCanvas.height = dH * dpr;
      dispCtx.imageSmoothingEnabled = false;
      dispCtx.drawImage(renderer.domElement, 0, 0, iW, iH, 0, 0, dispCanvas.width, dispCanvas.height);
    }
  }

  function onResize() {
    iW = Math.floor(window.innerWidth * SCALE);
    iH = Math.floor(window.innerHeight * SCALE);
    dW = window.innerWidth;
    dH = window.innerHeight;
    renderer.setSize(iW, iH);
    camera.aspect = iW / iH;
    camera.updateProjectionMatrix();
    rts.space.setSize(iW, iH);
    rts.distortion.setSize(iW, iH);
    discMat.uniforms.uViewHeight.value = iH;
    starMat.uniforms.uViewHeight.value = iH;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
