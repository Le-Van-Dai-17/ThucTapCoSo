lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
const btnRunForecast = document.getElementById('btnRunForecast');
const forecastInfoBox = document.getElementById('forecastInfoBox');
const forecastInfoText = document.getElementById('forecastInfoText');

const loadingModalOverlay = document.getElementById('loadingModalOverlay');
const loadingModal = document.getElementById('loadingModal');
const forecastDetailModalOverlay = document.getElementById('forecastDetailModalOverlay');
const forecastDetailModal = document.getElementById('forecastDetailModal');
const btnCloseForecastDetail = document.getElementById('btnCloseForecastDetail');
const detailProductName = document.getElementById('detailProductName');
const detailProductMeta = document.getElementById('detailProductMeta');
const detailAccuracy = document.getElementById('detailAccuracy');
const detailAccuracyNote = document.getElementById('detailAccuracyNote');
const detailLatestActual = document.getElementById('detailLatestActual');
const detailLatestPredicted = document.getElementById('detailLatestPredicted');
const detailChartLoading = document.getElementById('detailChartLoading');
const detailChartWrap = document.getElementById('detailChartWrap');

let forecasts = [];
let allForecasts = [];
let currentTargetPeriod = null;
let productForecastChart = null;

function getTargetPeriodValue(period) {
    const now = new Date();
    let targetDate;
    if (period === 'next-week') {
        targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    } else if (period === 'next-month') {
        targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (period === 'next-quarter') {
        targetDate = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    } else if (period === 'next-year') {
        targetDate = new Date(now.getFullYear() + 1, now.getMonth(), 1);
    } else {
        targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
}

async function loadCategories() {
    const sel = document.getElementById('categoryFilter');
    try {
        const data = await API.categories.getAll();
        const list = data.data || data || [];
        sel.innerHTML = '<option value="all">All Categories</option>';
        list.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            sel.appendChild(opt);
        });
    } catch (e) {
        console.warn('Could not load categories', e);
    }
}

async function loadForecasts() {
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-gray-500">Loading latest forecasts...</td></tr>`;
    try {
        const period = document.getElementById('timePeriod').value;
        currentTargetPeriod = getTargetPeriodValue(period);
        const data = await API.forecast.getSaved(currentTargetPeriod);
        allForecasts = normalizeLatestForecastRows(data || []);
        forecasts = allForecasts;
    } catch (error) {
        console.error('Failed to load forecasts:', error);
        allForecasts = [];
        forecasts = [];
    }
    applyFilters();
}

function getForecastTimestamp(row) {
    const value = row.forecast_date || row.created_at || row.updated_at;
    const date = new Date(value);
    return isNaN(date) ? 0 : date.getTime();
}

function normalizeLatestForecastRows(rows) {
    const latestByProduct = new Map();

    rows.forEach(row => {
        const key = row.product_id || row.id || row.sku;
        if (!key) return;

        const current = latestByProduct.get(key);
        const rowForecastId = Number(row.forecast_id || row.id || 0);
        const currentForecastId = Number(current?.forecast_id || current?.id || 0);
        const isNewerById = rowForecastId > currentForecastId;
        const isNewerByDate = rowForecastId === currentForecastId && getForecastTimestamp(row) >= getForecastTimestamp(current);

        if (!current || isNewerById || isNewerByDate) {
            latestByProduct.set(key, row);
        }
    });

    return Array.from(latestByProduct.values())
        .sort((a, b) => String(a.product_name || '').localeCompare(String(b.product_name || '')));
}

function applyFilters() {
    const cat = document.getElementById('categoryFilter').value;
    if (cat === 'all') {
        forecasts = allForecasts;
    } else {
        forecasts = allForecasts.filter(f => f.category === cat);
    }
    renderTable();
}

function renderTable() {
    tableBody.innerHTML = '';
    
    if (forecasts.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        forecastInfoBox.classList.add('hidden');
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    forecastInfoBox.classList.remove('hidden');

    const latestForecast = forecasts.reduce((latest, item) => {
        if (!latest) return item;
        return getForecastTimestamp(item) > getForecastTimestamp(latest) ? item : latest;
    }, null);
    const targetPeriodText = latestForecast?.target_period ? formatPeriod(latestForecast.target_period) : formatPeriod(currentTargetPeriod);
    const latestDateStr = latestForecast ? formatDate(latestForecast.forecast_date || latestForecast.created_at) : '--';
    forecastInfoText.textContent = `Target period: ${targetPeriodText} | Forecast run: ${latestDateStr} | Showing latest result per product`;

    forecasts.forEach((f, idx) => {
        const tr = document.createElement('tr');
        const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
        tr.className = `hover:bg-blue-50 transition-colors duration-150 cursor-pointer ${bgClass}`;

        const currentStock = f.current_stock || 0;
        const warningStock = f.warning_stock_level || f.min_stock_level || 0;
        const predicted = f.predicted_demand || f.predicted_quantity || 0;
        const recommended = f.recommended_order || 0;

        let statusHtml = '';
        if (currentStock === 0) {
            statusHtml = `<span class="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Out of Stock</span>`;
        } else if (currentStock <= warningStock) {
            statusHtml = `<span class="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Low Stock</span>`;
        } else if (currentStock > predicted * 1.5) {
            statusHtml = `<span class="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Overstock</span>`;
        } else {
            statusHtml = `<span class="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Normal</span>`;
        }

        tr.innerHTML = `
            <td class="px-6 py-4"><span class="font-medium text-gray-900">${escapeHtml(f.product_name || `Product ID: ${f.product_id}`)}</span></td>
            <td class="px-6 py-4 text-center text-gray-700">${currentStock}</td>
            <td class="px-6 py-4 text-center text-gray-700">${warningStock}</td>
            <td class="px-6 py-4 text-center text-[#2563EB] font-bold text-lg">${predicted}</td>
            <td class="px-6 py-4 text-center text-[#10B981] font-bold text-lg">${recommended}</td>
            <td class="px-6 py-4 text-center">${statusHtml}</td>
        `;
        tr.addEventListener('click', () => openForecastDetail(f));
        tableBody.appendChild(tr);
    });
}

function getMonthKey(value) {
    if (!value) return null;
    const str = String(value);
    if (/^\d{4}-\d{2}/.test(str)) return str.slice(0, 7);
    const date = new Date(str);
    if (isNaN(date)) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey) {
    if (!monthKey) return '--';
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function buildProductForecastSeries(detail) {
    const actualByMonth = new Map();
    const predictedByMonth = new Map();

    (detail.history || []).forEach(row => {
        const monthKey = row.month_key || getMonthKey(row.month || row.transaction_date);
        if (!monthKey) return;
        actualByMonth.set(monthKey, Number(row.total_qty ?? row.actual ?? 0));
    });

    (detail.forecasts || []).forEach(row => {
        const monthKey = getMonthKey(row.target_period);
        if (!monthKey) return;
        const current = predictedByMonth.get(monthKey);
        const currentId = Number(current?.forecast_id || 0);
        const rowId = Number(row.forecast_id || 0);
        if (!current || rowId >= currentId) {
            predictedByMonth.set(monthKey, {
                forecast_id: row.forecast_id,
                predicted: Number(row.predicted_quantity || 0)
            });
        }
    });

    const monthKeys = Array.from(new Set([...actualByMonth.keys(), ...predictedByMonth.keys()]))
        .sort((a, b) => a.localeCompare(b));

    const labels = monthKeys.map(formatMonthLabel);
    const actualValues = monthKeys.map(month => actualByMonth.has(month) ? actualByMonth.get(month) : null);
    const predictedValues = monthKeys.map(month => predictedByMonth.has(month) ? predictedByMonth.get(month).predicted : null);
    const comparable = monthKeys
        .map((month, index) => ({ actual: actualValues[index], predicted: predictedValues[index] }))
        .filter(item => Number.isFinite(item.actual) && item.actual > 0 && Number.isFinite(item.predicted));

    let accuracy = null;
    if (comparable.length > 0) {
        const mape = comparable.reduce((sum, item) => sum + Math.abs(item.actual - item.predicted) / item.actual, 0) / comparable.length;
        accuracy = Math.max(0, 100 - (mape * 100));
    }

    return { labels, actualValues, predictedValues, comparableCount: comparable.length, accuracy };
}

function renderProductForecastChart(series) {
    const canvas = document.getElementById('productForecastChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (productForecastChart) productForecastChart.destroy();

    productForecastChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: series.labels,
            datasets: [
                {
                    label: 'Actual monthly sales',
                    data: series.actualValues,
                    borderColor: '#2563EB',
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.35,
                    spanGaps: false
                },
                {
                    label: 'AI predicted quantity',
                    data: series.predictedValues,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    borderDash: [6, 4],
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.35,
                    spanGaps: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const value = context.raw;
                            return `${context.dataset.label}: ${value === null ? 'No data' : value}`;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

function setDetailLoading(isLoading) {
    if (!detailChartLoading || !detailChartWrap) return;
    detailChartLoading.classList.toggle('hidden', !isLoading);
    detailChartWrap.classList.toggle('hidden', isLoading);
}

async function openForecastDetail(forecast) {
    if (!forecast?.product_id || !forecastDetailModalOverlay) return;

    forecastDetailModalOverlay.classList.remove('hidden');
    forecastDetailModalOverlay.classList.add('flex', 'overlay-enter', 'overlay-enter-active');
    forecastDetailModal.classList.add('modal-enter', 'modal-enter-active');
    if (detailChartLoading) detailChartLoading.textContent = 'Loading product forecast detail...';
    setDetailLoading(true);

    detailProductName.textContent = forecast.product_name || `Product ID: ${forecast.product_id}`;
    detailProductMeta.textContent = `${forecast.sku || ''} ${forecast.category ? '- ' + forecast.category : ''}`.trim() || 'Monthly sales and AI forecast history';
    detailAccuracy.textContent = '--';
    detailAccuracyNote.textContent = 'Calculating from months with both actual sales and AI prediction.';
    detailLatestActual.textContent = '--';
    detailLatestPredicted.textContent = '--';

    try {
        const response = await API.forecast.getByProduct(forecast.product_id);
        const detail = response.data || response;
        const series = buildProductForecastSeries(detail);

        const latestActual = [...series.actualValues].reverse().find(value => Number.isFinite(value));
        const latestPredicted = [...series.predictedValues].reverse().find(value => Number.isFinite(value));
        detailLatestActual.textContent = latestActual === undefined ? '--' : latestActual;
        detailLatestPredicted.textContent = latestPredicted === undefined ? '--' : latestPredicted;

        if (series.accuracy === null) {
            detailAccuracy.textContent = '--';
            detailAccuracyNote.textContent = 'Chưa đủ tháng có cả doanh số thực tế và dự báo để tính độ chính xác.';
        } else {
            detailAccuracy.textContent = `${series.accuracy.toFixed(1)}%`;
            detailAccuracyNote.textContent = `Tính theo MAPE trên ${series.comparableCount} tháng có đủ actual và predicted.`;
        }

        setDetailLoading(false);
        renderProductForecastChart(series);
    } catch (error) {
        console.error('Failed to load product forecast detail:', error);
        if (detailChartLoading) detailChartLoading.textContent = 'Could not load product forecast detail.';
        showToast('Failed to load product detail: ' + error.message, 'error');
    }

    lucide.createIcons();
}

function closeForecastDetailModal() {
    if (!forecastDetailModalOverlay) return;
    forecastDetailModalOverlay.classList.add('hidden');
    forecastDetailModalOverlay.classList.remove('flex', 'overlay-enter', 'overlay-enter-active');
    forecastDetailModal.classList.remove('modal-enter', 'modal-enter-active');
}
function formatPeriod(str) {
    if (!str) return '--';
    const monthKey = getMonthKey(str);
    return monthKey ? formatMonthLabel(monthKey) : String(str);
}

function formatDate(str) {
    if (!str) return '--';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMoney(value) {
    return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

btnRunForecast.addEventListener('click', async () => {
    loadingModalOverlay.classList.remove('hidden');
    loadingModalOverlay.classList.add('overlay-enter', 'overlay-enter-active');
    loadingModal.classList.add('modal-enter', 'modal-enter-active');

    try {
        const period = document.getElementById('timePeriod').value;
        const targetPeriod = getTargetPeriodValue(period);
        await API.forecast.run(targetPeriod);
        showToast('Forecast generation completed successfully!', 'success');
        await loadForecasts();
    } catch (err) {
        showToast('Failed to run forecast: ' + err.message, 'info');
    } finally {
        loadingModalOverlay.classList.add('hidden');
        loadingModalOverlay.classList.remove('overlay-enter', 'overlay-enter-active');
        loadingModal.classList.remove('modal-enter', 'modal-enter-active');
    }
});

if (btnCloseForecastDetail) btnCloseForecastDetail.addEventListener('click', closeForecastDetailModal);
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && forecastDetailModalOverlay && !forecastDetailModalOverlay.classList.contains('hidden')) {
        closeForecastDetailModal();
    }
});

document.getElementById('timePeriod').addEventListener('change', loadForecasts);
document.getElementById('categoryFilter').addEventListener('change', applyFilters);

(async () => {
    await loadCategories();
    await loadForecasts();
})();


