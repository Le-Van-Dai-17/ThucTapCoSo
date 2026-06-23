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
    shipped:   { label: "Shipped",   color: "bg-purple-100 text-purple-700" },
    received:  { label: "Received",  color: "bg-green-100 text-green-700" },
    completed: { label: "Received",  color: "bg-green-100 text-green-700" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
    discrepancy: { label: "Discrepancy", color: "bg-amber-100 text-amber-800 border border-amber-300 font-bold" },
};

const statusFilter        = document.getElementById('statusFilter');
const supplierFilter      = document.getElementById('supplierFilter');
const dateRangeFilter     = document.getElementById('dateRangeFilter');
const orderSearch         = document.getElementById('orderSearch');
const rowsPerPageSelect   = document.getElementById('rowsPerPage');
const tableBody           = document.getElementById('tableBody');
const emptyState          = document.getElementById('emptyState');
const statsCardsContainer = document.getElementById('statsCardsContainer');
const paginationInfo      = document.getElementById('paginationInfo');
const pageButtons         = document.getElementById('pageButtons');
const prevPageBtn         = document.getElementById('prevPageBtn');
const nextPageBtn         = document.getElementById('nextPageBtn');
let currentPage = 1;
// ============================================================
// LOAD DATA
// ============================================================
async function loadOrders() {
    const isStaff = typeof displayRole !== 'undefined' && displayRole === 'Staff';
    if (isStaff) {
        const btnCreate = document.getElementById('btnCreateNewPO');
        if (btnCreate) btnCreate.style.display = 'none';
        const btnExport = document.getElementById('btnExportReport');
        if (btnExport) btnExport.style.display = 'none';
        const thVal = document.getElementById('thTotalValue');
        if (thVal) thVal.style.display = 'none';
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
            allOrders = allOrders.filter(o => ['approved', 'shipped', 'completed', 'received', 'discrepancy'].includes(o.status));
        }
    } catch (err) {
        console.warn('Backend error:', err.message);
        allOrders = [];
        showToast('Cannot load orders from server.', 'error');
    }
    populateSupplierFilter();
    renderStats();
    renderTable();
}

let urlSupplierLoaded = false;
function populateSupplierFilter() {
    if (!supplierFilter) return;
    let current = supplierFilter.value || 'all';
    if (!urlSupplierLoaded) {
        const urlParams = new URLSearchParams(window.location.search);
        const filterFromUrl = urlParams.get('supplier');
        if (filterFromUrl) {
            current = filterFromUrl;
            // Also override the date filter to show all time to ensure the user sees all history
            if (dateRangeFilter) dateRangeFilter.value = 'all';
        }
        urlSupplierLoaded = true;
    }
    const suppliers = Array.from(new Set(allOrders.map(o => o.supplier_name).filter(Boolean))).sort();
    supplierFilter.innerHTML = '<option value="all">All Suppliers</option>' + suppliers.map(name => `<option value="${name}">${name}</option>`).join('');
    supplierFilter.value = suppliers.includes(current) ? current : 'all';
}

function renderStats() {
    if (!statsCardsContainer) return;
    const isStaff = typeof displayRole !== 'undefined' && displayRole === 'Staff';
    const total = allOrders.length;
    const pending = allOrders.filter(o => o.status === 'pending').length;
    const received = allOrders.filter(o => o.status === 'received').length;
    const discrepancy = allOrders.filter(o => o.status === 'discrepancy').length;
    const totalVal = allOrders.reduce((sum, o) => sum + Number(o.total_amount || o.total_value || 0), 0);
    let cards = [
        { label: 'Total Orders', value: total, icon: 'clipboard-list', color: 'bg-blue-50 text-blue-600 border-blue-100' },
        { label: 'Pending Approval', value: pending, icon: 'clipboard-clock', color: 'bg-orange-50 text-orange-600 border-orange-100' },
        { label: 'Received', value: received, icon: 'package-check', color: 'bg-green-50 text-green-600 border-green-100' },
        { label: 'Discrepancy', value: discrepancy, icon: 'alert-triangle', color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
        { label: 'Total Value', value: formatCurrency(totalVal), icon: 'wallet', color: 'bg-purple-50 text-purple-600 border-purple-100' }
    ];
    if (isStaff) {
        cards = cards.filter(c => c.label !== 'Total Value');
    }
    statsCardsContainer.innerHTML = cards.map(card => `
        <article class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center gap-5 min-h-[120px]">
            <div class="w-14 h-14 rounded-full ${card.color} border flex items-center justify-center shrink-0"><i data-lucide="${card.icon}" class="w-7 h-7"></i></div>
            <div class="flex-1 min-w-0"><p class="text-sm font-medium text-gray-500">${card.label}</p><p class="text-2xl font-bold text-gray-950 mt-1 truncate" title="${card.value}">${card.value}</p></div>
        </article>`).join('');
    lucide.createIcons();
}

function getFilteredOrders() {
    const status = statusFilter?.value || 'all';
    const supplier = supplierFilter?.value || 'all';
    const days = dateRangeFilter?.value || 'all';
    const query = (orderSearch?.value || '').trim().toLowerCase();
    const now = Date.now();
    return allOrders.filter(order => {
        if (status !== 'all' && order.status !== status) return false;
        if (supplier !== 'all' && order.supplier_name !== supplier) return false;
        if (days !== 'all') {
            const orderTime = new Date(order.order_date || order.created_at).getTime();
            if (Number.isFinite(orderTime) && now - orderTime > Number(days) * 24 * 60 * 60 * 1000) return false;
        }
        if (query) {
            const haystack = `${order.order_number || ''} ${order.po_code || ''} ${order.supplier_name || ''}`.toLowerCase();
            if (!haystack.includes(query)) return false;
        }
        return true;
    });
}

function renderTable() {
    const filtered = getFilteredOrders();
    const rowsPerPage = Number(rowsPerPageSelect?.value || 6);
    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * rowsPerPage;
    const pageRows = filtered.slice(start, start + rowsPerPage);
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.toggle('hidden', pageRows.length !== 0);
    pageRows.forEach(order => {
        const cfg = statusConfig[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' };
        const source = order.source || 'Manual';
        const sourceClass = source === 'AI Forecast' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-700';
        const canCancel = ['draft', 'pending'].includes(order.status);
        const canApprove = order.status === 'pending';
        const canComplete = ['approved'].includes(order.status);
        const isStaff = typeof displayRole !== 'undefined' && displayRole === 'Staff';
        const tr = document.createElement('tr');
        tr.className = order.status === 'discrepancy'
            ? 'bg-amber-50/50 hover:bg-amber-100/50 transition-colors border-l-4 border-amber-500 font-medium'
            : 'hover:bg-gray-50 transition-colors';
        tr.innerHTML = `
            <td class="px-5 py-4 font-semibold text-gray-950">${order.order_number || order.po_code || '--'}</td>
            <td class="px-5 py-4 text-gray-700">${order.supplier_name || '--'}</td>
            <td class="px-5 py-4 text-gray-700">${order.created_by_name || '--'}</td>
            <td class="px-5 py-4 text-gray-700">${formatDate(order.expected_delivery_date || order.order_date)}</td>
            <td class="px-5 py-4 text-center"><span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold ${cfg.color}">${cfg.label}</span></td>
            ${isStaff ? '' : `<td class="px-5 py-4 text-right font-semibold text-gray-950">${formatCurrency(order.total_amount || order.total_value)}</td>`}
            <td class="px-5 py-4 text-center"><span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold ${sourceClass}">${source}</span></td>
            <td class="px-5 py-4"><div class="flex items-center justify-center gap-2">
                <button onclick="viewDetail(${order.id})" class="w-9 h-9 rounded-lg border border-gray-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center" title="View"><i data-lucide="eye" class="w-4 h-4"></i></button>
                ${canApprove && !isStaff ? `<button onclick="openActionModal(${order.id}, 'approve')" class="w-9 h-9 rounded-lg border border-gray-200 text-purple-600 hover:bg-purple-50 flex items-center justify-center" title="Approve"><i data-lucide="check-circle" class="w-4 h-4"></i></button>` : ''}
                ${canComplete ? `<button onclick="openConfirmReceive(${order.id})" class="w-9 h-9 rounded-lg border border-gray-200 text-green-600 hover:bg-green-50 flex items-center justify-center" title="Receive"><i data-lucide="package-check" class="w-4 h-4"></i></button>` : ''}
                ${canCancel ? `<button onclick="openActionModal(${order.id}, 'cancel')" class="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 flex items-center justify-center" title="Cancel"><i data-lucide="more-vertical" class="w-4 h-4"></i></button>` : ''}
            </div></td>`;
        tableBody.appendChild(tr);
    });
    renderPagination(filtered.length, rowsPerPage, totalPages, start, pageRows.length);
    lucide.createIcons();
}

function renderPagination(total, rowsPerPage, totalPages, start, count) {
    if (paginationInfo) paginationInfo.textContent = total ? `Showing ${start + 1} to ${start + count} of ${total} orders` : 'Showing 0 orders';
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
    if (!pageButtons) return;
    pageButtons.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `w-9 h-9 rounded-lg border text-sm font-semibold ${i === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`;
        btn.textContent = i;
        btn.onclick = () => { currentPage = i; renderTable(); };
        pageButtons.appendChild(btn);
    }
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
    
    const noteEl = document.getElementById('receiveNoteInput');
    if (noteEl) noteEl.value = '';

    showModal('confirmReceiveOverlay', 'confirmReceiveModal');
    
    try {
        const res = await API.orders.getDetail(id);
        const details = res.data || [];
        window.receiveItemsData = details.map(d => ({
            product_id: d.product_id,
            product_name: d.product_name,
            ordered_quantity: d.quantity || d.ordered_quantity || 0,
            evidence_file: null
        }));
        

        window.renderReceivePOModal = function() {
            if (container) {
                if (window.receiveItemsData.length === 0) {
                    container.innerHTML = '<p class="text-sm text-gray-500">No products found in this order.</p>';
                } else {
                    container.innerHTML = window.receiveItemsData.map((item, idx) => `
                        <div class="flex flex-col gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 mb-2">
                            <div class="flex items-center justify-between">
                                <div class="text-xs font-semibold text-gray-800 truncate max-w-[200px]" title="${item.product_name}">${item.product_name}</div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[11px] text-gray-400 font-mono">Ordered: ${item.ordered_quantity}</span>
                                    <input type="number" id="actualQtyInput_${idx}" min="0" value="${item.actual_quantity !== undefined ? item.actual_quantity : item.ordered_quantity}" 
                                        oninput="toggleReasonSelect(${idx}, ${item.ordered_quantity})"
                                        class="w-16 px-2 py-1 text-xs border-2 border-gray-200 rounded-lg text-right font-bold focus:outline-none focus:border-[#10B981]" />
                                </div>
                            </div>
                            <div id="reasonContainer_${idx}" class="${(item.actual_quantity !== undefined && item.actual_quantity !== item.ordered_quantity) ? 'w-full flex flex-col gap-2 mt-2 pt-2 border-t border-gray-100' : 'hidden'}">
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <div class="flex-1 min-w-[200px]">
                                        <select id="reasonSelect_${idx}" class="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 w-full" onchange="updatePoReason(${idx}, this.value)">
                                            <option value="" disabled ${!item.reason ? 'selected' : ''}>Select discrepancy reason...</option>
                                            <option value="Missing" ${item.reason === 'Missing' ? 'selected' : ''}>Missing</option>
                                            <option value="Damaged" ${item.reason === 'Damaged' ? 'selected' : ''}>Damaged</option>
                                            <option value="Moldy" ${item.reason === 'Moldy' ? 'selected' : ''}>Moldy</option>
                                            <option value="Torn Packaging" ${item.reason === 'Torn Packaging' ? 'selected' : ''}>Torn Packaging</option>
                                            <option value="Other" ${item.reason === 'Other' ? 'selected' : ''}>Other</option>
                                        </select>
                                    </div>
                                    <div class="flex items-center flex-wrap gap-2 shrink-0">
                                        <label class="cursor-pointer text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[11px] font-medium bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors">
                                            <i data-lucide="upload" class="w-3.5 h-3.5"></i> ${(item.evidence_files && item.evidence_files.length > 0) ? 'Add Image' : 'Upload Image (Req)'}
                                            <input type="file" accept="image/*" multiple class="hidden" onchange="handlePoEvidenceUpload(${idx}, this.files)">
                                        </label>
                                        <button type="button" onclick="window.mockPoEvidenceImage(${idx})" class="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 text-[11px] font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 transition-colors">
                                            Mock Image
                                        </button>
                                        ${(item.evidence_previews || []).map((preview, pIdx) => `
                                            <div class="relative group">
                                                <img src="${preview}" class="w-8 h-8 object-cover rounded cursor-pointer border border-gray-200" onclick="window.openImageViewer(this.src)" />
                                                <button onclick="removePoEvidenceImage(${idx}, ${pIdx})" class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <i data-lucide="x" class="w-2.5 h-2.5"></i>
                                                </button>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <div id="reasonOtherContainer_${idx}" class="${item.reason === 'Other' ? 'w-full' : 'hidden'}">
                                    <input type="text" id="reasonOther_${idx}" placeholder="Enter specific reason..." class="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500" value="${item.reasonOther || ''}" oninput="updatePoReasonOther(${idx}, this.value)" />
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
                lucide.createIcons();
            }
        };
        window.renderReceivePOModal();
    } catch (e) {
        if (container) container.innerHTML = '<p class="text-sm text-red-500">Failed to load items for verification.</p>';
    }
};

window.toggleReasonSelect = function(idx, orderedQty) {
    const inputEl = document.getElementById(`actualQtyInput_${idx}`);
    const reasonContainer = document.getElementById(`reasonContainer_${idx}`);
    if (inputEl) {
        let val = parseInt(inputEl.value);
        if (isNaN(val)) val = 0;
        if (val < 0) {
            showToast(`Số lượng thực nhận không được âm`, 'error');
            val = 0;
            inputEl.value = 0;
        }
        if (val > orderedQty) {
            showToast(`Received quantity cannot exceed ordered quantity (${orderedQty})`, 'error');
            val = orderedQty;
            inputEl.value = orderedQty;
        }
        if (reasonContainer) {
            if (val !== parseInt(orderedQty)) {
                reasonContainer.classList.remove('hidden');
                reasonContainer.classList.add('flex');
            } else {
                reasonContainer.classList.add('hidden');
                reasonContainer.classList.remove('flex');
            }
        }
        
        window.receiveItemsData[idx].actual_quantity = val;
        if (val === orderedQty) {
            window.receiveItemsData[idx].reason = '';
            window.receiveItemsData[idx].reasonOther = '';
            window.receiveItemsData[idx].evidence_files = [];
            window.receiveItemsData[idx].evidence_previews = [];
        }
        window.renderReceivePOModal();
    }
};

window.updatePoReason = function(idx, val) {
    window.receiveItemsData[idx].reason = val;
    window.renderReceivePOModal();
};

window.updatePoReasonOther = function(idx, val) {
    window.receiveItemsData[idx].reasonOther = val;
};

window.handlePoEvidenceUpload = function(idx, files) {
    if (files && files.length > 0) {
        if (!window.receiveItemsData[idx].evidence_files) {
            window.receiveItemsData[idx].evidence_files = [];
            window.receiveItemsData[idx].evidence_previews = [];
        }
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            window.receiveItemsData[idx].evidence_files.push(file);
            window.receiveItemsData[idx].evidence_previews.push(URL.createObjectURL(file));
        }
        window.renderReceivePOModal();
    }
};

window.removePoEvidenceImage = function(idx, pIdx) {
    URL.revokeObjectURL(window.receiveItemsData[idx].evidence_previews[pIdx]);
    window.receiveItemsData[idx].evidence_previews.splice(pIdx, 1);
    window.receiveItemsData[idx].evidence_files.splice(pIdx, 1);
    window.renderReceivePOModal();
};

window.mockPoEvidenceImage = function(idx) {
    const mockFile = new File(["mock_data"], "evidence_mock.jpg", { type: "image/jpeg" });
    if (!window.receiveItemsData[idx].evidence_files) {
        window.receiveItemsData[idx].evidence_files = [];
        window.receiveItemsData[idx].evidence_previews = [];
    }
    window.receiveItemsData[idx].evidence_files.push(mockFile);
    window.receiveItemsData[idx].evidence_previews.push("https://via.placeholder.com/150");
    window.renderReceivePOModal();
};

window.closeConfirmReceive = function() {
    hideModal('confirmReceiveOverlay', 'confirmReceiveModal');
    currentPOIdToReceive = null;
    window.receiveItemsData = null;
    const noteEl = document.getElementById('receiveNoteInput');
    if (noteEl) noteEl.value = '';
};

document.getElementById('btnProceedReceive')?.addEventListener('click', async () => {
    if (!currentPOIdToReceive || !window.receiveItemsData) return;
    const btn = document.getElementById('btnProceedReceive');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    try {
        // Validation
        const finalPayloadItems = [];
        for (let i = 0; i < window.receiveItemsData.length; i++) {
            const item = window.receiveItemsData[i];
            const val = item.actual_quantity !== undefined ? item.actual_quantity : item.ordered_quantity;
            let finalReason = item.reason || null;
            if (finalReason === 'Other') {
                const otherVal = (item.reasonOther || '').trim();
                if (otherVal) finalReason = `Other - ${otherVal}`;
                else finalReason = null;
            }

            if (val !== item.ordered_quantity) {
                if (!finalReason) {
                    throw new Error(`Please select a reason and provide details for the discrepant product.`);
                }
                if (!item.evidence_files || item.evidence_files.length === 0) {
                    throw new Error(`Please upload evidence images for the discrepant product: ${item.product_name}`);
                }
            }
            
            finalPayloadItems.push({
                product_id: item.product_id,
                received_quantity: val,
                reason: finalReason,
                evidence_files: item.evidence_files || []
            });
        }

        const promises = finalPayloadItems.map(async p => {
            if (p.received_quantity === window.receiveItemsData.find(i => i.product_id === p.product_id).ordered_quantity) {
                return {
                    product_id: p.product_id,
                    received_quantity: p.received_quantity,
                    reason: null,
                    evidence_urls: []
                };
            }
            
            let uploadedUrls = [];
            if (p.evidence_files && p.evidence_files.length > 0) {
                for (const file of p.evidence_files) {
                    const formData = new FormData();
                    formData.append('evidence', file);
                    const uploadRes = await fetch(API_BASE_URL + '/upload/image', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
                        body: formData
                    });
                    const uploadData = await uploadRes.json();
                    if (!uploadRes.ok) throw new Error(uploadData.message || 'Lỗi upload ảnh');
                    uploadedUrls.push(uploadData.url);
                }
            }

            return {
                product_id: p.product_id,
                received_quantity: p.received_quantity,
                reason: p.reason,
                evidence_urls: uploadedUrls
            };
        });

        const exceedingItems = finalPayloadItems.filter(p => {
            const ordered = window.receiveItemsData.find(i => i.product_id === p.product_id).ordered_quantity;
            return p.received_quantity > ordered;
        });
        if (exceedingItems.length > 0) {
            btn.disabled = false;
            btn.textContent = 'Confirm Receipt';
            showToast('Received quantity cannot exceed ordered quantity!', 'error');
            return;
        }

        const finalItems = await Promise.all(promises);
        const noteEl = document.getElementById('receiveNoteInput');
        const noteVal = noteEl ? noteEl.value.trim() : '';

        const res = await API.orders.receive(currentPOIdToReceive, { items: finalItems, note: noteVal });

        if (res.success) {
            showToast(res.message || 'Purchase order received successfully', 'success');
            closeConfirmReceive();
            loadOrders();
        } else {
            showToast(res.message || 'Failed to receive purchase order', 'error');
        }
    } catch (e) {
        showToast(e.message || 'An error occurred', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm Receipt';
    }
});




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
        const discrepancies = result.discrepancies || [];
        
        const cfg = statusConfig[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' };

        const isStaff = typeof displayRole !== 'undefined' && displayRole === 'Staff';
        let rows = details.map((d, i) => {
            const ordered = d.quantity || d.ordered_quantity || 0;
            let received = d.received_quantity || 0;
            const disc = discrepancies.find(x => x.po_item_id === d.po_item_id);
            
            let receivedHtml = `${received}`;
            let orderedHtml = `${ordered}`;
            
            if (disc && disc.status === 'Resolved') {
                if (disc.resolution_type === 'refund') {
                    orderedHtml = `<span class="text-red-500 font-semibold">${disc.expected_quantity}</span>`;
                    receivedHtml = `<span class="text-[#10B981] font-semibold">${disc.actual_quantity}</span>`;
                } else if (disc.resolution_type === 'replacement') {
                    receivedHtml = `<span>${disc.actual_quantity}</span> <span class="text-orange-500 font-bold" title="Giao bù hàng">+ ${disc.discrepancy_quantity}</span>`;
                }
            } else if (disc && disc.status === 'Pending') {
                receivedHtml = `<span>${disc.actual_quantity}</span> <span class="text-red-500 font-bold" title="Chờ đối soát">(-${disc.discrepancy_quantity})</span>`;
            }

            const isShort = received < ordered;
            const textClass = isShort ? 'text-red-600' : 'text-[#10B981]';
            return `
            <tr class="border-b border-gray-100">
                <td class="py-4 text-center text-gray-500">${i+1}</td>
                <td class="py-4 text-gray-900 font-medium">${d.product_name || 'N/A'}</td>
                <td class="py-4 text-center text-gray-700 font-semibold">${orderedHtml}</td>
                <td class="py-4 text-center ${textClass} font-semibold">${receivedHtml}</td>
                ${isStaff ? '' : `
                <td class="py-4 text-right text-gray-700">${formatCurrency(d.unit_price || d.unit_cost)}</td>
                <td class="py-4 text-right font-bold text-gray-900">${formatCurrency(d.total_amount || d.line_total)}</td>
                `}
            </tr>`;
        }).join('');

        let staffNoteHtml = '';
        if (result.order && result.order.staff_note) {
            staffNoteHtml = `
                <div class="col-span-2 bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl text-sm font-medium">
                    <span class="font-bold">Receiving Note:</span> ${result.order.staff_note}
                </div>
            `;
        }

        let totalDisplayHtml = '';
        const orderTotal = Number(result.order.total_value || result.order.total_amount || 0);
        const orderComp = Number(result.order.compensation_amount || 0);
        if (orderComp > 0) {
            totalDisplayHtml = `<span class="text-emerald-600 font-bold">${formatCurrency(orderTotal)}</span> <span class="text-red-500 font-semibold text-sm ml-2" title="Tiền đền bù">+ ${formatCurrency(orderComp)}</span>`;
        } else {
            totalDisplayHtml = `<span class="text-[#2563EB] font-bold">${formatCurrency(orderTotal)}</span>`;
        }

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
                ${staffNoteHtml}
            </div>
            
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b-2 border-gray-200 bg-white">
                        <th class="py-3 text-center text-gray-500 font-semibold w-12">#</th>
                        <th class="py-3 text-left text-gray-500 font-semibold">Product Description</th>
                        <th class="py-3 text-center text-gray-500 font-semibold w-32">Ordered Quantity</th>
                        <th class="py-3 text-center text-gray-500 font-semibold w-32">Received Quantity</th>
                        ${isStaff ? '' : `
                        <th class="py-3 text-right text-gray-500 font-semibold w-32">Unit Price</th>
                        <th class="py-3 text-right text-gray-500 font-semibold w-32">Total</th>
                        `}
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                ${isStaff ? '' : `
                <tfoot>
                    <tr>
                        <td colspan="5" class="py-6 text-right font-semibold text-gray-500 uppercase tracking-wider text-xs">Total Amount:</td>
                        <td class="py-6 text-right font-bold text-2xl">${totalDisplayHtml}</td>
                    </tr>
                </tfoot>
                `}
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
        
    }
});


document.getElementById('createPOForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn   = document.getElementById('createPOBtn');
    const errEl = document.getElementById('createPOError');
    if (errEl) errEl.classList.add('hidden');

    const payloadStatus = document.getElementById('poStatus').value;

    if (window.currentOrderItems.length === 0) {
        if (errEl) { errEl.textContent = 'At least 1 item required.'; errEl.classList.remove('hidden'); }
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
        // Group items by supplier_id
        const groups = {};
        window.currentOrderItems.forEach(item => {
            const sid = item.supplier_id || 'unknown';
            if (!groups[sid]) groups[sid] = { items: [], supplier_name: item.supplier_name, total_amount: 0 };
            groups[sid].items.push(item);
            groups[sid].total_amount += (item.quantity * item.unit_price);
        });

        const promises = Object.values(groups).map(g => {
            return API.orders.create({
                supplier_name: g.supplier_name || 'Unknown',
                total_amount: g.total_amount,
                status: payloadStatus,
                items: g.items
            });
        });

        await Promise.all(promises);
        showToast('✅ Purchase order(s) created!', 'success');
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
        btn.textContent = 'Create Order';
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

    if (!existingProd) {
        showToast('Only existing products in the system can be added!', 'error');
        return;
    }

    let supName = 'Unknown';
    if (window.dbSuppliersList && existingProd.supplier_id) {
        const sup = window.dbSuppliersList.find(s => s.id == existingProd.supplier_id || s.supplier_id == existingProd.supplier_id);
        if (sup) supName = sup.name;
    }

    let itemData = {
        product_name: productName,
        quantity: quantity,
        received_quantity: 0,
        unit_price: existingProd ? parseFloat(existingProd.cost_price || 0) : 10.00,
        supplier_id: existingProd ? existingProd.supplier_id : null,
        supplier_name: supName
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
function formatCurrency(v) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0); }
function formatDate(str) {
    if (!str || str === '--') return '--';
    const d = new Date(str);
    return isNaN(d) ? str : d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
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
        titleEl.textContent = 'Delete Order';
        descEl.textContent = 'Are you sure you want to delete this purchase order? This action cannot be undone.';
        iconBg.className = 'w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center';
        icon.className = 'w-6 h-6 text-red-600';
        icon.setAttribute('data-lucide', 'trash-2');
        btn.textContent = 'Delete Order';
        btn.classList.add('bg-red-600', 'hover:bg-red-700');
    } else if (type === 'cancel') {
        titleEl.textContent = 'Cancel Order';
        descEl.textContent = 'Are you sure you want to cancel this purchase order?';
        iconBg.className = 'w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center';
        icon.className = 'w-6 h-6 text-red-600';
        icon.setAttribute('data-lucide', 'x-circle');
        btn.textContent = 'Cancel Order';
        btn.classList.add('bg-red-600', 'hover:bg-red-700');
    } else if (type === 'approve') {
        titleEl.textContent = 'Approve Order';
        descEl.textContent = 'Are you sure you want to approve this purchase order?';
        iconBg.className = 'w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center';
        icon.className = 'w-6 h-6 text-purple-600';
        icon.setAttribute('data-lucide', 'check-circle');
        btn.textContent = 'Approve Order';
        btn.classList.add('bg-purple-600', 'hover:bg-purple-700');
    } else if (type === 'ship') {
        titleEl.textContent = 'Ship Order';
        descEl.textContent = 'Confirm changing purchase order status to Shipped?';
        iconBg.className = 'w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center';
        icon.className = 'w-6 h-6 text-yellow-600';
        icon.setAttribute('data-lucide', 'truck');
        btn.textContent = 'Ship Order';
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
    btn.textContent = 'Processing...';
    try {
        if (currentActionType === 'delete') {
            await API.orders.delete(currentActionId);
            showToast('Purchase order deleted!', 'success');
        } else if (currentActionType === 'cancel') {
            await API.orders.cancel(currentActionId);
            showToast('Purchase order cancelled!', 'success');
        } else if (currentActionType === 'approve') {
            await API.orders.approve(currentActionId);
            showToast('Purchase order approved!', 'success');
        } else if (currentActionType === 'ship') {
            await API.orders.ship(currentActionId);
            showToast('Status updated to Shipped!', 'success');
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

if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });
if (supplierFilter) supplierFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });
if (dateRangeFilter) dateRangeFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });
if (orderSearch) orderSearch.addEventListener('input', () => { currentPage = 1; renderTable(); });
if (rowsPerPageSelect) rowsPerPageSelect.addEventListener('change', () => { currentPage = 1; renderTable(); });
if (prevPageBtn) prevPageBtn.addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); renderTable(); });
if (nextPageBtn) nextPageBtn.addEventListener('click', () => { currentPage += 1; renderTable(); });

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

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const globalSearch = document.querySelector('header input[placeholder*="Search"]');
        if (globalSearch) {
            globalSearch.parentElement.parentElement.style.visibility = 'hidden';
        }
    }, 100);
});
