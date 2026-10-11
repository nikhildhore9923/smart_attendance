const axios = require('axios');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:5000/api';
let adminToken = '';
let studentToken = '';

const GENUINE_IMAGE = 'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_1.jpg'; 
const IMPOSTOR_IMAGE = 'C:\\smart_attendance\\dataset\\shubham_kharbad_49\\shubham_kharbad_49_1.jpg';

async function testAttendance() {
  console.log("=== ATTENDANCE ENGINE COMPREHENSIVE TEST ===");
  try {
    // 0. Setup: Login Admin
    console.log("\n[Setup] Logging in Admin...");
    const adminRes = await axios.post(`${API_URL}/auth/login`, { email: 'admin@college.edu', password: 'admin123' });
    adminToken = adminRes.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Get a valid subjectId
    const subjects = await prisma.subject.findMany();
    if (subjects.length === 0) {
      throw new Error("No subjects exist in DB. Run test_apis.js first.");
    }
    const subjectId = subjects[0].id;
    
    // Create a student token
    const studentCount = await prisma.student.count();
    const ts = Date.now();
    await axios.post(`${API_URL}/students`, {
      email: `attendtest${ts}@college.edu`, password: 'password123',
      firstName: 'Attend', lastName: 'Test', rollNumber: `ATT-${ts}`
    }, { headers: adminHeaders });
    const sLogin = await axios.post(`${API_URL}/auth/login`, { email: `attendtest${ts}@college.edu`, password: 'password123' });
    studentToken = sLogin.data.token;
    const studentHeaders = { Authorization: `Bearer ${studentToken}` };

    // Test 7: Authorization Check (Student trying to start session)
    console.log("\n[Test 7] Authorization (Student starting session)...");
    try {
      await axios.post(`${API_URL}/attendance/sessions`, { subjectId }, { headers: studentHeaders });
      console.error("❌ Failed: Student was allowed to start session");
      process.exit(1);
    } catch (err) {
      if (err.response?.status === 403) console.log("✅ Passed: Student blocked with 403");
      else throw err;
    }

    // Start Session
    console.log("\n[Setup] Starting Session (Admin)...");
    const sessionRes = await axios.post(`${API_URL}/attendance/sessions`, { subjectId }, { headers: adminHeaders });
    const sessionId = sessionRes.data.id;
    console.log(`✅ Session Created: ${sessionId}`);

    // Helper to send frame
    const sendFrame = async (img) => {
      const b64 = fs.readFileSync(img, 'base64');
      return await axios.post(`${API_URL}/attendance/sessions/${sessionId}/recognize`, { image: b64 }, { headers: adminHeaders });
    };

    // Test 6 & Test 1: Temporal Stability & Valid Attendance
    console.log("\n[Test 1 & 6] Temporal Stability & Marking Attendance...");
    let res = await sendFrame(GENUINE_IMAGE);
    console.log(`Frame 1: ${res.data.status} | ${res.data.message}`);
    if (res.data.status !== 'CONFIRMING') throw new Error("Should be confirming");

    res = await sendFrame(IMPOSTOR_IMAGE); // Break consecutive chain
    console.log(`Frame (Impostor): Recognized=${res.data.recognized} | ${res.data.message}`);
    
    // Now get 3 consecutive genuine
    res = await sendFrame(GENUINE_IMAGE);
    console.log(`Frame 1 (Again): ${res.data.status} | ${res.data.message}`);
    res = await sendFrame(GENUINE_IMAGE);
    console.log(`Frame 2 (Again): ${res.data.status} | ${res.data.message}`);
    res = await sendFrame(GENUINE_IMAGE);
    console.log(`Frame 3 (Again): ${res.data.status} | ${res.data.message}`);
    
    if (res.data.status !== 'MARKED_PRESENT') {
      console.error("❌ Failed: Did not mark present after 3 frames");
      process.exit(1);
    }
    console.log("✅ Passed: Attendance successfully marked after exactly 3 consecutive valid frames.");

    // Verify DB
    const records = await prisma.attendanceRecord.findMany({ where: { sessionId } });
    if (records.length !== 1) throw new Error(`Expected 1 record, got ${records.length}`);
    console.log("✅ Passed: DB contains exactly 1 AttendanceRecord.");

    // Test 2: Repeated Recognition
    console.log("\n[Test 2] Repeated Recognition (Duplicate Prevention)...");
    res = await sendFrame(GENUINE_IMAGE);
    console.log(`Result: ${res.data.status} | ${res.data.message}`);
    if (res.data.status !== 'ALREADY_MARKED') {
      console.error("❌ Failed: Duplicate not properly rejected");
      process.exit(1);
    }
    console.log("✅ Passed: System correctly handled duplicate attendance.");

    // Test 8: DB Uniqueness
    console.log("\n[Test 8] Database Uniqueness Constraint...");
    try {
      await prisma.attendanceRecord.create({
        data: {
          sessionId: sessionId,
          studentId: records[0].studentId,
          status: 'PRESENT',
          confidenceScore: 0.99
        }
      });
      console.error("❌ Failed: Database allowed duplicate record creation.");
      process.exit(1);
    } catch (err) {
      if (err.code === 'P2002') console.log("✅ Passed: Prisma threw P2002 Unique Constraint violation.");
      else throw err;
    }

    // Test 3: Unknown Person
    console.log("\n[Test 3] Unknown Person Rejection...");
    res = await sendFrame(IMPOSTOR_IMAGE);
    console.log(`Result: Recognized=${res.data.recognized} | ${res.data.message}`);
    if (res.data.recognized !== false) {
      console.error("❌ Failed: Impostor was recognized");
      process.exit(1);
    }
    console.log("✅ Passed: Impostor correctly rejected.");

    // Test 5: Inactive Session
    console.log("\n[Test 5] Inactive Session Boundary...");
    await axios.post(`${API_URL}/attendance/sessions/${sessionId}/end`, {}, { headers: adminHeaders });
    console.log("Session Ended.");
    
    try {
      await sendFrame(GENUINE_IMAGE);
      console.error("❌ Failed: Allowed recognition on completed session");
      process.exit(1);
    } catch (err) {
      if (err.response?.status === 400 && err.response.data.error.includes('not active')) {
        console.log("✅ Passed: System rejected recognition on inactive session.");
      } else throw err;
    }

    console.log("\nALL ATTENDANCE VERIFICATION CHECKS PASSED!");

  } catch (error) {
    console.error("\n❌ FATAL ERROR IN SCRIPT:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testAttendance();
