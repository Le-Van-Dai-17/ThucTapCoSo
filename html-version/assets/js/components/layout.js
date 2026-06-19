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
        'profile.html'
    ],

    Staff: [
        'pos.html',
        'purchase-orders.html',
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
        href: 'products.html',
        label: 'Products & Inventory',
        icon: 'box',
        roles: ['Manager']
    },
    {
        href: 'categories.html',
        label: 'Categories',
        icon: 'tags',
        roles: ['Manager']
    },
    {
        href: 'sales-data.html',
        label: 'Demand Data',
        icon: 'line-chart',
        roles: ['Manager']
    },
    {
        href: 'import.html',
        label: 'Import Data',
        icon: 'upload',
        roles: ['Manager']
    },
    {
        href: 'reports.html',
        label: 'Reports',
        icon: 'file-text',
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
        href: 'suppliers.html',
        label: 'Suppliers',
        icon: 'truck',
        roles: ['Manager']
    },
    {
        href: 'forecast.html',
        label: 'Forecast',
        icon: 'trending-up',
        roles: ['Manager']
    },
    {
        href: 'users.html',
        label: 'Users',
        icon: 'users',
        roles: ['Admin']
    },
    {
        href: 'activity-log.html',
        label: 'Activity Log',
        icon: 'activity',
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
        showToast('Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p trang nÃ y. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.', 'info');

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
    <aside class="fixed left-0 top-0 h-screen w-[240px] bg-white border-r border-gray-200 shadow-sm z-30 flex flex-col">
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
                <button class="relative p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                    <i data-lucide="bell" class="w-5 h-5 text-gray-600"></i>
                    <span class="absolute top-1 right-1 w-2 h-2 bg-[#F59E0B] rounded-full"></span>
                </button>

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

