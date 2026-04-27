const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Define API routes
router.get('/status', apiController.getStatus);

// Example to be expanded later:
// router.get('/products', apiController.getProducts);

module.exports = router;
