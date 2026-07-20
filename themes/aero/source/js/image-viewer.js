/* PC-98 Image Viewer — click to enlarge, zoom, drag */

document.addEventListener('DOMContentLoaded', function() {

    // Create image viewer overlay if it doesn't exist
    var overlay = document.createElement('div');
    overlay.id = 'imageviewer';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999;display:none;background:rgba(0,0,0,0.85);cursor:pointer;';
    overlay.innerHTML = '<div id="viewer" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">' +
        '<img id="set_image" src="" style="max-width:80vw;max-height:80vh;border:2px solid #f7f2e7;box-shadow:5px 5px 15px rgba(0,0,0,0.8);user-select:none;cursor:grab;image-rendering:pixelated;transition:transform 0.1s ease;touch-action:none;">' +
        '</div>';
    document.body.appendChild(overlay);

    var imageViewer = overlay;
    var setImage = document.getElementById('set_image');

    var viewerState = {
        scale: 1,
        dragging: false,
        moved: false,
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0
    };

    // Click any image to open viewer
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'IMG' && !e.target.closest('#imageviewer')) {
            var src = e.target.src;
            if (src) {
                setImage.src = src;
                resetViewerState();
                imageViewer.style.display = 'block';
            }
        }
    });

    if (setImage) {
        setImage.addEventListener('dragstart', function(e) { e.preventDefault(); });

        setImage.addEventListener('mousedown', function(e) {
            viewerState.dragging = true;
            viewerState.moved = false;
            viewerState.startX = e.clientX - viewerState.offsetX;
            viewerState.startY = e.clientY - viewerState.offsetY;
            setImage.style.cursor = 'grabbing';
            e.stopPropagation();
        });

        setImage.addEventListener('wheel', function(e) {
            e.preventDefault();
            var delta = e.deltaY < 0 ? 1 : -1;
            var step = e.ctrlKey ? 0.1 : 0.3;
            viewerState.scale += delta * step;
            viewerState.scale = Math.max(0.5, Math.min(10, viewerState.scale));
            applyTransform();
            e.stopPropagation();
        });

        setImage.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                viewerState.dragging = true;
                viewerState.startX = e.touches[0].clientX - viewerState.offsetX;
                viewerState.startY = e.touches[0].clientY - viewerState.offsetY;
            }
            e.stopPropagation();
        }, { passive: false });

        setImage.addEventListener('touchmove', function(e) {
            e.preventDefault();
            if (viewerState.dragging && e.touches.length === 1) {
                var dx = e.touches[0].clientX - viewerState.startX;
                var dy = e.touches[0].clientY - viewerState.startY;
                viewerState.offsetX = dx;
                viewerState.offsetY = dy;
                viewerState.moved = true;
                applyTransform();
            }
            e.stopPropagation();
        }, { passive: false });

        setImage.addEventListener('touchend', function() {
            viewerState.dragging = false;
            setImage.style.cursor = 'grab';
        });
    }

    document.addEventListener('mousemove', function(e) {
        if (!viewerState.dragging) return;
        var dx = e.clientX - viewerState.startX;
        var dy = e.clientY - viewerState.startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) viewerState.moved = true;
        viewerState.offsetX = dx;
        viewerState.offsetY = dy;
        applyTransform();
    });

    document.addEventListener('mouseup', function() {
        if (viewerState.dragging) {
            viewerState.dragging = false;
            setImage.style.cursor = 'grab';
        }
    });

    // Keyboard controls
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (imageViewer.style.display !== 'block') return;

        var key = e.key.toLowerCase();
        if (key === 'w' || key === '+') {
            viewerState.scale = Math.min(10, viewerState.scale + 0.5);
            applyTransform();
        } else if (key === 's' || key === '-') {
            viewerState.scale = Math.max(0.5, viewerState.scale - 0.5);
            applyTransform();
        } else if (key === '0') {
            resetViewerState();
        } else if (key === 'q') {
            setImage.style.imageRendering = 'pixelated';
        } else if (key === 'e') {
            setImage.style.imageRendering = 'auto';
        } else if (key === 'escape') {
            imageViewer.style.display = 'none';
            setImage.src = '';
        }
    });

    // Click overlay to close
    imageViewer.addEventListener('click', function(e) {
        if (e.target === imageViewer || viewerState.moved === false) {
            imageViewer.style.display = 'none';
            setImage.src = '';
        }
        viewerState.moved = false;
    });

    function applyTransform() {
        setImage.style.transform = 'translate(' + viewerState.offsetX + 'px, ' + viewerState.offsetY + 'px) scale(' + viewerState.scale + ')';
    }

    function resetViewerState() {
        viewerState.scale = 1;
        viewerState.offsetX = 0;
        viewerState.offsetY = 0;
        viewerState.moved = false;
        applyTransform();
    }

});
