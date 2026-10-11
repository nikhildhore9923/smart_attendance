const fs = require('fs');
let content = fs.readFileSync('backend/src/controllers/studentController.js', 'utf8');

const oldDestruct = `const { email, password, firstName, lastName, rollNumber } = req.body;`;
const newDestruct = `const { email, password, firstName, lastName, rollNumber, classId } = req.body;`;

const oldCreate = `        const newStudent = await tx.student.create({
          data: {
            id: newUser.id,
            rollNumber,
            isEnrolled: false
          }
        });`;
const newCreate = `        const newStudent = await tx.student.create({
          data: {
            id: newUser.id,
            rollNumber,
            classId: classId || null,
            isEnrolled: false
          }
        });`;

content = content.replace(oldDestruct, newDestruct);
content = content.replace(oldCreate, newCreate);

fs.writeFileSync('backend/src/controllers/studentController.js', content);
console.log('Backend createStudent enhanced');
