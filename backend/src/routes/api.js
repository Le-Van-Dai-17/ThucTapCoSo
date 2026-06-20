const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

// Import controllers
const apiController = require('../controllers/apiController');
const authController = require('../controllers/authController');
const categoryController = require('../controllers/categoryController');
const userController = require('../controllers/userController');
const productController = require('../controllers/productController');
const salesController = require('../controllers/salesController');
const purchaseController = require('../controllers/purchaseController');
const forecastController = require('../controllers/forecastController');
const reportController = require('../controllers/reportController');
const activityLogController = require('../controllers/activityLogController');
const settingsController = require('../controllers/settingsController');
const supplierController = require('../controllers/supplierController'); // BE-08
const dashboardController = require('../controllers/dashboardController');
const mlopsController = require('../controllers/mlopsController');

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
// 3. PRODUCTS API
// ==========================================
router.get('/products/list', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Staff', 'Admin'), productController.getAllProducts);
router.get('/products/available', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Staff', 'Admin'), productController.getAvailableProducts);
router.get('/products/get/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), productController.getProductById);
router.post('/products/create', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), productController.createProduct);
router.put('/products/update/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), productController.updateProduct);
router.delete('/products/delete/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), productController.deleteProduct);

// ==========================================
// 4. SUPPLIERS API — Chỉ dành cho Manager [BE-08]
// ==========================================
router.get('/suppliers/list', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Staff', 'Admin'), supplierController.getAllSuppliers);
router.post('/suppliers/create', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), supplierController.createSupplier);
router.put('/suppliers/update/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), supplierController.updateSupplier);
router.delete('/suppliers/delete/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), supplierController.deleteSupplier);

// ==========================================
// 5. SALES API — Chỉ dành cho Manager [BE-01]
// ==========================================
router.get('/sales/list', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), salesController.getSalesList);
router.post('/sales/create', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), salesController.createSale);
router.post('/sales/pos-checkout', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Staff', 'Admin'), salesController.posCheckout);
router.post(
    '/sales/import',
    authMiddleware.verifyToken,
    authMiddleware.requireRole('Manager', 'Admin'), // Hạ quyền Admin xuống theo đúng BA v13
    upload.single('file'),
    salesController.importSalesCSV
);

// ==========================================
// 6. PURCHASE ORDERS & INVENTORY API — Phân quyền chuẩn cho Manager & Staff [BE-01]
// ==========================================
router.get('/purchases/list', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Staff', 'Admin'), purchaseController.getPurchases);
router.get('/purchases/detail/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Staff', 'Admin'), purchaseController.getPurchasesDetail);
router.post('/purchases/create', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), purchaseController.createPurchase);
router.get('/purchases/recommendations', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), purchaseController.getPurchaseRecommendations);
router.post('/purchases/create-from-forecast', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), purchaseController.createPurchaseOrdersFromForecast);
router.put('/purchases/approve/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), purchaseController.approvePurchase);
router.put('/purchases/ship/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), purchaseController.shipPurchase);
router.put('/purchases/receive/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Staff', 'Admin'), purchaseController.receiveOrder);
router.put('/purchases/update/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), purchaseController.updatePurchase);
router.delete('/purchases/delete/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), purchaseController.deletePurchase);
router.put('/purchases/cancel/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), purchaseController.cancelPurchase);

// ==========================================
// 7. FORECAST API — Chỉ dành cho Manager [BE-01]
// ==========================================
router.get('/forecast/latest', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), forecastController.getLatestForecast);
router.post('/forecast/run', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), forecastController.runForecast);
router.get('/forecast/saved', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), forecastController.getSavedForecasts);
router.get('/forecast/product/:productId', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), forecastController.getForecastByProduct);

// ==========================================
// 7.1 MLOPS API - Admin only
// ==========================================
router.get('/mlops/overview', authMiddleware.verifyToken, authMiddleware.requireRole('Admin'), mlopsController.getOverview);
router.post('/mlops/train', authMiddleware.verifyToken, authMiddleware.requireRole('Admin'), mlopsController.trainNow);
router.post('/mlops/deploy/:modelId', authMiddleware.verifyToken, authMiddleware.requireRole('Admin'), mlopsController.deployModel);

// ==========================================
// 8. REPORTS API - Chỉ dành cho Manager [BE-01]
// ==========================================
router.get('/reports/sales-summary', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), reportController.getSalesSummary);
router.get('/reports/top-products', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), reportController.getTopProducts);
router.get('/reports/category-sales', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), reportController.getCategorySales);
router.get('/reports/inventory-status', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), reportController.getInventoryStatus);
router.get('/reports/export/excel', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), reportController.exportExcel);
router.get('/reports/export/pdf', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), reportController.exportPDF);
router.get('/reports/sales-trend', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), reportController.getSalesTrend);

// ==========================================
// 8.1 DASHBOARD API
// ==========================================
router.get('/dashboard/stats', authMiddleware.verifyToken, dashboardController.getDashboardStats);
router.get('/dashboard/top-products', authMiddleware.verifyToken, dashboardController.getTopProducts);
router.get('/dashboard/low-stock-forecast', authMiddleware.verifyToken, dashboardController.getLowStockForecast);

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

// Categories
router.get('/categories', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Staff', 'Admin'), categoryController.getAllCategories);
router.post('/categories', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), categoryController.createCategory);
router.put('/categories/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), categoryController.updateCategory);
router.delete('/categories/:id', authMiddleware.verifyToken, authMiddleware.requireRole('Manager', 'Admin'), categoryController.deleteCategory);

module.exports = router;
