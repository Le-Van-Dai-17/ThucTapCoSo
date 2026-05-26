// ============================================================
// FILE: html-version/assets/js/pages/inventory.js
// Mô tả: Dashboard Quản lý Tồn kho
// ============================================================

lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

let allProducts = [];

const inventoryStats = document.getElementById('inventoryStats');
const tableBody = document.getElementById('inventoryTableBody');
const emptyState = document.getElementById('emptyState');
const statusFilter = document.getElementById('stockStatusFilter');
const searchInput = document.getElementById('searchInput');

// Khởi chạy khi load trang
async function init() {
    await Promise.all([
        loadStats(),
        loadProducts()
    ]);
}

// ============================================================
// Lấy dữ liệu thống kê từ báo cáo kho
// ============================================================
async function loadStats() {
    try {
        const stats = await API.reports.getInventoryStatus(); // GET /api/reports/inventory-status
        if (!stats) return;

        const totalValueFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.inventory_value || 0);

        inventoryStats.innerHTML = `
            <div class="bg-white rounded-[16px] shadow-sm border border-gray-200 p-6 flex flex-col justify-center">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-gray-500 font-medium">Total Products</div>
                    <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <i data-lucide="package" class="w-4 h-4 text-[#2563EB]"></i>
                    </div>
                </div>
                <div class="text-3xl font-semibold text-gray-900">${stats.total_products || 0}</div>
            </div>
            <div class="bg-white rounded-[16px] shadow-sm border border-gray-200 p-6 flex flex-col justify-center">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-gray-500 font-medium">Total Stock</div>
                    <div class="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                        <i data-lucide="boxes" class="w-4 h-4 text-[#10B981]"></i>
                    </div>
                </div>
                <div class="text-3xl font-semibold text-[#10B981]">${stats.total_stock || 0}</div>
            </div>
            <div class="bg-white rounded-[16px] shadow-sm border border-gray-200 p-6 flex flex-col justify-center">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-gray-500 font-medium">Low Stock Items</div>
                    <div class="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                        <i data-lucide="alert-triangle" class="w-4 h-4 text-orange-500"></i>
                    </div>
                </div>
                <div class="text-3xl font-semibold text-orange-500">${stats.low_stock_items || 0}</div>
            </div>
            <div class="bg-white rounded-[16px] shadow-sm border border-gray-200 p-6 flex flex-col justify-center">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-gray-500 font-medium">Out of Stock</div>
                    <div class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                        <i data-lucide="x-circle" class="w-4 h-4 text-red-600"></i>
                    </div>
                </div>
                <div class="text-3xl font-semibold text-red-600">${stats.out_of_stock_items || 0}</div>
            </div>
        `;
        lucide.createIcons();
    } catch (err) {
        console.warn('Lỗi lấy thống kê kho:', err.message);
    }
}

// ============================================================
// Lấy danh sách sản phẩm và render bảng
// ============================================================
async function loadProducts() {
    showLoading('inventoryTableBody', 'Đang tải dữ liệu tồn kho...');
    try {
        const result = await API.products.getAll();
        allProducts = (result.data || result).filter(p => p.is_discontinued === 0 || p.is_discontinued === false);
        console.log(`Loaded ${allProducts.length} active products for inventory.`);
        renderTable();
    } catch (err) {
        console.error('Lỗi lấy sản phẩm:', err.message);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-500">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
    }
}

function renderTable() {
    const filterValue = statusFilter.value;
    const searchValue = searchInput.value.toLowerCase().trim();

    let filtered = allProducts.filter(p => {
        // Lọc theo text
        if (searchValue && !p.name.toLowerCase().includes(searchValue)) return false;

        // Xác định trạng thái tồn
        const currentStock = Number(p.current_stock || 0);
        const minStock = Number(p.min_stock_level || 0);
        let status = 'in_stock';
        if (currentStock === 0) status = 'out_of_stock';
        else if (currentStock <= minStock) status = 'low_stock';

        // Lọc theo dropdown
        if (filterValue !== 'all' && status !== filterValue) return false;

        return true;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    filtered.forEach((p, index) => {
        const currentStock = Number(p.current_stock || 0);
        const minStock = Number(p.min_stock_level || 0);
        const maxStock = Number(p.max_stock_level || 100);
        
        let statusObj = { label: 'In Stock', class: 'bg-[#10B981]/10 text-[#10B981]', icon: 'check-circle-2', barColor: 'bg-[#10B981]' };
        
        if (currentStock === 0) {
            statusObj = { label: 'Out of Stock', class: 'bg-red-100 text-red-700', icon: 'x-circle', barColor: 'bg-red-500' };
        } else if (currentStock <= minStock) {
            statusObj = { label: 'Low Stock', class: 'bg-orange-100 text-orange-700 font-medium', icon: 'alert-triangle', barColor: 'bg-orange-500' };
        }

        // Tính % tồn kho so với max để vẽ thanh mini-progress
        let pct = (currentStock / (maxStock || 1)) * 100;
        if (pct > 100) pct = 100;

        const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';

        const tr = document.createElement('tr');
        tr.className = `hover:bg-gray-50 transition-colors duration-150 ${bgClass}`;
        
        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        <i data-lucide="package" class="w-5 h-5 text-gray-400"></i>
                    </div>
                    <div>
                        <div class="font-medium text-gray-900">${p.name}</div>
                        ${p.sku ? `<div class="text-xs text-gray-500 mt-0.5">SKU: ${p.sku}</div>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">${p.category || 'General'}</td>
            <td class="px-6 py-4 text-right">
                <div class="flex flex-col items-end gap-1">
                    <span class="font-semibold text-gray-900 text-lg">${currentStock}</span>
                    <div class="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div class="h-full ${statusObj.barColor}" style="width: ${pct}%"></div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-right text-sm text-gray-600">
                ${minStock}
            </td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${statusObj.class}">
                    <i data-lucide="${statusObj.icon}" class="w-3.5 h-3.5 mr-1.5"></i>
                    ${statusObj.label}
                </span>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    lucide.createIcons();
}

// Lắng nghe sự kiện filter
statusFilter.addEventListener('change', renderTable);
searchInput.addEventListener('input', renderTable);

// Bắt đầu
init();
