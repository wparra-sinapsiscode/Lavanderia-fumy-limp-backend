/**
 * Server entry point for Fumy Limp Backend
 */

const app = require('./src/app');
const { disconnectFromDatabase } = require('./src/config/database');

// Set port
const PORT = process.env.PORT || 3001;

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📌 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    console.log('Process terminated');
    disconnectFromDatabase()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    console.log('Process terminated');
    disconnectFromDatabase()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
});