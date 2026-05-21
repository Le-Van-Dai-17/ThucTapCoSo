lucide.createIcons();

if (typeof Auth !== 'undefined') Auth.requireAuth();

// Mock data fallback
const MOCK_USERS = [
    { id: 1, username: "admin001", full_name: "John Anderson", email: "john.anderson@company.com", role: "Admin", status: "active", created_at: "2023-01-15" },
    { id: 2, username: "manager001", full_name: "Sarah Johnson", email: "sarah.johnson@company.com", role: "Manager", status: "active", created_at: "2023-03-20" },
    { id: 3, username: "staff001", full_name: "Michael Chen", email: "michael.chen@company.com", role: "Staff", status: "active", created_at: "2023-05-10" },
    { id: 4, username: "manager002", full_name: "Emily Rodriguez", email: "emily.rodriguez@company.com", role: "Manager", status: "active", created_at: "2023-06-12" },
    { id: 5, username: "staff002", full_name: "David Kim", email: "david.kim@company.com", role: "Staff", status: "active", created_at: "2023-07-22" },
    { id: 6, username: "staff003", full_name: "Jennifer Martinez", email: "jennifer.martinez@company.com", role: "Staff", status: "inactive", created_at: "2023-08-15" },
    { id: 7, username: "manager003", full_name: "Robert Taylor", email: "robert.taylor@company.com", role: "Manager", status: "active", created_at: "2023-09-05" },
    { id: 8, username: "staff004", full_name: "Lisa Wang", email: "lisa.wang@company.com", role: "Staff", status: "active", created_at: "2023-10-18" },
];

let users = [];
let isUsingMock = false;
let userToDeleteId = null;

const searchInput = document.getElementById('searchInput');
const roleFilter = document.getElementById('roleFilter');
const statsContainer = document.getElementById('statsContainer');
const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
const addModalOverlay = document.getElementById('addModalOverlay');
const addModal = document.getElementById('addModal');
const deleteModalOverlay = document.getElementById('deleteModalOverlay');
const deleteModal = document.getElementById('deleteModal');

// Load users từ API
async function loadUsers() {
    try {
        const result = await API.users.getAll();
        users = (result.data || result).map(u => ({
            id: u.id,
            username: u.username,
            full_name: u.full_name || u.fullName,
            email: u.email,
            role: capitalizeFirst(u.role),
            status: u.status || 'active',
            created_at: u.created_at || u.createdDate
        }));
        isUsingMock = false;
    } catch (err) {
        console.warn('[Users] Dùng mock data:', err.message);
        users = [...MOCK_USERS];
        isUsingMock = true;
    }
    renderTable();
    formatStats();
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Helpers
function getRoleBadgeColor(role) {
    if (role === 'Admin') return 'bg-red-100 text-red-600';
    if (role === 'Manager') return 'bg-[#2563EB]/10 text-[#2563EB]';
    if (role === 'Staff') return 'bg-[#10B981]/10 text-[#10B981]';
    return 'bg-gray-100 text-gray-600';
}
function formatDateStr(str) {
    if (!str) return '--';
    const d = new Date(str);
    return isNaN(d) ? str : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

// Stats
function formatStats() {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const admins = users.filter(u => u.role === 'Admin').length;
    const managers = users.filter(u => u.role === 'Manager').length;

    statsContainer.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
            <div class="text-sm font-medium text-gray-500 mb-1">Total Users</div>
            <div class="text-2xl font-semibold text-gray-900">${total}</div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
            <div class="text-sm font-medium text-gray-500 mb-1">Active Users</div>
            <div class="text-2xl font-semibold text-[#10B981]">${active}</div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
            <div class="text-sm font-medium text-gray-500 mb-1">Admins</div>
            <div class="text-2xl font-semibold text-red-600">${admins}</div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
            <div class="text-sm font-medium text-gray-500 mb-1">Managers</div>
            <div class="text-2xl font-semibold text-[#2563EB]">${managers}</div>
        </div>`;
}

// Render table
function renderTable() {
    const q = searchInput.value.toLowerCase();
    const roleMap = roleFilter.value;

    const filtered = users.filter(u => {
        const matchSearch = (u.username || '').toLowerCase().includes(q)
            || (u.full_name || '').toLowerCase().includes(q)
            || (u.email || '').toLowerCase().includes(q);
        const matchRole = roleMap === 'All Roles' || u.role === roleMap;
        return matchSearch && matchRole;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
    } else {
        if (emptyState) emptyState.classList.add('hidden');
        filtered.forEach(user => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 transition-colors duration-150';

            const roleOptions = ['Admin', 'Manager', 'Staff'].map(r =>
                `<option value="${r}" ${user.role === r ? 'selected' : ''}>${r}</option>`
            ).join('');

            const badgeColor = getRoleBadgeColor(user.role);
            const isAct = user.status === 'active';
            const toggleBg = isAct ? 'bg-[#10B981]' : 'bg-gray-300';
            const toggleThumb = isAct ? 'translate-x-6' : 'translate-x-1';

            tr.innerHTML = `
                <td class="px-6 py-4"><span class="font-mono text-sm font-medium text-gray-900">${user.username}</span></td>
                <td class="px-6 py-4"><span class="text-sm font-medium text-gray-900">${user.full_name}</span></td>
                <td class="px-6 py-4"><span class="text-sm text-gray-600">${user.email}</span></td>
                <td class="px-6 py-4">
                    <div class="flex justify-center">
                        <select onchange="changeRole(${user.id}, this.value)"
                            class="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-2 border-transparent hover:border-gray-300 transition-all duration-200 ${badgeColor} outline-none"
                            style="appearance:none;padding-right:28px;text-align:center;">
                            ${roleOptions}
                        </select>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex justify-center">
                        <button onclick="toggleStatus(${user.id})"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${toggleBg}">
                            <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${toggleThumb}"></span>
                        </button>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                        <i data-lucide="calendar" class="w-4 h-4"></i>
                        ${formatDateStr(user.created_at)}
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center">
                        <button onclick="prepareDelete(${user.id})"
                            class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>`;
            tableBody.appendChild(tr);
        });
        lucide.createIcons();
    }
}

// Toggle status
window.toggleStatus = async function (id) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';

    try {
        if (!isUsingMock) {
            await API.users.update(id, { status: newStatus });
        }
        user.status = newStatus;
        renderTable();
        formatStats();
        showToast(`Tài khoản ${user.username} đã ${newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hoá'}.`, 'info');
    } catch (err) {
        showToast('Cập nhật thất bại: ' + err.message, 'error');
    }
};

// Đổi role
window.changeRole = async function (id, newRole) {
    const user = users.find(u => u.id === id);
    if (!user) return;

    try {
        if (!isUsingMock) {
            await API.users.update(id, { role: newRole.toLowerCase() });
        }
        user.role = newRole;
        renderTable();
        formatStats();
        showToast(`Đã đổi quyền ${user.username} thành ${newRole}.`, 'success');
    } catch (err) {
        showToast('Đổi quyền thất bại: ' + err.message, 'error');
    }
};

// Delete modal
window.prepareDelete = function (id) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    document.getElementById('deleteUserName').textContent = u.full_name;
    document.getElementById('deleteUsernameTag').textContent = u.username;
    userToDeleteId = id;
    openModal(deleteModalOverlay, deleteModal);
};

window.closeDeleteModal = function () {
    closeModal(deleteModalOverlay, deleteModal);
    userToDeleteId = null;
};

window.confirmDeleteUser = async function () {
    if (!userToDeleteId) return;
    const user = users.find(u => u.id === userToDeleteId);
    try {
        if (!isUsingMock) {
            await API.users.delete(userToDeleteId);
        }
        users = users.filter(u => u.id !== userToDeleteId);
        renderTable();
        formatStats();
        showToast(`Đã xoá tài khoản ${user?.username || ''}.`, 'success');
    } catch (err) {
        showToast('Xoá thất bại: ' + err.message, 'error');
    }
    closeDeleteModal();
};

// Add modal
window.openAddModal = function () {
    openModal(addModalOverlay, addModal);
    updateRadioStyles();
};
window.closeAddModal = function () {
    closeModal(addModalOverlay, addModal);
    setTimeout(() => {
        const form = document.getElementById('addForm');
        if (form) form.reset();
        updateRadioStyles();
    }, 200);
};

window.updateRadioStyles = function () {
    document.querySelectorAll('input[name="addRole"]').forEach(r => {
        const lbl = r.closest('label');
        if (!lbl) return;
        if (r.checked) {
            lbl.classList.add('border-[#2563EB]', 'bg-[#2563EB]/5');
            lbl.classList.remove('border-gray-200', 'hover:bg-gray-50');
        } else {
            lbl.classList.remove('border-[#2563EB]', 'bg-[#2563EB]/5');
            lbl.classList.add('border-gray-200', 'hover:bg-gray-50');
        }
    });
};

window.handleAddSubmit = async function (e) {
    e.preventDefault();
    const uname = document.getElementById('addUsername').value.trim();
    const fname = document.getElementById('addFullName').value.trim();
    const email = document.getElementById('addEmail').value.trim();
    const password = document.getElementById('addPassword')?.value || '123456';
    const roleEl = document.querySelector('input[name="addRole"]:checked');
    if (!roleEl) return;
    const role = roleEl.value;

    const payload = { username: uname, full_name: fname, email, password, role: role.toLowerCase() };

    try {
        if (!isUsingMock) {
            await API.users.create(payload); // POST /api/users/create
        }
        // Build newUser từ form data (không dùng result.data vì BE chỉ trả { success, message })
        const newUser = {
            id: Date.now(),
            username: uname,
            full_name: fname,
            email,
            role: capitalizeFirst(role),
            status: 'active',
            created_at: new Date().toISOString()
        };
        users.push(newUser);
        renderTable();
        formatStats();
        showToast(`Created account ${uname} successfully!`, 'success');
        closeAddModal();
    } catch (err) {
        showToast('Failed to create user: ' + err.message, 'error');
    }
};

// Modal animation helpers
function openModal(overlay, modal) {
    overlay.classList.remove('hidden');
    overlay.classList.remove('overlay-leave', 'overlay-leave-active');
    overlay.classList.add('overlay-enter', 'overlay-enter-active');
    modal.classList.remove('modal-leave', 'modal-leave-active');
    modal.classList.add('modal-enter', 'modal-enter-active');
}
function closeModal(overlay, modal) {
    overlay.classList.remove('overlay-enter', 'overlay-enter-active');
    overlay.classList.add('overlay-leave', 'overlay-leave-active');
    modal.classList.remove('modal-enter', 'modal-enter-active');
    modal.classList.add('modal-leave', 'modal-leave-active');
    setTimeout(() => overlay.classList.add('hidden'), 200);
}

// Event Listeners
searchInput.addEventListener('input', renderTable);
roleFilter.addEventListener('change', renderTable);

// Khởi động
loadUsers();
