const { pool } = require('../db');

const parseSettingValue = (value, type) => {
    if (type === 'boolean') {
        return value === true || value === 'true' || value === 1 || value === '1';
    }
    if (type === 'number') {
        const num = Number(value);
        return Number.isNaN(num) ? 0 : num;
    }
    if (type === 'json') {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }
    return value;
};

const getSettingValue = async (key, defaultValue) => {
    try {
        const [rows] = await pool.query(
            'SELECT setting_value, setting_type FROM system_settings WHERE setting_key = ? LIMIT 1',
            [key]
        );
        if (rows.length === 0) return defaultValue;
        return parseSettingValue(rows[0].setting_value, rows[0].setting_type);
    } catch (error) {
        console.error(`Error fetching system setting for key ${key}:`, error);
        return defaultValue;
    }
};

module.exports = { getSettingValue };
