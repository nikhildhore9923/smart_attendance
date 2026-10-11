const fs = require('fs');

const controller = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- ACADEMIC YEARS ---
exports.getYears = async (req, res) => res.json(await prisma.academicYear.findMany());
exports.createYear = async (req, res) => {
  const { name, startDate, endDate } = req.body;
  res.json(await prisma.academicYear.create({ data: { name, startDate: new Date(startDate), endDate: new Date(endDate) } }));
};
exports.toggleYear = async (req, res) => {
  const y = await prisma.academicYear.findUnique({where: {id: req.params.id}});
  res.json(await prisma.academicYear.update({ where: { id: req.params.id }, data: { isActive: !y.isActive } }));
};

// --- PROGRAMS ---
exports.getPrograms = async (req, res) => res.json(await prisma.program.findMany());
exports.createProgram = async (req, res) => {
  res.json(await prisma.program.create({ data: { name: req.body.name } }));
};

// --- SEMESTERS ---
exports.getSemesters = async (req, res) => {
  res.json(await prisma.semester.findMany({ include: { academicYear: true, program: true } }));
};
exports.createSemester = async (req, res) => {
  const { number, academicYearId, programId } = req.body;
  res.json(await prisma.semester.create({ data: { number: parseInt(number), academicYearId, programId } }));
};

// --- CLASSES ---
exports.getClasses = async (req, res) => {
  res.json(await prisma.class.findMany({
    include: { academicSem: { include: { academicYear: true, program: true } }, _count: { select: { students: true } } }
  }));
};
exports.createClass = async (req, res) => {
  const { name, semesterId } = req.body;
  res.json(await prisma.class.create({ data: { name, semester: 0, semesterId } }));
};
exports.updateClass = async (req, res) => {
  const { name, isActive, semesterId } = req.body;
  res.json(await prisma.class.update({ where: { id: req.params.id }, data: { name, isActive, semesterId } }));
};

// --- SUBJECTS ---
exports.getSubjects = async (req, res) => {
  res.json(await prisma.subject.findMany({
    include: { academicSem: { include: { academicYear: true, program: true } }, classes: true }
  }));
};
exports.createSubject = async (req, res) => {
  const { name, code, semesterId, classIds } = req.body;
  res.json(await prisma.subject.create({
    data: { 
      name, code, semesterId,
      classes: { connect: (classIds || []).map(id => ({ id })) }
    }
  }));
};
exports.updateSubject = async (req, res) => {
  const { name, code, isActive, semesterId, classIds } = req.body;
  const data = { name, code, isActive, semesterId };
  if (classIds) {
    data.classes = { set: classIds.map(id => ({ id })) };
  }
  res.json(await prisma.subject.update({ where: { id: req.params.id }, data }));
};

// --- HIERARCHY ---
exports.getHierarchy = async (req, res) => {
  const years = await prisma.academicYear.findMany({ where: { isActive: true }, include: { semesters: { include: { program: true, classes: { where: { isActive: true }, include: { subjects: { where: { isActive: true } } } } } } } });
  res.json(years);
};
`;

const routes = `
const express = require('express');
const router = express.Router();
const c = require('../controllers/academicController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.get('/hierarchy', c.getHierarchy);

router.get('/years', c.getYears);
router.post('/years', adminOnly, c.createYear);
router.patch('/years/:id/toggle', adminOnly, c.toggleYear);

router.get('/programs', c.getPrograms);
router.post('/programs', adminOnly, c.createProgram);

router.get('/semesters', c.getSemesters);
router.post('/semesters', adminOnly, c.createSemester);

router.get('/classes', c.getClasses);
router.post('/classes', adminOnly, c.createClass);
router.patch('/classes/:id', adminOnly, c.updateClass);

router.get('/subjects', c.getSubjects);
router.post('/subjects', adminOnly, c.createSubject);
router.patch('/subjects/:id', adminOnly, c.updateSubject);

module.exports = router;
`;

fs.writeFileSync('backend/src/controllers/academicController.js', controller);
fs.writeFileSync('backend/src/routes/academicRoutes.js', routes);
console.log('Backend academic routes created');
