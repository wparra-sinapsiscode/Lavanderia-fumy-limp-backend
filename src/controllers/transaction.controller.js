/**
 * Transaction controller for Fumy Limp Backend
 */

const { prisma } = require('../config/database');
const { AUDIT_ACTIONS } = require('../config/constants');

/**
 * Create a new transaction
 * @route POST /api/transactions
 * @access Admin only
 */
exports.createTransaction = async (req, res) => {
  try {
    const {
      type,
      amount,
      incomeCategory,
      expenseCategory,
      description,
      date,
      paymentMethod,
      hotelId,
      serviceId,
      notes
    } = req.body;
    
    // Validate transaction type
    if (type !== 'INCOME' && type !== 'EXPENSE') {
      return res.status(400).json({
        success: false,
        message: 'Tipo de transacción inválido'
      });
    }
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a 0'
      });
    }
    
    // Validate category based on type
    if (type === 'INCOME' && !incomeCategory) {
      return res.status(400).json({
        success: false,
        message: 'La categoría de ingreso es requerida'
      });
    }
    
    if (type === 'EXPENSE' && !expenseCategory) {
      return res.status(400).json({
        success: false,
        message: 'La categoría de gasto es requerida'
      });
    }
    
    // Validate hotel if provided
    if (hotelId) {
      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId }
      });
      
      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: 'Hotel no encontrado'
        });
      }
    }
    
    // Validate service if provided
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });
      
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }
    }
    
    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        incomeCategory: type === 'INCOME' ? incomeCategory : null,
        expenseCategory: type === 'EXPENSE' ? expenseCategory : null,
        description,
        date: new Date(date),
        paymentMethod,
        hotelId,
        serviceId,
        notes,
        registeredById: req.user.id
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.TRANSACTION_CREATED,
        entity: 'transaction',
        entityId: transaction.id,
        details: `Transacción creada: ${type}, ${amount}, ${description}`,
        userId: req.user.id,
        transactionId: transaction.id
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Transacción creada exitosamente',
      data: transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear transacción',
      error: error.message
    });
  }
};

/**
 * Get all transactions with optional filtering
 * @route GET /api/transactions
 * @access Admin only
 */
exports.getTransactions = async (req, res) => {
  try {
    const {
      type,
      incomeCategory,
      expenseCategory,
      dateFrom,
      dateTo,
      hotelId,
      serviceId,
      limit = 100,
      offset = 0
    } = req.query;
    
    // Build where clause
    const where = {};
    
    if (type) {
      where.type = type;
    }
    
    if (type === 'INCOME' && incomeCategory) {
      where.incomeCategory = incomeCategory;
    }
    
    if (type === 'EXPENSE' && expenseCategory) {
      where.expenseCategory = expenseCategory;
    }
    
    if (dateFrom || dateTo) {
      where.date = {};
      
      if (dateFrom) {
        where.date.gte = new Date(dateFrom);
      }
      
      if (dateTo) {
        where.date.lte = new Date(dateTo);
      }
    }
    
    if (hotelId) {
      where.hotelId = hotelId;
    }
    
    if (serviceId) {
      where.serviceId = serviceId;
    }
    
    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        },
        service: {
          select: {
            id: true,
            guestName: true,
            roomNumber: true,
            status: true
          }
        },
        registeredBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      skip: parseInt(offset),
      take: parseInt(limit)
    });
    
    // Get total count for pagination
    const totalCount = await prisma.transaction.count({ where });
    
    return res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      data: transactions
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener transacciones',
      error: error.message
    });
  }
};

/**
 * Get transaction by ID
 * @route GET /api/transactions/:id
 * @access Admin only
 */
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        },
        service: {
          select: {
            id: true,
            guestName: true,
            roomNumber: true,
            status: true
          }
        },
        registeredBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        auditLogs: {
          select: {
            id: true,
            action: true,
            details: true,
            timestamp: true,
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        }
      }
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener transacción',
      error: error.message
    });
  }
};

/**
 * Update transaction
 * @route PUT /api/transactions/:id
 * @access Admin only
 */
exports.updateTransaction = async (req, res) => {
  try {
    const {
      description,
      notes,
      paymentMethod
    } = req.body;
    
    // Check if transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id }
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }
    
    // Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        description: description || transaction.description,
        notes: notes || transaction.notes,
        paymentMethod: paymentMethod || transaction.paymentMethod,
        updatedAt: new Date()
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.TRANSACTION_UPDATED,
        entity: 'transaction',
        entityId: transaction.id,
        details: `Transacción actualizada: ${transaction.id}`,
        userId: req.user.id,
        transactionId: transaction.id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Transacción actualizada exitosamente',
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar transacción',
      error: error.message
    });
  }
};

/**
 * Delete transaction
 * @route DELETE /api/transactions/:id
 * @access Admin only
 */
exports.deleteTransaction = async (req, res) => {
  try {
    // Check if transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id }
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }
    
    // Create audit log before deletion
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.TRANSACTION_DELETED,
        entity: 'transaction',
        entityId: transaction.id,
        details: `Transacción eliminada: ${transaction.type}, ${transaction.amount}, ${transaction.description}`,
        userId: req.user.id
      }
    });
    
    // Delete transaction
    await prisma.transaction.delete({
      where: { id: req.params.id }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Transacción eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar transacción',
      error: error.message
    });
  }
};

/**
 * Get financial summary
 * @route GET /api/transactions/summary
 * @access Admin only
 */
exports.getFinancialSummary = async (req, res) => {
  try {
    const { period = 'month', dateFrom, dateTo } = req.query;
    
    // Define date range
    let startDate, endDate;
    
    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
    } else {
      const now = new Date();
      
      if (period === 'day') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (period === 'week') {
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - dayOfWeek));
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (period === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 0);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Período inválido. Usar: day, week, month, year'
        });
      }
    }
    
    // Get total income
    const totalIncome = await prisma.transaction.aggregate({
      where: {
        type: 'INCOME',
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    });
    
    // Get total expenses
    const totalExpenses = await prisma.transaction.aggregate({
      where: {
        type: 'EXPENSE',
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    });
    
    // Get income by category
    const incomeByCategory = await prisma.transaction.groupBy({
      by: ['incomeCategory'],
      where: {
        type: 'INCOME',
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    });
    
    // Get expenses by category
    const expensesByCategory = await prisma.transaction.groupBy({
      by: ['expenseCategory'],
      where: {
        type: 'EXPENSE',
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    });
    
    // Get hotels with most income
    const topHotels = await prisma.transaction.groupBy({
      by: ['hotelId'],
      where: {
        type: 'INCOME',
        hotelId: {
          not: null
        },
        date: {
          gte: startDate,
          lte: endDate
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
    const hotelsWithDetails = await Promise.all(
      topHotels.map(async (hotel) => {
        const hotelDetails = await prisma.hotel.findUnique({
          where: { id: hotel.hotelId },
          select: {
            id: true,
            name: true,
            zone: true
          }
        });
        
        return {
          ...hotelDetails,
          totalIncome: hotel._sum.amount
        };
      })
    );
    
    // Calculate profit
    const income = totalIncome._sum.amount || 0;
    const expenses = totalExpenses._sum.amount || 0;
    const profit = income - expenses;
    const profitMargin = income > 0 ? (profit / income) * 100 : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        period,
        dateRange: {
          from: startDate,
          to: endDate
        },
        summary: {
          income,
          expenses,
          profit,
          profitMargin: Math.round(profitMargin * 100) / 100
        },
        incomeByCategory: incomeByCategory.map(category => ({
          category: category.incomeCategory,
          amount: category._sum.amount
        })),
        expensesByCategory: expensesByCategory.map(category => ({
          category: category.expenseCategory,
          amount: category._sum.amount
        })),
        topHotels: hotelsWithDetails
      }
    });
  } catch (error) {
    console.error('Error getting financial summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener resumen financiero',
      error: error.message
    });
  }
};

/**
 * Get daily report
 * @route GET /api/transactions/report/daily
 * @access Admin only
 */
exports.getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    
    // Define date range
    let startDate, endDate;
    
    if (date) {
      // Usar fecha específica con comparación exacta
      const dateStr = date.includes('T') ? date.split('T')[0] : date;
      startDate = new Date(dateStr + 'T00:00:00.000Z');
      endDate = new Date(dateStr + 'T24:00:00.000Z');
    } else {
      // Usar fecha de hoy con comparación exacta
      const todayStr = new Date().toISOString().split('T')[0];
      startDate = new Date(todayStr + 'T00:00:00.000Z');
      endDate = new Date(todayStr + 'T24:00:00.000Z');
    }
    
    // Get all transactions for the day
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        },
        service: {
          select: {
            id: true,
            guestName: true,
            roomNumber: true,
            status: true
          }
        },
        registeredBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Group by hour
    const hourlyData = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const hourTransactions = transactions.filter(t => {
        const tHour = new Date(t.date).getHours();
        return tHour === hour;
      });
      
      const hourIncome = hourTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const hourExpenses = hourTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);
      
      hourlyData.push({
        hour,
        income: hourIncome,
        expenses: hourExpenses,
        net: hourIncome - hourExpenses,
        transactionCount: hourTransactions.length
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        date: startDate,
        summary: {
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          transactionCount: transactions.length
        },
        hourlyData,
        transactions
      }
    });
  } catch (error) {
    console.error('Error getting daily report:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener reporte diario',
      error: error.message
    });
  }
};

/**
 * Get monthly report
 * @route GET /api/transactions/report/monthly
 * @access Admin only
 */
exports.getMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Parse month and year or default to current
    const reportMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Define date range
    const startDate = new Date(reportYear, reportMonth, 1);
    const endDate = new Date(reportYear, reportMonth + 1, 0);
    
    // Get all transactions for the month
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Group by day
    const dailyData = [];
    const daysInMonth = new Date(reportYear, reportMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTransactions = transactions.filter(t => {
        const tDay = new Date(t.date).getDate();
        return tDay === day;
      });
      
      const dayIncome = dayTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const dayExpenses = dayTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);
      
      dailyData.push({
        day,
        date: new Date(reportYear, reportMonth, day),
        income: dayIncome,
        expenses: dayExpenses,
        net: dayIncome - dayExpenses,
        transactionCount: dayTransactions.length
      });
    }
    
    // Get income by category
    const incomeByCategory = {};
    const expensesByCategory = {};
    
    transactions.forEach(t => {
      if (t.type === 'INCOME' && t.incomeCategory) {
        incomeByCategory[t.incomeCategory] = (incomeByCategory[t.incomeCategory] || 0) + t.amount;
      } else if (t.type === 'EXPENSE' && t.expenseCategory) {
        expensesByCategory[t.expenseCategory] = (expensesByCategory[t.expenseCategory] || 0) + t.amount;
      }
    });
    
    // Format categories
    const incomeCategoriesFormatted = Object.entries(incomeByCategory).map(([category, amount]) => ({
      category,
      amount,
      percentage: Math.round((amount / totalIncome) * 10000) / 100
    }));
    
    const expenseCategoriesFormatted = Object.entries(expensesByCategory).map(([category, amount]) => ({
      category,
      amount,
      percentage: Math.round((amount / totalExpenses) * 10000) / 100
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        month: reportMonth + 1,
        year: reportYear,
        summary: {
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          profitMargin: totalIncome > 0 ? Math.round((totalIncome - totalExpenses) / totalIncome * 10000) / 100 : 0,
          transactionCount: transactions.length
        },
        dailyData,
        incomeByCategory: incomeCategoriesFormatted,
        expensesByCategory: expenseCategoriesFormatted
      }
    });
  } catch (error) {
    console.error('Error getting monthly report:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener reporte mensual',
      error: error.message
    });
  }
};

/**
 * Get hotel report
 * @route GET /api/transactions/report/hotel/:hotelId
 * @access Admin only
 */
exports.getHotelReport = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { dateFrom, dateTo } = req.query;
    
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
    
    // Define date range
    let startDate, endDate;
    
    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    // Get hotel transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        hotelId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        service: {
          select: {
            id: true,
            guestName: true,
            roomNumber: true,
            status: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    // Get hotel services
    const services = await prisma.service.findMany({
      where: {
        hotelId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        guestName: true,
        roomNumber: true,
        status: true,
        weight: true,
        price: true,
        createdAt: true,
        bagCount: true
      }
    });
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalServices = services.length;
    const totalWeight = services.reduce((sum, s) => sum + (s.weight || 0), 0);
    const averagePrice = totalServices > 0 ? 
      services.reduce((sum, s) => sum + (s.price || 0), 0) / totalServices : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        hotel: {
          id: hotel.id,
          name: hotel.name,
          zone: hotel.zone
        },
        dateRange: {
          from: startDate,
          to: endDate
        },
        summary: {
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          totalServices,
          totalWeight: Math.round(totalWeight * 100) / 100,
          averagePrice: Math.round(averagePrice * 100) / 100,
          transactionCount: transactions.length
        },
        transactions,
        services
      }
    });
  } catch (error) {
    console.error('Error getting hotel report:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener reporte de hotel',
      error: error.message
    });
  }
};

module.exports = exports;