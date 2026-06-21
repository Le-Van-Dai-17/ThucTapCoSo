const { pool } = require('../db');
const { getActorId, parseNonNegativeNumber, parsePositiveNumber, safeLogAction } = require('../utils/controllerUtils');

const normalizeStatus = (status) => {
  if (!status) return 'Draft';
  const value = String(status).trim().toLowerCase();
  const statusMap = {
    draft: 'Draft', pending: 'Pending', approved: 'Approved', shipped: 'Shipped', received: 'Completed', completed: 'Completed', cancelled: 'Cancelled', canceled: 'Cancelled'
  };
  return statusMap[value] || status;
};

// BE-05: Định nghĩa danh sách các trạng thái bị khóa cứng (Không cho sửa hoặc xóa)
const isLockedStatus = (status) => {
  return ['Approved', 'Shipped', 'Completed', 'Cancelled'].includes(normalizeStatus(status));
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
    const [rows] = await connection.query('SELECT supplier_id FROM suppliers WHERE supplier_id = ? LIMIT 1', [supplierId]);
    if (rows.length === 0) {
      const error = new Error('Không tìm thấy nhà cung cấp'); error.statusCode = 404; throw error;
    }
    return Number(supplierId);
  }
  if (supplierName && String(supplierName).trim() !== '') {
    const name = String(supplierName).trim();
    const [rows] = await connection.query('SELECT supplier_id FROM suppliers WHERE LOWER(name) = LOWER(?) LIMIT 1', [name]);
    if (rows.length > 0) return rows[0].supplier_id;

    const [result] = await connection.query('INSERT INTO suppliers (name) VALUES (?)', [name]);
    return result.insertId;
  }
  const error = new Error('Thiếu nhà cung cấp'); error.statusCode = 400; throw error;
};

const validateItems = (items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    const error = new Error('Đơn nhập hàng phải có ít nhất một sản phẩm'); error.statusCode = 400; throw error;
  }
  for (const item of items) {
    const productId = item.product_id || item.id;
    const orderedQuantity = Number(item.ordered_quantity ?? item.quantity ?? item.forecasted_quantity ?? 0);
    if (!productId || !Number.isFinite(orderedQuantity) || orderedQuantity <= 0) {
      const error = new Error('Mỗi sản phẩm phải có product_id và số lượng hợp lệ'); error.statusCode = 400; throw error;
    }
  }
};

const insertPoItems = async (connection, poId, items) => {
  let totalValue = 0;
  for (const item of items) {
    const productId = item.product_id || item.id;
    const orderedQuantity = parsePositiveNumber(item.ordered_quantity ?? item.quantity ?? item.forecasted_quantity, 'ordered_quantity');
    const forecastedQuantity = parseNonNegativeNumber(item.forecasted_quantity ?? item.predicted_quantity ?? orderedQuantity, 'forecasted_quantity');
    const receivedQuantity = parseNonNegativeNumber(item.received_quantity, 'received_quantity', 0);
    const unitCost = parseNonNegativeNumber(item.unit_cost ?? item.unit_price ?? item.cost_price, 'unit_cost');
    const lineTotal = item.line_total === undefined || item.line_total === null || item.line_total === '' ? orderedQuantity * unitCost : parseNonNegativeNumber(item.line_total, 'line_total');

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
    const { po_code, order_number, supplier_id, supplier_name, expected_delivery_date, status, items } = req.body;
    validateItems(items);
    await connection.beginTransaction();

    const supplierId = await getSupplierId(connection, supplier_id, supplier_name);
    const poCode = po_code || order_number || generatePoCode();
    const createdBy = getActorId(req);
    const orderStatus = normalizeStatus(status || 'Draft');

    const [result] = await connection.query(
      `INSERT INTO purchase_orders (po_code, supplier_id, created_by, status, expected_delivery_date, total_value) VALUES (?, ?, ?, ?, ?, ?)`,
      [poCode, supplierId, createdBy, orderStatus, expected_delivery_date || null, 0]
    );

    const poId = result.insertId;
    const totalValue = await insertPoItems(connection, poId, items, supplierId);
    await connection.commit();

    await safeLogAction(createdBy, 'CREATE_PURCHASE_ORDER', `Tạo đơn nhập hàng ${poCode}`, 'purchase_orders', poId, req.ip);
    res.status(201).json({ success: true, message: 'Tạo đơn nhập hàng thành công', data: { id: poId, po_id: poId, po_code: poCode, total_value: totalValue } });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating purchase:', error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Mã đơn nhập hàng đã tồn tại' });
    res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Lỗi khi xử lý đơn nhập hàng' });
  } finally {
    connection.release();
  }
};

exports.getPurchases = async (req, res) => {
  try {
    const userRole = String(req.user?.role || '').trim().toLowerCase();
    let whereClause = '';
    if (userRole === 'staff') {
      whereClause = "WHERE LOWER(po.status) IN ('approved', 'shipped', 'completed')";
    }

    const [purchases] = await pool.query(
      `
      SELECT
        po.po_id AS id, po.po_id, po.po_code, po.po_code AS order_number, po.supplier_id, s.name AS supplier_name,
        po.created_by, creator.full_name AS created_by_name, po.approved_by, approver.full_name AS approved_by_name,
        po.status, LOWER(po.status) AS status_key, po.order_date, po.expected_delivery_date, po.received_date,
        po.total_value, po.total_value AS total_amount, po.created_at, po.updated_at, COUNT(pi.po_item_id) AS item_count,
        CASE WHEN SUM(CASE WHEN pi.forecasted_quantity IS NOT NULL AND pi.forecasted_quantity > 0 THEN 1 ELSE 0 END) > 0 THEN 'AI Forecast' ELSE 'Manual' END AS source
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

    const [orders] = await pool.query('SELECT status FROM purchase_orders WHERE po_id = ? LIMIT 1', [id]);
    if (orders.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn nhập hàng' });

    const orderStatus = String(orders[0].status).trim().toLowerCase();
    if (userRole === 'staff' && !['approved', 'shipped'].includes(orderStatus)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem chi tiết đơn nhập hàng ở trạng thái này.' });
    }

    const [details] = await pool.query(
      `
      SELECT
        pi.po_item_id AS id, pi.po_item_id, pi.po_id, pi.product_id, p.sku, p.name AS product_name, p.unit,
        pi.forecast_id, pi.forecasted_quantity, pi.ordered_quantity, pi.ordered_quantity AS quantity,
        pi.received_quantity, pi.unit_cost, pi.unit_cost AS unit_price, pi.line_total, pi.line_total AS total_amount
      FROM po_items pi
      INNER JOIN products p ON pi.product_id = p.product_id
      WHERE pi.po_id = ? ORDER BY pi.po_item_id ASC
      `, [id]
    );
    res.status(200).json({ success: true, data: details });
  } catch (error) {
    console.error('Error fetching purchase details:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết đơn nhập hàng' });
  }
};

// BE-04: API Phê duyệt đơn dành cho Manager
exports.approvePurchase = async (req, res) => {
  const { id } = req.params;
  try {
    const managerId = getActorId(req);
    const [result] = await pool.query(
      `UPDATE purchase_orders SET status = 'Approved', approved_by = ? WHERE po_id = ? AND status = 'Pending'`,
      [managerId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Không thể duyệt đơn. Đơn phải ở trạng thái Chờ duyệt (Pending).' });
    }

    await safeLogAction(managerId, 'APPROVE_PURCHASE_ORDER', `Manager phê duyệt đơn nhập hàng ID: ${id}`, 'purchase_orders', id, req.ip);
    res.status(200).json({ success: true, message: 'Đơn nhập hàng đã được phê duyệt thành công!' });
  } catch (error) {
    console.error('Error approving purchase:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi duyệt đơn hàng' });
  }
};

// Thêm hàm chuyển trạng thái từ Approved sang Shipped
exports.shipPurchase = async (req, res) => {
  const { id } = req.params;
  try {
    const actorId = getActorId(req);
    const [result] = await pool.query(
      `UPDATE purchase_orders SET status = 'Shipped' WHERE po_id = ? AND status = 'Approved'`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể chuyển sang Đang giao (Shipped) khi đơn hàng đã được Duyệt (Approved).' });
    }

    await safeLogAction(actorId, 'SHIP_PURCHASE_ORDER', `Chuyển đơn hàng ID: ${id} sang trạng thái Đang giao`, 'purchase_orders', id, req.ip);
    res.status(200).json({ success: true, message: 'Cập nhật trạng thái Đang giao thành công!' });
  } catch (error) {
    console.error('Error shipping purchase:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi chuyển trạng thái Đang giao' });
  }
};

// BE-03: Cho phép Staff truyền mảng items chứa số lượng thực nhận lên để kiểm kho thực tế
exports.receiveOrder = async (req, res) => {
  const { id } = req.params;
  const { items } = req.body; // Cấu trúc mong đợi: items = [{ product_id: 1, received_quantity: 45 }]
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Vui lòng truyền danh sách số lượng thực nhận của các sản phẩm.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.query('SELECT * FROM purchase_orders WHERE po_id = ? FOR UPDATE', [id]);
    if (orders.length === 0) {
      await connection.rollback(); return res.status(404).json({ success: false, message: 'Không tìm thấy đơn nhập hàng này' });
    }

    const order = orders[0];
    const currentStatus = normalizeStatus(order.status);

    if (currentStatus === 'Completed') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Đơn nhập hàng này đã được hoàn thành trước đó rồi. Không thể nhận hai lần.' });
    }

    if (currentStatus !== 'Approved' && currentStatus !== 'Shipped') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Chỉ có thể hoàn thành cho các đơn hàng đã duyệt (Approved) hoặc đang giao (Shipped).' });
    }

    for (const item of items) {
      const productId = item.product_id;
      const receivedQuantity = Number(item.received_quantity);

      if (!productId || Number.isNaN(receivedQuantity) || receivedQuantity < 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Số lượng thực nhận phải là số nguyên không âm hợp lệ.' });
      }

      // Cập nhật số lượng thực nhận thực tế do Staff nhập vào hệ thống bảng po_items
      const [updateItem] = await connection.query(
        'UPDATE po_items SET received_quantity = ? WHERE po_id = ? AND product_id = ?',
        [receivedQuantity, id, productId]
      );

      if (updateItem.affectedRows > 0) {
        // Tăng số lượng tồn kho vật lý tương ứng trong bảng products
        await connection.query('UPDATE products SET current_stock = current_stock + ? WHERE product_id = ?', [receivedQuantity, productId]);
      }
    }

    await connection.query("UPDATE purchase_orders SET status = 'Completed', received_date = CURRENT_TIMESTAMP WHERE po_id = ?", [id]);
    await connection.commit();

    await safeLogAction(getActorId(req), 'RECEIVE_PURCHASE_ORDER', `Staff xác nhận nhập kho thực tế thành công cho đơn PO ID: ${id}`, 'purchase_orders', id, req.ip);
    res.status(200).json({ success: true, message: 'Xác nhận nhập hàng thực tế và cập nhật tồn kho thành công' });
  } catch (error) {
    await connection.rollback(); console.error('Error receiving purchase:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xử lý xác nhận nhập kho' });
  } finally {
    connection.release();
  }
};

// BE-05: Chặn tuyệt đối không cho sửa đơn khi đã Approved / Shipped / Received
exports.updatePurchase = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    const { supplier_id, supplier_name, status, expected_delivery_date, items } = req.body;
    await connection.beginTransaction();

    const [orders] = await connection.query('SELECT * FROM purchase_orders WHERE po_id = ? FOR UPDATE', [id]);
    if (orders.length === 0) {
      await connection.rollback(); return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const order = orders[0];
    if (isLockedStatus(order.status)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Không thể chỉnh sửa đơn nhập hàng khi đã ở trạng thái: ${order.status}` });
    }

    const updates = []; const values = [];
    if (supplier_id !== undefined || supplier_name !== undefined) {
      const supplierId = await getSupplierId(connection, supplier_id, supplier_name);
      updates.push('supplier_id = ?'); values.push(supplierId);
    }
    if (status !== undefined) {
      updates.push('status = ?'); values.push(normalizeStatus(status));
    }
    if (expected_delivery_date !== undefined) {
      updates.push('expected_delivery_date = ?'); values.push(expected_delivery_date || null);
    }

    if (updates.length > 0) {
      values.push(id); await connection.query(`UPDATE purchase_orders SET ${updates.join(', ')} WHERE po_id = ?`, values);
    }
    if (items !== undefined) {
      validateItems(items); await connection.query('DELETE FROM po_items WHERE po_id = ?', [id]); await insertPoItems(connection, id, items, order.supplier_id);
    }

    await connection.commit();
    await safeLogAction(getActorId(req), 'UPDATE_PURCHASE_ORDER', `Cập nhật đơn nhập hàng ID: ${id}`, 'purchase_orders', id, req.ip);
    res.status(200).json({ success: true, message: 'Cập nhật đơn hàng thành công' });
  } catch (error) {
    await connection.rollback(); console.error('Error updating purchase:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật đơn hàng' });
  } finally {
    connection.release();
  }
};

// BE-05: Chặn tuyệt đối không cho xóa đơn khi đã Approved / Shipped / Received
exports.deletePurchase = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query('SELECT * FROM purchase_orders WHERE po_id = ? FOR UPDATE', [id]);
    if (orders.length === 0) {
      await connection.rollback(); return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const order = orders[0];
    if (isLockedStatus(order.status)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Không thể xóa đơn nhập hàng khi đã ở trạng thái: ${order.status}` });
    }

    await connection.query('UPDATE purchase_orders SET status = "Cancelled" WHERE po_id = ?', [id]);
    await connection.commit();
    await safeLogAction(getActorId(req), 'DELETE_PURCHASE_ORDER', `Hủy đơn nhập hàng ID: ${id} (Soft Delete)`, 'purchase_orders', id, req.ip);
    res.status(200).json({ success: true, message: 'Đã hủy đơn hàng thành công' });
  } catch (error) {
    await connection.rollback(); console.error('Error deleting purchase:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa đơn hàng' });
  } finally {
    connection.release();
  }
};

exports.cancelPurchase = async (req, res) => {
  const { id } = req.params;
  try {
    const [orders] = await pool.query('SELECT * FROM purchase_orders WHERE po_id = ?', [id]);
    if (orders.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    const order = orders[0];
    const statusMap = { draft: 'Draft', pending: 'Pending', approved: 'Approved', shipped: 'Shipped', received: 'Completed', completed: 'Completed', cancelled: 'Cancelled', canceled: 'Cancelled' };
    const currentStatus = statusMap[String(order.status).toLowerCase()] || order.status;

    if (currentStatus === 'Completed') {
      return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng đã hoàn thành' });
    }
    if (currentStatus === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Đơn hàng đã bị hủy trước đó' });
    }

    await pool.query('UPDATE purchase_orders SET status = ? WHERE po_id = ?', ['Cancelled', id]);
    await safeLogAction(getActorId(req), 'CANCEL_PURCHASE', 'Hủy đơn nhập hàng ID: ' + id, 'purchase_orders', id, req.ip);

    res.status(200).json({ success: true, message: 'Đã hủy đơn hàng thành công' });
  } catch (error) {
    console.error('Error cancelling purchase:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi hủy đơn hàng' });
  }
};

const normalizeForecastTargetPeriod = (targetPeriod) => {
  if (!targetPeriod) {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }
  if (/^\d{4}-\d{2}$/.test(String(targetPeriod))) return `${targetPeriod}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(targetPeriod))) return String(targetPeriod);
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const addDays = (baseDate, days) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const generateAiPoCode = (supplierId) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Date.now()).slice(-5);
  return `PO-AI-${year}${month}${day}-${supplierId}-${random}`;
};

const getLatestRecommendationRows = async (connection, targetPeriod, forecastIds = []) => {
  const values = [targetPeriod];
  let forecastFilterSql = '';

  if (Array.isArray(forecastIds) && forecastIds.length > 0) {
    forecastFilterSql = 'AND df.forecast_id IN (?)';
    values.push(forecastIds.map(Number).filter(Number.isFinite));
  }

  const [rows] = await connection.query(
    `
    SELECT
      df.forecast_id,
      df.product_id,
      df.target_period,
      df.predicted_quantity,
      df.recommended_order,
      p.sku,
      p.name AS product_name,
      p.current_stock,
      p.warning_stock_level,
      p.cost_price,
      p.supplier_id,
      s.name AS supplier_name,
      IFNULL(s.lead_time_days, 7) AS lead_time_days
    FROM demand_forecasts df
    INNER JOIN (
      SELECT product_id, target_period, MAX(forecast_id) AS forecast_id
      FROM demand_forecasts
      WHERE target_period = ?
      GROUP BY product_id, target_period
    ) latest
      ON latest.forecast_id = df.forecast_id
    INNER JOIN products p
      ON p.product_id = df.product_id
    INNER JOIN suppliers s
      ON s.supplier_id = p.supplier_id
    WHERE df.recommended_order > 0
      ${forecastFilterSql}
      AND NOT EXISTS (
        SELECT 1
        FROM po_items pi
        INNER JOIN purchase_orders po
          ON po.po_id = pi.po_id
        WHERE pi.forecast_id = df.forecast_id
          AND po.status <> 'Cancelled'
      )
    ORDER BY s.name ASC, p.name ASC
    `,
    values
  );

  return rows;
};

exports.getPurchaseRecommendations = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const targetPeriod = normalizeForecastTargetPeriod(req.query?.target_period);
    const rows = await getLatestRecommendationRows(connection, targetPeriod);
    const suppliers = new Map();

    rows.forEach(row => {
      const supplierId = row.supplier_id;
      if (!suppliers.has(supplierId)) {
        suppliers.set(supplierId, {
          supplier_id: supplierId,
          supplier_name: row.supplier_name,
          item_count: 0,
          total_quantity: 0,
          total_value: 0,
          max_lead_time_days: 0,
          items: []
        });
      }

      const group = suppliers.get(supplierId);
      const orderedQuantity = Number(row.recommended_order || 0);
      const unitCost = Number(row.cost_price || 0);
      const lineTotal = orderedQuantity * unitCost;

      group.item_count += 1;
      group.total_quantity += orderedQuantity;
      group.total_value += lineTotal;
      group.max_lead_time_days = Math.max(group.max_lead_time_days, Number(row.lead_time_days || 0));
      group.items.push({
        forecast_id: row.forecast_id,
        product_id: row.product_id,
        sku: row.sku,
        product_name: row.product_name,
        current_stock: Number(row.current_stock || 0),
        warning_stock_level: Number(row.warning_stock_level || 0),
        predicted_quantity: Number(row.predicted_quantity || 0),
        recommended_order: orderedQuantity,
        unit_cost: unitCost,
        line_total: lineTotal
      });
    });

    res.status(200).json({
      success: true,
      target_period: targetPeriod,
      data: Array.from(suppliers.values())
    });
  } catch (error) {
    console.error('Error fetching purchase recommendations:', error);
    res.status(500).json({ success: false, message: 'Loi lay de xuat nhap hang tu du bao' });
  } finally {
    connection.release();
  }
};

exports.createPurchaseOrdersFromForecast = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const targetPeriod = normalizeForecastTargetPeriod(req.body?.target_period);
    const forecastIds = Array.isArray(req.body?.forecast_ids) ? req.body.forecast_ids : [];
    const createdBy = getActorId(req);

    await connection.beginTransaction();
    const rows = await getLatestRecommendationRows(connection, targetPeriod, forecastIds);

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Khong co de xuat nhap hang kha dung de tao PO' });
    }

    const grouped = new Map();
    rows.forEach(row => {
      if (!grouped.has(row.supplier_id)) grouped.set(row.supplier_id, []);
      grouped.get(row.supplier_id).push(row);
    });

    const createdOrders = [];
    for (const [supplierId, items] of grouped.entries()) {
      const maxLeadTimeDays = Math.max(...items.map(item => Number(item.lead_time_days || 0)), 0);
      const expectedDeliveryDate = addDays(new Date(), maxLeadTimeDays);
      const poCode = generateAiPoCode(supplierId);

      const [poResult] = await connection.query(
        `INSERT INTO purchase_orders (po_code, supplier_id, created_by, status, expected_delivery_date, total_value)
         VALUES (?, ?, ?, 'Pending', ?, 0)`,
        [poCode, supplierId, createdBy, expectedDeliveryDate]
      );

      const poId = poResult.insertId;
      let totalValue = 0;

      for (const item of items) {
        const orderedQuantity = Number(item.recommended_order || 0);
        const forecastedQuantity = Number(item.predicted_quantity || 0);
        const unitCost = Number(item.cost_price || 0);
        const lineTotal = orderedQuantity * unitCost;
        totalValue += lineTotal;

        await connection.query(
          `INSERT INTO po_items (po_id, product_id, forecast_id, forecasted_quantity, ordered_quantity, received_quantity, unit_cost, line_total)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
          [poId, item.product_id, item.forecast_id, forecastedQuantity, orderedQuantity, unitCost, lineTotal]
        );
      }

      await connection.query('UPDATE purchase_orders SET total_value = ? WHERE po_id = ?', [totalValue, poId]);
      createdOrders.push({
        po_id: poId,
        id: poId,
        po_code: poCode,
        supplier_id: supplierId,
        supplier_name: items[0].supplier_name,
        status: 'Pending',
        expected_delivery_date: expectedDeliveryDate,
        item_count: items.length,
        total_value: totalValue
      });
    }

    await connection.commit();
    await safeLogAction(
      createdBy,
      'CREATE_PO_FROM_FORECAST',
      `Manager tao ${createdOrders.length} PO cho ky du bao ${targetPeriod}`,
      'purchase_orders',
      null,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Da tao PO cho tung nha cung cap va chuyen sang trang thai cho duyet',
      target_period: targetPeriod,
      data: createdOrders
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating POs from forecast:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Ma PO bi trung, vui long thu lai' });
    }
    res.status(500).json({ success: false, message: 'Loi tao PO tu de xuat du bao' });
  } finally {
    connection.release();
  }
};
