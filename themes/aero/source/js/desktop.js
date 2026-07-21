/* PC-98 Desktop Interactions — Multi-window drag system */

document.addEventListener('DOMContentLoaded', function() {

    /* ===== Prevent page scrolling (desktop only) ===== */
    var isDesktop = function() { return window.innerWidth > 768; };

    document.addEventListener('wheel', function(e) {
        if (!isDesktop()) return;
        var target = e.target;
        var isInsideWindowBody = target.closest('.pc98-window-body') || target.closest('.post-content') || target.closest('.archive-container') || target.closest('#imageviewer');
        if (!isInsideWindowBody) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchmove', function(e) {
        if (!isDesktop()) return;
        var target = e.target;
        var isInsideWindowBody = target.closest('.pc98-window-body') || target.closest('.post-content') || target.closest('.archive-container') || target.closest('#imageviewer');
        if (!isInsideWindowBody) {
            e.preventDefault();
        }
    }, { passive: false });

    /* ===== Window Dragging ===== */
    var highestZ = 100;

    // Find all draggable desktop windows
    var draggables = document.querySelectorAll('.draggable-element');
    var isDragging = false;
    var activeElement = null;
    var startMouseX = 0;
    var startMouseY = 0;
    var startLeft = 0;
    var startTop = 0;

    draggables.forEach(function(el) {
        el.addEventListener('mousedown', function(e) {
            // Don't drag if clicking on undraggable content area
            var isUndraggable = e.target.closest('.undraggable-element');
            if (isUndraggable) return;

            // Don't drag if clicking a link or button inside the titlebar
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;

            e.preventDefault();
            isDragging = true;
            activeElement = el;

            // Bring to front
            highestZ++;
            activeElement.style.zIndex = highestZ;

            // Record starting positions
            startMouseX = e.clientX;
            startMouseY = e.clientY;

            // Get current viewport position
            var rect = el.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            // Ensure window uses the saved coordinates (already position:fixed via CSS)
            el.style.left = startLeft + 'px';
            el.style.top = startTop + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
        });
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging || !activeElement) return;

        e.preventDefault();
        var dx = e.clientX - startMouseX;
        var dy = e.clientY - startMouseY;

        var newLeft = startLeft + dx;
        var newTop = startTop + dy;

        // Keep window within viewport bounds
        var winW = activeElement.offsetWidth;
        var winH = activeElement.offsetHeight;
        newLeft = Math.max(-winW + 60, Math.min(newLeft, window.innerWidth - 60));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - 50));

        activeElement.style.left = newLeft + 'px';
        activeElement.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', function() {
        if (isDragging && activeElement) {
            // Snap fully off-screen windows back
            var rect = activeElement.getBoundingClientRect();
            if (rect.right < 30) {
                activeElement.style.left = (30 - activeElement.offsetWidth) + 'px';
            }
        }
        isDragging = false;
        activeElement = null;
    });

    /* ===== Click any window to bring to front ===== */
    document.addEventListener('mousedown', function(e) {
        var win = e.target.closest('.desktop-window');
        if (win && win.classList.contains('draggable-element')) {
            highestZ++;
            win.style.zIndex = highestZ;
        }
    }, true);

    /* ===== Mobile Sidebar Toggle ===== */
    var menuBtn = document.getElementById('mobile-menu-btn');
    var sidebar = document.getElementById('sidebar');
    var sidebarMask = document.getElementById('sidebar-mask');

    if (menuBtn && sidebar && sidebarMask) {
        function openSidebar() {
            sidebar.classList.add('open');
            sidebarMask.classList.add('open');
        }
        function closeSidebar() {
            sidebar.classList.remove('open');
            sidebarMask.classList.remove('open');
        }
        menuBtn.addEventListener('click', function() {
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
        sidebarMask.addEventListener('click', closeSidebar);
    }

});
