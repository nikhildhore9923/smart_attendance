const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '50mb' })); // For base64 images

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const academicRoutes = require('./routes/academicRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const recognitionRoutes = require('./routes/recognitionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/recognition', recognitionRoutes);
app.use('/api/attendance', attendanceRoutes);

app.get('/api/health', async (req, res) => {
  let aiHealth = { status: 'down', liveness_model: false };
  try {
    const fetch = (await import('node-fetch')).default;
    const aiRes = await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/health`, { timeout: 2000 });
    if (aiRes.ok) aiHealth = await aiRes.json();
  } catch (e) {
    console.error('AI Service health check failed');
  }

  res.json({ 
    status: 'ok', 
    message: 'Smart Attendance API is running',
    ai_service: aiHealth,
    config: {
      database: 'MySQL (Prisma)',
      faceDetector: 'MTCNN',
      embeddingModel: 'ArcFace (512-D)',
      recognitionThreshold: parseFloat(process.env.RECOGNITION_THRESHOLD) || 0.50,
      livenessMethod: 'EfficientNetB0 (FastAPI)',
      temporalRule: '3 Consecutive Frames'
    }
  });
});

// Socket.IO
const { initSocket } = require('./utils/socket');
const io = initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
