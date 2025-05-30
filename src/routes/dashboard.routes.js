/**
 * Dashboard routes for Fumy Limp Backend
 */

const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const dashboardController = require('../controllers/dashboard.controller');
const auditController = require('../controllers/audit.controller');
const { verifyToken, isAdmin, isRepartidor } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// GET /dashboard/summary - Dashboard summary metrics (admin or repartidor)
router.get('/summary', (req, res) => {
  if (req.user.role === 'ADMIN') {
    return dashboardController.getAdminMetrics(req, res);
  } else {
    return dashboardController.getRepartidorMetrics(req, res);
  }
});

// GET /dashboard/services-stats - Services by status (accessible to all verifyTokend users)
router.get('/services-stats', dashboardController.getServicesByStatus);

// GET /dashboard/financial-stats - Financial metrics (admin only)
router.get('/financial-stats', isAdmin, dashboardController.getFinancialMetrics);

// GET /dashboard/hotel-stats - Hotel statistics (accessible to verifyTokend users)
router.get('/hotel-stats', async (req, res) => {
  try {
    // For admin users, we extract hotel stats from admin metrics
    // For repartidor users, we show hotels in their zone
    if (req.user.role === 'ADMIN') {
      const result = await prisma.service.groupBy({
        by: ['hotelId'],
        _count: {
          id: true,
        },
        _sum: {
          price: true,
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      });
      
      // Get hotel details
      const topHotels = await Promise.all(result.map(async (item) => {
        const hotel = await prisma.hotel.findUnique({
          where: { id: item.hotelId },
          select: { id: true, name: true, zone: true }
        });
        
        return {
          id: hotel.id,
          name: hotel.name,
          zone: hotel.zone,
          services: item._count.id,
          revenue: item._sum.price || 0
        };
      }));
      
      return res.status(200).json({
        success: true,
        data: {
          topHotels
        }
      });
    } else {
      // For repartidor, get hotels in their zone
      const hotelsInZone = await prisma.hotel.findMany({
        where: {
          zone: req.user.zone
        },
        select: {
          id: true,
          name: true,
          address: true,
          zone: true,
          bagInventory: true
        },
        orderBy: {
          name: 'asc'
        }
      });
      
      return res.status(200).json({
        success: true,
        data: {
          hotelsInZone
        }
      });
    }
  } catch (error) {
    console.error('Error getting hotel stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de hoteles',
      error: error.message
    });
  }
});

// GET /dashboard/repartidor-stats - Repartidor metrics
router.get('/repartidor-stats', dashboardController.getRepartidorMetrics);

// GET /dashboard/zone-performance - Zone performance metrics (admin only)
router.get('/zone-performance', isAdmin, dashboardController.getZonePerformance);

// GET /dashboard/operational-kpis - Operational KPIs (admin only)
router.get('/operational-kpis', isAdmin, dashboardController.getOperationalKPIs);

// GET /dashboard/audit-logs - Audit logs (admin only)
router.get('/audit-logs', isAdmin, auditController.getLogs);

module.exports = router;