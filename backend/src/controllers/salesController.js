const { pool } = require('../db');
const fs = require('fs');
const path = require('path');
const {
    getActorId,
    parseNonNegativeNumber,
    parsePositiveNumber,
    safeLogAction
} = require('../utils/controllerUtils');

/**
 * Sinh mã giao dịch duy nhất cho sales_transactions.transaction_code.
 */
const generateTransactionCode = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timePart = now.getTime();
    const randomPart = Math.floor(100000 + Math.random() * 900000);

    return `TXN-${datePart}-${timePart}-${randomPart}`;
};

/**
 * Tìm product_id từ product_id hoặc SKU.
 */
const resolveProductId = async (productIdentifier, connection = pool) => {
    if (!productIdentifier) {
        return null;
    }

    const value = String(productIdentifier).trim();

    if (!Number.isNaN(Number(value))) {
        const [rows] = await connection.query(
            'SELECT product_id FROM products WHERE product_id = ? LIMIT 1',
            [Number(value)]
        );

        if (rows.length === 0) {
            return null;
        }

        return rows[0].product_id;
    }

    const [rows] = await connection.query(
        'SELECT product_id FROM products WHERE sku = ? LIMIT 1',
        [value]
    );

    if (rows.length === 0) {
        return null;
    }

    return rows[0].product_id;
};

/**
 * Kiểm tra bảng sale_details có cột line_total không.
 */
const hasLineTotalColumn = async (connection = pool) => {
    const [columns] = await connection.query(`
        SHOW COLUMNS FROM sale_details LIKE 'line_total'
    `);

    return columns.length > 0;
};

/**
 * Insert chi tiết bán hàng.
 */
const insertSaleDetail = async (
    connection,
    transactionId,
    productId,
    quantity,
    unitPrice,
    lineTotal
) => {
    const hasLineTotal = await hasLineTotalColumn(connection);

    if (hasLineTotal) {
        const [detailResult] = await connection.query(
            `
            INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total)
            VALUES (?, ?, ?, ?, ?)
            `,
            [transactionId, productId, quantity, unitPrice, lineTotal]
        );

        return detailResult;
    }

    const [detailResult] = await connection.query(
        `
        INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
        `,
        [transactionId, productId, quantity, unitPrice]
    );

    return detailResult;
};

// parseCsvRow removed (BE-01)

/**
 * GET /api/sales/list — Lấy danh sách dữ liệu bán hàng có lọc và phân trang (Manager)
 */
exports.getSalesList = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const { from_date, to_date, product_id, keyword } = req.query;

        const conditions = [];
        const params = [];

        if (from_date) {
            conditions.push('st.transaction_date >= ?');
            params.push(from_date);
        }
        if (to_date) {
            conditions.push('st.transaction_date <= ?');
            let adjustedToDate = to_date;
            if (to_date.length === 10) {
                adjustedToDate = `${to_date} 23:59:59`;
            }
            params.push(adjustedToDate);
        }
        if (product_id) {
            conditions.push('sd.product_id = ?');
            params.push(Number(product_id));
        }
        if (keyword) {
            conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR st.transaction_code LIKE ?)');
            const likeParam = `%${keyword}%`;
            params.push(likeParam, likeParam, likeParam);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // 1. Đếm tổng số bản ghi
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM sale_details sd
            JOIN sales_transactions st ON sd.transaction_id = st.transaction_id
            JOIN products p ON sd.product_id = p.product_id
            LEFT JOIN users u ON st.created_by = u.user_id
            ${whereClause}
        `;

        const [countResult] = await pool.query(countQuery, params);
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        // 2. Query dữ liệu chính
        const dataQuery = `
            SELECT
                sd.detail_id AS id, 
                sd.detail_id, 
                st.transaction_id, 
                st.transaction_code,
                st.transaction_date, 
                DATE_FORMAT(st.transaction_date, '%Y-%m-%d %H:%i:%s') AS transaction_date_formatted,
                p.product_id, 
                p.sku, 
                p.name AS product_name, 
                sd.quantity, 
                sd.unit_price,
                COALESCE(sd.line_total, sd.quantity * sd.unit_price) AS line_total,
                st.total_amount AS transaction_total_amount, 
                st.discount_amount,
                COALESCE(u.full_name, 'Hệ thống') AS staff_name
            FROM sale_details sd
            JOIN sales_transactions st ON sd.transaction_id = st.transaction_id
            JOIN products p ON sd.product_id = p.product_id
            LEFT JOIN users u ON st.created_by = u.user_id
            ${whereClause}
            ORDER BY st.transaction_date DESC, sd.detail_id DESC
            LIMIT ? OFFSET ?
        `;

        const selectParams = [...params, limit, offset];
        const [sales] = await pool.query(dataQuery, selectParams);

        res.status(200).json({
            success: true,
            data: sales,
            pagination: {
                total_records: totalRecords,
                total_pages: totalPages,
                current_page: page,
                limit: limit
            }
        });
    } catch (error) {
        console.error('Error fetching sales list:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy dữ liệu doanh số bán hàng' });
    }
};

/**
 * POST /api/sales/create — Tạo một bản ghi bán hàng bằng tay
 */
exports.createSale = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        let { items, product_id, id, sku, quantity, discount_amount, sale_date, transaction_date } = req.body;

        // Hỗ trợ tương thích ngược: nếu không có mảng items nhưng có các trường lẻ của 1 sản phẩm
        if ((!items || !Array.isArray(items)) && (product_id || id || sku || quantity)) {
            items = [{
                product_id: product_id || id || sku,
                quantity: quantity
            }];
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Danh sách sản phẩm bán không được trống.' });
        }

        const saleDate = sale_date || transaction_date || new Date();
        const discountAmount = parseNonNegativeNumber(discount_amount ?? 0, 'discount_amount');

        await connection.beginTransaction();

        let totalAmount = 0;
        const processedItems = [];

        for (const item of items) {
            const productIdentifier = item.product_id || item.id || item.sku;
            const resolvedProductId = await resolveProductId(productIdentifier, connection);

            if (!resolvedProductId) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Không tìm thấy sản phẩm hợp lệ cho định danh "${productIdentifier}"`
                });
            }

            const qty = parsePositiveNumber(item.quantity, `quantity cho sản phẩm ${productIdentifier}`);

            const [productRows] = await connection.query(
                'SELECT product_id, name, sku, selling_price, current_stock, is_discontinued FROM products WHERE product_id = ? LIMIT 1 FOR UPDATE',
                [resolvedProductId]
            );

            if (productRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: `Sản phẩm với ID/Mã "${productIdentifier}" không tồn tại`
                });
            }

            const product = productRows[0];

            if (Number(product.is_discontinued) === 1) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm "${product.name}" đã ngừng kinh doanh, không thể tạo hóa đơn bán`
                });
            }

            if (Number(product.current_stock || 0) < qty) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Tồn kho không đủ cho sản phẩm "${product.name}". Hiện còn ${product.current_stock}, cần bán ${qty}`
                });
            }

            const price = Number(product.selling_price || 0);
            const lineTotal = qty * price;
            totalAmount += lineTotal;

            processedItems.push({
                product_id: resolvedProductId,
                product_name: product.name,
                sku: product.sku,
                quantity: qty,
                unit_price: price,
                line_total: lineTotal
            });
        }

        if (discountAmount > totalAmount) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `discount_amount (${discountAmount}) không được lớn hơn tổng số tiền hóa đơn (${totalAmount})`
            });
        }

        const transactionTotalAmount = totalAmount - discountAmount;
        const createdBy = getActorId(req);

        const [transactionResult] = await connection.query(
            'INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES (?, ?, ?, ?, ?)',
            [generateTransactionCode(), saleDate, transactionTotalAmount, discountAmount, createdBy]
        );

        const transactionId = transactionResult.insertId;

        for (const item of processedItems) {
            await insertSaleDetail(connection, transactionId, item.product_id, item.quantity, item.unit_price, item.line_total);
            await connection.query('UPDATE products SET current_stock = current_stock - ? WHERE product_id = ?', [item.quantity, item.product_id]);
        }

        await connection.commit();

        await safeLogAction(
            createdBy,
            'CREATE_SALE',
            `Tạo hóa đơn bán hàng ID: ${transactionId}, tổng tiền: ${transactionTotalAmount}, giảm giá: ${discountAmount}`,
            'sales_transactions',
            transactionId,
            req.ip
        );

        res.status(201).json({
            success: true,
            message: 'Đã tạo hóa đơn bán lẻ thành công',
            data: {
                transaction_id: transactionId,
                transaction_date: saleDate,
                total_amount: totalAmount,
                discount_amount: discountAmount,
                final_amount: transactionTotalAmount,
                created_by: createdBy,
                items: processedItems
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating sale:', error);
        res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Lỗi server khi tạo doanh số bán hàng' });
    } finally {
        connection.release();
    }
};

// importSalesCSV removed (BE-01)
