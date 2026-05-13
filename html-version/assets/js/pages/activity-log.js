lucide.createIcons();

const mockActivities = [
    { id: 1, user: "John Anderson", userId: 1, action: "Created new product", tableAffected: "products", timestamp: new Date("2026-03-28T10:15:30"), ipAddress: "192.168.1.105" },
    { id: 2, user: "Sarah Johnson", userId: 2, action: "Updated purchase order PO-2024-0245", tableAffected: "purchase_orders", timestamp: new Date("2026-03-28T10:12:45"), ipAddress: "192.168.1.112" },
    { id: 3, user: "Michael Chen", userId: 3, action: "Deleted user account", tableAffected: "users", timestamp: new Date("2026-03-28T10:08:22"), ipAddress: "192.168.1.89" },
    { id: 4, user: "John Anderson", userId: 1, action: "Imported sales data (250 records)", tableAffected: "sales_data", timestamp: new Date("2026-03-28T09:55:18"), ipAddress: "192.168.1.105" },
    { id: 5, user: "Emily Rodriguez", userId: 4, action: "Updated product SKU-1234 inventory", tableAffected: "inventory", timestamp: new Date("2026-03-28T09:45:33"), ipAddress: "192.168.1.98" },
    { id: 6, user: "David Kim", userId: 5, action: "Created purchase order PO-2024-0246", tableAffected: "purchase_orders", timestamp: new Date("2026-03-28T09:30:12"), ipAddress: "192.168.1.142" },
    { id: 7, user: "Sarah Johnson", userId: 2, action: "Generated forecast report", tableAffected: "reports", timestamp: new Date("2026-03-28T09:15:48"), ipAddress: "192.168.1.112" },
    { id: 8, user: "John Anderson", userId: 1, action: "Modified user permissions", tableAffected: "users", timestamp: new Date("2026-03-28T09:05:27"), ipAddress: "192.168.1.105" },
    { id: 9, user: "Robert Taylor", userId: 7, action: "Received inventory for PO-2024-0243", tableAffected: "inventory", timestamp: new Date("2026-03-28T08:50:15"), ipAddress: "192.168.1.67" },
    { id: 10, user: "Lisa Wang", userId: 8, action: "Updated product pricing", tableAffected: "products", timestamp: new Date("2026-03-28T08:35:44"), ipAddress: "192.168.1.156" },
    { id: 11, user: "Michael Chen", userId: 3, action: "Exported sales data report", tableAffected: "sales_data", timestamp: new Date("2026-03-28T08:20:31"), ipAddress: "192.168.1.89" },
    { id: 12, user: "Emily Rodriguez", userId: 4, action: "Deleted product SKU-9999", tableAffected: "products", timestamp: new Date("2026-03-28T08:05:19"), ipAddress: "192.168.1.98" },
    { id: 13, user: "John Anderson", userId: 1, action: "Created new user account", tableAffected: "users", timestamp: new Date("2026-03-27T16:45:52"), ipAddress: "192.168.1.105" },
    { id: 14, user: "Sarah Johnson", userId: 2, action: "Updated forecast parameters", tableAffected: "forecasts", timestamp: new Date("2026-03-27T15:30:28"), ipAddress: "192.168.1.112" },
    { id: 15, user: "David Kim", userId: 5, action: "Approved purchase order PO-2024-0244", tableAffected: "purchase_orders", timestamp: new Date("2026-03-27T14:15:37"), ipAddress: "192.168.1.142" },
];

const uniqueUsers = Array.from(new Set(mockActivities.map(a => a.user))).sort();

// State
let selectedUser = "All Users";
let selectedDateRange = "All Time";
let isUserFilterOpen = false;
let isDateFilterOpen = false;

// Elements
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

function getActionColor(action) {
    const l = action.toLowerCase();
    if (l.includes("created") || l.includes("imported")) return "text-[#10B981]";
    if (l.includes("deleted")) return "text-red-600";
    if (l.includes("updated") || l.includes("modified")) return "text-[#F59E0B]";
    return "text-[#2563EB]";
}

function getTableBadgeColor(table) {
    const colors = {
        users: "bg-purple-100 text-purple-700",
        products: "bg-blue-100 text-blue-700",
        inventory: "bg-green-100 text-green-700",
        purchase_orders: "bg-orange-100 text-orange-700",
        sales_data: "bg-pink-100 text-pink-700",
        forecasts: "bg-indigo-100 text-indigo-700",
        reports: "bg-teal-100 text-teal-700",
    };
    return colors[table] || "bg-gray-100 text-gray-700";
}

function formatDateFull(date) {
    return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function formatTime(date) {
    return date.toLocaleTimeString("en-US", { hour12: false });
}

function initFilters() {
    let opts = `<button onclick="selectUserFilter('All Users')" class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 text-sm bg-[#2563EB]/10 text-[#2563EB] font-medium border-none outline-none">All Users</button>`;
    uniqueUsers.forEach(u => {
        opts += `<button onclick="selectUserFilter('${u}')" class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 text-sm text-gray-700 border-none outline-none">${u}</button>`;
    });
    userFilterOptions.innerHTML = opts;
}

window.toggleUserFilter = function() {
    isUserFilterOpen = !isUserFilterOpen;
    isDateFilterOpen = false;
    updateMenus();
}

window.toggleDateFilter = function() {
    isDateFilterOpen = !isDateFilterOpen;
    isUserFilterOpen = false;
    updateMenus();
}

window.selectUserFilter = function(user) {
    selectedUser = user;
    userFilterText.textContent = user;
    isUserFilterOpen = false;
    updateMenus();
    updateUserOptionsVisual();
    renderData();
}

window.selectDateFilter = function(range) {
    selectedDateRange = range;
    dateFilterText.textContent = range;
    isDateFilterOpen = false;
    updateMenus();
    updateDateOptionsVisual();
    renderData();
}

function updateMenus() {
    if (isUserFilterOpen) {
        userFilterMenu.classList.remove('hidden');
        userFilterIcon.classList.add('rotate-180');
    } else {
        userFilterMenu.classList.add('hidden');
        userFilterIcon.classList.remove('rotate-180');
    }

    if (isDateFilterOpen) {
        dateFilterMenu.classList.remove('hidden');
        dateFilterIcon.classList.add('rotate-180');
    } else {
        dateFilterMenu.classList.add('hidden');
        dateFilterIcon.classList.remove('rotate-180');
    }
}

function updateUserOptionsVisual() {
    const btns = userFilterOptions.querySelectorAll('button');
    btns.forEach(b => {
        if (b.textContent === selectedUser) {
            b.className = "w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 text-sm bg-[#2563EB]/10 text-[#2563EB] font-medium border-none outline-none";
        } else {
            b.className = "w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 text-sm text-gray-700 border-none outline-none";
        }
    });
}

function updateDateOptionsVisual() {
    const btns = dateFilterMenu.querySelectorAll('button');
    btns.forEach(b => {
        if (b.textContent === selectedDateRange) {
            b.className = "w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 text-sm bg-[#2563EB]/10 text-[#2563EB] font-medium border-none outline-none";
        } else {
            b.className = "w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 text-sm text-gray-700 border-none outline-none";
        }
    });
}

function renderData() {
    const q = searchInput.value.toLowerCase();
    
    const filtered = mockActivities.filter(a => {
        const matchesSearch = 
            a.user.toLowerCase().includes(q) || 
            a.action.toLowerCase().includes(q) || 
            a.tableAffected.toLowerCase().includes(q) || 
            a.ipAddress.includes(q);
            
        const matchesUser = selectedUser === "All Users" || a.user === selectedUser;

        let matchesDate = true;
        const now = new Date();
        const aDate = a.timestamp;

        if (selectedDateRange === "Today") {
            matchesDate = aDate.toDateString() === now.toDateString();
        } else if (selectedDateRange === "Last 7 Days") {
            const minDate = new Date(now.getTime() - 7*24*60*60*1000);
            matchesDate = aDate >= minDate;
        } else if (selectedDateRange === "Last 30 Days") {
            const minDate = new Date(now.getTime() - 30*24*60*60*1000);
            matchesDate = aDate >= minDate;
        }

        return matchesSearch && matchesUser && matchesDate;
    });

    document.getElementById('totalActivities').textContent = mockActivities.length;
    document.getElementById('filteredResults').textContent = filtered.length;

    tableBody.innerHTML = '';
    
    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        paginationInfo.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        paginationInfo.classList.remove('hidden');
        
        filtered.forEach(a => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 transition-colors duration-150";

            const initials = a.user.split(" ").map(n => n[0]).join("");
            const actColor = getActionColor(a.action);
            const badgeColor = getTableBadgeColor(a.tableAffected);

            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                            ${initials}
                        </div>
                        <span class="text-sm font-medium text-gray-900">${a.user}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="text-sm font-medium ${actColor}">${a.action}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex justify-center">
                        <span class="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold ${badgeColor}">
                            ${a.tableAffected}
                        </span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-mono text-gray-900">${formatDateFull(a.timestamp)}</div>
                    <div class="text-xs font-mono text-gray-500 mt-0.5">${formatTime(a.timestamp)}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="text-sm font-mono text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                        ${a.ipAddress}
                    </span>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        document.getElementById('showTotal').textContent = filtered.length;
        document.getElementById('totalMax').textContent = mockActivities.length;
        document.getElementById('lastUpdated').textContent = "Last updated: " + formatTime(new Date());
    }
}

searchInput.addEventListener('input', renderData);

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('#userFilterBtn') && !e.target.closest('#userFilterMenu')) {
        isUserFilterOpen = false;
        updateMenus();
    }
    if (!e.target.closest('#dateFilterBtn') && !e.target.closest('#dateFilterMenu')) {
        isDateFilterOpen = false;
        updateMenus();
    }
});

initFilters();
renderData();
