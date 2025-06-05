const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findWaitingServices() {
  try {
    console.log('🔍 BUSCANDO SERVICIOS "ESPERANDO" DEL FRONTEND...\n');
    
    // Buscar todos los servicios y ver cuáles podrían ser los "Esperando"
    const allServices = await prisma.service.findMany({
      include: { 
        hotel: true,
        originalService: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📊 TOTAL SERVICIOS EN BASE DE DATOS: ${allServices.length}\n`);
    
    // Agrupar por cliente y hotel para identificar patrones
    const servicesByGuest = {};
    allServices.forEach(service => {
      const key = `${service.guestName}-${service.hotel.name}`;
      if (!servicesByGuest[key]) {
        servicesByGuest[key] = [];
      }
      servicesByGuest[key].push(service);
    });
    
    console.log('👥 SERVICIOS POR CLIENTE:');
    Object.keys(servicesByGuest).forEach(key => {
      const services = servicesByGuest[key];
      console.log(`\n   ${key}:`);
      services.forEach((s, i) => {
        const type = s.serviceType || 'PICKUP';
        const delivery = s.isDeliveryService ? ' [DELIVERY SERVICE]' : '';
        const original = s.originalServiceId ? ` (Original: ${s.originalServiceId})` : '';
        
        console.log(`      ${i+1}. ${s.bagCount} bolsas - ${s.status} - ${type}${delivery}${original}`);
        console.log(`         ID: ${s.id}`);
        console.log(`         Creado: ${s.createdAt.toISOString().split('T')[0]}`);
        
        if (s.deliveryRepartidorId) {
          console.log(`         DeliveryRepartidorId: ${s.deliveryRepartidorId}`);
        }
        if (s.repartidorId) {
          console.log(`         RepartidorId: ${s.repartidorId}`);
        }
      });
    });
    
    // Buscar específicamente servicios que podrían ser "Esperando"
    console.log('\n🎯 CANDIDATOS PARA "ESPERANDO":');
    const candidateServices = allServices.filter(s => 
      s.isDeliveryService === true || 
      s.serviceType === 'DELIVERY' ||
      (s.deliveryRepartidorId === null && ['READY_FOR_DELIVERY', 'IN_PROCESS'].includes(s.status))
    );
    
    console.log(`   Total candidatos: ${candidateServices.length}`);
    candidateServices.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.guestName} (${s.bagCount} bolsas) - ${s.hotel.name}`);
      console.log(`      Estado: ${s.status} | ServiceType: ${s.serviceType}`);
      console.log(`      IsDeliveryService: ${s.isDeliveryService} | DeliveryRepartidorId: ${s.deliveryRepartidorId || 'NULL'}`);
      console.log(`      EstimatedDeliveryDate: ${s.estimatedDeliveryDate || 'NULL'}`);
    });
    
    // Verificar si necesitamos actualizar fechas
    console.log('\n📅 VERIFICANDO FECHAS:');
    const servicesWithBadDates = candidateServices.filter(s => 
      !s.estimatedDeliveryDate || 
      new Date(s.estimatedDeliveryDate) < new Date('2025-06-06T00:00:00.000Z')
    );
    
    if (servicesWithBadDates.length > 0) {
      console.log('⚠️ SERVICIOS CON FECHAS INCORRECTAS:');
      servicesWithBadDates.forEach(s => {
        console.log(`   - ${s.guestName}: ${s.estimatedDeliveryDate || 'NULL'}`);
      });
      console.log('\n💡 SOLUCIÓN: Actualizar fechas a 2025-06-06');
    }
    
    console.log('\n📋 ESTADO DEL SISTEMA:');
    console.log('   Frontend muestra: Carmen ruiz (2 bolsas) + Ernesto Martinez (15 bolsas) "Esperando"');
    console.log('   Backend necesita: READY_FOR_DELIVERY + deliveryRepartidorId: NULL + fecha 2025-06-06');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findWaitingServices();