/**
 * Black Hole Desktop Background v3
 * High-quality render: 800+ rings, smooth gradient, full lensing, proper color palette
 * Reference aesthetic: blue-white inner → amber → orange → deep red outer
 * Gravitational lensing: far side of disk bends over the black hole top
 */

(function() {
    'use strict';

    var canvas, ctx;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W, H, cx, cy, bhR;
    var offCanvas, offCtx;     // deep space + stars + lensing arc (cached)
    var diskCache, diskCtx;   // accretion disk base (cached)
    var shadowCvs, shadowCtx; // black hole shadow + glow + photon ring (cached)
    var stars = [];
    var STAR_COUNT = 500;
    var animId;

    function init() {
        canvas = document.createElement('canvas');
        canvas.id = 'blackhole-bg';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
        document.body.insertBefore(canvas, document.body.firstChild);
        ctx = canvas.getContext('2d');

        offCanvas = document.createElement('canvas');
        offCtx = offCanvas.getContext('2d');

        diskCache = document.createElement('canvas');
        diskCtx = diskCache.getContext('2d');

        shadowCvs = document.createElement('canvas');
        shadowCtx = shadowCvs.getContext('2d');

        sizeAll();
        buildAll();
        window.addEventListener('resize', onResize);
        animate();
    }

    function sizeAll() {
        W = window.innerWidth;
        H = window.innerHeight;
        var dw = W * dpr;
        var dh = H * dpr;
        [canvas, offCanvas, diskCache, shadowCvs].forEach(function(c) {
            c.width = dw;
            c.height = dh;
        });
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        cx = dw * 0.42;
        cy = dh * 0.46;
        bhR = Math.min(dw, dh) * 0.18;
    }

    function onResize() {
        sizeAll();
        buildAll();
    }

    /* ===== Star field ===== */
    function generateStars() {
        stars.length = 0;
        var dw = W * dpr, dh = H * dpr;
        for (var i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * dw,
                y: Math.random() * dh,
                r: Math.random() < 0.1 ? Math.random() * 1.8 + 0.6 : Math.random() * 0.8 + 0.15,
                b: Math.random(),
                sp: Math.random() * 0.018 + 0.003,
                ph: Math.random() * Math.PI * 2
            });
        }
    }

    /* ===== Cached: deep space bg + stars ===== */
    function drawBG() {
        var c = offCtx, dw = W * dpr, dh = H * dpr;
        c.clearRect(0, 0, dw, dh);

        // Deep space gradient
        var g = c.createRadialGradient(cx, cy, bhR * 0.1, cx, cy, Math.max(dw, dh));
        g.addColorStop(0, '#060618');
        g.addColorStop(0.4, '#040410');
        g.addColorStop(1, '#010108');
        c.fillStyle = g;
        c.fillRect(0, 0, dw, dh);

        // Static distant stars
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i], dx = s.x - cx, dy = s.y - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > bhR * 2.8 || dist < bhR * 0.55) {
                c.fillStyle = 'rgba(255,255,255,' + (0.15 + s.b * 0.7) + ')';
                c.beginPath();
                c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                c.fill();
            }
        }
    }

    /* ===== Cached: Full accretion disk (HIGH QUALITY) ===== */
    function drawBaseDisk() {
        var c = diskCtx, dw = W * dpr, dh = H * dpr;
        c.clearRect(0, 0, dw, dh);

        var outerR = bhR * 3.0;
        var innerR = bhR * 1.15;
        var diskH = outerR * 0.125;
        var ringCount = 700;  // ultra-smooth, no banding

        for (var i = 0; i < ringCount; i++) {
            var t = i / ringCount;
            var r = 1.0 - t * (1 - innerR / outerR);
            var rx = outerR * r;
            var ry = diskH * r;

            var cr, cg, cb, alpha;

            if (t < 0.03) {
                cr = 190; cg = 215; cb = 255; alpha = 0.96;
            } else if (t < 0.08) {
                cr = 240; cg = 240; cb = 240; alpha = 0.94;
            } else if (t < 0.16) {
                cr = 255; cg = 225; cb = 160; alpha = 0.90;
            } else if (t < 0.28) {
                cr = 255; cg = 185; cb = 75; alpha = 0.84;
            } else if (t < 0.42) {
                cr = 250; cg = 135; cb = 30; alpha = 0.74;
            } else if (t < 0.58) {
                cr = 220; cg = 75; cb = 12; alpha = 0.54;
            } else if (t < 0.74) {
                cr = 165; cg = 38; cb = 6; alpha = 0.28;
            } else if (t < 0.88) {
                cr = 100; cg = 18; cb = 4; alpha = 0.10;
            } else {
                cr = 50; cg = 8; cb = 2; alpha = 0.03;
            }

            c.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + alpha + ')';
            c.lineWidth = Math.max(0.35, ry * 0.65);

            // Full ellipse — complete ring
            c.beginPath();
            c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            c.stroke();
        }
    }

    /* ===== Cached: Black hole shadow + glow + photon ring (own canvas for layering) ===== */
    function drawShadowAndGlow() {
        var c = shadowCtx, dw = W * dpr, dh = H * dpr;
        c.clearRect(0, 0, dw, dh);

        // Warm glow halo (wide)
        var glow = c.createRadialGradient(cx, cy, bhR * 0.4, cx, cy, bhR * 4.5);
        glow.addColorStop(0, 'rgba(255,120,25,0.25)');
        glow.addColorStop(0.2, 'rgba(255,80,15,0.10)');
        glow.addColorStop(0.5, 'rgba(180,40,5,0.03)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = glow;
        c.fillRect(0, 0, dw, dh);

        // Inner hot glow
        var hotGlow = c.createRadialGradient(cx, cy, bhR * 0.6, cx, cy, bhR * 1.8);
        hotGlow.addColorStop(0, 'rgba(255,200,80,0.30)');
        hotGlow.addColorStop(0.4, 'rgba(255,140,30,0.12)');
        hotGlow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = hotGlow;
        c.fillRect(cx - bhR * 2, cy - bhR * 2, bhR * 4, bhR * 4);

        // Event horizon (black center)
        var horizon = c.createRadialGradient(cx, cy, bhR * 0.5, cx, cy, bhR * 1.12);
        horizon.addColorStop(0, '#000000');
        horizon.addColorStop(0.55, '#000000');
        horizon.addColorStop(0.72, 'rgba(0,0,0,0.45)');
        horizon.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = horizon;
        c.beginPath();
        c.arc(cx, cy, bhR * 1.12, 0, Math.PI * 2);
        c.fill();

        // Photon ring (inner bright)
        c.strokeStyle = 'rgba(255,200,80,0.65)';
        c.lineWidth = bhR * 0.03;
        c.shadowColor = 'rgba(255,160,50,0.5)';
        c.shadowBlur = bhR * 0.18;
        c.beginPath();
        c.arc(cx, cy, bhR * 1.02, 0, Math.PI * 2);
        c.stroke();
        c.shadowBlur = 0;

        // Thin outer photon ring
        c.strokeStyle = 'rgba(255,175,60,0.3)';
        c.lineWidth = bhR * 0.013;
        c.beginPath();
        c.arc(cx, cy, bhR * 1.10, 0, Math.PI * 2);
        c.stroke();
    }

    /* ===== Per-frame: Gravitational lensing arc (after shadow, above black hole top) ===== */
    function drawLensing() {
        // The far side of the disk bends around, appearing as a thin bright crescent above the hole
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, bhR * 1.18, bhR * 1.18, 0, Math.PI * 0.93, Math.PI * 1.07);
        ctx.lineWidth = bhR * 0.055;
        ctx.strokeStyle = 'rgba(255,230,175,0.5)';
        ctx.shadowColor = 'rgba(255,180,100,0.35)';
        ctx.shadowBlur = bhR * 0.14;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.ellipse(cx, cy, bhR * 1.5, bhR * 1.5, 0, Math.PI * 0.9, Math.PI * 1.1);
        ctx.lineWidth = bhR * 0.035;
        ctx.strokeStyle = 'rgba(255,190,115,0.25)';
        ctx.shadowColor = 'rgba(255,130,60,0.18)';
        ctx.shadowBlur = bhR * 0.18;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    function buildAll() {
        generateStars();
        drawBG();
        drawBaseDisk();
        drawShadowAndGlow();
    }

    /* ===== Per-frame: Rotating Doppler swirl ===== */
    function drawSwirls(t) {
        var outerR = bhR * 3.0;
        var diskH = outerR * 0.125;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Bright approaching-side glow (bottom)
        var dpGrad = ctx.createLinearGradient(cx, cy - diskH, cx, cy + diskH);
        dpGrad.addColorStop(0, 'rgba(255,200,120,0)');
        dpGrad.addColorStop(0.4, 'rgba(255,200,120,0.03)');
        dpGrad.addColorStop(0.6, 'rgba(255,200,120,0.07)');
        dpGrad.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = dpGrad;
        ctx.fillRect(cx - outerR, cy - diskH * 1.5, outerR * 2, diskH * 4);

        // Swirling hot spots (6 arcs rotating at differential speeds)
        for (var a = 0; a < 6; a++) {
            var radius = 0.55 + a * 0.07;
            if (radius > 0.92) radius -= 0.4;
            var rx = outerR * radius;
            var ry = diskH * radius;
            var speed = 1.2 / (radius * radius + 0.2);
            var center = t * speed + a * 1.05;
            var len = 0.3 + Math.sin(t * 0.4 + a * 1.5) * 0.1;

            ctx.strokeStyle = 'rgba(255,250,230,0.14)';
            ctx.lineWidth = Math.max(0.5, ry * 0.8);
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, center, center + len);
            ctx.stroke();
        }
        ctx.restore();
    }

    /* ===== Per-frame: Photon ring pulse ===== */
    function drawRingPulse(t) {
        var p = 0.5 + 0.5 * Math.sin(t * 1.5) * Math.sin(t * 0.6 + 1);
        ctx.strokeStyle = 'rgba(255,210,90,' + (p * 0.7).toFixed(3) + ')';
        ctx.lineWidth = bhR * 0.035;
        ctx.shadowColor = 'rgba(255,160,50,' + (p * 0.4).toFixed(3) + ')';
        ctx.shadowBlur = bhR * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, bhR * 1.02, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    /* ===== Per-frame: Twinkling stars ===== */
    function drawStars(t) {
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            var d = Math.sqrt((s.x - cx) * (s.x - cx) + (s.y - cy) * (s.y - cy));
            if (d < bhR * 1.15) continue;
            var b = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(s.ph + t * s.sp));
            ctx.fillStyle = 'rgba(255,255,255,' + b + ')';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* ===== Composite ===== */
    function render(ts) {
        var t = ts * 0.001;
        var dw = W * dpr, dh = H * dpr;
        ctx.clearRect(0, 0, dw, dh);

        // Layer 1: Deep space + stars (cached in offCanvas)
        ctx.drawImage(offCanvas, 0, 0);

        // Layer 2: Accretion disk base (cached smooth)
        ctx.drawImage(diskCache, 0, 0);

        // Layer 3: Doppler swirl + rotating bright spots
        drawSwirls(t);

        // Layer 4: Black hole shadow + glow + photon ring base (cached)
        ctx.drawImage(shadowCvs, 0, 0);

        // Layer 5: Photon ring breathing
        drawRingPulse(t);

        // Layer 6: Lensing arc (far side disk light bent around black hole)
        drawLensing();

        // Layer 7: Foreground twinkling stars
        drawStars(t);

        // Layer 8: Vignette
        var vig = ctx.createRadialGradient(cx, cy, Math.max(dw, dh) * 0.45, cx, cy, Math.max(dw, dh));
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(0.45, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,3,0.55)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, dw, dh);
    }

    function animate(ts) {
        if (!ts) ts = performance.now();
        render(ts);
        animId = requestAnimationFrame(animate);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
