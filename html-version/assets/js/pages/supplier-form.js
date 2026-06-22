lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

const params = new URLSearchParams(window.location.search);
const editingId = params.get('id');
let suppliers = [];
let categoryNames = [];
const selectedCategories = new Set();

const provinces = ["An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "TP Hồ Chí Minh", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"];

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
    if (window.lucide) lucide.createIcons();
}

function checkDone(key) {
    const checks = {
        basic: !!val('name'),
        contact: !!val('contact') && !!val('phone'),
        address: !!val('address') && !!val('province'),
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
    if (window.lucide) lucide.createIcons();
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

    const provinceInput = document.getElementById('province');
    const provinceDropdown = document.getElementById('provinceDropdown');
    const districtInput = document.getElementById('district');
    const districtDropdown = document.getElementById('districtDropdown');
    
    let apiProvinces = [];
    let currentDistricts = [];

    // Fetch administrative units
    try {
        const res = await fetch('https://provinces.open-api.vn/api/?depth=2');
        apiProvinces = await res.json();
    } catch(e) {
        console.error("Failed to fetch provinces", e);
        apiProvinces = provinces.map(p => ({ name: p, districts: [] })); // fallback
    }

    function renderProvinceDropdown(filterText = '') {
        if (!provinceDropdown) return;
        const text = filterText.toLowerCase();
        const filtered = apiProvinces.filter(p => p.name.toLowerCase().includes(text));
        
        if (filtered.length === 0) {
            provinceDropdown.innerHTML = `<div class="px-4 py-3 text-gray-500 text-sm">No matches found</div>`;
            return;
        }
        
        provinceDropdown.innerHTML = filtered.map(p => `
            <div class="province-option px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-gray-700 text-sm transition-colors" data-value="${p.name}" data-code="${p.code}">
                ${p.name}
            </div>
        `).join('');

        document.querySelectorAll('.province-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                const pName = e.target.dataset.value;
                if (provinceInput) provinceInput.value = pName;
                provinceDropdown.classList.add('hidden');
                
                // Set districts
                const selectedP = apiProvinces.find(p => p.name === pName);
                currentDistricts = selectedP ? selectedP.districts : [];
                if (districtInput) {
                    districtInput.disabled = false;
                    districtInput.value = '';
                }
                
                updatePreview();
            });
        });
    }

    function renderDistrictDropdown(filterText = '') {
        if (!districtDropdown) return;
        const text = filterText.toLowerCase();
        const filtered = currentDistricts.filter(d => d.name.toLowerCase().includes(text));
        
        if (filtered.length === 0) {
            districtDropdown.innerHTML = `<div class="px-4 py-3 text-gray-500 text-sm">No districts found</div>`;
            return;
        }
        
        districtDropdown.innerHTML = filtered.map(d => `
            <div class="district-option px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-gray-700 text-sm transition-colors" data-value="${d.name}">
                ${d.name}
            </div>
        `).join('');

        document.querySelectorAll('.district-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                if (districtInput) districtInput.value = e.target.dataset.value;
                districtDropdown.classList.add('hidden');
                updatePreview();
            });
        });
    }

    if (provinceInput && provinceDropdown) {
        ['focus', 'click', 'input'].forEach(evt => {
            provinceInput.addEventListener(evt, (e) => {
                renderProvinceDropdown(provinceInput.value);
                provinceDropdown.classList.remove('hidden');
            });
        });
    }

    if (districtInput && districtDropdown) {
        ['focus', 'click', 'input'].forEach(evt => {
            districtInput.addEventListener(evt, (e) => {
                renderDistrictDropdown(districtInput.value);
                districtDropdown.classList.remove('hidden');
            });
        });
    }

    document.addEventListener('click', (e) => {
        if (provinceInput && provinceDropdown && !provinceInput.contains(e.target) && !provinceDropdown.contains(e.target)) {
            provinceDropdown.classList.add('hidden');
        }
        if (districtInput && districtDropdown && !districtInput.contains(e.target) && !districtDropdown.contains(e.target)) {
            districtDropdown.classList.add('hidden');
        }
    });

    try {
        const catData = await API.categories.getAll();
        categoryNames = catData.map(c => c.name || c.category_name);
    } catch (e) {
        console.error("Failed to load categories:", e);
    }
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
            
            const parts = (supplier.address || '').split(', ').map(s => s.trim());
            if (parts.length >= 3) {
                const pName = parts.pop();
                setVal('province', pName);
                const selectedP = apiProvinces.find(prov => prov.name === pName);
                currentDistricts = selectedP ? selectedP.districts : [];
                if (districtInput) districtInput.disabled = false;
                
                setVal('district', parts.pop());
                setVal('address', parts.join(', '));
            } else {
                setVal('address', supplier.address);
                if (districtInput) districtInput.disabled = true;
            }
            
            setVal('leadTime', supplier.lead_time_days || 7);
            setVal('code', `SUP-${String(supplier.supplier_id || supplier.id).padStart(3, '0')}`);
            setVal('taxCode', supplier.tax_code);
            setVal('notes', supplier.notes);
            setVal('minOrder', supplier.min_order_value);
            setVal('paymentTerms', supplier.payment_terms);
            setVal('aiRelevance', supplier.ai_relevance || 'Medium');

            selectedCategories.clear();
            (supplier.supplied_categories || []).forEach(c => selectedCategories.add(c));
            renderCategories();
        }
    }
    updatePreview();
    if (window.lucide) lucide.createIcons();
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
        lead_time_days: Number(val('leadTime') || 7),
        tax_code: val('taxCode'),
        notes: val('notes'),
        min_order_value: Number(val('minOrder') || 0),
        payment_terms: val('paymentTerms'),
        ai_relevance: val('aiRelevance'),
        supplied_categories: Array.from(selectedCategories)
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
