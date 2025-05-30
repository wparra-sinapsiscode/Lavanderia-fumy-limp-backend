/**
 * Audit routes for Fumy Limp Backend
 */

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Apply authentication and admin middleware to all routes
router.use(verifyToken);
router.use(isAdmin);

// Get audit logs with filtering
router.get('/', auditController.getLogs);

// Get audit logs for a specific entity
router.get('/entity/:entityId', auditController.getEntityLogs);

// Export audit logs
router.get('/export', auditController.exportAuditLogs);

// Get audit statistics
router.get('/statistics', auditController.getAuditStatistics);

module.exports = router;