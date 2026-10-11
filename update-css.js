const fs = require('fs');
let css = fs.readFileSync('frontend/src/index.css', 'utf8');

const newVars = `
@import "tailwindcss";

:root, [data-theme="light"], [data-theme="dark"] {
  /* Brand */
  --primary:     #245747;
  --primary-hover: #193F34;
  --accent:      #245747;  /* mapped for legacy classes */
  --accent2:     #193F34;
  
  /* Backgrounds */
  --bg:          #F7F6F0;
  --surface:     #FFFFFF;
  --surface2:    #F0F1EA;
  --surface-success: #EAF4EE;
  --surface-error:   #FDEAEA;
  --surface-warning: #FEF4E6;
  --surface-info:    #E9EDEC;
  
  /* Text */
  --text:        #252A27;
  --text2:       #4A514D;
  --muted:       #737970;
  --muted2:      #A3A66A;
  
  /* Borders */
  --border:      #E4E5DC;
  --border2:     #D4D5CA;
  
  /* Semantic */
  --success:     #1A7D54;
  --warning:     #C58A37;
  --danger:      #D93B3B;
  --info:        #4A6B62;
  
  /* Deprecated / Legacy mappings (so we don't break existing untested UI immediately) */
  --purple:      #245747;
  --cyan:        #A3A66A;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Remove AI/glow gradients */
.bg-grid { background: var(--bg); }
.border-gradient::before { display: none; }
.border-gradient { border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

* { box-sizing: border-box; margin: 0; padding: 0; }
`;

css = css.replace(/@import "tailwindcss";[\s\S]*?\* \{ box-sizing: border-box; margin: 0; padding: 0; \}/, newVars.trim());

// Also remove glowing borders from elements
css = css.replace(/box-shadow: 0 0 15px var\(--accent\);/g, 'box-shadow: 0 4px 6px rgba(0,0,0,0.05);');
css = css.replace(/box-shadow: 0 0 20px rgba\(37,99,235,0\.3\);/g, 'box-shadow: 0 4px 12px rgba(0,0,0,0.08);');
css = css.replace(/box-shadow: 0 8px 32px rgba\(0,0,0,0\.4\);/g, 'box-shadow: 0 8px 24px rgba(0,0,0,0.08);');
css = css.replace(/border: 1px solid rgba\(255,255,255,0\.1\);/g, 'border: 1px solid var(--border);');

fs.writeFileSync('frontend/src/index.css', css);
console.log('Updated index.css with premium college theme');
