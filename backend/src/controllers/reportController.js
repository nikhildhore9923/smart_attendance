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
    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      sessionWhere.date.gte = start;
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      sessionWhere.date.lte = end;
    }
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
    const { studentId, classId } = req.query;
    const sessionWhere = buildFilters(req.query, req.user);

    const whereClause = { session: sessionWhere };
    if (studentId) whereClause.studentId = studentId;
    if (classId) {
      whereClause.student = { classId };
    }

    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        student: { include: { user: true, class: true } },
        session: { 
          include: { 
            subject: { include: { classes: true } },
            faculty: { include: { user: true } }
          } 
        },
      },
      orderBy: [
        { session: { date: 'desc' } },
        { markedAt: 'desc' }
      ],
    });

    const data = records.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      studentId: r.student.id,
      studentName: `${r.student.user.firstName} ${r.student.user.lastName}`,
      email: r.student.user.email,
      rollNumber: r.student.rollNumber,
      classId: r.student.classId,
      className: r.student.class?.name || r.session.subject.classes?.map(c => c.name).join(', ') || 'N/A',
      subjectId: r.session.subject.id,
      subjectName: r.session.subject.name,
      subjectCode: r.session.subject.code,
      facultyName: r.session.faculty?.user ? `${r.session.faculty.user.firstName} ${r.session.faculty.user.lastName}` : 'Faculty',
      date: r.session.date.toISOString().split('T')[0],
      time: r.markedAt.toISOString().split('T')[1].substring(0, 8),
      sessionStartTime: r.session.startTime ? r.session.startTime.toISOString().split('T')[1].substring(0, 5) : null,
      sessionStatus: r.session.status,
      status: r.status,
      method: r.status === 'MANUAL_PRESENT' ? 'MANUAL' : 'AI Face Biometrics',
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
    const { classId } = req.query;
    const sessionWhere = buildFilters(req.query, req.user);
    const whereClause = { session: sessionWhere };
    if (classId) {
      whereClause.student = { classId };
    }
    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        student: { include: { user: true, class: true } },
        session: { 
          include: { 
            subject: { include: { classes: true } },
            faculty: { include: { user: true } }
          } 
        },
      },
      orderBy: [
        { session: { date: 'desc' } },
        { markedAt: 'desc' }
      ],
    });

    if (records.length === 0) {
      return res.status(404).json({ error: 'No attendance records found for the selected criteria' });
    }

    const data = records.map((r, index) => ({
      'Sr No': index + 1,
      'Roll No': r.student.rollNumber,
      'Student Name': `${r.student.user.firstName} ${r.student.user.lastName}`,
      'Email': r.student.user.email,
      'Division': r.student.class?.name || r.session.subject.classes?.map(c => c.name).join(', ') || 'N/A',
      'Subject Code': r.session.subject.code,
      'Subject Name': r.session.subject.name,
      'Faculty In-Charge': r.session.faculty?.user ? `${r.session.faculty.user.firstName} ${r.session.faculty.user.lastName}` : 'N/A',
      'Session Date': r.session.date.toISOString().split('T')[0],
      'Marked Time': r.markedAt.toISOString().split('T')[1].substring(0, 8),
      'Attendance Status': r.status,
      'Method': r.status === 'MANUAL_PRESENT' ? 'Manual Verification' : 'AI Face Biometrics',
      'Confidence Score': r.confidenceScore ? `${(r.confidenceScore * 100).toFixed(1)}%` : 'N/A',
      'Session ID': r.sessionId
    }));

    const csv = parse(data);
    
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'REPORT_GENERATED',
        details: { type: 'CSV', count: data.length, filters: req.query },
      },
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`SmartAttend_Register_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('exportCSV error:', error);
    res.status(500).json({ error: 'Failed to export CSV: ' + error.message });
  }
};

const exportPDF = async (req, res) => {
  try {
    const { classId } = req.query;
    const sessionWhere = buildFilters(req.query, req.user);
    const whereClause = { session: sessionWhere };
    if (classId) {
      whereClause.student = { classId };
    }
    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        student: { include: { user: true, class: true } },
        session: { 
          include: { 
            subject: { include: { classes: true } },
            faculty: { include: { user: true } }
          } 
        },
      },
      orderBy: [
        { session: { date: 'desc' } },
        { markedAt: 'desc' }
      ],
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'REPORT_GENERATED',
        details: { type: 'PDF', count: records.length, filters: req.query },
      },
    });

    const doc = new PDFDocument({ size: 'A4', margin: 36, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=SmartAttend_Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    doc.pipe(res);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const leftMargin = 36;
    const contentWidth = pageWidth - leftMargin * 2; // 523.28

    const drawHeader = () => {
      // Top header banner
      doc.rect(leftMargin, 30, contentWidth, 3).fill('#1e3a8a');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(14).text("KIT'S COLLEGE OF ENGINEERING, KOLHAPUR", leftMargin, 40, { align: 'center', width: contentWidth });
      doc.fillColor('#475569').font('Helvetica').fontSize(9.5).text("Department of Computer Science & Engineering (AIML)", leftMargin, 57, { align: 'center', width: contentWidth });
      doc.fillColor('#059669').font('Helvetica-Bold').fontSize(10.5).text("AI-BASED SMART ATTENDANCE SYSTEM — OFFICIAL ATTENDANCE REGISTER", leftMargin, 71, { align: 'center', width: contentWidth });
      
      doc.strokeColor('#cbd5e1').lineWidth(0.75).moveTo(leftMargin, 88).lineTo(leftMargin + contentWidth, 88).stroke();

      // Info Box
      doc.rect(leftMargin, 94, contentWidth, 44).fill('#f8fafc');
      doc.strokeColor('#e2e8f0').lineWidth(0.75).rect(leftMargin, 94, contentWidth, 44).stroke();

      const filterSubj = records[0]?.session?.subject?.name || 'All Allocated Courses';
      const filterCode = records[0]?.session?.subject?.code ? ` (${records[0].session.subject.code})` : '';
      const filterFaculty = records[0]?.session?.faculty?.user ? `${records[0].session.faculty.user.firstName} ${records[0].session.faculty.user.lastName}` : (req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'Faculty');
      const uniqueStudents = new Set(records.map(r => r.studentId)).size;

      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5).text('Course / Subject:', leftMargin + 10, 101);
      doc.font('Helvetica').text(`${filterSubj}${filterCode}`, leftMargin + 90, 101, { width: 200 });

      doc.font('Helvetica-Bold').text('Faculty In-Charge:', leftMargin + 300, 101);
      doc.font('Helvetica').text(filterFaculty, leftMargin + 390, 101);

      doc.font('Helvetica-Bold').text('Total Records:', leftMargin + 10, 120);
      doc.font('Helvetica').text(`${records.length} (${uniqueStudents} Unique Students)`, leftMargin + 90, 120);

      doc.font('Helvetica-Bold').text('Generated Date:', leftMargin + 300, 120);
      doc.font('Helvetica').text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), leftMargin + 390, 120);

      // Table Header Bar
      const tableHeaderY = 146;
      doc.rect(leftMargin, tableHeaderY, contentWidth, 20).fill('#1e293b');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);

      doc.text('Sr.', leftMargin + 6, tableHeaderY + 6, { width: 25 });
      doc.text('Roll No', leftMargin + 34, tableHeaderY + 6, { width: 45 });
      doc.text('Student Name', leftMargin + 82, tableHeaderY + 6, { width: 140 });
      doc.text('Division', leftMargin + 225, tableHeaderY + 6, { width: 75 });
      doc.text('Date', leftMargin + 305, tableHeaderY + 6, { width: 60 });
      doc.text('Time', leftMargin + 370, tableHeaderY + 6, { width: 45 });
      doc.text('Status', leftMargin + 420, tableHeaderY + 6, { width: 45 });
      doc.text('Confidence', leftMargin + 470, tableHeaderY + 6, { width: 50 });

      return tableHeaderY + 20;
    };

    let currentY = drawHeader();

    if (records.length === 0) {
      doc.fillColor('#64748b').font('Helvetica-Oblique').fontSize(11).text('No attendance records found matching the requested criteria.', leftMargin, currentY + 30, { align: 'center', width: contentWidth });
    } else {
      records.forEach((r, idx) => {
        const rowHeight = 18;
        if (currentY + rowHeight > pageHeight - 90) {
          doc.addPage();
          currentY = drawHeader();
        }

        // Alternating row background
        if (idx % 2 === 1) {
          doc.rect(leftMargin, currentY, contentWidth, rowHeight).fill('#f8fafc');
        }

        doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(leftMargin, currentY + rowHeight).lineTo(leftMargin + contentWidth, currentY + rowHeight).stroke();

        const studentName = `${r.student.user.firstName} ${r.student.user.lastName}`;
        const rollNo = r.student.rollNumber;
        const className = r.student.class?.name || r.session.subject.classes?.map(c => c.name).join(', ') || 'AIML';
        const dateStr = r.session.date.toISOString().split('T')[0];
        const timeStr = r.markedAt.toISOString().split('T')[1].substring(0, 8);
        const confStr = r.confidenceScore ? `${(r.confidenceScore * 100).toFixed(0)}%` : 'AI';

        doc.fillColor('#334155').font('Helvetica').fontSize(8.5);
        doc.text(String(idx + 1), leftMargin + 6, currentY + 5, { width: 25 });
        doc.fillColor('#0284c7').font('Helvetica-Bold').text(rollNo, leftMargin + 34, currentY + 5, { width: 45 });
        doc.fillColor('#0f172a').font('Helvetica').text(studentName, leftMargin + 82, currentY + 5, { width: 140 });
        doc.fillColor('#64748b').text(className, leftMargin + 225, currentY + 5, { width: 75 });
        doc.fillColor('#334155').text(dateStr, leftMargin + 305, currentY + 5, { width: 60 });
        doc.text(timeStr, leftMargin + 370, currentY + 5, { width: 45 });
        doc.fillColor('#16a34a').font('Helvetica-Bold').text(r.status, leftMargin + 420, currentY + 5, { width: 45 });
        doc.fillColor('#475569').font('Helvetica').text(confStr, leftMargin + 470, currentY + 5, { width: 50 });

        currentY += rowHeight;
      });

      // Signature section on last page (or new page if cramped)
      if (currentY + 80 > pageHeight - 50) {
        doc.addPage();
        currentY = 60;
      } else {
        currentY += 25;
      }

      doc.strokeColor('#cbd5e1').lineWidth(0.75).moveTo(leftMargin, currentY).lineTo(leftMargin + contentWidth, currentY).stroke();
      currentY += 25;

      doc.fillColor('#475569').font('Helvetica').fontSize(9);
      doc.text('Verified by Subject In-Charge', leftMargin + 40, currentY);
      doc.text('Approved by Head of Department (CSE-AIML)', leftMargin + 280, currentY);
      
      currentY += 15;
      doc.fillColor('#94a3b8').fontSize(8);
      doc.text('Signature: __________________________', leftMargin + 40, currentY);
      doc.text('Signature: __________________________', leftMargin + 280, currentY);
    }

    // Number all pages
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text(
        `SmartAttend AI ERP — Page ${i + 1} of ${range.count}`,
        leftMargin,
        pageHeight - 25,
        { align: 'center', width: contentWidth }
      );
    }

    doc.end();
  } catch (error) {
    console.error('exportPDF error:', error);
    res.status(500).json({ error: 'Failed to export PDF: ' + error.message });
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
