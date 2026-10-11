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
      
      const matches = content.match(/className="[^"]*text-[^"]*"/g);
      if (matches) {
         console.log(`\n--- ${fullPath} ---`);
         const unique = [...new Set(matches)];
         unique.forEach(m => console.log(m));
      }
    }
  }
}

processDir('frontend/src/pages');
processDir('frontend/src/components');
