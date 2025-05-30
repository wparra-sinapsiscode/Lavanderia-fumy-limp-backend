/**
 * Guest routes for Fumy Limp Backend
 */

const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guest.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Register guest and create service
router.post('/register', guestController.registerGuest);

// Validate inventory before registering guest
router.get('/validate-inventory', guestController.validateInventory);

// Get guest history by name and room
router.get('/history', guestController.getGuestHistory);

// Get guest statistics (admin only)
router.get('/statistics', isAdmin, guestController.getGuestStatistics);

module.exports = router;