const API_BASE_URL = 'http://localhost:5000/api';

const Auth = {
    getToken()  { return localStorage.getItem('forecastai_token'); },
    setToken(t) { localStorage.setItem('forecastai_token', t); },
    getUser() {
        try { return JSON.parse(localStorage.getItem('forecastai_user')); }
        catch { return null; }
    },
    setUser(u)  { localStorage.setItem('forecastai_user', JSON.stringify(u)); },
    clear() {
        localStorage.removeItem('forecastai_token');
        localStorage.removeItem('forecastai_user');
    },
    isLoggedIn()  { return !!this.getToken(); },
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = '/pages/login.html';
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
        const data = await res.json();

        // Token hết hạn → về login (nhưng KHÔNG làm vậy ở trang login)
        if ((res.status === 401 || res.status === 403) && !skipAuthRedirect) {
            Auth.clear();
            window.location.href = '/pages/login.html';
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
            window.location.href = '/pages/login.html';
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
        async create(data) { return apiFetch('/sales/create', { method: 'POST', body: JSON.stringify(data) }); }
    },

    orders: {
        async getAll()      { return apiFetch('/purchases/list'); },
        async getDetail(id) { return apiFetch(`/purchases/detail/${id}`); },
        async create(data)  { return apiFetch('/purchases/create', { method: 'POST', body: JSON.stringify(data) }); }
    },

   users: {
        async getAll() { 
            const res = await apiFetch('/users/list');
            return res.data;
        },
        async create(data)   { throw new Error('BACKEND_OFFLINE'); },
        async update(id, d)  { throw new Error('BACKEND_OFFLINE'); },
        async delete(id)     { throw new Error('BACKEND_OFFLINE'); }
    },

    forecast: {
        async getLatest() { 
            const res = await apiFetch('/forecast/latest');
            return res.data;
        },
        async getByProduct(prodId) { throw new Error('BACKEND_OFFLINE'); }
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