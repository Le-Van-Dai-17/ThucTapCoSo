const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Multer upload instance
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép tải lên file hình ảnh (jpeg, jpg, png, gif, webp).'));
        }
    }
});

exports.uploadImage = [
    upload.single('evidence'),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn một file hình ảnh.' });
        }
        
        // Return URL format: /uploads/filename
        const url = `/uploads/${req.file.filename}`;
        res.status(200).json({ success: true, url });
    }
];
