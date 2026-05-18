// Initialize Icons
lucide.createIcons();

// Mock data fallback (dùng khi backend chưa chạy)
const MOCK_USERS = [
    { id: 1, username: 'admin', password: '123456', full_name: 'Admin User', role: 'admin', email: 'admin@forecastai.com' },
    { id: 2, username: 'manager', password: '123456', full_name: 'Manager User', role: 'manager', email: 'manager@forecastai.com' },
    { id: 3, username: 'staff', password: '123456', full_name: 'Staff User', role: 'staff', email: 'staff@forecastai.com' }
];

// Toggle Password Visibility
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

let isPasswordVisible = false;

togglePassword.addEventListener('click', () => {
    isPasswordVisible = !isPasswordVisible;
    if (isPasswordVisible) {
        passwordInput.type = 'text';
        togglePassword.innerHTML = '<i data-lucide="eye-off" class="w-5 h-5"></i>';
    } else {
        passwordInput.type = 'password';
        togglePassword.innerHTML = '<i data-lucide="eye" class="w-5 h-5"></i>';
    }
    // Re-render the specific icon
    lucide.createIcons();
});

// Nếu đã đăng nhập thì redirect luôn
if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    window.location.href = 'dashboard.html';
}

// Handle Login Submission
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = document.getElementById('submitBtn');
    const errorBox = document.getElementById('errorMessage');

    if (errorBox) {
        errorBox.classList.add('hidden');
        errorBox.textContent = '';
    }

    // Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <span class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Đang đăng nhập...
        </span>`;

    try {
        const result = await API.auth.login(username, password);
        Auth.setToken(result.token);
        Auth.setUser(result.user);
        window.location.href = 'dashboard.html';
    } catch (err) {
        if (err.message === 'BACKEND_OFFLINE') {
            // Fallback: kiểm tra mock user
            const found = MOCK_USERS.find(u => u.username === username && u.password === password);
            if (found) {
                Auth.setToken('mock_token_' + Date.now());
                Auth.setUser({ id: found.id, username: found.username, full_name: found.full_name, role: found.role });
                window.location.href = 'dashboard.html';
                return;
            } else {
                showLoginError(errorBox, 'Sai tên đăng nhập hoặc mật khẩu.');
            }
        } else {
            showLoginError(errorBox, err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Đăng nhập';
    }
});

function showLoginError(box, msg) {
    if (box) {
        box.textContent = msg;
        box.classList.remove('hidden');
    } else {
        alert(msg);
    }
}

