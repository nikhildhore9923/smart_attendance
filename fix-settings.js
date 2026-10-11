const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/SettingsPage.jsx', 'utf8');

code = code.replace(/className="card"/g, 'className="table-card" style={{ padding: "24px" }}');
code = code.replace(/badge-purple/g, 'badge-blue'); // Since badge-purple is legacy and we replaced it with blue/amber

// also update the wrapper if it exists
if (code.includes('className="flex flex-col gap-6 max-w-4xl"')) {
    code = code.replace(/className="flex flex-col gap-6 max-w-4xl"/, 'className="page-container" style={{ maxWidth: "900px" }}');
}

fs.writeFileSync('frontend/src/pages/SettingsPage.jsx', code);
console.log('Updated SettingsPage.jsx');
