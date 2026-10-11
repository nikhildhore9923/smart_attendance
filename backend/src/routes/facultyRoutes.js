const express = require('express');
const {
  getFaculty,
  createFaculty,
  updateFaculty,
  allocateSubjects,
  deleteFaculty,
  getMySubjects,
} = require('../controllers/facultyController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Faculty's own assigned subjects
router.get('/my-subjects', authorize('FACULTY', 'ADMIN'), getMySubjects);

// Admin-only management endpoints
router.get('/', authorize('ADMIN'), getFaculty);
router.post('/', authorize('ADMIN'), createFaculty);
router.put('/:id', authorize('ADMIN'), updateFaculty);
router.delete('/:id', authorize('ADMIN'), deleteFaculty);
router.post('/:id/allocate', authorize('ADMIN'), allocateSubjects);

module.exports = router;
