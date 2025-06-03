const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { AUDIT_ACTIONS } = require('../config/constants');

// Create a new service
exports.createService = async (req, res) => {
  try {
    const { 
      hotelId, 
      guestName, 
      guestRoom, 
      bagCount, 
      weight, 
      priority, 
      repartidorId, 
      expectedDeliveryDate, 
      specialInstructions,
      observations
    } = req.body;
    
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
    
    // Check if repartidor exists (if provided)
    if (repartidorId) {
      const repartidor = await prisma.user.findUnique({
        where: {
          id: repartidorId,
          role: 'REPARTIDOR'
        }
      });
      
      if (!repartidor) {
        return res.status(404).json({
          success: false,
          message: 'Repartidor no encontrado'
        });
      }
      
      // Check if repartidor zone matches hotel zone
      if (repartidor.zone !== hotel.zone) {
        return res.status(400).json({
          success: false,
          message: 'El repartidor debe estar asignado a la misma zona que el hotel'
        });
      }
    }
    
    // Create service
    const service = await prisma.service.create({
      data: {
        hotelId,
        guestName,
        roomNumber: guestRoom,
        repartidorId: repartidorId || null,
        bagCount: parseInt(bagCount, 10) || 1,
        weight: weight ? parseFloat(weight) : null,
        priority: priority || 'NORMAL',
        status: 'PENDING_PICKUP',
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        specialInstructions,
        observations
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.SERVICE_CREATED,
        entity: 'service',
        entityId: service.id,
        details: `Servicio creado para ${hotel.name}, habitación ${guestRoom}, huésped ${guestName}`,
        userId: req.user.id
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: service
    });
  } catch (error) {
    console.error('Error creating service:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear servicio',
      error: error.message
    });
  }
};

// Create a hotel service without specific guest information
exports.createHotelService = async (req, res) => {
  try {
    const { 
      hotelId, 
      roomNumber,
      repartidorId, 
      bagCount,
      priority, 
      expectedDeliveryDate,
      specialInstructions,
      observations,
      isHotelService
    } = req.body;
    
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
    
    // Check if repartidor exists
    if (!repartidorId) {
      return res.status(400).json({
        success: false,
        message: 'Repartidor requerido para servicios de hotel'
      });
    }
    
    const repartidor = await prisma.user.findUnique({
      where: {
        id: repartidorId,
        role: 'REPARTIDOR'
      }
    });
    
    if (!repartidor) {
      return res.status(404).json({
        success: false,
        message: 'Repartidor no encontrado'
      });
    }
    
    // Check if repartidor zone matches hotel zone
    if (repartidor.zone !== hotel.zone) {
      return res.status(400).json({
        success: false,
        message: 'El repartidor debe estar asignado a la misma zona que el hotel'
      });
    }
    
    // Validar observaciones y número de habitación
    if (!observations) {
      return res.status(400).json({
        success: false,
        message: 'Las observaciones son requeridas para servicios de hotel'
      });
    }
    
    if (!roomNumber) {
      return res.status(400).json({
        success: false,
        message: 'El número de habitación es requerido para servicios de hotel'
      });
    }
    
    // Use hotel's contact person as the guest name for hotel services
    const guestName = hotel.contactPerson || 'Servicio de Hotel';
    
    // Create service
    const service = await prisma.service.create({
      data: {
        hotelId,
        guestName,
        roomNumber,  // Ahora usamos el número de habitación proporcionado
        repartidorId,
        bagCount: parseInt(bagCount, 10) || 1,
        priority: priority || 'NORMAL',
        status: 'PENDING_PICKUP',
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        specialInstructions,
        observations,
        isHotelService: true  // Flag to indicate this is a hotel service without specific guest
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.SERVICE_CREATED,
        entity: 'service',
        entityId: service.id,
        details: `Servicio de hotel creado para ${hotel.name}, habitación ${roomNumber} (${bagCount} bolsas)`,
        userId: req.user.id
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Servicio de hotel creado exitosamente',
      data: service
    });
  } catch (error) {
    console.error('Error creating hotel service:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear servicio de hotel',
      error: error.message
    });
  }
};

// Get all services
exports.getAllServices = async (req, res) => {
  try {
    // Extract filter parameters
    const { 
      status, 
      hotelId, 
      repartidorId, 
      priority, 
      zone,
      isHotelService,
      from, 
      to,
      page = 1, 
      limit = 20 
    } = req.query;
    
    // Build filter conditions
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (hotelId) {
      where.hotelId = hotelId;
    }
    
    if (repartidorId) {
      where.repartidorId = repartidorId;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    if (isHotelService !== undefined) {
      where.isHotelService = isHotelService === 'true';
    }
    
    // Date range filter
    if (from || to) {
      where.createdAt = {};
      
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }
    
    // Zone filter (requires join with hotel)
    let hotelWhere = {};
    if (zone) {
      hotelWhere.zone = zone;
    }
    
    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Get services with pagination
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where: {
          ...where,
          hotel: hotelWhere.zone ? { zone: { equals: hotelWhere.zone } } : undefined
        },
        include: {
          hotel: {
            select: {
              name: true,
              zone: true
            }
          },
          repartidor: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.service.count({
        where: {
          ...where,
          hotel: hotelWhere.zone ? { zone: { equals: hotelWhere.zone } } : undefined
        }
      })
    ]);
    
    // Ya no necesitamos filtrar manualmente porque Prisma lo hace por nosotros
    const filteredServices = services;
    
    return res.status(200).json({
      success: true,
      message: 'Servicios obtenidos exitosamente',
      data: filteredServices,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error getting services:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener servicios',
      error: error.message
    });
  }
};

// Get service by ID
exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        hotel: {
          select: {
            name: true,
            zone: true,
            contactPerson: true,
            phone: true
          }
        },
        repartidor: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        bagLabels: true
      }
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Servicio obtenido exitosamente',
      data: service
    });
  } catch (error) {
    console.error('Error getting service:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener servicio',
      error: error.message
    });
  }
};

// Update service
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      hotelId, 
      guestName, 
      roomNumber, 
      bagCount, 
      weight, 
      priority, 
      repartidorId, 
      expectedDeliveryDate, 
      specialInstructions,
      observations
    } = req.body;
    
    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id }
    });
    
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    // Check if hotel exists (if provided)
    if (hotelId) {
      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId }
      });
      
      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: 'Hotel no encontrado'
        });
      }
    }
    
    // Check if repartidor exists (if provided)
    if (repartidorId) {
      const repartidor = await prisma.user.findUnique({
        where: {
          id: repartidorId,
          role: 'REPARTIDOR'
        }
      });
      
      if (!repartidor) {
        return res.status(404).json({
          success: false,
          message: 'Repartidor no encontrado'
        });
      }
      
      // Check if repartidor zone matches hotel zone
      if (hotelId) {
        const hotel = await prisma.hotel.findUnique({
          where: { id: hotelId }
        });
        
        if (repartidor.zone !== hotel.zone) {
          return res.status(400).json({
            success: false,
            message: 'El repartidor debe estar asignado a la misma zona que el hotel'
          });
        }
      } else {
        const hotel = await prisma.hotel.findUnique({
          where: { id: existingService.hotelId }
        });
        
        if (repartidor.zone !== hotel.zone) {
          return res.status(400).json({
            success: false,
            message: 'El repartidor debe estar asignado a la misma zona que el hotel'
          });
        }
      }
    }
    
    // Prepare update data
    const updateData = {};
    
    if (hotelId) updateData.hotelId = hotelId;
    if (guestName) updateData.guestName = guestName;
    if (roomNumber) updateData.roomNumber = roomNumber;
    if (bagCount) updateData.bagCount = parseInt(bagCount, 10);
    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null;
    if (priority) updateData.priority = priority;
    if (repartidorId !== undefined) updateData.repartidorId = repartidorId || null;
    if (expectedDeliveryDate) updateData.expectedDeliveryDate = new Date(expectedDeliveryDate);
    if (specialInstructions !== undefined) updateData.specialInstructions = specialInstructions;
    if (observations !== undefined) updateData.observations = observations;
    
    // Update service
    const updatedService = await prisma.service.update({
      where: { id },
      data: updateData
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.SERVICE_UPDATED,
        entity: 'service',
        entityId: id,
        details: `Servicio actualizado: ${JSON.stringify(updateData)}`,
        userId: req.user.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Servicio actualizado exitosamente',
      data: updatedService
    });
  } catch (error) {
    console.error('Error updating service:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar servicio',
      error: error.message
    });
  }
};

// Update service status
exports.updateServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id }
    });
    
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    // Validate status transition
    const validStatuses = [
      'PENDING_PICKUP',
      'ASSIGNED_TO_ROUTE', // ✨ NUEVO estado
      'PICKED_UP',
      'LABELED',
      'IN_PROCESS',
      'READY_FOR_DELIVERY',
      'PARTIAL_DELIVERY',
      'COMPLETED',
      'CANCELLED'
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido'
      });
    }
    
    // Prepare status specific data
    const updateData = {
      status,
      statusNotes: notes
    };
    
    // Add timestamps based on status
    switch (status) {
      case 'PICKED_UP':
        updateData.pickupDate = new Date();
        break;
      case 'LABELED':
        updateData.labelDate = new Date();
        break;
      case 'IN_PROCESS':
        updateData.processDate = new Date();
        break;
      case 'READY_FOR_DELIVERY':
        updateData.readyDate = new Date();
        break;
      case 'PARTIAL_DELIVERY':
        updateData.partialDeliveryDate = new Date();
        break;
      case 'COMPLETED':
        updateData.completionDate = new Date();
        break;
      case 'CANCELLED':
        updateData.cancellationDate = new Date();
        break;
    }
    
    // Update service
    const updatedService = await prisma.service.update({
      where: { id },
      data: updateData
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.SERVICE_STATUS_UPDATED,
        entity: 'service',
        entityId: id,
        details: `Estado actualizado a ${status}${notes ? `: ${notes}` : ''}`,
        userId: req.user.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Estado de servicio actualizado exitosamente',
      data: updatedService
    });
  } catch (error) {
    console.error('Error updating service status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar estado de servicio',
      error: error.message
    });
  }
};

// Assign repartidor to service
exports.assignRepartidor = async (req, res) => {
  try {
    const { id } = req.params;
    const { repartidorId } = req.body;
    
    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id },
      include: {
        hotel: true
      }
    });
    
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    // Check if repartidor exists
    const repartidor = await prisma.user.findUnique({
      where: {
        id: repartidorId,
        role: 'REPARTIDOR'
      }
    });
    
    if (!repartidor) {
      return res.status(404).json({
        success: false,
        message: 'Repartidor no encontrado'
      });
    }
    
    // Check if repartidor zone matches hotel zone
    if (repartidor.zone !== existingService.hotel.zone) {
      return res.status(400).json({
        success: false,
        message: 'El repartidor debe estar asignado a la misma zona que el hotel'
      });
    }
    
    // Update service
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        repartidorId
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.SERVICE_REPARTIDOR_ASSIGNED,
        entity: 'service',
        entityId: id,
        details: `Repartidor asignado: ${repartidor.name}`,
        userId: req.user.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Repartidor asignado exitosamente',
      data: updatedService
    });
  } catch (error) {
    console.error('Error assigning repartidor:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al asignar repartidor',
      error: error.message
    });
  }
};

// Delete service
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id }
    });
    
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    // Can only delete services that are in PENDING_PICKUP status
    if (existingService.status !== 'PENDING_PICKUP') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden eliminar servicios en estado pendiente de recogida'
      });
    }
    
    // Delete service
    await prisma.service.delete({
      where: { id }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.SERVICE_DELETED,
        entity: 'service',
        entityId: id,
        details: `Servicio eliminado: ${existingService.guestName}, ${existingService.roomNumber}`,
        userId: req.user.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Servicio eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar servicio',
      error: error.message
    });
  }
};

// Get services by hotel
exports.getServicesByHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    
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
    
    // Build filter conditions
    const where = {
      hotelId
    };
    
    if (status) {
      where.status = status;
    }
    
    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Get services with pagination
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          hotel: {
            select: {
              name: true,
              zone: true
            }
          },
          repartidor: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.service.count({ where })
    ]);
    
    return res.status(200).json({
      success: true,
      message: 'Servicios del hotel obtenidos exitosamente',
      data: services,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
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

// Get services by repartidor
exports.getServicesByRepartidor = async (req, res) => {
  try {
    const { repartidorId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    
    // Check if repartidor exists
    const repartidor = await prisma.user.findUnique({
      where: {
        id: repartidorId,
        role: 'REPARTIDOR'
      }
    });
    
    if (!repartidor) {
      return res.status(404).json({
        success: false,
        message: 'Repartidor no encontrado'
      });
    }
    
    // Build filter conditions
    const where = {
      repartidorId
    };
    
    if (status) {
      where.status = status;
    }
    
    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Get services with pagination
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          hotel: {
            select: {
              name: true,
              zone: true
            }
          },
          repartidor: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.service.count({ where })
    ]);
    
    return res.status(200).json({
      success: true,
      message: 'Servicios del repartidor obtenidos exitosamente',
      data: services,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error getting repartidor services:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener servicios del repartidor',
      error: error.message
    });
  }
};

// Get services assigned to current user
exports.getMyServices = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { status, page = 1, limit = 20 } = req.query;
    
    // Build filter conditions
    let where = {};
    
    if (role === 'REPARTIDOR') {
      where.repartidorId = id;
    } else if (role === 'HOTEL') {
      // Get hotel ID for hotel user
      const hotel = await prisma.hotel.findFirst({
        where: {
          users: {
            some: {
              userId: id
            }
          }
        }
      });
      
      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: 'Hotel no encontrado para este usuario'
        });
      }
      
      where.hotelId = hotel.id;
    } else if (role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver servicios'
      });
    }
    
    if (status) {
      where.status = status;
    }
    
    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Get services with pagination
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          hotel: {
            select: {
              name: true,
              zone: true
            }
          },
          repartidor: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.service.count({ where })
    ]);
    
    return res.status(200).json({
      success: true,
      message: 'Mis servicios obtenidos exitosamente',
      data: services,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error getting my services:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener mis servicios',
      error: error.message
    });
  }
};

// Get pending services (for repartidores to pick up)
exports.getPendingServices = async (req, res) => {
  try {
    const { zone } = req.query;
    
    // Build filter conditions
    const where = {
      status: 'PENDING_PICKUP',
      repartidorId: null // Only services not yet assigned to a repartidor
    };
    
    // Zone filtering (requires join with hotel)
    let hotelWhere = {};
    if (zone) {
      hotelWhere.zone = zone;
    }
    
    // Get pending services
    const services = await prisma.service.findMany({
      where: {
        ...where,
        hotel: hotelWhere.zone ? { zone: { equals: hotelWhere.zone } } : undefined
      },
      include: {
        hotel: {
          select: {
            name: true,
            zone: true,
            address: true
          }
        }
      },
      orderBy: [
        {
          priority: 'asc' // ALTA comes before NORMAL
        },
        {
          createdAt: 'asc' // Oldest first
        }
      ]
    });
    
    // Ya no necesitamos filtrar manualmente
    const filteredServices = services;
    
    return res.status(200).json({
      success: true,
      message: 'Servicios pendientes obtenidos exitosamente',
      data: filteredServices
    });
  } catch (error) {
    console.error('Error getting pending services:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener servicios pendientes',
      error: error.message
    });
  }
};

// Get service statistics
exports.getServiceStats = async (req, res) => {
  try {
    const { from, to, zone } = req.query;
    
    // Prepare date range
    const dateFilter = {};
    if (from) {
      dateFilter.gte = new Date(from);
    }
    if (to) {
      dateFilter.lte = new Date(to);
    }
    
    // Prepare hotel filter for zone
    let hotelWhere = {};
    if (zone) {
      hotelWhere.zone = zone;
    }
    
    // Basic where clause
    const whereClause = {};
    if (from || to) {
      whereClause.createdAt = dateFilter;
    }
    
    // Total services count
    const totalServices = await prisma.service.count({
      where: whereClause
    });
    
    // Services by status
    const servicesByStatus = await prisma.service.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true
    });
    
    // Format status counts
    const statusCounts = {};
    servicesByStatus.forEach(item => {
      statusCounts[item.status] = item._count;
    });
    
    // Services by priority
    const servicesByPriority = await prisma.service.groupBy({
      by: ['priority'],
      where: whereClause,
      _count: true
    });
    
    // Format priority counts
    const priorityCounts = {};
    servicesByPriority.forEach(item => {
      priorityCounts[item.priority] = item._count;
    });
    
    // Top hotels by service count
    const topHotels = await prisma.service.groupBy({
      by: ['hotelId'],
      where: whereClause,
      _count: true,
      orderBy: {
        _count: {
          _all: 'desc'
        }
      },
      take: 5
    });
    
    // Get hotel names for top hotels
    const hotelIds = topHotels.map(item => item.hotelId);
    const hotels = await prisma.hotel.findMany({
      where: {
        id: {
          in: hotelIds
        }
      },
      select: {
        id: true,
        name: true
      }
    });
    
    // Format top hotels with names
    const formattedTopHotels = topHotels.map(item => {
      const hotel = hotels.find(h => h.id === item.hotelId);
      return {
        hotelId: item.hotelId,
        hotelName: hotel ? hotel.name : 'Unknown',
        count: item._count
      };
    });
    
    // Top repartidores by service count
    const topRepartidores = await prisma.service.groupBy({
      by: ['repartidorId'],
      where: {
        ...whereClause,
        repartidorId: {
          not: null
        }
      },
      _count: true,
      orderBy: {
        _count: {
          _all: 'desc'
        }
      },
      take: 5
    });
    
    // Get repartidor names for top repartidores
    const repartidorIds = topRepartidores.map(item => item.repartidorId).filter(Boolean);
    const repartidores = await prisma.user.findMany({
      where: {
        id: {
          in: repartidorIds
        }
      },
      select: {
        id: true,
        name: true
      }
    });
    
    // Format top repartidores with names
    const formattedTopRepartidores = topRepartidores.map(item => {
      const repartidor = repartidores.find(r => r.id === item.repartidorId);
      return {
        repartidorId: item.repartidorId,
        repartidorName: repartidor ? repartidor.name : 'Unknown',
        count: item._count
      };
    });
    
    // Average processing time (createdAt to completionDate)
    const completedServices = await prisma.service.findMany({
      where: {
        ...whereClause,
        status: 'COMPLETED',
        completionDate: {
          not: null
        }
      },
      select: {
        createdAt: true,
        completionDate: true
      }
    });
    
    let avgProcessingTime = 0;
    if (completedServices.length > 0) {
      const totalTime = completedServices.reduce((sum, service) => {
        const processTime = service.completionDate.getTime() - service.createdAt.getTime();
        return sum + processTime;
      }, 0);
      
      avgProcessingTime = totalTime / completedServices.length / (1000 * 60 * 60); // in hours
    }
    
    // Total bag count
    const bagCountResult = await prisma.service.aggregate({
      where: whereClause,
      _sum: {
        bagCount: true
      }
    });
    
    const totalBags = bagCountResult._sum.bagCount || 0;
    
    // Return all stats
    return res.status(200).json({
      success: true,
      message: 'Estadísticas de servicios obtenidas exitosamente',
      data: {
        totalServices,
        statusCounts,
        priorityCounts,
        topHotels: formattedTopHotels,
        topRepartidores: formattedTopRepartidores,
        avgProcessingTime,
        totalBags
      }
    });
  } catch (error) {
    console.error('Error getting service statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de servicios',
      error: error.message
    });
  }
};