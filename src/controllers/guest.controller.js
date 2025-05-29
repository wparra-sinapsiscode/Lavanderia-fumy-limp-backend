/**
 * Guest controller for Fumy Limp Backend
 */

const { prisma } = require('../config/database');
const { AUDIT_ACTIONS, VALIDATION_RULES } = require('../config/constants');

/**
 * Register guest and create service
 * @route POST /api/guests/register
 * @access Private
 */
exports.registerGuest = async (req, res) => {
  try {
    const {
      guestName,
      roomNumber,
      hotelId,
      bagCount,
      priority,
      observations,
      specialInstructions,
      pickupTimeSlot
    } = req.body;
    
    // Validate required fields
    if (!guestName || !roomNumber || !hotelId || !bagCount) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }
    
    // Check if hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }
    
    // Check zone permission for repartidor
    if (req.user.role === 'REPARTIDOR' && hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para registrar huéspedes en esta zona'
      });
    }
    
    // Validate inventory
    if (hotel.bagInventory < bagCount) {
      return res.status(400).json({
        success: false,
        message: `Inventario insuficiente. Disponible: ${hotel.bagInventory} bolsas`
      });
    }
    
    // Validate bag count
    if (bagCount < VALIDATION_RULES.service.minBagCount) {
      return res.status(400).json({
        success: false,
        message: `La cantidad de bolsas debe ser al menos ${VALIDATION_RULES.service.minBagCount}`
      });
    }
    
    // Find available repartidor in the zone
    const availableRepartidor = await prisma.user.findFirst({
      where: {
        role: 'REPARTIDOR',
        zone: hotel.zone
      },
      orderBy: {
        // Get repartidor with least assigned active services
        services: {
          _count: 'asc'
        }
      }
    });
    
    // Create estimated dates
    const now = new Date();
    const estimatedPickupDate = new Date();
    estimatedPickupDate.setHours(estimatedPickupDate.getHours() + 2); // +2 hours from now
    
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + (priority === 'ALTA' ? 1 : 2)); // +1 or +2 days based on priority
    
    // Create service
    const service = await prisma.service.create({
      data: {
        guestName,
        roomNumber,
        hotelId,
        bagCount: parseInt(bagCount),
        priority: priority || 'NORMAL',
        observations,
        specialInstructions,
        pickupTimeSlot,
        status: 'PENDING_PICKUP',
        estimatedPickupDate,
        estimatedDeliveryDate,
        repartidorId: availableRepartidor?.id || null
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.SERVICE_CREATED,
        entity: 'service',
        entityId: service.id,
        details: `Servicio creado para huésped ${guestName}, habitación ${roomNumber} en ${hotel.name}`,
        userId: req.user.id,
        serviceId: service.id
      }
    });
    
    // Update hotel bag inventory
    await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        bagInventory: {
          decrement: parseInt(bagCount)
        }
      }
    });
    
    // Create audit log for inventory update
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.HOTEL_INVENTORY_UPDATED,
        entity: 'hotel',
        entityId: hotel.id,
        details: `Inventario reducido en ${bagCount} bolsas para servicio ${service.id}`,
        userId: req.user.id
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Huésped registrado y servicio creado exitosamente',
      data: {
        service,
        repartidor: availableRepartidor,
        inventoryRemaining: hotel.bagInventory - parseInt(bagCount)
      }
    });
  } catch (error) {
    console.error('Error registering guest:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar huésped',
      error: error.message
    });
  }
};

/**
 * Validate inventory before registering guest
 * @route GET /api/guests/validate-inventory
 * @access Private
 */
exports.validateInventory = async (req, res) => {
  try {
    const { hotelId, bagCount } = req.query;
    
    if (!hotelId || !bagCount) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren hotel y cantidad de bolsas'
      });
    }
    
    // Check if hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }
    
    // Check if there's enough inventory
    const parsedBagCount = parseInt(bagCount);
    const hasEnoughInventory = hotel.bagInventory >= parsedBagCount;
    
    // Calculate inventory status
    let inventoryStatus = 'ok';
    
    if (!hasEnoughInventory) {
      inventoryStatus = 'insufficient';
    } else if (hotel.bagInventory - parsedBagCount < 10) {
      inventoryStatus = 'low';
    }
    
    // Find available repartidores in zone
    const availableRepartidores = await prisma.user.findMany({
      where: {
        role: 'REPARTIDOR',
        zone: hotel.zone
      },
      select: {
        id: true,
        name: true,
        zone: true,
        _count: {
          select: {
            servicesAssigned: {
              where: {
                status: {
                  notIn: ['COMPLETED', 'CANCELLED']
                }
              }
            }
          }
        }
      },
      orderBy: {
        servicesAssigned: {
          _count: 'asc'
        }
      }
    });
    
    return res.status(200).json({
      success: true,
      data: {
        hotel: {
          id: hotel.id,
          name: hotel.name,
          zone: hotel.zone,
          bagInventory: hotel.bagInventory
        },
        inventory: {
          available: hotel.bagInventory,
          requested: parsedBagCount,
          remaining: hotel.bagInventory - parsedBagCount,
          hasEnoughInventory,
          status: inventoryStatus
        },
        repartidores: availableRepartidores.map(repartidor => ({
          id: repartidor.id,
          name: repartidor.name,
          zone: repartidor.zone,
          activeServices: repartidor._count.servicesAssigned
        }))
      }
    });
  } catch (error) {
    console.error('Error validating inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al validar inventario',
      error: error.message
    });
  }
};

/**
 * Get guest history by name and room
 * @route GET /api/guests/history
 * @access Private
 */
exports.getGuestHistory = async (req, res) => {
  try {
    const { guestName, roomNumber, hotelId } = req.query;
    
    // Build where clause
    const where = {};
    
    if (guestName) {
      where.guestName = {
        contains: guestName,
        mode: 'insensitive'
      };
    }
    
    if (roomNumber) {
      where.roomNumber = roomNumber;
    }
    
    if (hotelId) {
      where.hotelId = hotelId;
    }
    
    // Get services matching the criteria
    const services = await prisma.service.findMany({
      where,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        },
        repartidor: {
          select: {
            id: true,
            name: true
          }
        },
        deliveryRepartidor: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    return res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    console.error('Error getting guest history:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener historial del huésped',
      error: error.message
    });
  }
};

/**
 * Get guest statistics
 * @route GET /api/guests/statistics
 * @access Admin only
 */
exports.getGuestStatistics = async (req, res) => {
  try {
    // Get the most frequent guests
    const frequentGuests = await prisma.$queryRaw`
      SELECT 
        "guestName",
        COUNT(id) as serviceCount,
        SUM(weight) as totalWeight,
        AVG(weight) as avgWeight,
        MIN("createdAt") as firstService,
        MAX("createdAt") as lastService
      FROM "Service"
      GROUP BY "guestName"
      ORDER BY serviceCount DESC
      LIMIT 10
    `;
    
    // Get guests by hotel
    const guestsByHotel = await prisma.$queryRaw`
      SELECT 
        h.name as hotel,
        h.zone,
        COUNT(DISTINCT s."guestName") as guestCount,
        COUNT(s.id) as serviceCount
      FROM "Service" s
      JOIN "Hotel" h ON s."hotelId" = h.id
      GROUP BY h.name, h.zone
      ORDER BY guestCount DESC
    `;
    
    // Get average service count per guest
    const avgServicesPerGuest = await prisma.$queryRaw`
      SELECT AVG(service_count) as avg
      FROM (
        SELECT "guestName", COUNT(id) as service_count
        FROM "Service"
        GROUP BY "guestName"
      ) as guest_services
    `;
    
    return res.status(200).json({
      success: true,
      data: {
        frequentGuests: frequentGuests.map(guest => ({
          name: guest.guestName,
          serviceCount: Number(guest.servicecount),
          totalWeight: guest.totalweight ? Number(guest.totalweight) : 0,
          avgWeight: guest.avgweight ? Number(guest.avgweight) : 0,
          firstService: guest.firstservice,
          lastService: guest.lastservice
        })),
        guestsByHotel: guestsByHotel.map(hotel => ({
          hotel: hotel.hotel,
          zone: hotel.zone,
          guestCount: Number(hotel.guestcount),
          serviceCount: Number(hotel.servicecount)
        })),
        averageServicesPerGuest: avgServicesPerGuest[0]?.avg ? Number(avgServicesPerGuest[0].avg) : 0
      }
    });
  } catch (error) {
    console.error('Error getting guest statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de huéspedes',
      error: error.message
    });
  }
};

module.exports = exports;