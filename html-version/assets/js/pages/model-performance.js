lucide.createIcons();
if (typeof Auth !== 'undefined') {
    Auth.requireAuth();
    if (!Auth.hasRole('admin')) {
        showToast('Only Admin can manage model performance.', 'error');
        window.location.href = Auth.getHomePage();
    }
}

const activeModelCard = document.getElementById('activeModelCard');
const modelHistoryBody = document.getElementById('modelHistoryBody');
const trainingRunsBody = document.getElementById('trainingRunsBody');
const btnTrainNow = document.getElementById('btnTrainNow');

let overview = null;

function metric(value, suffix = '') {
    const num = Number(value);
    if (!Number.isFinite(num)) return '--';
    return `${num.toFixed(2)}${suffix}`;
}

function dateText(value) {
    if (!value) return '--';
    const date = new Date(value);
    return isNaN(date) ? String(value) : date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function badge(text, kind = 'gray') {
    const classes = {
        green: 'bg-green-100 text-green-700',
        blue: 'bg-blue-100 text-blue-700',
        red: 'bg-red-100 text-red-700',
        gray: 'bg-gray-100 text-gray-700',
        yellow: 'bg-yellow-100 text-yellow-700'
    };
    return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold ${classes[kind] || classes.gray}">${text}</span>`;
}

function renderActiveModel(model) {
    if (!model) {
        activeModelCard.innerHTML = '<div class="py-8 text-center text-gray-500">No active model deployed.</div>';
        return;
    }

    activeModelCard.innerHTML = `
        <div class="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
                <p class="text-xs font-semibold text-gray-500 uppercase">Active Model</p>
                <h2 class="text-2xl font-bold text-gray-900 mt-1">${model.version_tag}</h2>
                <p class="text-sm text-gray-500 mt-1">${model.algorithm_type || '--'} | ${model.model_path || '--'}</p>
            </div>
            ${badge('Deployed', 'green')}
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="rounded-xl bg-gray-50 border border-gray-200 p-4"><p class="text-xs text-gray-500 font-semibold">MAPE</p><p class="text-xl font-bold text-[#2563EB] mt-1">${metric(model.mape_score, '%')}</p></div>
            <div class="rounded-xl bg-gray-50 border border-gray-200 p-4"><p class="text-xs text-gray-500 font-semibold">MAE</p><p class="text-xl font-bold text-gray-900 mt-1">${metric(model.mae_score)}</p></div>
            <div class="rounded-xl bg-gray-50 border border-gray-200 p-4"><p class="text-xs text-gray-500 font-semibold">RMSE</p><p class="text-xl font-bold text-gray-900 mt-1">${metric(model.rmse_score)}</p></div>
            <div class="rounded-xl bg-gray-50 border border-gray-200 p-4"><p class="text-xs text-gray-500 font-semibold">R2</p><p class="text-xl font-bold text-gray-900 mt-1">${metric(model.r2_score)}</p></div>
        </div>
    `;
}

function renderModels(models = []) {
    if (!models.length) {
        modelHistoryBody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-gray-500">No models found.</td></tr>';
        return;
    }

    modelHistoryBody.innerHTML = models.map(model => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4"><div class="font-semibold text-gray-900">${model.version_tag}</div><div class="text-xs text-gray-500">${dateText(model.training_date)}</div></td>
            <td class="px-6 py-4 text-center text-[#2563EB] font-semibold">${metric(model.mape_score, '%')}</td>
            <td class="px-6 py-4 text-center">${metric(model.mae_score)}</td>
            <td class="px-6 py-4 text-center">${metric(model.rmse_score)}</td>
            <td class="px-6 py-4 text-center">${metric(model.r2_score)}</td>
            <td class="px-6 py-4 text-center">${Number(model.is_deployed) ? badge('Active', 'green') : badge('Candidate')}</td>
            <td class="px-6 py-4 text-right">
                ${Number(model.is_deployed) ? '' : `<button class="deploy-btn px-3 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1d4ed8]" data-model-id="${model.model_id}">Deploy</button>`}
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.deploy-btn').forEach(button => {
        button.addEventListener('click', () => deployModel(button.dataset.modelId));
    });
}

function renderRuns(runs = []) {
    if (!runs.length) {
        trainingRunsBody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-gray-500">No training runs found.</td></tr>';
        return;
    }

    trainingRunsBody.innerHTML = runs.map((run, idx) => {
        const statusKind = run.run_status === 'Failed' ? 'red' : run.run_status === 'Running' ? 'yellow' : 'green';
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4"><div class="font-semibold text-gray-900">#${idx + 1} ${badge(run.run_status, statusKind)}</div><div class="text-xs text-gray-500 mt-1">${dateText(run.started_at)}</div></td>
                <td class="px-6 py-4 text-center">${run.trigger_type || '--'}</td>
                <td class="px-6 py-4 text-center">${run.validation_period ? String(run.validation_period).slice(0, 10) : '--'}</td>
                <td class="px-6 py-4 text-center">${metric(run.baseline_mape, '%')}</td>
                <td class="px-6 py-4 text-center text-[#2563EB] font-semibold">${metric(run.candidate_mape, '%')}</td>
                <td class="px-6 py-4 text-center">${metric(run.improvement_percent, '%')}</td>
                <td class="px-6 py-4 text-center">${Number(run.deployed) ? badge('Yes', 'green') : badge('No')}</td>
            </tr>
        `;
    }).join('');
}

async function loadOverview() {
    activeModelCard.innerHTML = '<div class="py-8 text-center text-gray-500">Loading active model...</div>';
    modelHistoryBody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-gray-500">Loading models...</td></tr>';
    trainingRunsBody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-gray-500">Loading training runs...</td></tr>';

    const response = await API.mlops.getOverview();
    overview = response.data || response;
    renderActiveModel(overview.active_model);
    renderModels(overview.models || []);
    renderRuns(overview.training_runs || []);
    lucide.createIcons();
}

async function trainNow() {
    btnTrainNow.disabled = true;
    btnTrainNow.innerHTML = '<span class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Training...';
    try {
        const result = await API.mlops.trainNow();
        showToast(result.data?.deployed ? 'Training completed and model deployed.' : 'Training completed. Candidate model saved.', 'success');
        await loadOverview();
    } catch (error) {
        showToast('Training failed: ' + error.message, 'error');
    } finally {
        btnTrainNow.disabled = false;
        btnTrainNow.innerHTML = '<i data-lucide="play" class="w-5 h-5"></i> Train Now';
        lucide.createIcons();
    }
}

async function deployModel(modelId) {
    try {
        await API.mlops.deploy(modelId);
        showToast('Model deployed successfully.', 'success');
        await loadOverview();
    } catch (error) {
        showToast('Deploy failed: ' + error.message, 'error');
    }
}

btnTrainNow.addEventListener('click', trainNow);
loadOverview().catch(error => {
    console.error(error);
    showToast('Could not load MLOps dashboard: ' + error.message, 'error');
});
