const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDummyData() {
  console.log('========================================================');
  console.log(' Cleaning Up Dummy & Redundant Test Records            ');
  console.log('========================================================\n');

  // 1. Identify real faculty target to inherit legacy test sessions
  const targetFaculty = await prisma.faculty.findFirst({
    where: { user: { email: { in: ['kulal.vajreshwari@kitcoek.in', 'faculty@college.edu'] } } },
  });
  const hodFaculty = await prisma.faculty.findFirst({
    where: { user: { email: 'gurav.uma@kitcoek.in' } },
  });

  const realGenAi = await prisma.subject.findFirst({ where: { code: 'UAMPC0702' } });
  const realMl = await prisma.subject.findFirst({ where: { code: 'UAMPC0501' } });
  const realIpcv = await prisma.subject.findFirst({ where: { code: 'UAMPC0603' } });

  // 2. Re-link legacy sessions on dummy subjects to real curriculum subjects
  if (realIpcv) {
    const s801 = await prisma.subject.findFirst({ where: { code: 'CS801' } });
    if (s801) {
      const updated = await prisma.attendanceSession.updateMany({
        where: { subjectId: s801.id },
        data: {
          subjectId: realIpcv.id,
          facultyId: targetFaculty ? targetFaculty.id : undefined,
        },
      });
      console.log(`✓ Re-linked ${updated.count} legacy session(s) from CS801 to UAMPC0603 (${realIpcv.name})`);
    }

    const s702 = await prisma.subject.findFirst({ where: { code: 'CS702' } });
    if (s702) {
      const updated = await prisma.attendanceSession.updateMany({
        where: { subjectId: s702.id },
        data: {
          subjectId: realIpcv.id,
          facultyId: targetFaculty ? targetFaculty.id : undefined,
        },
      });
      console.log(`✓ Re-linked ${updated.count} legacy session(s) from CS702 to UAMPC0603 (${realIpcv.name})`);
    }
  }

  if (realMl) {
    const s701 = await prisma.subject.findFirst({ where: { code: 'CS701' } });
    if (s701) {
      const updated = await prisma.attendanceSession.updateMany({
        where: { subjectId: s701.id },
        data: {
          subjectId: realMl.id,
          facultyId: targetFaculty ? targetFaculty.id : undefined,
        },
      });
      console.log(`✓ Re-linked ${updated.count} legacy session(s) from CS701 to UAMPC0501 (${realMl.name})`);
    }
  }

  // 3. Re-link any sessions owned by dummy Jane Smith accounts
  const dummyFacultyUsers = await prisma.user.findMany({
    where: { email: { contains: 'faculty179122' } },
  });
  for (const dfu of dummyFacultyUsers) {
    if (targetFaculty) {
      await prisma.attendanceSession.updateMany({
        where: { facultyId: dfu.id },
        data: { facultyId: targetFaculty.id },
      });
    }
    // Delete faculty profile & user
    await prisma.faculty.deleteMany({ where: { id: dfu.id } });
    await prisma.user.deleteMany({ where: { id: dfu.id } });
    console.log(`✓ Removed dummy faculty account: ${dfu.email}`);
  }

  // 4. Delete obsolete dummy subjects (pre-NEP and test subjects)
  const dummySubjectCodes = [
    'CS801',
    'CS702',
    'CS701',
    'CS801-1791221148058',
    'CS801-1791221941942',
    'CS801-1791221079590',
  ];
  for (const code of dummySubjectCodes) {
    const sub = await prisma.subject.findFirst({ where: { code } });
    if (sub) {
      // Disconnect relations first
      await prisma.subject.update({
        where: { id: sub.id },
        data: { classes: { set: [] }, faculties: { set: [] } },
      });
      await prisma.subject.delete({ where: { id: sub.id } });
      console.log(`✓ Deleted legacy/dummy subject: ${code} (${sub.name})`);
    }
  }

  // 5. Target real official division: 'B.Tech AIML-A'
  const officialClass = await prisma.class.findFirst({
    where: { name: 'B.Tech AIML-A', semester: 7 },
  });

  // Re-link real student 'Nikhil Dhore' and 'Real Face' into official B.Tech AIML-A
  if (officialClass) {
    await prisma.student.updateMany({
      where: {
        OR: [
          { rollNumber: '31' },
          { rollNumber: 'REAL-1791221686655' },
          { user: { email: 'dhorenikhil46@gmail.com' } },
        ],
      },
      data: { classId: officialClass.id },
    });
    console.log(`✓ Linked Nikhil Dhore and primary enrolled student to official division: B.Tech AIML-A`);
  }

  // 6. Delete test / dummy students (Mock, Attend Test, E2E, and unenrolled duplicates)
  const dummyRollPrefixes = ['MOCK', 'ATT-', 'E2E-', 'COMP-17912219', 'COMP-17912243', 'AI2026-'];
  const dummyStudentRolls = [
    'AI2026001',
    'REAL-1791221414755',
    'REAL-1791221550073',
    'REAL-1791221243113',
    'REAL-1791224439357',
  ];

  const studentsToDelete = await prisma.student.findMany({
    where: {
      OR: [
        ...dummyRollPrefixes.map(prefix => ({ rollNumber: { startsWith: prefix } })),
        ...dummyStudentRolls.map(roll => ({ rollNumber: roll })),
      ],
    },
    include: { embeddings: true },
  });

  for (const s of studentsToDelete) {
    // Keep embeddings/record if it's the primary real student
    if (s.rollNumber === 'REAL-1791221686655' || s.rollNumber === '31') continue;

    // Delete attendance records for this dummy student
    await prisma.attendanceRecord.deleteMany({ where: { studentId: s.id } });
    // Delete face embeddings for this dummy student
    await prisma.faceEmbedding.deleteMany({ where: { studentId: s.id } });
    // Delete student
    await prisma.student.delete({ where: { id: s.id } });
    // Delete user
    await prisma.user.delete({ where: { id: s.id } });
    console.log(`✓ Removed dummy test student: ${s.rollNumber}`);
  }

  // 7. Delete obsolete test classes
  const dummyClassNames = [
    'B.Tech CSE - AI & ML 1791221079590',
    'B.Tech CSE - AI & ML 1791221941942',
    'B.Tech CSE - AI & ML 1791221148058',
    'B.Tech CSE - AI & ML',
    'CSE AIML-B',
  ];

  for (const name of dummyClassNames) {
    const cls = await prisma.class.findFirst({ where: { name } });
    if (cls) {
      // Re-assign any remaining students to officialClass
      if (officialClass) {
        await prisma.student.updateMany({
          where: { classId: cls.id },
          data: { classId: officialClass.id },
        });
      }
      await prisma.class.update({
        where: { id: cls.id },
        data: { subjects: { set: [] } },
      });
      await prisma.class.delete({ where: { id: cls.id } });
      console.log(`✓ Deleted legacy/dummy class: ${name}`);
    }
  }

  console.log('\n========================================================');
  console.log(' Database cleanup completed! Only real data remains.  ');
  console.log('========================================================\n');
}

cleanupDummyData()
  .catch(err => {
    console.error('Cleanup error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
