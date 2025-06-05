const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugRouteIssue() {
  try {
    console.log('🔍 DEBUGGEANDO PROBLEMA DE RUTAS...\n');
    
    // 1. Ver todos los servicios disponibles
    console.log('📊 SERVICIOS DISPONIBLES PARA RUTAS:');
    const availableServices = await prisma.service.findMany({
      where: {
        OR: [
          // Recojos
          {
            status: 'PENDING_PICKUP',
            repartidorId: null,
            estimatedPickupDate: {
              gte: new Date('2025-06-06T00:00:00.000Z'),
              lt: new Date('2025-06-06T23:59:59.999Z')
            }
          },
          // Entregas
          {
            status: { in: ['READY_FOR_DELIVERY', 'COMPLETED', 'PARTIAL_DELIVERY'] },
            deliveryRepartidorId: null,
            estimatedDeliveryDate: {
              gte: new Date('2025-06-06T00:00:00.000Z'),
              lt: new Date('2025-06-06T23:59:59.999Z')
            }
          }
        ]
      },
      include: { hotel: true }
    });
    
    console.log(`   Total disponibles: ${availableServices.length}`);
    availableServices.forEach((s, i) => {
      const type = s.status === 'PENDING_PICKUP' ? '📦 RECOJO' : '🚚 ENTREGA';
      const assignedField = s.status === 'PENDING_PICKUP' ? 'repartidorId' : 'deliveryRepartidorId';
      const assignedValue = s.status === 'PENDING_PICKUP' ? s.repartidorId : s.deliveryRepartidorId;
      
      console.log(`   ${i+1}. ${type} - ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name}`);
      console.log(`      Estado: ${s.status} | ${assignedField}: ${assignedValue || 'NULL ✅'}`);
      console.log(`      EstimatedDate: ${s.status === 'PENDING_PICKUP' ? s.estimatedPickupDate : s.estimatedDeliveryDate}`);
    });
    
    // 2. Ver rutas existentes del 2025-06-06
    console.log('\n🗺️ RUTAS EXISTENTES DEL 2025-06-06:');
    const routes = await prisma.route.findMany({
      where: {
        date: {
          gte: new Date('2025-06-06T00:00:00.000Z'),
          lt: new Date('2025-06-06T23:59:59.999Z')
        }
      },
      include: {
        repartidor: true,
        stops: {
          include: {
            service: true,
            hotel: true
          }
        }
      }
    });
    
    console.log(`   Total rutas: ${routes.length}`);
    routes.forEach((route, i) => {
      console.log(`\n   ${i+1}. ${route.name} - ${route.repartidor.name}`);
      console.log(`      Paradas: ${route.stops.length}`);
      route.stops.forEach((stop, j) => {
        if (stop.service) {
          const type = stop.service.status === 'ASSIGNED_TO_ROUTE' ? '📦 RECOJO' : '🚚 ENTREGA';
          console.log(`        ${j+1}. ${type} - ${stop.service.guestName} (${stop.service.bagCount} bolsas) - ${stop.hotel.name}`);
          console.log(`           Estado: ${stop.service.status}`);
        }
      });
    });
    
    // 3. Análisis del problema
    console.log('\n💡 ANÁLISIS DEL PROBLEMA:');
    const pickupServices = availableServices.filter(s => s.status === 'PENDING_PICKUP');
    const deliveryServices = availableServices.filter(s => ['READY_FOR_DELIVERY', 'COMPLETED', 'PARTIAL_DELIVERY'].includes(s.status));
    
    console.log(`   📦 Recojos disponibles: ${pickupServices.length}`);
    console.log(`   🚚 Entregas disponibles: ${deliveryServices.length}`);
    
    if (deliveryServices.length > 0) {
      console.log('\n❌ PROBLEMA IDENTIFICADO:');
      console.log('   Las entregas están disponibles pero no se asignaron a rutas');
      console.log('   El algoritmo encontró los servicios pero no los procesó');
      
      console.log('\n🔧 ENTREGAS NO ASIGNADAS:');
      deliveryServices.forEach((s, i) => {
        console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name} - ${s.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRouteIssue();