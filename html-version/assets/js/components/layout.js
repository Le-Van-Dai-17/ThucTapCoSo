// ======================================================
// layout.js
// Dùng cho các trang nội bộ sau khi đăng nhập
// Mỗi file HTML nội bộ phải import api.js trước layout.js
// ======================================================


// ===============================
// 1. CẤU HÌNH PHÂN QUYỀN FRONTEND
// ===============================

const ROLE_PERMISSIONS = {
    Admin: [
        'dashboard.html',
        'products.html',
        'sales-data.html',
        'import.html',
        'reports.html',
        'inventory.html',
        'purchase-orders.html',
        'users.html',
        'activity-log.html',
        'settings.html',
        'profile.html'
    ],

    Manager: [
        'dashboard.html',
        'products.html',
        'sales-data.html',
        'import.html',
        'reports.html',
        'inventory.html',
        'purchase-orders.html',
        'activity-log.html',
        'profile.html'
    ],

    Staff: [
        'purchase-orders.html',
        'profile.html'
    ]
};

const NAV_ITEMS = [
    {
        href: 'dashboard.html',
        label: 'Dashboard',
        icon: 'bar-chart-3',
        roles: ['Admin', 'Manager']
    },
    {
        href: 'products.html',
        label: 'Products',
        icon: 'box',
        roles: ['Admin', 'Manager']
    },
    {
        href: 'sales-data.html',
        label: 'Sales Data',
        icon: 'line-chart',
        roles: ['Admin', 'Manager']
    },
    {
        href: 'import.html',
        label: 'Import Data',
        icon: 'upload',
        roles: ['Admin', 'Manager']
    },
    {
        href: 'reports.html',
        label: 'Reports',
        icon: 'file-text',
        roles: ['Admin', 'Manager']
    },
    {
        href: 'inventory.html',
        label: 'Inventory',
        icon: 'package',
        roles: ['Admin', 'Manager']
    },
    {
        href: 'purchase-orders.html',
        label: 'Purchase Orders',
        icon: 'shopping-cart',
        roles: ['Admin', 'Manager', 'Staff']
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
        roles: ['Admin', 'Manager']
    },
    {
        href: 'settings.html',
        label: 'Settings',
        icon: 'settings',
        roles: ['Admin']
    }
];


// ===============================
// 2. KIỂM TRA ĐĂNG NHẬP
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
// 3. LẤY USER HIỆN TẠI
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

const displayRole = currentUser ? currentUser.role : 'Guest';

const currentRole = String(displayRole || '').trim().toLowerCase();


// ===============================
// 4. CHẶN MỞ URL TRÁI QUYỀN
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
        alert('Bạn không có quyền truy cập trang này. Vui lòng đăng nhập lại.');

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
// 5. TẠO AVATAR
// ===============================

const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';


// ===============================
// 6. TẠO MENU THEO ROLE
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
// 8. GẮN LAYOUT VÀO TRANG
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
// 10. KHỞI TẠO ICON
// ===============================

if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}
