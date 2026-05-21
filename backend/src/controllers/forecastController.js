// ============================================================
// FILE: backend/src/controllers/forecastController.js
// Mô tả: Tính toán dự báo nhu cầu từ dữ liệu sales THẬT trong DB
//
// Thuật toán:
//   1. Lấy danh sách tất cả products
//   2. Với mỗi product, lấy lịch sử sales 6 tháng gần nhất từ bảng sales
//   3. Tính predicted_demand = trung bình sales/tháng × 1.1 (tăng 10% so với trend)
//   4. Tính lower_bound = predicted × 0.85, upper_bound = predicted × 1.15
//   5. Nếu product chưa có sales → dùng ngưỡng min_stock × 2 làm predicted
// ============================================================

const { pool } = require('../db');
const { logAction } = require('./activityLogController');

exports.getLatestForecast = async (req, res) => {
    try {
        // Bước 1: Lấy tất cả sản phẩm đang active
        const [products] = await pool.query(
            "SELECT * FROM products WHERE status = 'active' ORDER BY id ASC"
        );

        // Bước 2: Với mỗi sản phẩm, tính dự báo từ sales thật
        const forecastData = await Promise.all(products.map(async (p) => {

            // Lấy dữ liệu sales 6 tháng gần nhất của sản phẩm này
            const [salesRows] = await pool.query(`
                SELECT 
                    DATE_FORMAT(sale_date, '%Y-%m') AS month_key,
                    DATE_FORMAT(sale_date, '%b')    AS month_label,
                    SUM(quantity)                   AS total_qty
                FROM sales
                WHERE product_id = ?
                  AND sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY month_key, month_label
                ORDER BY month_key ASC
            `, [p.id]);

            // Bước 3: Tính predicted_demand
            let predictedDemand;
            let historicalData = [];

            if (salesRows.length > 0) {
                // Có dữ liệu sales thật → tính trung bình rồi tăng 10%
                const totalQty   = salesRows.reduce((sum, r) => sum + Number(r.total_qty), 0);
                const avgMonthly = totalQty / salesRows.length;
                predictedDemand  = Math.round(avgMonthly * 1.1);

                // Build historical data cho chart (actual = số thật, predicted = trung bình)
                historicalData = salesRows.map(r => ({
                    month:     r.month_label,
                    actual:    Number(r.total_qty),
                    predicted: Math.round(avgMonthly)
                }));

                // Thêm tháng dự báo tiếp theo vào cuối chart
                historicalData.push({
                    month:     'Next (Pred)',
                    actual:    null,            // chưa có số thật
                    predicted: predictedDemand
                });

            } else {
                // Chưa có sales → dùng min_stock × 2 làm dự báo an toàn
                predictedDemand = (p.min_stock || 20) * 2;

                // Historical data trống → chart sẽ không hiện
                historicalData = [];
            }

            // Bước 4: Tính lower/upper bound (±15% so với predicted)
            const lowerBound = Math.round(predictedDemand * 0.85);
            const upperBound = Math.round(predictedDemand * 1.15);

            // Bước 5: Tính recommended_order
            const currentStock   = p.current_stock || 0;
            const recommendedOrder = Math.max(0, predictedDemand - currentStock);

            // Bước 6: Xác định stock_status dựa trên min_stock thật của sản phẩm
            let stockStatus;
            if (currentStock === 0)                          stockStatus = 'out';
            else if (currentStock < (p.min_stock || 20))     stockStatus = 'low';
            else if (currentStock > predictedDemand * 1.5)   stockStatus = 'high';
            else                                              stockStatus = 'normal';

            // Bước 7: Xác định demand_level
            let demandLevel;
            if (predictedDemand > 300)      demandLevel = 'high';
            else if (predictedDemand > 100) demandLevel = 'normal';
            else                            demandLevel = 'low';

            // Trả về object khớp với cấu trúc dashboard.js đang map
            return {
                id:              p.id,
                name:            p.name,
                category:        p.category || 'General',
                // snake_case để dashboard.js map được qua: item.current_stock ?? item.currentStock
                current_stock:   currentStock,
                predicted_demand: predictedDemand,  // dashboard map: item.predicted_quantity ?? item.predictedDemand
                predictedDemand: predictedDemand,   // dự phòng camelCase
                lower_bound:     lowerBound,
                upper_bound:     upperBound,
                recommended_order: recommendedOrder,
                stock_status:    stockStatus,
                demand_level:    demandLevel,
                historical_data: historicalData,
                historicalData:  historicalData      // dự phòng camelCase
            };
        }));

        res.status(200).json({ success: true, data: forecastData });
    } catch (error) {
        console.error('Lỗi tính toán dự báo:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tính toán dự báo' });
    }
};

// GET /api/forecast/product/:productId
// Lấy lịch sử sales theo từng tháng của 1 sản phẩm (dùng cho chart chi tiết)
exports.getForecastByProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        const [rows] = await pool.query(`
            SELECT 
                DATE_FORMAT(sale_date, '%Y-%m') AS month_key,
                DATE_FORMAT(sale_date, '%b %Y') AS month_label,
                SUM(quantity)                   AS total_qty,
                SUM(total_amount)               AS total_revenue
            FROM sales
            WHERE product_id = ?
            GROUP BY month_key, month_label
            ORDER BY month_key ASC
        `, [productId]);
        // Ghi log hành động
        await logAction(req.user.id,
            'VIEW_FORECAST_DETAIL',
            `Xem chi tiết dự báo cho sản phẩm ID: ${productId}`,
            'products',
            productId,
            req.ip
        );
        res.status(200).json({ success: true, data: rows });

    } catch (error) {
        console.error('Lỗi lấy forecast theo sản phẩm:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};