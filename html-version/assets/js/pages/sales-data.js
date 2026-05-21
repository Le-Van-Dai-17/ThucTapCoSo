lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

// Mock data fallback
const MOCK_SALES = [
    { id: 1, sale_date: "2024-03-01", product_name: "Wireless Bluetooth Headphones", quantity: 15, unit_price: 89.99,  total_amount: 1349.85 },
    { id: 2, sale_date: "2024-03-01", product_name: "Smart Watch Series 5",          quantity: 8,  unit_price: 299.99, total_amount: 2399.92 },
    { id: 3, sale_date: "2024-03-02", product_name: "Laptop Stand Aluminum",          quantity: 22, unit_price: 45.50,  total_amount: 1001.00 },
    { id: 4, sale_date: "2024-03-02", product_name: "Mechanical Keyboard RGB",        quantity: 12, unit_price: 129.99, total_amount: 1559.88 },
    { id: 5, sale_date: "2024-03-03", product_name: "Wireless Mouse Ergonomic",       quantity: 31, unit_price: 49.99,  total_amount: 1549.69 },
    { id: 6, sale_date: "2024-03-04", product_name: "Wireless Bluetooth Headphones",  quantity: 19, unit_price: 89.99,  total_amount: 1709.81 },
    { id: 7, sale_date: "2024-03-05", product_name: "Smart Watch Series 5",           quantity: 11, unit_price: 299.99, total_amount: 3299.89 },
    { id: 8, sale_date: "2024-03-06", product_name: "Laptop Stand Aluminum",          quantity: 28, unit_price: 45.50,  total_amount: 1274.00 },
];

let allSalesData  = [];
let chartInstance = null;

const startDateInput = document.getElementById('startDate');
const endDateInput   = document.getElementById('endDate');
const productFilter  = document.getElementById('productFilter');
const statsCards     = document.getElementById('statsCards');
const tableBody      = document.getElementById('tableBody');
const emptyState     = document.getElementById('emptyState');
const tableFooter    = document.getElementById('tableFooter');
const exportBtn      = document.getElementById('exportBtn');

if (startDateInput) startDateInput.value = '2024-03-01';
if (endDateInput)   endDateInput.value   = '2024-03-14';

async function loadSalesData() {
    showLoading('tableBody');
    try {
        const result = await API.sales.getAll();
        // Map đúng field từ DB của Kiệt (salesController.js → getSalesSummary)
        allSalesData = (result.data || result).map(item => ({
            id:           item.id,
            sale_date:    item.sale_date?.split('T')[0] || item.sale_date, // cắt phần giờ nếu có
            product_name: item.product_name || item.name || 'Unknown',
            quantity:     item.quantity ?? item.quantity_sold ?? 0,
            unit_price:   parseFloat(item.unit_price  ?? 0),
            total_amount: parseFloat(item.total_amount ?? item.quantity * item.unit_price ?? 0)
        }));
        console.log(`✅ Loaded ${allSalesData.length} sales records from backend.`);
    } catch (err) {
        console.warn('[Sales] Backend offline → dùng mock:', err.message);
        allSalesData = [...MOCK_SALES];
        showToast('⚠️ Đang dùng dữ liệu demo — backend chưa kết nối.', 'warning');
    }
    populateProductFilter();
    renderUI();
}

// Điền danh sách sản phẩm vào dropdown lọc
function populateProductFilter() {
    if (!productFilter) return;
    const existing  = Array.from(productFilter.options).map(o => o.value);
    const products  = [...new Set(allSalesData.map(d => d.product_name))].sort();
    products.forEach(prod => {
        if (!existing.includes(prod)) {
            const opt = document.createElement('option');
            opt.value = opt.textContent = prod;
            productFilter.appendChild(opt);
        }
    });
}

// Format helpers
function formatCurrency(v) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);
}
function formatDate(dateStr) {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Render toàn bộ UI (stats + bảng + chart)
function renderUI() {
    const start = startDateInput?.value || '';
    const end   = endDateInput?.value   || '';
    const prod  = productFilter?.value  || 'All Products';

    const filtered = allSalesData.filter(r => {
        const matchProd = prod === 'All Products' || r.product_name === prod;
        const matchDate = (!start || r.sale_date >= start) && (!end || r.sale_date <= end);
        return matchProd && matchDate;
    });

    const totalQty = filtered.reduce((s, r) => s + r.quantity, 0);
    const totalRev = filtered.reduce((s, r) => s + r.total_amount, 0);

    // Stats cards
    if (statsCards) {
        statsCards.innerHTML = `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div class="text-sm text-gray-500 mb-1">Total Sales</div>
                <div class="text-2xl font-semibold text-gray-900">${filtered.length}</div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div class="text-sm text-gray-500 mb-1">Total Quantity</div>
                <div class="text-2xl font-semibold text-[#2563EB]">${totalQty}</div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div class="text-sm text-gray-500 mb-1">Total Revenue</div>
                <div class="text-2xl font-semibold text-[#10B981]">${formatCurrency(totalRev)}</div>
            </div>`;
    }

    // Bảng
    tableBody.innerHTML = '';
    if (filtered.length === 0) {
        if (emptyState)   emptyState.classList.remove('hidden');
        if (tableFooter)  tableFooter.classList.add('hidden');
    } else {
        if (emptyState)  emptyState.classList.add('hidden');
        if (tableFooter) tableFooter.classList.remove('hidden');

        filtered.forEach((record, i) => {
            const bgClass = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30';
            const tr = document.createElement('tr');
            tr.className = `border-b border-gray-100 hover:bg-blue-50 transition-colors duration-150 ${bgClass}`;
            tr.innerHTML = `
                <td class="px-6 py-4"><span class="text-sm text-gray-900">${formatDate(record.sale_date)}</span></td>
                <td class="px-6 py-4"><span class="font-medium text-gray-900">${record.product_name}</span></td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">${record.quantity}</span>
                </td>
                <td class="px-6 py-4 text-right"><span class="text-gray-700">${formatCurrency(record.unit_price)}</span></td>
                <td class="px-6 py-4 text-right"><span class="font-semibold text-gray-900">${formatCurrency(record.total_amount)}</span></td>`;
            tableBody.appendChild(tr);
        });

        const fTotal = document.getElementById('fTotalRecords');
        const fQty   = document.getElementById('fTotalQty');
        const fRev   = document.getElementById('fTotalRev');
        if (fTotal) fTotal.textContent = filtered.length;
        if (fQty)   fQty.textContent   = totalQty;
        if (fRev)   fRev.textContent   = formatCurrency(totalRev);
    }

    renderChart(filtered);
}

// Render chart doanh thu theo ngày
function renderChart(data) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();

    const dailySales = {};
    data.forEach(r => {
        dailySales[r.sale_date] = (dailySales[r.sale_date] || 0) + r.total_amount;
    });
    const chartData = Object.entries(dailySales)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, total]) => ({
            label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            total: Math.round(total * 100) / 100
        }));

    chartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: chartData.map(d => d.label),
            datasets: [{
                label: 'Revenue', data: chartData.map(d => d.total),
                borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.08)',
                borderWidth: 3, tension: 0.4, pointRadius: 4, fill: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => 'Revenue: ' + formatCurrency(c.raw) } }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [3, 3], color: '#E5E7EB' }, ticks: { callback: v => '$' + v, color: '#6B7280' } },
                x: { grid: { display: false }, ticks: { color: '#6B7280' } }
            }
        }
    });
}

// Export CSV
function handleExport() {
    const start = startDateInput?.value || '';
    const end   = endDateInput?.value   || '';
    const prod  = productFilter?.value  || 'All Products';
    const filtered = allSalesData.filter(r =>
        (prod === 'All Products' || r.product_name === prod) &&
        (!start || r.sale_date >= start) && (!end || r.sale_date <= end)
    );
    const headers = ['Date', 'Product', 'Quantity', 'Unit Price', 'Total'];
    const rows = filtered.map(r => [r.sale_date, r.product_name, r.quantity, r.unit_price.toFixed(2), r.total_amount.toFixed(2)]);
    const csv  = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `sales-${new Date().toISOString().split('T')[0]}.csv` });
    link.click();
    URL.revokeObjectURL(link.href);
}

// Event listeners
if (startDateInput) startDateInput.addEventListener('change', renderUI);
if (endDateInput)   endDateInput.addEventListener('change', renderUI);
if (productFilter)  productFilter.addEventListener('change', renderUI);
if (exportBtn)      exportBtn.addEventListener('click', handleExport);

// ============================================================
// FE-05: ADD SALE MODAL
// ============================================================
let productsList = []; // cache danh sách sản phẩm cho dropdown

window.openAddSaleModal = async function () {
    const errEl = document.getElementById('addSaleError');
    if (errEl) errEl.classList.add('hidden');
    document.getElementById('addSaleForm').reset();

    // Set ngày mặc định = hôm nay
    document.getElementById('saleDate').value = new Date().toISOString().split('T')[0];

    // Load danh sách sản phẩm vào dropdown (chỉ load 1 lần)
    const select = document.getElementById('saleProductId');
    if (productsList.length === 0) {
        try {
            const result = await API.products.getAll();
            productsList = result.data || result;
        } catch (e) { productsList = []; }
    }
    // Clear và điền lại options
    select.innerHTML = '<option value="">-- Select product --</option>';
    productsList.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (Stock: ${p.current_stock})`;
        opt.dataset.price = p.selling_price;
        select.appendChild(opt);
    });

    const modal = document.getElementById('addSaleModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
};

window.closeAddSaleModal = function () {
    const modal = document.getElementById('addSaleModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

// Tự động tính Total Amount khi thay đổi qty hoặc unit price
document.getElementById('saleQty')?.addEventListener('input', calcTotal);
document.getElementById('saleUnitPrice')?.addEventListener('input', calcTotal);
document.getElementById('saleProductId')?.addEventListener('change', function () {
    const opt = this.options[this.selectedIndex];
    if (opt.dataset.price) {
        document.getElementById('saleUnitPrice').value = opt.dataset.price;
        calcTotal();
    }
});

function calcTotal() {
    const qty   = parseFloat(document.getElementById('saleQty')?.value) || 0;
    const price = parseFloat(document.getElementById('saleUnitPrice')?.value) || 0;
    const total = document.getElementById('saleTotalAmount');
    if (total) total.value = (qty * price).toFixed(2);
}

document.getElementById('addSaleForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn   = document.getElementById('addSaleBtn');
    const errEl = document.getElementById('addSaleError');
    if (errEl) errEl.classList.add('hidden');

    const qty   = parseInt(document.getElementById('saleQty').value) || 0;
    const price = parseFloat(document.getElementById('saleUnitPrice').value) || 0;

    const payload = {
        product_id:   parseInt(document.getElementById('saleProductId').value),
        sale_date:    document.getElementById('saleDate').value,
        quantity:     qty,
        unit_price:   price,
        total_amount: parseFloat((qty * price).toFixed(2)),
    };

    if (!payload.product_id || !payload.sale_date || qty <= 0 || price <= 0) {
        if (errEl) { errEl.textContent = 'Please fill in all required fields.'; errEl.classList.remove('hidden'); }
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Adding...';
    try {
        await API.sales.create(payload); // POST /api/sales/create
        closeAddSaleModal();
        productsList = []; // reset cache để load lại stock mới nhất lần sau
        await loadSalesData();
        showToast('✅ Sale recorded successfully!', 'success');
    } catch (err) {
        if (errEl) { errEl.textContent = err.message || 'Failed to add sale.'; errEl.classList.remove('hidden'); }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Sale';
    }
});

// Khởi động
loadSalesData();