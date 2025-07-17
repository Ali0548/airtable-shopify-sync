const express = require('express');
const UserController = require('../controllers/UserController');

const router = express.Router();

// Get all users
router.get('/', UserController.getAllUsers);

// Get active users
router.get('/active', UserController.getActiveUsers);

// Get users by role
router.get('/role/:role', UserController.getUsersByRole);

// Get user by ID
router.get('/:id', UserController.getUserById);

// Create new user
router.post('/', UserController.createUser);

// Update user
router.put('/:id', UserController.updateUser);

// Delete user
router.delete('/:id', UserController.deleteUser);

module.exports = router; 