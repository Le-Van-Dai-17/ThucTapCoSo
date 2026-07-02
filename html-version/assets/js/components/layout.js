// ======================================================
// layout.js
// DÃ¹ng cho cÃ¡c trang ná»™i bá»™ sau khi Ä‘Äƒng nháº­p
// Má»—i file HTML ná»™i bá»™ pháº£i import api.js trÆ°á»›c layout.js
// ======================================================


// ===============================
// 1. Cáº¤U HÃŒNH PHÃ‚N QUYá»€N FRONTEND
// ===============================

const ROLE_PERMISSIONS = {
    Admin: [
        'users.html',
        'activity-log.html',
        'settings.html',
        'model-performance.html',
        'profile.html'
    ],

    Manager: [
        'dashboard.html',
        'products.html',
        'categories.html',
        'sales-data.html',
        'import.html',
        'reports.html',
        'pos.html',
        'purchase-orders.html',
        'purchase-order-form.html',
        'suppliers.html',
        'supplier-form.html',
        'supplier-detail.html',
        'forecast.html',
        'reconciliation.html',
        'profile.html'
    ],

    Staff: [
        'pos.html',
        'purchase-orders.html',
        'purchase-order-form.html',
        'products.html',
        'sales-data.html',
        'reconciliation.html',
        'activity-log.html',
        'profile.html'
    ]
};

const NAV_ITEMS = [
    {
        href: 'dashboard.html',
        label: 'Dashboard',
        icon: 'bar-chart-3',
        roles: ['Manager']
    },
    {
        href: 'forecast.html',
        label: 'Forecast',
        icon: 'trending-up',
        roles: ['Manager']
    },
    {
        href: 'pos.html',
        label: 'Sales (POS)',
        icon: 'shopping-bag',
        roles: ['Manager', 'Staff']
    },
    {
        href: 'purchase-orders.html',
        label: 'Purchase Orders',
        icon: 'shopping-cart',
        roles: ['Manager', 'Staff']
    },
    {
        href: 'products.html',
        label: 'Products & Inventory',
        icon: 'box',
        roles: ['Manager', 'Staff']
    },
    {
        href: 'categories.html',
        label: 'Categories',
        icon: 'tags',
        roles: ['Manager']
    },
    {
        href: 'reports.html',
        label: 'Reports',
        icon: 'file-text',
        roles: ['Manager']
    },
    {
        href: 'suppliers.html',
        label: 'Suppliers',
        icon: 'truck',
        roles: ['Manager']
    },
    {
        href: 'reconciliation.html',
        label: 'Reconciliation',
        icon: 'clipboard-check',
        roles: ['Manager', 'Staff']
    },
    {
        href: 'sales-data.html',
        label: 'Transaction History',
        icon: 'line-chart',
        roles: ['Manager', 'Staff']
    },
    {
        href: 'users.html',
        label: 'Users',
        icon: 'users',
        roles: ['Admin']
    },
    {
        href: 'activity-log.html',
        label: 'My Activity',
        icon: 'activity',
        roles: ['Admin']
    },
    {
        href: 'model-performance.html',
        label: 'Model Performance',
        icon: 'brain-circuit',
        roles: ['Admin']
    },
    {
        href: 'settings.html',
        label: 'Settings',
        icon: 'settings',
        roles: ['Admin']
    }
];


// ===============================
// 2. KIá»‚M TRA ÄÄ‚NG NHáº¬P
// ===============================

(function protectPrivatePage() {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'login.html' || currentPage === '' || currentPage === 'index.html') {
        return;
    }

    if (typeof Auth === 'undefined') {
        window.location.href = 'login.html';
        return;
    }

    const isLoggedIn =
        typeof Auth.isLoggedIn === 'function'
            ? Auth.isLoggedIn()
            : !!localStorage.getItem('forecastai_token');

    if (!isLoggedIn) {
        window.location.href = 'login.html';
    }
})();


// ===============================
// 3. Láº¤Y USER HIá»†N Táº I
// ===============================

let currentUser = null;

try {
    if (typeof Auth !== 'undefined' && typeof Auth.getUser === 'function') {
        currentUser = Auth.getUser();
    } else {
        const savedUser = localStorage.getItem('forecastai_user');
        currentUser = savedUser ? JSON.parse(savedUser) : null;
    }
} catch (error) {
    console.error('Error reading current user:', error);
    currentUser = null;
}

const displayName = currentUser
    ? (currentUser.full_name || currentUser.fullName || currentUser.username || 'User')
    : 'User';

function capitalizeFirstLayout(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
const displayRole = currentUser ? capitalizeFirstLayout(currentUser.role || currentUser.role_name) : 'Guest';


// ===============================
// 4. CHáº¶N Má»ž URL TRÃI QUYá»€N
// ===============================

(function protectPageByRole() {
    const currentPage = window.location.pathname.split('/').pop();

    if (
        currentPage === 'login.html' ||
        currentPage === '' ||
        currentPage === 'index.html'
    ) {
        return;
    }

    const allowedPages = ROLE_PERMISSIONS[displayRole] || [];

    if (!allowedPages.includes(currentPage)) {
        showToast('You do not have permission to access this page. Please log in again.', 'info');

        if (typeof Auth !== 'undefined' && typeof Auth.clear === 'function') {
            Auth.clear();
        } else {
            localStorage.removeItem('forecastai_token');
            localStorage.removeItem('forecastai_user');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }

        window.location.href = 'login.html';
    }
})();



// ===============================
// 5. Táº O AVATAR
// ===============================

const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';


// ===============================
// 6. Táº O MENU THEO ROLE
// ===============================

const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';

const navHtml = NAV_ITEMS
    .filter(item => item.roles.includes(displayRole))
    .map(item => {
        const isActive = item.href === currentPath;

        const activeClass = isActive
            ? 'bg-[#2563EB]/10 text-[#2563EB]'
            : 'text-gray-700 hover:bg-gray-100';

        return `
            <a href="${item.href}" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 ${activeClass}">
                <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                <span>${item.label}</span>
            </a>
        `;
    })
    .join('');


// ===============================
// 7. HTML LAYOUT
// ===============================

const layoutHtml = `
    <aside class="fixed left-0 top-0 bottom-0 w-[240px] bg-white border-r border-gray-200 shadow-sm z-30 flex flex-col">
        <div class="p-6">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center">
                    <i data-lucide="trending-up" class="w-5 h-5 text-white"></i>
                </div>
                <span class="font-semibold text-lg">ForecastAI</span>
            </div>
        </div>

        <nav class="px-4 space-y-1 flex-1 overflow-y-auto">
            ${navHtml}
        </nav>

        <div class="p-4 border-t border-gray-200 shrink-0">
            <a href="profile.html" class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    <span class="text-sm font-medium">${initials}</span>
                </div>
                <div class="flex-1">
                    <div class="text-sm font-medium text-gray-900">${displayName}</div>
                    <div class="text-xs text-gray-500 capitalize">${displayRole}</div>
                </div>
            </a>
        </div>
    </aside>

    <header class="fixed top-0 left-[240px] right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-20">
        <div class="h-full flex items-center justify-between px-8">
            <div class="flex-1 max-w-xl">
                <div class="relative">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"></i>
                    <input
                        type="text"
                        placeholder="Search products, forecasts..."
                        class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all duration-200"
                    />
                </div>
            </div>

            <div class="flex items-center gap-4">
                <div class="relative">
                    <button id="notificationBtn" class="relative p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200" aria-label="Notifications">
                        <i data-lucide="bell" class="w-5 h-5 text-gray-600"></i>
                        <span id="notificationBadge" class="hidden absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full text-[11px] font-bold leading-[18px] text-center"></span>
                    </button>
                    <div id="notificationPanel" class="hidden absolute right-0 top-full mt-3 w-[420px] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-xl z-[80] overflow-hidden">
                        <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                            <div>
                                <h3 class="text-sm font-semibold text-gray-900">Notifications</h3>
                                <p id="notificationPeriod" class="text-xs text-gray-500 mt-0.5">Latest updates</p>
                            </div>
                            <button id="notificationRefreshBtn" class="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center" aria-label="Refresh notifications">
                                <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                            </button>
                        </div>
                        <div id="notificationContent" class="max-h-[440px] overflow-y-auto p-4">
                            <div class="py-8 text-center text-sm text-gray-500">Loading notifications...</div>
                        </div>
                    </div>
                </div>

                <a href="#" id="logoutBtn" class="text-sm text-gray-500 hover:text-gray-900 px-2 py-1 flex items-center gap-1">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                    Logout
                </a>
            </div>
        </div>
    </header>
`;


// ===============================
// 8. Gáº®N LAYOUT VÃ€O TRANG
// ===============================

const wrapper = document.querySelector('.size-full');

if (wrapper) {
    wrapper.insertAdjacentHTML('afterbegin', layoutHtml);
}


// ===============================
// 9. LOGOUT
// ===============================

const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', function (event) {
        event.preventDefault();

        if (typeof Auth !== 'undefined' && typeof Auth.logout === 'function') {
            Auth.logout(event);
            return;
        }

        localStorage.removeItem('forecastai_token');
        localStorage.removeItem('forecastai_user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        window.location.href = 'login.html';
    });
}


// ===============================
// 10. KHá»žI Táº O ICON
// ===============================

if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}


// ===============================
// 11. CUSTOM ALERTS & CONFIRMS
// ===============================

// Override default alert
window.alert = function(message) {
    const existing = document.getElementById('_global_toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.id = '_global_toast';
    toast.className = 'fixed top-20 right-8 z-[9999] px-6 py-4 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 bg-gray-900 text-white transition-all duration-300 transform translate-x-0 opacity-100';
    toast.innerHTML = `<i data-lucide="info" class="w-5 h-5 text-[#3b82f6]"></i><span>${message}</span>`;
    
    document.body.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    setTimeout(() => { 
        toast.classList.add('translate-x-[150%]', 'opacity-0'); 
        setTimeout(() => toast.remove(), 300); 
    }, 3500);
};

// Custom Confirm Dialog
window.showConfirmDialog = function(message, onConfirm) {
    const existing = document.getElementById('_global_confirm');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = '_global_confirm';
    overlay.className = 'fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300';
    
    overlay.innerHTML = `
        <div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl transform scale-95 transition-transform duration-300" onclick="event.stopPropagation()">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                    <i data-lucide="alert-triangle" class="w-5 h-5 text-yellow-600"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-900">Confirmation</h3>
            </div>
            <p class="text-gray-600 mb-6 text-sm">${message}</p>
            <div class="flex gap-3">
                <button id="_btnConfirmCancel" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">Cancel</button>
                <button id="_btnConfirmOk" class="flex-1 px-4 py-2 bg-[#2563EB] text-white rounded-xl hover:bg-[#1d4ed8] transition-colors text-sm font-medium shadow-sm">Confirm</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Animate in
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        overlay.querySelector('div').classList.remove('scale-95');
    });

    const close = () => {
        overlay.classList.add('opacity-0');
        overlay.querySelector('div').classList.add('scale-95');
        setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('_btnConfirmCancel').addEventListener('click', close);
    document.getElementById('_btnConfirmOk').addEventListener('click', () => {
        close();
        if (typeof onConfirm === 'function') onConfirm();
    });
};

// Global Image Viewer
window.openImageViewer = function(src) {
    const existing = document.getElementById('_global_image_viewer');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = '_global_image_viewer';
    overlay.className = 'fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300';
    
    overlay.innerHTML = `
        <div class="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onclick="event.stopPropagation()">
            <img src="${src}" class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl transform scale-95 transition-transform duration-300" />
            <button id="_btnCloseImageViewer" class="absolute -top-4 -right-4 w-10 h-10 bg-white text-gray-900 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Animate in
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        overlay.querySelector('img').classList.remove('scale-95');
    });

    const close = () => {
        overlay.classList.add('opacity-0');
        overlay.querySelector('img').classList.add('scale-95');
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.addEventListener('click', close);
    document.getElementById('_btnCloseImageViewer').addEventListener('click', close);
};

// Global Image Gallery Viewer
window.openGallery = function(urls) {
    if (!urls || urls.length === 0) return;
    if (urls.length === 1) return window.openImageViewer(urls[0]);

    const existing = document.getElementById('_global_gallery_viewer');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = '_global_gallery_viewer';
    overlay.className = 'fixed inset-0 bg-black/90 z-[10000] flex flex-col items-center justify-center p-4 opacity-0 transition-opacity duration-300';
    
    let currentIndex = 0;
    
    overlay.innerHTML = `
        <button id="_btnGalleryClose" class="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-50">
            <i data-lucide="x" class="w-6 h-6"></i>
        </button>
        <div class="relative max-w-5xl max-h-[75vh] w-full flex flex-1 items-center justify-center mb-6" onclick="event.stopPropagation()">
            <button id="_btnPrev" class="absolute left-0 w-12 h-12 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors z-50">
                <i data-lucide="chevron-left" class="w-8 h-8"></i>
            </button>
            <img id="_galleryMainImg" src="${urls[0]}" class="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl transition-all duration-300" />
            <button id="_btnNext" class="absolute right-0 w-12 h-12 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors z-50">
                <i data-lucide="chevron-right" class="w-8 h-8"></i>
            </button>
        </div>
        <div class="flex gap-3 overflow-x-auto p-4 w-full max-w-5xl justify-center bg-black/50 rounded-xl" id="_galleryThumbnails">
            ${urls.map((url, idx) => `
                <img src="${url}" data-idx="${idx}" class="w-20 h-20 object-cover rounded-lg cursor-pointer border-2 ${idx === 0 ? 'border-blue-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-100'} transition-all shrink-0" />
            `).join('')}
        </div>
    `;

    document.body.appendChild(overlay);
    lucide.createIcons();

    overlay.offsetHeight; // Force reflow
    overlay.classList.remove('opacity-0');

    const mainImg = document.getElementById('_galleryMainImg');
    const thumbnails = overlay.querySelectorAll('#_galleryThumbnails img');
    
    const updateGallery = (idx) => {
        currentIndex = idx;
        mainImg.src = urls[currentIndex];
        thumbnails.forEach((th, i) => {
            if (i === currentIndex) {
                th.classList.replace('border-transparent', 'border-blue-500');
                th.classList.replace('opacity-50', 'opacity-100');
            } else {
                th.classList.replace('border-blue-500', 'border-transparent');
                th.classList.replace('opacity-100', 'opacity-50');
            }
        });
    };

    overlay.querySelector('#_btnPrev').addEventListener('click', (e) => {
        e.stopPropagation();
        updateGallery(currentIndex === 0 ? urls.length - 1 : currentIndex - 1);
    });

    overlay.querySelector('#_btnNext').addEventListener('click', (e) => {
        e.stopPropagation();
        updateGallery(currentIndex === urls.length - 1 ? 0 : currentIndex + 1);
    });

    thumbnails.forEach(th => {
        th.addEventListener('click', (e) => {
            e.stopPropagation();
            updateGallery(parseInt(th.dataset.idx));
        });
    });

    const close = () => {
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('#_btnGalleryClose').addEventListener('click', close);
    overlay.addEventListener('click', close);
};


// ===============================
// 12. NOTIFICATIONS - DATABASE BACKED
// ==========================================
let notificationItems = [];
let notificationUnreadCount = 0;

function escapeLayoutHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatNotificationTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function notificationTypeClasses(type) {
    const normalized = String(type || 'info').toLowerCase();
    if (normalized === 'success') return 'bg-emerald-50 text-emerald-700';
    if (normalized === 'warning') return 'bg-amber-50 text-amber-700';
    if (normalized === 'error') return 'bg-red-50 text-red-700';
    return 'bg-blue-50 text-blue-700';
}

function notificationTypeIcon(type) {
    const normalized = String(type || 'info').toLowerCase();
    if (normalized === 'success') return 'check-circle-2';
    if (normalized === 'warning') return 'alert-triangle';
    if (normalized === 'error') return 'x-circle';
    return 'info';
}

function renderNotificationPanel() {
    const badge = document.getElementById('notificationBadge');
    const content = document.getElementById('notificationContent');
    const period = document.getElementById('notificationPeriod');
    if (!badge || !content || !period) return;

    if (notificationUnreadCount > 0) {
        badge.classList.remove('hidden');
        badge.textContent = String(Math.min(notificationUnreadCount, 99));
    } else {
        badge.classList.add('hidden');
        badge.textContent = '';
    }

    period.textContent = notificationUnreadCount > 0
        ? `${notificationUnreadCount} unread notification${notificationUnreadCount > 1 ? 's' : ''}`
        : 'All caught up';

    if (notificationItems.length === 0) {
        content.innerHTML = '<div class="py-8 text-center text-sm text-gray-500">No notifications right now.</div>';
        return;
    }

    const items = notificationItems.map(item => {
        const unread = !item.is_read;
        const typeClass = notificationTypeClasses(item.type);
        const icon = notificationTypeIcon(item.type);
        return `
            <button type="button" class="notification-item w-full text-left rounded-lg border ${unread ? 'border-blue-100 bg-blue-50/40' : 'border-gray-100 bg-white'} p-3 hover:bg-gray-50 transition-colors" data-id="${item.notification_id}" data-link="${escapeLayoutHtml(item.link || '')}">
                <div class="flex items-start gap-3">
                    <span class="w-8 h-8 rounded-lg ${typeClass} flex items-center justify-center shrink-0">
                        <i data-lucide="${icon}" class="w-4 h-4"></i>
                    </span>
                    <span class="min-w-0 flex-1">
                        <span class="flex items-start justify-between gap-3">
                            <span class="font-semibold text-sm text-gray-900 leading-5">${escapeLayoutHtml(item.title)}</span>
                            ${unread ? '<span class="w-2 h-2 mt-1.5 rounded-full bg-blue-600 shrink-0"></span>' : ''}
                        </span>
                        <span class="block text-xs text-gray-600 mt-1 leading-5">${escapeLayoutHtml(item.message)}</span>
                        <span class="block text-[11px] text-gray-400 mt-2">${formatNotificationTime(item.created_at)}</span>
                    </span>
                </div>
            </button>
        `;
    }).join('');

    content.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-medium text-gray-500">Latest updates</span>
            <button id="notificationMarkAllBtn" type="button" class="text-xs font-semibold text-blue-600 hover:text-blue-700">Mark all read</button>
        </div>
        <div class="space-y-2">${items}</div>
    `;

    document.querySelectorAll('.notification-item').forEach(button => {
        button.addEventListener('click', async () => {
            const id = button.dataset.id;
            const link = button.dataset.link;
            await markNotificationRead(id);
            if (link) {
                window.location.href = link;
            } else {
                await loadNotifications();
            }
        });
    });

    const markAllBtn = document.getElementById('notificationMarkAllBtn');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async (event) => {
            event.stopPropagation();
            await markAllNotificationsRead();
        });
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadNotifications() {
    const content = document.getElementById('notificationContent');
    try {
        if (typeof apiFetch !== 'function') throw new Error('API helper is not available');
        const response = await apiFetch('/notifications?limit=30');
        notificationItems = response?.data || [];
        notificationUnreadCount = Number(response?.unread_count || 0);
        renderNotificationPanel();
    } catch (error) {
        console.warn('Could not load notifications', error);
        notificationItems = [];
        notificationUnreadCount = 0;
        if (content) content.innerHTML = '<div class="py-8 text-center text-sm text-gray-500">Could not load notifications.</div>';
        renderNotificationPanel();
    }
}

async function markNotificationRead(id) {
    if (!id || typeof apiFetch !== 'function') return;
    try {
        await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
    } catch (error) {
        console.warn('Could not mark notification read', error);
    }
}

async function markAllNotificationsRead() {
    if (typeof apiFetch !== 'function') return;
    try {
        await apiFetch('/notifications/read-all', { method: 'PUT' });
        await loadNotifications();
    } catch (error) {
        showToast('Could not mark notifications as read: ' + error.message, 'error');
    }
}

(function initNotifications() {
    const button = document.getElementById('notificationBtn');
    const panel = document.getElementById('notificationPanel');
    const refreshBtn = document.getElementById('notificationRefreshBtn');
    if (!button || !panel) return;

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden')) {
            loadNotifications();
        }
    });

    if (refreshBtn) {
        refreshBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            loadNotifications();
        });
    }

    document.addEventListener('click', (event) => {
        if (!panel.contains(event.target) && !button.contains(event.target)) {
            panel.classList.add('hidden');
        }
    });

    loadNotifications();
})();
// Apply web autozoom 90%
(function applyAutoZoom() {
    const style = document.createElement('style');
    style.textContent = `
        body {
            zoom: 90%;
        }
    `;
    document.head.appendChild(style);
})();
