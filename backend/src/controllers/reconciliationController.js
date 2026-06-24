const { pool } = require('../db');
const { safeLogAction, getActorId } = require('../utils/controllerUtils');
const notificationService = require('../services/notificationService');

exports.getPendingDiscrepancies = async (req, res) => {
    try {
        const userRole = String(req.user?.role || '').trim().toLowerCase();
        const userId = getActorId(req);

        let query = `
            SELECT d.*, 
                   pi.product_id, p.name as product_name, p.sku,
                   po.po_code, po.supplier_id, s.name as supplier_name,
                   u.full_name as reported_by_name,
                   approver.full_name as approved_by_name
            FROM po_discrepancies d
            JOIN po_items pi ON d.po_item_id = pi.po_item_id
            JOIN products p ON pi.product_id = p.product_id
            JOIN purchase_orders po ON d.po_id = po.po_id
            JOIN suppliers s ON po.supplier_id = s.supplier_id
            JOIN users u ON d.reported_by = u.user_id
            LEFT JOIN users approver ON po.approved_by = approver.user_id
        `;

        const params = [];
        if (userRole === 'staff') {
            query += ' WHERE d.reported_by = ?';
            params.push(userId);
        }

        query += ' ORDER BY d.created_at DESC';

        const [rows] = await pool.query(query, params);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching discrepancies:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách đối soát PO.' });
    }
};

exports.resolveDiscrepancy = async (req, res) => {
    const { id } = req.params;
    const { status, resolution_note } = req.body;
    
    if (!['Resolved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const userId = getActorId(req);

        // Fetch discrepancy details first
        const [discRows] = await connection.query('SELECT * FROM po_discrepancies WHERE discrepancy_id = ? FOR UPDATE', [id]);
        if (discRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy biên bản chênh lệch.' });
        }
        const discrepancy = discRows[0];

        // If Rejected, add the missing items back to inventory and update po_items
        if (status === 'Rejected' && discrepancy.status === 'Pending') {
            const missingQty = discrepancy.discrepancy_quantity;
            const poItemId = discrepancy.po_item_id;

            // Get product_id from po_items
            const [poItemRows] = await connection.query('SELECT product_id FROM po_items WHERE po_item_id = ?', [poItemId]);
            if (poItemRows.length > 0) {
                const productId = poItemRows[0].product_id;
                // Add to stock
                await connection.query('UPDATE products SET current_stock = current_stock + ? WHERE product_id = ?', [missingQty, productId]);
                // Update received_quantity in po_items
                await connection.query('UPDATE po_items SET received_quantity = received_quantity + ? WHERE po_item_id = ?', [missingQty, poItemId]);
            }
        }

        await connection.query(
            'UPDATE po_discrepancies SET status = ?, resolution_note = ?, resolved_by = ? WHERE discrepancy_id = ?',
            [status, resolution_note || '', userId, id]
        );

        // Kiểm tra xem đơn hàng (PO) còn discrepancy nào Pending không
        const poId = discrepancy.po_id;
        const [pending] = await connection.query("SELECT COUNT(*) as cnt FROM po_discrepancies WHERE po_id = ? AND status = 'Pending'", [poId]);
        if (pending[0].cnt === 0) {
            // Nếu không còn pending discrepancy nào, cập nhật PO thành Received
            await connection.query("UPDATE purchase_orders SET status = 'Received' WHERE po_id = ?", [poId]);
        }

        await connection.commit();

        await safeLogAction(userId, 'RESOLVE_DISCREPANCY', `Manager xử lý biên bản chênh lệch ID ${id} thành ${status}`, 'po_discrepancies', id, req.ip);

        if (discRows.length > 0) {
            await notificationService.safeCreateForUser({
                userId: discRows[0].reported_by,
                title: 'PO discrepancy processed',
                message: `Your PO discrepancy report #${id} was ${status}.`,
                type: status === 'Resolved' ? 'success' : 'info',
                entityType: 'po_discrepancies',
                entityId: id,
                link: 'purchase-orders.html'
            });
        }
        res.status(200).json({ success: true, message: 'Xử lý biên bản chênh lệch thành công.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error resolving discrepancy:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xử lý chênh lệch.' });
    } finally {
        if (connection) connection.release();
    }
};

exports.getPendingAdjustments = async (req, res) => {
    try {
        const userRole = String(req.user?.role || '').trim().toLowerCase();
        const userId = getActorId(req);

        let query = `
            SELECT a.*, p.name as product_name, p.sku, u.full_name as reported_by_name, s.name as supplier_name
            FROM inventory_adjustments a
            JOIN products p ON a.product_id = p.product_id
            LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
            JOIN users u ON a.reported_by = u.user_id
        `;

        const params = [];
        if (userRole === 'staff') {
            query += ' WHERE a.reported_by = ?';
            params.push(userId);
        }

        query += ' ORDER BY a.created_at DESC';

        const [rows] = await pool.query(query, params);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching adjustments:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách báo cáo hao hụt.' });
    }
};

exports.resolveAdjustment = async (req, res) => {
    const { id } = req.params;
    const { status, resolution_note } = req.body;
    
    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái duyệt không hợp lệ.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [adjRows] = await connection.query('SELECT * FROM inventory_adjustments WHERE adjustment_id = ? FOR UPDATE', [id]);
        if (adjRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu báo cáo hao hụt.' });
        }

        const adj = adjRows[0];
        if (adj.status !== 'Pending') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Phiếu này đã được xử lý.' });
        }

        const userId = getActorId(req);
        
        await connection.query(
            'UPDATE inventory_adjustments SET status = ?, resolution_note = ?, resolved_by = ? WHERE adjustment_id = ?',
            [status, resolution_note || '', userId, id]
        );

        // Trừ kho vật lý
        if (status === 'Approved' && adj.adjustment_type === 'Deduction') {
            // Check current stock first
            const [prodRows] = await connection.query('SELECT current_stock FROM products WHERE product_id = ? FOR UPDATE', [adj.product_id]);
            if (prodRows.length > 0 && prodRows[0].current_stock < adj.quantity) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Tồn kho hiện tại không đủ để trừ hao hụt.' });
            }

            await connection.query('UPDATE products SET current_stock = current_stock - ? WHERE product_id = ?', [adj.quantity, adj.product_id]);
        }

        await connection.commit();
        await safeLogAction(userId, 'RESOLVE_INVENTORY_ADJ', `Manager xử lý phiếu hao hụt kho ID ${id} thành ${status}`, 'inventory_adjustments', id, req.ip);

        await notificationService.safeCreateForUser({
            userId: adj.reported_by,
            title: 'Inventory report processed',
            message: `Your inventory adjustment #${id} was ${status}.`,
            type: status === 'Approved' ? 'success' : 'info',
            entityType: 'inventory_adjustments',
            entityId: id,
            link: 'reconciliation.html'
        });
        res.status(200).json({ success: true, message: 'Đã xử lý phiếu báo cáo hao hụt.' });
    } catch (error) {
        await connection.rollback();
        console.error('Error resolving adjustment:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi duyệt phiếu hao hụt.' });
    } finally {
        connection.release();
    }
};
