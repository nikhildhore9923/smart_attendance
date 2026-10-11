
const express = require('express');
const router = express.Router();
const c = require('../controllers/academicController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/hierarchy', c.getHierarchy);
router.get('/hierarchy/stats', c.getHierarchyStats);

router.get('/years', c.getYears);
router.post('/years', authorize('ADMIN'), c.createYear);
router.patch('/years/:id/toggle', authorize('ADMIN'), c.toggleYear);
router.delete('/years/:id', authorize('ADMIN'), c.deleteYear);

router.get('/programs', c.getPrograms);
router.post('/programs', authorize('ADMIN'), c.createProgram);
router.delete('/programs/:id', authorize('ADMIN'), c.deleteProgram);

router.get('/semesters', c.getSemesters);
router.post('/semesters', authorize('ADMIN'), c.createSemester);
router.delete('/semesters/:id', authorize('ADMIN'), c.deleteSemester);

router.get('/classes', c.getClasses);
router.post('/classes', authorize('ADMIN'), c.createClass);
router.patch('/classes/:id', authorize('ADMIN'), c.updateClass);
router.delete('/classes/:id', authorize('ADMIN'), c.deleteClass);

router.get('/subjects', c.getSubjects);
router.post('/subjects', authorize('ADMIN'), c.createSubject);
router.patch('/subjects/:id', authorize('ADMIN'), c.updateSubject);
router.delete('/subjects/:id', authorize('ADMIN'), c.deleteSubject);

module.exports = router;
