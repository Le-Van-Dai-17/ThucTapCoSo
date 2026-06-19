lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

const params = new URLSearchParams(window.location.search);
const editingId = params.get('id');
let suppliers = [];
const categoryNames = ['Gao', 'Mi goi', 'Bot', 'Gia vi', 'Ngu coc', 'Dau an', 'Nuoc cham'];
const selectedCategories = new Set(['Gao', 'Mi goi', 'Bot', 'Gia vi']);

function val(id) { return document.getElementById(id)?.value?.trim() || ''; }
function setVal(id, value) { const el = document.getElementById(id); if (el) el.value = value || ''; }

function renderCategories() {
    document.getElementById('categoryChoices').innerHTML = categoryNames.map(name => `
        <button type="button" data-category="${name}" class="category-choice px-5 py-3 rounded-lg border flex items-center gap-2 ${selectedCategories.has(name) ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]' : 'border-gray-200 bg-white text-gray-700'}">
            <i data-lucide="${selectedCategories.has(name) ? 'check-circle-2' : 'circle'}" class="w-4 h-4"></i> ${name}
        </button>
    `).join('');
    document.querySelectorAll('.category-choice').forEach(btn => btn.addEventListener('click', () => {
        const name = btn.dataset.category;
        selectedCategories.has(name) ? selectedCategories.delete(name) : selectedCategories.add(name);
        renderCategories();
        updatePreview();
    }));
    lucide.createIcons();
}

function checkDone(key) {
    const checks = {
        basic: !!val('name'),
        contact: !!val('contact') && !!val('phone'),
        address: !!val('address'),
        lead: !!val('leadTime'),
        payment: !!val('paymentTerms') || !!val('minOrder'),
        categories: selectedCategories.size > 0,
        notes: !!val('notes')
    };
    return checks[key];
}

function renderChecklist() {
    const items = [
        ['basic', 'Basic information', 'Supplier name, code, status, tax code'],
        ['contact', 'Contact added', 'Contact person, phone, email'],
        ['address', 'Address completed', 'Province/city, district, detailed address'],
        ['lead', 'Lead time set', 'Lead time and delivery method'],
        ['payment', 'Payment terms set', 'Payment terms and minimum order value'],
        ['categories', 'Categories assigned', 'At least one category selected'],
        ['notes', 'Notes added (optional)', 'Additional notes or constraints']
    ];
    document.getElementById('checklist').innerHTML = items.map(([key, title, sub]) => {
        const done = checkDone(key);
        return `<div class="flex items-start gap-3"><span class="mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center ${done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'}"><i data-lucide="check" class="w-3.5 h-3.5"></i></span><div><p class="font-semibold text-sm">${title}</p><p class="text-xs text-gray-500 mt-0.5">${sub}</p></div></div>`;
    }).join('');
    lucide.createIcons();
}

function updatePreview() {
    document.getElementById('previewName').textContent = val('name') || 'Supplier Name';
    document.getElementById('previewCode').textContent = val('code') || '-';
    document.getElementById('previewLead').textContent = val('leadTime') ? `${val('leadTime')} days` : '-';
    document.getElementById('previewPayment').textContent = val('paymentTerms') || '-';
    document.getElementById('previewCategories').textContent = selectedCategories.size ? selectedCategories.size : '-';
    document.getElementById('noteCounter').textContent = `${val('notes').length} / 1000`;
    renderChecklist();
}

async function loadForm() {
    renderCategories();
    if (editingId) {
        document.getElementById('pageTitle').textContent = 'Edit Supplier';
        document.getElementById('breadcrumbCurrent').textContent = 'Edit Supplier';
        document.getElementById('submitSupplierBtn').innerHTML = '<i data-lucide="save" class="w-5 h-5"></i> Update Supplier';
        suppliers = await API.suppliers.getAll();
        const supplier = suppliers.find(s => String(s.supplier_id || s.id) === String(editingId));
        if (supplier) {
            setVal('name', supplier.name);
            setVal('contact', supplier.contact_name || supplier.contact_person);
            setVal('phone', supplier.phone);
            setVal('email', supplier.email);
            setVal('address', supplier.address);
            setVal('leadTime', supplier.lead_time_days || 7);
            setVal('code', `SUP-${String(supplier.supplier_id || supplier.id).padStart(3, '0')}`);
            selectedCategories.clear();
            (supplier.supplied_categories || []).forEach(c => selectedCategories.add(c));
            renderCategories();
        }
    }
    updatePreview();
    lucide.createIcons();
}

document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
});

document.getElementById('saveDraftBtn').addEventListener('click', () => {
    const draft = collectPayload();
    localStorage.setItem('forecastai_supplier_draft', JSON.stringify(draft));
    showToast('Draft saved locally.', 'success');
});

function collectPayload() {
    return {
        name: val('name'),
        contact_name: val('contact'),
        phone: val('phone'),
        email: val('email'),
        address: [val('address'), val('district'), val('province')].filter(Boolean).join(', '),
        lead_time_days: Number(val('leadTime') || 7)
    };
}

document.getElementById('supplierForm').addEventListener('submit', async event => {
    event.preventDefault();
    const btn = document.getElementById('submitSupplierBtn');
    btn.disabled = true;
    btn.textContent = editingId ? 'Updating...' : 'Creating...';
    try {
        const payload = collectPayload();
        if (editingId) {
            await API.suppliers.update(editingId, payload);
            showToast('Supplier updated successfully.', 'success');
            window.location.href = `supplier-detail.html?id=${editingId}`;
        } else {
            const res = await API.suppliers.create(payload);
            const newId = res?.data?.supplier_id || res?.supplier_id;
            showToast('Supplier created successfully.', 'success');
            window.location.href = newId ? `supplier-detail.html?id=${newId}` : 'suppliers.html';
        }
    } catch (error) {
        showToast(`Cannot save supplier: ${error.message}`, 'error');
        btn.disabled = false;
        btn.innerHTML = editingId ? '<i data-lucide="save" class="w-5 h-5"></i> Update Supplier' : '<i data-lucide="plus" class="w-5 h-5"></i> Create Supplier';
        lucide.createIcons();
    }
});

loadForm();
