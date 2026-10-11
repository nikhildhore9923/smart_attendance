const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/LoginPage.jsx', 'utf8');

code = code.replace(/placeholder=".*?sA.*?"/, 'placeholder="••••••••"');

fs.writeFileSync('frontend/src/pages/LoginPage.jsx', code);
console.log('Fixed password placeholder in LoginPage');
