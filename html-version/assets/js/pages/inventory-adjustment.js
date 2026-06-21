document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    loadProducts();

    document.getElementById('adjustmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const productId = document.getElementById('adjProduct').value;
        const quantity = document.getElementById('adjQuantity').value;
        let reason = document.getElementById('adjReason').value;

        if (reason === 'Other') {
            const otherReason = document.getElementById('adjReasonOther').value.trim();
            if (!otherReason) {
                showToast('Vui lòng nhập lý do cụ thể', 'error');
                return;
            }
            reason = `Other - ${otherReason}`;
        }

        if (!productId || !quantity || !reason) {
            showToast('Vui lòng điền đầy đủ thông tin.', 'error');
            return;
        }

        const btn = document.getElementById('btnSubmitAdjustment');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Đang xử lý...';
        lucide.createIcons();

        try {
            const res = await fetch(`${API_BASE_URL}/inventory/adjust`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Auth.getToken()}`
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: parseInt(quantity),
                    reason: reason
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Lỗi server');

            showToast('Đã gửi báo cáo hao hụt chờ duyệt!', 'success');
            document.getElementById('adjustmentForm').reset();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Gửi báo cáo cho Manager';
            lucide.createIcons();
        }
    });
});

async function loadProducts() {
    const select = document.getElementById('adjProduct');
    try {
        const res = await API.products.getAll();
        const products = res.data || [];
        
        if (products.length === 0) {
            select.innerHTML = '<option value="" disabled selected>Không có sản phẩm nào</option>';
            return;
        }

        select.innerHTML = '<option value="" disabled selected>Chọn sản phẩm...</option>' + 
            products.map(p => `
                <option value="${p.id}">[${p.sku}] ${p.name} (Tồn kho: ${p.stock})</option>
            `).join('');
    } catch (error) {
        console.error('Error loading products:', error);
        select.innerHTML = '<option value="" disabled selected>Lỗi tải danh sách sản phẩm</option>';
        showToast('Không thể tải danh sách sản phẩm.', 'error');
    }
}
