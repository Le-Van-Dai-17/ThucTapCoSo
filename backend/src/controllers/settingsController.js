const { pool } = require('../db');
const { getActorId, safeLogAction } = require('../utils/controllerUtils');

const defaultSettings = {
    defaultTimePeriod: {
        value: 30,
        type: 'number',
        description: 'Historical data period used for demand analysis'
    },
    forecastHorizon: {
        value: 90,
        type: 'number',
        description: 'Number of days to predict future demand'
    },

    autoReorder: {
        value: true,
        type: 'boolean',
        description: 'Automatically suggest reorders based on forecasts'
    },
    includeSeasonal: {
        value: true,
        type: 'boolean',
        description: 'Factor in seasonal trends and patterns'
    },
    useMLPrediction: {
        value: true,
        type: 'boolean',
        description: 'Enable AI-powered demand forecasting'
    },

    lowStockRange: {
        value: 20,
        type: 'number',
        description: 'Alert when stock falls below this percentage'
    },
    criticalStockRange: {
        value: 10,
        type: 'number',
        description: 'Critical alert for immediate reorder'
    },
    overStockRange: {
        value: 150,
        type: 'number',
        description: 'Alert when stock exceeds this level'
    },
    reorderPoint: {
        value: 50,
        type: 'number',
        description: 'Trigger reorder at this stock level'
    },
    safetyStockDays: {
        value: 7,
        type: 'number',
        description: 'Additional stock buffer for uncertainties'
    },

    enableEmail: {
        value: true,
        type: 'boolean',
        description: 'Receive email alerts for important events'
    },
    enablePush: {
        value: false,
        type: 'boolean',
        description: 'Show browser notifications for updates'
    },
    autoGeneratePo: {
        value: true,
        type: 'boolean',
        description: 'Create draft POs automatically when needed'
    },
    requireApproval: {
        value: true,
        type: 'boolean',
        description: 'POs require approval before submission'
    },
    enableAuditLog: {
        value: true,
        type: 'boolean',
        description: 'Track all system activities and changes'
    },
    showAdvancedMetrics: {
        value: false,
        type: 'boolean',
        description: 'Display detailed analytics and metrics'
    }
};

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

const normalizeSettingValue = (value, type) => {
    if (type === 'boolean') {
        return value ? 'true' : 'false';
    }

    if (type === 'number') {
        const numberValue = Number(value);

        if (!Number.isFinite(numberValue)) {
            const error = new Error('Numeric setting value is invalid');
            error.statusCode = 400;
            throw error;
        }

        return String(numberValue);
    }

    if (type === 'json') {
        return JSON.stringify(value);
    }

    return String(value ?? '');
};

const ensureDefaultSettings = async (connection) => {
    for (const [key, setting] of Object.entries(defaultSettings)) {
        await connection.query(
            `
            INSERT INTO system_settings
                (setting_key, setting_value, setting_type, description)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                setting_type = VALUES(setting_type),
                description = VALUES(description)
            `,
            [
                key,
                normalizeSettingValue(setting.value, setting.type),
                setting.type,
                setting.description
            ]
        );
    }
};

exports.getSettings = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await ensureDefaultSettings(connection);

        const [rows] = await connection.query(
            `
            SELECT
                setting_id,
                setting_key,
                setting_value,
                setting_type,
                description,
                updated_by,
                updated_at
            FROM system_settings
            ORDER BY setting_id ASC
            `
        );

        const settings = {};

        rows.forEach(row => {
            settings[row.setting_key] = parseSettingValue(
                row.setting_value,
                row.setting_type
            );
        });

        res.status(200).json({
            success: true,
            data: settings,
            raw: rows
        });
    } catch (error) {
        console.error('Lỗi lấy system settings:', error);

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy cấu hình hệ thống'
        });
    } finally {
        connection.release();
    }
};

exports.updateSettings = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const settings = req.body || {};
        const actorId = getActorId(req);

        if (Object.keys(settings).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu cấu hình để cập nhật'
            });
        }

        await connection.beginTransaction();

        await ensureDefaultSettings(connection);

        const validKeys = Object.keys(settings).filter(key => defaultSettings[key]);

        if (validKeys.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'No valid settings were provided'
            });
        }

        for (const [key, value] of Object.entries(settings)) {
            const defaultSetting = defaultSettings[key];

            if (!defaultSetting) {
                continue;
            }

            const normalizedValue = normalizeSettingValue(
                value,
                defaultSetting.type
            );

            await connection.query(
                `
                UPDATE system_settings
                SET
                    setting_value = ?,
                    setting_type = ?,
                    description = ?,
                    updated_by = ?
                WHERE setting_key = ?
                `,
                [
                    normalizedValue,
                    defaultSetting.type,
                    defaultSetting.description,
                    actorId,
                    key
                ]
            );
        }

        await connection.commit();

        await safeLogAction(
            actorId,
            'UPDATE_SETTINGS',
            'Cập nhật cấu hình hệ thống',
            'system_settings',
            null,
            req.ip
        );

        res.status(200).json({
            success: true,
            message: 'Cập nhật cấu hình hệ thống thành công'
        });
    } catch (error) {
        await connection.rollback();

        console.error('Lỗi cập nhật system settings:', error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Lỗi server khi cập nhật cấu hình hệ thống'
        });
    } finally {
        connection.release();
    }
};

exports.resetSettings = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const actorId = getActorId(req);

        await connection.beginTransaction();

        for (const [key, setting] of Object.entries(defaultSettings)) {
            await connection.query(
                `
                INSERT INTO system_settings
                    (
                        setting_key,
                        setting_value,
                        setting_type,
                        description,
                        updated_by
                    )
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    setting_value = VALUES(setting_value),
                    setting_type = VALUES(setting_type),
                    description = VALUES(description),
                    updated_by = VALUES(updated_by)
                `,
                [
                    key,
                    normalizeSettingValue(setting.value, setting.type),
                    setting.type,
                    setting.description,
                    actorId
                ]
            );
        }

        await connection.commit();

        await safeLogAction(
            actorId,
            'RESET_SETTINGS',
            'Khôi phục cấu hình hệ thống về mặc định',
            'system_settings',
            null,
            req.ip
        );

        res.status(200).json({
            success: true,
            message: 'Đã khôi phục cấu hình mặc định',
            data: Object.fromEntries(
                Object.entries(defaultSettings).map(([key, setting]) => [
                    key,
                    setting.value
                ])
            )
        });
    } catch (error) {
        await connection.rollback();

        console.error('Lỗi reset system settings:', error);

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi khôi phục cấu hình mặc định'
        });
    } finally {
        connection.release();
    }
};
