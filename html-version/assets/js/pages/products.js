lucide.createIcons();

// Kiểm tra auth
if (typeof Auth !== 'undefined') Auth.requireAuth();

// Mock data fallback
const MOCK_PRODUCTS = [
    { id: 1, sku: "WBH-001", name: "Wireless Bluetooth Headphones", category: "Electronics", selling_price: 89.99, current_stock: 145, status: "active" },
    { id: 2, sku: "SWS-005", name: "Smart Watch Series 5", category: "Electronics", selling_price: 299.99, current_stock: 67, status: "active" },
    { id: 3, sku: "LSA-220", name: "Laptop Stand Aluminum", category: "Accessories", selling_price: 45.50, current_stock: 234, status: "active" },
    { id: 4, sku: "MKR-070", name: "Mechanical Keyboard RGB", category: "Electronics", selling_price: 129.99, current_stock: 89, status: "active" },
    { id: 5, sku: "WME-360", name: "Wireless Mouse Ergonomic", category: "Accessories", selling_price: 49.99, current_stock: 312, status: "active" },
    { id: 6, sku: "UCH-120", name: "USB-C Hub 7-in-1", category: "Electronics", selling_price: 59.99, current_stock: 156, status: "active" },
    { id: 7, sku: "BTS-045", name: "Bluetooth Speaker Portable", category: "Electronics", selling_price: 79.99, current_stock: 0, status: "discontinued" },
    { id: 8, sku: "PHC-089", name: "Phone Case Premium Leather", category: "Accessories", selling_price: 34.99, current_stock: 421, status: "active" },
    { id: 9, sku: "WCH-QI15", "name": "Wireless Charger 15W", category: "Electronics", selling_price: 39.99, current_stock: 198, status: "active" },
    { id: 10, sku: "HDM-200", name: "HDMI Cable 2.1 (2m)", category: "Accessories", selling_price: 19.99, current_stock: 567, status: "active" }
];

let allProducts = [];
let isUsingMock = false;

const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const tableBody = document.getElementById('tableBody');
const statsCards = document.getElementById('statsCards');

// Load dữ liệu
async function loadProducts() {
    showLoading('tableBody');
    try {
        const result = await API.products.getAll();
        allProducts = result.data || result;
        isUsingMock = false;
    } catch (err) {
        console.warn('[Products] Dùng mock data:', err.message);
        allProducts = MOCK_PRODUCTS.map(p => ({
            ...p,
            selling_price: p.selling_price ?? p.sellingPrice,
            current_stock: p.current_stock ?? p.currentStock
        }));
        isUsingMock = true;
    }
    renderTable();
}

// Format
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
function getStockColor(stock) {
    if (stock === 0) return 'text-red-600';
    if (stock < 50) return 'text-orange-600';
    return 'text-gray-900';
}

// Render stats
function updateStats(data) {
    const activeCount = data.filter(p => p.status === 'active').length;
    const lowCount = data.filter(p => (p.current_stock ?? p.currentStock) < 50 && (p.current_stock ?? p.currentStock) > 0).length;
    const outCount = data.filter(p => (p.current_stock ?? p.currentStock) === 0).length;

    statsCards.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Total Products</div>
            <div class="text-2xl font-semibold text-gray-900">${data.length}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Active Products</div>
            <div class="text-2xl font-semibold text-[#10B981]">${activeCount}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Low Stock</div>
            <div class="text-2xl font-semibold text-orange-600">${lowCount}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Out of Stock</div>
            <div class="text-2xl font-semibold text-red-600">${outCount}</div>
        </div>
    `;
}

// Render bảng
function renderTable() {
    const query = searchInput.value.toLowerCase();
    const cat = categoryFilter.value;

    const filtered = allProducts.filter(p => {
        const stock = p.current_stock ?? p.currentStock;
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const matchSearch = name.includes(query) || sku.includes(query);
        const matchCategory = cat === 'All Categories' || p.category === cat;
        return matchSearch && matchCategory;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="py-16 text-center">
                        <div class="text-gray-400 mb-2 flex justify-center">
                            <i data-lucide="search" class="w-12 h-12"></i>
                        </div>
                        <p class="text-gray-600 font-medium">No products found</p>
                        <p class="text-sm text-gray-500 mt-1">Try adjusting your search or filter</p>
                    </div>
                </td>
            </tr>`;
    } else {
        filtered.forEach(product => {
            const stock = product.current_stock ?? product.currentStock;
            const price = product.selling_price ?? product.sellingPrice;
            const stockColor = getStockColor(stock);
            const statusClass = product.status === 'active'
                ? 'bg-[#10B981]/10 text-[#10B981]'
                : 'bg-gray-100 text-gray-600';
            const statusText = product.status === 'active' ? 'Active' : 'Discontinued';

            const tr = document.createElement('tr');
            tr.className = 'border-b border-[#E2E8F0] hover:bg-blue-50/50 transition-colors duration-150 h-14';
            tr.innerHTML = `
                <td class="px-4 py-4"><span class="font-mono text-sm font-medium text-gray-700">${product.sku}</span></td>
                <td class="px-4 py-4"><span class="font-medium text-gray-900">${product.name}</span></td>
                <td class="px-4 py-4"><span class="text-sm text-gray-600">${product.category}</span></td>
                <td class="px-4 py-4 text-right"><span class="font-semibold text-gray-900">${formatCurrency(price)}</span></td>
                <td class="px-4 py-4 text-center"><span class="font-semibold ${stockColor}">${stock}</span></td>
                <td class="px-4 py-4 text-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${statusClass}">${statusText}</span>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center justify-center gap-2">
                        <button class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150"
                            onclick="openEditModal(${product.id})">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150"
                            onclick="deleteProduct(${product.id})">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>`;
            tableBody.appendChild(tr);
        });
    }

    updateStats(allProducts);
    lucide.createIcons();
}

// Xoá sản phẩm
window.deleteProduct = async function (id) {
    if (!confirm('Bạn có chắc muốn xoá sản phẩm này?')) return;

    try {
        if (!isUsingMock) {
            await API.products.delete(id);
        }
        allProducts = allProducts.filter(p => p.id !== id);
        renderTable();
        showToast('Đã xoá sản phẩm thành công.', 'success');
    } catch (err) {
        showToast('Xoá thất bại: ' + err.message, 'error');
    }
};

// Placeholder edit modal
window.openEditModal = function (id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    alert(`Chỉnh sửa: ${product.name}\n(Modal sẽ được tích hợp khi backend sẵn sàng)`);
};

// Event listeners
searchInput.addEventListener('input', renderTable);
categoryFilter.addEventListener('change', renderTable);

// Khởi động
loadProducts();
