const multer = require('multer');
const { AppError } = require('./errorHandler');

// Configuración de almacenamiento en memoria
const storage = multer.memoryStorage();

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  // Verificar extensión
  const extname = file.originalname
    .toLowerCase()
    .split('.')
    .pop();
  
  const isValidExt = allowedTypes.test(extname);
  const isValidMime = allowedMimeTypes.includes(file.mimetype);

  if (isValidMime && isValidExt) {
    return cb(null, true);
  }

  cb(
    new AppError(
      `Solo se permiten imágenes (${allowedTypes.source})`,
      400,
      'INVALID_FILE_TYPE'
    )
  );
};

// Configuración de multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB por defecto
    files: parseInt(process.env.MAX_FILES_PER_UPLOAD) || 10
  },
  fileFilter: fileFilter
});

// Manejador de errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new AppError(
          'Archivo demasiado grande. Tamaño máximo: 5MB',
          400,
          'FILE_TOO_LARGE'
        )
      );
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(
        new AppError(
          'Demasiados archivos. Máximo: 10 archivos',
          400,
          'TOO_MANY_FILES'
        )
      );
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(
        new AppError(
          'Campo de archivo inesperado',
          400,
          'UNEXPECTED_FILE'
        )
      );
    }

    return next(
      new AppError(err.message, 400, 'UPLOAD_ERROR')
    );
  }

  next(err);
};

module.exports = upload;
module.exports.handleMulterError = handleMulterError;