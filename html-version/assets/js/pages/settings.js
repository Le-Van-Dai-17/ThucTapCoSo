lucide.createIcons();


window.Auth = window.Auth || {
    logout: function () {
        localStorage.removeItem('forecastai_token');
        localStorage.removeItem('forecastai_user');

        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');

        sessionStorage.removeItem('forecastai_token');
        sessionStorage.removeItem('forecastai_user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('accessToken');

        window.location.href = '../index.html';
    }
};

const state = {
    settings: {
        defaultTimePeriod: 30,
        forecastHorizon: 90,

        autoReorder: true,
        includeSeasonal: true,
        useMLPrediction: true,

        lowStockRange: 20,
        criticalStockRange: 10,
        overStockRange: 150,
        reorderPoint: 50,
        safetyStockDays: 7,

        enableEmail: true,
        enablePush: false,
        autoGeneratePo: true,
        requireApproval: true,
        enableAuditLog: true,
        showAdvancedMetrics: false
    }
};

function showToast(message = 'Settings saved successfully!', type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;

    toast.classList.remove('bg-[#10B981]', 'bg-red-500', 'bg-[#F59E0B]');

    if (type === 'error') {
        toast.classList.add('bg-red-500');
    } else if (type === 'warning') {
        toast.classList.add('bg-[#F59E0B]');
    } else {
        toast.classList.add('bg-[#10B981]');
    }

    toast.classList.remove('translate-x-full', 'opacity-0');

    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
    }, 3000);
}

function setSwitchState(id, value) {
    const btn = document.querySelector(`.switch-bg[data-id="${id}"]`);
    if (!btn) return;

    const thumb = btn.querySelector('.switch-thumb');

    if (value) {
        btn.classList.add('active');
        if (thumb) thumb.classList.add('active');
    } else {
        btn.classList.remove('active');
        if (thumb) thumb.classList.remove('active');
    }
}

function getSwitchState(id) {
    const btn = document.querySelector(`.switch-bg[data-id="${id}"]`);
    return btn ? btn.classList.contains('active') : false;
}

function applySettingsToForm(settings) {
    const merged = {
        ...state.settings,
        ...(settings || {})
    };

    state.settings = merged;

    document.getElementById('defaultTimePeriod').value = merged.defaultTimePeriod;
    document.getElementById('forecastHorizon').value = merged.forecastHorizon;

    document.getElementById('lowStockRange').value = merged.lowStockRange;
    document.getElementById('lowStockValue').textContent = `${merged.lowStockRange}%`;

    document.getElementById('criticalStockRange').value = merged.criticalStockRange;
    document.getElementById('criticalStockValue').textContent = `${merged.criticalStockRange}%`;

    document.getElementById('overStockRange').value = merged.overStockRange;
    document.getElementById('overStockValue').textContent = `${merged.overStockRange}%`;

    document.getElementById('reorderPoint').value = merged.reorderPoint;
    document.getElementById('safetyStockDays').value = merged.safetyStockDays;

    setSwitchState('autoReorder', merged.autoReorder);
    setSwitchState('includeSeasonal', merged.includeSeasonal);
    setSwitchState('useMLPrediction', merged.useMLPrediction);

    setSwitchState('enableEmail', merged.enableEmail);
    setSwitchState('enablePush', merged.enablePush);
    setSwitchState('autoGeneratePo', merged.autoGeneratePo);
    setSwitchState('requireApproval', merged.requireApproval);
    setSwitchState('enableAuditLog', merged.enableAuditLog);
    setSwitchState('showAdvancedMetrics', merged.showAdvancedMetrics);
}

function collectSettingsFromForm() {
    return {
        defaultTimePeriod: Number(document.getElementById('defaultTimePeriod').value),
        forecastHorizon: Number(document.getElementById('forecastHorizon').value),

        autoReorder: getSwitchState('autoReorder'),
        includeSeasonal: getSwitchState('includeSeasonal'),
        useMLPrediction: getSwitchState('useMLPrediction'),

        lowStockRange: Number(document.getElementById('lowStockRange').value),
        criticalStockRange: Number(document.getElementById('criticalStockRange').value),
        overStockRange: Number(document.getElementById('overStockRange').value),
        reorderPoint: Number(document.getElementById('reorderPoint').value),
        safetyStockDays: Number(document.getElementById('safetyStockDays').value),

        enableEmail: getSwitchState('enableEmail'),
        enablePush: getSwitchState('enablePush'),
        autoGeneratePo: getSwitchState('autoGeneratePo'),
        requireApproval: getSwitchState('requireApproval'),
        enableAuditLog: getSwitchState('enableAuditLog'),
        showAdvancedMetrics: getSwitchState('showAdvancedMetrics')
    };
}

function validateSettings(settings) {
    if (settings.defaultTimePeriod < 7 || settings.defaultTimePeriod > 365) {
        return 'Default Analysis Time Period phải nằm trong khoảng 7 đến 365 ngày';
    }

    if (settings.forecastHorizon < 30 || settings.forecastHorizon > 180) {
        return 'Forecast Horizon phải nằm trong khoảng 30 đến 180 ngày';
    }

    if (settings.lowStockRange < 0 || settings.lowStockRange > 50) {
        return 'Low Stock Alert phải nằm trong khoảng 0% đến 50%';
    }

    if (settings.criticalStockRange < 0 || settings.criticalStockRange > 30) {
        return 'Critical Stock Alert phải nằm trong khoảng 0% đến 30%';
    }

    if (settings.overStockRange < 100 || settings.overStockRange > 300) {
        return 'Overstock Alert phải nằm trong khoảng 100% đến 300%';
    }

    if (settings.reorderPoint < 0 || settings.reorderPoint > 100) {
        return 'Default Reorder Point phải nằm trong khoảng 0% đến 100%';
    }

    if (settings.safetyStockDays < 0 || settings.safetyStockDays > 30) {
        return 'Safety Stock Buffer phải nằm trong khoảng 0 đến 30 ngày';
    }

    return null;
}

async function loadSettings() {
    try {
        const result = await API.settings.get();
        applySettingsToForm(result.data || result);
    } catch (error) {
        console.error('Lỗi tải settings:', error);
        showToast(error.message || 'Không thể tải cấu hình hệ thống', 'error');
    }
}

window.toggleSwitch = function (btn) {
    const thumb = btn.querySelector('.switch-thumb');
    const isActive = btn.classList.contains('active');

    if (isActive) {
        btn.classList.remove('active');
        if (thumb) thumb.classList.remove('active');
    } else {
        btn.classList.add('active');
        if (thumb) thumb.classList.add('active');
    }
};

window.resetToDefaults = async function () {
    const ok = confirm('Bạn có chắc muốn khôi phục toàn bộ cấu hình về mặc định không?');
    if (!ok) return;

    try {
        const result = await API.settings.reset();
        applySettingsToForm(result.data || result);
        showToast(result.message || 'Đã khôi phục cấu hình mặc định');
    } catch (error) {
        console.error('Lỗi reset settings:', error);
        showToast(error.message || 'Không thể reset cấu hình', 'error');
    }
};

window.handleSaveSettings = async function (event) {
    event.preventDefault();

    const settings = collectSettingsFromForm();
    const validationError = validateSettings(settings);

    if (validationError) {
        showToast(validationError, 'warning');
        return;
    }

    try {
        const result = await API.settings.update(settings);
        state.settings = settings;
        showToast(result.message || 'Settings saved successfully!');
    } catch (error) {
        console.error('Lỗi lưu settings:', error);
        showToast(error.message || 'Không thể lưu cấu hình hệ thống', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});