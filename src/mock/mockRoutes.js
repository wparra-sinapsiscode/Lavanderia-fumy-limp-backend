/**
 * Mock routes data for when database connection fails
 * Provides realistic route data for frontend testing
 */

// Helper function to format time (HH:MM)
const formatTime = (hours, minutes = 0) => {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// List of realistic hotels for mock data
const mockHotels = [
  {
    id: "h001",
    name: "Hotel Miraflores Deluxe",
    address: "Av. Larco 345, Miraflores",
    zone: "SUR",
    latitude: -12.122313,
    longitude: -77.031951
  },
  {
    id: "h002",
    name: "San Isidro Business Hotel",
    address: "Calle Las Flores 123, San Isidro",
    zone: "SUR",
    latitude: -12.098636,
    longitude: -77.036824
  },
  {
    id: "h003",
    name: "Barranco Beach Hotel",
    address: "Av. Pedro de Osma 175, Barranco",
    zone: "SUR",
    latitude: -12.149788,
    longitude: -77.022647
  },
  {
    id: "h004",
    name: "La Molina Resort",
    address: "Av. La Fontana 1250, La Molina",
    zone: "ESTE",
    latitude: -12.082854,
    longitude: -76.948269
  },
  {
    id: "h005",
    name: "San Miguel Plaza Hotel",
    address: "Av. La Marina 2000, San Miguel",
    zone: "OESTE",
    latitude: -12.077091,
    longitude: -77.082679
  },
  {
    id: "h006",
    name: "Surco Marriott",
    address: "Av. Caminos del Inca 1234, Surco",
    zone: "SUR",
    latitude: -12.109880,
    longitude: -76.997983
  }
];

// List of mock guest names for services
const guestNames = [
  "Juan Pérez", "María Rodríguez", "Carlos González", "Ana Torres", 
  "Luis Mendoza", "Valeria Castro", "Ricardo Fuentes", "Laura Vega",
  "José López", "Carmen Díaz", "Miguel Sánchez", "Patricia Flores",
  "Sergio Jiménez", "Sofia Morales", "Eduardo Herrera", "Diana Vargas"
];

// Room number generator
const generateRoomNumber = () => {
  const floor = Math.floor(Math.random() * 9) + 1; // 1-9
  const room = Math.floor(Math.random() * 20) + 1; // 1-20
  return `${floor}${String(room).padStart(2, '0')}`;
};

// Function to create a mock pickup service
const createMockPickupService = (id, date) => {
  const guestName = guestNames[Math.floor(Math.random() * guestNames.length)];
  const roomNumber = generateRoomNumber();
  const bagCount = Math.floor(Math.random() * 4) + 1; // 1-4 bags
  const priority = Math.random() < 0.2 ? "ALTA" : "NORMAL"; // 20% high priority
  
  return {
    id: `p-${id}`,
    guestName,
    roomNumber,
    bagCount,
    status: "PENDING_PICKUP",
    priority,
    estimatedPickupDate: date,
    observations: Math.random() < 0.3 ? "Por favor recoger antes del mediodía" : null,
    weight: null,
    createdAt: new Date(date).toISOString()
  };
};

// Function to create a mock delivery service
const createMockDeliveryService = (id, date) => {
  const guestName = guestNames[Math.floor(Math.random() * guestNames.length)];
  const roomNumber = generateRoomNumber();
  const bagCount = Math.floor(Math.random() * 4) + 1; // 1-4 bags
  const priority = Math.random() < 0.2 ? "ALTA" : "NORMAL"; // 20% high priority
  const weight = Math.random() * 10 + 0.5; // 0.5-10.5 kg
  
  return {
    id: `d-${id}`,
    guestName,
    roomNumber,
    bagCount,
    status: "IN_PROCESS",
    priority,
    estimatedDeliveryDate: date,
    observations: Math.random() < 0.3 ? "Cliente solicita entrega puntual" : null,
    weight: parseFloat(weight.toFixed(1)),
    createdAt: new Date(date).toISOString()
  };
};

// Function to create a random route
const createMockRoute = (routeNumber, date, repartidorId, repartidorName, type = 'mixed') => {
  // Select a subset of hotels for this route (2-5 hotels)
  const numHotels = Math.floor(Math.random() * 4) + 2; // 2-5 hotels
  const shuffledHotels = [...mockHotels].sort(() => 0.5 - Math.random());
  const routeHotels = shuffledHotels.slice(0, numHotels);
  
  // Starting time between 8am and 10am
  const startHour = Math.floor(Math.random() * 3) + 8; // 8-10
  let currentHour = startHour;
  
  // Create hotel stops with services
  const hotels = routeHotels.map((hotel, index) => {
    const isPickupRoute = type === 'pickup' || (type === 'mixed' && Math.random() < 0.5);
    const isDeliveryRoute = type === 'delivery' || (type === 'mixed' && Math.random() < 0.5);
    
    // Create pickups if this is a pickup or mixed route
    const pickups = [];
    if (isPickupRoute) {
      const numPickups = Math.floor(Math.random() * 3) + 1; // 1-3 pickups
      for (let i = 0; i < numPickups; i++) {
        pickups.push(createMockPickupService(`${routeNumber}-${index}-${i}`, date));
      }
    }
    
    // Create deliveries if this is a delivery or mixed route
    const deliveries = [];
    if (isDeliveryRoute) {
      const numDeliveries = Math.floor(Math.random() * 3) + 1; // 1-3 deliveries
      for (let i = 0; i < numDeliveries; i++) {
        deliveries.push(createMockDeliveryService(`${routeNumber}-${index}-${i}`, date));
      }
    }
    
    // Combine all services
    const services = [...pickups, ...deliveries];
    
    // Calculate estimated time (45 mins per hotel)
    currentHour += (index > 0) ? 0.75 : 0; // 45 mins
    const hours = Math.floor(currentHour);
    const minutes = Math.round((currentHour - hours) * 60);
    const estimatedTime = formatTime(hours, minutes);
    
    return {
      hotelId: hotel.id,
      hotelName: hotel.name,
      hotelAddress: hotel.address,
      hotelZone: hotel.zone,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      pickups,
      deliveries,
      services,
      estimatedTime,
      completed: false,
      timeSpent: 0
    };
  });

  // Calculate route stats
  const totalPickups = hotels.reduce((sum, hotel) => sum + hotel.pickups.length, 0);
  const totalDeliveries = hotels.reduce((sum, hotel) => sum + hotel.deliveries.length, 0);
  const estimatedDuration = hotels.length * 45; // 45 mins per hotel
  
  const routeId = `route-${routeNumber}-${date.replace(/\D/g, '')}`;
  
  return {
    id: routeId,
    name: `Ruta ${routeNumber}`,
    routeNumber,
    date,
    repartidorId,
    repartidorName,
    status: "pendiente",
    estimatedDuration,
    totalPickups,
    totalDeliveries,
    hotels,
    type: totalPickups > totalDeliveries ? "pickup" : totalDeliveries > totalPickups ? "delivery" : "mixed",
    createdAt: new Date(date).toISOString(),
    startTime: null,
    endTime: null,
    stops: hotels.map((hotel, index) => ({
      id: `stop-${routeId}-${index}`,
      order: index + 1,
      hotel: {
        id: hotel.hotelId,
        name: hotel.hotelName,
        address: hotel.hotelAddress,
        zone: hotel.hotelZone,
        latitude: hotel.latitude,
        longitude: hotel.longitude
      },
      service: hotel.services[0] || null
    }))
  };
};

/**
 * Generate mock routes based on query parameters
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} repartidorId - ID of the delivery person
 * @param {string} repartidorName - Name of the delivery person
 * @param {string} type - Type of route (pickup, delivery, mixed)
 * @param {number} count - Number of routes to generate
 * @returns {Array} Array of mock routes
 */
const getMockRoutes = (date, repartidorId, repartidorName = "Repartidor Ejemplo", type = 'mixed', count = 2) => {
  const routes = [];
  
  for (let i = 1; i <= count; i++) {
    // Generate different route types
    const routeType = type === 'mixed' ? 
      (i % 3 === 0 ? 'pickup' : i % 3 === 1 ? 'delivery' : 'mixed') : type;
      
    routes.push(createMockRoute(i, date, repartidorId, repartidorName, routeType));
  }
  
  return routes;
};

/**
 * Get a single mock route by ID
 * @param {string} id - Route ID
 * @param {string} date - Fallback date if needed
 * @returns {Object} Mock route object
 */
const getMockRouteById = (id, date = new Date().toISOString().split('T')[0]) => {
  // Extract route number from ID if possible
  const routeNumberMatch = id.match(/route-(\d+)/);
  const routeNumber = routeNumberMatch ? parseInt(routeNumberMatch[1]) : 1;
  
  return createMockRoute(routeNumber, date, 'mock-repartidor-1', 'Repartidor Ejemplo', 
    Math.random() < 0.33 ? 'pickup' : Math.random() < 0.66 ? 'delivery' : 'mixed');
};

// Export mock data generators
module.exports = {
  getMockRoutes,
  getMockRouteById
};