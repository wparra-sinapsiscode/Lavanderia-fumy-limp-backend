const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Create a new service
router.post(
  '/',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['ADMIN', 'RECEPCION']),
  serviceController.createService
);

// Create a hotel service (without specific guest)
router.post(
  '/hotel',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['ADMIN', 'RECEPCION']),
  serviceController.createHotelService
);

// Get all services (with filtering)
router.get(
  '/',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['ADMIN', 'RECEPCION']),
  serviceController.getAllServices
);

// Get services by hotel
router.get(
  '/hotel/:hotelId',
  authMiddleware.verifyToken,
  serviceController.getServicesByHotel
);

// Get services by repartidor
router.get(
  '/repartidor/:repartidorId',
  authMiddleware.verifyToken,
  serviceController.getServicesByRepartidor
);

// Get services assigned to current user
router.get(
  '/my-services',
  authMiddleware.verifyToken,
  serviceController.getMyServices
);

// Añadir nuevo endpoint para repartidores (alias de my-services)
router.get(
  '/repartidor',
  authMiddleware.verifyToken,
  serviceController.getMyServices
);

// Get pending services for repartidores to pick up
router.get(
  '/pending',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['ADMIN', 'RECEPCION', 'REPARTIDOR']),
  serviceController.getPendingServices
);

// Get service statistics
router.get(
  '/stats',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['ADMIN']),
  serviceController.getServiceStats
);

// Get service by ID - IMPORTANTE: Esta ruta debe ir DESPUÉS de las rutas específicas
router.get(
  '/:id',
  authMiddleware.verifyToken,
  serviceController.getServiceById
);

// Update service
router.put(
  '/:id',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['ADMIN', 'RECEPCION']),
  serviceController.updateService
);

// Update service status
router.put(
  '/:id/status',
  authMiddleware.verifyToken,
  serviceController.updateServiceStatus
);

// Assign repartidor to service
router.patch(
  '/:id/assign',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['ADMIN', 'RECEPCION']),
  serviceController.assignRepartidor
);

// Delete service
router.delete(
  '/:id',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['ADMIN']),
  serviceController.deleteService
);

module.exports = router;