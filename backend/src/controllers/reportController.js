const { pool } = require('../db');

// 1. [GET] /api/reports/sales-summary - Tổng quan doanh thu
exports.getSalesSummary = async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT 
                COUNT(id) AS total_orders,
                IFNULL(SUM(quantity), 0) AS total_items_sold,
                IFNULL(SUM(total_amount), 0) AS total_revenue
            FROM sales
        `);
        res.status(200).json({ success: true, data: result[0] });
    } catch (error) {
        console.error('Lỗi lấy tổng quan doanh thu:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// 2. [GET] /api/reports/top-products - Top 5 sản phẩm bán chạy nhất
exports.getTopProducts = async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT 
                p.name, 
                p.sku,
                IFNULL(SUM(s.quantity), 0) AS total_sold,
                IFNULL(SUM(s.total_amount), 0) AS total_revenue
            FROM sales s
            JOIN products p ON s.product_id = p.id
            GROUP BY p.id, p.name, p.sku
            ORDER BY total_sold DESC
            LIMIT 5
        `);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Lỗi lấy top sản phẩm:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// 3. [GET] /api/reports/category-sales - Doanh thu theo danh mục
exports.getCategorySales = async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT 
                p.category, 
                IFNULL(SUM(s.quantity), 0) AS total_sold,
                IFNULL(SUM(s.total_amount), 0) AS total_revenue
            FROM sales s
            JOIN products p ON s.product_id = p.id
            GROUP BY p.category
            ORDER BY total_revenue DESC
        `);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Lỗi lấy doanh thu danh mục:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// 4. [GET] /api/reports/inventory-status - Tình trạng tồn kho tổng quan
exports.getInventoryStatus = async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT 
                COUNT(*) AS total_products,
                IFNULL(SUM(current_stock), 0) AS total_stock,
                SUM(CASE WHEN current_stock <= min_stock THEN 1 ELSE 0 END) AS low_stock_items,
                SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) AS out_of_stock_items
            FROM products
        `);
        res.status(200).json({ success: true, data: result[0] });
    } catch (error) {
        console.error('Lỗi lấy trạng thái kho:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};