document.addEventListener('DOMContentLoaded', () => {
    // Requires layout.js to define Auth and current user
    if (!Auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    loadSalesData();
});

async function loadSalesData() {
    const tbody = document.getElementById('salesTableBody');
    const emptyState = document.getElementById('emptyState');
    
    showLoading('salesTableBody');

    try {
        const res = await API.sales.getAll();
        const sales = res.data || [];

        if (sales.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        tbody.innerHTML = sales.map(s => {
            const date = new Date(s.sale_date).toLocaleDateString('vi-VN', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return `
                <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">${date}</td>
                    <td class="px-6 py-4 text-gray-900 font-medium whitespace-nowrap">${s.transaction_code || s.transaction_id || '--'}</td>
                    <td class="px-6 py-4 text-gray-700">
                        <div class="font-medium">${s.product_name}</div>
                        <div class="text-xs text-gray-500">SKU: ${s.sku || '--'}</div>
                    </td>
                    <td class="px-6 py-4 text-center text-gray-900 font-medium">${s.quantity}</td>
                    <td class="px-6 py-4 text-right text-gray-600">$${Number(s.unit_price).toFixed(2)}</td>
                    <td class="px-6 py-4 text-right text-gray-900 font-semibold">$${Number(s.total_amount).toFixed(2)}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-red-500">
                    <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                    Failed to load sales data: ${error.message}
                </td>
            </tr>
        `;
        lucide.createIcons();
    }
}
