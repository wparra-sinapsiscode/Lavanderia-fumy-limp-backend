/**
 * Audit controller for Fumy Limp Backend
 */

const { prisma } = require('../config/database');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

/**
 * Get audit logs with filtering
 * @route GET /api/audit
 * @access Admin only
 */
exports.getLogs = async (req, res) => {
  try {
    const { 
      action, 
      entity, 
      entityId, 
      userId, 
      dateFrom, 
      dateTo, 
      limit = 100, 
      offset = 0 
    } = req.query;
    
    // Build where clause
    const where = {};
    
    if (action) {
      where.action = action;
    }
    
    if (entity) {
      where.entity = entity;
    }
    
    if (entityId) {
      where.entityId = entityId;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (dateFrom || dateTo) {
      where.timestamp = {};
      
      if (dateFrom) {
        where.timestamp.gte = new Date(dateFrom);
      }
      
      if (dateTo) {
        where.timestamp.lte = new Date(dateTo);
      }
    }
    
    // Get audit logs
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        service: {
          select: {
            id: true,
            guestName: true,
            roomNumber: true
          }
        },
        bagLabel: {
          select: {
            id: true,
            label: true
          }
        },
        transaction: {
          select: {
            id: true,
            type: true,
            amount: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      skip: parseInt(offset),
      take: parseInt(limit)
    });
    
    // Get total count for pagination
    const totalCount = await prisma.auditLog.count({ where });
    
    return res.status(200).json({
      success: true,
      count: logs.length,
      total: totalCount,
      data: logs
    });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener registros de auditoría',
      error: error.message
    });
  }
};

/**
 * Get audit logs for a specific entity
 * @route GET /api/audit/entity/:entityId
 * @access Admin only
 */
exports.getEntityLogs = async (req, res) => {
  try {
    const { entityId } = req.params;
    const { entity } = req.query;
    
    if (!entity) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere especificar el tipo de entidad'
      });
    }
    
    // Get audit logs for entity
    const logs = await prisma.auditLog.findMany({
      where: {
        entity,
        entityId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
    
    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Error getting entity audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener registros de auditoría de la entidad',
      error: error.message
    });
  }
};

/**
 * Export audit logs to CSV
 * @route GET /api/audit/export
 * @access Admin only
 */
exports.exportAuditLogs = async (req, res) => {
  try {
    const { 
      action, 
      entity, 
      entityId, 
      userId, 
      dateFrom, 
      dateTo,
      format = 'csv'
    } = req.query;
    
    // Build where clause
    const where = {};
    
    if (action) {
      where.action = action;
    }
    
    if (entity) {
      where.entity = entity;
    }
    
    if (entityId) {
      where.entityId = entityId;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (dateFrom || dateTo) {
      where.timestamp = {};
      
      if (dateFrom) {
        where.timestamp.gte = new Date(dateFrom);
      }
      
      if (dateTo) {
        where.timestamp.lte = new Date(dateTo);
      }
    }
    
    // Get audit logs with user information
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
    
    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron registros para exportar'
      });
    }
    
    // Prepare logs for export
    const formattedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      details: log.details,
      userName: log.user?.name || 'Unknown',
      userRole: log.user?.role || 'Unknown',
      timestamp: log.timestamp.toISOString()
    }));
    
    // Export based on format
    if (format.toLowerCase() === 'csv') {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const exportDir = path.join(uploadsDir, 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      // Generate file name with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `audit_logs_${timestamp}.csv`;
      const filePath = path.join(exportDir, fileName);
      
      // Create CSV writer
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'id', title: 'ID' },
          { id: 'action', title: 'Acción' },
          { id: 'entity', title: 'Entidad' },
          { id: 'entityId', title: 'ID Entidad' },
          { id: 'details', title: 'Detalles' },
          { id: 'userName', title: 'Usuario' },
          { id: 'userRole', title: 'Rol' },
          { id: 'timestamp', title: 'Fecha y Hora' }
        ]
      });
      
      // Write CSV
      await csvWriter.writeRecords(formattedLogs);
      
      // Set response headers for download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      
      // Send file
      return res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          return res.status(500).json({
            success: false,
            message: 'Error al descargar el archivo',
            error: err.message
          });
        }
        
        // Delete file after download
        fs.unlinkSync(filePath);
      });
    } else {
      // JSON format
      return res.status(200).json({
        success: true,
        count: formattedLogs.length,
        data: formattedLogs
      });
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al exportar registros de auditoría',
      error: error.message
    });
  }
};

/**
 * Get audit statistics
 * @route GET /api/audit/statistics
 * @access Admin only
 */
exports.getAuditStatistics = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    // Define date range
    let startDate, endDate;
    
    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
    } else {
      // Default to last 30 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }
    
    // Get audit counts by action
    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true,
      orderBy: {
        _count: {
          _all: 'desc'
        }
      }
    });
    
    // Get audit counts by entity
    const entityCounts = await prisma.auditLog.groupBy({
      by: ['entity'],
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true,
      orderBy: {
        _count: {
          _all: 'desc'
        }
      }
    });
    
    // Get audit counts by user
    const userCounts = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true,
      orderBy: {
        _count: {
          _all: 'desc'
        }
      },
      take: 10
    });
    
    // Get user details for user counts
    const userDetails = await Promise.all(
      userCounts.map(async (user) => {
        const userData = await prisma.user.findUnique({
          where: { id: user.userId },
          select: {
            id: true,
            name: true,
            role: true
          }
        });
        
        return {
          userId: user.userId,
          name: userData?.name || 'Unknown User',
          role: userData?.role || 'Unknown Role',
          count: user._count._all
        };
      })
    );
    
    // Get daily audit counts
    const dailyCounts = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', timestamp) as day,
        COUNT(*) as count
      FROM "AuditLog"
      WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY day ASC
    `;
    
    return res.status(200).json({
      success: true,
      data: {
        dateRange: {
          from: startDate,
          to: endDate
        },
        totalLogs: await prisma.auditLog.count({
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate
            }
          }
        }),
        actionCounts: actionCounts.map(action => ({
          action: action.action,
          count: action._count._all
        })),
        entityCounts: entityCounts.map(entity => ({
          entity: entity.entity,
          count: entity._count._all
        })),
        userCounts: userDetails,
        dailyCounts: dailyCounts.map(day => ({
          day: day.day,
          count: Number(day.count)
        }))
      }
    });
  } catch (error) {
    console.error('Error getting audit statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de auditoría',
      error: error.message
    });
  }
};

module.exports = exports;