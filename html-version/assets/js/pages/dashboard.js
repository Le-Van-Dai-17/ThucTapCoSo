lucide.createIcons();

if (typeof Auth !== 'undefined') Auth.requireAuth();

// Mock data fallback
const MOCK_FORECAST = [
    {
        id: 1, name: "Wireless Bluetooth Headphones", category: "Electronics", currentStock: 45, predictedDemand: 320, lowerBound: 280, upperBound: 360, recommendedOrder: 275, stockStatus: "low", demandLevel: "high",
        historicalData: [
            { month: "Sep", actual: 280, predicted: 275 }, { month: "Oct", actual: 310, predicted: 300 },
            { month: "Nov", actual: 295, predicted: 290 }, { month: "Dec", actual: 340, predicted: 330 },
            { month: "Jan", actual: 315, predicted: 310 }, { month: "Feb", actual: 305, predicted: 300 },
            { month: "Mar (Pred)", actual: null, predicted: 320 }
        ]
    },
    {
        id: 2, name: "Smart Watch Series 5", category: "Electronics", currentStock: 120, predictedDemand: 180, lowerBound: 160, upperBound: 200, recommendedOrder: 60, stockStatus: "normal", demandLevel: "normal",
        historicalData: [
            { month: "Sep", actual: 165, predicted: 160 }, { month: "Oct", actual: 175, predicted: 170 },
            { month: "Nov", actual: 170, predicted: 168 }, { month: "Dec", actual: 185, predicted: 180 },
            { month: "Jan", actual: 178, predicted: 175 }, { month: "Feb", actual: 172, predicted: 170 },
            { month: "Mar (Pred)", actual: null, predicted: 180 }
        ]
    },
    { id: 3, name: "USB-C Cable 6ft", category: "Accessories", currentStock: 850, predictedDemand: 520, lowerBound: 480, upperBound: 560, recommendedOrder: 0, stockStatus: "high", demandLevel: "normal", historicalData: [] },
    { id: 4, name: "Laptop Stand Aluminum", category: "Accessories", currentStock: 35, predictedDemand: 245, lowerBound: 220, upperBound: 270, recommendedOrder: 210, stockStatus: "low", demandLevel: "high", historicalData: [] },
    { id: 5, name: "Mechanical Keyboard RGB", category: "Electronics", currentStock: 88, predictedDemand: 155, lowerBound: 140, upperBound: 170, recommendedOrder: 67, stockStatus: "normal", demandLevel: "normal", historicalData: [] },
    { id: 6, name: "Wireless Mouse Ergonomic", category: "Accessories", currentStock: 22, predictedDemand: 380, lowerBound: 340, upperBound: 420, recommendedOrder: 358, stockStatus: "low", demandLevel: "high", historicalData: [] },
];

let forecastData = [];
let selectedId = null;
let expandedRowId = null;
let chartInstance = null;

const tableBody = document.getElementById('tableBody');
const filterCategory = document.getElementById('categoryFilter');

// Load dữ liệu dự báo
async function loadForecastData() {
    try {
        const result = await API.forecast.getLatest();
        forecastData = (result.data || result).map(item => ({
            id: item.id,
            name: item.name || item.product_name,
            category: item.category,
            currentStock: item.current_stock ?? item.currentStock ?? 0,
            predictedDemand: item.predicted_quantity ?? item.predictedDemand ?? 0,
            lowerBound: item.lower_bound ?? item.lowerBound ?? 0,
            upperBound: item.upper_bound ?? item.upperBound ?? 0,
            recommendedOrder: item.recommended_order ?? item.recommendedOrder ?? 0,
            stockStatus: item.stock_status ?? item.stockStatus ?? 'normal',
            demandLevel: item.demand_level ?? item.demandLevel ?? 'normal',
            historicalData: item.historical_data ?? item.historicalData ?? []
        }));
    } catch (err) {
        console.warn('[Dashboard] Dùng mock forecast:', err.message);
        forecastData = MOCK_FORECAST;
    }
    renderTable();
}

// Render bảng
function renderTable() {
    tableBody.innerHTML = '';
    const cat = filterCategory.value;
    const data = cat === 'all' ? forecastData : forecastData.filter(p => p.category.toLowerCase() === cat);

    data.forEach((p, index) => {
        const isExpanded = expandedRowId === p.id;
        const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
        const selectedClass = selectedId === p.id ? 'bg-gray-100' : '';

        const stockBadge = p.stockStatus === 'low' ? 'bg-red-100 text-red-700' : (p.stockStatus === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700');
        const demandBadge = p.demandLevel === 'high' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700';

        const tr = document.createElement('tr');
        tr.className = `cursor-pointer transition-colors duration-150 ${bgClass} ${selectedClass} hover:bg-gray-100/80`;
        tr.onclick = () => selectProduct(p.id);
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
                <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${stockBadge}">${p.currentStock}</span>
            </td>
            <td class="px-6 py-4 text-right">
                <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${demandBadge}">${p.predictedDemand}</span>
            </td>
            <td class="px-6 py-4 text-right text-gray-600">${p.lowerBound}</td>
            <td class="px-6 py-4 text-right text-gray-600">${p.upperBound}</td>
            <td class="px-6 py-4 text-right">
                <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-[#10B981] text-white">${p.recommendedOrder}</span>
            </td>`;
        tableBody.appendChild(tr);

        // Hàng mở rộng chi tiết
        if (isExpanded) {
            const expandTr = document.createElement('tr');
            expandTr.innerHTML = `
                <td colspan="6" class="px-6 py-4 bg-gray-50 border-t border-gray-200 border-b">
                    <div class="grid grid-cols-3 gap-4 mx-6">
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-sm text-gray-500 mb-1">Stock Coverage</div>
                            <div class="text-lg font-semibold text-gray-900">
                                ${p.predictedDemand > 0 ? Math.round((p.currentStock / p.predictedDemand) * 100) : 0}%
                            </div>
                        </div>
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-sm text-gray-500 mb-1">Confidence Range</div>
                            <div class="text-lg font-semibold text-gray-900">
                                ±${p.predictedDemand > 0 ? Math.round(((p.upperBound - p.lowerBound) / 2 / p.predictedDemand) * 100) : 0}%
                            </div>
                        </div>
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-sm text-gray-500 mb-1">Order Priority</div>
                            <div class="text-lg font-semibold text-gray-900">${p.stockStatus === 'low' ? 'High' : 'Normal'}</div>
                        </div>
                    </div>
                </td>`;
            tableBody.appendChild(expandTr);
        }
    });
    lucide.createIcons();
}

function selectProduct(id) {
    expandedRowId = expandedRowId === id ? null : id;
    selectedId = id;
    renderTable();
    showRightPanel(id);
}

function showRightPanel(id) {
    const product = forecastData.find(p => p.id === id);
    if (!product) return;

    const emptyPanel = document.getElementById('emptyPanel');
    const rightPanel = document.getElementById('rightPanel');
    if (emptyPanel) emptyPanel.classList.add('hidden');
    if (rightPanel) {
        rightPanel.classList.remove('hidden');
        rightPanel.classList.add('flex');
    }

    const titleEl = document.getElementById('panelTitle');
    const categoryEl = document.getElementById('panelCategory');
    if (titleEl) titleEl.textContent = product.name;
    if (categoryEl) categoryEl.textContent = product.category;

    if (product.historicalData && product.historicalData.length > 0) {
        renderChart(product.historicalData);
    }
}

function renderChart(data) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.map(d => d.month),
            datasets: [
                {
                    label: 'Actual Sales',
                    data: data.map(d => d.actual),
                    borderColor: '#2563EB', backgroundColor: '#2563EB',
                    borderWidth: 2, tension: 0.4, pointRadius: 4, spanGaps: true
                },
                {
                    label: 'Predicted',
                    data: data.map(d => d.predicted),
                    borderColor: '#10B981', backgroundColor: '#10B981',
                    borderWidth: 2, borderDash: [5, 5], tension: 0.4, pointRadius: 4, spanGaps: true
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [3, 3], color: '#f0f0f0' }, ticks: { color: '#6b7280' } },
                x: { grid: { display: false }, ticks: { color: '#6b7280' } }
            }
        }
    });
}

filterCategory.addEventListener('change', renderTable);
loadForecastData();
