const { pool } = require('../db');
const {
    getActorId,
    parseNonNegativeNumber,
    safeLogAction
} = require('../utils/controllerUtils');

/**
 * Chuyển status frontend gửi lên thành is_discontinued trong database.
 * active      -> is_discontinued = 0
 * inactive    -> is_discontinued = 1
 * discontinued -> is_discontinued = 1
 */
const normalizeDiscontinuedStatus = (status, isDiscontinued) => {
    if (typeof isDiscontinued !== 'undefined') {
        return Number(isDiscontinued) ? 1 : 0;
    }

    if (!status) return 0;

    const normalized = String(status).toLowerCase();

    if (normalized === 'inactive' || normalized === 'discontinued') {
        return 1;
    }

    return 0;
};

/**
 * Lấy hoặc tạo category_id.
 * Frontend có thể gửi:
 * - category_id
 * - category là số
 * - category là tên, ví dụ "Electronics"
 */
const resolveCategoryId = async (categoryId, categoryName) => {
    if (categoryId) {
        return Number(categoryId);
    }

    if (!categoryName) {
        return null;
    }

    // Nếu category gửi lên là số dạng string
    if (!Number.isNaN(Number(categoryName))) {
        return Number(categoryName);
    }

    const name = String(categoryName).trim();

    if (!name) {
        return null;
    }

    const [existing] = await pool.query(
        'SELECT category_id FROM categories WHERE name = ? LIMIT 1',
        [name]
    );

    if (existing.length > 0) {
        return existing[0].category_id;
    }

    const [result] = await pool.query(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        [name, `Auto-created category: ${name}`]
    );

    return result.insertId;
};

/**
 * GET /api/products
 * Lấy danh sách sản phẩm.
 */
exports.getAllProducts = async (req, res) => {
    try {
        const [products] = await pool.query(`
            SELECT 
                p.product_id AS id,
                p.product_id,
                p.sku,
                p.name,
                p.category_id,
                COALESCE(c.name, 'General') AS category,
                p.supplier_id,
                COALESCE(s.name, '') AS supplier_name,
                p.unit,
                p.cost_price,
                p.selling_price,
                p.current_stock,
                p.warning_stock_level,
                p.warning_stock_level AS warning_stock,
                p.warning_stock_level AS min_stock,
                p.max_stock_level,
                p.is_discontinued,
                CASE
                    WHEN p.is_discontinued = 1 THEN 'inactive'
                    ELSE 'active'
                END AS status,
                p.created_at
            FROM products p
            LEFT JOIN categories c 
                ON p.category_id = c.category_id
            LEFT JOIN suppliers s 
                ON p.supplier_id = s.supplier_id
            ORDER BY p.product_id DESC
        `);

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

/**
 * GET /api/products/:id
 * Lấy chi tiết một sản phẩm.
 */
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const [products] = await pool.query(`
            SELECT 
                p.product_id AS id,
                p.product_id,
                p.sku,
                p.name,
                p.category_id,
                COALESCE(c.name, 'General') AS category,
                p.supplier_id,
                COALESCE(s.name, '') AS supplier_name,
                p.unit,
                p.cost_price,
                p.selling_price,
                p.current_stock,
                p.warning_stock_level,
                p.warning_stock_level AS warning_stock,
                p.warning_stock_level AS min_stock,
                p.max_stock_level,
                p.is_discontinued,
                CASE
                    WHEN p.is_discontinued = 1 THEN 'inactive'
                    ELSE 'active'
                END AS status,
                p.created_at
            FROM products p
            LEFT JOIN categories c 
                ON p.category_id = c.category_id
            LEFT JOIN suppliers s 
                ON p.supplier_id = s.supplier_id
            WHERE p.product_id = ?
            LIMIT 1
        `, [id]);

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

/**
 * POST /api/products
 * Tạo sản phẩm mới.
 */
exports.createProduct = async (req, res) => {
    try {
        const {
            name,
            sku,
            category,
            category_id,
            supplier_id,
            unit,
            selling_price,
            cost_price,
            current_stock,
            min_stock,
            min_stock_level,
            warning_stock,
            warning_stock_level,
            max_stock_level,
            status,
            is_discontinued
        } = req.body;

        const productName = String(name || '').trim();
        const skuValue = String(sku || '').trim();

        if (!productName || !skuValue) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên sản phẩm và SKU'
            });
        }

        const sellingPrice = parseNonNegativeNumber(selling_price, 'selling_price');
        const costPrice = parseNonNegativeNumber(cost_price, 'cost_price');
        const currentStock = parseNonNegativeNumber(current_stock, 'current_stock');
        const warningStockLevel = parseNonNegativeNumber(warning_stock_level ?? warning_stock ?? min_stock_level ?? min_stock, 'warning_stock_level', 10);
        const maxStockLevel = max_stock_level === '' || max_stock_level == null
            ? null
            : parseNonNegativeNumber(max_stock_level, 'max_stock_level');

        if (maxStockLevel !== null && maxStockLevel < warningStockLevel) {
            return res.status(400).json({
                success: false,
                message: 'max_stock_level must be greater than or equal to warning_stock_level'
            });
        }

        const [existingSku] = await pool.query(
            'SELECT product_id FROM products WHERE sku = ? LIMIT 1',
            [skuValue]
        );

        if (existingSku.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'SKU đã tồn tại'
            });
        }

        const resolvedCategoryId = await resolveCategoryId(category_id, category);
        const discontinued = normalizeDiscontinuedStatus(status, is_discontinued);

        const [result] = await pool.query(`
            INSERT INTO products 
            (
                sku,
                name,
                category_id,
                supplier_id,
                unit,
                cost_price,
                selling_price,
                current_stock,
                warning_stock_level,
                max_stock_level,
                is_discontinued
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            skuValue,
            productName,
            resolvedCategoryId,
            supplier_id || null,
            unit || 'pcs',
            costPrice,
            sellingPrice,
            currentStock,
            warningStockLevel,
            maxStockLevel,
            discontinued
        ]);

        await safeLogAction(
            getActorId(req),
            'CREATE_PRODUCT',
            `Created product: ${productName}`,
            'products',
            result.insertId,
            req.ip
        );

        res.status(201).json({
            success: true,
            message: 'Sản phẩm đã được tạo thành công',
            data: {
                id: result.insertId,
                product_id: result.insertId
            }
        });
    } catch (error) {
        console.error('Error creating product:', error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Lỗi server khi tạo sản phẩm'
        });
    }
};

/**
 * PUT /api/products/:id
 * Cập nhật sản phẩm.
 */
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            sku,
            category,
            category_id,
            supplier_id,
            unit,
            selling_price,
            cost_price,
            current_stock,
            min_stock,
            min_stock_level,
            warning_stock,
            warning_stock_level,
            max_stock_level,
            status,
            is_discontinued
        } = req.body;

        const [existingProduct] = await pool.query(
            'SELECT * FROM products WHERE product_id = ? LIMIT 1',
            [id]
        );

        if (existingProduct.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không tồn tại'
            });
        }

        const productName = String(name || '').trim();
        const skuValue = String(sku || '').trim();

        if (!productName || !skuValue) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên sản phẩm và SKU'
            });
        }

        const [existingSku] = await pool.query(
            'SELECT product_id FROM products WHERE sku = ? AND product_id <> ? LIMIT 1',
            [skuValue, id]
        );

        if (existingSku.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'SKU đã tồn tại ở sản phẩm khác'
            });
        }

        const sellingPrice = parseNonNegativeNumber(selling_price, 'selling_price');
        const costPrice = parseNonNegativeNumber(cost_price, 'cost_price');
        const currentStock = parseNonNegativeNumber(current_stock, 'current_stock');
        const warningStockLevel = parseNonNegativeNumber(warning_stock_level ?? warning_stock ?? min_stock_level ?? min_stock, 'warning_stock_level', 10);
        const maxStockLevel = max_stock_level === '' || max_stock_level == null
            ? null
            : parseNonNegativeNumber(max_stock_level, 'max_stock_level');

        if (maxStockLevel !== null && maxStockLevel < warningStockLevel) {
            return res.status(400).json({
                success: false,
                message: 'max_stock_level must be greater than or equal to warning_stock_level'
            });
        }

        const resolvedCategoryId = await resolveCategoryId(category_id, category);
        const discontinued = normalizeDiscontinuedStatus(status, is_discontinued);

        const [result] = await pool.query(`
            UPDATE products
            SET 
                sku = ?,
                name = ?,
                category_id = ?,
                supplier_id = ?,
                unit = ?,
                cost_price = ?,
                selling_price = ?,
                current_stock = ?,
                warning_stock_level = ?,
                max_stock_level = ?,
                is_discontinued = ?
            WHERE product_id = ?
        `, [
            skuValue,
            productName,
            resolvedCategoryId,
            supplier_id || null,
            unit || 'pcs',
            costPrice,
            sellingPrice,
            currentStock,
            warningStockLevel,
            maxStockLevel,
            discontinued,
            id
        ]);

        await safeLogAction(
            getActorId(req),
            'UPDATE_PRODUCT',
            `Cập nhật sản phẩm ID: ${id}`,
            'products',
            id,
            req.ip
        );

        res.status(200).json({
            success: true,
            message: 'Sản phẩm đã được cập nhật thành công',
            affectedRows: result.affectedRows
        });
    } catch (error) {
        console.error('Error updating product:', error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Lỗi server khi cập nhật sản phẩm'
        });
    }
};

/**
 * DELETE /api/products/:id
 * Không xóa cứng, chỉ chuyển sản phẩm sang trạng thái ngừng kinh doanh.
 */
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const [existingProduct] = await pool.query(
            'SELECT * FROM products WHERE product_id = ? LIMIT 1',
            [id]
        );

        if (existingProduct.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không tồn tại'
            });
        }

        const [result] = await pool.query(
            'UPDATE products SET is_discontinued = 1 WHERE product_id = ?',
            [id]
        );

        await safeLogAction(
            getActorId(req),
            'DELETE_PRODUCT',
            `Ngừng kinh doanh sản phẩm ID: ${id}`,
            'products',
            id,
            req.ip
        );

        res.status(200).json({
            success: true,
            message: 'Sản phẩm đã được chuyển sang trạng thái ngừng kinh doanh',
            affectedRows: result.affectedRows
        });
    } catch (error) {
        console.error('Error deleting product:', error);

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa sản phẩm'
        });
    }
};

/**
 * GET /api/products/available
 * Lấy danh sách sản phẩm đang bán (dành cho Staff và Manager).
 * Không bao gồm cost_price hoặc thông tin lợi nhuận.
 */
exports.getAvailableProducts = async (req, res) => {
    try {
        const [products] = await pool.query(`
            SELECT 
                product_id AS id,
                product_id,
                sku,
                name,
                unit,
                selling_price,
                cost_price,
                supplier_id,
                current_stock
            FROM products 
            WHERE is_discontinued = 0
            ORDER BY name ASC
        `);

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        console.error('Error fetching available products:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách sản phẩm còn bán'
        });
    }
};
