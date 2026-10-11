const fs = require('fs');

let css = fs.readFileSync('frontend/src/index.css', 'utf8');

// Replace the single :root definition with distinct :root (light) and [data-theme="dark"] definitions
const newVars = `
:root, [data-theme="light"] {
  /* Brand */
  --primary:     #245747;
  --primary-hover: #193F34;
  --accent:      #245747;
  --accent2:     #193F34;
  
  /* Backgrounds */
  --bg:          #F7F6F0;
  --surface:     #FFFFFF;
  --surface2:    #F0F1EA;
  --surface-success: #E8F5E9;
  --surface-error:   #FDEAEA;
  --surface-warning: #FEF4E6;
  --surface-info:    #E9EDEC;
  
  /* Text */
  --text:        #252A27;
  --text2:       #4A514D;
  --muted:       #626B65;
  --muted2:      #626B65;
  
  /* Borders */
  --border:      #D8DDD5;
  --border2:     #C4C9C0;
  
  /* Semantic */
  --success:     #176B45;
  --warning:     #875400;
  --danger:      #B42318;
  --info:        #2457A7;

  /* Legacy mappings */
  --purple:      #245747;
  --cyan:        #626B65;
}

[data-theme="dark"] {
  /* Brand */
  --primary:     #2D6B57;
  --primary-hover: #36816A;
  --accent:      #2D6B57;
  --accent2:     #36816A;
  
  /* Backgrounds */
  --bg:          #121714;
  --surface:     #1A201C;
  --surface2:    #222B25;
  --surface-success: #153123;
  --surface-error:   #3D1B19;
  --surface-warning: #38250C;
  --surface-info:    #1E2C3A;
  
  /* Text */
  --text:        #E2E8E4;
  --text2:       #B0BDB5;
  --muted:       #86968C;
  --muted2:      #86968C;
  
  /* Borders */
  --border:      #2C3831;
  --border2:     #3F4F46;
  
  /* Semantic */
  --success:     #239C65;
  --warning:     #D98700;
  --danger:      #E03B30;
  --info:        #3B82F6;

  /* Legacy mappings */
  --purple:      #2D6B57;
  --cyan:        #86968C;
}
`;

css = css.replace(/:root, \[data-theme="light"\], \[data-theme="dark"\] \{[\s\S]*?\/\* Legacy mappings \*\/[\s\S]*?}/, newVars.trim());

fs.writeFileSync('frontend/src/index.css', css);
console.log('Fixed Dark Mode palette in index.css');
