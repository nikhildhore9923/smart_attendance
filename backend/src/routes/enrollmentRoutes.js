const express = require('express');
const { startEnrollment, addSample, getEnrollment } = require('../controllers/enrollmentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Only Admin can manage biometric enrollments
router.post('/:studentId/start', authorize('ADMIN'), startEnrollment);
router.post('/:studentId/samples', authorize('ADMIN'), addSample);
router.get('/:studentId', authorize('ADMIN'), getEnrollment);

module.exports = router;
