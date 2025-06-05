const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkServiceStatuses() {
  try {
    console.log('🔍 VERIFICANDO ESTADOS REALES DE SERVICIOS...\n');
    
    // Obtener todos los servicios y sus estados únicos
    const allServices = await prisma.service.findMany({
      include: { hotel: true },
      orderBy: { createdAt: 'desc' }
    });
    
    // Agrupar por estado
    const statusGroups = {};
    allServices.forEach(service => {
      const status = service.status;
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(service);
    });
    
    console.log('📊 ESTADOS ENCONTRADOS EN LA BASE DE DATOS:');
    console.log('=' .repeat(60));
    
    Object.keys(statusGroups).sort().forEach(status => {
      const services = statusGroups[status];
      console.log(`\n🏷️  ESTADO: "${status}" (${services.length} servicios)`);
      
      services.forEach(service => {
        console.log(`   - ${service.guestName} (${service.bagCount} bolsas) - ${service.hotel.name} - Hab. ${service.roomNumber}`);
      });
    });
    
    // Buscar servicios que parecen estar "esperando" entrega
    console.log('\n\n🎯 ANÁLISIS PARA ENTREGAS:');
    console.log('=' .repeat(60));
    
    const deliveryServices = allServices.filter(s => 
      s.isDeliveryService === true || 
      ['READY_FOR_DELIVERY', 'IN_PROCESS', 'COMPLETED'].includes(s.status) ||
      (s.deliveredBagCount !== null && s.deliveredBagCount > 0)
    );
    
    console.log(`\n🚚 Servicios que parecen ser de ENTREGA (${deliveryServices.length}):`);
    deliveryServices.forEach(service => {
      const assignedTo = service.deliveryRepartidorId ? 'Con repartidor' : 'Sin repartidor';
      console.log(`   - ${service.guestName} (${service.status}) - ${assignedTo} - ${service.hotel.name}`);
    });
    
    // Buscar servicios sin repartidor asignado que podrían ser candidatos para rutas
    const candidatesForRoutes = allServices.filter(s => 
      (s.status === 'PENDING_PICKUP' && !s.repartidorId) ||
      (['READY_FOR_DELIVERY', 'IN_PROCESS', 'COMPLETED'].includes(s.status) && !s.deliveryRepartidorId)
    );
    
    console.log(`\n⭐ CANDIDATOS PARA RUTAS (sin repartidor asignado): ${candidatesForRoutes.length}`);
    candidatesForRoutes.forEach(service => {
      const type = service.status === 'PENDING_PICKUP' ? '📦 RECOJO' : '🚚 ENTREGA';
      console.log(`   ${type} - ${service.guestName} (${service.status}) - ${service.hotel.name}`);
    });
    
    console.log('\n💡 RECOMENDACIÓN:');
    if (candidatesForRoutes.length > 0) {
      console.log('   ✅ Hay servicios disponibles para generar rutas');
      console.log('   🎯 Estos servicios pueden usarse directamente');
    } else {
      console.log('   ⚠️ No hay servicios sin asignar disponibles');
      console.log('   💡 Necesitas crear servicios nuevos o liberar repartidores asignados');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServiceStatuses();