// Initialize Icons
lucide.createIcons();

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

// Handle Login Submission
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    // Redirect to dashboard layout template
    window.location.href = 'dashboard.html';
});
