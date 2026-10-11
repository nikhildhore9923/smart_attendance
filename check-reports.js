const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/ReportsPage.jsx', 'utf8');
const lines = code.split('\n').map(l => l.trim()).filter(l => l.includes('class') || l.includes('style'));
console.log(lines.join('\n'));
