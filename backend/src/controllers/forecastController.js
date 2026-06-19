const { pool } = require('../db');
const { getActorId, safeLogAction } = require('../utils/controllerUtils');
const { predictDemandBatch } = require('../services/mlForecastService');

const AI_SKU_PREFIXES = ['FOODS_', 'HOBBIES_', 'HOUSEHOLD_'];

const getNextMonthDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const year = nextMonth.getFullYear();
    const month = String(nextMonth.getMonth() + 1).padStart(2, '0');

    return `${year}-${month}-01`;
};

const normalizeTargetPeriod = (targetPeriod) => {
    if (!targetPeriod) {
        return getNextMonthDate();
    }

    // Cho phép frontend gửi "2026-06"
    if (/^\d{4}-\d{2}$/.test(targetPeriod)) {
        return `${targetPeriod}-01`;
    }

    // Cho phép frontend gửi "2026-06-01"
    if (/^\d{4}-\d{2}-\d{2}$/.test(targetPeriod)) {
        return targetPeriod;
    }

    return getNextMonthDate();
};

const getMonthKeyFromDateString = (dateString) => {
    return dateString.slice(0, 7);
};

const getTargetMonthNumber = (targetPeriod) => {
    return Number(targetPeriod.slice(5, 7));
};

const getPreviousMonthKeys = (targetPeriod) => {
    const monthKey = getMonthKeyFromDateString(targetPeriod);
    const [yearStr, monthStr] = monthKey.split('-');

    let year = Number(yearStr);
    let month = Number(monthStr);

    const keys = [];

    for (let i = 1; i <= 3; i++) {
        let previousMonth = month - i;
        let previousYear = year;

        while (previousMonth <= 0) {
            previousMonth += 12;
            previousYear -= 1;
        }

        keys.push(`${previousYear}-${String(previousMonth).padStart(2, '0')}`);
    }

    return keys;
};

const buildAiProductWhereSql = () => {
    return `
        AND (
            p.sku LIKE 'FOODS\\_%'
            OR p.sku LIKE 'HOBBIES\\_%'
            OR p.sku LIKE 'HOUSEHOLD\\_%'
        )
    `;
};

const getOrCreateDefaultModel = async (connection, actorId = null) => {
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
                is_deployed,
                created_by
            )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            `rf-m5-pipeline-${Date.now()}`,
            'backend/ml/models/forecast_pipeline.pkl',
            'RandomForestRegressor',
            JSON.stringify({
                features: [
                    'product_code',
                    'lag_1',
                    'lag_2',
                    'lag_3',
                    'target_month'
                ],
                source: 'M5 Forecasting CA_1',
                integration: 'Node.js calls Python sklearn Pipeline'
            }),
            1,
            actorId
        ]
    );

    return result.insertId;
};

const getForecastProducts = async (connection) => {
    const [products] = await connection.query(
        `
        SELECT
            p.product_id,
            p.sku,
            p.name,
            p.current_stock,
            p.warning_stock_level,
            p.max_stock_level,
            p.cost_price,
            p.selling_price,
            p.is_discontinued,
            COALESCE(c.name, 'General') AS category,
            IFNULL(s.lead_time_days, 7) AS lead_time_days
        FROM products p
        LEFT JOIN categories c
            ON p.category_id = c.category_id
        LEFT JOIN suppliers s
            ON p.supplier_id = s.supplier_id
        WHERE p.is_discontinued = 0
        ${buildAiProductWhereSql()}
        ORDER BY p.sku ASC
        `
    );

    return products;
};

const getLagFeaturesForProducts = async (connection, products, targetPeriod) => {
    const productIds = products.map(product => product.product_id);

    if (productIds.length === 0) {
        return {};
    }

    const [lag1Month, lag2Month, lag3Month] = getPreviousMonthKeys(targetPeriod);

    const startDate = `${lag3Month}-01`;
    const endDate = targetPeriod;

    const [rows] = await connection.query(
        `
        SELECT
            sd.product_id,
            DATE_FORMAT(st.transaction_date, '%Y-%m') AS month_key,
            SUM(sd.quantity) AS total_quantity
        FROM sale_details sd
        JOIN sales_transactions st
            ON sd.transaction_id = st.transaction_id
        WHERE sd.product_id IN (?)
          AND st.transaction_date >= ?
          AND st.transaction_date < ?
        GROUP BY sd.product_id, month_key
        `,
        [productIds, startDate, endDate]
    );

    const lagMap = {};

    products.forEach(product => {
        lagMap[product.product_id] = {
            lag_1: 0,
            lag_2: 0,
            lag_3: 0
        };
    });

    rows.forEach(row => {
        const productId = row.product_id;
        const monthKey = row.month_key;
        const totalQuantity = Number(row.total_quantity || 0);

        if (!lagMap[productId]) {
            lagMap[productId] = {
                lag_1: 0,
                lag_2: 0,
                lag_3: 0
            };
        }

        if (monthKey === lag1Month) {
            lagMap[productId].lag_1 = totalQuantity;
        }

        if (monthKey === lag2Month) {
            lagMap[productId].lag_2 = totalQuantity;
        }

        if (monthKey === lag3Month) {
            lagMap[productId].lag_3 = totalQuantity;
        }
    });

    return lagMap;
};

const buildAiInputs = (products, lagMap, targetPeriod) => {
    const targetMonth = getTargetMonthNumber(targetPeriod);

    return products.map(product => {
        const lags = lagMap[product.product_id] || {
            lag_1: 0,
            lag_2: 0,
            lag_3: 0
        };

        return {
            product_code: product.sku,
            lag_1: Number(lags.lag_1 || 0),
            lag_2: Number(lags.lag_2 || 0),
            lag_3: Number(lags.lag_3 || 0),
            target_month: targetMonth
        };
    });
};

const buildFallbackPredictionMap = (products, lagMap) => {
    const predictionMap = {};

    products.forEach(product => {
        const lags = lagMap[product.product_id] || {
            lag_1: 0,
            lag_2: 0,
            lag_3: 0
        };

        const lagValues = [
            Number(lags.lag_1 || 0),
            Number(lags.lag_2 || 0),
            Number(lags.lag_3 || 0)
        ];

        const positiveValues = lagValues.filter(value => value > 0);

        if (positiveValues.length > 0) {
            const average = positiveValues.reduce((sum, value) => sum + value, 0) / positiveValues.length;
            predictionMap[product.sku] = Math.max(0, Math.round(average));
        } else {
            predictionMap[product.sku] = Number(product.warning_stock_level || 10) * 2;
        }
    });

    return predictionMap;
};

const predictProductsWithAI = async (products, lagMap, targetPeriod) => {
    const aiInputs = buildAiInputs(products, lagMap, targetPeriod);

    try {
        const predictions = await predictDemandBatch(aiInputs);

        const predictionMap = {};

        predictions.forEach(prediction => {
            predictionMap[prediction.product_code] = Math.max(
                0,
                Number(prediction.predicted_quantity || 0)
            );
        });

        // Nếu thiếu prediction cho sản phẩm nào thì fallback riêng sản phẩm đó
        const fallbackMap = buildFallbackPredictionMap(products, lagMap);

        products.forEach(product => {
            if (predictionMap[product.sku] === undefined || Number.isNaN(predictionMap[product.sku])) {
                predictionMap[product.sku] = fallbackMap[product.sku];
            }
        });

        return predictionMap;
    } catch (error) {
        console.error('Lỗi gọi AI model, fallback sang trung bình 3 tháng:', error.message);
        return buildFallbackPredictionMap(products, lagMap);
    }
};

const getHistoricalData = async (connection, productId, targetPeriod) => {
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
          AND st.transaction_date < ?
        GROUP BY month_key, month_label
        ORDER BY month_key DESC
        LIMIT 6
        `,
        [productId, targetPeriod]
    );

    return salesRows
        .sort((a, b) => String(a.month_key).localeCompare(String(b.month_key)))
        .map(row => ({
            month: row.month_label,
            actual: Number(row.total_qty || 0),
            revenue: Number(row.total_revenue || 0),
            predicted: null
        }));
};

const calculateProductForecast = async (
    connection,
    product,
    targetPeriod,
    predictedDemand
) => {
    const historicalData = await getHistoricalData(
        connection,
        product.product_id,
        targetPeriod
    );

    historicalData.push({
        month: 'Next Month',
        actual: null,
        revenue: null,
        predicted: predictedDemand
    });

    const lowerBound = Math.max(0, Math.round(predictedDemand * 0.85));
    const upperBound = Math.max(0, Math.round(predictedDemand * 1.15));

    const currentStock = Number(product.current_stock || 0);
    const warningStockLevel = Number(product.warning_stock_level || 0);
    const leadTimeDays = Number(product.lead_time_days || 7);

    // Công thức nâng cao: Lead Time Demand = (Số lượng dự báo trong 30 ngày / 30) * Số ngày giao hàng
    const leadTimeDemand = (predictedDemand / 30) * leadTimeDays;

    // Đề xuất nhập = Số lượng dự báo + Số lượng giao hàng dự kiến + Tồn kho an toàn (warning_stock) - Tồn kho hiện tại
    const recommendedOrder = Math.max(
        0,
        Math.round(predictedDemand + leadTimeDemand + warningStockLevel - currentStock)
    );

    let stockStatus;
    if (currentStock === 0) {
        stockStatus = 'out';
    } else if (currentStock < warningStockLevel) {
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

        warning_stock_level: warningStockLevel,
        min_stock_level: warningStockLevel,
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
 * Tính dự báo trực tiếp từ dữ liệu bán hàng trong database.
 * Hàm này chỉ trả kết quả, chưa lưu vào demand_forecasts.
 */
exports.getLatestForecast = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const targetPeriod = normalizeTargetPeriod(req.query?.target_period);
        const products = await getForecastProducts(connection);

        if (products.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'Không có sản phẩm phù hợp để dự báo'
            });
        }

        const lagMap = await getLagFeaturesForProducts(
            connection,
            products,
            targetPeriod
        );

        const predictionMap = await predictProductsWithAI(
            products,
            lagMap,
            targetPeriod
        );

        const forecastData = [];

        for (const product of products) {
            const predictedDemand = Number(predictionMap[product.sku] || 0);

            const forecast = await calculateProductForecast(
                connection,
                product,
                targetPeriod,
                predictedDemand
            );

            forecastData.push({
                target_period: targetPeriod,
                ...forecast
            });
        }

        res.status(200).json({
            success: true,
            target_period: targetPeriod,
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
 * Chạy dự báo bằng model AI và lưu kết quả vào bảng demand_forecasts.
 */
exports.runForecast = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const actorId = getActorId(req);
        const modelId = await getOrCreateDefaultModel(connection, actorId);
        const targetPeriod = normalizeTargetPeriod(req.body?.target_period);

        const products = await getForecastProducts(connection);

        if (products.length === 0) {
            await connection.commit();

            return res.status(200).json({
                success: true,
                message: 'Không có sản phẩm phù hợp để chạy dự báo',
                data: []
            });
        }

        const lagMap = await getLagFeaturesForProducts(
            connection,
            products,
            targetPeriod
        );

        const predictionMap = await predictProductsWithAI(
            products,
            lagMap,
            targetPeriod
        );

        const savedForecasts = [];

        for (const product of products) {
            const predictedDemand = Number(predictionMap[product.sku] || 0);

            const forecast = await calculateProductForecast(
                connection,
                product,
                targetPeriod,
                predictedDemand
            );

            // Luôn INSERT để lưu lịch sử mỗi lần chạy
            const [insertResult] = await connection.query(
                `
                INSERT INTO demand_forecasts
                    (
                        product_id,
                        model_id,
                        target_period,
                        predicted_quantity,
                        lower_bound,
                        upper_bound,
                        recommended_order,
                        created_by
                    )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    product.product_id,
                    modelId,
                    targetPeriod,
                    forecast.predicted_quantity,
                    forecast.lower_bound,
                    forecast.upper_bound,
                    forecast.recommended_order,
                    actorId
                ]
            );

            const forecastId = insertResult.insertId;

            savedForecasts.push({
                forecast_id: forecastId,
                model_id: modelId,
                target_period: targetPeriod,
                ...forecast
            });
        }

        await connection.commit();

        await safeLogAction(
            actorId,
            'RUN_FORECAST',
            `Chạy dự báo AI nhu cầu nhập hàng cho kỳ ${targetPeriod}`,
            'demand_forecasts',
            null,
            req.ip
        );

        res.status(200).json({
            success: true,
            message: 'Chạy dự báo AI và lưu kết quả thành công',
            target_period: targetPeriod,
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
            values.push(normalizeTargetPeriod(target_period));
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
                df.recommended_order,
                p.current_stock,
                p.warning_stock_level,
                p.warning_stock_level AS min_stock_level
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
                df.upper_bound,
                df.recommended_order
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