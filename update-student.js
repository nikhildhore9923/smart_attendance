const fs = require('fs');
let content = fs.readFileSync('backend/src/controllers/studentController.js', 'utf8');

const updateBlock = `
const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, rollNumber, classId } = req.body;
  try {
    const student = await prisma.student.findUnique({ where: { rollNumber: id } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: student.id },
        data: { firstName, lastName }
      });
      await tx.student.update({
        where: { id: student.id },
        data: { rollNumber, classId }
      });
    });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Roll number exists' });
    res.status(500).json({ error: 'Failed to update student' });
  }
};
`;

content = content.replace("module.exports = {", updateBlock + "\nmodule.exports = {\n  updateStudent,");
fs.writeFileSync('backend/src/controllers/studentController.js', content);

let routes = fs.readFileSync('backend/src/routes/studentRoutes.js', 'utf8');
routes = routes.replace("const { getStudents", "const { updateStudent, getStudents");
routes = routes.replace("router.get('/:id', authorize('ADMIN', 'FACULTY', 'STUDENT'), getStudentById);", "router.get('/:id', authorize('ADMIN', 'FACULTY', 'STUDENT'), getStudentById);\nrouter.put('/:id', authorize('ADMIN'), updateStudent);");
fs.writeFileSync('backend/src/routes/studentRoutes.js', routes);

console.log('Student update added');
