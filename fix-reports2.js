const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/ReportsPage.jsx', 'utf8');

// Fix double styles created by regex
code = code.replace(/style=\{\{ fontSize: "28px", fontWeight: 700, color: "var\(--text\)", marginTop: 8 \}\} style=\{\{ color: 'var\(--success\)' \}\}/g, 'style={{ fontSize: "28px", fontWeight: 700, marginTop: 8, color: "var(--success)" }}');
code = code.replace(/style=\{\{ fontSize: "28px", fontWeight: 700, color: "var\(--text\)", marginTop: 8 \}\} style=\{\{ color: 'var\(--danger\)' \}\}/g, 'style={{ fontSize: "28px", fontWeight: 700, marginTop: 8, color: "var(--danger)" }}');
code = code.replace(/style=\{\{ fontSize: "28px", fontWeight: 700, color: "var\(--text\)", marginTop: 8 \}\} style=\{\{ color: 'var\(--primary\)' \}\}/g, 'style={{ fontSize: "28px", fontWeight: 700, marginTop: 8, color: "var(--primary)" }}');

fs.writeFileSync('frontend/src/pages/ReportsPage.jsx', code);
console.log('Fixed double styles in ReportsPage.jsx');
