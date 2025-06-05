const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixServiceTypes() {
  try {
    console.log('🔧 CORRIGIENDO TIPOS DE SERVICIOS...\n');
    
    // Corregir servicios que son de entrega pero tienen tipo PICKUP
    const incorrectServices = await prisma.service.findMany({
      where: {
        serviceType: 'PICKUP',
        status: { in: ['READY_FOR_DELIVERY', 'COMPLETED', 'PARTIAL_DELIVERY'] }
      },
      include: { hotel: true }
    });
    
    console.log(`📊 Servicios a corregir: ${incorrectServices.length}`);
    
    if (incorrectServices.length === 0) {
      console.log('✅ No hay servicios que corregir');
      return;
    }
    
    console.log('\n🔄 CORRIGIENDO SERVICIOS:');
    
    for (const service of incorrectServices) {
      console.log(`   - ${service.guestName} (${service.bagCount} bolsas) - ${service.hotel.name}`);
      console.log(`     ${service.status} | PICKUP → DELIVERY`);
      
      // Actualizar a tipo DELIVERY y marcar como servicio de entrega
      await prisma.service.update({
        where: { id: service.id },
        data: {
          serviceType: 'DELIVERY',
          isDeliveryService: true
          // Nota: No cambiar originalServiceId si ya está null
        }
      });
      
      console.log(`     ✅ Corregido`);
    }
    
    // Verificar resultado
    console.log('\n📊 VERIFICANDO CORRECCIÓN...');
    const deliveryServices = await prisma.service.findMany({
      where: {
        status: { in: ['READY_FOR_DELIVERY', 'COMPLETED', 'PARTIAL_DELIVERY'] },
        deliveryRepartidorId: null
      },
      include: { hotel: true }
    });
    
    console.log(`\n✅ SERVICIOS DE ENTREGA DISPONIBLES (${deliveryServices.length}):`);
    deliveryServices.forEach((s, i) => {
      const correctType = s.serviceType === 'DELIVERY' ? '✅' : '❌';
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name}`);
      console.log(`      Estado: ${s.status} | ServiceType: ${s.serviceType} ${correctType}`);
    });
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('   1. Eliminar rutas existentes del 2025-06-06');
    console.log('   2. Generar rutas de nuevo');
    console.log('   3. Verificar que las entregas se asignen correctamente');
    
    console.log('\n🚀 COMANDOS A EJECUTAR:');
    console.log('   node delete-last-route.js');
    console.log('   # Luego ir al frontend y generar rutas de nuevo');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixServiceTypes();