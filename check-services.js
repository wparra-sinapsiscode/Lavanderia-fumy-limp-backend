const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkServices() {
  try {
    console.log('🔍 CONSULTANDO SERVICIOS EN LA BASE DE DATOS...');
    
    // Get today's date in proper format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    console.log('📅 Fecha objetivo:', todayStr);
    
    // Query services with the same logic as the route generation
    const allServices = await prisma.service.findMany({
      include: {
        hotel: true
      },
      orderBy: [
        { estimatedPickupDate: 'asc' }
      ]
    });
    
    console.log(`📊 TOTAL DE SERVICIOS EN DB: ${allServices.length}`);
    
    // Group by status
    const byStatus = {};
    allServices.forEach(service => {
      if (!byStatus[service.status]) byStatus[service.status] = [];
      byStatus[service.status].push(service);
    });
    
    console.log('\n📈 SERVICIOS POR ESTADO:');
    Object.entries(byStatus).forEach(([status, services]) => {
      console.log(`  ${status}: ${services.length}`);
    });
    
    // Check PENDING_PICKUP specifically
    const pendingPickup = allServices.filter(s => s.status === 'PENDING_PICKUP');
    console.log(`\n🔍 SERVICIOS CON ESTADO 'PENDING_PICKUP': ${pendingPickup.length}`);
    
    pendingPickup.forEach((service, index) => {
      console.log(`  ${index + 1}. Hotel: ${service.hotel.name} (${service.hotel.zone}) - Huésped: ${service.guestName} - Fecha: ${service.estimatedPickupDate} - RepartidorId: ${service.repartidorId}`);
    });
    
    // Check services without repartidor assigned
    const unassigned = pendingPickup.filter(s => s.repartidorId === null);
    console.log(`\n🟡 SERVICIOS SIN REPARTIDOR ASIGNADO: ${unassigned.length}`);
    
    unassigned.forEach((service, index) => {
      console.log(`  ${index + 1}. Hotel: ${service.hotel.name} (${service.hotel.zone}) - Huésped: ${service.guestName} - Fecha: ${service.estimatedPickupDate}`);
    });
    
    // Check the actual query that generateAutomaticRoutes would use
    console.log('\n🔍 SIMULANDO CONSULTA DE GENERACIÓN AUTOMÁTICA...');
    
    const whereService = {
      OR: [
        {
          status: 'PENDING_PICKUP',
          repartidorId: null,
          estimatedPickupDate: {
            gte: new Date(todayStr + 'T00:00:00.000Z'),
            lt: new Date(todayStr + 'T24:00:00.000Z')
          }
        }
      ],
      hotel: {
        zone: { in: ['NORTE', 'SUR', 'ESTE', 'OESTE', 'CENTRO'] }
      }
    };
    
    const servicesForRoutes = await prisma.service.findMany({
      where: whereService,
      include: {
        hotel: true
      }
    });
    
    console.log(`📊 SERVICIOS QUE CUMPLEN CRITERIOS PARA RUTAS: ${servicesForRoutes.length}`);
    
    servicesForRoutes.forEach((service, index) => {
      console.log(`  ${index + 1}. ${service.hotel.name} (${service.hotel.zone}) - ${service.guestName} - Status: ${service.status} - RepartidorId: ${service.repartidorId}`);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

checkServices();