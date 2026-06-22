let currentTab = 'PO';
let currentActionId = null;
let allRecords = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isLoggedIn() || !Auth.hasRole('Manager', 'Admin')) {
        window.location.href = 'dashboard.html';
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

    loadData();
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
    
    const btnNewStocktake = document.getElementById('btnNewStocktake');
    if (btnNewStocktake) {
        if (tab === 'INV') {
            btnNewStocktake.classList.remove('hidden');
        } else {
            btnNewStocktake.classList.add('hidden');
        }
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
                    <td class="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">${new Date(r.created_at).toLocaleDateString('vi-VN')} ${new Date(r.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</td>
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
                        ${r.evidence_url ? `<a href="${API_BASE_URL.replace('/api', '')}${r.evidence_url}" target="_blank" class="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"><i data-lucide="image" class="w-4 h-4"></i> View</a>` : '<span class="text-gray-400 text-xs italic">N/A</span>'}
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-2.5 py-1 text-xs font-medium rounded-full ${r.status === 'Pending' ? 'bg-amber-50 text-amber-600' : r.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}">
                            ${r.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        ${r.status === 'Pending' ? `<button onclick="openActionModal(${r.discrepancy_id}, 'PO')" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Resolve</button>` : `<button onclick="openActionModal(${r.discrepancy_id}, 'PO')" class="text-gray-500 hover:text-gray-800 text-sm font-medium">View</button>`}
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
                    <td class="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">${new Date(r.created_at).toLocaleDateString('vi-VN')} ${new Date(r.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</td>
                    <td class="px-6 py-4">
                        <div class="font-semibold text-gray-900">${r.product_name}</div>
                        <div class="text-xs text-gray-500">SKU: ${r.sku}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="font-medium text-gray-900">${r.reported_by_name || 'N/A'}</div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="${r.adjustment_type === 'Addition' ? 'text-green-500' : 'text-red-500'} font-bold">${r.adjustment_type === 'Addition' ? '+' : '-'}${r.quantity}</span>
                    </td>
                    <td class="px-6 py-4 text-gray-900 font-medium">${r.reason}</td>
                    <td class="px-6 py-4">
                        ${r.evidence_url ? `<a href="${API_BASE_URL.replace('/api', '')}${r.evidence_url}" target="_blank" class="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"><i data-lucide="image" class="w-4 h-4"></i> View</a>` : '<span class="text-gray-400 text-xs italic">N/A</span>'}
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-2.5 py-1 text-xs font-medium rounded-full ${r.status === 'Pending' ? 'bg-amber-50 text-amber-600' : r.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}">
                            ${r.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        ${r.status === 'Pending' ? `<button onclick="openActionModal(${r.adjustment_id}, 'INV')" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Resolve</button>` : `<button onclick="openActionModal(${r.adjustment_id}, 'INV')" class="text-gray-500 hover:text-gray-800 text-sm font-medium">View</button>`}
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
    document.getElementById('modalReportDate').textContent = new Date(record.created_at).toLocaleString('vi-VN');
    document.getElementById('modalReason').textContent = record.reason;
    
    // Additional Note is not supported by the DB schema, so we hide it or leave empty
    const modalNoteContainer = document.getElementById('modalNote').parentElement;
    if (modalNoteContainer) modalNoteContainer.style.display = 'none';
    
    document.getElementById('resolutionNote').value = record.resolution_note || '';

    if (type === 'PO') {
        document.getElementById('modalSupplierContainer').classList.remove('hidden');
        document.getElementById('modalSupplier').textContent = record.supplier_name || 'N/A';
        document.getElementById('actionModalTitle').textContent = `Resolve Discrepancy: ${record.po_code}`;
        
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
    }

    // Toggle Buttons based on status
    const btnContainer = document.querySelector('#actionModal .border-t');
    if (record.status !== 'Pending') {
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
// INVENTORY STOCKTAKING FEATURE
// ==========================================

let stocktakeProducts = [];

window.openStocktakeModal = async function() {
    const modal = document.getElementById('stocktakeModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    
    document.getElementById('stocktakeTableBody').innerHTML = '<tr><td colspan="6" class="p-6 text-center text-gray-500"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500"></i> Loading products...</td></tr>';
    lucide.createIcons();

    try {
        const res = await fetch(`${API_BASE_URL}/products/list`, { headers: { 'Authorization': `Bearer ${Auth.getToken()}` } });
        const data = await res.json();
        stocktakeProducts = data.data || data;
        stocktakeProducts = stocktakeProducts.filter(p => p.status === 'active');
        
        stocktakeProducts.forEach(p => {
            p.actual_count = p.current_stock;
            p.diff = 0;
            p.reason = '';
            p.evidence_file = null;
        });

        renderStocktakeTable();
    } catch (error) {
        showToast('Cannot load products.', 'error');
        closeStocktakeModal();
    }
};

window.closeStocktakeModal = function() {
    const modal = document.getElementById('stocktakeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    document.getElementById('stocktakeSearch').value = '';
    stocktakeProducts = [];
};

window.renderStocktakeTable = function() {
    const search = document.getElementById('stocktakeSearch').value.toLowerCase().trim();
    const tbody = document.getElementById('stocktakeTableBody');
    tbody.innerHTML = '';

    const filtered = stocktakeProducts.filter(p => {
        const sku = (p.sku || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return sku.includes(search) || name.includes(search);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-6 text-gray-500">No products found.</td></tr>';
        return;
    }

    filtered.forEach(p => {
        let diffColor = 'text-gray-500';
        if (p.diff < 0) diffColor = 'text-red-600 font-semibold';
        else if (p.diff > 0) diffColor = 'text-green-600 font-semibold';

        const tr = document.createElement('tr');
        
        let evidenceHtml = p.diff === 0 
            ? '<span class="text-gray-400 italic text-xs">N/A</span>' 
            : `
                <div class="flex items-center flex-wrap gap-2 justify-center">
                    <label class="cursor-pointer text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-medium bg-blue-50 px-2 py-1 rounded border border-blue-100 transition-colors">
                        <i data-lucide="upload" class="w-3 h-3"></i> ${(p.evidence_files && p.evidence_files.length > 0) ? 'Add' : 'Upload'}
                        <input type="file" accept="image/*" multiple class="hidden" onchange="handleEvidenceUpload(${p.product_id || p.id}, this.files)">
                    </label>
                    ${(p.evidence_previews || []).map((preview, pIdx) => `
                        <div class="relative group">
                            <img src="${preview}" class="w-8 h-8 object-cover rounded cursor-pointer border border-gray-200" onclick="window.open(this.src, '_blank')" />
                            <button onclick="removeEvidenceImage(${p.product_id || p.id}, ${pIdx})" class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <i data-lucide="x" class="w-2.5 h-2.5"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;

        tr.innerHTML = `
            <td class="px-4 py-3"><span class="font-mono text-gray-700">${p.sku}</span></td>
            <td class="px-4 py-3 font-medium text-gray-900">${p.name}</td>
            <td class="px-4 py-3 text-center"><span class="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-700 font-medium">${p.current_stock}</span></td>
            <td class="px-4 py-3 text-center">
                <input type="number" min="0" class="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-center focus:outline-none focus:border-blue-500" value="${p.actual_count}" oninput="updateStocktakeCount(${p.product_id || p.id}, this.value)">
            </td>
            <td class="px-4 py-3 text-center ${diffColor}">${p.diff > 0 ? '+' : ''}${p.diff}</td>
            <td class="px-4 py-3">
                <input type="text" class="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 ${p.diff === 0 ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}" 
                    placeholder="${p.diff === 0 ? 'No changes' : 'Reason...'}" 
                    value="${p.reason || ''}" 
                    ${p.diff === 0 ? 'disabled' : ''}
                    oninput="updateStocktakeReason(${p.product_id || p.id}, this.value)">
            </td>
            <td class="px-4 py-3 text-center">${evidenceHtml}</td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
};

window.updateStocktakeCount = function(id, value) {
    const val = parseInt(value, 10);
    const p = stocktakeProducts.find(x => (x.product_id || x.id) == id);
    if (p) {
        p.actual_count = isNaN(val) ? 0 : val;
        p.diff = p.actual_count - p.current_stock;
        if (p.diff === 0) {
            p.reason = '';
            p.evidence_files = [];
            p.evidence_previews = [];
        }
    }
};

window.updateStocktakeReason = function(id, value) {
    const p = stocktakeProducts.find(x => (x.product_id || x.id) == id);
    if (p) {
        p.reason = value;
    }
};

window.handleEvidenceUpload = async function(id, files) {
    if (!files || files.length === 0) return;
    const p = stocktakeProducts.find(x => (x.product_id || x.id) == id);
    if (p) {
        if (!p.evidence_files) {
            p.evidence_files = [];
            p.evidence_previews = [];
        }
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            p.evidence_files.push(file);
            p.evidence_previews.push(URL.createObjectURL(file));
        }
        renderStocktakeTable();
    }
};

window.removeEvidenceImage = function(id, pIdx) {
    const p = stocktakeProducts.find(x => (x.product_id || x.id) == id);
    if (p && p.evidence_previews) {
        URL.revokeObjectURL(p.evidence_previews[pIdx]);
        p.evidence_previews.splice(pIdx, 1);
        p.evidence_files.splice(pIdx, 1);
        renderStocktakeTable();
    }
};

document.getElementById('stocktakeTableBody').addEventListener('change', (e) => {
    if(e.target.tagName === 'INPUT' && e.target.type === 'number') {
        renderStocktakeTable();
    }
});

window.submitStocktake = async function() {
    const changedItems = stocktakeProducts.filter(p => p.diff !== 0);
    
    if (changedItems.length === 0) {
        showToast('No missing or surplus stock found.', 'info');
        closeStocktakeModal();
        return;
    }

    const missingReason = changedItems.find(p => !(p.reason || '').trim());
    if (missingReason) {
        showToast('Please provide a reason for product: ' + missingReason.name, 'error');
        return;
    }

    const missingEvidence = changedItems.find(p => !p.evidence_files || p.evidence_files.length === 0);
    if (missingEvidence) {
        showToast('Please upload evidence image for product: ' + missingEvidence.name, 'error');
        return;
    }

    const msg = 'Found ' + changedItems.length + ' product(s) with discrepancies. Submit reports for approval?';
    document.getElementById('confirmStocktakeMsg').innerText = msg;
    const overlay = document.getElementById('confirmStocktakeOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
    }
    
    window.proceedStocktakeSubmit = async function() {
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }
        await doSubmitStocktake(changedItems);
    };
};

window.closeConfirmStocktake = function() {
    const overlay = document.getElementById('confirmStocktakeOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
    }
};

async function doSubmitStocktake(changedItems) {
    try {
        const btn = document.querySelector('button[onclick="submitStocktake()"]');
        let originalText = 'Submit Report';
        if (btn) {
            originalText = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Submitting...';
            btn.disabled = true;
        }

        const promises = changedItems.map(async p => {
            let uploadedUrls = [];
            if (p.evidence_files && p.evidence_files.length > 0) {
                for (const file of p.evidence_files) {
                    const formData = new FormData();
                    formData.append('evidence', file);
                    const uploadRes = await fetch(`${API_BASE_URL}/upload/image`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
                        body: formData
                    });
                    const uploadData = await uploadRes.json();
                    if (!uploadRes.ok) throw new Error(uploadData.message || 'Image upload failed');
                    uploadedUrls.push(uploadData.url);
                }
            }

            // Then submit adjustment
            const quantity = Math.abs(p.diff);
            const type = p.diff > 0 ? 'Addition' : 'Deduction';
            
            return fetch(`${API_BASE_URL}/inventory/adjust`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({
                    product_id: p.product_id || p.id,
                    quantity: quantity,
                    type: type,
                    reason: p.reason.trim(),
                    evidence_urls: uploadedUrls
                })
            });
        });

        await Promise.all(promises);
        showToast('Inventory adjustments submitted successfully.', 'success');
        closeStocktakeModal();
        loadData();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
        const btn = document.querySelector('button[onclick="submitStocktake()"]');
        if (btn) {
            btn.innerHTML = 'Submit Report';
            btn.disabled = false;
        }
    }
};
