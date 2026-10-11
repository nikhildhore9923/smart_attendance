const fs = require('fs');
let content = fs.readFileSync('backend/src/controllers/attendanceController.js', 'utf8');

const goodBlock = `        const record = await prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId, studentId } },
          update: {},
          create: {
            sessionId,
            studentId,
            status: 'PRESENT',
            confidenceScore: result.similarity
          }
        });`;

const startIdx = content.indexOf('const record = await prisma.attendanceRecord.upsert({');
if (startIdx !== -1) {
    const endIdx = content.indexOf('});', startIdx) + 3;
    content = content.substring(0, startIdx) + goodBlock + content.substring(endIdx);
    fs.writeFileSync('backend/src/controllers/attendanceController.js', content);
    console.log('Fixed syntax');
} else {
    console.log('Could not find block');
}
