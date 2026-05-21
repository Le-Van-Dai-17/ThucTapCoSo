const { pool } = require('../db');
exports.getSalesSummary = async (req, res) => {
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
        await connection.query(
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
exports.importSalesCSV = async (req, res) => {
    // Tạm thời trả về thành công để Frontend của bạn test giao diện loading/thành công
    return res.status(200).json({ 
        success: true, 
        message: "Đã giả lập nhận file CSV và import thành công 50 dòng sales!" 
    });
};

// Task FE-06: Đọc file CSV hóa đơn bán hàng và nạp hàng loạt vào MySQL
exports.importSalesCSV = async (req, res) => {
    // 1. Kiểm tra xem Frontend đã truyền file lên chưa
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn file CSV để tải lên.' });
    }

    const filePath = req.file.path;
    const connection = await pool.getConnection();

    try {
        // 2. Đọc toàn bộ nội dung file CSV dưới dạng văn bản (text)
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Tách file thành các dòng dựa vào dấu xuống dòng
        const lines = fileContent.split(/\r?\n/);
        
        // Lấy dòng đầu tiên làm Header (ví dụ: sale_date,product_id,quantity,unit_price)
        const headers = lines[0].split(',');

        await connection.beginTransaction();
        let insertedCount = 0;

        // 3. Duyệt qua từng dòng dữ liệu (bỏ qua dòng tiêu đề i = 0)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Bỏ qua dòng trống

            const values = line.split(',');
            
            // Giả định cấu trúc file CSV chuẩn: sale_date, product_id, quantity, unit_price
            const [sale_date, product_id, quantity, unit_price] = values;
            const total_amount = parseFloat(quantity) * parseFloat(unit_price);

            // Nạp trực tiếp dòng dữ liệu này vào bảng doanh thu (sales) thật trong DB
            await connection.query(
                'INSERT INTO sales (sale_date, product_id, quantity, unit_price, total_amount) VALUES (?, ?, ?, ?, ?)',
                [sale_date, product_id, quantity, unit_price, total_amount]
            );
            insertedCount++;
        }

        await connection.commit();

        // 4. Xóa file tạm sau khi đã nạp xong vào database để sạch bộ nhớ server
        fs.unlinkSync(filePath);

        res.status(200).json({ 
            success: true, 
            message: `Import dữ liệu thành công! Đã nạp ${insertedCount} hóa đơn vào hệ thống.`,
            insertedCount 
        });

    } catch (error) {
        await connection.rollback();
        // Nếu có lỗi, vẫn phải xóa file tạm để tránh rác server
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        console.error('Lỗi Backend importSalesCSV:', error);
        res.status(500).json({ success: false, message: 'Cấu trúc file CSV không hợp lệ hoặc lỗi kết nối Database.' });
    } finally {
        connection.release();
    }
};