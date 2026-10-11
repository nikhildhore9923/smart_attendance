const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/ReportsPage.jsx', 'utf8');

code = code.replace(/className="stat-card"/g, 'className="table-card" style={{ padding: "20px" }}');
code = code.replace(/className="stat-label"/g, 'className="field-label"');
code = code.replace(/className="stat-value"/g, 'style={{ fontSize: "28px", fontWeight: 700, color: "var(--text)", marginTop: 8 }}');
code = code.replace(/rgba\(16,185,129,0\.1\)/g, 'var(--surface-success)');
code = code.replace(/rgba\(239,68,68,0\.1\)/g, 'var(--surface-error)');
code = code.replace(/className="input-field"/g, 'className="input"');

fs.writeFileSync('frontend/src/pages/ReportsPage.jsx', code);
console.log('Fixed ReportsPage.jsx');
