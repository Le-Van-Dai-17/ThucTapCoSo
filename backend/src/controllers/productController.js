const { pool } = require('../db');

exports.getAllProducts = async (req, res) => {
    try {
        const [products] = await pool.query('SELECT * FROM products ORDER BY id DESC');
        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy dữ liệu sản phẩm'
        });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không tồn tại'
            });
        }
        res.status(200).json({
            success: true,
            data: products[0]
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy dữ liệu sản phẩm'
        });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { name, sku, category, description, selling_price, cost_price, current_stock, min_stock, status } = req.body;
        const [result] = await pool.query(
            'INSERT INTO products (name, sku, category, description, selling_price, cost_price, current_stock, min_stock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, sku, category, description, selling_price, cost_price, current_stock, min_stock, status]
        );
        res.status(201).json({
            success: true,
            message: 'Sản phẩm đã được tạo thành công'
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo sản phẩm'
        });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sku, category, description, selling_price, cost_price, current_stock, min_stock, status } = req.body;
        const [result] = await pool.query(
            'UPDATE products SET name = ?, sku = ?, category = ?, description = ?, selling_price = ?, cost_price = ?, current_stock = ?, min_stock = ?, status = ? WHERE id = ?',
            [name, sku, category, description, selling_price, cost_price, current_stock, min_stock, status, id]
        );
        res.status(200).json({
            success: true,
            message: 'Sản phẩm đã được cập nhật thành công'
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật sản phẩm'
        });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
        res.status(200).json({
            success: true,
            message: 'Sản phẩm đã được xóa thành công'
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa sản phẩm'
        });
    }
};

