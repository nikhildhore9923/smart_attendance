const express = require('express');
const { 
  startSession, endSession, recognizeAttendance, 
  getActiveSession, getSessions, deleteSession 
} = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const { 
  getHistory, getSummary, getStudentReport, 
  getDashboardStats, getTrend, getDivisionMatrix, exportCSV, exportPDF 
} = require('../controllers/reportController');

const router = express.Router();

router.use(authenticate);

// Report endpoints
router.get('/history', authorize('ADMIN', 'FACULTY'), getHistory);
router.get('/summary', authorize('ADMIN', 'FACULTY'), getSummary);
router.get('/division-matrix', authorize('ADMIN', 'FACULTY'), getDivisionMatrix);
router.get('/dashboard', authorize('ADMIN', 'FACULTY'), getDashboardStats);
router.get('/trend', authorize('ADMIN', 'FACULTY'), getTrend);
router.get('/export/csv', authorize('ADMIN', 'FACULTY'), exportCSV);
router.get('/export/pdf', authorize('ADMIN', 'FACULTY'), exportPDF);
router.get('/student/:id', authorize('ADMIN', 'FACULTY', 'STUDENT'), getStudentReport);

// Session endpoints (Conducting live attendance is strictly restricted to FACULTY)
router.get('/sessions', authorize('ADMIN', 'FACULTY'), getSessions);
router.get('/sessions/active', authorize('ADMIN', 'FACULTY'), getActiveSession);
router.post('/sessions', authorize('FACULTY'), startSession);
router.post('/sessions/:id/end', authorize('FACULTY'), endSession);
router.delete('/sessions/:id', authorize('ADMIN', 'FACULTY'), deleteSession);
router.post('/sessions/:id/recognize', authorize('FACULTY'), recognizeAttendance);

module.exports = router;
