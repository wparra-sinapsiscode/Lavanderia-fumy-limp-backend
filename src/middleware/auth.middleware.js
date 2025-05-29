/**
 * Authentication middleware for Fumy Limp Backend
 */

const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { PERMISSIONS } = require('../config/constants');

/**
 * Middleware to validate JWT token and attach user to request
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso no autorizado. Token no proporcionado.' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Check if token has been revoked
    const revokedToken = await prisma.revokedToken.findFirst({
      where: { token }
    });
    
    if (revokedToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token revocado. Por favor inicie sesión nuevamente.' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado o token inválido.' 
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Sesión expirada. Por favor inicie sesión nuevamente.' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Token inválido.' 
    });
  }
};

/**
 * Middleware to check if user is admin
 */
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      success: false, 
      message: 'Acceso denegado. Se requiere rol de administrador.' 
    });
  }
  next();
};

/**
 * Middleware to check if user is a repartidor
 */
exports.isRepartidor = (req, res, next) => {
  if (!req.user || req.user.role !== 'REPARTIDOR') {
    return res.status(403).json({ 
      success: false, 
      message: 'Acceso denegado. Se requiere rol de repartidor.' 
    });
  }
  next();
};

/**
 * Middleware to check if user is admin or repartidor in the specific zone
 */
exports.hasZoneAccess = (zoneParam = 'zone') => {
  return async (req, res, next) => {
    try {
      // Admins have access to all zones
      if (req.user.role === 'ADMIN') {
        return next();
      }
      
      const zoneToCheck = req.params[zoneParam] || req.body[zoneParam];
      
      // If no zone specified, we can't check access
      if (!zoneToCheck) {
        return res.status(400).json({
          success: false,
          message: 'Zona no especificada.'
        });
      }
      
      // Repartidores can only access their assigned zone
      if (req.user.role === 'REPARTIDOR' && req.user.zone !== zoneToCheck) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. No tiene permisos para esta zona.'
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos de zona.',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to check if user has permission for a specific resource and action
 */
exports.hasPermission = (resource, action) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;
      
      // Get permissions for user role
      const rolePermissions = PERMISSIONS[userRole];
      
      if (!rolePermissions) {
        return res.status(403).json({
          success: false,
          message: 'Rol no tiene permisos definidos.'
        });
      }
      
      // Get permissions for the resource
      const resourcePermissions = rolePermissions[resource];
      
      if (!resourcePermissions) {
        return res.status(403).json({
          success: false,
          message: `No tiene permisos para el recurso: ${resource}`
        });
      }
      
      // Check if user has permission for the action
      const hasActionPermission = resourcePermissions.some(permission => {
        // Direct permission match
        if (permission === action) return true;
        
        // Check limited permissions (e.g., read_own, update_assigned)
        if (permission.startsWith(`${action}_`)) {
          const limitation = permission.split('_')[1];
          
          // Handle specific limitations
          switch (limitation) {
            case 'own':
              // Check if resource belongs to user
              return req.params.id === req.user.id;
            case 'zone':
              // Check if resource is in user's zone
              return true; // This will be checked in detail in the controller
            case 'assigned':
              // Check if resource is assigned to user
              return true; // This will be checked in detail in the controller
            case 'limited':
              // Special case for limited permissions
              return true; // This will be checked in detail in the controller
            default:
              return false;
          }
        }
        
        return false;
      });
      
      if (!hasActionPermission) {
        return res.status(403).json({
          success: false,
          message: `No tiene permiso para la acción: ${action} en ${resource}`
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos.',
        error: error.message
      });
    }
  };
};