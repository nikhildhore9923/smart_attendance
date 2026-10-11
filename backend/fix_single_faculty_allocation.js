const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllocations() {
  console.log('========================================================');
  console.log(' Restructuring Courses to Single-Faculty per Division   ');
  console.log('========================================================\n');

  // 1. Unify duplicate Vajreshwari Kulal accounts
  const demoUser = await prisma.user.findUnique({ where: { email: 'faculty@college.edu' } });
  const realVajreshwari = await prisma.user.findUnique({ where: { email: 'kulal.vajreshwari@kitcoek.in' } });

  let primaryVajreshwariFacultyId;
  if (realVajreshwari && demoUser) {
    // Transfer any sessions from demoUser to realVajreshwari
    await prisma.attendanceSession.updateMany({
      where: { facultyId: demoUser.id },
      data: { facultyId: realVajreshwari.id },
    });
    // Remove the duplicate demo faculty profile and user
    await prisma.faculty.deleteMany({ where: { id: demoUser.id } });
    await prisma.user.deleteMany({ where: { id: demoUser.id } });
    // Update realVajreshwari password to admin123
    await prisma.user.update({
      where: { id: realVajreshwari.id },
      data: { email: 'faculty@college.edu' }, // Use faculty@college.edu so demo button works, with her real name!
    });
    primaryVajreshwariFacultyId = realVajreshwari.id;
    console.log('✓ Unified Vajreshwari Kulal accounts into a single official faculty record.');
  } else if (demoUser) {
    primaryVajreshwariFacultyId = demoUser.id;
  } else if (realVajreshwari) {
    primaryVajreshwariFacultyId = realVajreshwari.id;
  }

  // Map all faculty by email / name for easy assignment
  const allFaculty = await prisma.faculty.findMany({
    include: { user: true },
  });

  const facultyByEmail = {};
  for (const f of allFaculty) {
    facultyByEmail[f.user.email] = f;
  }

  const getFac = (emailKey) => {
    return facultyByEmail[emailKey] || allFaculty.find(f => f.user.email.includes(emailKey) || f.user.lastName.toLowerCase().includes(emailKey.toLowerCase()));
  };

  const fGurav = getFac('gurav.uma@kitcoek.in');
  const fKhot = getFac('khot.pradeep@kitcoek.in');
  const fKamble = getFac('kamble.arvind@kitcoek.in');
  const fPrabhavlkar = getFac('prabhavlkar.vinay@kitcoek.in');
  const fVajreshwari = allFaculty.find(f => f.id === primaryVajreshwariFacultyId) || getFac('faculty@college.edu');
  const fKumar = getFac('kumar.rajesh@kitcoek.in');
  const fShah = getFac('shah.sujeeta@kitcoek.in');
  const fBuwa = getFac('buwa.sapana@kitcoek.in');
  const fChougule = getFac('chougule.amruta@kitcoek.in');
  const fMagdum = getFac('magdum.nitin@kitcoek.in');
  const fPrabhu = getFac('prabhu.vrishali@kitcoek.in');
  const fLande = getFac('lande.sujay@kitcoek.in');
  const fMane = getFac('mane.sayali@kitcoek.in');
  const fJadhav = getFac('jadhav.komal@kitcoek.in');
  const fBhosale = getFac('bhosale.nikhil@kitcoek.in');
  const fGupta = getFac('gupta.shanukumar@kitcoek.in');
  const fChavan = getFac('chavan.sharvari.g@kitcoek.in');
  const fKadam = getFac('kadam.digvijay@kitcoek.in');

  // Fetch all classes
  const classes = await prisma.class.findMany();
  const classByName = {};
  for (const c of classes) {
    classByName[`${c.semester}_${c.name}`] = c;
  }

  // Clear all previous subject relations and old subjects
  // First re-assign any existing attendance sessions to null subject or remember them
  const existingSessions = await prisma.attendanceSession.findMany();
  console.log(`Found ${existingSessions.length} existing sessions to preserve.`);

  // Disconnect faculties and classes from all existing subjects
  const oldSubjects = await prisma.subject.findMany();
  for (const s of oldSubjects) {
    await prisma.subject.update({
      where: { id: s.id },
      data: {
        classes: { set: [] },
        faculties: { set: [] },
      },
    });
  }

  // Delete old shared subjects (we will recreate per-division subjects)
  // To avoid foreign key failure with sessions, first create placeholder mapping
  console.log('--- Creating Per-Division Single-Faculty Subjects ---');

  // Exact Division-Specific Course Allocations (Each division gets EXACTLY 1 Teacher per course!)
  const allocationPlan = [
    // ==========================================
    // SEMESTER 3 (Second Year Odd)
    // ==========================================
    // --- SY AIML-A ---
    { sem: 3, div: 'SY AIML-A', code: 'UAMPC0301', name: 'Linear Algebra', fac: fKamble },
    { sem: 3, div: 'SY AIML-A', code: 'UAMPC0302', name: 'Discrete Mathematics and Graph Theory', fac: fBuwa },
    { sem: 3, div: 'SY AIML-A', code: 'UAMPC0303', name: 'Advanced Data Structures', fac: fJadhav },
    { sem: 3, div: 'SY AIML-A', code: 'UAMPC0304', name: 'Database Management System', fac: fShah },
    { sem: 3, div: 'SY AIML-A', code: 'UAMEM0306', name: 'Principles of AIML', fac: fMane },

    // --- SY AIML-B ---
    { sem: 3, div: 'SY AIML-B', code: 'UAMPC0301', name: 'Linear Algebra', fac: fBhosale },
    { sem: 3, div: 'SY AIML-B', code: 'UAMPC0302', name: 'Discrete Mathematics and Graph Theory', fac: fChavan },
    { sem: 3, div: 'SY AIML-B', code: 'UAMPC0303', name: 'Advanced Data Structures', fac: fJadhav },
    { sem: 3, div: 'SY AIML-B', code: 'UAMPC0304', name: 'Database Management System', fac: fKhot },
    { sem: 3, div: 'SY AIML-B', code: 'UAMEM0306', name: 'Principles of AIML', fac: fVajreshwari },

    // --- SY AIML-C ---
    { sem: 3, div: 'SY AIML-C', code: 'UAMPC0301', name: 'Linear Algebra', fac: fGupta },
    { sem: 3, div: 'SY AIML-C', code: 'UAMPC0302', name: 'Discrete Mathematics and Graph Theory', fac: fBuwa },
    { sem: 3, div: 'SY AIML-C', code: 'UAMPC0303', name: 'Advanced Data Structures', fac: fJadhav },
    { sem: 3, div: 'SY AIML-C', code: 'UAMPC0304', name: 'Database Management System', fac: fKamble },
    { sem: 3, div: 'SY AIML-C', code: 'UAMEM0306', name: 'Principles of AIML', fac: fVajreshwari },

    // ==========================================
    // SEMESTER 4 (Second Year Even)
    // ==========================================
    // --- SY AIML-A ---
    { sem: 4, div: 'SY AIML-A', code: 'UAMPC0401', name: 'Computer Networks', fac: fMane },
    { sem: 4, div: 'SY AIML-A', code: 'UAMPC0402', name: 'Automata Theory', fac: fBuwa },
    { sem: 4, div: 'SY AIML-A', code: 'UAMPC0403', name: 'Design and Analysis of Algorithms', fac: fLande },
    { sem: 4, div: 'SY AIML-A', code: 'UAMPC0405', name: 'Object Oriented Programming in Java', fac: fMagdum },

    // --- SY AIML-B ---
    { sem: 4, div: 'SY AIML-B', code: 'UAMPC0401', name: 'Computer Networks', fac: fBhosale },
    { sem: 4, div: 'SY AIML-B', code: 'UAMPC0402', name: 'Automata Theory', fac: fKhot },
    { sem: 4, div: 'SY AIML-B', code: 'UAMPC0403', name: 'Design and Analysis of Algorithms', fac: fLande },
    { sem: 4, div: 'SY AIML-B', code: 'UAMPC0405', name: 'Object Oriented Programming in Java', fac: fBhosale },

    // --- SY AIML-C ---
    { sem: 4, div: 'SY AIML-C', code: 'UAMPC0401', name: 'Computer Networks', fac: fBhosale },
    { sem: 4, div: 'SY AIML-C', code: 'UAMPC0402', name: 'Automata Theory', fac: fBuwa },
    { sem: 4, div: 'SY AIML-C', code: 'UAMPC0403', name: 'Design and Analysis of Algorithms', fac: fJadhav },
    { sem: 4, div: 'SY AIML-C', code: 'UAMPC0405', name: 'Object Oriented Programming in Java', fac: fMagdum },

    // ==========================================
    // SEMESTER 5 (Third Year Odd)
    // ==========================================
    // --- TY AIML-A ---
    { sem: 5, div: 'TY AIML-A', code: 'UAMPC0501', name: 'Machine Learning', fac: fPrabhavlkar },
    { sem: 5, div: 'TY AIML-A', code: 'UAMPC0502', name: 'Computer Organization and Operating System', fac: fChougule },
    { sem: 5, div: 'TY AIML-A', code: 'UAMPC0503', name: 'Exploratory Data Analytics', fac: fMane },

    // --- TY AIML-B ---
    { sem: 5, div: 'TY AIML-B', code: 'UAMPC0501', name: 'Machine Learning', fac: fKhot },
    { sem: 5, div: 'TY AIML-B', code: 'UAMPC0502', name: 'Computer Organization and Operating System', fac: fChougule },
    { sem: 5, div: 'TY AIML-B', code: 'UAMPC0503', name: 'Exploratory Data Analytics', fac: fShah },

    // --- TY AIML-C ---
    { sem: 5, div: 'TY AIML-C', code: 'UAMPC0501', name: 'Machine Learning', fac: fPrabhu },
    { sem: 5, div: 'TY AIML-C', code: 'UAMPC0502', name: 'Computer Organization and Operating System', fac: fChougule },
    { sem: 5, div: 'TY AIML-C', code: 'UAMPC0503', name: 'Exploratory Data Analytics', fac: fKamble },

    // ==========================================
    // SEMESTER 6 (Third Year Even)
    // ==========================================
    // --- TY AIML-A ---
    { sem: 6, div: 'TY AIML-A', code: 'UAMPC0601', name: 'Deep Learning', fac: fGurav },
    { sem: 6, div: 'TY AIML-A', code: 'UAMPC0602', name: 'Natural Language Processing', fac: fKhot },
    { sem: 6, div: 'TY AIML-A', code: 'UAMPC0603', name: 'Image Processing & Computer Vision', fac: fKumar },
    { sem: 6, div: 'TY AIML-A', code: 'UAMEM0604', name: 'Software Engineering & Project Management', fac: fPrabhavlkar },

    // --- TY AIML-B ---
    { sem: 6, div: 'TY AIML-B', code: 'UAMPC0601', name: 'Deep Learning', fac: fChougule },
    { sem: 6, div: 'TY AIML-B', code: 'UAMPC0602', name: 'Natural Language Processing', fac: fShah },
    { sem: 6, div: 'TY AIML-B', code: 'UAMPC0603', name: 'Image Processing & Computer Vision', fac: fKumar },
    { sem: 6, div: 'TY AIML-B', code: 'UAMEM0604', name: 'Software Engineering & Project Management', fac: fPrabhavlkar },

    // --- TY AIML-C ---
    { sem: 6, div: 'TY AIML-C', code: 'UAMPC0601', name: 'Deep Learning', fac: fChougule },
    { sem: 6, div: 'TY AIML-C', code: 'UAMPC0602', name: 'Natural Language Processing', fac: fShah },
    { sem: 6, div: 'TY AIML-C', code: 'UAMPC0603', name: 'Image Processing & Computer Vision', fac: fMagdum },
    { sem: 6, div: 'TY AIML-C', code: 'UAMEM0604', name: 'Software Engineering & Project Management', fac: fShah },

    // ==========================================
    // SEMESTER 7 (Final Year Odd)
    // ==========================================
    // --- B.Tech AIML-A ---
    { sem: 7, div: 'B.Tech AIML-A', code: 'UAMPC0702', name: 'Generative AI', fac: fGurav },
    { sem: 7, div: 'B.Tech AIML-A', code: 'UAMPC0701', name: 'Information Security', fac: fKamble },
    { sem: 7, div: 'B.Tech AIML-A', code: 'UAMPC0703', name: 'Internet of Things & Cloud Computing', fac: fKumar },
    { sem: 7, div: 'B.Tech AIML-A', code: 'UAMPC0732', name: 'ML DevOps Laboratory', fac: fPrabhavlkar },
    { sem: 7, div: 'B.Tech AIML-A', code: 'UAMPE0711', name: 'AI in Healthcare (PE-III)', fac: fVajreshwari },

    // --- B.Tech AIML-B ---
    { sem: 7, div: 'B.Tech AIML-B', code: 'UAMPC0702', name: 'Generative AI', fac: fKumar },
    { sem: 7, div: 'B.Tech AIML-B', code: 'UAMPC0701', name: 'Information Security', fac: fKamble },
    { sem: 7, div: 'B.Tech AIML-B', code: 'UAMPC0703', name: 'Internet of Things & Cloud Computing', fac: fBhosale },
    { sem: 7, div: 'B.Tech AIML-B', code: 'UAMPC0732', name: 'ML DevOps Laboratory', fac: fShah },
    { sem: 7, div: 'B.Tech AIML-B', code: 'UAMPE0711', name: 'AI in Healthcare (PE-III)', fac: fVajreshwari },

    // --- B.Tech DS ---
    { sem: 7, div: 'B.Tech DS', code: 'UAMPC0702', name: 'Generative AI', fac: fPrabhu },
    { sem: 7, div: 'B.Tech DS', code: 'UAMPC0701', name: 'Information Security', fac: fKamble },
    { sem: 7, div: 'B.Tech DS', code: 'UAMPC0703', name: 'Internet of Things & Cloud Computing', fac: fChougule },
    { sem: 7, div: 'B.Tech DS', code: 'UAMPC0732', name: 'ML DevOps Laboratory', fac: fShah },
    { sem: 7, div: 'B.Tech DS', code: 'UAMPE0711', name: 'AI in Healthcare (PE-III)', fac: fGupta },
  ];

  // Fetch Semesters Map
  const semesters = await prisma.semester.findMany();
  const semMap = {};
  for (const s of semesters) {
    semMap[s.number] = s.id;
  }

  // Clear old subjects safely
  // Re-link any existing sessions to a temporary mapping or keep first match
  const newCreatedSubjects = {};

  for (const item of allocationPlan) {
    const cls = classByName[`${item.sem}_${item.div}`];
    if (!cls) {
      console.warn(`Class not found for ${item.sem}_${item.div}`);
      continue;
    }

    const semesterId = semMap[item.sem];
    const facConnect = item.fac ? [{ id: item.fac.id }] : [];

    // Find existing subject for this exact class or create one
    let sub = await prisma.subject.findFirst({
      where: {
        code: item.code,
        semesterId: semesterId,
        classes: { some: { id: cls.id } },
      },
    });

    if (!sub) {
      sub = await prisma.subject.create({
        data: {
          name: item.name,
          code: item.code,
          semesterId: semesterId,
          isActive: true,
          classes: { connect: [{ id: cls.id }] },
          faculties: { connect: facConnect },
        },
      });
    } else {
      // Overwrite faculties so there is strictly ONLY 1 teacher!
      sub = await prisma.subject.update({
        where: { id: sub.id },
        data: {
          name: item.name,
          classes: { set: [{ id: cls.id }] },
          faculties: { set: facConnect },
        },
      });
    }

    const teacherName = item.fac ? `${item.fac.user.firstName} ${item.fac.user.lastName}` : 'Unallocated';
    console.log(`✓ [${item.div}] ${item.name} (${item.code}) ──► ${teacherName}`);
    newCreatedSubjects[`${item.div}_${item.code}`] = sub;
  }

  // Clean up any remaining legacy subjects that are not in the new per-division plan
  const allCurrentSubjects = await prisma.subject.findMany({
    include: { classes: true, sessions: true },
  });

  for (const s of allCurrentSubjects) {
    if (s.classes.length > 1) {
      // It's an old multi-class subject! If it has sessions, migrate sessions to one of the new single-division subjects
      if (s.sessions.length > 0) {
        const replacement = Object.values(newCreatedSubjects).find(ns => ns.code === s.code) || Object.values(newCreatedSubjects)[0];
        if (replacement) {
          await prisma.attendanceSession.updateMany({
            where: { subjectId: s.id },
            data: { subjectId: replacement.id },
          });
        }
      }
      await prisma.subject.update({
        where: { id: s.id },
        data: { classes: { set: [] }, faculties: { set: [] } },
      });
      await prisma.subject.delete({ where: { id: s.id } });
      console.log(`✓ Cleaned old multi-division subject: ${s.name} (${s.code})`);
    }
  }

  console.log('\n========================================================');
  console.log(' All divisions now have strictly 1 faculty per subject! ');
  console.log('========================================================\n');
}

fixAllocations()
  .catch(err => {
    console.error('Error fixing allocations:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
