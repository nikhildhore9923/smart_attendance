const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateStudents() {
  const c = await prisma.class.findFirst();
  if (c) {
    await prisma.student.updateMany({ data: { classId: c.id } });
    console.log('Updated students to class ' + c.name);
  } else {
    console.log('No classes found');
  }
  await prisma.$disconnect();
}
updateStudents();
