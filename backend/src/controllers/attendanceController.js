const { PrismaClient } = require('@prisma/client');
const { recognizeStudentFromImage, recognizeMultipleStudentsFromImage } = require('../services/recognitionService');

const prisma = new PrismaClient();
const REQUIRED_CONFIRMATIONS = parseInt(process.env.ATTENDANCE_REQUIRED_CONFIRMATIONS) || 3;

// In-memory cache for temporal stability per session.
// Key: sessionId -> { lastStudentId: string, count: number }
const temporalState = new Map();

/**
 * Creates and starts a new active attendance session.
 */
const startSession = async (req, res) => {
  try {
    const { subjectId } = req.body;
    if (!subjectId) return res.status(400).json({ error: 'Subject ID is required' });

    if (req.user.role !== 'FACULTY') {
      return res.status(403).json({
        error: 'Access Denied: Only faculty members are authorized to conduct live attendance sessions.'
      });
    }

    const faculty = await prisma.faculty.findUnique({
      where: { id: req.user.id },
      include: { subjects: true },
    });
    if (!faculty) {
      return res.status(404).json({ error: 'Faculty profile not found' });
    }

    // Check subject allocation
    const isAssigned = faculty.subjects.some(s => s.id === subjectId);
    if (!isAssigned) {
      return res.status(403).json({
        error: 'Access Denied: You are only authorized to conduct attendance for your allocated courses/subjects.'
      });
    }

    // End any existing active sessions for this subject
    await prisma.attendanceSession.updateMany({
      where: { subjectId, status: 'ACTIVE' },
      data: { status: 'COMPLETED', endTime: new Date() }
    });

    const session = await prisma.attendanceSession.create({
      data: {
        facultyId: faculty.id,
        subjectId,
        date: new Date(),
        startTime: new Date(),
        status: 'ACTIVE'
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SESSION_STARTED',
        details: { sessionId: session.id, subjectId }
      }
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Ends an active attendance session.
 */
const endSession = async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.attendanceSession.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (req.user.role === 'FACULTY' && session.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'You are only authorized to end sessions you started.' });
    }

    const updated = await prisma.attendanceSession.update({
      where: { id },
      data: { status: 'COMPLETED', endTime: new Date() }
    });

    // Cleanup temporal cache
    temporalState.delete(id);

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SESSION_ENDED',
        details: { sessionId: session.id }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Processes a camera frame for attendance.
 */
const recognizeAttendance = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    
    const { image, multiFace } = req.body;

    if (!image) return res.status(400).json({ error: 'No image provided' });

    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'ACTIVE') return res.status(400).json({ error: 'Attendance session is not active.' });
    if (req.user.role === 'FACULTY' && session.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'You are only authorized to mark attendance for your own sessions.' });
    }

    if (multiFace) {
      const result = await recognizeMultipleStudentsFromImage(image);
      
      if (result.error) {
         return res.status(400).json({ error: result.error });
      }

      let state = temporalState.get(sessionId) || { tracks: {} };
      if (!state.tracks) state = { tracks: {} };
      
      const newTracks = {};
      const marked = [];
      const recognizedFaces = [];

      for (const face of result.faces) {
         if (!face.recognized || !face.student) {
             recognizedFaces.push(face);
             continue;
         }
         
         const studentId = face.student.id;
         recognizedFaces.push(face);

         const existingRecord = await prisma.attendanceRecord.findUnique({
             where: { sessionId_studentId: { sessionId, studentId } }
         });

         if (existingRecord) {
             face.status = 'ALREADY_MARKED';
             continue;
         }
         
         const prevCount = state.tracks[studentId] || 0;
         newTracks[studentId] = prevCount + 1;
         
         if (newTracks[studentId] >= REQUIRED_CONFIRMATIONS) {
             const record = await prisma.attendanceRecord.upsert({
               where: { sessionId_studentId: { sessionId, studentId } },
               update: {},
               create: { sessionId, studentId, status: 'PRESENT', confidenceScore: face.similarity }
             });
             
             await prisma.auditLog.create({
               data: { userId: req.user.id, action: 'ATTENDANCE_MARKED', details: { sessionId, studentId, method: 'MULTIFACE_AUTO' } }
             });
             
             marked.push(face.student);
             face.status = 'NEWLY_MARKED';
             delete newTracks[studentId]; 
             const { getIO } = require('../utils/socket');
             getIO().to('dashboard').emit('attendance:marked', { record, student: face.student });
         }
      }
      
      temporalState.set(sessionId, { tracks: newTracks });
      return res.json({ faces: recognizedFaces, marked });
    }

    // --- EXISTING SINGLE FACE LOGIC ---

    // 2. Perform Face Recognition
    const result = await recognizeStudentFromImage(image);

    // If an error occurred in AI processing (e.g. no face, multiple faces, bad quality)
    if (result.error) {
      // Reset temporal state since face is lost or invalid
      temporalState.delete(sessionId);
      return res.status(400).json({ error: result.error });
    }

    // 3. Handle Unknown Face
    if (!result.recognized) {
      temporalState.delete(sessionId);
      return res.json({ recognized: false, message: 'Unknown Face', similarity: result.similarity });
    }

    const studentId = result.student.id;

    // 4. Check Duplicate Prevention
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId, studentId } }
    });

    if (existingRecord) {
      // Already marked. Reset state so we don't keep counting them.
      temporalState.delete(sessionId);
      return res.json({
        recognized: true,
        student: result.student,
        similarity: result.similarity,
        status: 'ALREADY_MARKED',
        message: 'Already marked present'
      });
    }

    // 5. Temporal Stability Check
    let state = temporalState.get(sessionId) || { lastStudentId: null, count: 0 };

    if (state.lastStudentId === studentId) {
      state.count += 1;
    } else {
      state.lastStudentId = studentId;
      state.count = 1;
    }
    temporalState.set(sessionId, state);

    if (state.count >= REQUIRED_CONFIRMATIONS) {
      // 6. Mark Attendance!
      temporalState.delete(sessionId);

                const record = await prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId, studentId } },
          update: {},
          create: {
            sessionId,
            studentId,
            status: 'PRESENT',
            confidenceScore: result.similarity
          }
        });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'AI_ATTENDANCE_MARKED',
          details: { sessionId, studentId, similarity: result.similarity }
        }
      });

      // Clear the state so it resets for the next person
      temporalState.delete(sessionId);
      
      // 7. Emit Live Event
      try {
        const { getIO } = require('../utils/socket');
        const io = getIO();
        
        io.to('dashboard').emit('attendance:marked', {
          id: record.id,
          sessionId: record.sessionId,
          student: {
            id: result.student.id,
            rollNumber: result.student.rollNumber,
            firstName: result.student.firstName,
            lastName: result.student.lastName
          },
          timestamp: record.timestamp || new Date()
        });
      } catch (e) {
        console.error('Failed to emit socket event:', e.message);
      }

      return res.json({
        recognized: true,
        student: result.student,
        similarity: result.similarity,
        status: 'MARKED_PRESENT',
        message: 'Attendance Marked'
      });
    } else {
      // Needs more confirmations
      return res.json({
        recognized: true,
        student: result.student,
        similarity: result.similarity,
        status: 'CONFIRMING',
        message: `Confirming... ${state.count}/${REQUIRED_CONFIRMATIONS}`
      });
    }

  } catch (error) {
    console.error('Attendance recognition error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Gets the current active session for a subject.
 */
const getActiveSession = async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ error: 'Subject ID is required' });

    const where = { subjectId, status: 'ACTIVE' };
    if (req.user.role === 'FACULTY') {
      where.facultyId = req.user.id;
    }

    const session = await prisma.attendanceSession.findFirst({
      where,
      include: {
        subject: true,
        records: {
          include: { student: { include: { user: true } } }
        }
      }
    });

    res.json(session || null);
  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Gets attendance sessions with optional filters.
 */
const getSessions = async (req, res) => {
  try {
    const { classId, subjectId, status, fromDate, toDate } = req.query;
    const where = {};

    if (req.user.role === 'FACULTY') {
      where.facultyId = req.user.id;
    }

    if (classId) {
      where.subject = {
        classes: { some: { id: classId } }
      };
    }
    if (subjectId) where.subjectId = subjectId;
    if (status) where.status = status;
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const sessions = await prisma.attendanceSession.findMany({
      where,
      include: {
        subject: {
          include: {
            classes: true,
            academicSem: true
          }
        },
        faculty: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        },
        _count: { select: { records: true } }
      },
      orderBy: { startTime: 'desc' }
    });

    res.json(sessions);
  } catch (error) {
    console.error('getSessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

/**
 * Deletes an attendance session and its records.
 */
const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.attendanceSession.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (req.user.role === 'FACULTY' && session.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'You are only authorized to delete your own sessions.' });
    }

    await prisma.attendanceRecord.deleteMany({ where: { sessionId: id } });
    await prisma.attendanceSession.delete({ where: { id } });

    res.json({ success: true, message: 'Attendance session deleted successfully' });
  } catch (error) {
    console.error('deleteSession error:', error);
    res.status(500).json({ error: 'Failed to delete attendance session' });
  }
};

module.exports = {
  startSession,
  endSession,
  recognizeAttendance,
  getActiveSession,
  getSessions,
  deleteSession
};



