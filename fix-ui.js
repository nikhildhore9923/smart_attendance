const fs = require('fs');
const glob = require('glob');
const path = require('path');

// Replace these tailwind classes to ensure they use our defined tokens or semantic CSS
const replacements = [
  { rx: /#3b82f6/g, text: "var(--primary)" },    // blue -> primary
  { rx: /#8b5cf6/g, text: "var(--info)" },       // purple -> info
  { rx: /#f59e0b/g, text: "var(--warning)" },    // amber -> warning
  { rx: /#10b981/g, text: "var(--success)" },    // emerald -> success
  { rx: /#ef4444/g, text: "var(--danger)" },     // red -> danger
  { rx: /#06b6d4/g, text: "var(--muted2)" },     // cyan -> muted2
  { rx: /#6366f1/g, text: "var(--muted2)" },     // indigo -> muted2
  { rx: /#ec4899/g, text: "var(--accent)" },     // pink -> accent
  
  // Also fix Tailwind utility classes that enforce the wrong visual style
  { rx: /bg-gradient-to-r/g, text: "bg-surface border-border" },
  { rx: /bg-gradient-to-br/g, text: "bg-surface" },
  { rx: /from-accent/g, text: "" },
  { rx: /to-purple/g, text: "" },
  { rx: /from-text/g, text: "text-text" },
  { rx: /to-text2/g, text: "text-text2" },
  { rx: /bg-clip-text text-transparent/g, text: "text-text" },
  { rx: /shadow-accent\/20/g, text: "shadow-sm" },
  { rx: /shadow-lg/g, text: "shadow-md" },
  { rx: /backdrop-blur-md/g, text: "" },
  { rx: /bg-surface\/50/g, text: "bg-surface" },
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const r of replacements) {
        if (r.rx.test(content)) {
          content = content.replace(r.rx, r.text);
          changed = true;
        }
      }
      // Also apply app-shell standard classes to the main wrapper
      if (content.includes('flex flex-col gap-6 p-6') || content.includes('flex flex-col gap-6 p-4')) {
        content = content.replace(/className="flex flex-col gap-6 p-[46]"/g, 'className="page-container"');
        changed = true;
      }
      if (content.includes('bg-surface border border-border rounded-xl')) {
        content = content.replace(/className="bg-surface border border-border rounded-xl([^"]*)"/g, 'className="table-card$1"');
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir('frontend/src/pages');
processDir('frontend/src/components');

