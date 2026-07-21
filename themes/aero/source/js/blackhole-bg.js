/**
 * Black Hole Desktop Background v4 — Qwen-Reference Edition
 *
 * Based on detailed multimodal analysis of the reference image.
 * Features:
 *   - Deep navy-blue gradient background
 *   - Spacetime grid (white lines, funnel depression under black hole)
 *   - 3-tier accretion disk: dark-red inner → bright orange-red middle → pale pink outer
 *   - Double-ring gravitational lensing (upper arc + lower flatter arc)
 *   - Left teardrop-shaped orange glowing mass (tidally disrupted stellar material)
 *   - Authentic pixel-art style via low-res internal render + imageSmoothingEnabled:false
 *   - Animated: disk rotates, grid subtle wobble, mass pulses
 */

(function() {
    'use strict';

    /* ---- internal render resolution (low → pixel look) ---- */
    var IR_W = 640;
    var IR_H;
    var canvas, ctx, irCanvas, irCtx;
    var dpr, W, H;
    var cx, cy, bhR;
    var gridCanvas, gridCtx;      // spacetime grid (cached, static)
    var diskCanvas, diskCtx;      // accretion disk base (cached)
    var shadowCanvas, shadowCtx;  // black hole shadow + photon ring (cached)
    var massCanvas, massCtx;      // left teardrop mass (cached)
    var animId;

    function init() {
        canvas = document.createElement('canvas');
        canvas.id = 'blackhole-bg';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;image-rendering:pixelated;';
        document.body.insertBefore(canvas, document.body.firstChild);
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        irCanvas = document.createElement('canvas');
        irCtx = irCanvas.getContext('2d');

        gridCanvas = document.createElement('canvas');
        gridCtx = gridCanvas.getContext('2d');

        diskCanvas = document.createElement('canvas');
        diskCtx = diskCanvas.getContext('2d');

        shadowCanvas = document.createElement('canvas');
        shadowCtx = shadowCanvas.getContext('2d');

        massCanvas = document.createElement('canvas');
        massCtx = massCanvas.getContext('2d');

        sizeAll();
        buildAllCached();
        window.addEventListener('resize', onResize);
        animate();
    }

    function sizeAll() {
        W = window.innerWidth;
        H = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        // Main canvas at native resolution
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';

        // Internal render canvas — low res for pixel look
        IR_H = Math.round(IR_W * (H / W));
        irCanvas.width = IR_W;
        irCanvas.height = IR_H;

        // Feature canvases match internal resolution
        [gridCanvas, diskCanvas, shadowCanvas, massCanvas].forEach(function(c) {
            c.width = IR_W;
            c.height = IR_H;
        });

        // Black hole center in internal coords
        cx = IR_W * 0.42;
        cy = IR_H * 0.50;
        bhR = Math.min(IR_W, IR_H) * 0.16;
    }

    function onResize() {
        sizeAll();
        buildAllCached();
    }

    /* ================================================================
       Cached layer 1: Deep blue background gradient
       ================================================================ */
    function drawBG() {
        var c = irCtx;
        c.clearRect(0, 0, IR_W, IR_H);

        // Navy blue radial gradient — darker corners, slightly lighter center-top
        var g = c.createRadialGradient(cx, cy - IR_H * 0.08, bhR, cx, cy, Math.max(IR_W, IR_H) * 0.85);
        g.addColorStop(0, '#0c1c3c');
        g.addColorStop(0.3, '#0a1834');
        g.addColorStop(0.6, '#061028');
        g.addColorStop(1, '#020812');
        c.fillStyle = g;
        c.fillRect(0, 0, IR_W, IR_H);
    }

    /* ================================================================
       Cached layer 2: Spacetime curvature grid
       ================================================================ */
    function drawGrid() {
        var c = gridCtx;
        c.clearRect(0, 0, IR_W, IR_H);

        var gridSpacing = IR_W * 0.035;
        var gridW = IR_W * 1.8;
        var gridH = IR_H * 1.4;
        var startX = -gridW * 0.35;
        var startY = cy - bhR * 1.2;
        var strength = bhR * 3.0;

        c.strokeStyle = 'rgba(200,210,230,0.16)';
        c.lineWidth = 0.5;

        // Horizontal lines (curved downward near black hole)
        for (var gy = -gridH * 0.2; gy < gridH; gy += gridSpacing) {
            c.beginPath();
            var firstPoint = true;
            for (var gx = -gridW * 0.3; gx < gridW; gx += gridSpacing * 0.5) {
                var dx = gx - cx;
                var dy = gy - (cy + bhR * 0.3);
                var dist = Math.sqrt(dx * dx + dy * dy);
                var depression = 0;
                if (dist < strength * 2) {
                    depression = strength * 1.2 * Math.exp(-(dist * dist) / (2 * strength * strength));
                }
                var sx = startX + gx;
                var sy = startY + gy + depression;
                if (firstPoint) { c.moveTo(sx, sy); firstPoint = false; }
                else { c.lineTo(sx, sy); }
            }
            c.stroke();
        }

        // Vertical lines (curved toward center near black hole)
        for (var gx2 = -gridW * 0.3; gx2 < gridW; gx2 += gridSpacing) {
            c.beginPath();
            var firstPoint2 = true;
            for (var gy2 = -gridH * 0.2; gy2 < gridH; gy2 += gridSpacing * 0.5) {
                var dx2 = gx2 - cx;
                var dy2 = gy2 - (cy + bhR * 0.3);
                var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                var depression2 = 0;
                if (dist2 < strength * 2) {
                    depression2 = strength * 1.2 * Math.exp(-(dist2 * dist2) / (2 * strength * strength));
                }
                // Radial pull toward center
                var pullX = 0;
                if (dist2 < strength * 1.5 && dist2 > 0.1) {
                    pullX = (cx - gx2) * 0.25 * Math.exp(-(dist2 * dist2) / (3 * strength * strength));
                }
                var sx2 = startX + gx2 + pullX;
                var sy2 = startY + gy2 + depression2;
                if (firstPoint2) { c.moveTo(sx2, sy2); firstPoint2 = false; }
                else { c.lineTo(sx2, sy2); }
            }
            c.stroke();
        }
    }

    /* ================================================================
       Cached layer 3: Accretion disk (3-tier color, full double-ring)
       ================================================================ */
    function drawBaseDisk() {
        var c = diskCtx;
        c.clearRect(0, 0, IR_W, IR_H);

        var outerR = bhR * 3.0;
        var innerR = bhR * 1.18;
        var diskH = outerR * 0.11;

        // Near side (bottom half, in front of black hole): full brightness
        var ringCount = 400;

        for (var i = 0; i < ringCount; i++) {
            var t = i / ringCount;
            var r = 1.0 - t * (1 - innerR / outerR);
            var rx = outerR * r;
            var ry = diskH * r;

            // 3-tier radial color (Qwen reference):
            // inner → dark red (红移暗红)
            // middle → bright orange-red (亮橙红)
            // outer → pale pink (淡粉红)
            var cr, cg, cb, alpha;

            if (t < 0.08) {
                cr = 140; cg = 18; cb = 8; alpha = 0.55;     // Slightly off-event-horizon, dimmer
            } else if (t < 0.15) {
                cr = 180; cg = 30; cb = 10; alpha = 0.70;
            } else if (t < 0.25) {
                cr = 220; cg = 55; cb = 14; alpha = 0.82;    // Dark→transition
            } else if (t < 0.35) {
                cr = 248; cg = 95; cb = 22; alpha = 0.88;    // Bright orange-red (main glow)
            } else if (t < 0.48) {
                cr = 255; cg = 140; cb = 35; alpha = 0.84;   // Peak brightness
            } else if (t < 0.58) {
                cr = 248; cg = 115; cb = 28; alpha = 0.72;   // Cooling
            } else if (t < 0.68) {
                cr = 235; cg = 85; cb = 18; alpha = 0.54;
            } else if (t < 0.78) {
                cr = 210; cg = 65; cb = 30; alpha = 0.32;    // Fading
            } else if (t < 0.88) {
                cr = 200; cg = 90; cb = 70; alpha = 0.15;    // Pale pink
            } else {
                cr = 180; cg = 100; cb = 90; alpha = 0.05;   // Fading to nothing
            }

            // Thickness variation: disk gets slightly thicker at middle radii, thinner at edges
            var thickFactor = 1.0;
            if (t > 0.15 && t < 0.6) thickFactor = 1.3;
            else if (t > 0.7) thickFactor = 0.7;

            c.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + alpha + ')';
            c.lineWidth = Math.max(0.3, ry * 0.7 * thickFactor);

            // Near side: bottom half (0 → PI)
            c.beginPath();
            c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
            c.stroke();
        }

        // Far side top arc (lensing): upper half, much brighter near the shadow edge, fades outward
        // This creates the "double ring" — the upper arc is the far side light bent over the top
        for (var j = 0; j < 200; j++) {
            var t2 = j / 200;
            var r2 = 1.0 - t2 * (1 - innerR / outerR);
            var rrx = outerR * r2;
            var rry = diskH * r2;

            var topCr, topCg, topCb, topAlpha;

            if (t2 < 0.05) {
                topCr = 255; topCg = 200; topCb = 80; topAlpha = 0.55;   // Bright lensed arc
            } else if (t2 < 0.15) {
                topCr = 255; topCg = 175; topCb = 55; topAlpha = 0.40;
            } else if (t2 < 0.30) {
                topCr = 248; topCg = 120; topCb = 30; topAlpha = 0.22;
            } else if (t2 < 0.50) {
                topCr = 230; topCg = 70; topCb = 20; topAlpha = 0.10;
            } else {
                topCr = 200; topCg = 80; topCb = 60; topAlpha = 0.03;
            }

            c.strokeStyle = 'rgba(' + topCr + ',' + topCg + ',' + topCb + ',' + topAlpha + ')';
            c.lineWidth = Math.max(0.3, rry * 0.6);

            // Near side: top half (PI → 2PI)
            c.beginPath();
            c.ellipse(cx, cy, rrx, rry, 0, Math.PI, Math.PI * 2);
            c.stroke();
        }
    }

    /* ================================================================
       Cached layer 4: Black hole shadow + glow + photon rings
       ================================================================ */
    function drawShadowAndGlow() {
        var c = shadowCtx;
        c.clearRect(0, 0, IR_W, IR_H);

        // Wide warm glow halo
        var glow = c.createRadialGradient(cx, cy, bhR * 0.3, cx, cy, bhR * 3.5);
        glow.addColorStop(0, 'rgba(255,100,20,0.22)');
        glow.addColorStop(0.3, 'rgba(255,60,10,0.08)');
        glow.addColorStop(0.6, 'rgba(200,30,5,0.02)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = glow;
        c.fillRect(0, 0, IR_W, IR_H);

        // Inner hot ring glow (the bright ring right at the event horizon edge)
        var hot = c.createRadialGradient(cx, cy, bhR * 0.6, cx, cy, bhR * 1.6);
        hot.addColorStop(0, 'rgba(255,180,60,0.35)');
        hot.addColorStop(0.5, 'rgba(255,120,25,0.12)');
        hot.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = hot;
        c.fillRect(cx - bhR * 2, cy - bhR * 2, bhR * 4, bhR * 4);

        // Event horizon (black disc with soft edge)
        var horizon = c.createRadialGradient(cx, cy, bhR * 0.45, cx, cy, bhR * 1.08);
        horizon.addColorStop(0, '#000000');
        horizon.addColorStop(0.5, '#000000');
        horizon.addColorStop(0.7, 'rgba(0,0,0,0.5)');
        horizon.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = horizon;
        c.beginPath();
        c.arc(cx, cy, bhR * 1.08, 0, Math.PI * 2);
        c.fill();

        // Inner photon ring (bright thin ring at 1.02 bhR)
        c.strokeStyle = 'rgba(255,190,70,0.7)';
        c.lineWidth = bhR * 0.032;
        c.shadowColor = 'rgba(255,150,40,0.45)';
        c.shadowBlur = bhR * 0.16;
        c.beginPath();
        c.arc(cx, cy, bhR * 1.02, 0, Math.PI * 2);
        c.stroke();
        c.shadowBlur = 0;

        // Outer photon ring (very thin, at 1.10 bhR)
        c.strokeStyle = 'rgba(255,165,50,0.28)';
        c.lineWidth = bhR * 0.012;
        c.beginPath();
        c.arc(cx, cy, bhR * 1.10, 0, Math.PI * 2);
        c.stroke();
    }

    /* ================================================================
       Cached layer 5: Left teardrop mass (tidally disrupted stellar material)
       ================================================================ */
    function drawMass() {
        var c = massCtx;
        c.clearRect(0, 0, IR_W, IR_H);

        // Position: left of the black hole, slightly above disk plane
        var mx = cx - bhR * 2.8;
        var my = cy - bhR * 0.3;
        var mw = bhR * 0.7;
        var mh = bhR * 1.1;

        // Teardrop shape: build with overlapping ellipses
        // Head (round, bright)
        var headGrad = c.createRadialGradient(mx, my - mh * 0.1, 0, mx, my, mw * 0.8);
        headGrad.addColorStop(0, 'rgba(255,210,90,0.9)');
        headGrad.addColorStop(0.3, 'rgba(255,150,35,0.75)');
        headGrad.addColorStop(0.6, 'rgba(240,80,15,0.4)');
        headGrad.addColorStop(1, 'rgba(200,30,5,0)');
        c.fillStyle = headGrad;

        c.beginPath();
        c.ellipse(mx, my, mw * 0.55, mh * 0.45, 0, 0, Math.PI * 2);
        c.fill();

        // Tail (stretching toward black hole, tapering)
        var tailX1 = mx + mw * 0.3;
        var tailY1 = my;
        var tailX2 = mx + mw * 2.5;
        var tailY2 = my + bhR * 0.15;

        c.beginPath();
        c.moveTo(tailX1, tailY1 - mh * 0.2);
        c.quadraticCurveTo(tailX2 * 0.7, tailY2 - mh * 0.1, tailX2, tailY2);
        c.lineTo(tailX2, tailY2 + mh * 0.08);
        c.quadraticCurveTo(tailX2 * 0.7, tailY1 + mh * 0.2, tailX1, tailY1 + mh * 0.15);
        c.closePath();

        var tailGrad = c.createLinearGradient(tailX1, 0, tailX2, 0);
        tailGrad.addColorStop(0, 'rgba(255,140,35,0.7)');
        tailGrad.addColorStop(0.5, 'rgba(240,80,15,0.3)');
        tailGrad.addColorStop(1, 'rgba(200,30,5,0)');
        c.fillStyle = tailGrad;
        c.fill();
    }

    function buildAllCached() {
        drawBG();             // internal canvas background
        drawGrid();           // spacetime grid
        drawBaseDisk();       // accretion disk
        drawShadowAndGlow();  // black hole shadow + rings
        drawMass();           // left teardrop mass
    }

    /* ================================================================
       Per-frame animations
       ================================================================ */
    function renderFrame(ts) {
        var t = ts * 0.001;
        // Re-draw background first
        drawBG();

        // Layer 1: Grid (cached)
        irCtx.drawImage(gridCanvas, 0, 0);

        // Layer 2: Base disk (cached)
        irCtx.drawImage(diskCanvas, 0, 0);

        // Layer 3: Rotating swirl arcs (differential rotation)
        drawSwirls(t);

        // Layer 4: Black hole shadow + photon rings (cached)
        irCtx.drawImage(shadowCanvas, 0, 0);

        // Layer 5: Photon ring breathing pulse
        drawRingPulse(t);

        // Layer 6: Teardrop mass (cached)
        irCtx.drawImage(massCanvas, 0, 0);

        // Layer 7: Teardrop mass pulsation overlay
        drawMassPulse(t);

        // Layer 8: Vignette
        drawVignette();

        // Scale internal → display canvas (pixelated)
        ctx.clearRect(0, 0, W * dpr, H * dpr);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(irCanvas, 0, 0, W * dpr, H * dpr);
    }

    /* ---- Rotating swirl arcs ---- */
    function drawSwirls(t) {
        var outerR = bhR * 3.0;
        var diskH = outerR * 0.11;
        irCtx.save();
        irCtx.globalCompositeOperation = 'lighter';

        // 5 bright arcs rotating at differential speeds
        for (var a = 0; a < 5; a++) {
            var radius = 0.5 + a * 0.09;
            if (radius > 0.92) radius -= 0.4;
            var rx = outerR * radius;
            var ry = diskH * radius;
            var speed = 1.0 / (radius * radius + 0.25);
            var center = t * speed + a * 1.2;
            var len = 0.28 + Math.sin(t * 0.35 + a) * 0.08;

            irCtx.strokeStyle = 'rgba(255,240,200,0.16)';
            irCtx.lineWidth = Math.max(0.6, ry * 0.9);
            irCtx.beginPath();
            irCtx.ellipse(cx, cy, rx, ry, 0, center, center + len);
            irCtx.stroke();
        }
        irCtx.restore();
    }

    /* ---- Photon ring breathing ---- */
    function drawRingPulse(t) {
        var p = 0.5 + 0.5 * Math.sin(t * 1.4) * Math.sin(t * 0.55 + 0.8);
        irCtx.strokeStyle = 'rgba(255,200,80,' + (p * 0.7).toFixed(3) + ')';
        irCtx.lineWidth = bhR * 0.04;
        irCtx.shadowColor = 'rgba(255,150,45,' + (p * 0.4).toFixed(3) + ')';
        irCtx.shadowBlur = bhR * 0.2;
        irCtx.beginPath();
        irCtx.arc(cx, cy, bhR * 1.02, 0, Math.PI * 2);
        irCtx.stroke();
        irCtx.shadowBlur = 0;
    }

    /* ---- Left mass gentle pulsation ---- */
    function drawMassPulse(t) {
        var mx = cx - bhR * 2.8;
        var my = cy - bhR * 0.3;
        var p = 0.6 + 0.4 * Math.sin(t * 1.9 + 1.0);

        irCtx.save();
        irCtx.globalCompositeOperation = 'lighter';
        var g = irCtx.createRadialGradient(mx, my, 0, mx, my, bhR * 0.7);
        g.addColorStop(0, 'rgba(255,200,80,' + (p * 0.3).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,100,20,0)');
        irCtx.fillStyle = g;
        irCtx.fillRect(mx - bhR * 1.5, my - bhR * 1.5, bhR * 3, bhR * 3);
        irCtx.restore();
    }

    /* ---- Vignette ---- */
    function drawVignette() {
        var g = irCtx.createRadialGradient(cx, cy, Math.max(IR_W, IR_H) * 0.45, cx, cy, Math.max(IR_W, IR_H) * 0.9);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.5, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,2,8,0.55)');
        irCtx.fillStyle = g;
        irCtx.fillRect(0, 0, IR_W, IR_H);
    }

    /* ================================================================ */
    function animate(ts) {
        if (!ts) ts = performance.now();
        renderFrame(ts);
        animId = requestAnimationFrame(animate);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
