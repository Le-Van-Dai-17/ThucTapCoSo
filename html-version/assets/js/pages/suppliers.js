lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

let suppliers = [];
let allProducts = [];
let allCategories = [];
let editingSupplierId = null;
let deletingSupplierId = null;
let selectedSupplierIndex = null;
let editingSupplierProductId = null;

const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');

// Modals
const supplierModalOverlay = document.getElementById('supplierModalOverlay');
const supplierModal = document.getElementById('supplierModal');
const deleteModalOverlay = document.getElementById('deleteModalOverlay');
const deleteModal = document.getElementById('deleteModal');

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
}

function getSupplierId(supplier) {
    return supplier ? (supplier.supplier_id || supplier.id) : null;
}

function getSupplierContact(supplier) {
    return supplier?.contact_name || supplier?.contact_person || '';
}

function getSupplierProducts(supplier) {
    const supplierId = getSupplierId(supplier);
    return allProducts.filter(p => String(p.supplier_id) === String(supplierId) && p.status !== 'inactive' && !Number(p.is_discontinued));
}

function renderProductPreview(supplier, supplierIndex) {
    const list = getSupplierProducts(supplier);
    if (list.length === 0) return '--';

    const preview = list.slice(0, 2).map(p => escapeHtml(p.name)).join(', ');
    const moreText = list.length > 2 ? ` +${list.length - 2} more` : '';

    return `
        <button type="button" onclick="event.stopPropagation(); openSupplierProductsModal(${supplierIndex})"
            class="group w-full max-w-[240px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-left shadow-sm hover:border-[#2563EB]/40 hover:bg-blue-50/40 hover:shadow transition-all">
            <div class="flex items-center justify-between gap-3">
                <span class="font-semibold text-gray-800">${list.length} product${list.length > 1 ? 's' : ''}</span>
                <span class="inline-flex items-center gap-1 text-[11px] font-medium text-[#2563EB]">
                    View
                    <i data-lucide="chevron-right" class="w-3 h-3 transition-transform group-hover:translate-x-0.5"></i>
                </span>
            </div>
            <div class="mt-1 text-xs text-gray-500 truncate" title="${preview}${moreText}">
                ${preview}${moreText}
            </div>
        </button>
    `;
}

async function refreshCategories(selectCategoryId = null) {
    const categories = await API.categories.getAll();
    allCategories = categories.data || categories || [];
    populateSupplierProductCategories(selectCategoryId);
}

function populateSupplierProductCategories(selectedId = null) {
    const select = document.getElementById('supplierProductCategory');
    if (!select) return;
    select.innerHTML = `
        <option value="">Select category</option>
        ${allCategories.map(c => `<option value="${c.category_id}">${escapeHtml(c.name)}</option>`).join('')}
    `;
    if (selectedId) select.value = String(selectedId);
}

async function loadSuppliers() {
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="8" class="py-10 text-center text-gray-500">Loading...</td></tr>`;
    try {
        const [supplierResult, productResult, categoryResult] = await Promise.allSettled([
            API.suppliers.getAll(),
            API.products.getAll(),
            API.categories.getAll()
        ]);

        if (supplierResult.status === 'rejected') throw supplierResult.reason;

        const data = supplierResult.value;
        suppliers = (data || []).map(s => ({ ...s, id: s.supplier_id || s.id }));
        allProducts = productResult.status === 'fulfilled'
            ? (productResult.value.data || productResult.value || [])
            : [];
        allCategories = categoryResult.status === 'fulfilled'
            ? (categoryResult.value.data || categoryResult.value || [])
            : [];

        if (productResult.status === 'rejected') console.warn('Failed to load products:', productResult.reason);
        if (categoryResult.status === 'rejected') console.warn('Failed to load categories:', categoryResult.reason);
    } catch (error) {
        console.error("Failed to load suppliers:", error);
        suppliers = [];
        allProducts = [];
        allCategories = [];
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
        tr.className = `hover:bg-blue-50/50 transition-colors duration-150 cursor-pointer ${bgClass}`;
        tr.onclick = () => openSupplierDetailModal(idx);

        tr.innerHTML = `
            <td class="px-6 py-4"><span class="font-medium text-gray-900">${escapeHtml(s.name)}</span></td>
            <td class="px-6 py-4 text-gray-700">${escapeHtml(getSupplierContact(s) || '--')}</td>
            <td class="px-6 py-4 text-gray-600">${escapeHtml(s.phone || '--')}</td>
            <td class="px-6 py-4 text-gray-600">${escapeHtml(s.email || '--')}</td>
            <td class="px-6 py-4 text-sm"><div class="flex flex-wrap gap-1 max-w-xs">${(s.supplied_categories || []).map(c => `<span class="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs border border-blue-100">${escapeHtml(c)}</span>`).join('') || '--'}</div></td>
            <td class="px-6 py-4 text-sm">${renderProductPreview(s, idx)}</td>
            <td class="px-6 py-4 text-center text-gray-900 font-semibold">${s.lead_time_days || 0}</td>
            <td class="px-6 py-4">
                <div class="flex justify-center gap-2">
                    <button onclick="event.stopPropagation(); openEditModal(${s.id})" class="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all" title="Edit">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="event.stopPropagation(); openDeleteModal(${s.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
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
    document.getElementById('supContact').value = getSupplierContact(s);
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
        contact_name: document.getElementById('supContact').value.trim(),
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

window.openSupplierProductsModal = function(index) {
    openSupplierDetailModal(index);
};

window.openSupplierDetailModal = function(index) {
    selectedSupplierIndex = index;
    const supplier = suppliers[index];
    if (!supplier) return;

    const products = getSupplierProducts(supplier);
    const overlay = document.getElementById('supplierDetailOverlay');
    if (!overlay) return;

    document.getElementById('supplierDetailName').textContent = supplier.name || 'Supplier';
    document.getElementById('supplierDetailMeta').textContent = `${products.length} supplied product${products.length > 1 ? 's' : ''}`;
    document.getElementById('supplierDetailInfo').innerHTML = `
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div class="text-xs font-semibold uppercase text-gray-500 mb-1">Contact</div>
            <div class="font-medium text-gray-900">${escapeHtml(getSupplierContact(supplier) || '--')}</div>
        </div>
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div class="text-xs font-semibold uppercase text-gray-500 mb-1">Phone</div>
            <div class="font-medium text-gray-900">${escapeHtml(supplier.phone || '--')}</div>
        </div>
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div class="text-xs font-semibold uppercase text-gray-500 mb-1">Email</div>
            <div class="font-medium text-gray-900 truncate" title="${escapeHtml(supplier.email || '')}">${escapeHtml(supplier.email || '--')}</div>
        </div>
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div class="text-xs font-semibold uppercase text-gray-500 mb-1">Lead Time</div>
            <div class="font-medium text-gray-900">${supplier.lead_time_days || 0} days</div>
        </div>
    `;
    renderSupplierDetailProducts();

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    overlay.style.display = 'flex';
    lucide.createIcons();
};

function renderSupplierDetailProducts() {
    const supplier = suppliers[selectedSupplierIndex];
    const products = supplier ? getSupplierProducts(supplier) : [];
    const body = document.getElementById('supplierDetailProductsBody');
    if (!body) return;

    document.getElementById('supplierDetailProductCount').textContent = `${products.length} product${products.length > 1 ? 's' : ''} linked to this supplier`;
    if (products.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="7" class="py-10 text-center text-gray-500">
                    No products linked to this supplier yet.
                </td>
            </tr>`;
        return;
    }

    body.innerHTML = products.map(product => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 font-mono text-gray-700">${escapeHtml(product.sku || '--')}</td>
            <td class="px-4 py-3 font-medium text-gray-900">${escapeHtml(product.name || '--')}</td>
            <td class="px-4 py-3 text-gray-600">${escapeHtml(product.category || 'General')}</td>
            <td class="px-4 py-3 text-right font-semibold text-gray-900">${formatCurrency(product.cost_price)}</td>
            <td class="px-4 py-3 text-right text-gray-700">${formatCurrency(product.selling_price)}</td>
            <td class="px-4 py-3 text-center text-gray-700">${product.current_stock || 0}</td>
            <td class="px-4 py-3">
                <div class="flex justify-center gap-2">
                    <button onclick="openSupplierProductForm('edit', ${product.id || product.product_id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit Product">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteSupplierProduct(${product.id || product.product_id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete Product">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

window.closeSupplierProductsModal = function() {
    const overlay = document.getElementById('supplierProductsOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        overlay.style.display = 'none';
    }
};

window.closeSupplierDetailModal = function() {
    const overlay = document.getElementById('supplierDetailOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        overlay.style.display = 'none';
    }
    selectedSupplierIndex = null;
};

function getProductFormPayload() {
    const supplier = suppliers[selectedSupplierIndex];
    return {
        sku: document.getElementById('supplierProductSku').value.trim(),
        name: document.getElementById('supplierProductName').value.trim(),
        category_id: document.getElementById('supplierProductCategory').value,
        supplier_id: getSupplierId(supplier),
        unit: document.getElementById('supplierProductUnit').value.trim() || 'pcs',
        cost_price: parseFloat(document.getElementById('supplierProductCost').value) || 0,
        selling_price: parseFloat(document.getElementById('supplierProductSelling').value) || 0,
        current_stock: parseInt(document.getElementById('supplierProductStock').value) || 0,
        min_stock: parseInt(document.getElementById('supplierProductMinStock').value) || 0,
        status: 'active'
    };
}

window.openSupplierProductForm = function(mode, productId = null) {
    const supplier = suppliers[selectedSupplierIndex];
    if (!supplier) return;

    editingSupplierProductId = mode === 'edit' ? productId : null;
    const form = document.getElementById('supplierProductForm');
    const error = document.getElementById('supplierProductFormError');
    form.reset();
    if (error) error.classList.add('hidden');

    document.getElementById('supplierProductFormTitle').textContent = mode === 'edit' ? 'Edit Product' : 'Add Product';
    document.getElementById('supplierProductSubmitBtn').textContent = mode === 'edit' ? 'Save Changes' : 'Add Product';
    populateSupplierProductCategories();

    if (mode === 'edit') {
        const product = allProducts.find(p => String(p.id || p.product_id) === String(productId));
        if (!product) return;
        document.getElementById('supplierProductSku').value = product.sku || '';
        document.getElementById('supplierProductName').value = product.name || '';
        document.getElementById('supplierProductCategory').value = product.category_id || '';
        document.getElementById('supplierProductUnit').value = product.unit || 'pcs';
        document.getElementById('supplierProductCost').value = product.cost_price || 0;
        document.getElementById('supplierProductSelling').value = product.selling_price || 0;
        document.getElementById('supplierProductStock').value = product.current_stock || 0;
        document.getElementById('supplierProductMinStock').value = product.min_stock_level || product.min_stock || 0;
    } else {
        document.getElementById('supplierProductUnit').value = 'pcs';
        document.getElementById('supplierProductCost').value = 0;
        document.getElementById('supplierProductSelling').value = 0;
        document.getElementById('supplierProductStock').value = 0;
        document.getElementById('supplierProductMinStock').value = 0;
    }

    const overlay = document.getElementById('supplierProductFormOverlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    lucide.createIcons();
};

window.closeSupplierProductForm = function() {
    const overlay = document.getElementById('supplierProductFormOverlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
    editingSupplierProductId = null;
};

document.getElementById('supplierProductForm')?.addEventListener('submit', async function(event) {
    event.preventDefault();
    const btn = document.getElementById('supplierProductSubmitBtn');
    const error = document.getElementById('supplierProductFormError');
    if (error) error.classList.add('hidden');

    const payload = getProductFormPayload();
    if (!payload.sku || !payload.name || !payload.category_id) {
        if (error) {
            error.textContent = 'SKU, Product Name, and Category are required.';
            error.classList.remove('hidden');
        }
        return;
    }

    btn.disabled = true;
    btn.textContent = editingSupplierProductId ? 'Saving...' : 'Adding...';
    try {
        if (editingSupplierProductId) {
            await API.products.update(editingSupplierProductId, payload);
            showToast('Product updated successfully!', 'success');
        } else {
            await API.products.create(payload);
            showToast('Product added successfully!', 'success');
        }
        closeSupplierProductForm();
        await loadSuppliers();
        if (selectedSupplierIndex !== null) openSupplierDetailModal(selectedSupplierIndex);
    } catch (err) {
        if (error) {
            error.textContent = err.message || 'Cannot save product.';
            error.classList.remove('hidden');
        }
    } finally {
        btn.disabled = false;
        btn.textContent = editingSupplierProductId ? 'Save Changes' : 'Add Product';
    }
});

window.deleteSupplierProduct = async function(productId) {
    const product = allProducts.find(p => String(p.id || p.product_id) === String(productId));
    if (!product) return;
    if (!confirm(`Delete product "${product.name}" from this supplier?`)) return;

    try {
        await API.products.delete(productId);
        showToast('Product deleted successfully.', 'success');
        await loadSuppliers();
        if (selectedSupplierIndex !== null) openSupplierDetailModal(selectedSupplierIndex);
    } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
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

// Init
loadSuppliers();
