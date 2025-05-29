/**
 * Price calculation service for Fumy Limp Backend
 */

const { prisma } = require('../config/database');
const { PRICE_RULES } = require('../config/constants');

/**
 * Calculate service price based on weight, hotel rate, and optional modifiers
 * @param {number} weight - Weight in kilograms
 * @param {number} pricePerKg - Base price per kilogram
 * @param {Object} modifiers - Optional pricing modifiers
 * @param {boolean} modifiers.urgent - Urgent service (higher priority)
 * @param {boolean} modifiers.difficultStains - Service with difficult stains
 * @param {boolean} modifiers.expressDelivery - Express delivery requested
 * @param {boolean} modifiers.delicateClothes - Delicate clothes requiring special care
 * @param {boolean} modifiers.frequentClient - Client qualifies for frequent client discount
 * @returns {Object} Price calculation details
 */
exports.calculatePrice = (weight, pricePerKg, modifiers = {}) => {
  if (!weight || weight <= 0 || !pricePerKg || pricePerKg <= 0) {
    return {
      basePrice: 0,
      finalPrice: 0,
      appliedModifiers: {},
      details: 'Invalid weight or price parameters'
    };
  }
  
  // Calculate base price
  const basePrice = weight * pricePerKg;
  let finalPrice = basePrice;
  const appliedModifiers = {};
  const priceDetails = [];
  
  // Track all modifiers applied
  priceDetails.push(`Base price: ${weight} kg × ${pricePerKg} per kg = ${basePrice.toFixed(2)}`);
  
  // Apply surcharges
  if (modifiers.urgent) {
    const urgentSurcharge = basePrice * PRICE_RULES.urgentMultiplier - basePrice;
    finalPrice *= PRICE_RULES.urgentMultiplier;
    appliedModifiers.urgent = {
      percentage: (PRICE_RULES.urgentMultiplier - 1) * 100,
      amount: roundToTwo(urgentSurcharge)
    };
    priceDetails.push(`Urgent service: +${((PRICE_RULES.urgentMultiplier - 1) * 100).toFixed(0)}% (${urgentSurcharge.toFixed(2)})`);
  }
  
  if (modifiers.difficultStains) {
    const stainsSurcharge = basePrice * PRICE_RULES.difficultStainsPercentage;
    finalPrice += stainsSurcharge;
    appliedModifiers.difficultStains = {
      percentage: PRICE_RULES.difficultStainsPercentage * 100,
      amount: roundToTwo(stainsSurcharge)
    };
    priceDetails.push(`Difficult stains: +${(PRICE_RULES.difficultStainsPercentage * 100).toFixed(0)}% (${stainsSurcharge.toFixed(2)})`);
  }
  
  if (modifiers.expressDelivery) {
    const expressSurcharge = basePrice * PRICE_RULES.expressDeliveryPercentage;
    finalPrice += expressSurcharge;
    appliedModifiers.expressDelivery = {
      percentage: PRICE_RULES.expressDeliveryPercentage * 100,
      amount: roundToTwo(expressSurcharge)
    };
    priceDetails.push(`Express delivery: +${(PRICE_RULES.expressDeliveryPercentage * 100).toFixed(0)}% (${expressSurcharge.toFixed(2)})`);
  }
  
  if (modifiers.delicateClothes) {
    const delicateSurcharge = basePrice * PRICE_RULES.delicateClothesPercentage;
    finalPrice += delicateSurcharge;
    appliedModifiers.delicateClothes = {
      percentage: PRICE_RULES.delicateClothesPercentage * 100,
      amount: roundToTwo(delicateSurcharge)
    };
    priceDetails.push(`Delicate clothes: +${(PRICE_RULES.delicateClothesPercentage * 100).toFixed(0)}% (${delicateSurcharge.toFixed(2)})`);
  }
  
  // Apply discounts
  if (weight >= PRICE_RULES.highVolumeThreshold) {
    const volumeDiscount = finalPrice * PRICE_RULES.highVolumeDiscount;
    finalPrice -= volumeDiscount;
    appliedModifiers.highVolume = {
      percentage: PRICE_RULES.highVolumeDiscount * 100,
      amount: roundToTwo(volumeDiscount)
    };
    priceDetails.push(`High volume (≥${PRICE_RULES.highVolumeThreshold} kg): -${(PRICE_RULES.highVolumeDiscount * 100).toFixed(0)}% (${volumeDiscount.toFixed(2)})`);
  }
  
  if (modifiers.frequentClient) {
    const loyaltyDiscount = finalPrice * PRICE_RULES.frequentClientDiscount;
    finalPrice -= loyaltyDiscount;
    appliedModifiers.frequentClient = {
      percentage: PRICE_RULES.frequentClientDiscount * 100,
      amount: roundToTwo(loyaltyDiscount)
    };
    priceDetails.push(`Frequent client: -${(PRICE_RULES.frequentClientDiscount * 100).toFixed(0)}% (${loyaltyDiscount.toFixed(2)})`);
  }
  
  // Round final price to 2 decimal places
  const roundedFinalPrice = roundToTwo(finalPrice);
  
  priceDetails.push(`Final price: ${roundedFinalPrice.toFixed(2)}`);
  
  return {
    basePrice: roundToTwo(basePrice),
    finalPrice: roundedFinalPrice,
    appliedModifiers,
    details: priceDetails.join('\n')
  };
};

/**
 * Calculate price for a specific service
 * @param {string} serviceId - Service ID
 * @param {Object} modifiers - Optional pricing modifiers
 * @returns {Promise<Object>} Price calculation details
 */
exports.calculateServicePrice = async (serviceId, modifiers = {}) => {
  try {
    // Get service details
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        hotel: {
          select: {
            pricePerKg: true
          }
        }
      }
    });
    
    if (!service) {
      throw new Error('Service not found');
    }
    
    if (!service.weight) {
      throw new Error('Service weight not set');
    }
    
    // Check if this client qualifies for frequent client discount
    if (!modifiers.hasOwnProperty('frequentClient')) {
      // Count services for this guest in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const serviceCount = await prisma.service.count({
        where: {
          guestName: service.guestName,
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      });
      
      modifiers.frequentClient = serviceCount >= PRICE_RULES.frequentClientThreshold;
    }
    
    // Set urgent modifier based on priority if not explicitly provided
    if (!modifiers.hasOwnProperty('urgent')) {
      modifiers.urgent = service.priority === 'ALTA';
    }
    
    // Calculate price
    const priceCalculation = exports.calculatePrice(
      service.weight,
      service.hotel.pricePerKg,
      modifiers
    );
    
    return priceCalculation;
  } catch (error) {
    console.error('Error calculating service price:', error);
    throw error;
  }
};

/**
 * Update price for a service based on current weight and modifiers
 * @param {string} serviceId - Service ID
 * @param {Object} modifiers - Optional pricing modifiers
 * @returns {Promise<Object>} Updated service with price
 */
exports.updateServicePrice = async (serviceId, modifiers = {}) => {
  try {
    // Calculate price
    const priceCalculation = await exports.calculateServicePrice(serviceId, modifiers);
    
    // Update service with calculated price
    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: {
        price: priceCalculation.finalPrice
      }
    });
    
    return {
      service: updatedService,
      priceCalculation
    };
  } catch (error) {
    console.error('Error updating service price:', error);
    throw error;
  }
};

/**
 * Helper function to round to 2 decimal places
 * @param {number} value - Value to round
 * @returns {number} Rounded value
 */
function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

module.exports = exports;