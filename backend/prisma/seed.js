const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  const passwordHash = await bcrypt.hash('admin123', 10);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@college.edu' },
    update: {},
    create: {
      email: 'admin@college.edu',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      passwordHash,
    },
  });

  // Class
  const class1 = await prisma.class.create({
    data: {
      name: 'CSE AIML-B',
      semester: 7,
      subjects: {
        create: [
          { name: 'Machine Learning', code: 'CS701' },
          { name: 'Computer Vision', code: 'CS702' },
        ],
      },
    },
  });

  // Faculty
  const facultyUser = await prisma.user.create({
    data: {
      email: 'faculty@college.edu',
      firstName: 'Vajreshwari',
      lastName: 'Kulal',
      role: 'FACULTY',
      passwordHash,
      faculty: {
        create: {
          department: 'CSE AIML',
        },
      },
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
