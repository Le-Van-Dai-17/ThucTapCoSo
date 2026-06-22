let revenueTrendChart = null;
let categorySalesChart = null;
let topProductsChart = null;
let enrichedLowStockItems = [];
let aiPurchasePlanItems = [];

const palette = ['#2563EB', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B', '#10B981', '#F97316'];
const defaultRevenueRangeDays = 365;

function numberValue(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatNumber(value) {
    return new Intl.NumberFormat('vi-VN').format(numberValue(value));
}

function formatMoney(value) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        notation: Math.abs(numberValue(value)) >= 1000000 ? 'compact' : 'standard',
        maximumFractionDigits: 1
    }).format(numberValue(value));
}

function formatDateTime(value) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function percentageChange(current, previous) {
    current = numberValue(current);
    previous = numberValue(previous);
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
}

function setTrend(id, change) {
    const el = document.getElementById(id);
    if (!el) return;
    if (change === null) {
        el.textContent = 'No previous data';
        el.className = 'text-xs text-gray-500 mt-2';
        return;
    }
    const up = change >= 0;
    el.textContent = `${up ? '+' : ''}${change.toFixed(1)}% vs last month`;
    el.className = `text-xs mt-2 ${up ? 'text-emerald-600' : 'text-red-600'}`;
}

async function safeLoad(loader, fallback = null) {
    try {
        return await loader();
    } catch (error) {
        console.warn('[Dashboard] optional section failed:', error.message);
        return fallback;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof initSidebar === 'function') await initSidebar();

    try {
        const [stats, salesSummary, inventory, trend, categorySales, topProducts, lowStock, purchases, activityLogs, products] = await Promise.all([
            safeLoad(() => API.dashboard.getStats()),
            safeLoad(() => API.reports.getSalesSummary(getSelectedRevenueDays()), {}),
            safeLoad(() => API.reports.getInventoryStatus(), {}),
            safeLoad(() => API.reports.getSalesTrend(getSelectedRevenueDays()), []),
            safeLoad(() => API.reports.getCategorySales(getSelectedRevenueDays()), []),
            safeLoad(() => API.reports.getTopProducts(getSelectedRevenueDays()), []),
            safeLoad(() => API.dashboard.getLowStockForecast()),
            safeLoad(() => API.orders.getAll(), { data: [] }),
            safeLoad(() => API.activityLogs.getAll(), []),
            safeLoad(() => API.products.getAll(), { data: [] })
        ]);

        const statsData = stats?.data || {};
        const topProductData = Array.isArray(topProducts) ? topProducts : (topProducts?.data || []);
        const productData = products?.data || products || [];
        const lowStockData = enrichLowStockItems(lowStock?.data || [], productData);
        enrichedLowStockItems = lowStockData;
        const purchaseData = purchases?.data || purchases || [];

        renderKpis(statsData, salesSummary || {}, inventory || {}, purchaseData, lowStockData);
        renderRevenueTrend(Array.isArray(trend) ? trend : []);
        renderCategorySales(Array.isArray(categorySales) ? categorySales : []);
        renderTopProducts(topProductData);
        renderStockWarnings(lowStockData);
        renderForecastSummary(lowStockData, statsData, inventory || {});
        renderPurchaseStatus(purchaseData);
        renderRecentActivities(Array.isArray(activityLogs) ? activityLogs : [], purchaseData, lowStockData);
        bindRevenueRangeSelect();
        applyStaffCustomization();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    }

    if (window.lucide) lucide.createIcons();
});

function renderKpis(stats, salesSummary, inventory, purchases, lowStock) {
    const pendingPOs = purchases.filter(po => String(po.status_key || po.status || '').toLowerCase() === 'pending').length;
    const currentMonthRevenue = numberValue(salesSummary.current_month_revenue || stats.totalRevenue);
    const previousMonthRevenue = numberValue(salesSummary.previous_month_revenue);
    const totalRevenue = numberValue(salesSummary.total_revenue || stats.totalRevenue);
    const grossProfit = totalRevenue * 0.28;

    setText('statOrders', formatNumber(salesSummary.total_orders || stats.totalOrders));
    setText('statRevenue', formatMoney(currentMonthRevenue));
    setText('statProfit', formatMoney(grossProfit));
    setText('statInventoryValue', formatMoney(inventory.inventory_value));
    setText('statProducts', formatNumber(inventory.total_products || stats.totalProducts));
    setText('statLowStock', formatNumber(inventory.low_stock_items || stats.lowStockItems));
    setText('statOutStock', `Out of stock: ${formatNumber(inventory.out_of_stock_items)}`);
    setText('statPendingPOs', formatNumber(pendingPOs));
    setText('statForecastItems', formatNumber(lowStock.length || inventory.low_stock_items || stats.lowStockItems));
    setTrend('trendRevenue', percentageChange(currentMonthRevenue, previousMonthRevenue));
}

function getSelectedRevenueDays() {
    const select = document.getElementById('dashboardRangeSelect');
    return Number(select?.value || defaultRevenueRangeDays);
}

function bindRevenueRangeSelect() {
    const select = document.getElementById('dashboardRangeSelect');
    if (!select) return;
    updateRevenueRangeLabel();
    select.addEventListener('change', async () => {
        updateRevenueRangeLabel();
        await reloadTimeScopedSections();
    });
}

function updateRevenueRangeLabel() {
    const select = document.getElementById('dashboardRangeSelect');
    const label = document.getElementById('revenueRangeLabel');
    if (label && select) label.textContent = select.options[select.selectedIndex]?.text || '12 months';
}

async function reloadTimeScopedSections() {
    const days = getSelectedRevenueDays();
    const [salesSummary, trend, categorySales, topProducts] = await Promise.all([
        safeLoad(() => API.reports.getSalesSummary(days), {}),
        safeLoad(() => API.reports.getSalesTrend(days), []),
        safeLoad(() => API.reports.getCategorySales(days), []),
        safeLoad(() => API.reports.getTopProducts(days), [])
    ]);

    renderTimeScopedKpis(salesSummary || {});
    renderRevenueTrend(Array.isArray(trend) ? trend : []);
    renderCategorySales(Array.isArray(categorySales) ? categorySales : []);
    renderTopProducts(Array.isArray(topProducts) ? topProducts : []);
}

function renderTimeScopedKpis(salesSummary) {
    const currentRevenue = numberValue(salesSummary.current_month_revenue || salesSummary.total_revenue);
    const previousRevenue = numberValue(salesSummary.previous_month_revenue);
    setText('statOrders', formatNumber(salesSummary.total_orders));
    setText('statRevenue', formatMoney(currentRevenue));
    setText('statProfit', formatMoney(numberValue(salesSummary.total_revenue) * 0.28));
    setTrend('trendRevenue', percentageChange(currentRevenue, previousRevenue));
}

function buildRevenueTrendData(rows) {
    const days = getSelectedRevenueDays();
    const raw = Array.isArray(rows) ? rows : [];
    if (days < 180) return raw;

    const grouped = new Map();
    raw.forEach(row => {
        const label = String(row.date || row.sale_date || '').split(' ').slice(0, 1).join(' ') || 'Period';
        grouped.set(label, (grouped.get(label) || 0) + numberValue(row.sales || row.total_revenue));
    });

    return Array.from(grouped, ([date, sales]) => ({ date, sales }));
}

function renderRevenueTrend(rows) {
    const data = buildRevenueTrendData(rows);
    const labels = data.map(row => row.date || row.sale_date || '');
    const values = data.map(row => numberValue(row.sales || row.total_revenue));
    const ctx = document.getElementById('revenueTrendChart');
    if (!ctx) return;
    if (revenueTrendChart) revenueTrendChart.destroy();
    revenueTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: values,
                borderColor: '#2563EB',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: chartBaseOptions({ yMoney: true })
    });
}

function renderCategorySales(rows) {
    const data = rows.slice(0, 6);
    const total = data.reduce((sum, row) => sum + numberValue(row.total_revenue), 0);
    const ctx = document.getElementById('categorySalesChart');
    const legend = document.getElementById('categoryLegend');
    if (legend) {
        legend.innerHTML = data.map((row, index) => {
            const value = numberValue(row.total_revenue);
            const pct = total ? (value / total) * 100 : 0;
            return `<div class="flex items-center gap-2 text-xs">
                <span class="w-2.5 h-2.5 rounded-full" style="background:${palette[index % palette.length]}"></span>
                <span class="flex-1 truncate text-gray-700">${row.category || 'Other'}</span>
                <span class="font-semibold text-gray-500">${pct.toFixed(1)}%</span>
                <span class="font-semibold text-gray-800">${formatMoney(value)}</span>
            </div>`;
        }).join('') || '<p class="text-sm text-gray-500">No category sales yet.</p>';
    }
    if (!ctx) return;
    if (categorySalesChart) categorySalesChart.destroy();
    categorySalesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(row => row.category || 'Other'),
            datasets: [{ data: data.map(row => numberValue(row.total_revenue)), backgroundColor: palette, borderWidth: 0 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.label}: ${formatMoney(c.raw)}` } } }
        }
    });
}

function renderTopProducts(rows) {
    const data = rows.slice(0, 10).reverse();
    const ctx = document.getElementById('topProductsChart');
    if (!ctx) return;
    if (topProductsChart) topProductsChart.destroy();
    topProductsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(row => row.name),
            datasets: [{ data: data.map(row => numberValue(row.total_revenue)), backgroundColor: '#2563EB', borderRadius: 4, barThickness: 12 }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => formatMoney(c.raw) } } },
            scales: {
                x: { beginAtZero: true, grid: { color: '#EEF2F7' }, ticks: { callback: value => compactNumber(value) } },
                y: { grid: { display: false }, ticks: { font: { size: 11 } } }
            }
        }
    });
}

function renderStockWarnings(rows) {
    const body = document.getElementById('stockWarningRows');
    if (!body) return;
    const isStaff = typeof Auth !== 'undefined' && Auth.getRole() === 'staff';
    if (!rows.length) {
        body.innerHTML = `<tr><td colspan="${isStaff ? 6 : 7}" class="px-5 py-8 text-center text-gray-500">No critical stock warnings.</td></tr>`;
        updateCreateAllPOsButton();
        return;
    }
    body.innerHTML = rows.slice(0, 5).map(item => {
        const current = numberValue(item.current_stock);
        const min = numberValue(item.warning_stock_level || item.min_stock_level);
        const forecast = numberValue(item.predicted_demand);
        const suggested = numberValue(item.recommended_order);
        const critical = current === 0 || current <= min * 0.35;
        const disabled = item.can_create_po ? '' : 'disabled title="Missing supplier or cost"';
        return `<tr>
            <td class="px-5 py-3 font-medium text-gray-900">${item.name || '--'}</td>
            <td class="px-5 py-3 text-right text-red-600 font-semibold">${formatNumber(current)}</td>
            <td class="px-5 py-3 text-right text-gray-700">${formatNumber(min)}</td>
            <td class="px-5 py-3 text-right text-gray-700">${formatNumber(forecast)}</td>
            <td class="px-5 py-3 text-right text-gray-900 font-semibold">${formatNumber(suggested)}</td>
            <td class="px-5 py-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-semibold ${critical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}">${critical ? 'Critical' : 'Low'}</span></td>
            ${isStaff ? '' : `<td class="px-5 py-3 text-center"><button onclick="createLowStockPO(${item.product_id})" class="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 disabled:opacity-50" ${disabled}>Create PO</button></td>`}
        </tr>`;
    }).join('');
    updateCreateAllPOsButton();
}

function enrichLowStockItems(items, products) {
    const productMap = new Map((products || []).map(product => [Number(product.product_id || product.id), product]));
    return (items || []).map(item => {
        const product = productMap.get(Number(item.product_id)) || {};
        const supplierId = product.supplier_id || item.supplier_id || null;
        const unitCost = numberValue(product.cost_price || item.unit_cost || item.cost_price);
        const recommended = Math.max(1, Math.ceil(numberValue(item.recommended_order || item.predicted_demand || 1)));
        return {
            ...item,
            supplier_id: supplierId,
            supplier_name: product.supplier_name || item.supplier_name || '',
            unit_cost: unitCost,
            ordered_quantity: recommended,
            forecasted_quantity: numberValue(item.predicted_demand || recommended),
            can_create_po: !!supplierId && unitCost >= 0 && recommended > 0
        };
    });
}

function updateCreateAllPOsButton() {
    const btn = document.getElementById('createAllPOsBtn');
    if (!btn) return;
    btn.disabled = !enrichedLowStockItems.some(item => item.can_create_po);
}

function buildPurchaseItem(item) {
    return {
        product_id: item.product_id,
        forecasted_quantity: item.forecasted_quantity || item.ordered_quantity,
        ordered_quantity: item.ordered_quantity,
        quantity: item.ordered_quantity,
        unit_cost: item.unit_cost,
        unit_price: item.unit_cost,
        line_total: numberValue(item.ordered_quantity) * numberValue(item.unit_cost)
    };
}

function getExpectedDeliveryDate() {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function groupItemsBySupplier(items) {
    return items.reduce((acc, item) => {
        const supplierId = item.supplier_id;
        if (!acc[supplierId]) {
            acc[supplierId] = {
                supplier_id: supplierId,
                supplier_name: item.supplier_name || `Supplier #${supplierId}`,
                items: []
            };
        }
        acc[supplierId].items.push(item);
        return acc;
    }, {});
}

function updateAIPlanSummary() {
    aiPurchasePlanItems.forEach((item, index) => {
        const input = document.getElementById(`aiPlanQty_${index}`);
        if (input) item.ordered_quantity = Math.max(0, numberValue(input.value));
    });

    const selectedItems = aiPurchasePlanItems.filter(item => item.selected && item.ordered_quantity > 0);
    const totalQuantity = selectedItems.reduce((sum, item) => sum + numberValue(item.ordered_quantity), 0);
    const totalCost = selectedItems.reduce((sum, item) => sum + numberValue(item.ordered_quantity) * numberValue(item.unit_cost), 0);
    const suppliers = new Set(selectedItems.map(item => item.supplier_id));

    setText('aiPlanItemCount', `${selectedItems.length}`);
    setText('aiPlanSupplierCount', `${suppliers.size}`);
    setText('aiPlanEstimatedValue', formatMoney(totalCost));
    setText('aiSummaryItems', `${selectedItems.length} / ${aiPurchasePlanItems.length}`);
    setText('aiSummaryQuantity', formatNumber(totalQuantity));
    setText('aiSummaryCost', formatMoney(totalCost));

    selectedItems.forEach((item, index) => {
        const subtotal = document.querySelector(`[data-ai-subtotal="${item.product_id}"]`);
        if (subtotal) subtotal.textContent = formatMoney(numberValue(item.ordered_quantity) * numberValue(item.unit_cost));
    });
}

function renderAIPlanModal(items) {
    aiPurchasePlanItems = items.map(item => ({ ...item, selected: true }));
    const groupsEl = document.getElementById('aiPlanGroups');
    const expectedDate = document.getElementById('aiPlanExpectedDate');
    if (expectedDate) expectedDate.value = getExpectedDeliveryDate();
    if (!groupsEl) return;

    const groups = Object.values(groupItemsBySupplier(aiPurchasePlanItems));
    groupsEl.innerHTML = groups.map(group => {
        const rows = group.items.map(item => {
            const index = aiPurchasePlanItems.findIndex(row => Number(row.product_id) === Number(item.product_id));
            return `<tr class="border-t border-gray-100">
                <td class="px-4 py-3"><input type="checkbox" checked onchange="aiPurchasePlanItems[${index}].selected = this.checked; updateAIPlanSummary();" class="w-4 h-4 accent-blue-600"></td>
                <td class="px-4 py-3"><div class="font-semibold text-gray-900">${item.name || '--'}</div><div class="text-xs text-gray-500">SKU: ${item.sku || '--'}</div></td>
                <td class="px-4 py-3 text-right text-red-600 font-semibold">${formatNumber(item.current_stock)}</td>
                <td class="px-4 py-3 text-right">${formatNumber(item.forecasted_quantity)}</td>
                <td class="px-4 py-3 text-right">${formatNumber(item.recommended_order || item.ordered_quantity)}</td>
                <td class="px-4 py-3"><input id="aiPlanQty_${index}" type="number" min="0" value="${item.ordered_quantity}" oninput="updateAIPlanSummary()" class="w-24 px-3 py-2 rounded-lg border border-gray-200 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"></td>
                <td class="px-4 py-3 text-right">${formatMoney(item.unit_cost)}</td>
                <td class="px-4 py-3 text-right font-semibold" data-ai-subtotal="${item.product_id}">${formatMoney(item.ordered_quantity * item.unit_cost)}</td>
                <td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">AI Suggested</span></td>
            </tr>`;
        }).join('');
        const estValue = group.items.reduce((sum, item) => sum + numberValue(item.ordered_quantity) * numberValue(item.unit_cost), 0);
        return `<section class="border border-gray-200 rounded-xl overflow-hidden">
            <div class="px-4 py-3 bg-gray-50 flex items-center justify-between">
                <h3 class="font-bold text-gray-900">${group.supplier_name}</h3>
                <span class="text-sm font-semibold text-gray-600">Est. Value: ${formatMoney(estValue)}</span>
            </div>
            <table class="w-full text-sm">
                <thead class="bg-white text-xs uppercase text-gray-500">
                    <tr><th class="px-4 py-3"></th><th class="px-4 py-3 text-left">Product</th><th class="px-4 py-3 text-right">Current</th><th class="px-4 py-3 text-right">Forecast</th><th class="px-4 py-3 text-right">Suggested</th><th class="px-4 py-3 text-right">Ordered Qty</th><th class="px-4 py-3 text-right">Unit Cost</th><th class="px-4 py-3 text-right">Subtotal</th><th class="px-4 py-3 text-center">Status</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </section>`;
    }).join('');

    updateAIPlanSummary();
    if (window.lucide) lucide.createIcons();
}

function openAIPurchasePlanModal(items) {
    const validItems = items.filter(item => item.can_create_po);
    if (!validItems.length) {
        showToast('Please assign supplier and cost for these products first.', 'warning');
        return;
    }
    renderAIPlanModal(validItems);
    const overlay = document.getElementById('aiPurchasePlanOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
    }
}

window.closeAIPurchasePlanModal = function() {
    const overlay = document.getElementById('aiPurchasePlanOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
    }
};

async function createPurchaseOrdersFromItems(items, status) {
    const validItems = items.filter(item => item.selected && item.can_create_po && numberValue(item.ordered_quantity) > 0);
    if (!validItems.length) throw new Error('No selected items have valid ordered quantities.');

    const groups = groupItemsBySupplier(validItems);
    const expectedDate = document.getElementById('aiPlanExpectedDate')?.value || getExpectedDeliveryDate();
    const results = [];
    for (const group of Object.values(groups)) {
        results.push(await API.orders.create({
            supplier_id: Number(group.supplier_id),
            status,
            expected_delivery_date: expectedDate,
            items: group.items.map(buildPurchaseItem)
        }));
    }
    return results;
}

window.createLowStockPO = function(productId) {
    const item = enrichedLowStockItems.find(row => Number(row.product_id) === Number(productId));
    if (!item) return;
    openAIPurchasePlanModal([item]);
};

window.createAllLowStockPOs = function() {
    openAIPurchasePlanModal(enrichedLowStockItems);
};

window.submitAIPurchasePlan = async function(status) {
    try {
        updateAIPlanSummary();
        const results = await createPurchaseOrdersFromItems(aiPurchasePlanItems, status);
        showToast(`${status === 'Draft' ? 'Saved' : 'Created'} ${results.length} purchase order(s).`, 'success');
        closeAIPurchasePlanModal();
        await refreshPurchaseSections();
    } catch (error) {
        showToast(error.message || 'Cannot create purchase plan.', 'error');
    }
};

async function refreshPurchaseSections() {
    const purchases = await safeLoad(() => API.orders.getAll(), { data: [] });
    const purchaseData = purchases?.data || purchases || [];
    renderPurchaseStatus(purchaseData);
    renderRecentActivities([], purchaseData, enrichedLowStockItems);
}
function renderForecastSummary(lowStock, stats, inventory) {
    const targetPeriod = new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
    const estimatedImportValue = lowStock.reduce((sum, item) => sum + numberValue(item.recommended_order) * 10000, 0);
    const isStaff = typeof Auth !== 'undefined' && Auth.getRole() === 'staff';
    const rows = [
        ['clock', 'Last Forecast Run', formatDateTime(new Date())],
        ['calendar-days', 'Forecast Target Period', targetPeriod],
        ['shopping-cart', 'Products Forecasted', formatNumber(inventory.total_products || stats.totalProducts)],
        ['alert-triangle', 'Items Needing Reorder', formatNumber(lowStock.length || inventory.low_stock_items || stats.lowStockItems)]
    ];
    if (!isStaff) {
        rows.push(
            ['package', 'Estimated Import Value', formatMoney(estimatedImportValue)],
            ['box', 'Model Version', 'Local forecast rules']
        );
    }
    const el = document.getElementById('forecastSummary');
    if (!el) return;
    el.innerHTML = rows.map(([icon, label, value]) => `<div class="py-3 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0"><i data-lucide="${icon}" class="w-4 h-4"></i></div>
        <div class="min-w-0 flex-1"><p class="text-xs font-semibold text-gray-500">${label}</p></div>
        <p class="text-xs font-bold text-gray-900 text-right">${value}</p>
    </div>`).join('');
}

function renderPurchaseStatus(purchases) {
    const counts = purchases.reduce((acc, po) => {
        const key = String(po.status_key || po.status || 'draft').toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const statuses = [
        ['draft', 'Draft', 'file-text', 'bg-blue-50 text-blue-600'],
        ['pending', 'Pending', 'line-chart', 'bg-violet-50 text-violet-600'],
        ['approved', 'Approved', 'check-circle', 'bg-emerald-50 text-emerald-600'],
        ['shipped', 'Shipped', 'truck', 'bg-cyan-50 text-cyan-600'],
        ['received', 'Received', 'package-check', 'bg-green-50 text-green-600'],
        ['completed', 'Completed', 'package-check', 'bg-green-50 text-green-600']
    ];
    const el = document.getElementById('poStatusList');
    if (!el) return;
    el.innerHTML = statuses.map(([key, label, icon, color]) => `<div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0"><i data-lucide="${icon}" class="w-4 h-4"></i></div>
        <span class="text-sm text-gray-700 flex-1">${label}</span>
        <span class="px-2 py-1 rounded-full bg-gray-100 text-xs font-bold text-gray-700">${counts[key] || 0}</span>
    </div>`).join('');
}

function renderRecentActivities(logs, purchases, lowStock) {
    const el = document.getElementById('recentActivities');
    if (!el) return;
    const fromLogs = logs.slice(0, 5).map(log => ({
        icon: 'activity',
        color: 'bg-blue-50 text-blue-600',
        title: log.action || log.action_type || 'Activity',
        meta: log.description || log.username || 'System event'
    }));
    const fallback = [
        ...purchases.slice(0, 2).map(po => ({ icon: 'shopping-cart', color: 'bg-blue-50 text-blue-600', title: `Purchase order ${po.po_code || po.order_number || po.id}`, meta: `${po.status || 'Updated'} by ${po.created_by_name || 'team'}` })),
        ...lowStock.slice(0, 2).map(item => ({ icon: 'alert-triangle', color: 'bg-red-50 text-red-600', title: `Low stock alert for ${item.name}`, meta: `Current stock: ${formatNumber(item.current_stock)}` })),
        { icon: 'trending-up', color: 'bg-emerald-50 text-emerald-600', title: 'Forecast dashboard refreshed', meta: 'Latest metrics loaded' }
    ];
    const items = (fromLogs.length ? fromLogs : fallback).slice(0, 5);
    el.innerHTML = items.map(item => `<div class="flex items-start gap-3">
        <div class="w-9 h-9 rounded-lg ${item.color} flex items-center justify-center shrink-0"><i data-lucide="${item.icon}" class="w-4 h-4"></i></div>
        <div class="min-w-0"><p class="text-xs font-semibold text-gray-900 leading-5">${item.title}</p><p class="text-xs text-gray-500 leading-4">${item.meta}</p></div>
    </div>`).join('');
}

function compactNumber(value) {
    return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(numberValue(value));
}

function chartBaseOptions({ yMoney = false } = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => yMoney ? formatMoney(c.raw) : formatNumber(c.raw) } } },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 }, maxTicksLimit: 8 } },
            y: { beginAtZero: true, grid: { color: '#EEF2F7' }, ticks: { callback: value => yMoney ? compactNumber(value) : value } }
        }
    };
}

function applyStaffCustomization() {
    if (typeof Auth === 'undefined' || Auth.getRole() !== 'staff') return;
    
    // Hide financial cards
    ['cardRevenue', 'cardProfit', 'cardInventoryValue'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Hide charts
    ['chartRevenueTrend', 'chartCategorySales'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Resize Top Products card
    const topProductsCard = document.getElementById('chartTopProducts');
    if (topProductsCard) {
        topProductsCard.classList.remove('xl:col-span-4');
        topProductsCard.classList.add('xl:col-span-12');
    }
    
    // Hide manager action links/buttons
    ['btnRunForecast', 'lnkViewAllWarnings', 'btnViewFullForecast', 'btnViewTopProductsReport', 'createAllPOsBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const thAction = document.getElementById('thStockWarningAction');
    if (thAction) thAction.style.display = 'none';
}