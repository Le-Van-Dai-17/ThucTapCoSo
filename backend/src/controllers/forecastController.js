const { pool } = require('../db');
const { getActorId, safeLogAction } = require('../utils/controllerUtils');

const getNextMonthDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const year = nextMonth.getFullYear();
    const month = String(nextMonth.getMonth() + 1).padStart(2, '0');

    return `${year}-${month}-01`;
};

const getOrCreateDefaultModel = async (connection) => {
    const [models] = await connection.query(
        `
        SELECT model_id
        FROM ml_models
        WHERE is_deployed = 1
        ORDER BY training_date DESC, model_id DESC
        LIMIT 1
        `
    );

    if (models.length > 0) {
        return models[0].model_id;
    }

    const [result] = await connection.query(
        `
        INSERT INTO ml_models
            (
                version_tag,
                model_path,
                algorithm_type,
                hyperparameters,
                is_deployed
            )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            `rule-based-${Date.now()}`,
            null,
            'Moving Average Rule-Based',
            JSON.stringify({
                window_months: 6,
                growth_factor: 1.1,
                lower_bound_rate: 0.85,
                upper_bound_rate: 1.15
            }),
            1
        ]
    );

    return result.insertId;
};

const calculateProductForecast = async (connection, product) => {
    const [salesRows] = await connection.query(
        `
        SELECT
            DATE_FORMAT(st.transaction_date, '%Y-%m') AS month_key,
            DATE_FORMAT(st.transaction_date, '%b %Y') AS month_label,
            SUM(sd.quantity) AS total_qty,
            SUM(
                CASE
                    WHEN sd.line_total IS NOT NULL THEN sd.line_total
                    ELSE sd.quantity * sd.unit_price
                END
            ) AS total_revenue
        FROM sale_details sd
        JOIN sales_transactions st
            ON sd.transaction_id = st.transaction_id
        WHERE sd.product_id = ?
          AND st.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY month_key, month_label
        ORDER BY month_key ASC
        `,
        [product.product_id]
    );

    let predictedDemand;
    let historicalData = [];

    if (salesRows.length > 0) {
        const totalQty = salesRows.reduce((sum, row) => {
            return sum + Number(row.total_qty || 0);
        }, 0);

        const avgMonthly = totalQty / salesRows.length;

        /*
            Dự báo đơn giản:
            Nhu cầu tháng tới = trung bình bán hàng các tháng gần nhất * 1.1

            Đây chưa phải ML xịn, nhưng phù hợp để có logic dự báo thật cho đồ án.
        */
        predictedDemand = Math.round(avgMonthly * 1.1);

        historicalData = salesRows.map(row => ({
            month: row.month_label,
            actual: Number(row.total_qty || 0),
            revenue: Number(row.total_revenue || 0),
            predicted: Math.round(avgMonthly)
        }));

        historicalData.push({
            month: 'Next Month',
            actual: null,
            revenue: null,
            predicted: predictedDemand
        });
    } else {
        /*
            Nếu sản phẩm chưa có lịch sử bán hàng:
            dùng min_stock_level làm cơ sở ước lượng ban đầu.
        */
        predictedDemand = Number(product.min_stock_level || 10) * 2;
        historicalData = [];
    }

    const lowerBound = Math.max(0, Math.round(predictedDemand * 0.85));
    const upperBound = Math.max(0, Math.round(predictedDemand * 1.15));

    const currentStock = Number(product.current_stock || 0);
    const minStockLevel = Number(product.min_stock_level || 0);

    /*
        Công thức gợi ý nhập hàng:
        recommended_order = max(0, predictedDemand + minStockLevel - currentStock)

        Lý do cộng minStockLevel:
        Không chỉ nhập đủ bán tháng tới, mà còn giữ lại ngưỡng tồn kho an toàn.
    */
    const recommendedOrder = Math.max(
        0,
        predictedDemand + minStockLevel - currentStock
    );

    let stockStatus;
    if (currentStock === 0) {
        stockStatus = 'out';
    } else if (currentStock < minStockLevel) {
        stockStatus = 'low';
    } else if (currentStock > predictedDemand * 1.5) {
        stockStatus = 'high';
    } else {
        stockStatus = 'normal';
    }

    let demandLevel;
    if (predictedDemand >= 300) {
        demandLevel = 'high';
    } else if (predictedDemand >= 100) {
        demandLevel = 'normal';
    } else {
        demandLevel = 'low';
    }

    return {
        id: product.product_id,
        product_id: product.product_id,

        name: product.name,
        product_name: product.name,

        sku: product.sku,
        category: product.category,

        current_stock: currentStock,
        currentStock,

        min_stock_level: minStockLevel,
        max_stock_level: product.max_stock_level,

        predicted_demand: predictedDemand,
        predictedDemand,
        predicted_quantity: predictedDemand,

        lower_bound: lowerBound,
        lowerBound,

        upper_bound: upperBound,
        upperBound,

        recommended_order: recommendedOrder,
        recommendedOrder,

        stock_status: stockStatus,
        stockStatus,

        demand_level: demandLevel,
        demandLevel,

        historical_data: historicalData,
        historicalData
    };
};

/**
 * GET /api/forecast/latest
 *
 * Tính dự báo trực tiếp từ dữ liệu bán hàng.
 * Hàm này chỉ trả kết quả, chưa lưu vào demand_forecasts.
 */
exports.getLatestForecast = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const [products] = await connection.query(
            `
            SELECT
                p.product_id,
                p.sku,
                p.name,
                p.current_stock,
                p.min_stock_level,
                p.max_stock_level,
                p.cost_price,
                p.selling_price,
                p.is_discontinued,
                COALESCE(c.name, 'General') AS category
            FROM products p
            LEFT JOIN categories c
                ON p.category_id = c.category_id
            WHERE p.is_discontinued = 0
            ORDER BY p.product_id ASC
            `
        );

        const forecastData = [];

        for (const product of products) {
            const forecast = await calculateProductForecast(connection, product);
            forecastData.push(forecast);
        }

        res.status(200).json({
            success: true,
            data: forecastData
        });
    } catch (error) {
        console.error('Lỗi tính toán dự báo:', error);

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tính toán dự báo'
        });
    } finally {
        connection.release();
    }
};

/**
 * POST /api/forecast/run
 *
 * Chạy dự báo và lưu kết quả vào bảng demand_forecasts.
 * Đây là chức năng quan trọng để hệ thống có dữ liệu forecast thật trong database.
 */
exports.runForecast = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const modelId = await getOrCreateDefaultModel(connection);
        const targetPeriod = req.body?.target_period || getNextMonthDate();

        const [products] = await connection.query(
            `
            SELECT
                p.product_id,
                p.sku,
                p.name,
                p.current_stock,
                p.min_stock_level,
                p.max_stock_level,
                p.cost_price,
                p.selling_price,
                p.is_discontinued,
                COALESCE(c.name, 'General') AS category
            FROM products p
            LEFT JOIN categories c
                ON p.category_id = c.category_id
            WHERE p.is_discontinued = 0
            ORDER BY p.product_id ASC
            `
        );

        const savedForecasts = [];

        for (const product of products) {
            const forecast = await calculateProductForecast(connection, product);

            /*
                Tránh lưu trùng nhiều forecast cho cùng sản phẩm + cùng tháng.
                Nếu đã có thì cập nhật lại kết quả mới nhất.
            */
            const [existingRows] = await connection.query(
                `
                SELECT forecast_id
                FROM demand_forecasts
                WHERE product_id = ?
                  AND target_period = ?
                LIMIT 1
                `,
                [product.product_id, targetPeriod]
            );

            let forecastId;

            if (existingRows.length > 0) {
                forecastId = existingRows[0].forecast_id;

                await connection.query(
                    `
                    UPDATE demand_forecasts
                    SET
                        model_id = ?,
                        forecast_date = CURRENT_TIMESTAMP,
                        predicted_quantity = ?,
                        lower_bound = ?,
                        upper_bound = ?
                    WHERE forecast_id = ?
                    `,
                    [
                        modelId,
                        forecast.predicted_quantity,
                        forecast.lower_bound,
                        forecast.upper_bound,
                        forecastId
                    ]
                );
            } else {
                const [insertResult] = await connection.query(
                    `
                    INSERT INTO demand_forecasts
                        (
                            product_id,
                            model_id,
                            target_period,
                            predicted_quantity,
                            lower_bound,
                            upper_bound
                        )
                    VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        product.product_id,
                        modelId,
                        targetPeriod,
                        forecast.predicted_quantity,
                        forecast.lower_bound,
                        forecast.upper_bound
                    ]
                );

                forecastId = insertResult.insertId;
            }

            savedForecasts.push({
                forecast_id: forecastId,
                model_id: modelId,
                target_period: targetPeriod,
                ...forecast
            });
        }

        await connection.commit();

        await safeLogAction(
            getActorId(req),
            'RUN_FORECAST',
            `Chạy dự báo nhu cầu nhập hàng cho kỳ ${targetPeriod}`,
            'demand_forecasts',
            null,
            req.ip
        );

        res.status(200).json({
            success: true,
            message: 'Chạy dự báo và lưu kết quả thành công',
            data: savedForecasts
        });
    } catch (error) {
        await connection.rollback();

        console.error('Lỗi chạy dự báo:', error);

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi chạy dự báo'
        });
    } finally {
        connection.release();
    }
};

/**
 * GET /api/forecast/saved
 *
 * Lấy danh sách forecast đã lưu trong demand_forecasts.
 */
exports.getSavedForecasts = async (req, res) => {
    try {
        const { target_period } = req.query;

        const values = [];
        let whereSql = '';

        if (target_period) {
            whereSql = 'WHERE df.target_period = ?';
            values.push(target_period);
        }

        const [rows] = await pool.query(
            `
            SELECT
                df.forecast_id AS id,
                df.forecast_id,
                df.product_id,
                p.sku,
                p.name AS product_name,
                COALESCE(c.name, 'General') AS category,
                df.model_id,
                m.version_tag,
                m.algorithm_type,
                df.forecast_date,
                df.target_period,
                df.predicted_quantity,
                df.predicted_quantity AS predicted_demand,
                df.lower_bound,
                df.upper_bound,
                p.current_stock,
                p.min_stock_level,
                GREATEST(
                    df.predicted_quantity + p.min_stock_level - p.current_stock,
                    0
                ) AS recommended_order
            FROM demand_forecasts df
            JOIN products p
                ON df.product_id = p.product_id
            LEFT JOIN categories c
                ON p.category_id = c.category_id
            LEFT JOIN ml_models m
                ON df.model_id = m.model_id
            ${whereSql}
            ORDER BY df.target_period DESC, df.forecast_date DESC, df.forecast_id DESC
            `,
            values
        );

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Lỗi lấy forecast đã lưu:', error);

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy dữ liệu forecast đã lưu'
        });
    }
};

/**
 * GET /api/forecast/product/:productId
 *
 * Lấy lịch sử bán hàng theo tháng của một sản phẩm.
 */
exports.getForecastByProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        const [productRows] = await pool.query(
            `
            SELECT
                product_id,
                sku,
                name
            FROM products
            WHERE product_id = ?
            LIMIT 1
            `,
            [productId]
        );

        if (productRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        const [historyRows] = await pool.query(
            `
            SELECT
                DATE_FORMAT(st.transaction_date, '%Y-%m') AS month_key,
                DATE_FORMAT(st.transaction_date, '%b %Y') AS month_label,
                SUM(sd.quantity) AS total_qty,
                SUM(
                    CASE
                        WHEN sd.line_total IS NOT NULL THEN sd.line_total
                        ELSE sd.quantity * sd.unit_price
                    END
                ) AS total_revenue
            FROM sale_details sd
            JOIN sales_transactions st
                ON sd.transaction_id = st.transaction_id
            WHERE sd.product_id = ?
            GROUP BY month_key, month_label
            ORDER BY month_key ASC
            `,
            [productId]
        );

        const [forecastRows] = await pool.query(
            `
            SELECT
                df.forecast_id,
                df.model_id,
                m.version_tag,
                m.algorithm_type,
                df.forecast_date,
                df.target_period,
                df.predicted_quantity,
                df.lower_bound,
                df.upper_bound
            FROM demand_forecasts df
            LEFT JOIN ml_models m
                ON df.model_id = m.model_id
            WHERE df.product_id = ?
            ORDER BY df.target_period DESC, df.forecast_date DESC
            `,
            [productId]
        );

        await safeLogAction(
            getActorId(req),
            'VIEW_FORECAST_DETAIL',
            `Xem chi tiết dự báo cho sản phẩm ID: ${productId}`,
            'products',
            productId,
            req.ip
        );

        res.status(200).json({
            success: true,
            data: {
                product: productRows[0],
                history: historyRows,
                forecasts: forecastRows
            }
        });
    } catch (error) {
        console.error('Lỗi lấy forecast theo sản phẩm:', error);

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy chi tiết dự báo'
        });
    }
};
