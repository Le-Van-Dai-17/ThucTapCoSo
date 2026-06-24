const { pool } = require('../db');

const normalizeName = (name) => String(name || '').trim();

exports.getAllCategories = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT category_id, name, description FROM categories ORDER BY name ASC'
        );

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('[categoryController.getAllCategories] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while loading categories.',
            error: error.message
        });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const name = normalizeName(req.body.name);
        const description = String(req.body.description || '').trim() || null;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required.' });
        }

        const [existing] = await pool.query(
            'SELECT category_id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1',
            [name]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Category already exists.' });
        }

        const [result] = await pool.query(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description]
        );

        res.status(201).json({
            success: true,
            message: 'Category created successfully.',
            data: { category_id: result.insertId, name, description }
        });
    } catch (error) {
        console.error('[categoryController.createCategory] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating category.',
            error: error.message
        });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const name = normalizeName(req.body.name);
        const description = String(req.body.description || '').trim() || null;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required.' });
        }

        const [existing] = await pool.query(
            'SELECT category_id FROM categories WHERE LOWER(name) = LOWER(?) AND category_id <> ? LIMIT 1',
            [name, id]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Category already exists.' });
        }

        const [boundProducts] = await pool.query(
            'SELECT product_id FROM products WHERE category_id = ? LIMIT 1',
            [id]
        );
        if (boundProducts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể chỉnh sửa danh mục này vì đang có sản phẩm thuộc danh mục.'
            });
        }

        const [result] = await pool.query(
            'UPDATE categories SET name = ?, description = ? WHERE category_id = ?',
            [name, description, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }

        res.status(200).json({ success: true, message: 'Category updated successfully.' });
    } catch (error) {
        console.error('[categoryController.updateCategory] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating category.',
            error: error.message
        });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const [boundProducts] = await pool.query(
            'SELECT product_id FROM products WHERE category_id = ? LIMIT 1',
            [id]
        );
        if (boundProducts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete this category because products are using it.'
            });
        }

        const [result] = await pool.query('DELETE FROM categories WHERE category_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }

        res.status(200).json({ success: true, message: 'Category deleted successfully.' });
    } catch (error) {
        console.error('[categoryController.deleteCategory] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting category.',
            error: error.message
        });
    }
};
