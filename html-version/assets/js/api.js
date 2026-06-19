const API_BASE_URL = 'http://localhost:5000/api';

const Auth = {
    getToken()  { return localStorage.getItem('forecastai_token'); },
    setToken(t) { localStorage.setItem('forecastai_token', t); },
    getUser() {
        try { return JSON.parse(localStorage.getItem('forecastai_user')); }
        catch { return null; }
    },
    setUser(u)  { localStorage.setItem('forecastai_user', JSON.stringify(u)); },
    getRole() {
        const user = this.getUser();
        return String(user?.role || user?.role_name || '').trim().toLowerCase();
    },
    hasRole(...roles) {
        const currentRole = this.getRole();
        return roles.some(role => String(role).trim().toLowerCase() === currentRole);
    },
    getHomePage() {
        if (this.hasRole('admin')) return 'users.html';
        return this.hasRole('staff') ? 'purchase-orders.html' : 'dashboard.html';
    },
    clear() {
        localStorage.removeItem('forecastai_token');
        localStorage.removeItem('forecastai_user');
    },
    logout(e) {
        if (e) e.preventDefault();
        this.clear();
        window.location.href = 'login.html';
    },  

    isLoggedIn()  { return !!this.getToken(); },
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
};

async function apiFetch(endpoint, options = {}, skipAuthRedirect = false) {
    const token = Auth.getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        
        let data;
        const textStr = await res.text();
        try {
            data = textStr ? JSON.parse(textStr) : {};
        } catch(e) {
            if (!res.ok) {
                throw new Error(`Lỗi ${res.status}: Backend chưa hỗ trợ API này hoặc trả về HTML. Vui lòng báo cho BE.`);
            }
            data = {};
        }

        // Token hết hạn → về login (nhưng KHÔNG làm vậy ở trang login)
        if (res.status === 401 && !skipAuthRedirect) {
            Auth.clear();
            window.location.href = 'login.html';
            return null;
        }

        if (!res.ok) {
            throw new Error(data.message || `Lỗi ${res.status}`);
        }

        return data;

    } catch (err) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            console.warn('[API] Backend chưa khởi động.');
            throw new Error('BACKEND_OFFLINE');
        }
        throw err;
    }
}

const API = {

    auth: {
        async login(username, password) {
            return apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            }, true); // skipAuthRedirect = true
        },
        async logout() {
            try { await apiFetch('/auth/logout', { method: 'POST' }); } catch {}
            Auth.clear();
            window.location.href = 'login.html';
        }
    },

    products: {
        async getAll()         { return apiFetch('/products/list'); },
        async getById(id)      { return apiFetch(`/products/get/${id}`); },
        async create(data)     { return apiFetch('/products/create',       { method: 'POST',   body: JSON.stringify(data) }); },
        async update(id, data) { return apiFetch(`/products/update/${id}`, { method: 'PUT',    body: JSON.stringify(data) }); },
        async delete(id)       { return apiFetch(`/products/delete/${id}`, { method: 'DELETE' }); }
    },

    sales: {
        async getAll()     { return apiFetch('/sales/list'); },
        async create(data) { return apiFetch('/sales/create', { method: 'POST', body: JSON.stringify(data) }); },
        // THÊM CHỨC NĂNG IMPORT FILE THẬT:
        async importCSV(file) {
            const formData = new FormData();
            formData.append('file', file); // Đút file vào FormData để truyền đi

            // Gọi apiFetch nhưng không dùng JSON.stringify, trình duyệt tự xử lý Header multipart/form-data
            const res = await fetch(`${API_BASE_URL}/sales/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}` // Giữ bảo mật Token của Thanh
                },
                body: formData
            });
            return res.json();
        }   
    
    },

    orders: {
        async getAll()      { return apiFetch('/purchases/list'); },
        async getDetail(id) { return apiFetch(`/purchases/detail/${id}`); },
        async create(data)  { return apiFetch('/purchases/create', { method: 'POST', body: JSON.stringify(data) }); },
        async update(id, data) { return apiFetch(`/purchases/update/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
        async delete(id)    { return apiFetch(`/purchases/delete/${id}`, { method: 'DELETE' }); },
        async approve(id)   { return apiFetch(`/purchases/approve/${id}`, { method: 'PUT' }); },
        async ship(id)      { return apiFetch(`/purchases/ship/${id}`, { method: 'PUT' }); },
        async receive(id, data)   { return apiFetch(`/purchases/receive/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
        async cancel(id)    { return apiFetch(`/purchases/cancel/${id}`, { method: 'PUT' }); }
    },

    users: {
        async getAll() { 
            const res = await apiFetch('/users/list');
            return res.data;
        },
        async create(data)   { return apiFetch('/users/create',       { method: 'POST',   body: JSON.stringify(data) }); },
        async update(id, d)  { return apiFetch(`/users/update/${id}`, { method: 'PUT',    body: JSON.stringify(d) }); },
        async delete(id)     { return apiFetch(`/users/delete/${id}`, { method: 'DELETE' }); }
    },

    suppliers: {
        async getAll() { 
            const res = await apiFetch('/suppliers/list');
            return res.data || res;
        },
        async create(data)     { return apiFetch('/suppliers/create',       { method: 'POST',   body: JSON.stringify(data) }); },
        async update(id, data) { return apiFetch(`/suppliers/update/${id}`, { method: 'PUT',    body: JSON.stringify(data) }); },
        async delete(id)       { return apiFetch(`/suppliers/delete/${id}`, { method: 'DELETE' }); }
    },

    categories: {
        async getAll() {
            const res = await apiFetch('/categories');
            return res.data || res;
        },
        async create(data)     { return apiFetch('/categories',       { method: 'POST',   body: JSON.stringify(data) }); },
        async update(id, data) { return apiFetch(`/categories/${id}`, { method: 'PUT',    body: JSON.stringify(data) }); },
        async delete(id)       { return apiFetch(`/categories/${id}`, { method: 'DELETE' }); }
    },

    forecast: {
        async getLatest(targetPeriod) { 
            const res = await apiFetch('/forecast/latest' + (targetPeriod ? '?target_period=' + targetPeriod : ''));
            return res.data || res;
        },
        async run(targetPeriod) {
            return apiFetch('/forecast/run', { method: 'POST', body: JSON.stringify({ target_period: targetPeriod }) });
        },
        async getSaved(targetPeriod) {
            const res = await apiFetch('/forecast/saved' + (targetPeriod ? '?target_period=' + targetPeriod : ''));
            return res.data || res;
        },
        async getByProduct(productId) {
            return apiFetch(`/forecast/product/${productId}`);
        }
    },

    activityLogs: {
        async getAll() {
            const res = await apiFetch('/activity-logs/list');
            return res.data;
        }
    },

    reports: {
        async getInventoryStatus() {
            const res = await apiFetch('/reports/inventory-status');
            return res.data;
        },
        async getSalesSummary(days) {
            const res = await apiFetch('/reports/sales-summary' + (days ? '?days=' + days : ''));
            return res.data;
        },
        async getTopProducts(days) {
            const res = await apiFetch('/reports/top-products' + (days ? '?days=' + days : ''));
            return res.data;
        },
        async getCategorySales(days) {
            const res = await apiFetch('/reports/category-sales' + (days ? '?days=' + days : ''));
            return res.data;
        },
        async getSalesTrend(days = 30) {
            const res = await apiFetch(`/reports/sales-trend?days=${days}`);
            return res.data;
        },
        async exportExcel() {
            return fetch(`${API_BASE_URL}/reports/export/excel`, {
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            }).then(res => {
                if (res.status === 401) { Auth.logout(); return; }
                if (res.status === 403) throw new Error('Ban khong co quyen thuc hien thao tac nay.');
                if (!res.ok) throw new Error('Cannot download Excel');
                return res.blob();
            });
        },
        async exportPdf() {
            return fetch(`${API_BASE_URL}/reports/export/pdf`, {
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            }).then(res => {
                if (res.status === 401) { Auth.logout(); return; }
                if (res.status === 403) throw new Error('Ban khong co quyen thuc hien thao tac nay.');
                if (!res.ok) throw new Error('Cannot download PDF');
                return res.blob();
            });
        }
    },

    settings: {
        async get() {
            return apiFetch('/settings');
        },
        async update(data) {
            return apiFetch('/settings', { method: 'PUT', body: JSON.stringify(data) });
        },
        async reset() {
            return apiFetch('/settings/reset', { method: 'POST' });
        }
    },

    dashboard: {
        getStats: () => apiFetch('/dashboard/stats'),
        getTopProducts: () => apiFetch('/dashboard/top-products'),
        getLowStockForecast: () => apiFetch('/dashboard/low-stock-forecast')
    }
};

function showLoading(tbodyId, message = 'Đang tải dữ liệu...') {
    const el = document.getElementById(tbodyId);
    if (!el) return;
    el.innerHTML = `
        <tr><td colspan="99">
            <div class="py-16 text-center flex flex-col items-center gap-3">
                <div class="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
                <p class="text-gray-400 text-sm">${message}</p>
            </div>
        </td></tr>`;
}

function showToast(message, type = 'success') {
    const existing = document.getElementById('_toast');
    if (existing) existing.remove();
    const colors = { success: 'bg-[#10B981] text-white', error: 'bg-red-500 text-white', warning: 'bg-yellow-500 text-white', info: 'bg-[#2563EB] text-white' };
    const toast = document.createElement('div');
    toast.id = '_toast';
    toast.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all duration-300 ${colors[type] || colors.success}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}
