/**
 * Authentication routes for Fumy Limp Backend
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const { validateUserRegistration, validateLogin, validate } = require('../middleware/validation.middleware');

// Public routes
router.post('/login', validateLogin, validate, authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.get('/me', verifyToken, authController.getMe);
router.post('/logout', verifyToken, authController.logout);

// Admin-only routes
router.post('/register', verifyToken, isAdmin, validateUserRegistration, validate, authController.register);

module.exports = router;