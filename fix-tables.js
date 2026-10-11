const fs = require('fs');
const glob = require('glob');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let changed = false;

      // Unify table syntax
      if (content.includes('<table')) {
        content = content.replace(/<table[^>]*>/g, '<table className="table">');
        content = content.replace(/<th className="th"[^>]*>/g, '<th>');
        content = content.replace(/<th className="px-6 py-3 text-left text-xs font-medium text-muted2 uppercase tracking-wider"/g, '<th');
        content = content.replace(/<th className="px-4 py-3 text-left text-xs font-medium text-muted2 uppercase tracking-wider"/g, '<th');
        content = content.replace(/<td className="td"[^>]*>/g, '<td>');
        content = content.replace(/<td className="px-6 py-4 whitespace-nowrap text-sm text-text2"[^>]*>/g, '<td>');
        content = content.replace(/<tr style=\{\{\s*borderBottom:[^}]*\}\}>/g, '<tr>');
        content = content.replace(/<tr className="border-b border-border\/50[^"]*">/g, '<tr>');
        content = content.replace(/<tr className="hover:bg-surface2\/50 transition-colors">/g, '<tr>');
        changed = true;
      }

      // Unify buttons
      if (content.includes('bg-primary')) {
        content = content.replace(/className="[^"]*bg-primary[^"]*text-white[^"]*"/g, 'className="btn btn-primary"');
        content = content.replace(/className="[^"]*bg-red-500[^"]*text-white[^"]*"/g, 'className="btn btn-danger"');
        changed = true;
      }
      
      // Remove any raw styling that breaks the new theme
      content = content.replace(/style=\{\{\s*color:\s*'\#ef4444'\s*\}\}/g, 'style={{ color: \'var(--danger)\' }}');
      content = content.replace(/style=\{\{\s*color:\s*'\#10b981'\s*\}\}/g, 'style={{ color: \'var(--success)\' }}');
      content = content.replace(/style=\{\{\s*color:\s*'\#f59e0b'\s*\}\}/g, 'style={{ color: \'var(--warning)\' }}');

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated tables/buttons in ${fullPath}`);
      }
    }
  }
}

processDir('frontend/src/pages');
processDir('frontend/src/components');

