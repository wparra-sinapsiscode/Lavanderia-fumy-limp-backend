const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestServices() {
  try {
    // Obtener hoteles existentes
    const hotels = await prisma.hotel.findMany();
    if (hotels.length === 0) {
      console.log('❌ No hay hoteles. Crear hoteles primero.');
      return;
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log('🏨 Hoteles disponibles:', hotels.map(h => h.name));
    console.log('📅 Creando servicios para:', tomorrowStr);
    
    const servicesToCreate = [];
    
    // Para cada hotel, crear servicios variados
    for (let i = 0; i < Math.min(hotels.length, 3); i++) {
      const hotel = hotels[i];
      
      // 1. Servicio de recojo ALTA prioridad
      servicesToCreate.push({
        guestName: `Recojo Urgente ${i + 1}`,
        roomNumber: `10${i + 1}`,
        bagCount: 2,
        status: 'PENDING_PICKUP',
        priority: 'ALTA',
        hotelId: hotel.id,
        estimatedPickupDate: new Date(`${tomorrowStr}T09:00:00.000Z`),
        estimatedDeliveryDate: new Date(`${tomorrowStr}T15:00:00.000Z`) // Fecha estimada de entrega
      });
      
      // 2. Servicio de entrega ALTA prioridad (ya procesado)
      servicesToCreate.push({
        guestName: `Entrega Urgente ${i + 1}`,
        roomNumber: `20${i + 1}`,
        bagCount: 3,
        status: 'IN_PROCESS',
        priority: 'ALTA',
        hotelId: hotel.id,
        estimatedPickupDate: new Date(`${tomorrowStr}T08:00:00.000Z`), // Fecha pasada para pickup
        estimatedDeliveryDate: new Date(`${tomorrowStr}T10:00:00.000Z`)
      });
      
      // 3. Servicio de recojo NORMAL
      servicesToCreate.push({
        guestName: `Recojo Normal ${i + 1}`,
        roomNumber: `30${i + 1}`,
        bagCount: 1,
        status: 'PENDING_PICKUP',
        priority: 'NORMAL',
        hotelId: hotel.id,
        estimatedPickupDate: new Date(`${tomorrowStr}T11:00:00.000Z`),
        estimatedDeliveryDate: new Date(`${tomorrowStr}T17:00:00.000Z`) // Fecha estimada de entrega
      });
      
      // 4. Servicio de entrega MEDIA prioridad
      servicesToCreate.push({
        guestName: `Entrega Media ${i + 1}`,
        roomNumber: `40${i + 1}`,
        bagCount: 2,
        status: 'READY_FOR_DELIVERY',
        priority: 'MEDIA',
        hotelId: hotel.id,
        estimatedPickupDate: new Date(`${tomorrowStr}T07:00:00.000Z`), // Fecha pasada para pickup
        estimatedDeliveryDate: new Date(`${tomorrowStr}T12:00:00.000Z`)
      });
    }
    
    // Crear todos los servicios
    const createdServices = await prisma.service.createMany({
      data: servicesToCreate
    });
    
    console.log(`✅ Creados ${createdServices.count} servicios de prueba`);
    
    // Verificar servicios creados
    const verification = await prisma.service.findMany({
      where: {
        OR: [
          {
            status: 'PENDING_PICKUP',
            estimatedPickupDate: {
              gte: new Date(`${tomorrowStr}T00:00:00.000Z`),
              lt: new Date(`${tomorrowStr}T23:59:59.999Z`)
            }
          },
          {
            status: { in: ['IN_PROCESS', 'READY_FOR_DELIVERY'] },
            estimatedDeliveryDate: {
              gte: new Date(`${tomorrowStr}T00:00:00.000Z`),
              lt: new Date(`${tomorrowStr}T23:59:59.999Z`)
            }
          }
        ]
      },
      include: { hotel: true }
    });
    
    console.log('\n📋 Servicios creados:');
    verification.forEach(s => {
      const type = s.status === 'PENDING_PICKUP' ? '📦 RECOJO' : '🚚 ENTREGA';
      console.log(`  ${type} - ${s.guestName} (${s.priority}) - ${s.hotel.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestServices();