require('dotenv').config();

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'forecastai_v3',
        multipleStatements: false
    });

    const passwordHash = bcrypt.hashSync('123456', 10);

    await connection.query(`
        INSERT IGNORE INTO roles (role_id, role_name, description)
        VALUES
            (1, 'Admin', 'System administrator'),
            (2, 'Manager', 'Inventory manager'),
            (3, 'Staff', 'Warehouse staff')
    `);

    await connection.query(`
        INSERT INTO users (user_id, full_name, email, phone, role_id, is_active)
        VALUES
            (1, 'System Admin', 'admin@forecastai.local', '0900000001', 1, TRUE),
            (2, 'Store Manager', 'manager@forecastai.local', '0900000002', 2, TRUE),
            (3, 'Warehouse Staff', 'staff@forecastai.local', '0900000003', 3, TRUE)
        ON DUPLICATE KEY UPDATE
            full_name = VALUES(full_name),
            email = VALUES(email),
            phone = VALUES(phone),
            role_id = VALUES(role_id),
            is_active = VALUES(is_active)
    `);

    await connection.query(
        `
        INSERT INTO user_credentials (user_id, username, password_hash, failed_login_attempts, locked_until)
        VALUES
            (1, 'admin', ?, 0, NULL),
            (2, 'manager', ?, 0, NULL),
            (3, 'staff', ?, 0, NULL)
        ON DUPLICATE KEY UPDATE
            username = VALUES(username),
            password_hash = VALUES(password_hash),
            failed_login_attempts = 0,
            locked_until = NULL
        `,
        [passwordHash, passwordHash, passwordHash]
    );

    const [rows] = await connection.query(`
        SELECT uc.username, u.full_name, r.role_name
        FROM user_credentials uc
        JOIN users u ON uc.user_id = u.user_id
        JOIN roles r ON u.role_id = r.role_id
        ORDER BY uc.user_id
    `);

    console.table(rows);
    await connection.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
