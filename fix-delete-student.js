const fs = require('fs');
let content = fs.readFileSync('backend/src/controllers/studentController.js', 'utf8');

const oldDelete = `
const deleteStudent = async (req, res) => {
  const { id: rollNumber } = req.params; // It's actually rollNumber from the frontend
  try {
    const student = await prisma.student.findUnique({ where: { rollNumber } });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    await prisma.user.delete({ where: { id: student.id } });
    res.json({ message: 'Student removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove student' });
  }
};
`;

const newDelete = `
const deleteStudent = async (req, res) => {
  const { id: rollNumber } = req.params;
  try {
    const student = await prisma.student.findUnique({ where: { rollNumber } });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    // Safely deactivate instead of deleting to preserve history
    await prisma.student.update({
      where: { rollNumber },
      data: { isEnrolled: false }
    });
    res.json({ message: 'Student deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate student' });
  }
};
`;

content = content.replace(oldDelete.trim(), newDelete.trim());
fs.writeFileSync('backend/src/controllers/studentController.js', content);
console.log('deleteStudent updated to deactivate');
