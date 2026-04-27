// Initialize icons
lucide.createIcons();

const mockSalesData = [
    { id: 1, date: "2024-03-01", product: "Wireless Bluetooth Headphones", quantitySold: 15, unitPrice: 89.99 },
    { id: 2, date: "2024-03-01", product: "Smart Watch Series 5", quantitySold: 8, unitPrice: 299.99 },
    { id: 3, date: "2024-03-02", product: "Laptop Stand Aluminum", quantitySold: 22, unitPrice: 45.50 },
    { id: 4, date: "2024-03-02", product: "Mechanical Keyboard RGB", quantitySold: 12, unitPrice: 129.99 },
    { id: 5, date: "2024-03-03", product: "Wireless Mouse Ergonomic", quantitySold: 31, unitPrice: 49.99 },
    { id: 6, date: "2024-03-03", product: "USB-C Hub 7-in-1", quantitySold: 18, unitPrice: 59.99 },
    { id: 7, date: "2024-03-04", product: "Wireless Bluetooth Headphones", quantitySold: 19, unitPrice: 89.99 },
    { id: 8, date: "2024-03-04", product: "Phone Case Premium Leather", quantitySold: 45, unitPrice: 34.99 },
    { id: 9, date: "2024-03-05", product: "Wireless Charger 15W", quantitySold: 27, unitPrice: 39.99 },
    { id: 10, date: "2024-03-05", product: "HDMI Cable 2.1 (2m)", quantitySold: 38, unitPrice: 19.99 },
    { id: 11, date: "2024-03-06", product: "Smart Watch Series 5", quantitySold: 11, unitPrice: 299.99 },
    { id: 12, date: "2024-03-06", product: "Mechanical Keyboard RGB", quantitySold: 16, unitPrice: 129.99 },
    { id: 13, date: "2024-03-07", product: "Wireless Bluetooth Headphones", quantitySold: 24, unitPrice: 89.99 },
    { id: 14, date: "2024-03-07", product: "Laptop Stand Aluminum", quantitySold: 28, unitPrice: 45.50 },
    { id: 15, date: "2024-03-08", product: "USB-C Hub 7-in-1", quantitySold: 21, unitPrice: 59.99 },
    { id: 16, date: "2024-03-08", product: "Wireless Mouse Ergonomic", quantitySold: 35, unitPrice: 49.99 },
    { id: 17, date: "2024-03-09", product: "Phone Case Premium Leather", quantitySold: 52, unitPrice: 34.99 },
    { id: 18, date: "2024-03-09", product: "Wireless Charger 15W", quantitySold: 29, unitPrice: 39.99 },
    { id: 19, date: "2024-03-10", product: "HDMI Cable 2.1 (2m)", quantitySold: 44, unitPrice: 19.99 },
    { id: 20, date: "2024-03-10", product: "Smart Watch Series 5", quantitySold: 14, unitPrice: 299.99 },
    { id: 21, date: "2024-03-11", product: "Wireless Bluetooth Headphones", quantitySold: 18, unitPrice: 89.99 },
    { id: 22, date: "2024-03-11", product: "Mechanical Keyboard RGB", quantitySold: 13, unitPrice: 129.99 },
    { id: 23, date: "2024-03-12", product: "Laptop Stand Aluminum", quantitySold: 26, unitPrice: 45.50 },
    { id: 24, date: "2024-03-12", product: "Wireless Mouse Ergonomic", quantitySold: 33, unitPrice: 49.99 },
    { id: 25, date: "2024-03-13", product: "USB-C Hub 7-in-1", quantitySold: 19, unitPrice: 59.99 },
    { id: 26, date: "2024-03-13", product: "Phone Case Premium Leather", quantitySold: 41, unitPrice: 34.99 },
    { id: 27, date: "2024-03-14", product: "Wireless Charger 15W", quantitySold: 25, unitPrice: 39.99 },
    { id: 28, date: "2024-03-14", product: "HDMI Cable 2.1 (2m)", quantitySold: 39, unitPrice: 19.99 },
];

const allProducts = Array.from(new Set(mockSalesData.map((item) => item.product))).sort();

// DOM Elements
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const productFilter = document.getElementById('productFilter');
const statsCards = document.getElementById('statsCards');
const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
const tableFooter = document.getElementById('tableFooter');
const exportBtn = document.getElementById('exportBtn');

// Footers
const fTotalRecords = document.getElementById('fTotalRecords');
const fTotalQty = document.getElementById('fTotalQty');
const fTotalRev = document.getElementById('fTotalRev');

// Init filters
startDateInput.value = "2024-03-01";
endDateInput.value = "2024-03-14";

allProducts.forEach(product => {
    const opt = document.createElement('option');
    opt.value = product;
    opt.textContent = product;
    productFilter.appendChild(opt);
});

let chartInstance = null;

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function renderUI() {
    const start = startDateInput.value;
    const end = endDateInput.value;
    const prod = productFilter.value;

    const filteredData = mockSalesData.filter(record => {
        const matchesProduct = prod === "All Products" || record.product === prod;
        const matchesDateRange = record.date >= start && record.date <= end;
        return matchesProduct && matchesDateRange;
    });

    const totalQuantity = filteredData.reduce((sum, record) => sum + record.quantitySold, 0);
    const totalRevenue = filteredData.reduce((sum, record) => sum + (record.quantitySold * record.unitPrice), 0);

    // Render Stats Cards
    statsCards.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Total Sales</div>
            <div class="text-2xl font-semibold text-gray-900">${filteredData.length}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Total Quantity</div>
            <div class="text-2xl font-semibold text-[#2563EB]">${totalQuantity}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Total Revenue</div>
            <div class="text-2xl font-semibold text-[#10B981]">${formatCurrency(totalRevenue)}</div>
        </div>
    `;

    // Render Table
    tableBody.innerHTML = '';
    if (filteredData.length === 0) {
        emptyState.classList.remove('hidden');
        tableFooter.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        tableFooter.classList.remove('hidden');
        
        filteredData.forEach((record, index) => {
            const bgClass = index % 2 === 0 ? "bg-white" : "bg-gray-50/30";
            const tr = document.createElement('tr');
            tr.className = `border-b border-gray-100 hover:bg-blue-50 transition-colors duration-150 ${bgClass}`;
            tr.innerHTML = `
                <td class="px-6 py-4"><span class="text-sm text-gray-900">${formatDate(record.date)}</span></td>
                <td class="px-6 py-4"><span class="font-medium text-gray-900">${record.product}</span></td>
                <td class="px-6 py-4 text-center"><span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">${record.quantitySold}</span></td>
                <td class="px-6 py-4 text-right"><span class="text-gray-700">${formatCurrency(record.unitPrice)}</span></td>
                <td class="px-6 py-4 text-right"><span class="font-semibold text-gray-900">${formatCurrency(record.quantitySold * record.unitPrice)}</span></td>
            `;
            tableBody.appendChild(tr);
        });

        // Update footer
        fTotalRecords.textContent = filteredData.length;
        fTotalQty.textContent = totalQuantity;
        fTotalRev.textContent = formatCurrency(totalRevenue);
    }

    // Prepare Chart Data
    const dailySales = {};
    filteredData.forEach((record) => {
        const total = record.quantitySold * record.unitPrice;
        if (dailySales[record.date]) {
            dailySales[record.date] += total;
        } else {
            dailySales[record.date] = total;
        }
    });

    const chartData = Object.entries(dailySales)
        .map(([date, total]) => ({
            date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            total: Math.round(total * 100) / 100
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    renderChart(chartData);
}

function renderChart(data) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Revenue',
                data: data.map(d => d.total),
                borderColor: '#2563EB',
                backgroundColor: '#2563EB',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 4,
                activeDot: { r: 6 }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return "Revenue: " + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { borderDash: [3, 3], color: '#E5E7EB' },
                    ticks: { callback: function(value) { return '$' + value; }, color: '#6B7280', font: { size: 12 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#6B7280', font: { size: 12 } }
                }
            }
        }
    });
}

function handleExport() {
    const start = startDateInput.value;
    const end = endDateInput.value;
    const prod = productFilter.value;

    const filteredData = mockSalesData.filter(record => {
        const matchesProduct = prod === "All Products" || record.product === prod;
        const matchesDateRange = record.date >= start && record.date <= end;
        return matchesProduct && matchesDateRange;
    });

    const headers = ["Date", "Product", "Quantity Sold", "Unit Price", "Total"];
    const rows = filteredData.map(record => [
        record.date,
        record.product,
        record.quantitySold,
        record.unitPrice,
        (record.quantitySold * record.unitPrice).toFixed(2)
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => '"' + c + '"').join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-data-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// Event Listeners
startDateInput.addEventListener('change', renderUI);
endDateInput.addEventListener('change', renderUI);
productFilter.addEventListener('change', renderUI);
exportBtn.addEventListener('click', handleExport);

// Initial rendering
renderUI();
