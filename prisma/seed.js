const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  // 1. Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fumylimp.com' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Administrador',
      email: 'admin@fumylimp.com',
      hashedPassword: adminPassword,
      role: 'ADMIN',
      zone: 'ADMINISTRACION',
      phone: '999999999',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  
  console.log('Admin user created:', admin.email);
  
  // 2. Create repartidores
  const repartidorPassword = await bcrypt.hash('repartidor123', 10);
  const zones = ['NORTE', 'SUR', 'CENTRO', 'ESTE', 'OESTE'];
  
  const createdRepartidores = [];
  for (const zone of zones) {
    const repartidor = await prisma.user.upsert({
      where: { email: `repartidor.${zone.toLowerCase()}@fumylimp.com` },
      update: {},
      create: {
        id: uuidv4(),
        name: `Repartidor ${zone}`,
        email: `repartidor.${zone.toLowerCase()}@fumylimp.com`,
        hashedPassword: repartidorPassword,
        role: 'REPARTIDOR',
        zone: zone,
        phone: `99999${zones.indexOf(zone)}000`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    createdRepartidores.push(repartidor);
    console.log(`Repartidor created for zone ${zone}:`, repartidor.email);
  }
  
  // 3. Create hotels
  const hotels = [
    { name: 'Hotel Los Delfines', zone: 'SUR', pricePerKg: 12.50, bagInventory: 500 },
    { name: 'Hotel Country Club', zone: 'CENTRO', pricePerKg: 14.00, bagInventory: 400 },
    { name: 'Hotel Sheraton', zone: 'CENTRO', pricePerKg: 16.00, bagInventory: 600 },
    { name: 'Hotel Marriott', zone: 'SUR', pricePerKg: 18.00, bagInventory: 700 },
    { name: 'Hotel Hilton', zone: 'SUR', pricePerKg: 15.50, bagInventory: 550 },
    { name: 'Hotel Casa Andina', zone: 'NORTE', pricePerKg: 11.00, bagInventory: 300 },
    { name: 'Hotel JW Marriott', zone: 'ESTE', pricePerKg: 20.00, bagInventory: 800 },
    { name: 'Hotel Westin', zone: 'CENTRO', pricePerKg: 17.50, bagInventory: 650 },
    { name: 'Hotel Royal Park', zone: 'OESTE', pricePerKg: 13.50, bagInventory: 450 },
    { name: 'Hotel Ibis', zone: 'NORTE', pricePerKg: 10.00, bagInventory: 350 }
  ];
  
  const createdHotels = [];
  for (const hotelData of hotels) {
    const hotel = await prisma.hotel.upsert({
      where: { name: hotelData.name },
      update: {},
      create: {
        id: uuidv4(),
        name: hotelData.name,
        address: `Av. Principal ${Math.floor(Math.random() * 1000)}, ${hotelData.zone}`,
        zone: hotelData.zone,
        contactPerson: `Gerente ${hotelData.name}`,
        phone: `01-${Math.floor(Math.random() * 9000000) + 1000000}`,
        email: `contacto@${hotelData.name.toLowerCase().replace(/\s+/g, '')}.com`,
        bagInventory: hotelData.bagInventory,
        pricePerKg: hotelData.pricePerKg,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    createdHotels.push(hotel);
    console.log(`Hotel created:`, hotel.name);
  }
  
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });