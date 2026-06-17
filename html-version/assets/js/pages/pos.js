// ======================================================
// pos.js
// Logic for Sales POS System
// ======================================================

let allProducts = [];
let cart = []; // Array of { product_id, sku, name, unit_price, quantity, max_stock }
let selectedCategory = 'All Categories';

document.addEventListener('DOMContentLoaded', async () => {
    initEventListeners();
    await loadProducts();
});

function initEventListeners() {
    const globalSearch = document.querySelector('header input[placeholder*="Search"]');
    if (globalSearch) {
        globalSearch.parentElement.parentElement.style.display = 'none';
    }

    const searchInput = document.getElementById('posSearchInput');
    const categoryFilter = document.getElementById('posCategoryFilter');
    const clearCartBtn = document.getElementById('posClearCartBtn');
    const checkoutBtn = document.getElementById('posCheckoutBtn');

    if(searchInput) searchInput.addEventListener('input', renderProducts);
    if(categoryFilter) categoryFilter.addEventListener('change', (e) => {
        selectedCategory = e.target.value;
        renderProducts();
    });

    if(clearCartBtn) clearCartBtn.addEventListener('click', clearCart);
    if(checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);
}

async function loadProducts() {
    try {
        const result = await API.products.getAll();
        allProducts = result.data || result;
        
        // Filter out discontinued products
        allProducts = allProducts.filter(p => p.status === 'active' || p.is_discontinued == 0);
        
        // Fetch real categories
        let cats = [];
        try {
            const catResult = await API.categories.getAll();
            cats = catResult.data || catResult;
        } catch(e) {
            console.warn('Could not load categories', e);
        }
        
        // Map category IDs to names for filtering if needed, but the product payload might already have category_name
        // If not, we can join it here
        allProducts = allProducts.map(p => {
            if (!p.category && p.category_id && cats.length) {
                const c = cats.find(c => c.category_id === p.category_id || String(c.category_id) === String(p.category_id));
                if (c) p.category = c.name;
            }
            return p;
        });

        populateCategories(cats);
        renderProducts();
    } catch (err) {
        console.error('[POS] Backend error:', err);
        showToast('Cannot load products.', 'error');
    }
}

function populateCategories(dbCategories) {
    const filter = document.getElementById('posCategoryFilter');
    if (!filter) return;
    
    let html = `<option value="All Categories">All Categories</option>`;
    if (dbCategories && dbCategories.length > 0) {
        dbCategories.forEach(c => {
            html += `<option value="${c.name}">${c.name}</option>`;
        });
    } else {
        const cats = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
        cats.forEach(c => {
            html += `<option value="${c}">${c}</option>`;
        });
    }
    filter.innerHTML = html;
}

function renderProducts() {
    const search = document.getElementById('posSearchInput')?.value.toLowerCase() || '';
    const grid = document.getElementById('posProductsGrid');
    const emptyState = document.getElementById('posEmptyState');
    
    let filtered = allProducts;
    if (selectedCategory !== 'All Categories') {
        filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (search) {
        filtered = filtered.filter(p => 
            (p.name && p.name.toLowerCase().includes(search)) || 
            (p.sku && p.sku.toLowerCase().includes(search))
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
        return;
    }

    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');

    let html = '';
    filtered.forEach(p => {
        const price = Number(p.selling_price) || 0;
        const stock = Number(p.current_stock) || 0;
        const isOutOfStock = stock <= 0;
        
        html += `
        <div class="bg-white border \${isOutOfStock ? 'border-red-200' : 'border-gray-200 hover:border-[#2563EB] hover:shadow-md'} rounded-xl p-4 cursor-pointer transition-all flex flex-col \${isOutOfStock ? 'opacity-60 grayscale cursor-not-allowed' : ''}"
             onclick="\${isOutOfStock ? '' : \`addToCart(\${p.product_id || p.id})\`}">
            <div class="text-xs text-gray-500 mb-1">\${p.sku || ''}</div>
            <div class="font-medium text-gray-900 mb-2 line-clamp-2 h-10">\${p.name}</div>
            <div class="mt-auto flex items-end justify-between">
                <div class="text-[#2563EB] font-bold">$\${price.toFixed(2)}</div>
                <div class="text-xs \${isOutOfStock ? 'text-red-600 font-medium' : 'text-gray-500'}">
                    \${isOutOfStock ? 'Out of Stock' : \`Stock: \${stock}\`}
                </div>
            </div>
        </div>`;
    });
    grid.innerHTML = html;
}

function addToCart(productId) {
    const product = allProducts.find(p => (p.product_id || p.id) === productId);
    if (!product) return;

    const existing = cart.find(c => c.product_id === productId);
    const stock = Number(product.current_stock) || 0;
    
    if (existing) {
        if (existing.quantity < stock) {
            existing.quantity++;
        } else {
            showToast('Cannot add more. Not enough stock.', 'warning');
        }
    } else {
        if (stock > 0) {
            cart.push({
                product_id: productId,
                sku: product.sku,
                name: product.name,
                unit_price: Number(product.selling_price) || 0,
                quantity: 1,
                max_stock: stock
            });
        }
    }
    renderCart();
}

function updateCartQuantity(productId, delta) {
    const item = cart.find(c => c.product_id === productId);
    if (!item) return;
    
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        removeFromCart(productId);
    } else if (newQty > item.max_stock) {
        showToast('Not enough stock available.', 'warning');
    } else {
        item.quantity = newQty;
        renderCart();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(c => c.product_id !== productId);
    renderCart();
}

function clearCart() {
    cart = [];
    renderCart();
}

function renderCart() {
    const container = document.getElementById('posCartItems');
    const subEl = document.getElementById('posSubtotal');
    const totEl = document.getElementById('posTotal');
    const btn = document.getElementById('posCheckoutBtn');

    if (cart.length === 0) {
        container.innerHTML = \`<div class="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
            <i data-lucide="shopping-bag" class="w-16 h-16 mb-3"></i>
            <p>Cart is empty</p>
        </div>\`;
        subEl.textContent = '$0.00';
        totEl.textContent = '$0.00';
        btn.disabled = true;
        lucide.createIcons();
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach(item => {
        const lineTotal = item.unit_price * item.quantity;
        total += lineTotal;
        html += \`
        <div class="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
            <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">\${item.name}</div>
                <div class="text-xs text-gray-500">$\${item.unit_price.toFixed(2)}</div>
            </div>
            <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1 shrink-0">
                <button onclick="updateCartQuantity(\${item.product_id}, -1)" class="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:bg-white hover:shadow-sm transition-colors">
                    <i data-lucide="minus" class="w-3 h-3"></i>
                </button>
                <span class="text-sm font-medium w-6 text-center">\${item.quantity}</span>
                <button onclick="updateCartQuantity(\${item.product_id}, 1)" class="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:bg-white hover:shadow-sm transition-colors">
                    <i data-lucide="plus" class="w-3 h-3"></i>
                </button>
            </div>
            <div class="text-sm font-bold text-gray-900 w-16 text-right shrink-0">$\${lineTotal.toFixed(2)}</div>
        </div>\`;
    });

    container.innerHTML = html;
    subEl.textContent = \`$\${total.toFixed(2)}\`;
    totEl.textContent = \`$\${total.toFixed(2)}\`;
    btn.disabled = false;
    lucide.createIcons();
}

async function handleCheckout() {
    if (cart.length === 0) return;
    const btn = document.getElementById('posCheckoutBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Processing...';
    lucide.createIcons();

    try {
        const payload = {
            items: cart.map(c => ({
                product_id: c.product_id,
                quantity: c.quantity,
                unit_price: c.unit_price
            }))
        };

        const res = await apiFetch('/sales/pos-checkout', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.success || res.message) {
            showToast('Thanh toán thành công! (Checkout successful)', 'success');
            clearCart();
            // Reload products to get updated stock
            await loadProducts(); 
        }
    } catch (err) {
        console.error('[POS Checkout]', err);
        showToast(err.message || 'Thanh toán thất bại!', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="credit-card" class="w-5 h-5"></i> Checkout';
        lucide.createIcons();
    }
}
