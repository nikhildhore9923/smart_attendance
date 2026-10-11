const express = require('express');
const { startEnrollment, addSample, getEnrollment } = require('../controllers/enrollmentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Only Admin and Faculty can manage enrollments
router.post('/:studentId/start', authorize('ADMIN', 'FACULTY'), startEnrollment);
router.post('/:studentId/samples', authorize('ADMIN', 'FACULTY'), addSample);
router.get('/:studentId', authorize('ADMIN', 'FACULTY'), getEnrollment);

module.exports = router;
