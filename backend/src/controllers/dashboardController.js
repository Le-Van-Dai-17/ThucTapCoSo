const pool = require('../config/database');

exports.getDashboardStats = async (req, res) => {
    try {
        const [[salesSummary]] = await pool.query(`
            SELECT 
                COUNT(DISTINCT transaction_id) AS total_orders,
                IFNULL(SUM(total_amount), 0) AS total_revenue
            FROM sales_transactions
        `);
        
        const [[inventoryStatus]] = await pool.query(`
            SELECT 
                COUNT(*) AS total_products,
                IFNULL(SUM(CASE WHEN current_stock <= min_stock_level THEN 1 ELSE 0 END), 0) AS low_stock_items
            FROM products
            WHERE is_discontinued = 0
        `);

        res.status(200).json({
            success: true,
            data: {
                totalOrders: salesSummary.total_orders,
                totalRevenue: salesSummary.total_revenue,
                totalProducts: inventoryStatus.total_products,
                lowStockItems: inventoryStatus.low_stock_items
            }
        });
    } catch (error) {
        console.error('Error getDashboardStats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getTopProducts = async (req, res) => {
    try {
        const [topProducts] = await pool.query(`
            SELECT p.product_id, p.name, p.sku, 
                   IFNULL(SUM(sd.quantity), 0) AS total_sold, 
                   IFNULL(SUM(sd.quantity * sd.unit_price), 0) AS total_revenue
            FROM products p
            LEFT JOIN sale_details sd ON sd.product_id = p.product_id
            WHERE p.is_discontinued = 0
            GROUP BY p.product_id, p.name, p.sku
            HAVING total_sold > 0
            ORDER BY total_revenue DESC
            LIMIT 10
        `);
        res.status(200).json({ success: true, data: topProducts });
    } catch (error) {
        console.error('Error getTopProducts:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getLowStockForecast = async (req, res) => {
    try {
        const [lowStockItems] = await pool.query(`
            SELECT 
                p.product_id, p.name, p.current_stock, p.min_stock_level,
                f.recommended_order, f.predicted_demand
            FROM products p
            LEFT JOIN (
                SELECT p1.product_id, p1.recommended_order, p1.predicted_demand
                FROM predictions p1
                INNER JOIN (
                    SELECT product_id, MAX(forecast_date) as max_date
                    FROM predictions
                    GROUP BY product_id
                ) p2 ON p1.product_id = p2.product_id AND p1.forecast_date = p2.max_date
            ) f ON p.product_id = f.product_id
            WHERE p.current_stock <= p.min_stock_level AND p.is_discontinued = 0
            ORDER BY p.current_stock ASC
        `);
        res.status(200).json({ success: true, data: lowStockItems });
    } catch (error) {
        console.error('Error getLowStockForecast:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
