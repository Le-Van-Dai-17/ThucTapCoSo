const { pool } = require('../db');

exports.createPurchase = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { order_number, supplier_name, status, total_amount, items } = req.body;
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO purchase_orders (order_number, supplier_name, status, total_amount) VALUES (?, ?, ?, ?)',
      [order_number, supplier_name, status || 'pending', total_amount]
    );
    const purchaseId = result.insertId;
    for (const item of items) {
      const { product_id, quantity, unit_price } = item;
      await connection.query(
        'INSERT INTO purchase_order_details (order_id, product_id, quantity, unit_price, total_amount) VALUES (?, ?, ?, ?, ?)',
        [purchaseId, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
      );

      if (status === 'completed') {
        await connection.query(
          'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
          [quantity, product_id]
        );
      }
    }
    await connection.commit();
    res.status(201).json({ success: true, message: 'Nhập hàng thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating purchase:', error);
    res.status(500).json({
        success: false,
        message: 'Lỗi khi xử lý đơn nhập hàng'
    });
  } finally {
    connection.release();
  }
};

exports.getPurchases = async (req, res) => {
    try {
        const [purchases] = await pool.query('SELECT * FROM purchase_orders ORDER BY status DESC');
        res.status(200).json({ success: true, data: purchases });
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách đơn nhập hàng'
        });
    }
};

exports.getPurchasesDetail = async (req, res) => {
     try {
        const { id } = req.params;
        const [details] = await pool.query(
            'SELECT pod.*, p.name AS product_name FROM purchase_order_details pod JOIN products p ON pod.product_id = p.id WHERE pod.order_id = ?', [id]
        );
        res.status(200).json({ success: true, data: details });
    } catch (error) {
        console.error('Error fetching purchase details:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy chi tiết đơn nhập hàng'
        });
    }
};

exports.receiveOrder = async (req, res) => {
  const { id } = req.params; // ID của đơn hàng cần xác nhận
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. Kiểm tra đơn hàng có tồn tại và đang ở trạng thái xử lý không
    const [orders] = await connection.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn nhập hàng này' });
    }

    const order = orders[0];
    if (order.status === 'completed') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Đơn hàng này đã được nhập kho từ trước' });
    }

    // 2. Cập nhật trạng thái của đơn hàng chính sang 'completed'
    await connection.query(
      'UPDATE purchase_orders SET status = ? WHERE id = ?',
      ['completed', id]
    );

    // 3. Lấy toàn bộ danh sách sản phẩm thuộc đơn hàng này từ bảng chi tiết (giống hàm getPurchasesDetail của bạn)
    const [details] = await connection.query(
      'SELECT product_id, quantity FROM purchase_order_details WHERE order_id = ?',
      [id]
    );

    // 4. Chạy vòng lặp cộng số lượng nhập vào kho tồn hiện tại của từng sản phẩm
    for (const item of details) {
      const { product_id, quantity } = item;
      await connection.query(
        'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
        [quantity, product_id]
      );
    }

    await connection.commit();
    res.status(200).json({ success: true, message: 'Xác nhận nhập hàng và cập nhật tồn kho thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Error receiving purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý xác nhận nhập kho'
    });
  } finally {
    connection.release();
  }
};