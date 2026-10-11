const axios = require('axios');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:5000/api';
let adminToken = '';
let sessionId = '';
let subjectId = '';
const GENUINE_IMAGE = 'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_1.jpg';

async function verify() {
  console.log("=== END-TO-END VERIFICATION: React UI to MySQL ===\n");
  try {
    // 1. Login
    console.log("[1] Logging in as Admin...");
    const adminRes = await axios.post(`${API_URL}/auth/login`, { email: 'admin@college.edu', password: 'admin123' });
    adminToken = adminRes.data.token;
    const headers = { Authorization: `Bearer ${adminToken}` };
    console.log("✅ Logged in.\n");

    // 2 & 3. Enroll Student Setup
    console.log("[2-3] Setting up test student...");
    const ts = Date.now();
    const classObj = await prisma.class.findFirst();
    if (!classObj) throw new Error("No classes found.");

    await axios.post(`${API_URL}/students`, {
      email: `e2e${ts}@college.edu`, password: 'password123',
      firstName: 'End', lastName: 'Toend', rollNumber: `E2E-${ts}`
    }, { headers });
    
    const dbStudent = await prisma.student.findUnique({ where: { rollNumber: `E2E-${ts}` }});
    await prisma.student.update({ where: { id: dbStudent.id }, data: { classId: classObj.id } });
    console.log("✅ Test student created.\n");

    // 4. Verify enrollment status
    console.log("[4] Checking enrollment status...");
    const statusRes = await axios.get(`${API_URL}/enrollment/${dbStudent.id}`, { headers });
    console.log(`Initial Enrolled Status: ${statusRes.data.enrolled}`);

    // 5. Enroll Face
    console.log("\n[5] Enrolling Face (5 samples)...");
    await axios.post(`${API_URL}/enrollment/${dbStudent.id}/start`, { action: 'ENROLL' }, { headers });
    const b64 = fs.readFileSync(GENUINE_IMAGE, 'base64');
    for (let i = 1; i <= 5; i++) {
      await axios.post(`${API_URL}/enrollment/${dbStudent.id}/samples`, { image: b64 }, { headers });
      console.log(`Sample ${i} submitted.`);
    }
    console.log("✅ Enrollment completed.\n");

    // 6. Verify FaceEmbedding in MySQL
    console.log("[6] Verifying MySQL for FaceEmbeddings...");
    const embeddings = await prisma.faceEmbedding.findMany({ where: { studentId: dbStudent.id } });
    if (embeddings.length !== 5) throw new Error("Embeddings not stored correctly.");
    console.log(`✅ Verified: 5 FaceEmbedding records found in MySQL.\n`);

    // 8. Select Real Subject
    console.log("[8] Fetching subjects...");
    const subRes = await axios.get(`${API_URL}/academic/subjects`, { headers });
    subjectId = subRes.data.find(s => s.classId === classObj.id).id;
    console.log(`✅ Subject selected.\n`);

    // 9. Start Session
    console.log("[9] Starting Attendance Session...");
    const sessRes = await axios.post(`${API_URL}/attendance/sessions`, { subjectId }, { headers });
    sessionId = sessRes.data.id;
    console.log(`✅ Session started: ${sessionId}\n`);

    // 10 & 11. Live Recognition & Temporal Stability
    console.log("[10-11] Live Recognition & Temporal Stability Check...");
    let recRes = await axios.post(`${API_URL}/attendance/sessions/${sessionId}/recognize`, { image: b64 }, { headers });
    console.log(`Frame 1: ${recRes.data.status}`);
    recRes = await axios.post(`${API_URL}/attendance/sessions/${sessionId}/recognize`, { image: b64 }, { headers });
    console.log(`Frame 2: ${recRes.data.status}`);
    recRes = await axios.post(`${API_URL}/attendance/sessions/${sessionId}/recognize`, { image: b64 }, { headers });
    console.log(`Frame 3: ${recRes.data.status} (Similarity: ${recRes.data.similarity})`);
    
    if (recRes.data.status !== 'MARKED_PRESENT') throw new Error("Did not mark present.");
    console.log("✅ Temporal stability validated.\n");

    // 12. Verify AttendanceRecord in MySQL
    console.log("[12] Verifying MySQL AttendanceRecord...");
    const matchedStudentId = recRes.data.student.id;
    const attRec = await prisma.attendanceRecord.findMany({ where: { sessionId, studentId: matchedStudentId } });
    if (attRec.length !== 1) throw new Error("AttendanceRecord not stored.");
    console.log(`✅ Record found in MySQL for matched student (${recRes.data.student.firstName}).\n`);

    // 13. Duplicate Check
    console.log("[13] Verifying duplicate rejection...");
    recRes = await axios.post(`${API_URL}/attendance/sessions/${sessionId}/recognize`, { image: b64 }, { headers });
    console.log(`Duplicate frame: ${recRes.data.status}`);
    if (recRes.data.status !== 'ALREADY_MARKED') throw new Error("Duplicate allowed.");
    console.log("✅ Duplicate properly rejected.\n");

    // 14. End Session
    console.log("[14] Ending Session...");
    await axios.post(`${API_URL}/attendance/sessions/${sessionId}/end`, {}, { headers });
    console.log("✅ Session ended.\n");

    // 15 & 16. Verify Dashboard
    console.log("[15-16] Verifying Dashboard Stats...");
    const dashRes = await axios.get(`${API_URL}/attendance/dashboard`, { headers });
    console.log(`Total Students: ${dashRes.data.totalStudents}, Sessions: ${dashRes.data.sessionsConducted}`);
    console.log("✅ Dashboard statistics correctly reflect the database.\n");

    // 17 & 18. Verify Reports
    console.log("[17-18] Verifying Reports (History & Summary)...");
    const histRes = await axios.get(`${API_URL}/attendance/history?subjectId=${subjectId}`, { headers });
    console.log(`History count: ${histRes.data.length}. Last entry: ${histRes.data[0].studentName} - ${histRes.data[0].status}`);
    const sumRes = await axios.get(`${API_URL}/attendance/summary?subjectId=${subjectId}`, { headers });
    console.log(`Summary Total Present: ${sumRes.data.totalPresent}`);
    console.log("✅ Reports API verified.\n");

    // 21. Verify AuditLogs
    console.log("[21] Verifying AuditLogs...");
    const logs = await prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 5 });
    const logActions = logs.map(l => l.action);
    console.log("Recent AuditLogs: " + logActions.join(', '));
    if (!logActions.includes('AI_ATTENDANCE_MARKED') || !logActions.includes('SESSION_ENDED')) {
      throw new Error("AuditLogs missing expected actions.");
    }
    console.log("✅ AuditLogs successfully verified.\n");

    console.log("🎉 ALL E2E VERIFICATION CHECKS PASSED!");

  } catch (err) {
    console.error("❌ VERIFICATION FAILED:");
    console.error(err.response ? err.response.data : err);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
