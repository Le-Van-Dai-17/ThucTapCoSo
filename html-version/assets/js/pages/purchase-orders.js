lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

let allOrders  = [];
let currentPOIdToReceive = null;
let currentPOIdToDelete = null;
let editingOrderId = null;

const statusConfig = {
    draft:     { label: "Draft",     color: "bg-gray-100 text-gray-700" },
    pending:   { label: "Pending",   color: "bg-orange-100 text-orange-700" },
    approved:  { label: "Approved",  color: "bg-blue-100 text-blue-700" },
    shipped:   { label: "Shipped",   color: "bg-yellow-100 text-yellow-700" },
    received:  { label: "Received",  color: "bg-[#10B981]/10 text-[#10B981]" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

const statusFilter        = document.getElementById('statusFilter');
const tableBody           = document.getElementById('tableBody');
const emptyState          = document.getElementById('emptyState');
const statsCardsContainer = document.getElementById('statsCardsContainer');

// ============================================================
// LOAD DATA
// ============================================================
async function loadOrders() {
    const isStaff = typeof displayRole !== 'undefined' && displayRole === 'Staff';
    if (isStaff) {
        const btnCreate = document.getElementById('btnCreateNewPO');
        if (btnCreate) btnCreate.style.display = 'none';
    }

    if (tableBody) showLoading('tableBody');
    try {
        const result = await API.orders.getAll();
        allOrders    = (result.data || result).map(o => ({
            ...o,
            status: String(o.status_key || o.status || '').toLowerCase(),
            total_amount: parseFloat(o.total_amount || 0)
        }));
        
        if (isStaff) {
            allOrders = allOrders.filter(o => o.status === 'approved' || o.status === 'shipped');
        }
    } catch (err) {
        console.warn('Backend error:', err.message);
        allOrders = [];
        showToast('Cannot load orders from server.', 'error');
    }
    renderStats();
    renderTable();
}

function renderStats() {
    const total     = allOrders.length;
    const pending   = allOrders.filter(o => o.status === 'pending' || o.status === 'draft').length;
    const received  = allOrders.filter(o => o.status === 'received' || o.status === 'completed').length;
    const totalVal  = allOrders.reduce((s, o) => s + o.total_amount, 0);

    if (!statsCardsContainer) return;
    statsCardsContainer.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="text-sm text-gray-500 mb-1">Total Orders</div>
            <div class="text-2xl font-semibold text-gray-900">${total}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="text-sm text-gray-500 mb-1">Pending & Draft</div>
            <div class="text-2xl font-semibold text-orange-600">${pending}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="text-sm text-gray-500 mb-1">Received</div>
            <div class="text-2xl font-semibold text-[#10B981]">${received}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="text-sm text-gray-500 mb-1">Total Value</div>
            <div class="text-2xl font-semibold text-gray-900">${formatCurrency(totalVal)}</div>
        </div>`;
}

function renderTable() {
    const filter   = statusFilter?.value || 'all';
    const filtered = filter === 'all' ? allOrders : allOrders.filter(o => o.status === filter);

    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (filtered.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    filtered.forEach((order, i) => {
        const bgClass   = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
        const cfg       = statusConfig[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' };
        const isStaff = typeof displayRole !== 'undefined' && displayRole === 'Staff';
        const canEdit = !isStaff && !['approved', 'shipped', 'received', 'completed', 'cancelled'].includes(order.status);
        const canApprove = !isStaff && order.status === 'pending';
        const canShip = !isStaff && order.status === 'approved';
        const canReceive = order.status === 'approved' || order.status === 'shipped';
        const createdAt = order.created_at || order.order_date;

        const tr = document.createElement('tr');
        tr.className = `hover:bg-gray-50 transition-colors duration-150 ${bgClass}`;
        tr.innerHTML = `
            <td class="px-6 py-4"><span class="font-medium text-gray-900">${order.order_number}</span></td>
            <td class="px-6 py-4"><span class="text-gray-700">${order.supplier_name || '--'}</span></td>
            <td class="px-6 py-4"><span class="text-gray-600">${formatDate(createdAt)}</span></td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${cfg.color}">${cfg.label}</span>
            </td>
            <td class="px-6 py-4 text-right"><span class="font-semibold text-gray-900">${formatCurrency(order.total_amount)}</span></td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="viewDetail(${order.id})" class="p-2 text-gray-600 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-all" title="View Details">
                        <i data-lucide="file-text" class="w-4 h-4"></i>
                    </button>
                    ${canApprove ? `
                    <button onclick="openActionModal(${order.id}, 'approve')" class="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all" title="Approve Plan">
                        <i data-lucide="check-circle" class="w-4 h-4"></i>
                    </button>
                    ` : ''}
                    ${canEdit ? `
                    <button onclick="editOrder(${order.id})" class="p-2 text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all" title="Edit Order">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="openActionModal(${order.id}, 'delete')" class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete Order">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                    ` : ''}
                    ${canReceive ? `
                    <button onclick="openConfirmReceive(${order.id})" class="p-2 text-[#10B981] hover:bg-green-50 rounded-lg transition-all" title="Confirm Receive">
                        <i data-lucide="package-check" class="w-4 h-4"></i>
                    </button>
                    ` : ''}
                    ${canShip ? `
                    <button onclick="openActionModal(${order.id}, 'ship')" class="p-2 text-yellow-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all" title="Mark as Shipped">
                        <i data-lucide="truck" class="w-4 h-4"></i>
                    </button>
                    ` : ''}
                </div>
            </td>`;
        tableBody.appendChild(tr);
    });
    lucide.createIcons();
}

// ============================================================
// MODALS LOGIC
// ============================================================
function showModal(overlayId, modalId) {
    const overlay = document.getElementById(overlayId);
    const modal = document.getElementById(modalId);
    if (!overlay || !modal) return;
    overlay.classList.remove('hidden');
    overlay.classList.remove('overlay-leave', 'overlay-leave-active');
    overlay.classList.add('overlay-enter', 'overlay-enter-active');
    modal.classList.remove('modal-leave', 'modal-leave-active');
    modal.classList.add('modal-enter', 'modal-enter-active');
}
function hideModal(overlayId, modalId) {
    const overlay = document.getElementById(overlayId);
    const modal = document.getElementById(modalId);
    if (!overlay || !modal) return;
    overlay.classList.remove('overlay-enter', 'overlay-enter-active');
    overlay.classList.add('overlay-leave', 'overlay-leave-active');
    modal.classList.remove('modal-enter', 'modal-enter-active');
    modal.classList.add('modal-leave', 'modal-leave-active');
    setTimeout(() => overlay.classList.add('hidden'), 200);
}
// BE-04: HÀM PHÊ DUYỆT ĐƠN HÀNG DÀNH CHO MANAGER




// BE-03: HIỂN THỊ DANH SÁCH Ô NHẬP ĐỂ STAFF ĐẾM KHO THỰC TẾ
window.openConfirmReceive = async function(id) {
    currentPOIdToReceive = id;
    const container = document.getElementById('receiveItemsContainer');
    if (container) container.innerHTML = '<p class="text-sm text-gray-400 py-2">Loading items for inventory count...</p>';
    
    showModal('confirmReceiveOverlay', 'confirmReceiveModal');
    
    try {
        const res = await API.orders.getDetail(id);
        const details = res.data || [];
        window.receiveItemsData = details.map(d => ({
            product_id: d.product_id,
            product_name: d.product_name,
            ordered_quantity: d.quantity || d.ordered_quantity || 0
        }));
        
        if (container) {
            if (window.receiveItemsData.length === 0) {
                container.innerHTML = '<p class="text-sm text-gray-500">No products found in this order.</p>';
            } else {
                container.innerHTML = window.receiveItemsData.map((item, idx) => `
                    <div class="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200 mb-2">
                        <div class="text-xs font-semibold text-gray-800 truncate max-w-[200px]" title="${item.product_name}">${item.product_name}</div>
                        <div class="flex items-center gap-2">
                            <span class="text-[11px] text-gray-400 font-mono">Ordered: ${item.ordered_quantity}</span>
                            <input type="number" id="actualQtyInput_${idx}" min="0" value="${item.ordered_quantity}" 
                                class="w-16 px-2 py-1 text-xs border-2 border-gray-200 rounded-lg text-right font-bold focus:outline-none focus:border-[#10B981]" />
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        if (container) container.innerHTML = '<p class="text-sm text-red-500">Failed to load items for verification.</p>';
    }
};
window.closeConfirmReceive = function() {
    hideModal('confirmReceiveOverlay', 'confirmReceiveModal');
    currentPOIdToReceive = null;
    window.receiveItemsData = null;
};

document.getElementById('btnProceedReceive')?.addEventListener('click', async () => {
    if (!currentPOIdToReceive || !window.receiveItemsData) return;
    const btn = document.getElementById('btnProceedReceive');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    try {
        const payloadItems = window.receiveItemsData.map((item, idx) => {
            const inputEl = document.getElementById(`actualQtyInput_${idx}`);
            const val = inputEl ? parseInt(inputEl.value) : item.ordered_quantity;
            return {
                product_id: item.product_id,
                received_quantity: isNaN(val) || val < 0 ? 0 : val
            };
        });

        await API.orders.receive(currentPOIdToReceive, { items: payloadItems });
        showToast('✅ Inventory successfully updated with actual count!', 'success');
        closeConfirmReceive();
        await loadOrders();


    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm Receipt';
    }
});

// DELETE MODAL




// VIEW INVOICE DETAIL
window.viewDetail = async function (id) {
    const order = allOrders.find(o => o.id === id);
    if (!order) return;

    document.getElementById('detailOrderNumber').textContent = order.order_number;
    const content = document.getElementById('detailContent');
    content.innerHTML = '<div class="py-10 text-center text-gray-400">Loading details...</div>';
    
    document.getElementById('detailModal').classList.remove('hidden');
    document.getElementById('detailModal').classList.add('flex');

    try {
        const result = await API.orders.getDetail(id);
        const details = result.data || [];
        
        const cfg = statusConfig[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' };

        let rows = details.map((d, i) => `
            <tr class="border-b border-gray-100">
                <td class="py-4 text-center text-gray-500">${i+1}</td>
                <td class="py-4 text-gray-900 font-medium">${d.product_name || 'N/A'}</td>
                <td class="py-4 text-center text-gray-700 font-semibold">${d.quantity || d.ordered_quantity}</td>
                <td class="py-4 text-center text-[#10B981] font-semibold">${d.received_quantity || 0}</td>
                <td class="py-4 text-right text-gray-700">${formatCurrency(d.unit_price || d.unit_cost)}</td>
                <td class="py-4 text-right font-bold text-gray-900">${formatCurrency(d.total_amount || d.line_total)}</td>
            </tr>`).join('');

        content.innerHTML = `
            <div class="grid grid-cols-2 gap-8 mb-8">
                <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Supplier</div>
                    <div class="text-lg font-semibold text-gray-900 mb-4">${order.supplier_name || 'Unknown'}</div>
                    <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Order Date</div>
                    <div class="text-sm font-medium text-gray-900">${formatDate(order.created_at || order.order_date)}</div>
                </div>
                <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-end justify-center">
                    <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Order Status</div>
                    <span class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold ${cfg.color}">${cfg.label}</span>
                </div>
            </div>
            
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b-2 border-gray-200 bg-white">
                        <th class="py-3 text-center text-gray-500 font-semibold w-12">#</th>
                        <th class="py-3 text-left text-gray-500 font-semibold">Product Description</th>
                        <th class="py-3 text-center text-gray-500 font-semibold w-32">Ordered Quantity</th>
                        <th class="py-3 text-center text-gray-500 font-semibold w-32">Received Quantity</th>
                        <th class="py-3 text-right text-gray-500 font-semibold w-32">Unit Price</th>
                        <th class="py-3 text-right text-gray-500 font-semibold w-32">Total</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="5" class="py-6 text-right font-semibold text-gray-500 uppercase tracking-wider text-xs">Total Amount:</td>
                        <td class="py-6 text-right font-bold text-2xl text-[#2563EB]">${formatCurrency(order.total_amount)}</td>
                    </tr>
                </tfoot>
            </table>`;
    } catch (err) {
        content.innerHTML = `<div class="py-10 text-center text-red-500">Failed to load invoice details: ${err.message}</div>`;
    }
    lucide.createIcons();
};

window.closeDetailModal = function () {
    document.getElementById('detailModal').classList.add('hidden');
    document.getElementById('detailModal').classList.remove('flex');
};

// ============================================================
// CREATE & EDIT ORDER MODAL
// ============================================================
window.openCreatePOModal = async function () {
    editingOrderId = null;
    document.getElementById('poModalTitle').textContent = 'New Purchase Order';
    document.getElementById('createPOBtn').textContent = 'Create Order';
    
    const poInput = document.getElementById('poOrderNumber');
    if (poInput) {
        poInput.readOnly = false;
        poInput.className = "w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#2563EB] transition-all";
    }

    resetCreateForm();
    showCreateModal();
};

window.editOrder = async function(id) {
    editingOrderId = id;
    document.getElementById('poModalTitle').textContent = 'Edit Purchase Order';
    document.getElementById('createPOBtn').textContent = 'Update Order';
    resetCreateForm();
    
    const order = allOrders.find(o => o.id === id);
    if(order) {
        const poInput = document.getElementById('poOrderNumber');
        if (poInput) {
            poInput.value = order.order_number;
            poInput.readOnly = true;
            poInput.className = "w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 focus:outline-none cursor-not-allowed transition-all";
        }
        document.getElementById('poSupplier').value = order.supplier_name;
        document.getElementById('poStatus').value = order.status;
    }

    try {
        const res = await API.orders.getDetail(id);
        const details = res.data || [];
        window.currentOrderItems = details.map(d => ({
            product_id: d.product_id,
            product_name: d.product_name,
            quantity: d.quantity || d.ordered_quantity,
            received_quantity: d.received_quantity || 0,
            unit_price: parseFloat(d.unit_price || d.unit_cost || 0)
        }));
        renderSelectedItemsUI();
    } catch(e) {
        showToast('Error loading details for edit', 'error');
    }
    showCreateModal();
}

async function showCreateModal() {
    const datalist = document.getElementById('productsDatalist');
    if (datalist && (!window.dbProductsList || window.dbProductsList.length === 0)) {
        try {
            const result = await API.products.getAll();
            window.dbProductsList = result.data || result;
            datalist.innerHTML = '';
            window.dbProductsList.forEach(p => {
                const option = document.createElement('option');
                option.value = p.name;
                datalist.appendChild(option);
            });
        } catch (error) {}
    }
    const supplierDatalist = document.getElementById('suppliersDatalist');
    if (supplierDatalist && (!window.dbSuppliersList || window.dbSuppliersList.length === 0)) {
        try {
            const result = await API.suppliers.getAll();
            window.dbSuppliersList = result.data || result || [];
            supplierDatalist.innerHTML = '';
            window.dbSuppliersList.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.name;
                supplierDatalist.appendChild(opt);
            });
        } catch (e) {}
    }
    const modal = document.getElementById('createPOModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function resetCreateForm() {
    document.getElementById('createPOForm').reset();
    const errEl = document.getElementById('createPOError');
    if (errEl) errEl.classList.add('hidden');
    window.currentOrderItems = [];
    document.getElementById('poItemsListUI').innerHTML = '<li class="py-2 text-gray-400 italic">No products selected yet.</li>';
    document.getElementById('poTotalAmount').value = "0.00";
    document.getElementById('productStockHint').textContent = '';
}

window.closeCreatePOModal = function () {
    const modal = document.getElementById('createPOModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};


document.getElementById('poSupplier')?.addEventListener('input', function(e) {
    const val = e.target.value.trim().toLowerCase();
    const datalist = document.getElementById('productsDatalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    
    if (window.dbSuppliersList && window.dbProductsList) {
        const supplier = window.dbSuppliersList.find(s => s.name.toLowerCase() === val);
        if (supplier) {
            window.currentSupplierId = supplier.id || supplier.supplier_id;
            const filteredProducts = window.dbProductsList.filter(p => p.supplier_id == window.currentSupplierId);
            filteredProducts.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.name;
                datalist.appendChild(opt);
            });
        } else {
            window.currentSupplierId = null;
        }
    }
});

function updatePricePreview() {
    const qty = parseInt(document.getElementById('poItemQty').value) || 0;
    const price = parseFloat(document.getElementById('poItemUnitPrice').value) || 0;
    const preview = document.getElementById('poItemPricePreview');
    if (preview) {
        if (qty > 0 && price >= 0) {
            preview.textContent = `Quantity: ${qty} x ${price.toFixed(2)} = ${(qty * price).toFixed(2)}`;
        } else {
            preview.textContent = '';
        }
    }
}

document.getElementById('poItemQty')?.addEventListener('input', updatePricePreview);
document.getElementById('poItemUnitPrice')?.addEventListener('input', updatePricePreview);

document.getElementById('poItemProductName')?.addEventListener('input', function(e) {
    const val = e.target.value.trim().toLowerCase();
    const hintEl = document.getElementById('productStockHint');
    const priceEl = document.getElementById('poItemUnitPrice');
    
    if(!val) { 
        if (hintEl) hintEl.textContent = ''; 
        if (priceEl) priceEl.value = '';
        updatePricePreview();
        
        // Reset supplier datalist if product is cleared
        const supplierDatalist = document.getElementById('suppliersDatalist');
        if (supplierDatalist && window.dbSuppliersList) {
            supplierDatalist.innerHTML = '';
            window.dbSuppliersList.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.name;
                supplierDatalist.appendChild(opt);
            });
        }
        return; 
    }
    
    if(window.dbProductsList && window.dbSuppliersList) {
        let prodList = window.dbProductsList;
        if (window.currentSupplierId) {
             prodList = prodList.filter(p => p.supplier_id == window.currentSupplierId);
        }
        const prod = prodList.find(p => p.name.toLowerCase() === val);
        
        if(prod) {
            if (hintEl) hintEl.textContent = `In Stock: ${prod.current_stock || 0}`;
            if (priceEl) priceEl.value = prod.cost_price || prod.selling_price || 0;
        } else {
            if (hintEl) hintEl.textContent = 'New Product';
            if (priceEl && !priceEl.value) priceEl.value = ''; // Let user type
        }
        updatePricePreview();
        
        // DUAL FILTERING: Filter suppliers datalist based on product
        const supplierDatalist = document.getElementById('suppliersDatalist');
        if (supplierDatalist && !window.currentSupplierId) {
            const matchingProducts = window.dbProductsList.filter(p => p.name.toLowerCase() === val);
            const matchingSupplierIds = [...new Set(matchingProducts.map(p => p.supplier_id))];
            
            supplierDatalist.innerHTML = '';
            const matchingSuppliers = window.dbSuppliersList.filter(s => matchingSupplierIds.includes(s.id || s.supplier_id));
            matchingSuppliers.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.name;
                supplierDatalist.appendChild(opt);
            });
            
            // Auto-fill supplier if exactly 1
            if (matchingSuppliers.length === 1) {
                const supplierInput = document.getElementById('poSupplier');
                if (supplierInput && !supplierInput.value) {
                    supplierInput.value = matchingSuppliers[0].name;
                    supplierInput.dispatchEvent(new Event('input'));
                }
            }
        }
    }
});


document.getElementById('createPOForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn   = document.getElementById('createPOBtn');
    const errEl = document.getElementById('createPOError');
    if (errEl) errEl.classList.add('hidden');

    const payload = {
        supplier_name: document.getElementById('poSupplier').value.trim(),
        total_amount:  parseFloat(document.getElementById('poTotalAmount').value) || 0,
        status:        document.getElementById('poStatus').value,
        items: window.currentOrderItems || []
    };

    if (!payload.supplier_name || payload.items.length === 0) {
        if (errEl) { errEl.textContent = 'Supplier and at least 1 item required.'; errEl.classList.remove('hidden'); }
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
        if(editingOrderId) {
            await API.orders.update(editingOrderId, payload);
            showToast('🔄 Purchase order updated!', 'success');
        } else {
            await API.orders.create(payload);
            showToast('✅ Purchase order created!', 'success');
        }
        closeCreatePOModal();
        // Remove openAdd from URL if exists
        const url = new URL(window.location);
        if (url.searchParams.has('openAdd')) {
            url.searchParams.delete('openAdd');
            window.history.replaceState({}, '', url);
        }
        await loadOrders();
    } catch (error) {
        if (errEl) { errEl.textContent = error.message; errEl.classList.remove('hidden'); }
        else showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = editingOrderId ? 'Update Order' : 'Create Order';
    }
});

// ITEM MANAGEMENT INSIDE MODAL
window.currentOrderItems = [];
document.getElementById('addPOItemBtn')?.addEventListener('click', function() {
    const nameInput = document.getElementById('poItemProductName');
    const qtyInput = document.getElementById('poItemQty');
    
    const productName = nameInput.value.trim();
    const quantity = parseInt(qtyInput.value) || 0;
    
    if (!productName || quantity <= 0) {
        showToast('Invalid product name or quantity!', 'info');
        return;
    }

    const existingProd = window.dbProductsList ? window.dbProductsList.find(p => p.name.toLowerCase() === productName.toLowerCase()) : null;
    let itemData = {
        product_name: productName,
        quantity: quantity,
        received_quantity: 0,
        unit_price: existingProd ? parseFloat(existingProd.selling_price || 0) : 10.00
    };
    if (existingProd) itemData.product_id = existingProd.id || existingProd.product_id;
    else itemData.is_new_product = true;

    window.currentOrderItems.push(itemData);
    renderSelectedItemsUI();
    nameInput.value = '';
    qtyInput.value = '1';
    document.getElementById('productStockHint').textContent = '';
});

function renderSelectedItemsUI() {
    const ul = document.getElementById('poItemsListUI');
    if (!ul) return;
    
    if (window.currentOrderItems.length === 0) {
        ul.innerHTML = '<li class="py-2 text-gray-400 italic">No products selected yet.</li>';
        document.getElementById('poTotalAmount').value = "0.00";
        return;
    }

    let totalOrderAmount = 0;
    ul.innerHTML = window.currentOrderItems.map((item, index) => {
        const itemTotal = item.quantity * item.unit_price;
        totalOrderAmount += itemTotal;
        return `
            <li class="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                    <span class="font-medium">${item.product_name}</span>
                    ${item.is_new_product ? `<span class="ml-1 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">NEW</span>` : ''}
                    <span class="text-gray-400 block text-[11px]">Quantity: ${item.quantity} x $${item.unit_price.toFixed(2)}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-semibold">$${itemTotal.toFixed(2)}</span>
                    <button type="button" onclick="removeSelectedItem(${index})" class="text-red-500 hover:text-red-700 font-bold px-1">✕</button>
                </div>
            </li>
        `;
    }).join('');
    document.getElementById('poTotalAmount').value = totalOrderAmount.toFixed(2);
}
window.removeSelectedItem = function(index) {
    window.currentOrderItems.splice(index, 1);
    renderSelectedItemsUI();
};

// HELPERS
function formatCurrency(v) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0); }
function formatDate(str) {
    if (!str || str === '--') return '--';
    const d = new Date(str);
    return isNaN(d) ? str : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}






// ============================================================
// GENERIC ACTION MODAL LOGIC
// ============================================================
let currentActionType = null;
let currentActionId = null;

window.openActionModal = function(id, type) {
    currentActionId = id;
    currentActionType = type;
    
    const titleEl = document.getElementById('confirmActionTitle');
    const descEl = document.getElementById('confirmActionDesc');
    const iconBg = document.getElementById('confirmActionIconBg');
    const icon = document.getElementById('confirmActionIcon');
    const btn = document.getElementById('btnProceedAction');
    
    if(!titleEl) return;

    btn.className = 'flex-1 px-4 py-3 text-white rounded-xl transition-all font-medium shadow-sm ';
    
    if (type === 'delete') {
        titleEl.textContent = 'Xóa đơn hàng';
        descEl.textContent = 'Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể hoàn tác.';
        iconBg.className = 'w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center';
        icon.className = 'w-6 h-6 text-red-600';
        icon.setAttribute('data-lucide', 'trash-2');
        btn.textContent = 'Xóa đơn hàng';
        btn.classList.add('bg-red-600', 'hover:bg-red-700');
    } else if (type === 'cancel') {
        titleEl.textContent = 'Hủy đơn hàng';
        descEl.textContent = 'Bạn có chắc chắn muốn hủy đơn hàng này?';
        iconBg.className = 'w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center';
        icon.className = 'w-6 h-6 text-red-600';
        icon.setAttribute('data-lucide', 'x-circle');
        btn.textContent = 'Hủy đơn hàng';
        btn.classList.add('bg-red-600', 'hover:bg-red-700');
    } else if (type === 'approve') {
        titleEl.textContent = 'Duyệt đơn hàng';
        descEl.textContent = 'Bạn có chắc chắn muốn duyệt đơn hàng này?';
        iconBg.className = 'w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center';
        icon.className = 'w-6 h-6 text-purple-600';
        icon.setAttribute('data-lucide', 'check-circle');
        btn.textContent = 'Duyệt đơn hàng';
        btn.classList.add('bg-purple-600', 'hover:bg-purple-700');
    } else if (type === 'ship') {
        titleEl.textContent = 'Giao hàng';
        descEl.textContent = 'Xác nhận chuyển trạng thái đơn hàng sang Đang giao (Shipped)?';
        iconBg.className = 'w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center';
        icon.className = 'w-6 h-6 text-yellow-600';
        icon.setAttribute('data-lucide', 'truck');
        btn.textContent = 'Đang giao';
        btn.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
    }
    
    showModal('confirmActionOverlay', 'confirmActionModal');
    if(window.lucide) window.lucide.createIcons();
};

window.closeConfirmAction = function() {
    hideModal('confirmActionOverlay', 'confirmActionModal');
    currentActionId = null;
    currentActionType = null;
};

document.getElementById('btnProceedAction')?.addEventListener('click', async () => {
    if (!currentActionId || !currentActionType) return;
    const btn = document.getElementById('btnProceedAction');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Đang xử lý...';
    try {
        if (currentActionType === 'delete') {
            await API.orders.delete(currentActionId);
            showToast('Đã xóa đơn hàng!', 'success');
        } else if (currentActionType === 'cancel') {
            await API.orders.cancel(currentActionId);
            showToast('Đã hủy đơn hàng!', 'success');
        } else if (currentActionType === 'approve') {
            await API.orders.approve(currentActionId);
            showToast('Đã duyệt đơn hàng!', 'success');
        } else if (currentActionType === 'ship') {
            await API.orders.ship(currentActionId);
            showToast('Đã chuyển trạng thái Đang giao!', 'success');
        }
        closeConfirmAction();
        await loadOrders();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
});

if (statusFilter) statusFilter.addEventListener('change', renderTable);

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('openAdd') === 'true') {
    openCreatePOModal();
    const productName = urlParams.get('product');
    if (productName) {
        setTimeout(() => {
            const nameInput = document.getElementById('poItemProductName');
            if (nameInput) {
                nameInput.value = productName;
                nameInput.dispatchEvent(new Event('input')); // Trigger product change logic
            }
        }, 500);
    }
}

loadOrders();
