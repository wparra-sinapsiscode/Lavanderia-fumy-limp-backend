const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndFreeServices() {
  try {
    console.log('🔍 VERIFICANDO ESTADO ACTUAL DE SERVICIOS...\n');
    
    // 1. Ver todos los servicios y su estado real
    const allServices = await prisma.service.findMany({
      include: { hotel: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('📊 ESTADO ACTUAL DE TODOS LOS SERVICIOS:');
    allServices.forEach((s, i) => {
      const repartidor = s.repartidorId ? `Repartidor: ${s.repartidorId}` : 'Sin repartidor';
      const deliveryRepartidor = s.deliveryRepartidorId ? `DeliveryRepartidor: ${s.deliveryRepartidorId}` : 'Sin delivery repartidor';
      
      console.log(`\n   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name} - Hab. ${s.roomNumber}`);
      console.log(`      Estado: ${s.status} | ServiceType: ${s.serviceType}`);
      console.log(`      ${repartidor} | ${deliveryRepartidor}`);
      console.log(`      EstimatedPickupDate: ${s.estimatedPickupDate}`);
      console.log(`      EstimatedDeliveryDate: ${s.estimatedDeliveryDate}`);
    });
    
    // 2. Buscar rutas existentes
    console.log('\n🗺️ RUTAS EXISTENTES:');
    const routes = await prisma.route.findMany({
      include: {
        repartidor: true,
        stops: {
          include: {
            service: true,
            hotel: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`   Total rutas: ${routes.length}`);
    routes.forEach((route, i) => {
      console.log(`\n   ${i+1}. ${route.name} - ${route.repartidor.name} (${route.date.toISOString().split('T')[0]})`);
      console.log(`      Estado: ${route.status} | Paradas: ${route.stops.length}`);
      route.stops.forEach((stop, j) => {
        if (stop.service) {
          console.log(`        ${j+1}. ${stop.service.guestName} (${stop.service.bagCount} bolsas) - ${stop.hotel.name}`);
          console.log(`           Estado servicio: ${stop.service.status}`);
        }
      });
    });
    
    // 3. Liberar servicios asignados que no deberían estarlo
    console.log('\n🔓 LIBERANDO SERVICIOS ASIGNADOS...');
    
    const servicesToFree = allServices.filter(s => 
      s.repartidorId !== null || s.deliveryRepartidorId !== null
    );
    
    if (servicesToFree.length > 0) {
      console.log(`   Servicios a liberar: ${servicesToFree.length}`);
      
      for (const service of servicesToFree) {
        const updates = {};
        
        if (service.repartidorId) {
          updates.repartidorId = null;
          if (service.status === 'ASSIGNED_TO_ROUTE') {
            updates.status = 'PENDING_PICKUP';
          }
        }
        
        if (service.deliveryRepartidorId) {
          updates.deliveryRepartidorId = null;
        }
        
        await prisma.service.update({
          where: { id: service.id },
          data: updates
        });
        
        console.log(`   ✅ ${service.guestName} liberado`);
      }
    } else {
      console.log('   No hay servicios que liberar');
    }
    
    // 4. Eliminar rutas existentes
    if (routes.length > 0) {
      console.log('\n🗑️ ELIMINANDO RUTAS EXISTENTES...');
      
      await prisma.$transaction(async (tx) => {
        // Eliminar paradas
        await tx.routeStop.deleteMany({
          where: { routeId: { in: routes.map(r => r.id) } }
        });
        
        // Eliminar rutas
        await tx.route.deleteMany({
          where: { id: { in: routes.map(r => r.id) } }
        });
      });
      
      console.log(`   ✅ ${routes.length} rutas eliminadas`);
    }
    
    // 5. Verificar servicios disponibles finales
    console.log('\n📊 SERVICIOS DISPONIBLES DESPUÉS DE LIMPIEZA:');
    
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
    
    console.log(`\n📦 RECOJOS DISPONIBLES: ${pickupServices.length}`);
    pickupServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name}`);
    });
    
    console.log(`\n🚚 ENTREGAS DISPONIBLES: ${deliveryServices.length}`);
    deliveryServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name}`);
    });
    
    const total = pickupServices.length + deliveryServices.length;
    console.log(`\n🎯 TOTAL PARA RUTAS: ${total}`);
    
    if (total > 0) {
      console.log('\n✅ SISTEMA LIMPIO Y LISTO');
      console.log('   Ve al frontend y genera rutas para 2025-06-06');
    } else {
      console.log('\n⚠️ NO HAY SERVICIOS DISPONIBLES');
      console.log('   Verifica fechas y estados');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFreeServices();