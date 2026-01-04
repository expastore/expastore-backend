const fs = require('fs');
const path = require('path');

/**
 * Crear carpetas necesarias para el proyecto
 */
const initFolders = () => {
  const folders = [
    'logs',
    'uploads',
    'uploads/products',
    'uploads/temp',
    'public',
    'public/images'
  ];

  folders.forEach(folder => {
    const folderPath = path.join(process.cwd(), folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`✓ Carpeta creada: ${folder}`);
    }
  });
};

module.exports = initFolders;