/**
 * Main application file for Fumy Limp Backend
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import database connection
const { connectToDatabase, prisma } = require('./config/database');

// Import routes
const apiRoutes = require('./routes/index');

// Initialize Express
const app = express();

// Connect to database
connectToDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // For handling base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Serve uploads directory as static
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Fumy Limp API running',
    environment: process.env.NODE_ENV,
    timestamp: new Date()
  });
});

// API Routes
app.use('/api', apiRoutes);

// Set up a scheduled job to clean up expired tokens
const cleanupExpiredTokens = async () => {
  try {
    const result = await prisma.revokedToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
    console.log(`Cleaned up ${result.count} expired tokens`);
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
};

// Run cleanup every 24 hours
setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);

// Run an initial cleanup on startup
cleanupExpiredTokens();

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;