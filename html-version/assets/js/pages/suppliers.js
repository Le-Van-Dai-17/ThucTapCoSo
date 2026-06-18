lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

let suppliers = [];
let editingSupplierId = null;
let deletingSupplierId = null;

const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');

// Modals
const supplierModalOverlay = document.getElementById('supplierModalOverlay');
const supplierModal = document.getElementById('supplierModal');
const deleteModalOverlay = document.getElementById('deleteModalOverlay');
const deleteModal = document.getElementById('deleteModal');

async function loadSuppliers() {
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-gray-500">Loading...</td></tr>`;
    try {
        const data = await API.suppliers.getAll();
        suppliers = (data || []).map(s => ({ ...s, id: s.supplier_id || s.id }));
    } catch (error) {
        console.error("Failed to load suppliers:", error);
        suppliers = [];
    }
    renderTable();
}

function renderTable() {
    tableBody.innerHTML = '';
    if (suppliers.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    suppliers.forEach((s, idx) => {
        const tr = document.createElement('tr');
        const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
        tr.className = `hover:bg-gray-50 transition-colors duration-150 ${bgClass}`;

        tr.innerHTML = `
            <td class="px-6 py-4">
                <button onclick="openSupplierDetailModal(${s.id})" class="font-medium text-[#2563EB] hover:underline cursor-pointer text-left focus:outline-none">
                    ${s.name}
                </button>
            </td>
            <td class="px-6 py-4 text-gray-700">${s.contact_person || '--'}</td>
            <td class="px-6 py-4 text-gray-600">${s.phone || '--'}</td>
            <td class="px-6 py-4 text-gray-600">${s.email || '--'}</td>
            <td class="px-6 py-4 text-sm"><div class="flex flex-wrap gap-1 max-w-xs">${(s.supplied_categories || []).map(c => `<span class="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs border border-blue-100">${c}</span>`).join('') || '--'}</div></td>
            <td class="px-6 py-4 text-sm">
                <button onclick="openSupplierDetailModal(${s.id})" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors border border-gray-200 font-medium whitespace-nowrap">
                    <i data-lucide="package" class="w-4 h-4 text-gray-500"></i>
                    ${(s.supplied_products || []).length} Products
                </button>
            </td>
            <td class="px-6 py-4 text-center text-gray-900 font-semibold">${s.lead_time_days || 0}</td>
            <td class="px-6 py-4">
                <div class="flex justify-center gap-2">
                    <button onclick="openEditModal(${s.id})" class="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all" title="Edit">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="openDeleteModal(${s.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
    lucide.createIcons();
}

// Supplier Modal Logic
window.openAddModal = function() {
    editingSupplierId = null;
    document.getElementById('modalTitle').textContent = 'Add Supplier';
    document.getElementById('supplierForm').reset();
    showModal(supplierModalOverlay, supplierModal);
};

window.openEditModal = function(id) {
    editingSupplierId = id;
    const s = suppliers.find(x => x.id === id);
    if (!s) return;

    document.getElementById('modalTitle').textContent = 'Edit Supplier';
    document.getElementById('supName').value = s.name || '';
    document.getElementById('supContact').value = s.contact_person || '';
    document.getElementById('supPhone').value = s.phone || '';
    document.getElementById('supEmail').value = s.email || '';
    document.getElementById('supAddress').value = s.address || '';
    document.getElementById('supLeadTime').value = s.lead_time_days || 0;

    showModal(supplierModalOverlay, supplierModal);
};

window.closeSupplierModal = function() {
    hideModal(supplierModalOverlay, supplierModal);
};

window.handleSupplierSubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('modalSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const payload = {
        name: document.getElementById('supName').value.trim(),
        contact_person: document.getElementById('supContact').value.trim(),
        phone: document.getElementById('supPhone').value.trim(),
        email: document.getElementById('supEmail').value.trim(),
        address: document.getElementById('supAddress').value.trim(),
        lead_time_days: parseInt(document.getElementById('supLeadTime').value) || 0
    };

    try {
        if (editingSupplierId) {
            await API.suppliers.update(editingSupplierId, payload);
        } else {
            await API.suppliers.create(payload);
        }
        closeSupplierModal();
        await loadSuppliers();
    } catch (err) {
        showToast("Error saving supplier: " + err.message, 'info');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Supplier';
    }
};

// Delete Modal Logic
window.openDeleteModal = function(id) {
    deletingSupplierId = id;
    const s = suppliers.find(x => x.id === id);
    if (!s) return;
    document.getElementById('deleteSupName').textContent = s.name;
    showModal(deleteModalOverlay, deleteModal);
};

window.closeDeleteModal = function() {
    hideModal(deleteModalOverlay, deleteModal);
    deletingSupplierId = null;
};

window.confirmDelete = async function() {
    if (!deletingSupplierId) return;
    try {
        await API.suppliers.delete(deletingSupplierId);
        closeDeleteModal();
        await loadSuppliers();
    } catch (err) {
        showToast("Cannot delete supplier: " + err.message, 'info');
    }
};

// Modal Animation Helpers
function showModal(overlay, modal) {
    overlay.classList.remove('hidden');
    overlay.classList.remove('overlay-leave', 'overlay-leave-active');
    overlay.classList.add('overlay-enter', 'overlay-enter-active');
    modal.classList.remove('modal-leave', 'modal-leave-active');
    modal.classList.add('modal-enter', 'modal-enter-active');
}

function hideModal(overlay, modal) {
    overlay.classList.remove('overlay-enter', 'overlay-enter-active');
    overlay.classList.add('overlay-leave', 'overlay-leave-active');
    modal.classList.remove('modal-enter', 'modal-enter-active');
    modal.classList.add('modal-leave', 'modal-leave-active');
    setTimeout(() => overlay.classList.add('hidden'), 200);
}

// Supplier Detail & Products Modal Logic
let currentSupplierProducts = [];
let allCategoriesForForm = [];

window.openSupplierDetailModal = async function(id) {
    const s = suppliers.find(x => x.id === id);
    if (!s) return;
    editingSupplierId = id; // reuse this variable to know which supplier we are viewing

    document.getElementById('supplierDetailName').textContent = s.name;
    document.getElementById('supplierDetailMeta').textContent = `Lead time: ${s.lead_time_days || 0} days`;

    document.getElementById('supplierDetailInfo').innerHTML = `
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <span class="text-xs text-gray-500 font-medium block">Contact</span>
            <span class="text-sm text-gray-900 font-medium">${s.contact_person || '--'}</span>
        </div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <span class="text-xs text-gray-500 font-medium block">Phone</span>
            <span class="text-sm text-gray-900 font-medium">${s.phone || '--'}</span>
        </div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <span class="text-xs text-gray-500 font-medium block">Email</span>
            <span class="text-sm text-gray-900 font-medium truncate" title="${s.email || ''}">${s.email || '--'}</span>
        </div>
        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <span class="text-xs text-gray-500 font-medium block">Address</span>
            <span class="text-sm text-gray-900 font-medium truncate" title="${s.address || ''}">${s.address || '--'}</span>
        </div>
    `;

    showModal(document.getElementById('supplierDetailOverlay'), document.getElementById('supplierDetailOverlay').firstElementChild);
    await loadSupplierProducts(id);

    // Fetch categories for product form if not already fetched
    if (allCategoriesForForm.length === 0) {
        try {
            const catRes = await API.categories.getAll();
            allCategoriesForForm = catRes.data || catRes;
            const sel = document.getElementById('supplierProductCategory');
            sel.innerHTML = '<option value="">Select category</option>';
            allCategoriesForForm.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.category_id || c.id;
                opt.textContent = c.name;
                sel.appendChild(opt);
            });
        } catch(e) { console.warn('Could not load categories', e); }
    }
};

window.closeSupplierDetailModal = function() {
    hideModal(document.getElementById('supplierDetailOverlay'), document.getElementById('supplierDetailOverlay').firstElementChild);
};

async function loadSupplierProducts(supplierId) {
    const tbody = document.getElementById('supplierDetailProductsBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">Loading products...</td></tr>';
    try {
        const res = await API.products.getAll();
        const allProducts = res.data || res;
        currentSupplierProducts = allProducts.filter(p => p.supplier_id == supplierId && p.status !== 'inactive');
        document.getElementById('supplierDetailProductCount').textContent = `${currentSupplierProducts.length} items`;
        
        tbody.innerHTML = '';
        if (currentSupplierProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No products found for this supplier.</td></tr>';
            return;
        }

        currentSupplierProducts.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-3 text-gray-600 font-medium">${p.sku}</td>
                <td class="px-4 py-3"><span class="font-medium text-gray-900">${p.name}</span></td>
                <td class="px-4 py-3 text-gray-600">${p.category || '--'}</td>
                <td class="px-4 py-3 text-right text-gray-900">$${(p.cost_price || 0).toLocaleString()}</td>
                <td class="px-4 py-3 text-right text-gray-900">$${(p.selling_price || 0).toLocaleString()}</td>
                <td class="px-4 py-3 text-center">
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">${p.current_stock || 0}</span>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center gap-2">
                        <button onclick="openSupplierProductForm('edit', ${p.product_id || p.id})" class="text-orange-500 hover:text-orange-700" title="Edit"><i data-lucide="edit" class="w-4 h-4"></i></button>
                        <button onclick="deleteSupplierProduct(${p.product_id || p.id})" class="text-red-500 hover:text-red-700" title="Delete"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">Failed to load products: ${err.message}</td></tr>`;
    }
}

// Supplier Product CRUD
let editingSupplierProductId = null;

window.openSupplierProductForm = function(mode, productId = null) {
    editingSupplierProductId = productId;
    const formOverlay = document.getElementById('supplierProductFormOverlay');
    const formModal = formOverlay.firstElementChild;
    const errEl = document.getElementById('supplierProductFormError');
    errEl.classList.add('hidden');

    if (mode === 'add') {
        document.getElementById('supplierProductFormTitle').textContent = 'Add Product';
        document.getElementById('supplierProductForm').reset();
    } else {
        document.getElementById('supplierProductFormTitle').textContent = 'Edit Product';
        const p = currentSupplierProducts.find(x => (x.product_id || x.id) === productId);
        if (p) {
            document.getElementById('supplierProductSku').value = p.sku || '';
            document.getElementById('supplierProductName').value = p.name || '';
            document.getElementById('supplierProductCategory').value = p.category_id || '';
            document.getElementById('supplierProductUnit').value = p.unit || 'pcs';
            document.getElementById('supplierProductCost').value = p.cost_price || 0;
            document.getElementById('supplierProductSelling').value = p.selling_price || 0;
            document.getElementById('supplierProductStock').value = p.current_stock || 0;
            document.getElementById('supplierProductMinStock').value = p.min_stock || p.min_stock_level || 0;
        }
    }

    // Attach submit listener
    const form = document.getElementById('supplierProductForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('supplierProductSubmitBtn');
        btn.disabled = true; btn.textContent = 'Saving...';
        
        const payload = {
            supplier_id: editingSupplierId,
            sku: document.getElementById('supplierProductSku').value.trim(),
            name: document.getElementById('supplierProductName').value.trim(),
            category_id: document.getElementById('supplierProductCategory').value || null,
            unit: document.getElementById('supplierProductUnit').value.trim() || 'pcs',
            cost_price: parseFloat(document.getElementById('supplierProductCost').value) || 0,
            selling_price: parseFloat(document.getElementById('supplierProductSelling').value) || 0,
            current_stock: parseInt(document.getElementById('supplierProductStock').value) || 0,
            min_stock: parseInt(document.getElementById('supplierProductMinStock').value) || 0,
            status: 'active'
        };

        try {
            if (editingSupplierProductId) {
                await API.products.update(editingSupplierProductId, payload);
            } else {
                await API.products.create(payload);
            }
            closeSupplierProductForm();
            await loadSupplierProducts(editingSupplierId);
            await loadSuppliers(); // refresh supplier list counts
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        } finally {
            btn.disabled = false; btn.textContent = 'Save Product';
        }
    };

    showModal(formOverlay, formModal);
};

window.closeSupplierProductForm = function() {
    hideModal(document.getElementById('supplierProductFormOverlay'), document.getElementById('supplierProductFormOverlay').firstElementChild);
};

window.deleteSupplierProduct = async function(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        await API.products.delete(productId);
        await loadSupplierProducts(editingSupplierId);
        await loadSuppliers(); // refresh supplier list counts
    } catch(err) {
        showToast('Error deleting product: ' + err.message, 'error');
    }
};

// Init
loadSuppliers();
