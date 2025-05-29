/**
 * Service routes for Fumy Limp Backend
 */

const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const bagLabelController = require('../controllers/bagLabel.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get pending services (dashboard) - this must be before /:id routes to avoid conflict
router.get('/pending', serviceController.getPendingServices);

// Get all services with optional filtering
router.get('/', serviceController.getAllServices);

// Get service by ID
router.get('/:id', serviceController.getServiceById);

// Create new service
router.post('/', serviceController.createService);

// Register pickup for a service
router.put('/:id/pickup', serviceController.registerPickup);

// Change service status
router.put('/:id/status', serviceController.changeStatus);

// Register partial delivery for a service
router.put('/:id/partial-delivery', serviceController.registerPartialDelivery);

// Upload service photos
router.post('/:id/photos', serviceController.uploadPhotos);

// Bag Label routes for services
router.post('/:serviceId/labels', bagLabelController.createLabels);
router.get('/:serviceId/labels', bagLabelController.getServiceLabels);

module.exports = router;