const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

// Import controllers
const apiController = require('../controllers/apiController');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const productController = require('../controllers/productController');
const salesController = require('../controllers/salesController');
const purchaseController = require('../controllers/purchaseController');
const forecastController = require('../controllers/forecastController');
const reportController = require('../controllers/reportController');
const activityLogController = require('../controllers/activityLogController');
const settingsController = require('../controllers/settingsController');

// Middleware
const authMiddleware = require('../middleware/authMiddleware');

// ==========================================
// 1. SYSTEM & AUTH API
// ==========================================
router.get('/status', apiController.getStatus);

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authMiddleware.verifyToken, authController.logout);

// ==========================================
// 2. USERS API
// ==========================================
router.get('/users/list', authMiddleware.verifyToken, userController.getAllUsers);
router.post('/users/create', authMiddleware.verifyToken, userController.createUser);
router.put('/users/update/:id', authMiddleware.verifyToken, userController.updateUser);
router.delete('/users/delete/:id', authMiddleware.verifyToken, userController.deleteUser);

// ==========================================
// 3. PRODUCTS API
// ==========================================
router.get('/products/list', authMiddleware.verifyToken, productController.getAllProducts);
router.get('/products/get/:id', authMiddleware.verifyToken, productController.getProductById);
router.post('/products/create', authMiddleware.verifyToken, productController.createProduct);
router.put('/products/update/:id', authMiddleware.verifyToken, productController.updateProduct);
router.delete('/products/delete/:id', authMiddleware.verifyToken, productController.deleteProduct);

// ==========================================
// 4. SALES API
// ==========================================
router.get('/sales/list', authMiddleware.verifyToken, salesController.getSalesList);
router.post('/sales/create', authMiddleware.verifyToken, salesController.createSale);
router.post(
    '/sales/import',
    authMiddleware.verifyToken,
    upload.single('file'),
    salesController.importSalesCSV
);

// ==========================================
// 5. PURCHASE ORDERS & INVENTORY API
// ==========================================
router.get('/purchases/list', authMiddleware.verifyToken, purchaseController.getPurchases);
router.get('/purchases/detail/:id', authMiddleware.verifyToken, purchaseController.getPurchasesDetail);
router.post('/purchases/create', authMiddleware.verifyToken, purchaseController.createPurchase);
router.put('/purchases/receive/:id', authMiddleware.verifyToken, purchaseController.receiveOrder);
router.put('/purchases/update/:id', authMiddleware.verifyToken, purchaseController.updatePurchase);
router.delete('/purchases/delete/:id', authMiddleware.verifyToken, purchaseController.deletePurchase);

// ==========================================
// 6. FORECAST API
// ==========================================

// Tính forecast trực tiếp từ sales data, chưa lưu database.
router.get('/forecast/latest', authMiddleware.verifyToken, forecastController.getLatestForecast);

// Chạy forecast và lưu kết quả vào bảng demand_forecasts.
router.post('/forecast/run', authMiddleware.verifyToken, forecastController.runForecast);

// Lấy danh sách forecast đã lưu.
router.get('/forecast/saved', authMiddleware.verifyToken, forecastController.getSavedForecasts);

// Lấy lịch sử bán hàng và forecast của một sản phẩm.
router.get('/forecast/product/:productId', authMiddleware.verifyToken, forecastController.getForecastByProduct);

// ==========================================
// 7. REPORTS API
// ==========================================
router.get('/reports/sales-summary', authMiddleware.verifyToken, reportController.getSalesSummary);
router.get('/reports/top-products', authMiddleware.verifyToken, reportController.getTopProducts);
router.get('/reports/category-sales', authMiddleware.verifyToken, reportController.getCategorySales);
router.get('/reports/inventory-status', authMiddleware.verifyToken, reportController.getInventoryStatus);
router.get('/reports/export/excel', authMiddleware.verifyToken, reportController.exportExcel);
router.get('/reports/export/pdf', authMiddleware.verifyToken, reportController.exportPDF);
router.get('/reports/sales-trend', authMiddleware.verifyToken, reportController.getSalesTrend);

// ==========================================
// 8. ACTIVITY LOG API
// ==========================================
router.get('/activity-logs/list', authMiddleware.verifyToken, activityLogController.getLogs);


// ==========================================
// 9. SETTINGS API
// ==========================================
router.get('/settings', authMiddleware.verifyToken, settingsController.getSettings);
router.put('/settings', authMiddleware.verifyToken, settingsController.updateSettings);
router.post('/settings/reset', authMiddleware.verifyToken, settingsController.resetSettings);

module.exports = router;