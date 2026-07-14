const XLSX = require('xlsx');
const path = require('path');

const data = [
  {
    phone: '51999888777',
    name: 'Ejemplo Cliente',
    email: 'cliente@ejemplo.com',
    company: 'Mi Empresa',
    tags: 'VIP, Mayorista'
  }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Contactos");

const outputPath = path.join(__dirname, '../public/plantilla-contactos.xlsx');
XLSX.writeFile(wb, outputPath);

console.log('Template generated at ' + outputPath);
