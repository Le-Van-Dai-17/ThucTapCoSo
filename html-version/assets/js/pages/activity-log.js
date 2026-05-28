lucide.createIcons();

// ===============================
// STATE
// ===============================
let activities = [];
let uniqueUsers = [];

let selectedUser = "All Users";
let selectedDateRange = "All Time";
let isUserFilterOpen = false;
let isDateFilterOpen = false;

// ===============================
// ELEMENTS
// ===============================
const searchInput = document.getElementById('searchInput');

const userFilterMenu = document.getElementById('userFilterMenu');
const userFilterIcon = document.getElementById('userFilterIcon');
const userFilterText = document.getElementById('userFilterText');
const userFilterOptions = document.getElementById('userFilterOptions');

const dateFilterMenu = document.getElementById('dateFilterMenu');
const dateFilterIcon = document.getElementById('dateFilterIcon');
const dateFilterText = document.getElementById('dateFilterText');

const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
const paginationInfo = document.getElementById('paginationInfo');

const totalActivitiesEl = document.getElementById('totalActivities');
const filteredResultsEl = document.getElementById('filteredResults');
const showTotalEl = document.getElementById('showTotal');
const totalMaxEl = document.getElementById('totalMax');
const lastUpdatedEl = document.getElementById('lastUpdated');

// ===============================
// HELPERS
// ===============================

function escapeHtml(value) {
    if (value === null || value === undefined) return '';

    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function normalizeActionText(action) {
    if (!action) return 'Unknown action';

    const map = {
        CREATE_USER: 'Tạo người dùng',
        UPDATE_USER: 'Cập nhật người dùng',
        DELETE_USER: 'Xóa / vô hiệu hóa người dùng',

        LOGIN_SUCCESS: 'Đăng nhập thành công',

        CREATE_PRODUCT: 'Tạo sản phẩm',
        UPDATE_PRODUCT: 'Cập nhật sản phẩm',
        DELETE_PRODUCT: 'Ngừng kinh doanh sản phẩm',

        CREATE_SALE: 'Tạo dữ liệu bán hàng',
        IMPORT_SALES_CSV: 'Import dữ liệu bán hàng CSV',
        IMPORT_SALES_DATA: 'Import dữ liệu bán hàng',

        RUN_FORECAST: 'Chạy dự báo',

        CREATE_PURCHASE: 'Tạo đơn nhập hàng',
        CREATE_PURCHASE_ORDER: 'Tạo đơn nhập hàng',
        UPDATE_PURCHASE: 'Cập nhật đơn nhập hàng',
        UPDATE_PURCHASE_ORDER: 'Cập nhật đơn nhập hàng',
        DELETE_PURCHASE: 'Xóa đơn nhập hàng',
        DELETE_PURCHASE_ORDER: 'Xóa đơn nhập hàng',
        RECEIVE_PURCHASE: 'Xác nhận nhập kho',
        RECEIVE_PURCHASE_ORDER: 'Xác nhận nhập kho',

        VIEW_FORECAST_DETAIL: 'Xem chi tiết dự báo'
    };

    return map[action] || action;
}

function getActionColor(action) {
    const l = String(action || '').toLowerCase();

    if (l.includes('login') || l.includes('logout') || l.includes('đăng nhập')) {
        return 'text-[#2563EB]'; // xanh dương
    }

    if (l.includes('import') || l.includes('export')) {
        return 'text-purple-600'; // tím
    }

    if (l.includes('forecast') || l.includes('dự báo')) {
        return 'text-orange-500'; // cam
    }

    if (l.includes('create') || l.includes('tạo')) {
        return 'text-[#10B981]'; // xanh lá
    }

    if (l.includes('delete') || l.includes('xóa') || l.includes('ngừng')) {
        return 'text-red-600'; // đỏ
    }

    if (l.includes('update') || l.includes('cập nhật') || l.includes('modified')) {
        return 'text-[#F59E0B]'; // vàng
    }

    return 'text-gray-600';
}

function getTableBadgeColor(table) {
    const key = String(table || '').toLowerCase();

    const colors = {
        users: 'bg-purple-100 text-purple-700',
        products: 'bg-blue-100 text-blue-700',
        inventory: 'bg-green-100 text-green-700',
        purchase_orders: 'bg-orange-100 text-orange-700',
        sales_transactions: 'bg-pink-100 text-pink-700',
        sale_details: 'bg-pink-100 text-pink-700',
        demand_forecasts: 'bg-indigo-100 text-indigo-700',
        forecasts: 'bg-indigo-100 text-indigo-700',
        reports: 'bg-teal-100 text-teal-700',
        system: 'bg-gray-100 text-gray-700'
    };

    return colors[key] || 'bg-gray-100 text-gray-700';
}

function formatDateFull(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return 'N/A';
    }

    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return 'N/A';
    }

    return date.toLocaleTimeString('vi-VN', {
        hour12: false
    });
}

function getInitials(name) {
    if (!name) return '?';

    const words = String(name).trim().split(/\s+/);

    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }

    return words
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase();
}

// ===============================
// LOAD DATA
// ===============================

async function fetchActivityLogs() {
    const result = await API.activityLogs.getAll();
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    return [];
}
function normalizeLog(log) {
    const user =
        log.full_name ||
        log.username ||
        (log.user_id ? `User #${log.user_id}` : 'System');

    const rawAction = log.action || 'UNKNOWN_ACTION';
    const description = log.description || normalizeActionText(rawAction);

    const tableAffected =
        log.entity_type ||
        log.table_name ||
        log.tableAffected ||
        'system';

    const createdAt =
        log.created_at ||
        log.timestamp ||
        log.createdAt ||
        new Date();

    return {
        id: log.log_id || log.id,
        user,
        userId: log.user_id || null,
        action: description,
        rawAction,
        tableAffected,
        timestamp: new Date(createdAt),
        ipAddress: log.ip_address || 'N/A'
    };
}

async function loadActivityLogs() {
    try {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-10 text-center text-gray-500">
                    Đang tải nhật ký hoạt động...
                </td>
            </tr>
        `;

        if (emptyState) {
            emptyState.classList.add('hidden');
        }

        if (paginationInfo) {
            paginationInfo.classList.add('hidden');
        }

        const logs = await fetchActivityLogs();

        activities = logs.map(normalizeLog);

        initFilters();
        renderData();

    } catch (error) {
        console.error('Lỗi tải Activity Log:', error);

        activities = [];

        if (totalActivitiesEl) totalActivitiesEl.textContent = '0';
        if (filteredResultsEl) filteredResultsEl.textContent = '0';

        if (emptyState) {
            emptyState.classList.add('hidden');
        }

        if (paginationInfo) {
            paginationInfo.classList.add('hidden');
        }

        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-10 text-center text-red-500">
                    Không thể tải nhật ký hoạt động từ backend.
                    <br>
                    <span class="text-xs text-gray-500">
                        ${escapeHtml(error.message)}
                    </span>
                </td>
            </tr>
        `;
    }
}

// ===============================
// FILTERS
// ===============================

function initFilters() {
    uniqueUsers = Array.from(new Set(activities.map(a => a.user))).sort();

    let opts = `
        <button 
            onclick="selectUserFilter('All Users')" 
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 text-sm bg-[#2563EB]/10 text-[#2563EB] font-medium border-none outline-none">
            All Users
        </button>
    `;

    uniqueUsers.forEach(user => {
        opts += `
            <button 
                onclick="selectUserFilter('${escapeHtml(user)}')" 
                class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 text-sm text-gray-700 border-none outline-none">
                ${escapeHtml(user)}
            </button>
        `;
    });

    if (userFilterOptions) {
        userFilterOptions.innerHTML = opts;
    }
}

window.toggleUserFilter = function () {
    isUserFilterOpen = !isUserFilterOpen;
    isDateFilterOpen = false;
    updateMenus();
};

window.toggleDateFilter = function () {
    isDateFilterOpen = !isDateFilterOpen;
    isUserFilterOpen = false;
    updateMenus();
};

window.selectUserFilter = function (user) {
    selectedUser = user;
    userFilterText.textContent = user;

    isUserFilterOpen = false;

    updateMenus();
    updateUserOptionsVisual();
    renderData();
};

window.selectDateFilter = function (range) {
    selectedDateRange = range;
    dateFilterText.textContent = range;

    isDateFilterOpen = false;

    updateMenus();
    updateDateOptionsVisual();
    renderData();
};

function updateMenus() {
    if (userFilterMenu && userFilterIcon) {
        if (isUserFilterOpen) {
            userFilterMenu.classList.remove('hidden');
            userFilterIcon.classList.add('rotate-180');
        } else {
            userFilterMenu.classList.add('hidden');
            userFilterIcon.classList.remove('rotate-180');
        }
    }

    if (dateFilterMenu && dateFilterIcon) {
        if (isDateFilterOpen) {
            dateFilterMenu.classList.remove('hidden');
            dateFilterIcon.classList.add('rotate-180');
        } else {
            dateFilterMenu.classList.add('hidden');
            dateFilterIcon.classList.remove('rotate-180');
        }
    }
}

function updateUserOptionsVisual() {
    if (!userFilterOptions) return;

    const buttons = userFilterOptions.querySelectorAll('button');

    buttons.forEach(button => {
        if (button.textContent.trim() === selectedUser) {
            button.className = 'w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 text-sm bg-[#2563EB]/10 text-[#2563EB] font-medium border-none outline-none';
        } else {
            button.className = 'w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 text-sm text-gray-700 border-none outline-none';
        }
    });
}

function updateDateOptionsVisual() {
    if (!dateFilterMenu) return;

    const buttons = dateFilterMenu.querySelectorAll('button');

    buttons.forEach(button => {
        if (button.textContent.trim() === selectedDateRange) {
            button.className = 'w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 text-sm bg-[#2563EB]/10 text-[#2563EB] font-medium border-none outline-none';
        } else {
            button.className = 'w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 text-sm text-gray-700 border-none outline-none';
        }
    });
}

// ===============================
// RENDER
// ===============================

function renderData() {
    const query = (searchInput?.value || '').toLowerCase();

    const filtered = activities.filter(activity => {
        const matchesSearch =
            String(activity.user).toLowerCase().includes(query) ||
            String(activity.action).toLowerCase().includes(query) ||
            String(activity.rawAction).toLowerCase().includes(query) ||
            String(activity.tableAffected).toLowerCase().includes(query) ||
            String(activity.ipAddress).toLowerCase().includes(query);

        const matchesUser =
            selectedUser === 'All Users' ||
            activity.user === selectedUser;

        let matchesDate = true;

        const now = new Date();
        const activityDate = activity.timestamp;

        if (selectedDateRange === 'Today') {
            matchesDate = activityDate.toDateString() === now.toDateString();
        } else if (selectedDateRange === 'Last 7 Days') {
            const minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = activityDate >= minDate;
        } else if (selectedDateRange === 'Last 30 Days') {
            const minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = activityDate >= minDate;
        }

        return matchesSearch && matchesUser && matchesDate;
    });

    if (totalActivitiesEl) {
        totalActivitiesEl.textContent = activities.length;
    }

    if (filteredResultsEl) {
        filteredResultsEl.textContent = filtered.length;
    }

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        if (emptyState) {
            emptyState.classList.remove('hidden');
        }

        if (paginationInfo) {
            paginationInfo.classList.add('hidden');
        }

        return;
    }

    if (emptyState) {
        emptyState.classList.add('hidden');
    }

    if (paginationInfo) {
        paginationInfo.classList.remove('hidden');
    }

    filtered.forEach(activity => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors duration-150';

        const initials = getInitials(activity.user);
        const actionColor = getActionColor(activity.rawAction + ' ' + activity.action);
        const badgeColor = getTableBadgeColor(activity.tableAffected);

        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        ${escapeHtml(initials)}
                    </div>
                    <div>
                        <div class="text-sm font-medium text-gray-900">
                            ${escapeHtml(activity.user)}
                        </div>
                        ${activity.userId ? `
                            <div class="text-xs text-gray-500">
                                ID: ${escapeHtml(activity.userId)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </td>

            <td class="px-6 py-4">
                <div class="text-sm font-medium ${actionColor}">
                    ${escapeHtml(activity.action)}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                    ${escapeHtml(activity.rawAction)}
                </div>
            </td>

            <td class="px-6 py-4">
                <div class="flex justify-center">
                    <span class="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold ${badgeColor}">
                        ${escapeHtml(activity.tableAffected)}
                    </span>
                </div>
            </td>

            <td class="px-6 py-4">
                <div class="text-sm font-mono text-gray-900">
                    ${formatDateFull(activity.timestamp)}
                </div>
                <div class="text-xs font-mono text-gray-500 mt-0.5">
                    ${formatTime(activity.timestamp)}
                </div>
            </td>

            <td class="px-6 py-4">
                <span class="text-sm font-mono text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                    ${escapeHtml(activity.ipAddress)}
                </span>
            </td>
        `;

        tableBody.appendChild(tr);
    });

    if (showTotalEl) {
        showTotalEl.textContent = filtered.length;
    }

    if (totalMaxEl) {
        totalMaxEl.textContent = activities.length;
    }

    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = 'Last updated: ' + formatTime(new Date());
    }
}

// ===============================
// EVENTS
// ===============================

if (searchInput) {
    searchInput.addEventListener('input', renderData);
}

document.addEventListener('click', event => {
    if (
        !event.target.closest('#userFilterBtn') &&
        !event.target.closest('#userFilterMenu')
    ) {
        isUserFilterOpen = false;
        updateMenus();
    }

    if (
        !event.target.closest('#dateFilterBtn') &&
        !event.target.closest('#dateFilterMenu')
    ) {
        isDateFilterOpen = false;
        updateMenus();
    }
});

// ===============================
// INIT
// ===============================


window.Auth = window.Auth || {
    logout: function () {
        localStorage.removeItem('forecastai_token');
        localStorage.removeItem('forecastai_user');

        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');

        sessionStorage.removeItem('forecastai_token');
        sessionStorage.removeItem('forecastai_user');

        window.location.href = '../index.html';
    }
};

loadActivityLogs();