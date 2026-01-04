// test-cloudinary.js
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function testCloudinary() {
  console.log('🔍 Verificando configuración de Cloudinary...');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || 'NO CONFIGURADO');
  console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '✓ Configurado' : 'NO CONFIGURADO');
  console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '✓ Configurado' : 'NO CONFIGURADO');

  if (!process.env.CLOUDINARY_CLOUD_NAME || 
      !process.env.CLOUDINARY_API_KEY || 
      !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Cloudinary no está configurado en .env');
    return;
  }

  try {
    // 1. Test de conexión
    console.log('\n📡 Probando conexión a Cloudinary...');
    await cloudinary.api.ping();
    console.log('✅ Conexión exitosa!');

    // 2. Crear una imagen de prueba
    console.log('\n🖼️  Creando imagen de prueba...');
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    
    // Crear una imagen simple con un texto
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    
    // Fondo
    ctx.fillStyle = '#4F46E5';
    ctx.fillRect(0, 0, 800, 600);
    
    // Texto
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Cloudinary Test', 400, 200);
    ctx.font = '40px Arial';
    ctx.fillText(new Date().toLocaleString(), 400, 300);
    
    // Guardar imagen
    const buffer = canvas.toBuffer('image/jpeg');
    fs.writeFileSync(testImagePath, buffer);
    console.log('✅ Imagen de prueba creada:', testImagePath);

    // 3. Subir imagen
    console.log('\n☁️  Subiendo imagen a Cloudinary...');
    const result = await cloudinary.uploader.upload(testImagePath, {
      folder: 'expastore-test',
      public_id: `test-${Date.now()}`,
      resource_type: 'image',
      overwrite: true
    });

    console.log('✅ Imagen subida exitosamente!');
    console.log('📎 URL:', result.secure_url);
    console.log('🆔 Public ID:', result.public_id);
    console.log('📏 Dimensiones:', `${result.width}x${result.height}`);
    console.log('💾 Tamaño:', `${Math.round(result.bytes / 1024)} KB`);

    // 4. Probar transformaciones
    console.log('\n✨ Probando transformaciones...');
    
    // URL con resize
    const resizedUrl = cloudinary.url(result.public_id, {
      width: 300,
      height: 200,
      crop: 'fill',
      quality: 80
    });
    console.log('✅ URL con resize:', resizedUrl);

    // 5. Probar eliminación
    console.log('\n🗑️  Probando eliminación...');
    const deleteResult = await cloudinary.uploader.destroy(result.public_id);
    console.log('✅ Eliminación:', deleteResult.result);

    // 6. Limpiar archivo local
    fs.unlinkSync(testImagePath);
    console.log('🧹 Imagen local eliminada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar prueba
testCloudinary();