document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // Configure role-based elements


    // Initialize layout icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Setup event listeners for filters
    document.getElementById('typeFilter').addEventListener('change', applyFiltersAndRender);
    document.getElementById('startDateFilter').addEventListener('change', applyFiltersAndRender);
    document.getElementById('endDateFilter').addEventListener('change', applyFiltersAndRender);

    loadTransactions();
});

let allTransactions = [];

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
}

async function loadTransactions() {
    showLoading('salesTableBody');
    
    try {
        // Fetch both sales transactions (Sell) and purchase orders (Buy)
        let salesData = [];
        let purchasesData = [];

        try {
            const resSales = await API.sales.getTransactions();
            salesData = resSales.data || [];
        } catch (e) {
            console.error('Error fetching sales transactions:', e);
        }

        try {
            const isStaff = Auth.hasRole('staff');
            const resPurchases = await API.orders.getAll(isStaff ? { own_only: 'true' } : {});
            purchasesData = resPurchases.data || [];
        } catch (e) {
            console.error('Error fetching purchase orders:', e);
        }

        // Combine and map
        const mappedSales = salesData.map(s => ({
            id: s.id || s.transaction_id,
            code: s.transaction_code,
            date: new Date(s.transaction_date),
            total: Number(s.total_amount || 0),
            discount: Number(s.discount_amount || 0),
            creator: s.staff_name || 'System',
            type: 'sell',
            typeName: 'Sales',
            status: 'Completed',
            supplier: null,
            actor: s.staff_name || 'System'
        }));

        const mappedPurchases = purchasesData.map(p => {
            const isReceived = p.status === 'Received' || p.status === 'Discrepancy';
            return {
                id: p.id || p.po_id,
                code: p.po_code,
                date: new Date(isReceived && p.received_date ? p.received_date : p.order_date),
                total: Number(p.total_value || p.total_amount || 0),
                compensation: Number(p.compensation_amount || 0),
                discount: 0,
                creator: p.created_by_name || 'System',
                receiver: p.receiver_name || null,
                type: isReceived ? 'receive' : 'buy',
                typeName: isReceived ? 'PO Received' : 'PO Created',
                status: p.status || 'Draft',
                supplier: p.supplier_name || 'N/A',
                actor: isReceived ? (p.receiver_name || p.created_by_name || 'System') : (p.created_by_name || 'System')
            };
        });

        // Combine and sort by date descending
        allTransactions = [...mappedSales, ...mappedPurchases].sort((a, b) => b.date - a.date);

        applyFiltersAndRender();

    } catch (error) {
        document.getElementById('salesTableBody').innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-red-500">
                    <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                    Failed to load transaction history: ${error.message}
                </td>
            </tr>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function applyFiltersAndRender() {
    const tbody = document.getElementById('salesTableBody');
    const emptyState = document.getElementById('emptyState');
    
    const typeFilter = document.getElementById('typeFilter').value;
    const startDateVal = document.getElementById('startDateFilter').value;
    const endDateVal = document.getElementById('endDateFilter').value;

    let filtered = allTransactions;

    // Filter by type
    if (typeFilter !== 'all') {
        if (typeFilter === 'buy') {
            filtered = filtered.filter(t => t.type === 'buy' || t.type === 'receive');
        } else {
            filtered = filtered.filter(t => t.type === typeFilter);
        }
    }

    // Filter by start date
    if (startDateVal) {
        const startDate = new Date(startDateVal);
        startDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(t => t.date >= startDate);
    }

    // Filter by end date
    if (endDateVal) {
        const endDate = new Date(endDateVal);
        endDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(t => t.date <= endDate);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    tbody.innerHTML = filtered.map(t => {
        const dateStr = t.date.toLocaleDateString('vi-VN', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        }) + ' ' + t.date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        // Badge styling for transaction type
        const typeBadge = t.type === 'sell'
            ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>${t.typeName}</span>`
            : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>${t.typeName}</span>`;

        return `
            <tr class="hover:bg-gray-50/50 transition-colors">
                <td class="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">${dateStr}</td>
                <td class="px-6 py-4 text-gray-900 font-semibold text-sm whitespace-nowrap font-mono">${t.code}</td>
                <td class="px-6 py-4 whitespace-nowrap">${typeBadge}</td>
                <td class="px-6 py-4 text-gray-700 text-sm whitespace-nowrap">${t.actor}</td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                    ${(t.type === 'receive' && t.compensation > 0) 
                        ? `<span class="text-gray-900 font-bold">${formatCurrency(t.total - t.compensation)}</span> <span class="text-emerald-600 font-semibold text-xs block">+ ${formatCurrency(t.compensation)}</span>` 
                        : `<span class="text-gray-900 font-bold">${formatCurrency(t.total)}</span>`}
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                    <button onclick="showTransactionDetails(${t.id}, '${t.type}')" class="px-4 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 mx-auto">
                        <i data-lucide="eye" class="w-3.5 h-3.5 text-gray-400"></i> Details
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

async function showTransactionDetails(id, type) {
    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('detailModalTitle');
    const modalCode = document.getElementById('detailModalCode');
    const modalInfo = document.getElementById('detailModalInfo');
    const modalTbody = document.getElementById('detailModalTableBody');

    // Show modal container
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    modalTitle.textContent = type === 'sell' ? 'Sales Details' : 'Purchase Order Details';
    const isReceive = (type === 'receive');
    const qtyHeader = document.getElementById('detailModalQtyHeader');
    if (qtyHeader) {
        qtyHeader.textContent = isReceive ? 'Received / Ordered' : 'Quantity';
    }
    modalTbody.innerHTML = `
        <tr>
            <td colspan="4" class="px-6 py-8 text-center text-gray-400">
                <div class="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading details...
            </td>
        </tr>
    `;

    // Find the general transaction info from local cache
    const txn = allTransactions.find(t => t.id === id && t.type === type);
    if (!txn) {
        modalTbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-red-500">Transaction details not found.</td></tr>';
        return;
    }

    const dateStr = txn.date.toLocaleDateString('vi-VN', {
        year: 'numeric', month: '2-digit', day: '2-digit'
    }) + ' ' + txn.date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    modalCode.textContent = txn.code;

    // Fill general info
    if (type === 'sell') {
        modalInfo.innerHTML = `
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Sales Associate</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${txn.creator}</p>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Transaction Time</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${dateStr}</p>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Discount</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${formatCurrency(txn.discount)}</p>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Paid</p>
                <p class="text-sm font-bold text-emerald-600 mt-0.5">${formatCurrency(txn.total)}</p>
            </div>
        `;
    } else {
        // Status colors
        const statusColors = {
            draft: 'bg-gray-100 text-gray-800 border-gray-200',
            pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            approved: 'bg-blue-50 text-blue-700 border-blue-200',
            shipped: 'bg-purple-50 text-purple-700 border-purple-200',
            completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            cancelled: 'bg-red-50 text-red-700 border-red-200'
        };
        const stKey = String(txn.status).toLowerCase();
        const badgeClass = statusColors[stKey] || 'bg-gray-100 text-gray-800 border-gray-200';

        modalInfo.innerHTML = `
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Supplier</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${txn.supplier}</p>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Created By</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${txn.creator}</p>
            </div>
            ${txn.receiver ? `
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Received By</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${txn.receiver}</p>
            </div>
            ` : ''}
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Order Time</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${dateStr}</p>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Status / Value</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="px-2 py-0.5 rounded text-xs font-bold border ${badgeClass}">${txn.status}</span>
                    ${(txn.type === 'receive' && txn.compensation > 0)
                        ? `<span class="text-sm font-semibold text-gray-500 line-through">${formatCurrency(txn.total)}</span>`
                        : `<span class="text-sm font-bold text-indigo-600">${formatCurrency(txn.total)}</span>`}
                </div>
            </div>
            ${(txn.type === 'receive' && txn.compensation > 0) ? `
            <div>
                <p class="text-xs font-medium text-emerald-600 uppercase tracking-wider">Refund Amount</p>
                <p class="text-sm font-bold text-emerald-600 mt-0.5">+ ${formatCurrency(txn.compensation)}</p>
            </div>
            <div class="col-span-1 md:col-span-2 border-t border-gray-200 pt-3 mt-1">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total After Resolved</p>
                <p class="text-lg font-bold text-gray-900 mt-0.5">${formatCurrency(txn.total - txn.compensation)}</p>
            </div>
            ` : ''}
        `;
    }

    try {
        let items = [];
        let discrepancies = [];
        let staffNote = '';
        if (type === 'sell') {
            const res = await API.sales.getTransactionDetail(id);
            items = res.data || [];
        } else {
            const res = await API.orders.getDetail(id);
            items = res.data || [];
            discrepancies = res.discrepancies || [];
            if (res.order && res.order.staff_note) {
                staffNote = res.order.staff_note;
            }

            if (txn.compensation > 0) {
                const refundAmount = txn.compensation;
                const originalTotal = txn.total;
                const resolvedTotal = txn.total - refundAmount;

                const statusColors = {
                    draft: 'bg-gray-100 text-gray-800 border-gray-200',
                    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                    approved: 'bg-blue-50 text-blue-700 border-blue-200',
                    shipped: 'bg-purple-50 text-purple-700 border-purple-200',
                    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    cancelled: 'bg-red-50 text-red-700 border-red-200'
                };
                const stKey = String(txn.status).toLowerCase();
                const badgeClass = statusColors[stKey] || 'bg-gray-100 text-gray-800 border-gray-200';

                modalInfo.innerHTML = `
                    <div>
                        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Supplier</p>
                        <p class="text-sm font-semibold text-gray-800 mt-0.5">${txn.supplier}</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Created By</p>
                        <p class="text-sm font-semibold text-gray-800 mt-0.5">${txn.creator}</p>
                    </div>
                    ${txn.receiver ? `
                    <div>
                        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Received By</p>
                        <p class="text-sm font-semibold text-gray-800 mt-0.5">${txn.receiver}</p>
                    </div>
                    ` : ''}
                    <div>
                        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Order Time</p>
                        <p class="text-sm font-semibold text-gray-800 mt-0.5">${dateStr}</p>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Status / Value</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="px-2 py-0.5 rounded text-xs font-bold border ${badgeClass}">${txn.status}</span>
                            <span class="text-sm font-semibold text-gray-500 line-through">${formatCurrency(originalTotal)}</span>
                        </div>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-emerald-600 uppercase tracking-wider">Refund Amount</p>
                        <p class="text-sm font-bold text-emerald-600 mt-0.5">+ ${formatCurrency(refundAmount)}</p>
                    </div>
                    <div class="col-span-1 md:col-span-2 border-t border-gray-200 pt-3 mt-1">
                        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total After Resolved</p>
                        <p class="text-lg font-bold text-gray-900 mt-0.5">${formatCurrency(resolvedTotal)}</p>
                    </div>
                `;
            }
        }

        if (staffNote) {
            modalInfo.innerHTML += `
                <div class="col-span-1 md:col-span-2 bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-xs mt-2">
                    <span class="font-bold">Receiving note:</span> ${staffNote}
                </div>
            `;
        }

        if (items.length === 0) {
            modalTbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">No items found in this transaction.</td></tr>';
            return;
        }

        modalTbody.innerHTML = items.map(item => {
            const orderedQty = Number(item.ordered_quantity || item.quantity || 0);
            const receivedQty = Number(item.received_quantity !== undefined && item.received_quantity !== null ? item.received_quantity : orderedQty);
            const unitPrice = Number(item.unit_price || item.unit_cost || 0);
            const total = Number(item.total_amount || item.line_total || (orderedQty * unitPrice));

            let qtyDisplay = '';
            let totalDisplay = formatCurrency(total);

            if (isReceive) {
                const disc = discrepancies.find(x => x.po_item_id === item.po_item_id);
                if (disc) {
                    if (disc.status === 'Resolved') {
                        if (disc.resolution_type === 'refund') {
                            qtyDisplay = `<span class="font-semibold text-[#10B981]">${disc.actual_quantity}</span> <span class="text-red-500 font-semibold">/ ${disc.expected_quantity}</span>`;
                            const originalItemTotal = disc.expected_quantity * unitPrice;
                            const resolvedTotal = disc.actual_quantity * unitPrice;
                            totalDisplay = `<span class="text-gray-400 line-through mr-1">${formatCurrency(originalItemTotal)}</span> <span class="text-gray-900 font-bold">${formatCurrency(resolvedTotal)}</span>`;
                        } else {
                            qtyDisplay = `<span class="font-semibold text-[#10B981]">${disc.actual_quantity}</span> <span class="text-red-500 font-bold" title="Giao bù hàng">+ ${disc.discrepancy_quantity}</span>`;
                        }
                    } else if (disc.status === 'Pending') {
                        qtyDisplay = `<span class="font-semibold text-[#10B981]">${disc.actual_quantity}</span> <span class="text-red-500 font-bold" title="Chờ đối soát">(-${disc.discrepancy_quantity})</span>`;
                    } else {
                        qtyDisplay = `<span class="font-semibold text-[#10B981]">${receivedQty}</span>`;
                    }
                } else {
                    const diff = orderedQty - receivedQty;
                    if (diff > 0) {
                        qtyDisplay = `<span class="font-semibold text-[#10B981]">${receivedQty}</span> <span class="text-red-500 font-semibold">+ ${diff}</span>`;
                    } else {
                        qtyDisplay = `<span class="font-semibold text-[#10B981]">${receivedQty}</span>`;
                    }
                }
            } else {
                qtyDisplay = `<span class="font-semibold text-gray-800">${orderedQty}</span>`;
            }

            return `
                <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-6 py-4">
                        <div class="text-sm font-semibold text-gray-900">${item.product_name || 'Unknown Product'}</div>
                        <div class="text-xs text-gray-400 font-mono">SKU: ${item.sku || '--'}</div>
                    </td>
                    <td class="px-6 py-4 text-center text-sm">${qtyDisplay}</td>
                    <td class="px-6 py-4 text-right text-sm text-gray-500">${formatCurrency(unitPrice)}</td>
                    <td class="px-6 py-4 text-right text-sm font-bold text-gray-900">${totalDisplay}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        modalTbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-red-500">
                    Failed to load items list: ${error.message}
                </td>
            </tr>
        `;
    }
}

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Add closeDetailModal to window context to make it callable from onclick
window.closeDetailModal = closeDetailModal;
window.showTransactionDetails = showTransactionDetails;
