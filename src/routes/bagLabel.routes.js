/**
 * Bag Label routes for Fumy Limp Backend
 */

const express = require('express');
const router = express.Router();
const bagLabelController = require('../controllers/bagLabel.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Create single bag label (for rotulado process)
router.post('/single', uploadMiddleware.uploadBagLabelPhoto, bagLabelController.createSingleBagLabel);

// Get a specific label by ID
router.get('/:id', bagLabelController.getLabelById);

// Update a label
router.put('/:id', bagLabelController.updateLabel);

// Upload photo for a label
router.post('/:id/photo', bagLabelController.uploadLabelPhoto);

// Delete a label (admin only)
router.delete('/:id', isAdmin, bagLabelController.deleteLabel);

module.exports = router;