const { pool } = require('../db');

exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, email, full_name, role, status FROM users');
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Lỗi Backend getAllUsers:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy dữ liệu người dùng' });
    }
};