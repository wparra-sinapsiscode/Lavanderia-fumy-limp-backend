const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixServiceDates() {
  try {
    console.log('🔧 Ajustando fechas de servicios...');
    
    // Obtener todos los servicios con fecha adelantada
    const services = await prisma.service.findMany({
      where: {
        createdAt: {
          gte: new Date('2025-06-05T00:00:00.000Z')
        }
      }
    });
    
    console.log(`📊 Servicios encontrados: ${services.length}`);
    
    for (const service of services) {
      console.log(`\n📌 Servicio: ${service.guestName}`);
      console.log(`  Fecha actual: ${service.createdAt}`);
      console.log(`  EstimatedPickup actual: ${service.estimatedPickupDate}`);
      
      // Restar 5 horas a todas las fechas
      const updatedData = {
        createdAt: new Date(service.createdAt.getTime() - 5 * 60 * 60 * 1000),
        updatedAt: new Date(service.updatedAt.getTime() - 5 * 60 * 60 * 1000)
      };
      
      if (service.estimatedPickupDate) {
        updatedData.estimatedPickupDate = new Date(service.estimatedPickupDate.getTime() - 5 * 60 * 60 * 1000);
      }
      
      if (service.estimatedDeliveryDate) {
        updatedData.estimatedDeliveryDate = new Date(service.estimatedDeliveryDate.getTime() - 5 * 60 * 60 * 1000);
      }
      
      // Actualizar el servicio
      await prisma.service.update({
        where: { id: service.id },
        data: updatedData
      });
      
      console.log(`  ✅ Actualizado a: ${updatedData.createdAt}`);
      console.log(`  ✅ EstimatedPickup nuevo: ${updatedData.estimatedPickupDate}`);
    }
    
    console.log('\n✅ Todas las fechas han sido ajustadas');
    
    // Verificar los cambios
    const updatedServices = await prisma.service.findMany({
      select: {
        id: true,
        guestName: true,
        createdAt: true,
        estimatedPickupDate: true,
        hotel: {
          select: {
            name: true,
            zone: true
          }
        }
      }
    });
    
    console.log('\n📋 Estado final de los servicios:');
    updatedServices.forEach(s => {
      console.log(`- ${s.guestName} (${s.hotel.name} - ${s.hotel.zone})`);
      console.log(`  Created: ${s.createdAt}`);
      console.log(`  Pickup: ${s.estimatedPickupDate}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixServiceDates();