const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db'); 

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
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Sai tài khoản hoặc mật khẩu'
            });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
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

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            secretKey, 
            { expiresIn: '1d' }
        );

        delete user.password;
        res.status(200).json({
            success: true,
            token,
            user
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


exports.logout = (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'Đăng xuất thành công. Vui lòng xóa token ở Client!' 
    });
};