const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAvailableServices() {
  try {
    console.log('🔍 VERIFICANDO SERVICIOS DISPONIBLES PARA RUTAS...\n');
    
    // 1. Servicios de RECOJO disponibles
    console.log('📦 SERVICIOS DE RECOJO DISPONIBLES:');
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
    
    console.log(`   Total: ${pickupServices.length}`);
    pickupServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name} - Hab. ${s.roomNumber}`);
      console.log(`      Estado: ${s.status} | Fecha: ${s.estimatedPickupDate}`);
    });
    
    // 2. Servicios de ENTREGA disponibles (solo READY_FOR_DELIVERY)
    console.log('\n🚚 SERVICIOS DE ENTREGA DISPONIBLES:');
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
    
    console.log(`   Total: ${deliveryServices.length}`);
    deliveryServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name} - Hab. ${s.roomNumber}`);
      console.log(`      Estado: ${s.status} | Fecha: ${s.estimatedDeliveryDate}`);
    });
    
    // 3. Estados excluidos pero que aparecen en el frontend
    console.log('\n❌ SERVICIOS EXCLUIDOS (no elegibles para rutas):');
    const excludedServices = await prisma.service.findMany({
      where: {
        status: { in: ['PARTIAL_DELIVERY', 'COMPLETED'] }
      },
      include: { hotel: true }
    });
    
    console.log(`   Total excluidos: ${excludedServices.length}`);
    excludedServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name} - ${s.status}`);
      console.log(`      Razón: ${s.status} no se incluye en rutas automáticas`);
    });
    
    // 4. Mapeo frontend vs backend
    console.log('\n🔄 MAPEO FRONTEND → BACKEND:');
    console.log('   Frontend "Pendiente de Recojo" → Backend PENDING_PICKUP ✅');
    console.log('   Frontend "Esperando" → Backend READY_FOR_DELIVERY ✅');
    console.log('   Frontend "Entrega Parcial" → Backend PARTIAL_DELIVERY ❌ (excluido)');
    console.log('   Frontend "Completado" → Backend COMPLETED ❌ (excluido)');
    
    // 5. Resumen para rutas
    const totalAvailable = pickupServices.length + deliveryServices.length;
    console.log('\n📊 RESUMEN PARA GENERACIÓN DE RUTAS:');
    console.log(`   📦 Recojos disponibles: ${pickupServices.length}`);
    console.log(`   🚚 Entregas disponibles: ${deliveryServices.length}`);
    console.log(`   🎯 Total servicios para rutas: ${totalAvailable}`);
    
    if (totalAvailable === 0) {
      console.log('\n⚠️  NO HAY SERVICIOS DISPONIBLES PARA RUTAS');
      console.log('   Necesitas servicios con estado READY_FOR_DELIVERY o PENDING_PICKUP');
    } else {
      console.log('\n✅ SERVICIOS LISTOS PARA GENERAR RUTAS');
      console.log('   Ve al frontend y genera rutas automáticas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvailableServices();