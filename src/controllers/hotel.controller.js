/**
 * Hotel controller for Fumy Limp Backend
 */

const { prisma } = require('../config/database');
const { AUDIT_ACTIONS } = require('../config/constants');

/**
 * Get all hotels with optional filtering by zone
 * @route GET /api/hotels
 * @access Private
 */
exports.getAllHotels = async (req, res) => {
  try {
    const { zone } = req.query;
    const where = {};
    
    // Filter by zone if provided (repartidores can only see hotels in their zone)
    if (zone) {
      where.zone = zone;
    } else if (req.user.role === 'REPARTIDOR') {
      // Repartidores can only see hotels in their own zone
      where.zone = req.user.zone;
    }
    
    const hotels = await prisma.hotel.findMany({
      where,
      orderBy: {
        name: 'asc'
      }
    });
    
    return res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels
    });
  } catch (error) {
    console.error('Error getting hotels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener hoteles',
      error: error.message
    });
  }
};

/**
 * Get hotel by ID
 * @route GET /api/hotels/:id
 * @access Private
 */
exports.getHotelById = async (req, res) => {
  try {
    const hotel = await prisma.hotel.findUnique({
      where: {
        id: req.params.id
      }
    });
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }
    
    // Check if repartidor has access to this hotel's zone
    if (req.user.role === 'REPARTIDOR' && hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a este hotel'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: hotel
    });
  } catch (error) {
    console.error('Error getting hotel:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener hotel',
      error: error.message
    });
  }
};

/**
 * Create new hotel
 * @route POST /api/hotels
 * @access Admin only
 */
exports.createHotel = async (req, res) => {
  try {
    const { name, address, latitude, longitude, zone, contactPerson, phone, email, bagInventory, pricePerKg } = req.body;
    
    // Check if hotel with the same name already exists
    const existingHotel = await prisma.hotel.findFirst({
      where: {
        name
      }
    });
    
    if (existingHotel) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un hotel con este nombre'
      });
    }
    
    const hotel = await prisma.hotel.create({
      data: {
        name,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        zone,
        contactPerson,
        phone,
        email,
        bagInventory: parseInt(bagInventory),
        pricePerKg: parseFloat(pricePerKg)
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.HOTEL_CREATED,
        entity: 'hotel',
        entityId: hotel.id,
        details: `Hotel creado: ${hotel.name} (${hotel.zone})`,
        userId: req.user.id
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Hotel creado exitosamente',
      data: hotel
    });
  } catch (error) {
    console.error('Error creating hotel:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear hotel',
      error: error.message
    });
  }
};

/**
 * Update hotel
 * @route PUT /api/hotels/:id
 * @access Admin only
 */
exports.updateHotel = async (req, res) => {
  try {
    const { name, address, latitude, longitude, zone, contactPerson, phone, email, pricePerKg } = req.body;
    
    // Check if hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: {
        id: req.params.id
      }
    });
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }
    
    // Check if name is being changed and new name already exists
    if (name && name !== hotel.name) {
      const existingHotel = await prisma.hotel.findFirst({
        where: {
          name,
          id: {
            not: req.params.id
          }
        }
      });
      
      if (existingHotel) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un hotel con este nombre'
        });
      }
    }
    
    // Update hotel data - asegurar que bagInventory se incluya si está presente
    const { bagInventory } = req.body;
    
    const updateData = {
      name: name || hotel.name,
      address: address || hotel.address,
      zone: zone || hotel.zone,
      contactPerson: contactPerson || hotel.contactPerson,
      phone: phone || hotel.phone,
      email: email || hotel.email,
      pricePerKg: pricePerKg ? parseFloat(pricePerKg) : hotel.pricePerKg
    };
    
    // Agregar coordenadas GPS si se proporcionan
    if (latitude !== undefined) {
      updateData.latitude = latitude ? parseFloat(latitude) : null;
    }
    
    if (longitude !== undefined) {
      updateData.longitude = longitude ? parseFloat(longitude) : null;
    }
    
    // Si se proporciona bagInventory, incluirlo en la actualización
    if (bagInventory !== undefined) {
      updateData.bagInventory = parseInt(bagInventory);
      console.log(`Actualizando inventario de bolsas para hotel ${req.params.id}: ${hotel.bagInventory} → ${bagInventory}`);
    }
    
    const updatedHotel = await prisma.hotel.update({
      where: {
        id: req.params.id
      },
      data: updateData
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.HOTEL_UPDATED,
        entity: 'hotel',
        entityId: updatedHotel.id,
        details: `Hotel actualizado: ${updatedHotel.name}`,
        userId: req.user.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Hotel actualizado exitosamente',
      data: updatedHotel
    });
  } catch (error) {
    console.error('Error updating hotel:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar hotel',
      error: error.message
    });
  }
};

/**
 * Update hotel bag inventory
 * @route PUT /api/hotels/:id/inventory
 * @access Admin only
 */
exports.updateInventory = async (req, res) => {
  try {
    const { bagInventory } = req.body;
    
    if (typeof bagInventory !== 'number' || bagInventory < 0) {
      return res.status(400).json({
        success: false,
        message: 'El inventario de bolsas debe ser un número positivo'
      });
    }
    
    // Check if hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: {
        id: req.params.id
      }
    });
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }
    
    // Update inventory
    const updatedHotel = await prisma.hotel.update({
      where: {
        id: req.params.id
      },
      data: {
        bagInventory: parseInt(bagInventory)
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.HOTEL_INVENTORY_UPDATED,
        entity: 'hotel',
        entityId: updatedHotel.id,
        details: `Inventario actualizado para ${updatedHotel.name}: ${hotel.bagInventory} → ${updatedHotel.bagInventory} bolsas`,
        userId: req.user.id
      }
    });
    
    // Check if inventory is below threshold and send alert
    const inventoryThreshold = process.env.INVENTORY_ALERT_THRESHOLD || 20; // Default 20%
    const isLow = (bagInventory / 100) * inventoryThreshold <= inventoryThreshold;
    
    return res.status(200).json({
      success: true,
      message: 'Inventario actualizado exitosamente',
      data: updatedHotel,
      alert: isLow ? {
        type: 'warning',
        message: `Inventario bajo (${bagInventory} bolsas). Considere realizar una reposición.`
      } : null
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar inventario',
      error: error.message
    });
  }
};

/**
 * Get services for a specific hotel
 * @route GET /api/hotels/:id/services
 * @access Private
 */
exports.getHotelServices = async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    
    // Check if hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: {
        id: req.params.id
      }
    });
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }
    
    // Check if repartidor has access to this hotel's zone
    if (req.user.role === 'REPARTIDOR' && hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a los servicios de este hotel'
      });
    }
    
    // Build where clause
    const where = {
      hotelId: req.params.id
    };
    
    // Filter by status if provided
    if (status) {
      where.status = status;
    }
    
    // For repartidores, only show services assigned to them
    if (req.user.role === 'REPARTIDOR') {
      where.OR = [
        { repartidorId: req.user.id },
        { deliveryRepartidorId: req.user.id }
      ];
    }
    
    const services = await prisma.service.findMany({
      where,
      include: {
        hotel: {
          select: {
            name: true,
            zone: true,
            pricePerKg: true
          }
        },
        repartidor: {
          select: {
            name: true,
            zone: true
          }
        },
        bagLabels: {
          select: {
            id: true,
            label: true,
            bagNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(offset),
      take: parseInt(limit)
    });
    
    // Get total count for pagination
    const totalCount = await prisma.service.count({
      where
    });
    
    return res.status(200).json({
      success: true,
      count: services.length,
      total: totalCount,
      data: services
    });
  } catch (error) {
    console.error('Error getting hotel services:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener servicios del hotel',
      error: error.message
    });
  }
};

module.exports = exports;