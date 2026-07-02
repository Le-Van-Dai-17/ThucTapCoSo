require('dotenv').config();

const mysql = require('mysql2/promise');

const columns = [
    {
        table: 'purchase_orders',
        column: 'compensation_amount',
        definition: 'DECIMAL(15,2) DEFAULT 0 AFTER total_value'
    },
    {
        table: 'po_discrepancies',
        column: 'resolution_type',
        definition: "ENUM('refund', 'replacement') NULL AFTER resolution_note"
    },
    {
        table: 'po_discrepancies',
        column: 'compensation_amount',
        definition: 'DECIMAL(15,2) DEFAULT 0 AFTER resolution_type'
    },
    {
        table: 'products',
        column: 'warning_stock_level',
        definition: 'INT DEFAULT 10 AFTER min_stock_level',
        afterAdd: 'UPDATE products SET warning_stock_level = min_stock_level WHERE warning_stock_level IS NULL OR warning_stock_level = 10'
    },
    {
        table: 'suppliers',
        column: 'tax_code',
        definition: 'VARCHAR(50) NULL AFTER lead_time_days'
    },
    {
        table: 'suppliers',
        column: 'notes',
        definition: 'TEXT NULL AFTER tax_code'
    },
    {
        table: 'suppliers',
        column: 'min_order_value',
        definition: 'DECIMAL(15,2) DEFAULT 0 AFTER notes'
    },
    {
        table: 'suppliers',
        column: 'payment_terms',
        definition: 'VARCHAR(100) NULL AFTER min_order_value'
    },
    {
        table: 'suppliers',
        column: 'ai_relevance',
        definition: "ENUM('Low', 'Medium', 'High') DEFAULT 'Medium' AFTER payment_terms"
    }
];

async function columnExists(connection, table, column) {
    const [rows] = await connection.query(
        `
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
        `,
        [table, column]
    );
    return Number(rows[0]?.count || 0) > 0;
}

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'forecastai_v3'
    });

    const changed = [];
    for (const item of columns) {
        if (await columnExists(connection, item.table, item.column)) {
            continue;
        }

        await connection.query(`ALTER TABLE ${item.table} ADD COLUMN ${item.column} ${item.definition}`);
        if (item.afterAdd) {
            await connection.query(item.afterAdd);
        }
        changed.push(`${item.table}.${item.column}`);
    }

    await connection.end();

    if (changed.length === 0) {
        console.log('Schema is already up to date.');
    } else {
        console.log('Added columns:');
        changed.forEach(column => console.log(`- ${column}`));
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
