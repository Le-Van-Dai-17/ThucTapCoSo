document.addEventListener('DOMContentLoaded', () => {
    // Requires layout.js to define Auth and current user
    if (!Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    loadSalesData();
});

let allGroupedSales = {};

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

        allGroupedSales = {};
        sales.forEach(s => {
            const key = s.transaction_code || s.transaction_id;
            if (!allGroupedSales[key]) {
                allGroupedSales[key] = {
                    transaction_id: s.transaction_id,
                    transaction_code: key,
                    date: s.sale_date,
                    total_amount: 0,
                    items: []
                };
            }
            allGroupedSales[key].total_amount += Number(s.total_amount);
            allGroupedSales[key].items.push(s);
        });

        const transactions = Object.values(allGroupedSales).sort((a, b) => new Date(b.date) - new Date(a.date));

        emptyState.classList.add('hidden');
        tbody.innerHTML = transactions.map(t => {
            const date = new Date(t.date).toLocaleDateString('vi-VN', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return `
                <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">${date}</td>
                    <td class="px-6 py-4 text-gray-900 font-medium whitespace-nowrap">${t.transaction_code}</td>
                    <td class="px-6 py-4 text-center text-gray-900 font-medium">${t.items.length}</td>
                    <td class="px-6 py-4 text-right text-gray-900 font-semibold">$${Number(t.total_amount).toFixed(2)}</td>
                    <td class="px-6 py-4 text-center">
                        <button onclick="viewSaleDetail('${t.transaction_code}')" class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-gray-200 text-blue-600 hover:bg-blue-50 transition-colors" title="View Details">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        lucide.createIcons();

    } catch (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-red-500">
                    <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                    Failed to load sales data: ${error.message}
                </td>
            </tr>
        `;
        lucide.createIcons();
    }
}

window.viewSaleDetail = function(transactionCode) {
    const t = allGroupedSales[transactionCode];
    if (!t) return;

    document.getElementById('saleDetailTitle').textContent = `Order ${t.transaction_code}`;
    document.getElementById('saleDetailDate').textContent = `Date: ${new Date(t.date).toLocaleDateString('vi-VN', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })}`;

    const tbody = document.getElementById('saleDetailBody');
    tbody.innerHTML = t.items.map(item => `
        <tr>
            <td class="px-5 py-3">
                <div class="font-medium text-gray-900">${item.product_name}</div>
                <div class="text-xs text-gray-500">SKU: ${item.sku || '--'}</div>
            </td>
            <td class="px-5 py-3 text-center text-gray-900">${item.quantity}</td>
            <td class="px-5 py-3 text-right text-gray-600">$${Number(item.unit_price).toFixed(2)}</td>
            <td class="px-5 py-3 text-right font-semibold text-gray-900">$${Number(item.total_amount).toFixed(2)}</td>
        </tr>
    `).join('');

    document.getElementById('saleDetailTotal').textContent = `$${Number(t.total_amount).toFixed(2)}`;

    const overlay = document.getElementById('saleDetailOverlay');
    const modal = document.getElementById('saleDetailModal');
    
    overlay.classList.remove('hidden');
    // slight delay for transition
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        modal.classList.remove('opacity-0', 'scale-95');
        modal.classList.add('opacity-100', 'scale-100');
    }, 10);
};

window.closeSaleDetail = function() {
    const overlay = document.getElementById('saleDetailOverlay');
    const modal = document.getElementById('saleDetailModal');
    
    overlay.classList.add('opacity-0');
    modal.classList.remove('opacity-100', 'scale-100');
    modal.classList.add('opacity-0', 'scale-95');
    
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 300);
};
