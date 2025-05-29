/**
 * Database configuration for Fumy Limp Backend
 */

const { PrismaClient } = require('@prisma/client');

// Create Prisma Client instance with logging options
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error']
});

// Initialize database connection
async function connectToDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection established');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Gracefully disconnect from database
async function disconnectFromDatabase() {
  try {
    await prisma.$disconnect();
    console.log('Database connection closed');
    return true;
  } catch (error) {
    console.error('Error disconnecting from database:', error);
    return false;
  }
}

module.exports = {
  prisma,
  connectToDatabase,
  disconnectFromDatabase
};