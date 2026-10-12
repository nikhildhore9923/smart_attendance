const { PrismaClient } = require('@prisma/client');
const AIService = require('./aiService');
const { cosineSimilarity } = require('../utils/math');

const prisma = new PrismaClient();
const RECOGNITION_THRESHOLD = parseFloat(process.env.RECOGNITION_THRESHOLD) || 0.50;

/**
 * Core service to recognize a face from a base64 image.
 * Returns { recognized: boolean, student: object | null, similarity: number, error: string | null }
 */
async function recognizeStudentFromImage(base64Image) {
  let image = base64Image;
  if (image.includes('base64,')) {
    image = image.split('base64,')[1];
  }

  // 1. Detect Face
  const detectResult = await AIService.detectFaces(image);
  if (detectResult.status === 'INVALID_IMAGE') {
    return { recognized: false, student: null, similarity: 0, error: 'Invalid or corrupted image data.' };
  }
  if (detectResult.status === 'NO_FACE') {
    return { recognized: false, student: null, similarity: 0, error: 'No face detected in the image.' };
  }
  if (detectResult.status === 'MULTIPLE_FACES') {
    return { recognized: false, student: null, similarity: 0, error: 'Multiple faces detected. Please present only one face at a time.' };
  }

  // 2. Face Quality Check
  const qualityResult = await AIService.checkQuality(image);
  if (!qualityResult.acceptable) {
    return { recognized: false, student: null, similarity: 0, error: `Poor image quality: ${qualityResult.status}.` };
  }

  // 3. Liveness Check (Anti-Spoofing)
  const livenessResult = await AIService.checkLiveness(image);
  
  if (livenessResult.available === true && livenessResult.is_live === false) {
    return { recognized: false, student: null, similarity: 0, error: `Spoofing detected. Attendance rejected.` };
  }

  // 4. Extract Embedding
  const embedResult = await AIService.getEmbedding(image);
  if (embedResult.status !== 'SUCCESS' || !embedResult.embedding) {
    return { recognized: false, student: null, similarity: 0, error: 'Failed to extract face features.' };
  }

  const queryEmbedding = embedResult.embedding;

  // 5. Fetch Enrollments
  const enrolledEmbeddings = await prisma.faceEmbedding.findMany({
    include: {
      student: {
        include: {
          user: true,
          class: {
            include: { academicSem: true }
          }
        }
      }
    }
  });

  if (enrolledEmbeddings.length === 0) {
    return { recognized: false, student: null, similarity: 0, error: 'No students are currently enrolled in the database.' };
  }

  // 5. Compare using Cosine Similarity & Group by Student (Max Aggregation)
  const studentScores = new Map();

  for (const record of enrolledEmbeddings) {
    const sim = cosineSimilarity(queryEmbedding, record.embedding);
    const studentId = record.studentId;

    if (!studentScores.has(studentId) || sim > studentScores.get(studentId).similarity) {
      const cls = record.student.class;
      const semNumber = cls?.academicSem?.number;
      const displayClassName = cls ? (semNumber ? `${cls.name} (Sem ${semNumber})` : cls.name) : 'Unassigned';

      studentScores.set(studentId, {
        similarity: sim,
        student: {
          id: record.student.id,
          rollNumber: record.student.rollNumber,
          firstName: record.student.user.firstName,
          lastName: record.student.user.lastName,
          email: record.student.user.email,
          classId: record.student.classId,
          className: displayClassName,
          rawClassName: cls?.name || 'Unassigned',
          semesterNumber: semNumber || null
        }
      });
    }
  }

  // 6. Find Best Match
  let bestMatch = null;
  for (const [id, data] of studentScores.entries()) {
    if (!bestMatch || data.similarity > bestMatch.similarity) {
      bestMatch = data;
    }
  }

  // 7. Apply Threshold
  if (bestMatch && bestMatch.similarity >= RECOGNITION_THRESHOLD) {
    return {
      recognized: true,
      student: bestMatch.student,
      similarity: bestMatch.similarity,
      error: null
    };
  } else {
    return {
      recognized: false,
      student: null,
      similarity: bestMatch ? bestMatch.similarity : 0,
      error: null
    };
  }
}


async function recognizeMultipleStudentsFromImage(base64Image) {
  let image = base64Image;
  if (image.includes('base64,')) {
    image = image.split('base64,')[1];
  }

  const analysis = await AIService.analyzeFrame(image);
  if (analysis.status === 'INVALID_IMAGE') return { error: 'Invalid or corrupted image data.' };
  if (analysis.status === 'NO_FACE' || analysis.num_faces === 0) return { error: 'No face detected in the image.' };

  const enrolledEmbeddings = await prisma.faceEmbedding.findMany({
    include: {
      student: {
        include: {
          user: true,
          class: {
            include: { academicSem: true }
          }
        }
      }
    }
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
        const cls = record.student.class;
        const semNumber = cls?.academicSem?.number;
        const displayClassName = cls ? (semNumber ? `${cls.name} (Sem ${semNumber})` : cls.name) : 'Unassigned';

        studentScores[record.studentId] = { similarity: sim, student: {
          id: record.student.id,
          rollNumber: record.student.rollNumber,
          firstName: record.student.user?.firstName || '',
          lastName: record.student.user?.lastName || '',
          email: record.student.user?.email || '',
          classId: record.student.classId,
          className: displayClassName,
          rawClassName: cls?.name || 'Unassigned',
          semesterNumber: semNumber || null
        } };
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

module.exports = {
  recognizeMultipleStudentsFromImage,
  recognizeStudentFromImage
};
