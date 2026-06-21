document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // Configure role-based elements
    const btnImportData = document.getElementById('btnImportData');
    if (btnImportData && Auth.hasRole('manager', 'admin')) {
        btnImportData.classList.remove('hidden');
    }

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
            creator: s.staff_name || 'Hệ thống',
            type: 'sell',
            typeName: 'Bán hàng',
            status: 'Completed',
            supplier: null
        }));

        const mappedPurchases = purchasesData.map(p => ({
            id: p.id || p.po_id,
            code: p.po_code,
            date: new Date(p.order_date),
            total: Number(p.total_value || p.total_amount || 0),
            discount: 0,
            creator: p.created_by_name || 'Hệ thống',
            receiver: p.receiver_name || null,
            type: 'buy',
            typeName: 'Nhập hàng',
            status: p.status || 'Draft',
            supplier: p.supplier_name || 'N/A'
        }));

        // Combine and sort by date descending
        allTransactions = [...mappedSales, ...mappedPurchases].sort((a, b) => b.date - a.date);

        applyFiltersAndRender();

    } catch (error) {
        document.getElementById('salesTableBody').innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-red-500">
                    <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                    Không thể tải lịch sử giao dịch: ${error.message}
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
        filtered = filtered.filter(t => t.type === typeFilter);
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
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Badge styling for transaction type
        const typeBadge = t.type === 'sell'
            ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>${t.typeName}</span>`
            : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>${t.typeName}</span>`;

        return `
            <tr class="hover:bg-gray-50/50 transition-colors">
                <td class="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">${dateStr}</td>
                <td class="px-6 py-4 text-gray-900 font-semibold text-sm whitespace-nowrap font-mono">${t.code}</td>
                <td class="px-6 py-4 whitespace-nowrap">${typeBadge}</td>
                <td class="px-6 py-4 text-gray-700 text-sm whitespace-nowrap">${t.type === 'buy' ? (t.receiver || t.creator) : t.creator}</td>
                <td class="px-6 py-4 text-right text-gray-900 font-bold whitespace-nowrap">$${t.total.toFixed(2)}</td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                    <button onclick="showTransactionDetails(${t.id}, '${t.type}')" class="px-4 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 mx-auto">
                        <i data-lucide="eye" class="w-3.5 h-3.5 text-gray-400"></i> Chi tiết
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

    modalTitle.textContent = type === 'sell' ? 'Chi tiết hóa đơn bán hàng' : 'Chi tiết đơn nhập hàng';
    modalTbody.innerHTML = `
        <tr>
            <td colspan="4" class="px-6 py-8 text-center text-gray-400">
                <div class="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Đang tải chi tiết...
            </td>
        </tr>
    `;

    // Find the general transaction info from local cache
    const txn = allTransactions.find(t => t.id === id && t.type === type);
    if (!txn) {
        modalTbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-red-500">Không tìm thấy thông tin giao dịch.</td></tr>';
        return;
    }

    const dateStr = txn.date.toLocaleDateString('vi-VN', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    modalCode.textContent = txn.code;

    // Fill general info
    if (type === 'sell') {
        modalInfo.innerHTML = `
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Nhân viên bán hàng</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${txn.creator}</p>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Thời gian giao dịch</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${dateStr}</p>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Giảm giá hóa đơn</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">$${txn.discount.toFixed(2)}</p>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Tổng cộng thanh toán</p>
                <p class="text-sm font-bold text-emerald-600 mt-0.5">$${txn.total.toFixed(2)}</p>
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
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Nhà cung cấp (Supplier)</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${txn.supplier}</p>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Nhân viên tạo đơn</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${txn.creator}</p>
            </div>
            ${txn.receiver ? `
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Nhân viên nhận hàng</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${txn.receiver}</p>
            </div>
            ` : ''}
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Thời gian đặt hàng</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">${dateStr}</p>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Trạng thái / Giá trị</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="px-2 py-0.5 rounded text-xs font-bold border ${badgeClass}">${txn.status}</span>
                    <span class="text-sm font-bold text-indigo-600">$${txn.total.toFixed(2)}</span>
                </div>
            </div>
        `;
    }

    try {
        let items = [];
        let staffNote = '';
        if (type === 'sell') {
            const res = await API.sales.getTransactionDetail(id);
            items = res.data || [];
        } else {
            const res = await API.orders.getDetail(id);
            items = res.data || [];
            if (res.order && res.order.staff_note) {
                staffNote = res.order.staff_note;
            }
        }

        if (staffNote) {
            modalInfo.innerHTML += `
                <div class="col-span-1 md:col-span-2 bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-xs mt-2">
                    <span class="font-bold">Ghi chú nhận hàng:</span> ${staffNote}
                </div>
            `;
        }

        if (items.length === 0) {
            modalTbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">Giao dịch này không chứa sản phẩm nào.</td></tr>';
            return;
        }

        modalTbody.innerHTML = items.map(item => {
            const qty = Number(item.quantity || item.ordered_quantity || 0);
            const unitPrice = Number(item.unit_price || item.unit_cost || 0);
            const total = Number(item.total_amount || item.line_total || (qty * unitPrice));

            return `
                <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-6 py-4">
                        <div class="text-sm font-semibold text-gray-900">${item.product_name || 'Không rõ tên'}</div>
                        <div class="text-xs text-gray-400 font-mono">SKU: ${item.sku || '--'}</div>
                    </td>
                    <td class="px-6 py-4 text-center text-sm font-semibold text-gray-800">${qty}</td>
                    <td class="px-6 py-4 text-right text-sm text-gray-500">$${unitPrice.toFixed(2)}</td>
                    <td class="px-6 py-4 text-right text-sm font-bold text-gray-900">$${total.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        modalTbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-red-500">
                    Không thể tải danh sách sản phẩm: ${error.message}
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
