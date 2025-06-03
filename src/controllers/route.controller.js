/**
 * Route Controller
 * Handles business logic for managing delivery and pickup routes
 */

// Importar solo la instancia de prisma desde la configuración
const { prisma } = require('../config/database');

/**
 * Helper function to check if a service is a pickup service
 * @param {Object} service - Service object
 * @returns {boolean} True if it's a pickup service
 */
function isPickupService(service) {
  return service.status === 'PENDING_PICKUP';
}

/**
 * Helper function to check if a service is a delivery service
 * @param {Object} service - Service object
 * @returns {boolean} True if it's a delivery service
 */
function isDeliveryService(service) {
  return ['IN_PROCESS', 'PARTIAL_DELIVERY', 'COMPLETED'].includes(service.status);
}

/**
 * Creates a new route for a repartidor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with created route
 */
exports.createRoute = async (req, res) => {
  try {
    const { name, date, repartidorId, stops, notes } = req.body;

    if (!name || !date || !repartidorId || !stops || !Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos los campos requeridos deben ser proporcionados y las paradas deben ser un array no vacío' 
      });
    }

    // Verificar que el repartidor existe
    const repartidor = await prisma.user.findUnique({
      where: { id: repartidorId }
    });

    if (!repartidor || repartidor.role !== 'REPARTIDOR') {
      return res.status(400).json({ 
        success: false, 
        message: 'El repartidor especificado no existe o no tiene el rol adecuado' 
      });
    }

    // Crear la ruta con una transacción para asegurar la integridad de datos
    const result = await prisma.$transaction(async (tx) => {
      // Crear la ruta principal
      const route = await tx.route.create({
        data: {
          name,
          date: new Date(date),
          repartidorId,
          notes,
          status: 'PLANNED'
        }
      });

      // Crear las paradas de la ruta
      const routeStops = await Promise.all(
        stops.map(async (stop, index) => {
          // Verificar que el hotel existe
          const hotel = await tx.hotel.findUnique({
            where: { id: stop.hotelId }
          });

          if (!hotel) {
            throw new Error(`El hotel con ID ${stop.hotelId} no existe`);
          }

          // Verificar que el servicio existe si se proporciona
          if (stop.serviceId) {
            const service = await tx.service.findUnique({
              where: { id: stop.serviceId }
            });

            if (!service) {
              throw new Error(`El servicio con ID ${stop.serviceId} no existe`);
            }
          }

          return tx.routeStop.create({
            data: {
              routeId: route.id,
              hotelId: stop.hotelId,
              serviceId: stop.serviceId || null,
              order: index + 1,
              scheduledTime: stop.scheduledTime ? new Date(stop.scheduledTime) : null,
              notes: stop.notes || null
            }
          });
        })
      );

      return { route, routeStops };
    });

    return res.status(201).json({
      success: true,
      message: 'Ruta creada exitosamente',
      data: {
        route: result.route,
        stops: result.routeStops
      }
    });
  } catch (error) {
    console.error('Error al crear la ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la ruta',
      error: error.message
    });
  }
};

/**
 * Gets all routes with optional filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with list of routes
 */
exports.getRoutes = async (req, res) => {
  try {
    const { 
      repartidorId, 
      date, 
      status,
      startDate,
      endDate,
      includeStops = 'true' // Default to true to ensure compatibility with frontend
    } = req.query;

    // Construir el where para el filtrado
    const where = {};

    if (repartidorId) {
      where.repartidorId = repartidorId;
    }

    if (date) {
      // Crear fecha específicamente para zona horaria de Lima, Perú (UTC-5)
      const dateStr = date.includes('T') ? date.split('T')[0] : date; // Extraer solo la fecha YYYY-MM-DD
      const limaOffset = -5 * 60; // Lima está UTC-5 (en minutos)
      
      // Crear fechas en zona horaria de Lima
      const startDate = new Date(`${dateStr}T00:00:00-05:00`);
      const endDate = new Date(`${dateStr}T23:59:59.999-05:00`);
      
      where.date = {
        gte: startDate,
        lte: endDate
      };
    }

    if (startDate && endDate) {
      // Manejar rango de fechas también en zona horaria de Lima
      const startDateStr = startDate.includes('T') ? startDate.split('T')[0] : startDate;
      const endDateStr = endDate.includes('T') ? endDate.split('T')[0] : endDate;
      
      where.date = {
        gte: new Date(`${startDateStr}T00:00:00-05:00`),
        lte: new Date(`${endDateStr}T23:59:59.999-05:00`)
      };
    }

    if (status) {
      where.status = status;
    }

    // Incluir o no las paradas en la respuesta
    const include = {
      repartidor: {
        select: {
          id: true,
          name: true,
          email: true,
          zone: true
        }
      }
    };

    if (includeStops === 'true') {
      include.stops = {
        include: {
          hotel: {
            select: {
              id: true,
              name: true,
              address: true,
              zone: true,
              latitude: true,
              longitude: true
            }
          },
          service: {
            select: {
              id: true,
              guestName: true,
              roomNumber: true,
              bagCount: true,
              status: true,
              priority: true,
              estimatedPickupDate: true,
              estimatedDeliveryDate: true,
              weight: true,
              observations: true
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      };
    }

    // Obtener las rutas con manejo de errores mejorado
    let routes = [];
    try {
      routes = await prisma.route.findMany({
        where,
        include,
        orderBy: {
          date: 'desc'
        }
      });
    } catch (dbError) {
      console.error('Error de conexión a la base de datos:', dbError);
      
      // Mejor manejo de errores de conexión a la base de datos
      return res.status(503).json({
        success: false,
        message: 'Error de conexión a la base de datos. Por favor, inténtelo de nuevo más tarde.',
        error: 'DATABASE_CONNECTION_ERROR'
      });
    }

    // Format routes to match frontend expectations
    const formattedRoutes = routes.map(route => {
      // Assign route number if not exists
      const routeNumber = route.name ? parseInt(route.name.match(/\d+/)?.[0] || '0') : 0;
      
      // Map backend status to frontend status format
      const statusMap = {
        'PLANNED': 'pendiente',
        'IN_PROGRESS': 'en_progreso',
        'COMPLETED': 'completada',
        'CANCELLED': 'cancelada'
      };
      
      // Calculate route stats
      let totalPickups = 0;
      let totalDeliveries = 0;
      
      // Group stops by hotel and format for frontend
      const hotelMap = new Map();
      
      route.stops?.forEach(stop => {
        const hotelId = stop.hotel.id;
        
        if (!hotelMap.has(hotelId)) {
          hotelMap.set(hotelId, {
            hotelId: stop.hotel.id,
            hotelName: stop.hotel.name,
            hotelAddress: stop.hotel.address,
            hotelZone: stop.hotel.zone,
            latitude: stop.hotel.latitude,
            longitude: stop.hotel.longitude,
            pickups: [],
            deliveries: [],
            services: [],
            estimatedTime: stop.scheduledTime ? new Date(stop.scheduledTime).toLocaleTimeString('es-PE') : null,
            completed: false,
            timeSpent: 0
          });
        }
        
        const hotel = hotelMap.get(hotelId);
        
        if (stop.service) {
          hotel.services.push(stop.service);
          
          if (isPickupService(stop.service)) {
            hotel.pickups.push(stop.service);
            totalPickups++;
          } else if (isDeliveryService(stop.service)) {
            hotel.deliveries.push(stop.service);
            totalDeliveries++;
          }
        }
        
        // Hotel is completed if all its stops are completed
        if (stop.status === 'COMPLETED') {
          // Check if all stops for this hotel are completed
          const hotelStops = route.stops.filter(s => s.hotel.id === hotelId);
          const completedStops = hotelStops.filter(s => s.status === 'COMPLETED');
          hotel.completed = hotelStops.length === completedStops.length;
        }
      });
      
      // Update estimated times for each hotel based on their services
      const hotels = Array.from(hotelMap.values()).map(hotel => {
        const hotelTime = calculateTimeForHotel(hotel.services);
        return {
          ...hotel,
          estimatedTimeMinutes: hotelTime,
          estimatedTime: hotel.estimatedTime // Keep original scheduled time
        };
      });
      
      // Calculate estimated duration based on actual services and bags
      const estimatedDuration = hotels.reduce((total, hotel) => {
        return total + calculateTimeForHotel(hotel.services);
      }, 0);
      
      return {
        ...route,
        routeNumber: routeNumber || routes.indexOf(route) + 1,
        repartidorName: route.repartidor?.name || 'Desconocido',
        status: statusMap[route.status] || 'pendiente',
        totalPickups,
        totalDeliveries,
        estimatedDuration,
        hotels,
        // Ensure these fields are present for frontend compatibility
        type: totalPickups > totalDeliveries ? 'pickup' : totalDeliveries > totalPickups ? 'delivery' : 'mixed'
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedRoutes.length,
      data: formattedRoutes
    });
  } catch (error) {
    console.error('Error al obtener las rutas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las rutas',
      error: error.message
    });
  }
};

/**
 * Gets a single route by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with route details
 */
exports.getRouteById = async (req, res) => {
  try {
    const { id } = req.params;

    // Intentar obtener la ruta con manejo de errores mejorado
    let route;
    try {
      route = await prisma.route.findUnique({
        where: { id },
        include: {
          repartidor: {
            select: {
              id: true,
              name: true,
              email: true,
              zone: true
            }
          },
          stops: {
            include: {
              hotel: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  zone: true,
                  latitude: true,
                  longitude: true
                }
              },
              service: {
                select: {
                  id: true,
                  guestName: true,
                  roomNumber: true,
                  bagCount: true,
                  status: true,
                  priority: true,
                  estimatedPickupDate: true,
                  estimatedDeliveryDate: true,
                  weight: true,
                  observations: true,
                  deliveredBagCount: true,
                  remainingBags: true
                }
              }
            },
            orderBy: {
              order: 'asc'
            }
          }
        }
      });
    } catch (dbError) {
      console.error('Error de conexión a la base de datos:', dbError);
      
      // Mejor manejo de errores de conexión a la base de datos
      return res.status(503).json({
        success: false,
        message: 'Error de conexión a la base de datos. Por favor, inténtelo de nuevo más tarde.',
        error: 'DATABASE_CONNECTION_ERROR'
      });
    }

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    // Format route to match frontend expectations
    const routeNumber = route.name ? parseInt(route.name.match(/\d+/)?.[0] || '0') : 0;
    
    // Map backend status to frontend status format
    const statusMap = {
      'PLANNED': 'pendiente',
      'IN_PROGRESS': 'en_progreso',
      'COMPLETED': 'completada',
      'CANCELLED': 'cancelada'
    };
    
    // Calculate route stats
    let totalPickups = 0;
    let totalDeliveries = 0;
    
    // Group stops by hotel and format for frontend
    const hotelMap = new Map();
    
    route.stops.forEach(stop => {
      const hotelId = stop.hotel.id;
      
      if (!hotelMap.has(hotelId)) {
        hotelMap.set(hotelId, {
          hotelId: stop.hotel.id,
          hotelName: stop.hotel.name,
          hotelAddress: stop.hotel.address,
          hotelZone: stop.hotel.zone,
          latitude: stop.hotel.latitude,
          longitude: stop.hotel.longitude,
          pickups: [],
          deliveries: [],
          services: [],
          estimatedTime: stop.scheduledTime ? new Date(stop.scheduledTime).toLocaleTimeString('es-PE') : null,
          completed: false,
          timeSpent: 0
        });
      }
      
      const hotel = hotelMap.get(hotelId);
      
      if (stop.service) {
        hotel.services.push(stop.service);
        
        if (isPickupService(stop.service)) {
          hotel.pickups.push(stop.service);
          totalPickups++;
        } else if (isDeliveryService(stop.service)) {
          hotel.deliveries.push(stop.service);
          totalDeliveries++;
        }
      }
      
      // Hotel is completed if all its stops are completed
      if (stop.status === 'COMPLETED') {
        // Check if all stops for this hotel are completed
        const hotelStops = route.stops.filter(s => s.hotel.id === hotelId);
        const completedStops = hotelStops.filter(s => s.status === 'COMPLETED');
        hotel.completed = hotelStops.length === completedStops.length;
      }
    });
    
    // Update estimated times for each hotel based on their services
    const hotels = Array.from(hotelMap.values()).map(hotel => {
      const hotelTime = calculateTimeForHotel(hotel.services);
      return {
        ...hotel,
        estimatedTimeMinutes: hotelTime,
        estimatedTime: hotel.estimatedTime // Keep original scheduled time
      };
    });
    
    // Calculate estimated duration based on actual services and bags
    const estimatedDuration = hotels.reduce((total, hotel) => {
      return total + calculateTimeForHotel(hotel.services);
    }, 0);
    
    const formattedRoute = {
      ...route,
      routeNumber: routeNumber || 1,
      repartidorName: route.repartidor?.name || 'Desconocido',
      status: statusMap[route.status] || 'pendiente',
      totalPickups,
      totalDeliveries,
      estimatedDuration,
      hotels,
      // Ensure these fields are present for frontend compatibility
      type: totalPickups > totalDeliveries ? 'pickup' : totalDeliveries > totalPickups ? 'delivery' : 'mixed'
    };

    return res.status(200).json({
      success: true,
      data: formattedRoute
    });
  } catch (error) {
    console.error('Error al obtener la ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la ruta',
      error: error.message
    });
  }
};

/**
 * Updates a route's main information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with updated route
 */
exports.updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, repartidorId, status, notes, startTime, endTime, totalDistance } = req.body;

    // Verificar que la ruta existe
    const existingRoute = await prisma.route.findUnique({
      where: { id }
    });

    if (!existingRoute) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    // Construir los datos de actualización
    const updateData = {};

    if (name) updateData.name = name;
    if (date) updateData.date = new Date(date);
    if (repartidorId) {
      const repartidor = await prisma.user.findUnique({
        where: { id: repartidorId }
      });

      if (!repartidor || repartidor.role !== 'REPARTIDOR') {
        return res.status(400).json({
          success: false,
          message: 'El repartidor especificado no existe o no tiene el rol adecuado'
        });
      }

      updateData.repartidorId = repartidorId;
    }
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (totalDistance !== undefined) updateData.totalDistance = totalDistance;

    // Actualizar la ruta
    const updatedRoute = await prisma.route.update({
      where: { id },
      data: updateData,
      include: {
        repartidor: {
          select: {
            id: true,
            name: true,
            email: true,
            zone: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Ruta actualizada exitosamente',
      data: updatedRoute
    });
  } catch (error) {
    console.error('Error al actualizar la ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la ruta',
      error: error.message
    });
  }
};

/**
 * Updates the status of a route
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with updated route status
 */
exports.updateRouteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido'
      });
    }

    // Actualizar campos adicionales según el estado
    const updateData = { status };

    if (status === 'IN_PROGRESS' && !await prisma.route.findUnique({ where: { id } }).startTime) {
      updateData.startTime = new Date();
    }

    if (status === 'COMPLETED' && !await prisma.route.findUnique({ where: { id } }).endTime) {
      updateData.endTime = new Date();
    }

    const updatedRoute = await prisma.route.update({
      where: { id },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      message: 'Estado de la ruta actualizado exitosamente',
      data: updatedRoute
    });
  } catch (error) {
    console.error('Error al actualizar el estado de la ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado de la ruta',
      error: error.message
    });
  }
};

/**
 * Starts a route (sets status to IN_PROGRESS and records start time)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with updated route
 */
exports.startRoute = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la ruta existe
    const route = await prisma.route.findUnique({
      where: { id }
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    // Verificar que la ruta está en estado PLANNED
    if (route.status !== 'PLANNED') {
      return res.status(400).json({
        success: false,
        message: `No se puede iniciar la ruta porque su estado actual es ${route.status}`
      });
    }

    // Actualizar la ruta
    const updatedRoute = await prisma.route.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startTime: new Date()
      },
      include: {
        repartidor: {
          select: {
            id: true,
            name: true,
            email: true,
            zone: true
          }
        },
        stops: {
          include: {
            hotel: {
              select: {
                id: true,
                name: true,
                address: true,
                zone: true,
                latitude: true,
                longitude: true
              }
            },
            service: {
              select: {
                id: true,
                guestName: true,
                roomNumber: true,
                bagCount: true,
                status: true,
                priority: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    // Convertir el modelo de datos para que sea compatible con el frontend
    const formattedRoute = {
      ...updatedRoute,
      hotels: updatedRoute.stops.map(stop => ({
        hotelId: stop.hotel.id,
        hotelName: stop.hotel.name,
        hotelAddress: stop.hotel.address,
        hotelZone: stop.hotel.zone,
        latitude: stop.hotel.latitude,
        longitude: stop.hotel.longitude,
        pickups: stop.service && isPickupService(stop.service) ? [stop.service] : [],
        deliveries: stop.service && isDeliveryService(stop.service) ? [stop.service] : [],
        services: stop.service ? [stop.service] : [],
        estimatedTime: stop.scheduledTime ? new Date(stop.scheduledTime).toLocaleTimeString('es-PE') : null,
        completed: stop.status === 'COMPLETED',
        timeSpent: 0
      }))
    };

    return res.status(200).json({
      success: true,
      message: 'Ruta iniciada exitosamente',
      data: formattedRoute
    });
  } catch (error) {
    console.error('Error al iniciar la ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al iniciar la ruta',
      error: error.message
    });
  }
};

/**
 * Completes a route (sets status to COMPLETED and records end time)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with updated route
 */
exports.completeRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { totalDistance, notes } = req.body;

    // Verificar que la ruta existe
    const route = await prisma.route.findUnique({
      where: { id }
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    // Verificar que la ruta está en estado IN_PROGRESS
    if (route.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: `No se puede completar la ruta porque su estado actual es ${route.status}`
      });
    }

    // Construir los datos de actualización
    const updateData = {
      status: 'COMPLETED',
      endTime: new Date()
    };

    if (totalDistance) updateData.totalDistance = totalDistance;
    if (notes) updateData.notes = notes;

    // Actualizar la ruta
    const updatedRoute = await prisma.route.update({
      where: { id },
      data: updateData,
      include: {
        repartidor: {
          select: {
            id: true,
            name: true,
            email: true,
            zone: true
          }
        },
        stops: {
          include: {
            hotel: true,
            service: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    // Convertir el modelo de datos para que sea compatible con el frontend
    const formattedRoute = {
      ...updatedRoute,
      hotels: updatedRoute.stops.map(stop => ({
        hotelId: stop.hotel.id,
        hotelName: stop.hotel.name,
        hotelAddress: stop.hotel.address,
        hotelZone: stop.hotel.zone,
        latitude: stop.hotel.latitude,
        longitude: stop.hotel.longitude,
        pickups: stop.service && isPickupService(stop.service) ? [stop.service] : [],
        deliveries: stop.service && isDeliveryService(stop.service) ? [stop.service] : [],
        services: stop.service ? [stop.service] : [],
        estimatedTime: stop.scheduledTime ? new Date(stop.scheduledTime).toLocaleTimeString('es-PE') : null,
        completed: stop.status === 'COMPLETED',
        timeSpent: 0
      }))
    };

    return res.status(200).json({
      success: true,
      message: 'Ruta completada exitosamente',
      data: formattedRoute
    });
  } catch (error) {
    console.error('Error al completar la ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al completar la ruta',
      error: error.message
    });
  }
};

/**
 * Adds a new stop to an existing route
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with the added stop
 */
exports.addRouteStop = async (req, res) => {
  try {
    const { id } = req.params;
    const { hotelId, serviceId, scheduledTime, notes } = req.body;

    // Verificar que la ruta existe
    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        stops: {
          orderBy: {
            order: 'desc'
          },
          take: 1
        }
      }
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    // Verificar que el hotel existe
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });

    if (!hotel) {
      return res.status(400).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }

    // Verificar que el servicio existe si se proporciona
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });

      if (!service) {
        return res.status(400).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }
    }

    // Calcular el siguiente orden
    const nextOrder = route.stops.length > 0 ? route.stops[0].order + 1 : 1;

    // Crear la nueva parada
    const newStop = await prisma.routeStop.create({
      data: {
        routeId: id,
        hotelId,
        serviceId: serviceId || null,
        order: nextOrder,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
        notes: notes || null
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            address: true,
            zone: true
          }
        },
        service: {
          select: {
            id: true,
            guestName: true,
            roomNumber: true,
            status: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Parada agregada exitosamente',
      data: newStop
    });
  } catch (error) {
    console.error('Error al agregar parada a la ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al agregar parada a la ruta',
      error: error.message
    });
  }
};

/**
 * Updates a route stop
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with updated stop
 */
exports.updateRouteStop = async (req, res) => {
  try {
    const { routeId, stopId } = req.params;
    const { hotelId, serviceId, order, status, scheduledTime, actualTime, notes } = req.body;

    // Verificar que la parada existe
    const existingStop = await prisma.routeStop.findFirst({
      where: {
        id: stopId,
        routeId
      }
    });

    if (!existingStop) {
      return res.status(404).json({
        success: false,
        message: 'Parada no encontrada o no pertenece a la ruta especificada'
      });
    }

    // Construir los datos de actualización
    const updateData = {};

    if (hotelId) {
      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId }
      });

      if (!hotel) {
        return res.status(400).json({
          success: false,
          message: 'Hotel no encontrado'
        });
      }

      updateData.hotelId = hotelId;
    }

    if (serviceId !== undefined) {
      if (serviceId === null) {
        updateData.serviceId = null;
      } else {
        const service = await prisma.service.findUnique({
          where: { id: serviceId }
        });

        if (!service) {
          return res.status(400).json({
            success: false,
            message: 'Servicio no encontrado'
          });
        }

        updateData.serviceId = serviceId;
      }
    }

    if (order) updateData.order = parseInt(order, 10);
    if (status) updateData.status = status;
    if (scheduledTime) updateData.scheduledTime = new Date(scheduledTime);
    if (actualTime) updateData.actualTime = new Date(actualTime);
    if (notes !== undefined) updateData.notes = notes;

    // Actualizar la parada
    const updatedStop = await prisma.routeStop.update({
      where: { id: stopId },
      data: updateData,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            address: true,
            zone: true
          }
        },
        service: {
          select: {
            id: true,
            guestName: true,
            roomNumber: true,
            status: true
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Parada actualizada exitosamente',
      data: updatedStop
    });
  } catch (error) {
    console.error('Error al actualizar la parada:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la parada',
      error: error.message
    });
  }
};

/**
 * Deletes a route stop
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success response
 */
exports.deleteRouteStop = async (req, res) => {
  try {
    const { routeId, stopId } = req.params;

    // Verificar que la parada existe
    const existingStop = await prisma.routeStop.findFirst({
      where: {
        id: stopId,
        routeId
      }
    });

    if (!existingStop) {
      return res.status(404).json({
        success: false,
        message: 'Parada no encontrada o no pertenece a la ruta especificada'
      });
    }

    // Eliminar la parada
    await prisma.routeStop.delete({
      where: { id: stopId }
    });

    // Reordenar las paradas restantes
    const remainingStops = await prisma.routeStop.findMany({
      where: { routeId },
      orderBy: { order: 'asc' }
    });

    await Promise.all(
      remainingStops.map(async (stop, index) => {
        await prisma.routeStop.update({
          where: { id: stop.id },
          data: { order: index + 1 }
        });
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Parada eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar la parada:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la parada',
      error: error.message
    });
  }
};

/**
 * Deletes a route with all its stops
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success response
 */
exports.deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la ruta existe
    const route = await prisma.route.findUnique({
      where: { id }
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    // Eliminar la ruta (esto también eliminará todas las paradas debido a la relación onDelete: Cascade)
    await prisma.route.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: 'Ruta eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar la ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la ruta',
      error: error.message
    });
  }
};

/**
 * Deletes all routes for a specific date
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Success response
 */
exports.deleteRoutesByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'El parámetro date es requerido'
      });
    }

    // Crear rango de fecha en zona horaria de Lima, Perú (UTC-5)
    const dateStr = date.includes('T') ? date.split('T')[0] : date;
    const startDate = new Date(`${dateStr}T00:00:00-05:00`);
    const endDate = new Date(`${dateStr}T23:59:59.999-05:00`);

    // Encontrar rutas para la fecha especificada
    const routesToDelete = await prisma.route.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    if (routesToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No se encontraron rutas para la fecha ${date}`
      });
    }

    // Eliminar las rutas encontradas
    const { count } = await prisma.route.deleteMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: `${count} rutas eliminadas exitosamente para la fecha ${date}`,
      count
    });
  } catch (error) {
    console.error('Error al eliminar rutas por fecha:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar rutas por fecha',
      error: error.message
    });
  }
};

/**
 * Optimizes a route based on location coordinates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with optimized route
 */
exports.optimizeRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { startLatitude, startLongitude } = req.body;
    
    // Validar que se proporcionaron coordenadas de inicio
    if (!startLatitude || !startLongitude) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren las coordenadas de inicio (startLatitude y startLongitude) para optimizar la ruta'
      });
    }
    
    // Validar que las coordenadas son números válidos
    if (isNaN(parseFloat(startLatitude)) || isNaN(parseFloat(startLongitude))) {
      return res.status(400).json({
        success: false,
        message: 'Las coordenadas de inicio deben ser valores numéricos válidos'
      });
    }

    // Verificar que la ruta existe
    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        stops: {
          include: {
            hotel: true
          }
        }
      }
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    // Verificar que todos los hoteles tienen coordenadas
    const stopsWithoutCoordinates = route.stops.filter(
      stop => !stop.hotel.latitude || !stop.hotel.longitude || 
             isNaN(parseFloat(stop.hotel.latitude)) || 
             isNaN(parseFloat(stop.hotel.longitude))
    );

    if (stopsWithoutCoordinates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede optimizar la ruta porque algunos hoteles no tienen coordenadas válidas',
        hotelsWithoutCoordinates: stopsWithoutCoordinates.map(stop => ({
          id: stop.hotel.id,
          name: stop.hotel.name
        }))
      });
    }

    // Implementar algoritmo de optimización de ruta (TSP - Traveling Salesman Problem)
    // Esta es una implementación básica utilizando el algoritmo del vecino más cercano
    const optimizedStopIds = [];
    
    // Punto de inicio (coordenadas proporcionadas o del primer hotel)
    let currentLat = startLatitude || route.stops[0].hotel.latitude;
    let currentLng = startLongitude || route.stops[0].hotel.longitude;
    
    // Conjunto de paradas no visitadas
    const unvisitedStops = new Set(route.stops.map(stop => stop.id));
    
    // Mientras haya paradas sin visitar
    while (unvisitedStops.size > 0) {
      let nearestStopId = null;
      let minDistance = Infinity;
      
      // Encontrar la parada más cercana
      for (const stopId of unvisitedStops) {
        const stop = route.stops.find(s => s.id === stopId);
        const hotel = stop.hotel;
        
        // Calcular distancia (fórmula de Haversine)
        const distance = calculateDistance(
          currentLat, 
          currentLng, 
          hotel.latitude, 
          hotel.longitude
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestStopId = stopId;
        }
      }
      
      // Agregar la parada más cercana a la ruta optimizada
      optimizedStopIds.push(nearestStopId);
      unvisitedStops.delete(nearestStopId);
      
      // Actualizar la posición actual
      const nextStop = route.stops.find(s => s.id === nearestStopId);
      currentLat = nextStop.hotel.latitude;
      currentLng = nextStop.hotel.longitude;
    }
    
    // Actualizar el orden de las paradas según la optimización
    await Promise.all(
      optimizedStopIds.map(async (stopId, index) => {
        await prisma.routeStop.update({
          where: { id: stopId },
          data: { order: index + 1 }
        });
      })
    );
    
    // Obtener la ruta con paradas reordenadas
    const optimizedRoute = await prisma.route.findUnique({
      where: { id },
      include: {
        stops: {
          include: {
            hotel: true,
            service: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    // Calcular la distancia total de la ruta
    let totalDistance = 0;
    for (let i = 0; i < optimizedRoute.stops.length - 1; i++) {
      const currentStop = optimizedRoute.stops[i];
      const nextStop = optimizedRoute.stops[i + 1];
      
      totalDistance += calculateDistance(
        currentStop.hotel.latitude,
        currentStop.hotel.longitude,
        nextStop.hotel.latitude,
        nextStop.hotel.longitude
      );
    }
    
    // Actualizar la distancia total en la ruta
    await prisma.route.update({
      where: { id },
      data: { totalDistance }
    });
    
    optimizedRoute.totalDistance = totalDistance;

    return res.status(200).json({
      success: true,
      message: 'Ruta optimizada exitosamente',
      data: optimizedRoute
    });
  } catch (error) {
    console.error('Error al optimizar la ruta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al optimizar la ruta',
      error: error.message
    });
  }
};

/**
 * Calculates the distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Converts degrees to radians
 * @param {number} deg - Angle in degrees
 * @returns {number} Angle in radians
 */
function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Generates a recommended route based on pending services
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with recommended route
 */
exports.generateRecommendedRoute = async (req, res) => {
  try {
    // Accept both query and body parameters for flexibility
    const params = { ...req.query, ...req.body };
    const { repartidorId, date, zone, type = 'mixed' } = params;

    // Validate route type
    if (type && !['pickup', 'delivery', 'mixed'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'El tipo de ruta debe ser uno de los siguientes: pickup, delivery, mixed',
        error: 'INVALID_ROUTE_TYPE'
      });
    }

    // If no date is provided, default to today
    const routeDate = date || new Date().toISOString().split('T')[0];

    try {
      // Si repartidorId no está especificado, intenta encontrar repartidores y generar rutas
      if (!repartidorId) {
        // Find all repartidores or filter by zone
        const whereRepartidor = {
          role: 'REPARTIDOR',
          active: true
        };
        
        if (zone) {
          whereRepartidor.zone = zone;
        }
        
        const repartidores = await prisma.user.findMany({
          where: whereRepartidor
        });
        
        if (repartidores.length === 0) {
          return res.status(200).json({
            success: true,
            message: 'No hay repartidores disponibles',
            data: []
          });
        }
        
        // Generate routes by zone instead of by repartidor
        const allRoutes = [];
        
        // Get services for the date
        const services = await prisma.service.findMany({
          where: {
            status: 'PENDING_PICKUP',
            estimatedPickupDate: {
              gte: new Date(`${routeDate}T00:00:00-05:00`),
              lte: new Date(`${routeDate}T23:59:59.999-05:00`)
            }
          },
          include: {
            hotel: true
          },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'asc' }
          ]
        });

        if (services.length === 0) {
          return res.status(200).json({
            success: true,
            message: 'No hay servicios pendientes para la fecha especificada',
            data: []
          });
        }

        // Group services by zone
        const servicesByZone = {};
        services.forEach(service => {
          const serviceZone = service.hotel.zone;
          if (!servicesByZone[serviceZone]) {
            servicesByZone[serviceZone] = [];
          }
          servicesByZone[serviceZone].push(service);
        });

        // Generate one route per zone
        for (const [serviceZone, zoneServices] of Object.entries(servicesByZone)) {
          const zoneRepartidores = repartidores.filter(r => r.zone === serviceZone);
          
          if (zoneRepartidores.length === 0) {
            console.log(`No hay repartidores disponibles para la zona ${serviceZone}`);
            continue;
          }

          try {
            const result = await generateRouteForZone(zoneRepartidores[0].id, routeDate, serviceZone, zoneServices);
            if (result) {
              allRoutes.push(result);
            }
          } catch (err) {
            console.error(`Error generando ruta para zona ${serviceZone}:`, err);
            // Continue with next zone
          }
        }
        
        if (allRoutes.length === 0) {
          return res.status(200).json({
            success: true,
            message: 'No hay servicios pendientes para el día y criterios especificados',
            data: []
          });
        }
        
        // Format routes for frontend
        const formattedRoutes = allRoutes.map(formatRouteForFrontend);
        
        return res.status(201).json({
          success: true,
          message: `${formattedRoutes.length} rutas generadas exitosamente`,
          data: formattedRoutes
        });
      } else {
        // Verificar que el repartidor existe
        const repartidor = await prisma.user.findUnique({
          where: { id: repartidorId }
        });

        if (!repartidor || repartidor.role !== 'REPARTIDOR') {
          return res.status(400).json({
            success: false,
            message: 'El repartidor especificado no existe o no tiene el rol adecuado',
            data: []
          });
        }

        // Generate route for the specified repartidor
        const result = await generateRouteForRepartidor(repartidorId, routeDate, zone, type);
        
        if (!result) {
          return res.status(200).json({
            success: true,
            message: 'No hay servicios pendientes para el día y criterios especificados',
            data: []
          });
        }
        
        // Format route for frontend
        const formattedRoute = formatRouteForFrontend(result);
        
        // Asegurar que se devuelve un array para el frontend
        return res.status(201).json({
          success: true,
          message: 'Ruta generada exitosamente',
          data: [formattedRoute] // Devolver como array para consistencia
        });
      }
    } catch (dbError) {
      console.error('Error de conexión a la base de datos:', dbError);
      
      // Mejor manejo de errores de conexión a la base de datos
      return res.status(503).json({
        success: false,
        message: 'Error de conexión a la base de datos. Por favor, inténtelo de nuevo más tarde.',
        error: 'DATABASE_CONNECTION_ERROR'
      });
    }
  } catch (error) {
    console.error('Error al generar ruta recomendada:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar ruta recomendada',
      error: error.message
    });
  }
};

/**
 * Helper function to generate a route for a specific repartidor
 * @param {string} repartidorId - ID of the repartidor
 * @param {string} date - Date for the route (YYYY-MM-DD)
 * @param {string} zone - Optional zone filter
 * @param {string} type - Route type (pickup, delivery, mixed)
 * @returns {Object} Generated route with stops
 */
async function generateRouteForRepartidor(repartidorId, date, zone, type = 'mixed') {
  // Construir la consulta para servicios pendientes
  const whereService = {
    OR: []
  };

  // Incluir servicios pendientes de recogida si es de tipo 'pickup' o 'mixed'
  if (type === 'pickup' || type === 'mixed') {
    whereService.OR.push({
      status: 'PENDING_PICKUP',
      estimatedPickupDate: {
        gte: new Date(`${date}T00:00:00-05:00`),
        lte: new Date(`${date}T23:59:59.999-05:00`)
      }
    });
  }

  // Incluir servicios listos para entrega si es de tipo 'delivery' o 'mixed'
  if (type === 'delivery' || type === 'mixed') {
    whereService.OR.push({
      status: 'IN_PROCESS',
      estimatedDeliveryDate: {
        gte: new Date(`${date}T00:00:00-05:00`),
        lte: new Date(`${date}T23:59:59.999-05:00`)
      }
    });
  }

  // Filtrar por zona si se proporciona
  if (zone) {
    whereService.hotel = {
      zone
    };
  }

  // Obtener servicios pendientes
  const pendingServices = await prisma.service.findMany({
    where: whereService,
    include: {
      hotel: true
    },
    orderBy: [
      {
        priority: 'desc'
      },
      {
        estimatedPickupDate: 'asc'
      }
    ]
  });

  if (pendingServices.length === 0) {
    return null;
  }

  // Agrupar servicios por hotel
  const servicesByHotel = {};
  pendingServices.forEach(service => {
    if (!servicesByHotel[service.hotelId]) {
      servicesByHotel[service.hotelId] = [];
    }
    servicesByHotel[service.hotelId].push(service);
  });

  // Crear la ruta recomendada
  const routeName = `Ruta ${type === 'pickup' ? 'recogida' : type === 'delivery' ? 'entrega' : 'mixta'} ${new Date(date).toLocaleDateString()}`;
  
  const result = await prisma.$transaction(async (tx) => {
    // Crear la ruta principal
    const route = await tx.route.create({
      data: {
        name: routeName,
        date: new Date(date),
        repartidorId,
        status: 'PLANNED',
        notes: `Ruta generada automáticamente para servicios ${type}`
      },
      include: {
        repartidor: true
      }
    });

    // Crear las paradas de la ruta
    const routeStops = [];
    let order = 1;

    // Primero agregar los hoteles con servicios de alta prioridad
    const hotelIds = Object.keys(servicesByHotel);
    
    for (const hotelId of hotelIds) {
      const services = servicesByHotel[hotelId];
      const highPriorityServices = services.filter(s => s.priority === 'ALTA');
      
      if (highPriorityServices.length > 0) {
        for (const service of highPriorityServices) {
          const routeStop = await tx.routeStop.create({
            data: {
              routeId: route.id,
              hotelId,
              serviceId: service.id,
              order: order++,
              notes: `Servicio ${service.status === 'PENDING_PICKUP' ? 'recogida' : 'entrega'} - Alta prioridad`
            },
            include: {
              hotel: true,
              service: true
            }
          });
          routeStops.push(routeStop);
        }
      }
    }

    // Luego agregar los demás servicios agrupados por hotel
    for (const hotelId of hotelIds) {
      const services = servicesByHotel[hotelId];
      const normalPriorityServices = services.filter(s => s.priority !== 'ALTA');
      
      if (normalPriorityServices.length > 0) {
        // Agrupar servicios del mismo hotel en una sola parada
        const pickupServices = normalPriorityServices.filter(s => s.status === 'PENDING_PICKUP');
        const deliveryServices = normalPriorityServices.filter(s => s.status === 'IN_PROCESS');
        
        if (pickupServices.length > 0 && (type === 'pickup' || type === 'mixed')) {
          const routeStop = await tx.routeStop.create({
            data: {
              routeId: route.id,
              hotelId,
              serviceId: pickupServices[0].id,  // Asignar el primer servicio
              order: order++,
              notes: `Recogida - ${pickupServices.length} servicio(s)`
            },
            include: {
              hotel: true,
              service: true
            }
          });
          routeStops.push(routeStop);
        }
        
        if (deliveryServices.length > 0 && (type === 'delivery' || type === 'mixed')) {
          const routeStop = await tx.routeStop.create({
            data: {
              routeId: route.id,
              hotelId,
              serviceId: deliveryServices[0].id,  // Asignar el primer servicio
              order: order++,
              notes: `Entrega - ${deliveryServices.length} servicio(s)`
            },
            include: {
              hotel: true,
              service: true
            }
          });
          routeStops.push(routeStop);
        }
      }
    }

    // Calculate some basic route stats
    const totalPickups = pendingServices.filter(s => s.status === 'PENDING_PICKUP').length;
    const totalDeliveries = pendingServices.filter(s => s.status === 'IN_PROCESS').length;

    return { 
      route, 
      routeStops, 
      stats: {
        totalPickups,
        totalDeliveries,
        serviceCount: pendingServices.length
      }
    };
  });

  return result;
}

/**
 * Helper function to format a route object for frontend compatibility
 * @param {Object} routeData - Route data from generateRouteForRepartidor
 * @returns {Object} Formatted route object
 */
function formatRouteForFrontend(routeData) {
  if (!routeData) return null;
  
  const { route, routeStops, stats } = routeData;
  
  // Calculate route number from name or assign one
  const routeNumber = route.name ? parseInt(route.name.match(/\d+/)?.[0] || '0') : 0;
  
  // Map backend status to frontend status format
  const statusMap = {
    'PLANNED': 'pendiente',
    'IN_PROGRESS': 'en_progreso',
    'COMPLETED': 'completada',
    'CANCELLED': 'cancelada'
  };
  
  // Format hotels/stops data
  const hotels = routeStops.map(stop => {
    const pickups = [];
    const deliveries = [];
    
    if (stop.service) {
      if (isPickupService(stop.service)) {
        pickups.push(stop.service);
      } else if (isDeliveryService(stop.service)) {
        deliveries.push(stop.service);
      }
    }
    
    return {
      hotelId: stop.hotel.id,
      hotelName: stop.hotel.name,
      hotelAddress: stop.hotel.address,
      hotelZone: stop.hotel.zone,
      latitude: stop.hotel.latitude || null,
      longitude: stop.hotel.longitude || null,
      pickups,
      deliveries,
      services: stop.service ? [stop.service] : [],
      estimatedTime: stop.scheduledTime ? new Date(stop.scheduledTime).toLocaleTimeString('es-PE') : null,
      completed: stop.status === 'COMPLETED',
      timeSpent: 0,
      notes: stop.notes || ''
    };
  });
  
  // Calculate estimated duration (45 mins per hotel)
  const estimatedDuration = hotels.length * 45;
  
  return {
    ...route,
    id: route.id,
    routeNumber: routeNumber || 1,
    repartidorName: route.repartidor?.name || 'Desconocido',
    repartidorId: route.repartidorId,
    date: route.date ? new Date(route.date).toISOString() : null,
    startTime: route.startTime ? new Date(route.startTime).toISOString() : null,
    endTime: route.endTime ? new Date(route.endTime).toISOString() : null,
    status: statusMap[route.status] || 'pendiente',
    totalPickups: stats.totalPickups,
    totalDeliveries: stats.totalDeliveries,
    estimatedDuration,
    totalDistance: route.totalDistance || 0,
    hotels,
    // Ensure these fields are present for frontend compatibility
    type: stats.totalPickups > stats.totalDeliveries ? 'pickup' : 
          stats.totalDeliveries > stats.totalPickups ? 'delivery' : 'mixed'
  };
}

/**
 * Generate automatic routes for pickup services only
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with generated routes
 */
exports.generateAutomaticRoutes = async (req, res) => {
  try {
    const { date, zones } = req.body;
    
    // Validar fecha
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: 'La fecha es requerida' 
      });
    }

    // Si no se especifican zonas, usar todas
    const targetZones = zones && zones.length > 0 ? zones : ['NORTE', 'SUR', 'ESTE', 'OESTE', 'CENTRO'];

    // Obtener solo servicios pendientes de recogida
    const services = await prisma.service.findMany({
      where: {
        status: 'PENDING_PICKUP',
        hotel: {
          zone: { in: targetZones }
        }
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            address: true,
            zone: true,
            latitude: true,
            longitude: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' }, // ALTA primero
        { createdAt: 'asc' }  // Más antiguos primero
      ]
    });

    if (services.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No hay servicios pendientes de recogida para las zonas especificadas',
        data: []
      });
    }

    // Agrupar servicios por zona
    const servicesByZone = {};
    
    services.forEach(service => {
      const zone = service.hotel.zone;
      if (!servicesByZone[zone]) {
        servicesByZone[zone] = [];
      }
      servicesByZone[zone].push(service);
    });

    // Obtener repartidores disponibles por zona
    const repartidores = await prisma.user.findMany({
      where: {
        role: 'REPARTIDOR',
        active: true,
        zone: { in: Object.keys(servicesByZone) }
      }
    });

    if (repartidores.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay repartidores disponibles para las zonas con servicios pendientes',
        data: []
      });
    }

    // Agrupar repartidores por zona
    const repartidoresByZone = {};
    repartidores.forEach(rep => {
      if (!repartidoresByZone[rep.zone]) {
        repartidoresByZone[rep.zone] = [];
      }
      repartidoresByZone[rep.zone].push(rep);
    });

    // Generar UNA ruta por cada zona
    const generatedRoutes = [];
    
    for (const [zone, zoneServices] of Object.entries(servicesByZone)) {
      const zoneRepartidores = repartidoresByZone[zone] || [];
      
      if (zoneRepartidores.length === 0) {
        console.log(`No hay repartidores disponibles para la zona ${zone}`);
        continue;
      }

      // Agrupar servicios por hotel
      const servicesByHotel = {};
      
      zoneServices.forEach(service => {
        const hotelId = service.hotel.id;
        if (!servicesByHotel[hotelId]) {
          servicesByHotel[hotelId] = {
            hotel: service.hotel,
            services: []
          };
        }
        servicesByHotel[hotelId].services.push(service);
      });

      // Convertir a array de hoteles con servicios
      const hotelsWithServices = Object.values(servicesByHotel);
      
      // Ordenar hoteles por prioridad y proximidad
      const sortedHotels = sortHotelsByPriorityAndProximity(hotelsWithServices);
      
      // Asignar el primer repartidor disponible de la zona
      const repartidor = zoneRepartidores[0];
      
      // Calcular estadísticas de la ruta
      const totalServices = zoneServices.length;
      const totalBags = zoneServices.reduce((sum, service) => sum + (service.bagCount || 0), 0);
      const totalHotels = sortedHotels.length;
      
      // Crear UNA SOLA ruta para toda la zona
      const routeName = `Ruta ${zone} - Recogida ${new Date(date).toLocaleDateString('es-PE')}`;
      
      const route = await prisma.$transaction(async (tx) => {
        // First create the route
        const createdRoute = await tx.route.create({
          data: {
            name: routeName,
            date: new Date(date),
            repartidorId: repartidor.id,
            status: 'PLANNED',
            notes: `Zona: ${zone} | ${totalHotels} hotel(es) | ${totalServices} servicio(s) | ${totalBags} bolsa(s)`
          }
        });

        // Then create stops and update service assignments
        const stops = [];
        let stopOrder = 1;
        
        for (const hotelData of sortedHotels) {
          const hotelServices = hotelData.services;
          
          for (const service of hotelServices) {
            // ✅ UPDATE SERVICE REPARTIDOR ASSIGNMENT
            await tx.service.update({
              where: { id: service.id },
              data: { repartidorId: repartidor.id }
            });

            // Create the stop
            const stop = await tx.routeStop.create({
              data: {
                routeId: createdRoute.id,
                hotelId: hotelData.hotel.id,
                serviceId: service.id,
                order: stopOrder++,
                status: 'PENDING',
                scheduledTime: calculateScheduledTimeWithDuration(date, sortedHotels.indexOf(hotelData), sortedHotels),
                notes: `${service.guestName} - Hab. ${service.roomNumber} | ${service.bagCount} bolsa(s) | ${service.priority}`
              },
              include: {
                hotel: true,
                service: true
              }
            });
            
            stops.push(stop);
          }
        }

        // Get repartidor info
        const repartidor_info = await tx.user.findUnique({
          where: { id: repartidor.id },
          select: {
            id: true,
            name: true,
            email: true,
            zone: true
          }
        });

        // Return route with all data
        return {
          ...createdRoute,
          stops,
          repartidor: repartidor_info
        };
      });
      
      generatedRoutes.push(route);
    }

    return res.status(200).json({
      success: true,
      message: `Se generaron ${generatedRoutes.length} rutas de recogida (una por zona)`,
      data: generatedRoutes,
      summary: {
        totalRoutes: generatedRoutes.length,
        totalServices: services.length,
        zones: Object.keys(servicesByZone),
        routesByZone: Object.entries(servicesByZone).map(([zone, services]) => ({
          zone,
          services: services.length,
          bags: services.reduce((sum, s) => sum + (s.bagCount || 0), 0)
        }))
      }
    });

  } catch (error) {
    console.error('Error generating automatic routes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar rutas automáticas',
      error: error.message
    });
  }
};

// Función auxiliar para ordenar hoteles por prioridad y proximidad
function sortHotelsByPriorityAndProximity(hotels) {
  // Primero: hoteles con servicios de alta prioridad
  const hotelsWithHighPriority = hotels.filter(h => 
    h.services.some(s => s.priority === 'ALTA')
  );
  
  // Segundo: hoteles con servicios de prioridad media
  const hotelsWithMediumPriority = hotels.filter(h => 
    h.services.some(s => s.priority === 'MEDIA') && 
    !h.services.some(s => s.priority === 'ALTA')
  );
  
  // Tercero: hoteles con servicios de prioridad normal
  const hotelsWithNormalPriority = hotels.filter(h => 
    h.services.every(s => s.priority === 'NORMAL')
  );
  
  // Ordenar cada grupo por proximidad (si tienen coordenadas)
  const sortByProximity = (hotelGroup) => {
    const withCoords = hotelGroup.filter(h => h.hotel.latitude && h.hotel.longitude);
    const withoutCoords = hotelGroup.filter(h => !h.hotel.latitude || !h.hotel.longitude);
    
    // Ordenar por coordenadas (algoritmo simple)
    withCoords.sort((a, b) => {
      const distA = Math.abs(a.hotel.latitude) + Math.abs(a.hotel.longitude);
      const distB = Math.abs(b.hotel.latitude) + Math.abs(b.hotel.longitude);
      return distA - distB;
    });
    
    return [...withCoords, ...withoutCoords];
  };
  
  return [
    ...sortByProximity(hotelsWithHighPriority),
    ...sortByProximity(hotelsWithMediumPriority),
    ...sortByProximity(hotelsWithNormalPriority)
  ];
}

// Función para calcular tiempo estimado por hotel
function calculateTimeForHotel(services) {
  const TIME_CONSTANTS = {
    BASE_HOTEL: 15,        // Tiempo base por hotel (check-in, estacionamiento)
    BASE_SERVICE: 10,      // Tiempo base por servicio/habitación
    PER_BAG: 1             // Tiempo adicional por bolsa
  };
  
  let totalTime = TIME_CONSTANTS.BASE_HOTEL;
  
  services.forEach(service => {
    totalTime += TIME_CONSTANTS.BASE_SERVICE + ((service.bagCount || 0) * TIME_CONSTANTS.PER_BAG);
  });
  
  return Math.round(totalTime);
}

// Función para calcular hora programada con duración
function calculateScheduledTimeWithDuration(date, index, allHotels) {
  const baseTime = new Date(date);
  baseTime.setHours(8, 0, 0, 0); // Empezar a las 8 AM
  
  // Calcular tiempo acumulado de hoteles anteriores
  let accumulatedMinutes = 0;
  
  for (let i = 0; i < index; i++) {
    const hotelServices = allHotels[i].services;
    const hotelTime = calculateTimeForHotel(hotelServices);
    accumulatedMinutes += hotelTime;
    
    // Agregar tiempo de traslado entre hoteles (10 minutos promedio)
    if (i > 0) {
      accumulatedMinutes += 10;
    }
  }
  
  baseTime.setMinutes(baseTime.getMinutes() + accumulatedMinutes);
  return baseTime;
}

// Función auxiliar para ordenar hoteles por proximidad (mantenida para compatibilidad)
function sortHotelsByProximity(hotels) {
  return sortHotelsByPriorityAndProximity(hotels);
}

// Función para calcular hora programada (mantenida para compatibilidad)
function calculateScheduledTime(date, index) {
  const baseTime = new Date(date);
  baseTime.setHours(8, 0, 0, 0); // Empezar a las 8 AM
  
  // Agregar 45 minutos por cada parada anterior
  const minutes = index * 45;
  baseTime.setMinutes(baseTime.getMinutes() + minutes);
  
  return baseTime;
}

/**
 * Generate a route for a specific zone with all its services
 * @param {string} repartidorId - ID of the repartidor
 * @param {string} date - Date for the route (YYYY-MM-DD) 
 * @param {string} zone - Zone name
 * @param {Array} services - Services for this zone
 * @returns {Object} Generated route with stops
 */
async function generateRouteForZone(repartidorId, date, zone, services) {
  // Group services by hotel
  const servicesByHotel = {};
  
  services.forEach(service => {
    const hotelId = service.hotel.id;
    if (!servicesByHotel[hotelId]) {
      servicesByHotel[hotelId] = {
        hotel: service.hotel,
        services: []
      };
    }
    servicesByHotel[hotelId].services.push(service);
  });

  // Convert to array and sort by priority and proximity
  const hotelsWithServices = Object.values(servicesByHotel);
  const sortedHotels = sortHotelsByPriorityAndProximity(hotelsWithServices);

  // Calculate route statistics
  const totalServices = services.length;
  const totalBags = services.reduce((sum, service) => sum + (service.bagCount || 0), 0);
  const totalHotels = sortedHotels.length;

  // Create the route
  const routeName = `Ruta ${zone} - Recogida ${new Date(date).toLocaleDateString('es-PE')}`;
  
  const result = await prisma.$transaction(async (tx) => {
    // Create main route
    const route = await tx.route.create({
      data: {
        name: routeName,
        date: new Date(date),
        repartidorId,
        status: 'PLANNED',
        notes: `Zona: ${zone} | ${totalHotels} hotel(es) | ${totalServices} servicio(s) | ${totalBags} bolsa(s)`
      },
      include: {
        repartidor: true
      }
    });

    // Create route stops - one stop per service for proper association
    const routeStops = [];
    let stopOrder = 1;
    
    for (let hotelIndex = 0; hotelIndex < sortedHotels.length; hotelIndex++) {
      const hotelData = sortedHotels[hotelIndex];
      const hotelServices = hotelData.services;
      
      // Create one stop per service to properly associate services with stops
      for (let serviceIndex = 0; serviceIndex < hotelServices.length; serviceIndex++) {
        const service = hotelServices[serviceIndex];
        const estimatedTime = calculateTimeForHotel([service]); // Time for this specific service
        
        // ✅ UPDATE SERVICE REPARTIDOR ASSIGNMENT
        await tx.service.update({
          where: { id: service.id },
          data: { repartidorId }
        });
        
        const routeStop = await tx.routeStop.create({
          data: {
            routeId: route.id,
            hotelId: hotelData.hotel.id,
            serviceId: service.id, // ✅ AHORA SÍ ASOCIA EL SERVICIO
            order: stopOrder++,
            status: 'PENDING',
            scheduledTime: calculateScheduledTimeWithDuration(date, hotelIndex, sortedHotels),
            notes: `${service.guestName} - Hab. ${service.roomNumber} | ${service.bagCount} bolsa(s) | ${service.priority}`
          },
          include: {
            hotel: true,
            service: true
          }
        });
        
        routeStops.push(routeStop);
      }
    }

    return { 
      route, 
      routeStops, 
      stats: {
        totalPickups: totalServices,
        totalDeliveries: 0,
        serviceCount: totalServices,
        totalBags,
        totalHotels
      }
    };
  });

  return result;
}