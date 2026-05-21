const { pool } = require('../db');
const fs = require('fs');
const { logAction } = require('./activityLogController');

exports.getSalesList = async (req, res) => {
    try {
        const query = `
            SELECT s.*, p.name AS product_name
            FROM sales s
            JOIN products p ON s.product_id = p.id
            ORDER BY s.sale_date DESC
        `;
        const [sales] = await pool.query(query);
        res.status(200).json({
            success: true,
            data: sales
        });
    } catch (error) {
        console.error('Error fetching sales summary:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy dữ liệu doanh số bán hàng'
        });
    }
};

exports.createSale = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { product_id, quantity, unit_price, total_amount, sale_date } = req.body;
        await connection.beginTransaction();
        const [result] = await connection.query(
            'INSERT INTO sales (product_id, quantity, unit_price, total_amount, sale_date) VALUES (?, ?, ?, ?, ?)',
            [product_id, quantity, unit_price, total_amount, sale_date || new Date()]
        );
        await connection.query( 
            'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
            [quantity, product_id]
        );
        await connection.commit();
        res.status(201).json({
            success: true,
            message: 'Doanh số bán hàng đã được tạo thành công'
        });
        // Ghi log hành động
        await logAction(req.user.id,
            'CREATE_SALE',
            `Tạo doanh số bán hàng cho sản phẩm ID: ${product_id} với số lượng: ${quantity}`,
            'sales',
            result.insertId,
            req.ip
        );
    } catch (error) {
        await connection.rollback();
        console.error('Error creating sale:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo doanh số bán hàng'
        });
    } finally {
        connection.release();
    }
};

// Task FE-06: Đọc file CSV hóa đơn bán hàng và nạp hàng loạt vào MySQL
exports.importSalesCSV = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn file CSV để tải lên.' });
    }

    const filePath = req.file.path;
    const connection = await pool.getConnection();

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split(/\r?\n/);
        
        await connection.beginTransaction();
        let insertedCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; 

            const values = line.split(',');
            const [sale_date, product_id, quantity, unit_price] = values;
            
            // Ép kiểu dữ liệu để tính toán tránh lỗi SQL
            const qty = parseInt(quantity);
            const price = parseFloat(unit_price);
            const total_amount = qty * price;

            // Chèn dữ liệu thật vào DB
            await connection.query(
                'INSERT INTO sales (sale_date, product_id, quantity, unit_price, total_amount) VALUES (?, ?, ?, ?, ?)',
                [sale_date, product_id, qty, price, total_amount]
            );
            
            // CỘNG THÊM: Tự động trừ kho của sản phẩm khi import hàng loạt (Logic ERP chuẩn)
            await connection.query(
                'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
                [qty, product_id]
            );
            
            insertedCount++;
        }

        await connection.commit();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        res.status(200).json({ 
            success: true, 
            message: `Import dữ liệu thành công! Đã nạp ${insertedCount} hóa đơn vào hệ thống.`,
            insertedCount 
        });
        // Ghi log hành động
        await logAction(req.user.id,
            'IMPORT_SALES_CSV',
            `Import file CSV doanh số bán hàng với ${insertedCount} bản ghi.`,
            'sales',
            id,
            req.ip
        );
    } catch (error) {
        await connection.rollback();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error('Lỗi Backend importSalesCSV:', error);
        res.status(500).json({ success: false, message: 'Cấu trúc file CSV không hợp lệ hoặc lỗi kết nối Database.' });
    } finally {
        connection.release();
    }
};