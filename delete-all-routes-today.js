const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllRoutesToday() {
  try {
    console.log('🗑️ Eliminando TODAS las rutas del 2025-06-06...\n');
    
    // Buscar todas las rutas del 2025-06-06
    const routes = await prisma.route.findMany({
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
      }
    });
    
    if (routes.length === 0) {
      console.log('✅ No hay rutas del 2025-06-06 para eliminar');
      return;
    }
    
    console.log(`📋 ${routes.length} rutas encontradas para eliminar:`);
    routes.forEach((route, i) => {
      console.log(`   ${i+1}. ${route.name} - ${route.repartidor.name} (${route.stops.length} paradas)`);
    });
    
    console.log('\n🚀 Eliminando todas las rutas...');
    
    await prisma.$transaction(async (tx) => {
      // Liberar todos los servicios de todas las rutas
      for (const route of routes) {
        for (const stop of route.stops) {
          if (stop.service) {
            const service = stop.service;
            
            // Determinar cómo liberar el servicio
            let updateData = {};
            
            if (service.status === 'ASSIGNED_TO_ROUTE') {
              // Era un recojo
              updateData = {
                repartidorId: null,
                status: 'PENDING_PICKUP'
              };
            } else if (['READY_FOR_DELIVERY', 'COMPLETED', 'PARTIAL_DELIVERY'].includes(service.status)) {
              // Era una entrega
              updateData = {
                deliveryRepartidorId: null
                // Mantener el status original
              };
            }
            
            await tx.service.update({
              where: { id: service.id },
              data: updateData
            });
            
            console.log(`   ✅ ${service.guestName} liberado (${service.status})`);
          }
        }
        
        // Eliminar paradas de la ruta
        await tx.routeStop.deleteMany({
          where: { routeId: route.id }
        });
        
        // Eliminar la ruta
        await tx.route.delete({
          where: { id: route.id }
        });
        
        console.log(`   🗑️ ${route.name} eliminada`);
      }
    });
    
    console.log('\n✅ ¡Todas las rutas eliminadas exitosamente!');
    console.log('   📦 Todos los servicios están disponibles para nuevas rutas');
    console.log('   🚀 Ve al frontend y genera rutas con el backend corregido');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllRoutesToday();