const express = require('express');
const ShopifyController = require('../controllers/ShopifyController');

const router = express.Router();

// Get all orders with automatic pagination
router.get('/orders/all', ShopifyController.getAllOrders);

// Get orders with custom GraphQL query
router.post('/orders/custom', ShopifyController.getOrders);

// Get orders with manual pagination control
router.get('/orders', ShopifyController.getOrdersPaginated);

// Activate webhooks
router.get('/webhook/activate', ShopifyController.activateWebhook);

// Handle incoming webhooks
// router.post('/webhook/action', ShopifyController.handleWebhook);

module.exports = router; 