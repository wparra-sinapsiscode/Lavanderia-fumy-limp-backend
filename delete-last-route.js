const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteLastRoute() {
  try {
    console.log('🗑️ Eliminando última ruta generada...');
    
    // Buscar la ruta más reciente del 2025-06-06
    const lastRoute = await prisma.route.findFirst({
      where: {
        date: {
          gte: new Date('2025-06-06T00:00:00.000Z'),
          lt: new Date('2025-06-06T23:59:59.999Z')
        }
      },
      include: {
        stops: {
          include: {
            service: true,
            hotel: true
          }
        },
        repartidor: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!lastRoute) {
      console.log('❌ No se encontró ninguna ruta para eliminar');
      return;
    }
    
    console.log(`📋 Ruta encontrada: ${lastRoute.name}`);
    console.log(`   👤 Repartidor: ${lastRoute.repartidor.name}`);
    console.log(`   📊 ${lastRoute.stops.length} paradas`);
    
    // Mostrar servicios que se van a liberar
    console.log('\n🔓 Servicios que se liberarán:');
    for (const stop of lastRoute.stops) {
      if (stop.service) {
        console.log(`   - ${stop.service.guestName} (${stop.service.bagCount} bolsas) - ${stop.hotel.name}`);
        console.log(`     Estado actual: ${stop.service.status} → volverá a estar disponible`);
      }
    }
    
    console.log('\n🚀 Eliminando ruta y liberando servicios...');
    
    await prisma.$transaction(async (tx) => {
      // 1. Liberar servicios (quitar repartidor y restaurar estado)
      for (const stop of lastRoute.stops) {
        if (stop.service) {
          const service = stop.service;
          
          // Determinar el estado original
          let newStatus = 'PENDING_PICKUP'; // Por defecto
          let updateData = {
            repartidorId: null,
            status: newStatus
          };
          
          // Si era entrega, limpiar deliveryRepartidorId
          if (service.status === 'ASSIGNED_TO_DELIVERY_ROUTE' || 
              ['READY_FOR_DELIVERY', 'COMPLETED', 'PARTIAL_DELIVERY'].includes(service.status)) {
            updateData = {
              deliveryRepartidorId: null,
              status: service.status === 'ASSIGNED_TO_DELIVERY_ROUTE' ? 'READY_FOR_DELIVERY' : service.status
            };
          }
          
          await tx.service.update({
            where: { id: service.id },
            data: updateData
          });
          
          console.log(`   ✅ ${service.guestName} liberado`);
        }
      }
      
      // 2. Eliminar paradas de la ruta
      await tx.routeStop.deleteMany({
        where: { routeId: lastRoute.id }
      });
      
      // 3. Eliminar la ruta
      await tx.route.delete({
        where: { id: lastRoute.id }
      });
    });
    
    console.log('\n✅ ¡Ruta eliminada exitosamente!');
    console.log('   📦 Los servicios están disponibles para nuevas rutas');
    console.log('   🔄 Puedes generar rutas de nuevo con el backend corregido');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteLastRoute();