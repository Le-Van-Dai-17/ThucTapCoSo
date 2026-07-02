require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

const accounts = {
    admin: { username: 'admin', password: '123456' },
    manager: { username: 'manager', password: '123456' },
    staff: { username: 'staff', password: '123456' }
};

const checks = [
    { page: 'Login', role: 'admin', method: 'GET', path: '/status' },
    { page: 'Users', role: 'admin', method: 'GET', path: '/users/list' },
    { page: 'My Activity', role: 'admin', method: 'GET', path: '/activity-logs/list' },
    { page: 'Model Performance', role: 'admin', method: 'GET', path: '/mlops/overview' },
    { page: 'Settings', role: 'admin', method: 'GET', path: '/settings' },
    { page: 'Dashboard Stats', role: 'manager', method: 'GET', path: '/dashboard/stats' },
    { page: 'Dashboard Top Products', role: 'manager', method: 'GET', path: '/dashboard/top-products' },
    { page: 'Dashboard Low Stock', role: 'manager', method: 'GET', path: '/dashboard/low-stock-forecast' },
    { page: 'Products', role: 'manager', method: 'GET', path: '/products/list' },
    { page: 'Categories', role: 'manager', method: 'GET', path: '/categories' },
    { page: 'Suppliers', role: 'manager', method: 'GET', path: '/suppliers/list' },
    { page: 'Sales Data', role: 'manager', method: 'GET', path: '/sales/transactions' },
    { page: 'Purchase Orders', role: 'manager', method: 'GET', path: '/purchases/list' },
    { page: 'Forecast Latest', role: 'manager', method: 'GET', path: '/forecast/latest' },
    { page: 'Forecast Saved', role: 'manager', method: 'GET', path: '/forecast/saved' },
    { page: 'Reports Inventory', role: 'manager', method: 'GET', path: '/reports/inventory-status' },
    { page: 'Reports Sales Summary', role: 'manager', method: 'GET', path: '/reports/sales-summary?days=30' },
    { page: 'Reports Top Products', role: 'manager', method: 'GET', path: '/reports/top-products?days=30' },
    { page: 'Reports Category Sales', role: 'manager', method: 'GET', path: '/reports/category-sales?days=30' },
    { page: 'Reports Sales Trend', role: 'manager', method: 'GET', path: '/reports/sales-trend?days=30' },
    { page: 'Notifications', role: 'manager', method: 'GET', path: '/notifications' },
    { page: 'Reconciliation Discrepancies', role: 'staff', method: 'GET', path: '/reconciliation/discrepancies' },
    { page: 'Reconciliation Adjustments', role: 'staff', method: 'GET', path: '/reconciliation/adjustments' }
];

async function request(path, options = {}) {
    const response = await fetch(`${BASE_URL}${path}`, options);
    const text = await response.text();
    let body = text;
    try {
        body = text ? JSON.parse(text) : {};
    } catch {}
    return { response, body };
}

async function login(role) {
    const { response, body } = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accounts[role])
    });
    if (!response.ok || !body.token) {
        throw new Error(`Cannot login ${role}: HTTP ${response.status} ${JSON.stringify(body)}`);
    }
    return body.token;
}

async function main() {
    const tokens = {};
    for (const role of Object.keys(accounts)) {
        tokens[role] = await login(role);
    }

    const results = [];
    for (const check of checks) {
        try {
            const { response, body } = await request(check.path, {
                method: check.method,
                headers: { Authorization: `Bearer ${tokens[check.role]}` }
            });
            results.push({
                page: check.page,
                role: check.role,
                status: response.status,
                ok: response.ok,
                message: body?.message || ''
            });
        } catch (error) {
            results.push({
                page: check.page,
                role: check.role,
                status: 'ERR',
                ok: false,
                message: error.message
            });
        }
    }

    console.table(results);
    const failed = results.filter(result => !result.ok);
    if (failed.length) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
