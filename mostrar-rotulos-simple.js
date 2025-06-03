// Script para mostrar los rótulos basado en tus datos reales
console.log('🏨 RÓTULOS POR HOTEL - TUS DATOS ACTUALES\n');

// Datos de tus servicios (basado en lo que mostraste)
const servicios = [
  {
    id: "9565121c-6a9b-4ed4-831f-8fea3a8b1697",
    guestName: "Merces diaz",
    roomNumber: "213", 
    hotel: { name: "Hotel sur", zone: "SUR" },
    bagCount: 4,
    weight: "5",
    status: "LABELED",
    labelingPhotos: [
      "/uploads/services/photos-1748987967940-930503972.png",
      "/uploads/services/photos-1748987967940-368312731.png", 
      "/uploads/services/photos-1748987967940-918960137.png",
      "/uploads/services/photos-1748987967940-703375698.png"
    ]
  },
  {
    id: "cbe1397c-98e8-4686-bdfd-8d84e25ce665", 
    guestName: "Miguel diaz",
    roomNumber: "213",
    hotel: { name: "Hotel Los Arandanos", zone: "NORTE" },
    bagCount: 17,
    weight: "18",
    status: "LABELED",
    labelingPhotos: [
      "/uploads/services/photos-1748986096156-822678054.png",
      "/uploads/services/photos-1748986096156-275256203.png",
      "/uploads/services/photos-1748986096161-262721401.png",
      "/uploads/services/photos-1748986096164-50580506.png",
      "/uploads/services/photos-1748986096164-992925607.png",
      "/uploads/services/photos-1748986096165-653277676.png",
      "/uploads/services/photos-1748986096167-573111033.png",
      "/uploads/services/photos-1748986096167-220973498.png",
      "/uploads/services/photos-1748986096169-985077421.png",
      "/uploads/services/photos-1748986096170-462862.png",
      "/uploads/services/photos-1748986096172-138128504.png",
      "/uploads/services/photos-1748986096172-946881034.png",
      "/uploads/services/photos-1748986096173-779199253.png",
      "/uploads/services/photos-1748986096174-312061486.png",
      "/uploads/services/photos-1748986096175-716656119.png",
      "/uploads/services/photos-1748986096175-841473125.png",
      "/uploads/services/photos-1748986096176-691540458.png"
    ]
  },
  {
    id: "ca6b1fba-192d-4726-8344-fa3ccf807019",
    guestName: "Miguel diaz", 
    roomNumber: "434",
    hotel: { name: "Hotel Los Arandanos", zone: "NORTE" },
    bagCount: 4,
    weight: "1.8", 
    status: "LABELED",
    labelingPhotos: [
      "/uploads/services/photos-1748985396604-562151764.png",
      "/uploads/services/photos-1748985396605-904862130.png",
      "/uploads/services/photos-1748985396605-225464621.png", 
      "/uploads/services/photos-1748985396608-904498723.png"
    ]
  },
  {
    id: "3561b2b2-4b82-4bfc-857a-a56cea1510f1",
    guestName: "Miguel diaz",
    roomNumber: "454", 
    hotel: { name: "Hotel Los Arandanos", zone: "NORTE" },
    bagCount: 23,
    weight: "246",
    status: "LABELED", 
    labelingPhotos: [
      "/uploads/services/photos-1748986195622-219323441.png",
      "/uploads/services/photos-1748986195623-216069787.png",
      "/uploads/services/photos-1748986195624-97308766.png",
      "/uploads/services/photos-1748986195626-690738871.png",
      "/uploads/services/photos-1748986195627-584036498.png",
      "/uploads/services/photos-1748986195628-483948990.png",
      "/uploads/services/photos-1748986195629-171483609.png",
      "/uploads/services/photos-1748986195630-409047988.png",
      "/uploads/services/photos-1748986195631-49685754.png",
      "/uploads/services/photos-1748986195632-821453895.png",
      "/uploads/services/photos-1748986195635-186472409.png",
      "/uploads/services/photos-1748986195636-61462158.png",
      "/uploads/services/photos-1748986195636-217711221.png",
      "/uploads/services/photos-1748986195637-5558517.png",
      "/uploads/services/photos-1748986195638-127728949.png",
      "/uploads/services/photos-1748986195639-528904992.png",
      "/uploads/services/photos-1748986195640-814480599.png",
      "/uploads/services/photos-1748986195640-966092185.png",
      "/uploads/services/photos-1748986195641-986535771.png",
      "/uploads/services/photos-1748986195643-551956597.png",
      "/uploads/services/photos-1748986195644-866844615.png",
      "/uploads/services/photos-1748986195645-700298296.png",
      "/uploads/services/photos-1748986195645-574674009.png"
    ]
  }
];

// Datos de los rótulos de la base de datos (que mostraste)
const rotulos = [
  {
    id: "220ed47b-89a3-4180-aea0-0729b5d9d0f8",
    serviceId: "ca6b1fba-192d-4726-8344-fa3ccf807019", 
    label: "ROT-20250603-7019-04",
    bagNumber: 4,
    photo: "/uploads/services/photo-1748984743206-611410191.png",
    timestamp: "2025-06-03 21:05:43.211"
  },
  {
    id: "8def9021-d86f-4030-8de2-e4df051b7406",
    serviceId: "ca6b1fba-192d-4726-8344-fa3ccf807019",
    label: "ROT-20250603-7019-02", 
    bagNumber: 2,
    photo: "/uploads/services/photo-1748984743170-165435704.png",
    timestamp: "2025-06-03 21:05:43.176"
  },
  {
    id: "a0008d2b-7c2f-4dcc-924a-1c0b101f16cf",
    serviceId: "ca6b1fba-192d-4726-8344-fa3ccf807019",
    label: "ROT-20250603-7019-03",
    bagNumber: 3, 
    photo: "/uploads/services/photo-1748984743189-864764935.png",
    timestamp: "2025-06-03 21:05:43.194"
  },
  {
    id: "c96b56d8-1848-4a4b-87fe-8bb1ab479ff0",
    serviceId: "ca6b1fba-192d-4726-8344-fa3ccf807019",
    label: "ROT-20250603-7019-01",
    bagNumber: 1,
    photo: "/uploads/services/photo-1748984743134-973598219.png", 
    timestamp: "2025-06-03 21:05:43.148"
  }
];

// Agrupar por hotel
const rotulosPorHotel = {};

servicios.forEach(servicio => {
  const hotelName = servicio.hotel.name;
  
  if (!rotulosPorHotel[hotelName]) {
    rotulosPorHotel[hotelName] = [];
  }
  
  // Buscar rótulos para este servicio
  const rotulosDelServicio = rotulos.filter(r => r.serviceId === servicio.id);
  
  rotulosPorHotel[hotelName].push({
    servicio: servicio,
    rotulos: rotulosDelServicio,
    totalFotosLabeling: servicio.labelingPhotos.length,
    totalRotulos: rotulosDelServicio.length || servicio.bagCount
  });
});

// Mostrar resultados
console.log('📊 RESUMEN COMPLETO DE TUS RÓTULOS\n');

for (const [hotelName, serviciosDelHotel] of Object.entries(rotulosPorHotel)) {
  console.log(`🏨 ${hotelName.toUpperCase()}`);
  console.log('═'.repeat(60));
  
  serviciosDelHotel.forEach(({servicio, rotulos, totalFotosLabeling, totalRotulos}) => {
    console.log(`\n👤 ${servicio.guestName} - Hab. ${servicio.roomNumber}`);
    console.log(`   🆔 ID Servicio: ${servicio.id}`);
    console.log(`   🏷️  Bolsas del Servicio: ${servicio.bagCount}`);
    console.log(`   ⚖️  Peso: ${servicio.weight} kg`);
    console.log(`   📸 Fotos de Rotulado: ${totalFotosLabeling}`);
    console.log(`   🏷️  Rótulos en DB: ${rotulos.length}`);
    console.log(`   📅 Estado: ${servicio.status}`);
    
    if (rotulos.length > 0) {
      console.log('\n   🏷️  RÓTULOS REGISTRADOS:');
      rotulos.forEach(rotulo => {
        const fecha = new Date(rotulo.timestamp).toLocaleString('es-ES');
        console.log(`      ${rotulo.bagNumber}. ${rotulo.label} ✅`);
        console.log(`         📅 ${fecha}`);
        console.log(`         📸 ${rotulo.photo}`);
      });
    } else {
      console.log('   ⚠️  NO HAY RÓTULOS EN LA BASE DE DATOS');
      console.log('   💡 Pero tienes fotos de rotulado en labelingPhotos');
    }
    
    console.log('\n   📸 FOTOS DE ROTULADO DISPONIBLES:');
    servicio.labelingPhotos.forEach((foto, index) => {
      console.log(`      ${index + 1}. ${foto}`);
    });
  });
  
  console.log('\n');
}

// Estadísticas finales
const totalServicios = servicios.length;
const totalRotulos = rotulos.length;
const totalFotosLabeling = servicios.reduce((sum, s) => sum + s.labelingPhotos.length, 0);

console.log('📊 ESTADÍSTICAS GENERALES');
console.log('═'.repeat(30));
console.log(`🏨 Hoteles: ${Object.keys(rotulosPorHotel).length}`);
console.log(`📋 Servicios LABELED: ${totalServicios}`);
console.log(`🏷️  Rótulos en Base de Datos: ${totalRotulos}`);
console.log(`📸 Total Fotos de Rotulado: ${totalFotosLabeling}`);

console.log('\n🔍 ANÁLISIS:');
console.log(`✅ Solo 1 servicio tiene rótulos en la base de datos`);
console.log(`⚠️  Los otros 3 servicios solo tienen fotos de rotulado`);
console.log(`💡 Esto explica por qué no se ven todos en el historial`);

console.log('\n🛠️  PARA VER TODO EN EL HISTORIAL:');
console.log(`1. Asegúrate de que el filtro esté arreglado (ya lo hice)`);
console.log(`2. Recarga la página del historial`);
console.log(`3. Deberías ver los 4 servicios con sus fotos de rotulado`);