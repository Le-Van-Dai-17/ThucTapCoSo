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