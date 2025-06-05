const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPickupDates() {
  try {
    console.log('🔧 Arreglando fechas de servicios PENDING_PICKUP...');
    
    // Buscar servicio de Carmen en PENDING_PICKUP
    const pickupService = await prisma.service.findFirst({
      where: {
        guestName: 'Carmen ruiz',
        status: 'PENDING_PICKUP'
      },
      include: { hotel: true }
    });
    
    if (!pickupService) {
      console.log('❌ No se encontró servicio de Carmen en PENDING_PICKUP');
      return;
    }
    
    console.log(`   📋 Encontrado: ${pickupService.guestName} (${pickupService.bagCount} bolsas)`);
    console.log(`   📅 Fecha actual: ${pickupService.estimatedPickupDate}`);
    console.log(`   👤 Repartidor: ${pickupService.repartidorId || 'Sin asignar'}`);
    
    // Fecha para mañana 
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10:00 AM
    
    console.log(`   🎯 Nueva fecha: ${tomorrow.toISOString()}`);
    
    // Actualizar fecha y quitar repartidor si tiene
    await prisma.service.update({
      where: { id: pickupService.id },
      data: {
        estimatedPickupDate: tomorrow,
        repartidorId: null // Asegurar que no tenga repartidor asignado
      }
    });
    
    console.log('   ✅ Servicio actualizado');
    
    // Verificar resultado
    const updatedService = await prisma.service.findUnique({
      where: { id: pickupService.id },
      include: { hotel: true }
    });
    
    console.log('\n📊 RESULTADO:');
    console.log(`   📦 ${updatedService.guestName} - ${updatedService.hotel.name}`);
    console.log(`   📅 Fecha: ${updatedService.estimatedPickupDate}`);
    console.log(`   👤 Repartidor: ${updatedService.repartidorId || 'Sin asignar (✅)'}`);
    console.log(`   🏷️  Estado: ${updatedService.status}`);
    
    console.log('\n✅ ¡Ahora el recojo debería aparecer en rutas!');
    console.log('   Ejecuta de nuevo: node setup-this-pc-routes.js');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPickupDates();