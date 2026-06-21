const { pool } = require('../db');

const normalizeRoleNames = (roleNames) => {
  const values = Array.isArray(roleNames) ? roleNames : [roleNames];
  return [...new Set(values.map((role) => String(role || '').trim()).filter(Boolean))];
};

const insertNotification = async (db, payload) => {
  await db.query(
    `INSERT INTO notifications
      (user_id, role_id, title, message, type, entity_type, entity_id, link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.user_id || null,
      payload.role_id || null,
      payload.title,
      payload.message,
      payload.type || 'info',
      payload.entity_type || null,
      payload.entity_id || null,
      payload.link || null,
    ]
  );
};

const createForUser = async (payload, db = pool) => {
  if (!payload?.userId || !payload?.title || !payload?.message) return;
  await insertNotification(db, {
    user_id: payload.userId,
    role_id: payload.roleId || null,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    entity_type: payload.entityType,
    entity_id: payload.entityId,
    link: payload.link,
  });
};

const createForRoles = async (roleNames, payload, db = pool) => {
  const roles = normalizeRoleNames(roleNames);
  if (roles.length === 0 || !payload?.title || !payload?.message) return;

  const placeholders = roles.map(() => '?').join(', ');
  const [users] = await db.query(
    `SELECT u.user_id, u.role_id
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.is_active = TRUE AND LOWER(r.role_name) IN (${placeholders})`,
    roles.map((role) => role.toLowerCase())
  );

  for (const user of users) {
    await insertNotification(db, {
      user_id: user.user_id,
      role_id: user.role_id,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      link: payload.link,
    });
  }
};

const safeCreateForUser = async (...args) => {
  try {
    await createForUser(...args);
  } catch (error) {
    console.error('Silent notification error:', error.message);
  }
};

const safeCreateForRoles = async (...args) => {
  try {
    await createForRoles(...args);
  } catch (error) {
    console.error('Silent notification error:', error.message);
  }
};

module.exports = {
  createForUser,
  createForRoles,
  safeCreateForUser,
  safeCreateForRoles,
};
