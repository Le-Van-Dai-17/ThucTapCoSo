lucide.createIcons();

const mockReceivingData = {
  orderId: "PO-2024-002",
  supplier: "Global Electronics",
  items: [
    { id: 1, productName: "Wireless Bluetooth Headphones", orderedQuantity: 280, receivedQuantity: 0 },
    { id: 2, productName: "Smart Watch Series 5", orderedQuantity: 65, receivedQuantity: 0 },
    { id: 3, productName: "Laptop Stand Aluminum", orderedQuantity: 220, receivedQuantity: 0 },
    { id: 4, productName: "Mechanical Keyboard RGB", orderedQuantity: 70, receivedQuantity: 0 },
    { id: 5, productName: "Wireless Mouse Ergonomic", orderedQuantity: 360, receivedQuantity: 0 },
  ],
};

let items = [...mockReceivingData.items];

const tableBody = document.getElementById('tableBody');
const orderHeaderText = document.getElementById('orderHeaderText');

const valTotalItems = document.getElementById('totalItems');
const valTotalOrdered = document.getElementById('totalOrdered');
const valTotalReceived = document.getElementById('totalReceived');

const progressTextInfo = document.getElementById('progressTextInfo');
const progressBar = document.getElementById('progressBar');
const mainConfirmBtn = document.getElementById('mainConfirmBtn');

const confirmModalOverlay = document.getElementById('confirmModalOverlay');
const confirmModal = document.getElementById('confirmModal');
const discrepancyWarning = document.getElementById('discrepancyWarning');
const successOverlay = document.getElementById('successOverlay');

function init() {
    orderHeaderText.textContent = `${mockReceivingData.orderId} - ${mockReceivingData.supplier}`;
    valTotalItems.textContent = items.length;
    renderTable();
}

function handleQuantityChange(id, value) {
    let num = parseInt(value, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    
    items = items.map(item => item.id === id ? { ...item, receivedQuantity: num } : item);
    renderTable(); // Keep it simple by fully re-rendering.
}

function renderTable() {
    let totalOrdered = 0;
    let totalReceived = 0;
    tableBody.innerHTML = '';

    items.forEach((item, index) => {
        totalOrdered += item.orderedQuantity;
        totalReceived += item.receivedQuantity;

        const isComplete = item.receivedQuantity === item.orderedQuantity && item.receivedQuantity > 0;
        const hasDiscrepancy = item.receivedQuantity !== item.orderedQuantity && item.receivedQuantity > 0;
        const isPending = item.receivedQuantity === 0;

        const tr = document.createElement('tr');
        tr.className = `border-b border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`;

        let statusHtml = '';
        if (isComplete) {
            statusHtml = `<span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-[#10B981]/10 text-[#10B981]"><svg class="w-4 h-4 mr-1 lucide lucide-check-circle-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg> Complete</span>`;
        } else if (hasDiscrepancy) {
            statusHtml = `<span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-orange-100 text-orange-700"><svg class="w-4 h-4 mr-1 lucide lucide-alert-circle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg> Discrepancy</span>`;
        } else if (isPending) {
            statusHtml = `<span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-600">Pending</span>`;
        }

        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-gray-400 lucide lucide-package" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>
                    </div>
                    <span class="font-medium text-gray-900">${item.productName}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">
                    ${item.orderedQuantity}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center">
                    <input type="number" 
                           value="${item.receivedQuantity === 0 ? '' : item.receivedQuantity}" 
                           oninput="handleQuantityChange(${item.id}, this.value)" 
                           placeholder="Enter quantity" 
                           class="w-32 px-4 py-2 text-center border-2 border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 focus:border-[#10B981] transition-all duration-200 text-lg font-medium" />
                </div>
            </td>
            <td class="px-6 py-4 text-center">${statusHtml}</td>
        `;
        tableBody.appendChild(tr);
    });

    valTotalOrdered.textContent = totalOrdered;
    valTotalReceived.textContent = totalReceived;
    progressTextInfo.textContent = `${totalReceived} / ${totalOrdered} items received`;
    
    let pct = (totalReceived / totalOrdered) * 100;
    if (pct > 100) pct = 100;
    progressBar.style.width = pct + '%';

    mainConfirmBtn.disabled = totalReceived === 0;
}

// Modal Logic
window.openConfirmModal = function() {
    const hasDiscrepancy = items.some(i => i.receivedQuantity !== i.orderedQuantity && i.receivedQuantity > 0);
    
    confirmModalOverlay.classList.remove('hidden');
    
    // Toggle enter animation classes
    confirmModalOverlay.classList.remove('overlay-leave', 'overlay-leave-active');
    confirmModalOverlay.classList.add('overlay-enter', 'overlay-enter-active');
    
    confirmModal.classList.remove('modal-leave', 'modal-leave-active');
    confirmModal.classList.add('modal-enter', 'modal-enter-active');

    if (hasDiscrepancy) {
        discrepancyWarning.classList.remove('hidden');
    } else {
        discrepancyWarning.classList.add('hidden');
    }
};

window.closeConfirmModal = function() {
    confirmModalOverlay.classList.remove('overlay-enter', 'overlay-enter-active');
    confirmModalOverlay.classList.add('overlay-leave', 'overlay-leave-active');
    
    confirmModal.classList.remove('modal-enter', 'modal-enter-active');
    confirmModal.classList.add('modal-leave', 'modal-leave-active');

    setTimeout(() => {
        confirmModalOverlay.classList.add('hidden');
    }, 200);
};

window.handleConfirmYes = function() {
    closeConfirmModal();
    
    // Show success overlay
    setTimeout(() => {
        successOverlay.classList.remove('hidden');
        successOverlay.classList.add('overlay-enter', 'overlay-enter-active');
        
        setTimeout(() => {
            window.location.href = 'purchase-orders.html';
        }, 2000);

    }, 250);
};

confirmModalOverlay.addEventListener('click', closeConfirmModal);

// Start
init();
