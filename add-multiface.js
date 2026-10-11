const fs = require('fs');
let content = fs.readFileSync('backend/src/services/recognitionService.js', 'utf8');

const newFn = `
async function recognizeMultipleStudentsFromImage(base64Image) {
  let image = base64Image;
  if (image.includes('base64,')) {
    image = image.split('base64,')[1];
  }

  const analysis = await AIService.analyzeFrame(image);
  if (analysis.status === 'INVALID_IMAGE') return { error: 'Invalid or corrupted image data.' };
  if (analysis.status === 'NO_FACE' || analysis.num_faces === 0) return { error: 'No face detected in the image.' };

  const enrolledEmbeddings = await prisma.faceEmbedding.findMany({
    include: { student: { include: { user: true } } }
  });

  if (enrolledEmbeddings.length === 0) {
    return { error: 'No students are currently enrolled in the database.' };
  }

  const results = [];

  for (const face of analysis.faces) {
    if (!face.is_live) {
      results.push({ recognized: false, student: null, similarity: 0, error: 'Spoofing detected.' });
      continue;
    }

    const query = face.embedding;
    const studentScores = {};

    for (const record of enrolledEmbeddings) {
      const dbEmbedding = record.embedding;
      const sim = cosineSimilarity(query, dbEmbedding);
      if (!studentScores[record.studentId] || sim > studentScores[record.studentId].similarity) {
        studentScores[record.studentId] = { similarity: sim, student: record.student };
      }
    }

    let bestMatch = null;
    let highestSim = -1;

    for (const [sId, data] of Object.entries(studentScores)) {
      if (data.similarity > highestSim) {
        highestSim = data.similarity;
        bestMatch = data.student;
      }
    }

    if (highestSim >= RECOGNITION_THRESHOLD && bestMatch) {
      results.push({ recognized: true, student: bestMatch, similarity: highestSim });
    } else {
      results.push({ recognized: false, student: null, similarity: highestSim });
    }
  }

  return { faces: results };
}
`;

content = content.replace('module.exports = {', newFn + '\nmodule.exports = {\n  recognizeMultipleStudentsFromImage,');
fs.writeFileSync('backend/src/services/recognitionService.js', content);
console.log('Added recognizeMultipleStudentsFromImage');
