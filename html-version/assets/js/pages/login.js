document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
        });
    }

<<<<<<< HEAD
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

=======
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = passwordInput.value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            submitBtn.innerText = 'Đang đăng nhập...';
            submitBtn.disabled = true;

            try {
                // Gọi API Login của Backend
                const response = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Lưu Token vào LocalStorage để các trang khác dùng
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    alert('Đăng nhập thành công!');
                    // Chuyển hướng sang trang Dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    alert(data.message || 'Sai tài khoản hoặc mật khẩu!');
                }
            } catch (error) {
                console.error(error);
                alert('Không thể kết nối đến Server Backend!');
            } finally {
                submitBtn.innerText = 'Sign In';
                submitBtn.disabled = false;
            }
        });
    }
});
>>>>>>> 24fae3245b738e971a8ef78643e47f2605bd78ac
