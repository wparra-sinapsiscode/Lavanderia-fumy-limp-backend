const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRouteFlow() {
  try {
    console.log('🧪 TESTING COMPLETE ROUTE FLOW');
    console.log('================================');
    
    // 1. Check if database is accessible
    console.log('1️⃣ Testing database connection...');
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }
    console.log('✅ Database connection successful');
    
    // 2. Check hotels with zones
    console.log('\n2️⃣ Checking hotels with zones...');
    const hotels = await prisma.hotel.findMany({
      select: {
        id: true,
        name: true,
        zone: true,
        bagInventory: true
      }
    });
    
    if (hotels.length === 0) {
      console.log('❌ No hotels found');
      return;
    }
    
    console.log(`✅ Found ${hotels.length} hotels:`);
    hotels.forEach(hotel => {
      console.log(`   - ${hotel.name} (${hotel.zone}) - ${hotel.bagInventory} bolsas`);
    });
    
    // 3. Check services without repartidor
    console.log('\n3️⃣ Checking services eligible for route generation...');
    const eligibleServices = await prisma.service.findMany({
      where: {
        status: 'PENDING_PICKUP',
        repartidorId: null
      },
      include: {
        hotel: {
          select: {
            name: true,
            zone: true
          }
        }
      }
    });
    
    console.log(`✅ Found ${eligibleServices.length} services eligible for route generation:`);
    eligibleServices.forEach(service => {
      console.log(`   - ${service.guestName} @ ${service.hotel.name} (${service.hotel.zone})`);
    });
    
    // 4. Check repartidores by zone
    console.log('\n4️⃣ Checking available repartidores by zone...');
    const repartidores = await prisma.user.findMany({
      where: {
        role: 'REPARTIDOR',
        active: true
      },
      select: {
        id: true,
        name: true,
        zone: true
      }
    });
    
    console.log(`✅ Found ${repartidores.length} active repartidores:`);
    repartidores.forEach(rep => {
      console.log(`   - ${rep.name} (${rep.zone})`);
    });
    
    // 5. Group services by zone
    console.log('\n5️⃣ Analyzing services by zone for route generation...');
    const servicesByZone = {};
    eligibleServices.forEach(service => {
      const zone = service.hotel.zone;
      if (!servicesByZone[zone]) {
        servicesByZone[zone] = [];
      }
      servicesByZone[zone].push(service);
    });
    
    Object.entries(servicesByZone).forEach(([zone, services]) => {
      const repsInZone = repartidores.filter(rep => rep.zone === zone);
      console.log(`   🌍 ${zone}: ${services.length} servicios, ${repsInZone.length} repartidores`);
      services.forEach(service => {
        console.log(`      - ${service.guestName} (Hab. ${service.roomNumber})`);
      });
    });
    
    // 6. Verify route generation readiness
    console.log('\n6️⃣ Route generation readiness check...');
    const zonesWithServices = Object.keys(servicesByZone);
    const zonesWithRepartidores = [...new Set(repartidores.map(rep => rep.zone))];
    
    let canGenerateRoutes = true;
    let readyZones = [];
    
    zonesWithServices.forEach(zone => {
      if (zonesWithRepartidores.includes(zone)) {
        readyZones.push(zone);
        console.log(`   ✅ ${zone}: Ready for route generation`);
      } else {
        console.log(`   ⚠️ ${zone}: Has services but no repartidores`);
        canGenerateRoutes = false;
      }
    });
    
    if (canGenerateRoutes && readyZones.length > 0) {
      console.log(`\n🎉 READY TO GENERATE ROUTES FOR ${readyZones.length} ZONES!`);
      console.log(`   Zones ready: ${readyZones.join(', ')}`);
      console.log(`   Total services: ${eligibleServices.length}`);
      console.log(`   Total repartidores: ${repartidores.length}`);
    } else {
      console.log('\n⚠️ ROUTE GENERATION NOT READY');
      if (eligibleServices.length === 0) {
        console.log('   - No eligible services (need PENDING_PICKUP with repartidorId: null)');
      }
      if (repartidores.length === 0) {
        console.log('   - No active repartidores available');
      }
    }
    
    console.log('\n🏁 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRouteFlow();
}

module.exports = { testRouteFlow };