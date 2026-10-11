const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function clean() {
  const users = await prisma.user.findMany({ where: { firstName: { startsWith: 'Mock' } } });
  for (const u of users) {
    await prisma.user.delete({ where: { id: u.id } });
  }
  console.log('Cleaned mock data');
}
clean().finally(()=>prisma.$disconnect());
