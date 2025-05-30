const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * @route GET /api/geocode/search
 * @desc Buscar direcciones con Nominatim (proxy para evitar CORS)
 * @access Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 5, countrycodes = 'pe' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un término de búsqueda (q)'
      });
    }
    
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        format: 'json',
        q,
        limit,
        addressdetails: 1,
        countrycodes,
        bounded: 1,
        viewbox: '-77.1950,-11.9437,-76.7025,-12.0640'
      },
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'FumyLimp-LavanderiaCApp'
      }
    });
    
    return res.json(response.data);
  } catch (error) {
    console.error('Error en proxy de geocodificación (search):', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error al consultar el servicio de geocodificación',
      error: error.message
    });
  }
});

/**
 * @route GET /api/geocode/reverse
 * @desc Geocodificación inversa con Nominatim (proxy para evitar CORS)
 * @access Public
 */
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lon, zoom = 18 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren coordenadas (lat, lon)'
      });
    }
    
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat,
        lon,
        zoom,
        addressdetails: 1
      },
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'FumyLimp-LavanderiaCApp'
      }
    });
    
    return res.json(response.data);
  } catch (error) {
    console.error('Error en proxy de geocodificación (reverse):', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error al consultar el servicio de geocodificación inversa',
      error: error.message
    });
  }
});

module.exports = router;