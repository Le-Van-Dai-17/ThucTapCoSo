lucide.createIcons();

let users = [
  { id: 1, username: "admin001", fullName: "John Anderson", email: "john.anderson@company.com", role: "Admin", status: "active", createdDate: new Date("2023-01-15") },
  { id: 2, username: "manager001", fullName: "Sarah Johnson", email: "sarah.johnson@company.com", role: "Manager", status: "active", createdDate: new Date("2023-03-20") },
  { id: 3, username: "staff001", fullName: "Michael Chen", email: "michael.chen@company.com", role: "Staff", status: "active", createdDate: new Date("2023-05-10") },
  { id: 4, username: "manager002", fullName: "Emily Rodriguez", email: "emily.rodriguez@company.com", role: "Manager", status: "active", createdDate: new Date("2023-06-12") },
  { id: 5, username: "staff002", fullName: "David Kim", email: "david.kim@company.com", role: "Staff", status: "active", createdDate: new Date("2023-07-22") },
  { id: 6, username: "staff003", fullName: "Jennifer Martinez", email: "jennifer.martinez@company.com", role: "Staff", status: "inactive", createdDate: new Date("2023-08-15") },
  { id: 7, username: "manager003", fullName: "Robert Taylor", email: "robert.taylor@company.com", role: "Manager", status: "active", createdDate: new Date("2023-09-05") },
  { id: 8, username: "staff004", fullName: "Lisa Wang", email: "lisa.wang@company.com", role: "Staff", status: "active", createdDate: new Date("2023-10-18") },
];

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

function getRoleBadgeColor(role) {
    if (role === "Admin") return "bg-red-100 text-red-600";
    if (role === "Manager") return "bg-[#2563EB]/10 text-[#2563EB]";
    if (role === "Staff") return "bg-[#10B981]/10 text-[#10B981]";
    return "bg-gray-100 text-gray-600";
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

function formatStats() {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const admins = users.filter((u) => u.role === "Admin").length;
    const managers = users.filter((u) => u.role === "Manager").length;

    statsContainer.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md">
            <div class="text-sm font-medium text-gray-500 mb-1">Total Users</div>
            <div class="text-2xl font-semibold text-gray-900">${total}</div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md">
            <div class="text-sm font-medium text-gray-500 mb-1">Active Users</div>
            <div class="text-2xl font-semibold text-[#10B981]">${active}</div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md">
            <div class="text-sm font-medium text-gray-500 mb-1">Admins</div>
            <div class="text-2xl font-semibold text-red-600">${admins}</div>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md">
            <div class="text-sm font-medium text-gray-500 mb-1">Managers</div>
            <div class="text-2xl font-semibold text-[#2563EB]">${managers}</div>
        </div>
    `;
}

window.toggleStatus = function(id) {
    users = users.map(u => u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u);
    renderTable();
    formatStats();
}

window.changeRole = function(id, newRole) {
    users = users.map(u => u.id === id ? { ...u, role: newRole } : u);
    renderTable(); // Update colors
    formatStats();
}

window.prepareDelete = function(id) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    document.getElementById('deleteUserName').textContent = u.fullName;
    document.getElementById('deleteUsernameTag').textContent = u.username;
    userToDeleteId = id;

    deleteModalOverlay.classList.remove('hidden');
    deleteModalOverlay.classList.remove('overlay-leave', 'overlay-leave-active');
    deleteModalOverlay.classList.add('overlay-enter', 'overlay-enter-active');
    deleteModal.classList.remove('modal-leave', 'modal-leave-active');
    deleteModal.classList.add('modal-enter', 'modal-enter-active');
}

window.closeDeleteModal = function() {
    deleteModalOverlay.classList.remove('overlay-enter', 'overlay-enter-active');
    deleteModalOverlay.classList.add('overlay-leave', 'overlay-leave-active');
    deleteModal.classList.remove('modal-enter', 'modal-enter-active');
    deleteModal.classList.add('modal-leave', 'modal-leave-active');

    setTimeout(() => {
        deleteModalOverlay.classList.add('hidden');
        userToDeleteId = null;
    }, 200);
}

window.confirmDeleteUser = function() {
    if (userToDeleteId) {
        users = users.filter(u => u.id !== userToDeleteId);
        renderTable();
        formatStats();
    }
    closeDeleteModal();
}

function renderTable() {
    const q = searchInput.value.toLowerCase();
    const roleMap = roleFilter.value;

    const filtered = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(q) || user.fullName.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
        const matchesRole = roleMap === "All Roles" || user.role === roleMap;
        return matchesSearch && matchesRole;
    });

    tableBody.innerHTML = '';
    
    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filtered.forEach(user => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 transition-colors duration-150";

            const roleOptions = ["Admin", "Manager", "Staff"].map(r => 
                `<option value="${r}" ${user.role === r ? 'selected' : ''}>${r}</option>`
            ).join('');

            const badgeColor = getRoleBadgeColor(user.role);

            // Toggle switch logic
            const isAct = user.status === "active";
            const toggleBg = isAct ? "bg-[#10B981]" : "bg-gray-300";
            const toggleThumb = isAct ? "translate-x-6" : "translate-x-1";

            tr.innerHTML = `
                <td class="px-6 py-4"><span class="font-mono text-sm font-medium text-gray-900">${user.username}</span></td>
                <td class="px-6 py-4"><span class="text-sm font-medium text-gray-900">${user.fullName}</span></td>
                <td class="px-6 py-4"><span class="text-sm text-gray-600">${user.email}</span></td>
                <td class="px-6 py-4">
                    <div class="flex justify-center">
                        <select onchange="changeRole(${user.id}, this.value)" class="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-2 border-transparent hover:border-gray-300 transition-all duration-200 ${badgeColor} outline-none" style="appearance: none; padding-right: 28px; text-align: center;">
                            ${roleOptions}
                        </select>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex justify-center">
                        <button onclick="toggleStatus(${user.id})" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${toggleBg}">
                            <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${toggleThumb}"></span>
                        </button>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                        <i data-lucide="calendar" class="w-4 h-4"></i>
                        ${formatDate(user.createdDate)}
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center">
                        <button onclick="prepareDelete(${user.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150" title="Delete user">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
        lucide.createIcons();
    }
}

// Event Listeners for search & filter
searchInput.addEventListener('input', renderTable);
roleFilter.addEventListener('change', renderTable);


// Add Modal Logic
window.openAddModal = function() {
    addModalOverlay.classList.remove('hidden');
    addModalOverlay.classList.remove('overlay-leave', 'overlay-leave-active');
    addModalOverlay.classList.add('overlay-enter', 'overlay-enter-active');
    addModal.classList.remove('modal-leave', 'modal-leave-active');
    addModal.classList.add('modal-enter', 'modal-enter-active');
    updateRadioStyles();
}

window.closeAddModal = function() {
    addModalOverlay.classList.remove('overlay-enter', 'overlay-enter-active');
    addModalOverlay.classList.add('overlay-leave', 'overlay-leave-active');
    addModal.classList.remove('modal-enter', 'modal-enter-active');
    addModal.classList.add('modal-leave', 'modal-leave-active');

    setTimeout(() => {
        addModalOverlay.classList.add('hidden');
        document.getElementById('addForm').reset();
        updateRadioStyles(); // Reset defaults
    }, 200);
}

window.updateRadioStyles = function() {
    const roleRadios = document.querySelectorAll('input[name="addRole"]');
    roleRadios.forEach(r => {
        const lbl = r.closest('label');
        if (r.checked) {
            lbl.classList.add('border-[#2563EB]', 'bg-[#2563EB]/5');
            lbl.classList.remove('border-gray-200', 'hover:bg-gray-50');
        } else {
            lbl.classList.remove('border-[#2563EB]', 'bg-[#2563EB]/5');
            lbl.classList.add('border-gray-200', 'hover:bg-gray-50');
        }
    });
}

window.handleAddSubmit = function(e) {
    e.preventDefault();
    const uname = document.getElementById('addUsername').value.trim();
    const fname = document.getElementById('addFullName').value.trim();
    const email = document.getElementById('addEmail').value.trim();
    const selectedRole = document.querySelector('input[name="addRole"]:checked').value;

    const newUser = {
        id: Date.now(),
        username: uname,
        fullName: fname,
        email: email,
        role: selectedRole,
        status: "active",
        createdDate: new Date()
    };

    users.push(newUser);
    renderTable();
    formatStats();
    closeAddModal();
}

// Initial Render
renderTable();
formatStats();
