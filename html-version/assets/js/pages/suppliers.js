lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

let suppliers = [];
let products = [];
let orders = [];
let currentPage = 1;
const pageSize = 6;

const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
const supplierStats = document.getElementById('supplierStats');
const supplierSearch = document.getElementById('supplierSearch');
const categoryFilter = document.getElementById('categoryFilter');
const leadTimeFilter = document.getElementById('leadTimeFilter');
const statusFilter = document.getElementById('statusFilter');
const paginationInfo = document.getElementById('paginationInfo');
const pageButtons = document.getElementById('pageButtons');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');

function unwrap(res) {
    return Array.isArray(res) ? res : (res?.data || []);
}

function money(value) {
    return `${Math.round(Number(value || 0)).toLocaleString('vi-VN')} d`;
}

function supplierId(supplier) {
    return supplier.supplier_id || supplier.id;
}

function supplierProducts(id) {
    return products.filter(product => String(product.supplier_id || '') === String(id));
}

function supplierOrders(id) {
    return orders.filter(order => String(order.supplier_id || '') === String(id));
}

function getStatus(supplier) {
    return String(supplier.status || supplier.is_active || 'Active').toLowerCase().includes('inactive') ? 'Inactive' : 'Active';
}

async function loadSuppliersPage() {
    tableBody.innerHTML = `<tr><td colspan="10" class="py-12 text-center text-gray-500">Loading suppliers...</td></tr>`;
    try {
        const [supplierRes, productRes, orderRes] = await Promise.all([
            API.suppliers.getAll(),
            API.products.getAll().catch(() => []),
            API.orders.getAll().catch(() => [])
        ]);
        suppliers = unwrap(supplierRes).map(s => ({ ...s, id: supplierId(s) }));
        products = unwrap(productRes);
        orders = unwrap(orderRes);
        populateCategoryFilter();
        renderStats();
        renderTable();
    } catch (error) {
        console.error('Failed to load suppliers:', error);
        tableBody.innerHTML = `<tr><td colspan="10" class="py-12 text-center text-red-500">Cannot load suppliers from server.</td></tr>`;
    }
}

function populateCategoryFilter() {
    const categories = new Set();
    suppliers.forEach(s => (s.supplied_categories || []).forEach(c => categories.add(c)));
    products.forEach(p => { if (p.category || p.category_name) categories.add(p.category || p.category_name); });
    categoryFilter.innerHTML = '<option value="all">All Categories</option>' + [...categories].sort().map(c => `<option value="${c}">${c}</option>`).join('');
}

function renderStats() {
    const total = suppliers.length;
    const active = suppliers.filter(s => getStatus(s) === 'Active').length;
    const avgLead = total ? (suppliers.reduce((sum, s) => sum + Number(s.lead_time_days || 0), 0) / total).toFixed(1) : '0.0';
    const open = orders.filter(o => !['received', 'completed', 'cancelled'].includes(String(o.status || '').toLowerCase())).length;
    const cards = [
        { label: 'Total Suppliers', value: total, sub: 'All suppliers in your network', icon: 'users', tone: 'blue' },
        { label: 'Active Suppliers', value: active, sub: 'Currently active and available', icon: 'shield-check', tone: 'green' },
        { label: 'Average Lead Time', value: `${avgLead} days`, sub: 'Across all active suppliers', icon: 'clock', tone: 'purple' },
        { label: 'Open Purchase Orders', value: open, sub: 'Awaiting supplier confirmation', icon: 'shopping-cart', tone: 'orange' }
    ];
    const tones = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        green: 'bg-green-50 text-green-600 border-green-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        orange: 'bg-orange-50 text-orange-600 border-orange-100'
    };
    supplierStats.innerHTML = cards.map(card => `
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl border ${tones[card.tone]} flex items-center justify-center"><i data-lucide="${card.icon}" class="w-7 h-7"></i></div>
            <div>
                <p class="text-sm text-gray-500 font-medium">${card.label}</p>
                <p class="text-3xl font-semibold text-gray-950 mt-1">${card.value}</p>
                <p class="text-sm text-gray-500 mt-2">${card.sub}</p>
            </div>
        </div>
    `).join('');
}

function getFilteredSuppliers() {
    const q = (supplierSearch.value || '').trim().toLowerCase();
    const cat = categoryFilter.value;
    const lead = leadTimeFilter.value;
    const status = statusFilter.value;

    return suppliers.filter(s => {
        const id = supplierId(s);
        const pList = supplierProducts(id);
        const categories = new Set([...(s.supplied_categories || []), ...pList.map(p => p.category || p.category_name).filter(Boolean)]);
        const text = `${s.name || ''} ${s.contact_name || s.contact_person || ''} ${s.phone || ''} ${s.email || ''} ${s.address || ''}`.toLowerCase();
        const leadDays = Number(s.lead_time_days || 0);
        const statusOk = status === 'all' || getStatus(s).toLowerCase() === status;
        const categoryOk = cat === 'all' || categories.has(cat);
        const leadOk = lead === 'all' || (lead === 'fast' && leadDays <= 3) || (lead === 'standard' && leadDays >= 4 && leadDays <= 7) || (lead === 'slow' && leadDays >= 8);
        return (!q || text.includes(q)) && categoryOk && leadOk && statusOk;
    });
}

function renderTable() {
    const filtered = getFilteredSuppliers();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * pageSize;
    const visible = filtered.slice(start, start + pageSize);

    tableBody.innerHTML = '';
    emptyState.classList.toggle('hidden', filtered.length > 0);

    visible.forEach(s => {
        const id = supplierId(s);
        const pList = supplierProducts(id);
        const categories = [...new Set([...(s.supplied_categories || []), ...pList.map(p => p.category || p.category_name).filter(Boolean)])].slice(0, 2);
        const status = getStatus(s);
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors';
        tr.innerHTML = `
            <td class="px-5 py-4"><a href="supplier-detail.html?id=${id}" class="font-semibold text-[#2563EB] hover:underline">${s.name || '--'}</a></td>
            <td class="px-5 py-4 text-gray-700">${s.contact_name || s.contact_person || '--'}</td>
            <td class="px-5 py-4 text-gray-600">${s.phone || '--'}</td>
            <td class="px-5 py-4 text-gray-600">${s.email || '--'}</td>
            <td class="px-5 py-4 text-gray-600 max-w-[220px] truncate" title="${s.address || ''}">${s.address || '--'}</td>
            <td class="px-5 py-4"><div class="flex flex-wrap gap-1">${categories.map(c => `<span class="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium">${c}</span>`).join('') || '<span class="text-gray-400">--</span>'}</div></td>
            <td class="px-5 py-4 text-center"><span class="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium">${pList.length} products</span></td>
            <td class="px-5 py-4 text-center font-semibold text-gray-900">${s.lead_time_days || 0} days</td>
            <td class="px-5 py-4 text-center"><span class="px-3 py-1.5 rounded-lg text-xs font-semibold ${status === 'Active' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}">${status}</span></td>
            <td class="px-5 py-4"><div class="flex items-center justify-center gap-2">
                <a href="supplier-detail.html?id=${id}" class="w-9 h-9 rounded-lg border border-gray-200 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center" title="View"><i data-lucide="eye" class="w-4 h-4"></i></a>
                <a href="supplier-form.html?id=${id}" class="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></a>
                <a href="purchase-order-form.html?supplier_id=${id}" class="w-9 h-9 rounded-lg border border-blue-200 text-[#2563EB] hover:bg-blue-50 flex items-center justify-center" title="Create PO"><i data-lucide="shopping-cart" class="w-4 h-4"></i></a>
                <button class="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center" title="More"><i data-lucide="more-vertical" class="w-4 h-4"></i></button>
            </div></td>
        `;
        tableBody.appendChild(tr);
    });

    const end = Math.min(start + visible.length, filtered.length);
    paginationInfo.textContent = `Showing ${filtered.length ? start + 1 : 0} to ${end} of ${filtered.length} suppliers`;
    pageButtons.innerHTML = Array.from({ length: totalPages }, (_, idx) => idx + 1).slice(0, 5).map(page => `
        <button class="w-9 h-9 rounded-lg border ${page === currentPage ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white border-gray-200 hover:bg-gray-50'}" onclick="goToPage(${page})">${page}</button>
    `).join('');
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    lucide.createIcons();
}

window.goToPage = function(page) {
    currentPage = page;
    renderTable();
};

[supplierSearch, categoryFilter, leadTimeFilter, statusFilter].forEach(el => {
    el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { currentPage = 1; renderTable(); });
});

document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    supplierSearch.value = '';
    categoryFilter.value = 'all';
    leadTimeFilter.value = 'all';
    statusFilter.value = 'all';
    currentPage = 1;
    renderTable();
});

prevPageBtn.addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); renderTable(); });
nextPageBtn.addEventListener('click', () => { currentPage += 1; renderTable(); });

document.getElementById('exportSuppliersBtn').addEventListener('click', () => {
    const csv = ['Supplier,Contact,Phone,Email,Address,Lead Time'].concat(suppliers.map(s => [s.name, s.contact_name || s.contact_person || '', s.phone || '', s.email || '', s.address || '', s.lead_time_days || 0].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'suppliers.csv';
    link.click();
    URL.revokeObjectURL(link.href);
});

loadSuppliersPage();

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const globalSearch = document.querySelector('header input[placeholder*="Search"]');
        if (globalSearch) {
            globalSearch.parentElement.parentElement.style.visibility = 'hidden';
        }
    }, 100);
});
