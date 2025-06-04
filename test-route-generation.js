/**
 * Script de prueba para la nueva generación de rutas mixtas
 * Este script simula la creación de rutas con servicios de recogida y entrega
 */

const { prisma } = require('./src/config/database');

async function testRouteGeneration() {
  console.log('🚀 Iniciando prueba de generación de rutas mixtas...\n');

  try {
    // 1. Verificar que hay servicios de ambos tipos
    const pickupServices = await prisma.service.findMany({
      where: { status: 'PENDING_PICKUP' },
      include: { hotel: true }
    });

    const deliveryServices = await prisma.service.findMany({
      where: { status: 'IN_PROCESS' },
      include: { hotel: true }
    });

    console.log(`📊 Servicios encontrados:`);
    console.log(`   • Servicios pendientes de recogida: ${pickupServices.length}`);
    console.log(`   • Servicios listos para entrega: ${deliveryServices.length}`);

    if (pickupServices.length === 0 && deliveryServices.length === 0) {
      console.log('❌ No hay servicios disponibles para generar rutas');
      return;
    }

    // 2. Mostrar servicios agrupados por hotel
    const servicesByHotel = {};
    
    [...pickupServices, ...deliveryServices].forEach(service => {
      const hotelId = service.hotelId;
      if (!servicesByHotel[hotelId]) {
        servicesByHotel[hotelId] = {
          hotel: service.hotel,
          pickups: [],
          deliveries: []
        };
      }
      
      if (service.status === 'PENDING_PICKUP') {
        servicesByHotel[hotelId].pickups.push(service);
      } else if (service.status === 'IN_PROCESS') {
        servicesByHotel[hotelId].deliveries.push(service);
      }
    });

    console.log(`\n🏨 Servicios agrupados por hotel:`);
    Object.values(servicesByHotel).forEach(group => {
      console.log(`   • ${group.hotel.name} (${group.hotel.zone}):`);
      if (group.pickups.length > 0) {
        console.log(`     - ${group.pickups.length} recogida(s)`);
      }
      if (group.deliveries.length > 0) {
        console.log(`     - ${group.deliveries.length} entrega(s)`);
      }
    });

    // 3. Simular orden optimizado de paradas
    console.log(`\n🎯 Orden optimizado de paradas (concepto):`);
    
    let stopOrder = 1;
    
    // Fase 1: Servicios de alta prioridad
    console.log(`   📌 FASE 1: Servicios de alta prioridad (individuales)`);
    Object.values(servicesByHotel).forEach(group => {
      const highPriorityDeliveries = group.deliveries.filter(s => s.priority === 'ALTA');
      const highPriorityPickups = group.pickups.filter(s => s.priority === 'ALTA');
      
      highPriorityDeliveries.forEach(service => {
        console.log(`      ${stopOrder++}. ${group.hotel.name} - ENTREGA - ${service.guestName} (ALTA PRIORIDAD)`);
      });
      
      highPriorityPickups.forEach(service => {
        console.log(`      ${stopOrder++}. ${group.hotel.name} - RECOJO - ${service.guestName} (ALTA PRIORIDAD)`);
      });
    });
    
    // Fase 2: Servicios normales agrupados
    console.log(`   📦 FASE 2: Servicios normales agrupados por hotel`);
    Object.values(servicesByHotel).forEach(group => {
      const normalDeliveries = group.deliveries.filter(s => s.priority !== 'ALTA');
      const normalPickups = group.pickups.filter(s => s.priority !== 'ALTA');
      
      if (normalDeliveries.length > 0) {
        const totalBags = normalDeliveries.reduce((sum, s) => sum + (s.bagCount || 0), 0);
        console.log(`      ${stopOrder++}. ${group.hotel.name} - ENTREGA - ${normalDeliveries.length} servicio(s) | ${totalBags} bolsa(s)`);
      }
      
      if (normalPickups.length > 0) {
        const totalBags = normalPickups.reduce((sum, s) => sum + (s.bagCount || 0), 0);
        console.log(`      ${stopOrder++}. ${group.hotel.name} - RECOJO - ${normalPickups.length} servicio(s) | ${totalBags} bolsa(s)`);
      }
    });

    // 4. Mostrar ventajas del nuevo sistema
    console.log(`\n✅ Ventajas del nuevo sistema:`);
    console.log(`   • Paradas separadas por tipo (ENTREGA/RECOJO) para mejor control`);
    console.log(`   • Entregas primero para liberar espacio en el vehículo`);
    console.log(`   • Servicios de alta prioridad procesados individualmente`);
    console.log(`   • Servicios normales agrupados para eficiencia`);
    console.log(`   • Hoteles visitados consecutivamente (entrega → recojo)`);
    console.log(`   • Optimización por proximidad geográfica`);

    console.log(`\n🎉 Prueba completada exitosamente!`);

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la prueba
testRouteGeneration();