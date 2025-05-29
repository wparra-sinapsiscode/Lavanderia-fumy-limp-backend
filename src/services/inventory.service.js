/**
 * Inventory management service for Fumy Limp Backend
 */

const { prisma } = require('../config/database');
const { AUDIT_ACTIONS } = require('../config/constants');

/**
 * Check if hotel has enough inventory for requested bags
 * @param {string} hotelId - Hotel ID
 * @param {number} requestedBags - Number of bags requested
 * @returns {Promise<boolean>} True if inventory is sufficient, false otherwise
 */
exports.checkInventory = async (hotelId, requestedBags) => {
  try {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) {
      throw new Error('Hotel not found');
    }
    
    return hotel.bagInventory >= requestedBags;
  } catch (error) {
    console.error('Error checking inventory:', error);
    throw error;
  }
};

/**
 * Reduce hotel inventory by specified number of bags
 * @param {string} hotelId - Hotel ID
 * @param {number} bags - Number of bags to reduce
 * @param {string} userId - User ID making the change
 * @param {string} serviceId - Optional service ID associated with the change
 * @returns {Promise<Object>} Updated hotel with new inventory
 */
exports.reduceInventory = async (hotelId, bags, userId, serviceId = null) => {
  try {
    // Get current inventory for audit log
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) {
      throw new Error('Hotel not found');
    }
    
    // Check if reduction is possible
    if (hotel.bagInventory < bags) {
      throw new Error(`Insufficient inventory. Available: ${hotel.bagInventory} bags`);
    }
    
    // Update inventory
    const updatedHotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        bagInventory: {
          decrement: bags
        }
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.HOTEL_INVENTORY_UPDATED,
        entity: 'hotel',
        entityId: hotelId,
        details: `Inventory reduced by ${bags} bags (${hotel.bagInventory} → ${updatedHotel.bagInventory})${serviceId ? ` for service ${serviceId}` : ''}`,
        userId,
        serviceId
      }
    });
    
    // Check if inventory is low after update
    const inventoryStatus = exports.checkInventoryStatus(updatedHotel);
    
    return {
      hotel: updatedHotel,
      inventoryStatus
    };
  } catch (error) {
    console.error('Error reducing inventory:', error);
    throw error;
  }
};

/**
 * Increase hotel inventory by specified number of bags
 * @param {string} hotelId - Hotel ID
 * @param {number} bags - Number of bags to add
 * @param {string} userId - User ID making the change
 * @param {string} reason - Reason for inventory increase
 * @returns {Promise<Object>} Updated hotel with new inventory
 */
exports.increaseInventory = async (hotelId, bags, userId, reason = '') => {
  try {
    // Get current inventory for audit log
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) {
      throw new Error('Hotel not found');
    }
    
    // Update inventory
    const updatedHotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        bagInventory: {
          increment: bags
        }
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.HOTEL_INVENTORY_UPDATED,
        entity: 'hotel',
        entityId: hotelId,
        details: `Inventory increased by ${bags} bags (${hotel.bagInventory} → ${updatedHotel.bagInventory})${reason ? `: ${reason}` : ''}`,
        userId
      }
    });
    
    return {
      hotel: updatedHotel,
      inventoryStatus: exports.checkInventoryStatus(updatedHotel)
    };
  } catch (error) {
    console.error('Error increasing inventory:', error);
    throw error;
  }
};

/**
 * Set hotel inventory to specific amount
 * @param {string} hotelId - Hotel ID
 * @param {number} newInventory - New inventory amount
 * @param {string} userId - User ID making the change
 * @param {string} reason - Reason for inventory change
 * @returns {Promise<Object>} Updated hotel with new inventory
 */
exports.setInventory = async (hotelId, newInventory, userId, reason = '') => {
  try {
    // Get current inventory for audit log
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) {
      throw new Error('Hotel not found');
    }
    
    // Validate inventory amount
    if (newInventory < 0) {
      throw new Error('Inventory cannot be negative');
    }
    
    // Update inventory
    const updatedHotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        bagInventory: newInventory
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.HOTEL_INVENTORY_UPDATED,
        entity: 'hotel',
        entityId: hotelId,
        details: `Inventory set to ${newInventory} bags (was ${hotel.bagInventory})${reason ? `: ${reason}` : ''}`,
        userId
      }
    });
    
    return {
      hotel: updatedHotel,
      inventoryStatus: exports.checkInventoryStatus(updatedHotel)
    };
  } catch (error) {
    console.error('Error setting inventory:', error);
    throw error;
  }
};

/**
 * Check if hotel inventory is below threshold
 * @param {Object} hotel - Hotel object with bagInventory
 * @returns {Object} Inventory status information
 */
exports.checkInventoryStatus = (hotel) => {
  // Calculate inventory thresholds (can be moved to constants or config)
  const criticalThreshold = 10; // Less than 10 bags is critical
  const warningThreshold = 20; // Less than 20 bags is warning
  
  let status = 'OK';
  let severity = 'success';
  let message = 'Inventory level is adequate';
  
  if (hotel.bagInventory <= 0) {
    status = 'EMPTY';
    severity = 'error';
    message = 'Inventory is depleted';
  } else if (hotel.bagInventory < criticalThreshold) {
    status = 'CRITICAL';
    severity = 'error';
    message = `Critical inventory level: ${hotel.bagInventory} bags remaining`;
  } else if (hotel.bagInventory < warningThreshold) {
    status = 'WARNING';
    severity = 'warning';
    message = `Low inventory level: ${hotel.bagInventory} bags remaining`;
  }
  
  return {
    status,
    severity,
    message,
    level: hotel.bagInventory
  };
};

/**
 * Get inventory status for all hotels or hotels in specific zone
 * @param {string} zone - Optional zone to filter hotels
 * @returns {Promise<Array>} Hotels with inventory status
 */
exports.getInventoryStatusByZone = async (zone = null) => {
  try {
    // Build where clause
    const where = {};
    
    if (zone) {
      where.zone = zone;
    }
    
    // Get hotels
    const hotels = await prisma.hotel.findMany({
      where,
      select: {
        id: true,
        name: true,
        zone: true,
        bagInventory: true
      },
      orderBy: [
        { zone: 'asc' },
        { name: 'asc' }
      ]
    });
    
    // Add inventory status to each hotel
    const hotelsWithStatus = hotels.map(hotel => ({
      ...hotel,
      inventoryStatus: exports.checkInventoryStatus(hotel)
    }));
    
    // Group by zone
    const hotelsByZone = {};
    
    hotelsWithStatus.forEach(hotel => {
      if (!hotelsByZone[hotel.zone]) {
        hotelsByZone[hotel.zone] = [];
      }
      
      hotelsByZone[hotel.zone].push(hotel);
    });
    
    // Calculate zone totals
    const zoneSummary = Object.keys(hotelsByZone).map(zone => {
      const hotelsInZone = hotelsByZone[zone];
      const totalInventory = hotelsInZone.reduce((sum, hotel) => sum + hotel.bagInventory, 0);
      const criticalCount = hotelsInZone.filter(hotel => hotel.inventoryStatus.status === 'CRITICAL').length;
      const warningCount = hotelsInZone.filter(hotel => hotel.inventoryStatus.status === 'WARNING').length;
      const emptyCount = hotelsInZone.filter(hotel => hotel.inventoryStatus.status === 'EMPTY').length;
      
      return {
        zone,
        hotels: hotelsInZone.length,
        totalInventory,
        avgInventory: Math.round(totalInventory / hotelsInZone.length),
        criticalCount,
        warningCount,
        emptyCount,
        status: emptyCount > 0 ? 'CRITICAL' : (criticalCount > 0 ? 'WARNING' : 'OK')
      };
    });
    
    return {
      hotels: hotelsWithStatus,
      hotelsByZone,
      zoneSummary
    };
  } catch (error) {
    console.error('Error getting inventory status by zone:', error);
    throw error;
  }
};

/**
 * Get inventory history for a specific hotel
 * @param {string} hotelId - Hotel ID
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} Inventory change logs
 */
exports.getInventoryHistory = async (hotelId, limit = 20) => {
  try {
    // Get hotel
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        zone: true,
        bagInventory: true
      }
    });
    
    if (!hotel) {
      throw new Error('Hotel not found');
    }
    
    // Get inventory change logs
    const inventoryLogs = await prisma.auditLog.findMany({
      where: {
        entity: 'hotel',
        entityId: hotelId,
        action: AUDIT_ACTIONS.HOTEL_INVENTORY_UPDATED
      },
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
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
    
    return {
      hotel,
      inventoryStatus: exports.checkInventoryStatus(hotel),
      inventoryHistory: inventoryLogs
    };
  } catch (error) {
    console.error('Error getting inventory history:', error);
    throw error;
  }
};

module.exports = exports;