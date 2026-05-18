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
        return res.status(403).json({
            success: false,
            message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
};