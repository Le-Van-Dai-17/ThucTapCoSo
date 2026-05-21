// Lấy thông tin tài khoản đang đăng nhập từ LocalStorage thông qua Auth
const currentUser = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
const displayName = currentUser ? (currentUser.full_name || currentUser.username) : 'John Doe';
const displayRole = currentUser ? currentUser.role : 'Guest';

// Hàm tự động lấy chữ cái đầu làm Avatar (ví dụ: Thanh Truong -> TT)
const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
    
const layoutHtml = `<!-- Sidebar -->
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
                <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 text-gray-700 hover:bg-gray-100">
                    <i data-lucide="package" class="w-5 h-5"></i>
                    <span>Inventory</span>
                </a>
                <a href="purchase-orders.html" class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-200 text-gray-700 hover:bg-gray-100">
                    <i data-lucide="trending-up" class="w-5 h-5"></i>
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
                    <a href="#" onclick="Auth.logout(event)" class="text-sm text-gray-500 hover:text-gray-900 px-2 py-1 flex items-center gap-1">
                        <i data-lucide="log-out" class="w-4 h-4"></i> Logout
                    </a>
                </div>
            </div>
        </header>`;

const wrapper = document.querySelector('.size-full');
if (wrapper) {
    wrapper.insertAdjacentHTML('afterbegin', layoutHtml);
    
    // Highlight active link
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    const navLinks = document.querySelectorAll('aside nav a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            // Remove normal classes
            link.classList.remove('text-gray-700', 'hover:bg-gray-100');
            // Add active classes
            link.classList.add('bg-[#2563EB]/10', 'text-[#2563EB]');
        } else {
            // If it had active classes, remove them and add normal ones
            link.classList.remove('bg-[#2563EB]/10', 'text-[#2563EB]');
            link.classList.add('text-gray-700', 'hover:bg-gray-100');
        }
    });
}

// Initialize icons if lucide is available
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}
