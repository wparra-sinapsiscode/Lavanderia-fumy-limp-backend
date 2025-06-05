const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkServiceTypes() {
  try {
    console.log('🔍 VERIFICANDO TIPOS DE SERVICIOS...\n');
    
    // Ver servicios de entrega y sus tipos
    const deliveryServices = await prisma.service.findMany({
      where: {
        status: { in: ['READY_FOR_DELIVERY', 'COMPLETED', 'PARTIAL_DELIVERY'] },
        deliveryRepartidorId: null
      },
      include: { hotel: true }
    });
    
    console.log(`📊 SERVICIOS DE ENTREGA (${deliveryServices.length}):`);
    deliveryServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name}`);
      console.log(`      Estado: ${s.status}`);
      console.log(`      ServiceType: ${s.serviceType} ${s.serviceType === 'DELIVERY' ? '✅' : '❌'}`);
      console.log(`      IsDeliveryService: ${s.isDeliveryService}`);
      console.log(`      OriginalServiceId: ${s.originalServiceId || 'NULL'}`);
      console.log('');
    });
    
    // Ver todos los servicios y sus tipos
    console.log('📋 TODOS LOS SERVICIOS Y SUS TIPOS:');
    const allServices = await prisma.service.findMany({
      include: { hotel: true }
    });
    
    const serviceTypes = {};
    allServices.forEach(s => {
      if (!serviceTypes[s.serviceType]) {
        serviceTypes[s.serviceType] = [];
      }
      serviceTypes[s.serviceType].push(s);
    });
    
    Object.keys(serviceTypes).forEach(type => {
      console.log(`\n🏷️  ServiceType: ${type} (${serviceTypes[type].length} servicios)`);
      serviceTypes[type].forEach(s => {
        console.log(`   - ${s.guestName} (${s.status}) - ${s.hotel.name}`);
      });
    });
    
    // Diagnóstico del problema
    console.log('\n💡 DIAGNÓSTICO:');
    const pickupTypeServices = deliveryServices.filter(s => s.serviceType === 'PICKUP');
    const deliveryTypeServices = deliveryServices.filter(s => s.serviceType === 'DELIVERY');
    
    if (pickupTypeServices.length > 0) {
      console.log('❌ PROBLEMA ENCONTRADO:');
      console.log(`   ${pickupTypeServices.length} servicios de entrega tienen serviceType: PICKUP`);
      console.log('   El algoritmo busca serviceType === "DELIVERY" pero no los encuentra');
      
      console.log('\n🔧 SERVICIOS CON TIPO INCORRECTO:');
      pickupTypeServices.forEach(s => {
        console.log(`   - ${s.guestName} (${s.status}) - debería ser serviceType: DELIVERY`);
      });
      
      console.log('\n✅ SOLUCIÓN REQUERIDA:');
      console.log('   Cambiar serviceType de PICKUP a DELIVERY para servicios de entrega');
    }
    
    if (deliveryTypeServices.length > 0) {
      console.log('\n✅ SERVICIOS CORRECTOS:');
      deliveryTypeServices.forEach(s => {
        console.log(`   - ${s.guestName} (${s.status}) - serviceType: DELIVERY ✅`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServiceTypes();