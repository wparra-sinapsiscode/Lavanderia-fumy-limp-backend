/**
 * Routes index for Fumy Limp Backend
 * Centralizes all API routes
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const hotelRoutes = require('./hotel.routes');
const serviceRoutes = require('./service.routes');
const bagLabelRoutes = require('./bagLabel.routes');
const transactionRoutes = require('./transaction.routes');
const dashboardRoutes = require('./dashboard.routes');
const guestRoutes = require('./guest.routes');
const userRoutes = require('./user.routes');
const auditRoutes = require('./audit.routes');
const geocodeRoutes = require('./geocode.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/hotels', hotelRoutes);
router.use('/services', serviceRoutes);
router.use('/labels', bagLabelRoutes);
router.use('/transactions', transactionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/guests', guestRoutes);
router.use('/users', userRoutes);
router.use('/audit', auditRoutes);
router.use('/geocode', geocodeRoutes);

// Export router
module.exports = router;