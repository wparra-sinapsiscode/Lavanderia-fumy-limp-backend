const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateDeliveryDates() {
  try {
    console.log('📅 Actualizando fechas de servicios en estado ESPERANDO...');
    
    // Buscar servicios en estado ESPERANDO
    const waitingServices = await prisma.service.findMany({
      where: {
        status: 'ESPERANDO'
      },
      include: { hotel: true }
    });
    
    console.log(`📋 Encontrados ${waitingServices.length} servicios en estado ESPERANDO:`);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Actualizar cada servicio
    for (const service of waitingServices) {
      await prisma.service.update({
        where: { id: service.id },
        data: {
          estimatedDeliveryDate: new Date(`${tomorrowStr}T10:00:00.000Z`),
          // Si no tiene estimatedPickupDate, agregarlo (fecha pasada)
          estimatedPickupDate: service.estimatedPickupDate || new Date(`${tomorrowStr}T08:00:00.000Z`)
        }
      });
      
      console.log(`✅ ${service.guestName} (${service.bagCount} bolsas) - ${service.hotel.name} → Entrega programada para ${tomorrowStr}`);
    }
    
    // Verificar servicios disponibles para rutas
    console.log(`\n🔍 Verificando servicios disponibles para rutas del ${tomorrowStr}:`);
    
    const availableServices = await prisma.service.findMany({
      where: {
        OR: [
          // Recojos pendientes
          {
            status: 'PENDING_PICKUP',
            repartidorId: null,
            estimatedPickupDate: {
              gte: new Date(`${tomorrowStr}T00:00:00.000Z`),
              lt: new Date(`${tomorrowStr}T23:59:59.999Z`)
            }
          },
          // Entregas esperando (ahora incluye ESPERANDO)
          {
            status: { in: ['IN_PROCESS', 'READY_FOR_DELIVERY', 'ESPERANDO'] },
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
    
    const pickupServices = availableServices.filter(s => s.status === 'PENDING_PICKUP');
    const deliveryServices = availableServices.filter(s => ['IN_PROCESS', 'READY_FOR_DELIVERY', 'ESPERANDO'].includes(s.status));
    
    console.log(`\n📦 Servicios de RECOJO disponibles: ${pickupServices.length}`);
    pickupServices.forEach(s => {
      console.log(`  - ${s.guestName} (${s.priority || 'NORMAL'}) - ${s.hotel.name}`);
    });
    
    console.log(`\n🚚 Servicios de ENTREGA disponibles: ${deliveryServices.length}`);
    deliveryServices.forEach(s => {
      console.log(`  - ${s.guestName} (${s.bagCount} bolsas, ${s.status}) - ${s.hotel.name}`);
    });
    
    const totalServices = pickupServices.length + deliveryServices.length;
    console.log(`\n✅ Total servicios disponibles para generar rutas: ${totalServices}`);
    
    if (totalServices > 0) {
      console.log('\n🎯 ¡Listo! Ahora puedes generar rutas mixtas que incluirán:');
      console.log('   📦 Servicios de recojo pendientes');
      console.log('   🚚 Servicios en estado ESPERANDO (listos para entrega)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDeliveryDates();