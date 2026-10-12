
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- ACADEMIC YEARS ---
exports.getYears = async (req, res) => res.json(await prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } }));
exports.createYear = async (req, res) => {
  const { name, startDate, endDate } = req.body;
  res.json(await prisma.academicYear.create({ data: { name, startDate: new Date(startDate), endDate: new Date(endDate) } }));
};
exports.toggleYear = async (req, res) => {
  const y = await prisma.academicYear.findUnique({where: {id: req.params.id}});
  res.json(await prisma.academicYear.update({ where: { id: req.params.id }, data: { isActive: !y.isActive } }));
};
exports.deleteYear = async (req, res) => {
  try {
    const yearId = req.params.id;
    const semesters = await prisma.semester.findMany({
      where: { academicYearId: yearId },
      include: { classes: true, subjects: true }
    });

    for (const sem of semesters) {
      const classIds = sem.classes.map(c => c.id);
      if (classIds.length > 0) {
        await prisma.student.updateMany({ where: { classId: { in: classIds } }, data: { classId: null } });
        await prisma.class.deleteMany({ where: { id: { in: classIds } } });
      }

      const subjectIds = sem.subjects.map(s => s.id);
      if (subjectIds.length > 0) {
        await prisma.attendanceSession.deleteMany({ where: { subjectId: { in: subjectIds } } });
        await prisma.subject.deleteMany({ where: { id: { in: subjectIds } } });
      }
    }

    await prisma.semester.deleteMany({ where: { academicYearId: yearId } });
    await prisma.academicYear.delete({ where: { id: yearId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete year error:', err);
    res.status(400).json({ error: err.message || 'Cannot delete academic year' });
  }
};

// --- PROGRAMS ---
exports.getPrograms = async (req, res) => res.json(await prisma.program.findMany({
  orderBy: { name: 'asc' },
  include: {
    _count: { select: { semesters: true } }
  }
}));
exports.createProgram = async (req, res) => {
  res.json(await prisma.program.create({ data: { name: req.body.name } }));
};
exports.deleteProgram = async (req, res) => {
  try {
    const programId = req.params.id;
    const semesters = await prisma.semester.findMany({
      where: { programId },
      include: { classes: true, subjects: true }
    });

    for (const sem of semesters) {
      const classIds = sem.classes.map(c => c.id);
      if (classIds.length > 0) {
        await prisma.student.updateMany({ where: { classId: { in: classIds } }, data: { classId: null } });
        await prisma.class.deleteMany({ where: { id: { in: classIds } } });
      }

      const subjectIds = sem.subjects.map(s => s.id);
      if (subjectIds.length > 0) {
        await prisma.attendanceSession.deleteMany({ where: { subjectId: { in: subjectIds } } });
        await prisma.subject.deleteMany({ where: { id: { in: subjectIds } } });
      }
    }

    await prisma.semester.deleteMany({ where: { programId } });
    await prisma.program.delete({ where: { id: programId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete program error:', err);
    res.status(400).json({ error: err.message || 'Cannot delete program' });
  }
};

// --- SEMESTERS ---
exports.getSemesters = async (req, res) => {
  res.json(await prisma.semester.findMany({
    orderBy: { number: 'asc' },
    include: { academicYear: true, program: true }
  }));
};
exports.createSemester = async (req, res) => {
  const { number, academicYearId, programId } = req.body;
  res.json(await prisma.semester.create({ data: { number: parseInt(number), academicYearId, programId } }));
};
exports.deleteSemester = async (req, res) => {
  try {
    const semesterId = req.params.id;
    const classes = await prisma.class.findMany({ where: { semesterId } });
    const classIds = classes.map(c => c.id);
    if (classIds.length > 0) {
      await prisma.student.updateMany({ where: { classId: { in: classIds } }, data: { classId: null } });
      await prisma.class.deleteMany({ where: { id: { in: classIds } } });
    }

    const subjects = await prisma.subject.findMany({ where: { semesterId } });
    const subjectIds = subjects.map(s => s.id);
    if (subjectIds.length > 0) {
      await prisma.attendanceSession.deleteMany({ where: { subjectId: { in: subjectIds } } });
      await prisma.subject.deleteMany({ where: { id: { in: subjectIds } } });
    }

    await prisma.semester.delete({ where: { id: semesterId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete semester error:', err);
    res.status(400).json({ error: err.message || 'Cannot delete semester' });
  }
};

// --- CLASSES ---
exports.getClasses = async (req, res) => {
  res.json(await prisma.class.findMany({
    include: { academicSem: { include: { academicYear: true, program: true } }, _count: { select: { students: true } } }
  }));
};
exports.createClass = async (req, res) => {
  const { name, semesterId } = req.body;
  res.json(await prisma.class.create({ data: { name, semester: 0, semesterId } }));
};
exports.updateClass = async (req, res) => {
  const { name, isActive, semesterId } = req.body;
  res.json(await prisma.class.update({ where: { id: req.params.id }, data: { name, isActive, semesterId } }));
};

// --- SUBJECTS ---
exports.getSubjects = async (req, res) => {
  const where = {};
  if (req.user && req.user.role === 'FACULTY' && req.query.all !== 'true') {
    where.faculties = { some: { id: req.user.id } };
  }
  res.json(await prisma.subject.findMany({
    where,
    include: {
      academicSem: { include: { academicYear: true, program: true } },
      classes: { include: { academicSem: true } },
      faculties: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  }));
};
exports.createSubject = async (req, res) => {
  const { name, code, semesterId, classIds, facultyIds } = req.body;
  const data = { 
    name, code, semesterId,
    classes: { connect: (classIds || []).map(id => ({ id })) }
  };
  if (Array.isArray(facultyIds) && facultyIds.length > 0) {
    data.faculties = { connect: facultyIds.map(id => ({ id })) };
  }
  res.json(await prisma.subject.create({
    data,
    include: {
      classes: true,
      faculties: { include: { user: true } },
    },
  }));
};
exports.updateSubject = async (req, res) => {
  const { name, code, isActive, semesterId, classIds, facultyIds } = req.body;
  const data = { name, code, isActive, semesterId };
  if (classIds) {
    data.classes = { set: classIds.map(id => ({ id })) };
  }
  if (facultyIds) {
    data.faculties = { set: facultyIds.map(id => ({ id })) };
  }
  res.json(await prisma.subject.update({
    where: { id: req.params.id },
    data,
    include: {
      classes: true,
      faculties: { include: { user: true } },
    },
  }));
};

exports.deleteClass = async (req, res) => {
  try {
    // Disconnect students first to prevent foreign key errors
    await prisma.student.updateMany({ where: { classId: req.params.id }, data: { classId: null } });
    await prisma.class.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: 'Cannot delete class' }); }
};

exports.deleteSubject = async (req, res) => {
  try {
    await prisma.attendanceSession.deleteMany({ where: { subjectId: req.params.id } });
    await prisma.subject.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: 'Cannot delete subject' }); }
};

// --- HIERARCHY ---
exports.getHierarchy = async (req, res) => {
  const years = await prisma.academicYear.findMany({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
    include: {
      semesters: {
        orderBy: { number: 'asc' },
        include: {
          program: true,
          classes: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
            include: {
              subjects: {
                where: { isActive: true },
                orderBy: { name: 'asc' },
                include: {
                  faculties: {
                    include: {
                      user: { select: { id: true, firstName: true, lastName: true, email: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  res.json(years);
};

exports.getHierarchyStats = async (req, res) => {
  try {
    const records = await prisma.attendanceRecord.findMany({
      select: {
        status: true,
        student: { select: { classId: true } },
        session: { select: { subjectId: true } }
      }
    });

    // Compute stats
    const stats = {}; 
    // Format: stats[classId][subjectId] = { present: 0, total: 0 }
    // stats[classId].overall = { present: 0, total: 0 }
    
    for (const r of records) {
      if (!r.student || !r.student.classId) continue;
      const cId = r.student.classId;
      const sId = r.session.subjectId;
      
      if (!stats[cId]) stats[cId] = { overall: { present: 0, total: 0 } };
      if (!stats[cId][sId]) stats[cId][sId] = { present: 0, total: 0 };
      
      const isPresent = (r.status === 'PRESENT') ? 1 : 0;
      
      stats[cId][sId].present += isPresent;
      stats[cId][sId].total += 1;
      
      stats[cId].overall.present += isPresent;
      stats[cId].overall.total += 1;
    }
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute stats' });
  }
};