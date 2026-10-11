const express = require('express');
const { updateStudent, getStudents, createStudent, getStudentById, deleteStudent, deleteStudentRecords, activateStudent } = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'FACULTY'), getStudents);
router.post('/', authorize('ADMIN', 'FACULTY'), createStudent);
router.get('/:id', authorize('ADMIN', 'FACULTY', 'STUDENT'), getStudentById);
router.put('/:id', authorize('ADMIN', 'FACULTY'), updateStudent);
router.delete('/:id', authorize('ADMIN', 'FACULTY'), deleteStudent);
router.delete('/:id/records', authorize('ADMIN', 'FACULTY'), deleteStudentRecords);
router.patch('/:id/activate', authorize('ADMIN', 'FACULTY'), activateStudent);

module.exports = router;
