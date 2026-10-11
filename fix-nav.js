const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Layout.jsx', 'utf8');

const newNav = `const NAV = [
  { section: 'Main' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { section: 'Attendance' },
  { to: '/live',      icon: Video,           label: 'Live Recognition', dot: 'green' },
  { to: '/log',       icon: ClipboardList,   label: 'Attendance Log' },
  { section: 'Students' },
  { to: '/students',  icon: Users,           label: 'All Students' },
  { to: '/enroll',    icon: UserPlus,        label: 'Enroll Student' },
  { section: 'Academics' },
  { to: '/classes',   icon: BookOpen,        label: 'Classes & Divisions' },
  { to: '/subjects',  icon: Book,            label: 'Subjects' },
  { section: 'Analytics' },
  { to: '/reports',   icon: BarChart3,       label: 'Reports' },
  { section: 'System' },
  { to: '/settings',  icon: Settings,        label: 'Settings' },
]`;

content = content.replace(/const NAV = \[[\s\S]*?\]/, newNav);
fs.writeFileSync('frontend/src/components/Layout.jsx', content);
console.log('Navigation updated in Layout.jsx');
