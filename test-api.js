/**
 * Fumy Limp API Test Script
 * 
 * This script tests the main API endpoints of the Fumy Limp system to ensure they are functioning correctly.
 * It tests authentication, user management, hotel management, service operations, and transaction handling.
 */

const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@fumylimp.com';
const ADMIN_PASSWORD = 'admin123';
const REPARTIDOR_EMAIL = 'repartidor.norte@fumylimp.com';
const REPARTIDOR_PASSWORD = 'repartidor123';

// Test results tracking
let passedTests = 0;
let totalTests = 0;

// Axios instance for making API requests
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper function to log test results
function logTest(testName, passed, result) {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ ${testName}: PASSED`);
  } else {
    console.log(`❌ ${testName}: FAILED`);
    console.log('   Result:', result);
  }
}

// Helper function to run a test and handle errors
async function runTest(testName, testFunction) {
  try {
    const result = await testFunction();
    logTest(testName, true, result);
    return result;
  } catch (error) {
    const errorMessage = error.response ? 
      `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : 
      error.message;
    
    logTest(testName, false, errorMessage);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('Starting Fumy Limp API Tests...\n');
  
  // Test 1: Authentication - Admin Login
  const adminAuth = await runTest('Admin Authentication', async () => {
    const response = await api.post('/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (!response.data.token || !response.data.user || response.data.user.role !== 'ADMIN') {
      throw new Error('Invalid admin login response');
    }
    
    // Set token for subsequent admin requests
    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    return { userId: response.data.user.id, token: response.data.token };
  });
  
  if (!adminAuth) {
    console.log('❌ Authentication failed. Cannot continue tests.');
    return summarizeTests();
  }
  
  // Test 2: Get User Profile
  await runTest('Get User Profile', async () => {
    const response = await api.get('/auth/profile');
    
    if (!response.data.user || response.data.user.email !== ADMIN_EMAIL) {
      throw new Error('Invalid user profile response');
    }
    
    return response.data.user;
  });
  
  // Test 3: Get Hotels
  const hotels = await runTest('Get Hotels', async () => {
    const response = await api.get('/hotels');
    
    if (!Array.isArray(response.data) || response.data.length === 0) {
      throw new Error('Invalid hotels response');
    }
    
    return response.data;
  });
  
  // Test 4: Get Services
  const services = await runTest('Get Services', async () => {
    const response = await api.get('/services');
    
    if (!Array.isArray(response.data) || response.data.length === 0) {
      throw new Error('Invalid services response');
    }
    
    return response.data;
  });
  
  // Test 5: Get Service by ID
  let serviceId = null;
  if (services && services.length > 0) {
    serviceId = services[0].id;
    
    await runTest('Get Service by ID', async () => {
      const response = await api.get(`/services/${serviceId}`);
      
      if (!response.data || response.data.id !== serviceId) {
        throw new Error('Invalid service details response');
      }
      
      return response.data;
    });
  }
  
  // Test 6: Get Transactions
  await runTest('Get Transactions', async () => {
    const response = await api.get('/transactions');
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid transactions response');
    }
    
    return response.data;
  });
  
  // Test 7: Get Bag Labels
  await runTest('Get Bag Labels', async () => {
    const response = await api.get('/bag-labels');
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid bag labels response');
    }
    
    return response.data;
  });
  
  // Test 8: Create a new service
  let newServiceId = null;
  if (hotels && hotels.length > 0) {
    const hotelId = hotels[0].id;
    
    const newService = await runTest('Create New Service', async () => {
      const serviceData = {
        guestName: 'Test Guest',
        roomNumber: '101',
        hotelId: hotelId,
        bagCount: 2,
        observations: 'Test service created by API test script',
        priority: 'NORMAL',
        estimatedPickupDate: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      };
      
      const response = await api.post('/services', serviceData);
      
      if (!response.data || !response.data.id) {
        throw new Error('Invalid service creation response');
      }
      
      newServiceId = response.data.id;
      return response.data;
    });
  }
  
  // Test 9: Update service status
  if (newServiceId) {
    await runTest('Update Service Status', async () => {
      const updateData = {
        status: 'PICKED_UP',
        pickupDate: new Date().toISOString(),
        weight: 5.5,
        collectorName: 'Test Collector'
      };
      
      const response = await api.patch(`/services/${newServiceId}/status`, updateData);
      
      if (!response.data || response.data.status !== 'PICKED_UP') {
        throw new Error('Invalid service update response');
      }
      
      return response.data;
    });
  }
  
  // Test 10: Create a bag label
  if (newServiceId && hotels && hotels.length > 0) {
    await runTest('Create Bag Label', async () => {
      const labelData = {
        serviceId: newServiceId,
        hotelId: hotels[0].id,
        bagNumber: 1,
        photo: 'https://example.com/test-label.jpg',
        generatedAt: 'LAVANDERIA'
      };
      
      const response = await api.post('/bag-labels', labelData);
      
      if (!response.data || !response.data.id) {
        throw new Error('Invalid bag label creation response');
      }
      
      return response.data;
    });
  }
  
  // Test 11: Create a transaction
  if (newServiceId && hotels && hotels.length > 0) {
    await runTest('Create Transaction', async () => {
      const transactionData = {
        type: 'INCOME',
        amount: 125.50,
        incomeCategory: 'SERVICIO_LAVANDERIA',
        description: 'Test transaction from API test script',
        date: new Date().toISOString(),
        paymentMethod: 'EFECTIVO',
        hotelId: hotels[0].id,
        serviceId: newServiceId,
        notes: 'Test transaction note'
      };
      
      const response = await api.post('/transactions', transactionData);
      
      if (!response.data || !response.data.id) {
        throw new Error('Invalid transaction creation response');
      }
      
      return response.data;
    });
  }
  
  // Test 12: Test Repartidor Authentication
  const repartidorAuth = await runTest('Repartidor Authentication', async () => {
    // First log out (clear token)
    delete api.defaults.headers.common['Authorization'];
    
    const response = await api.post('/auth/login', {
      email: REPARTIDOR_EMAIL,
      password: REPARTIDOR_PASSWORD
    });
    
    if (!response.data.token || !response.data.user || response.data.user.role !== 'REPARTIDOR') {
      throw new Error('Invalid repartidor login response');
    }
    
    // Set token for subsequent repartidor requests
    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    return { userId: response.data.user.id, token: response.data.token };
  });
  
  // Test 13: Get Repartidor Assigned Services
  if (repartidorAuth) {
    await runTest('Get Repartidor Assigned Services', async () => {
      const response = await api.get('/services/assigned');
      
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid assigned services response');
      }
      
      return response.data;
    });
  }
  
  // Test 14: Search Services
  await runTest('Search Services', async () => {
    const response = await api.get('/services/search', {
      params: {
        status: 'PENDING_PICKUP'
      }
    });
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid service search response');
    }
    
    return response.data;
  });
  
  // Test 15: Get Dashboard Stats
  await runTest('Get Dashboard Stats', async () => {
    const response = await api.get('/dashboard/stats');
    
    if (!response.data) {
      throw new Error('Invalid dashboard stats response');
    }
    
    return response.data;
  });
  
  // Summarize test results
  summarizeTests();
}

// Function to print the test summary
function summarizeTests() {
  console.log('\n---------------------------------');
  console.log(`Test Summary: ${passedTests}/${totalTests} tests passed`);
  console.log(`Pass rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log('---------------------------------');
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The API is working correctly.');
  } else {
    console.log(`⚠️ ${totalTests - passedTests} tests failed. Please check the API implementation.`);
  }
}

// Run all tests
runTests().catch(error => {
  console.error('Test execution error:', error);
  summarizeTests();
});