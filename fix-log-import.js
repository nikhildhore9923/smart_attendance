const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AttendanceLogPage.jsx', 'utf8');

if (!code.includes("import { useSubject }")) {
  code = code.replace(/import \{ getFullLog, exportCSVUrl \} from '\.\.\/lib\/api'/, "import { getFullLog, exportCSVUrl } from '../lib/api'\nimport { useSubject } from '../context/SubjectContext'");
}

fs.writeFileSync('frontend/src/pages/AttendanceLogPage.jsx', code);
console.log('Fixed missing useSubject import');
