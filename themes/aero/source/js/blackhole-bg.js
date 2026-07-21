/**
 * Black Hole v6.2 — Direct render, no drawImage, no display canvas
 */
(function() {
  'use strict';
  if (!window.THREE) { setTimeout(arguments.callee, 80); return; }
  var THREE = window.THREE;

  var frag = `
    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;
    #define PI 3.14159265359

    float hash(float n) { return fract(sin(n)*43758.5453); }

    vec4 spiral(vec2 uv, float time) {
      float r = length(uv);
      float a = atan(uv.y, uv.x);
      float ir = 0.8, or = 6.0;
      if (r < ir || r > or) return vec4(0.0);
      float t = (r - ir) / (or - ir);
      float twist = time * (1.0 - t) * 3.0;
      float sa = a - twist - t * 8.0 - time * 0.5;
      float arms = 5.0;
      float hit = 0.0;
      for (int ii = 0; ii < 5; ii++) {
        float i = float(ii);
        float d = abs(fract(sa * arms/(PI*2.0) + i/arms + 0.5) - 0.5) * 2.0;
        float spread = mix(0.03, 0.07, t);
        float seed = hash(floor(sa*20.0 + i*7.0) + floor(r*8.0));
        float h = 1.0 - d / (spread + seed*0.04);
        if (h > 0.0) hit = max(hit, h);
      }
      float alpha = hit * mix(0.55, 0.12, t) * 0.65;
      vec3 inner = vec3(1.0, 0.5, 0.5);
      vec3 outer = vec3(0.21, 0.2, 1.0);
      return vec4(mix(inner, outer, t), alpha);
    }

    vec3 stars(vec2 uv, float time) {
      vec3 col = vec3(0.0);
      for (int ii = 0; ii < 200; ii++) {
        float i = float(ii);
        float s = hash(i);
        float r = 1.0 + s * 7.0;
        float a = hash(i+0.1)*PI*2.0;
        float b = hash(i+0.2);
        float tw = 0.5+0.5*sin(time*2.0+s*100.0);
        float d2 = (uv.x-cos(a)*r)*(uv.x-cos(a)*r) + (uv.y-sin(a)*r)*(uv.y-sin(a)*r);
        float sz = 0.008 + b*0.02;
        if (d2 < sz*sz) col += mix(vec3(0.8,0.8,1.0), vec3(1.0), b) * (1.0-sqrt(d2)/sz) * tw * 0.8;
      }
      return col;
    }

    float shadow(vec2 uv) {
      float r = length(uv);
      if (r < 0.43) return 1.0;
      if (r < 0.60) return 1.0 - (r-0.43)/(0.60-0.43);
      return 0.0;
    }

    float ring(vec2 uv) {
      float r = length(uv);
      return max(0.0, 1.0 - abs(r-0.58)*35.0) * 0.65;
    }

    void main() {
      vec2 fc2 = gl_FragCoord.xy;
      vec2 uv = (fc2 - 0.5*iResolution.xy) / iResolution.y * 3.0;
      vec3 col = vec3(0.015, 0.035, 0.10);
      col += stars(uv, iTime);
      vec4 sp = spiral(uv, iTime);
      col = mix(col, sp.rgb, sp.a);
      col += vec3(1.0,0.6,0.3) * ring(uv);
      col = mix(col, vec3(0.0), shadow(uv));
      col *= 1.0 - smoothstep(0.5, 1.6, length(uv/3.0))*0.55;
      col = floor(col*6.0+0.5)/6.0;
      // Simple grain
      col += (fract(sin(dot(fc2,vec2(12.9898,78.233)))*43758.5453)-0.5)*0.04;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  var renderer, scene, camera, quad, mat, uniforms, animId;
  var canvas;

  function init() {
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);

    canvas = renderer.domElement;
    canvas.style.cssText = 'position:fixed;top:0;left:0;z-index:0;pointer-events:none;';

    // Remove any existing bg canvas
    var old = document.getElementById('blackhole-bg');
    if (old) old.remove();
    canvas.id = 'blackhole-bg';
    document.body.insertBefore(canvas, document.body.firstChild);

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    uniforms = {
      iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      iTime: { value: 0 }
    };
    mat = new THREE.ShaderMaterial({
      vertexShader: "void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: frag,
      uniforms: uniforms,
      depthWrite: false, depthTest: false
    });
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(quad);

    window.addEventListener('resize', function() {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    });
    animate(0);
  }

  function animate(ts) {
    animId = requestAnimationFrame(animate);
    uniforms.iTime.value = ts * 0.001;
    renderer.render(scene, camera);
  }

  // Listen for GL context errors
  setTimeout(function() {
    if (!renderer || !renderer.getContext) return;
    var gl = renderer.getContext();
    var err = gl.getError();
    if (err !== 0) console.warn('[blackhole-bg] WebGL error after init:', err);
  }, 500);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
