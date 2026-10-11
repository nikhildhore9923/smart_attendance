const express = require('express');
const { recognizeFace } = require('../controllers/recognitionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Allow Admin and Faculty to perform recognition
router.post('/recognize', authorize('ADMIN', 'FACULTY'), recognizeFace);

module.exports = router;
