// Script para importar automáticamente los datos en el navegador
// Ejecutar en la consola del navegador después de cargar la página

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'imported_data.json');
const jsonData = fs.readFileSync(jsonPath, 'utf8');

console.log('Para importar automáticamente, ejecuta esto en la consola del navegador:');
console.log('');
console.log('localStorage.setItem("chillapp_data", ' + JSON.stringify(JSON.parse(jsonData)) + ');');
console.log('location.reload();');

