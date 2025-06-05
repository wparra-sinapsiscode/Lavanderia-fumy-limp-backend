const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllServiceDates() {
  try {
    console.log('🔧 Corrigiendo TODAS las fechas de servicios...\n');
    
    // Obtener todos los servicios
    const services = await prisma.service.findMany({
      include: {
        hotel: {
          select: {
            name: true,
            zone: true
          }
        }
      }
    });
    
    console.log(`📊 Total de servicios encontrados: ${services.length}\n`);
    
    for (const service of services) {
      console.log(`📌 Procesando: ${service.guestName} (${service.hotel.name})`);
      
      const updateData = {};
      let hasChanges = false;
      
      // Función para ajustar fecha si está adelantada
      const adjustDateIfNeeded = (date, fieldName) => {
        if (date) {
          const dateObj = new Date(date);
          const dateString = dateObj.toISOString().split('T')[0];
          
          // Si la fecha es 2025-06-05, restar 24 horas
          if (dateString === '2025-06-05') {
            const adjustedDate = new Date(dateObj.getTime() - 24 * 60 * 60 * 1000);
            console.log(`  ⚠️  ${fieldName}: ${date} → ${adjustedDate.toISOString()}`);
            return adjustedDate;
          }
          return null;
        }
        return null;
      };
      
      // Revisar y ajustar cada campo de fecha
      const fieldsToCheck = [
        'createdAt',
        'updatedAt',
        'estimatedPickupDate',
        'pickupDate',
        'labeledDate',
        'processStartDate',
        'deliveryDate',
        'estimatedDeliveryDate'
      ];
      
      for (const field of fieldsToCheck) {
        const adjustedDate = adjustDateIfNeeded(service[field], field);
        if (adjustedDate) {
          updateData[field] = adjustedDate;
          hasChanges = true;
        }
      }
      
      // Si hay cambios, actualizar el servicio
      if (hasChanges) {
        await prisma.service.update({
          where: { id: service.id },
          data: updateData
        });
        console.log(`  ✅ Servicio actualizado con ${Object.keys(updateData).length} cambios\n`);
      } else {
        console.log(`  ✓ Sin cambios necesarios\n`);
      }
    }
    
    console.log('✅ Proceso completado!\n');
    
    // Mostrar resumen final
    const updatedServices = await prisma.service.findMany({
      select: {
        id: true,
        guestName: true,
        createdAt: true,
        estimatedPickupDate: true,
        estimatedDeliveryDate: true,
        status: true,
        hotel: {
          select: {
            name: true,
            zone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('📋 RESUMEN FINAL DE SERVICIOS:');
    console.log('=====================================');
    updatedServices.forEach(s => {
      console.log(`\n${s.guestName} - ${s.hotel.name} (${s.hotel.zone})`);
      console.log(`  Status: ${s.status}`);
      console.log(`  Created: ${s.createdAt}`);
      console.log(`  Pickup: ${s.estimatedPickupDate || 'No definido'}`);
      console.log(`  Delivery: ${s.estimatedDeliveryDate || 'No definido'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
fixAllServiceDates();