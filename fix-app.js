const fs = require('fs');
let code = fs.readFileSync('frontend/src/App.jsx', 'utf8');

// Remove global SubjectProvider wrapper
code = code.replace(/<SubjectProvider>\s*<Toaster/m, "<Toaster");
code = code.replace(/<\/Routes>\s*<\/SubjectProvider>/m, "</Routes>");

// Add SubjectProvider inside Guard
code = code.replace(/<Route path="\/" element=\{<Guard><Layout \/><\/Guard>\}>/, '<Route path="/" element={<Guard><SubjectProvider><Layout /></SubjectProvider></Guard>}>');

fs.writeFileSync('frontend/src/App.jsx', code);
console.log('Fixed SubjectProvider scope.');
