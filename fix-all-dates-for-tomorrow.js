const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllDatesForTomorrow() {
  try {
    console.log('📅 ACTUALIZANDO TODAS LAS FECHAS PARA MAÑANA (2025-06-06)...\n');
    
    // Fecha objetivo: 2025-06-06
    const targetDate = new Date('2025-06-06T10:00:00.000Z'); // 5:00 AM Lima
    const deliveryDate = new Date('2025-06-06T19:00:00.000Z'); // 2:00 PM Lima
    
    console.log(`🎯 Fecha objetivo pickup: ${targetDate.toISOString()}`);
    console.log(`🎯 Fecha objetivo delivery: ${deliveryDate.toISOString()}\n`);
    
    // 1. Actualizar servicios de RECOJO (PENDING_PICKUP)
    console.log('📦 ACTUALIZANDO SERVICIOS DE RECOJO:');
    const pickupServices = await prisma.service.findMany({
      where: {
        status: 'PENDING_PICKUP'
      },
      include: { hotel: true }
    });
    
    console.log(`   Servicios de recojo encontrados: ${pickupServices.length}`);
    
    for (const service of pickupServices) {
      await prisma.service.update({
        where: { id: service.id },
        data: {
          estimatedPickupDate: targetDate,
          repartidorId: null // Asegurar que esté libre
        }
      });
      
      console.log(`   ✅ ${service.guestName} (${service.bagCount} bolsas) - ${service.hotel.name}`);
      console.log(`      Nueva fecha pickup: ${targetDate.toISOString()}`);
    }
    
    // 2. Actualizar servicios de ENTREGA (READY_FOR_DELIVERY)
    console.log('\n🚚 ACTUALIZANDO SERVICIOS DE ENTREGA:');
    const deliveryServices = await prisma.service.findMany({
      where: {
        status: 'READY_FOR_DELIVERY'
      },
      include: { hotel: true }
    });
    
    console.log(`   Servicios de entrega encontrados: ${deliveryServices.length}`);
    
    for (const service of deliveryServices) {
      await prisma.service.update({
        where: { id: service.id },
        data: {
          estimatedDeliveryDate: deliveryDate,
          estimatedPickupDate: deliveryDate, // También actualizar pickup
          deliveryRepartidorId: null // Asegurar que esté libre
        }
      });
      
      console.log(`   ✅ ${service.guestName} (${service.bagCount} bolsas) - ${service.hotel.name}`);
      console.log(`      Nueva fecha delivery: ${deliveryDate.toISOString()}`);
    }
    
    // 3. Verificar servicios disponibles para 2025-06-06
    console.log('\n📊 VERIFICACIÓN PARA 2025-06-06:');
    
    const availablePickups = await prisma.service.findMany({
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
    
    console.log(`\n📦 RECOJOS DISPONIBLES PARA 2025-06-06: ${availablePickups.length}`);
    availablePickups.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name}`);
      console.log(`      Fecha: ${s.estimatedPickupDate.toISOString()}`);
    });
    
    console.log(`\n🚚 ENTREGAS DISPONIBLES PARA 2025-06-06: ${availableDeliveries.length}`);
    availableDeliveries.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name}`);
      console.log(`      Fecha: ${s.estimatedDeliveryDate.toISOString()}`);
    });
    
    const total = availablePickups.length + availableDeliveries.length;
    
    console.log(`\n🎯 TOTAL SERVICIOS DISPONIBLES: ${total}`);
    console.log(`   📦 Recojos: ${availablePickups.length}`);
    console.log(`   🚚 Entregas: ${availableDeliveries.length}`);
    
    if (total > 0) {
      console.log('\n🚀 ¡PERFECTO! Servicios listos para 2025-06-06');
      console.log('   1. Ve al frontend');
      console.log('   2. Selecciona fecha: 2025-06-06');
      console.log('   3. Genera rutas automáticas');
      console.log(`   4. Deberías ver ${total} servicios en las rutas`);
    } else {
      console.log('\n❌ No hay servicios disponibles');
      console.log('   Verifica los estados de los servicios');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllDatesForTomorrow();