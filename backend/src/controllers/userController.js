const { pool } = require('../db');
const bcrypt = require('bcryptjs'); // Dùng thư viện mã hóa mật khẩu giống Kiệt

// 1. Lấy danh sách Users
exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, email, full_name, role, status FROM users');
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Lỗi Backend getAllUsers:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy dữ liệu người dùng' });
    }
};

// 2. Thêm User mới (Task FE-03)
exports.createUser = async (req, res) => {
    try {
        const { username, full_name, email, password, role } = req.body;
        
        // Mã hóa mật khẩu trước khi lưu vào DB
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password || '123456', salt);
        
        const userRole = role || 'staff';
        const status = 'active'; // Mặc định khi tạo mới là active

        await pool.query(
            'INSERT INTO users (username, full_name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [username, full_name, email, hashedPassword, userRole, status]
        );

        res.status(201).json({ success: true, message: 'Tạo tài khoản thành công!' });
    } catch (error) {
        console.error('Lỗi Backend createUser:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tạo người dùng' });
    }
};

// 3. Cập nhật Role / Status (Task FE-04)
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, status } = req.body;
        
        const updates = [];
        const values = [];
        
        if (role) { updates.push('role = ?'); values.push(role); }
        if (status) { updates.push('status = ?'); values.push(status); }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Không có dữ liệu cập nhật' });
        }

        values.push(id);
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        
        await pool.query(query, values);
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (error) {
        console.error('Lỗi Backend updateUser:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật người dùng' });
    }
};

// 4. Xóa User (Task FE-04)
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'Xóa tài khoản thành công!' });
    } catch (error) {
        console.error('Lỗi Backend deleteUser:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa người dùng' });
    }
};