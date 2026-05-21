const { pool } = require('../db');

exports.logAction = async (userId, action, description, entityType = null, entityId = null, ipAddress = null) => {
    try {
        const uid = userId || null;
        
        // Đổi tên bảng thành activity_log và map đúng số lượng cột
        await pool.query(
            `INSERT INTO activity_log 
            (user_id, action, description, entity_type, entity_id, ip_address) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [uid, action, description, entityType, entityId, ipAddress]
        );
    } catch (error) {
        // Chỉ in ra console chứ không làm crash app nếu ghi log thất bại
        console.error('Lỗi khi ghi nhật ký hoạt động:', error);
    }
};

exports.getLogs = async (req, res) => {
    try {
        // Đổi tên bảng thành activity_log 
        const [logs] = await pool.query(`
            SELECT a.*, u.username, u.full_name
            FROM activity_log a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT 100
        `);
        
        res.status(200).json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách nhật ký:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy nhật ký' });
    }
};