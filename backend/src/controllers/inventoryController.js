const { pool } = require('../db');
const { safeLogAction, getActorId } = require('../utils/controllerUtils');
const notificationService = require('../services/notificationService');

exports.submitAdjustment = async (req, res) => {
    const { product_id, quantity, reason } = req.body;
    const productId = parseInt(product_id);
    const qty = parseInt(quantity);

    if (!productId || isNaN(qty) || qty <= 0 || !reason) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ ID sản phẩm, số lượng hợp lệ và lý do.' });
    }

    try {
        const userId = getActorId(req);
        const imagePath = req.file ? '/uploads/' + req.file.filename : null;
        const [result] = await pool.query(
            `INSERT INTO inventory_adjustments (product_id, adjustment_type, quantity, reason, reported_by, status, image_path)
             VALUES (?, 'Deduction', ?, ?, ?, 'Pending', ?)`,
            [productId, qty, reason, userId, imagePath]
        );

        await safeLogAction(userId, 'SUBMIT_INVENTORY_ADJUSTMENT', `Staff báo cáo hao hụt sản phẩm ID ${product_id}, số lượng ${quantity}, lý do: ${reason}`, 'inventory_adjustments', result.insertId, req.ip);

        await notificationService.safeCreateForRoles(['Manager', 'Admin'], {
            title: 'Inventory loss report submitted',
            message: `Inventory adjustment #${result.insertId} was submitted for product ID ${product_id}, quantity ${quantity}.`,
            type: 'warning',
            entityType: 'inventory_adjustments',
            entityId: result.insertId,
            link: 'reconciliation.html'
        });
        res.status(200).json({ success: true, message: 'Đã gửi báo cáo hao hụt thành công, chờ Manager duyệt.' });
    } catch (error) {
        console.error('Error submitting inventory adjustment:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi gửi báo cáo hao hụt.' });
    }
};
