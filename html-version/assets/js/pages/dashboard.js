document.addEventListener('DOMContentLoaded', async () => {
    await initSidebar();

    try {
        await loadStats();
        await loadTopProducts();
        await loadLowStock();
    } catch (e) {
        console.error('Error loading dashboard:', e);
        showToast('Failed to load dashboard data', 'error');
    }
});

async function loadStats() {
    const res = await API.dashboard.getStats();
    if (res && res.success) {
        document.getElementById('statOrders').textContent = res.data.totalOrders;
        document.getElementById('statRevenue').textContent = '$' + Number(res.data.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('statProducts').textContent = res.data.totalProducts;
        document.getElementById('statLowStock').textContent = res.data.lowStockItems;
    }
}

async function loadTopProducts() {
    const res = await API.dashboard.getTopProducts();
    if (res && res.success && res.data) {
        const labels = res.data.map(p => p.name);
        const data = res.data.map(p => p.total_revenue);

        const ctx = document.getElementById('topProductsChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue ($)',
                    data: data,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}

async function loadLowStock() {
    const res = await API.dashboard.getLowStockForecast();
    if (res && res.success && res.data) {
        const listEl = document.getElementById('lowStockList');
        listEl.innerHTML = '';

        if (res.data.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-gray-500 italic">No low stock items detected.</p>';
            return;
        }

        res.data.forEach(item => {
            const recommended = item.recommended_order || 0;
            const bgClass = item.current_stock === 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200';
            const iconColor = item.current_stock === 0 ? 'text-red-500' : 'text-orange-500';

            const card = document.createElement('div');
            card.className = `p-4 border rounded-xl flex items-center justify-between ${bgClass}`;
            card.innerHTML = `
                <div class="flex items-start gap-3">
                    <i data-lucide="alert-circle" class="w-5 h-5 ${iconColor} mt-0.5"></i>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-900">${item.name}</h4>
                        <p class="text-xs text-gray-600 mt-1">Current Stock: <span class="font-bold text-gray-900">${item.current_stock}</span></p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xs font-medium text-gray-500">AI Recommendation</p>
                    <p class="text-sm font-bold text-[#2563EB]">Order +${recommended}</p>
                </div>
            `;
            listEl.appendChild(card);
        });

        // Re-init lucide icons for new elements
        if (window.lucide) {
            lucide.createIcons();
        }
    }
}
