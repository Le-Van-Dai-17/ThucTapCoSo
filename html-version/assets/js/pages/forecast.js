lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
const btnRunForecast = document.getElementById('btnRunForecast');
const forecastInfoBox = document.getElementById('forecastInfoBox');
const forecastInfoText = document.getElementById('forecastInfoText');

const loadingModalOverlay = document.getElementById('loadingModalOverlay');
const loadingModal = document.getElementById('loadingModal');

let forecasts = [];
let allForecasts = [];

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
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="8" class="py-10 text-center text-gray-500">Loading latest forecasts...</td></tr>`;
    try {
        const period = document.getElementById('timePeriod').value;
        const targetPeriod = getTargetPeriodValue(period);
        const data = await API.forecast.getSaved(targetPeriod);
        allForecasts = data || [];
        forecasts = allForecasts;
    } catch (error) {
        console.error("Failed to load forecasts:", error);
        allForecasts = [];
        forecasts = [];
    }
    applyFilters();
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

    let latestDateStr = '--';
    if (forecasts.length > 0 && (forecasts[0].forecast_date || forecasts[0].created_at)) {
        latestDateStr = formatDate(forecasts[0].forecast_date || forecasts[0].created_at);
    }
    forecastInfoText.textContent = `Viewing latest forecast generated on ${latestDateStr}`;

    forecasts.forEach((f, idx) => {
        const tr = document.createElement('tr');
        const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
        tr.className = `hover:bg-gray-50 transition-colors duration-150 ${bgClass}`;

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
            <td class="px-6 py-4"><span class="font-medium text-gray-900">${f.product_name || `Product ID: ${f.product_id}`}</span></td>
            <td class="px-6 py-4 text-center text-gray-700">${f.target_period || '--'}</td>
            <td class="px-6 py-4 text-center text-gray-500 text-sm">${formatDate(f.forecast_date || f.created_at)}</td>
            <td class="px-6 py-4 text-center text-gray-700">${currentStock}</td>
            <td class="px-6 py-4 text-center text-gray-700">${warningStock}</td>
            <td class="px-6 py-4 text-center text-[#2563EB] font-bold text-lg">${predicted}</td>
            <td class="px-6 py-4 text-center text-[#10B981] font-bold text-lg">${recommended}</td>
            <td class="px-6 py-4 text-center">${statusHtml}</td>
        `;
        tableBody.appendChild(tr);
    });
}

function formatDate(str) {
    if (!str) return '--';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
        showToast("Failed to run forecast: " + err.message, 'info');
    } finally {
        loadingModalOverlay.classList.add('hidden');
        loadingModalOverlay.classList.remove('overlay-enter', 'overlay-enter-active');
        loadingModal.classList.remove('modal-enter', 'modal-enter-active');
    }
});

document.getElementById('timePeriod').addEventListener('change', loadForecasts);
document.getElementById('categoryFilter').addEventListener('change', applyFilters);

// Init
(async () => {
    await loadCategories();
    await loadForecasts();
})();
