lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

let suppliers = [];
let editingSupplierId = null;
let deletingSupplierId = null;

const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');

// Modals
const supplierModalOverlay = document.getElementById('supplierModalOverlay');
const supplierModal = document.getElementById('supplierModal');
const deleteModalOverlay = document.getElementById('deleteModalOverlay');
const deleteModal = document.getElementById('deleteModal');

async function loadSuppliers() {
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-gray-500">Loading...</td></tr>`;
    try {
        const data = await API.suppliers.getAll();
        suppliers = (data || []).map(s => ({ ...s, id: s.supplier_id || s.id }));
    } catch (error) {
        console.error("Failed to load suppliers:", error);
        suppliers = [];
    }
    renderTable();
}

function renderTable() {
    tableBody.innerHTML = '';
    if (suppliers.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    suppliers.forEach((s, idx) => {
        const tr = document.createElement('tr');
        const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
        tr.className = `hover:bg-gray-50 transition-colors duration-150 ${bgClass}`;

        tr.innerHTML = `
            <td class="px-6 py-4"><span class="font-medium text-gray-900">${s.name}</span></td>
            <td class="px-6 py-4 text-gray-700">${s.contact_person || '--'}</td>
            <td class="px-6 py-4 text-gray-600">${s.phone || '--'}</td>
            <td class="px-6 py-4 text-gray-600">${s.email || '--'}</td>
            <td class="px-6 py-4 text-center text-gray-900 font-semibold">${s.lead_time_days || 0}</td>
            <td class="px-6 py-4">
                <div class="flex justify-center gap-2">
                    <button onclick="openEditModal(${s.id})" class="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all" title="Edit">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="openDeleteModal(${s.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
    lucide.createIcons();
}

// Supplier Modal Logic
window.openAddModal = function() {
    editingSupplierId = null;
    document.getElementById('modalTitle').textContent = 'Add Supplier';
    document.getElementById('supplierForm').reset();
    showModal(supplierModalOverlay, supplierModal);
};

window.openEditModal = function(id) {
    editingSupplierId = id;
    const s = suppliers.find(x => x.id === id);
    if (!s) return;

    document.getElementById('modalTitle').textContent = 'Edit Supplier';
    document.getElementById('supName').value = s.name || '';
    document.getElementById('supContact').value = s.contact_person || '';
    document.getElementById('supPhone').value = s.phone || '';
    document.getElementById('supEmail').value = s.email || '';
    document.getElementById('supAddress').value = s.address || '';
    document.getElementById('supLeadTime').value = s.lead_time_days || 0;

    showModal(supplierModalOverlay, supplierModal);
};

window.closeSupplierModal = function() {
    hideModal(supplierModalOverlay, supplierModal);
};

window.handleSupplierSubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('modalSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const payload = {
        name: document.getElementById('supName').value.trim(),
        contact_person: document.getElementById('supContact').value.trim(),
        phone: document.getElementById('supPhone').value.trim(),
        email: document.getElementById('supEmail').value.trim(),
        address: document.getElementById('supAddress').value.trim(),
        lead_time_days: parseInt(document.getElementById('supLeadTime').value) || 0
    };

    try {
        if (editingSupplierId) {
            await API.suppliers.update(editingSupplierId, payload);
        } else {
            await API.suppliers.create(payload);
        }
        closeSupplierModal();
        await loadSuppliers();
    } catch (err) {
        alert("Error saving supplier: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Supplier';
    }
};

// Delete Modal Logic
window.openDeleteModal = function(id) {
    deletingSupplierId = id;
    const s = suppliers.find(x => x.id === id);
    if (!s) return;
    document.getElementById('deleteSupName').textContent = s.name;
    showModal(deleteModalOverlay, deleteModal);
};

window.closeDeleteModal = function() {
    hideModal(deleteModalOverlay, deleteModal);
    deletingSupplierId = null;
};

window.confirmDelete = async function() {
    if (!deletingSupplierId) return;
    try {
        await API.suppliers.delete(deletingSupplierId);
        closeDeleteModal();
        await loadSuppliers();
    } catch (err) {
        alert("Cannot delete supplier: " + err.message);
    }
};

// Modal Animation Helpers
function showModal(overlay, modal) {
    overlay.classList.remove('hidden');
    overlay.classList.remove('overlay-leave', 'overlay-leave-active');
    overlay.classList.add('overlay-enter', 'overlay-enter-active');
    modal.classList.remove('modal-leave', 'modal-leave-active');
    modal.classList.add('modal-enter', 'modal-enter-active');
}

function hideModal(overlay, modal) {
    overlay.classList.remove('overlay-enter', 'overlay-enter-active');
    overlay.classList.add('overlay-leave', 'overlay-leave-active');
    modal.classList.remove('modal-enter', 'modal-enter-active');
    modal.classList.add('modal-leave', 'modal-leave-active');
    setTimeout(() => overlay.classList.add('hidden'), 200);
}

// Init
loadSuppliers();
