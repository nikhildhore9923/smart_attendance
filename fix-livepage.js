const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/LivePage.jsx', 'utf8');

code = code.replace(
  /'rgba\(16, 185, 129, 0\.9\)'/g,
  "'var(--success)'"
);

code = code.replace(
  /background: f\.status === 'NEWLY_MARKED' \? 'rgba\(16, 185, 129, 0\.1\)' : f\.status === 'ALREADY_MARKED' \? 'rgba\(245, 158, 11, 0\.1\)' : !f\.recognized \? 'rgba\(239, 68, 68, 0\.1\)' : 'rgba\(59, 130, 246, 0\.1\)'/g,
  "background: f.status === 'NEWLY_MARKED' ? 'var(--surface-success)' : f.status === 'ALREADY_MARKED' ? 'var(--surface-warning)' : !f.recognized ? 'var(--surface-error)' : 'var(--surface-info)'"
);

code = code.replace(
  /border: `1px solid \$\{f\.status === 'NEWLY_MARKED' \? '#10b981' : f\.status === 'ALREADY_MARKED' \? '#f59e0b' : !f\.recognized \? '#ef4444' : '#3b82f6'\}`/g,
  "border: `1px solid ${f.status === 'NEWLY_MARKED' ? 'var(--success)' : f.status === 'ALREADY_MARKED' ? 'var(--warning)' : !f.recognized ? 'var(--danger)' : 'var(--primary)'}`"
);

code = code.replace(/#10b981/g, 'var(--success)');
code = code.replace(/#ef4444/g, 'var(--danger)');
code = code.replace(/#f59e0b/g, 'var(--warning)');
code = code.replace(/#3b82f6/g, 'var(--primary)');

code = code.replace(/'rgba\(239, 68, 68, 0\.1\)'/g, "'var(--surface-error)'");

fs.writeFileSync('frontend/src/pages/LivePage.jsx', code);
console.log('Updated LivePage.jsx');
