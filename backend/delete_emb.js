const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  await prisma.faceEmbedding.deleteMany({});
  console.log("Deleted all embeddings");
  await prisma.$disconnect();
}
clean();
