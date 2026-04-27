lucide.createIcons();

const mockPurchaseOrders = [
  { id: "PO-2024-001", supplier: "TechSupply Inc.", createdDate: "2024-03-20", status: "received", totalValue: 15420, itemCount: 3 },
  { id: "PO-2024-002", supplier: "Global Electronics", createdDate: "2024-03-22", status: "approved", totalValue: 28350, itemCount: 5 },
  { id: "PO-2024-003", supplier: "Accessory Warehouse", createdDate: "2024-03-23", status: "pending", totalValue: 12600, itemCount: 4 },
  { id: "PO-2024-004", supplier: "Premium Parts Ltd.", createdDate: "2024-03-24", status: "approved", totalValue: 45200, itemCount: 6 },
  { id: "PO-2024-005", supplier: "TechSupply Inc.", createdDate: "2024-03-25", status: "draft", totalValue: 8900, itemCount: 2 },
  { id: "PO-2024-006", supplier: "Quick Parts Supply", createdDate: "2024-03-26", status: "pending", totalValue: 19750, itemCount: 4 },
  { id: "PO-2024-007", supplier: "Global Electronics", createdDate: "2024-03-27", status: "approved", totalValue: 33100, itemCount: 7 },
];

const statusConfig = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  pending: { label: "Pending", color: "bg-orange-100 text-orange-700" },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-700" },
  received: { label: "Received", color: "bg-[#10B981]/10 text-[#10B981]" },
};

const statusFilter = document.getElementById('statusFilter');
const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
const statsCardsContainer = document.getElementById('statsCardsContainer');

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function setupStatsCards() {
    const totalOrders = mockPurchaseOrders.length;
    const pendingCount = mockPurchaseOrders.filter((o) => o.status === "pending").length;
    const approvedCount = mockPurchaseOrders.filter((o) => o.status === "approved").length;
    const totalValue = mockPurchaseOrders.reduce((sum, o) => sum + o.totalValue, 0);

    statsCardsContainer.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="text-sm text-gray-500 mb-1">Total Orders</div>
            <div class="text-2xl font-semibold text-gray-900">${totalOrders}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="text-sm text-gray-500 mb-1">Pending Approval</div>
            <div class="text-2xl font-semibold text-orange-600">${pendingCount}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="text-sm text-gray-500 mb-1">Approved</div>
            <div class="text-2xl font-semibold text-blue-600">${approvedCount}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="text-sm text-gray-500 mb-1">Total Value</div>
            <div class="text-2xl font-semibold text-gray-900">${formatCurrency(totalValue)}</div>
        </div>
    `;
}

function renderTable() {
    const filter = statusFilter.value;
    const filteredOrders = filter === "all" ? mockPurchaseOrders : mockPurchaseOrders.filter((order) => order.status === filter);

    tableBody.innerHTML = '';
    if (filteredOrders.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filteredOrders.forEach((order, index) => {
            const bgClass = index % 2 === 0 ? "bg-white" : "bg-gray-50/50";
            const statusConfigItem = statusConfig[order.status];

            const tr = document.createElement('tr');
            tr.className = `hover:bg-gray-50 transition-colors duration-150 ${bgClass}`;

            let editBtnHtml = '';
            if (order.status !== "received") {
                editBtnHtml = `
                    <button onclick="alert('Editing Order ${order.id}')" class="p-2 text-gray-600 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-all duration-150" title="Edit Order">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                `;
            }

            tr.innerHTML = `
                <td class="px-6 py-4"><span class="font-medium text-gray-900">${order.id}</span></td>
                <td class="px-6 py-4"><span class="text-gray-700">${order.supplier}</span></td>
                <td class="px-6 py-4"><span class="text-gray-600">${formatDate(order.createdDate)}</span></td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${statusConfigItem.color}">
                        ${statusConfigItem.label}
                    </span>
                </td>
                <td class="px-6 py-4 text-right"><span class="text-gray-700">${order.itemCount}</span></td>
                <td class="px-6 py-4 text-right"><span class="font-medium text-gray-900">${formatCurrency(order.totalValue)}</span></td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="alert('Viewing Details for ${order.id}')" class="p-2 text-gray-600 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-all duration-150" title="View Details">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        ${editBtnHtml}
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
        // Reinitialize icons for dynamically created rows
        lucide.createIcons();
    }
}

statusFilter.addEventListener('change', renderTable);

// Init
setupStatsCards();
renderTable();
