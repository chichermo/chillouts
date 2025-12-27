// Script simple para generar iconos PWA desde logo.jpg
// Requiere: npm install sharp (opcional, si no está instalado, los iconos se crearán manualmente)

const fs = require('fs');
const path = require('path');

console.log('Para generar los iconos PWA:');
console.log('1. Instala sharp: npm install sharp --save-dev');
console.log('2. O usa una herramienta online como https://realfavicongenerator.net/');
console.log('3. O crea iconos manualmente de 192x192 y 512x512 desde logo.jpg');
console.log('');
console.log('Los iconos deben guardarse en:');
console.log('- public/icon-192.png (192x192)');
console.log('- public/icon-512.png (512x512)');

// Si sharp está disponible, generar iconos
try {
  const sharp = require('sharp');
  const logoPath = path.join(__dirname, '../public/logo.jpg');
  const icon192Path = path.join(__dirname, '../public/icon-192.png');
  const icon512Path = path.join(__dirname, '../public/icon-512.png');

  if (fs.existsSync(logoPath)) {
    console.log('Generando iconos desde logo.jpg...');
    
    // Generar icono 192x192
    sharp(logoPath)
      .resize(192, 192, { fit: 'contain', background: { r: 42, g: 42, b: 58 } })
      .png()
      .toFile(icon192Path)
      .then(() => console.log('✓ icon-192.png creado'))
      .catch(err => console.error('Error creando icon-192.png:', err));

    // Generar icono 512x512
    sharp(logoPath)
      .resize(512, 512, { fit: 'contain', background: { r: 42, g: 42, b: 58 } })
      .png()
      .toFile(icon512Path)
      .then(() => console.log('✓ icon-512.png creado'))
      .catch(err => console.error('Error creando icon-512.png:', err));
  } else {
    console.log('⚠ logo.jpg no encontrado en public/');
  }
} catch (e) {
  console.log('Sharp no está instalado. Instala con: npm install sharp --save-dev');
  console.log('O crea los iconos manualmente desde logo.jpg');
}

