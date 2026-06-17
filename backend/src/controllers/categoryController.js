const pool = require('../db');

exports.getAllCategories = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT category_id, name, description FROM categories ORDER BY name ASC');
        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('[categoryController.getAllCategories] Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách danh mục.', error: error.message });
    }
};
