/* PC-98 Desktop Interactions */

document.addEventListener('DOMContentLoaded', function() {

    /* ===== Window Dragging ===== */
    var draggables = document.querySelectorAll('.draggable-element');
    var isDragging = false;
    var mouseOffsetX = 0;
    var mouseOffsetY = 0;
    var activeElement = null;
    var highestZ = 10;

    draggables.forEach(function(el) {
        el.addEventListener('mousedown', function(e) {
            var isUndraggable = e.target.closest('.undraggable-element');
            if (!isUndraggable) {
                // Bring window to front
                highestZ++;
                activeElement = el;
                activeElement.style.zIndex = highestZ;

                e.preventDefault();
                isDragging = true;
                mouseOffsetX = e.clientX - el.offsetLeft;
                mouseOffsetY = e.clientY - el.offsetTop;
            }
        });
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging || !activeElement) return;
        var isUndraggable = activeElement.closest('.undraggable-element');
        if (isUndraggable) return;

        e.preventDefault();
        var newX = e.clientX - mouseOffsetX;
        var newY = e.clientY - mouseOffsetY;

        newX = Math.max(0, Math.min(newX, window.innerWidth - activeElement.offsetWidth - 10));
        newY = Math.max(0, Math.min(newY, window.innerHeight - activeElement.offsetHeight - 40));

        activeElement.style.left = newX + 'px';
        activeElement.style.top = newY + 'px';
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
        activeElement = null;
    });

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
