/**
 * Application constants for Fumy Limp Backend
 */

// Service status transitions (valid state changes)
const VALID_STATUS_TRANSITIONS = {
  'PENDING_PICKUP': ['ASSIGNED_TO_ROUTE', 'PICKED_UP', 'CANCELLED'],
  'ASSIGNED_TO_ROUTE': ['PICKED_UP', 'CANCELLED'], // ✨ NUEVO estado
  'PICKED_UP': ['LABELED', 'IN_PROCESS', 'CANCELLED'], // ✨ Ambos disponibles desde PICKED_UP
  'LABELED': ['IN_PROCESS', 'PARTIAL_DELIVERY', 'COMPLETED', 'CANCELLED'], // ✨ Puede ir directo a completado si ya está en proceso
  'IN_PROCESS': ['LABELED', 'PARTIAL_DELIVERY', 'COMPLETED', 'CANCELLED'], // ✨ Puede hacer rotulado después
  'PARTIAL_DELIVERY': ['COMPLETED', 'CANCELLED'],
  'COMPLETED': [],
  'CANCELLED': []
};

// Status requirements
const STATUS_REQUIREMENTS = {
  'PICKED_UP': ['weight', 'signature', 'photos', 'collectorName'],
  'LABELED': [], // Solo requiere que esté recogido
  'IN_PROCESS': [], // Solo requiere que esté recogido (paralelo con rotulado)
  'PARTIAL_DELIVERY': ['partialDeliveryPercentage', 'deliveredBagCount', 'signature'],
  'COMPLETED': ['signature'],
  'CANCELLED': ['internalNotes']
};

// Geographic zones
const ZONES = {
  NORTE: 'NORTE',
  SUR: 'SUR',
  CENTRO: 'CENTRO',
  ESTE: 'ESTE',
  OESTE: 'OESTE',
  ADMINISTRACION: 'ADMINISTRACION'
};

// Service priorities
const PRIORITIES = {
  ALTA: 'ALTA',
  MEDIA: 'MEDIA',
  NORMAL: 'NORMAL'
};

// Transaction categories
const INCOME_CATEGORIES = {
  SERVICIO_LAVANDERIA: 'SERVICIO_LAVANDERIA',
  PAGO_HOTEL: 'PAGO_HOTEL',
  SERVICIO_PREMIUM: 'SERVICIO_PREMIUM',
  RECARGO_URGENTE: 'RECARGO_URGENTE',
  OTRO_INGRESO: 'OTRO_INGRESO'
};

const EXPENSE_CATEGORIES = {
  SUMINISTROS_LAVANDERIA: 'SUMINISTROS_LAVANDERIA',
  COMBUSTIBLE_TRANSPORTE: 'COMBUSTIBLE_TRANSPORTE',
  MANTENIMIENTO_EQUIPOS: 'MANTENIMIENTO_EQUIPOS',
  SALARIOS_PERSONAL: 'SALARIOS_PERSONAL',
  SERVICIOS_PUBLICOS: 'SERVICIOS_PUBLICOS',
  MARKETING_PUBLICIDAD: 'MARKETING_PUBLICIDAD',
  OTRO_GASTO: 'OTRO_GASTO'
};

// Payment methods
const PAYMENT_METHODS = {
  EFECTIVO: 'EFECTIVO',
  TRANSFERENCIA_BANCARIA: 'TRANSFERENCIA_BANCARIA',
  YAPE: 'YAPE',
  PLIN: 'PLIN',
  TARJETA_CREDITO: 'TARJETA_CREDITO',
  TARJETA_DEBITO: 'TARJETA_DEBITO',
  OTRO: 'OTRO'
};

// Audit actions
const AUDIT_ACTIONS = {
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  
  HOTEL_CREATED: 'HOTEL_CREATED',
  HOTEL_UPDATED: 'HOTEL_UPDATED',
  HOTEL_DELETED: 'HOTEL_DELETED',
  HOTEL_INVENTORY_UPDATED: 'HOTEL_INVENTORY_UPDATED',
  
  SERVICE_CREATED: 'SERVICE_CREATED',
  SERVICE_UPDATED: 'SERVICE_UPDATED',
  SERVICE_STATUS_CHANGED: 'SERVICE_STATUS_CHANGED',
  SERVICE_CANCELLED: 'SERVICE_CANCELLED',
  SERVICE_DELETED: 'SERVICE_DELETED',
  SERVICE_PICKED_UP: 'SERVICE_PICKED_UP',
  
  BAG_LABEL_CREATED: 'BAG_LABEL_CREATED',
  BAG_LABEL_UPDATED: 'BAG_LABEL_UPDATED',
  BAG_LABEL_DELETED: 'BAG_LABEL_DELETED',
  
  TRANSACTION_CREATED: 'TRANSACTION_CREATED',
  TRANSACTION_UPDATED: 'TRANSACTION_UPDATED',
  TRANSACTION_DELETED: 'TRANSACTION_DELETED'
};

// User permissions
const PERMISSIONS = {
  ADMIN: {
    users: ['read', 'create', 'update', 'delete'],
    hotels: ['read', 'create', 'update', 'delete'],
    services: ['read', 'create', 'update', 'delete', 'changeStatus'],
    bagLabels: ['read', 'create', 'update', 'delete'],
    transactions: ['read', 'create', 'update', 'delete'],
    auditLogs: ['read'],
    dashboard: ['read']
  },
  
  REPARTIDOR: {
    users: ['read_own', 'update_own'],
    hotels: ['read_zone'],
    services: ['read_zone', 'create_zone', 'update_assigned', 'changeStatus_limited'],
    bagLabels: ['read_assigned', 'create_assigned', 'update_own'],
    transactions: [],
    auditLogs: [],
    dashboard: ['read_limited']
  }
};

// Service status validation rules
const VALIDATION_RULES = {
  bagInventory: {
    minValue: 0
  },
  service: {
    minBagCount: 1,
    maxPhotos: 40,
    minWeight: 0.1
  },
  partialDelivery: {
    minPercentage: 1,
    maxPercentage: 99
  },
  price: {
    minValue: 0
  }
};

// Price calculation rules
const PRICE_RULES = {
  urgentMultiplier: 1.5,
  difficultStainsPercentage: 0.1,
  expressDeliveryPercentage: 0.25,
  delicateClothesPercentage: 0.15,
  highVolumeThreshold: 10, // kg
  highVolumeDiscount: 0.05,
  frequentClientThreshold: 5, // services per month
  frequentClientDiscount: 0.1
};

module.exports = {
  VALID_STATUS_TRANSITIONS,
  STATUS_REQUIREMENTS,
  ZONES,
  PRIORITIES,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  AUDIT_ACTIONS,
  PERMISSIONS,
  VALIDATION_RULES,
  PRICE_RULES
};