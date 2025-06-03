/**
 * Bag Label controller for Fumy Limp Backend
 */

const { prisma } = require('../config/database');
const { AUDIT_ACTIONS } = require('../config/constants');

/**
 * Generate label code with format: HTL-YYYYMMDD-HHMM-NN-XXXX
 * @param {string} hotelCode - 3-letter hotel code
 * @param {string} serviceId - Service ID 
 * @param {number} bagNumber - Bag number
 * @returns {string} Generated label code
 */
const generateLabelCode = (hotelCode, serviceId, bagNumber) => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = date.toTimeString().slice(0, 5).replace(':', '');
  const serviceCode = serviceId.slice(-4).toUpperCase();
  return `${hotelCode}-${dateStr}-${timeStr}-${bagNumber.toString().padStart(2, '0')}-${serviceCode}`;
};

/**
 * Create a single bag label (for rotulado process)
 * @route POST /api/bag-labels/single
 * @access Private
 */
exports.createSingleBagLabel = async (req, res) => {
  try {
    const { 
      serviceId, 
      hotelId, 
      bagNumber, 
      label, 
      registeredById, 
      status, 
      generatedAt 
    } = req.body;

    // Validate required fields
    if (!serviceId || !hotelId || !bagNumber || !label || !registeredById) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: serviceId, hotelId, bagNumber, label, registeredById'
      });
    }

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { hotel: true }
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: registeredById }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Handle photo upload if present
    let photoPath = null;
    if (req.file) {
      // Photo was uploaded via multer middleware
      photoPath = req.file.path;
    }

    // Create bag label
    const bagLabel = await prisma.bagLabel.create({
      data: {
        serviceId,
        hotelId,
        bagNumber: parseInt(bagNumber),
        label,
        photo: photoPath || '',
        registeredById,
        status: status || 'LABELED',
        generatedAt: generatedAt || 'LAVANDERIA',
        timestamp: new Date(),
        labeledAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.BAG_LABEL_CREATED,
        entity: 'bagLabel',
        entityId: bagLabel.id,
        details: `Rótulo creado para bolsa ${bagNumber} del servicio ${service.guestName}`,
        userId: registeredById,
        bagLabelId: bagLabel.id
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Rótulo creado exitosamente',
      data: bagLabel
    });
  } catch (error) {
    console.error('Error creating single bag label:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear rótulo',
      error: error.message
    });
  }
};

/**
 * Create labels for a service
 * @route POST /api/services/:serviceId/labels
 * @access Private
 */
exports.createLabels = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { labels } = req.body;
    
    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        hotel: {
          select: {
            id: true,
            name: true
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
    
    // Check if service status is valid for labeling
    if (service.status !== 'PICKED_UP' && service.status !== 'LABELED') {
      return res.status(400).json({
        success: false,
        message: 'El servicio debe estar en estado PICKED_UP o LABELED para crear rótulos'
      });
    }
    
    // Check if repartidor has access to this service
    if (req.user.role === 'REPARTIDOR') {
      if (service.repartidorId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para crear rótulos para este servicio'
        });
      }
    }
    
    // Create labels
    const createdLabels = [];
    const hotelCode = service.hotel.name.substring(0, 3).toUpperCase();
    
    for (let i = 0; i < labels.length; i++) {
      const { bagNumber, photo, observations, generatedAt } = labels[i];
      
      // Check if bagNumber is already used for this service
      const existingLabel = await prisma.bagLabel.findFirst({
        where: {
          serviceId,
          bagNumber: parseInt(bagNumber)
        }
      });
      
      if (existingLabel) {
        return res.status(400).json({
          success: false,
          message: `Ya existe un rótulo para la bolsa ${bagNumber} en este servicio`
        });
      }
      
      // Check if bagNumber is within service's bagCount
      if (parseInt(bagNumber) > service.bagCount) {
        return res.status(400).json({
          success: false,
          message: `El número de bolsa no puede ser mayor que la cantidad total (${service.bagCount})`
        });
      }
      
      // Generate label code
      const label = generateLabelCode(hotelCode, serviceId, bagNumber);
      
      // Create label
      const createdLabel = await prisma.bagLabel.create({
        data: {
          serviceId,
          hotelId: service.hotelId,
          label,
          bagNumber: parseInt(bagNumber),
          photo,
          observations,
          registeredById: req.user.id,
          generatedAt: generatedAt || 'LAVANDERIA',
          labeledAt: new Date(),
          status: 'LABELED'
        }
      });
      
      createdLabels.push(createdLabel);
      
      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: AUDIT_ACTIONS.BAG_LABEL_CREATED,
          entity: 'bagLabel',
          entityId: createdLabel.id,
          details: `Rótulo creado: ${label}, bolsa ${bagNumber} para servicio ${serviceId}`,
          userId: req.user.id,
          bagLabelId: createdLabel.id
        }
      });
    }
    
    // Update service status to LABELED if not already
    if (service.status === 'PICKED_UP') {
      await prisma.service.update({
        where: { id: serviceId },
        data: {
          status: 'LABELED',
          labeledDate: new Date()
        }
      });
      
      // Create audit log for service status change
      await prisma.auditLog.create({
        data: {
          action: AUDIT_ACTIONS.SERVICE_STATUS_CHANGED,
          entity: 'service',
          entityId: serviceId,
          details: `Estado de servicio actualizado: PICKED_UP → LABELED`,
          userId: req.user.id,
          serviceId
        }
      });
    }
    
    return res.status(201).json({
      success: true,
      message: `${createdLabels.length} rótulos creados exitosamente`,
      data: createdLabels
    });
  } catch (error) {
    console.error('Error creating labels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear rótulos',
      error: error.message
    });
  }
};

/**
 * Get all labels for a service
 * @route GET /api/services/:serviceId/labels
 * @access Private
 */
exports.getServiceLabels = async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        hotel: {
          select: {
            id: true,
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
    
    // Check if repartidor has access to this service
    if (req.user.role === 'REPARTIDOR') {
      if (service.hotel.zone !== req.user.zone) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para acceder a los rótulos de este servicio'
        });
      }
      
      if (service.repartidorId !== req.user.id && service.deliveryRepartidorId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para acceder a los rótulos de este servicio'
        });
      }
    }
    
    // Get all labels for the service
    const labels = await prisma.bagLabel.findMany({
      where: { serviceId },
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
      orderBy: { bagNumber: 'asc' }
    });
    
    return res.status(200).json({
      success: true,
      count: labels.length,
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

/**
 * Get a specific label by ID
 * @route GET /api/labels/:id
 * @access Private
 */
exports.getLabelById = async (req, res) => {
  try {
    const label = await prisma.bagLabel.findUnique({
      where: { id: req.params.id },
      include: {
        service: {
          select: {
            id: true,
            status: true,
            hotelId: true,
            repartidorId: true,
            deliveryRepartidorId: true
          }
        },
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        },
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
      }
    });
    
    if (!label) {
      return res.status(404).json({
        success: false,
        message: 'Rótulo no encontrado'
      });
    }
    
    // Check if repartidor has access to this label
    if (req.user.role === 'REPARTIDOR') {
      if (label.hotel.zone !== req.user.zone) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para acceder a este rótulo'
        });
      }
      
      if (label.service.repartidorId !== req.user.id && label.service.deliveryRepartidorId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para acceder a este rótulo'
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      data: label
    });
  } catch (error) {
    console.error('Error getting label:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener rótulo',
      error: error.message
    });
  }
};

/**
 * Update a label
 * @route PUT /api/labels/:id
 * @access Private
 */
exports.updateLabel = async (req, res) => {
  try {
    const { observations, status } = req.body;
    
    // Check if label exists
    const label = await prisma.bagLabel.findUnique({
      where: { id: req.params.id },
      include: {
        service: {
          select: {
            id: true,
            status: true,
            hotelId: true,
            repartidorId: true,
            deliveryRepartidorId: true
          }
        },
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        }
      }
    });
    
    if (!label) {
      return res.status(404).json({
        success: false,
        message: 'Rótulo no encontrado'
      });
    }
    
    // Check if repartidor has access to this label
    if (req.user.role === 'REPARTIDOR') {
      if (label.hotel.zone !== req.user.zone) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para actualizar este rótulo'
        });
      }
      
      if (label.service.repartidorId !== req.user.id && label.service.deliveryRepartidorId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para actualizar este rótulo'
        });
      }
    }
    
    // Validate status if provided
    if (status && !['LABELED', 'PROCESSING', 'COMPLETED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de rótulo inválido'
      });
    }
    
    // Update label
    const updatedLabel = await prisma.bagLabel.update({
      where: { id: req.params.id },
      data: {
        observations: observations || label.observations,
        status: status || label.status,
        updatedAt: new Date(),
        updatedById: req.user.id
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.BAG_LABEL_UPDATED,
        entity: 'bagLabel',
        entityId: label.id,
        details: `Rótulo actualizado: ${label.label}, estado: ${label.status} → ${updatedLabel.status}`,
        userId: req.user.id,
        bagLabelId: label.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Rótulo actualizado exitosamente',
      data: updatedLabel
    });
  } catch (error) {
    console.error('Error updating label:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar rótulo',
      error: error.message
    });
  }
};

/**
 * Upload photo for a label
 * @route POST /api/labels/:id/photo
 * @access Private
 */
exports.uploadLabelPhoto = async (req, res) => {
  try {
    const { photo } = req.body;
    
    if (!photo) {
      return res.status(400).json({
        success: false,
        message: 'La foto es requerida'
      });
    }
    
    // Check if label exists
    const label = await prisma.bagLabel.findUnique({
      where: { id: req.params.id },
      include: {
        service: {
          select: {
            id: true,
            hotelId: true,
            repartidorId: true,
            deliveryRepartidorId: true
          }
        },
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        }
      }
    });
    
    if (!label) {
      return res.status(404).json({
        success: false,
        message: 'Rótulo no encontrado'
      });
    }
    
    // Check if repartidor has access to this label
    if (req.user.role === 'REPARTIDOR') {
      if (label.hotel.zone !== req.user.zone) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para actualizar este rótulo'
        });
      }
      
      if (label.service.repartidorId !== req.user.id && label.service.deliveryRepartidorId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para actualizar este rótulo'
        });
      }
    }
    
    // Update label with new photo
    const updatedLabel = await prisma.bagLabel.update({
      where: { id: req.params.id },
      data: {
        photo,
        updatedAt: new Date(),
        updatedById: req.user.id
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.BAG_LABEL_UPDATED,
        entity: 'bagLabel',
        entityId: label.id,
        details: `Foto actualizada para rótulo: ${label.label}`,
        userId: req.user.id,
        bagLabelId: label.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Foto de rótulo actualizada exitosamente',
      data: updatedLabel
    });
  } catch (error) {
    console.error('Error uploading label photo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al subir foto de rótulo',
      error: error.message
    });
  }
};

/**
 * Delete a label
 * @route DELETE /api/labels/:id
 * @access Admin only
 */
exports.deleteLabel = async (req, res) => {
  try {
    // Check if label exists
    const label = await prisma.bagLabel.findUnique({
      where: { id: req.params.id },
      include: {
        service: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });
    
    if (!label) {
      return res.status(404).json({
        success: false,
        message: 'Rótulo no encontrado'
      });
    }
    
    // Check if service is in a valid state for label deletion
    if (label.service.status !== 'PICKED_UP' && label.service.status !== 'LABELED') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el rótulo porque el servicio ya está en proceso'
      });
    }
    
    // Delete label
    await prisma.bagLabel.delete({
      where: { id: req.params.id }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.BAG_LABEL_DELETED,
        entity: 'bagLabel',
        entityId: label.id,
        details: `Rótulo eliminado: ${label.label}, bolsa ${label.bagNumber}`,
        userId: req.user.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Rótulo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting label:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar rótulo',
      error: error.message
    });
  }
};

module.exports = exports;