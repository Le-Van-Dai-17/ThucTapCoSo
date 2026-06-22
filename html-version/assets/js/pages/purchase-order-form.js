lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

const params = new URLSearchParams(window.location.search);
let supplierId = params.get('supplier_id');
let supplier = null;
let suppliers = [];
let items = [];

function unwrap(res) { return Array.isArray(res) ? res : (res?.data || []); }
function money(value) { return `${Math.round(Number(value || 0)).toLocaleString('vi-VN')} d`; }
function isoDatePlus(days) { const d = new Date(); d.setDate(d.getDate() + Number(days || 0)); return d.toISOString().slice(0, 10); }

async function loadForm() {
    try {
        const user = Auth.getUser();
        if (user) {
            document.getElementById('createdBy').value = user.full_name || user.username || 'Unknown User';
        }

        const [supplierRes, productRes] = await Promise.all([API.suppliers.getAll(), API.products.getAll().catch(() => [])]);
        suppliers = unwrap(supplierRes);
        
        if (!supplierId) {
            supplier = null;
            renderSupplierCard();
            items = [];
            renderItems();
            return;
        }

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
    if (!supplier) {
        document.getElementById('supplierBreadcrumb').textContent = 'Select Supplier';
        document.getElementById('supplierBreadcrumb').href = '#';
        const options = suppliers.map(s => `<option value="${s.supplier_id || s.id}">${s.name}</option>`).join('');
        document.getElementById('supplierCard').innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><h2 class="font-semibold text-lg text-[#2563EB]">Select Supplier</h2><p class="text-sm text-gray-500 mt-1">Please select a supplier to load their products for ordering.</p></div>
                <select id="supplierSelect" class="px-4 py-3 border border-gray-200 rounded-lg bg-white min-w-[300px] shadow-sm font-medium">
                    <option value="" disabled selected>-- Choose a Supplier --</option>
                    ${options}
                </select>
            </div>`;
        document.getElementById('supplierSelect').addEventListener('change', (e) => {
            window.location.href = `purchase-order-form.html?supplier_id=${e.target.value}`;
        });
        return;
    }

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
    if (window.lucide) lucide.createIcons();
}

function renderItems() {
    const body = document.getElementById('itemsBody');
    if (!supplier) {
        body.innerHTML = '<tr><td colspan="8" class="py-12 text-center text-gray-500">Please select a supplier above to view products.</td></tr>';
        updateSummary();
        return;
    }
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

document.getElementById('saveDraftTopBtn').addEventListener('click', () => submitPurchase('Draft'));
document.getElementById('submitTopBtn').addEventListener('click', () => submitPurchase('Pending'));
document.getElementById('submitSideBtn').addEventListener('click', () => submitPurchase('Pending'));
document.getElementById('previewBtn').addEventListener('click', () => {
    if (!supplier) {
        showToast('Please select a supplier first.', 'warning');
        return;
    }
    const selected = items.filter(item => Number(item.ordered) > 0);
    if (!selected.length) {
        showToast('No items selected for this PO.', 'warning');
        return;
    }
    const total = selected.reduce((sum, item) => sum + Number(item.ordered || 0) * Number(item.product.cost_price || 0), 0);
    
    const previewHtml = `
    <div id="poPreviewModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] mx-4 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2"><i data-lucide="file-text" class="w-6 h-6 text-[#2563EB]"></i> Purchase Order Preview</h3>
                <button onclick="document.getElementById('poPreviewModal').remove()" class="text-gray-400 hover:text-gray-600 transition-colors"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            <div class="p-8 overflow-y-auto" id="previewPrintArea">
                <div class="flex justify-between items-start border-b-2 border-gray-200 pb-8 mb-8">
                    <div>
                        <h2 class="text-3xl font-black text-[#2563EB] tracking-tight">PURCHASE ORDER</h2>
                        <div class="mt-4 space-y-1">
                            <p class="text-gray-500 font-medium">Date: <span class="text-gray-900">${new Date().toLocaleDateString('en-GB')}</span></p>
                            <p class="text-gray-500 font-medium">Expected Delivery: <span class="text-gray-900">${document.getElementById('expectedDate').value || '--'}</span></p>
                            <p class="text-gray-500 font-medium">PO Status: <span class="text-blue-600">Draft</span></p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-gray-900 text-lg">ForecastAI System</p>
                        <p class="text-gray-500 mt-1">Created By: ${document.getElementById('createdBy').value}</p>
                    </div>
                </div>
                
                <div class="mb-8 bg-gray-50 p-5 rounded-lg border border-gray-100">
                    <h4 class="font-bold text-gray-500 uppercase text-xs mb-3 tracking-wider">Vendor (Supplier)</h4>
                    <p class="font-bold text-xl text-gray-900">${supplier.name}</p>
                    <p class="text-gray-600 mt-1">${supplier.address || '--'}</p>
                    <p class="text-gray-600 mt-1 flex items-center gap-2"><i data-lucide="phone" class="w-4 h-4"></i> ${supplier.contact_name || supplier.contact_person || '--'} (${supplier.phone || '--'})</p>
                </div>
                
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-blue-50 border-y border-blue-100">
                            <th class="py-3 px-4 font-semibold text-sm text-[#2563EB] uppercase tracking-wider">Item Description</th>
                            <th class="py-3 px-4 font-semibold text-sm text-[#2563EB] uppercase tracking-wider text-right">Qty</th>
                            <th class="py-3 px-4 font-semibold text-sm text-[#2563EB] uppercase tracking-wider text-right">Unit Price</th>
                            <th class="py-3 px-4 font-semibold text-sm text-[#2563EB] uppercase tracking-wider text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${selected.map(item => `
                        <tr class="hover:bg-gray-50/50">
                            <td class="py-4 px-4">
                                <p class="font-semibold text-gray-900">${item.product.name}</p>
                                <p class="text-xs text-gray-500 mt-1">SKU: ${item.product.sku || '--'} ${item.note ? `&nbsp;|&nbsp; <span class="text-blue-600">Note: ${item.note}</span>` : ''}</p>
                            </td>
                            <td class="py-4 px-4 text-right font-medium text-gray-700">${item.ordered} ${item.product.unit || ''}</td>
                            <td class="py-4 px-4 text-right text-gray-700">${money(item.product.cost_price || 0)}</td>
                            <td class="py-4 px-4 text-right font-bold text-gray-900">${money(item.ordered * (item.product.cost_price || 0))}</td>
                        </tr>`).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="border-t-2 border-gray-200">
                            <td colspan="3" class="py-5 px-4 text-right font-bold text-gray-700 uppercase tracking-wider">Grand Total</td>
                            <td class="py-5 px-4 text-right font-black text-2xl text-[#2563EB]">${money(total)}</td>
                        </tr>
                    </tfoot>
                </table>
                <div class="mt-12 text-xs text-gray-400 text-center uppercase tracking-widest">
                    System-generated document &bull; Priority: ${document.getElementById('priority').value}
                </div>
            </div>
            <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <button onclick="document.getElementById('poPreviewModal').remove()" class="px-5 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 font-semibold text-gray-700 shadow-sm transition-colors">Close</button>
                <button onclick="window.print()" class="px-5 py-2.5 bg-[#2563EB] text-white rounded-lg hover:bg-[#1d4ed8] font-semibold flex items-center gap-2 shadow-sm shadow-blue-200 transition-colors"><i data-lucide="printer" class="w-4 h-4"></i> Print PO</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', previewHtml);
    if (window.lucide) lucide.createIcons();
});

loadForm();
