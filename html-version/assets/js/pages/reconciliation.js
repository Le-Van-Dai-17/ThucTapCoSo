let currentTab = 'PO';
let currentActionId = null;
let allRecords = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isLoggedIn() || !Auth.hasRole('Manager', 'Admin', 'Staff')) {
        window.location.href = Auth.getHomePage();
        return;
    }

    // Hide global header search to avoid duplicate search bars
    const globalSearch = document.querySelector('header input[placeholder*="Search"]');
    if (globalSearch) {
        globalSearch.parentElement.parentElement.style.visibility = 'hidden';
    }

    document.getElementById('searchInput').addEventListener('input', renderTable);
    document.getElementById('statusFilter').addEventListener('change', renderTable);
    document.getElementById('dateFilter').addEventListener('change', renderTable);

    // Setup shrinkage form listener
    const shrinkageForm = document.getElementById('shrinkageForm');
    if (shrinkageForm) {
        shrinkageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const productId = document.getElementById('adjProduct').value;
            const quantity = document.getElementById('adjQuantity').value;
            let reason = document.getElementById('adjReason').value;

            if (reason === 'Other') {
                const otherReason = document.getElementById('adjReasonOther').value.trim();
                if (!otherReason) {
                    showToast('Please enter a specific reason', 'error');
                    return;
                }
                reason = `Other - ${otherReason}`;
            }

            if (!productId || !quantity || !reason) {
                showToast('Please fill in all information.', 'error');
                return;
            }

            const btn = document.getElementById('btnSubmitAdjustment');
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-white"></i> Processing...';
            if (typeof lucide !== 'undefined') lucide.createIcons();

            try {
                const formData = new FormData();
                formData.append('product_id', productId);
                formData.append('quantity', parseInt(quantity));
                formData.append('reason', reason);
                const imageFile = document.getElementById('adjImage')?.files[0];
                if (imageFile) {
                    formData.append('image', imageFile);
                }

                const res = await fetch(`${API_BASE_URL}/inventory/adjust`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${Auth.getToken()}`
                    },
                    body: formData
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Server error');

                showToast('Shrinkage report submitted successfully, waiting for approval!', 'success');
                closeShrinkageModal();
                loadData();
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Submit Report';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    switchTab(currentTab);
});

window.switchTab = function(tab) {
    currentTab = tab;
    document.getElementById('tabPO').classList.toggle('text-blue-600', tab === 'PO');
    document.getElementById('tabPO').classList.toggle('border-blue-600', tab === 'PO');
    document.getElementById('tabPO').classList.toggle('text-gray-500', tab !== 'PO');
    document.getElementById('tabPO').classList.toggle('border-transparent', tab !== 'PO');

    document.getElementById('tabInv').classList.toggle('text-blue-600', tab === 'INV');
    document.getElementById('tabInv').classList.toggle('border-blue-600', tab === 'INV');
    document.getElementById('tabInv').classList.toggle('text-gray-500', tab !== 'INV');
    document.getElementById('tabInv').classList.toggle('border-transparent', tab !== 'INV');

    document.getElementById('sectionPO').classList.toggle('hidden', tab !== 'PO');
    document.getElementById('sectionInv').classList.toggle('hidden', tab !== 'INV');

    const btnOpenShrinkage = document.getElementById('btnOpenShrinkageModal');
    if (btnOpenShrinkage) {
        btnOpenShrinkage.classList.toggle('hidden', tab !== 'INV');
    }

    loadData();
};

async function loadData() {
    allRecords = [];
    renderTable(); // Show loading initially
    const tbodyId = currentTab === 'PO' ? 'poTableBody' : 'invTableBody';
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-gray-500"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500"></i> Loading data...</td></tr>';
    lucide.createIcons();
    
    try {
        const endpoint = currentTab === 'PO' ? '/reconciliation/discrepancies' : '/reconciliation/adjustments';
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
        });
        const data = await res.json();
        allRecords = data.data || [];
        renderTable();
    } catch (error) {
        showToast('Cannot load data.', 'error');
        allRecords = [];
        renderTable();
    }
}

function filterRecords(records) {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const status = document.getElementById('statusFilter').value;
    const dateRange = document.getElementById('dateFilter').value;

    const now = new Date();

    return records.filter(r => {
        // Search Filter
        const poCode = r.po_code ? r.po_code.toLowerCase() : '';
        const productName = r.product_name ? r.product_name.toLowerCase() : '';
        const sku = r.sku ? r.sku.toLowerCase() : '';
        const reportedBy = (r.reported_by_name || '').toLowerCase();
        
        if (search && !poCode.includes(search) && !productName.includes(search) && !sku.includes(search) && !reportedBy.includes(search)) {
            return false;
        }

        // Status Filter
        if (status && r.status !== status) {
            return false;
        }

        // Date Filter
        if (dateRange !== 'all') {
            const rDate = new Date(r.created_at);
            const diffDays = (now - rDate) / (1000 * 60 * 60 * 24);
            if (diffDays > parseInt(dateRange)) {
                return false;
            }
        }

        return true;
    });
}

function renderTable() {
    const filtered = filterRecords(allRecords);
    const isStaff = !Auth.hasRole('Manager', 'Admin');
    
    if (currentTab === 'PO') {
        const tbody = document.getElementById('poTableBody');
        const emptyState = document.getElementById('emptyStatePO');
        
        if (filtered.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            tbody.innerHTML = filtered.map(r => `
                <tr class="hover:bg-gray-50/50 transition-colors ${r.status !== 'Pending' ? 'opacity-60' : ''}">
                    <td class="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">${new Date(r.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(r.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</td>
                    <td class="px-6 py-4">
                        <div class="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline transition-colors" onclick="openActionModal(${r.discrepancy_id}, 'PO')">${r.po_code}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="font-medium text-gray-900">${r.reported_by_name || 'N/A'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-gray-500">${r.expected_quantity}</span> / 
                        <span class="font-bold text-gray-900">${r.actual_quantity}</span> 
                        <span class="text-red-500 font-bold ml-2">(${r.discrepancy_quantity})</span>
                    </td>
                    <td class="px-6 py-4 text-gray-900 font-medium">${r.reason}</td>
                    <td class="px-6 py-4">
                        <span class="px-2.5 py-1 text-xs font-medium rounded-full ${r.status === 'Pending' ? 'bg-amber-50 text-amber-600' : r.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}">
                            ${r.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        ${!isStaff && r.status === 'Pending' ? `<button onclick="openActionModal(${r.discrepancy_id}, 'PO')" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Resolve</button>` : `<button onclick="openActionModal(${r.discrepancy_id}, 'PO')" class="text-gray-500 hover:text-gray-800 text-sm font-medium">View</button>`}
                    </td>
                </tr>
            `).join('');
        }
    } else {
        const tbody = document.getElementById('invTableBody');
        const emptyState = document.getElementById('emptyStateInv');
        
        if (filtered.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            tbody.innerHTML = filtered.map(r => `
                <tr class="hover:bg-gray-50/50 transition-colors ${r.status !== 'Pending' ? 'opacity-60' : ''}">
                    <td class="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">${new Date(r.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(r.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</td>
                    <td class="px-6 py-4">
                        <div class="font-semibold text-gray-900">${r.product_name}</div>
                        <div class="text-xs text-gray-500">SKU: ${r.sku}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="font-medium text-gray-900">${r.reported_by_name || 'N/A'}</div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-red-500 font-bold">-${r.quantity}</span>
                    </td>
                    <td class="px-6 py-4 text-gray-900 font-medium">${r.reason}</td>
                    <td class="px-6 py-4">
                        <span class="px-2.5 py-1 text-xs font-medium rounded-full ${r.status === 'Pending' ? 'bg-amber-50 text-amber-600' : r.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}">
                            ${r.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        ${!isStaff && r.status === 'Pending' ? `<button onclick="openActionModal(${r.adjustment_id}, 'INV')" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Resolve</button>` : `<button onclick="openActionModal(${r.adjustment_id}, 'INV')" class="text-gray-500 hover:text-gray-800 text-sm font-medium">View</button>`}
                    </td>
                </tr>
            `).join('');
        }
    }
    lucide.createIcons();
}

window.openActionModal = async function(id, type) {
    currentActionId = id;
    const record = allRecords.find(r => type === 'PO' ? r.discrepancy_id === id : r.adjustment_id === id);
    if (!record) return;

    // Populate Modal Read-only Data
    document.getElementById('modalReportedBy').textContent = record.reported_by_name || 'Unknown User';
    document.getElementById('modalReportDate').textContent = new Date(record.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    document.getElementById('modalReason').textContent = record.reason;
    
    // Additional Note is not supported by the DB schema, so we hide it or leave empty
    const modalNoteContainer = document.getElementById('modalNote').parentElement;
    if (modalNoteContainer) modalNoteContainer.style.display = 'none';
    
    document.getElementById('resolutionNote').value = record.resolution_note || '';

    const modalImageContainer = document.getElementById('modalImageContainer');
    const modalImage = document.getElementById('modalImage');
    if (modalImageContainer && modalImage) {
        if (record.image_path) {
            const backendHost = API_BASE_URL.replace('/api', '');
            modalImage.src = `${backendHost}${record.image_path}`;
            modalImageContainer.classList.remove('hidden');
        } else {
            modalImage.src = '';
            modalImageContainer.classList.add('hidden');
        }
    }

    if (type === 'PO') {
        document.getElementById('modalSupplierContainer').classList.remove('hidden');
        document.getElementById('modalSupplier').textContent = record.supplier_name || 'N/A';
        document.getElementById('actionModalTitle').textContent = `Resolve Discrepancy: ${record.po_code}`;
        
        const approvedByContainer = document.getElementById('modalApprovedByContainer');
        if (approvedByContainer) {
            approvedByContainer.classList.remove('hidden');
            document.getElementById('modalApprovedBy').textContent = record.approved_by_name || 'Not Approved / N/A';
        }
        
        document.getElementById('modalProduct').textContent = `[${record.sku}] ${record.product_name}`;
        
        const diffQty = record.expected_quantity - record.actual_quantity;
        document.getElementById('modalQty').innerHTML = `Ordered: <span class="text-gray-700 font-semibold">${record.expected_quantity}</span> | Received: <span class="text-gray-700 font-semibold">${record.actual_quantity}</span> | Shortage: <span class="text-red-600 font-bold">-${diffQty}</span>`;
        
        // Fetch full PO items
        const poItemsContainer = document.getElementById('modalPoItemsContainer');
        const poItemsBody = document.getElementById('modalPoItemsBody');
        poItemsContainer.classList.remove('hidden');
        poItemsBody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto text-blue-500"></i></td></tr>';
        lucide.createIcons();

        try {
            const res = await fetch(`${API_BASE_URL}/purchases/detail/${record.po_id}`, {
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const data = await res.json();
            // The API returns the array of items directly in data.data
            if (data.success && Array.isArray(data.data)) {
                poItemsBody.innerHTML = data.data.map(item => {
                    const isDiff = item.received_quantity < item.quantity;
                    return `
                        <tr class="${item.product_id === record.product_id ? 'bg-red-50/50' : ''}">
                            <td class="px-4 py-3">
                                <div class="font-medium text-gray-900">${item.product_name}</div>
                                <div class="text-xs text-gray-500">${item.sku}</div>
                            </td>
                            <td class="px-4 py-3 text-center">${item.quantity}</td>
                            <td class="px-4 py-3 text-center ${isDiff ? 'text-red-600 font-bold' : 'text-gray-900'}">${item.received_quantity}</td>
                            <td class="px-4 py-3 text-center ${isDiff ? 'text-red-600 font-bold' : 'text-gray-400'}">${isDiff ? item.quantity - item.received_quantity : 0}</td>
                        </tr>
                    `;
                }).join('');
            } else {
                poItemsBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">Could not load items.</td></tr>';
            }
        } catch (e) {
            poItemsBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">Error loading PO details.</td></tr>';
        }
    } else {
        document.getElementById('modalSupplierContainer').classList.add('hidden');
        document.getElementById('actionModalTitle').textContent = `Resolve Shrinkage: ${record.product_name}`;
        document.getElementById('modalPoItemsContainer').classList.add('hidden');
        
        const approvedByContainer = document.getElementById('modalApprovedByContainer');
        if (approvedByContainer) approvedByContainer.classList.add('hidden');
        
        document.getElementById('modalProduct').textContent = `[${record.sku}] ${record.product_name}`;
        document.getElementById('modalQty').innerHTML = `Loss: <span class="text-red-600 font-bold">-${record.quantity}</span>`;
    }

    // Toggle Buttons based on status and user role
    const btnContainer = document.querySelector('#actionModal .border-t');
    const isStaff = !Auth.hasRole('Manager', 'Admin');
    if (isStaff || record.status !== 'Pending') {
        document.getElementById('resolutionNote').readOnly = true;
        btnContainer.innerHTML = `<button onclick="closeActionModal()" class="px-6 py-2.5 bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 rounded-xl transition-colors">Close</button>`;
    } else {
        document.getElementById('resolutionNote').readOnly = false;
        btnContainer.innerHTML = `
            <button onclick="closeActionModal()" class="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
            <button onclick="submitResolution('Rejected')" class="px-6 py-2.5 bg-white border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 hover:border-red-300 rounded-xl transition-colors">Reject Report</button>
            <button onclick="submitResolution('Resolved')" class="px-6 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-sm shadow-blue-200 rounded-xl transition-colors">Resolve Issue</button>
        `;
    }

    document.getElementById('actionOverlay').classList.remove('hidden');
    document.getElementById('actionModal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('actionOverlay').classList.remove('opacity-0');
        document.getElementById('actionModal').classList.remove('opacity-0', 'scale-95');
        document.getElementById('actionModal').classList.add('opacity-100', 'scale-100');
    }, 10);
};

window.closeActionModal = function() {
    const m = document.getElementById('actionModal');
    m.classList.remove('opacity-100', 'scale-100');
    m.classList.add('opacity-0', 'scale-95');
    document.getElementById('actionOverlay').classList.add('opacity-0');
    
    setTimeout(() => {
        document.getElementById('actionOverlay').classList.add('hidden');
        m.classList.add('hidden');
        currentActionId = null;
    }, 300);
};

window.submitResolution = async function(status) {
    if (!currentActionId) return;
    const note = document.getElementById('resolutionNote').value.trim();

    if (status === 'Resolved' && !note && currentTab === 'PO') {
        showToast('Please provide a resolution note (e.g. how was the missing quantity handled).', 'warning');
        document.getElementById('resolutionNote').focus();
        return;
    }

    const endpoint = currentTab === 'PO' 
        ? `${API_BASE_URL}/reconciliation/discrepancies/${currentActionId}`
        : `${API_BASE_URL}/reconciliation/adjustments/${currentActionId}`;

    try {
        const res = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ status, resolution_note: note })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        showToast(status === 'Resolved' ? 'Successfully resolved.' : 'Report rejected.', 'success');
        closeActionModal();
        loadData();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ==========================================
// 12. REPORT WAREHOUSE SHRINKAGE MODAL
// ==========================================
async function loadProducts() {
    const select = document.getElementById('adjProduct');
    if (!select) return;
    try {
        const res = await API.products.getAll();
        const products = res.data || [];
        
        if (products.length === 0) {
            select.innerHTML = '<option value="" disabled selected>No products available</option>';
            return;
        }

        select.innerHTML = '<option value="" disabled selected>Select product...</option>' + 
            products.map(p => `
                <option value="${p.product_id}">[${p.sku}] ${p.name} (Stock: ${p.current_stock})</option>
            `).join('');
    } catch (error) {
        console.error('Error loading products:', error);
        select.innerHTML = '<option value="" disabled selected>Error loading products list</option>';
    }
}

window.openShrinkageModal = function() {
    const form = document.getElementById('shrinkageForm');
    if (form) form.reset();
    const otherContainer = document.getElementById('adjReasonOtherContainer');
    if (otherContainer) otherContainer.classList.add('hidden');

    loadProducts();

    document.getElementById('shrinkageOverlay').classList.remove('hidden');
    document.getElementById('shrinkageModal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('shrinkageOverlay').classList.remove('opacity-0');
        document.getElementById('shrinkageModal').classList.remove('opacity-0', 'scale-95');
        document.getElementById('shrinkageModal').classList.add('opacity-100', 'scale-100');
    }, 10);
};

window.closeShrinkageModal = function() {
    const m = document.getElementById('shrinkageModal');
    m.classList.remove('opacity-100', 'scale-100');
    m.classList.add('opacity-0', 'scale-95');
    document.getElementById('shrinkageOverlay').classList.add('opacity-0');
    
    const fileEl = document.getElementById('adjImage');
    if (fileEl) fileEl.value = '';
    
    setTimeout(() => {
        document.getElementById('shrinkageOverlay').classList.add('hidden');
        m.classList.add('hidden');
    }, 300);
};
