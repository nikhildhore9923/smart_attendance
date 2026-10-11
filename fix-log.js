const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AttendanceLogPage.jsx', 'utf8');

// Remove hardcoded SUBJECTS
code = code.replace(/const SUBJECTS = \['All', 'General', 'Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'Electronics', 'Mechanical'\]/g, "");

// Add useSubject
code = code.replace(/import \{ getAttendanceRecords, exportCSVUrl \} from '\.\.\/lib\/api'/g, "import { getAttendanceRecords, exportCSVUrl } from '../lib/api'\nimport { useSubject } from '../context/SubjectContext'");

code = code.replace(/export default function AttendanceLogPage\(\) \{/g, "export default function AttendanceLogPage() {\n  const { subjects } = useSubject();");

// Replace select options
code = code.replace(/\{SUBJECTS\.map\(s=><option key=\{s\}>\{s\}<\/option>\)\}/g, `<option value="All">All Subjects</option>\n          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}`);

fs.writeFileSync('frontend/src/pages/AttendanceLogPage.jsx', code);
console.log('Fixed AttendanceLogPage.');
