lucide.createIcons();

// Data Mockup
const mockProducts = [
    { id: 1, name: "Wireless Bluetooth Headphones", category: "Electronics", currentStock: 45, predictedDemand: 320, lowerBound: 280, upperBound: 360, recommendedOrder: 275, stockStatus: "low", demandLevel: "high", historicalData: [{ month: "Sep", actual: 280, predicted: 275 }, { month: "Oct", actual: 310, predicted: 300 }, { month: "Nov", actual: 295, predicted: 290 }, { month: "Dec", actual: 340, predicted: 330 }, { month: "Jan", actual: 315, predicted: 310 }, { month: "Feb", actual: 305, predicted: 300 }, { month: "Mar (Pred)", actual: null, predicted: 320 }] },
    { id: 2, name: "Smart Watch Series 5", category: "Electronics", currentStock: 120, predictedDemand: 180, lowerBound: 160, upperBound: 200, recommendedOrder: 60, stockStatus: "normal", demandLevel: "normal", historicalData: [{ month: "Sep", actual: 165, predicted: 160 }, { month: "Oct", actual: 175, predicted: 170 }, { month: "Nov", actual: 170, predicted: 168 }, { month: "Dec", actual: 185, predicted: 180 }, { month: "Jan", actual: 178, predicted: 175 }, { month: "Feb", actual: 172, predicted: 170 }, { month: "Mar (Pred)", actual: null, predicted: 180 }] },
    { id: 3, name: "USB-C Cable 6ft", category: "Accessories", currentStock: 850, predictedDemand: 520, lowerBound: 480, upperBound: 560, recommendedOrder: 0, stockStatus: "high", demandLevel: "normal", historicalData: [{ month: "Sep", actual: 490, predicted: 485 }, { month: "Oct", actual: 510, predicted: 500 }, { month: "Nov", actual: 505, predicted: 500 }, { month: "Dec", actual: 530, predicted: 520 }, { month: "Jan", actual: 515, predicted: 510 }, { month: "Feb", actual: 500, predicted: 495 }, { month: "Mar (Pred)", actual: null, predicted: 520 }] },
    { id: 4, name: "Laptop Stand Aluminum", category: "Accessories", currentStock: 35, predictedDemand: 245, lowerBound: 220, upperBound: 270, recommendedOrder: 210, stockStatus: "low", demandLevel: "high", historicalData: [{ month: "Sep", actual: 220, predicted: 215 }, { month: "Oct", actual: 235, predicted: 230 }, { month: "Nov", actual: 230, predicted: 228 }, { month: "Dec", actual: 250, predicted: 245 }, { month: "Jan", actual: 240, predicted: 238 }, { month: "Feb", actual: 232, predicted: 230 }, { month: "Mar (Pred)", actual: null, predicted: 245 }] },
    { id: 5, name: "Mechanical Keyboard RGB", category: "Electronics", currentStock: 88, predictedDemand: 155, lowerBound: 140, upperBound: 170, recommendedOrder: 67, stockStatus: "normal", demandLevel: "normal", historicalData: [] },
    { id: 6, name: "Wireless Mouse Ergonomic", category: "Accessories", currentStock: 22, predictedDemand: 380, lowerBound: 340, upperBound: 420, recommendedOrder: 358, stockStatus: "low", demandLevel: "high", historicalData: [] },
];

let selectedProductId = null;
let chartInstance = null;
let expandedRowId = null;

const tableBody = document.getElementById('tableBody');
const filterCategory = document.getElementById('categoryFilter');

function renderTable() {
    tableBody.innerHTML = '';
    const cat = filterCategory.value;
    const data = cat === 'all' ? mockProducts : mockProducts.filter(p => p.category.toLowerCase() === cat);

    data.forEach((p, index) => {
        const isSelected = selectedProductId === p.id;
        const isExpanded = expandedRowId === p.id;

        const bgClass = index % 2 === 0 ? "bg-white" : "bg-gray-50/50";
        const highlightClass = p.stockStatus === "low" ? "bg-red-50/30" : "";
        const demandClass = p.demandLevel === "high" ? "bg-blue-50/30" : "";
        const selectedClass = isSelected ? "bg-gray-100" : "";

        const tr = document.createElement('tr');
        tr.className = `cursor-pointer transition-colors duration-150 ${bgClass} ${selectedClass} ${highlightClass} ${demandClass} hover:bg-gray-100/80`;
        tr.onclick = () => selectProduct(p.id);

        const stockBadgeClass = p.stockStatus === "low" ? "bg-red-100 text-red-700" : (p.stockStatus === "high" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-700");
        const demandBadgeClass = p.demandLevel === "high" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700";

        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                    <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" class="w-4 h-4 text-gray-400"></i>
                    <div>
                        <div class="font-medium text-gray-900">${p.name}</div>
                        <div class="text-sm text-gray-500">${p.category}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-right">
                <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${stockBadgeClass}">${p.currentStock}</span>
            </td>
            <td class="px-6 py-4 text-right">
                <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${demandBadgeClass}">${p.predictedDemand}</span>
            </td>
            <td class="px-6 py-4 text-right text-gray-600">${p.lowerBound}</td>
            <td class="px-6 py-4 text-right text-gray-600">${p.upperBound}</td>
            <td class="px-6 py-4 text-right">
                <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-[#10B981] text-white">${p.recommendedOrder}</span>
            </td>
        `;

        tableBody.appendChild(tr);

        // Add Expanded Details
        if (isExpanded) {
            const expandTr = document.createElement('tr');
            expandTr.innerHTML = `
                <td colspan="6" class="px-6 py-4 bg-gray-50 border-t border-gray-200 border-b">
                    <div class="grid grid-cols-3 gap-4 mx-6">
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-sm text-gray-500 mb-1">Stock Coverage</div>
                            <div class="text-lg font-semibold text-gray-900">${Math.round((p.currentStock / p.predictedDemand) * 100)}%</div>
                        </div>
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-sm text-gray-500 mb-1">Confidence Range</div>
                            <div class="text-lg font-semibold text-gray-900">±${Math.round(((p.upperBound - p.lowerBound) / 2 / p.predictedDemand) * 100)}%</div>
                        </div>
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-sm text-gray-500 mb-1">Order Priority</div>
                            <div class="text-lg font-semibold text-gray-900">${p.stockStatus === 'low' ? 'High' : 'Normal'}</div>
                        </div>
                    </div>
                </td>
            `;
            tableBody.appendChild(expandTr);
        }
    });

    lucide.createIcons();
}

function selectProduct(id) {
    if (expandedRowId === id) {
        expandedRowId = null; 
    } else {
        expandedRowId = id;
    }
    selectedProductId = id;
    renderTable();
    showRightPanel(id);
}

function showRightPanel(id) {
    const product = mockProducts.find(p => p.id === id);
    document.getElementById('emptyPanel').classList.add('hidden');
    document.getElementById('rightPanel').classList.remove('hidden');
    document.getElementById('rightPanel').classList.add('flex');

    document.getElementById('panelTitle').textContent = product.name;
    document.getElementById('panelCategory').textContent = product.category;

    if(product.historicalData && product.historicalData.length > 0) {
        renderChart(product.historicalData);
    }
}

function renderChart(data) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = data.map(d => d.month);
    const actual = data.map(d => d.actual);
    const predicted = data.map(d => d.predicted);

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Actual Sales',
                    data: actual,
                    borderColor: '#2563EB',
                    backgroundColor: '#2563EB',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 4,
                    spanGaps: true
                },
                {
                    label: 'Predicted',
                    data: predicted,
                    borderColor: '#10B981',
                    backgroundColor: '#10B981',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    pointRadius: 4,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { borderDash: [3, 3], color: '#f0f0f0' },
                    ticks: { color: '#6b7280' }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: '#6b7280' }
                }
            }
        }
    });
}

// Init
filterCategory.addEventListener('change', renderTable);
renderTable();
