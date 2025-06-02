/**
 * Route Routes
 * Define endpoints for route management
 */

const express = require('express');
const router = express.Router();
const routeController = require('../controllers/route.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { validateZone } = require('../middleware/zone.middleware');

/**
 * @route   POST /api/routes
 * @desc    Create a new route
 * @access  Private - Authenticated users
 */
router.post(
  '/',
  authMiddleware.verifyToken,
  routeController.createRoute
);

/**
 * @route   GET /api/routes
 * @desc    Get all routes with optional filtering
 * @access  Private - Authenticated users
 */
router.get(
  '/',
  authMiddleware.verifyToken,
  routeController.getRoutes
);

/**
 * @route   GET /api/routes/:id
 * @desc    Get a single route by ID
 * @access  Private - Authenticated users
 */
router.get(
  '/:id',
  authMiddleware.verifyToken,
  routeController.getRouteById
);

/**
 * @route   PUT /api/routes/:id
 * @desc    Update a route's main information
 * @access  Private - Authenticated users
 */
router.put(
  '/:id',
  authMiddleware.verifyToken,
  routeController.updateRoute
);

/**
 * @route   PATCH /api/routes/:id/status
 * @desc    Update a route's status
 * @access  Private - Authenticated users
 */
router.patch(
  '/:id/status',
  authMiddleware.verifyToken,
  routeController.updateRouteStatus
);

/**
 * @route   PATCH /api/routes/:id/start
 * @desc    Start a route (set status to IN_PROGRESS and startTime)
 * @access  Private - Authenticated users
 */
router.patch(
  '/:id/start',
  authMiddleware.verifyToken,
  routeController.startRoute
);

/**
 * @route   PATCH /api/routes/:id/complete
 * @desc    Complete a route (set status to COMPLETED and endTime)
 * @access  Private - Authenticated users
 */
router.patch(
  '/:id/complete',
  authMiddleware.verifyToken,
  routeController.completeRoute
);

/**
 * @route   POST /api/routes/recommended
 * @desc    Generate a recommended route based on pending services
 * @access  Private - Authenticated users
 */
router.post(
  '/recommended',
  authMiddleware.verifyToken,
  routeController.generateRecommendedRoute
);

/**
 * @route   POST /api/routes/generate
 * @desc    Generate an optimized route (alias for recommended)
 * @access  Private - Authenticated users
 */
router.post(
  '/generate',
  authMiddleware.verifyToken,
  routeController.generateRecommendedRoute
);

/**
 * @route   POST /api/routes/:id/optimize
 * @desc    Optimize a route based on location coordinates
 * @access  Private - Authenticated users
 */
router.post(
  '/:id/optimize',
  authMiddleware.verifyToken,
  routeController.optimizeRoute
);

/**
 * @route   POST /api/routes/:id/stops
 * @desc    Add a new stop to an existing route
 * @access  Private - Authenticated users
 */
router.post(
  '/:id/stops',
  authMiddleware.verifyToken,
  routeController.addRouteStop
);

/**
 * @route   PUT /api/routes/:routeId/stops/:stopId
 * @desc    Update a route stop
 * @access  Private - Authenticated users
 */
router.put(
  '/:routeId/stops/:stopId',
  authMiddleware.verifyToken,
  routeController.updateRouteStop
);

/**
 * @route   DELETE /api/routes/:routeId/stops/:stopId
 * @desc    Delete a route stop
 * @access  Private - Authenticated users
 */
router.delete(
  '/:routeId/stops/:stopId',
  authMiddleware.verifyToken,
  routeController.deleteRouteStop
);

/**
 * @route   DELETE /api/routes/:id
 * @desc    Delete a route with all its stops
 * @access  Private - Authenticated users with Admin role
 */
router.delete(
  '/:id',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  routeController.deleteRoute
);

/**
 * @route   DELETE /api/routes
 * @desc    Delete all routes for a specific date
 * @access  Private - Authenticated users with Admin role
 */
router.delete(
  '/',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  routeController.deleteRoutesByDate
);

module.exports = router;