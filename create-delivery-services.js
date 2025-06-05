const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDeliveryServices() {
  try {
    console.log('🚚 CREANDO SERVICIOS DE ENTREGA PARA LOS COMPLETADOS...\n');
    
    // Buscar servicios terminados que necesitan entrega
    const completedServices = await prisma.service.findMany({
      where: {
        status: { in: ['COMPLETED', 'PARTIAL_DELIVERY'] },
        // Solo servicios que NO tienen servicios de entrega ya creados
        deliveryServices: {
          none: {}
        }
      },
      include: { hotel: true }
    });
    
    console.log(`📋 Servicios terminados sin entrega: ${completedServices.length}`);
    
    if (completedServices.length === 0) {
      console.log('✅ No hay servicios que requieran crear entregas');
      return;
    }
    
    console.log('\n🔄 CREANDO SERVICIOS DE ENTREGA:');
    
    // Fecha para mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const deliveryTime = new Date(tomorrow);
    deliveryTime.setHours(14, 0, 0, 0); // 2:00 PM
    
    for (const service of completedServices) {
      console.log(`\n   📦 Servicio original: ${service.guestName} - ${service.hotel.name}`);
      console.log(`      Estado: ${service.status} | Bolsas: ${service.bagCount}`);
      
      // Crear servicio de entrega separado
      const deliveryService = await prisma.service.create({
        data: {
          guestName: service.guestName,
          roomNumber: service.roomNumber,
          hotelId: service.hotelId,
          bagCount: service.bagCount,
          weight: service.weight,
          priority: service.priority,
          status: 'READY_FOR_DELIVERY', // ✅ Estado correcto para rutas
          serviceType: 'DELIVERY',
          isDeliveryService: true,
          originalServiceId: service.id,
          estimatedPickupDate: deliveryTime,
          estimatedDeliveryDate: deliveryTime,
          price: service.price,
          internalNotes: `Servicio de entrega creado desde ${service.id} - ${service.status}`
        }
      });
      
      console.log(`   🚚 Servicio entrega: ${deliveryService.guestName} - READY_FOR_DELIVERY`);
      console.log(`      ID: ${deliveryService.id} | Fecha: ${deliveryTime.toISOString().split('T')[0]}`);
    }
    
    // Verificar resultado
    console.log('\n📊 VERIFICANDO SERVICIOS CREADOS...');
    const availableDeliveries = await prisma.service.findMany({
      where: {
        status: 'READY_FOR_DELIVERY',
        deliveryRepartidorId: null,
        estimatedDeliveryDate: {
          gte: new Date('2025-06-06T00:00:00.000Z'),
          lt: new Date('2025-06-06T23:59:59.999Z')
        }
      },
      include: { hotel: true }
    });
    
    console.log(`\n✅ SERVICIOS DE ENTREGA DISPONIBLES: ${availableDeliveries.length}`);
    availableDeliveries.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name}`);
    });
    
    const availablePickups = await prisma.service.findMany({
      where: {
        status: 'PENDING_PICKUP',
        repartidorId: null
      },
      include: { hotel: true }
    });
    
    console.log(`\n📦 SERVICIOS DE RECOJO DISPONIBLES: ${availablePickups.length}`);
    availablePickups.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name}`);
    });
    
    const total = availableDeliveries.length + availablePickups.length;
    console.log(`\n🎯 TOTAL SERVICIOS PARA RUTAS: ${total}`);
    console.log('   📦 Recojos: ' + availablePickups.length);
    console.log('   🚚 Entregas: ' + availableDeliveries.length);
    
    if (total > 0) {
      console.log('\n🚀 ¡Listo para generar rutas!');
      console.log('   Ve al frontend y genera rutas automáticas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDeliveryServices();