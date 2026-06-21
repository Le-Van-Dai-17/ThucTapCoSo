const { pool } = require('../db');
const { getActorId, safeLogAction } = require('../utils/controllerUtils');

const normalizeLeadTimeDays = (value, fallback = null) => {
    if (value === undefined || value === null || value === '') return fallback;

    const leadTime = Number(value);
    if (!Number.isInteger(leadTime) || leadTime < 0) {
        const error = new Error('Lead time phải là số nguyên không âm.');
        error.statusCode = 400;
        throw error;
    }

    return leadTime;
};

// 1. Lấy danh sách tất cả nhà cung cấp (Phục vụ Manager)
exports.getAllSuppliers = async (req, res) => {
    try {
        const [suppliers] = await pool.query('SELECT * FROM suppliers ORDER BY supplier_id ASC');
        
        // Fetch products and categories for each supplier
        for (let supplier of suppliers) {
            const [products] = await pool.query(
                `SELECT p.product_id, p.name, c.name as category_name, c.category_id 
                 FROM products p 
                 LEFT JOIN categories c ON p.category_id = c.category_id 
                 WHERE p.supplier_id = ? AND p.is_discontinued = 0`, 
                 [supplier.supplier_id]
            );
            supplier.supplied_products = products.map(p => p.name);
            const cats = [...new Set(products.map(p => p.category_name).filter(Boolean))];
            supplier.supplied_categories = cats;
        }

        res.status(200).json({
            success: true,
            data: suppliers
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách nhà cung cấp:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy dữ liệu nhà cung cấp' });
    }
};

// 2. Tạo mới nhà cung cấp
exports.createSupplier = async (req, res) => {
    try {
        const { name, contact_name, phone, email, address, lead_time_days } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, message: 'Tên nhà cung cấp không được bỏ trống' });
        }
        const leadTimeValue = normalizeLeadTimeDays(lead_time_days, 7);

        const [result] = await pool.query(
            'INSERT INTO suppliers (name, contact_name, phone, email, address, lead_time_days) VALUES (?, ?, ?, ?, ?, ?)',
            [name.trim(), contact_name || null, phone || null, email || null, address || null, leadTimeValue]
        );

        await safeLogAction(getActorId(req), 'CREATE_SUPPLIER', `Thêm nhà cung cấp mới: ${name}`, 'suppliers', result.insertId, req.ip);
        res.status(201).json({ success: true, message: 'Thêm nhà cung cấp thành công!', data: { supplier_id: result.insertId } });
    } catch (error) {
        console.error('Lỗi thêm nhà cung cấp:', error);
        res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Lỗi server khi thêm nhà cung cấp' });
    }
};

// 3. Cập nhật thông tin nhà cung cấp
exports.updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contact_name, phone, email, address, lead_time_days } = req.body;

        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, message: 'Tên nhà cung cấp không được bỏ trống' });
        }
        const leadTimeValue = normalizeLeadTimeDays(lead_time_days, null);

        const [result] = await pool.query(
            `UPDATE suppliers SET name = ?, contact_name = ?, phone = ?, email = ?, address = ?, lead_time_days = COALESCE(?, lead_time_days) WHERE supplier_id = ?`,
            [name.trim(), contact_name || null, phone || null, email || null, address || null, leadTimeValue, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp cần sửa' });
        }

        await safeLogAction(getActorId(req), 'UPDATE_SUPPLIER', `Cập nhật thông tin nhà cung cấp ID: ${id}`, 'suppliers', id, req.ip);
        res.status(200).json({ success: true, message: 'Cập nhật thông tin nhà cung cấp thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật nhà cung cấp:', error);
        res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Lỗi server khi cập nhật nhà cung cấp' });
    }
};

// 4. Xóa nhà cung cấp (Chặn xóa nếu có sản phẩm liên kết để tránh lỗi khóa ngoại)
exports.deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;

        // Chặn lỗi integrity bằng cách kiểm tra xem nhà cung cấp có đang giữ sản phẩm nào không
        const [boundProducts] = await pool.query('SELECT product_id FROM products WHERE supplier_id = ? LIMIT 1', [id]);
        if (boundProducts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa nhà cung cấp này do đang có sản phẩm liên kết dữ liệu.'
            });
        }

        const [result] = await pool.query('DELETE FROM suppliers WHERE supplier_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhà cung cấp cần xóa' });
        }

        await safeLogAction(getActorId(req), 'DELETE_SUPPLIER', `Xóa nhà cung cấp ID: ${id}`, 'suppliers', id, req.ip);

        res.status(200).json({ success: true, message: 'Đã xóa nhà cung cấp thành công!' });
    } catch (error) {
        console.error('Lỗi xóa nhà cung cấp:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa nhà cung cấp' });
    }
};

exports.getSupplierPerformance = async (req, res) => {
    try {
        const { id } = req.params;

        const [poStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_completed_pos,
                SUM(CASE WHEN status = 'Received' THEN 1 ELSE 0 END) as reliable_pos,
                AVG(GREATEST(0, DATEDIFF(received_date, expected_delivery_date))) as avg_delay_days
            FROM purchase_orders 
            WHERE supplier_id = ? AND status IN ('Received', 'Discrepancy') AND received_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `, [id]);

        const totalCompleted = poStats[0].total_completed_pos || 0;
        const reliableCount = poStats[0].reliable_pos || 0;
        const reliability = totalCompleted > 0 ? (reliableCount / totalCompleted) * 100 : 100;
        const avgDelay = parseFloat(poStats[0].avg_delay_days || 0).toFixed(1);

        const [defectStats] = await pool.query(`
            SELECT 
                SUM(pi.ordered_quantity) as total_ordered,
                SUM(pd.discrepancy_quantity) as total_defects
            FROM purchase_orders po
            JOIN po_items pi ON po.po_id = pi.po_id
            LEFT JOIN po_discrepancies pd ON pi.po_item_id = pd.po_item_id
            WHERE po.supplier_id = ? AND po.status IN ('Received', 'Discrepancy') AND po.received_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `, [id]);

        const totalOrdered = defectStats[0].total_ordered || 0;
        const totalDefects = defectStats[0].total_defects || 0;
        const defectRate = totalOrdered > 0 ? (totalDefects / totalOrdered) * 100 : 0;

        const [monthlyVolume] = await pool.query(`
            SELECT 
                DATE_FORMAT(order_date, '%b') as month_name,
                MONTH(order_date) as month_num,
                COUNT(*) as order_count
            FROM purchase_orders
            WHERE supplier_id = ? AND order_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY month_name, month_num
            ORDER BY YEAR(order_date), month_num
        `, [id]);

        res.status(200).json({
            success: true,
            data: {
                reliability: reliability.toFixed(1),
                avgDelay: avgDelay,
                defectRate: defectRate.toFixed(1),
                monthlyVolume: monthlyVolume
            }
        });
    } catch (error) {
        console.error('Error fetching supplier performance:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
