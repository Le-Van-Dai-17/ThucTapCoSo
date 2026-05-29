const { pool } = require('../db');
const {
  getActorId,
  parseNonNegativeNumber,
  parsePositiveNumber,
  safeLogAction
} = require('../utils/controllerUtils');

const normalizeStatus = (status) => {
  if (!status) return 'Draft';
  const value = String(status).trim().toLowerCase();
  const statusMap = {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    shipped: 'Shipped',
    received: 'Received',
    completed: 'Received',
    cancelled: 'Cancelled',
    canceled: 'Cancelled'
  };
  return statusMap[value] || status;
};

const isLockedStatus = (status) => {
  return ['Received', 'Cancelled'].includes(normalizeStatus(status));
};

const generatePoCode = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Date.now()).slice(-5);
  return `PO-${year}${month}${day}-${random}`;
};

const getSupplierId = async (connection, supplierId, supplierName) => {
  if (supplierId) {
    const [rows] = await connection.query(
      'SELECT supplier_id FROM suppliers WHERE supplier_id = ? LIMIT 1',
      [supplierId]
    );
    if (rows.length === 0) {
      const error = new Error('Không tìm thấy nhà cung cấp');
      error.statusCode = 404;
      throw error;
    }
    return Number(supplierId);
  }

  if (supplierName && String(supplierName).trim() !== '') {
    const name = String(supplierName).trim();
    const [rows] = await connection.query(
      'SELECT supplier_id FROM suppliers WHERE LOWER(name) = LOWER(?) LIMIT 1',
      [name]
    );
    if (rows.length > 0) return rows[0].supplier_id;

    const [result] = await connection.query('INSERT INTO suppliers (name) VALUES (?)', [name]);
    return result.insertId;
  }
  const error = new Error('Thiếu nhà cung cấp');
  error.statusCode = 400;
  throw error;
};

const validateItems = (items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    const error = new Error('Đơn nhập hàng phải có ít nhất một sản phẩm');
    error.statusCode = 400;
    throw error;
  }
  for (const item of items) {
    const productId = item.product_id || item.id;
    const orderedQuantity = Number(item.ordered_quantity ?? item.quantity ?? item.forecasted_quantity ?? 0);
    if (!productId || !Number.isFinite(orderedQuantity) || orderedQuantity <= 0) {
      const error = new Error('Mỗi sản phẩm phải có product_id và số lượng hợp lệ');
      error.statusCode = 400;
      throw error;
    }
  }
};

const insertPoItems = async (connection, poId, items) => {
  let totalValue = 0;
  for (const item of items) {
    const productId = item.product_id || item.id;
    const orderedQuantity = parsePositiveNumber(item.ordered_quantity ?? item.quantity ?? item.forecasted_quantity, 'ordered_quantity');
    const forecastedQuantity = parseNonNegativeNumber(item.forecasted_quantity ?? item.predicted_quantity ?? orderedQuantity, 'forecasted_quantity');
    const receivedQuantity = parseNonNegativeNumber(item.received_quantity, 'received_quantity');
    const unitCost = parseNonNegativeNumber(item.unit_cost ?? item.unit_price ?? item.cost_price, 'unit_cost');
    const lineTotal = item.line_total === undefined || item.line_total === null || item.line_total === ''
      ? orderedQuantity * unitCost
      : parseNonNegativeNumber(item.line_total, 'line_total');

    const forecastId = item.forecast_id || null;
    totalValue += lineTotal;

    await connection.query(
      `
      INSERT INTO po_items (po_id, product_id, forecast_id, forecasted_quantity, ordered_quantity, received_quantity, unit_cost, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [poId, productId, forecastId, forecastedQuantity, orderedQuantity, receivedQuantity, unitCost, lineTotal]
    );
  }
  await connection.query('UPDATE purchase_orders SET total_value = ? WHERE po_id = ?', [totalValue, poId]);
  return totalValue;
};

exports.createPurchase = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { po_code, order_number, supplier_id, supplier_name, status, expected_delivery_date, items } = req.body;
    validateItems(items);
    await connection.beginTransaction();

    const supplierId = await getSupplierId(connection, supplier_id, supplier_name);
    const poCode = po_code || order_number || generatePoCode();
    const createdBy = getActorId(req);
    const orderStatus = normalizeStatus(status || 'Pending');

    const [result] = await connection.query(
      `
      INSERT INTO purchase_orders (po_code, supplier_id, created_by, status, expected_delivery_date, total_value)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [poCode, supplierId, createdBy, orderStatus, expected_delivery_date || null, 0]
    );

    const poId = result.insertId;
    const totalValue = await insertPoItems(connection, poId, items);
    await connection.commit();

    await safeLogAction(createdBy, 'CREATE_PURCHASE_ORDER', `Tạo đơn nhập hàng ${poCode}`, 'purchase_orders', poId, req.ip);

    res.status(201).json({
      success: true,
      message: 'Tạo đơn nhập hàng thành công',
      data: { id: poId, po_id: poId, po_code: poCode, total_value: totalValue }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating purchase:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Mã đơn nhập hàng đã tồn tại' });
    }
    res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Lỗi khi xử lý đơn nhập hàng' });
  } finally {
    connection.release();
  }
};

// BE-02: Phân quyền lọc danh sách đơn hàng cho Staff
exports.getPurchases = async (req, res) => {
  try {
    const userRole = String(req.user?.role || '').trim().toLowerCase();
    
    // Logic lọc động: Staff chỉ thấy đơn đã duyệt (Approved) hoặc đang giao (Shipped)
    let whereClause = '';
    if (userRole === 'staff') {
      whereClause = "WHERE LOWER(po.status) IN ('approved', 'shipped')";
    }

    const [purchases] = await pool.query(
      `
      SELECT
        po.po_id AS id, po.po_id, po.po_code, po.po_code AS order_number, po.supplier_id, s.name AS supplier_name,
        po.created_by, creator.full_name AS created_by_name, po.approved_by, approver.full_name AS approved_by_name,
        po.status, LOWER(po.status) AS status_key, po.order_date, po.expected_delivery_date, po.received_date,
        po.total_value, po.total_value AS total_amount, po.created_at, po.updated_at, COUNT(pi.po_item_id) AS item_count
      FROM purchase_orders po
      INNER JOIN suppliers s ON po.supplier_id = s.supplier_id
      LEFT JOIN users creator ON po.created_by = creator.user_id
      LEFT JOIN users approver ON po.approved_by = approver.user_id
      LEFT JOIN po_items pi ON po.po_id = pi.po_id
      ${whereClause}
      GROUP BY po.po_id, po.po_code, po.supplier_id, s.name, po.created_by, creator.full_name, po.approved_by, approver.full_name, po.status, po.order_date, po.expected_delivery_date, po.received_date, po.total_value, po.created_at, po.updated_at
      ORDER BY po.order_date DESC, po.po_id DESC
      `
    );

    res.status(200).json({ success: true, data: purchases });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đơn nhập hàng' });
  }
};

exports.getPurchasesDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = String(req.user?.role || '').trim().toLowerCase();

    // 1. Lấy trạng thái của đơn nhập hàng này trước để kiểm tra quyền truy cập
    const [orders] = await pool.query(
      'SELECT status FROM purchase_orders WHERE po_id = ? LIMIT 1',
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn nhập hàng' });
    }

    const orderStatus = String(orders[0].status).trim().toLowerCase();

    // 2. Chặn Staff xem chi tiết đơn nếu đơn đó thuộc trạng thái Draft/Pending/Cancelled/Received
    if (userRole === 'staff' && !['approved', 'shipped'].includes(orderStatus)) {
      return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem chi tiết đơn nhập hàng ở trạng thái này.'
      });
    }

    // 3. Nếu hợp lệ thì tiến hành lấy chi tiết mặt hàng như cũ
    const [details] = await pool.query(
      `
      SELECT pi.po_item_id AS id, pi.po_item_id, pi.po_id, pi.product_id, p.sku, p.name AS product_name, p.unit, pi.forecast_id, pi.forecasted_quantity, pi.ordered_quantity, pi.ordered_quantity AS quantity, pi.received_quantity, pi.unit_cost, pi.unit_cost AS unit_price, pi.line_total, pi.line_total AS total_amount
      FROM po_items pi
      INNER JOIN products p ON pi.product_id = p.product_id
      WHERE pi.po_id = ?
      ORDER BY pi.po_item_id ASC
      `,
      [id]
    );
    res.status(200).json({ success: true, data: details });
  } catch (error) {
    console.error('Error fetching purchase details:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết đơn nhập hàng' });
  }
};

// BE-03: Xác nhận nhập kho chuẩn chỉnh, chặn đơn chưa Approved/Shipped
exports.receiveOrder = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.query('SELECT * FROM purchase_orders WHERE po_id = ? FOR UPDATE', [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn nhập hàng này' });
    }

    const order = orders[0];
    const currentStatus = normalizeStatus(order.status);

    // Chặt chẽ theo BA v13: Chỉ nhận đơn Approved hoặc Shipped
    if (!['Approved', 'Shipped'].includes(currentStatus)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Chỉ được xác nhận nhập kho với đơn đã được duyệt hoặc đang giao.'
      });
    }

    const [details] = await connection.query('SELECT po_item_id, product_id, ordered_quantity, received_quantity FROM po_items WHERE po_id = ? FOR UPDATE', [id]);
    if (details.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Đơn nhập hàng không có sản phẩm' });
    }

    for (const item of details) {
      const quantityToReceive = Number(item.ordered_quantity);

      // Cập nhật số lượng thực nhận bằng số lượng đặt
      await connection.query('UPDATE po_items SET received_quantity = ? WHERE po_item_id = ?', [quantityToReceive, item.po_item_id]);

      // Tăng tồn kho của sản phẩm trong bảng products
      await connection.query('UPDATE products SET current_stock = current_stock + ? WHERE product_id = ?', [quantityToReceive, item.product_id]);
    }

    // Chuyển trạng thái đơn sang Received và đóng mốc thời gian nhận hàng
    await connection.query("UPDATE purchase_orders SET status = 'Received', received_date = CURRENT_TIMESTAMP WHERE po_id = ?", [id]);

    await connection.commit();
    await safeLogAction(getActorId(req), 'RECEIVE_PURCHASE_ORDER', `Xác nhận nhập kho thành công cho đơn PO ID: ${id}`, 'purchase_orders', id, req.ip);

    res.status(200).json({ success: true, message: 'Xác nhận nhập hàng và cập nhật tồn kho thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Error receiving purchase:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xử lý xác nhận nhập kho' });
  } finally {
    connection.release();
  }
};

exports.updatePurchase = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    const { po_code, order_number, supplier_id, supplier_name, status, expected_delivery_date, items } = req.body;
    await connection.beginTransaction();

    const [orders] = await connection.query('SELECT * FROM purchase_orders WHERE po_id = ? FOR UPDATE', [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const order = orders[0];
    if (normalizeStatus(order.status) === 'Received') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Không thể sửa đơn hàng đã nhập kho' });
    }

    const updates = [];
    const values = [];

    if (po_code !== undefined || order_number !== undefined) {
      updates.push('po_code = ?');
      values.push(po_code || order_number);
    }
    if (supplier_id !== undefined || supplier_name !== undefined) {
      const supplierId = await getSupplierId(connection, supplier_id, supplier_name);
      updates.push('supplier_id = ?');
      values.push(supplierId);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(normalizeStatus(status));
    }
    if (expected_delivery_date !== undefined) {
      updates.push('expected_delivery_date = ?');
      values.push(expected_delivery_date || null);
    }

    if (updates.length > 0) {
      values.push(id);
      await connection.query(`UPDATE purchase_orders SET ${updates.join(', ')} WHERE po_id = ?`, values);
    }

    if (items !== undefined) {
      validateItems(items);
      await connection.query('DELETE FROM po_items WHERE po_id = ?', [id]);
      await insertPoItems(connection, id, items);
    }

    await connection.commit();
    await safeLogAction(getActorId(req), 'UPDATE_PURCHASE_ORDER', `Cập nhật đơn nhập hàng ID: ${id}`, 'purchase_orders', id, req.ip);
    res.status(200).json({ success: true, message: 'Cập nhật đơn hàng thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating purchase:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Mã đơn nhập hàng đã tồn tại' });
    }
    res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Lỗi cập nhật đơn hàng' });
  } finally {
    connection.release();
  }
};

exports.deletePurchase = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query('SELECT * FROM purchase_orders WHERE po_id = ? FOR UPDATE', [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const order = orders[0];
    if (isLockedStatus(order.status)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Không thể xóa đơn hàng đã nhập kho hoặc đã hủy' });
    }

    await connection.query('DELETE FROM purchase_orders WHERE po_id = ?', [id]);
    await connection.commit();
    await safeLogAction(getActorId(req), 'DELETE_PURCHASE_ORDER', `Xóa đơn nhập hàng ID: ${id}`, 'purchase_orders', id, req.ip);
    res.status(200).json({ success: true, message: 'Đã xóa đơn hàng thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting purchase:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa đơn hàng' });
  } finally {
    connection.release();
  }
};