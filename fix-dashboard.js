const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/DashboardPage.jsx', 'utf8');

// Replace hex colors in statCards with CSS variable references for the new theme
code = code.replace(/#3b82f6/g, 'var(--primary)');
code = code.replace(/#8b5cf6/g, 'var(--info)');
code = code.replace(/#f59e0b/g, 'var(--warning)');
code = code.replace(/#10b981/g, 'var(--success)');
code = code.replace(/#6366f1/g, 'var(--muted2)');
code = code.replace(/#ec4899/g, 'var(--accent)');
code = code.replace(/#64748b/g, 'var(--muted)');
code = code.replace(/#0f172a/g, 'var(--surface)');
code = code.replace(/#1e293b/g, 'var(--border)');

// Update CSS classes that were manually added
code = code.replace(/className="stat-card" style=\{\{[\s\S]*?\}\}/g, `className="table-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}`);
code = code.replace(/<p className="stat-label">/g, `<p className="field-label" style={{ margin: 0 }}>`);
code = code.replace(/<h3 className="stat-value">/g, `<h3 style={{ fontSize: '24px', margin: 0, fontWeight: 700, color: 'var(--text)' }}>`);
code = code.replace(/style=\{\{ background: 'var\(--surface\)', padding: '24px', borderRadius: '12px', border: '1px solid var\(--border\)' \}\}/g, `className="table-card" style={{ padding: '24px' }}`);

fs.writeFileSync('frontend/src/pages/DashboardPage.jsx', code);
console.log('Updated DashboardPage.jsx');
