const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/LoginPage.jsx', 'utf8');

const regex = /<input\s+type="password"[\s\S]*?\/>/;
const replacement = `<input 
                  type="password" required 
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="input" 
                  placeholder="********" 
                />`;

code = code.replace(regex, replacement);
fs.writeFileSync('frontend/src/pages/LoginPage.jsx', code);
console.log('Successfully fixed password placeholder');
