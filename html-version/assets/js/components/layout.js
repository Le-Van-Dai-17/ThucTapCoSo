// ======================================================
// layout.js
// Dùng cho các trang nội bộ sau khi đăng nhập
// Yêu cầu: mỗi file HTML phải import api.js trước layout.js
// Ví dụ:
// <script src="../assets/js/api.js"></script>
// <script src="../assets/js/components/layout.js"></script>
// ======================================================


// ===============================
// 1. BẢO VỆ TRANG NỘI BỘ
// ===============================
(function protectPrivatePage() {
    const currentPage = window.location.pathname.split('/').pop();

    // Không chặn trang login
    if (currentPage === 'login.html' || currentPage === '') {
        return;
    }

    // Nếu chưa import api.js thì Auth sẽ không tồn tại
    // Trường hợp này phải đá về login để tránh lọt trang
    if (typeof Auth === 'undefined') {
        window.location.href = 'login.html';
        return;
    }

    // Hỗ trợ nhiều tên hàm khác nhau tùy api.js của bạn đang viết kiểu nào
    let isLoggedIn = false;

    if (typeof Auth.isLoggedIn === 'function') {
        isLoggedIn = Auth.isLoggedIn();
    } else if (typeof Auth.isAuthenticated === 'function') {
        isLoggedIn = Auth.isAuthenticated();
    } else if (typeof Auth.getToken === 'function') {
        isLoggedIn = !!Auth.getToken();
    } else {
        // Fallback nếu api.js chưa có hàm kiểm tra
        isLoggedIn =
            !!localStorage.getItem('forecastai_token') ||
            !!localStorage.getItem('token');
    }

    if (!isLoggedIn) {
        window.location.href = 'login.html';
    }
})();


// ===============================
// 2. LẤY THÔNG TIN USER
// ===============================
let currentUser = null;

try {
    if (typeof Auth !== 'undefined' && typeof Auth.getUser === 'function') {
        currentUser = Auth.getUser();
    } else {
        const savedUser =
            localStorage.getItem('forecastai_user') ||
            localStorage.getItem('user');

        currentUser = savedUser ? JSON.parse(savedUser) : null;
    }
} catch (error) {
    console.error('Error reading current user:', error);
    currentUser = null;
}

const displayName = currentUser
    ? (currentUser.full_name || currentUser.fullName || currentUser.username || 'User')
    : 'User';

const displayRole = currentUser
    ? (currentUser.role || currentUser.role_name || 'User')
    : 'Guest';

const currentRole = String(displayRole || '').trim().toLowerCase();


// ===============================
// 3. TẠO AVATAR TỪ TÊN USER
// ===============================
const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';


// ===============================
// 4. HTML LAYOUT
// ===============================
const layoutHtml = `
    <!-- Sidebar -->
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
            <a href="dashboard.html" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 text-gray-700 hover:bg-gray-100">
                <i data-lucide="bar-chart-3" class="w-5 h-5"></i>
                <span>Dashboard</span>
            </a>

            <a href="products.html" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 text-gray-700 hover:bg-gray-100">
                <i data-lucide="box" class="w-5 h-5"></i>
                <span>Products</span>
            </a>

            <a href="sales-data.html" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 text-gray-700 hover:bg-gray-100">
                <i data-lucide="line-chart" class="w-5 h-5"></i>
                <span>Sales Data</span>
            </a>

            <a href="import.html" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 text-gray-700 hover:bg-gray-100">
                <i data-lucide="upload" class="w-5 h-5"></i>
                <span>Import Data</span>
            </a>

            <a href="reports.html" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 text-gray-700 hover:bg-gray-100">
                <i data-lucide="file-text" class="w-5 h-5"></i>
                <span>Reports</span>
            </a>

            <a href="inventory.html" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 text-gray-700 hover:bg-gray-100">
                <i data-lucide="package" class="w-5 h-5"></i>
                <span>Inventory</span>
            </a>

            <a href="purchase-orders.html" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 text-gray-700 hover:bg-gray-100">
                <i data-lucide="shopping-cart" class="w-5 h-5"></i>
                <span>Purchase Orders</span>
            </a>

            <a href="users.html" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 text-gray-700 hover:bg-gray-100">
                <i data-lucide="users" class="w-5 h-5"></i>
                <span>Users</span>
            </a>

            <a href="activity-log.html" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 text-gray-700 hover:bg-gray-100">
                <i data-lucide="activity" class="w-5 h-5"></i>
                <span>Activity Log</span>
            </a>

            <a href="settings.html" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 text-gray-700 hover:bg-gray-100">
                <i data-lucide="settings" class="w-5 h-5"></i>
                <span>Settings</span>
            </a>
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

    <!-- Header -->
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
// 5. GẮN LAYOUT VÀO TRANG
// ===============================
const wrapper = document.querySelector('.size-full');

if (wrapper) {
    wrapper.insertAdjacentHTML('afterbegin', layoutHtml);

    // Highlight active link
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    const navLinks = document.querySelectorAll('aside nav a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');

        if (currentRole === 'staff') {
            const staffPages = ['purchase-orders.html', 'profile.html'];
            if (!staffPages.includes(href)) {
                link.classList.add('hidden');
                return;
            }
        } else if (currentRole === 'manager') {
            const adminOnlyPages = ['users.html', 'settings.html'];
            if (adminOnlyPages.includes(href)) {
                link.classList.add('hidden');
                return;
            }
        }

        if (href === currentPath) {
            link.classList.remove('text-gray-700', 'hover:bg-gray-100');
            link.classList.add('bg-[#2563EB]/10', 'text-[#2563EB]');
        } else {
            link.classList.remove('bg-[#2563EB]/10', 'text-[#2563EB]');
            link.classList.add('text-gray-700', 'hover:bg-gray-100');
        }
    });
}


// ===============================
// 6. XỬ LÝ LOGOUT
// ===============================
const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', function (event) {
        event.preventDefault();

        if (typeof Auth !== 'undefined' && typeof Auth.logout === 'function') {
            Auth.logout(event);
            return;
        }

        // Fallback nếu Auth.logout chưa có
        localStorage.removeItem('forecastai_token');
        localStorage.removeItem('forecastai_user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        window.location.href = 'login.html';
    });
}


// ===============================
// 7. KHỞI TẠO ICON
// ===============================
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}
