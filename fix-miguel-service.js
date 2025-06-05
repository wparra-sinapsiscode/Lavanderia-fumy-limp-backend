const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMiguelService() {
  try {
    console.log('🔧 Arreglando servicio de Miguel...');
    
    // 1. Buscar servicio de Miguel en IN_PROCESS
    const miguelService = await prisma.service.findFirst({
      where: {
        guestName: 'Miguel diaz',
        status: 'IN_PROCESS'
      },
      include: { hotel: true }
    });
    
    if (!miguelService) {
      console.log('❌ No se encontró servicio de Miguel en IN_PROCESS');
      return;
    }
    
    console.log(`   📋 Encontrado: ${miguelService.guestName} (${miguelService.bagCount} bolsas) - ${miguelService.hotel.name}`);
    
    // 2. Completar el servicio original (recojo terminado)
    console.log('   ✅ Completando servicio de recojo...');
    await prisma.service.update({
      where: { id: miguelService.id },
      data: {
        status: 'COMPLETED',
        processStartDate: new Date(),
        deliveryDate: new Date()
      }
    });
    
    // 3. Crear servicio de entrega separado
    console.log('   🚚 Creando servicio de entrega separado...');
    
    // Fecha para mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const estimatedDelivery = new Date(tomorrow);
    estimatedDelivery.setHours(14, 0, 0, 0); // 2:00 PM
    
    const deliveryService = await prisma.service.create({
      data: {
        guestName: miguelService.guestName,
        roomNumber: miguelService.roomNumber,
        hotelId: miguelService.hotelId,
        bagCount: miguelService.bagCount,
        weight: miguelService.weight,
        priority: miguelService.priority,
        status: 'READY_FOR_DELIVERY',
        serviceType: 'DELIVERY',
        isDeliveryService: true,
        originalServiceId: miguelService.id,
        estimatedPickupDate: estimatedDelivery,
        estimatedDeliveryDate: estimatedDelivery,
        price: miguelService.price,
        internalNotes: `Servicio de entrega creado desde ${miguelService.id} - Recojo completado`
      }
    });
    
    console.log(`   ✅ Servicio de entrega creado: ${deliveryService.id}`);
    
    // 4. Verificar resultado
    console.log('\n📊 RESULTADO:');
    console.log(`   📦 Servicio original: ${miguelService.guestName} - ${miguelService.hotel.name} - COMPLETED`);
    console.log(`   🚚 Servicio entrega: ${deliveryService.guestName} - Hab. ${deliveryService.roomNumber} - READY_FOR_DELIVERY`);
    
    console.log('\n✅ ¡Miguel corregido! Ahora:');
    console.log('   - Recojo: COMPLETED (no aparece en rutas)');
    console.log('   - Entrega: READY_FOR_DELIVERY (disponible para rutas)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMiguelService();