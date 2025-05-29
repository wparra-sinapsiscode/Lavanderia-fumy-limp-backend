/**
 * Authentication routes for Fumy Limp Backend
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { validateUserRegistration, validateLogin, validate } = require('../middleware/validation.middleware');

// Public routes
router.post('/login', validateLogin, validate, authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

// Admin-only routes
router.post('/register', authenticate, isAdmin, validateUserRegistration, validate, authController.register);

module.exports = router;