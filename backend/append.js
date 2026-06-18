const fs = require('fs');
let code = fs.readFileSync('src/controllers/purchaseController.js', 'utf8');
code += `\nexports.cancelPurchase = async (req, res) => {
  const { id } = req.params;
  try {
    const [orders] = await pool.query('SELECT * FROM purchase_orders WHERE po_id = ?', [id]);
    if (orders.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    const order = orders[0];
    const statusMap = { draft: 'Draft', pending: 'Pending', approved: 'Approved', shipped: 'Shipped', received: 'Received', completed: 'Received', cancelled: 'Cancelled', canceled: 'Cancelled' };
    const currentStatus = statusMap[String(order.status).toLowerCase()] || order.status;

    if (currentStatus === 'Received') {
      return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng đã nhập kho' });
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
`;
fs.writeFileSync('src/controllers/purchaseController.js', code, 'utf8');
