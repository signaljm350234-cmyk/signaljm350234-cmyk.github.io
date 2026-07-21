/**
 * Black Hole Desktop Background — Canvas renderer
 * Renders a beautiful black hole with accretion disk and gravitational lensing.
 * Main scene renders once at device resolution, cached as bitmap.
 * Stars twinkle at low update rate for minimal CPU usage.
 */

(function() {
    'use strict';

    var canvas, ctx;
    var dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2x for perf
    var W, H;
    var cacheCanvas, cacheCtx;
    var starCanvas, starCtx;
    var stars = [];
    var STAR_COUNT = 400;
    var animationId;
    var frameCount = 0;
    var frameSkip = 3; // only animate every 3rd frame (~20fps at 60Hz)

    function init() {
        canvas = document.createElement('canvas');
        canvas.id = 'blackhole-bg';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-10;pointer-events:none;';
        document.body.insertBefore(canvas, document.body.firstChild);
        ctx = canvas.getContext('2d');

        cacheCanvas = document.createElement('canvas');
        cacheCtx = cacheCanvas.getContext('2d');

        starCanvas = document.createElement('canvas');
        starCtx = starCanvas.getContext('2d');

        resize();
        generateStars();
        renderMainScene();
        window.addEventListener('resize', onResize);
        animate();
    }

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset, we handle dpr manually

        cacheCanvas.width = W * dpr;
        cacheCanvas.height = H * dpr;
        starCanvas.width = W * dpr;
        starCanvas.height = H * dpr;
    }

    function onResize() {
        resize();
        generateStars();
        renderMainScene();
    }

    function generateStars() {
        stars = [];
        var dw = W * dpr;
        var dh = H * dpr;
        for (var i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * dw,
                y: Math.random() * dh,
                r: Math.random() * 1.5 + 0.3,
                brightness: Math.random(),
                speed: Math.random() * 0.02 + 0.005,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    /* ===== Main Scene Render (cached) ===== */
    function renderMainScene() {
        var c = cacheCtx;
        var dw = W * dpr;
        var dh = H * dpr;
        var cx = dw * 0.45; // black hole center X (slightly left of center)
        var cy = dh * 0.48; // black hole center Y
        var bhRadius = Math.min(dw, dh) * 0.22; // event horizon radius

        // --- Deep space background ---
        var bgGrad = c.createRadialGradient(cx, cy, bhRadius * 0.5, cx, cy, Math.max(dw, dh));
        bgGrad.addColorStop(0, '#0a0a14');
        bgGrad.addColorStop(0.3, '#050510');
        bgGrad.addColorStop(0.7, '#020208');
        bgGrad.addColorStop(1, '#000004');
        c.fillStyle = bgGrad;
        c.fillRect(0, 0, dw, dh);

        // --- Draw far-side stars (behind black hole) ---
        for (var i = 0; i < STAR_COUNT; i++) {
            var s = stars[i];
            var dx = s.x - cx;
            var dy = s.y - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            // Stars near black hole get gravitationally lensed (pushed outward)
            if (dist < bhRadius * 2.5 && dist > bhRadius * 0.8) {
                var lens = 1 + (bhRadius * 2.5 - dist) / (bhRadius * 2.5) * 0.5;
                dx *= lens;
                dy *= lens;
            }
            if (dist > bhRadius * 1.05 || dist < bhRadius * 0.8 || dist > bhRadius * 1.8) {
                c.fillStyle = 'rgba(255,255,255,' + (0.3 + s.brightness * 0.7) + ')';
                c.beginPath();
                c.arc(dx + cx, dy + cy, s.r, 0, Math.PI * 2);
                c.fill();
            }
        }

        // --- Ambient glow around black hole ---
        var glowGrad = c.createRadialGradient(cx, cy, bhRadius * 0.5, cx, cy, bhRadius * 3.5);
        glowGrad.addColorStop(0, 'rgba(255,140,40,0.15)');
        glowGrad.addColorStop(0.3, 'rgba(255,100,20,0.06)');
        glowGrad.addColorStop(0.6, 'rgba(200,60,10,0.02)');
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = glowGrad;
        c.fillRect(0, 0, dw, dh);

        // --- Accretion Disk (near side, in front) ---
        var diskOuterX = bhRadius * 3.2;
        var diskOuterY = bhRadius * 0.42;
        var diskInnerX = bhRadius * 1.25;
        var diskInnerY = bhRadius * 0.12;

        // Draw the near-side disk (bottom half of ellipse)
        c.save();
        c.beginPath();
        c.ellipse(cx, cy, diskOuterX, diskOuterY, 0, 0, Math.PI);
        c.closePath();
        c.clip();

        // Disk color gradient: white-hot inner → amber → orange → deep red outer
        for (var r = diskInnerX / diskOuterX; r <= 1.0; r += 0.005) {
            var rx = diskOuterX * r;
            var ry = diskOuterY * r;
            var t = (r - diskInnerX / diskOuterX) / (1 - diskInnerX / diskOuterX);

            // Temperature-based color
            var color;
            if (t < 0.12) color = 'rgba(255,250,240,0.95)';  // white-hot inner
            else if (t < 0.25) color = 'rgba(255,220,140,0.9)';
            else if (t < 0.45) color = 'rgba(255,170,60,0.8)';
            else if (t < 0.7) color = 'rgba(240,120,25,0.55)';
            else color = 'rgba(180,50,10,0.25)';

            c.strokeStyle = color;
            c.lineWidth = (diskOuterY - diskInnerY) / ((1 - diskInnerX / diskOuterX) / 0.005) * 1.5;
            c.beginPath();
            c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
            c.stroke();
        }
        c.restore();

        // --- Disk bloom glow ---
        var diskGlow = c.createRadialGradient(cx, cy + bhRadius * 0.08, bhRadius * 0.3, cx, cy, diskOuterX * 1.1);
        diskGlow.addColorStop(0, 'rgba(255,200,80,0.3)');
        diskGlow.addColorStop(0.5, 'rgba(255,140,30,0.1)');
        diskGlow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = diskGlow;
        c.fillRect(cx - diskOuterX * 1.3, cy - diskOuterY * 0.3, diskOuterX * 2.6, diskOuterY * 2);

        // --- Event Horizon Shadow ---
        var shadowGrad = c.createRadialGradient(cx, cy, bhRadius * 0.6, cx, cy, bhRadius * 1.15);
        shadowGrad.addColorStop(0, '#000000');
        shadowGrad.addColorStop(0.7, '#000000');
        shadowGrad.addColorStop(0.85, 'rgba(0,0,0,0.6)');
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = shadowGrad;
        c.beginPath();
        c.arc(cx, cy, bhRadius * 1.15, 0, Math.PI * 2);
        c.fill();

        // --- Photon Ring ---
        c.strokeStyle = 'rgba(255,180,60,0.7)';
        c.lineWidth = bhRadius * 0.04;
        c.shadowColor = 'rgba(255,150,40,0.5)';
        c.shadowBlur = bhRadius * 0.15;
        c.beginPath();
        c.arc(cx, cy, bhRadius * 1.02, 0, Math.PI * 2);
        c.stroke();
        c.shadowBlur = 0;

        // --- Far side of accretion disk (gravitational lensing above) ---
        // The light from the far side of the disk bends over the top of the black hole
        c.save();
        c.beginPath();
        c.ellipse(cx, cy, bhRadius * 1.35, bhRadius * 1.35, 0, Math.PI, Math.PI * 2);
        c.closePath();
        c.clip();

        for (var r2 = diskInnerX / diskOuterX; r2 <= 1.0; r2 += 0.005) {
            var rrx = diskOuterX * r2;
            var rry = diskOuterY * r2;
            var tt = (r2 - diskInnerX / diskOuterX) / (1 - diskInnerX / diskOuterX);

            var c2;
            if (tt < 0.15) c2 = 'rgba(255,240,210,0.5)';
            else if (tt < 0.3) c2 = 'rgba(255,200,110,0.4)';
            else if (tt < 0.5) c2 = 'rgba(255,150,45,0.25)';
            else c2 = 'rgba(200,70,15,0.12)';

            c.strokeStyle = c2;
            c.lineWidth = (diskOuterY - diskInnerY) / ((1 - diskInnerX / diskOuterX) / 0.005) * 1.2;
            c.beginPath();
            c.ellipse(cx, cy, rrx, rry, 0, Math.PI, Math.PI * 2);
            c.stroke();
        }
        c.restore();

        // --- Soft vignette ---
        var vig = c.createRadialGradient(cx, cy, Math.max(dw, dh) * 0.6, cx, cy, Math.max(dw, dh) * 1.1);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,4,0.5)');
        c.fillStyle = vig;
        c.fillRect(0, 0, dw, dh);
    }

    /* ===== Animation Loop ===== */
    function animate() {
        frameCount++;
        if (frameCount % frameSkip === 0) {
            renderStars();
        }
        animationId = requestAnimationFrame(animate);
    }

    function renderStars() {
        var c = starCtx;
        var dw = W * dpr;
        var dh = H * dpr;
        c.clearRect(0, 0, dw, dh);

        for (var i = 0; i < STAR_COUNT; i++) {
            var s = stars[i];
            s.phase += s.speed;
            var b = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.phase));
            c.fillStyle = 'rgba(255,255,255,' + b + ')';
            c.beginPath();
            c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            c.fill();
        }
    }

    function drawComposite() {
        ctx.clearRect(0, 0, W * dpr, H * dpr);
        // Cached main scene
        ctx.drawImage(cacheCanvas, 0, 0);
        // Animated twinkling stars overlay
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(starCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    }

    // Override the animate function to also draw
    var _origAnimate = animate;
    animate = function() {
        frameCount++;
        if (frameCount % frameSkip === 0) {
            renderStars();
        }
        drawComposite();
        animationId = requestAnimationFrame(animate);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
