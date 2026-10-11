const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setupKitAiml() {
  console.log('========================================================');
  console.log(' Setting up KITCoEK CSE-AIML Academic & Faculty Data   ');
  console.log('========================================================\n');

  const defaultPasswordHash = await bcrypt.hash('admin123', 10);

  // 1. Academic Year: 2026-2027 (Current Active)
  let year2627 = await prisma.academicYear.findUnique({ where: { name: '2026-2027' } });
  if (!year2627) {
    year2627 = await prisma.academicYear.create({
      data: {
        name: '2026-2027',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2027-06-30'),
        isActive: true,
      },
    });
    console.log('✓ Created Academic Year: 2026-2027');
  } else {
    await prisma.academicYear.update({ where: { id: year2627.id }, data: { isActive: true } });
    console.log('✓ Academic Year 2026-2027 already exists (activated)');
  }

  // 2. Program: B. Tech. Computer Science and Engineering (AIML)
  let program = await prisma.program.findFirst({
    where: { name: { contains: 'AIML' } },
  });
  if (!program) {
    program = await prisma.program.create({
      data: { name: 'B. Tech. Computer Science and Engineering (AIML)' },
    });
    console.log('✓ Created Program: B. Tech. CSE (AIML)');
  } else {
    console.log(`✓ Using Program: ${program.name}`);
  }

  // 3. Semesters (III through VIII)
  const semesterNumbers = [3, 4, 5, 6, 7, 8];
  const semesters = {};

  for (const num of semesterNumbers) {
    let sem = await prisma.semester.findFirst({
      where: {
        academicYearId: year2627.id,
        programId: program.id,
        number: num,
      },
    });
    if (!sem) {
      sem = await prisma.semester.create({
        data: {
          number: num,
          academicYearId: year2627.id,
          programId: program.id,
          isActive: true,
        },
      });
      console.log(`✓ Created Semester ${num}`);
    }
    semesters[num] = sem;
  }

  // 4. Divisions / Classes for each year:
  // SY (Sem 3 & 4): SY AIML-A, SY AIML-B, SY AIML-C
  // TY (Sem 5 & 6): TY AIML-A, TY AIML-B, TY AIML-C
  // B.Tech (Sem 7 & 8): B.Tech AIML-A, B.Tech AIML-B, B.Tech DS
  const divisionsData = [
    { semNum: 3, name: 'SY AIML-A' },
    { semNum: 3, name: 'SY AIML-B' },
    { semNum: 3, name: 'SY AIML-C' },
    { semNum: 4, name: 'SY AIML-A' },
    { semNum: 4, name: 'SY AIML-B' },
    { semNum: 4, name: 'SY AIML-C' },
    { semNum: 5, name: 'TY AIML-A' },
    { semNum: 5, name: 'TY AIML-B' },
    { semNum: 5, name: 'TY AIML-C' },
    { semNum: 6, name: 'TY AIML-A' },
    { semNum: 6, name: 'TY AIML-B' },
    { semNum: 6, name: 'TY AIML-C' },
    { semNum: 7, name: 'B.Tech AIML-A' },
    { semNum: 7, name: 'B.Tech AIML-B' },
    { semNum: 7, name: 'B.Tech DS' },
    { semNum: 8, name: 'B.Tech AIML-A' },
    { semNum: 8, name: 'B.Tech AIML-B' },
    { semNum: 8, name: 'B.Tech DS' },
  ];

  const classMap = {};
  for (const div of divisionsData) {
    const sem = semesters[div.semNum];
    let cls = await prisma.class.findFirst({
      where: { name: div.name, semesterId: sem.id },
    });
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          name: div.name,
          semester: div.semNum,
          semesterId: sem.id,
          isActive: true,
        },
      });
      console.log(`✓ Created Division: ${div.name} in Sem ${div.semNum}`);
    }
    classMap[`${div.semNum}_${div.name}`] = cls;
  }

  // 5. Official Syllabus Subjects (from KITCoEK NEP 2024-25 Curriculum)
  const curriculumCourses = [
    // --- SEMESTER VII (B.Tech Final Year Odd) ---
    {
      sem: 7,
      name: 'Generative AI',
      code: 'UAMPC0702',
      divisions: ['B.Tech AIML-A', 'B.Tech AIML-B', 'B.Tech DS'],
    },
    {
      sem: 7,
      name: 'Information Security',
      code: 'UAMPC0701',
      divisions: ['B.Tech AIML-A', 'B.Tech AIML-B'],
    },
    {
      sem: 7,
      name: 'Internet of Things & Cloud Computing',
      code: 'UAMPC0703',
      divisions: ['B.Tech AIML-A', 'B.Tech AIML-B'],
    },
    {
      sem: 7,
      name: 'ML DevOps Laboratory',
      code: 'UAMPC0732',
      divisions: ['B.Tech AIML-A', 'B.Tech AIML-B', 'B.Tech DS'],
    },
    {
      sem: 7,
      name: 'Advance Deep Learning Laboratory',
      code: 'UAMPC0731',
      divisions: ['B.Tech AIML-A', 'B.Tech AIML-B'],
    },
    {
      sem: 7,
      name: 'AI in Healthcare (PE-III)',
      code: 'UAMPE0711',
      divisions: ['B.Tech AIML-A', 'B.Tech AIML-B', 'B.Tech DS'],
    },
    {
      sem: 7,
      name: 'Project-I (Capstone)',
      code: 'UAMIL0771',
      divisions: ['B.Tech AIML-A', 'B.Tech AIML-B', 'B.Tech DS'],
    },

    // --- SEMESTER VI (TY Even) ---
    {
      sem: 6,
      name: 'Deep Learning',
      code: 'UAMPC0601',
      divisions: ['TY AIML-A', 'TY AIML-B', 'TY AIML-C'],
    },
    {
      sem: 6,
      name: 'Natural Language Processing',
      code: 'UAMPC0602',
      divisions: ['TY AIML-A', 'TY AIML-B', 'TY AIML-C'],
    },
    {
      sem: 6,
      name: 'Image Processing & Computer Vision',
      code: 'UAMPC0603',
      divisions: ['TY AIML-A', 'TY AIML-B', 'TY AIML-C'],
    },
    {
      sem: 6,
      name: 'Software Engineering & Project Management',
      code: 'UAMEM0604',
      divisions: ['TY AIML-A', 'TY AIML-B', 'TY AIML-C'],
    },
    {
      sem: 6,
      name: 'Advanced Web Development Laboratory',
      code: 'UAMPC0633',
      divisions: ['TY AIML-A', 'TY AIML-B'],
    },

    // --- SEMESTER V (TY Odd) ---
    {
      sem: 5,
      name: 'Machine Learning',
      code: 'UAMPC0501',
      divisions: ['TY AIML-A', 'TY AIML-B', 'TY AIML-C'],
    },
    {
      sem: 5,
      name: 'Computer Organization and Operating System',
      code: 'UAMPC0502',
      divisions: ['TY AIML-A', 'TY AIML-B', 'TY AIML-C'],
    },
    {
      sem: 5,
      name: 'Exploratory Data Analytics',
      code: 'UAMPC0503',
      divisions: ['TY AIML-A', 'TY AIML-B', 'TY AIML-C'],
    },
    {
      sem: 5,
      name: 'Machine Learning Laboratory',
      code: 'UAMPC0531',
      divisions: ['TY AIML-A', 'TY AIML-B'],
    },

    // --- SEMESTER IV (SY Even) ---
    {
      sem: 4,
      name: 'Computer Networks',
      code: 'UAMPC0401',
      divisions: ['SY AIML-A', 'SY AIML-B', 'SY AIML-C'],
    },
    {
      sem: 4,
      name: 'Automata Theory',
      code: 'UAMPC0402',
      divisions: ['SY AIML-A', 'SY AIML-B', 'SY AIML-C'],
    },
    {
      sem: 4,
      name: 'Design and Analysis of Algorithms',
      code: 'UAMPC0403',
      divisions: ['SY AIML-A', 'SY AIML-B', 'SY AIML-C'],
    },
    {
      sem: 4,
      name: 'Object Oriented Programming in Java',
      code: 'UAMPC0405',
      divisions: ['SY AIML-A', 'SY AIML-B', 'SY AIML-C'],
    },

    // --- SEMESTER III (SY Odd) ---
    {
      sem: 3,
      name: 'Linear Algebra',
      code: 'UAMPC0301',
      divisions: ['SY AIML-A', 'SY AIML-B', 'SY AIML-C'],
    },
    {
      sem: 3,
      name: 'Discrete Mathematics and Graph Theory',
      code: 'UAMPC0302',
      divisions: ['SY AIML-A', 'SY AIML-B', 'SY AIML-C'],
    },
    {
      sem: 3,
      name: 'Advanced Data Structures',
      code: 'UAMPC0303',
      divisions: ['SY AIML-A', 'SY AIML-B', 'SY AIML-C'],
    },
    {
      sem: 3,
      name: 'Database Management System',
      code: 'UAMPC0304',
      divisions: ['SY AIML-A', 'SY AIML-B', 'SY AIML-C'],
    },
    {
      sem: 3,
      name: 'Principles of AIML',
      code: 'UAMEM0306',
      divisions: ['SY AIML-A', 'SY AIML-B', 'SY AIML-C'],
    },
  ];

  const subjectMap = {};
  for (const c of curriculumCourses) {
    const sem = semesters[c.sem];
    let sub = await prisma.subject.findFirst({
      where: { code: c.code, semesterId: sem.id },
    });

    const targetClassIds = c.divisions
      .map(d => classMap[`${c.sem}_${d}`]?.id)
      .filter(Boolean);

    if (!sub) {
      sub = await prisma.subject.create({
        data: {
          name: c.name,
          code: c.code,
          semesterId: sem.id,
          isActive: true,
          classes: { connect: targetClassIds.map(id => ({ id })) },
        },
      });
      console.log(`✓ Created Course: ${c.code} - ${c.name} (Sem ${c.sem})`);
    } else {
      await prisma.subject.update({
        where: { id: sub.id },
        data: {
          classes: { connect: targetClassIds.map(id => ({ id })) },
        },
      });
    }
    subjectMap[c.code] = sub;
  }

  // 6. Real Faculty Staff from Department of CSE-AIML & CSE-DS, KITCoEK
  const facultyStaff = [
    {
      firstName: 'Dr. Uma',
      lastName: 'Gurav',
      email: 'gurav.uma@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Professor & H.O.D.',
      allocatedCodes: ['UAMPC0702', 'UAMPC0601'], // GenAI, Deep Learning
    },
    {
      firstName: 'Dr. Pradeep',
      lastName: 'Khot',
      email: 'khot.pradeep@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Associate Professor',
      allocatedCodes: ['UAMPC0304', 'UAMPC0602', 'UAMPC0501'], // DBMS, NLP, ML
    },
    {
      firstName: 'Dr. Arvind',
      lastName: 'Kamble',
      email: 'kamble.arvind@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Associate Professor',
      allocatedCodes: ['UAMPC0701', 'UAMPC0304'], // Information Security / CBCS, DBMS
    },
    {
      firstName: 'Vinay',
      lastName: 'Prabhavlkar',
      email: 'prabhavlkar.vinay@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0732', 'UAMPC0501', 'UAMEM0604'], // ML DevOps, ML, SEPM
    },
    {
      firstName: 'Vajreshwari',
      lastName: 'Kulal',
      email: 'kulal.vajreshwari@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0702', 'UAMPE0711', 'UAMPC0603', 'UAMEM0306'], // GenAI, PE-III, Computer Vision, Principles of AIML
    },
    {
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: 'kumar.rajesh@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0702', 'UAMPC0603', 'UAMPC0531'], // GenAI, Computer Vision, ML Lab
    },
    {
      firstName: 'Sujeeta',
      lastName: 'Shah',
      email: 'shah.sujeeta@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0304', 'UAMPC0503'], // DBMS, Exploratory Data Analytics
    },
    {
      firstName: 'Sapana',
      lastName: 'Buwa',
      email: 'buwa.sapana@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0302', 'UAMPC0402'], // Discrete Math, Automata Theory
    },
    {
      firstName: 'Amruta',
      lastName: 'Chougule',
      email: 'chougule.amruta@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0502'], // COOS
    },
    {
      firstName: 'Nitin',
      lastName: 'Magdum',
      email: 'magdum.nitin@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0405'], // OOP in Java
    },
    {
      firstName: 'Vrishali',
      lastName: 'Prabhu',
      email: 'prabhu.vrishali@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0702', 'UAMPC0501'], // GenAI (DS), ML
    },
    {
      firstName: 'Sujay',
      lastName: 'Lande',
      email: 'lande.sujay@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0403'], // DAA
    },
    {
      firstName: 'Sayali',
      lastName: 'Mane',
      email: 'mane.sayali@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0503'], // EDA
    },
    {
      firstName: 'Komal',
      lastName: 'Jadhav',
      email: 'jadhav.komal@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0303'], // Advanced Data Structures
    },
    {
      firstName: 'Nikhil',
      lastName: 'Bhosale',
      email: 'bhosale.nikhil@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0401'], // Computer Networks
    },
    {
      firstName: 'Shanu Kumar',
      lastName: 'Gupta',
      email: 'gupta.shanukumar@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0633'], // Web Development Lab
    },
    {
      firstName: 'Sharvari',
      lastName: 'Chavan',
      email: 'chavan.sharvari.g@kitcoek.in',
      department: 'CSE-AIML',
      designation: 'Assistant Professor',
      allocatedCodes: ['UAMPC0405'], // OOP Lab
    },
  ];

  console.log('\n--- Creating & Allocating Faculty Profiles ---');
  for (const staff of facultyStaff) {
    let user = await prisma.user.findUnique({ where: { email: staff.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: staff.email,
          passwordHash: defaultPasswordHash,
          role: 'FACULTY',
          firstName: staff.firstName,
          lastName: staff.lastName,
        },
      });
      console.log(`✓ Created User Account: ${staff.email}`);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: 'FACULTY',
        },
      });
    }

    let faculty = await prisma.faculty.findUnique({ where: { id: user.id } });
    if (!faculty) {
      faculty = await prisma.faculty.create({
        data: {
          id: user.id,
          department: staff.department,
        },
      });
      console.log(`✓ Created Faculty Profile for ${staff.firstName} ${staff.lastName}`);
    }

    // Connect allocated courses
    const targetSubjectIds = staff.allocatedCodes
      .map(code => subjectMap[code]?.id)
      .filter(Boolean);

    if (targetSubjectIds.length > 0) {
      await prisma.faculty.update({
        where: { id: faculty.id },
        data: {
          subjects: {
            connect: targetSubjectIds.map(id => ({ id })),
          },
        },
      });
      console.log(`  └─ Allocated ${targetSubjectIds.length} courses to ${staff.firstName} ${staff.lastName}`);
    }
  }

  // 7. Ensure demo faculty (faculty@college.edu) is linked with Vajreshwari Kulal's courses
  // so the user's one-click Faculty Demo button works seamlessly!
  const demoFacultyUser = await prisma.user.findUnique({ where: { email: 'faculty@college.edu' } });
  if (demoFacultyUser) {
    const demoCourses = ['UAMPC0702', 'UAMPE0711', 'UAMPC0603', 'UAMEM0306']
      .map(code => subjectMap[code]?.id)
      .filter(Boolean);

    await prisma.faculty.update({
      where: { id: demoFacultyUser.id },
      data: {
        department: 'CSE-AIML',
        subjects: {
          connect: demoCourses.map(id => ({ id })),
        },
      },
    });
    console.log(`✓ Synchronized demo account (faculty@college.edu) with Vajreshwari Kulal's 4 active courses.`);
  }

  // 8. Safely link existing enrolled students to 'B.Tech AIML-A' so they appear in reports and live attendance
  const btechAimlaClass = classMap['7_B.Tech AIML-A'];
  if (btechAimlaClass) {
    const updatedCount = await prisma.student.updateMany({
      where: { isEnrolled: true, classId: null },
      data: { classId: btechAimlaClass.id },
    });
    if (updatedCount.count > 0) {
      console.log(`✓ Assigned ${updatedCount.count} enrolled student(s) to B.Tech AIML-A division.`);
    }
  }

  console.log('\n========================================================');
  console.log(' Setup completed successfully for KITCoEK CSE-AIML!    ');
  console.log('========================================================\n');
}

setupKitAiml()
  .catch(err => {
    console.error('Setup error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
