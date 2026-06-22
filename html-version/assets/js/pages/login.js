lucide.createIcons();

// Already logged in -> no need to visit this page
if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    window.location.href = typeof Auth.getHomePage === 'function' ? Auth.getHomePage() : 'dashboard.html';
}

// Toggle show/hide password
const togglePassword = document.getElementById('togglePassword');
const passwordInput  = document.getElementById('password');
if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
        const isText = passwordInput.type === 'text';
        passwordInput.type = isText ? 'password' : 'text';
        togglePassword.innerHTML = `<i data-lucide="${isText ? 'eye' : 'eye-off'}" class="w-5 h-5"></i>`;
        lucide.createIcons();
    });
}

// Handle login form submit
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username  = document.getElementById('username').value.trim();
    const password  = document.getElementById('password').value;
    const submitBtn = document.getElementById('submitBtn');
    const errorBox  = document.getElementById('errorMessage');

    if (errorBox) { errorBox.classList.add('hidden'); errorBox.textContent = ''; }

    if (!username || !password) {
        showLoginError(errorBox, 'Please enter both username and password.');
        return;
    }

    // Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <span class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Logging in...
        </span>`;

    try {
        const result = await API.auth.login(username, password);

        // result = { success: true, token, user: { id, username, role, ... } }
        if (result && result.success) {
            Auth.setToken(result.token);
            Auth.setUser(result.user);

            const role = String(result.user.role || '').toLowerCase();

            if (role === 'admin') {
                window.location.href = 'users.html';
            } else if (role === 'manager') {
                window.location.href = 'dashboard.html';
            } else if (role === 'staff') {
                window.location.href = 'purchase-orders.html';
            } else {
                showToast('Account is not assigned to a valid role.', 'info');
                Auth.clear();
                window.location.href = 'login.html';
            }
        } else {
            // Server returned 200 but success: false (rare)
            showLoginError(errorBox, result?.message || 'Login failed.');
        }

    } catch (err) {
        if (err.message === 'BACKEND_OFFLINE') {
            showLoginError(errorBox, '⚠️ Cannot connect to server. Please make sure the backend is running.');
        } else {
            // Invalid password -> server returns 401 -> apiFetch throws message from server
            showLoginError(errorBox, err.message || 'Invalid username or password.');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In';
    }
});

function showLoginError(box, msg) {
    if (box) {
        box.textContent = msg;
        box.classList.remove('hidden');
    } else {
        showToast(msg, 'info');
    }
}
