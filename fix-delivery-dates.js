const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDeliveryDates() {
  try {
    console.log('📅 ACTUALIZANDO FECHAS DE SERVICIOS "ESPERANDO"...\n');
    
    // Buscar servicios READY_FOR_DELIVERY con fechas incorrectas
    const servicesToFix = await prisma.service.findMany({
      where: {
        status: 'READY_FOR_DELIVERY',
        deliveryRepartidorId: null,
        estimatedDeliveryDate: {
          lt: new Date('2025-06-06T00:00:00.000Z')
        }
      },
      include: { hotel: true }
    });
    
    console.log(`📊 Servicios a actualizar: ${servicesToFix.length}`);
    
    if (servicesToFix.length === 0) {
      console.log('✅ No hay servicios que requieran actualizar fechas');
      return;
    }
    
    // Fecha objetivo: mañana
    const tomorrow = new Date('2025-06-06T14:00:00.000Z'); // 2:00 PM UTC = 9:00 AM Lima
    
    console.log('\n🔄 ACTUALIZANDO FECHAS:');
    
    for (const service of servicesToFix) {
      console.log(`   - ${service.guestName} (${service.bagCount} bolsas) - ${service.hotel.name}`);
      console.log(`     Fecha actual: ${service.estimatedDeliveryDate}`);
      console.log(`     Nueva fecha: ${tomorrow}`);
      
      await prisma.service.update({
        where: { id: service.id },
        data: {
          estimatedDeliveryDate: tomorrow,
          estimatedPickupDate: tomorrow // También actualizar pickup date
        }
      });
      
      console.log(`     ✅ Actualizado`);
    }
    
    // Verificar resultado final
    console.log('\n📊 VERIFICACIÓN FINAL:');
    
    const pickupServices = await prisma.service.findMany({
      where: {
        status: 'PENDING_PICKUP',
        repartidorId: null,
        estimatedPickupDate: {
          gte: new Date('2025-06-06T00:00:00.000Z'),
          lt: new Date('2025-06-06T23:59:59.999Z')
        }
      },
      include: { hotel: true }
    });
    
    const deliveryServices = await prisma.service.findMany({
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
    
    console.log(`\n📦 SERVICIOS DE RECOJO DISPONIBLES: ${pickupServices.length}`);
    pickupServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name}`);
    });
    
    console.log(`\n🚚 SERVICIOS DE ENTREGA DISPONIBLES: ${deliveryServices.length}`);
    deliveryServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name}`);
    });
    
    const total = pickupServices.length + deliveryServices.length;
    console.log(`\n🎯 TOTAL SERVICIOS PARA RUTAS: ${total}`);
    console.log('   📦 Recojos: ' + pickupServices.length);
    console.log('   🚚 Entregas: ' + deliveryServices.length);
    
    if (total > 0) {
      console.log('\n🚀 ¡PERFECTO! Ahora los servicios están listos para rutas');
      console.log('   Ve al frontend y genera rutas automáticas para 2025-06-06');
      console.log('   Deberías ver 3 servicios en las rutas generadas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDeliveryDates();