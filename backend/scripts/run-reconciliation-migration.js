const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
    const sqlPath = path.join(__dirname, '..', 'src', 'models', 'migrations', '2026-06-24_reconciliation_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });

    try {
        await connection.query(sql);
        const [rows] = await connection.query(
            `SELECT TABLE_NAME
             FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = ?
               AND TABLE_NAME IN ('po_discrepancies', 'inventory_adjustments')
             ORDER BY TABLE_NAME`,
            [process.env.DB_NAME || 'forecastai_v3']
        );

        console.log('Migration applied. Tables present:');
        for (const row of rows) {
            console.log(`- ${row.TABLE_NAME}`);
        }
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
