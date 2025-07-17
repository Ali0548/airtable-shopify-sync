const express = require('express');
const IndexController = require('../controllers/IndexController');

const router = express.Router();

// Home page
router.get('/', IndexController.getHome);

// Health check
router.get('/health', IndexController.getHealth);

module.exports = router; 