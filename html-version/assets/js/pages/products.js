// ============================================================
// FILE: html-version/assets/js/pages/products.js
// Task FE-01: Add Product → POST /api/products/create
// Task FE-02: Edit Product → PUT /api/products/update/:id
// ============================================================

lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

let allProducts = [];
let editingId   = null;

const searchInput    = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const tableBody      = document.getElementById('tableBody');
const statsCards     = document.getElementById('statsCards');

// ============================================================
// LOAD dữ liệu từ API thật
// ============================================================
async function loadProducts() {
    showLoading('tableBody');
    try {
        const result = await API.products.getAll();
        allProducts  = result.data || result;
        console.log(`Loaded ${allProducts.length} products from backend.`);
    } catch (err) {
        console.warn('[Products] Backend error:', err.message);
        allProducts = []; 
        showToast('Cannot load products from server.', 'error');
    }
    renderTable();
}

// ============================================================
// HELPERS
// ============================================================
function formatCurrency(v) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);
}
function getStockHtml(stock, minStock, maxStock) {
    if (stock === 0) return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Out of Stock (${stock})</span>`;
    if (stock <= (minStock || 0)) return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Low Stock (${stock})</span>`;
    if (maxStock && stock > maxStock) return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Overstock (${stock})</span>`;
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Normal (${stock})</span>`;
}
function renderStats(data) {
    const active = data.filter(p => p.status === 'active').length;
    const low    = data.filter(p => p.current_stock > 0 && p.current_stock < (p.min_stock || 50)).length;
    const out    = data.filter(p => p.current_stock === 0).length;
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

// ============================================================
// RENDER BẢNG
// ============================================================
function renderTable() {
    const query = (searchInput?.value || '').toLowerCase();
    const cat   = categoryFilter?.value || 'All Categories';
    const filtered = allProducts.filter(p => {
        const matchSearch = (p.name || '').toLowerCase().includes(query) || (p.sku || '').toLowerCase().includes(query);
        const matchCat    = cat === 'All Categories' || p.category === cat;
        return matchSearch && matchCat;
    });

    tableBody.innerHTML = '';
    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7"><div class="py-16 text-center">
            <div class="text-gray-400 mb-2 flex justify-center"><i data-lucide="search" class="w-12 h-12"></i></div>
            <p class="text-gray-600 font-medium">No products found</p>
            <p class="text-sm text-gray-500 mt-1">Try adjusting your search or filter</p>
        </div></td></tr>`;
    } else {
        filtered.forEach(p => {
            const stockHtml   = getStockHtml(p.current_stock, p.min_stock_level, p.max_stock_level);
            const statusClass = p.status === 'active' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-gray-100 text-gray-500';
            const statusText  = p.status === 'active' ? 'Active' : 'Discontinued';
            const tr = document.createElement('tr');
            tr.className = 'border-b border-[#E2E8F0] hover:bg-blue-50/50 transition-colors duration-150 h-14';
            tr.innerHTML = `
                <td class="px-4 py-4"><span class="font-mono text-sm font-medium text-gray-700">${p.sku}</span></td>
                <td class="px-4 py-4"><span class="font-medium text-gray-900">${p.name}</span></td>
                <td class="px-4 py-4"><span class="text-sm text-gray-600">${p.category}</span></td>
                <td class="px-4 py-4 text-right"><span class="font-semibold text-gray-900">${formatCurrency(p.selling_price)}</span></td>
                <td class="px-4 py-4 text-center">${stockHtml}</td>
                <td class="px-4 py-4 text-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${statusClass}">${statusText}</span>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="openEditModal(${p.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteProduct(${p.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
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

// ============================================================
// FE-01: ADD PRODUCT MODAL (Đã vá lỗi nạp API vào DB)
// ============================================================
window.openAddModal = function () {
    document.getElementById('addProductForm').reset();
    const errEl = document.getElementById('addProductError');
    if (errEl) errEl.classList.add('hidden');
    const modal = document.getElementById('addModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
};

window.closeAddModal = function () {
    const modal = document.getElementById('addModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

document.getElementById('addProductForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn   = document.getElementById('addSubmitBtn');
    const errEl = document.getElementById('addProductError');
    if (errEl) errEl.classList.add('hidden');

    const payload = {
        sku:           document.getElementById('addSku').value.trim(),
        name:          document.getElementById('addName').value.trim(),
        category:      document.getElementById('addCategory').value,
        description:   document.getElementById('addDescription').value.trim(),
        selling_price: parseFloat(document.getElementById('addSellingPrice').value) || 0,
        cost_price:    parseFloat(document.getElementById('addCostPrice').value)    || 0,
        current_stock: parseInt(document.getElementById('addStock').value)           || 0,
        min_stock:     parseInt(document.getElementById('addMinStock').value)        || 0,
        status:        document.getElementById('addStatus').value,
    };

    if (!payload.sku || !payload.name) {
        if (errEl) { errEl.textContent = 'SKU and Product Name are required.'; errEl.classList.remove('hidden'); }
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Adding...';
    try {
        // GỌI API ĐỂ LƯU SẢN PHẨM THẬT VÀO BACKEND DATABASE
        await API.products.create(payload);
        closeAddModal();
        await loadProducts();
        showToast('Product added successfully!', 'success');
    } catch (err) {
        if (errEl) { errEl.textContent = err.message || 'Failed to add product.'; errEl.classList.remove('hidden'); }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Product';
    }
});

// ============================================================
// FE-02: EDIT PRODUCT MODAL (Đã dọn sạch đống dữ liệu giả Mock)
// ============================================================
window.openEditModal = async function (id) {
    editingId = id;
    const errEl = document.getElementById('editProductError');
    if (errEl) errEl.classList.add('hidden');

    try {
        // Gọi thẳng vào API endpoint lấy dữ liệu trực tiếp từ DB
        const result = await API.products.getById(id);
        const product = result.data || result;
        
        if (!product) { showToast('Product not found.', 'error'); return; }

        const s = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val ?? ''; };
        s('editSku',          product.sku);
        s('editName',         product.name);
        s('editCategory',     product.category);
        s('editDescription',  product.description);
        s('editSellingPrice', product.selling_price);
        s('editCostPrice',    product.cost_price);
        s('editStock',        product.current_stock);
        s('editMinStock',     product.min_stock_level || product.min_stock);
        s('editStatus',       product.status);

        const modal = document.getElementById('editModalOverlay');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        lucide.createIcons();
    } catch (err) {
        showToast('Cannot load product: ' + err.message, 'error');
    }
};

window.closeEditModal = function () {
    const modal = document.getElementById('editModalOverlay');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    editingId = null;
};

document.getElementById('editProductForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!editingId) return;

    const btn   = document.getElementById('editSubmitBtn');
    const errEl = document.getElementById('editProductError');
    if (errEl) errEl.classList.add('hidden');

    const payload = {
        sku:           document.getElementById('editSku').value.trim(),
        name:          document.getElementById('editName').value.trim(),
        category:      document.getElementById('editCategory').value,
        description:   document.getElementById('editDescription').value.trim(),
        selling_price: parseFloat(document.getElementById('editSellingPrice').value) || 0,
        cost_price:    parseFloat(document.getElementById('editCostPrice').value)    || 0,
        current_stock: parseInt(document.getElementById('editStock').value)           || 0,
        min_stock:     parseInt(document.getElementById('editMinStock').value)        || 0,
        status:        document.getElementById('editStatus').value,
    };

    if (!payload.sku || !payload.name) {
        if (errEl) { errEl.textContent = 'SKU and Product Name are required.'; errEl.classList.remove('hidden'); }
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
        await API.products.update(editingId, payload);
        closeEditModal();
        await loadProducts();
        showToast('✅ Product updated successfully!', 'success');
    } catch (err) {
        if (errEl) { errEl.textContent = err.message || 'Failed to update.'; errEl.classList.remove('hidden'); }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
});

// ============================================================
// XÓA SẢN PHẨM (Kết nối API thật)
// ============================================================
window.deleteProduct = async function (id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        await API.products.delete(id);
        allProducts = allProducts.filter(p => p.id !== id);
        renderTable();
        showToast('✅ Product deleted.', 'success');
    } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
    }
};

if (searchInput)    searchInput.addEventListener('input', renderTable);
if (categoryFilter) categoryFilter.addEventListener('change', renderTable);

loadProducts();