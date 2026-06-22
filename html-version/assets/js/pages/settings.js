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
        forecastHorizon: 30,
        errorAlertThreshold: 10,
        useMLPrediction: true,
        autoGeneratePo: true,
        requireApproval: true,
        enableAuditLog: true
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

    document.getElementById('forecastHorizon').value = merged.forecastHorizon || 30;

    const errorAlertEl = document.getElementById('errorAlertThreshold');
    if (errorAlertEl) {
        errorAlertEl.value = merged.errorAlertThreshold || 10;
        document.getElementById('errorAlertValue').textContent = `${merged.errorAlertThreshold || 10}%`;
    }

    setSwitchState('useMLPrediction', merged.useMLPrediction);
    setSwitchState('autoGeneratePo', merged.autoGeneratePo);
    setSwitchState('requireApproval', merged.requireApproval);
    setSwitchState('enableAuditLog', merged.enableAuditLog);
}

function collectSettingsFromForm() {
    return {
        forecastHorizon: Number(document.getElementById('forecastHorizon').value),
        errorAlertThreshold: Number(document.getElementById('errorAlertThreshold').value),
        useMLPrediction: getSwitchState('useMLPrediction'),
        autoGeneratePo: getSwitchState('autoGeneratePo'),
        requireApproval: getSwitchState('requireApproval'),
        enableAuditLog: getSwitchState('enableAuditLog')
    };
}

function validateSettings(settings) {
    if (settings.defaultTimePeriod < 7 || settings.defaultTimePeriod > 365) {
        return 'Default Analysis Time Period must be between 7 and 365 days';
    }

    if (settings.forecastHorizon < 30 || settings.forecastHorizon > 180) {
        return 'Forecast Horizon must be between 30 and 180 days';
    }

    if (settings.lowStockRange < 0 || settings.lowStockRange > 50) {
        return 'Low Stock Alert must be between 0% and 50%';
    }

    if (settings.criticalStockRange < 0 || settings.criticalStockRange > 30) {
        return 'Critical Stock Alert must be between 0% and 30%';
    }

    if (settings.overStockRange < 100 || settings.overStockRange > 300) {
        return 'Overstock Alert must be between 100% and 300%';
    }

    if (settings.reorderPoint < 0 || settings.reorderPoint > 100) {
        return 'Default Reorder Point must be between 0% and 100%';
    }

    if (settings.safetyStockDays < 0 || settings.safetyStockDays > 30) {
        return 'Safety Stock Buffer must be between 0 and 30 days';
    }

    return null;
}

async function loadSettings() {
    try {
        const result = await API.settings.get();
        applySettingsToForm(result.data || result);
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast(error.message || 'Could not load system configuration', 'error');
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
    showConfirmDialog('Are you sure you want to restore all settings to defaults?', async () => {
        try {
            await API.settings.reset();
            showToast('Settings have been reset to defaults.', 'info');
            loadSettings();
        } catch (error) {
            console.error('Reset error:', error);
            showToast('Could not reset to defaults: ' + error.message, 'info');
        }
    });
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
        console.error('Error saving settings:', error);
        showToast(error.message || 'Could not save system configuration', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});