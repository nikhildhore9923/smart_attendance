const fs = require('fs');

// Enhance controller
let controller = `const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getClasses = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: { subjects: true, _count: { select: { students: true } } },
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
};

const createClass = async (req, res) => {
  const { name, semester } = req.body;
  if (!name || !semester) return res.status(400).json({ error: 'Name and semester required' });
  try {
    const newClass = await prisma.class.create({
      data: { name, semester: parseInt(semester, 10) },
    });
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create class' });
  }
};

const updateClass = async (req, res) => {
  const { id } = req.params;
  const { name, semester, isActive } = req.body;
  try {
    const updated = await prisma.class.update({
      where: { id },
      data: { name, semester: semester ? parseInt(semester, 10) : undefined, isActive }
    });
    res.json(updated);
  } catch(e) { res.status(500).json({error: 'Failed to update class'}); }
};

const deleteClass = async (req, res) => {
  const { id } = req.params;
  try {
    // Instead of deleting, we set isActive to false
    const updated = await prisma.class.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ success: true, message: 'Class deactivated' });
  } catch(e) { res.status(500).json({error: 'Failed to deactivate class'}); }
};

const getSubjects = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: { class: true },
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

const createSubject = async (req, res) => {
  const { name, code, classId } = req.body;
  if (!name || !code || !classId) return res.status(400).json({ error: 'Name, code, and classId required' });
  try {
    const subject = await prisma.subject.create({
      data: { name, code, classId },
    });
    res.status(201).json(subject);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Subject code exists' });
    res.status(500).json({ error: 'Failed to create subject' });
  }
};

const updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name, code, classId, isActive } = req.body;
  try {
    const updated = await prisma.subject.update({
      where: { id },
      data: { name, code, classId, isActive }
    });
    res.json(updated);
  } catch(e) { res.status(500).json({error: 'Failed to update subject'}); }
};

const deleteSubject = async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await prisma.subject.update({
      where: { id },
      data: { isActive: false }
    });
    res.json({ success: true, message: 'Subject deactivated' });
  } catch(e) { res.status(500).json({error: 'Failed to deactivate subject'}); }
};

module.exports = { getClasses, createClass, updateClass, deleteClass, getSubjects, createSubject, updateSubject, deleteSubject };
`;

fs.writeFileSync('backend/src/controllers/academicController.js', controller);

let routes = `const express = require('express');
const { getClasses, createClass, updateClass, deleteClass, getSubjects, createSubject, updateSubject, deleteSubject } = require('../controllers/academicController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticate);

router.get('/classes', authorize('ADMIN', 'FACULTY', 'STUDENT'), getClasses);
router.post('/classes', authorize('ADMIN'), createClass);
router.put('/classes/:id', authorize('ADMIN'), updateClass);
router.delete('/classes/:id', authorize('ADMIN'), deleteClass);

router.get('/subjects', authorize('ADMIN', 'FACULTY', 'STUDENT'), getSubjects);
router.post('/subjects', authorize('ADMIN'), createSubject);
router.put('/subjects/:id', authorize('ADMIN'), updateSubject);
router.delete('/subjects/:id', authorize('ADMIN'), deleteSubject);

module.exports = router;
`;

fs.writeFileSync('backend/src/routes/academicRoutes.js', routes);
console.log('Academic backend updated.');
