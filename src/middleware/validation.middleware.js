/**
 * Validation middleware for Fumy Limp Backend
 */

const { validationResult, body, param, query } = require('express-validator');
const { prisma } = require('../config/database');
const { VALID_STATUS_TRANSITIONS, STATUS_REQUIREMENTS, VALIDATION_RULES } = require('../config/constants');

/**
 * Handle validation errors
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg
      }))
    });
  }
  next();
};

/**
 * Validate user registration input
 */
exports.validateUserRegistration = [
  body('name')
    .isString().withMessage('El nombre debe ser texto')
    .isLength({ min: 5, max: 100 }).withMessage('El nombre debe tener entre 5 y 100 caracteres'),
  
  body('email')
    .isEmail().withMessage('Debe proporcionar un email válido')
    .custom(async (email) => {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      if (existingUser) {
        throw new Error('El email ya está registrado');
      }
      return true;
    }),
  
  body('password')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
    .withMessage('La contraseña debe incluir mayúsculas, minúsculas y números'),
  
  body('role')
    .isIn(['ADMIN', 'REPARTIDOR']).withMessage('Rol inválido'),
  
  body('zone')
    .isIn(['NORTE', 'SUR', 'CENTRO', 'ESTE', 'OESTE', 'ADMINISTRACION'])
    .withMessage('Zona inválida'),
  
  body('phone')
    .optional()
    .matches(/^\d{9}$/).withMessage('El teléfono debe tener 9 dígitos')
];

/**
 * Validate login input
 */
exports.validateLogin = [
  body('email')
    .isEmail().withMessage('Debe proporcionar un email válido'),
  
  body('password')
    .isString().withMessage('Debe proporcionar una contraseña')
    .notEmpty().withMessage('La contraseña no puede estar vacía')
];

/**
 * Validate hotel creation/update input
 */
exports.validateHotel = [
  body('name')
    .isString().withMessage('El nombre debe ser texto')
    .notEmpty().withMessage('El nombre es requerido'),
  
  body('address')
    .isString().withMessage('La dirección debe ser texto')
    .notEmpty().withMessage('La dirección es requerida'),
  
  body('zone')
    .isIn(['NORTE', 'SUR', 'CENTRO', 'ESTE', 'OESTE'])
    .withMessage('Zona inválida'),
  
  body('contactPerson')
    .isString().withMessage('El nombre de contacto debe ser texto')
    .notEmpty().withMessage('El nombre de contacto es requerido'),
  
  body('phone')
    .isString().withMessage('El teléfono debe ser texto')
    .notEmpty().withMessage('El teléfono es requerido'),
  
  body('email')
    .optional()
    .isEmail().withMessage('Debe proporcionar un email válido'),
  
  body('bagInventory')
    .isInt({ min: VALIDATION_RULES.bagInventory.minValue })
    .withMessage(`El inventario de bolsas debe ser al menos ${VALIDATION_RULES.bagInventory.minValue}`),
  
  body('pricePerKg')
    .isFloat({ min: 0.01 })
    .withMessage('El precio por kg debe ser mayor a 0')
];

/**
 * Validate service creation input
 */
exports.validateServiceCreation = [
  body('guestName')
    .isString().withMessage('El nombre del huésped debe ser texto')
    .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  
  body('roomNumber')
    .isString().withMessage('El número de habitación debe ser texto')
    .notEmpty().withMessage('El número de habitación es requerido'),
  
  body('hotelId')
    .isUUID().withMessage('ID de hotel inválido')
    .custom(async (hotelId) => {
      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId }
      });
      if (!hotel) {
        throw new Error('Hotel no encontrado');
      }
      return true;
    }),
  
  body('bagCount')
    .isInt({ min: VALIDATION_RULES.service.minBagCount })
    .withMessage(`La cantidad de bolsas debe ser al menos ${VALIDATION_RULES.service.minBagCount}`)
    .custom(async (bagCount, { req }) => {
      // Check if hotel has enough bags in inventory
      const hotel = await prisma.hotel.findUnique({
        where: { id: req.body.hotelId }
      });
      
      if (!hotel) {
        throw new Error('Hotel no encontrado');
      }
      
      if (hotel.bagInventory < bagCount) {
        throw new Error(`Inventario insuficiente. Disponible: ${hotel.bagInventory} bolsas`);
      }
      
      return true;
    }),
  
  body('observations')
    .optional()
    .isString().withMessage('Las observaciones deben ser texto'),
  
  body('specialInstructions')
    .optional()
    .isString().withMessage('Las instrucciones especiales deben ser texto'),
  
  body('priority')
    .optional()
    .isIn(['ALTA', 'MEDIA', 'NORMAL']).withMessage('Prioridad inválida'),
  
  body('pickupTimeSlot')
    .optional()
    .isString().withMessage('La franja horaria debe ser texto')
];

/**
 * Validate service status update
 */
exports.validateServiceStatusUpdate = [
  param('id')
    .isUUID().withMessage('ID de servicio inválido'),
  
  body('status')
    .isIn(['PICKED_UP', 'LABELED', 'IN_PROCESS', 'PARTIAL_DELIVERY', 'COMPLETED', 'CANCELLED'])
    .withMessage('Estado inválido'),
  
  body('weight')
    .if(body('status').equals('PICKED_UP'))
    .isFloat({ min: VALIDATION_RULES.service.minWeight })
    .withMessage(`El peso debe ser al menos ${VALIDATION_RULES.service.minWeight} kg`),
  
  body('signature')
    .if(body('status').custom(status => 
      ['PICKED_UP', 'PARTIAL_DELIVERY', 'COMPLETED'].includes(status)
    ))
    .isString().withMessage('La firma es requerida')
    .notEmpty().withMessage('La firma no puede estar vacía'),
  
  body('photos')
    .if(body('status').equals('PICKED_UP'))
    .isArray({ min: 1, max: VALIDATION_RULES.service.maxPhotos })
    .withMessage(`Se requiere al menos 1 foto (máximo ${VALIDATION_RULES.service.maxPhotos})`),
  
  body('collectorName')
    .if(body('status').equals('PICKED_UP'))
    .isString().withMessage('El nombre del recolector es requerido')
    .notEmpty().withMessage('El nombre del recolector no puede estar vacío'),
  
  body('partialDeliveryPercentage')
    .if(body('status').equals('PARTIAL_DELIVERY'))
    .isInt({ 
      min: VALIDATION_RULES.partialDelivery.minPercentage, 
      max: VALIDATION_RULES.partialDelivery.maxPercentage 
    })
    .withMessage(`El porcentaje debe estar entre ${VALIDATION_RULES.partialDelivery.minPercentage} y ${VALIDATION_RULES.partialDelivery.maxPercentage}`),
  
  body('deliveredBagCount')
    .if(body('status').equals('PARTIAL_DELIVERY'))
    .isInt({ min: 1 })
    .withMessage('La cantidad de bolsas entregadas debe ser al menos 1')
    .custom(async (deliveredBagCount, { req }) => {
      // Check if deliveredBagCount is less than service's bagCount
      const service = await prisma.service.findUnique({
        where: { id: req.params.id }
      });
      
      if (!service) {
        throw new Error('Servicio no encontrado');
      }
      
      if (deliveredBagCount >= service.bagCount) {
        throw new Error('La entrega parcial debe entregar menos bolsas que el total');
      }
      
      return true;
    }),
  
  body('internalNotes')
    .if(body('status').equals('CANCELLED'))
    .isString().withMessage('Las notas internas son requeridas para cancelación')
    .notEmpty().withMessage('Debe proporcionar una razón para la cancelación'),
  
  // Custom validator to check valid status transitions
  body('status').custom(async (status, { req }) => {
    // Get current service status
    const service = await prisma.service.findUnique({
      where: { id: req.params.id }
    });
    
    if (!service) {
      throw new Error('Servicio no encontrado');
    }
    
    // Check if transition is valid
    const currentStatus = service.status;
    const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    
    if (!validTransitions.includes(status)) {
      throw new Error(`No se puede cambiar de ${currentStatus} a ${status}`);
    }
    
    return true;
  }),
  
  // Custom validator to check if requirements for new status are met
  body().custom(async (body, { req }) => {
    const status = body.status;
    const requirements = STATUS_REQUIREMENTS[status];
    
    if (!requirements || requirements.length === 0) {
      return true;
    }
    
    // Check if all required fields are provided
    const missingFields = requirements.filter(field => {
      // Special case for bagLabels - will be checked in the controller
      if (field === 'bagLabels') return false;
      
      return body[field] === undefined || body[field] === null || body[field] === '';
    });
    
    if (missingFields.length > 0) {
      throw new Error(`Campos requeridos para estado ${status}: ${missingFields.join(', ')}`);
    }
    
    return true;
  })
];

/**
 * Validate bag label creation
 */
exports.validateBagLabel = [
  body('serviceId')
    .isUUID().withMessage('ID de servicio inválido')
    .custom(async (serviceId) => {
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });
      
      if (!service) {
        throw new Error('Servicio no encontrado');
      }
      
      if (service.status !== 'PICKED_UP' && service.status !== 'LABELED') {
        throw new Error('El servicio debe estar en estado PICKED_UP o LABELED para crear rótulos');
      }
      
      return true;
    }),
  
  body('hotelId')
    .isUUID().withMessage('ID de hotel inválido')
    .custom(async (hotelId, { req }) => {
      // Check if hotelId matches the service's hotelId
      const service = await prisma.service.findUnique({
        where: { id: req.body.serviceId }
      });
      
      if (!service) {
        throw new Error('Servicio no encontrado');
      }
      
      if (service.hotelId !== hotelId) {
        throw new Error('El hotel no coincide con el servicio');
      }
      
      return true;
    }),
  
  body('label')
    .isString().withMessage('El código de rótulo debe ser texto')
    .matches(/^[A-Z]{3}-\d{8}-\d{4}-\d{2}-[A-Z0-9]{4}$/)
    .withMessage('Formato de rótulo inválido (HTL-YYYYMMDD-HHMM-NN-XXXX)')
    .custom(async (label) => {
      // Check if label is unique
      const existingLabel = await prisma.bagLabel.findUnique({
        where: { label }
      });
      
      if (existingLabel) {
        throw new Error('El código de rótulo ya existe');
      }
      
      return true;
    }),
  
  body('bagNumber')
    .isInt({ min: 1 }).withMessage('El número de bolsa debe ser positivo')
    .custom(async (bagNumber, { req }) => {
      // Check if bagNumber is unique for the service
      const existingLabel = await prisma.bagLabel.findFirst({
        where: {
          serviceId: req.body.serviceId,
          bagNumber
        }
      });
      
      if (existingLabel) {
        throw new Error(`Ya existe un rótulo para la bolsa ${bagNumber} en este servicio`);
      }
      
      // Check if bagNumber is within service's bagCount
      const service = await prisma.service.findUnique({
        where: { id: req.body.serviceId }
      });
      
      if (!service) {
        throw new Error('Servicio no encontrado');
      }
      
      if (bagNumber > service.bagCount) {
        throw new Error(`El número de bolsa no puede ser mayor que la cantidad total (${service.bagCount})`);
      }
      
      return true;
    }),
  
  body('photo')
    .isString().withMessage('La foto es requerida')
    .notEmpty().withMessage('La foto no puede estar vacía'),
  
  body('observations')
    .optional()
    .isString().withMessage('Las observaciones deben ser texto')
];

/**
 * Validate transaction creation
 */
exports.validateTransaction = [
  body('type')
    .isIn(['INCOME', 'EXPENSE']).withMessage('Tipo inválido'),
  
  body('amount')
    .isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0'),
  
  body('incomeCategory')
    .if(body('type').equals('INCOME'))
    .isIn(['SERVICIO_LAVANDERIA', 'PAGO_HOTEL', 'SERVICIO_PREMIUM', 'RECARGO_URGENTE', 'OTRO_INGRESO'])
    .withMessage('Categoría de ingreso inválida'),
  
  body('expenseCategory')
    .if(body('type').equals('EXPENSE'))
    .isIn(['SUMINISTROS_LAVANDERIA', 'COMBUSTIBLE_TRANSPORTE', 'MANTENIMIENTO_EQUIPOS', 'SALARIOS_PERSONAL', 'SERVICIOS_PUBLICOS', 'MARKETING_PUBLICIDAD', 'OTRO_GASTO'])
    .withMessage('Categoría de gasto inválida'),
  
  body('description')
    .isString().withMessage('La descripción debe ser texto')
    .isLength({ min: 5 }).withMessage('La descripción debe tener al menos 5 caracteres'),
  
  body('date')
    .isISO8601().withMessage('Fecha inválida'),
  
  body('paymentMethod')
    .isIn(['EFECTIVO', 'TRANSFERENCIA_BANCARIA', 'YAPE', 'PLIN', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'OTRO'])
    .withMessage('Método de pago inválido'),
  
  body('hotelId')
    .optional()
    .isUUID().withMessage('ID de hotel inválido')
    .custom(async (hotelId) => {
      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId }
      });
      
      if (!hotel) {
        throw new Error('Hotel no encontrado');
      }
      
      return true;
    }),
  
  body('serviceId')
    .optional()
    .isUUID().withMessage('ID de servicio inválido')
    .custom(async (serviceId) => {
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });
      
      if (!service) {
        throw new Error('Servicio no encontrado');
      }
      
      return true;
    }),
  
  body('notes')
    .optional()
    .isString().withMessage('Las notas deben ser texto')
];

module.exports = exports;