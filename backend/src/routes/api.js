const express = require('express');
const router = express.Router();

// Import các file controllers
const apiController = require('../controllers/apiController');
const authController = require('../controllers/authController');
const authMiddlware = require('../middleware/authMiddleware');

// Phần Thanh thêm 
const userController = require('../controllers/userController');
const forecastController = require('../controllers/forecastController');
router.get('/users/list', userController.getAllUsers);
router.get('/forecast/latest', forecastController.getLatestForecast);
router.post('/users/create', userController.createUser);
router.put('/users/update/:id', userController.updateUser);
router.delete('/users/delete/:id', userController.deleteUser);

// Khai báo các API
router.get('/status', apiController.getStatus);
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authMiddlware.verifyToken, authController.logout);

router.get('/products/list', authMiddlware.verifyToken, require('../controllers/productController').getAllProducts);
router.get('/products/get/:id', authMiddlware.verifyToken, require('../controllers/productController').getProductById);
router.post('/products/create', authMiddlware.verifyToken, require('../controllers/productController').createProduct);
router.put('/products/update/:id', authMiddlware.verifyToken, require('../controllers/productController').updateProduct);
router.delete('/products/delete/:id', authMiddlware.verifyToken, require('../controllers/productController').deleteProduct);

router.get('/sales/list', authMiddlware.verifyToken, require('../controllers/salesController').getSalesSummary);
router.post('/sales/create', authMiddlware.verifyToken, require('../controllers/salesController').createSale);

router.post('/purchases/create', authMiddlware.verifyToken, require('../controllers/purchaseController').createPurchase);
router.get('/purchases/list', authMiddlware.verifyToken, require('../controllers/purchaseController').getPurchases);
router.get('/purchases/detail/:id', authMiddlware.verifyToken, require('../controllers/purchaseController').getPurchasesDetail);

module.exports = router;