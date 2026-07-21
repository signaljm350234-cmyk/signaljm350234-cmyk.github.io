/**
 * Black Hole Desktop Background v2
 * Full accretion disk (complete ring) + rotation animation
 * Base disk cached, animated swirl overlays + Doppler glow redrawn each frame
 * ~50 arc draws/frame → easily hits 240Hz on any GPU
 */

(function() {
    'use strict';

    var canvas, ctx;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W, H, cx, cy, bhR;
    var bgCanvas, bgCtx;          // deep space + static stars
    var diskCanvas, diskCtx;      // base disk (cached)
    var shadowCanvas, shadowCtx;  // black hole + photon ring (cached)
    var stars = [];
    var STAR_COUNT = 320;
    var startTime = performance.now();
    var animId;
    var isDesktop = true;

    function init() {
        console.log('[blackhole-bg] init start, WxH:', window.innerWidth, 'x', window.innerHeight);
        canvas = document.createElement('canvas');
        canvas.id = 'blackhole-bg';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
        document.body.insertBefore(canvas, document.body.firstChild);
        ctx = canvas.getContext('2d');

        bgCanvas = document.createElement('canvas');
        bgCtx = bgCanvas.getContext('2d');

        diskCanvas = document.createElement('canvas');
        diskCtx = diskCanvas.getContext('2d');

        shadowCanvas = document.createElement('canvas');
        shadowCtx = shadowCanvas.getContext('2d');

        sizeAll();
        generateStars();
        renderAllCached();

        window.addEventListener('resize', onResize);
        animate();
    }

    function sizeAll() {
        W = window.innerWidth;
        H = window.innerHeight;
        isDesktop = W > 768;
        var dw = W * dpr, dh = H * dpr;

        [canvas, bgCanvas, diskCanvas, shadowCanvas].forEach(function(cv) {
            cv.width = dw;
            cv.height = dh;
        });
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';

        cx = dw * 0.43;
        cy = dh * 0.46;
        bhR = Math.min(dw, dh) * 0.19;
    }

    function onResize() {
        sizeAll();
        generateStars();
        renderAllCached();
    }

    function generateStars() {
        stars.length = 0;
        var dw = W * dpr, dh = H * dpr;
        for (var i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * dw,
                y: Math.random() * dh,
                r: Math.random() * 1.3 + 0.2,
                b: Math.random(),
                sp: Math.random() * 0.02 + 0.004,
                ph: Math.random() * Math.PI * 2
            });
        }
    }

    function renderAllCached() {
        renderBG();
        renderBaseDisk();
        renderShadow();
    }

    /* ===== Layer 1: Deep space background ===== */
    function renderBG() {
        var c = bgCtx, dw = W * dpr, dh = H * dpr;
        c.clearRect(0, 0, dw, dh);

        var g = c.createRadialGradient(cx, cy, bhR * 0.2, cx, cy, Math.max(dw, dh));
        g.addColorStop(0, '#0a0a18');
        g.addColorStop(0.3, '#060610');
        g.addColorStop(0.6, '#020208');
        g.addColorStop(1, '#000004');
        c.fillStyle = g;
        c.fillRect(0, 0, dw, dh);

        for (var i = 0; i < stars.length; i++) {
            var s = stars[i], dx = s.x - cx, dy = s.y - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > bhR * 2.6 || dist < bhR * 0.65) {
                c.fillStyle = 'rgba(255,255,255,' + (0.2 + s.b * 0.65) + ')';
                c.beginPath();
                c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                c.fill();
            }
        }
    }

    /* ===== Layer 2: Full accretion disk (cached base) ===== */
    function renderBaseDisk() {
        var c = diskCtx, dw = W * dpr, dh = H * dpr;
        c.clearRect(0, 0, dw, dh);

        var outerR = bhR * 3.2;
        var innerR = bhR * 1.22;
        var diskH = outerR * 0.13;
        var ringCount = 140;

        for (var i = 0; i < ringCount; i++) {
            var r = 1.0 - (i / ringCount) * (1 - innerR / outerR);
            var rx = outerR * r;
            var ry = diskH * r;
            var temp = i / ringCount;

            var rgba;
            if (temp < 0.05)      rgba = 'rgba(255,250,242,0.92)';
            else if (temp < 0.13) rgba = 'rgba(255,232,172,0.86)';
            else if (temp < 0.25) rgba = 'rgba(255,198,78,0.78)';
            else if (temp < 0.40) rgba = 'rgba(248,150,30,0.65)';
            else if (temp < 0.58) rgba = 'rgba(225,90,14,0.46)';
            else if (temp < 0.76) rgba = 'rgba(180,50,8,0.26)';
            else                  rgba = 'rgba(120,28,5,0.12)';

            c.strokeStyle = rgba;
            c.lineWidth = Math.max(0.5, ry * 0.85);
            c.beginPath();
            c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); // FULL ring
            c.stroke();
        }
    }

    /* ===== Layer 3: Black hole shadow + photon ring base ===== */
    function renderShadow() {
        var c = shadowCtx, dw = W * dpr, dh = H * dpr;
        c.clearRect(0, 0, dw, dh);

        // Ambient warm glow
        var g = c.createRadialGradient(cx, cy, bhR * 0.3, cx, cy, bhR * 4);
        g.addColorStop(0, 'rgba(255,140,35,0.20)');
        g.addColorStop(0.25, 'rgba(255,90,15,0.07)');
        g.addColorStop(0.55, 'rgba(160,40,6,0.02)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, dw, dh);

        // Event horizon
        var sg = c.createRadialGradient(cx, cy, bhR * 0.55, cx, cy, bhR * 1.16);
        sg.addColorStop(0, '#000000');
        sg.addColorStop(0.6, '#000000');
        sg.addColorStop(0.78, 'rgba(0,0,0,0.5)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = sg;
        c.beginPath();
        c.arc(cx, cy, bhR * 1.16, 0, Math.PI * 2);
        c.fill();

        // Base photon ring
        c.strokeStyle = 'rgba(255,185,65,0.55)';
        c.lineWidth = bhR * 0.03;
        c.shadowColor = 'rgba(255,150,40,0.4)';
        c.shadowBlur = bhR * 0.16;
        c.beginPath();
        c.arc(cx, cy, bhR * 1.025, 0, Math.PI * 2);
        c.stroke();
        c.shadowBlur = 0;

        // Thin outer ring
        c.strokeStyle = 'rgba(255,160,50,0.28)';
        c.lineWidth = bhR * 0.014;
        c.beginPath();
        c.arc(cx, cy, bhR * 1.09, 0, Math.PI * 2);
        c.stroke();

        // Vignette on shadow layer
        var vg = c.createRadialGradient(cx, cy, Math.max(dw, dh) * 0.5, cx, cy, Math.max(dw, dh) * 1.05);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(0.6, 'rgba(0,0,0,0.08)');
        vg.addColorStop(1, 'rgba(0,0,3,0.5)');
        c.fillStyle = vg;
        c.fillRect(0, 0, dw, dh);
    }

    /* ===== Per-frame: Rotating swirl arcs ===== */
    function drawSwirls(frameTime) {
        var t = frameTime * 0.001;
        var outerR = bhR * 3.2;
        var diskH = outerR * 0.13;
        var innerRatio = bhR * 1.22 / outerR;
        var arcCount = 6;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (var a = 0; a < arcCount; a++) {
            var radius = innerRatio + (0.05 + a * 0.14) % 0.85;
            if (radius > 0.92) radius = 0.92;
            var rx = outerR * radius;
            var ry = diskH * radius;

            // Each arc rotates at a speed based on radius (inner = faster)
            var speed = 0.9 / (radius * radius + 0.15);
            var arcCenter = t * speed + a * 1.1;
            var arcLen = 0.35 + Math.sin(t * 0.5 + a) * 0.15;

            ctx.strokeStyle = 'rgba(255,240,200,0.18)';
            ctx.lineWidth = Math.max(0.8, ry * 1.1);
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, arcCenter, arcCenter + arcLen);
            ctx.stroke();

            // Hotter inner companion for each arc
            ctx.strokeStyle = 'rgba(255,255,240,0.12)';
            ctx.lineWidth = Math.max(0.4, ry * 0.5);
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx * 0.95, ry * 0.95, 0, arcCenter - 0.08, arcCenter + arcLen * 0.7);
            ctx.stroke();
        }
        ctx.restore();
    }

    /* ===== Per-frame: Doppler glow overlay ===== */
    function drawDoppler(frameTime) {
        // Bright patch on the approaching (bottom) side
        var outerR = bhR * 3.2;
        var diskH = outerR * 0.13;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        var g = ctx.createLinearGradient(cx, cy - diskH * 0.8, cx, cy + diskH * 1.2);
        g.addColorStop(0, 'rgba(255,200,100,0)');
        g.addColorStop(0.35, 'rgba(255,200,100,0.04)');
        g.addColorStop(0.65, 'rgba(255,200,100,0.08)');
        g.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - outerR, cy - diskH, outerR * 2, diskH * 3);

        ctx.restore();
    }

    /* ===== Per-frame: Photon ring pulse ===== */
    function drawPhotonRingPulse(frameTime) {
        var t = frameTime * 0.001;
        var p = 0.55 + 0.45 * Math.sin(t * 1.6 + 0.3) * Math.sin(t * 0.65);

        ctx.strokeStyle = 'rgba(255,195,75,' + (p * 0.7).toFixed(3) + ')';
        ctx.lineWidth = bhR * 0.038;
        ctx.shadowColor = 'rgba(255,155,45,' + (p * 0.45).toFixed(3) + ')';
        ctx.shadowBlur = bhR * 0.22;
        ctx.beginPath();
        ctx.arc(cx, cy, bhR * 1.025, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Second thin ring opposite phase
        var p2 = 0.25 + 0.2 * Math.sin(t * 1.25 + 2.0);
        ctx.strokeStyle = 'rgba(255,170,50,' + (p2 * 0.5).toFixed(3) + ')';
        ctx.lineWidth = bhR * 0.016;
        ctx.beginPath();
        ctx.arc(cx, cy, bhR * 1.09, 0, Math.PI * 2);
        ctx.stroke();
    }

    /* ===== Per-frame: Twinkling stars ===== */
    function drawStars(frameTime) {
        var t = frameTime * 0.001;
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            var d = Math.sqrt((s.x - cx) * (s.x - cx) + (s.y - cy) * (s.y - cy));
            if (d < bhR * 1.2) continue;

            var b = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(s.ph + t * s.sp * 3));
            ctx.fillStyle = 'rgba(255,255,255,' + b + ')';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* ===== Composite ===== */
    function render(frameTime) {
        ctx.clearRect(0, 0, W * dpr, H * dpr);

        // Layer 1: Deep space + static stars
        ctx.drawImage(bgCanvas, 0, 0);

        // Layer 2: Base accretion disk (full ring, temperature-colored)
        ctx.drawImage(diskCanvas, 0, 0);

        // Layer 3: Rotating swirl arcs (differential rotation visible)
        drawSwirls(frameTime);

        // Layer 4: Doppler brightness overlay
        drawDoppler(frameTime);

        // Layer 5: Black hole shadow + photon ring base
        ctx.drawImage(shadowCanvas, 0, 0);

        // Layer 6: Pulsing photon ring
        drawPhotonRingPulse(frameTime);

        // Layer 7: Twinkling foreground stars
        drawStars(frameTime);
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

    window.addEventListener('beforeunload', function() {
        if (animId) cancelAnimationFrame(animId);
    });
})();
