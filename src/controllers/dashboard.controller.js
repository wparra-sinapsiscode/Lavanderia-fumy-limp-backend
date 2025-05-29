/**
 * Dashboard controller for Fumy Limp Backend
 */

const { prisma } = require('../config/database');

/**
 * Get admin dashboard metrics
 * @route GET /api/dashboard/summary
 * @access Admin only
 */
exports.getAdminMetrics = async (req, res) => {
  try {
    // Get time period from query
    const { timePeriod = 'month' } = req.query;
    
    // Get date range for metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Calculate date ranges based on time period
    let startDate;
    
    switch(timePeriod) {
      case 'day':
        startDate = today;
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Start of month
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1); // Start of year
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Default to month
    }
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get total services count
    const totalServices = await prisma.service.count();
    
    // Get active services count (not completed or cancelled)
    const activeServices = await prisma.service.count({
      where: {
        status: {
          notIn: ['COMPLETED', 'CANCELLED']
        }
      }
    });
    
    // Get services completed today
    const completedToday = await prisma.service.count({
      where: {
        status: 'COMPLETED',
        updatedAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    
    // Get pending pickup services
    const pendingPickup = await prisma.service.count({
      where: {
        status: 'PENDING_PICKUP'
      }
    });
    
    // Get revenue metrics
    const todayRevenue = await prisma.transaction.aggregate({
      where: {
        type: 'INCOME',
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: {
        amount: true
      }
    });
    
    const weekRevenue = await prisma.transaction.aggregate({
      where: {
        type: 'INCOME',
        date: {
          gte: weekStart,
          lt: tomorrow
        }
      },
      _sum: {
        amount: true
      }
    });
    
    const monthRevenue = await prisma.transaction.aggregate({
      where: {
        type: 'INCOME',
        date: {
          gte: monthStart,
          lt: tomorrow
        }
      },
      _sum: {
        amount: true
      }
    });
    
    // Get expense metrics
    const todayExpenses = await prisma.transaction.aggregate({
      where: {
        type: 'EXPENSE',
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: {
        amount: true
      }
    });
    
    const weekExpenses = await prisma.transaction.aggregate({
      where: {
        type: 'EXPENSE',
        date: {
          gte: weekStart,
          lt: tomorrow
        }
      },
      _sum: {
        amount: true
      }
    });
    
    const monthExpenses = await prisma.transaction.aggregate({
      where: {
        type: 'EXPENSE',
        date: {
          gte: monthStart,
          lt: tomorrow
        }
      },
      _sum: {
        amount: true
      }
    });
    
    // Calculate profit margin
    const monthIncome = monthRevenue._sum.amount || 0;
    const monthExpense = monthExpenses._sum.amount || 0;
    const profitMargin = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;
    
    // Get services by status
    const servicesByStatus = await prisma.service.groupBy({
      by: ['status'],
      _count: true
    });
    
    // Format services by status
    const statusCounts = {
      PENDING_PICKUP: 0,
      PICKED_UP: 0,
      LABELED: 0,
      IN_PROCESS: 0,
      PARTIAL_DELIVERY: 0,
      COMPLETED: 0,
      CANCELLED: 0
    };
    
    servicesByStatus.forEach(status => {
      statusCounts[status.status] = status._count;
    });
    
    // Get top hotels by revenue
    const topHotels = await prisma.transaction.groupBy({
      by: ['hotelId'],
      where: {
        type: 'INCOME',
        hotelId: {
          not: null
        },
        date: {
          gte: monthStart
        }
      },
      _sum: {
        amount: true
      },
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      },
      take: 5
    });
    
    // Get hotel details for top hotels
    const topHotelsWithDetails = await Promise.all(
      topHotels.map(async (hotel) => {
        if (!hotel.hotelId) return null;
        
        const hotelData = await prisma.hotel.findUnique({
          where: { id: hotel.hotelId },
          select: {
            id: true,
            name: true
          }
        });
        
        const serviceCount = await prisma.service.count({
          where: {
            hotelId: hotel.hotelId,
            createdAt: {
              gte: monthStart
            }
          }
        });
        
        return {
          id: hotel.hotelId,
          name: hotelData?.name || 'Unknown Hotel',
          revenue: hotel._sum.amount,
          services: serviceCount
        };
      })
    );
    
    // Filter out any null entries from the results
    const filteredTopHotels = topHotelsWithDetails.filter(hotel => hotel !== null);
    
    // Get zone performance
    const zonePerformance = await prisma.$queryRaw`
      SELECT 
        h.zone,
        COUNT(s.id) as services,
        AVG(EXTRACT(EPOCH FROM (s."deliveryDate" - s."pickupDate")) / 3600) as avgProcessingHours
      FROM "Service" s
      JOIN "Hotel" h ON s."hotelId" = h.id
      WHERE s.status = 'COMPLETED'
      AND s."deliveryDate" IS NOT NULL
      AND s."pickupDate" IS NOT NULL
      AND s."createdAt" >= ${monthStart}
      GROUP BY h.zone
      ORDER BY services DESC
    `;
    
    // Format zone performance data
    const formattedZonePerformance = zonePerformance.map(zone => ({
      zone: zone.zone,
      services: Number(zone.services),
      avgTime: zone.avgprocessinghours ? Math.round(Number(zone.avgprocessinghours) * 10) / 10 : 0
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        totalServices,
        activeServices,
        completedToday,
        pendingPickup,
        revenue: {
          today: todayRevenue._sum.amount || 0,
          week: weekRevenue._sum.amount || 0,
          month: monthRevenue._sum.amount || 0
        },
        expenses: {
          today: todayExpenses._sum.amount || 0,
          week: weekExpenses._sum.amount || 0,
          month: monthExpenses._sum.amount || 0
        },
        profitMargin: Math.round(profitMargin * 100) / 100,
        servicesByStatus: statusCounts,
        topHotels: filteredTopHotels,
        zonePerformance: formattedZonePerformance
      }
    });
  } catch (error) {
    console.error('Error getting admin metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener métricas de administrador',
      error: error.message
    });
  }
};

/**
 * Get repartidor dashboard metrics
 * @route GET /api/dashboard/repartidor
 * @access Repartidor
 */
exports.getRepartidorMetrics = async (req, res) => {
  try {
    const { zone } = req.user;
    
    // Get date range for metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get assigned services count
    const assignedServices = await prisma.service.count({
      where: {
        OR: [
          { repartidorId: req.user.id },
          { deliveryRepartidorId: req.user.id }
        ],
        status: {
          notIn: ['COMPLETED', 'CANCELLED']
        }
      }
    });
    
    // Get services picked up today by this repartidor
    const pickedUpToday = await prisma.service.count({
      where: {
        repartidorId: req.user.id,
        status: {
          in: ['PICKED_UP', 'LABELED', 'IN_PROCESS', 'PARTIAL_DELIVERY', 'COMPLETED']
        },
        pickupDate: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    
    // Get services delivered today by this repartidor
    const deliveredToday = await prisma.service.count({
      where: {
        deliveryRepartidorId: req.user.id,
        status: {
          in: ['COMPLETED', 'PARTIAL_DELIVERY']
        },
        deliveryDate: {
          gte: today,
          lt: tomorrow
        }
      }
    });
    
    // Get pending pickup services in repartidor's zone
    const pendingPickupInZone = await prisma.service.count({
      where: {
        status: 'PENDING_PICKUP',
        hotel: {
          zone
        }
      }
    });
    
    // Get pending delivery services for this repartidor
    const pendingDelivery = await prisma.service.count({
      where: {
        status: 'IN_PROCESS',
        hotel: {
          zone
        }
      }
    });
    
    // Get services by status for this repartidor
    const servicesByStatus = await prisma.service.groupBy({
      by: ['status'],
      where: {
        OR: [
          { repartidorId: req.user.id },
          { deliveryRepartidorId: req.user.id }
        ]
      },
      _count: true
    });
    
    // Format services by status
    const statusCounts = {
      PENDING_PICKUP: 0,
      PICKED_UP: 0,
      LABELED: 0,
      IN_PROCESS: 0,
      PARTIAL_DELIVERY: 0,
      COMPLETED: 0,
      CANCELLED: 0
    };
    
    servicesByStatus.forEach(status => {
      statusCounts[status.status] = status._count;
    });
    
    // Get recent services
    const recentServices = await prisma.service.findMany({
      where: {
        OR: [
          { repartidorId: req.user.id },
          { deliveryRepartidorId: req.user.id }
        ]
      },
      include: {
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
    
    // Get hotels in zone
    const hotelsInZone = await prisma.hotel.findMany({
      where: {
        zone
      },
      select: {
        id: true,
        name: true,
        address: true,
        bagInventory: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    // Get hotels with low inventory
    const lowInventoryHotels = hotelsInZone.filter(hotel => hotel.bagInventory < 20);
    
    // Calculate performance metrics
    const monthlyCompletedServices = await prisma.service.count({
      where: {
        OR: [
          { repartidorId: req.user.id },
          { deliveryRepartidorId: req.user.id }
        ],
        status: 'COMPLETED',
        updatedAt: {
          gte: monthStart
        }
      }
    });
    
    const weeklyCompletedServices = await prisma.service.count({
      where: {
        OR: [
          { repartidorId: req.user.id },
          { deliveryRepartidorId: req.user.id }
        ],
        status: 'COMPLETED',
        updatedAt: {
          gte: weekStart
        }
      }
    });
    
    return res.status(200).json({
      success: true,
      data: {
        assignedServices,
        pickedUpToday,
        deliveredToday,
        pendingPickupInZone,
        pendingDelivery,
        servicesByStatus: statusCounts,
        recentServices,
        hotelsInZone,
        lowInventoryHotels,
        performance: {
          monthlyCompleted: monthlyCompletedServices,
          weeklyCompleted: weeklyCompletedServices,
          dailyCompleted: deliveredToday
        }
      }
    });
  } catch (error) {
    console.error('Error getting repartidor metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener métricas de repartidor',
      error: error.message
    });
  }
};

/**
 * Get financial metrics
 * @route GET /api/dashboard/financial
 * @access Admin only
 */
exports.getFinancialMetrics = async (req, res) => {
  try {
    // Get date range for metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const yearStart = new Date(today.getFullYear(), 0, 1);
    
    // Get daily revenue for the last 30 days
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);
    
    const dailyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', date) as day,
        SUM(amount) as revenue
      FROM "Transaction"
      WHERE type = 'INCOME'
      AND date >= ${last30Days}
      GROUP BY DATE_TRUNC('day', date)
      ORDER BY day ASC
    `;
    
    // Get daily expenses for the last 30 days
    const dailyExpenses = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', date) as day,
        SUM(amount) as expenses
      FROM "Transaction"
      WHERE type = 'EXPENSE'
      AND date >= ${last30Days}
      GROUP BY DATE_TRUNC('day', date)
      ORDER BY day ASC
    `;
    
    // Get monthly revenue and expenses for the year
    const monthlyFinancials = await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM date) as month,
        type,
        SUM(amount) as amount
      FROM "Transaction"
      WHERE date >= ${yearStart}
      GROUP BY EXTRACT(MONTH FROM date), type
      ORDER BY month ASC
    `;
    
    // Format monthly financials
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const formattedMonthlyFinancials = months.map(month => {
      const income = monthlyFinancials.find(m => 
        m.month === month && m.type === 'INCOME'
      );
      
      const expense = monthlyFinancials.find(m => 
        m.month === month && m.type === 'EXPENSE'
      );
      
      return {
        month,
        revenue: income ? Number(income.amount) : 0,
        expenses: expense ? Number(expense.amount) : 0,
        profit: (income ? Number(income.amount) : 0) - (expense ? Number(expense.amount) : 0)
      };
    });
    
    // Get revenue by category
    const revenueByCategory = await prisma.$queryRaw`
      SELECT 
        "incomeCategory" as category,
        SUM(amount) as amount
      FROM "Transaction"
      WHERE type = 'INCOME'
      AND date >= ${yearStart}
      GROUP BY "incomeCategory"
      ORDER BY amount DESC
    `;
    
    // Get expenses by category
    const expensesByCategory = await prisma.$queryRaw`
      SELECT 
        "expenseCategory" as category,
        SUM(amount) as amount
      FROM "Transaction"
      WHERE type = 'EXPENSE'
      AND date >= ${yearStart}
      GROUP BY "expenseCategory"
      ORDER BY amount DESC
    `;
    
    // Get revenue and expenses for each zone
    const financialsByZone = await prisma.$queryRaw`
      SELECT 
        h.zone,
        t.type,
        SUM(t.amount) as amount
      FROM "Transaction" t
      JOIN "Hotel" h ON t."hotelId" = h.id
      WHERE t.date >= ${yearStart}
      AND t."hotelId" IS NOT NULL
      GROUP BY h.zone, t.type
      ORDER BY h.zone, t.type
    `;
    
    // Format financials by zone
    const zones = ['NORTE', 'SUR', 'CENTRO', 'ESTE', 'OESTE'];
    const formattedFinancialsByZone = zones.map(zone => {
      const income = financialsByZone.find(f => 
        f.zone === zone && f.type === 'INCOME'
      );
      
      const expense = financialsByZone.find(f => 
        f.zone === zone && f.type === 'EXPENSE'
      );
      
      return {
        zone,
        revenue: income ? Number(income.amount) : 0,
        expenses: expense ? Number(expense.amount) : 0,
        profit: (income ? Number(income.amount) : 0) - (expense ? Number(expense.amount) : 0)
      };
    });
    
    // Calculate summary metrics
    const totalRevenue = await prisma.transaction.aggregate({
      where: {
        type: 'INCOME',
        date: {
          gte: yearStart
        }
      },
      _sum: {
        amount: true
      }
    });
    
    const totalExpenses = await prisma.transaction.aggregate({
      where: {
        type: 'EXPENSE',
        date: {
          gte: yearStart
        }
      },
      _sum: {
        amount: true
      }
    });
    
    const revenue = totalRevenue._sum.amount || 0;
    const expenses = totalExpenses._sum.amount || 0;
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        summary: {
          revenue,
          expenses,
          profit,
          profitMargin: Math.round(profitMargin * 100) / 100
        },
        dailyRevenue: dailyRevenue.map(day => ({
          day: day.day,
          revenue: Number(day.revenue)
        })),
        dailyExpenses: dailyExpenses.map(day => ({
          day: day.day,
          expenses: Number(day.expenses)
        })),
        monthlyFinancials: formattedMonthlyFinancials,
        revenueByCategory: revenueByCategory.map(cat => ({
          category: cat.category,
          amount: Number(cat.amount)
        })),
        expensesByCategory: expensesByCategory.map(cat => ({
          category: cat.category,
          amount: Number(cat.amount)
        })),
        financialsByZone: formattedFinancialsByZone
      }
    });
  } catch (error) {
    console.error('Error getting financial metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener métricas financieras',
      error: error.message
    });
  }
};

/**
 * Get operational KPIs
 * @route GET /api/dashboard/operational
 * @access Admin only
 */
exports.getOperationalKPIs = async (req, res) => {
  try {
    // Get date range for metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);
    
    // Get total services count
    const totalServices = await prisma.service.count({
      where: {
        createdAt: {
          gte: yearStart
        }
      }
    });
    
    // Get completed services count
    const completedServices = await prisma.service.count({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: yearStart
        }
      }
    });
    
    // Get cancelled services count
    const cancelledServices = await prisma.service.count({
      where: {
        status: 'CANCELLED',
        createdAt: {
          gte: yearStart
        }
      }
    });
    
    // Calculate completion rate
    const completionRate = totalServices > 0 ? 
      (completedServices / totalServices) * 100 : 0;
    
    // Calculate cancellation rate
    const cancellationRate = totalServices > 0 ? 
      (cancelledServices / totalServices) * 100 : 0;
    
    // Get average processing time (pickup to delivery)
    const avgProcessingTime = await prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM ("deliveryDate" - "pickupDate")) / 3600) as hours
      FROM "Service"
      WHERE status = 'COMPLETED'
      AND "deliveryDate" IS NOT NULL
      AND "pickupDate" IS NOT NULL
      AND "createdAt" >= ${yearStart}
    `;
    
    const processingHours = avgProcessingTime[0]?.hours || 0;
    
    // Get total weight processed
    const totalWeight = await prisma.service.aggregate({
      where: {
        createdAt: {
          gte: yearStart
        },
        weight: {
          not: null
        }
      },
      _sum: {
        weight: true
      }
    });
    
    // Get average service value
    const avgServiceValue = await prisma.service.aggregate({
      where: {
        createdAt: {
          gte: yearStart
        },
        price: {
          not: null
        }
      },
      _avg: {
        price: true
      }
    });
    
    // Get services per hotel
    const servicesPerHotel = await prisma.$queryRaw`
      SELECT 
        h.name as hotel,
        COUNT(s.id) as services,
        SUM(s.weight) as weight,
        AVG(s.price) as avgValue
      FROM "Service" s
      JOIN "Hotel" h ON s."hotelId" = h.id
      WHERE s."createdAt" >= ${yearStart}
      GROUP BY h.name
      ORDER BY services DESC
      LIMIT 10
    `;
    
    // Get services by repartidor
    const servicesByRepartidor = await prisma.$queryRaw`
      SELECT 
        u.name as repartidor,
        COUNT(s.id) as services,
        SUM(CASE WHEN s.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
      FROM "Service" s
      JOIN "User" u ON s."repartidorId" = u.id
      WHERE s."createdAt" >= ${yearStart}
      GROUP BY u.name
      ORDER BY services DESC
    `;
    
    // Get monthly service volume
    const monthlyServiceVolume = await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM "createdAt") as month,
        COUNT(id) as services,
        SUM(weight) as weight
      FROM "Service"
      WHERE "createdAt" >= ${yearStart}
      GROUP BY EXTRACT(MONTH FROM "createdAt")
      ORDER BY month ASC
    `;
    
    // Format monthly service volume
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const formattedMonthlyVolume = months.map(month => {
      const data = monthlyServiceVolume.find(m => m.month === month);
      
      return {
        month,
        services: data ? Number(data.services) : 0,
        weight: data ? Number(data.weight) : 0
      };
    });
    
    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalServices,
          completedServices,
          cancelledServices,
          completionRate: Math.round(completionRate * 100) / 100,
          cancellationRate: Math.round(cancellationRate * 100) / 100,
          avgProcessingTime: Math.round(Number(processingHours) * 10) / 10,
          totalWeight: Math.round((totalWeight._sum.weight || 0) * 100) / 100,
          avgServiceValue: Math.round((avgServiceValue._avg.price || 0) * 100) / 100
        },
        servicesPerHotel: servicesPerHotel.map(h => ({
          hotel: h.hotel,
          services: Number(h.services),
          weight: h.weight ? Math.round(Number(h.weight) * 100) / 100 : 0,
          avgValue: h.avgvalue ? Math.round(Number(h.avgvalue) * 100) / 100 : 0
        })),
        servicesByRepartidor: servicesByRepartidor.map(r => ({
          repartidor: r.repartidor,
          services: Number(r.services),
          completed: Number(r.completed),
          completionRate: r.services > 0 ? Math.round((Number(r.completed) / Number(r.services)) * 1000) / 10 : 0
        })),
        monthlyServiceVolume: formattedMonthlyVolume
      }
    });
  } catch (error) {
    console.error('Error getting operational KPIs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener KPIs operativos',
      error: error.message
    });
  }
};

/**
 * Get services by status
 * @route GET /api/dashboard/services-by-status
 * @access Private
 */
exports.getServicesByStatus = async (req, res) => {
  try {
    const { zone } = req.query;
    const where = {};
    
    // Filter by zone if provided or if user is repartidor
    if (zone) {
      where.hotel = {
        zone
      };
    } else if (req.user.role === 'REPARTIDOR') {
      where.hotel = {
        zone: req.user.zone
      };
    }
    
    // Get services by status
    const servicesByStatus = await prisma.service.groupBy({
      by: ['status'],
      where,
      _count: true
    });
    
    // Format response
    const statusCounts = {
      PENDING_PICKUP: 0,
      PICKED_UP: 0,
      LABELED: 0,
      IN_PROCESS: 0,
      PARTIAL_DELIVERY: 0,
      COMPLETED: 0,
      CANCELLED: 0
    };
    
    servicesByStatus.forEach(status => {
      statusCounts[status.status] = status._count;
    });
    
    return res.status(200).json({
      success: true,
      data: statusCounts
    });
  } catch (error) {
    console.error('Error getting services by status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener servicios por estado',
      error: error.message
    });
  }
};

/**
 * Get zone performance
 * @route GET /api/dashboard/zone-performance
 * @access Admin only
 */
exports.getZonePerformance = async (req, res) => {
  try {
    // Get date range for metrics
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get zone performance metrics
    const zonePerformance = await prisma.$queryRaw`
      SELECT 
        h.zone,
        COUNT(s.id) as services,
        AVG(EXTRACT(EPOCH FROM (s."deliveryDate" - s."pickupDate")) / 3600) as avgProcessingHours,
        SUM(s.weight) as totalWeight,
        SUM(s.price) as totalRevenue,
        COUNT(CASE WHEN s.status = 'COMPLETED' THEN 1 END) as completedServices,
        COUNT(CASE WHEN s.status = 'CANCELLED' THEN 1 END) as cancelledServices
      FROM "Service" s
      JOIN "Hotel" h ON s."hotelId" = h.id
      WHERE s."createdAt" >= ${monthStart}
      GROUP BY h.zone
      ORDER BY services DESC
    `;
    
    // Format zone performance data
    const formattedZonePerformance = zonePerformance.map(zone => {
      const services = Number(zone.services) || 0;
      const completedServices = Number(zone.completedservices) || 0;
      const cancelledServices = Number(zone.cancelledservices) || 0;
      
      return {
        zone: zone.zone,
        services,
        avgProcessingTime: zone.avgprocessinghours ? Math.round(Number(zone.avgprocessinghours) * 10) / 10 : 0,
        totalWeight: zone.totalweight ? Math.round(Number(zone.totalweight) * 100) / 100 : 0,
        totalRevenue: zone.totalrevenue ? Math.round(Number(zone.totalrevenue) * 100) / 100 : 0,
        completionRate: services > 0 ? Math.round((completedServices / services) * 1000) / 10 : 0,
        cancellationRate: services > 0 ? Math.round((cancelledServices / services) * 1000) / 10 : 0
      };
    });
    
    // Get active repartidores by zone
    const repartidoresByZone = await prisma.user.groupBy({
      by: ['zone'],
      where: {
        role: 'REPARTIDOR'
      },
      _count: true
    });
    
    // Format repartidores by zone
    const formattedRepartidoresByZone = {};
    
    repartidoresByZone.forEach(zone => {
      formattedRepartidoresByZone[zone.zone] = zone._count;
    });
    
    // Add repartidor count to zone performance data
    const zonePerformanceWithRepartidores = formattedZonePerformance.map(zone => ({
      ...zone,
      repartidores: formattedRepartidoresByZone[zone.zone] || 0,
      servicesPerRepartidor: formattedRepartidoresByZone[zone.zone] 
        ? Math.round(zone.services / formattedRepartidoresByZone[zone.zone] * 10) / 10 
        : 0
    }));
    
    return res.status(200).json({
      success: true,
      data: zonePerformanceWithRepartidores
    });
  } catch (error) {
    console.error('Error getting zone performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener rendimiento por zona',
      error: error.message
    });
  }
};

module.exports = exports;