/**
 * Authentication controller for Fumy Limp Backend
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { AUDIT_ACTIONS } = require('../config/constants');

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Admin only
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, zone, phone } = req.body;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role,
        zone,
        phone
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.USER_CREATED,
        entity: 'user',
        entityId: user.id,
        details: `Usuario creado: ${user.name} (${user.role})`,
        userId: req.user.id
      }
    });

    // Return user without password
    const { hashedPassword: _, ...userWithoutPassword } = user;

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user;
    try {
      // Check if user exists
      user = await prisma.user.findUnique({
        where: { email }
      });
    } catch (dbError) {
      console.error('Error de conexión a la base de datos al buscar usuario:', dbError);
      
      // Si el email es admin@fumylimp.com, crear un usuario admin de fallback
      if (email === 'admin@fumylimp.com' && password === 'admin1234') {
        console.log('Usando usuario admin de fallback para login mientras la base de datos no está disponible');
        
        const mockAdminUser = {
          id: 'mock-admin-1',
          name: 'Administrador',
          email: 'admin@fumylimp.com',
          role: 'ADMIN',
          zone: 'ADMINISTRACION',
          active: true,
          createdAt: new Date().toISOString()
        };
        
        // Crear tokens
        const accessToken = jwt.sign(
          { id: mockAdminUser.id, role: mockAdminUser.role },
          process.env.JWT_SECRET || 'default_jwt_secret_key',
          { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );
        
        const refreshToken = jwt.sign(
          { id: mockAdminUser.id },
          process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret_key',
          { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );
        
        return res.status(200).json({
          success: true,
          message: 'Inicio de sesión exitoso (modo fallback)',
          accessToken,
          refreshToken,
          data: mockAdminUser,
          fromMock: true
        });
      }
      
      // Para repartidores de ejemplo
      if (email === 'repartidor@fumylimp.com' && password === 'repartidor1234') {
        console.log('Usando usuario repartidor de fallback para login mientras la base de datos no está disponible');
        
        const mockRepartidorUser = {
          id: 'mock-repartidor-1',
          name: 'Repartidor Ejemplo',
          email: 'repartidor@fumylimp.com',
          role: 'REPARTIDOR',
          zone: 'SUR',
          active: true,
          createdAt: new Date().toISOString()
        };
        
        // Crear tokens
        const accessToken = jwt.sign(
          { id: mockRepartidorUser.id, role: mockRepartidorUser.role },
          process.env.JWT_SECRET || 'default_jwt_secret_key',
          { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );
        
        const refreshToken = jwt.sign(
          { id: mockRepartidorUser.id },
          process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret_key',
          { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );
        
        return res.status(200).json({
          success: true,
          message: 'Inicio de sesión exitoso (modo fallback)',
          accessToken,
          refreshToken,
          data: mockRepartidorUser,
          fromMock: true
        });
      }
      
      // Si no coincide con los usuarios de fallback
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas o base de datos no disponible'
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Create access token
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // Create refresh token
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );

    try {
      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: AUDIT_ACTIONS.USER_LOGIN,
          entity: 'user',
          entityId: user.id,
          details: `Inicio de sesión: ${user.name} (${user.role})`,
          userId: user.id
        }
      });
    } catch (auditError) {
      console.error('Error al crear registro de auditoría:', auditError);
      // No bloqueamos el login si falla el registro de auditoría
    }

    // Return user without password
    const { hashedPassword: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      accessToken,
      refreshToken,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

/**
 * Get current logged in user
 * @route GET /api/auth/me
 * @access Private
 */
exports.getMe = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const { hashedPassword: _, ...userWithoutPassword } = req.user;
    
    // Verificar si se trata de un usuario simulado
    if (req.user.id.startsWith('mock-')) {
      return res.status(200).json({
        success: true,
        data: userWithoutPassword,
        fromMock: true
      });
    }

    try {
      // Intentar obtener datos actualizados del usuario
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });
      
      if (user) {
        const { hashedPassword: __, ...updatedUserWithoutPassword } = user;
        return res.status(200).json({
          success: true,
          data: updatedUserWithoutPassword
        });
      }
    } catch (dbError) {
      console.error('Error de conexión a la base de datos al obtener usuario:', dbError);
      // Continuamos con los datos del usuario del token si hay error de DB
    }

    return res.status(200).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener información del usuario',
      error: error.message
    });
  }
};

/**
 * Refresh JWT token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token es requerido'
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o token inválido'
      });
    }
    
    // Create new access token
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // Create new refresh token
    const newRefreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );
    
    // We don't invalidate the old refresh token anymore
    // This allows for multiple sessions to be active at the same time
    // Comment: Previously, we might have invalidated the old token here with:
    // await invalidateRefreshToken(refreshToken)
    
    return res.status(200).json({
      success: true,
      message: 'Token renovado exitosamente',
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expirado. Por favor inicie sesión nuevamente.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error al refrescar token',
      error: error.message
    });
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logout = async (req, res) => {
  try {
    // Blacklist only the current token, not all user tokens
    // This allows for multiple sessions to be active at the same time
    const currentToken = req.headers.authorization.split(' ')[1];
    
    // Revoke only the current token
    await prisma.revokedToken.create({
      data: {
        token: currentToken,
        userId: req.user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Store for 24 hours (cleanup later)
      }
    });
    
    // If a refresh token is provided, invalidate that specific one
    if (req.body.refresh_token) {
      await prisma.revokedToken.create({
        data: {
          token: req.body.refresh_token,
          userId: req.user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Store for 30 days
        }
      });
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: AUDIT_ACTIONS.USER_LOGOUT,
        entity: 'user',
        entityId: req.user.id,
        details: `Cierre de sesión: ${req.user.name} (${req.user.role})`,
        userId: req.user.id
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error logging out:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cerrar sesión',
      error: error.message
    });
  }
};