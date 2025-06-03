const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function mostrarRotulosPorHotel() {
  try {
    console.log('🏨 RÓTULOS POR HOTEL\n');

    // Obtener todos los rótulos con información del hotel y servicio
    const rotulos = await prisma.bagLabel.findMany({
      include: {
        service: {
          include: {
            hotel: true
          }
        },
        registeredBy: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { service: { hotel: { name: 'asc' } } },
        { service: { guestName: 'asc' } },
        { bagNumber: 'asc' }
      ]
    });

    // Agrupar por hotel
    const rotulosPorHotel = {};
    
    rotulos.forEach(rotulo => {
      const hotelName = rotulo.service.hotel.name;
      const serviceId = rotulo.service.id;
      const guestName = rotulo.service.guestName;
      const roomNumber = rotulo.service.roomNumber;
      
      if (!rotulosPorHotel[hotelName]) {
        rotulosPorHotel[hotelName] = {};
      }
      
      const serviceKey = `${guestName} - Hab. ${roomNumber} (${serviceId})`;
      if (!rotulosPorHotel[hotelName][serviceKey]) {
        rotulosPorHotel[hotelName][serviceKey] = [];
      }
      
      rotulosPorHotel[hotelName][serviceKey].push(rotulo);
    });

    // Mostrar resultados
    for (const [hotelName, servicios] of Object.entries(rotulosPorHotel)) {
      console.log(`📍 ${hotelName.toUpperCase()}`);
      console.log('═'.repeat(50));
      
      for (const [serviceInfo, rotulos] of Object.entries(servicios)) {
        console.log(`\n👤 ${serviceInfo}`);
        console.log(`   🏷️  Total Rótulos: ${rotulos.length}`);
        console.log(`   📸 Con Fotos: ${rotulos.filter(r => r.photo).length}`);
        console.log(`   ❌ Sin Fotos: ${rotulos.filter(r => !r.photo).length}`);
        
        rotulos.forEach((rotulo, index) => {
          const tieneFoto = rotulo.photo ? '✅' : '❌';
          const fotoPath = rotulo.photo ? rotulo.photo.replace(/\\/g, '/') : 'Sin foto';
          
          console.log(`   ${index + 1}. ${rotulo.label} ${tieneFoto}`);
          console.log(`      📅 ${new Date(rotulo.timestamp).toLocaleString('es-ES')}`);
          if (rotulo.photo) {
            console.log(`      📸 ${fotoPath}`);
          }
        });
      }
      console.log('\n');
    }

    // Estadísticas generales
    console.log('📊 ESTADÍSTICAS GENERALES');
    console.log('═'.repeat(30));
    console.log(`🏨 Total Hoteles: ${Object.keys(rotulosPorHotel).length}`);
    console.log(`🏷️  Total Rótulos: ${rotulos.length}`);
    console.log(`📸 Rótulos con Foto: ${rotulos.filter(r => r.photo).length}`);
    console.log(`❌ Rótulos sin Foto: ${rotulos.filter(r => !r.photo).length}`);
    
    // Mostrar por hotel
    console.log('\n🏨 RESUMEN POR HOTEL:');
    for (const [hotelName, servicios] of Object.entries(rotulosPorHotel)) {
      const totalRotulos = Object.values(servicios).flat().length;
      const conFotos = Object.values(servicios).flat().filter(r => r.photo).length;
      console.log(`   ${hotelName}: ${totalRotulos} rótulos (${conFotos} con foto)`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
mostrarRotulosPorHotel();