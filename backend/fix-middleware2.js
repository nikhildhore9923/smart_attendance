const fs = require('fs');
let content = fs.readFileSync('src/routes/academicRoutes.js', 'utf8');
content = content.replace("const { protect, adminOnly } = require('../middleware/authMiddleware');", "const { authenticate, authorize } = require('../middleware/authMiddleware');");
content = content.replace(/protect/g, "authenticate");
content = content.replace(/adminOnly/g, "authorize('ADMIN')");
fs.writeFileSync('src/routes/academicRoutes.js', content);
