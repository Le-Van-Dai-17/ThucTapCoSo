lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

const params = new URLSearchParams(window.location.search);
let supplierId = params.get('supplier_id');
let supplier = null;
let suppliers = [];
let items = [];
let source = 'AI Forecast';

function unwrap(res) { return Array.isArray(res) ? res : (res?.data || []); }
function money(value) { return `${Math.round(Number(value || 0)).toLocaleString('vi-VN')} d`; }
function isoDatePlus(days) { const d = new Date(); d.setDate(d.getDate() + Number(days || 0)); return d.toISOString().slice(0, 10); }

async function loadForm() {
    try {
        const [supplierRes, productRes] = await Promise.all([API.suppliers.getAll(), API.products.getAll().catch(() => [])]);
        suppliers = unwrap(supplierRes);
        if (!supplierId && suppliers.length) supplierId = suppliers[0].supplier_id || suppliers[0].id;
        supplier = suppliers.find(s => String(s.supplier_id || s.id) === String(supplierId));
        if (!supplier) throw new Error('Supplier not found');
        const products = unwrap(productRes).filter(p => String(p.supplier_id || '') === String(supplierId));
        items = products.slice(0, 8).map(product => {
            const current = Number(product.current_stock || 0);
            const reorder = Number(product.warning_stock_level || product.min_stock_level || 0);
            const suggested = Math.max(1, Math.ceil(Math.max(reorder * 1.4 - current, reorder || 10)));
            return { product, current, reorder, suggested, ordered: suggested, note: '' };
        });
        document.getElementById('expectedDate').value = isoDatePlus(supplier.lead_time_days || 7);
        renderSupplierCard();
        renderItems();
    } catch (error) {
        showToast(`Cannot load purchase form: ${error.message}`, 'error');
    }
}

function renderSupplierCard() {
    document.getElementById('supplierBreadcrumb').textContent = supplier.name || 'Supplier';
    document.getElementById('supplierBreadcrumb').href = `supplier-detail.html?id=${supplierId}`;
    document.getElementById('supplierCard').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
            <div class="flex items-center gap-4"><div class="w-16 h-16 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center"><i data-lucide="store" class="w-8 h-8"></i></div><div><p class="text-sm text-gray-500">Supplier</p><h2 class="font-semibold text-lg">${supplier.name}</h2><span class="inline-flex mt-2 px-2 py-1 rounded bg-blue-50 text-[#2563EB] text-xs font-semibold">AI-ready supplier</span></div></div>
            <div><p class="text-sm text-gray-500">Contact</p><p class="font-semibold mt-1">${supplier.contact_name || supplier.contact_person || '--'}</p><p class="text-sm text-gray-500 mt-1">${supplier.phone || '--'}</p></div>
            <div><p class="text-sm text-gray-500 flex items-center gap-2"><i data-lucide="clock" class="w-4 h-4 text-[#2563EB]"></i> Lead Time</p><p class="font-semibold text-lg mt-1">${supplier.lead_time_days || 0} days</p></div>
            <div><p class="text-sm text-gray-500 flex items-center gap-2"><i data-lucide="map-pin" class="w-4 h-4 text-[#2563EB]"></i> Address</p><p class="font-semibold mt-1">${supplier.address || '--'}</p></div>
            <div><p class="text-sm text-gray-500 flex items-center gap-2"><i data-lucide="credit-card" class="w-4 h-4 text-[#2563EB]"></i> Payment Terms</p><p class="font-semibold text-lg mt-1">Net 15</p></div>
        </div>`;
    lucide.createIcons();
}

function renderItems() {
    const body = document.getElementById('itemsBody');
    if (!items.length) {
        body.innerHTML = '<tr><td colspan="8" class="py-12 text-center text-gray-500">No products found for this supplier.</td></tr>';
        updateSummary();
        return;
    }
    body.innerHTML = items.map((item, idx) => {
        const p = item.product;
        const total = Number(item.ordered || 0) * Number(p.cost_price || 0);
        return `<tr><td class="px-5 py-4"><div class="font-semibold">${p.name}</div><div class="text-sm text-gray-500">${p.sku || ''}</div></td><td class="px-5 py-4 text-right">${item.current} ${p.unit || ''}</td><td class="px-5 py-4 text-right">${item.reorder} ${p.unit || ''}</td><td class="px-5 py-4 text-center"><span class="px-3 py-1.5 rounded-lg bg-blue-50 text-[#2563EB] font-semibold">${item.suggested}</span></td><td class="px-5 py-4 text-center"><input data-idx="${idx}" class="order-qty w-24 px-3 py-2 border border-gray-200 rounded-lg text-center" type="number" min="0" value="${item.ordered}"></td><td class="px-5 py-4 text-right">${money(p.cost_price || 0)}</td><td class="px-5 py-4 text-right font-semibold">${money(total)}</td><td class="px-5 py-4"><input data-idx="${idx}" class="item-note w-40 px-3 py-2 border border-gray-200 rounded-lg" placeholder="Add note..." value="${item.note || ''}"></td></tr>`;
    }).join('');
    document.querySelectorAll('.order-qty').forEach(input => input.addEventListener('input', e => { items[Number(e.target.dataset.idx)].ordered = Number(e.target.value || 0); renderItems(); }));
    document.querySelectorAll('.item-note').forEach(input => input.addEventListener('input', e => { items[Number(e.target.dataset.idx)].note = e.target.value; }));
    updateSummary();
}

function updateSummary() {
    const selected = items.filter(item => Number(item.ordered) > 0);
    const total = selected.reduce((sum, item) => sum + Number(item.ordered || 0) * Number(item.product.cost_price || 0), 0);
    document.getElementById('summaryCount').textContent = `${selected.length} items`;
    document.getElementById('summaryTotal').textContent = money(total);
    document.getElementById('summaryLead').textContent = `${supplier?.lead_time_days || 0} days`;
}

async function submitPurchase(status) {
    const selected = items.filter(item => Number(item.ordered) > 0);
    if (!selected.length) {
        showToast('Please enter ordered quantity for at least one item.', 'warning');
        return;
    }
    const payload = {
        supplier_id: supplierId,
        status,
        expected_delivery_date: document.getElementById('expectedDate').value,
        items: selected.map(item => ({
            product_id: item.product.product_id || item.product.id,
            ordered_quantity: Number(item.ordered || 0),
            forecasted_quantity: Number(item.suggested || 0),
            received_quantity: 0,
            unit_cost: Number(item.product.cost_price || 0)
        }))
    };
    try {
        await API.orders.create(payload);
        showToast(status === 'Draft' ? 'Draft purchase order saved.' : 'Purchase order submitted for approval.', 'success');
        window.location.href = 'purchase-orders.html';
    } catch (error) {
        showToast(`Cannot create purchase order: ${error.message}`, 'error');
    }
}

function setSource(value) {
    source = value;
    const ai = document.getElementById('sourceAIBtn');
    const manual = document.getElementById('sourceManualBtn');
    ai.className = `py-3 font-semibold border-r border-blue-100 ${source === 'AI Forecast' ? 'bg-blue-50 text-[#2563EB]' : 'bg-white text-gray-600'}`;
    manual.className = `py-3 font-semibold ${source === 'Manual' ? 'bg-blue-50 text-[#2563EB]' : 'bg-white text-gray-600'}`;
}

document.getElementById('sourceAIBtn').addEventListener('click', () => setSource('AI Forecast'));
document.getElementById('sourceManualBtn').addEventListener('click', () => setSource('Manual'));
document.getElementById('saveDraftTopBtn').addEventListener('click', () => submitPurchase('Draft'));
document.getElementById('submitTopBtn').addEventListener('click', () => submitPurchase('Pending'));
document.getElementById('submitSideBtn').addEventListener('click', () => submitPurchase('Pending'));
document.getElementById('previewBtn').addEventListener('click', () => showToast('Preview is reflected in the line-item table and summary.', 'info'));

loadForm();
