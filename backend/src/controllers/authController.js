const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db'); 
const { safeLogAction } = require('../utils/controllerUtils');

exports.register = async (req, res) => {
    const connection = await pool.getConnection();
    let transactionStarted = false;
    try {
        const { username, password, email, full_name } = req.body;
        const usernameValue = String(username || '').trim();
        const emailValue = email ? String(email).trim().toLowerCase() : null;
        const fullNameValue = String(full_name || '').trim();

        if (!usernameValue || !password || !fullNameValue) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc: Tài khoản, Mật khẩu và Họ tên!' });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        await connection.beginTransaction();
        transactionStarted = true;

        const [existingUsers] = await connection.query(
            'SELECT u.user_id FROM users u LEFT JOIN user_credentials uc ON u.user_id = uc.user_id WHERE uc.username = ? OR u.email = ? LIMIT 1',
            [usernameValue, emailValue || '']
        );
        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Tên tài khoản hoặc Email này đã tồn tại trên hệ thống' });
        }

        const [roleRows] = await connection.query('SELECT role_id FROM roles WHERE LOWER(role_name) = ? LIMIT 1', ['staff']);
        const roleId = roleRows[0]?.role_id || 3;

        const [userResult] = await connection.query('INSERT INTO users (full_name, email, phone, role_id, is_active) VALUES (?, ?, NULL, ?, TRUE)', [fullNameValue, emailValue, roleId]);
        const userId = userResult.insertId;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await connection.query('INSERT INTO user_credentials (user_id, username, password_hash) VALUES (?, ?, ?)', [userId, usernameValue, hashedPassword]);

        await connection.commit();
        transactionStarted = false;

        await safeLogAction(userId, 'REGISTER_SUCCESS', `User registered successfully: ${usernameValue}`, 'users', userId, req.ip);
        res.status(201).json({ success: true, message: 'Đăng ký tài khoản thành công!' });
    } catch (error) {
        if (transactionStarted) await connection.rollback();
        console.error('Lỗi khi đăng ký tài khoản:', error);
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Username or email already exists' });
        res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký tài khoản' });
    } finally {
        connection.release();
    }
};

// BE-06: Hàm Login nâng cao - Giới hạn thời gian JWT & Lockout tài khoản khi nhập sai
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const usernameValue = String(username || '').trim();

        if (!usernameValue || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        const [users] = await pool.query(
            `
            SELECT u.user_id, u.full_name, u.email, u.phone, u.is_active,
                   uc.username, uc.password_hash, uc.failed_login_attempts, uc.locked_until, r.role_name
            FROM user_credentials uc
            JOIN users u ON uc.user_id = u.user_id
            JOIN roles r ON u.role_id = r.role_id
            WHERE uc.username = ? LIMIT 1
            `,
            [usernameValue]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu' });
        }

        const user = users[0];

        // 1. Kiểm tra xem tài khoản có đang trong thời gian bị khóa tạm thời không (locked_until)
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
            return res.status(403).json({
                success: false,
                message: `Tài khoản đang tạm thời bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau ${minutesLeft} phút.`
            });
        }

        if (!user.is_active) {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        // 2. Trường hợp nhập SAI mật khẩu
        if (!isMatch) {
            const nextAttempts = (user.failed_login_attempts || 0) + 1;
            
            if (nextAttempts >= 5) {
                // Đủ 5 lần nhập sai → Khóa tài khoản trong vòng 15 phút tới
                await pool.query(
                    "UPDATE user_credentials SET failed_login_attempts = ?, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE user_id = ?",
                    [nextAttempts, user.user_id]
                );
                return res.status(403).json({
                    success: false,
                    message: 'Sai mật khẩu liên tiếp 5 lần. Tài khoản của bạn đã bị khóa tạm thời 15 phút.'
                });
            } else {
                // Chưa đủ 5 lần → Chỉ tăng bộ đếm số lần sai
                await pool.query("UPDATE user_credentials SET failed_login_attempts = ? WHERE user_id = ?", [nextAttempts, user.user_id]);
                return res.status(401).json({
                    success: false,
                    message: `Sai tài khoản hoặc mật khẩu. (Bạn còn ${5 - nextAttempts} lần thử)`
                });
            }
        }

        // 3. Trường hợp nhập ĐÚNG mật khẩu → Giải phóng bộ đếm và mở khóa
        await pool.query(
            "UPDATE user_credentials SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?",
            [user.user_id]
        );

        const secretKey = process.env.JWT_SECRET;
        if (!secretKey) throw new Error("LỖI: Chưa cài đặt JWT_SECRET trong file .env!");

        const userData = {
            id: user.user_id,
            username: user.username,
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            role: user.role_name
        };

        // Chốt cứng cấu hình JWT hết hạn sau đúng 8 giờ [BE-06]
        const token = jwt.sign(
            { id: userData.id, username: userData.username, role: userData.role },
            secretKey,
            { expiresIn: '8h' }
        );

        await safeLogAction(user.user_id, 'LOGIN_SUCCESS', `User logged in successfully: ${usernameValue}`, 'users', user.user_id, req.ip);

        res.status(200).json({ success: true, token, user: userData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

exports.logout = async (req, res) => {
    try {
        const actorId = req.user?.user_id || req.user?.id || null;
        await safeLogAction(actorId, 'LOGOUT', `User logged out: ${req.user?.username}`, 'users', actorId, req.ip);
        res.status(200).json({ success: true, message: 'Đăng xuất thành công. Vui lòng xóa token ở Client!' });
    } catch (error) {
        console.error('Lỗi khi đăng xuất:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};