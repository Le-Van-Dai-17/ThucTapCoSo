const { pool } = require('../db');
const { clampInteger } = require('../utils/controllerUtils');

/**
 * Ghi nhật ký hoạt động của người dùng.
 *
 * database_v3.sql dùng bảng activity_logs với các cột:
 * - log_id
 * - user_id
 * - action
 * - description
 * - entity_type
 * - entity_id
 * - ip_address
 * - created_at
 */
exports.logAction = async (
    userId,
    action,
    description,
    entityType = null,
    entityId = null,
    ipAddress = null
) => {
    try {
        const uid = userId || null;

        await pool.query(
            `
            INSERT INTO activity_logs
                (user_id, action, description, entity_type, entity_id, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                uid,
                action,
                description || null,
                entityType,
                entityId,
                ipAddress
            ]
        );
    } catch (error) {
        /*
            Không nên làm crash app chỉ vì ghi log lỗi.
            Ví dụ: userId null, mất kết nối DB tạm thời, hoặc bảng log lỗi.
        */
        console.error('Lỗi khi ghi nhật ký hoạt động:', error);
    }
};

/**
 * Lấy danh sách nhật ký hoạt động.
 *
 * Có hỗ trợ query params:
 * - page
 * - limit
 * - action
 * - user_id
 * - keyword
 *
 * Ví dụ:
 * GET /api/activity-logs?page=1&limit=20
 * GET /api/activity-logs?action=CREATE_USER
 * GET /api/activity-logs?keyword=product
 */
exports.getLogs = async (req, res) => {
    try {
        const page = clampInteger(req.query.page, 1, 100000, 1);
        const limit = clampInteger(req.query.limit, 1, 200, 100);
        const offset = (page - 1) * limit;

        const { action, user_id, keyword } = req.query;
        const keywordValue = keyword ? String(keyword).trim().slice(0, 100) : '';

        const where = [];
        const values = [];

        if (action) {
            where.push('a.action = ?');
            values.push(action);
        }

        if (user_id) {
            where.push('a.user_id = ?');
            values.push(user_id);
        }

        if (keywordValue) {
            where.push(`
                (
                    a.action LIKE ?
                    OR a.description LIKE ?
                    OR a.entity_type LIKE ?
                    OR uc.username LIKE ?
                    OR u.full_name LIKE ?
                )
            `);

            const likeKeyword = `%${keywordValue}%`;

            values.push(
                likeKeyword,
                likeKeyword,
                likeKeyword,
                likeKeyword,
                likeKeyword
            );
        }

        const whereSql = where.length > 0
            ? `WHERE ${where.join(' AND ')}`
            : '';

        const [countRows] = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM activity_logs a
            LEFT JOIN users u ON a.user_id = u.user_id
            LEFT JOIN user_credentials uc ON u.user_id = uc.user_id
            ${whereSql}
            `,
            values
        );

        const total = countRows[0]?.total || 0;

        const [logs] = await pool.query(
            `
            SELECT
                a.log_id AS id,
                a.log_id,
                a.user_id,
                uc.username,
                u.full_name,
                r.role_name AS role,
                a.action,
                a.description,
                a.entity_type,
                a.entity_id,
                a.ip_address,
                a.created_at
            FROM activity_logs a
            LEFT JOIN users u ON a.user_id = u.user_id
            LEFT JOIN user_credentials uc ON u.user_id = uc.user_id
            LEFT JOIN roles r ON u.role_id = r.role_id
            ${whereSql}
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
            `,
            [...values, limit, offset]
        );

        res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách nhật ký:', error);

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy nhật ký'
        });
    }
};
