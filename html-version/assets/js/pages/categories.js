lucide.createIcons();
if (typeof Auth !== 'undefined') Auth.requireAuth();

let categories = [];
let editingCategoryId = null;

const tableBody = document.getElementById('categoryTableBody');
const searchInput = document.getElementById('categorySearch');

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

async function loadCategories() {
    tableBody.innerHTML = '<tr><td colspan="3" class="py-12 text-center text-gray-500">Loading...</td></tr>';
    try {
        const result = await API.categories.getAll();
        categories = result.data || result || [];
    } catch (error) {
        categories = [];
        showToast('Cannot load categories: ' + error.message, 'error');
    }
    renderCategories();
}

function renderCategories() {
    const query = (searchInput?.value || '').trim().toLowerCase();
    const filtered = categories.filter(c =>
        String(c.name || '').toLowerCase().includes(query) ||
        String(c.description || '').toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="py-16 text-center text-gray-500">
                    <div class="flex justify-center mb-3"><i data-lucide="tags" class="w-12 h-12 text-gray-300"></i></div>
                    <p class="font-medium text-gray-600">No categories found</p>
                </td>
            </tr>`;
        lucide.createIcons();
        return;
    }

    tableBody.innerHTML = filtered.map(category => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 font-medium text-gray-900">${escapeHtml(category.name)}</td>
            <td class="px-6 py-4 text-gray-600">${escapeHtml(category.description || '--')}</td>
            <td class="px-6 py-4">
                <div class="flex justify-center gap-2">
                    <button onclick="openCategoryModal(${category.category_id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteCategory(${category.category_id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

window.openCategoryModal = function(categoryId = null) {
    editingCategoryId = categoryId;
    const category = categories.find(c => String(c.category_id) === String(categoryId));
    const error = document.getElementById('categoryFormError');
    if (error) error.classList.add('hidden');

    document.getElementById('categoryModalTitle').textContent = category ? 'Edit Category' : 'Add Category';
    document.getElementById('categoryName').value = category?.name || '';
    document.getElementById('categoryDescription').value = category?.description || '';
    document.getElementById('categorySubmitBtn').textContent = category ? 'Save Changes' : 'Add Category';

    const overlay = document.getElementById('categoryModalOverlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
};

window.closeCategoryModal = function() {
    const overlay = document.getElementById('categoryModalOverlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
    editingCategoryId = null;
    document.getElementById('categoryForm').reset();
};

document.getElementById('categoryForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const error = document.getElementById('categoryFormError');
    const btn = document.getElementById('categorySubmitBtn');
    const payload = {
        name: document.getElementById('categoryName').value.trim(),
        description: document.getElementById('categoryDescription').value.trim()
    };

    if (error) error.classList.add('hidden');
    if (!payload.name) {
        if (error) {
            error.textContent = 'Category name is required.';
            error.classList.remove('hidden');
        }
        return;
    }

    btn.disabled = true;
    btn.textContent = editingCategoryId ? 'Saving...' : 'Adding...';
    try {
        if (editingCategoryId) {
            await API.categories.update(editingCategoryId, payload);
            showToast('Category updated successfully.', 'success');
        } else {
            await API.categories.create(payload);
            showToast('Category added successfully.', 'success');
        }
        closeCategoryModal();
        await loadCategories();
    } catch (err) {
        if (error) {
            error.textContent = err.message || 'Cannot save category.';
            error.classList.remove('hidden');
        }
    } finally {
        btn.disabled = false;
        btn.textContent = editingCategoryId ? 'Save Changes' : 'Add Category';
    }
});

window.deleteCategory = async function(categoryId) {
    const category = categories.find(c => String(c.category_id) === String(categoryId));
    if (!category) return;
    if (!confirm(`Delete category "${category.name}"?`)) return;

    try {
        await API.categories.delete(categoryId);
        showToast('Category deleted successfully.', 'success');
        await loadCategories();
    } catch (err) {
        showToast(err.message || 'Cannot delete category.', 'error');
    }
};

searchInput?.addEventListener('input', renderCategories);
loadCategories();
