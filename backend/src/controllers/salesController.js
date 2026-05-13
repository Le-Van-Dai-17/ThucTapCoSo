const { pool } = require('../db');
exports.getSalesSummary = async (req, res) => {
    try {
        const query = `
            SELECT s.*, p.name AS product_name
            FROM sales s
            JOIN products p ON s.product_id = p.id
            ORDER BY s.sale_date DESC
        `;
        const [sales] = await pool.query(query);
        res.status(200).json({
            success: true,
            data: sales
        });
    } catch (error) {
        console.error('Error fetching sales summary:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy dữ liệu doanh số bán hàng'
        });
    }
};

exports.createSale = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { product_id, quantity, unit_price, total_amount, sale_date } = req.body;
        await connection.beginTransaction();
        await connection.query(
            'INSERT INTO sales (product_id, quantity, unit_price, total_amount, sale_date) VALUES (?, ?, ?, ?, ?)',
            [product_id, quantity, unit_price, total_amount, sale_date || new Date()]
        );
        await connection.query( 
            'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
            [quantity, product_id]
        );
        await connection.commit();
        res.status(201).json({
            success: true,
            message: 'Doanh số bán hàng đã được tạo thành công'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating sale:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo doanh số bán hàng'
        });
    } finally {
        connection.release();
    }
};