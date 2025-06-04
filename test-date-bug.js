/**
 * Test específico para reproducir el bug de fechas
 * donde el usuario hace clic en día 4 pero se muestran rutas del día 3
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Configurar zona horaria como en el backend
process.env.TZ = 'America/Lima';

const prisma = new PrismaClient({
  log: ['error']
});

async function testDateBug() {
  console.log('🐛 REPRODUCING DATE BUG - User clicks day 4, shows routes from day 3');
  console.log('='.repeat(80));
  
  await prisma.$connect();
  
  // Clean up any test data first
  await cleanupTestData();
  
  // Step 1: Create test routes for days 3 and 4
  await createTestRoutes();
  
  // Step 2: Simulate frontend clicking on day 4
  await simulateFrontendBehavior();
  
  await prisma.$disconnect();
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Delete any existing test routes
  const deleted = await prisma.route.deleteMany({
    where: {
      OR: [
        { name: { contains: 'TEST_DAY_3' } },
        { name: { contains: 'TEST_DAY_4' } }
      ]
    }
  });
  
  console.log(`   Deleted ${deleted.count} test routes`);
}

async function createTestRoutes() {
  console.log('\n📅 Creating test routes for consecutive days...');
  
  // Create a route for June 3rd using the normalizeDateForDB function from the backend
  const day3Date = normalizeDateForDB('2025-06-03');
  const day4Date = normalizeDateForDB('2025-06-04');
  
  console.log(`   Creating route for day 3: ${day3Date.toISOString()}`);
  const route3 = await prisma.route.create({
    data: {
      name: 'TEST_DAY_3_ROUTE',
      date: day3Date,
      repartidorId: null, // We'll create without repartidor for simplicity
      status: 'PLANNED',
      notes: 'Test route for June 3rd'
    }
  });
  console.log(`   ✅ Created route ID ${route3.id} for day 3`);
  
  console.log(`   Creating route for day 4: ${day4Date.toISOString()}`);
  const route4 = await prisma.route.create({
    data: {
      name: 'TEST_DAY_4_ROUTE', 
      date: day4Date,
      repartidorId: null,
      status: 'PLANNED',
      notes: 'Test route for June 4th'
    }
  });
  console.log(`   ✅ Created route ID ${route4.id} for day 4`);
}

async function simulateFrontendBehavior() {
  console.log('\n📱 SIMULATING FRONTEND BEHAVIOR');
  console.log('-'.repeat(50));
  
  // Simulate user clicking on day 4 in the calendar
  const userSelectedDate = '2025-06-04';
  console.log(`👆 User clicks on day 4 in calendar`);
  console.log(`📅 Frontend selectedDate: ${userSelectedDate}`);
  
  // Now simulate what happens in the backend when this date is sent to API
  console.log('\n🖥️ BACKEND PROCESSING:');
  
  // This is the exact logic from route.controller.js getRoutes function
  const { date } = { date: userSelectedDate }; // Simulate req.query
  
  console.log(`   Received date parameter: ${date}`);
  
  // Extraer YYYY-MM-DD de la fecha recibida
  const targetDate = date.includes('T') ? date.split('T')[0] : date;
  console.log(`   Extracted targetDate: ${targetDate}`);
  
  // Usar UTC explícitamente para evitar desfase de zona horaria
  const [year, month, day] = targetDate.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  
  console.log(`   Query startDate: ${startDate.toISOString()}`);
  console.log(`   Query endDate: ${endDate.toISOString()}`);
  console.log(`   Query range day (UTC): ${startDate.getUTCDate()}`);
  
  // Execute the actual database query
  console.log('\n💾 DATABASE QUERY:');
  const routes = await prisma.route.findMany({
    where: {
      date: {
        gte: startDate,
        lt: endDate
      }
    },
    orderBy: {
      date: 'desc'
    }
  });
  
  console.log(`   Found ${routes.length} routes in date range:`);
  routes.forEach((route, index) => {
    console.log(`   ${index + 1}. "${route.name}" - Date: ${route.date.toISOString()} (Day ${route.date.getUTCDate()})`);
  });
  
  // Analysis
  console.log('\n🔍 ANALYSIS:');
  if (routes.length === 0) {
    console.log('   ❌ No routes found - this could indicate the date range is wrong');
  } else {
    const dayNumbers = routes.map(r => r.date.getUTCDate());
    const expectedDay = parseInt(targetDate.split('-')[2]);
    
    console.log(`   Expected day: ${expectedDay}`);
    console.log(`   Found routes for days: [${dayNumbers.join(', ')}]`);
    
    const hasCorrectDay = dayNumbers.includes(expectedDay);
    const hasWrongDay = dayNumbers.some(d => d !== expectedDay);
    
    if (hasCorrectDay && !hasWrongDay) {
      console.log('   ✅ Correct routes found');
    } else if (hasWrongDay && !hasCorrectDay) {
      console.log('   🐛 BUG REPRODUCED: Wrong day routes found!');
    } else if (hasCorrectDay && hasWrongDay) {
      console.log('   ⚠️ Mixed results: both correct and wrong day routes found');
    }
  }
  
  // Now test the other direction - check what dates are stored vs what we're looking for
  console.log('\n🔄 REVERSE CHECK - All stored dates vs our query:');
  const allTestRoutes = await prisma.route.findMany({
    where: {
      OR: [
        { name: { contains: 'TEST_DAY_3' } },
        { name: { contains: 'TEST_DAY_4' } }
      ]
    }
  });
  
  allTestRoutes.forEach(route => {
    const isInRange = route.date >= startDate && route.date < endDate;
    console.log(`   "${route.name}": ${route.date.toISOString()} (Day ${route.date.getUTCDate()}) - In range: ${isInRange ? 'YES' : 'NO'}`);
  });
}

// Helper function from backend (exact copy)
function normalizeDateForDB(dateString) {
  // Extract YYYY-MM-DD from date string
  const targetDate = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  const [year, month, day] = targetDate.split('-').map(Number);
  
  // Create date at noon UTC to avoid timezone issues
  // Using noon ensures the date stays consistent regardless of timezone
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

// Run the test
testDateBug()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });