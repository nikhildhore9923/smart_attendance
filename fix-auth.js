const fs = require('fs');
let code = fs.readFileSync('frontend/src/context/AuthContext.jsx', 'utf8');

const getMeCode = `.then(r => setUser({ 
          email: r.data.user.email, 
          full_name: \`\${r.data.user.firstName} \${r.data.user.lastName}\`, 
          role: r.data.user.role 
        }))`;

code = code.replace(/\.then\(r => setUser\(r\.data\)\)/, getMeCode);

fs.writeFileSync('frontend/src/context/AuthContext.jsx', code);
console.log('Fixed AuthContext getMe structure');
