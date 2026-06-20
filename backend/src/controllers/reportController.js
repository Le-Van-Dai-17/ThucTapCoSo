const { pool } = require('../db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { clampInteger, getActorId, safeLogAction } = require('../utils/controllerUtils');

const getReportDays = (req) => {
    if (req.query.days == null) return null;
    return clampInteger(req.query.days, 1, 365, 30);
};

const getReportData = async (days = null) => {
    let salesSummary;
    if (days) {
        const previousDays = days * 2;
        [[salesSummary]] = await pool.query(`
            SELECT
                COUNT(DISTINCT CASE WHEN st.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN st.transaction_id END) AS total_orders,
                IFNULL(SUM(CASE WHEN st.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN sd.quantity ELSE 0 END), 0) AS total_items_sold,
                IFNULL(SUM(CASE WHEN st.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN sd.quantity * sd.unit_price ELSE 0 END), 0) AS total_revenue,
                IFNULL(SUM(CASE WHEN st.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN sd.quantity * sd.unit_price ELSE 0 END), 0) AS current_month_revenue,
                IFNULL(SUM(CASE WHEN st.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND st.transaction_date < DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN sd.quantity * sd.unit_price ELSE 0 END), 0) AS previous_month_revenue
            FROM sales_transactions st
            LEFT JOIN sale_details sd
                ON st.transaction_id = sd.transaction_id
            WHERE st.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        `, [days, days, days, days, previousDays, days, previousDays]);
    } else {
        [[salesSummary]] = await pool.query(`
            SELECT 
                COUNT(DISTINCT st.transaction_id) AS total_orders,
                IFNULL(SUM(sd.quantity), 0) AS total_items_sold,
                IFNULL(SUM(sd.quantity * sd.unit_price), 0) AS total_revenue,
                IFNULL(SUM(CASE WHEN YEAR(st.transaction_date) = YEAR((SELECT MAX(transaction_date) FROM sales_transactions)) AND MONTH(st.transaction_date) = MONTH((SELECT MAX(transaction_date) FROM sales_transactions)) THEN sd.quantity * sd.unit_price ELSE 0 END), 0) AS current_month_revenue,
                IFNULL(SUM(CASE WHEN st.transaction_date >= DATE_SUB(DATE_FORMAT((SELECT MAX(transaction_date) FROM sales_transactions), '%Y-%m-01'), INTERVAL 1 MONTH) AND st.transaction_date < DATE_FORMAT((SELECT MAX(transaction_date) FROM sales_transactions), '%Y-%m-01') THEN sd.quantity * sd.unit_price ELSE 0 END), 0) AS previous_month_revenue
            FROM sales_transactions st
            LEFT JOIN sale_details sd 
                ON st.transaction_id = sd.transaction_id
        `);
    }

    const topProductsParams = [];
    const topProductsDateFilter = days ? 'AND st.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)' : '';
    if (days) topProductsParams.push(days);
    const [topProducts] = await pool.query(`
        SELECT 
            p.product_id,
            p.name,
            p.sku,
            IFNULL(SUM(sd.quantity), 0) AS total_sold,
            IFNULL(SUM(sd.quantity * sd.unit_price), 0) AS total_revenue
        FROM products p
        JOIN sale_details sd 
            ON p.product_id = sd.product_id
        JOIN sales_transactions st
            ON sd.transaction_id = st.transaction_id
        WHERE p.is_discontinued = 0
            ${topProductsDateFilter}
        GROUP BY p.product_id, p.name, p.sku
        ORDER BY total_revenue DESC
        LIMIT 10
    `, topProductsParams);

    const categorySalesParams = [];
    const categoryDateFilter = days ? 'AND st.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)' : '';
    if (days) categorySalesParams.push(days);
    const [categorySales] = await pool.query(`
        SELECT 
            COALESCE(c.name, 'General') AS category,
            IFNULL(SUM(sd.quantity), 0) AS total_sold,
            IFNULL(SUM(sd.quantity * sd.unit_price), 0) AS total_revenue
        FROM products p
        LEFT JOIN categories c 
            ON p.category_id = c.category_id
        JOIN sale_details sd 
            ON p.product_id = sd.product_id
        JOIN sales_transactions st
            ON sd.transaction_id = st.transaction_id
        WHERE p.is_discontinued = 0
            ${categoryDateFilter}
        GROUP BY c.category_id, c.name
        ORDER BY total_revenue DESC
    `, categorySalesParams);
    const [[inventoryStatus]] = await pool.query(`
        SELECT 
            COUNT(*) AS total_products,
            IFNULL(SUM(current_stock), 0) AS total_stock,
            IFNULL(SUM(CASE WHEN current_stock <= min_stock_level THEN 1 ELSE 0 END), 0) AS low_stock_items,
            IFNULL(SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_items,
            IFNULL(SUM(current_stock * cost_price), 0) AS inventory_value
        FROM products
        WHERE is_discontinued = 0
    `);

    return {
        salesSummary,
        topProducts,
        categorySales,
        inventoryStatus
    };
};

// GET /api/reports/sales-summary
exports.getSalesSummary = async (req, res) => {
    try {
        const { salesSummary } = await getReportData(getReportDays(req));
        res.status(200).json({ success: true, data: salesSummary });
    } catch (error) {
        console.error('Lá»—i láº¥y tá»•ng quan doanh thu:', error);
        res.status(500).json({ success: false, message: 'Lá»—i server' });
    }
};

// GET /api/reports/top-products
exports.getTopProducts = async (req, res) => {
    try {
        const { topProducts } = await getReportData(getReportDays(req));
        res.status(200).json({ success: true, data: topProducts });
    } catch (error) {
        console.error('Lá»—i láº¥y top sáº£n pháº©m:', error);
        res.status(500).json({ success: false, message: 'Lá»—i server' });
    }
};

// GET /api/reports/category-sales
exports.getCategorySales = async (req, res) => {
    try {
        const { categorySales } = await getReportData(getReportDays(req));
        res.status(200).json({ success: true, data: categorySales });
    } catch (error) {
        console.error('Lá»—i láº¥y doanh thu danh má»¥c:', error);
        res.status(500).json({ success: false, message: 'Lá»—i server' });
    }
};

// GET /api/reports/inventory-status
exports.getInventoryStatus = async (req, res) => {
    try {
        const { inventoryStatus } = await getReportData();
        res.status(200).json({ success: true, data: inventoryStatus });
    } catch (error) {
        console.error('Lá»—i láº¥y tráº¡ng thÃ¡i kho:', error);
        res.status(500).json({ success: false, message: 'Lá»—i server' });
    }
};

// GET /api/reports/export/excel - ÄÃ£ bá»• sung Activity Log chuáº©n hÃ³a
exports.exportExcel = async (req, res) => {
    try {
        const { salesSummary, topProducts, categorySales, inventoryStatus } = await getReportData();

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ForecastAI';
        workbook.created = new Date();

        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 25 }
        ];

        summarySheet.addRows([
            { metric: 'Total Orders', value: salesSummary.total_orders },
            { metric: 'Total Items Sold', value: salesSummary.total_items_sold },
            { metric: 'Total Revenue', value: Number(salesSummary.total_revenue) },
            { metric: 'Total Products', value: inventoryStatus.total_products },
            { metric: 'Total Stock', value: inventoryStatus.total_stock },
            { metric: 'Inventory Value', value: Number(inventoryStatus.inventory_value) },
            { metric: 'Low Stock Items', value: inventoryStatus.low_stock_items },
            { metric: 'Out Of Stock Items', value: inventoryStatus.out_of_stock_items }
        ]);
        summarySheet.getRow(1).font = { bold: true };

        const topProductsSheet = workbook.addWorksheet('Top Products');
        topProductsSheet.columns = [
            { header: 'Product ID', key: 'product_id', width: 15 },
            { header: 'SKU', key: 'sku', width: 20 },
            { header: 'Product Name', key: 'name', width: 35 },
            { header: 'Total Sold', key: 'total_sold', width: 15 },
            { header: 'Total Revenue', key: 'total_revenue', width: 20 }
        ];
        topProductsSheet.addRows(topProducts);
        topProductsSheet.getRow(1).font = { bold: true };

        const categorySheet = workbook.addWorksheet('Category Sales');
        categorySheet.columns = [
            { header: 'Category', key: 'category', width: 30 },
            { header: 'Total Sold', key: 'total_sold', width: 15 },
            { header: 'Total Revenue', key: 'total_revenue', width: 20 }
        ];
        categorySheet.addRows(categorySales);
        categorySheet.getRow(1).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="forecastai_report.xlsx"');

        // Ghi nháº­n nháº­t kÃ½ há»‡ thá»‘ng TRÆ¯á»šC khi gá»­i dá»¯ liá»‡u táº£i vá»
        await safeLogAction(
            getActorId(req),
            'EXPORT_REPORT_EXCEL',
            'TrÃ­ch xuáº¥t dá»¯ liá»‡u tá»•ng há»£p há»‡ thá»‘ng ERP ra Ä‘á»‹nh dáº¡ng file Excel',
            'sales_transactions',
            null,
            req.ip
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Lá»—i export Excel:', error);
        res.status(500).json({ success: false, message: 'Lá»—i server khi xuáº¥t Excel' });
    }
};

// GET /api/reports/export/pdf - ÄÃ£ bá»• sung Activity Log chuáº©n hÃ³a
exports.exportPDF = async (req, res) => {
    try {
        const { salesSummary, topProducts, categorySales, inventoryStatus } = await getReportData();

        const doc = new PDFDocument({ margin: 40, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="forecastai_report.pdf"');

        doc.pipe(res);
        doc.fontSize(20).text('ForecastAI - Reports & Analytics', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated at: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(14).text('1. Summary', { underline: true });
        doc.moveDown();
        doc.fontSize(11);
        doc.text(`Total Orders: ${salesSummary.total_orders}`);
        doc.text(`Total Items Sold: ${salesSummary.total_items_sold}`);
        doc.text(`Total Revenue: ${Number(salesSummary.total_revenue).toLocaleString()} VND`);
        doc.text(`Total Products: ${inventoryStatus.total_products}`);
        doc.text(`Total Stock: ${inventoryStatus.total_stock}`);
        doc.text(`Inventory Value: ${Number(inventoryStatus.inventory_value).toLocaleString()} VND`);
        doc.text(`Low Stock Items: ${inventoryStatus.low_stock_items}`);
        doc.text(`Out Of Stock Items: ${inventoryStatus.out_of_stock_items}`);

        doc.moveDown(2);
        doc.fontSize(14).text('2. Top Products', { underline: true });
        doc.moveDown();
        topProducts.forEach((p, index) => {
            doc.fontSize(10).text(`${index + 1}. ${p.name} | SKU: ${p.sku} | Sold: ${p.total_sold} | Revenue: ${Number(p.total_revenue).toLocaleString()} VND`);
        });

        doc.moveDown(2);
        doc.fontSize(14).text('3. Category Sales', { underline: true });
        doc.moveDown();
        categorySales.forEach((c, index) => {
            doc.fontSize(10).text(`${index + 1}. ${c.category} | Sold: ${c.total_sold} | Revenue: ${Number(c.total_revenue).toLocaleString()} VND`);
        });

        // Ghi nháº­n nháº­t kÃ½ há»‡ thá»‘ng TRÆ¯á»šC khi káº¿t thÃºc luá»“ng dá»¯ liá»‡u PDF
        await safeLogAction(
            getActorId(req),
            'EXPORT_REPORT_PDF',
            'TrÃ­ch xuáº¥t tÃ i liá»‡u phÃ¢n tÃ­ch káº¿t quáº£ kinh doanh ra Ä‘á»‹nh dáº¡ng file PDF',
            'sales_transactions',
            null,
            req.ip
        );

        doc.end();
    } catch (error) {
        console.error('Lá»—i export PDF:', error);
        res.status(500).json({ success: false, message: 'Lá»—i server khi xuáº¥t PDF' });
    }
};

// GET /api/reports/sales-trend?days=30
exports.getSalesTrend = async (req, res) => {
    try {
        const days = clampInteger(req.query.days, 1, 365, 30);
        const [salesTrend] = await pool.query(`
            SELECT 
                DATE(st.transaction_date) AS sale_date,
                IFNULL(SUM(sd.quantity * sd.unit_price), 0) AS sales
            FROM sales_transactions st
            LEFT JOIN sale_details sd ON st.transaction_id = sd.transaction_id
            WHERE st.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(st.transaction_date)
            ORDER BY sale_date ASC
        `, [days]);

        const data = salesTrend.map(item => ({
            date: new Date(item.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sales: Number(item.sales || 0),
            forecast: Number(item.sales || 0)
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Lá»—i láº¥y sales trend:', error);
        res.status(500).json({ success: false, message: 'Lá»—i server' });
    }
};
