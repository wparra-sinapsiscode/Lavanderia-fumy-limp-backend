const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAllUpdates() {
  try {
    console.log('🚀 EJECUTANDO TODAS LAS ACTUALIZACIONES NECESARIAS\n');
    
    // PASO 1: Actualizar servicios ESPERANDO para que sean elegibles para rutas
    console.log('📅 PASO 1: Actualizando fechas de servicios ESPERANDO...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Buscar servicios listos para entrega (sin repartidor asignado)
    const deliveryServices = await prisma.service.findMany({
      where: {
        status: { in: ['READY_FOR_DELIVERY', 'IN_PROCESS', 'COMPLETED'] },
        deliveryRepartidorId: null
      },
      include: { hotel: true }
    });
    
    console.log(`   Encontrados ${deliveryServices.length} servicios listos para entrega`);
    
    // Actualizar fechas para que sean elegibles mañana
    for (const service of deliveryServices) {
      await prisma.service.update({
        where: { id: service.id },
        data: {
          estimatedDeliveryDate: new Date(`${tomorrowStr}T10:00:00.000Z`),
          estimatedPickupDate: service.estimatedPickupDate || new Date(`${tomorrowStr}T08:00:00.000Z`)
        }
      });
      
      console.log(`   ✅ ${service.guestName} (${service.bagCount} bolsas) - ${service.hotel.name}`);
    }
    
    // PASO 2: Crear un servicio de recojo para tener rutas mixtas
    console.log(`\n📦 PASO 2: Creando servicio de recojo para ${tomorrowStr}...`);
    
    // Obtener un hotel para el servicio de prueba
    const hotel = await prisma.hotel.findFirst();
    if (!hotel) {
      console.log('   ❌ No hay hoteles disponibles');
      return;
    }
    
    // Crear servicio de recojo
    const newPickupService = await prisma.service.create({
      data: {
        guestName: 'Cliente Recojo Prueba',
        roomNumber: '501',
        bagCount: 3,
        status: 'PENDING_PICKUP',
        priority: 'NORMAL',
        hotelId: hotel.id,
        estimatedPickupDate: new Date(`${tomorrowStr}T09:00:00.000Z`),
        estimatedDeliveryDate: new Date(`${tomorrowStr}T16:00:00.000Z`),
        serviceType: 'PICKUP'
      }
    });
    
    console.log(`   ✅ Servicio de recojo creado: ${newPickupService.guestName} - ${hotel.name}`);
    
    // PASO 3: Verificar servicios disponibles para rutas
    console.log(`\n🔍 PASO 3: Verificando servicios disponibles para rutas del ${tomorrowStr}...`);
    
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
          // Entregas listas para entrega
          {
            status: { in: ['IN_PROCESS', 'READY_FOR_DELIVERY', 'COMPLETED'] },
            deliveryRepartidorId: null,
            estimatedDeliveryDate: {
              gte: new Date(`${tomorrowStr}T00:00:00.000Z`),
              lt: new Date(`${tomorrowStr}T23:59:59.999Z`)
            }
          }
        ]
      },
      include: { hotel: true },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });
    
    const pickupServices = availableServices.filter(s => s.status === 'PENDING_PICKUP');
    const availableDeliveryServices = availableServices.filter(s => ['IN_PROCESS', 'READY_FOR_DELIVERY', 'COMPLETED'].includes(s.status));
    
    console.log(`\n📦 SERVICIOS DE RECOJO disponibles (${pickupServices.length}):`);
    pickupServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.priority || 'NORMAL'}) - ${s.hotel.name} - Hab. ${s.roomNumber}`);
    });
    
    console.log(`\n🚚 SERVICIOS DE ENTREGA disponibles (${availableDeliveryServices.length}):`);
    availableDeliveryServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas, ${s.status}) - ${s.hotel.name} - Hab. ${s.roomNumber}`);
    });
    
    const totalServices = pickupServices.length + availableDeliveryServices.length;
    console.log(`\n✅ RESUMEN FINAL:`);
    console.log(`   📊 Total servicios para rutas: ${totalServices}`);
    console.log(`   📦 Recojos: ${pickupServices.length}`);
    console.log(`   🚚 Entregas: ${availableDeliveryServices.length}`);
    console.log(`   📅 Fecha objetivo: ${tomorrowStr}`);
    
    if (totalServices > 0) {
      console.log(`\n🎯 ¡TODO LISTO! Próximos pasos:`);
      console.log(`   1. Ve al frontend en /routes`);
      console.log(`   2. Selecciona fecha: ${tomorrowStr}`);
      console.log(`   3. Haz clic en "Generar Rutas Automáticas"`);
      console.log(`   4. Verifica que se generen rutas MIXTAS con ambos tipos de servicios`);
      console.log(`   5. Revisa el orden: Entregas ESPERANDO primero, luego recojos`);
    } else {
      console.log(`\n⚠️ No hay servicios disponibles para generar rutas`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runAllUpdates();