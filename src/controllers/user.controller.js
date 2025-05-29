/**
 * User controller for Fumy Limp Backend
 */

const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const { AUDIT_ACTIONS } = require('../config/constants');

/**
 * Get all users
 * @route GET /api/users
 * @access Admin only
 */
exports.getUsers = async (req, res) => {
  try {
    const { role, zone, active, limit = 100, offset = 0 } = req.query;
    
    // Build where clause
    const where = {};
    
    if (role) {
      where.role = role;
    }
    
    if (zone) {
      where.zone = zone;
    }
    
    if (active !== undefined) {
      where.active = active === 'true';
    }
    
    // Get users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        zone: true,
        phone: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            servicesAssigned: true,
            servicesDelivered: true,
            transactionsCreated: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ],
      skip: parseInt(offset),
      take: parseInt(limit)
    });
    
    // Get total count for pagination
    const totalCount = await prisma.user.count({ where });
    
    return res.status(200).json({
      success: true,
      count: users.length,
      total: totalCount,
      data: users
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 * @access Admin or Own User
 */
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check permissions (admin can get any user, users can only get themselves)
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a este usuario'
      });
    }
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        zone: true,
        phone: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            servicesAssigned: true,
            servicesDelivered: true,
            transactionsCreated: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // If user is a repartidor, get active services
    let activeServices = null;
    
    if (user.role === 'REPARTIDOR') {
      activeServices = await prisma.service.findMany({
        where: {
          OR: [
            { repartidorId: userId },
            { deliveryRepartidorId: userId }
          ],
          status: {
            notIn: ['COMPLETED', 'CANCELLED']
          }
        },
        select: {
          id: true,
          guestName: true,
          roomNumber: true,
          status: true,
          hotel: {
            select: {
              id: true,
              name: true,
              zone: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 5
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        ...user,
        activeServices
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: error.message
    });
  }
};

/**
 * Update user
 * @route PUT /api/users/:id
 * @access Admin or Own User (limited fields)
 */
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, zone, phone, role, active } = req.body;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Check permissions
    const isOwnUser = req.user.id === userId;
    const isAdmin = req.user.role === 'ADMIN';
    
    if (!isAdmin && !isOwnUser) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para actualizar este usuario'
      });
    }
    
    // Build update data
    const updateData = {};
    
    // Own users can only update name and phone
    if (isOwnUser && !isAdmin) {
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
    } 
    // Admins can update all fields
    else if (isAdmin) {
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (zone) updateData.zone = zone;
      if (phone) updateData.phone = phone;
      if (role) updateData.role = role;
      if (active !== undefined) updateData.active = active;
    }
    
    // Check if email is already used by another user
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está en uso'
        });
      }
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        zone: true,
        phone: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.USER_UPDATED,
        entity: 'user',
        entityId: userId,
        details: `Usuario actualizado: ${user.name} (${user.email})`,
        userId: req.user.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
};

/**
 * Delete user (soft delete)
 * @route DELETE /api/users/:id
 * @access Admin only
 */
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Check if user has assigned services
    const assignedServices = await prisma.service.count({
      where: {
        OR: [
          { repartidorId: userId },
          { deliveryRepartidorId: userId }
        ],
        status: {
          notIn: ['COMPLETED', 'CANCELLED']
        }
      }
    });
    
    if (assignedServices > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el usuario porque tiene ${assignedServices} servicios activos asignados`
      });
    }
    
    // Soft delete by setting active to false
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { active: false }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.USER_DELETED,
        entity: 'user',
        entityId: userId,
        details: `Usuario eliminado (soft delete): ${user.name} (${user.email})`,
        userId: req.user.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Usuario eliminado exitosamente',
      data: {
        id: updatedUser.id,
        active: updatedUser.active
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};

/**
 * Change user password
 * @route PUT /api/users/:id/password
 * @access Admin or Own User
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Check permissions
    const isOwnUser = req.user.id === userId;
    const isAdmin = req.user.role === 'ADMIN';
    
    if (!isAdmin && !isOwnUser) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para cambiar la contraseña de este usuario'
      });
    }
    
    // Validate current password (only for own user)
    if (isOwnUser && !isAdmin) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere la contraseña actual'
        });
      }
      
      const isMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
      
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }
    }
    
    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 8 caracteres'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { hashedPassword }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.USER_UPDATED,
        entity: 'user',
        entityId: userId,
        details: `Contraseña actualizada para: ${user.name} (${user.email})`,
        userId: req.user.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña',
      error: error.message
    });
  }
};

/**
 * Get repartidores
 * @route GET /api/users/repartidores
 * @access Private
 */
exports.getRepartidores = async (req, res) => {
  try {
    const { zone, active } = req.query;
    
    // Build where clause
    const where = {
      role: 'REPARTIDOR'
    };
    
    if (zone) {
      where.zone = zone;
    }
    
    if (active !== undefined) {
      where.active = active === 'true';
    }
    
    // Get repartidores
    const repartidores = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        zone: true,
        active: true,
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
      orderBy: [
        { zone: 'asc' },
        { name: 'asc' }
      ]
    });
    
    return res.status(200).json({
      success: true,
      count: repartidores.length,
      data: repartidores.map(r => ({
        ...r,
        activeServices: r._count.servicesAssigned
      }))
    });
  } catch (error) {
    console.error('Error getting repartidores:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener repartidores',
      error: error.message
    });
  }
};

/**
 * Get users by zone
 * @route GET /api/users/by-zone/:zone
 * @access Admin only
 */
exports.getUsersByZone = async (req, res) => {
  try {
    const { zone } = req.params;
    
    // Get users by zone
    const users = await prisma.user.findMany({
      where: {
        zone,
        active: true
      },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
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
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });
    
    return res.status(200).json({
      success: true,
      count: users.length,
      data: users.map(u => ({
        ...u,
        activeServices: u._count.servicesAssigned
      }))
    });
  } catch (error) {
    console.error('Error getting users by zone:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios por zona',
      error: error.message
    });
  }
};

module.exports = exports;