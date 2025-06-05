const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revertAllChanges() {
  try {
    console.log('🔄 REVIRTIENDO TODOS LOS CAMBIOS...\n');
    
    // 1. Eliminar todas las rutas del 2025-06-06
    console.log('🗑️ Eliminando rutas del 2025-06-06...');
    const routes = await prisma.route.findMany({
      where: {
        date: {
          gte: new Date('2025-06-06T00:00:00.000Z'),
          lt: new Date('2025-06-06T23:59:59.999Z')
        }
      },
      include: { stops: { include: { service: true } } }
    });
    
    if (routes.length > 0) {
      await prisma.$transaction(async (tx) => {
        // Liberar servicios
        for (const route of routes) {
          for (const stop of route.stops) {
            if (stop.service) {
              await tx.service.update({
                where: { id: stop.service.id },
                data: {
                  repartidorId: null,
                  deliveryRepartidorId: null,
                  status: stop.service.status === 'ASSIGNED_TO_ROUTE' ? 'PENDING_PICKUP' : stop.service.status
                }
              });
            }
          }
        }
        
        // Eliminar paradas y rutas
        await tx.routeStop.deleteMany({
          where: { routeId: { in: routes.map(r => r.id) } }
        });
        
        await tx.route.deleteMany({
          where: { id: { in: routes.map(r => r.id) } }
        });
      });
      console.log(`   ✅ ${routes.length} rutas eliminadas`);
    }
    
    // 2. Revertir serviceTypes incorrectos
    console.log('\n🔧 Revirtiendo serviceTypes...');
    const incorrectServices = await prisma.service.findMany({
      where: {
        status: { in: ['COMPLETED', 'PARTIAL_DELIVERY'] },
        serviceType: 'DELIVERY'
      }
    });
    
    if (incorrectServices.length > 0) {
      for (const service of incorrectServices) {
        await prisma.service.update({
          where: { id: service.id },
          data: {
            serviceType: 'PICKUP',
            isDeliveryService: false
          }
        });
      }
      console.log(`   ✅ ${incorrectServices.length} servicios revertidos a PICKUP`);
    }
    
    // 3. Corregir backend - solo READY_FOR_DELIVERY para entregas
    console.log('\n🎯 CONFIGURACIÓN FINAL CORRECTA:');
    console.log('   📦 RECOJOS: status = PENDING_PICKUP');
    console.log('   🚚 ENTREGAS: status = READY_FOR_DELIVERY únicamente');
    console.log('   ❌ EXCLUIR: COMPLETED, PARTIAL_DELIVERY (no son entregas pendientes)');
    
    // 4. Mostrar servicios disponibles finales
    console.log('\n📊 SERVICIOS DISPONIBLES PARA RUTAS:');
    
    const pickupServices = await prisma.service.findMany({
      where: {
        status: 'PENDING_PICKUP',
        repartidorId: null
      },
      include: { hotel: true }
    });
    
    const deliveryServices = await prisma.service.findMany({
      where: {
        status: 'READY_FOR_DELIVERY',
        deliveryRepartidorId: null
      },
      include: { hotel: true }
    });
    
    console.log(`\n📦 RECOJOS (${pickupServices.length}):`);
    pickupServices.forEach(s => {
      console.log(`   - ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name} - ${s.status}`);
    });
    
    console.log(`\n🚚 ENTREGAS (${deliveryServices.length}):`);
    deliveryServices.forEach(s => {
      console.log(`   - ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name} - ${s.status}`);
    });
    
    console.log('\n✅ SISTEMA REVERTIDO CORRECTAMENTE');
    console.log('   Solo READY_FOR_DELIVERY y PENDING_PICKUP serán elegibles para rutas');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

revertAllChanges();