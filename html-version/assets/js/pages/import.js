document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    
    const resultArea = document.getElementById('resultArea');
    const resTotal = document.getElementById('resTotal');
    const resSuccess = document.getElementById('resSuccess');
    const resError = document.getElementById('resError');
    const errorLogContainer = document.getElementById('errorLogContainer');
    const errorList = document.getElementById('errorList');

    let currentFile = null;

    // Handle Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-active');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    // Handle File Input Click
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Remove Selected File
    removeFileBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        dropZone.style.display = 'block';
        fileInfo.classList.add('hidden');
        uploadBtn.disabled = true;
        resultArea.classList.add('hidden');
    });

    // Handle Upload
    uploadBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // Loading state
        const originalText = uploadBtn.innerHTML;
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Uploading...`;
        lucide.createIcons();
        resultArea.classList.add('hidden');

        try {
            const res = await API.sales.importCSV(currentFile);
            
            if (res.success) {
                showToast(res.message, 'success');
                
                // Show results
                resTotal.textContent = res.totalRows || 0;
                resSuccess.textContent = res.importedRows || 0;
                resError.textContent = res.errorRows || 0;
                
                if (res.errorRows > 0 && res.errors && res.errors.length > 0) {
                    errorLogContainer.classList.remove('hidden');
                    errorList.innerHTML = res.errors.map(err => `<li>${err}</li>`).join('');
                } else {
                    errorLogContainer.classList.add('hidden');
                }

                resultArea.classList.remove('hidden');
            } else {
                showToast(res.message || 'Import failed', 'error');
            }
        } catch (error) {
            showToast(error.message || 'An error occurred during import', 'error');
        } finally {
            uploadBtn.innerHTML = originalText;
            uploadBtn.disabled = false;
            lucide.createIcons();
        }
    });

    function handleFileSelect(file) {
        // Validate extension
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showToast('Please select a CSV file', 'error');
            return;
        }

        currentFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatBytes(file.size);
        
        dropZone.style.display = 'none';
        fileInfo.classList.remove('hidden');
        uploadBtn.disabled = false;
        resultArea.classList.add('hidden');
    }

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }
});
