lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

// Mock data fallback (khi backend chưa chạy)
const MOCK_PRODUCTS = [
    { id: 1, sku: "WBH-001", name: "Wireless Bluetooth Headphones", category: "Electronics", selling_price: 89.99, current_stock: 145, min_stock: 50, status: "active" },
    { id: 2, sku: "SWS-005", name: "Smart Watch Series 5",          category: "Electronics", selling_price: 299.99, current_stock: 67, min_stock: 30, status: "active" },
    { id: 3, sku: "LSA-220", name: "Laptop Stand Aluminum",          category: "Accessories", selling_price: 45.50, current_stock: 234, min_stock: 20, status: "active" },
    { id: 4, sku: "MKR-070", name: "Mechanical Keyboard RGB",        category: "Electronics", selling_price: 129.99, current_stock: 89, min_stock: 25, status: "active" },
    { id: 5, sku: "WME-360", name: "Wireless Mouse Ergonomic",       category: "Accessories", selling_price: 49.99, current_stock: 312, min_stock: 50, status: "active" },
];

let allProducts = [];
let isUsingMock  = false;
let editingId    = null;

const searchInput   = document.getElementById('searchInput');
const categoryFilter= document.getElementById('categoryFilter');
const tableBody     = document.getElementById('tableBody');
const statsCards    = document.getElementById('statsCards');

// Load dữ liệu từ backend
async function loadProducts() {
    showLoading('tableBody');
    try {
        const result  = await API.products.getAll();
        // Backend trả: { success: true, data: [...] }
        allProducts   = result.data || result;
        isUsingMock   = false;
        console.log(`✅ Loaded ${allProducts.length} products from backend.`);
    } catch (err) {
        console.warn('[Products] Backend offline → dùng mock data:', err.message);
        allProducts = [...MOCK_PRODUCTS];
        isUsingMock = true;
        showToast('⚠️ Đang dùng dữ liệu demo — backend chưa kết nối.', 'warning');
    }
    renderTable();
}

// Format helpers
function formatCurrency(v) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);
}
function getStockColor(stock, minStock) {
    if (stock === 0)           return 'text-red-600 font-bold';
    if (stock < (minStock||50))return 'text-orange-500 font-semibold';
    return 'text-gray-900';
}

// Render stats cards
function renderStats(data) {
    const active  = data.filter(p => p.status === 'active').length;
    const low     = data.filter(p => p.current_stock > 0 && p.current_stock < (p.min_stock || 50)).length;
    const out     = data.filter(p => p.current_stock === 0).length;
    if (!statsCards) return;
    statsCards.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Total Products</div>
            <div class="text-2xl font-semibold text-gray-900">${data.length}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Active</div>
            <div class="text-2xl font-semibold text-[#10B981]">${active}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Low Stock</div>
            <div class="text-2xl font-semibold text-orange-500">${low}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Out of Stock</div>
            <div class="text-2xl font-semibold text-red-600">${out}</div>
        </div>`;
}

// Render bảng sản phẩm
function renderTable() {
    const query = (searchInput?.value || '').toLowerCase();
    const cat   = categoryFilter?.value || 'All Categories';

    const filtered = allProducts.filter(p => {
        const matchSearch = (p.name||'').toLowerCase().includes(query) || (p.sku||'').toLowerCase().includes(query);
        const matchCat    = cat === 'All Categories' || p.category === cat;
        return matchSearch && matchCat;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="7">
                <div class="py-16 text-center">
                    <div class="text-gray-400 mb-2 flex justify-center"><i data-lucide="search" class="w-12 h-12"></i></div>
                    <p class="text-gray-600 font-medium">No products found</p>
                    <p class="text-sm text-gray-500 mt-1">Try adjusting your search or filter</p>
                </div>
            </td></tr>`;
    } else {
        filtered.forEach(p => {
            const stockColor  = getStockColor(p.current_stock, p.min_stock);
            const statusClass = p.status === 'active' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-gray-100 text-gray-500';
            const statusText  = p.status === 'active' ? 'Active' : 'Discontinued';

            const tr = document.createElement('tr');
            tr.className = 'border-b border-[#E2E8F0] hover:bg-blue-50/50 transition-colors duration-150 h-14';
            tr.innerHTML = `
                <td class="px-4 py-4"><span class="font-mono text-sm font-medium text-gray-700">${p.sku}</span></td>
                <td class="px-4 py-4"><span class="font-medium text-gray-900">${p.name}</span></td>
                <td class="px-4 py-4"><span class="text-sm text-gray-600">${p.category}</span></td>
                <td class="px-4 py-4 text-right"><span class="font-semibold text-gray-900">${formatCurrency(p.selling_price)}</span></td>
                <td class="px-4 py-4 text-center"><span class="${stockColor}">${p.current_stock}</span></td>
                <td class="px-4 py-4 text-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${statusClass}">${statusText}</span>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="openEditModal(${p.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteProduct(${p.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>`;
            tableBody.appendChild(tr);
        });
    }

    renderStats(allProducts);
    lucide.createIcons();
}

// Xoá sản phẩm
window.deleteProduct = async function (id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        if (!isUsingMock) {
            await API.products.delete(id);
        }
        allProducts = allProducts.filter(p => p.id !== id);
        renderTable();
        showToast('Product deleted successfully.', 'success');
    } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
    }
};

// Edit modal — lấy dữ liệu thực từ backend
window.openEditModal = async function (id) {
    editingId = id;
    try {
        let product;
        if (!isUsingMock) {
            const result = await API.products.getById(id);
            product = result.data || result;
        } else {
            product = allProducts.find(p => p.id === id);
        }
        if (!product) return;

        // Điền vào form (nếu modal có sẵn trong HTML)
        const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val ?? ''; };
        setVal('editSku',          product.sku);
        setVal('editName',         product.name);
        setVal('editCategory',     product.category);
        setVal('editSellingPrice', product.selling_price);
        setVal('editCostPrice',    product.cost_price);
        setVal('editStock',        product.current_stock);
        setVal('editMinStock',     product.min_stock);
        setVal('editStatus',       product.status);

        const modal = document.getElementById('editModalOverlay');
        if (modal) modal.classList.remove('hidden');
        else alert(`Edit: ${product.name}\n(Kéo modal vào HTML với id="editModalOverlay")`);

    } catch (err) {
        showToast('Cannot load product: ' + err.message, 'error');
    }
};

// Lưu sau khi edit
window.handleEditSubmit = async function (e) {
    if (e) e.preventDefault();
    if (!editingId) return;

    const getVal = id => document.getElementById(id)?.value;
    const payload = {
        sku:           getVal('editSku'),
        name:          getVal('editName'),
        category:      getVal('editCategory'),
        selling_price: parseFloat(getVal('editSellingPrice')),
        cost_price:    parseFloat(getVal('editCostPrice')),
        current_stock: parseInt(getVal('editStock')),
        min_stock:     parseInt(getVal('editMinStock')),
        status:        getVal('editStatus')
    };

    try {
        if (!isUsingMock) {
            await API.products.update(editingId, payload);
        } else {
            const idx = allProducts.findIndex(p => p.id === editingId);
            if (idx !== -1) allProducts[idx] = { ...allProducts[idx], ...payload };
        }
        await loadProducts();
        const modal = document.getElementById('editModalOverlay');
        if (modal) modal.classList.add('hidden');
        showToast('Product updated successfully.', 'success');
        editingId = null;
    } catch (err) {
        showToast('Update failed: ' + err.message, 'error');
    }
};

// Event listeners
if (searchInput)    searchInput.addEventListener('input', renderTable);
if (categoryFilter) categoryFilter.addEventListener('change', renderTable);

// Khởi động
loadProducts();