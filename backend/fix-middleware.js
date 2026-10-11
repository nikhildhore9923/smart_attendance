const fs = require('fs');
let content = fs.readFileSync('src/routes/academicRoutes.js', 'utf8');
content = content.replace("require('../middleware/auth')", "require('../middleware/authMiddleware')");
fs.writeFileSync('src/routes/academicRoutes.js', content);
