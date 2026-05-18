const API_BASE_URL = 'http://localhost:5000/api';

// Token Helpers
const Auth = {
    getToken() {
        return localStorage.getItem('forecastai_token');
    },
    setToken(token) {
        localStorage.setItem('forecastai_token', token);
    },
    getUser() {
        const raw = localStorage.getItem('forecastai_user');
        try { return raw ? JSON.parse(raw) : null; } catch { return null; }
    },
    setUser(user) {
        localStorage.setItem('forecastai_user', JSON.stringify(user));
    },
    clear() {
        localStorage.removeItem('forecastai_token');
        localStorage.removeItem('forecastai_user');
    },
    isLoggedIn() {
        return !!this.getToken();
    },
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = '/pages/login.html';
            return false;
        }
        return true;
    }
};

// Core Fetch Wrapper
async function apiFetch(endpoint, options = {}) {
    const token = Auth.getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (res.status === 401) {
            Auth.clear();
            window.location.href = '/pages/login.html';
            return null;
        }

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || `Lỗi ${res.status}`);
        }

        return data;
    } catch (err) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            console.warn('[API] Backend chưa khởi động, dùng mock data.');
            throw new Error('BACKEND_OFFLINE');
        }
        throw err;
    }
}

// API Methods
const API = {
    // AUTH
    auth: {
        async login(username, password) {
            return apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        },
        async logout() {
            try {
                await apiFetch('/auth/logout', { method: 'POST' });
            } finally {
                Auth.clear();
                window.location.href = '/pages/login.html';
            }
        }
    },

    // PRODUCTS
    products: {
        async getAll() {
            return apiFetch('/products');
        },
        async getById(id) {
            return apiFetch(`/products/${id}`);
        },
        async create(data) {
            return apiFetch('/products', { method: 'POST', body: JSON.stringify(data) });
        },
        async update(id, data) {
            return apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        },
        async delete(id) {
            return apiFetch(`/products/${id}`, { method: 'DELETE' });
        }
    },

    // SALES
    sales: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return apiFetch(`/sales${query ? '?' + query : ''}`);
        },
        async import(formData) {
            const token = Auth.getToken();
            const res = await fetch(`${API_BASE_URL}/sales/import`, {
                method: 'POST',
                headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Import thất bại');
            return data;
        }
    },

    // USERS
    users: {
        async getAll() {
            return apiFetch('/users');
        },
        async create(data) {
            return apiFetch('/users', { method: 'POST', body: JSON.stringify(data) });
        },
        async update(id, data) {
            return apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        },
        async delete(id) {
            return apiFetch(`/users/${id}`, { method: 'DELETE' });
        }
    },

    // DEMAND FORECAST
    forecast: {
        async getLatest() {
            return apiFetch('/forecast/latest');
        },
        async getByProduct(productId) {
            return apiFetch(`/forecast/product/${productId}`);
        }
    },

    // PURCHASE ORDERS
    orders: {
        async getAll() {
            return apiFetch('/orders');
        },
        async updateStatus(id, status) {
            return apiFetch(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
        }
    }
};

// UI Helpers
function showLoading(containerId, message = 'Đang tải...') {
    const el = document.getElementById(containerId);
    if (el) {
        el.innerHTML = `
            <tr>
                <td colspan="99">
                    <div class="py-12 text-center flex flex-col items-center gap-3">
                        <div class="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
                        <p class="text-gray-500 text-sm">${message}</p>
                    </div>
                </td>
            </tr>`;
    }
}

function showError(containerId, message = 'Có lỗi xảy ra. Vui lòng thử lại.', colspan = 7) {
    const el = document.getElementById(containerId);
    if (el) {
        el.innerHTML = `
            <tr>
                <td colspan="${colspan}">
                    <div class="py-12 text-center flex flex-col items-center gap-3">
                        <i data-lucide="alert-circle" class="w-10 h-10 text-red-400"></i>
                        <p class="text-red-600 font-medium">${message}</p>
                        <button onclick="location.reload()" class="text-sm text-[#2563EB] underline">Thử lại</button>
                    </div>
                </td>
            </tr>`;
        if (window.lucide) lucide.createIcons();
    }
}

function showToast(message, type = 'success') {
    const existing = document.getElementById('toast-notification');
    if (existing) existing.remove();

    const colors = {
        success: 'bg-[#10B981] text-white',
        error: 'bg-red-500 text-white',
        warning: 'bg-yellow-500 text-white',
        info: 'bg-[#2563EB] text-white'
    };

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all duration-300 ${colors[type] || colors.success}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
