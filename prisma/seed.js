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
  
  // 4. Create services
  // Create services only if there are none
  const existingServices = await prisma.service.count();
  if (existingServices === 0) {
    console.log('Creating demo services...');
    
    const guestNames = [
      'Juan Pérez', 'María González', 'Carlos Rodríguez', 'Ana López', 
      'Luis Martínez', 'Laura García', 'Pedro Sánchez', 'Sofía Romero',
      'Miguel Torres', 'Lucía Flores', 'Roberto Silva', 'Carmen Díaz',
      'José Ramírez', 'Andrea Castro', 'Fernando Ortiz', 'Patricia Herrera'
    ];
    
    const roomNumbers = ['101', '202', '303', '404', '505', '606', '707', '808', '909', '1010', '111', '222'];
    
    // Service statuses for demo - ordered by progression
    const statuses = [
      'PENDING_PICKUP',
      'PICKED_UP',
      'LABELED',
      'IN_PROCESS',
      'COMPLETED'
    ];
    
    // Create services with different statuses
    const serviceCount = {
      'PENDING_PICKUP': 10,
      'PICKED_UP': 8,
      'LABELED': 6,
      'IN_PROCESS': 5,
      'COMPLETED': 15
    };
    
    const createdServices = [];
    
    // Create services for each status
    for (const [status, count] of Object.entries(serviceCount)) {
      for (let i = 0; i < count; i++) {
        const randomHotel = createdHotels[Math.floor(Math.random() * createdHotels.length)];
        
        // Find repartidor for this zone
        const zoneRepartidores = createdRepartidores.filter(r => r.zone === randomHotel.zone);
        const randomRepartidor = zoneRepartidores.length > 0 
          ? zoneRepartidores[Math.floor(Math.random() * zoneRepartidores.length)]
          : createdRepartidores[Math.floor(Math.random() * createdRepartidores.length)];
        
        // Generate timestamps
        const now = new Date();
        const createdAt = new Date(now);
        createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 14)); // Random date within the last 2 weeks
        
        // Estimated pickup date is always 1-3 hours after creation
        const estimatedPickupDate = new Date(createdAt);
        estimatedPickupDate.setHours(estimatedPickupDate.getHours() + Math.floor(Math.random() * 3) + 1);
        
        let pickupDate = null;
        let labeledDate = null;
        let deliveryDate = null;
        let estimatedDeliveryDate = null;
        
        // Set dates based on status
        if (status !== 'PENDING_PICKUP') {
          pickupDate = new Date(createdAt);
          pickupDate.setHours(pickupDate.getHours() + Math.floor(Math.random() * 8) + 1); // 1-8 hours after creation
          
          // Estimated delivery date is 24-48 hours after pickup
          estimatedDeliveryDate = new Date(pickupDate);
          estimatedDeliveryDate.setHours(estimatedDeliveryDate.getHours() + 24 + Math.floor(Math.random() * 24));
        }
        
        if (['LABELED', 'IN_PROCESS', 'COMPLETED'].includes(status)) {
          labeledDate = new Date(pickupDate);
          labeledDate.setHours(labeledDate.getHours() + Math.floor(Math.random() * 8) + 2); // 2-10 hours after pickup
        }
        
        if (status === 'COMPLETED') {
          deliveryDate = new Date(labeledDate);
          deliveryDate.setHours(deliveryDate.getHours() + Math.floor(Math.random() * 12) + 12); // 12-24 hours after labeling
        }
        
        // Random bag count between 1 and 5
        const bagCount = Math.floor(Math.random() * 5) + 1;
        
        // Random weight between 2kg and 20kg, null for pending pickup
        const weight = status !== 'PENDING_PICKUP' ? parseFloat((Math.random() * 18 + 2).toFixed(1)) : null;
        
        // Calculate price if we have weight
        const price = weight ? parseFloat((randomHotel.pricePerKg * weight).toFixed(2)) : null;
        
        // Random priority with weighted distribution
        const priorityOptions = ['ALTA', 'MEDIA', 'NORMAL'];
        const priorityWeights = [0.1, 0.3, 0.6]; // 10% high, 30% medium, 60% normal
        const priority = weightedRandomChoice(priorityOptions, priorityWeights);
        
        // Create the service
        const service = await prisma.service.create({
          data: {
            id: uuidv4(),
            guestName: guestNames[Math.floor(Math.random() * guestNames.length)],
            roomNumber: roomNumbers[Math.floor(Math.random() * roomNumbers.length)],
            hotelId: randomHotel.id,
            bagCount,
            weight,
            observations: Math.random() > 0.7 ? 'Contiene ropa de cama y toallas' : 
                        Math.random() > 0.4 ? 'Ropa de habitación estándar' : 
                        'Incluye prendas delicadas, manejar con cuidado',
            specialInstructions: Math.random() > 0.7 ? 'Usar detergente hipoalergénico' : 
                               Math.random() > 0.4 ? 'Doblar con especial cuidado' : null,
            priority,
            pickupDate,
            estimatedPickupDate,
            labeledDate,
            deliveryDate,
            estimatedDeliveryDate,
            status,
            photos: status !== 'PENDING_PICKUP' ? [
              `https://example.com/photos/services/${Math.floor(Math.random() * 1000)}.jpg`,
              `https://example.com/photos/services/${Math.floor(Math.random() * 1000)}.jpg`
            ] : [],
            signature: status !== 'PENDING_PICKUP' ? `https://example.com/signatures/${Math.floor(Math.random() * 1000)}.png` : null,
            collectorName: status !== 'PENDING_PICKUP' ? `${randomRepartidor.name}` : null,
            repartidorId: status !== 'PENDING_PICKUP' ? randomRepartidor.id : null,
            deliveryRepartidorId: status === 'COMPLETED' ? randomRepartidor.id : null,
            price,
            pickupTimeSlot: status !== 'PENDING_PICKUP' ? Math.random() > 0.5 ? 'MORNING' : 'AFTERNOON' : null,
            customerNotes: Math.random() > 0.7 ? 'Cliente habitual, buen trato' : null,
            internalNotes: Math.random() > 0.6 ? 'Confirmar cantidad de prendas al recoger' : null,
            labelingPhotos: ['LABELED', 'IN_PROCESS', 'COMPLETED'].includes(status) ? [
              `https://example.com/photos/labels/${Math.floor(Math.random() * 1000)}.jpg`
            ] : [],
            deliveryPhotos: status === 'COMPLETED' ? [
              `https://example.com/photos/delivery/${Math.floor(Math.random() * 1000)}.jpg`,
              `https://example.com/photos/delivery/${Math.floor(Math.random() * 1000)}.jpg`
            ] : [],
            deliveredBagCount: status === 'COMPLETED' ? bagCount : null,
            remainingBags: status === 'COMPLETED' ? 0 : null,
            createdAt,
            updatedAt: deliveryDate || labeledDate || pickupDate || createdAt
          }
        });
        
        createdServices.push(service);
        console.log(`Created service with status ${status} for ${service.guestName} at ${randomHotel.name}`);
        
        // Create bag labels for services that are labeled or beyond
        if (['LABELED', 'IN_PROCESS', 'COMPLETED'].includes(status)) {
          for (let b = 0; b < bagCount; b++) {
            // Generate a realistic label code
            const labelDate = labeledDate || new Date();
            const dateStr = labelDate.toISOString().slice(0, 10).replace(/-/g, '');
            const hotelCode = randomHotel.name.substring(0, 3).toUpperCase();
            const timeStr = labelDate.toTimeString().slice(0, 5).replace(':', '');
            const bagNumber = (b + 1).toString().padStart(2, '0');
            const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
            
            const labelCode = `${hotelCode}-${dateStr}-${timeStr}-${bagNumber}-${random}`;
            
            const bagLabelStatus = status === 'COMPLETED' ? 'COMPLETED' : 
                                 status === 'IN_PROCESS' ? 'PROCESSING' : 'LABELED';
            
            await prisma.bagLabel.create({
              data: {
                id: uuidv4(),
                serviceId: service.id,
                hotelId: randomHotel.id,
                label: labelCode,
                bagNumber: b + 1,
                photo: `https://example.com/photos/labels/${Math.floor(Math.random() * 1000)}.jpg`,
                registeredById: randomRepartidor.id,
                timestamp: labeledDate,
                status: bagLabelStatus,
                generatedAt: Math.random() > 0.3 ? 'LAVANDERIA' : 'HOTEL',
                observations: Math.random() > 0.7 ? 'Etiqueta generada correctamente' : null,
                labeledAt: labeledDate,
                updatedAt: status === 'COMPLETED' ? deliveryDate : labeledDate,
                updatedById: status === 'COMPLETED' ? randomRepartidor.id : null,
                createdAt: labeledDate
              }
            });
            
            console.log(`Created bag label ${labelCode} for service ${service.id}`);
          }
        }
        
        // Create transactions for completed services
        if (status === 'COMPLETED' && price) {
          // Create income transaction for the service
          await prisma.transaction.create({
            data: {
              id: uuidv4(),
              type: 'INCOME',
              amount: price,
              incomeCategory: 'SERVICIO_LAVANDERIA',
              description: `Pago por servicio de lavandería - ${service.guestName} - ${randomHotel.name}`,
              date: deliveryDate,
              paymentMethod: Math.random() > 0.6 ? 'EFECTIVO' : 
                          Math.random() > 0.5 ? 'TRANSFERENCIA_BANCARIA' : 
                          Math.random() > 0.3 ? 'YAPE' : 'TARJETA_CREDITO',
              hotelId: randomHotel.id,
              serviceId: service.id,
              notes: `Pago por servicio #${service.id.substring(0, 8)} - ${bagCount} bolsas, ${weight}kg`,
              registeredById: admin.id,
              timestamp: deliveryDate,
              createdAt: deliveryDate,
              updatedAt: deliveryDate
            }
          });
          
          console.log(`Created income transaction for service ${service.id}`);
          
          // Sometimes create an expense transaction related to this service
          if (Math.random() > 0.7) {
            const expenseAmount = parseFloat((price * 0.3).toFixed(2));
            const expenseDate = new Date(pickupDate);
            expenseDate.setHours(expenseDate.getHours() + Math.floor(Math.random() * 48));
            
            // Expense categories with weighted distribution
            const expenseCategories = [
              'SUMINISTROS_LAVANDERIA',
              'COMBUSTIBLE_TRANSPORTE',
              'MANTENIMIENTO_EQUIPOS'
            ];
            const expenseCategoryWeights = [0.5, 0.3, 0.2];
            const expenseCategory = weightedRandomChoice(expenseCategories, expenseCategoryWeights);
            
            // Expense description based on category
            let expenseDescription = '';
            switch (expenseCategory) {
              case 'SUMINISTROS_LAVANDERIA':
                expenseDescription = 'Compra de detergentes y suavizantes';
                break;
              case 'COMBUSTIBLE_TRANSPORTE':
                expenseDescription = 'Combustible para transporte de ropa';
                break;
              case 'MANTENIMIENTO_EQUIPOS':
                expenseDescription = 'Mantenimiento preventivo de lavadoras';
                break;
            }
            
            await prisma.transaction.create({
              data: {
                id: uuidv4(),
                type: 'EXPENSE',
                amount: expenseAmount,
                expenseCategory: expenseCategory,
                description: expenseDescription,
                date: expenseDate,
                paymentMethod: Math.random() > 0.5 ? 'EFECTIVO' : 'TARJETA_DEBITO',
                serviceId: Math.random() > 0.5 ? service.id : null, // Sometimes link to service
                notes: `Gasto relacionado con servicios de lavandería`,
                registeredById: admin.id,
                timestamp: expenseDate,
                createdAt: expenseDate,
                updatedAt: expenseDate
              }
            });
            
            console.log(`Created expense transaction related to service ${service.id}`);
          }
        }
        
        // Create audit logs for various service events
        if (status !== 'PENDING_PICKUP') {
          // Pickup audit log
          await createAuditLog(
            'PICKUP',
            'SERVICE',
            service.id,
            `Servicio recogido por ${randomRepartidor.name} - ${bagCount} bolsas`,
            randomRepartidor.id,
            service.id,
            null,
            null,
            pickupDate
          );
          
          if (['LABELED', 'IN_PROCESS', 'COMPLETED'].includes(status)) {
            // Labeling audit log
            await createAuditLog(
              'LABEL',
              'SERVICE',
              service.id,
              `Servicio etiquetado - ${bagCount} bolsas`,
              randomRepartidor.id,
              service.id,
              null,
              null,
              labeledDate
            );
          }
          
          if (status === 'COMPLETED') {
            // Delivery audit log
            await createAuditLog(
              'DELIVERY',
              'SERVICE',
              service.id,
              `Servicio entregado por ${randomRepartidor.name} - ${bagCount} bolsas`,
              randomRepartidor.id,
              service.id,
              null,
              null,
              deliveryDate
            );
          }
        }
      }
    }
  }
  
  // 5. Create some standalone transactions (not linked to services)
  const existingTransactions = await prisma.transaction.count();
  if (existingTransactions < 50) { // Only create if we have fewer than 50 transactions
    console.log('Creating additional transactions...');
    
    // Create some expense transactions
    const expenseCategories = [
      'SUMINISTROS_LAVANDERIA',
      'COMBUSTIBLE_TRANSPORTE',
      'MANTENIMIENTO_EQUIPOS',
      'SALARIOS_PERSONAL',
      'SERVICIOS_PUBLICOS',
      'MARKETING_PUBLICIDAD',
      'OTRO_GASTO'
    ];
    
    const expenseDescriptions = {
      'SUMINISTROS_LAVANDERIA': [
        'Compra de detergentes industriales',
        'Suavizantes para lavandería',
        'Productos de limpieza especiales',
        'Bolsas para ropa y etiquetas'
      ],
      'COMBUSTIBLE_TRANSPORTE': [
        'Gasolina para vehículos de reparto',
        'Mantenimiento de furgoneta de reparto',
        'Cambio de aceite vehículos',
        'Reparación de neumáticos'
      ],
      'MANTENIMIENTO_EQUIPOS': [
        'Reparación de lavadora industrial',
        'Mantenimiento preventivo secadoras',
        'Repuestos para equipos de planchado',
        'Servicio técnico equipos industriales'
      ],
      'SALARIOS_PERSONAL': [
        'Pago de salarios personal lavandería',
        'Horas extra personal de reparto',
        'Bonificaciones equipo administrativo',
        'Adelanto salarial personal'
      ],
      'SERVICIOS_PUBLICOS': [
        'Pago de electricidad mensual',
        'Factura de agua bimestral',
        'Servicio de internet y teléfono',
        'Gas industrial para secadoras'
      ],
      'MARKETING_PUBLICIDAD': [
        'Impresión de folletos promocionales',
        'Campaña publicidad redes sociales',
        'Diseño nuevo logo empresa',
        'Eventos promocionales hoteles'
      ],
      'OTRO_GASTO': [
        'Papelería y material de oficina',
        'Seguros de responsabilidad civil',
        'Asesoría contable y fiscal',
        'Imprevistos y gastos menores'
      ]
    };
    
    // Create 20 random expense transactions
    for (let i = 0; i < 20; i++) {
      const expenseCategory = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const descriptions = expenseDescriptions[expenseCategory];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      
      const amount = parseFloat((Math.random() * 500 + 50).toFixed(2));
      
      // Random date in the last 30 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      await prisma.transaction.create({
        data: {
          id: uuidv4(),
          type: 'EXPENSE',
          amount,
          expenseCategory,
          description,
          date,
          paymentMethod: Math.random() > 0.5 ? 'EFECTIVO' : 
                      Math.random() > 0.5 ? 'TRANSFERENCIA_BANCARIA' : 'TARJETA_DEBITO',
          hotelId: Math.random() > 0.8 ? createdHotels[Math.floor(Math.random() * createdHotels.length)].id : null,
          notes: Math.random() > 0.7 ? 'Gasto mensual recurrente' : null,
          registeredById: admin.id,
          timestamp: date,
          createdAt: date,
          updatedAt: date
        }
      });
    }
    
    // Create additional income transactions not linked to services
    const incomeCategories = [
      'PAGO_HOTEL',
      'SERVICIO_PREMIUM',
      'RECARGO_URGENTE',
      'OTRO_INGRESO'
    ];
    
    const incomeDescriptions = {
      'PAGO_HOTEL': [
        'Pago mensual contrato Hotel Los Delfines',
        'Servicios especiales Hotel Sheraton',
        'Cuota mensual Hotel Marriott',
        'Pago servicio urgente Hotel Hilton'
      ],
      'SERVICIO_PREMIUM': [
        'Servicio premium limpieza tapicería',
        'Tratamiento especial prendas delicadas',
        'Servicio VIP clientes premium',
        'Limpieza profunda textiles especiales'
      ],
      'RECARGO_URGENTE': [
        'Recargo por servicio mismo día',
        'Servicio urgente 4 horas',
        'Recargo entregas nocturnas',
        'Servicio express fin de semana'
      ],
      'OTRO_INGRESO': [
        'Venta de productos de limpieza',
        'Asesoría servicios lavandería',
        'Capacitación personal hoteles',
        'Servicios especiales eventos'
      ]
    };
    
    // Create 15 random income transactions
    for (let i = 0; i < 15; i++) {
      const incomeCategory = incomeCategories[Math.floor(Math.random() * incomeCategories.length)];
      const descriptions = incomeDescriptions[incomeCategory];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      
      const amount = parseFloat((Math.random() * 1000 + 100).toFixed(2));
      
      // Random date in the last 30 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      // Some income transactions are linked to hotels
      const randomHotel = Math.random() > 0.3 ? createdHotels[Math.floor(Math.random() * createdHotels.length)] : null;
      
      await prisma.transaction.create({
        data: {
          id: uuidv4(),
          type: 'INCOME',
          amount,
          incomeCategory,
          description,
          date,
          paymentMethod: Math.random() > 0.4 ? 'TRANSFERENCIA_BANCARIA' : 
                      Math.random() > 0.5 ? 'YAPE' : 'EFECTIVO',
          hotelId: randomHotel ? randomHotel.id : null,
          notes: randomHotel ? `Pago recibido de ${randomHotel.name}` : null,
          registeredById: admin.id,
          timestamp: date,
          createdAt: date,
          updatedAt: date
        }
      });
    }
  }
  
  // 6. Create system configuration entries
  const configEntries = [
    { key: 'DEFAULT_SERVICE_PRICE', value: '15.00', description: 'Precio por defecto para servicios de lavandería (por kg)' },
    { key: 'DEFAULT_PICKUP_TIME', value: '120', description: 'Tiempo estimado por defecto para recogida (en minutos)' },
    { key: 'DEFAULT_DELIVERY_TIME', value: '1440', description: 'Tiempo estimado por defecto para entrega (en minutos)' },
    { key: 'MIN_BAG_INVENTORY', value: '100', description: 'Inventario mínimo de bolsas para alertar' },
    { key: 'ENABLE_SMS_NOTIFICATIONS', value: 'false', description: 'Habilitar notificaciones por SMS' },
    { key: 'ENABLE_EMAIL_NOTIFICATIONS', value: 'true', description: 'Habilitar notificaciones por email' },
    { key: 'COMPANY_NAME', value: 'Fumy Limp', description: 'Nombre de la empresa' },
    { key: 'COMPANY_ADDRESS', value: 'Av. Industrial 123, Lima', description: 'Dirección de la empresa' },
    { key: 'COMPANY_PHONE', value: '(01) 555-1234', description: 'Teléfono de contacto de la empresa' },
    { key: 'COMPANY_EMAIL', value: 'contacto@fumylimp.com', description: 'Email de contacto de la empresa' }
  ];
  
  for (const configEntry of configEntries) {
    await prisma.systemConfig.upsert({
      where: { key: configEntry.key },
      update: configEntry,
      create: {
        id: uuidv4(),
        ...configEntry,
        updatedAt: new Date()
      }
    });
    
    console.log(`Created system config entry: ${configEntry.key}`);
  }
  
  console.log('Seed completed successfully!');
}

// Helper function to create audit logs
async function createAuditLog(action, entity, entityId, details, userId, serviceId = null, bagLabelId = null, transactionId = null, timestamp = null) {
  return prisma.auditLog.create({
    data: {
      id: uuidv4(),
      action,
      entity,
      entityId,
      details,
      userId,
      serviceId,
      bagLabelId,
      transactionId,
      timestamp: timestamp || new Date()
    }
  });
}

// Helper function for weighted random choice
function weightedRandomChoice(options, weights) {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < options.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return options[i];
    }
  }
  
  return options[options.length - 1]; // Fallback
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });