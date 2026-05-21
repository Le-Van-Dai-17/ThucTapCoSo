// ============================================================
// FILE: html-version/assets/js/pages/dashboard.js
// Mô tả: Trang Dashboard — Demand Forecast Results
// Kết nối: GET /api/forecast/latest
// ============================================================

lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

let forecastData  = [];
let selectedId    = null;
let expandedRowId = null;
let chartInstance = null;

const tableBody      = document.getElementById('tableBody');
const filterCategory = document.getElementById('categoryFilter');

// ============================================================
// Load dữ liệu từ API /forecast/latest
// forecastController tính từ sales thật trong DB
// ============================================================
async function loadForecastData() {
    if (tableBody) {
        tableBody.innerHTML = `
            <tr><td colspan="6">
                <div class="py-16 text-center flex flex-col items-center gap-3">
                    <div class="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
                    <p class="text-gray-400 text-sm">Đang tính toán dự báo...</p>
                </div>
            </td></tr>`;
    }

    try {
        const result = await API.forecast.getLatest();

        // Map field — hỗ trợ cả snake_case (từ DB) lẫn camelCase (dự phòng)
        forecastData = (result.data || []).map(item => ({
            id:              item.id,
            name:            item.name || item.product_name || 'Unknown',
            category:        item.category || 'General',
            currentStock:    item.current_stock    ?? item.currentStock    ?? 0,
            predictedDemand: item.predicted_demand ?? item.predictedDemand ?? 0,
            lowerBound:      item.lower_bound      ?? item.lowerBound      ?? 0,
            upperBound:      item.upper_bound      ?? item.upperBound      ?? 0,
            recommendedOrder:item.recommended_order?? item.recommendedOrder?? 0,
            stockStatus:     item.stock_status     ?? item.stockStatus     ?? 'normal',
            demandLevel:     item.demand_level     ?? item.demandLevel     ?? 'normal',
            historicalData:  item.historical_data  ?? item.historicalData  ?? []
        }));

        console.log(`✅ Loaded ${forecastData.length} forecast records from real sales data.`);

    } catch (err) {
        console.warn('[Dashboard] Không tải được forecast:', err.message);
        // Không fallback mock — hiện thông báo lỗi thay vì số giả
        forecastData = [];
        if (tableBody) {
            tableBody.innerHTML = `
                <tr><td colspan="6">
                    <div class="py-16 text-center flex flex-col items-center gap-3">
                        <i data-lucide="alert-circle" class="w-10 h-10 text-red-400"></i>
                        <p class="text-red-600 font-medium">Không thể tải dữ liệu dự báo</p>
                        <p class="text-gray-500 text-sm">${err.message}</p>
                        <button onclick="loadForecastData()" class="text-sm text-[#2563EB] underline">Thử lại</button>
                    </div>
                </td></tr>`;
            lucide.createIcons();
            return;
        }
    }

    renderTable();
}

// ============================================================
// Render bảng forecast
// ============================================================
function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const cat  = filterCategory?.value || 'all';
    const data = cat === 'all'
        ? forecastData
        : forecastData.filter(p => (p.category || '').toLowerCase() === cat.toLowerCase());

    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="6">
                <div class="py-16 text-center">
                    <p class="text-gray-500">Chưa có dữ liệu dự báo.</p>
                    <p class="text-sm text-gray-400 mt-1">Cần có dữ liệu sales để tính forecast.</p>
                </div>
            </td></tr>`;
        return;
    }

    data.forEach((p, index) => {
        const isExpanded   = expandedRowId === p.id;
        const bgClass      = index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
        const selectedClass= selectedId === p.id ? 'ring-1 ring-inset ring-[#2563EB]' : '';

        // Badge màu theo stockStatus
        const stockBadge =
            p.stockStatus === 'low'  ? 'bg-red-100 text-red-700' :
            p.stockStatus === 'out'  ? 'bg-red-200 text-red-800 font-bold' :
            p.stockStatus === 'high' ? 'bg-orange-100 text-orange-700' :
                                       'bg-gray-100 text-gray-700';

        // Badge màu theo demandLevel
        const demandBadge =
            p.demandLevel === 'high' ? 'bg-blue-100 text-blue-700' :
            p.demandLevel === 'low'  ? 'bg-yellow-100 text-yellow-700' :
                                       'bg-gray-100 text-gray-700';

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

        // Hàng mở rộng
        if (isExpanded) {
            const coverage = p.predictedDemand > 0
                ? Math.round((p.currentStock / p.predictedDemand) * 100) : 0;
            const confidence = (p.upperBound - p.lowerBound) > 0 && p.predictedDemand > 0
                ? Math.round(((p.upperBound - p.lowerBound) / 2 / p.predictedDemand) * 100) : 0;

            const expandTr = document.createElement('tr');
            expandTr.innerHTML = `
                <td colspan="6" class="px-6 py-4 bg-gray-50 border-t border-gray-200 border-b">
                    <div class="grid grid-cols-3 gap-4 mx-6">
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-sm text-gray-500 mb-1">Stock Coverage</div>
                            <div class="text-lg font-semibold text-gray-900">${coverage}%</div>
                            <div class="text-xs text-gray-400 mt-1">Tồn kho / Dự báo</div>
                        </div>
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-sm text-gray-500 mb-1">Confidence Range</div>
                            <div class="text-lg font-semibold text-gray-900">±${confidence}%</div>
                            <div class="text-xs text-gray-400 mt-1">${p.lowerBound} – ${p.upperBound}</div>
                        </div>
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-sm text-gray-500 mb-1">Order Priority</div>
                            <div class="text-lg font-semibold ${p.stockStatus === 'low' || p.stockStatus === 'out' ? 'text-red-600' : 'text-gray-900'}">
                                ${p.stockStatus === 'out' ? '🔴 Hết hàng' : p.stockStatus === 'low' ? '🟠 Cao' : '🟢 Bình thường'}
                            </div>
                        </div>
                    </div>
                </td>`;
            tableBody.appendChild(expandTr);
        }
    });

    lucide.createIcons();
}

// ============================================================
// Chọn sản phẩm → mở right panel + chart
// ============================================================
function selectProduct(id) {
    expandedRowId = expandedRowId === id ? null : id;
    selectedId    = id;
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

    const titleEl    = document.getElementById('panelTitle');
    const categoryEl = document.getElementById('panelCategory');
    if (titleEl)    titleEl.textContent    = product.name;
    if (categoryEl) categoryEl.textContent = product.category;

    // Chỉ vẽ chart nếu có historical data thật
    if (product.historicalData && product.historicalData.length > 0) {
        renderChart(product.historicalData);
    } else {
        const ctx = document.getElementById('salesChart');
        if (ctx) {
            if (chartInstance) chartInstance.destroy();
            const parent = ctx.parentElement;
            if (parent) {
                parent.innerHTML = `
                    <div class="h-64 flex items-center justify-center text-gray-400 text-sm">
                        Chưa có dữ liệu sales để vẽ biểu đồ
                    </div>`;
            }
        }
    }
}

// ============================================================
// Vẽ biểu đồ Actual vs Predicted
// ============================================================
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
                    borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.1)',
                    borderWidth: 2, tension: 0.4, pointRadius: 4, spanGaps: true, fill: true
                },
                {
                    label: 'Predicted',
                    data: data.map(d => d.predicted),
                    borderColor: '#10B981', backgroundColor: 'transparent',
                    borderWidth: 2, borderDash: [5, 5], tension: 0.4, pointRadius: 4, spanGaps: true
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
                tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.raw ?? 'N/A'}` } }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [3, 3], color: '#f0f0f0' }, ticks: { color: '#6b7280' } },
                x: { grid: { display: false }, ticks: { color: '#6b7280' } }
            }
        }
    });
}

// Event listener
if (filterCategory) filterCategory.addEventListener('change', renderTable);

// Khởi động
loadForecastData();