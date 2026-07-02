
const mysql = require('mysql2/promise');
async function test() {
    const conn = await mysql.createConnection({host:'localhost', user:'root', database:'forecastai_v3'});
    let conditions = [];
    conditions.push(LOWER(po.status) IN ('approved', 'shipped', 'completed', 'received'));
    const whereClause = 'WHERE ' + conditions.join(' AND ');
    const query = \
      SELECT
        po.po_id AS id, po.po_id, po.po_code, po.po_code AS order_number, po.supplier_id, s.name AS supplier_name,
        po.created_by, creator.full_name AS created_by_name, po.approved_by, approver.full_name AS approved_by_name,
        (SELECT u.full_name FROM activity_logs al JOIN users u ON al.user_id = u.user_id WHERE al.entity_type = 'purchase_orders' AND al.entity_id = po.po_id AND al.action = 'RECEIVE_PURCHASE_ORDER' ORDER BY al.log_id DESC LIMIT 1) AS receiver_name,
        po.status, LOWER(po.status) AS status_key, po.order_date, po.expected_delivery_date, po.received_date,
        po.total_value, po.total_value AS total_amount, po.created_at, po.updated_at, po.staff_note, COUNT(pi.po_item_id) AS item_count,
        CASE WHEN SUM(CASE WHEN pi.forecasted_quantity IS NOT NULL AND pi.forecasted_quantity > 0 THEN 1 ELSE 0 END) > 0 THEN 'AI Forecast' ELSE 'Manual' END AS source
      FROM purchase_orders po
      INNER JOIN suppliers s ON po.supplier_id = s.supplier_id
      LEFT JOIN users creator ON po.created_by = creator.user_id
      LEFT JOIN users approver ON po.approved_by = approver.user_id
      LEFT JOIN po_items pi ON po.po_id = pi.po_id
      \
      GROUP BY po.po_id, po.po_code, po.supplier_id, s.name, po.created_by, creator.full_name, po.approved_by, approver.full_name, po.status, po.order_date, po.expected_delivery_date, po.received_date, po.total_value, po.created_at, po.updated_at, po.staff_note
      ORDER BY po.order_date DESC, po.po_id DESC
    \;
    try {
        const [rows] = await conn.query(query);
        console.log('SUCCESS', rows.length);
    } catch(err) {
        console.log('SQL ERROR:', err.message);
    }
    conn.end();
}
test();

