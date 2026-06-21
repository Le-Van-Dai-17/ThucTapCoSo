const { pool } = require('../db');

const getActorId = (req) => req.user?.user_id || req.user?.id || null;

exports.getNotifications = async (req, res) => {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Yeu cau dang nhap' });

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const unreadOnly = req.query.unread_only === 'true';
    const filters = ['n.user_id = ?'];
    const params = [userId];

    if (unreadOnly) filters.push('n.is_read = FALSE');

    const [rows] = await pool.query(
      `SELECT
          n.notification_id,
          n.user_id,
          n.role_id,
          r.role_name,
          n.title,
          n.message,
          n.type,
          n.entity_type,
          n.entity_id,
          n.link,
          n.is_read,
          n.created_at,
          n.read_at
       FROM notifications n
       LEFT JOIN roles r ON n.role_id = r.role_id
       WHERE ${filters.join(' AND ')}
       ORDER BY n.created_at DESC, n.notification_id DESC
       LIMIT ?`,
      [...params, limit]
    );

    const [countRows] = await pool.query(
      'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.status(200).json({
      success: true,
      unread_count: countRows[0]?.unread_count || 0,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Loi lay thong bao' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const userId = getActorId(req);
    const id = Number(req.params.id);
    if (!userId || !id) return res.status(400).json({ success: false, message: 'Du lieu khong hop le' });

    const [result] = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE notification_id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Khong tim thay thong bao' });
    }

    res.status(200).json({ success: true, message: 'Da danh dau da doc' });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ success: false, message: 'Loi cap nhat thong bao' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const userId = getActorId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Yeu cau dang nhap' });

    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    res.status(200).json({ success: true, message: 'Da danh dau tat ca la da doc' });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ success: false, message: 'Loi cap nhat thong bao' });
  }
};
