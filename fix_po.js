const fs = require('fs');
const file = 'D:/Thuc_tap_co_so/ThucTapCoSo/html-version/assets/js/pages/purchase-orders.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove all old `window.approveOrder` functions
content = content.replace(/window\.approveOrder\s*=\s*async\s*function\([^)]*\)\s*\{[^}]*\}\s*;/g, '');
content = content.replace(/window\.approveOrder\s*=\s*async\s*function\([^)]*\)\s*\{[\s\S]*?catch\s*\([^)]*\)\s*\{[\s\S]*?\}\s*\};/g, '');

// 2. Remove all old `window.shipOrder` functions
content = content.replace(/window\.shipOrder\s*=\s*async\s*function\([^)]*\)\s*\{[\s\S]*?catch\s*\([^)]*\)\s*\{[\s\S]*?\}\s*\};/g, '');

// 3. Remove old `openConfirmDelete`, `closeConfirmDelete`, `btnProceedDelete` logic
content = content.replace(/window\.openConfirmDelete\s*=\s*function\([^)]*\)\s*\{[\s\S]*?\}\s*;/g, '');
content = content.replace(/window\.closeConfirmDelete\s*=\s*function\([^)]*\)\s*\{[\s\S]*?\}\s*;/g, '');
content = content.replace(/document\.getElementById\('btnProceedDelete'\)\?\.addEventListener\('click'[\s\S]*?\}\);/g, '');

const modalLogic = `
// ============================================================
// GENERIC ACTION MODAL LOGIC
// ============================================================
let currentActionType = null;
let currentActionId = null;

window.openActionModal = function(id, type) {
    currentActionId = id;
    currentActionType = type;
    
    const titleEl = document.getElementById('confirmActionTitle');
    const descEl = document.getElementById('confirmActionDesc');
    const iconBg = document.getElementById('confirmActionIconBg');
    const icon = document.getElementById('confirmActionIcon');
    const btn = document.getElementById('btnProceedAction');
    
    if(!titleEl) return;

    btn.className = 'flex-1 px-4 py-3 text-white rounded-xl transition-all font-medium shadow-sm ';
    
    if (type === 'delete') {
        titleEl.textContent = 'Xóa đơn hàng';
        descEl.textContent = 'Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể hoàn tác.';
        iconBg.className = 'w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center';
        icon.className = 'w-6 h-6 text-red-600';
        icon.setAttribute('data-lucide', 'trash-2');
        btn.textContent = 'Xóa đơn hàng';
        btn.classList.add('bg-red-600', 'hover:bg-red-700');
    } else if (type === 'cancel') {
        titleEl.textContent = 'Hủy đơn hàng';
        descEl.textContent = 'Bạn có chắc chắn muốn hủy đơn hàng này?';
        iconBg.className = 'w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center';
        icon.className = 'w-6 h-6 text-red-600';
        icon.setAttribute('data-lucide', 'x-circle');
        btn.textContent = 'Hủy đơn hàng';
        btn.classList.add('bg-red-600', 'hover:bg-red-700');
    } else if (type === 'approve') {
        titleEl.textContent = 'Duyệt đơn hàng';
        descEl.textContent = 'Bạn có chắc chắn muốn duyệt đơn hàng này?';
        iconBg.className = 'w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center';
        icon.className = 'w-6 h-6 text-purple-600';
        icon.setAttribute('data-lucide', 'check-circle');
        btn.textContent = 'Duyệt đơn hàng';
        btn.classList.add('bg-purple-600', 'hover:bg-purple-700');
    } else if (type === 'ship') {
        titleEl.textContent = 'Giao hàng';
        descEl.textContent = 'Xác nhận chuyển trạng thái đơn hàng sang Đang giao (Shipped)?';
        iconBg.className = 'w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center';
        icon.className = 'w-6 h-6 text-yellow-600';
        icon.setAttribute('data-lucide', 'truck');
        btn.textContent = 'Đang giao';
        btn.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
    }
    
    showModal('confirmActionOverlay', 'confirmActionModal');
    if(window.lucide) window.lucide.createIcons();
};

window.closeConfirmAction = function() {
    hideModal('confirmActionOverlay', 'confirmActionModal');
    currentActionId = null;
    currentActionType = null;
};

document.getElementById('btnProceedAction')?.addEventListener('click', async () => {
    if (!currentActionId || !currentActionType) return;
    const btn = document.getElementById('btnProceedAction');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Đang xử lý...';
    try {
        if (currentActionType === 'delete') {
            await API.orders.delete(currentActionId);
            showToast('Đã xóa đơn hàng!', 'success');
        } else if (currentActionType === 'cancel') {
            await API.orders.cancel(currentActionId);
            showToast('Đã hủy đơn hàng!', 'success');
        } else if (currentActionType === 'approve') {
            await API.orders.approve(currentActionId);
            showToast('Đã duyệt đơn hàng!', 'success');
        } else if (currentActionType === 'ship') {
            await API.orders.ship(currentActionId);
            showToast('Đã chuyển trạng thái Đang giao!', 'success');
        }
        closeConfirmAction();
        await loadOrders();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
});
`;

content = content.replace('if (statusFilter) statusFilter.addEventListener', modalLogic + '\nif (statusFilter) statusFilter.addEventListener');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed JS!');
