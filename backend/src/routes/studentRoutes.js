const express = require('express');
const { updateStudent, getStudents, createStudent, getStudentById, deleteStudent, deleteStudentRecords, activateStudent } = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'FACULTY'), getStudents);
router.post('/', authorize('ADMIN'), createStudent);
router.get('/:id', authorize('ADMIN', 'FACULTY', 'STUDENT'), getStudentById);
router.put('/:id', authorize('ADMIN'), updateStudent);
router.delete('/:id', authorize('ADMIN'), deleteStudent);
router.delete('/:id/records', authorize('ADMIN'), deleteStudentRecords);
router.patch('/:id/activate', authorize('ADMIN'), activateStudent);

module.exports = router;
