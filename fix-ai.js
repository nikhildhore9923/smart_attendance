const fs = require('fs');
let code = fs.readFileSync('backend/src/services/recognitionService.js', 'utf8');

const regex = /studentScores\[record\.studentId\] = { similarity: sim, student: record\.student };/g;
const replacement = `studentScores[record.studentId] = { similarity: sim, student: {
          id: record.student.id,
          rollNumber: record.student.rollNumber,
          firstName: record.student.user?.firstName || '',
          lastName: record.student.user?.lastName || '',
          email: record.student.user?.email || ''
        } };`;

code = code.replace(regex, replacement);
fs.writeFileSync('backend/src/services/recognitionService.js', code);
console.log('Fixed recognizeMultipleStudentsFromImage name mapping.');
