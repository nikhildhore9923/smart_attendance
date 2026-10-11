const { PrismaClient } = require('@prisma/client');
const AIService = require('../services/aiService');

const prisma = new PrismaClient();

const SAMPLE_COUNT_REQUIRED = parseInt(process.env.ENROLLMENT_SAMPLE_COUNT || '5', 10);

const startEnrollment = async (req, res) => {
  const { studentId } = req.params;
  const { action } = req.body; // 'ENROLL' or 'RE_ENROLL'

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { embeddings: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.embeddings.length >= SAMPLE_COUNT_REQUIRED && action !== 'RE_ENROLL') {
      return res.status(400).json({ error: 'Student is already enrolled. Use RE_ENROLL action to overwrite.' });
    }

    if (action === 'RE_ENROLL') {
      // Archive or delete old embeddings
      await prisma.faceEmbedding.deleteMany({
        where: { studentId }
      });
      
      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'RE_ENROLLMENT_STARTED',
          details: { studentId }
        }
      });
    }

    res.json({ message: 'Ready to receive frames', requiredSamples: SAMPLE_COUNT_REQUIRED });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start enrollment' });
  }
};

const addSample = async (req, res) => {
  const { studentId } = params = req.params;
  const { image } = req.body; // Base64 image

  if (!image) {
    return res.status(400).json({ error: 'Image is required' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { embeddings: true }
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (student.embeddings.length >= SAMPLE_COUNT_REQUIRED) {
      return res.status(400).json({ error: 'Enrollment already completed' });
    }

    // 1. Check AI Service Health (Implicitly done if request succeeds, but can explicitly check)
    // 2. Face Detection
    const detectResult = await AIService.detectFaces(image);
    
    if (detectResult.status === 'NO_FACE') {
      return res.status(400).json({ error: 'No face detected. Please face the camera.' });
    }
    if (detectResult.status === 'MULTIPLE_FACES') {
      return res.status(400).json({ error: 'Multiple faces detected. Only one person should be visible.' });
    }
    
    // 3. Check Face Quality
    const qualityResult = await AIService.checkQuality(image);
    if (!qualityResult.acceptable) {
      const faceConfidence = detectResult.faces?.[0]?.confidence || 0;
      if (faceConfidence < 0.85 || qualityResult.brightness < 12.0 || qualityResult.blur_score < 10.0) {
        let msg = 'Poor image quality. Please improve lighting or move closer.';
        if (qualityResult.status === 'TOO_DARK') msg = 'Lighting is too dark. Please face a light source or turn on room lighting.';
        if (qualityResult.status === 'TOO_BLURRY') msg = 'Image is blurry. Please hold steady while capturing.';
        if (qualityResult.status === 'TOO_SMALL') msg = 'Face is too far. Please move closer to the camera.';
        return res.status(400).json({ error: msg });
      }
    }
    
    // 4. Generate Embedding
    const embedResult = await AIService.getEmbedding(image);
    
    if (embedResult.status !== 'SUCCESS' || !embedResult.embedding) {
      return res.status(400).json({ error: 'Failed to extract face features. Please try again.' });
    }

    // 5. Save to DB
    const newEmbedding = await prisma.faceEmbedding.create({
      data: {
        studentId,
        embedding: embedResult.embedding,
        qualityScore: detectResult.faces[0].confidence, // Proxy for quality for now
        modelName: embedResult.model,
        dimension: embedResult.dimension
      }
    });
    
    const countAfter = student.embeddings.length + 1;
    
    if (countAfter >= SAMPLE_COUNT_REQUIRED) {
      // Mark as fully enrolled
      await prisma.student.update({
        where: { id: studentId },
        data: { isEnrolled: true }
      });
      
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'ENROLLMENT_COMPLETED',
          details: { studentId, samples: countAfter }
        }
      });
    }

    res.json({
      message: 'Sample accepted',
      progress: `${countAfter} / ${SAMPLE_COUNT_REQUIRED}`,
      completed: countAfter >= SAMPLE_COUNT_REQUIRED
    });

  } catch (error) {
    console.error(error);
    if (error.message === 'AI Service error') {
      return res.status(503).json({ error: 'AI Service is currently unavailable. Please try again later.' });
    }
    res.status(500).json({ error: 'Internal server error during sample processing' });
  }
};

const getEnrollment = async (req, res) => {
    const { studentId } = req.params;
    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: { embeddings: true }
        });
        if (!student) return res.status(404).json({ error: 'Student not found' });
        
        res.json({
            isEnrolled: student.isEnrolled,
            sampleCount: student.embeddings.length,
            requiredSamples: SAMPLE_COUNT_REQUIRED,
            model: student.embeddings.length > 0 ? student.embeddings[0].modelName : null,
            dimension: student.embeddings.length > 0 ? student.embeddings[0].dimension : null
        });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
}

module.exports = {
  startEnrollment,
  addSample,
  getEnrollment
};
