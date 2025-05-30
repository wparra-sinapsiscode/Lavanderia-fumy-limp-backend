/**
 * Transaction routes for Fumy Limp Backend
 */

const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Apply authentication and admin middleware to all routes
router.use(verifyToken);
router.use(isAdmin);

// Financial summary and reports
router.get('/summary', transactionController.getFinancialSummary);
router.get('/report/daily', transactionController.getDailyReport);
router.get('/report/monthly', transactionController.getMonthlyReport);
router.get('/report/hotel/:hotelId', transactionController.getHotelReport);

// CRUD operations
router.get('/', transactionController.getTransactions);
router.get('/:id', transactionController.getTransactionById);
router.post('/', transactionController.createTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;