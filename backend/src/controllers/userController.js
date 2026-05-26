const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const { logAction } = require('./activityLogController');

// Lấy ID người đang đăng nhập từ token.
// Tùy auth middleware cũ của bạn đang gắn req.user.id hay req.user.user_id,
// hàm này giúp controller không bị lỗi khi chuyển sang database_v3.
const getActorId = (req) => req.user?.user_id || req.user?.id || null;

const normalizeRoleName = (role) => {
    if (!role) return 'Staff';

    const value = String(role).trim().toLowerCase();

    if (value === 'admin') return 'Admin';
    if (value === 'manager') return 'Manager';
    if (value === 'staff') return 'Staff';

    return role;
};

const normalizeIsActive = (status, isActive) => {
    // Ưu tiên is_active nếu frontend gửi đúng database_v3.
    if (isActive !== undefined) {
        return (
            isActive === true ||
            isActive === 1 ||
            isActive === '1' ||
            String(isActive).toLowerCase() === 'true'
        );
    }

    // Hỗ trợ frontend cũ đang gửi status = active/inactive.
    if (status !== undefined) {
        return String(status).toLowerCase() === 'active';
    }

    return true;
};

const getRoleId = async (connection, role) => {
    const roleName = normalizeRoleName(role);

    const [rows] = await connection.query(
        'SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER(?) LIMIT 1',
        [roleName]
    );

    if (rows.length === 0) {
        const error = new Error(`Vai trò không hợp lệ: ${role}`);
        error.statusCode = 400;
        throw error;
    }

    return rows[0].role_id;
};

const buildDuplicateMessage = (error) => {
    if (error?.code !== 'ER_DUP_ENTRY') return null;

    const message = error.sqlMessage || '';

    if (message.includes('username')) return 'Username đã tồn tại';
    if (message.includes('email')) return 'Email đã tồn tại';

    return 'Dữ liệu đã tồn tại trong hệ thống';
};

// 1. Lấy danh sách người dùng
exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT
                u.user_id AS id,
                u.user_id,
                uc.username,
                u.full_name,
                u.email,
                u.phone,
                r.role_id,
                r.role_name AS role,
                u.is_active,
                CASE 
                    WHEN u.is_active = 1 THEN 'active' 
                    ELSE 'inactive' 
                END AS status,
                u.created_at,
                u.updated_at
            FROM users u
            INNER JOIN roles r ON u.role_id = r.role_id
            INNER JOIN user_credentials uc ON u.user_id = uc.user_id
            ORDER BY u.user_id ASC
        `);

        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Lỗi Backend getAllUsers:', error);

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy dữ liệu người dùng'
        });
    }
};

// 2. Tạo tài khoản mới
exports.createUser = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const {
            username,
            full_name,
            email,
            phone,
            password,
            role,
            status,
            is_active
        } = req.body;

        if (!username || !String(username).trim()) {
            return res.status(400).json({
                success: false,
                message: 'Username không được để trống'
            });
        }

        if (!full_name || !String(full_name).trim()) {
            return res.status(400).json({
                success: false,
                message: 'Họ tên không được để trống'
            });
        }

        await connection.beginTransaction();

        const roleId = await getRoleId(connection, role || 'Staff');
        const activeValue = normalizeIsActive(status, is_active);
        const hashedPassword = await bcrypt.hash(password || '123456', 10);

        const [userResult] = await connection.query(
            `
            INSERT INTO users (full_name, email, phone, role_id, is_active)
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                full_name.trim(),
                email || null,
                phone || null,
                roleId,
                activeValue
            ]
        );

        const userId = userResult.insertId;

        await connection.query(
            `
            INSERT INTO user_credentials (user_id, username, password_hash)
            VALUES (?, ?, ?)
            `,
            [
                userId,
                username.trim(),
                hashedPassword
            ]
        );

        await connection.commit();

        await logAction(
            getActorId(req),
            'CREATE_USER',
            `Tạo người dùng mới: ${username}`,
            'users',
            userId,
            req.ip
        );

        res.status(201).json({
            success: true,
            message: 'Tạo tài khoản thành công!',
            data: {
                id: userId,
                user_id: userId
            }
        });
    } catch (error) {
        await connection.rollback();

        console.error('Lỗi Backend createUser:', error);

        const duplicateMessage = buildDuplicateMessage(error);
        if (duplicateMessage) {
            return res.status(409).json({
                success: false,
                message: duplicateMessage
            });
        }

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : 'Lỗi server khi tạo người dùng'
        });
    } finally {
        connection.release();
    }
};

// 3. Cập nhật thông tin người dùng
exports.updateUser = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;

        const {
            username,
            full_name,
            email,
            phone,
            password,
            role,
            status,
            is_active
        } = req.body;

        await connection.beginTransaction();

        const userUpdates = [];
        const userValues = [];

        if (full_name !== undefined) {
            userUpdates.push('full_name = ?');
            userValues.push(full_name || null);
        }

        if (email !== undefined) {
            userUpdates.push('email = ?');
            userValues.push(email || null);
        }

        if (phone !== undefined) {
            userUpdates.push('phone = ?');
            userValues.push(phone || null);
        }

        if (role !== undefined) {
            const roleId = await getRoleId(connection, role);
            userUpdates.push('role_id = ?');
            userValues.push(roleId);
        }

        if (status !== undefined || is_active !== undefined) {
            userUpdates.push('is_active = ?');
            userValues.push(normalizeIsActive(status, is_active));
        }

        if (userUpdates.length > 0) {
            userValues.push(id);

            const userQuery = `
                UPDATE users
                SET ${userUpdates.join(', ')}
                WHERE user_id = ?
            `;

            const [userResult] = await connection.query(userQuery, userValues);

            if (userResult.affectedRows === 0) {
                const error = new Error('Không tìm thấy người dùng cần cập nhật');
                error.statusCode = 404;
                throw error;
            }
        }

        const credentialUpdates = [];
        const credentialValues = [];

        if (username !== undefined && String(username).trim() !== '') {
            credentialUpdates.push('username = ?');
            credentialValues.push(username.trim());
        }

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);

            credentialUpdates.push('password_hash = ?');
            credentialValues.push(hashedPassword);

            credentialUpdates.push('password_updated_at = CURRENT_TIMESTAMP');
        }

        if (credentialUpdates.length > 0) {
            credentialValues.push(id);

            const credentialQuery = `
                UPDATE user_credentials
                SET ${credentialUpdates.join(', ')}
                WHERE user_id = ?
            `;

            await connection.query(credentialQuery, credentialValues);
        }

        if (userUpdates.length === 0 && credentialUpdates.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu cập nhật'
            });
        }

        await connection.commit();

        await logAction(
            getActorId(req),
            'UPDATE_USER',
            `Cập nhật người dùng ID: ${id}`,
            'users',
            id,
            req.ip
        );

        res.status(200).json({
            success: true,
            message: 'Cập nhật tài khoản thành công!'
        });
    } catch (error) {
        await connection.rollback();

        console.error('Lỗi Backend updateUser:', error);

        const duplicateMessage = buildDuplicateMessage(error);
        if (duplicateMessage) {
            return res.status(409).json({
                success: false,
                message: duplicateMessage
            });
        }

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : 'Lỗi server khi cập nhật người dùng'
        });
    } finally {
        connection.release();
    }
};

// 4. Xóa / vô hiệu hóa người dùng
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        /*
            Với database_v3, nhiều bảng khác có thể tham chiếu users.user_id.
            Vì vậy không nên DELETE cứng.

            Xóa user trong giao diện = vô hiệu hóa tài khoản.
            Cách này giữ được lịch sử:
            - activity_logs
            - purchase_orders
            - sales_transactions
            - các dữ liệu liên quan khác
        */
        const [result] = await pool.query(
            `
            UPDATE users
            SET is_active = FALSE
            WHERE user_id = ?
            `,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng cần xóa'
            });
        }

        await logAction(
            getActorId(req),
            'DELETE_USER',
            `Vô hiệu hóa người dùng ID: ${id}`,
            'users',
            id,
            req.ip
        );

        res.status(200).json({
            success: true,
            message: 'Xóa tài khoản thành công!'
        });
    } catch (error) {
        console.error('Lỗi Backend deleteUser:', error);

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa người dùng'
        });
    }
};