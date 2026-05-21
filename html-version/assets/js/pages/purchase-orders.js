lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

let allOrders  = [];
let isUsingMock = false;

// Mock fallback khi backend offline
const MOCK_ORDERS = [
    { id: 1, order_number: "PO-2024-001", supplier_name: "TechSupply Inc.",    created_at: "2024-03-20", status: "received", total_amount: 15420 },
    { id: 2, order_number: "PO-2024-002", supplier_name: "Global Electronics",  created_at: "2024-03-22", status: "ordered",  total_amount: 28350 },
    { id: 3, order_number: "PO-2024-003", supplier_name: "Accessory Warehouse", created_at: "2024-03-23", status: "pending",  total_amount: 12600 },
    { id: 4, order_number: "PO-2024-004", supplier_name: "Premium Parts Ltd.Thanh",  created_at: "2024-03-24", status: "pending",  total_amount: 45200 },
];

const statusConfig = {
    pending:   { label: "Pending",   color: "bg-orange-100 text-orange-700" },
    ordered:   { label: "Ordered",   color: "bg-blue-100 text-blue-700" },
    received:  { label: "Received",  color: "bg-[#10B981]/10 text-[#10B981]" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
    completed: { label: "Completed", color: "bg-[#10B981]/10 text-[#10B981]" },
};

const statusFilter        = document.getElementById('statusFilter');
const tableBody           = document.getElementById('tableBody');
const emptyState          = document.getElementById('emptyState');
const statsCardsContainer = document.getElementById('statsCardsContainer');

// ============================================================
// LOAD từ API
// ============================================================
async function loadOrders() {
    if (tableBody) showLoading('tableBody');
    try {
        const result = await API.orders.getAll(); // GET /api/purchases/list
        allOrders    = (result.data || result).map(o => ({
            id:            o.id,
            order_number:  o.order_number,
            supplier_name: o.supplier_name || o.supplier || '--',
            created_at:    o.created_at || o.order_date || '',
            status:        o.status || 'pending',
            total_amount:  parseFloat(o.total_amount || 0),
        }));
        isUsingMock = false;
        console.log(`Loaded ${allOrders.length} purchase orders from backend.`);
    } catch (err) {
        console.warn('[PO] Backend offline → mock:', err.message);
        allOrders   = [...MOCK_ORDERS];
        isUsingMock = true;
        showToast('Using demo data — backend not connected.', 'warning');
    }
    renderStats();
    renderTable();
}

// ============================================================
// STATS CARDS
// ============================================================
function renderStats() {
    const total     = allOrders.length;
    const pending   = allOrders.filter(o => o.status === 'pending').length;
    const received  = allOrders.filter(o => o.status === 'received' || o.status === 'completed').length;
    const totalVal  = allOrders.reduce((s, o) => s + o.total_amount, 0);

    statsCardsContainer.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="text-sm text-gray-500 mb-1">Total Orders</div>
            <div class="text-2xl font-semibold text-gray-900">${total}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="text-sm text-gray-500 mb-1">Pending</div>
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

// ============================================================
// RENDER BẢNG
// ============================================================
function renderTable() {
    const filter   = statusFilter?.value || 'all';
    const filtered = filter === 'all' ? allOrders : allOrders.filter(o => o.status === filter);

    tableBody.innerHTML = '';
    if (filtered.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    filtered.forEach((order, i) => {
        const bgClass   = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
        const cfg       = statusConfig[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' };
        const canEdit   = order.status !== 'received' && order.status !== 'completed';
        const createdAt = order.created_at ? order.created_at.split('T')[0] : '--';

        const tr = document.createElement('tr');
        tr.className = `hover:bg-gray-50 transition-colors duration-150 ${bgClass}`;
        tr.innerHTML = `
            <td class="px-6 py-4"><span class="font-medium text-gray-900">${order.order_number}</span></td>
            <td class="px-6 py-4"><span class="text-gray-700">${order.supplier_name}</span></td>
            <td class="px-6 py-4"><span class="text-gray-600">${formatDate(createdAt)}</span></td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${cfg.color}">${cfg.label}</span>
            </td>
            <td class="px-6 py-4 text-right"><span class="font-semibold text-gray-900">${formatCurrency(order.total_amount)}</span></td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="viewDetail(${order.id})" class="p-2 text-gray-600 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-all" title="View Details">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    
                    ${order.status !== 'completed' && order.status !== 'received' ? `
                    <button onclick="confirmReceiving(${order.id})" class="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Confirm Receive (Import Stock)">
                        <i data-lucide="check-square" class="w-4 h-4"></i>
                    </button>
                    ` : ''}

                    ${canEdit ? `<button onclick="editOrder(${order.id})" class="p-2 text-gray-600 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>` : ''}
                </div>
            </td>`;
        tableBody.appendChild(tr);
    });
    lucide.createIcons();
}

// ============================================================
// VIEW DETAILS — GET /api/purchases/detail/:id
// ============================================================
window.viewDetail = async function (id) {
    const order = allOrders.find(o => o.id === id);
    if (!order) return;

    document.getElementById('detailOrderNumber').textContent = order.order_number;
    document.getElementById('detailContent').innerHTML = '<div class="py-4 text-center text-gray-400">Loading details...</div>';

    const modal = document.getElementById('detailModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
        const result  = await API.orders.getDetail(id); // GET /api/purchases/detail/:id
        const details = result.data || [];

        if (details.length === 0) {
            document.getElementById('detailContent').innerHTML = `
                <div class="mb-4 p-4 bg-gray-50 rounded-xl grid grid-cols-2 gap-3 text-sm">
                    <div><span class="text-gray-500">Supplier:</span> <strong>${order.supplier_name}</strong></div>
                    <div><span class="text-gray-500">Status:</span> <strong>${order.status}</strong></div>
                    <div><span class="text-gray-500">Total:</span> <strong>${formatCurrency(order.total_amount)}</strong></div>
                </div>
                <p class="text-gray-400 text-center py-4">No item details found.</p>`;
            return;
        }

        const rows = details.map(d => `
            <tr class="border-b border-gray-100">
                <td class="py-2 pr-4 text-gray-900 font-medium">${d.product_name || '--'}</td>
                <td class="py-2 pr-4 text-center text-gray-700">${d.quantity}</td>
                <td class="py-2 pr-4 text-right text-gray-700">${formatCurrency(d.unit_price)}</td>
                <td class="py-2 text-right font-semibold text-gray-900">${formatCurrency(d.total_amount)}</td>
            </tr>`).join('');

        document.getElementById('detailContent').innerHTML = `
            <div class="mb-4 p-4 bg-gray-50 rounded-xl grid grid-cols-2 gap-3 text-sm">
                <div><span class="text-gray-500">Supplier:</span> <strong>${order.supplier_name}</strong></div>
                <div><span class="text-gray-500">Status:</span> <strong>${order.status}</strong></div>
                <div><span class="text-gray-500">Total:</span> <strong>${formatCurrency(order.total_amount)}</strong></div>
            </div>
            <table class="w-full text-sm">
                <thead><tr class="border-b-2 border-gray-200">
                    <th class="py-2 pr-4 text-left text-gray-600 font-semibold">Product</th>
                    <th class="py-2 pr-4 text-center text-gray-600 font-semibold">Qty</th>
                    <th class="py-2 pr-4 text-right text-gray-600 font-semibold">Unit Price</th>
                    <th class="py-2 text-right text-gray-600 font-semibold">Total</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
    } catch (err) {
        document.getElementById('detailContent').innerHTML = `<p class="text-red-500">Failed to load details: ${err.message}</p>`;
    }
    lucide.createIcons();
};

window.closeDetailModal = function () {
    const modal = document.getElementById('detailModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

// ============================================================
// EDIT ORDER (placeholder — sửa status)
// ============================================================
window.editOrder = function (id) {
    const order = allOrders.find(o => o.id === id);
    if (!order) return;
    showToast(`Edit order ${order.order_number} — coming soon.`, 'info');
};

// ============================================================
// CREATE PO — POST /api/purchases/create
// ============================================================
window.openCreatePOModal = async function () {
    document.getElementById('createPOForm').reset();
    const errEl = document.getElementById('createPOError');
    if (errEl) errEl.classList.add('hidden');
    
    window.currentOrderItems = [];
    document.getElementById('poItemsListUI').innerHTML = '<li class="py-2 text-gray-400 italic">No products selected yet.</li>';
    document.getElementById('poTotalAmount').value = "0.00";

    // NẠP DỮ LIỆU VÀO ĐẦU THẺ DATALIST ĐỂ GỢI Ý
    const datalist = document.getElementById('productsDatalist');
    if (datalist) {
        datalist.innerHTML = '';
        try {
            const result = await API.products.getAll();
            window.dbProductsList = result.data || result; // Lưu lại danh sách sản phẩm gốc để lát nữa check ID
            
            window.dbProductsList.forEach(p => {
                const option = document.createElement('option');
                option.value = p.name; // Khi gõ tên, trình duyệt sẽ gợi ý theo tên sản phẩm
                datalist.appendChild(option);
            });
        } catch (error) {
            console.error('Lỗi tải danh sách gợi ý sản phẩm:', error);
        }
    }

    const modal = document.getElementById('createPOModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
};

window.closeCreatePOModal = function () {
    const modal = document.getElementById('createPOModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

document.getElementById('createPOForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn   = document.getElementById('createPOBtn');
    const errEl = document.getElementById('createPOError');
    if (errEl) errEl.classList.add('hidden');

    const payload = {
        order_number:  document.getElementById('poOrderNumber').value.trim(),
        supplier_name: document.getElementById('poSupplier').value.trim(),
        total_amount:  parseFloat(document.getElementById('poTotalAmount').value) || 0,
        status:        document.getElementById('poStatus').value,
        items: [] // backend yêu cầu items array — để trống, sẽ thêm sau
    };

    if (!payload.order_number) {
        if (errEl) { errEl.textContent = 'Order number is required.'; errEl.classList.remove('hidden'); }
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating...';
    try {
        await API.orders.create(payload); // POST /api/purchases/create
        closeCreatePOModal();
        await loadOrders();
        showToast('✅ Purchase order created!', 'success');
    } catch (err) {
        if (errEl) { errEl.textContent = err.message || 'Failed to create order.'; errEl.classList.remove('hidden'); }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Order';
    }
});

// ============================================================
// HELPERS
// ============================================================
function formatCurrency(v) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);
}
function formatDate(str) {
    if (!str || str === '--') return '--';
    const d = new Date(str);
    return isNaN(d) ? str : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Event listener
if (statusFilter) statusFilter.addEventListener('change', renderTable);

// ============================================================
// SỰ KIỆN XÁC NHẬN NHẬP HÀNG CHUẨN ĐỒNG BỘ
// ============================================================
window.confirmReceiving = async function(id) {
    if (!confirm('Bạn có chắc chắn muốn xác nhận đã nhận đơn hàng này? Hệ thống sẽ cập nhật trạng thái và cộng dồn số lượng vào kho tồn của sản phẩm.')) return;
    
    try {
        // SỬA TẠI ĐÂY: Gọi trực tiếp đường dẫn API chuẩn của Backend (Cổng 5000) mà ta đã cấu hình
        const response = await fetch(`http://localhost:5000/api/purchases/receive/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
                // Nếu Kiệt có bắt đăng nhập dùng Token thì mở dòng dưới ra:
                // 'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).then(res => res.json());
        
        // Kiểm tra kết quả trả về từ Backend
        if (response.success) {
            if (typeof showToast === 'function') {
                showToast('Xác nhận nhập kho và cập nhật số tồn sản phẩm thành công!', 'success');
            } else {
                alert('Xác nhận nhập kho và cập nhật số tồn sản phẩm thành công!');
            }
            
            // Tải lại dữ liệu bảng động ngay lập tức
            await loadOrders(); 
        } else {
            alert('Lỗi từ hệ thống: ' + response.message);
        }
    } catch (error) {
        console.error('Lỗi khi gọi API nhận hàng:', error);
        alert('Không thể kết nối đến máy chủ Backend: ' + error.message);
    }
};

// Biến toàn cục lưu danh sách sản phẩm được chọn tạm thời trên giao diện
window.currentOrderItems = [];

document.getElementById('addPOItemBtn')?.addEventListener('click', function() {
    const nameInput = document.getElementById('poItemProductName');
    const qtyInput = document.getElementById('poItemQty');
    
    const productName = nameInput.value.trim();
    const quantity = parseInt(qtyInput.value) || 0;
    
    if (!productName || quantity <= 0) {
        alert('Vui lòng nhập tên sản phẩm hợp lệ và số lượng lớn hơn 0!');
        return;
    }

    // Kiểm tra xem tên vừa nhập đã tồn tại trong DB chưa
    const existingProd = window.dbProductsList ? window.dbProductsList.find(p => p.name.toLowerCase() === productName.toLowerCase()) : null;
    
    let itemData = {
        product_name: productName,
        quantity: quantity,
        unit_price: existingProd ? parseFloat(existingProd.selling_price || 0) : 10.00 // Nếu mới tinh thì mặc định tạm $10 hoặc cho nhập giá
    };

    if (existingProd) {
        itemData.product_id = existingProd.id; // Sản phẩm cũ có ID thật
    } else {
        itemData.product_id = null; // Sản phẩm mới tinh chưa có ID
        itemData.is_new_product = true; // Đánh dấu để Backend biết đường xử lý tự tạo sản phẩm mới
    }

    // Đẩy vào mảng tạm
    window.currentOrderItems.push(itemData);

    // Cập nhật lên giao diện cho người dùng nhìn thấy
    renderSelectedItemsUI();

    // Reset ô nhập để người dùng gõ tiếp sản phẩm thứ 2
    nameInput.value = '';
    qtyInput.value = '1';
});

// Hàm vẽ danh sách sản phẩm tạm thời lên giao diện
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
                    <span class="text-gray-400 block text-[11px]">Qty: ${item.quantity} x $${item.unit_price.toFixed(2)}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-semibold">$${itemTotal.toFixed(2)}</span>
                    <button type="button" onclick="removeSelectedItem(${index})" class="text-red-500 hover:text-red-700 font-bold px-1">✕</button>
                </div>
            </li>
        `;
    }).join('');

    // Cập nhật tổng số tiền tự động vào ô Total Amount
    document.getElementById('poTotalAmount').value = totalOrderAmount.toFixed(2);
}

// Hàm xóa sản phẩm khỏi danh sách chọn tạm thời
window.removeSelectedItem = function(index) {
    window.currentOrderItems.splice(index, 1);
    renderSelectedItemsUI();
};

// Khởi động
loadOrders();