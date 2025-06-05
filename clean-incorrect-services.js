const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanIncorrectServices() {
  try {
    console.log('🧹 Limpiando servicios incorrectos...');
    
    // 1. Eliminar servicios de "Entrega Media" y "Recojo Normal" que son de prueba
    const deletedTestServices = await prisma.service.deleteMany({
      where: {
        OR: [
          { guestName: { contains: 'Entrega Media' } },
          { guestName: { contains: 'Recojo Normal' } }
        ]
      }
    });
    
    console.log(`🗑️ Eliminados ${deletedTestServices.count} servicios de prueba incorrectos`);
    
    // 2. Verificar servicios legítimos restantes
    const remainingServices = await prisma.service.findMany({
      include: { hotel: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📋 Servicios legítimos restantes: ${remainingServices.length}`);
    
    // 3. Categorizar los servicios reales
    const pickupServices = remainingServices.filter(s => 
      s.serviceType === 'PICKUP' && 
      !s.isDeliveryService &&
      ['PENDING_PICKUP', 'ASSIGNED_TO_ROUTE', 'PICKED_UP', 'LABELED', 'IN_PROCESS', 'COMPLETED'].includes(s.status)
    );
    
    const deliveryServices = remainingServices.filter(s => 
      (s.isDeliveryService === true || s.serviceType === 'DELIVERY') &&
      ['READY_FOR_DELIVERY', 'PARTIAL_DELIVERY', 'COMPLETED'].includes(s.status)
    );
    
    console.log(`\n📦 SERVICIOS DE RECOJO REALES: ${pickupServices.length}`);
    pickupServices.forEach(s => {
      console.log(`  - ${s.guestName} (${s.status}) - ${s.hotel.name} - Hab. ${s.roomNumber}`);
    });
    
    console.log(`\n🚚 SERVICIOS DE ENTREGA REALES: ${deliveryServices.length}`);
    deliveryServices.forEach(s => {
      console.log(`  - ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name} - Hab. ${s.roomNumber}`);
    });
    
    // 4. Verificar si hay servicios disponibles para rutas mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const availableForRoutes = await prisma.service.findMany({
      where: {
        OR: [
          // Recojos pendientes para mañana
          {
            status: 'PENDING_PICKUP',
            repartidorId: null,
            estimatedPickupDate: {
              gte: new Date(`${tomorrowStr}T00:00:00.000Z`),
              lt: new Date(`${tomorrowStr}T23:59:59.999Z`)
            }
          },
          // Entregas listas para mañana
          {
            status: { in: ['IN_PROCESS', 'READY_FOR_DELIVERY'] },
            deliveryRepartidorId: null,
            estimatedDeliveryDate: {
              gte: new Date(`${tomorrowStr}T00:00:00.000Z`),
              lt: new Date(`${tomorrowStr}T23:59:59.999Z`)
            }
          }
        ]
      },
      include: { hotel: true }
    });
    
    console.log(`\n🎯 Servicios disponibles para rutas el ${tomorrowStr}: ${availableForRoutes.length}`);
    availableForRoutes.forEach(s => {
      const type = s.status === 'PENDING_PICKUP' ? '📦 RECOJO' : '🚚 ENTREGA';
      console.log(`  ${type} - ${s.guestName} (${s.priority || 'NORMAL'}) - ${s.hotel.name}`);
    });
    
    if (availableForRoutes.length === 0) {
      console.log(`\n⚠️ No hay servicios disponibles para generar rutas el ${tomorrowStr}`);
      console.log('💡 Sugerencia: Actualiza las fechas estimadas de algunos servicios para probar la generación de rutas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanIncorrectServices();