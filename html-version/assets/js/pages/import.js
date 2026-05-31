lucide.createIcons();

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const dropIconContainer = document.getElementById('dropIconContainer');
const dropIcon = document.getElementById('dropIcon');
const dropTitle = document.getElementById('dropTitle');

const fileListContainer = document.getElementById('fileListContainer');
const fileCountText = document.getElementById('fileCountText');
const fileList = document.getElementById('fileList');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const actionButtons = document.getElementById('actionButtons');
const uploadBtn = document.getElementById('uploadBtn');
const confirmBtn = document.getElementById('confirmBtn');

let uploadedFiles = []; // { id, file, status, validationResults }
let isUploading = false;

// Drag & Drop Handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-[#2563EB]', 'bg-blue-50');
    dropZone.classList.remove('border-gray-300', 'hover:border-gray-400', 'hover:bg-gray-50');
    dropIconContainer.classList.replace('bg-gray-100', 'bg-[#2563EB]');
    dropIcon.classList.replace('text-gray-400', 'text-white');
    dropTitle.textContent = "Drop files here";
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    resetDropZoneUI();
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    resetDropZoneUI();
    handleFiles(Array.from(e.dataTransfer.files));
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files) {
        handleFiles(Array.from(e.target.files));
    }
    fileInput.value = ''; // Reset
});

function resetDropZoneUI() {
    dropZone.classList.remove('border-[#2563EB]', 'bg-blue-50');
    dropZone.classList.add('border-gray-300', 'hover:border-gray-400', 'hover:bg-gray-50');
    dropIconContainer.classList.replace('bg-[#2563EB]', 'bg-gray-100');
    dropIcon.classList.replace('text-white', 'text-gray-400');
    dropTitle.textContent = "Drag & drop files here";
}

function handleFiles(files) {
    const csvFiles = files.filter(f => f.type === "text/csv" || f.name.endsWith(".csv"));
    if (csvFiles.length === 0) {
        showToast("Please upload CSV files only.", 'info');
        return;
    }

    const newFiles = csvFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        status: "pending"
    }));

    uploadedFiles = [...uploadedFiles, ...newFiles];
    renderFileList();
}

window.removeFile = function(id) {
    uploadedFiles = uploadedFiles.filter(f => f.id !== id);
    renderFileList();
};

function renderFileList() {
    if (uploadedFiles.length === 0) {
        fileListContainer.classList.add('hidden');
        actionButtons.classList.add('hidden');
        return;
    }

    fileListContainer.classList.remove('hidden');
    actionButtons.classList.remove('hidden');
    fileCountText.textContent = `Uploaded Files (${uploadedFiles.length})`;

    fileList.innerHTML = '';

    uploadedFiles.forEach(f => {
        const item = document.createElement('div');
        item.className = "border border-gray-200 rounded-[12px] p-4";

        let statusIcon = '';
        let validationHtml = '';

        if (f.status === 'validating') {
             // We can use a simple spinning svg or lucide's loader
             statusIcon = `<svg class="animate-spin w-4 h-4 text-[#2563EB]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
        } else if (f.status === 'success') {
             statusIcon = `<i data-lucide="check-circle" class="w-4 h-4 text-[#10B981]"></i>`;
             validationHtml = `
                <div class="mt-3 space-y-2">
                    <div class="flex items-start gap-2 text-sm text-[#10B981]">
                        <i data-lucide="check-circle" class="w-4 h-4 mt-0.5 shrink-0"></i>
                        <div>
                            <p class="font-medium">Validation successful!</p>
                            <p class="text-gray-600">${f.validationResults.validRows} of ${f.validationResults.totalRows} rows are valid</p>
                        </div>
                    </div>
                </div>
             `;
        } else if (f.status === 'error') {
             statusIcon = `<i data-lucide="alert-circle" class="w-4 h-4 text-red-500"></i>`;
             const errorItems = f.validationResults.errors.map(err => `<li>${err}</li>`).join('');
             validationHtml = `
                <div class="mt-3 space-y-2 text-sm text-red-500">
                    <div class="flex items-start gap-2 mb-2">
                        <i data-lucide="alert-circle" class="w-4 h-4 mt-0.5 shrink-0"></i>
                        <div>
                            <p class="font-medium">Validation failed</p>
                            <p class="text-gray-600">${f.validationResults.validRows} of ${f.validationResults.totalRows} rows are valid</p>
                        </div>
                    </div>
                    <ul class="list-disc list-inside space-y-1 text-xs ml-6">
                        ${errorItems}
                    </ul>
                </div>
             `;
        }

        item.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <i data-lucide="file" class="w-5 h-5 text-[#2563EB]"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-medium text-gray-900 truncate">${f.file.name}</span>
                        ${statusIcon}
                    </div>
                    <div class="text-sm text-gray-500">${(f.file.size / 1024).toFixed(2)} KB</div>
                    ${validationHtml}
                </div>
                <button onclick="removeFile('${f.id}')" class="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-150 relative z-10">
                    <i data-lucide="x" class="w-5 h-5 text-gray-400"></i>
                </button>
            </div>
        `;
        fileList.appendChild(item);
    });

    lucide.createIcons();
    updateButtonStates();
}

function updateButtonStates() {
    const allValidated = uploadedFiles.every(f => f.status !== "pending");
    const hasSuccessFiles = uploadedFiles.some(f => f.status === "success");

    uploadBtn.disabled = isUploading || allValidated;
    confirmBtn.disabled = !allValidated || !hasSuccessFiles;

    uploadBtn.textContent = isUploading ? "Validating..." : "Upload & Validate";
}

// Upload action
uploadBtn.addEventListener('click', async () => {
    isUploading = true;
    updateButtonStates();
    progressContainer.classList.remove('hidden');
    progressText.textContent = '0%';
    progressBar.style.width = '0%';

    for (let i = 0; i < uploadedFiles.length; i++) {
        const fileObj = uploadedFiles[i];
        if (fileObj.status === 'pending') {
            fileObj.status = 'validating';
            renderFileList();
            try {
                // Gọi API thật từ backend
                const res = await API.sales.importCSV(fileObj.file);
                if (res.success || res.status === 'success') {
                    fileObj.status = 'success';
                    fileObj.validationResults = {
                        totalRows: res.data?.total || res.total || 0,
                        validRows: res.data?.imported || res.imported || 0,
                        errors: []
                    };
                } else {
                    fileObj.status = 'error';
                    fileObj.validationResults = {
                        totalRows: res.data?.total || res.total || 0,
                        validRows: res.data?.imported || res.imported || 0,
                        errors: res.errors || [res.message || 'Import failed']
                    };
                }
            } catch (err) {
                fileObj.status = 'error';
                fileObj.validationResults = {
                    totalRows: 0,
                    validRows: 0,
                    errors: [err.message || 'Network error']
                };
            }
            const progress = ((i + 1) / uploadedFiles.length) * 100;
            progressText.textContent = Math.round(progress) + '%';
            progressBar.style.width = progress + '%';
        }
    }

    isUploading = false;
    setTimeout(() => {
        progressContainer.classList.add('hidden');
        renderFileList();
    }, 500);
});

confirmBtn.addEventListener('click', () => {
    const successFiles = uploadedFiles.filter(f => f.status === "success");
    if (successFiles.length === 0) {
        showToast("No valid files to import. Please fix errors and try again.", 'info');
        return;
    }

    const totalValid = successFiles.reduce((sum, f) => sum + f.validationResults.validRows, 0);
    showToast(`Successfully imported ${successFiles.length} file(s, 'info') with ${totalValid} valid rows.`);
    
    // Reset and redirect
    uploadedFiles = [];
    renderFileList();
    window.location.href = 'sales-data.html';
});
