const fs = require('fs');
let content = fs.readFileSync('backend/src/controllers/attendanceController.js', 'utf8');

const oldStart = `
    // End any existing active sessions for this subject
    await prisma.attendanceSession.updateMany({
      where: { subjectId, status: 'ACTIVE' },
      data: { status: 'COMPLETED', endTime: new Date() }
    });

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId,
        facultyId: faculty.id,
        date: new Date(),
        startTime: new Date(),
        status: 'ACTIVE'
      }
    });
`;

const newStart = `
    // Check subject existence and get its classId
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    // Check if there's any active session for the same class
    // Because a class can't be in two places at once!
    const activeSession = await prisma.attendanceSession.findFirst({
      where: {
        status: 'ACTIVE',
        subject: { classId: subject.classId }
      },
      include: { subject: true }
    });

    if (activeSession) {
      if (activeSession.facultyId === faculty.id && activeSession.subjectId === subjectId) {
        // Faculty is trying to restart their own session. Just return it.
        return res.status(200).json(activeSession);
      }
      return res.status(409).json({ 
        error: \`An active session is already running for this class (\${activeSession.subject.name}). Please wait for it to end.\`
      });
    }

    const session = await prisma.attendanceSession.create({
      data: {
        subjectId,
        facultyId: faculty.id,
        date: new Date(),
        startTime: new Date(),
        status: 'ACTIVE'
      }
    });
`;

content = content.replace(oldStart.trim(), newStart.trim());
fs.writeFileSync('backend/src/controllers/attendanceController.js', content);
console.log('startSession updated for strict concurrency');
