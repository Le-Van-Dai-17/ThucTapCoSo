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

const parseCsvRow = (line) => {
    const values = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"' && insideQuotes && nextChar === '"') {
            current += '"';
            i++;
            continue;
        }

        if (char === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (char === ',' && !insideQuotes) {
            values.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
};

/**
 * GET /api/sales/list — Lấy danh sách dữ liệu bán hàng (Phục vụ dòng 65 trong api.js)
 */
exports.getSalesList = async (req, res) => {
    try {
        const query = `
            SELECT
                sd.detail_id AS id, sd.detail_id, st.transaction_id, st.transaction_code,
                st.transaction_date AS sale_date, DATE_FORMAT(st.transaction_date, '%Y-%m-%d') AS sale_date_formatted,
                p.product_id, p.sku, p.name AS product_name, sd.quantity, sd.unit_price,
                CASE WHEN sd.line_total IS NOT NULL THEN sd.line_total ELSE sd.quantity * sd.unit_price END AS total_amount,
                st.total_amount AS transaction_total_amount, st.discount_amount
            FROM sale_details sd
            JOIN sales_transactions st ON sd.transaction_id = st.transaction_id
            JOIN products p ON sd.product_id = p.product_id
            ORDER BY st.transaction_date DESC, sd.detail_id DESC
        `;

        const [sales] = await pool.query(query);

        res.status(200).json({
            success: true,
            data: sales
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
        let { product_id, id, sku, quantity, unit_price, selling_price, total_amount, sale_date, transaction_date, discount_amount } = req.body;

        const productIdentifier = product_id || id || sku;
        const resolvedProductId = await resolveProductId(productIdentifier, connection);

        if (!resolvedProductId) {
            return res.status(400).json({ success: false, message: 'Không tìm thấy sản phẩm hợp lệ' });
        }

        const qty = parsePositiveNumber(quantity, 'quantity');
        const price = parseNonNegativeNumber(unit_price ?? selling_price, 'unit_price');
        const discountAmount = parseNonNegativeNumber(discount_amount, 'discount_amount');
        const lineTotal = total_amount !== undefined && total_amount !== null && total_amount !== ''
            ? parseNonNegativeNumber(total_amount, 'total_amount')
            : qty * price;

        const transactionTotalAmount = Math.max(lineTotal - discountAmount, 0);
        const saleDate = sale_date || transaction_date || new Date();

        if (discountAmount > lineTotal) {
            return res.status(400).json({ success: false, message: 'discount_amount cannot be greater than total_amount' });
        }

        await connection.beginTransaction();

        const [productRows] = await connection.query(
            'SELECT product_id, name, current_stock, is_discontinued FROM products WHERE product_id = ? LIMIT 1 FOR UPDATE',
            [resolvedProductId]
        );

        if (productRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        const product = productRows[0];

        if (Number(product.is_discontinued) === 1) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Sản phẩm đã ngừng kinh doanh, không thể tạo doanh số' });
        }

        if (Number(product.current_stock || 0) < qty) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `Tồn kho không đủ. Hiện còn ${product.current_stock}, cần bán ${qty}` });
        }

        const [transactionResult] = await connection.query(
            'INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount) VALUES (?, ?, ?, ?)',
            [generateTransactionCode(), saleDate, transactionTotalAmount, discountAmount]
        );

        const transactionId = transactionResult.insertId;
        const detailResult = await insertSaleDetail(connection, transactionId, resolvedProductId, qty, price, lineTotal);

        await connection.query('UPDATE products SET current_stock = current_stock - ? WHERE product_id = ?', [qty, resolvedProductId]);

        await connection.commit();

        await safeLogAction(getActorId(req), 'CREATE_SALE', `Tạo dữ liệu bán hàng cho sản phẩm ID: ${resolvedProductId}, số lượng: ${qty}`, 'sales_transactions', transactionId, req.ip);

        res.status(201).json({
            success: true,
            message: 'Doanh số bán hàng đã được tạo thành công',
            data: { transaction_id: transactionId, detail_id: detailResult.insertId, product_id: resolvedProductId, quantity: qty, unit_price: price, line_total: lineTotal, total_amount: transactionTotalAmount }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating sale:', error);
        res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Lỗi server khi tạo doanh số bán hàng' });
    } finally {
        connection.release();
    }
};

/**
 * POST /api/sales/import — [BE-07] Import CSV dữ liệu bán hàng linh hoạt tiêu đề cột
 */
exports.importSalesCSV = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn file CSV để tải lên.' });
    }

    const filePath = req.file.path;
    const connection = await pool.getConnection();

    try {
        const originalName = req.file.originalname || '';
        const extension = path.extname(originalName).toLowerCase();
        const allowedMimeTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'];

        if (extension !== '.csv' && !allowedMimeTypes.includes(req.file.mimetype)) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({ success: false, message: 'File import phải có định dạng CSV' });
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

        if (lines.length <= 1) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({ success: false, message: 'File CSV không có dữ liệu để nạp' });
        }

        const headers = parseCsvRow(lines[0]).map(header => header.toLowerCase());
        
        const hasDateColumn = headers.includes('sale_date') || headers.includes('transaction_date');
        const hasProductColumn = headers.includes('product_id') || headers.includes('sku') || headers.includes('product_code');
        const hasQtyColumn = headers.includes('quantity');

        if (!hasDateColumn || !hasProductColumn || !hasQtyColumn) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                message: 'Cấu trúc file CSV không hợp lệ. Phải chứa các cột tối thiểu: Ngày bán, Mã SP/SKU và Số lượng.'
            });
        }

        const getFlexValue = (values, targets) => {
            for (const target of targets) {
                const idx = headers.indexOf(target);
                if (idx >= 0) return values[idx];
            }
            return undefined;
        };

        await connection.beginTransaction();
        const totalRows = lines.length - 1;
        let insertedCount = 0;
        let skippedCount = 0;
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCsvRow(lines[i]);
            if (values.length < headers.length) {
                skippedCount++;
                errors.push(`Dòng ${i + 1}: Thiếu dữ liệu cấu trúc cột.`);
                continue;
            }

            const saleDate = getFlexValue(values, ['sale_date', 'transaction_date']);
            const productIdentifier = getFlexValue(values, ['product_id', 'sku', 'product_code']);
            const quantityRaw = getFlexValue(values, ['quantity']);
            const unitPriceRaw = getFlexValue(values, ['unit_price']);
            const discountRaw = getFlexValue(values, ['discount_amount']) || '0';

            const qty = Number(quantityRaw);
            const discountAmount = Number(discountRaw);

            if (!saleDate || !productIdentifier || Number.isNaN(qty) || qty <= 0 || Number.isNaN(discountAmount) || discountAmount < 0) {
                skippedCount++;
                errors.push(`Dòng ${i + 1}: Định dạng dữ liệu ngày tháng, số lượng hoặc giảm giá bị sai.`);
                continue;
            }

            const productId = await resolveProductId(productIdentifier, connection);
            if (!productId) {
                skippedCount++;
                errors.push(`Dòng ${i + 1}: Lỗi! Sản phẩm mang mã số/SKU "${productIdentifier}" không tồn tại trên hệ thống.`);
                continue;
            }

            const [productRows] = await connection.query(
                'SELECT product_id, current_stock, selling_price, is_discontinued FROM products WHERE product_id = ? LIMIT 1 FOR UPDATE',
                [productId]
            );

            if (productRows.length === 0 || Number(productRows[0].is_discontinued) === 1) {
                skippedCount++;
                errors.push(`Dòng ${i + 1}: Sản phẩm đã bị xóa hoặc ngừng kinh doanh.`);
                continue;
            }

            const price = unitPriceRaw === undefined || unitPriceRaw === null || unitPriceRaw === ''
                ? Number(productRows[0].selling_price || 0)
                : Number(unitPriceRaw);
            if (Number.isNaN(price) || price < 0) {
                skippedCount++;
                errors.push(`Dòng ${i + 1}: Đơn giá bị sai.`);
                continue;
            }

            const currentStock = Number(productRows[0].current_stock || 0);
            if (currentStock < qty) {
                skippedCount++;
                errors.push(`Dòng ${i + 1}: Số lượng tồn kho không đủ để bán (Hiện còn: ${currentStock}).`);
                continue;
            }

            const lineTotal = qty * price;
            if (discountAmount > lineTotal) {
                skippedCount++;
                errors.push(`Dòng ${i + 1}: Giảm giá không được lớn hơn thành tiền.`);
                continue;
            }
            const transactionTotalAmount = Math.max(lineTotal - discountAmount, 0);

            const [transactionResult] = await connection.query(
                'INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount) VALUES (?, ?, ?, ?)',
                [generateTransactionCode(), saleDate, transactionTotalAmount, discountAmount]
            );

            await insertSaleDetail(connection, transactionResult.insertId, productId, qty, price, lineTotal);
            await connection.query('UPDATE products SET current_stock = current_stock - ? WHERE product_id = ?', [qty, productId]);

            insertedCount++;
        }

        await connection.commit();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await safeLogAction(getActorId(req), 'IMPORT_SALES', `Import CSV bán hàng thành công: ${insertedCount} dòng, lỗi: ${skippedCount} dòng.`, 'sales_transactions', null, req.ip);

        res.status(200).json({
            success: true,
            message: `Import dữ liệu thành công! Đã nạp ${insertedCount} dòng, bỏ qua ${skippedCount} dòng.`,
            totalRows,
            importedRows: insertedCount,
            errorRows: skippedCount,
            errors
        });
    } catch (error) {
        await connection.rollback();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error('Lỗi Backend importSalesCSV:', error);
        res.status(500).json({ success: false, message: 'Cấu trúc file CSV không hợp lệ hoặc lỗi hệ thống.' });
    } finally {
        connection.release();
    }
};


exports.posCheckout = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống!' });
        }

        const userId = req.user ? req.user.id : null;
        const transactionDate = new Date();
        const transactionCode = 'POS-' + Date.now();
        
        await connection.beginTransaction();

        let totalAmount = 0;

        // 1. Verify stock for all items
        for (const item of items) {
            const qty = parsePositiveNumber(item.quantity, 'quantity');
            const price = parseNonNegativeNumber(item.unit_price, 'unit_price');
            
            const [productRows] = await connection.query(
                'SELECT name, current_stock, is_discontinued FROM products WHERE product_id = ? FOR UPDATE',
                [item.product_id]
            );

            if (productRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: `Sản phẩm ID ${item.product_id} không tồn tại.` });
            }

            const p = productRows[0];
            if (Number(p.is_discontinued) === 1) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: `Sản phẩm "${p.name}" đã ngừng kinh doanh.` });
            }
            if (Number(p.current_stock || 0) < qty) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: `Sản phẩm "${p.name}" không đủ tồn kho (Còn ${p.current_stock}, cần ${qty}).` });
            }

            totalAmount += qty * price;
        }

        // 2. Insert transaction
        const [transResult] = await connection.query(
            `INSERT INTO sales_transactions 
            (transaction_code, transaction_date, total_amount, discount_amount, created_by) 
            VALUES (?, ?, ?, 0, ?)`,
            [transactionCode, transactionDate, totalAmount, userId]
        );
        const transactionId = transResult.insertId;

        // 3. Insert details and update stock
        for (const item of items) {
            const qty = parsePositiveNumber(item.quantity, 'quantity');
            const price = parseNonNegativeNumber(item.unit_price, 'unit_price');
            const lineTotal = qty * price;

            await connection.query(
                `INSERT INTO sale_details 
                (transaction_id, product_id, quantity, unit_price, line_total) 
                VALUES (?, ?, ?, ?, ?)`,
                [transactionId, item.product_id, qty, price, lineTotal]
            );

            await connection.query(
                'UPDATE products SET current_stock = current_stock - ? WHERE product_id = ?',
                [qty, item.product_id]
            );
        }

        // 4. Log activity
        if (userId) {
            await connection.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, created_at)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    'CREATE',
                    'SALES',
                    transactionId,
                    `Thanh toán POS cho ${items.length} mặt hàng, tổng tiền $${totalAmount.toFixed(2)}`,
                    transactionDate
                ]
            );
        }

        await connection.commit();
        res.status(201).json({
            success: true,
            message: 'Thanh toán thành công.',
            transactionId: transactionId,
            transactionCode: transactionCode
        });
    } catch (error) {
        await connection.rollback();
        console.error('[salesController.posCheckout] Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi thanh toán POS.', error: error.message });
    } finally {
        connection.release();
    }
};
