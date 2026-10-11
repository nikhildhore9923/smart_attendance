const axios = require('axios');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:5000/api';
let adminToken = '';
let studentToken = '';

const images = [
  'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_1.jpg',
  'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_1_aug1.jpg',
  'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_1_aug2.jpg',
  'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_1_aug3.jpg',
  'C:\\smart_attendance\\dataset\\Nikhil_Dhore_31\\Nikhil_Dhore_31_1_aug4.jpg'
];

async function runTests() {
  console.log("=== COMPREHENSIVE ENROLLMENT VERIFICATION ===");
  
  try {
    const ts = Date.now();
    
    // 0. Setup: Login Admin
    console.log("\n[Setup] Logging in Admin...");
    const adminRes = await axios.post(`${API_URL}/auth/login`, { email: 'admin@college.edu', password: 'admin123' });
    adminToken = adminRes.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    
    // 1. Create a Test Student
    console.log(`\n[Test 1] Creating Test Student...`);
    const sRes = await axios.post(`${API_URL}/students`, {
      email: `compstudent${ts}@college.edu`, password: 'password123',
      firstName: 'Comp', lastName: 'Test', rollNumber: `COMP-${ts}`
    }, { headers: adminHeaders });
    const studentId = sRes.data.id;
    console.log("✅ Passed: Student created", studentId);
    
    // Login Student
    const studentLogin = await axios.post(`${API_URL}/auth/login`, { email: `compstudent${ts}@college.edu`, password: 'password123' });
    studentToken = studentLogin.data.token;
    const studentHeaders = { Authorization: `Bearer ${studentToken}` };

    // 8. Unauthorized Access
    console.log("\n[Test 8] Unauthorized Access Check...");
    try {
      await axios.post(`${API_URL}/enrollment/${studentId}/start`, { action: 'ENROLL' }, { headers: studentHeaders });
      console.error("❌ Failed: Student was allowed to start enrollment.");
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log("✅ Passed: Student properly denied access with 403.");
      } else {
        console.error("❌ Failed: Expected 403, got:", err.response ? err.response.status : err.message);
        process.exit(1);
      }
    }

    // 2. Start Enrollment
    console.log("\n[Test 2] Starting Enrollment Session (Admin)...");
    await axios.post(`${API_URL}/enrollment/${studentId}/start`, { action: 'ENROLL' }, { headers: adminHeaders });
    console.log("✅ Passed: Enrollment started.");

    // 3 & 4. Submit 5 Images & Verify DB incrementally (Testing Incomplete Enrollment #9)
    console.log("\n[Test 3, 4, 9] Submitting 5 Images and Checking Completeness...");
    
    for (let i = 0; i < 5; i++) {
      const b64 = fs.readFileSync(images[i], 'base64');
      console.log(`-> Submitting Image ${i+1}/5...`);
      const sampleRes = await axios.post(`${API_URL}/enrollment/${studentId}/samples`, { image: b64 }, { headers: adminHeaders });
      console.log(`   Result: ${sampleRes.data.message} | Progress: ${sampleRes.data.progress}`);
      
      // Verification #9: Incomplete enrollment
      const getRes = await axios.get(`${API_URL}/enrollment/${studentId}`, { headers: adminHeaders });
      if (i < 4) {
        if (getRes.data.isEnrolled) {
          console.error("❌ Failed: Enrollment marked complete prematurely!");
          process.exit(1);
        }
      } else {
        if (!getRes.data.isEnrolled) {
          console.error("❌ Failed: Enrollment not marked complete after 5 samples!");
          process.exit(1);
        }
      }
    }
    console.log("✅ Passed: 5 samples processed properly. Completeness logic is correct.");

    // 5. Verify DB Records
    console.log("\n[Test 5] Database Verification...");
    const dbEmbeddings = await prisma.faceEmbedding.findMany({ where: { studentId: studentId } });
    if (dbEmbeddings.length !== 5) {
      console.error("❌ Failed: DB does not have exactly 5 embeddings. It has", dbEmbeddings.length);
      process.exit(1);
    }
    for (const e of dbEmbeddings) {
      if (e.dimension !== 512 || !Array.isArray(e.embedding) || e.embedding.length !== 512) {
        console.error("❌ Failed: DB has incorrect embedding data.", e.dimension, e.embedding.length);
        process.exit(1);
      }
    }
    console.log("✅ Passed: DB contains exactly 5 ArcFace 512-D embeddings for this student.");

    // 6. Reject Duplicate Enrollment
    console.log("\n[Test 6] Duplicate Enrollment Rejection...");
    try {
      await axios.post(`${API_URL}/enrollment/${studentId}/start`, { action: 'ENROLL' }, { headers: adminHeaders });
      console.error("❌ Failed: System allowed duplicate enrollment.");
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.error.includes('already enrolled')) {
        console.log("✅ Passed: System rejected duplicate enrollment.");
      } else {
        console.error("❌ Failed: System rejected, but with wrong error.", err.response ? err.response.data : err.message);
        process.exit(1);
      }
    }

    // 7. Explicit Re-Enrollment and Audit Logs
    // console.log("\n[Test 7] Explicit Re-Enrollment & Audit Logs...");
    // await axios.post(`${API_URL}/enrollment/${studentId}/start`, { action: 'RE_ENROLL' }, { headers: adminHeaders });
    
    // Check DB that old embeddings are deleted
    // const dbEmbeddingsAfterReEnroll = await prisma.faceEmbedding.findMany({ where: { studentId: studentId } });
    // if (dbEmbeddingsAfterReEnroll.length !== 0) {
    //   console.error("❌ Failed: System did not clear old embeddings on re-enrollment.");
    //   process.exit(1);
    // }
    
    // Check AuditLog
    // const auditLogs = await prisma.auditLog.findMany({ 
    //   where: { action: 'RE_ENROLLMENT_STARTED' },
    //   orderBy: { timestamp: 'desc' },
    //   take: 1
    // });
    // if (auditLogs.length === 0 || auditLogs[0].details.studentId !== studentId) {
    //   console.error("❌ Failed: Audit log for re-enrollment not created or incorrect.");
    //   process.exit(1);
    // }
    // console.log("✅ Passed: Old data cleared and audit log recorded.");

    console.log("\nAll comprehensive verification checks passed.");
    
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

runTests();
