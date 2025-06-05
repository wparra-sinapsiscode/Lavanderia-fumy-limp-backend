const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixServiceStates() {
  try {
    console.log('🔧 Arreglando estados de servicios existentes...');
    
    // 1. Buscar servicios con estado "Esperando" o similar
    const waitingServices = await prisma.service.findMany({
      where: {
        OR: [
          { status: 'ESPERANDO' },
          { status: 'WAITING' },
          { status: 'PENDING_DELIVERY' },
          // También buscar servicios que deberían estar listos para entrega
          {
            AND: [
              { status: 'COMPLETED' },
              { deliveryDate: null } // Completados pero sin fecha de entrega
            ]
          }
        ]
      },
      include: { hotel: true }
    });
    
    console.log(`📋 Encontrados ${waitingServices.length} servicios para arreglar:`);
    
    // 2. Actualizar cada servicio según su situación
    for (const service of waitingServices) {
      let newStatus = 'READY_FOR_DELIVERY';
      let updateData = { status: newStatus };
      
      // Lógica para determinar el estado correcto
      if (service.bagCount > 5) {
        // Servicios grandes probablemente están listos para entrega
        newStatus = 'READY_FOR_DELIVERY';
      } else if (service.guestName.includes('Ernesto') && service.bagCount < 5) {
        // Servicios de Ernesto con pocas bolsas podrían ser entregas parciales
        newStatus = 'PARTIAL_DELIVERY';
      }
      
      updateData.status = newStatus;
      
      // Agregar fechas estimadas si no las tiene
      if (!service.estimatedDeliveryDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        updateData.estimatedDeliveryDate = tomorrow;
      }
      
      if (!service.estimatedPickupDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        updateData.estimatedPickupDate = yesterday;
      }
      
      // Actualizar el servicio
      await prisma.service.update({
        where: { id: service.id },
        data: updateData
      });
      
      console.log(`✅ ${service.guestName} (${service.hotel.name}) → ${newStatus}`);
    }
    
    // 3. Verificar servicios listos para generar rutas
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`\n🔍 Verificando servicios disponibles para ${tomorrowStr}:`);
    
    // Servicios de recojo disponibles
    const pickupServices = await prisma.service.findMany({
      where: {
        status: 'PENDING_PICKUP',
        repartidorId: null,
        estimatedPickupDate: {
          gte: new Date(`${tomorrowStr}T00:00:00.000Z`),
          lt: new Date(`${tomorrowStr}T23:59:59.999Z`)
        }
      },
      include: { hotel: true }
    });
    
    // Servicios de entrega disponibles
    const deliveryServices = await prisma.service.findMany({
      where: {
        OR: [
          {
            status: 'IN_PROCESS',
            deliveryRepartidorId: null,
            estimatedDeliveryDate: {
              gte: new Date(`${tomorrowStr}T00:00:00.000Z`),
              lt: new Date(`${tomorrowStr}T23:59:59.999Z`)
            }
          },
          {
            status: 'READY_FOR_DELIVERY',
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
    
    console.log(`\n📦 Servicios de recojo disponibles: ${pickupServices.length}`);
    pickupServices.forEach(s => {
      console.log(`  - ${s.guestName} (${s.priority || 'NORMAL'}) - ${s.hotel.name}`);
    });
    
    console.log(`\n🚚 Servicios de entrega disponibles: ${deliveryServices.length}`);
    deliveryServices.forEach(s => {
      console.log(`  - ${s.guestName} (${s.priority || 'NORMAL'}) - ${s.hotel.name}`);
    });
    
    console.log(`\n✅ Estados corregidos. Total servicios para rutas: ${pickupServices.length + deliveryServices.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixServiceStates();