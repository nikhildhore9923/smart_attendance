const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const getStudents = async (req, res) => {
  try {
    const { subjectId } = req.query;
    let classFilter = undefined;

    if (req.user && req.user.role === 'FACULTY') {
      const faculty = await prisma.faculty.findUnique({
        where: { id: req.user.id },
        include: {
          subjects: {
            include: { classes: true }
          }
        }
      });

      if (!faculty) {
        return res.json([]);
      }

      if (subjectId && subjectId !== 'ALL') {
        const targetSubject = faculty.subjects.find(s => s.id === subjectId);
        if (targetSubject) {
          const classIds = targetSubject.classes.map(c => c.id);
          classFilter = { classId: { in: classIds } };
        } else {
          return res.json([]);
        }
      } else {
        const facultyClassIds = [...new Set(faculty.subjects.flatMap(s => s.classes.map(c => c.id)))];
        classFilter = { classId: { in: facultyClassIds } };
      }
    } else if (subjectId && subjectId !== 'ALL') {
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: { classes: true }
      });
      if (subject) {
        const classIds = subject.classes.map(c => c.id);
        classFilter = { classId: { in: classIds } };
      }
    }

    const where = classFilter ? classFilter : {};

    const students = await prisma.student.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
        },
        class: {
          include: {
            academicSem: { include: { program: true } }
          }
        },
        attendances: {
          where: (subjectId && subjectId !== 'ALL')
            ? { status: { in: ['PRESENT', 'MANUAL_PRESENT'] }, session: { subjectId } }
            : { status: { in: ['PRESENT', 'MANUAL_PRESENT'] } },
        },
        _count: { select: { embeddings: true } }
      },
      orderBy: { rollNumber: 'asc' }
    });

    let subjectTotalSessions = 0;
    if (subjectId && subjectId !== 'ALL') {
      subjectTotalSessions = await prisma.attendanceSession.count({
        where: { subjectId }
      });
    }

    const classIds = [...new Set(students.map(s => s.classId).filter(Boolean))];
    const sessionCountMap = {};
    if (!subjectId || subjectId === 'ALL') {
      for (const cid of classIds) {
        const count = await prisma.attendanceSession.count({
          where: { subject: { classes: { some: { id: cid } } } }
        });
        sessionCountMap[cid] = count;
      }
    }

    const formatted = students.map(s => {
      const totalSessions = (subjectId && subjectId !== 'ALL')
        ? subjectTotalSessions
        : (sessionCountMap[s.classId] || 0);
      const presentCount = s.attendances?.length || 0;
      const percentage = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;

      return {
        ...s,
        roll_no: s.rollNumber,
        name: `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim(),
        firstName: s.user?.firstName || '',
        lastName: s.user?.lastName || '',
        email: s.user?.email || '',
        photo_count: s._count?.embeddings || 0,
        enrolled_at: s.user?.createdAt,
        is_active: s.isEnrolled,
        className: s.class ? (s.class.academicSem?.number ? `${s.class.name} (Sem ${s.class.academicSem.number})` : s.class.name) : 'Unassigned',
        rawClassName: s.class?.name || 'Unassigned',
        classId: s.classId || '',
        semesterNumber: s.class?.academicSem?.number || null,
        programName: s.class?.academicSem?.program?.name || null,
        attendanceStats: {
          presentSessions: presentCount,
          totalSessions,
          percentage: parseFloat(percentage.toFixed(1)),
          isDefaulter: totalSessions > 0 && percentage < 75
        }
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('getStudents error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

const createStudent = async (req, res) => {
  const { email, password, firstName, lastName, rollNumber, classId } = req.body;
  
  if (!email || !firstName || !lastName || !rollNumber) {
    return res.status(400).json({ error: 'First name, last name, email, and roll number are required' });
  }

  try {
    const defaultPwd = password || 'Password123!';
    const hashedPassword = await bcrypt.hash(defaultPwd, 10);
    
    // Create User and Student records transactionally
    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          role: 'STUDENT',
          firstName,
          lastName,
        },
      });

      return tx.student.create({
        data: {
          id: user.id,
          rollNumber,
          classId: classId || null,
        },
        include: { 
          user: true,
          class: {
            include: {
              academicSem: { include: { program: true } }
            }
          }
        },
      });
    });

    res.status(201).json(student);
  } catch (error) {
    console.error('createStudent error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email or Roll Number already exists' });
    }
    res.status(500).json({ error: 'Failed to create student' });
  }
};

const getStudentById = async (req, res) => {
  const { id } = req.params;
  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: { 
        user: true, 
        embeddings: true,
        class: { include: { academicSem: { include: { program: true } } } }
      },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student' });
  }
};

const deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: id },
          { rollNumber: id }
        ]
      }
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    // Clean up all related records
    await prisma.attendanceRecord.deleteMany({ where: { studentId: student.id } });
    await prisma.faceEmbedding.deleteMany({ where: { studentId: student.id } });
    await prisma.student.delete({ where: { id: student.id } });
    await prisma.user.delete({ where: { id: student.id } }).catch(() => {});

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        action: 'STUDENT_DELETED',
        details: { studentId: student.id, rollNumber: student.rollNumber }
      }
    }).catch(() => {});

    return res.json({ message: `Student ${student.rollNumber} deleted permanently` });
  } catch (error) {
    console.error('deleteStudent error:', error);
    res.status(500).json({ error: 'Failed to delete student: ' + error.message });
  }
};

const deleteStudentRecords = async (req, res) => {
  const { id } = req.params;
  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: id },
          { rollNumber: id }
        ]
      }
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await prisma.attendanceRecord.deleteMany({ where: { studentId: student.id } });
    await prisma.faceEmbedding.deleteMany({ where: { studentId: student.id } });
    await prisma.student.update({
      where: { id: student.id },
      data: { isEnrolled: false }
    });
    res.json({ message: 'Records cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear records: ' + error.message });
  }
};

const activateStudent = async (req, res) => {
  const { id } = req.params;
  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: id },
          { rollNumber: id }
        ]
      }
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { isEnrolled: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate student' });
  }
};

const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, rollNumber, classId } = req.body;
  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: id },
          { rollNumber: id }
        ]
      }
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: student.id },
        data: { firstName, lastName }
      });
      await tx.student.update({
        where: { id: student.id },
        data: { rollNumber, classId }
      });
    });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Roll number exists' });
    res.status(500).json({ error: 'Failed to update student: ' + err.message });
  }
};

module.exports = {
  updateStudent,
  getStudents,
  createStudent,
  getStudentById,
  deleteStudent,
  deleteStudentRecords,
  activateStudent
};
