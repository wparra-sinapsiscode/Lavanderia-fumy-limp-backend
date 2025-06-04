/**
 * Upload middleware for Fumy Limp Backend
 * Handles file uploads using multer
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create specific upload directories
const dirs = ['services', 'signatures', 'labels', 'profiles', 'exports'];
dirs.forEach(dir => {
  const dirPath = path.join(uploadsDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Define storage strategy
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = uploadsDir;
    
    // Determine upload folder based on file type
    if (file.fieldname === 'signature') {
      folder = path.join(uploadsDir, 'signatures');
    } else if (file.fieldname === 'photos' || file.fieldname === 'photo') {
      // Check if this is for labeling (rótulos) or general service photos
      if (req.body.type === 'labeling') {
        folder = path.join(uploadsDir, 'labels');
      } else {
        folder = path.join(uploadsDir, 'services');
        
        // Create service-specific folder if we have serviceId or id
        const serviceId = req.params.serviceId || req.params.id;
        if (serviceId) {
          const serviceDir = path.join(folder, serviceId);
          if (!fs.existsSync(serviceDir)) {
            fs.mkdirSync(serviceDir, { recursive: true });
          }
          folder = serviceDir;
        }
      }
    } else if (file.fieldname === 'labelPhoto') {
      folder = path.join(uploadsDir, 'labels');
    } else if (file.fieldname === 'profilePhoto') {
      folder = path.join(uploadsDir, 'profiles');
    }
    
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + extension;
    cb(null, filename);
  }
});

// Define file filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP).'), false);
  }
};

// Create multer instance with configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

/**
 * Middleware for handling service photo uploads (multiple files)
 */
exports.uploadServicePhotos = (req, res, next) => {
  const uploadHandler = upload.array('photos', 40); // Maximum 40 photos per request
  
  uploadHandler(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error (file size, file count, etc.)
      return res.status(400).json({
        success: false,
        message: `Error en la carga de archivos: ${err.message}`
      });
    } else if (err) {
      // Other errors
      return res.status(500).json({
        success: false,
        message: `Error en la carga de archivos: ${err.message}`
      });
    }
    
    // Process uploaded files
    if (req.files && req.files.length > 0) {
      // Add URLs to request body
      req.body.photoUrls = req.files.map(file => {
        // Use relative path for storage in database
        const relativePath = file.path.replace(path.join(__dirname, '../..'), '');
        return relativePath.replace(/\\/g, '/'); // Convert backslashes to forward slashes
      });
    }
    
    next();
  });
};

/**
 * Middleware for handling single photo upload
 */
exports.uploadSinglePhoto = (fieldName) => {
  return (req, res, next) => {
    const uploadHandler = upload.single(fieldName);
    
    uploadHandler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: `Error en la carga de archivos: ${err.message}`
        });
      } else if (err) {
        return res.status(500).json({
          success: false,
          message: `Error en la carga de archivos: ${err.message}`
        });
      }
      
      // Process uploaded file
      if (req.file) {
        // Add URL to request body
        const relativePath = req.file.path.replace(path.join(__dirname, '../..'), '');
        req.body.photoUrl = relativePath.replace(/\\/g, '/');
      }
      
      next();
    });
  };
};

/**
 * Middleware for handling bag label photo upload
 */
exports.uploadBagLabelPhoto = (req, res, next) => {
  const uploadHandler = upload.single('photo');
  
  uploadHandler(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Error en la carga de la foto: ${err.message}`
      });
    } else if (err) {
      return res.status(500).json({
        success: false,
        message: `Error en la carga de la foto: ${err.message}`
      });
    }
    
    // Process uploaded file
    if (req.file) {
      // Add URL to request body
      const relativePath = req.file.path.replace(path.join(__dirname, '../..'), '');
      req.body.photoUrl = relativePath.replace(/\\/g, '/');
    }
    
    next();
  });
};

/**
 * Middleware for handling signature upload
 */
exports.uploadSignature = (req, res, next) => {
  const uploadHandler = upload.single('signature');
  
  uploadHandler(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Error en la carga de la firma: ${err.message}`
      });
    } else if (err) {
      return res.status(500).json({
        success: false,
        message: `Error en la carga de la firma: ${err.message}`
      });
    }
    
    // Process uploaded file
    if (req.file) {
      // Add URL to request body
      const relativePath = req.file.path.replace(path.join(__dirname, '../..'), '');
      req.body.signatureUrl = relativePath.replace(/\\/g, '/');
    }
    
    next();
  });
};

/**
 * Middleware for handling base64 image data
 * @param {string} fieldName - Name of the field containing base64 data
 */
exports.processBase64Image = (fieldName) => {
  return (req, res, next) => {
    const base64Data = req.body[fieldName];
    
    if (!base64Data) {
      return next();
    }
    
    try {
      // Extract MIME type and base64 data
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      
      if (!matches || matches.length !== 3) {
        return res.status(400).json({
          success: false,
          message: 'Formato de imagen base64 inválido'
        });
      }
      
      const type = matches[1];
      const data = matches[2];
      
      // Check file type
      const allowedMimeTypes = [
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/webp'
      ];
      
      if (!allowedMimeTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de imagen no permitido. Solo se permiten JPEG, PNG, GIF, WEBP.'
        });
      }
      
      // Decode base64
      const buffer = Buffer.from(data, 'base64');
      
      // Check file size (5MB max)
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'La imagen es demasiado grande. El tamaño máximo es 5MB.'
        });
      }
      
      // Determine folder and filename
      let folder = uploadsDir;
      
      if (fieldName === 'signature') {
        folder = path.join(uploadsDir, 'signatures');
      } else if (fieldName === 'photo' || fieldName.includes('photo')) {
        const serviceId = req.params.serviceId || req.params.id;
        if (serviceId) {
          folder = path.join(uploadsDir, 'services', serviceId);
        } else {
          folder = path.join(uploadsDir, 'services');
        }
      } else if (fieldName === 'labelPhoto') {
        folder = path.join(uploadsDir, 'labels');
      }
      
      // Ensure folder exists
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      
      // Generate unique filename
      const extension = type.split('/')[1];
      const filename = `${fieldName}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
      const filePath = path.join(folder, filename);
      
      // Save file
      fs.writeFileSync(filePath, buffer);
      
      // Add URL to request body
      const relativePath = filePath.replace(path.join(__dirname, '../..'), '');
      req.body[`${fieldName}Url`] = relativePath.replace(/\\/g, '/');
      
      // Remove base64 data from request body to save memory
      delete req.body[fieldName];
      
      next();
    } catch (error) {
      console.error('Error processing base64 image:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la imagen base64',
        error: error.message
      });
    }
  };
};

module.exports = exports;