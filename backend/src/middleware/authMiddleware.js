const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Không tìm thấy token xác thực, từ chối truy cập!'
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        const secretKey = process.env.JWT_SECRET;
        
        if (!secretKey) {
            console.error("LỖI: Chưa cài đặt JWT_SECRET trong file .env!");
            return res.status(500).json({
                success: false,
                message: 'Lỗi cấu hình Server: Thiếu Secret Key!' });
        }

        const decoded = jwt.verify(token, secretKey);
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error(">>> LỖI BẢO VỆ BẮT ĐƯỢC:", error.message);
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
};

// Middleware kiểm tra quyền hạn (Task BE-03)
exports.requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập trước!' });
        }
        
        // So khớp vai trò giải mã từ Token với danh sách quyền cho phép
        const hasPermission = allowedRoles.some(role => 
            String(role).toLowerCase() === String(req.user.role).toLowerCase()
        );

        if (!hasPermission) {
            return res.status(403).json({ 
                success: false, 
                message: 'Bạn không có quyền thực hiện hành động này!' 
            });
        }
        next();
    };
};
