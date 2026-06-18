lucide.createIcons();

// Đã đăng nhập rồi → không cần vào đây nữa
if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    window.location.href = typeof Auth.getHomePage === 'function' ? Auth.getHomePage() : 'dashboard.html';
}

// Toggle hiện/ẩn mật khẩu
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

// Xử lý submit form login
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username  = document.getElementById('username').value.trim();
    const password  = document.getElementById('password').value;
    const submitBtn = document.getElementById('submitBtn');
    const errorBox  = document.getElementById('errorMessage');

    if (errorBox) { errorBox.classList.add('hidden'); errorBox.textContent = ''; }

    if (!username || !password) {
        showLoginError(errorBox, 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
        return;
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
                showToast('Tài khoản chưa được phân quyền hợp lệ.', 'info');
                Auth.clear();
                window.location.href = 'login.html';
            }
        } else {
            // Server trả 200 nhưng success: false (hiếm)
            showLoginError(errorBox, result?.message || 'Đăng nhập thất bại.');
        }

    } catch (err) {
        if (err.message === 'BACKEND_OFFLINE') {
            showLoginError(errorBox, '⚠️ Không kết nối được server. Hãy chắc Kiệt đã chạy: cd backend → npm run dev');
        } else {
            // Sai mật khẩu → server trả 401 → apiFetch throw message từ server
            showLoginError(errorBox, err.message || 'Sai tên đăng nhập hoặc mật khẩu.');
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
