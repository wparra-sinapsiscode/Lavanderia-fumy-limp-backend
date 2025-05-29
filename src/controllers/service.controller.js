/**
 * Service controller for Fumy Limp Backend
 */

const { prisma } = require('../config/database');
const { AUDIT_ACTIONS, VALID_STATUS_TRANSITIONS, STATUS_REQUIREMENTS, VALIDATION_RULES } = require('../config/constants');
const path = require('path');
const fs = require('fs');

/**
 * Get all services with optional filtering
 * @route GET /api/services
 * @access Private
 */
exports.getAllServices = async (req, res) => {
  try {
    const { status, hotelId, zone, priority, limit = 100, offset = 0 } = req.query;
    const where = {};
    
    // Apply filters
    if (status) where.status = status;
    if (hotelId) where.hotelId = hotelId;
    if (priority) where.priority = priority;
    
    // Filter by zone if provided or if user is repartidor
    if (zone) {
      where.hotel = {
        zone
      };
    } else if (req.user.role === 'REPARTIDOR') {
      // Repartidores can only see services in their own zone
      where.hotel = {
        zone: req.user.zone
      };
      
      // For repartidores, only show services assigned to them
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
            id: true,
            name: true,
            zone: true,
            pricePerKg: true
          }
        },
        repartidor: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        },
        deliveryRepartidor: {
          select: {
            id: true,
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
    const totalCount = await prisma.service.count({ where });
    
    return res.status(200).json({
      success: true,
      count: services.length,
      total: totalCount,
      data: services
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

/**
 * Get service by ID
 * @route GET /api/services/:id
 * @access Private
 */
exports.getServiceById = async (req, res) => {
  try {
    const service = await prisma.service.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true,
            pricePerKg: true
          }
        },
        repartidor: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        },
        deliveryRepartidor: {
          select: {
            id: true,
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
        },
        photos: {
          select: {
            id: true,
            url: true,
            type: true
          }
        }
      }
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    // Check if repartidor has access to this service's zone
    if (req.user.role === 'REPARTIDOR') {
      // Check if service is in repartidor's zone
      if (service.hotel.zone !== req.user.zone) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para acceder a este servicio'
        });
      }
      
      // Check if service is assigned to the repartidor
      if (service.repartidorId !== req.user.id && service.deliveryRepartidorId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para acceder a este servicio'
        });
      }
    }
    
    return res.status(200).json({
      success: true,
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

/**
 * Create new service
 * @route POST /api/services
 * @access Private
 */
exports.createService = async (req, res) => {
  try {
    const { 
      hotelId, 
      repartidorId, 
      guestName, 
      guestRoom, 
      priority, 
      expectedDeliveryDate, 
      specialInstructions 
    } = req.body;
    
    // Check if hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: {
        id: hotelId
      }
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
    
    // Check zone permission for repartidor
    if (req.user.role === 'REPARTIDOR') {
      if (hotel.zone !== req.user.zone) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para crear servicios en esta zona'
        });
      }
    }
    
    // Create service
    const service = await prisma.service.create({
      data: {
        hotelId,
        repartidorId: repartidorId || null,
        guestName,
        guestRoom,
        priority: priority || 'NORMAL',
        status: 'PENDING_PICKUP',
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        specialInstructions,
        createdById: req.user.id
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

/**
 * Register pickup for a service
 * @route PUT /api/services/:id/pickup
 * @access Private
 */
exports.registerPickup = async (req, res) => {
  try {
    const { 
      weight, 
      signature, 
      collectorName, 
      bagCount, 
      notes 
    } = req.body;
    
    // Validate required fields
    if (!weight || !signature || !collectorName || !bagCount) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los campos: peso, firma, nombre del recolector y cantidad de bolsas'
      });
    }
    
    // Validate weight
    if (parseFloat(weight) < VALIDATION_RULES.service.minWeight) {
      return res.status(400).json({
        success: false,
        message: `El peso mínimo debe ser ${VALIDATION_RULES.service.minWeight}kg`
      });
    }
    
    // Check if service exists
    const service = await prisma.service.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true,
            pricePerKg: true
          }
        }
      }
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    // Check if service is in the right status
    if (service.status !== 'PENDING_PICKUP') {
      return res.status(400).json({
        success: false,
        message: `No se puede registrar la recolección para un servicio en estado ${service.status}`
      });
    }
    
    // Check zone permission for repartidor
    if (req.user.role === 'REPARTIDOR') {
      if (service.hotel.zone !== req.user.zone) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para actualizar servicios en esta zona'
        });
      }
      
      // Check if service is assigned to the repartidor
      if (service.repartidorId && service.repartidorId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para actualizar este servicio'
        });
      }
    }
    
    // Calculate estimated price
    const estimatedPrice = parseFloat(weight) * service.hotel.pricePerKg;
    
    // Update service with pickup info
    const updatedService = await prisma.service.update({
      where: {
        id: req.params.id
      },
      data: {
        status: 'PICKED_UP',
        weight: parseFloat(weight),
        signature,
        collectorName,
        bagCount: parseInt(bagCount),
        notes,
        estimatedPrice,
        pickupDate: new Date(),
        repartidorId: service.repartidorId || req.user.id
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.SERVICE_STATUS_CHANGED,
        entity: 'service',
        entityId: service.id,
        details: `Servicio recolectado: ${service.hotel.name}, ${weight}kg, ${bagCount} bolsas, por ${collectorName}`,
        userId: req.user.id
      }
    });
    
    // Update hotel bag inventory if needed
    if (bagCount > 0) {
      await prisma.hotel.update({
        where: {
          id: service.hotel.id
        },
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
          entityId: service.hotel.id,
          details: `Inventario reducido en ${bagCount} bolsas por servicio ID: ${service.id}`,
          userId: req.user.id
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Servicio recolectado exitosamente',
      data: updatedService
    });
  } catch (error) {
    console.error('Error registering pickup:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar recolección',
      error: error.message
    });
  }
};

/**
 * Change service status
 * @route PUT /api/services/:id/status
 * @access Private
 */
exports.changeStatus = async (req, res) => {
  try {
    const { status, internalNotes } = req.body;
    
    // Check if status is valid
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el nuevo estado del servicio'
      });
    }
    
    // Check if service exists
    const service = await prisma.service.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
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
    
    // Check if transition is valid
    if (!VALID_STATUS_TRANSITIONS[service.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `No se puede cambiar el estado de ${service.status} a ${status}`
      });
    }
    
    // Check zone permission for repartidor
    if (req.user.role === 'REPARTIDOR') {
      if (service.hotel.zone !== req.user.zone) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para actualizar servicios en esta zona'
        });
      }
      
      // Check if service is assigned to the repartidor
      if (service.repartidorId !== req.user.id && service.deliveryRepartidorId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para actualizar este servicio'
        });
      }
      
      // Repartidores have limited status change permissions
      const allowedStatusChanges = ['LABELED', 'IN_PROCESS', 'COMPLETED'];
      if (!allowedStatusChanges.includes(status)) {
        return res.status(403).json({
          success: false,
          message: `No tiene permisos para cambiar el estado a ${status}`
        });
      }
    }
    
    // Check status requirements
    const requirements = STATUS_REQUIREMENTS[status];
    if (status === 'LABELED' && (!service.bagLabels || service.bagLabels.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos una etiqueta de bolsa para cambiar el estado a LABELED'
      });
    }
    
    if (status === 'CANCELLED' && !internalNotes) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere una nota interna para cancelar el servicio'
      });
    }
    
    // Prepare data for update
    const updateData = {
      status,
      internalNotes: internalNotes || service.internalNotes
    };
    
    // Add timestamps based on status
    if (status === 'LABELED') {
      updateData.labeledDate = new Date();
    } else if (status === 'IN_PROCESS') {
      updateData.processingDate = new Date();
    } else if (status === 'COMPLETED') {
      updateData.completedDate = new Date();
    } else if (status === 'CANCELLED') {
      updateData.cancelledDate = new Date();
    }
    
    // Update service status
    const updatedService = await prisma.service.update({
      where: {
        id: req.params.id
      },
      data: updateData
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: status === 'CANCELLED' 
          ? AUDIT_ACTIONS.SERVICE_CANCELLED 
          : AUDIT_ACTIONS.SERVICE_STATUS_CHANGED,
        entity: 'service',
        entityId: service.id,
        details: `Estado de servicio actualizado: ${service.status} → ${status}${internalNotes ? `, Nota: ${internalNotes}` : ''}`,
        userId: req.user.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: `Estado actualizado a ${status} exitosamente`,
      data: updatedService
    });
  } catch (error) {
    console.error('Error changing service status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar estado del servicio',
      error: error.message
    });
  }
};

/**
 * Register partial delivery for a service
 * @route PUT /api/services/:id/partial-delivery
 * @access Private
 */
exports.registerPartialDelivery = async (req, res) => {
  try {
    const { 
      partialDeliveryPercentage, 
      deliveredBagCount, 
      signature, 
      deliveryRepartidorId, 
      receiverName, 
      notes 
    } = req.body;
    
    // Validate required fields
    if (!partialDeliveryPercentage || !deliveredBagCount || !signature || !receiverName) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los campos: porcentaje de entrega, cantidad de bolsas, firma y nombre del receptor'
      });
    }
    
    // Validate percentage
    const percentage = parseInt(partialDeliveryPercentage);
    if (percentage < VALIDATION_RULES.partialDelivery.minPercentage || 
        percentage > VALIDATION_RULES.partialDelivery.maxPercentage) {
      return res.status(400).json({
        success: false,
        message: `El porcentaje debe estar entre ${VALIDATION_RULES.partialDelivery.minPercentage} y ${VALIDATION_RULES.partialDelivery.maxPercentage}`
      });
    }
    
    // Check if service exists
    const service = await prisma.service.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        hotel: {
          select: {
            name: true,
            zone: true
          }
        }
      }
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    // Check if service is in the right status
    if (service.status !== 'IN_PROCESS') {
      return res.status(400).json({
        success: false,
        message: `No se puede registrar entrega parcial para un servicio en estado ${service.status}`
      });
    }
    
    // Check zone permission for repartidor
    if (req.user.role === 'REPARTIDOR') {
      if (service.hotel.zone !== req.user.zone) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para actualizar servicios en esta zona'
        });
      }
    }
    
    // Check if repartidor exists (if provided)
    let repartidor = null;
    if (deliveryRepartidorId) {
      repartidor = await prisma.user.findUnique({
        where: {
          id: deliveryRepartidorId,
          role: 'REPARTIDOR'
        }
      });
      
      if (!repartidor) {
        return res.status(404).json({
          success: false,
          message: 'Repartidor de entrega no encontrado'
        });
      }
      
      // Check if repartidor zone matches hotel zone
      if (repartidor.zone !== service.hotel.zone) {
        return res.status(400).json({
          success: false,
          message: 'El repartidor debe estar asignado a la misma zona que el hotel'
        });
      }
    }
    
    // Update service with partial delivery info
    const updatedService = await prisma.service.update({
      where: {
        id: req.params.id
      },
      data: {
        status: 'PARTIAL_DELIVERY',
        partialDeliveryPercentage: percentage,
        deliveredBagCount: parseInt(deliveredBagCount),
        partialDeliverySignature: signature,
        deliveryRepartidorId: deliveryRepartidorId || req.user.id,
        receiverName,
        partialDeliveryNotes: notes,
        partialDeliveryDate: new Date()
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.SERVICE_STATUS_CHANGED,
        entity: 'service',
        entityId: service.id,
        details: `Entrega parcial registrada: ${service.hotel.name}, ${percentage}%, ${deliveredBagCount} bolsas, recibido por ${receiverName}`,
        userId: req.user.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Entrega parcial registrada exitosamente',
      data: updatedService
    });
  } catch (error) {
    console.error('Error registering partial delivery:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar entrega parcial',
      error: error.message
    });
  }
};

/**
 * Upload service photos
 * @route POST /api/services/:id/photos
 * @access Private
 */
exports.uploadPhotos = async (req, res) => {
  try {
    // Check if service exists
    const service = await prisma.service.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        hotel: {
          select: {
            name: true,
            zone: true
          }
        },
        photos: true
      }
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    // Check zone permission for repartidor
    if (req.user.role === 'REPARTIDOR') {
      if (service.hotel.zone !== req.user.zone) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para actualizar servicios en esta zona'
        });
      }
      
      // Check if service is assigned to the repartidor
      if (service.repartidorId !== req.user.id && service.deliveryRepartidorId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para actualizar este servicio'
        });
      }
    }
    
    // Check if files were uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se han subido fotos'
      });
    }
    
    // Check max photos limit
    if (service.photos.length + Object.keys(req.files).length > VALIDATION_RULES.service.maxPhotos) {
      return res.status(400).json({
        success: false,
        message: `No se pueden subir más de ${VALIDATION_RULES.service.maxPhotos} fotos para un servicio`
      });
    }
    
    const { type = 'PICKUP' } = req.body;
    const validTypes = ['PICKUP', 'PROCESS', 'DELIVERY', 'DAMAGED'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de foto inválido'
      });
    }
    
    // Process and save each file
    const uploadedPhotos = [];
    const uploadDir = path.join(__dirname, '../../uploads/services', service.id);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Get array of files (handle both single and multiple uploads)
    const files = Array.isArray(req.files.photos) ? req.files.photos : [req.files.photos];
    
    for (const file of files) {
      const timestamp = Date.now();
      const filename = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, filename);
      
      // Move file to upload directory
      await file.mv(filePath);
      
      // Save to database
      const photo = await prisma.servicePhoto.create({
        data: {
          serviceId: service.id,
          url: `/uploads/services/${service.id}/${filename}`,
          type
        }
      });
      
      uploadedPhotos.push(photo);
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.SERVICE_UPDATED,
        entity: 'service',
        entityId: service.id,
        details: `${uploadedPhotos.length} fotos tipo ${type} agregadas al servicio`,
        userId: req.user.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: `${uploadedPhotos.length} fotos subidas exitosamente`,
      data: uploadedPhotos
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

/**
 * Get pending services
 * @route GET /api/services/pending
 * @access Private
 */
exports.getPendingServices = async (req, res) => {
  try {
    const { zone, limit = 100, offset = 0 } = req.query;
    const where = {
      status: {
        in: ['PENDING_PICKUP', 'PICKED_UP', 'LABELED', 'IN_PROCESS']
      }
    };
    
    // Filter by zone if provided or if user is repartidor
    if (zone) {
      where.hotel = {
        zone
      };
    } else if (req.user.role === 'REPARTIDOR') {
      // Repartidores can only see services in their own zone
      where.hotel = {
        zone: req.user.zone
      };
      
      // For repartidores, only show services assigned to them
      where.OR = [
        { repartidorId: req.user.id },
        { deliveryRepartidorId: req.user.id }
      ];
    }
    
    const pendingServices = await prisma.service.findMany({
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
        }
      },
      orderBy: [
        {
          priority: 'desc'
        },
        {
          createdAt: 'asc'
        }
      ],
      skip: parseInt(offset),
      take: parseInt(limit)
    });
    
    // Get total count for pagination
    const totalCount = await prisma.service.count({ where });
    
    // Group by status for dashboard stats
    const statusCounts = {
      PENDING_PICKUP: 0,
      PICKED_UP: 0,
      LABELED: 0,
      IN_PROCESS: 0
    };
    
    pendingServices.forEach(service => {
      statusCounts[service.status]++;
    });
    
    return res.status(200).json({
      success: true,
      count: pendingServices.length,
      total: totalCount,
      statusCounts,
      data: pendingServices
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

module.exports = exports;