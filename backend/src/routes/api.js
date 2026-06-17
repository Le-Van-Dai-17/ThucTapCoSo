const express = require('express');
const router = express.Router();
// multer removed (BE-01)

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
const supplierController = require('../controllers/supplierController'); // BE-08

// Middleware
const authMiddleware = require('../middleware/authMiddleware');

// ==========================================
// 1. SYSTEM & AUTH API
// ==========================================
router.get('/status', apiController.getStatus);

router.post('/auth/register', (req, res) => {
    res.status(410).json({
        success: false,
        message: 'Public registration is disabled. Please ask an Admin to create the account.'
    });
});
router.post('/auth/login', authController.login);
router.post('/auth/logout', authMiddleware.verifyToken, authController.logout);

// ==========================================
// 2. USERS API — Chỉ dành cho Admin [BE-01]
// ==========================================
router.get('/users/list', authMiddleware.verifyToken, authMiddleware.requireRole('Admin'), userController.getAllUsers);
router.post('/users/create', authMiddleware.verifyToken, authMiddleware.requireRole('Admin'), userController.createUser);
router.put('/users/update/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Admin'), userController.updateUser);
router.delete('/users/delete/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Admin'), userController.deleteUser);

// ==========================================
// 3. PRODUCTS API — Manager & Staff [BE-03]
// ==========================================
router.get('/products/available', authMiddleware.verifyToken, authMiddleware.requireRole('Staff', 'Manager'), productController.getAvailableProducts);
router.get('/products/list', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), productController.getAllProducts);
router.get('/products/get/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), productController.getProductById);
router.post('/products/create', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), productController.createProduct);
router.put('/products/update/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), productController.updateProduct);
router.delete('/products/delete/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), productController.deleteProduct);

// ==========================================
// 4. SUPPLIERS API — Chỉ dành cho Manager [BE-08]
// ==========================================
router.get('/suppliers/list', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), supplierController.getAllSuppliers);
router.post('/suppliers/create', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), supplierController.createSupplier);
router.put('/suppliers/update/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), supplierController.updateSupplier);
router.delete('/suppliers/delete/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), supplierController.deleteSupplier);

// ==========================================
// 5. SALES API — Chỉ dành cho Manager [BE-01]
// ==========================================
router.get('/sales/list', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), salesController.getSalesList);
router.post('/sales/create', authMiddleware.verifyToken, authMiddleware.requireRole('Staff'), salesController.createSale);

// ==========================================
// 6. PURCHASE ORDERS & INVENTORY API — Phân quyền chuẩn cho Manager & Staff [BE-01]
// ==========================================
router.get('/purchases/list', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Staff'), purchaseController.getPurchases);
router.get('/purchases/detail/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Staff'), purchaseController.getPurchasesDetail);
router.post('/purchases/create', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), purchaseController.createPurchase);
router.put('/purchases/approve/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), purchaseController.approvePurchase);
router.put('/purchases/receive/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Staff'), purchaseController.receiveOrder);
router.put('/purchase-orders/:id/receive', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Staff'), purchaseController.receiveOrder);
router.put('/purchases/update/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), purchaseController.updatePurchase);
router.delete('/purchases/delete/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), purchaseController.deletePurchase);

// ==========================================
// 7. FORECAST API — Chỉ dành cho Manager [BE-01]
// ==========================================
router.get('/forecast/latest', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), forecastController.getLatestForecast);
router.post('/forecast/run', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), forecastController.runForecast);
router.get('/forecast/saved', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), forecastController.getSavedForecasts);
router.get('/forecast/product/:productId', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), forecastController.getForecastByProduct);
router.post('/forecast/create-purchase-order', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), forecastController.createPurchaseOrderFromForecast);

// ==========================================
// 8. REPORTS API — Chỉ dành cho Manager [BE-01]
// ==========================================
router.get('/reports/sales-summary', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), reportController.getSalesSummary);
router.get('/reports/top-products', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), reportController.getTopProducts);
router.get('/reports/category-sales', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), reportController.getCategorySales);
router.get('/reports/inventory-status', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), reportController.getInventoryStatus);
router.get('/reports/export/excel', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), reportController.exportExcel);
router.get('/reports/export/pdf', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), reportController.exportPDF);
router.get('/reports/sales-trend', authMiddleware.verifyToken, authMiddleware.requireRole('Manager'), reportController.getSalesTrend);

// ==========================================
// 9. ACTIVITY LOG API — Chỉ dành cho Admin [BE-01]
// ==========================================
router.get('/activity-logs/list', authMiddleware.verifyToken, authMiddleware.requireRole('Admin'), activityLogController.getLogs);

// ==========================================
// 10. SETTINGS API — Chỉ dành cho Admin [BE-01]
// ==========================================
router.get('/settings', authMiddleware.verifyToken, authMiddleware.requireRole('Admin'), settingsController.getSettings);
router.put('/settings', authMiddleware.verifyToken, authMiddleware.requireRole('Admin'), settingsController.updateSettings);
router.post('/settings/reset', authMiddleware.verifyToken, authMiddleware.requireRole('Admin'), settingsController.resetSettings);

module.exports = router;
