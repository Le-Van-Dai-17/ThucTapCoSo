const getActorId = (req) => req.user?.user_id || req.user?.id || null;


const isAdmin = (req) => String(req.user?.role).toLowerCase() === 'admin';


const parseNonNegativeNumber = (value, fieldName, defaultValue = undefined) => {
    if (value === undefined || value === null || value === '') {
        if (defaultValue !== undefined) return defaultValue;
        const error = new Error(`Trường dữ liệu '${fieldName}' không được để trống.`);
        error.statusCode = 400;
        throw error;
    }
    
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) {
        const error = new Error(`Giá trị của trường '${fieldName}' không hợp lệ (Phải là số và không được âm).`);
        error.statusCode = 400;
        throw error;
    }
    return num;
};


const parsePositiveNumber = (value, fieldName) => {
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) {
        const error = new Error(`Giá trị của trường '${fieldName}' phải là số lớn hơn 0.`);
        error.statusCode = 400;
        throw error;
    }
    return num;
};


const clampInteger = (value, min, max, defaultValue) => {
    const num = parseInt(value, 10);
    if (Number.isNaN(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
};


const safeLogAction = async (userId, action, description, entityType, entityId, ipAddress) => {
    try {
        if (!userId) return;
        const { pool } = require('../db');
        const settingsHelper = require('./settingsHelper');
        const enableAudit = await settingsHelper.getSettingValue('enableAuditLog', true);
        if (!enableAudit) {
            return;
        }
        await pool.query(
            `INSERT INTO activity_logs (user_id, action, description, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, action, description || null, entityType || null, entityId || null, ipAddress || null]
        );
    } catch (error) {
        console.error('Lỗi ghi activity log âm thầm:', error.message);
    }
};

module.exports = {
    getActorId,
    isAdmin,
    parseNonNegativeNumber,
    parsePositiveNumber,
    clampInteger,
    safeLogAction
};