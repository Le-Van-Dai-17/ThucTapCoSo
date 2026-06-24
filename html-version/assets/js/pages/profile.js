lucide.createIcons();

let isEditing = false;
let backupProfile = {
    fullName: "John Doe",
    username: "johndoe",
    email: "john.doe@company.com"
};

const fNameInput = document.getElementById('fullName');
const userInp = document.getElementById('username');
const mailInp = document.getElementById('email');
const roleInp = document.getElementById('roleInp');

document.addEventListener('DOMContentLoaded', () => {
    if (typeof currentUser !== 'undefined' && currentUser) {
        backupProfile.fullName = currentUser.full_name || currentUser.fullName || currentUser.username || "User";
        backupProfile.username = currentUser.username || "user";
        backupProfile.email = currentUser.email || "";
        
        fNameInput.value = backupProfile.fullName;
        userInp.value = backupProfile.username;
        mailInp.value = backupProfile.email;
        if (roleInp) roleInp.value = currentUser.role || 'Guest';
    }
});

window.toggleEditProfile = function() {
    isEditing = true;
    document.getElementById('editProfileBtn').classList.add('hidden');
    document.getElementById('profileActions').classList.remove('hidden');

    [fNameInput, userInp, mailInp].forEach(el => {
        el.removeAttribute('disabled');
        el.classList.remove('disabled-input');
        el.classList.add('bg-white');
    });
    fNameInput.focus();
}

window.cancelEditProfile = function() {
    isEditing = false;
    document.getElementById('editProfileBtn').classList.remove('hidden');
    document.getElementById('profileActions').classList.add('hidden');

    [fNameInput, userInp, mailInp].forEach(el => {
        el.setAttribute('disabled', 'true');
        el.classList.add('disabled-input');
        el.classList.remove('bg-white');
    });

    // Reset to backup values
    fNameInput.value = backupProfile.fullName;
    userInp.value = backupProfile.username;
    mailInp.value = backupProfile.email;
}

window.handleProfileUpdate = function(e) {
    e.preventDefault();
    backupProfile = {
        fullName: fNameInput.value,
        username: userInp.value,
        email: mailInp.value
    };
    
    cancelEditProfile(); // Disables edit mode visually
    showToast("Profile updated successfully!", "success");
}

window.togglePasswordVisibility = function(inputId, iconId) {
    const inp = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (inp.type === 'password') {
        inp.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        inp.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
}

window.handlePasswordChange = async function(e) {
    e.preventDefault();
    const form = document.getElementById('passwordForm');
    const currentP = document.getElementById('currentPassword').value;
    const newP = document.getElementById('newPassword').value;
    const confirmP = document.getElementById('confirmPassword').value;

    try {
        await API.auth.changePassword({
            currentPassword: currentP,
            newPassword: newP,
            confirmPassword: confirmP
        });
        form.reset();
        showToast("Đổi mật khẩu thành công.", "success");
    } catch (err) {
        showToast(err.message || "Không thể đổi mật khẩu.", "error");
    }
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    const tMsg = document.getElementById('toastMessage');
    const tIcon = document.getElementById('toastIcon');

    tMsg.textContent = message;

    toast.className = `fixed top-20 right-8 text-white px-6 py-4 rounded-xl shadow-lg z-50 flex items-center gap-3 transition-all duration-300 translate-x-[150%] opacity-0 ${type === 'error' ? 'bg-red-500' : 'bg-[#10B981]'}`;
    
    if (type === 'error') {
        tIcon.setAttribute('data-lucide', 'alert-circle');
    } else {
        tIcon.setAttribute('data-lucide', 'check-circle');
    }
    lucide.createIcons();

    // Trigger reflow
    void toast.offsetWidth;

    toast.classList.remove('translate-x-[150%]', 'opacity-0');
    toast.classList.add('translate-x-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.remove('translate-x-0', 'opacity-100');
        toast.classList.add('translate-x-[150%]', 'opacity-0');
    }, 3000);
}
