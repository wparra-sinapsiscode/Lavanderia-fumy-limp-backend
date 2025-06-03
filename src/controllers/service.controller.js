const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
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
    
    // Calculate estimated pickup date (2 hours from now)
    const estimatedPickupDate = new Date();
    estimatedPickupDate.setHours(estimatedPickupDate.getHours() + 2);
    
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
        estimatedPickupDate,
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
    
    // Check if repartidor exists (optional)
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
    
    // Calculate estimated pickup date (2 hours from now)
    const estimatedPickupDate = new Date();
    estimatedPickupDate.setHours(estimatedPickupDate.getHours() + 2);
    
    // Create service
    const service = await prisma.service.create({
      data: {
        hotelId,
        guestName,
        roomNumber,  // Ahora usamos el número de habitación proporcionado
        repartidorId: repartidorId || null,
        bagCount: parseInt(bagCount, 10) || 1,
        priority: priority || 'NORMAL',
        status: 'PENDING_PICKUP',
        estimatedPickupDate,
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
      // Handle single status or array of statuses
      if (Array.isArray(status)) {
        where.status = { in: status };
      } else {
        where.status = status;
      }
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
      status
    };
    
    // Add notes to observations field if provided
    if (notes) {
      updateData.observations = notes;
    }
    
    // Add timestamps based on status (only for fields that exist)
    switch (status) {
      case 'PICKED_UP':
        updateData.pickupDate = new Date();
        break;
      case 'COMPLETED':
        updateData.deliveryDate = new Date();
        break;
      case 'ASSIGNED_TO_ROUTE':
        // Just update the status, no special timestamp needed
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
        action: AUDIT_ACTIONS.SERVICE_STATUS_CHANGED,
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

// Register pickup data
exports.registerPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      weight, 
      bagCount, 
      observations, 
      collectorName, 
      geolocation,
      price
    } = req.body;
    
    // Check if service exists and include hotel data
    const existingService = await prisma.service.findUnique({
      where: { id },
      include: { hotel: true }
    });
    
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    // Verify that service is in a valid state for pickup
    if (existingService.status !== 'PENDING_PICKUP' && existingService.status !== 'ASSIGNED_TO_ROUTE') {
      return res.status(400).json({
        success: false,
        message: `No se puede registrar recojo. El servicio está en estado: ${existingService.status}`
      });
    }
    
    // Verify that the repartidor is authorized (assigned to the service or same zone)
    if (req.user.role === 'REPARTIDOR') {
      const isAssigned = existingService.repartidorId === req.user.id;
      const isSameZone = req.user.zone === existingService.hotel.zone;
      
      if (!isAssigned && !isSameZone) {
        return res.status(403).json({
          success: false,
          message: 'No tienes autorización para recoger este servicio'
        });
      }
    }
    
    // Update service with pickup data
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        weight: weight ? parseFloat(weight) : null,
        bagCount: parseInt(bagCount) || existingService.bagCount,
        observations: observations ? 
          `${existingService.observations || ''}\n[RECOJO] ${observations}`.trim() : 
          existingService.observations,
        collectorName,
        geolocation,
        pickupDate: new Date(),
        price: price ? parseFloat(price) : null,
        repartidorId: req.user.id,
        status: 'PICKED_UP',
        internalNotes: `${existingService.internalNotes || ''}\n[${new Date().toLocaleString()}] Recogido por ${req.user.name}`.trim()
      },
      include: {
        hotel: true,
        repartidor: true
      }
    });
    
    // Create a financial transaction for the service
    if (price) {
      await prisma.transaction.create({
        data: {
          type: 'INCOME',
          amount: parseFloat(price),
          incomeCategory: 'SERVICIO_LAVANDERIA',
          description: `Servicio de lavandería - ${existingService.guestName} (${existingService.hotel.name})`,
          date: new Date(),
          paymentMethod: 'EFECTIVO',
          hotelId: existingService.hotelId,
          serviceId: id,
          registeredById: req.user.id
        }
      });
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.SERVICE_PICKED_UP || 'SERVICE_PICKED_UP',
        entity: 'service',
        entityId: id,
        details: `Servicio recogido: ${existingService.guestName}, ${existingService.hotel.name}. Peso: ${weight}kg, Precio: S/${price}`,
        userId: req.user.id,
        serviceId: id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Datos de recojo registrados exitosamente',
      data: updatedService
    });
  } catch (error) {
    console.error('Error registering pickup:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar recojo',
      error: error.message
    });
  }
};

// Calculate service price
exports.calculatePrice = async (req, res) => {
  try {
    const { weight, hotelId, serviceType = 'STANDARD' } = req.body;
    
    if (!weight || !hotelId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere peso y hotelId para calcular el precio'
      });
    }
    
    // Get hotel pricing
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }
    
    // Calculate price (weight * price per kg)
    let price = parseFloat(weight) * parseFloat(hotel.pricePerKg);
    
    // Apply service type multipliers
    if (serviceType === 'EXPRESS') {
      price *= 1.5; // 50% extra for express service
    } else if (serviceType === 'PREMIUM') {
      price *= 2; // 100% extra for premium service
    }
    
    return res.status(200).json({
      success: true,
      data: {
        price: parseFloat(price.toFixed(2)), // Return as number, not string
        weight: parseFloat(weight),
        pricePerKg: parseFloat(hotel.pricePerKg),
        serviceType,
        hotelName: hotel.name
      }
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al calcular precio',
      error: error.message
    });
  }
};

// Upload photos for a service
exports.uploadPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const photoUrls = req.body.photoUrls || [];
    const photoType = req.body.type || 'pickup'; // pickup, labeling, delivery
    
    if (!photoUrls || photoUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se recibieron fotos'
      });
    }
    
    // Get existing service
    const existingService = await prisma.service.findUnique({
      where: { id }
    });
    
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    // Determine which field to update based on type
    let updateData = {};
    
    switch (photoType) {
      case 'pickup':
        const updatedPhotos = [...(existingService.photos || []), ...photoUrls];
        updateData.photos = updatedPhotos;
        break;
      
      case 'labeling':
        const updatedLabelingPhotos = [...(existingService.labelingPhotos || []), ...photoUrls];
        updateData.labelingPhotos = updatedLabelingPhotos;
        break;
      
      case 'delivery':
        const updatedDeliveryPhotos = [...(existingService.deliveryPhotos || []), ...photoUrls];
        updateData.deliveryPhotos = updatedDeliveryPhotos;
        break;
      
      default:
        // Default to regular photos
        const defaultPhotos = [...(existingService.photos || []), ...photoUrls];
        updateData.photos = defaultPhotos;
    }
    
    // Update service with new photos
    const updatedService = await prisma.service.update({
      where: { id },
      data: updateData
    });
    
    return res.status(200).json({
      success: true,
      message: `Fotos de ${photoType} subidas exitosamente`,
      data: {
        photos: photoUrls,
        type: photoType,
        totalPhotos: photoUrls.length
      }
    });
  } catch (error) {
    console.error('Error uploading photos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al subir fotos',
      error: error.message
    });
  }
};

// Upload signature for a service
exports.uploadSignature = async (req, res) => {
  try {
    const { id } = req.params;
    let signatureUrl = req.body.signatureUrl;
    
    // If signature came from processBase64Image middleware
    if (!signatureUrl && req.file) {
      const relativePath = req.file.path.replace(path.join(__dirname, '../..'), '');
      signatureUrl = relativePath.replace(/\\/g, '/');
    }
    
    // If no signature URL from either source
    if (!signatureUrl) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió la firma'
      });
    }
    
    // Update service with signature
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        signature: signatureUrl
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Firma guardada exitosamente',
      data: {
        signature: signatureUrl
      }
    });
  } catch (error) {
    console.error('Error uploading signature:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al guardar firma',
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

// Get service labels
exports.getServiceLabels = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id }
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    // Get all labels for this service
    const labels = await prisma.bagLabel.findMany({
      where: { serviceId: id },
      include: {
        registeredBy: {
          select: {
            id: true,
            name: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        bagNumber: 'asc'
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Rótulos del servicio obtenidos exitosamente',
      data: labels
    });
  } catch (error) {
    console.error('Error getting service labels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener rótulos del servicio',
      error: error.message
    });
  }
};

// Create service labels
exports.createServiceLabels = async (req, res) => {
  try {
    const { id } = req.params;
    const { labels } = req.body;
    const userId = req.user.id;
    
    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        hotel: true
      }
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un rótulo'
      });
    }
    
    // Create labels in transaction
    const createdLabels = await prisma.$transaction(async (tx) => {
      const results = [];
      
      for (let i = 0; i < labels.length; i++) {
        const labelData = labels[i];
        
        // Generate unique label code if not provided
        const labelCode = labelData.label || `ROT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${service.id.slice(-4).toUpperCase()}-${(i + 1).toString().padStart(2, '0')}`;
        
        const newLabel = await tx.bagLabel.create({
          data: {
            serviceId: id,
            hotelId: service.hotelId,
            label: labelCode,
            bagNumber: i + 1,
            photo: labelData.photo || '',
            registeredById: userId,
            status: 'LABELED',
            generatedAt: 'LAVANDERIA',
            observations: labelData.observations || null
          },
          include: {
            registeredBy: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
        
        results.push(newLabel);
      }
      
      // Update service status to LABELED if not already
      if (service.status === 'PICKED_UP') {
        await tx.service.update({
          where: { id },
          data: {
            status: 'LABELED',
            labeledDate: new Date()
          }
        });
      }
      
      return results;
    });
    
    return res.status(201).json({
      success: true,
      message: `${createdLabels.length} rótulo(s) creado(s) exitosamente`,
      data: createdLabels
    });
  } catch (error) {
    console.error('Error creating service labels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear rótulos del servicio',
      error: error.message
    });
  }
};