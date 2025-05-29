/**
 * Zone validation middleware for Fumy Limp Backend
 */

const { prisma } = require('../config/database');

/**
 * Middleware to validate zone access based on user role and zone
 * @param {Object} options - Middleware options
 * @param {string} options.zoneParam - Request parameter name containing zone value (default: 'zone')
 * @param {string} options.hotelIdParam - Request parameter name containing hotelId (default: 'hotelId')
 * @param {string} options.serviceIdParam - Request parameter name containing serviceId (default: 'serviceId')
 * @returns {Function} Express middleware function
 */
exports.validateZoneAccess = (options = {}) => {
  const {
    zoneParam = 'zone',
    hotelIdParam = 'hotelId',
    serviceIdParam = 'serviceId'
  } = options;
  
  return async (req, res, next) => {
    try {
      // Skip validation for admin users (they have access to all zones)
      if (req.user.role === 'ADMIN') {
        return next();
      }
      
      // For non-admin users (repartidores), check zone access
      if (req.user.role === 'REPARTIDOR') {
        const userZone = req.user.zone;
        
        // Direct zone parameter check
        if (req.params[zoneParam] || req.query[zoneParam] || req.body[zoneParam]) {
          const requestedZone = req.params[zoneParam] || req.query[zoneParam] || req.body[zoneParam];
          
          if (requestedZone && requestedZone !== userZone) {
            return res.status(403).json({
              success: false,
              message: `No tiene permisos para acceder a la zona ${requestedZone}`
            });
          }
        }
        
        // Check hotelId parameter and validate hotel's zone
        const hotelId = req.params[hotelIdParam] || req.query[hotelIdParam] || req.body[hotelIdParam];
        
        if (hotelId) {
          const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { zone: true }
          });
          
          if (!hotel) {
            return res.status(404).json({
              success: false,
              message: 'Hotel no encontrado'
            });
          }
          
          if (hotel.zone !== userZone) {
            return res.status(403).json({
              success: false,
              message: `No tiene permisos para acceder al hotel en zona ${hotel.zone}`
            });
          }
        }
        
        // Check serviceId parameter and validate associated hotel's zone
        const serviceId = req.params[serviceIdParam] || req.query[serviceIdParam] || req.body[serviceIdParam];
        
        if (serviceId) {
          const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: {
              hotel: {
                select: { zone: true }
              }
            }
          });
          
          if (!service) {
            return res.status(404).json({
              success: false,
              message: 'Servicio no encontrado'
            });
          }
          
          if (service.hotel.zone !== userZone) {
            return res.status(403).json({
              success: false,
              message: `No tiene permisos para acceder al servicio en zona ${service.hotel.zone}`
            });
          }
          
          // Additional check: verify if repartidor is assigned to this service
          // This is optional and can be enabled based on requirements
          const isAssignedToService = service.repartidorId === req.user.id || service.deliveryRepartidorId === req.user.id;
          
          if (!isAssignedToService && req.method !== 'GET') {
            return res.status(403).json({
              success: false,
              message: 'No tiene permisos para modificar este servicio'
            });
          }
        }
      }
      
      // If all checks pass, proceed to the next middleware
      next();
    } catch (error) {
      console.error('Error validating zone access:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al validar acceso por zona',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to ensure request only accesses user's zone
 * Automatically adds zone filter to query or body based on user's zone
 * @returns {Function} Express middleware function
 */
exports.enforceUserZone = () => {
  return (req, res, next) => {
    try {
      // Skip for admin users
      if (req.user.role === 'ADMIN') {
        return next();
      }
      
      // For repartidores, enforce their zone
      if (req.user.role === 'REPARTIDOR') {
        const userZone = req.user.zone;
        
        // Add zone to query parameters (for GET requests)
        if (req.method === 'GET') {
          req.query.zone = userZone;
        }
        
        // Add zone to body (for POST/PUT requests)
        if (['POST', 'PUT'].includes(req.method)) {
          req.body.zone = userZone;
        }
      }
      
      next();
    } catch (error) {
      console.error('Error enforcing user zone:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al aplicar restricción de zona',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to validate hotel is in user's zone
 * @returns {Function} Express middleware function
 */
exports.validateHotelZone = () => {
  return async (req, res, next) => {
    try {
      // Skip for admin users
      if (req.user.role === 'ADMIN') {
        return next();
      }
      
      const { hotelId } = req.body;
      
      if (!hotelId) {
        return next();
      }
      
      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        select: { zone: true }
      });
      
      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: 'Hotel no encontrado'
        });
      }
      
      if (hotel.zone !== req.user.zone) {
        return res.status(403).json({
          success: false,
          message: `No tiene permisos para acceder al hotel en zona ${hotel.zone}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Error validating hotel zone:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al validar zona del hotel',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to filter hotels by user's zone
 * @returns {Function} Express middleware function
 */
exports.filterHotelsByZone = () => {
  return (req, res, next) => {
    try {
      // Skip for admin users if they've specified a zone
      if (req.user.role === 'ADMIN' && req.query.zone) {
        return next();
      }
      
      // For repartidores or admins without zone filter
      if (req.user.role === 'REPARTIDOR' || (req.user.role === 'ADMIN' && !req.query.zone)) {
        // For repartidores, force their zone
        if (req.user.role === 'REPARTIDOR') {
          req.query.zone = req.user.zone;
        }
      }
      
      next();
    } catch (error) {
      console.error('Error filtering hotels by zone:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al filtrar hoteles por zona',
        error: error.message
      });
    }
  };
};

module.exports = exports;