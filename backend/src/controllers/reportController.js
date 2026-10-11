const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');
const { parse } = require('json2csv');

const LOW_ATTENDANCE_THRESHOLD = parseFloat(process.env.ATTENDANCE_LOW_THRESHOLD) || 75;

const buildFilters = (query, reqUser) => {
  const { classId, subjectId, fromDate, toDate } = query;
  const sessionWhere = {};
  if (subjectId) sessionWhere.subjectId = subjectId;
  if (classId) {
    sessionWhere.subject = {
      classes: { some: { id: classId } },
    };
  }
  if (fromDate || toDate) {
    sessionWhere.date = {};
    if (fromDate) sessionWhere.date.gte = new Date(fromDate);
    if (toDate) sessionWhere.date.lte = new Date(toDate);
  }

  // If the requester is FACULTY, scope reports to subjects they teach (or sessions they conducted)
  if (reqUser && reqUser.role === 'FACULTY') {
    sessionWhere.OR = [
      { facultyId: reqUser.id },
      { subject: { faculties: { some: { id: reqUser.id } } } },
    ];
  }

  return sessionWhere;
};

const getHistory = async (req, res) => {
  try {
    const { studentId } = req.query;
    const sessionWhere = buildFilters(req.query, req.user);

    const whereClause = { session: sessionWhere };
    if (studentId) whereClause.studentId = studentId;

    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        student: { include: { user: true, class: true } },
        session: { include: { subject: { include: { classes: true } } } },
      },
      orderBy: { markedAt: 'desc' },
    });

    const data = records.map(r => ({
      id: r.id,
      studentName: `${r.student.user.firstName} ${r.student.user.lastName}`,
      rollNumber: r.student.rollNumber,
      className: r.session.subject.classes?.map(c => c.name).join(', ') || r.student.class?.name || 'N/A',
      subjectId: r.session.subject.id,
      subjectName: r.session.subject.name,
      date: r.session.date.toISOString().split('T')[0],
      time: r.markedAt.toISOString().split('T')[1].substring(0, 8),
      status: r.status,
      method: r.status === 'MANUAL_PRESENT' ? 'MANUAL' : 'AI',
      similarityScore: r.confidenceScore,
    }));

    res.json(data);
  } catch (error) {
    console.error('getHistory error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

const getSummary = async (req, res) => {
  try {
    const sessionWhere = buildFilters(req.query, req.user);
    const { classId } = req.query;

    const sessions = await prisma.attendanceSession.findMany({
      where: sessionWhere,
      include: {
        records: true,
        subject: { include: { classes: true } },
      },
    });

    const totalSessions = sessions.length;

    // Determine expected students based on class or subject's class
    let studentWhere = { isEnrolled: true };
    if (classId) {
      studentWhere.classId = classId;
    } else if (req.query.subjectId) {
      const subj = await prisma.subject.findUnique({
        where: { id: req.query.subjectId },
        include: { classes: true }
      });
      if (subj && subj.classes.length > 0) {
        studentWhere.classId = { in: subj.classes.map(c => c.id) };
      }
    }
    
    const students = await prisma.student.findMany({ where: studentWhere, include: { user: true } });
    const totalStudents = students.length;

    let presentRecords = 0;
    sessions.forEach(s => presentRecords += s.records.filter(r => ['PRESENT', 'MANUAL_PRESENT'].includes(r.status)).length);

    const expectedTotal = totalSessions * totalStudents;
    const absentRecords = expectedTotal - presentRecords;
    const attendancePercentage = expectedTotal === 0 ? 0 : (presentRecords / expectedTotal) * 100;

    // Calculate per-student to find below threshold
    let belowThresholdCount = 0;
    const studentStats = [];

    students.forEach(student => {
      let present = 0;
      sessions.forEach(session => {
        if (session.records.some(r => r.studentId === student.id)) {
          present++;
        }
      });
      const pct = totalSessions === 0 ? 0 : (present / totalSessions) * 100;
      if (pct < LOW_ATTENDANCE_THRESHOLD) belowThresholdCount++;
      studentStats.push({
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        rollNumber: student.rollNumber,
        present,
        totalSessions,
        percentage: pct,
      });
    });

    res.json({
      totalSessions,
      totalEnrolledStudents: totalStudents,
      totalPresent: presentRecords,
      totalAbsent: absentRecords < 0 ? 0 : absentRecords,
      attendancePercentage: attendancePercentage.toFixed(2),
      belowThresholdCount,
      studentStats,
    });
  } catch (error) {
    console.error('getSummary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
};

const getStudentReport = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Look up by id or rollNumber
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id },
          { rollNumber: id }
        ]
      },
      include: {
        user: true,
        class: {
          include: {
            academicSem: true,
            subjects: {
              include: {
                faculties: {
                  include: { user: { select: { firstName: true, lastName: true, email: true } } }
                }
              }
            }
          }
        }
      },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Get all subjects belonging to the student's class
    const subjects = student.class?.subjects || [];
    
    // All attendance records for this student
    const studentRecords = await prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      include: {
        session: {
          include: { subject: true }
        }
      }
    });

    let overallSessionsCount = 0;
    let overallPresentCount = 0;

    const subjectBreakdown = [];

    for (const subj of subjects) {
      // Find all sessions conducted for this subject
      const subjSessions = await prisma.attendanceSession.findMany({
        where: { subjectId: subj.id }
      });

      const totalSubjSessions = subjSessions.length;
      overallSessionsCount += totalSubjSessions;

      // Attended sessions for this subject
      const presentCount = studentRecords.filter(r => 
        r.session?.subjectId === subj.id && ['PRESENT', 'MANUAL_PRESENT'].includes(r.status)
      ).length;

      overallPresentCount += presentCount;

      const pct = totalSubjSessions > 0 ? (presentCount / totalSubjSessions) * 100 : 0;
      const facultyName = subj.faculties?.map(f => `${f.user.firstName} ${f.user.lastName}`).join(', ') || 'N/A';

      subjectBreakdown.push({
        id: subj.id,
        name: subj.name,
        code: subj.code,
        faculty: facultyName,
        totalSessions: totalSubjSessions,
        present: presentCount,
        absent: totalSubjSessions > presentCount ? totalSubjSessions - presentCount : 0,
        percentage: parseFloat(pct.toFixed(1)),
        isDefaulter: totalSubjSessions > 0 && pct < LOW_ATTENDANCE_THRESHOLD
      });
    }

    const overallPct = overallSessionsCount > 0 ? (overallPresentCount / overallSessionsCount) * 100 : 0;

    res.json({
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        rollNumber: student.rollNumber,
        class: student.class ? student.class.name : 'Unassigned',
        semester: student.class?.academicSem?.number || student.class?.semester || null
      },
      overall: {
        totalSessions: overallSessionsCount,
        present: overallPresentCount,
        absent: overallSessionsCount > overallPresentCount ? overallSessionsCount - overallPresentCount : 0,
        percentage: parseFloat(overallPct.toFixed(1)),
        isDefaulter: overallSessionsCount > 0 && overallPct < LOW_ATTENDANCE_THRESHOLD
      },
      subjects: subjectBreakdown
    });
  } catch (error) {
    console.error('getStudentReport error:', error);
    res.status(500).json({ error: 'Failed to fetch student report' });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await prisma.student.count({ where: { isEnrolled: true } });
    const totalFaculty = await prisma.faculty.count();
    const activeClasses = await prisma.class.count();
    const totalSubjects = await prisma.subject.count();
    const sessionsConducted = await prisma.attendanceSession.count();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRecords = await prisma.attendanceRecord.count({
      where: { 
        markedAt: { gte: todayStart },
        status: { in: ['PRESENT', 'MANUAL_PRESENT'] },
      },
    });

    const totalPresent = await prisma.attendanceRecord.count({
      where: { status: { in: ['PRESENT', 'MANUAL_PRESENT'] } },
    });
    const totalRecords = await prisma.attendanceRecord.count();

    let avgAttendance = 0;
    if (totalRecords > 0) {
      avgAttendance = (totalPresent / totalRecords) * 100;
    }

    res.json({
      totalStudents,
      totalFaculty,
      activeClasses,
      totalSubjects,
      sessionsConducted,
      todayAttendance: todayRecords,
      averageAttendance: avgAttendance.toFixed(1),
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const sessionWhere = buildFilters(req.query, req.user);
    const records = await prisma.attendanceRecord.findMany({
      where: { session: sessionWhere },
      include: {
        student: { include: { user: true, class: true } },
        session: { include: { subject: { include: { classes: true } } } },
      },
      orderBy: { markedAt: 'desc' },
    });

    const data = records.map(r => ({
      Student: `${r.student.user.firstName} ${r.student.user.lastName}`,
      RollNumber: r.student.rollNumber,
      Class: r.session.subject.classes?.map(c => c.name).join(', ') || r.student.class?.name || 'N/A',
      Subject: r.session.subject.name,
      Date: r.session.date.toISOString().split('T')[0],
      Time: r.markedAt.toISOString().split('T')[1].substring(0, 8),
      Status: r.status,
      Method: r.status === 'MANUAL_PRESENT' ? 'MANUAL' : 'AI',
      SimilarityScore: r.confidenceScore || '',
    }));

    if (data.length === 0) {
      return res.status(404).json({ error: 'No data to export' });
    }

    const csv = parse(data);
    
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'REPORT_GENERATED',
        details: { type: 'CSV', filters: req.query },
      },
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('attendance_report.csv');
    res.send(csv);
  } catch (error) {
    console.error('exportCSV error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};

const exportPDF = async (req, res) => {
  try {
    const sessionWhere = buildFilters(req.query, req.user);
    const records = await prisma.attendanceRecord.findMany({
      where: { session: sessionWhere },
      include: {
        student: { include: { user: true, class: true } },
        session: { include: { subject: { include: { classes: true } } } },
      },
      orderBy: { markedAt: 'desc' },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'REPORT_GENERATED',
        details: { type: 'PDF', filters: req.query },
      },
    });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('SmartAttend - AI Attendance ERP', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('Official Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    if (records.length === 0) {
      doc.text('No attendance records found for the given criteria.');
    } else {
      records.forEach(r => {
        const studentName = `${r.student.user.firstName} ${r.student.user.lastName}`;
        const subjName = r.session.subject.name;
        const dt = r.session.date.toISOString().split('T')[0];
        doc.text(`[${dt}] ${studentName} (${r.student.rollNumber}) - ${subjName} - ${r.status}`);
      });
    }

    doc.end();
  } catch (error) {
    console.error('exportPDF error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
};

const getTrend = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const sessionWhere = buildFilters(req.query, req.user);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days) + 1);
    startDate.setHours(0, 0, 0, 0);

    sessionWhere.date = { gte: startDate };

    const sessions = await prisma.attendanceSession.findMany({
      where: sessionWhere,
      include: { records: true, subject: { include: { classes: true } } },
      orderBy: { date: 'asc' },
    });

    const students = await prisma.student.findMany({ where: { isEnrolled: true } });
    const totalStudents = students.length;

    const trendMap = {};
    for (let i = 0; i < parseInt(days); i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      trendMap[ds] = { date: ds, present: 0, sessions: 0 };
    }

    sessions.forEach(s => {
      const ds = s.date.toISOString().split('T')[0];
      if (!trendMap[ds]) trendMap[ds] = { date: ds, present: 0, sessions: 0 };
      trendMap[ds].sessions += 1;
      trendMap[ds].present += s.records.length;
    });

    const trend = Object.values(trendMap).map(day => {
      const expected = day.sessions * totalStudents;
      const pct = expected === 0 ? 0 : (day.present / expected) * 100;
      return {
        date: day.date.substring(5),
        percentage: parseFloat(pct.toFixed(1)),
      };
    });

    res.json(trend);
  } catch (error) {
    console.error('getTrend error:', error);
    res.status(500).json({ error: 'Failed to fetch trend' });
  }
};

/**
 * Division attendance matrix: provides overall average attendance percentage
 * and subject-wise breakdown for all students in a division.
 * Scoped for Faculty to their allocated subjects.
 */
const getDivisionMatrix = async (req, res) => {
  try {
    const { classId, subjectId, fromDate, toDate } = req.query;

    let targetClass = null;
    if (classId) {
      targetClass = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          academicSem: true,
          subjects: {
            include: {
              faculties: {
                include: { user: { select: { firstName: true, lastName: true, email: true } } }
              }
            }
          }
        }
      });
    } else {
      // Find the first class that has enrolled students
      targetClass = await prisma.class.findFirst({
        where: { students: { some: { isEnrolled: true } } },
        include: {
          academicSem: true,
          subjects: {
            include: {
              faculties: {
                include: { user: { select: { firstName: true, lastName: true, email: true } } }
              }
            }
          }
        }
      });
      if (!targetClass) {
        targetClass = await prisma.class.findFirst({
          include: {
            academicSem: true,
            subjects: {
              include: {
                faculties: {
                  include: { user: { select: { firstName: true, lastName: true, email: true } } }
                }
              }
            }
          }
        });
      }
    }

    if (!targetClass) {
      return res.json({
        division: null,
        subjects: [],
        students: [],
        summary: { totalEnrolled: 0, totalSessions: 0, divisionAverage: 0, defaulterCount: 0 }
      });
    }

    // Filter subjects if user is FACULTY
    let subjects = targetClass.subjects || [];
    if (req.user.role === 'FACULTY') {
      subjects = subjects.filter(s => s.faculties.some(f => f.id === req.user.id));
    }

    // If specific subjectId is requested, filter subjects list to it if it belongs to this class
    if (subjectId) {
      const filtered = subjects.filter(s => s.id === subjectId);
      if (filtered.length > 0) subjects = filtered;
    }

    // Get all enrolled students in this division
    const students = await prisma.student.findMany({
      where: { classId: targetClass.id, isEnrolled: true },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { rollNumber: 'asc' }
    });

    // Date filters for sessions
    const dateFilter = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);

    // Fetch sessions for all subjects in this division
    const subjectStatsList = [];
    let totalDivisionSessions = 0;

    for (const subj of subjects) {
      const sessionWhere = {
        subjectId: subj.id,
        ...(req.user.role === 'FACULTY' ? { facultyId: req.user.id } : {})
      };
      if (fromDate || toDate) sessionWhere.date = dateFilter;

      const sessions = await prisma.attendanceSession.findMany({
        where: sessionWhere,
        include: { records: true }
      });

      const facultyNames = subj.faculties?.map(f => `${f.user.firstName} ${f.user.lastName}`).join(', ') || 'N/A';

      subj._sessions = sessions;
      totalDivisionSessions += sessions.length;

      subjectStatsList.push({
        id: subj.id,
        name: subj.name,
        code: subj.code,
        faculty: facultyNames,
        totalSessions: sessions.length
      });
    }

    // Build per-student stats
    let totalPresentOverall = 0;
    let defaulterCount = 0;

    const studentMatrix = students.map(st => {
      let studentOverallPresent = 0;
      let studentExpectedSessions = 0;
      const subjectBreakdown = {};

      subjects.forEach(subj => {
        const sessions = subj._sessions || [];
        const presentCount = sessions.filter(sess =>
          sess.records.some(r => r.studentId === st.id && ['PRESENT', 'MANUAL_PRESENT'].includes(r.status))
        ).length;

        const subjectSessions = sessions.length;
        studentOverallPresent += presentCount;
        studentExpectedSessions += subjectSessions;

        const subjPct = subjectSessions > 0 ? (presentCount / subjectSessions) * 100 : 0;

        subjectBreakdown[subj.id] = {
          subjectId: subj.id,
          subjectName: subj.name,
          subjectCode: subj.code,
          present: presentCount,
          totalSessions: subjectSessions,
          percentage: parseFloat(subjPct.toFixed(1)),
          isDefaulter: subjectSessions > 0 && subjPct < LOW_ATTENDANCE_THRESHOLD
        };
      });

      const overallPct = studentExpectedSessions > 0
        ? (studentOverallPresent / studentExpectedSessions) * 100
        : 0;

      const isDefaulter = studentExpectedSessions > 0 && overallPct < LOW_ATTENDANCE_THRESHOLD;
      if (isDefaulter) defaulterCount++;

      totalPresentOverall += studentOverallPresent;

      return {
        id: st.id,
        rollNumber: st.rollNumber,
        name: `${st.user.firstName} ${st.user.lastName}`,
        email: st.user.email,
        overallPresent: studentOverallPresent,
        overallSessions: studentExpectedSessions,
        overallPercentage: parseFloat(overallPct.toFixed(1)),
        isDefaulter,
        subjects: subjectBreakdown
      };
    });

    const expectedDivisionTotal = totalDivisionSessions * students.length;
    const divisionAverage = expectedDivisionTotal > 0
      ? (totalPresentOverall / expectedDivisionTotal) * 100
      : 0;

    res.json({
      division: {
        id: targetClass.id,
        name: targetClass.name,
        semester: targetClass.academicSem?.number || targetClass.semester
      },
      subjects: subjectStatsList,
      students: studentMatrix,
      summary: {
        totalEnrolled: students.length,
        totalSessions: totalDivisionSessions,
        divisionAverage: parseFloat(divisionAverage.toFixed(1)),
        defaulterCount
      }
    });
  } catch (error) {
    console.error('getDivisionMatrix error:', error);
    res.status(500).json({ error: 'Failed to fetch division attendance matrix' });
  }
};

module.exports = {
  getHistory,
  getSummary,
  getStudentReport,
  getDashboardStats,
  getTrend,
  getDivisionMatrix,
  exportCSV,
  exportPDF,
};
