const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupThisPcRoutes() {
  try {
    console.log('🚀 CONFIGURANDO RUTAS PARA ESTA PC\n');
    
    // PASO 1: Verificar servicios actuales
    console.log('📊 PASO 1: Verificando servicios actuales...');
    const allServices = await prisma.service.findMany({
      include: { hotel: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`   Total servicios encontrados: ${allServices.length}`);
    
    // Mostrar servicios por estado
    const servicesByStatus = {};
    allServices.forEach(service => {
      if (!servicesByStatus[service.status]) {
        servicesByStatus[service.status] = [];
      }
      servicesByStatus[service.status].push(service);
    });
    
    console.log('\n📋 Servicios por estado:');
    Object.keys(servicesByStatus).forEach(status => {
      console.log(`   🏷️  ${status} (${servicesByStatus[status].length} servicios):`);
      servicesByStatus[status].forEach(s => {
        console.log(`      - ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name} - Hab. ${s.roomNumber}`);
      });
    });
    
    // PASO 2: Identificar servicios "Esperando" 
    console.log('\n🔍 PASO 2: Buscando servicios "Esperando"...');
    
    // Basándome en el frontend, "Esperando" probablemente es READY_FOR_DELIVERY
    const waitingServices = allServices.filter(s => 
      s.status === 'READY_FOR_DELIVERY' && 
      s.deliveryRepartidorId === null
    );
    
    console.log(`   Servicios "Esperando" encontrados: ${waitingServices.length}`);
    waitingServices.forEach(s => {
      console.log(`   - ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name} - ${s.status}`);
    });
    
    // PASO 3: Preparar fechas para mañana
    console.log('\n📅 PASO 3: Actualizando fechas para mañana...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(7, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(17, 0, 0, 0);
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    console.log(`   Fecha objetivo: ${tomorrowStr}`);
    
    // Actualizar servicios sin fechas de entrega
    let updatedCount = 0;
    for (const service of allServices) {
      if (!service.estimatedDeliveryDate || 
          new Date(service.estimatedDeliveryDate) < new Date()) {
        
        await prisma.service.update({
          where: { id: service.id },
          data: {
            estimatedDeliveryDate: tomorrowEnd,
            estimatedPickupDate: service.estimatedPickupDate || tomorrowStart
          }
        });
        updatedCount++;
      }
    }
    console.log(`   ✅ ${updatedCount} servicios actualizados con fechas`);
    
    // PASO 4: Verificar servicios disponibles para rutas
    console.log('\n🎯 PASO 4: Servicios disponibles para rutas del ' + tomorrowStr + '...');
    
    const availableServices = await prisma.service.findMany({
      where: {
        OR: [
          // Recojos pendientes
          {
            status: 'PENDING_PICKUP',
            repartidorId: null,
            estimatedPickupDate: {
              gte: new Date(`${tomorrowStr}T00:00:00.000Z`),
              lt: new Date(`${tomorrowStr}T23:59:59.999Z`)
            }
          },
          // Entregas listas (excluye IN_PROCESS como acordamos)
          {
            status: { in: ['READY_FOR_DELIVERY', 'COMPLETED', 'PARTIAL_DELIVERY'] },
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
    
    const pickupServices = availableServices.filter(s => s.status === 'PENDING_PICKUP');
    const deliveryServices = availableServices.filter(s => 
      ['READY_FOR_DELIVERY', 'COMPLETED', 'PARTIAL_DELIVERY'].includes(s.status)
    );
    
    console.log(`\n📦 SERVICIOS DE RECOJO disponibles (${pickupServices.length}):`);
    pickupServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.priority || 'NORMAL'}) - ${s.hotel.name} - Hab. ${s.roomNumber}`);
    });
    
    console.log(`\n🚚 SERVICIOS DE ENTREGA disponibles (${deliveryServices.length}):`);
    deliveryServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas, ${s.status}) - ${s.hotel.name} - Hab. ${s.roomNumber}`);
    });
    
    const totalServices = pickupServices.length + deliveryServices.length;
    console.log(`\n✅ RESUMEN FINAL:`);
    console.log(`   📊 Total servicios para rutas: ${totalServices}`);
    console.log(`   📦 Recojos: ${pickupServices.length}`);
    console.log(`   🚚 Entregas: ${deliveryServices.length}`);
    console.log(`   📅 Fecha objetivo: ${tomorrowStr}`);
    
    if (totalServices > 0) {
      console.log(`\n🎯 ¡LISTO! Próximos pasos:`);
      console.log(`   1. Ve al frontend en /routes`);
      console.log(`   2. Selecciona fecha: ${tomorrowStr}`);
      console.log(`   3. Haz clic en "Generar Rutas Automáticas"`);
      console.log(`   4. Verifica rutas MIXTAS con orden correcto:`);
      console.log(`      - 🚚 Entregas primero (por prioridad)`);
      console.log(`      - 📦 Recojos después`);
    } else {
      console.log(`\n⚠️  No hay servicios disponibles para rutas.`);
      console.log(`   Verifica que los estados y fechas sean correctos.`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupThisPcRoutes();