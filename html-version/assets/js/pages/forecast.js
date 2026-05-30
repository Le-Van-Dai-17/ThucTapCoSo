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

async function loadForecasts() {
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-gray-500">Loading latest forecasts...</td></tr>`;
    try {
        const data = await API.forecast.getSaved();
        forecasts = data || [];
    } catch (error) {
        console.error("Failed to load forecasts:", error);
        forecasts = [];
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

    // Group or just display all. Assuming the API returns a list of recent forecasts.
    // Let's find the latest date.
    let latestDateStr = '--';
    if (forecasts.length > 0 && forecasts[0].created_at) {
        latestDateStr = formatDate(forecasts[0].created_at);
    }
    forecastInfoText.textContent = `Viewing latest forecast generated on ${latestDateStr}`;

    forecasts.forEach((f, idx) => {
        const tr = document.createElement('tr');
        const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
        tr.className = `hover:bg-gray-50 transition-colors duration-150 ${bgClass}`;

        const lower = f.lower_bound != null ? f.lower_bound : 0;
        const upper = f.upper_bound != null ? f.upper_bound : 0;
        const dateGen = formatDate(f.created_at);

        tr.innerHTML = `
            <td class="px-6 py-4"><span class="font-medium text-gray-900">${f.product_name || `Product ID: ${f.product_id}`}</span></td>
            <td class="px-6 py-4 text-center text-gray-600">${dateGen}</td>
            <td class="px-6 py-4 text-center text-[#2563EB] font-bold text-lg">${f.predicted_quantity || 0}</td>
            <td class="px-6 py-4 text-center text-gray-500 text-sm">${lower} - ${upper}</td>
            <td class="px-6 py-4 text-center text-[#10B981] font-bold text-lg">${f.recommended_order || 0}</td>
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
        await API.forecast.run();
        showToast('Forecast generation completed successfully!', 'success');
        await loadForecasts();
    } catch (err) {
        alert("Failed to run forecast: " + err.message);
    } finally {
        loadingModalOverlay.classList.add('hidden');
        loadingModalOverlay.classList.remove('overlay-enter', 'overlay-enter-active');
        loadingModal.classList.remove('modal-enter', 'modal-enter-active');
    }
});

function showToast(message, type = 'success') {
    const existing = document.getElementById('_toast');
    if (existing) existing.remove();
    const colors = { success: 'bg-[#10B981] text-white', error: 'bg-red-500 text-white', warning: 'bg-yellow-500 text-white', info: 'bg-[#2563EB] text-white' };
    const toast = document.createElement('div');
    toast.id = '_toast';
    toast.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all duration-300 ${colors[type] || colors.success}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Init
loadForecasts();
