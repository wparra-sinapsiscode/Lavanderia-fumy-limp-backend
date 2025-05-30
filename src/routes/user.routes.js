/**
 * User routes for Fumy Limp Backend
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Special routes
router.get('/repartidores', userController.getRepartidores);
router.get('/by-zone/:zone', isAdmin, userController.getUsersByZone);

// Regular CRUD routes
router.get('/', isAdmin, userController.getUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', isAdmin, userController.deleteUser);
router.put('/:id/password', userController.changePassword);

module.exports = router;