lucide.createIcons();

const state = {
    forecastSettings: {
        autoReorder: true,
        includeSeasonal: true,
        useMLPrediction: true
    },
    generalConfig: {
        enableEmail: true,
        enablePush: false,
        autoGeneratePo: true,
        requireApproval: true,
        enableAuditLog: true,
        showAdvancedMetrics: false
    }
};

window.toggleSwitch = function(btn) {
    const thumb = btn.querySelector('.switch-thumb');
    const isAct = btn.classList.contains('active');
    
    if (isAct) {
        btn.classList.remove('active');
        thumb.classList.remove('active');
    } else {
        btn.classList.add('active');
        thumb.classList.add('active');
    }

    // Update state based on tracking if needed
    const id = btn.getAttribute('data-id');
    if (id in state.forecastSettings) state.forecastSettings[id] = !isAct;
    if (id in state.generalConfig) state.generalConfig[id] = !isAct;
}

window.resetToDefaults = function() {
    document.getElementById('defaultTimePeriod').value = 30;
    document.getElementById('forecastHorizon').value = 90;
    
    document.getElementById('lowStockRange').value = 20;
    document.getElementById('lowStockValue').textContent = "20%";
    
    document.getElementById('criticalStockRange').value = 10;
    document.getElementById('criticalStockValue').textContent = "10%";
    
    document.getElementById('overStockRange').value = 150;
    document.getElementById('overStockValue').textContent = "150%";

    document.getElementById('reorderPoint').value = 50;
    document.getElementById('safetyStockDays').value = 7;

    // Reset switch states
    const trues = ['autoReorder', 'includeSeasonal', 'useMLPrediction', 'enableEmail', 'autoGeneratePo', 'requireApproval', 'enableAuditLog'];
    
    document.querySelectorAll('.switch-bg').forEach(btn => {
        const id = btn.getAttribute('data-id');
        const thumb = btn.querySelector('.switch-thumb');
        
        if (trues.includes(id)) {
            btn.classList.add('active');
            thumb.classList.add('active');
        } else {
            btn.classList.remove('active');
            thumb.classList.remove('active');
        }
    });
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('translate-x-full', 'opacity-0');
    
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
    }, 3000);
}

window.handleSaveSettings = function(e) {
    e.preventDefault();
    showToast();
}
