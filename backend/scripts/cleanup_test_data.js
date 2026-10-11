const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const TEST_NAMES = ['John Doe', 'End Toend', 'Attend Test', 'Comp Test', 'Real Face'];

async function cleanup() {
  console.log('--- Database Cleanup Tool ---');
  console.log('This will safely identify and remove test/demonstration students.');
  console.log('Test names being targeted:', TEST_NAMES.join(', '));
  
  const testUsers = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      OR: TEST_NAMES.map(name => {
        const [first, last] = name.split(' ');
        return { firstName: first, lastName: last };
      })
    },
    include: { student: true }
  });

  if (testUsers.length === 0) {
    console.log('No test records found. Your database is clean.');
    process.exit(0);
  }

  console.log(`\nFound ${testUsers.length} test records:`);
  testUsers.forEach(u => {
    console.log(`- ${u.firstName} ${u.lastName} (Roll: ${u.student?.rollNumber || 'N/A'}, Email: ${u.email})`);
  });

  rl.question('\nAre you sure you want to DELETE these records, including their face embeddings and attendance? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      try {
        const ids = testUsers.map(u => u.id);
        const result = await prisma.user.deleteMany({
          where: { id: { in: ids } }
        });
        console.log(`\nSuccessfully deleted ${result.count} test records!`);
      } catch (e) {
        console.error('Error during deletion:', e);
      }
    } else {
      console.log('Cleanup cancelled. No data was deleted.');
    }
    
    await prisma.$disconnect();
    rl.close();
  });
}

cleanup().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
