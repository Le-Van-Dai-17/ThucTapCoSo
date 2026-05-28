const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db'); 
const { safeLogAction } = require('../utils/controllerUtils');

// Task BE-02: Vá lỗi hàm đăng ký - Đồng bộ cấu trúc tách bảng của DB v3
exports.register = async (req, res) => {
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        const { username, password, email, full_name } = req.body;
        const usernameValue = String(username || '').trim();
        const emailValue = email ? String(email).trim().toLowerCase() : null;
        const fullNameValue = String(full_name || '').trim();

        if (!usernameValue || !password || !fullNameValue) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ các thông tin bắt buộc: Tài khoản, Mật khẩu và Họ tên!'
            });
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        await connection.beginTransaction();
        transactionStarted = true;

        // 1. Kiểm tra xem tài khoản đăng nhập hoặc email đã tồn tại hay chưa
        const [existingUsers] = await connection.query(
            `
            SELECT u.user_id 
            FROM users u
            LEFT JOIN user_credentials uc ON u.user_id = uc.user_id
            WHERE uc.username = ? OR u.email = ?
            LIMIT 1
            `,
            [usernameValue, emailValue || '']
        );

        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Tên tài khoản hoặc Email này đã tồn tại trên hệ thống'
            });
        }

        // 2. Lấy mã vai trò mặc định cho tài khoản tự đăng ký (Mặc định: Staff - ID: 3)
        const [roleRows] = await connection.query('SELECT role_id FROM roles WHERE LOWER(role_name) = ? LIMIT 1', ['staff']);
        const roleId = roleRows[0]?.role_id || 3;

        // 3. Chèn hồ sơ cá nhân vào bảng users
        const [userResult] = await connection.query(
            `
            INSERT INTO users (full_name, email, phone, role_id, is_active) 
            VALUES (?, ?, NULL, ?, TRUE)
            `,
            [fullNameValue, emailValue, roleId]
        );
        const userId = userResult.insertId;

        // 4. Mã hóa bảo mật mật khẩu và chèn vào bảng user_credentials
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await connection.query(
            `
            INSERT INTO user_credentials (user_id, username, password_hash) 
            VALUES (?, ?, ?)
            `,
            [userId, usernameValue, hashedPassword]
        );

        await connection.commit();
        transactionStarted = false;

        await safeLogAction(
            userId,
            'REGISTER_SUCCESS',
            `User registered successfully: ${usernameValue}`,
            'users',
            userId,
            req.ip
        );

        res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản thành công!'
        });
    }
    catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }
        console.error('Lỗi khi đăng ký tài khoản:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng ký tài khoản'
        });
    } finally {
        connection.release();
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const usernameValue = String(username || '').trim();

        if (!usernameValue || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const [users] = await pool.query(
            `
            SELECT 
                u.user_id,
                u.full_name,
                u.email,
                u.phone,
                u.is_active,
                uc.username,
                uc.password_hash,
                r.role_name
            FROM user_credentials uc
            JOIN users u ON uc.user_id = u.user_id
            JOIN roles r ON u.role_id = r.role_id
            WHERE uc.username = ?
            LIMIT 1
            `,
            [usernameValue]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Sai tài khoản hoặc mật khẩu'
            });
        }

        const user = users[0];

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đã bị khóa'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Sai tài khoản hoặc mật khẩu'
            });
        }

        const secretKey = process.env.JWT_SECRET;

        if (!secretKey) {
            throw new Error("LỖI: Chưa cài đặt JWT_SECRET trong file .env!");
        }

        const userData = {
            id: user.user_id,
            username: user.username,
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            role: user.role_name
        };

        const token = jwt.sign(
            {
                id: userData.id,
                username: userData.username,
                role: userData.role
            },
            secretKey,
            { expiresIn: '1d' }
        );

        await safeLogAction(
            user.user_id,
            'LOGIN_SUCCESS',
            `User logged in successfully: ${usernameValue}`,
            'users',
            user.user_id,
            req.ip
        );

        res.status(200).json({
            success: true,
            token,
            user: userData
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

exports.logout = async (req, res) => {
    try {
        const actorId = req.user?.user_id || req.user?.id || null;
        await safeLogAction(
            actorId,
            'LOGOUT',
            `User logged out: ${req.user?.username}`,
            'users',
            actorId,
            req.ip
        );
        res.status(200).json({
            success: true,
            message: 'Đăng xuất thành công. Vui lòng xóa token ở Client!'
        });
    } catch (error) {
        console.error('Lỗi khi đăng xuất:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
