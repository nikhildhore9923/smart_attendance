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
      
      const matches = content.match(/color:\s*['"]#(fff|ffffff|FFF|FFFFFF)['"]/g) || [];
      const whiteMatches = content.match(/color:\s*['"]white['"]/g) || [];
      if (matches.length > 0 || whiteMatches.length > 0) {
         console.log(`\n--- ${fullPath} ---`);
         console.log([...matches, ...whiteMatches].join('\n'));
      }
    }
  }
}

processDir('frontend/src/pages');
processDir('frontend/src/components');
