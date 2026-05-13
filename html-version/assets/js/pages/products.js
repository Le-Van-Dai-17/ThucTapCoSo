// Init Lucide Icons initially
lucide.createIcons();

let mockProducts = [
    { id: 1, sku: "WBH-001", name: "Wireless Bluetooth Headphones", category: "Electronics", sellingPrice: 89.99, currentStock: 145, status: "active" },
    { id: 2, sku: "SWS-005", name: "Smart Watch Series 5", category: "Electronics", sellingPrice: 299.99, currentStock: 67, status: "active" },
    { id: 3, sku: "LSA-220", name: "Laptop Stand Aluminum", category: "Accessories", sellingPrice: 45.50, currentStock: 234, status: "active" },
    { id: 4, sku: "MKR-070", name: "Mechanical Keyboard RGB", category: "Electronics", sellingPrice: 129.99, currentStock: 89, status: "active" },
    { id: 5, sku: "WME-360", name: "Wireless Mouse Ergonomic", category: "Accessories", sellingPrice: 49.99, currentStock: 312, status: "active" },
    { id: 6, sku: "UCH-120", name: "USB-C Hub 7-in-1", category: "Electronics", sellingPrice: 59.99, currentStock: 156, status: "active" },
    { id: 7, sku: "BTS-045", name: "Bluetooth Speaker Portable", category: "Electronics", sellingPrice: 79.99, currentStock: 0, status: "discontinued" },
    { id: 8, sku: "PHC-089", name: "Phone Case Premium Leather", category: "Accessories", sellingPrice: 34.99, currentStock: 421, status: "active" },
    { id: 9, sku: "WCH-QI15", name: "Wireless Charger 15W", category: "Electronics", sellingPrice: 39.99, currentStock: 198, status: "active" },
    { id: 10, sku: "HDM-200", name: "HDMI Cable 2.1 (2m)", category: "Accessories", sellingPrice: 19.99, currentStock: 567, status: "active" }
];

const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const tableBody = document.getElementById('tableBody');
const statsCards = document.getElementById('statsCards');

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function getStockStatusColor(stock) {
    if (stock === 0) return "text-red-600";
    if (stock < 50) return "text-orange-600";
    return "text-gray-900";
}

function updateStats(data) {
    const activeCount = data.filter(p => p.status === 'active').length;
    const lowCount = data.filter(p => p.currentStock < 50 && p.currentStock > 0).length;
    const outCount = data.filter(p => p.currentStock === 0).length;

    statsCards.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Total Products</div>
            <div class="text-2xl font-semibold text-gray-900">${data.length}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Active Products</div>
            <div class="text-2xl font-semibold text-[#10B981]">${activeCount}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Low Stock</div>
            <div class="text-2xl font-semibold text-orange-600">${lowCount}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="text-sm text-gray-500 mb-1">Out of Stock</div>
            <div class="text-2xl font-semibold text-red-600">${outCount}</div>
        </div>
    `;
}

function renderTable() {
    const query = searchInput.value.toLowerCase();
    const cat = categoryFilter.value;

    const filteredProducts = mockProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query);
        const matchesCategory = cat === "All Categories" || p.category === cat;
        return matchesSearch && matchesCategory;
    });

    tableBody.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="py-16 text-center">
                        <div class="text-gray-400 mb-2 flex justify-center">
                            <i data-lucide="search" class="w-12 h-12"></i>
                        </div>
                        <p class="text-gray-600 font-medium">No products found</p>
                        <p class="text-sm text-gray-500 mt-1">Try adjusting your search or filter</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        filteredProducts.forEach(product => {
            const stockColor = getStockStatusColor(product.currentStock);
            const statusClass = product.status === "active" ? "bg-[#10B981]/10 text-[#10B981]" : "bg-gray-100 text-gray-600";
            const statusText = product.status === "active" ? "Active" : "Discontinued";

            const tr = document.createElement('tr');
            tr.className = "border-b border-[#E2E8F0] hover:bg-blue-50/50 transition-colors duration-150 h-14";
            
            tr.innerHTML = `
                <td class="px-4 py-4"><span class="font-mono text-sm font-medium text-gray-700">${product.sku}</span></td>
                <td class="px-4 py-4"><a href="#" class="font-medium text-gray-900 hover:text-[#2563EB] transition-colors duration-150 cursor-pointer">${product.name}</a></td>
                <td class="px-4 py-4"><span class="text-sm text-gray-600">${product.category}</span></td>
                <td class="px-4 py-4 text-right"><span class="font-semibold text-gray-900">${formatCurrency(product.sellingPrice)}</span></td>
                <td class="px-4 py-4 text-center"><span class="font-semibold ${stockColor}">${product.currentStock}</span></td>
                <td class="px-4 py-4 text-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${statusClass}">${statusText}</span>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center justify-center gap-2">
                        <button class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                        <button class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150" onclick="deleteProduct(${product.id})"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    updateStats(mockProducts);
    // Re-initialize icons inside new elements
    lucide.createIcons();
}

window.deleteProduct = function(id) {
    mockProducts = mockProducts.filter(p => p.id !== id);
    renderTable();
};

searchInput.addEventListener('input', renderTable);
categoryFilter.addEventListener('change', renderTable);

// Initial render
renderTable();
