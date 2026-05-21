const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Thư mục lưu file tạm

// Import các file controllers
const apiController = require('../controllers/apiController');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const forecastController = require('../controllers/forecastController');
const authMiddlware = require('../middleware/authMiddleware'); // Lỗi type-o nhỏ của bạn: authMiddlware 
const reportController = require('../controllers/reportController');
const activityLogController = require('../controllers/activityLogController');

// ==========================================
// 1. SYSTEM & AUTH API
// ==========================================
router.get('/status', apiController.getStatus);
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authMiddlware.verifyToken, authController.logout);

// ==========================================
// 2. USERS API (Task BE-02) - ĐÃ VÁ LỖI BẢO MẬT
// ==========================================
router.get('/users/list', authMiddlware.verifyToken, userController.getAllUsers);
router.post('/users/create', authMiddlware.verifyToken, userController.createUser);
router.put('/users/update/:id', authMiddlware.verifyToken, userController.updateUser);
router.delete('/users/delete/:id', authMiddlware.verifyToken, userController.deleteUser);

// ==========================================
// 3. PRODUCTS API (Task BE-03)
// ==========================================
router.get('/products/list', authMiddlware.verifyToken, require('../controllers/productController').getAllProducts);
router.get('/products/get/:id', authMiddlware.verifyToken, require('../controllers/productController').getProductById);
router.post('/products/create', authMiddlware.verifyToken, require('../controllers/productController').createProduct);
router.put('/products/update/:id', authMiddlware.verifyToken, require('../controllers/productController').updateProduct);
router.delete('/products/delete/:id', authMiddlware.verifyToken, require('../controllers/productController').deleteProduct);

// ==========================================
// 4. SALES API (Task BE-04 & BE-05) - ĐÃ VÁ LỖI BẢO MẬT
// ==========================================
router.get('/sales/list', authMiddlware.verifyToken, require('../controllers/salesController').getSalesList);
router.post('/sales/create', authMiddlware.verifyToken, require('../controllers/salesController').createSale);
router.post('/sales/import', authMiddlware.verifyToken, upload.single('file'), require('../controllers/salesController').importSalesCSV);

// ==========================================
// 5. PURCHASE ORDERS & INVENTORY API (Task BE-07 & BE-08) - ĐÃ VÁ LỖI BẢO MẬT
// ==========================================
router.get('/purchases/list', authMiddlware.verifyToken, require('../controllers/purchaseController').getPurchases);
router.get('/purchases/detail/:id', authMiddlware.verifyToken, require('../controllers/purchaseController').getPurchasesDetail);
router.post('/purchases/create', authMiddlware.verifyToken, require('../controllers/purchaseController').createPurchase);
router.put('/purchases/receive/:id', authMiddlware.verifyToken, require('../controllers/purchaseController').receiveOrder);
// TODO (Thiếu): router.put('/purchases/update/:id', ...);
// TODO (Thiếu): router.delete('/purchases/delete/:id', ...);

// ==========================================
// 6. FORECAST API (Task BE-06) - ĐÃ VÁ LỖI BẢO MẬT
// ==========================================
router.get('/forecast/latest', authMiddlware.verifyToken, forecastController.getLatestForecast);
// TODO (Thiếu): router.post('/forecast/run', ...);

// ==========================================
// 7. REPORTS API (Task BE-09)
// ==========================================
router.get('/reports/sales-summary', authMiddlware.verifyToken, reportController.getSalesSummary);
router.get('/reports/top-products', authMiddlware.verifyToken, reportController.getTopProducts);
router.get('/reports/category-sales', authMiddlware.verifyToken, reportController.getCategorySales);
router.get('/reports/inventory-status', authMiddlware.verifyToken, reportController.getInventoryStatus);

// ==========================================
// 8. ACTIVITY LOG API (Task BE-10)
// ==========================================
router.get('/activity-logs/list', authMiddlware.verifyToken, activityLogController.getLogs);

module.exports = router;