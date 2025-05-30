/**
 * Hotel routes for Fumy Limp Backend
 */

const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotel.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get all hotels (with optional zone filtering)
router.get('/', hotelController.getAllHotels);

// Get hotel by ID
router.get('/:id', hotelController.getHotelById);

// Create hotel (admin only)
router.post('/', isAdmin, hotelController.createHotel);

// Update hotel (admin only)
router.put('/:id', isAdmin, hotelController.updateHotel);

// Update hotel inventory (admin only)
router.put('/:id/inventory', isAdmin, hotelController.updateInventory);

// Get services for a specific hotel
router.get('/:id/services', hotelController.getHotelServices);

module.exports = router;