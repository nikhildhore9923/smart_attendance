const fs = require('fs');
let content = fs.readFileSync('src/controllers/attendanceController.js', 'utf8');

if (!content.includes('recognizeMultipleStudentsFromImage')) {
    content = content.replace(
        'const { recognizeStudentFromImage } = require(',
        'const { recognizeStudentFromImage, recognizeMultipleStudentsFromImage } = require('
    );
}

const newLogic = `
    const { image, multiFace } = req.body;

    if (!image) return res.status(400).json({ error: 'No image provided' });

    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'ACTIVE') return res.status(400).json({ error: 'Attendance session is not active.' });

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
             req.io.to(sessionId).emit('attendance_updated', { record, student: face.student });
         }
      }
      
      temporalState.set(sessionId, { tracks: newTracks });
      return res.json({ faces: recognizedFaces, marked });
    }

    // --- EXISTING SINGLE FACE LOGIC ---
`;

content = content.replace(
    /const { image } = req\.body;[\s\S]*?\/\/ 2\. Perform Face Recognition/,
    newLogic + '\n    // 2. Perform Face Recognition'
);

fs.writeFileSync('src/controllers/attendanceController.js', content);
console.log('attendanceController updated');
