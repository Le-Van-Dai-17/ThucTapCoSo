lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

const params = new URLSearchParams(window.location.search);
let id = params.get('id');
let supplier = null;
let products = [];
let orders = [];

function unwrap(res) { return Array.isArray(res) ? res : (res?.data || []); }
function money(value) { return `${Math.round(Number(value || 0)).toLocaleString('vi-VN')} d`; }
function fmtDate(value) { return value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '--'; }
function statusBadge(status) {
    const s = String(status || 'Draft').toLowerCase();
    const cls = s.includes('received') || s.includes('completed') ? 'bg-green-50 text-green-700' : s.includes('pending') ? 'bg-orange-50 text-orange-700' : s.includes('approved') ? 'bg-blue-50 text-blue-700' : s.includes('cancel') ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700';
    return `<span class="px-3 py-1 rounded-lg text-xs font-semibold ${cls}">${status || 'Draft'}</span>`;
}

async function loadDetail() {
    try {
        const [supplierRes, productRes, orderRes] = await Promise.all([API.suppliers.getAll(), API.products.getAll().catch(() => []), API.orders.getAll().catch(() => [])]);
        const suppliers = unwrap(supplierRes);
        if (!id && suppliers.length) id = suppliers[0].supplier_id || suppliers[0].id;
        supplier = suppliers.find(s => String(s.supplier_id || s.id) === String(id));
        products = unwrap(productRes).filter(p => String(p.supplier_id || '') === String(id));
        orders = unwrap(orderRes).filter(o => String(o.supplier_id || '') === String(id));
        if (!supplier) throw new Error('Supplier not found');
        renderDetail();
    } catch (error) {
        document.getElementById('supplierName').textContent = error.message;
        showToast(`Cannot load supplier detail: ${error.message}`, 'error');
    }
}

function renderDetail() {
    const name = supplier.name || 'Supplier';
    document.getElementById('supplierName').textContent = name;
    document.getElementById('editSupplierBtn').href = `supplier-form.html?id=${id}`;
    document.getElementById('createPOBtn').href = `purchase-order-form.html?supplier_id=${id}`;
    document.getElementById('viewHistoryBtn').href = `purchase-orders.html?supplier=${encodeURIComponent(name)}`;
    const openOrders = orders.filter(o => !['received', 'completed', 'cancelled'].includes(String(o.status || '').toLowerCase())).length;
    const lastOrder = orders.slice().sort((a, b) => new Date(b.order_date || b.created_at || 0) - new Date(a.order_date || a.created_at || 0))[0];
    const categories = new Set(products.map(p => p.category || p.category_name).filter(Boolean));

    document.getElementById('detailStats').innerHTML = [
        ['Products Supplied', products.length, `Across ${categories.size || 0} categories`, 'box', 'blue'],
        ['Average Lead Time', `${supplier.lead_time_days || 0} days`, 'Across all products', 'clock', 'purple'],
        ['Open POs', openOrders, 'Total open purchase orders', 'shopping-cart', 'orange'],
        ['Last Delivery', lastOrder ? fmtDate(lastOrder.expected_delivery_date || lastOrder.order_date) : '--', lastOrder ? 'Most recent PO activity' : 'No received order yet', 'calendar-days', 'green']
    ].map(([label, value, sub, icon, tone]) => {
        const tones = { blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600', orange: 'bg-orange-50 text-orange-600', green: 'bg-green-50 text-green-600' };
        return `<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-5"><div class="w-14 h-14 rounded-2xl ${tones[tone]} flex items-center justify-center"><i data-lucide="${icon}" class="w-7 h-7"></i></div><div><p class="text-sm text-gray-500">${label}</p><p class="text-2xl font-semibold text-gray-950 mt-1">${value}</p><p class="text-sm text-gray-500 mt-2">${sub}</p></div></div>`;
    }).join('');

    document.getElementById('companyInfo').innerHTML = `
        <div><p class="text-gray-500">Supplier Name</p><p class="font-semibold mt-1">${name}</p></div>
        <div><p class="text-gray-500">Address</p><p class="font-semibold mt-1">${supplier.address || '--'}</p></div>
        <div><p class="text-gray-500">Contact Person</p><p class="font-semibold mt-1">${supplier.contact_name || supplier.contact_person || '--'}</p></div>
        <div><p class="text-gray-500">Tax Code</p><p class="font-semibold mt-1">${supplier.tax_code || '--'}</p></div>
        <div><p class="text-gray-500">Phone</p><p class="font-semibold mt-1">${supplier.phone || '--'}</p></div>
        <div><p class="text-gray-500">Notes</p><p class="font-semibold mt-1">${supplier.notes || '--'}</p></div>
        <div><p class="text-gray-500">Email</p><p class="font-semibold mt-1">${supplier.email || '--'}</p></div>
    `;

    // Tính toán On-time Delivery Rate
    const receivedOrders = orders.filter(o => o.status === 'Received');
    let onTimeCount = 0;
    receivedOrders.forEach(o => {
        if (o.received_date && o.expected_delivery_date) {
            if (new Date(o.received_date) <= new Date(o.expected_delivery_date)) onTimeCount++;
        } else {
            // Nếu không có received_date, coi như On-time (mặc định)
            onTimeCount++;
        }
    });
    const onTimeRate = receivedOrders.length ? Math.round((onTimeCount / receivedOrders.length) * 100) : 100;
    
    // Màu sắc cho AI Relevance
    const aiLevel = supplier.ai_relevance || 'Medium';
    const aiColors = {
        'High': 'border-green-100 bg-green-50 text-green-700',
        'Medium': 'border-yellow-100 bg-yellow-50 text-yellow-700',
        'Low': 'border-gray-200 bg-gray-50 text-gray-600'
    };

    document.getElementById('logisticsInfo').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-5 text-sm"><div class="flex justify-between"><span class="text-gray-500">Lead Time</span><b>${supplier.lead_time_days || 0} days</b></div><div class="flex justify-between"><span class="text-gray-500">Minimum Order Value</span><b>${money(supplier.min_order_value || 0)}</b></div><div class="flex justify-between"><span class="text-gray-500">Payment Terms</span><b>${supplier.payment_terms || 'Net 30'}</b></div></div>
            <div><div class="flex justify-between text-sm"><span class="text-gray-500">On-time Delivery Rate</span><b class="${onTimeRate >= 90 ? 'text-green-600' : 'text-orange-600'}">${onTimeRate}%</b></div><div class="h-2 rounded-full bg-gray-100 mt-3"><div class="h-full rounded-full ${onTimeRate >= 90 ? 'bg-green-500' : 'bg-orange-400'}" style="width:${onTimeRate}%"></div></div><p class="text-sm text-gray-500 mt-5">AI Relevance</p><div class="mt-2 inline-flex items-center gap-2 rounded-lg border ${aiColors[aiLevel]} px-4 py-2 font-semibold"><i data-lucide="sparkles" class="w-4 h-4"></i> ${aiLevel}</div></div>
        </div>`;

    renderProducts();
    renderOrders();
    renderPerformance();
    lucide.createIcons();
}

function renderProducts() {
    const body = document.getElementById('productsBody');
    const visible = products.slice(0, 5);
    body.innerHTML = visible.length ? visible.map(p => `<tr><td class="px-5 py-3 font-semibold">${p.name || '--'}</td><td class="px-5 py-3 text-gray-600">${p.category || p.category_name || '--'}</td><td class="px-5 py-3 text-right">${p.current_stock || 0} ${p.unit || ''}</td><td class="px-5 py-3 text-right">${p.warning_stock_level || p.min_stock_level || 0} ${p.unit || ''}</td><td class="px-5 py-3 text-right font-semibold">${money(p.cost_price || 0)}</td></tr>`).join('') : '<tr><td colspan="5" class="px-5 py-10 text-center text-gray-500">No products found for this supplier.</td></tr>';
    document.getElementById('productCountLabel').textContent = `Showing ${visible.length} of ${products.length} products`;
}

function renderOrders() {
    const body = document.getElementById('ordersBody');
    const visible = orders.slice(0, 5);
    body.innerHTML = visible.length ? visible.map(o => `<tr><td class="px-5 py-3 font-semibold">${o.order_number || o.po_id || o.purchase_order_id || '--'}</td><td class="px-5 py-3 text-gray-600">${fmtDate(o.order_date || o.created_at)}</td><td class="px-5 py-3 text-center">${statusBadge(o.status)}</td><td class="px-5 py-3 text-right font-semibold">${money(o.total_amount || o.total_value || 0)}</td></tr>`).join('') : '<tr><td colspan="4" class="px-5 py-10 text-center text-gray-500">No purchase orders found.</td></tr>';
    document.getElementById('orderCountLabel').textContent = `Showing ${visible.length} of ${orders.length} orders`;
}

function renderPerformance(perfData) {
    if (!perfData) return;
    
    document.getElementById('kpiReliability').textContent = `${perfData.reliability}%`;
    document.getElementById('kpiAvgDelay').textContent = `${perfData.avgDelay} days`;
    document.getElementById('kpiDefectRate').textContent = `${perfData.defectRate}%`;

    const monthlyVolume = perfData.monthlyVolume || [];
    if (monthlyVolume.length === 0) {
        document.getElementById('performanceBars').innerHTML = '<p class="text-sm text-gray-400 w-full text-center pb-4">No recent purchase orders</p>';
        return;
    }

    const maxOrders = Math.max(...monthlyVolume.map(m => m.order_count), 1);
    
    document.getElementById('performanceBars').innerHTML = monthlyVolume.map((m, i) => {
        const heightPercent = (m.order_count / maxOrders) * 100;
        return `<div class="flex-1 flex flex-col items-center justify-end gap-2">
            <div class="w-full max-w-16 rounded-t-lg bg-blue-200 hover:bg-blue-300 transition-colors relative group" style="height:${Math.max(10, heightPercent)}%">
                <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ${m.order_count} POs
                </div>
            </div>
            <p class="text-xs text-gray-500">${m.month_name}</p>
        </div>`;
    }).join('');
}

async function loadPerformance() {
    try {
        const res = await API.suppliers.getPerformance(id);
        renderPerformance(res);
    } catch (error) {
        console.warn('Could not load supplier performance:', error);
    }
}

loadDetail();
loadPerformance();
