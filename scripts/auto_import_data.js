// Script para importar automáticamente los datos en localStorage
// Ejecutar en la consola del navegador: 
// node scripts/auto_import_data.js > import_script.txt
// Luego copiar el contenido de import_script.txt y ejecutarlo en la consola del navegador

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'imported_data.json');

try {
  const jsonData = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(jsonData);
  
  console.log('// Copia y pega esto en la consola del navegador:');
  console.log('');
  console.log(`localStorage.setItem('chillapp_data', ${JSON.stringify(JSON.stringify(data))});`);
  console.log('location.reload();');
  console.log('');
  console.log('// Esto importará automáticamente todos los datos del Excel.');
} catch (error) {
  console.error('Error:', error.message);
}

