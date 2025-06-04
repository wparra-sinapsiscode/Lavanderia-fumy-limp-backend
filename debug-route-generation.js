const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugRouteGeneration() {
  try {
    console.log('🔍 DEPURACIÓN DE GENERACIÓN DE RUTAS');
    console.log('=====================================');
    
    // Get today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    
    console.log(`📅 Fecha objetivo: ${date}`);
    
    // 1. Check total services
    const allServices = await prisma.service.findMany({
      include: {
        hotel: true
      }
    });
    
    console.log(`📊 TOTAL SERVICIOS EN DB: ${allServices.length}`);
    
    // 2. Group by status
    const statusGroups = {};
    allServices.forEach(service => {
      if (!statusGroups[service.status]) statusGroups[service.status] = 0;
      statusGroups[service.status]++;
    });
    
    console.log('\n📈 SERVICIOS POR ESTADO:');
    Object.entries(statusGroups).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // 3. Check PENDING_PICKUP specifically
    const pendingServices = allServices.filter(s => s.status === 'PENDING_PICKUP');
    console.log(`\n🔍 SERVICIOS 'PENDING_PICKUP': ${pendingServices.length}`);
    
    pendingServices.forEach((service, index) => {
      console.log(`  ${index + 1}. ${service.guestName} - Hotel: ${service.hotel.name} (${service.hotel.zone})`);
      console.log(`      Estado: ${service.status}, RepartidorId: ${service.repartidorId}`);
      console.log(`      Fecha estimada: ${service.estimatedPickupDate}`);
    });
    
    // 4. Check services without repartidor
    const unassignedServices = pendingServices.filter(s => s.repartidorId === null);
    console.log(`\n🟡 SERVICIOS SIN REPARTIDOR: ${unassignedServices.length}`);
    
    unassignedServices.forEach((service, index) => {
      console.log(`  ${index + 1}. ${service.guestName} - ${service.hotel.name} (${service.hotel.zone})`);
    });
    
    // 5. Simulate the exact query used by generateAutomaticRoutes
    console.log('\n🔍 SIMULANDO CONSULTA DE GENERACIÓN AUTOMÁTICA');
    
    const whereService = {
      OR: [
        {
          status: 'PENDING_PICKUP',
          repartidorId: null,
          estimatedPickupDate: {
            gte: new Date(date + 'T00:00:00.000Z'),
            lt: new Date(date + 'T24:00:00.000Z')
          }
        }
      ],
      hotel: {
        zone: { in: ['NORTE', 'SUR', 'ESTE', 'OESTE', 'CENTRO'] }
      }
    };
    
    console.log('📋 Consulta exacta:', JSON.stringify(whereService, null, 2));
    
    const routeEligibleServices = await prisma.service.findMany({
      where: whereService,
      include: {
        hotel: true
      }
    });
    
    console.log(`\n📊 SERVICIOS QUE CUMPLEN CRITERIOS: ${routeEligibleServices.length}`);
    
    if (routeEligibleServices.length === 0) {
      console.log('\n❌ NO HAY SERVICIOS ELEGIBLES - ANALIZANDO MOTIVOS:');
      
      // Check each condition separately
      const pendingOnly = await prisma.service.findMany({
        where: { status: 'PENDING_PICKUP' },
        include: { hotel: true }
      });
      console.log(`  📋 Servicios con status PENDING_PICKUP: ${pendingOnly.length}`);
      
      const unassignedOnly = await prisma.service.findMany({
        where: { 
          status: 'PENDING_PICKUP',
          repartidorId: null 
        },
        include: { hotel: true }
      });
      console.log(`  🔓 Servicios PENDING_PICKUP sin repartidor: ${unassignedOnly.length}`);
      
      const dateMatching = await prisma.service.findMany({
        where: { 
          status: 'PENDING_PICKUP',
          repartidorId: null,
          estimatedPickupDate: {
            gte: new Date(date + 'T00:00:00.000Z'),
            lt: new Date(date + 'T24:00:00.000Z')
          }
        },
        include: { hotel: true }
      });
      console.log(`  📅 Servicios con fecha correcta: ${dateMatching.length}`);
      
      // Check dates specifically
      console.log('\n📅 ANÁLISIS DE FECHAS:');
      unassignedOnly.forEach((service, index) => {
        const pickupDate = service.estimatedPickupDate;
        console.log(`  ${index + 1}. ${service.guestName}: ${pickupDate} (zona: ${service.hotel.zone})`);
      });
      
    } else {
      console.log('\n✅ SERVICIOS ELEGIBLES ENCONTRADOS:');
      routeEligibleServices.forEach((service, index) => {
        console.log(`  ${index + 1}. ${service.guestName} - ${service.hotel.name} (${service.hotel.zone})`);
      });
    }
    
    // 6. Check repartidores available
    const repartidores = await prisma.user.findMany({
      where: {
        role: 'REPARTIDOR',
        active: true
      }
    });
    
    console.log(`\n👷 REPARTIDORES DISPONIBLES: ${repartidores.length}`);
    repartidores.forEach((rep, index) => {
      console.log(`  ${index + 1}. ${rep.name} - Zona: ${rep.zone}`);
    });
    
    console.log('\n✅ DEPURACIÓN COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error en depuración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
if (require.main === module) {
  debugRouteGeneration();
}

module.exports = { debugRouteGeneration };