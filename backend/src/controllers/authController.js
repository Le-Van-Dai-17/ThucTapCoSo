const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db'); 
const { logAction } = require('./activityLogController');

exports.register = async (req, res) => {
    try {
        const { username, password, email, full_name, role } = req.body;

        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username hoặc Email đã tồn tại'
            });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userRole = role || 'staff';
        const [result] = await pool.query(
            'INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, email, full_name, userRole]
        );
        // Ghi log hành động đăng ký thành công
        await logAction(result.insertId,
            'REGISTER_SUCCESS',
            `User registered successfully: ${username}`,
            'users',
            result.insertId,
            req.ip
        );
        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công!'
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

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

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
            [username]
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

        await logAction(
            user.user_id,
            'LOGIN_SUCCESS',
            `User logged in successfully: ${username}`,
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
    // Ghi log hành động đăng xuất
    await logAction(req.user.id,
        'LOGOUT',
        `User logged out: ${req.user.username}`,
        'users',
        req.user.id,
        req.ip);
    res.status(200).json({
        success: true,
        message: 'Đăng xuất thành công. Vui lòng xóa token ở Client!'
    });
};