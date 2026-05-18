lucide.createIcons();

if (typeof Auth !== 'undefined') Auth.requireAuth();

// Mock data fallback
const MOCK_SALES = [
    { id: 1, sale_date: "2024-03-01", product: "Wireless Bluetooth Headphones", quantity_sold: 15, unit_price: 89.99 },
    { id: 2, sale_date: "2024-03-01", product: "Smart Watch Series 5", quantity_sold: 8, unit_price: 299.99 },
    { id: 3, sale_date: "2024-03-02", product: "Laptop Stand Aluminum", quantity_sold: 22, unit_price: 45.50 },
    { id: 4, sale_date: "2024-03-02", product: "Mechanical Keyboard RGB", quantity_sold: 12, unit_price: 129.99 },
    { id: 5, sale_date: "2024-03-03", product: "Wireless Mouse Ergonomic", quantity_sold: 31, unit_price: 49.99 },
    { id: 6, sale_date: "2024-03-03", product: "USB-C Hub 7-in-1", quantity_sold: 18, unit_price: 59.99 },
    { id: 7, sale_date: "2024-03-04", product: "Wireless Bluetooth Headphones", quantity_sold: 19, unit_price: 89.99 },
    { id: 8, sale_date: "2024-03-04", product: "Phone Case Premium Leather", quantity_sold: 45, unit_price: 34.99 },
    { id: 9, sale_date: "2024-03-05", product: "Wireless Charger 15W", quantity_sold: 27, unit_price: 39.99 },
    { id: 10, sale_date: "2024-03-05", product: "HDMI Cable 2.1 (2m)", quantity_sold: 38, unit_price: 19.99 },
    { id: 11, sale_date: "2024-03-06", product: "Smart Watch Series 5", quantity_sold: 11, unit_price: 299.99 },
    { id: 12, sale_date: "2024-03-06", product: "Mechanical Keyboard RGB", quantity_sold: 16, unit_price: 129.99 },
    { id: 13, sale_date: "2024-03-07", product: "Wireless Bluetooth Headphones", quantity_sold: 24, unit_price: 89.99 },
    { id: 14, sale_date: "2024-03-07", product: "Laptop Stand Aluminum", quantity_sold: 28, unit_price: 45.50 },
    { id: 15, sale_date: "2024-03-08", product: "USB-C Hub 7-in-1", quantity_sold: 21, unit_price: 59.99 },
    { id: 16, sale_date: "2024-03-08", product: "Wireless Mouse Ergonomic", quantity_sold: 35, unit_price: 49.99 },
    { id: 17, sale_date: "2024-03-09", product: "Phone Case Premium Leather", quantity_sold: 52, unit_price: 34.99 },
    { id: 18, sale_date: "2024-03-09", product: "Wireless Charger 15W", quantity_sold: 29, unit_price: 39.99 },
    { id: 19, sale_date: "2024-03-10", product: "HDMI Cable 2.1 (2m)", quantity_sold: 44, unit_price: 19.99 },
    { id: 20, sale_date: "2024-03-10", product: "Smart Watch Series 5", quantity_sold: 14, unit_price: 299.99 },
];

let allSalesData = [];
let chartInstance = null;

// DOM Elements
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const productFilter = document.getElementById('productFilter');
const statsCards = document.getElementById('statsCards');
const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
const tableFooter = document.getElementById('tableFooter');
const exportBtn = document.getElementById('exportBtn');

const fTotalRecords = document.getElementById('fTotalRecords');
const fTotalQty = document.getElementById('fTotalQty');
const fTotalRev = document.getElementById('fTotalRev');

// Init dates
startDateInput.value = '2024-03-01';
endDateInput.value = '2024-03-14';

// Load dữ liệu
async function loadSalesData() {
    showLoading('tableBody');
    try {
        const result = await API.sales.getAll({
            start_date: startDateInput.value,
            end_date: endDateInput.value
        });
        // Chuẩn hoá field từ DB
        allSalesData = (result.data || result).map(item => ({
            id: item.id,
            sale_date: item.sale_date || item.date,
            product: item.product_name || item.product || item.name,
            quantity_sold: item.quantity ?? item.quantitySold ?? item.quantity_sold ?? 0,
            unit_price: item.unit_price ?? item.unitPrice ?? 0
        }));
    } catch (err) {
        console.warn('[Sales] Dùng mock data:', err.message);
        allSalesData = MOCK_SALES;
    }
    populateProductFilter();
    renderUI();
}

function populateProductFilter() {
    const existing = Array.from(productFilter.options).map(o => o.value);
    const products = [...new Set(allSalesData.map(d => d.product))].sort();
    products.forEach(prod => {
        if (!existing.includes(prod)) {
            const opt = document.createElement('option');
            opt.value = prod;
            opt.textContent = prod;
            productFilter.appendChild(opt);
        }
    });
}

// Format helpers
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Render UI
function renderUI() {
    const start = startDateInput.value;
    const end = endDateInput.value;
    const prod = productFilter.value;

    const filtered = allSalesData.filter(r => {
        const matchProd = prod === 'All Products' || r.product === prod;
        const matchDate = r.sale_date >= start && r.sale_date <= end;
        return matchProd && matchDate;
    });

    const totalQty = filtered.reduce((s, r) => s + r.quantity_sold, 0);
    const totalRev = filtered.reduce((s, r) => s + (r.quantity_sold * r.unit_price), 0);

    // Stats
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

    // Table
    tableBody.innerHTML = '';
    if (filtered.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (tableFooter) tableFooter.classList.add('hidden');
    } else {
        if (emptyState) emptyState.classList.add('hidden');
        if (tableFooter) tableFooter.classList.remove('hidden');

        filtered.forEach((record, index) => {
            const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30';
            const tr = document.createElement('tr');
            tr.className = `border-b border-gray-100 hover:bg-blue-50 transition-colors duration-150 ${bgClass}`;
            tr.innerHTML = `
                <td class="px-6 py-4"><span class="text-sm text-gray-900">${formatDate(record.sale_date)}</span></td>
                <td class="px-6 py-4"><span class="font-medium text-gray-900">${record.product}</span></td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">${record.quantity_sold}</span>
                </td>
                <td class="px-6 py-4 text-right"><span class="text-gray-700">${formatCurrency(record.unit_price)}</span></td>
                <td class="px-6 py-4 text-right"><span class="font-semibold text-gray-900">${formatCurrency(record.quantity_sold * record.unit_price)}</span></td>`;
            tableBody.appendChild(tr);
        });

        if (fTotalRecords) fTotalRecords.textContent = filtered.length;
        if (fTotalQty) fTotalQty.textContent = totalQty;
        if (fTotalRev) fTotalRev.textContent = formatCurrency(totalRev);
    }

    // Chart
    const dailySales = {};
    filtered.forEach(r => {
        const total = r.quantity_sold * r.unit_price;
        dailySales[r.sale_date] = (dailySales[r.sale_date] || 0) + total;
    });
    const chartData = Object.entries(dailySales)
        .map(([date, total]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            total: Math.round(total * 100) / 100
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    renderChart(chartData);
}

function renderChart(data) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Revenue', data: data.map(d => d.total),
                borderColor: '#2563EB', backgroundColor: '#2563EB',
                borderWidth: 3, tension: 0.4, pointRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => 'Revenue: ' + formatCurrency(ctx.raw) } }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [3, 3], color: '#E5E7EB' }, ticks: { callback: v => '$' + v, color: '#6B7280', font: { size: 12 } } },
                x: { grid: { display: false }, ticks: { color: '#6B7280', font: { size: 12 } } }
            }
        }
    });
}

// Export CSV
function handleExport() {
    const start = startDateInput.value;
    const end = endDateInput.value;
    const prod = productFilter.value;
    const filtered = allSalesData.filter(r => {
        return (prod === 'All Products' || r.product === prod) && r.sale_date >= start && r.sale_date <= end;
    });

    const headers = ['Date', 'Product', 'Quantity Sold', 'Unit Price', 'Total'];
    const rows = filtered.map(r => [r.sale_date, r.product, r.quantity_sold, r.unit_price, (r.quantity_sold * r.unit_price).toFixed(2)]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-data-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// Event Listeners
startDateInput.addEventListener('change', renderUI);
endDateInput.addEventListener('change', renderUI);
productFilter.addEventListener('change', renderUI);
if (exportBtn) exportBtn.addEventListener('click', handleExport);

// Khởi động
loadSalesData();
