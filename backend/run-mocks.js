const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const AIService = require('./src/services/aiService');
const { recognizeMultipleStudentsFromImage } = require('./src/services/recognitionService');
const { recognizeStudentFromImage } = require('./src/services/recognitionService');

async function runTests() {
  console.log('--- STARTING MOCK TESTS ---');
  
  // Create dummy student
  const u = await prisma.user.create({ data: { email: `test${Date.now()}@test.com`, passwordHash: '123', role: 'STUDENT', firstName: 'Mock', lastName: 'Student' }});
  const s1 = await prisma.student.create({ data: { id: u.id, rollNumber: `MOCK${Date.now()}`, isEnrolled: true }});
  
  await prisma.faceEmbedding.create({ data: { studentId: s1.id, embedding: [1,1,1], qualityScore: 0.9 }});
  
  const s2 = await prisma.student.create({ data: { id: `s2_${Date.now()}`, rollNumber: `MOCK2_${Date.now()}`, isEnrolled: true }});
  const u2 = await prisma.user.create({ data: { id: s2.id, email: `test2${Date.now()}@test.com`, passwordHash: '123', role: 'STUDENT', firstName: 'Mock2', lastName: 'Student2' }});
  await prisma.faceEmbedding.create({ data: { studentId: s2.id, embedding: [0,0,0], qualityScore: 0.9 }});

  // Test 1: Liveness failure
  AIService.analyzeFrame = async () => ({
    status: 'SUCCESS', num_faces: 1, faces: [{ box: {x:0,y:0,w:10,h:10}, is_live: false, liveness_score: 0.1, embedding: [1,1,1], blur_score: 50 }]
  });
  
  let res = await recognizeMultipleStudentsFromImage('dummy');
  if (res.faces[0].error === 'Spoofing detected.') console.log('[PASS] Spoof attempt correctly rejected.');
  else console.log('[FAIL] Spoof test failed.', res);

  // Test 2: Unknown Face
  AIService.analyzeFrame = async () => ({
    status: 'SUCCESS', num_faces: 1, faces: [{ box: {x:0,y:0,w:10,h:10}, is_live: true, liveness_score: 0.9, embedding: [9,9,9], blur_score: 50 }]
  });
  res = await recognizeMultipleStudentsFromImage('dummy');
  if (res.faces[0].recognized === false && res.faces[0].student === null) console.log('[PASS] Unknown face appropriately rejected.');
  else console.log('[FAIL] Unknown face test failed.');
  
  // Test 3: Multiple Faces & Valid Recognition
  AIService.analyzeFrame = async () => ({
    status: 'SUCCESS', num_faces: 2, faces: [
      { box: {x:0,y:0,w:10,h:10}, is_live: true, liveness_score: 0.9, embedding: [1,1,1], blur_score: 50 },
      { box: {x:10,y:10,w:10,h:10}, is_live: true, liveness_score: 0.9, embedding: [0,0,0], blur_score: 50 }
    ]
  });
  res = await recognizeMultipleStudentsFromImage('dummy');
  if (res.faces.length === 2 && res.faces[0].recognized && res.faces[1].recognized) console.log('[PASS] Multi-face correctly processed.');
  else console.log('[FAIL] Multi-face test failed.', res);

  console.log('--- ALL MOCK TESTS DONE ---');
  process.exit(0);
}
runTests();
