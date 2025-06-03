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
  
  // Hoteles eliminados del seed - se crearán manualmente según necesidad
  
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