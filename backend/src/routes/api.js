const express = require('express');
const router = express.Router();

// Import các file controllers
const apiController = require('../controllers/apiController');
const authController = require('../controllers/authController');
const authMiddlware = require('../middleware/authMiddleware');

// Khai báo các API
router.get('/status', apiController.getStatus);
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authMiddlware.verifyToken, authController.logout);

router.get('/products', authMiddlware.verifyToken, require('../controllers/productController').getAllProducts);
router.get('/products/:id', authMiddlware.verifyToken, require('../controllers/productController').getProductById);
router.post('/products', authMiddlware.verifyToken, require('../controllers/productController').createProduct);
router.put('/products/:id', authMiddlware.verifyToken, require('../controllers/productController').updateProduct);
router.delete('/products/:id', authMiddlware.verifyToken, require('../controllers/productController').deleteProduct);

router.get('/sales/summary', authMiddlware.verifyToken, require('../controllers/salesController').getSalesSummary);
router.post('/sales', authMiddlware.verifyToken, require('../controllers/salesController').createSale);

module.exports = router;