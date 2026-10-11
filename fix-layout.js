const fs = require('fs');

let layout = fs.readFileSync('frontend/src/components/Layout.jsx', 'utf8');

layout = layout.replace(
  /{ section: 'Academics' },\s*{ to: '\/classes',   icon: BookOpen,        label: 'Classes & Divisions' },\s*{ to: '\/subjects',  icon: Book,            label: 'Subjects' },/g,
  "{ section: 'Academics' },\n  { to: '/classes',   icon: BookOpen,        label: 'Academic Setup' },"
);

fs.writeFileSync('frontend/src/components/Layout.jsx', layout);
console.log('Updated Layout sidebar navigation.');
