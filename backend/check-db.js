const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const embeddings = await prisma.faceEmbedding.findMany({ include: { student: true } });
  let nullStudents = 0;
  for (const e of embeddings) {
    if (!e.student) {
      console.log('Embedding without student:', e.id);
      nullStudents++;
    }
  }
  console.log('Total embeddings:', embeddings.length);
  console.log('Embeddings without students:', nullStudents);
}
run();
