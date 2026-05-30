lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

let users = [];
let isUsingMock = false;
let userToDeleteId = null;
let editingUserId = null;

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
    if (tableBody) showLoading('tableBody', 'Loading users...');
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
        console.warn('[Users] Failed to load users:', err.message);
        users = [];
        showToast('Failed to load users from server.', 'error');
    }
    renderTable();
    formatStats();
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div class="text-sm font-medium text-gray-500 mb-1">Total Users</div>
            <div class="text-2xl font-semibold text-gray-900">${total}</div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div class="text-sm font-medium text-gray-500 mb-1">Active Users</div>
            <div class="text-2xl font-semibold text-[#10B981]">${active}</div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div class="text-sm font-medium text-gray-500 mb-1">Admins</div>
            <div class="text-2xl font-semibold text-red-600">${admins}</div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
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
        filtered.forEach((user, idx) => {
            const tr = document.createElement('tr');
            const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
            tr.className = `hover:bg-gray-50 transition-colors duration-150 ${bgClass}`;

            const isAdmin = user.role === 'Admin';
            const roleOptions = isAdmin
                ? `<option value="Admin" selected>Admin</option>`
                : ['Manager', 'Staff'].map(r =>
                    `<option value="${r}" ${user.role === r ? 'selected' : ''}>${r}</option>`
                ).join('');

            const badgeColor = getRoleBadgeColor(user.role);
            const isAct = user.status === 'active';
            const toggleBg = isAct ? 'bg-[#10B981]' : 'bg-gray-300';
            const toggleThumb = isAct ? 'translate-x-6' : 'translate-x-1';
            
            const initials = getInitials(user.full_name || user.username);
            const avatarColors = ['bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-orange-100 text-orange-600', 'bg-pink-100 text-pink-600'];
            const avatarColor = avatarColors[(user.id || 0) % avatarColors.length];

            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${avatarColor}">
                            ${initials}
                        </div>
                        <span class="font-mono text-sm font-medium text-gray-900">${user.username}</span>
                    </div>
                </td>
                <td class="px-6 py-4"><span class="text-sm font-medium text-gray-900">${user.full_name}</span></td>
                <td class="px-6 py-4"><span class="text-sm text-gray-600">${user.email}</span></td>
                <td class="px-6 py-4">
                    <div class="flex justify-center">
                        <select onchange="changeRole(${user.id}, this.value)"
                            ${isAdmin ? 'disabled' : ''} title="${isAdmin ? 'Không thể đổi role của Admin' : ''}"
                            class="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-2 border-transparent hover:border-gray-300 transition-all duration-200 ${badgeColor} outline-none ${isAdmin ? 'opacity-50 cursor-not-allowed' : ''}"
                            style="appearance:none;padding-right:28px;text-align:center;">
                            ${roleOptions}
                        </select>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex justify-center">
                        <button onclick="${isAdmin ? 'alert(\\\'Không thể khoá tài khoản Admin duy nhất.\\\')' : `toggleStatus(${user.id})`}"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${toggleBg} ${isAdmin ? 'opacity-50 cursor-not-allowed' : ''}">
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
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="${isAdmin ? 'alert(\\\'Không thể sửa tài khoản Admin.\\\')' : `openEditModal(${user.id})`}"
                            class="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all duration-150 ${isAdmin ? 'opacity-50 cursor-not-allowed' : ''}" title="Edit Profile">
                            <i data-lucide="edit" class="w-4 h-4"></i>
                        </button>
                        <button onclick="${isAdmin ? 'alert(\\\'Không thể xoá tài khoản Admin duy nhất.\\\')' : `prepareDelete(${user.id})`}"
                            class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 ${isAdmin ? 'opacity-50 cursor-not-allowed' : ''}" title="Delete User">
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
        await API.users.update(id, { status: newStatus });
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
        await API.users.update(id, { role: newRole.toLowerCase() });
        user.role = newRole;
        renderTable();
        formatStats();
        showToast(`Đã đổi quyền ${user.username} thành ${newRole}.`, 'success');
    } catch (err) {
        showToast('Đổi quyền thất bại: ' + err.message, 'error');
        // revert select
        renderTable();
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
        await API.users.delete(userToDeleteId);
        showToast(`Đã xoá tài khoản ${user?.username || ''}.`, 'success');
        closeDeleteModal();
        await loadUsers(); // Sync
    } catch (err) {
        showToast('Xoá thất bại: ' + err.message, 'error');
    }
};

// ==========================================
// ADD / EDIT MODAL
// ==========================================
window.openAddModal = function () {
    editingUserId = null;
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('modalSubmitBtn').textContent = 'Create User';
    
    const unameInput = document.getElementById('addUsername');
    unameInput.disabled = false;
    document.getElementById('addPassword').required = true;
    
    const form = document.getElementById('addForm');
    if(form) form.reset();
    updateRadioStyles();
    
    openModal(addModalOverlay, addModal);
};

window.openEditModal = function (id) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    editingUserId = id;
    document.getElementById('modalTitle').textContent = 'Edit User Profile';
    document.getElementById('modalSubmitBtn').textContent = 'Save Changes';
    
    const unameInput = document.getElementById('addUsername');
    unameInput.value = user.username;
    unameInput.disabled = true; // Lock username when editing
    
    document.getElementById('addFullName').value = user.full_name;
    document.getElementById('addEmail').value = user.email;
    
    const pwdInput = document.getElementById('addPassword');
    pwdInput.value = '';
    pwdInput.required = false; // password is optional when editing
    
    // Select radio
    document.querySelectorAll('input[name="addRole"]').forEach(r => {
        if(r.value.toLowerCase() === user.role.toLowerCase()) {
            r.checked = true;
        }
    });
    updateRadioStyles();
    
    openModal(addModalOverlay, addModal);
};

window.closeAddModal = function () {
    closeModal(addModalOverlay, addModal);
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
    const fname = document.getElementById('addFullName').value.trim();
    const email = document.getElementById('addEmail').value.trim();
    const password = document.getElementById('addPassword')?.value;
    const roleEl = document.querySelector('input[name="addRole"]:checked');
    if (!roleEl) return;
    const role = roleEl.value.toLowerCase();
    
    const btn = document.getElementById('modalSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        if (editingUserId) {
            // Edit User
            const payload = { full_name: fname, email, role };
            if (password && password.trim() !== '') {
                payload.password = password;
            }
            await API.users.update(editingUserId, payload);
            showToast('User profile updated successfully!', 'success');
        } else {
            // Add User
            const uname = document.getElementById('addUsername').value.trim();
            const payload = { username: uname, full_name: fname, email, password: password || '123456', role };
            await API.users.create(payload);
            showToast(`Created account ${uname} successfully!`, 'success');
        }
        
        closeAddModal();
        await loadUsers(); // Refresh the table completely to sync with DB
    } catch (err) {
        showToast('Operation failed: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = editingUserId ? 'Save Changes' : 'Create User';
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
